import type { Address, Hex } from "@hume/types";
import type { HumeClient } from "./client.js";

/// Read-only views of the lending pair (Phase 9). The signatures are the ones the contracts lane published in
/// `docs/evidence/phase-9.md`, checked against `HumeCreditPair.sol` and `HumeCreditRegistry.sol`. They are
/// written out here as `as const` ABI fragments because the generated ABIs predate the credit stack, and the
/// return types are inferred from them rather than declared a second time.
///
/// Reads only. Supply, borrow, repay and withdraw are signed actions, and a signed action needs the review step
/// of Phase 8 first, so none is offered here.

const pairAbi = [
  { type: "function", name: "marketId", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "registry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "collateralToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "debtToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "oracle", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalSupplyCollateral", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalBorrowedDebt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "liquidationBonusBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
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
  { type: "function", name: "isLiquidatable", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "bool" }] },
] as const;

const registryAbi = [
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

const oracleAbi = [{ type: "function", name: "getPrice", stateMutability: "view", inputs: [{ name: "asset", type: "address" }], outputs: [{ type: "uint256" }] }] as const;

/// `HumeCreditRegistry.MarketStatus`: how much of the pair is open.
export const CREDIT_STATUS = ["NORMAL", "REDUCE_ONLY", "PAUSED"] as const;
export type CreditStatus = (typeof CREDIT_STATUS)[number];

/// Everything the lending page needs about one pair, in one read.
async function readPair(client: HumeClient, pair: Address) {
  const read = <Name extends "marketId" | "registry" | "collateralToken" | "debtToken" | "oracle" | "totalSupplyCollateral" | "totalBorrowedDebt" | "liquidationBonusBps">(functionName: Name) =>
    client.readContract({ address: pair, abi: pairAbi, functionName });
  const [marketId, registry, collateralToken, debtToken, oracle, totalSupplyCollateral, totalBorrowedDebt, liquidationBonusBps] = await Promise.all([
    read("marketId"),
    read("registry"),
    read("collateralToken"),
    read("debtToken"),
    read("oracle"),
    read("totalSupplyCollateral"),
    read("totalBorrowedDebt"),
    read("liquidationBonusBps"),
  ]);
  const config = await client.readContract({ address: registry, abi: registryAbi, functionName: "getMarket", args: [marketId] });
  return {
    pair,
    marketId: marketId as Hex,
    slug: config.slug,
    collateralToken,
    debtToken,
    oracle,
    status: CREDIT_STATUS[config.status] ?? "PAUSED",
    /// The borrow limit, in basis points of collateral value: borrowing past it reverts.
    maxLtvBps: config.maxLtvBps,
    /// Past this share of collateral value, the position can be liquidated.
    liquidationLtvBps: config.liquidationLtvBps,
    supplyCap: config.supplyCap,
    borrowCap: config.borrowCap,
    totalSupplyCollateral,
    totalBorrowedDebt,
    /// What a liquidator earns on the collateral they take, in basis points.
    liquidationBonusBps,
  };
}

export interface CreditNamespace {
  /// The pair's parameters, status and totals.
  market(pair: Address): Promise<Awaited<ReturnType<typeof readPair>>>;
  /// One account's position. `healthFactorBps` is basis points where 10000 is exactly at the liquidation
  /// threshold and anything under it is liquidatable; no debt reads 9,990,000 (999.00x); collateral gone with
  /// debt left reads 0.
  position(pair: Address, user: Address): Promise<{ collateralAmount: bigint; debtAmount: bigint; collateralValueUsd: bigint; healthFactorBps: bigint; liquidatable: boolean }>;
  /// The oracle's USD price of `asset`, 18 decimals. Reverts (rejects) when the feed is stale.
  price(oracle: Address, asset: Address): Promise<bigint>;
}

export function createCredit(client: HumeClient): CreditNamespace {
  return {
    market: (pair) => readPair(client, pair),
    async position(pair, user) {
      const [position, liquidatable] = await Promise.all([
        client.readContract({ address: pair, abi: pairAbi, functionName: "getPosition", args: [user] }),
        client.readContract({ address: pair, abi: pairAbi, functionName: "isLiquidatable", args: [user] }),
      ]);
      const [collateralAmount, debtAmount, collateralValueUsd, healthFactorBps] = position;
      return { collateralAmount, debtAmount, collateralValueUsd, healthFactorBps, liquidatable };
    },
    price: (oracle, asset) => client.readContract({ address: oracle, abi: oracleAbi, functionName: "getPrice", args: [asset] }),
  };
}
