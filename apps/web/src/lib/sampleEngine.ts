import {
  HumeContractError,
  HumeError,
  InsufficientCollateralError,
  InsufficientMarginError,
  MarketPausedError,
  PositionLimitExceededError,
  margin,
} from "@hume/sdk";
import type { Hex, PerpPosition } from "@hume/types";

/// The sample account's rules, as pure functions over plain data. Nothing here touches a wallet, the
/// chain or the network: the caller hands in the real price and the real market parameters, and the
/// engine decides what a fill would have done. That keeps sample mode a data-source swap (one component
/// tree) and keeps every rule testable without a browser.
///
/// What is real: the price a fill uses, the taker fee, the maintenance-margin rate, the leverage
/// tiers. What is simulated: the vault, the fills, the positions. What is not simulated: funding is
/// shown on the ticket but never charged, and there is no slippage, because the fill is at the index
/// price the API reports.

/// Prefix of every sample "transaction hash", so no surface can mistake one for a real hash or build
/// an explorer link from it.
export const SAMPLE_HASH_PREFIX = "sample:";
export const isSampleHash = (hash: string) => hash.startsWith(SAMPLE_HASH_PREFIX);

/// Thrown for an action sample mode does not simulate, so the person reads a sentence rather than a
/// missing-function error.
export class SampleUnsupportedError extends HumeError {}
/// Thrown when there is no price to fill against: the market is shut and the API has no close either.
export class SampleNoPriceError extends HumeError {}
/// Thrown when the sample refuses something, with a message that is already a sentence for the person.
export class SampleRefusedError extends HumeError {}

export type SampleFillKind = "OPEN" | "CLOSE" | "REDUCE" | "INCREASE" | "LIQUIDATION" | "LIMIT_PLACED" | "LIMIT_CANCELLED" | "LIMIT_FILLED" | "TOP_UP";

export interface SamplePosition extends PerpPosition {
  openedAt: number;
  closedAt?: number;
  closePrice?: bigint;
  closeKind?: "CLOSE" | "LIQUIDATION";
}

export interface SampleOrder {
  id: bigint;
  marketId: Hex;
  isLong: boolean;
  collateral: bigint;
  leverage: bigint;
  triggerPrice: bigint;
  expiry: bigint;
  status: "OPEN" | "EXECUTED" | "CANCELLED";
  positionId: bigint;
}

export interface SampleFill {
  id: number;
  at: number;
  kind: SampleFillKind;
  marketId?: Hex;
  positionId?: bigint;
  isLong?: boolean;
  size?: bigint;
  price?: bigint;
  pnl?: bigint;
  fee?: bigint;
  amount?: bigint;
}

export interface SampleAccount {
  /// The vault ledger, before locked margin is subtracted, in settlement-token base units.
  balance: bigint;
  positions: SamplePosition[];
  orders: SampleOrder[];
  fills: SampleFill[];
  nextId: number;
  /// Every sample account starts here; reset returns to it.
  startingBalance: bigint;
}

/// What the engine needs to know about one market at the moment of an action.
export interface SampleMarket {
  marketId: Hex;
  /// 18 decimals. The real index price, or the last close while the session is shut.
  price: bigint;
  takerFeeBps: bigint;
  maintenanceMarginRateBps: bigint;
  allowedLeverageTiers: bigint[];
  active: boolean;
}

export function createAccount(startingBalance: bigint): SampleAccount {
  return { balance: startingBalance, positions: [], orders: [], fills: [], nextId: 1, startingBalance };
}

export const openPositions = (account: SampleAccount) => account.positions.filter((position) => position.open);

export function lockedMargin(account: SampleAccount): bigint {
  return openPositions(account).reduce((sum, position) => sum + position.collateral, 0n);
}

export function availableBalance(account: SampleAccount): bigint {
  const available = account.balance - lockedMargin(account);
  return available < 0n ? 0n : available;
}

export function realizedPnl(account: SampleAccount): bigint {
  return account.positions.reduce((sum, position) => sum + position.realizedPnl, 0n);
}

export function unrealizedPnl(account: SampleAccount, markOf: (marketId: Hex) => bigint | undefined): bigint {
  return openPositions(account).reduce((sum, position) => {
    const mark = markOf(position.marketId);
    return mark === undefined ? sum : sum + margin.unrealizedPnl(position.isLong, position.entryPrice, mark, position.size);
  }, 0n);
}

