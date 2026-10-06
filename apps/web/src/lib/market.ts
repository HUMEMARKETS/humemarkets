import { hexToString } from "viem";
import type { Hex, MarketGroup } from "@hume/types";

/// Market ids are ASCII right-padded with zero bytes (see `resolveMarketId` in the SDK), so the
/// symbol is recoverable without a lookup table — new markets render with no code change.
export function symbolOf(marketId: Hex): string {
  return hexToString(marketId, { size: 32 }).replace(/\0+$/, "");
}

export const perpLabel = (marketId: Hex) => `${symbolOf(marketId)}-PERP`;

/// Why the terminal refuses to open a position on this market, or `undefined` when it does not.
/// A paused market is still a shipped market: it is listed, it keeps pricing, and the ticket says
/// plainly that it cannot be traded rather than failing at signature time (CLAUDE.md, Phase 6).
/// `active` is `undefined` while the market config is still loading, which blocks nothing.
export function tradeBlocker(active: boolean | undefined): string | undefined {
  return active === false ? "This market is paused. Prices keep updating; new positions are refused." : undefined;
}

/// What every screen says when the registry cannot be read, so two panels never word one failure two ways.
export const REGISTRY_ERROR = "The registry could not be read right now. Try again in a moment.";

/// How a market group (`MARKET_GROUPS` in `@hume/types`, assigned per market in `@hume/config`) is named on screen.
export const MARKET_GROUP_LABEL: Record<MarketGroup, string> = {
  "us-equities": "US equities",
  china: "China",
  crypto: "Crypto",
  pons: "Pons",
};
