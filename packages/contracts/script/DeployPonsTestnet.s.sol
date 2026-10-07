// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HumePonsRouter} from "../src/pons/HumePonsRouter.sol";
import {MockPonsToken, MockPonsFactory, MockPonsSeeder} from "../test/mocks/MockPons.sol";

/// @notice Testnet only. Robinhood Chain testnet has the Uniswap v4 `PoolManager` but no Pons launchpad, so this
/// deploys a mock factory, three mock Pons tokens, opens a real v4 pool for each (native ETH against the token,
/// full range, no hook) and deploys the production `HumePonsRouter` on top. Each pool gets `SEED_ETH_WEI` of
/// ETH (default 0.0002 ETH): pools are thin on purpose, because the deployer holds little gas ETH.
///
///   forge script script/DeployPonsTestnet.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract DeployPonsTestnet is Script {
    address internal constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;

    function run() external {
        uint256 seedEth = vm.envOr("SEED_ETH_WEI", uint256(0.0002 ether));
        vm.startBroadcast();
        MockPonsFactory factory = new MockPonsFactory();
        MockPonsSeeder seeder = new MockPonsSeeder(POOL_MANAGER);
        MockPonsToken[3] memory tokens = [
            new MockPonsToken(
                "Pons Frog",
                "PFROG",
                "",
                "A mock Pons token for the testnet walkthrough. It has no value.",
                "https://humemarkets.vercel.app"
            ),
            new MockPonsToken(
                "Pons Moon", "PMOON", "", "A second mock Pons token. It has no value.", "https://humemarkets.vercel.app"
            ),
            new MockPonsToken(
                "Pons Cat", "PCAT", "", "A third mock Pons token. It has no value.", "https://humemarkets.vercel.app"
            )
        ];
        // Tokens per ETH: 1,000,000 / 250,000 / 40,000. sqrtPriceX96 = sqrt(tokens per ETH) * 2^96.
        uint160[3] memory sqrtPrices = [uint160(1000) << 96, uint160(500) << 96, uint160(200) << 96];
        uint256[3] memory perEth = [uint256(1_000_000), 250_000, 40_000];
        for (uint256 i; i < 3; i++) {
            factory.graduate(address(tokens[i]), 200);
            tokens[i].mint(address(seeder), (seedEth * perEth[i] * 2));
            seeder.seed{value: seedEth}(address(tokens[i]), sqrtPrices[i]);
        }
        HumePonsRouter router = new HumePonsRouter(POOL_MANAGER, address(factory), address(0));
        vm.stopBroadcast();

        string memory json = string.concat(
            '{"ponsFactory":"',
            vm.toString(address(factory)),
            '","ponsRouter":"',
            vm.toString(address(router)),
            '","tokens":["',
            vm.toString(address(tokens[0])),
            '","',
            vm.toString(address(tokens[1])),
            '","',
            vm.toString(address(tokens[2])),
            '"]}'
        );
        vm.writeFile("deployments/robinhood_testnet.pons.json", json);
        console.log("factory", address(factory));
        console.log("router ", address(router));
    }
}
