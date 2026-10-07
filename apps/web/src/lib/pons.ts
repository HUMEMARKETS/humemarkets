import type { ReviewLine } from "./review";

/// Estimates for a Pons swap, from the pool's sqrt price and in-range liquidity (`/v1/pons/tokens`). A pool
/// holds ETH as currency0 and the token as currency1. The estimate assumes the trade stays inside the current
/// liquidity range; a bigger trade gets a worse price, and the router's minimum output turns that into a
/// refusal and not a bad fill. Numbers, not bigints: this only feeds a review and is never settlement.

export const SLIPPAGE_BPS = 300n;
const Q96 = 2 ** 96;

export interface PoolSnapshot {
  sqrtPriceX96: string;
  liquidity: string;
}

export interface SwapEstimate {
  /// Output in base units (wei for a sell, token units for a buy).
  out: bigint;
  /// How much worse than the spot price this trade fills, in percent (0 for a trade too small to move it).
  impactPct: number;
}

function parts(pool: PoolSnapshot) {
  const root = Number(pool.sqrtPriceX96) / Q96;
  const liquidity = Number(pool.liquidity);
  return root > 0 && liquidity > 0 ? { root, liquidity } : undefined;
}

/// Tokens received for `ethIn` wei.
export function estimateBuy(pool: PoolSnapshot, ethIn: bigint): SwapEstimate | undefined {
  const p = parts(pool);
  if (!p || ethIn <= 0n) return undefined;
  const dx = Number(ethIn);
  // L * (s - s') with s' = L*s / (L + dx*s), rearranged so a tiny trade does not lose its digits to subtraction.
  const out = (p.liquidity * dx * p.root * p.root) / (p.liquidity + dx * p.root);
  const spotOut = dx * p.root * p.root;
  return { out: BigInt(Math.floor(out)), impactPct: Math.max(0, (1 - out / spotOut) * 100) };
}

/// Wei received for `tokensIn` token units.
export function estimateSell(pool: PoolSnapshot, tokensIn: bigint): SwapEstimate | undefined {
  const p = parts(pool);
  if (!p || tokensIn <= 0n) return undefined;
  const dy = Number(tokensIn);
  const next = p.root + dy / p.liquidity;
  const out = dy / (p.root * next);
  const spotOut = dy / (p.root * p.root);
  return { out: BigInt(Math.floor(out)), impactPct: Math.max(0, (1 - out / spotOut) * 100) };
}

/// The least the router may deliver: the estimate less the tolerance. Below this the trade reverts.
export function minimumOut(estimate: bigint, slippageBps = SLIPPAGE_BPS): bigint {
  return (estimate * (10_000n - slippageBps)) / 10_000n;
}

export const PONS_WARNING =
  "Pons tokens are launched by anyone. Hume does not vet them, and a token can lose all its value. Only spend what you can lose.";

/// The review rows for a buy or a sell, in the one wording the other money paths use.
export function ponsReview(o: {
  side: "buy" | "sell";
  symbol: string;
  inAmount: string;
  estimate: string;
  minimum: string;
  impactPct: number;
  priceLine: string;
}): { rows: ReviewLine[]; worstCase: string } {
  const buying = o.side === "buy";
  return {
    rows: [
      { label: "You pay", value: buying ? `${o.inAmount} ETH` : `${o.inAmount} ${o.symbol}`, strong: true },
      { label: "You get, about", value: buying ? `${o.estimate} ${o.symbol}` : `${o.estimate} ETH` },
      { label: "At least", value: buying ? `${o.minimum} ${o.symbol}` : `${o.minimum} ETH`, strong: true },
      { label: "Pool price now", value: o.priceLine },
      { label: "Price impact", value: `${o.impactPct.toFixed(2)}%` },
      { label: "Venue cut", value: "None. Hume adds no fee to a Pons swap." },
    ],
    worstCase: `If the price moves more than ${Number(SLIPPAGE_BPS) / 100}% before this confirms, the swap is refused and nothing is spent but gas. Once it fills, ${o.symbol} can still lose all its value.`,
  };
}
