// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";

import {HumePonsRouter} from "../src/pons/HumePonsRouter.sol";

/// @notice Deploys only the production `HumePonsRouter` and records it as `.ponsRouter` in
/// `deployments/<NETWORK_NAME>.json`. The Pons factory and the Uniswap v4 `PoolManager` already exist
/// (on testnet the factory is the mock from `DeployPonsTestnet.s.sol`), so they are inputs, not deployed here.
///
/// Required env: PONS_POOL_MANAGER, PONS_FACTORY. Optional: PRIVATE_KEY, NETWORK_NAME, PONS_HOOK.
contract DeployPonsRouter is Script {
    function run() external {
        string memory network = vm.envOr("NETWORK_NAME", string("robinhood_testnet"));
        address poolManager = vm.envAddress("PONS_POOL_MANAGER");
        address factory = vm.envAddress("PONS_FACTORY");
        address hook = vm.envOr("PONS_HOOK", address(0));

        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerKey == 0) vm.startBroadcast();
        else vm.startBroadcast(deployerKey);
        HumePonsRouter router = new HumePonsRouter(poolManager, factory, hook);
        vm.stopBroadcast();

        vm.writeJson(vm.toString(address(router)), string.concat("deployments/", network, ".json"), ".ponsRouter");
        console.log("HumePonsRouter:", address(router));
    }
}