function withFill(account: SampleAccount, fill: Omit<SampleFill, "id">): SampleAccount {
  return { ...account, fills: [{ ...fill, id: account.nextId }, ...account.fills].slice(0, 200), nextId: account.nextId + 1 };
}

export interface OpenParams {
  market: SampleMarket;
  isLong: boolean;
  collateral: bigint;
  leverage: bigint;
  now: number;
  /// The sample account's own ceiling on one position's notional, base units.
  maxPositionNotional: bigint;
}

/// The rules an order breaks before the balance is even asked, in the order a trader would hit them.
/// Each is a typed SDK error, so the same `errorMessage` that explains a chain revert explains a sample
/// one, in the same words. The ticket shows these as it previews; opening throws the first.
export function openViolations(params: Pick<OpenParams, "market" | "collateral" | "leverage" | "maxPositionNotional">): HumeContractError[] {
  const { market, collateral, leverage, maxPositionNotional } = params;
  const found: HumeContractError[] = [];
  if (!market.active) found.push(new MarketPausedError("MarketPaused", [market.marketId]));
  if (!market.allowedLeverageTiers.includes(leverage)) found.push(new InsufficientMarginError("LeverageNotAllowed", [leverage]));
  const notional = collateral * leverage;
  if (notional > maxPositionNotional) found.push(new PositionLimitExceededError("PositionLimitExceeded", [notional, maxPositionNotional]));
  return found;
}

export function checkOpen(account: SampleAccount, params: OpenParams): void {
  const { market, collateral, leverage } = params;
  if (collateral <= 0n) throw new InsufficientCollateralError("InsufficientCollateral", [0n]);
  const first = openViolations(params)[0];
  if (first) throw first;
  const fee = margin.feeFromBps(collateral * leverage, market.takerFeeBps);
  if (availableBalance(account) < collateral + fee) throw new InsufficientCollateralError("InsufficientCollateral", [collateral + fee]);
}

export function openPosition(account: SampleAccount, params: OpenParams): { account: SampleAccount; positionId: bigint } {
  checkOpen(account, params);
  const { market, isLong, collateral, leverage, now } = params;
  const size = collateral * leverage;
  const fee = margin.feeFromBps(size, market.takerFeeBps);
  const positionId = BigInt(account.nextId);
  const position: SamplePosition = {
    positionId,
    marketId: market.marketId,
    isLong,
    entryPrice: market.price,
    size,
    collateral,
    leverage,
    realizedPnl: -fee,
    fundingAccrued: 0n,
    lastFundingIndex: 0n,
    open: true,
    owner: "0x0000000000000000000000000000000000000000",
    openedAt: now,
  };
  const next = withFill(
    { ...account, balance: account.balance - fee, positions: [position, ...account.positions] },
    { at: now, kind: "OPEN", marketId: market.marketId, positionId, isLong, size, price: market.price, fee },
  );
  return { account: next, positionId };
}

/// Closes a position at `price` for the stated reason. A liquidation loses the whole margin and never
/// more: the position cannot owe the vault, which is what the insurance fund is for on chain.
function settle(account: SampleAccount, positionId: bigint, price: bigint, now: number, kind: "CLOSE" | "LIQUIDATION", feeBps: bigint): SampleAccount {
  const position = account.positions.find((candidate) => candidate.positionId === positionId && candidate.open);
  if (!position) throw new SampleRefusedError("That position is already closed.");
  const rawPnl = margin.unrealizedPnl(position.isLong, position.entryPrice, price, position.size);
  const fee = kind === "CLOSE" ? margin.feeFromBps(position.size, feeBps) : 0n;
  const pnl = kind === "LIQUIDATION" ? -position.collateral : rawPnl < -position.collateral ? -position.collateral : rawPnl;
  const positions = account.positions.map((candidate) =>
    candidate.positionId === positionId
      ? { ...candidate, open: false, closedAt: now, closePrice: price, closeKind: kind, realizedPnl: candidate.realizedPnl + pnl - fee }
      : candidate,
  );
  return withFill(
    { ...account, balance: account.balance + pnl - fee, positions },
    { at: now, kind: kind === "CLOSE" ? "CLOSE" : "LIQUIDATION", marketId: position.marketId, positionId, isLong: position.isLong, size: position.size, price, pnl, fee },
  );
}

