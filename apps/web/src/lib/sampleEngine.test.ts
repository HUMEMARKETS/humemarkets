import assert from "node:assert/strict";
import { test } from "node:test";
import { InsufficientCollateralError, MarketPausedError, PositionLimitExceededError, InsufficientMarginError } from "@hume/sdk";
import type { Hex } from "@hume/types";
import {
  availableBalance,
  cancelOrder,
  closePosition,
  createAccount,
  increasePosition,
  isLiquidated,
  liquidateAt,
  liquidationPriceOf,
  lockedMargin,
  openPosition,
  placeLimitOrder,
  realizedPnl,
  reducePosition,
  tick,
  topUp,
  unrealizedPnl,
  type SampleMarket,
} from "./sampleEngine.js";

const NVDA = "0x4e56444100000000000000000000000000000000000000000000000000000000" as Hex;
const USD = 10n ** 6n;
const PRICE = 10n ** 18n;
const CAP = 50_000n * USD;

const market = (price: bigint, overrides: Partial<SampleMarket> = {}): SampleMarket => ({
  marketId: NVDA,
  price,
  takerFeeBps: 10n, // 0.10%
  maintenanceMarginRateBps: 500n, // 5%
  allowedLeverageTiers: [1n, 2n, 5n],
  active: true,
  ...overrides,
});

const start = () => createAccount(10_000n * USD);
const open = (account = start(), m = market(200n * PRICE), collateral = 1_000n * USD, leverage = 5n, isLong = true) =>
  openPosition(account, { market: m, isLong, collateral, leverage, now: 1, maxPositionNotional: CAP });

test("opening locks the margin, charges the fee and records the fill", () => {
  const { account, positionId } = open();
  assert.equal(positionId, 1n);
  // $1,000 margin x 5 = $5,000 notional, 0.10% fee = $5.
  assert.equal(lockedMargin(account), 1_000n * USD);
  assert.equal(account.balance, 10_000n * USD - 5n * USD);
  assert.equal(availableBalance(account), 10_000n * USD - 5n * USD - 1_000n * USD);
  assert.equal(account.fills[0]?.kind, "OPEN");
  assert.equal(account.positions[0]?.size, 5_000n * USD);
});

test("closing at a higher price pays a long, net of the closing fee", () => {
  const opened = open().account;
  const closed = closePosition(opened, 1n, market(220n * PRICE), 2);
  // +10% on $5,000 = +$500, minus a $5 closing fee (0.10% of the $5,000 notional).
  assert.equal(closed.positions[0]?.open, false);
  assert.equal(lockedMargin(closed), 0n);
  assert.equal(closed.balance, 10_000n * USD - 5n * USD + 500n * USD - 5n * USD);
  assert.equal(closed.fills[0]?.pnl, 500n * USD);
});

test("a short profits when the price falls", () => {
  const opened = open(start(), market(200n * PRICE), 1_000n * USD, 5n, false).account;
  const closed = closePosition(opened, 1n, market(180n * PRICE), 2);
  assert.equal(closed.fills[0]?.pnl, 500n * USD);
});

test("a loss deeper than the margin is capped at the margin", () => {
  const opened = open(start(), market(200n * PRICE), 1_000n * USD, 5n).account;
  const closed = closePosition(opened, 1n, market(100n * PRICE), 2);
  assert.equal(closed.fills[0]?.pnl, -1_000n * USD);
});

test("an order the balance cannot cover is refused as insufficient collateral", () => {
  assert.throws(() => open(start(), market(200n * PRICE), 10_000n * USD, 1n), InsufficientCollateralError);
  // The margin alone fits; the margin plus the fee does not.
  assert.throws(() => open(createAccount(1_000n * USD), market(200n * PRICE), 1_000n * USD, 5n), InsufficientCollateralError);
});

test("a leverage the market does not offer is refused", () => {
  assert.throws(() => open(start(), market(200n * PRICE), 100n * USD, 7n), InsufficientMarginError);
});

test("a position above the sample cap is refused", () => {
  assert.throws(() => open(createAccount(1_000_000n * USD), market(200n * PRICE), 20_000n * USD, 5n), PositionLimitExceededError);
});

test("a paused market refuses a new position", () => {
  assert.throws(() => open(start(), market(200n * PRICE, { active: false })), MarketPausedError);
});

test("the liquidation price follows the real rule and a long is liquidated at or below it", () => {
  const { account } = open();
  const position = account.positions[0]!;
  const liquidation = liquidationPriceOf(position, 500n);
  // 5x long, 5% maintenance: margin $1,000 on $5,000 leaves 15% of room, so $170.
  assert.equal(liquidation, 170n * PRICE);
  assert.equal(isLiquidated(position, 170n * PRICE, 500n), true);
  assert.equal(isLiquidated(position, 170n * PRICE + 1n, 500n), false);
});

