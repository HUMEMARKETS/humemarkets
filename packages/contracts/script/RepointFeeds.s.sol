// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {MarketRegistry} from "../src/core/MarketRegistry.sol";
import {OracleRouter} from "../src/oracle/OracleRouter.sol";
import {MockPriceFeed} from "../src/oracle/MockPriceFeed.sol";
import {IPriceFeed} from "../src/interfaces/IPriceFeed.sol";

/// @notice One-wallet testnet: gives every market a mock feed owned by the broadcaster, at the old
/// feed's current price, and points the oracle at it. `MockPriceFeed.owner` is immutable, so a feed
/// cannot change hands; this swaps the feed and keeps every other address. Feeds the broadcaster
/// already owns are left alone, so the script is safe to re-run.
///
/// Usage (from packages/contracts, key in the environment, never on the command line):
///   NETWORK_NAME=robinhood_testnet PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY \
///   forge script script/RepointFeeds.s.sol --rpc-url $RPC_URL --broadcast
contract RepointFeeds is Script {
    function run() external {
        string memory json = vm.readFile(string.concat("deployments/", vm.envString("NETWORK_NAME"), ".json"));
        MarketRegistry registry = MarketRegistry(vm.parseJsonAddress(json, ".marketRegistry"));
        OracleRouter router = OracleRouter(vm.parseJsonAddress(json, ".oracleRouter"));
        uint256 key = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(key);

        bytes32[] memory ids = registry.allMarketIds();
        vm.startBroadcast(key);
        for (uint256 i; i < ids.length; ++i) {
            address old = router.primarySource(ids[i]);
            if (MockPriceFeed(old).owner() == me) continue;
            uint8 dec = router.primaryDecimals(ids[i]);
            (uint256 price,) = IPriceFeed(old).latestPrice();
            address feed = address(new MockPriceFeed(me, dec, price));
            router.setPrimarySource(ids[i], feed, dec);
            console.log(string(abi.encodePacked(ids[i])), "feed:", feed);
        }
        vm.stopBroadcast();
    }
}
