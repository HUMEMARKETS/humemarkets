import assert from "node:assert/strict";
import { test } from "node:test";
import type { Hex } from "@hume/types";
import { cardProps, cardPartsFromSample } from "./pnlCard.js";
import { closePosition, createAccount, liquidateAt, openPosition, type SampleMarket } from "./sampleEngine.js";

const NVDA = "0x4e56444100000000000000000000000000000000000000000000000000000000" as Hex;
const USD = 10n ** 6n;
const PRICE = 10n ** 18n;
const market = (price: bigint): SampleMarket => ({ marketId: NVDA, price, takerFeeBps: 10n, maintenanceMarginRateBps: 500n, allowedLeverageTiers: [5n], active: true });
const open = () => openPosition(createAccount(10_000n * USD), { market: market(200n * PRICE), isLong: true, collateral: 1_000n * USD, leverage: 5n, now: Date.UTC(2026, 9, 5), maxPositionNotional: 50_000n * USD }).account;

test("a closed winner reads as a gain with its sign, entry, exit and size", () => {
  const closed = closePosition(open(), 1n, market(220n * PRICE), Date.UTC(2026, 9, 6));
  const props = cardProps(cardPartsFromSample(closed.positions[0]!, "NVDA", undefined, 6));
  assert.equal(props.status, "closed");
  assert.equal(props.direction, "gain");
  assert.equal(props.pnl, "+$490.00");
  assert.equal(props.roi, "+49.00%");
  assert.equal(props.entry, "$200.00");
  assert.equal(props.exit, "$220.00");
  assert.equal(props.size, "$5,000");
  assert.equal(props.period, "Closed Oct 6, 2026");
  assert.equal(props.sample, true);
});

test("a liquidation is its own status and a loss, never a plain close", () => {
  const liquidated = liquidateAt(open(), 1n, 170n * PRICE, Date.UTC(2026, 9, 6));
  const props = cardProps(cardPartsFromSample(liquidated.positions[0]!, "NVDA", undefined, 6));
  assert.equal(props.status, "liquidated");
  assert.equal(props.direction, "loss");
  assert.equal(props.pnl, "−$1,005.00");
  assert.equal(props.exit, "$170.00");
});

test("an open position uses the live mark, and a missing mark is a dash", () => {
  const position = open().positions[0]!;
  assert.equal(cardProps(cardPartsFromSample(position, "NVDA", 210n * PRICE, 6)).exit, "$210.00");
  assert.equal(cardProps(cardPartsFromSample(position, "NVDA", undefined, 6)).exit, undefined);
  // $500 of price pnl at a 10% rise less the $5 opening fee.
  assert.equal(cardProps(cardPartsFromSample(position, "NVDA", 220n * PRICE, 6)).pnl, "+$495.00");
});

test("a card that rounds to zero is flat, not a gain or a loss", () => {
  const props = cardProps({ symbol: "NVDA", isLong: true, leverage: 5, status: "closed", totalPnl: 1n, roiBps: 0n, entryPrice: PRICE, exitPrice: PRICE, size: 5_000n * USD, decimals: 6, sample: false });
  assert.equal(props.direction, "flat");
  assert.equal(props.sample, false);
});