test("a liquidation loses the margin and nothing more", () => {
  const opened = open().account;
  const liquidated = liquidateAt(opened, 1n, 170n * PRICE, 2);
  assert.equal(liquidated.fills[0]?.kind, "LIQUIDATION");
  assert.equal(liquidated.fills[0]?.pnl, -1_000n * USD);
  assert.equal(lockedMargin(liquidated), 0n);
  // The $5 opening fee and the $1,000 margin are gone; the other $8,995 is untouched.
  assert.equal(liquidated.balance, 9_000n * USD - 5n * USD);
});

test("tick liquidates a position whose price crossed and leaves the rest alone", () => {
  const opened = open().account;
  const safe = tick(opened, new Map([[NVDA, market(199n * PRICE)]]), 5, CAP);
  assert.equal(safe.fills.length, 0);
  assert.equal(safe.account.positions[0]?.open, true);

  const hit = tick(opened, new Map([[NVDA, market(169n * PRICE)]]), 5, CAP);
  assert.equal(hit.fills.length, 1);
  assert.equal(hit.fills[0]?.kind, "LIQUIDATION");
  assert.equal(hit.account.positions[0]?.closeKind, "LIQUIDATION");
});

test("reducing closes part, books its pnl and releases its share of the margin", () => {
  const opened = open().account;
  const reduced = reducePosition(opened, 1n, 2_500n * USD, market(220n * PRICE), 2);
  const position = reduced.positions[0]!;
  assert.equal(position.size, 2_500n * USD);
  assert.equal(position.collateral, 500n * USD);
  assert.equal(reduced.fills[0]?.pnl, 250n * USD);
  assert.throws(() => reducePosition(opened, 1n, 5_000n * USD, market(220n * PRICE), 2), /close the position/);
});

test("increasing averages the entry price by size", () => {
  const opened = open().account;
  const grown = increasePosition(opened, 1n, 5_000n * USD, 1_000n * USD, market(220n * PRICE), 2, CAP);
  const position = grown.positions[0]!;
  assert.equal(position.size, 10_000n * USD);
  assert.equal(position.entryPrice, 210n * PRICE);
  assert.equal(position.collateral, 2_000n * USD);
});

test("a limit order reserves nothing, fills when its price is reached, and survives a gone balance", () => {
  const placed = placeLimitOrder(start(), {
    market: market(200n * PRICE),
    isLong: true,
    collateral: 1_000n * USD,
    leverage: 5n,
    triggerPrice: 190n * PRICE,
    expiry: 9_999_999_999n,
    now: 1,
    maxPositionNotional: CAP,
  });
  assert.equal(lockedMargin(placed.account), 0n);

  const waiting = tick(placed.account, new Map([[NVDA, market(195n * PRICE)]]), 2, CAP);
  assert.equal(waiting.account.orders[0]?.status, "OPEN");

  const filled = tick(placed.account, new Map([[NVDA, market(189n * PRICE)]]), 3, CAP);
  assert.equal(filled.account.orders[0]?.status, "EXECUTED");
  assert.equal(filled.account.positions[0]?.entryPrice, 189n * PRICE);

  // Empty the balance, then reach the trigger: the order stays waiting.
  const broke = { ...placed.account, balance: 0n };
  assert.equal(tick(broke, new Map([[NVDA, market(189n * PRICE)]]), 3, CAP).account.orders[0]?.status, "OPEN");
});

test("an expired limit order is cancelled and a waiting one can be cancelled by hand", () => {
  const base = placeLimitOrder(start(), {
    market: market(200n * PRICE),
    isLong: false,
    collateral: 100n * USD,
    leverage: 2n,
    triggerPrice: 210n * PRICE,
    expiry: 10n,
    now: 1,
    maxPositionNotional: CAP,
  });
  const expired = tick(base.account, new Map([[NVDA, market(205n * PRICE)]]), 11_000, CAP);
  assert.equal(expired.account.orders[0]?.status, "CANCELLED");
  assert.equal(cancelOrder(base.account, base.orderId, 2).orders[0]?.status, "CANCELLED");
  assert.throws(() => cancelOrder(expired.account, base.orderId, 3), /no longer waiting/);
});

test("pnl figures add up across open and closed positions", () => {
  const first = open().account;
  const marks = (mark: bigint) => (id: Hex) => (id === NVDA ? mark : undefined);
  assert.equal(unrealizedPnl(first, marks(220n * PRICE)), 500n * USD);
  const closed = closePosition(first, 1n, market(220n * PRICE), 2);
  assert.equal(unrealizedPnl(closed, marks(300n * PRICE)), 0n);
  // 500 gained, 5 + 5 paid in fees.
  assert.equal(realizedPnl(closed), 500n * USD - 5n * USD - 5n * USD);
});

test("top up adds to the balance and is recorded", () => {
  const next = topUp(start(), 5_000n * USD, 1);
  assert.equal(next.balance, 15_000n * USD);
  assert.equal(next.fills[0]?.kind, "TOP_UP");
});
