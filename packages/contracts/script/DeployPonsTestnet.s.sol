// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HumePonsRouter} from "../src/pons/HumePonsRouter.sol";
import {MockPonsFactory} from "../test/mocks/MockPons.sol";

/// @notice Testnet only. Robinhood Chain testnet has the Uniswap v4 `PoolManager` but no Pons launchpad, so this
/// deploys a mock factory and the production `HumePonsRouter` on top. The mock tokens (with their v4 pools) are
/// added afterwards by `DeployPonsTestnetMore`, from `deployments/pons_testnet_tokens.json`.
///
///   forge script script/DeployPonsTestnet.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract DeployPonsTestnet is Script {
    address internal constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;

    function run() external {
        vm.startBroadcast();
        MockPonsFactory factory = new MockPonsFactory();
        HumePonsRouter router = new HumePonsRouter(POOL_MANAGER, address(factory), address(0));
        vm.stopBroadcast();

        vm.writeFile(
            "deployments/robinhood_testnet.pons.json",
            string.concat(
                '{"ponsFactory":"',
                vm.toString(address(factory)),
                '","ponsRouter":"',
                vm.toString(address(router)),
                '","fromBlock":',
                vm.toString(block.number),
                "}"
            )
        );
        console.log("factory", address(factory));
        console.log("router ", address(router));
    }
}