export const closePosition = (account: SampleAccount, positionId: bigint, market: SampleMarket, now: number): SampleAccount =>
  settle(account, positionId, market.price, now, "CLOSE", market.takerFeeBps);

export function liquidationPriceOf(position: PerpPosition, maintenanceMarginRateBps: bigint): bigint {
  return margin.liquidationPrice(position.isLong, position.entryPrice, position.collateral, position.size, maintenanceMarginRateBps);
}

/// Whether `price` is at or beyond the position's liquidation price.
export function isLiquidated(position: PerpPosition, price: bigint, maintenanceMarginRateBps: bigint): boolean {
  const liquidation = liquidationPriceOf(position, maintenanceMarginRateBps);
  return position.isLong ? price <= liquidation : price >= liquidation;
}

/// Replays one position as if the price had reached its liquidation price. Sample mode's answer to
/// "a real liquidation takes a 20% move and I will never see one": the person asks for it, the screen
/// says it is a replay, and the result is the real rule applied to a real position.
export function liquidateAt(account: SampleAccount, positionId: bigint, price: bigint, now: number): SampleAccount {
  return settle(account, positionId, price, now, "LIQUIDATION", 0n);
}

export function reducePosition(account: SampleAccount, positionId: bigint, sizeDelta: bigint, market: SampleMarket, now: number): SampleAccount {
  const position = account.positions.find((candidate) => candidate.positionId === positionId && candidate.open);
  if (!position) throw new SampleRefusedError("That position is already closed.");
  if (sizeDelta <= 0n || sizeDelta >= position.size) throw new SampleRefusedError("To reduce by the full size, close the position.");
  const share = (value: bigint) => (value * sizeDelta) / position.size;
  const pnl = margin.unrealizedPnl(position.isLong, position.entryPrice, market.price, sizeDelta);
  const fee = margin.feeFromBps(sizeDelta, market.takerFeeBps);
  const released = share(position.collateral);
  const positions = account.positions.map((candidate) =>
    candidate.positionId === positionId
      ? { ...candidate, size: candidate.size - sizeDelta, collateral: candidate.collateral - released, realizedPnl: candidate.realizedPnl + pnl - fee }
      : candidate,
  );
  return withFill(
    { ...account, balance: account.balance + pnl - fee, positions },
    { at: now, kind: "REDUCE", marketId: position.marketId, positionId, isLong: position.isLong, size: sizeDelta, price: market.price, pnl, fee },
  );
}

export function increasePosition(
  account: SampleAccount,
  positionId: bigint,
  addSize: bigint,
  addCollateral: bigint,
  market: SampleMarket,
  now: number,
  maxPositionNotional: bigint,
): SampleAccount {
  const position = account.positions.find((candidate) => candidate.positionId === positionId && candidate.open);
  if (!position) throw new SampleRefusedError("That position is already closed.");
  if (!market.active) throw new MarketPausedError("MarketPaused", [market.marketId]);
  const size = position.size + addSize;
  const collateral = position.collateral + addCollateral;
  if (size > maxPositionNotional) throw new PositionLimitExceededError("PositionLimitExceeded", [size, maxPositionNotional]);
  if (collateral === 0n || !market.allowedLeverageTiers.some((tier) => tier * collateral >= size)) {
    throw new InsufficientMarginError("InsufficientMargin", [size, collateral]);
  }
  const fee = margin.feeFromBps(addSize, market.takerFeeBps);
  if (availableBalance(account) < addCollateral + fee) throw new InsufficientCollateralError("InsufficientCollateral", [addCollateral + fee]);
  // The new entry is the size-weighted average of the old entry and this fill.
  const entryPrice = (position.entryPrice * position.size + market.price * addSize) / size;
  const positions = account.positions.map((candidate) =>
    candidate.positionId === positionId
      ? { ...candidate, size, collateral, entryPrice, leverage: collateral === 0n ? 0n : size / collateral, realizedPnl: candidate.realizedPnl - fee }
      : candidate,
  );
  return withFill(
    { ...account, balance: account.balance - fee, positions },
    { at: now, kind: "INCREASE", marketId: position.marketId, positionId, isLong: position.isLong, size: addSize, price: market.price, fee },
  );
}

