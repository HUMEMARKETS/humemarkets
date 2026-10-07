import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { LISTING_TIERS, MARKET_GROUPS, type ListingTier, type MarketGroup } from "@hume/types";
import { ROBINHOOD_MAINNET_CHAIN_ID, ROBINHOOD_TESTNET_CHAIN_ID } from "./chains.js";
import {
  assertTierInvariant,
  feedForSymbol,
  marketForSymbol,
  marketsForChain,
  marketsForGroup,
  groupForSymbol,
  marketsForTier,
  validateMarkets,
  type MarketListing,
} from "./markets.js";

const FEED = `0x${"cd".repeat(20)}` as const;

/// A valid tradeable row, for mutating one field at a time.
const tradeable: MarketListing = {
  symbol: "TEST",
  name: "Test • Robinhood Token",
  token: `0x${"ab".repeat(20)}`,
  feed: FEED,
  maxLeverage: 5,
  maintenanceBps: 750,
  group: "us-equities",
  tier: "tradeable",
};

test("the checked-in literal matches deployments/robinhood_mainnet.markets.json", () => {
  // The JSON is the source of the market list, its groups and its tiers; the literal in markets.ts is
  // generated from it by `pnpm --filter @hume/config sync:markets`. This test is what makes the
  // generated copy safe: edit the JSON and forget to sync, and it fails here rather than in the UI.
  const jsonPath = resolve(import.meta.dirname, "../../contracts/deployments/robinhood_mainnet.markets.json");
  const file = JSON.parse(readFileSync(jsonPath, "utf8")) as { chainId: number; markets: MarketListing[] };
  assert.equal(file.chainId, ROBINHOOD_MAINNET_CHAIN_ID);
  const recorded = marketsForChain(ROBINHOOD_MAINNET_CHAIN_ID);
  assert.equal(recorded.length, file.markets.length, "market count differs: run sync:markets");
  assert.deepEqual(
    recorded.map((m) => ({ ...m })),
    file.markets.map((m) => ({ ...m })),
    "the literal in src/markets.ts differs from the deployment file: run sync:markets",
  );
});

test("36 mainnet markets are tradeable with a feed, and 4 China names are quoted without one", () => {
  const all = marketsForChain(ROBINHOOD_MAINNET_CHAIN_ID);
  assert.equal(all.length, 40);
  for (const market of all) {
    if (market.tier === "quoted") {
      assert.equal(market.feed, undefined, market.symbol);
      continue;
    }
    assert.equal(market.tier, "tradeable", market.symbol);
    assert.ok(market.feed, `${market.symbol} has no feed`);
  }
});

test("marketsForGroup returns each group's set, the groups partition the list, and an empty group is []", () => {
  const symbols = (group: MarketGroup) => marketsForGroup(ROBINHOOD_MAINNET_CHAIN_ID, group).map((m) => m.symbol);
  assert.deepEqual(symbols("china"), ["BABA", "EWY", "TSM", "UMC", "FUTU", "EWT", "SIMO"]);
  assert.deepEqual(symbols("commodities"), ["SLV", "USO"]);
  assert.deepEqual(symbols("etf"), ["SPY", "QQQ"]);
  assert.equal(symbols("us-equities").length, 25);
  assert.deepEqual(symbols("us-equities").slice(0, 3), ["NVDA", "AAPL", "TSLA"]);
  assert.deepEqual(symbols("crypto"), ["BTC", "ETH", "LINK", "GLD"]);
  // pons arrives later. Empty is a real answer for a group that exists; it is an unknown group that
  // must throw (next test).
  assert.deepEqual(symbols("pons"), []);
  // Every market is in exactly one group, and every group in the data is a known one.
  const total = MARKET_GROUPS.reduce((sum, group) => sum + symbols(group).length, 0);
  assert.equal(total, marketsForChain(ROBINHOOD_MAINNET_CHAIN_ID).length);
});

test("marketsForTier returns the tier's set, and the tiers partition the list", () => {
  assert.equal(marketsForTier(ROBINHOOD_MAINNET_CHAIN_ID, "tradeable").length, 36);
  assert.deepEqual(marketsForTier(ROBINHOOD_MAINNET_CHAIN_ID, "quoted").map((m) => m.symbol), ["UMC", "FUTU", "EWT", "SIMO"]);
  assert.deepEqual(marketsForTier(ROBINHOOD_MAINNET_CHAIN_ID, "listed"), []);
  const total = LISTING_TIERS.reduce((sum, tier) => sum + marketsForTier(ROBINHOOD_MAINNET_CHAIN_ID, tier).length, 0);
  assert.equal(total, marketsForChain(ROBINHOOD_MAINNET_CHAIN_ID).length);
});

