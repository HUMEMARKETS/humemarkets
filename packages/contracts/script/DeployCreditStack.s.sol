// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {CompositeSanityOracle} from "../src/oracle/CompositeSanityOracle.sol";
import {HumeCreditRegistry} from "../src/credit/HumeCreditRegistry.sol";
import {HumeCreditRouter} from "../src/credit/HumeCreditRouter.sol";
import {HumeCreditVault} from "../src/credit/HumeCreditVault.sol";
import {HumeCreditPair} from "../src/credit/HumeCreditPair.sol";
import {HumeCreditProxies} from "../src/credit/HumeCreditProxies.sol";

/// @notice Deploys the Hume credit stack: registry, router, vault and one TSLA/USDG pair, all behind
/// UUPS proxies (via `HumeCreditProxies`). Each proxy is initialized in the same transaction it is
/// created, so no proxy is ever left uninitialised.
///
/// The credit stack is separate from the perps/options stack deployed by `DeployAll.s.sol`. It uses a
/// `CompositeSanityOracle` for prices (manual feeder, not Chainlink-direct) and its own
/// `HumeCreditRegistry` for market configuration.
///
/// Risk parameters (maxLtvBps, liquidationLtvBps, supplyCap, borrowCap) are read from
/// `deployments/<network>.limits.json` under the `credit` key, so they are never hardcoded.
///
/// **Degradation:** if USDG is unfunded (Phase 4 measured 0.295277 USDG), the script deploys
/// everything and immediately pauses the pair. No seed, no lifecycle. The operator unpauses and raises
/// caps when USDG is funded.
///
/// Required env vars:
///   CREDIT_COLLATERAL_TOKEN — the collateral token address (TSLA on mainnet)
///
/// Optional env vars:
///   PRIVATE_KEY — deployer key (or use `--account` keystore)
///   NETWORK_NAME — default `robinhood_mainnet`
///   CREDIT_PAUSED — set to `true` to deploy the pair paused (default: true, degradation path)
///
/// Usage (dry run first; add --broadcast --slow to send):
///   CREDIT_COLLATERAL_TOKEN=0x322F0929c4625eD5bAd873c95208D54E1c003b2d \
///     forge script script/DeployCreditStack.s.sol \
///       --rpc-url https://rpc.mainnet.chain.robinhood.com \
///       --account hume-mainnet --sender <deployer>
contract DeployCreditStack is Script {
    function run() external {
        // --- Read configuration -----------------------------------------------------------
        string memory network = vm.envOr("NETWORK_NAME", string("robinhood_mainnet"));
        string memory json = vm.readFile(string.concat("deployments/", network, ".json"));
        string memory limits = vm.readFile(string.concat("deployments/", network, ".limits.json"));

        address debtToken = vm.parseJsonAddress(json, ".settlementToken");
        require(debtToken != address(0), "Settlement token not found in deployment file");

        address collateralToken = vm.envOr("CREDIT_COLLATERAL_TOKEN", address(0));
        require(collateralToken != address(0), "CREDIT_COLLATERAL_TOKEN env var not set");

        bool paused = vm.envOr("CREDIT_PAUSED", true);

        // Risk parameters from limits file
        uint256 maxLtvBps = vm.parseJsonUint(limits, ".credit.maxLtvBps");
        uint256 liquidationLtvBps = vm.parseJsonUint(limits, ".credit.liquidationLtvBps");
        uint256 maxLeverageBps = vm.parseJsonUint(limits, ".credit.maxLeverageBps");
        uint256 supplyCap = vm.parseJsonUint(limits, ".credit.supplyCap");
        uint256 borrowCap = vm.parseJsonUint(limits, ".credit.borrowCap");
        uint256 oracleStaleness = vm.parseJsonUint(limits, ".credit.oracleStalenessSeconds");

        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address admin = deployerKey == 0 ? msg.sender : vm.addr(deployerKey);

        console.log("Admin:            ", admin);
        console.log("Collateral token: ", collateralToken);
        console.log("Debt token:       ", debtToken);
        console.log("Paused:           ", paused);

        // --- Deploy ---------------------------------------------------------------------
        if (deployerKey == 0) vm.startBroadcast();
        else vm.startBroadcast(deployerKey);

        // 1. Oracle — CompositeSanityOracle with the admin as initial feeder
        CompositeSanityOracle oracle = new CompositeSanityOracle(admin);
        oracle.setMaxStaleness(oracleStaleness);

        // 2. Registry
        HumeCreditRegistry registry = HumeCreditProxies.registry(admin);

        // 3. Router
        HumeCreditRouter router = HumeCreditProxies.lendingRouter(admin);

        // 4. Vault — ERC-4626, starts with deposits paused
        HumeCreditVault vault = HumeCreditProxies.vault(
            IERC20(debtToken), "Hume USDG Vault", "hUSDG", "hume-usdg-vault", "Conservative", admin
        );

        // 5. Pair — the marketId must match what registry.addMarket will compute
        string memory slug = "tsla-usdg";
        bytes32 marketId = keccak256(abi.encodePacked(slug, collateralToken, debtToken));
        HumeCreditPair pair =
            HumeCreditProxies.pair(marketId, collateralToken, debtToken, address(oracle), address(registry), admin);

        // 6. Register the market in the registry
        registry.addMarket(
            slug,
            collateralToken,
            debtToken,
            address(pair),
            address(oracle),
            HumeCreditRegistry.RiskTier.TierA,
            maxLtvBps,
            liquidationLtvBps,
            maxLeverageBps,
            supplyCap,
            borrowCap
        );

        // 7. Authorize the router in the registry
        registry.setAuthorizedRouter(address(router), true);

        // 8. Pause the market if degradation path
        if (paused) {
            registry.setMarketStatus(marketId, HumeCreditRegistry.MarketStatus.PAUSED);
        }

        vm.stopBroadcast();

        // --- Write addresses ------------------------------------------------------------
        _writeAddresses(network, oracle, registry, router, vault, pair);
        _logSummary(oracle, registry, router, vault, pair);
    }

    function _writeAddresses(
        string memory network,
        CompositeSanityOracle oracle,
        HumeCreditRegistry registry,
        HumeCreditRouter router,
        HumeCreditVault vault,
        HumeCreditPair pair
    ) internal {
        string memory path = string.concat("deployments/", network, ".json");
        // Append credit addresses to the existing deployment file
        vm.writeJson(vm.toString(address(oracle)), path, ".creditOracle");
        vm.writeJson(vm.toString(address(registry)), path, ".creditRegistry");
        vm.writeJson(vm.toString(address(router)), path, ".creditRouter");
        vm.writeJson(vm.toString(address(vault)), path, ".creditVault");
        vm.writeJson(vm.toString(address(pair)), path, ".creditPairTslaUsdg");
    }

    function _logSummary(
        CompositeSanityOracle oracle,
        HumeCreditRegistry registry,
        HumeCreditRouter router,
        HumeCreditVault vault,
        HumeCreditPair pair
    ) internal pure {
        console.log("--- Credit Stack Deployed ---");
        console.log("CompositeSanityOracle:", address(oracle));
        console.log("HumeCreditRegistry:   ", address(registry));
        console.log("HumeCreditRouter:     ", address(router));
        console.log("HumeCreditVault:      ", address(vault));
        console.log("HumeCreditPair:       ", address(pair));
    }
}