export interface LimitParams {
  market: SampleMarket;
  isLong: boolean;
  collateral: bigint;
  leverage: bigint;
  triggerPrice: bigint;
  /// Unix seconds.
  expiry: bigint;
  now: number;
  maxPositionNotional: bigint;
}

/// A limit order reserves nothing, exactly as on chain: the margin and fee are taken when it fills.
export function placeLimitOrder(account: SampleAccount, params: LimitParams): { account: SampleAccount; orderId: bigint } {
  const { market, isLong, collateral, leverage, triggerPrice, expiry, now, maxPositionNotional } = params;
  // Same refusals as a market order, except the balance: it is only checked when the order fills.
  checkOpen({ ...account, balance: account.balance + collateral * leverage }, { market, isLong, collateral, leverage, now, maxPositionNotional });
  const orderId = BigInt(account.nextId);
  const order: SampleOrder = { id: orderId, marketId: market.marketId, isLong, collateral, leverage, triggerPrice, expiry, status: "OPEN", positionId: 0n };
  return {
    account: withFill({ ...account, orders: [order, ...account.orders] }, { at: now, kind: "LIMIT_PLACED", marketId: market.marketId, isLong, price: triggerPrice, size: collateral * leverage }),
    orderId,
  };
}

export function cancelOrder(account: SampleAccount, orderId: bigint, now: number): SampleAccount {
  const order = account.orders.find((candidate) => candidate.id === orderId && candidate.status === "OPEN");
  if (!order) throw new SampleRefusedError("That order is no longer waiting.");
  return withFill(
    { ...account, orders: account.orders.map((candidate) => (candidate.id === orderId ? { ...candidate, status: "CANCELLED" } : candidate)) },
    { at: now, kind: "LIMIT_CANCELLED", marketId: order.marketId, isLong: order.isLong, price: order.triggerPrice },
  );
}

export function topUp(account: SampleAccount, amount: bigint, now: number): SampleAccount {
  return withFill({ ...account, balance: account.balance + amount }, { at: now, kind: "TOP_UP", amount });
}

export interface TickResult {
  account: SampleAccount;
  /// Fills this tick produced that the person did not ask for, oldest first.
  fills: SampleFill[];
}

/// Applies the price to everything that reacts to it, with no one clicking: a liquidation when a
/// position's price crosses its liquidation price, and a limit order when its trigger is reached.
export function tick(account: SampleAccount, markets: Map<Hex, SampleMarket>, now: number, maxPositionNotional: bigint): TickResult {
  let next = account;
  const before = next.nextId;
  const nowSeconds = BigInt(Math.floor(now / 1000));

  for (const position of openPositions(next)) {
    const market = markets.get(position.marketId);
    if (market && isLiquidated(position, market.price, market.maintenanceMarginRateBps)) {
      next = liquidateAt(next, position.positionId, market.price, now);
    }
  }
  for (const order of next.orders.filter((candidate) => candidate.status === "OPEN")) {
    const market = markets.get(order.marketId);
    if (!market) continue;
    if (order.expiry <= nowSeconds) {
      next = { ...next, orders: next.orders.map((candidate) => (candidate.id === order.id ? { ...candidate, status: "CANCELLED" } : candidate)) };
      continue;
    }
    const reached = order.isLong ? market.price <= order.triggerPrice : market.price >= order.triggerPrice;
    if (!reached) continue;
    try {
      const opened = openPosition(next, { market, isLong: order.isLong, collateral: order.collateral, leverage: order.leverage, now, maxPositionNotional });
      next = {
        ...opened.account,
        orders: opened.account.orders.map((candidate) => (candidate.id === order.id ? { ...candidate, status: "EXECUTED", positionId: opened.positionId } : candidate)),
      };
    } catch {
      // The balance was gone by the time it filled: the order stays waiting, as it would on chain.
    }
  }
  return { account: next, fills: next.fills.filter((fill) => fill.id >= before).reverse() };
}

/// The same fixed shapes the live hooks return, so a component reads one thing in both modes.
export function toVaultBalances(account: SampleAccount) {
  const locked = lockedMargin(account);
  return { balance: account.balance, lockedMargin: locked, available: availableBalance(account) };
}

export function toOpenOrders(account: SampleAccount, owner: `0x${string}`) {
  return [...account.orders].reverse().map((order) => ({ ...order, owner }));
}
