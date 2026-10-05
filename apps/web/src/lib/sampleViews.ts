import type { HistoryEvent, PortfolioPositions, PortfolioSummary } from "@hume/sdk";
import type { Hex } from "@hume/types";
import { priceSetWithFallback } from "./samplePrices";
import {
  SAMPLE_HASH_PREFIX,
  openPositions,
  realizedPnl,
  toVaultBalances,
  unrealizedPnl,
  type SampleAccount,
  type SampleFill,
} from "./sampleEngine";
import { symbolOf } from "./market";

/// The sample account, reshaped into exactly what the chain reads return. A component never learns which
/// one it was handed: that is the whole of the data-source swap.

export const samplePositions = (account: SampleAccount): PortfolioPositions => ({ perps: account.positions, options: [] });

/// Marks for the markets the account holds a position in, from the same price source the ticket uses.
export async function sampleMarks(account: SampleAccount): Promise<Map<Hex, bigint>> {
  const held = [...new Set(openPositions(account).map((position) => position.marketId))];
  const entries = await Promise.all(
    held.map(async (marketId) => {
      const prices = await priceSetWithFallback(symbolOf(marketId)).catch(() => undefined);
      return [marketId, prices?.mark.price] as const;
    }),
  );
  return new Map(entries.filter((entry): entry is [Hex, bigint] => entry[1] !== undefined));
}

export async function sampleSummary(account: SampleAccount): Promise<PortfolioSummary> {
  const marks = await sampleMarks(account);
  return {
    balances: toVaultBalances(account),
    positions: samplePositions(account),
    unrealizedPerpPnl: unrealizedPnl(account, (marketId) => marks.get(marketId)),
    realizedPnl: realizedPnl(account),
  };
}

const sampleHash = (fill: SampleFill) => `${SAMPLE_HASH_PREFIX}${String(fill.id).padStart(6, "0")}`;

/// Fills as indexer history events, so Activity and Portfolio history render them with the same table
/// as a real wallet's. The liquidation fill becomes two events under one hash, as it does on chain.
export function sampleHistory(account: SampleAccount): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  const push = (fill: SampleFill, eventName: string, args: Record<string, unknown>, contractName = "PerpsEngine") =>
    events.push({
      id: fill.id * 10 + events.filter((event) => event.txHash === sampleHash(fill)).length,
      txHash: sampleHash(fill),
      logIndex: 0,
      blockNumber: "",
      contractName,
      eventName,
      args,
      createdAt: new Date(fill.at).toISOString(),
    });

  for (const fill of [...account.fills].reverse()) {
    const common = { positionId: fill.positionId?.toString(), size: fill.size?.toString() };
    switch (fill.kind) {
      case "OPEN":
        push(fill, "PerpPositionOpened", { ...common, isLong: fill.isLong });
        break;
      case "INCREASE":
      case "REDUCE":
        push(fill, "PerpPositionUpdated", common);
        break;
      case "CLOSE":
        push(fill, "PerpPositionClosed", { ...common, realizedPnl: fill.pnl?.toString() });
        break;
      case "LIQUIDATION":
        push(fill, "PositionLiquidated", { positionId: common.positionId, pnl: fill.pnl?.toString(), markPriceAtLiquidation: fill.price?.toString() });
        push(fill, "PerpPositionClosed", { ...common, realizedPnl: fill.pnl?.toString() });
        break;
      case "LIMIT_PLACED":
        push(fill, "LimitOrderPlaced", { size: fill.size?.toString(), triggerPrice: fill.price?.toString() });
        break;
      case "LIMIT_CANCELLED":
        push(fill, "LimitOrderCancelled", { triggerPrice: fill.price?.toString() });
        break;
      case "TOP_UP":
        push(fill, "CollateralDeposited", { amount: fill.amount?.toString() }, "Vault");
        break;
      default:
        break;
    }
  }
  return events;
}
