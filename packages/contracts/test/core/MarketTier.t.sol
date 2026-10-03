// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

import {AddMarketsMainnet} from "../../script/AddMarketsMainnet.s.sol";

/// @notice The listing-tier boundary on the contracts side: `AddMarketsMainnet` must list a `tradeable`
/// entry and must skip a `quoted` or `listed` one. A display-only entry has no Chainlink feed
/// (REFERENCE.md Section 2), so listing one would open a leveraged market with no price source — the
/// exact path by which a DexScreener price could reach settlement.
///
/// `_isTradeable` is internal, so the test inherits the script to reach it. Nothing is broadcast.
contract MarketTierHarness is AddMarketsMainnet {
    function isTradeable(string memory list, string memory path) external view returns (bool) {
        return _isTradeable(list, path);
    }
}

contract MarketTierTest is Test {
    MarketTierHarness internal harness;

    function setUp() public {
        harness = new MarketTierHarness();
    }

    function test_TradeableEntryIsListed() public view {
        string memory list = '{"markets":[{"symbol":"NVDA","tier":"tradeable"}]}';
        assertTrue(harness.isTradeable(list, ".markets[0]"), "a tradeable entry must be listed");
    }

    function test_QuotedEntryIsSkipped() public view {
        string memory list = '{"markets":[{"symbol":"UMC","tier":"quoted"}]}';
        assertFalse(harness.isTradeable(list, ".markets[0]"), "a quoted entry must never be listed on chain");
    }

    function test_ListedEntryIsSkipped() public view {
        string memory list = '{"markets":[{"symbol":"FUTU","tier":"listed"}]}';
        assertFalse(harness.isTradeable(list, ".markets[0]"), "a listed entry must never be listed on chain");
    }

    /// @notice An unknown tier is not treated as tradeable. Opening a market on a row nobody understands
    /// is the unsafe direction, so the skip is the default for anything that is not exactly "tradeable".
    function test_UnknownTierIsSkipped() public view {
        string memory list = '{"markets":[{"symbol":"HUH","tier":"Tradeable"}]}';
        assertFalse(harness.isTradeable(list, ".markets[0]"), "an unknown tier must not be listed");
    }

    /// @notice A market file written before tiers existed still lists exactly as it did before.
    function test_MissingTierKeyIsTreatedAsTradeable() public view {
        string memory list = '{"markets":[{"symbol":"NVDA","feed":"0x0000000000000000000000000000000000000001"}]}';
        assertTrue(harness.isTradeable(list, ".markets[0]"), "an entry with no tier key must still list");
    }

    /// @notice The real mainnet market file: all 32 rows are tradeable, so the live listing run is
    /// unchanged by this phase.
    function test_EveryMainnetMarketIsTradeable() public view {
        string memory list = vm.readFile("deployments/robinhood_mainnet.markets.json");
        uint256 count = abi.decode(vm.parseJson(list, ".markets[*].symbol"), (string[])).length;
        assertEq(count, 32, "the mainnet market file should hold 32 rows");
        for (uint256 i; i < count; i++) {
            string memory path = string.concat(".markets[", vm.toString(i), "]");
            assertTrue(harness.isTradeable(list, path), "every mainnet row is tier tradeable today");
        }
    }
}
