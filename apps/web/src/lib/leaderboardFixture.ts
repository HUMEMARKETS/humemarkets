import type { Leaderboard, LeaderboardEntry } from "@hume/sdk";
import { rankEntries } from "./leaderboard";

/// The sample board: twelve simulated traders, so the leaderboard is never a blank page, in sample mode
/// and on launch day before anyone has traded. It stays in the repo on purpose. It is the page's
/// sample-mode data when the API's own sample board is not there, and the shape the loading state is
/// built to. Its wallets are not addresses anyone controls, and every row is marked `sample`.
const USD = 1_000_000n;

const row = (n: number, realised: number, unrealised: number, capital: number, volume: number, trades: number, win: number | null): LeaderboardEntry => {
  const total = BigInt(realised + unrealised) * USD;
  return {
    rank: 0,
    wallet: `0x5a11e${String(n).padStart(35, "0")}`,
    realisedPnl: BigInt(realised) * USD,
    unrealisedPnl: BigInt(unrealised) * USD,
    totalPnl: total,
    roiBps: (total * 10_000n) / (BigInt(capital) * USD),
    volume: BigInt(volume) * USD,
    tradeCount: trades,
    winRateBps: win,
    sample: true,
  };
};

export const SAMPLE_ENTRIES: LeaderboardEntry[] = [
  row(1, 4820, 310, 6000, 182_000, 41, 6800),
  row(2, 3150, -120, 4000, 96_000, 28, 6100),
  row(3, 2210, 540, 5000, 143_000, 37, 5700),
  row(4, 1840, 0, 2500, 61_000, 19, 7300),
  row(5, 960, 125, 3000, 88_000, 33, 5200),
  row(6, 410, -60, 1500, 24_000, 12, 5000),
  row(7, 75, 20, 1000, 15_500, 9, 4400),
  row(8, -230, 90, 2000, 47_000, 21, 4700),
  row(9, -610, -35, 2500, 72_000, 26, 3800),
  row(10, -1180, 210, 3500, 133_000, 44, 3500),
  row(11, -1750, -90, 3000, 58_000, 17, 2900),
  row(12, -2420, 0, 4500, 109_000, 31, null),
];

export function sampleBoard(metric: Leaderboard["metric"]): Leaderboard {
  return {
    metric,
    window: "all",
    sample: true,
    updatedAt: null,
    settlementDecimals: 6,
    total: SAMPLE_ENTRIES.length,
    limit: 50,
    offset: 0,
    entries: rankEntries(SAMPLE_ENTRIES, metric),
  };
}
