// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {MockPonsToken, MockPonsFactory, MockPonsSeeder} from "../test/mocks/MockPons.sol";

/// @notice Testnet only. Adds mock copies of well-known mainnet Pons tokens (name, symbol, logo, description,
/// price) to the mock factory that `DeployPonsTestnet` already deployed, so the Pons market on testnet lists
/// more than three. Each token gets a real v4 pool the existing `HumePonsRouter` can trade. The list is data in
/// `deployments/pons_testnet_tokens.json`; the factory comes from `deployments/robinhood_testnet.pons.json`.
/// The deployer key also signs for live services, so a long run can lose a nonce race: run it in slices with
/// `FROM` (first row, default 0) and `COUNT` (rows, default all).
///
///   forge script script/DeployPonsTestnetMore.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract DeployPonsTestnetMore is Script {
    address internal constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;

    // Field order matches the JSON keys, which `parseJson` returns sorted alphabetically.
    struct Row {
        string description;
        string logo;
        string name;
        uint256 perEth;
        string symbol;
        string website;
    }

    function run() external {
        uint256 seedEth = vm.envOr("SEED_ETH_WEI", uint256(0.00004 ether));
        address factoryAddress =
            vm.parseJsonAddress(vm.readFile("deployments/robinhood_testnet.pons.json"), ".ponsFactory");
        Row[] memory rows = abi.decode(vm.parseJson(vm.readFile("deployments/pons_testnet_tokens.json")), (Row[]));
        MockPonsFactory factory = MockPonsFactory(factoryAddress);
        uint256 from = vm.envOr("FROM", uint256(0));
        uint256 to = from + vm.envOr("COUNT", rows.length);
        if (to > rows.length) to = rows.length;

        vm.startBroadcast();
        MockPonsSeeder seeder = new MockPonsSeeder(POOL_MANAGER);
        for (uint256 i = from; i < to; i++) {
            Row memory row = rows[i];
            MockPonsToken token = new MockPonsToken(row.name, row.symbol, row.logo, row.description, row.website);
            factory.graduate(address(token), 200);
            token.mint(address(seeder), seedEth * row.perEth * 2);
            // sqrtPriceX96 = sqrt(tokens per ETH) * 2^96 = sqrt(perEth * 2^192)
            seeder.seed{value: seedEth}(address(token), uint160(Math.sqrt(row.perEth << 192)));
            console.log(row.symbol, address(token));
        }
        vm.stopBroadcast();
    }
}
