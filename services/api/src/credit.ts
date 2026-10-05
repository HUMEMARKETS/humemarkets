import { isAddress, type Address } from "viem";

/// The credit pair's read surface, hand-written from `HumeCreditPair.sol` and `HumeCreditRegistry.sol`
/// as the contracts lane's Phase 9 handoff (`docs/evidence/phase-9.md`) documents them. Pure helpers
/// for `routes/credit.ts`, so the scaling can be unit tested.

export const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export const creditPairAbi = [
  { type: "function", name: "marketId", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "registry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "collateralToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "debtToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalSupplyCollateral", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalBorrowedDebt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isLiquidatable", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "collateralAmount", type: "uint256" },
      { name: "debtAmount", type: "uint256" },
      { name: "collateralValueUsd", type: "uint256" },
      { name: "healthFactorBps", type: "uint256" },
    ],
  },
] as const;

export const creditRegistryAbi = [
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "marketId", type: "bytes32" },
          { name: "slug", type: "string" },
          { name: "collateralToken", type: "address" },
          { name: "debtToken", type: "address" },
          { name: "pairAddress", type: "address" },
          { name: "oracle", type: "address" },
          { name: "riskTier", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "maxLtvBps", type: "uint256" },
          { name: "liquidationLtvBps", type: "uint256" },
          { name: "maxLeverageBps", type: "uint256" },
          { name: "supplyCap", type: "uint256" },
          { name: "borrowCap", type: "uint256" },
        ],
      },
    ],
  },
] as const;

export const erc20DecimalsAbi = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

/// `HumeCreditRegistry.MarketStatus` and `.RiskTier`, by their on-chain numbers.
export const CREDIT_STATUS = ["normal", "reduce_only", "paused"] as const;
export const CREDIT_TIER = ["tier_a", "tier_b", "tier_c", "experimental"] as const;

/// What `getPosition` returns for an account with no debt: 999.00x. A sentinel, not a measured ratio, so
/// the API reports `hasDebt: false` next to it and a client must not draw it as a real health factor.
export const NO_DEBT_HEALTH_FACTOR_BPS = 9_990_000n;

/// The pair address, from the deployment record when the config package lists it (the contracts lane's
/// `creditPairTslaUsdg`) and otherwise from `CREDIT_PAIR_ADDRESS`. Undefined until the pair is deployed.
export function resolveCreditPair(addresses: object, env: string | undefined): Address | undefined {
  const recorded = (addresses as Record<string, unknown>).creditPairTslaUsdg;
  const candidate = typeof recorded === "string" ? recorded : env?.trim();
  return candidate && isAddress(candidate) ? candidate : undefined;
}

export interface CreditPositionView {
  collateralAmount: bigint;
  debtAmount: bigint;
  collateralValueUsd: bigint;
  healthFactorBps: bigint;
}

export interface CreditPositionResponse {
  pair: string;
  wallet: string;
  /// Collateral and debt in each token's base units.
  collateralAmount: string;
  debtAmount: string;
  /// USD value of the collateral, scaled 1e18.
  collateralValueUsd: string;
  /// Basis points, 10000 = 1.00x, which is the liquidation boundary: below it the position can be liquidated.
  /// Higher is safer. With no debt the contract returns the 9990000 sentinel; read `hasDebt` first.
  healthFactorBps: string;
  hasDebt: boolean;
  liquidatable: boolean;
}

export function creditPositionResponse(pair: Address, wallet: string, view: CreditPositionView, liquidatable: boolean): CreditPositionResponse {
  return {
    pair: pair.toLowerCase(),
    wallet: wallet.toLowerCase(),
    collateralAmount: view.collateralAmount.toString(),
    debtAmount: view.debtAmount.toString(),
    collateralValueUsd: view.collateralValueUsd.toString(),
    healthFactorBps: view.healthFactorBps.toString(),
    hasDebt: view.debtAmount > 0n,
    liquidatable,
  };
}
