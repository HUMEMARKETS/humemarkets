/// Shared shapes mirroring the on-chain structs in `packages/contracts/src/interfaces/DataTypes.sol`
/// and the position-manager contracts. Contracts, API, indexer, SDK, and frontend all import
/// these instead of redefining them locally (DEVELOPMENT_STEPS.md "Monorepo tooling").

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

/// Mirrors `OptionType` in DataTypes.sol — numeric values must stay in sync with the enum order.
export enum OptionType {
  CALL = 0,
  PUT = 1,
}

/// Mirrors `MarketConfig` in DataTypes.sol.
export interface MarketConfig {
  marketId: Hex;
  underlyingToken: Address;
  oracleId: Hex;
  optionsEnabled: boolean;
  perpsEnabled: boolean;
  maxLeverage: bigint;
  openInterestCap: bigint;
  active: boolean;
}

/// Mirrors `OptionPositionManager.PositionStatus`.
export enum OptionPositionStatus {
  OPEN = 0,
  CLOSED = 1,
  SETTLED = 2,
}

/// Mirrors `OptionPositionManager.OptionPosition`.
export interface OptionPosition {
  positionId: bigint;
  marketId: Hex;
  optionType: OptionType;
  strike: bigint;
  expiry: bigint;
  contracts: bigint;
  entryPremium: bigint;
  collateral: bigint;
  realizedPnl: bigint;
  status: OptionPositionStatus;
  owner: Address;
}

/// Mirrors `PerpPositionManager.PerpPosition`.
export interface PerpPosition {
  positionId: bigint;
  marketId: Hex;
  isLong: boolean;
  entryPrice: bigint;
  size: bigint;
  collateral: bigint;
  leverage: bigint;
  realizedPnl: bigint;
  fundingAccrued: bigint;
  lastFundingIndex: bigint;
  open: boolean;
  owner: Address;
}

/// The group a market is listed under in the UI. Data, not UI structure: a market's group lives in
/// `packages/contracts/deployments/<network>.markets.json` and is read through `@hume/config`, so a
/// regrouping is a data change and never an edit to app code.
///
/// `china` is the group `REFERENCE.md` Section 2 Finding 2 researched: hard-capped at two tradeable
/// names (BABA, TSM) because only those two have a Chainlink feed on chain 4663. It is empty at launch
/// — Section 3.1 cut the group to Phase 18 — but the group exists here so the data can carry it.
export const MARKET_GROUPS = ["us-equities", "china", "crypto", "pons"] as const;

export type MarketGroup = (typeof MARKET_GROUPS)[number];

/// How far a listing goes, from a full leveraged market down to metadata only. The three-tier model in
/// `REFERENCE.md` Section 2: listing an asset is not the same as opening a leveraged market on it.
///
/// - `tradeable` — full ticket, leverage, positions, liquidation price. Priced by a Chainlink feed, so
///   **a tradeable listing must carry a feed address.**
/// - `quoted` — price, chart, 24h change, watchlist, searchable. No leverage and no trade button.
///   Priced off chain (DexScreener, or the Robinhood reference price) for display only.
/// - `listed` — name, logo, description, socials, and an honest "no price feed yet" state.
///
/// **A quoted or listed entry must have no feed address.** That is the boundary that stops a display
/// price reaching settlement, and `@hume/config`'s `marketsForTier` enforces it in both directions
/// rather than leaving it to convention.
export const LISTING_TIERS = ["tradeable", "quoted", "listed"] as const;

export type ListingTier = (typeof LISTING_TIERS)[number];

/// Tiers that are display only: their price never reaches `PriceValidator` or settlement.
export const DISPLAY_ONLY_TIERS = ["quoted", "listed"] as const satisfies ReadonlyArray<ListingTier>;

export function isMarketGroup(value: unknown): value is MarketGroup {
  return typeof value === "string" && (MARKET_GROUPS as readonly string[]).includes(value);
}

export function isListingTier(value: unknown): value is ListingTier {
  return typeof value === "string" && (LISTING_TIERS as readonly string[]).includes(value);
}

/// True when a listing of this tier settles on chain and therefore needs a price feed. The one place
/// that decides it, so the rule cannot drift between config, the API and the web app.
export function tierNeedsFeed(tier: ListingTier): boolean {
  return tier === "tradeable";
}