test("an unknown group, tier or chain is an error, never a silent empty list", () => {
  assert.throws(() => marketsForGroup(ROBINHOOD_MAINNET_CHAIN_ID, "nasdaq" as MarketGroup), /unknown market group "nasdaq"/);
  assert.throws(() => marketsForTier(ROBINHOOD_MAINNET_CHAIN_ID, "tradable" as ListingTier), /unknown listing tier "tradable"/);
  assert.throws(() => marketsForChain(1 as never), /no market list recorded for chain 1/);
});

test("THE TIER BOUNDARY, direction 1: a quoted or listed entry given a feed address fails", () => {
  // This is the direction that stops a display price reaching settlement. A DexScreener or reference
  // price must never be reachable through a field that settlement code reads.
  for (const tier of ["quoted", "listed"] as const) {
    assert.throws(
      () => assertTierInvariant({ symbol: "BABA", tier, feed: FEED }),
      /is tier "(quoted|listed)" but carries feed .*must have no feed, or its price could reach settlement/,
      `tier ${tier} with a feed must throw`,
    );
    assert.throws(() => validateMarkets([{ ...tradeable, tier, feed: FEED }]), /must have no feed/, `validateMarkets, tier ${tier}`);
  }
});

test("THE TIER BOUNDARY, direction 2: a tradeable entry with no feed address fails", () => {
  // The other direction, which matters just as much: a market that takes leverage and liquidates
  // positions with no price source would be a market that cannot be marked or liquidated.
  assert.throws(
    () => assertTierInvariant({ symbol: "NVDA", tier: "tradeable" }),
    /is tier "tradeable" but has no feed address/,
  );
  const { feed: _dropped, ...withoutFeed } = tradeable;
  assert.throws(() => validateMarkets([withoutFeed as MarketListing]), /has no feed address/);
  // An empty-string or zero feed is "no feed" too, not a feed.
  assert.throws(() => validateMarkets([{ ...tradeable, feed: "" as MarketListing["feed"] }]), /has no feed address/);
});

test("a valid row of each tier passes the invariant, so the check is not vacuous", () => {
  assert.doesNotThrow(() => validateMarkets([tradeable]));
  assert.doesNotThrow(() => validateMarkets([{ ...tradeable, symbol: "UMC", tier: "quoted", feed: undefined }]));
  assert.doesNotThrow(() => validateMarkets([{ ...tradeable, symbol: "FUTU", tier: "listed", feed: undefined }]));
  // And the real data passes it, every row, in both directions.
  assert.doesNotThrow(() => validateMarkets(marketsForChain(ROBINHOOD_MAINNET_CHAIN_ID)));
});

test("an unknown group or tier in the data itself is rejected at validation", () => {
  assert.throws(() => validateMarkets([{ ...tradeable, group: "nasdaq" as MarketGroup }]), /unknown group "nasdaq"/);
  assert.throws(() => validateMarkets([{ ...tradeable, tier: "Tradeable" as ListingTier }]), /unknown tier "Tradeable"/);
});

test("a duplicate symbol is rejected: the symbol is the on-chain market id", () => {
  assert.throws(() => validateMarkets([tradeable, { ...tradeable, name: "Other" }]), /is listed twice/);
});

test("feedForSymbol serves a tradeable market and refuses every other tier", () => {
  assert.equal(
    feedForSymbol(ROBINHOOD_MAINNET_CHAIN_ID, "NVDA"),
    marketForSymbol(ROBINHOOD_MAINNET_CHAIN_ID, "NVDA")?.feed,
  );
  assert.throws(() => feedForSymbol(ROBINHOOD_MAINNET_CHAIN_ID, "NOPE"), /no market "NOPE"/);
  assert.equal(marketForSymbol(ROBINHOOD_MAINNET_CHAIN_ID, "NOPE"), undefined);
});

test("testnet records an empty market list, which is an answer and not a missing one", () => {
  // The testnet stack was listed with mock tokens and mock feeds by AddMarket.s.sol, so there is no
  // robinhood_testnet.markets.json. An unknown chain still throws (see the unknown-chain test).
  assert.deepEqual(marketsForChain(ROBINHOOD_TESTNET_CHAIN_ID), []);
  assert.deepEqual(marketsForGroup(ROBINHOOD_TESTNET_CHAIN_ID, "us-equities"), []);
});

test("groupForSymbol reads the chain's listing, falls back to mainnet's for the same ticker, and invents nothing", () => {
  assert.equal(groupForSymbol(ROBINHOOD_MAINNET_CHAIN_ID, "SPY"), "etf");
  assert.equal(groupForSymbol(ROBINHOOD_MAINNET_CHAIN_ID, "BABA"), "china");
  // Testnet records no listing, so its mock SPY borrows mainnet's group.
  assert.equal(groupForSymbol(ROBINHOOD_TESTNET_CHAIN_ID, "SPY"), "etf");
  assert.equal(groupForSymbol(ROBINHOOD_TESTNET_CHAIN_ID, "NVDA"), "us-equities");
  assert.equal(groupForSymbol(ROBINHOOD_TESTNET_CHAIN_ID, "E2E"), undefined);
});
