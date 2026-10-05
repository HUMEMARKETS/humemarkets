import type { Leaderboard, LeaderboardEntry, LeaderboardMetric } from "@hume/sdk";
import type { SampleAccount } from "./sampleEngine";

/// Orders a board the way the API does, so a board assembled here (the fixture, or the fixture with the
/// sample account on it) ranks exactly like a real one: by the chosen metric, descending, as a number;
/// ties on volume descending, then wallet ascending. Ranks are unique, 1-based.
export function rankEntries(entries: LeaderboardEntry[], metric: LeaderboardMetric): LeaderboardEntry[] {
  const value = (entry: LeaderboardEntry) => (metric === "pnl" ? entry.totalPnl : metric === "roi" ? entry.roiBps : entry.volume);
  return [...entries]
    .sort((a, b) => {
      const byMetric = value(b) === value(a) ? 0 : value(b) > value(a) ? 1 : -1;
      if (byMetric !== 0) return byMetric;
      if (b.volume !== a.volume) return b.volume > a.volume ? 1 : -1;
      return a.wallet < b.wallet ? -1 : a.wallet > b.wallet ? 1 : 0;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/// The wallet string the sample account appears under. Not an address: nothing can own it.
export const SAMPLE_SELF = "you (sample)";

/// The sample account as a leaderboard row, so a visitor who places a sample trade finds themselves on
/// the board. Executions count as trades and their notional as volume; ROI is total PNL over the margin
/// the account has posted; win rate is closed positions that ended above zero.
export function sampleSelfEntry(account: SampleAccount, unrealisedPnl: bigint): LeaderboardEntry | undefined {
  const traded = account.fills.filter((fill) => ["OPEN", "INCREASE", "REDUCE", "CLOSE", "LIQUIDATION"].includes(fill.kind));
  if (traded.length === 0) return undefined;
  const realised = account.positions.reduce((sum, position) => sum + position.realizedPnl, 0n);
  const capital = account.positions.reduce((sum, position) => sum + position.collateral, 0n);
  const total = realised + unrealisedPnl;
  const closed = account.positions.filter((position) => !position.open);
  const wins = closed.filter((position) => position.realizedPnl > 0n).length;
  return {
    rank: 0,
    wallet: SAMPLE_SELF,
    realisedPnl: realised,
    unrealisedPnl,
    totalPnl: total,
    roiBps: capital === 0n ? 0n : (total * 10_000n) / capital,
    volume: traded.reduce((sum, fill) => sum + (fill.size ?? 0n), 0n),
    tradeCount: traded.length,
    winRateBps: closed.length === 0 ? null : Math.floor((wins * 10_000) / closed.length),
    sample: true,
  };
}

/// Basis points as a signed percentage: 1250 -> "+12.50%".
export function fmtSignedBps(bps: bigint): string {
  const magnitude = Number(bps < 0n ? -bps : bps) / 100;
  const text = magnitude.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return bps === 0n ? `${text}%` : `${bps < 0n ? "−" : "+"}${text}%`;
}

export type { Leaderboard };
