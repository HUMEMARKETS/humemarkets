import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE_ENTRIES, sampleBoard } from "./leaderboardFixture.js";
import { fmtSignedBps, rankEntries, sampleSelfEntry } from "./leaderboard.js";
import { closePosition, createAccount, openPosition, type SampleMarket } from "./sampleEngine.js";
import type { Hex } from "@hume/types";

const NVDA = "0x4e56444100000000000000000000000000000000000000000000000000000000" as Hex;
const USD = 10n ** 6n;
const PRICE = 10n ** 18n;
const market = (price: bigint): SampleMarket => ({ marketId: NVDA, price, takerFeeBps: 10n, maintenanceMarginRateBps: 500n, allowedLeverageTiers: [5n], active: true });

test("the fixture is twelve rows, all marked sample, and the board is full on every metric", () => {
  assert.equal(SAMPLE_ENTRIES.length, 12);
  assert.ok(SAMPLE_ENTRIES.every((entry) => entry.sample));
  for (const metric of ["pnl", "roi", "volume"] as const) {
    const board = sampleBoard(metric);
    assert.equal(board.sample, true);
    assert.deepEqual(board.entries.map((entry) => entry.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  }
});

test("ranking is by the metric as a number, ties on volume then wallet", () => {
  const [a, b] = SAMPLE_ENTRIES as [(typeof SAMPLE_ENTRIES)[number], (typeof SAMPLE_ENTRIES)[number]];
  const tied = [{ ...a, wallet: "0xb", totalPnl: 5n, volume: 10n }, { ...b, wallet: "0xa", totalPnl: 5n, volume: 10n }, { ...a, wallet: "0xc", totalPnl: 5n, volume: 99n }];
  assert.deepEqual(rankEntries(tied, "pnl").map((entry) => entry.wallet), ["0xc", "0xa", "0xb"]);
  const byPnl = sampleBoard("pnl").entries;
  assert.ok(byPnl[0]!.totalPnl >= byPnl[1]!.totalPnl);
  assert.equal(byPnl[0]!.totalPnl, 5130n * USD);
});

test("a sample account with no trades is not on the board, and one with a trade is", () => {
  assert.equal(sampleSelfEntry(createAccount(10_000n * USD), 0n), undefined);
  const opened = openPosition(createAccount(10_000n * USD), { market: market(200n * PRICE), isLong: true, collateral: 1_000n * USD, leverage: 5n, now: 1, maxPositionNotional: 50_000n * USD }).account;
  const closed = closePosition(opened, 1n, market(220n * PRICE), 2);
  const self = sampleSelfEntry(closed, 0n);
  assert.ok(self);
  assert.equal(self.tradeCount, 2);
  assert.equal(self.volume, 10_000n * USD);
  assert.equal(self.winRateBps, 10_000);
  // +$500 price pnl, $10 in fees, on $1,000 of margin: +49.00%.
  assert.equal(self.totalPnl, 490n * USD);
  assert.equal(self.roiBps, 4900n);
});

test("basis points read as a signed percentage", () => {
  assert.equal(fmtSignedBps(1250n), "+12.50%");
  assert.equal(fmtSignedBps(-37n), "−0.37%");
  assert.equal(fmtSignedBps(0n), "0.00%");
});
