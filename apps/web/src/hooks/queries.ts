"use client";

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import type { CandleInterval, Leaderboard, LeaderboardMetric, OpenInterestRange, PerpMarketInfo, PriceSet } from "@hume/sdk";
import type { Address } from "@hume/types";
import { useAccountMode } from "@/hooks/useAccountMode";
import { humeRead } from "@/lib/hume";
import { sampleBoard } from "@/lib/leaderboardFixture";
import { priceSetWithFallback, type PriceSource } from "@/lib/samplePrices";
import { toOpenOrders, toVaultBalances, type SampleAccount } from "@/lib/sampleEngine";
import { sampleHistory, samplePositions, sampleSummary } from "@/lib/sampleViews";
import { useSampleStore } from "@/stores/sample";
import { symbolOf } from "@/lib/market";
import { env } from "@/lib/env";
import { readHistoryAfter } from "@/lib/history";
import { seriesKey } from "@/lib/options";
import { sampleOptionQuote } from "@/lib/sampleOptions";

// Fans out per market (overviewQuery, listedExpiriesQuery) across every mounted component — a
// rate-limited/free-tier RPC provider hits 429s well before this many requests a second, so this
// stays conservative rather than "as live as possible".
const TICK_MS = 15_000;

// Query definitions are exported next to their hooks so `Prefetch` can warm the same cache entries
// (same key, same function) before a page asks for them.
// Paused markets stay in the list: the terminal shows one, keeps pricing it, and refuses the trade
// (CLAUDE.md, "a paused market is a shipped market"). Dropping it here would make it vanish instead.
export const perpMarketsQuery = () => ({
  queryKey: ["perp-markets"],
  queryFn: () => humeRead.perps.list({ includePaused: true }),
  refetchInterval: 30_000,
});

export function usePerpMarkets() {
  return useQuery(perpMarketsQuery());
}

/// One market's registry config, taken from the list rather than from `usePerpMarket`. The two
/// differ in what they can fail on: `perps.get` also reads the oracle, which reverts while the
/// equity session is shut, so a market would lose its paused badge at exactly the hours a visitor
/// most needs to know why nothing is priced. The registry answers whatever the session is doing.
export function usePerpMarketConfig(symbol: string) {
  const { data } = usePerpMarkets();
  return data?.find((market) => symbolOf(market.marketId) === symbol);
}

/// `PerpMarketInfo` plus where its prices came from, so a screen can say "last close" instead of
/// presenting a carried-over price as live.
export type PerpMarketView = PerpMarketInfo & { priceSource: PriceSource };

/// Config, risk parameters, funding and the three live prices for one market.
///
/// In sample mode a shut equity session does not blank the market: `perps.get` reads the oracle, which
/// reverts outside the session, so the sample falls back to the API's last close and says so. A real
/// trade on a shut market is refused by the chain, so the connected path is unchanged.
export const perpMarketQuery = (symbol: string, sample = false) => ({
  queryKey: sample ? ["perp-market", symbol, "sample"] : ["perp-market", symbol],
  queryFn: async (): Promise<PerpMarketView> => {
    if (!sample) return { ...(await humeRead.perps.get(symbol)), priceSource: "live" };
    const [market, risk, funding, prices] = await Promise.all([
      humeRead.markets.get(symbol),
      humeRead.risk.get(symbol),
      humeRead.funding.get(symbol),
      priceSetWithFallback(symbol),
    ]);
    return { market, risk, funding, indexPrice: prices.index.price, markPrice: prices.mark.price, lastPrice: prices.last.price, priceSource: prices.source };
  },
  enabled: Boolean(symbol),
  refetchInterval: TICK_MS,
});

export function usePerpMarket(symbol: string) {
  return useQuery(perpMarketQuery(symbol, useAccountMode() === "sample"));
}

export function useSettlementDecimals() {
  return useQuery({
    queryKey: ["settlement-decimals"],
    queryFn: () => humeRead.erc20.decimals(env.addresses.settlementToken),
    staleTime: Infinity,
  });
}

/// The sample account as a query. It has the shape of every chain read (`isPending`, `data`, `error`), so
/// a component reads the sample and the chain through the same code. The key carries the store's
/// version, so any change to the account refetches this at once; the previous value stays on screen
/// meanwhile, so a balance never flashes a skeleton when a fill lands.
function useSampleRead<T>(name: string, read: (account: SampleAccount) => T | Promise<T>, options: { enabled?: boolean; refetchInterval?: number } = {}) {
  const account = useSampleStore((state) => state.account);
  const version = useSampleStore((state) => state.version);
  const sample = useAccountMode() === "sample";
  return useQuery({
    queryKey: ["sample", name, version],
    queryFn: () => read(account as SampleAccount),
    enabled: sample && Boolean(account) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    placeholderData: keepPreviousData,
  });
}

/// A live read of the connected wallet, switched off in sample mode and while no wallet is connected.
function useWalletEnabled() {
  const { address } = useAccount();
  const mode = useAccountMode();
  return { address, enabled: mode === "connected" && Boolean(address) };
}

export function useVaultBalances() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["vault-balances", address],
    queryFn: () => humeRead.vault.balances(address as Address, env.addresses.settlementToken),
    enabled,
    refetchInterval: 8_000,
  });
  const sample = useSampleRead("vault-balances", toVaultBalances);
  return useAccountMode() === "sample" ? sample : live;
}

export function useWalletTokenBalance() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["wallet-token-balance", address],
    queryFn: () => humeRead.erc20.balanceOf(env.addresses.settlementToken, address as Address),
    enabled,
    refetchInterval: 8_000,
  });
  // The sample has no wallet: its USDG is handed out into the vault directly.
  const sample = useSampleRead("wallet-token-balance", () => 0n);
  return useAccountMode() === "sample" ? sample : live;
}

export function usePositions() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["positions", address],
    queryFn: () => humeRead.portfolio.positions(address as Address),
    enabled,
    refetchInterval: 6_000,
  });
  const sample = useSampleRead("positions", samplePositions);
  return useAccountMode() === "sample" ? sample : live;
}

/// Every market on the registry, perps and options alike.
export const allMarketsQuery = () => ({ queryKey: ["all-markets"], queryFn: () => humeRead.markets.list(), refetchInterval: 30_000 });

export function useAllMarkets() {
  return useQuery(allMarketsQuery());
}

/// Statistics need `services/api`; without it the query is off and pages show "–".
export const marketStatsQuery = () => ({
  queryKey: ["market-stats"],
  queryFn: () => humeRead.markets.stats(),
  enabled: Boolean(env.apiUrl),
  refetchInterval: 60_000,
  retry: false,
});

export function useMarketStats() {
  return useQuery(marketStatsQuery());
}

/// What the Markets page needs per market from the chain. Each read is settled separately so one
/// market with, say, no funding configured still shows its price. Sample mode prices a shut market at
/// its last close rather than leaving every row blank.
async function fetchMarketOverview(symbol: string, sample = false) {
  const [prices, funding, openInterest] = await Promise.allSettled([
    sample ? (priceSetWithFallback(symbol) as Promise<PriceSet>) : humeRead.prices.get(symbol),
    humeRead.funding.get(symbol),
    humeRead.risk.openInterest(symbol),
  ]);
  const value = <T,>(result: PromiseSettledResult<T>) => (result.status === "fulfilled" ? result.value : undefined);
  return { prices: value(prices), funding: value(funding), openInterest: value(openInterest) };
}

export const overviewQuery = (symbol: string, sample = false) => ({
  queryKey: sample ? ["market-overview", symbol, "sample"] : ["market-overview", symbol],
  queryFn: () => fetchMarketOverview(symbol, sample),
  refetchInterval: TICK_MS,
});

/// The overview for several markets at once, in the order given, so a table can sort by it. Each
/// entry is `overviewQuery(symbol)`, so the cache is shared with anything else that reads it.
export function useMarketOverviews(symbols: string[]) {
  const sample = useAccountMode() === "sample";
  return useQueries({ queries: symbols.map((symbol) => overviewQuery(symbol, sample)) });
}

export function usePortfolioSummary() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["portfolio-summary", address],
    queryFn: () => humeRead.portfolio.summary(address as Address),
    enabled,
    refetchInterval: 6_000,
  });
  const sample = useSampleRead("portfolio-summary", sampleSummary, { refetchInterval: 6_000 });
  return useAccountMode() === "sample" ? sample : live;
}

export function useFunding() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["funding", address],
    queryFn: () => humeRead.portfolio.funding(address as Address, { limit: 200 }),
    enabled: enabled && Boolean(env.apiUrl),
    refetchInterval: 30_000,
    retry: false,
  });
  // Funding is shown on the ticket but never charged to a sample position.
  const sample = useSampleRead("funding", () => [] as Awaited<ReturnType<typeof humeRead.portfolio.funding>>);
  return useAccountMode() === "sample" ? sample : live;
}

export function useHistory() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["history", address],
    queryFn: () => readHistoryAfter(address as Address),
    enabled: enabled && Boolean(env.apiUrl),
    refetchInterval: 30_000,
    retry: false,
  });
  const sample = useSampleRead("history", sampleHistory);
  return useAccountMode() === "sample" ? sample : live;
}

export const priceHistoryQuery = (symbol: string, range: "1h" | "6h" | "24h" | "7d") => ({
  queryKey: ["price-history", symbol, range],
  queryFn: () => humeRead.prices.history(symbol, range),
  enabled: Boolean(symbol && env.apiUrl),
  refetchInterval: 60_000,
  retry: false,
});

export function usePriceHistory(symbol: string, range: "1h" | "6h" | "24h" | "7d") {
  return useQuery(priceHistoryQuery(symbol, range));
}

/// Markets the registry allows options on. The underlying selector on the Options page reads this.
export function useOptionUnderlyings() {
  return useQuery({
    queryKey: ["option-underlyings"],
    queryFn: async () => (await humeRead.markets.list()).filter((market) => market.optionsEnabled && market.active),
    refetchInterval: 30_000,
  });
}

/// Index price, the spot the strike ladder is centred on.
export function useIndexPrice(symbol: string) {
  const sample = useAccountMode() === "sample";
  return useQuery({
    queryKey: sample ? ["index-price", symbol, "sample"] : ["index-price", symbol],
    queryFn: async () => (sample ? (await priceSetWithFallback(symbol)).index.price : (await humeRead.prices.get(symbol)).index.price),
    enabled: Boolean(symbol),
    refetchInterval: TICK_MS,
  });
}

/// Expiries that already have an opened series, from the indexer. Off without `NEXT_PUBLIC_API_URL`.
export function useListedExpiries(symbol: string) {
  return useQuery({
    queryKey: ["option-expiries", symbol],
    queryFn: () => humeRead.options.expiries(symbol),
    enabled: Boolean(symbol && env.apiUrl),
    refetchInterval: 60_000,
    retry: false,
  });
}

/// One display-only quote (premium, IV, Greeks) per strike and side for one expiry. These are
/// unsigned analytics from the pricing service, never the price an order is charged. The order
/// ticket asks for a signed quote separately.
///
/// Sample mode prices each quote here from the index price instead. The pricing service needs
/// `services/api`, its own process and a live oracle, and a shut equity session makes the oracle
/// revert, so asking it would leave the chain and the strategy builder empty. The index price is the
/// same sample-aware read the perps screens use, so a shut session prices at its last close.
export function useOptionChain(symbol: string, expiry: bigint | undefined, strikes: bigint[]) {
  const sample = useAccountMode() === "sample";
  const { data: spot } = useIndexPrice(symbol);
  const sides = ["CALL", "PUT"] as const;
  const results = useQueries({
    queries: strikes.flatMap((strike) =>
      sides.map((type) =>
        sample
          ? {
              queryKey: ["option-chain-quote", symbol, String(expiry), strike.toString(), type, "sample", String(spot)],
              queryFn: async () =>
                sampleOptionQuote({
                  spot: Number(formatUnits(spot!, 18)),
                  strike: Number(formatUnits(strike, 18)),
                  type,
                  expiry: expiry!,
                  now: Date.now(),
                  volatility: env.options.sampleIvBps / 10_000,
                }),
              enabled: Boolean(symbol && expiry && spot),
              placeholderData: keepPreviousData,
              retry: false,
            }
          : {
              queryKey: ["option-chain-quote", symbol, String(expiry), strike.toString(), type],
              queryFn: () => humeRead.options.quote({ underlying: symbol, type, strike, expiry: expiry!, contracts: 1 }),
              enabled: Boolean(env.apiUrl && symbol && expiry),
              refetchInterval: 15_000,
              retry: false,
            },
      ),
    ),
  });
  return strikes.map((strike, index) => ({ strike, call: results[index * 2]!, put: results[index * 2 + 1]! }));
}

/// Open interest and 24h volume per option series for one expiry, keyed by `seriesKey`. A series
/// nobody has traded is absent, which the chain shows as zero.
export function useOptionStats(symbol: string, expiry: bigint | undefined) {
  return useQuery({
    queryKey: ["option-stats", symbol, String(expiry)],
    queryFn: async () => {
      const rows = await humeRead.options.stats(symbol, expiry);
      return new Map(rows.map((row) => [seriesKey(row.strike, row.type), row]));
    },
    enabled: Boolean(env.apiUrl && symbol && expiry),
    refetchInterval: 30_000,
    retry: false,
  });
}

/// The most candles the API returns. The chart opens on the newest ones; the rest is one zoom-out away.
const CANDLE_LIMIT = 500;

export function useCandles(symbol: string, interval: CandleInterval) {
  return useQuery({
    queryKey: ["candles", symbol, interval],
    queryFn: () => humeRead.prices.candles(symbol, interval, CANDLE_LIMIT),
    enabled: Boolean(symbol && env.apiUrl),
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useMarketFundingHistory(symbol: string) {
  return useQuery({
    queryKey: ["market-funding-history", symbol],
    queryFn: () => humeRead.funding.history(symbol, 100),
    enabled: Boolean(symbol && env.apiUrl),
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useOpenInterestHistory(symbol: string, range: OpenInterestRange) {
  return useQuery({
    queryKey: ["open-interest-history", symbol, range],
    queryFn: () => humeRead.risk.openInterestHistory(symbol, range),
    enabled: Boolean(symbol && env.apiUrl),
    refetchInterval: 60_000,
    retry: false,
  });
}

/// Open interest now and the cap RiskManager enforces, both read from the chain.
export function useOpenInterestNow(symbol: string) {
  return useQuery({
    queryKey: ["open-interest-now", symbol],
    queryFn: async () => {
      const [openInterest, risk] = await Promise.all([humeRead.risk.openInterest(symbol), humeRead.risk.get(symbol)]);
      return { ...openInterest, cap: risk.openInterestCap };
    },
    enabled: Boolean(symbol),
    refetchInterval: 15_000,
  });
}

/// The connected wallet's limit orders, oldest first, read from the chain. Off on a deployment
/// without limit orders.
export function useOrders() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["orders", address],
    queryFn: () => humeRead.portfolio.orders(address as Address),
    enabled: enabled && env.limitOrders,
    refetchInterval: 8_000,
  });
  const sample = useSampleRead("orders", (account) => toOpenOrders(account, "0x0000000000000000000000000000000000000000"), { enabled: env.limitOrders });
  return useAccountMode() === "sample" ? sample : live;
}

/// Whether the deployment has stop-loss and take-profit orders. A deployment made before `[1.3.0]`
/// has limit orders without them. Cached for the session once known.
export function useTriggerSupport() {
  const live = useQuery({
    queryKey: ["trigger-support"],
    queryFn: () => humeRead.perps.supportsTriggerOrders(),
    enabled: env.limitOrders,
    staleTime: Number.POSITIVE_INFINITY,
  });
  // Stop-loss and take-profit are not simulated, so sample mode reports a deployment without them and
  // the controls stay out of sight rather than failing when pressed.
  return useAccountMode() === "sample" ? { ...live, data: false } : live;
}

/// The connected wallet's stop-loss and take-profit orders, oldest first, read from the chain.
/// Off where the deployment has none.
export function useTriggerOrders() {
  const { address, enabled } = useWalletEnabled();
  const { data: supported } = useTriggerSupport();
  return useQuery({
    queryKey: ["trigger-orders", address],
    queryFn: () => humeRead.portfolio.triggerOrders(address as Address),
    enabled: enabled && Boolean(supported),
    refetchInterval: 8_000,
  });
}

/// Ids of the connected wallet's cross-margin positions, as strings. Off where the deployment has no
/// cross margin. A cross position is liquidated on the account's health, so its own liquidation price
/// would mislead.
export function useCrossPositions() {
  const { address, enabled } = useWalletEnabled();
  return useQuery({
    queryKey: ["cross-positions", address],
    queryFn: async () => new Set((await humeRead.crossMargin.positions(address as Address)).map((id) => id.toString())),
    enabled: enabled && env.crossMargin,
    refetchInterval: 15_000,
  });
}

/// The leaderboard. In sample mode it asks the API for its simulator board and, when the API has none
/// (not deployed yet, or unreachable), falls back to the board in the repo, so the page is never blank. A
/// real board never falls back: if it cannot be read the page says so.
export function useLeaderboard(metric: LeaderboardMetric) {
  const sample = useAccountMode() === "sample";
  return useQuery({
    queryKey: ["leaderboard", metric, sample ? "sample" : "live"],
    queryFn: async (): Promise<Leaderboard> => {
      if (!sample) return humeRead.leaderboard.board({ metric });
      const board = await humeRead.leaderboard.board({ metric, sample: true }).catch(() => undefined);
      return board && board.total > 0 ? board : sampleBoard(metric);
    },
    refetchInterval: 60_000,
    retry: false,
  });
}

/// The lending pair's parameters, status and totals. Off until a pair address exists for this network.
export function useCreditMarket() {
  return useQuery({
    queryKey: ["credit-market", env.creditPair],
    queryFn: () => humeRead.credit.market(env.creditPair as Address),
    enabled: Boolean(env.creditPair),
    refetchInterval: 30_000,
    retry: 1,
  });
}

/// The connected wallet's position in the lending pair. Sample mode has no lending account, so it is off there.
export function useCreditPosition() {
  const { address, enabled } = useWalletEnabled();
  return useQuery({
    queryKey: ["credit-position", env.creditPair, address],
    queryFn: () => humeRead.credit.position(env.creditPair as Address, address as Address),
    enabled: enabled && Boolean(env.creditPair),
    refetchInterval: 8_000,
  });
}

/// The collateral's USD price for the health calculator: the pair's own oracle when there is a pair, otherwise
/// the terminal's index price for the same symbol (the last close while its session is shut, in sample mode).
export function useCreditCollateralPrice(oracle?: Address, collateralToken?: Address) {
  const fromTerminal = useIndexPrice(env.creditSymbol);
  const fromPair = useQuery({
    queryKey: ["credit-price", oracle, collateralToken],
    queryFn: () => humeRead.credit.price(oracle as Address, collateralToken as Address),
    enabled: Boolean(oracle && collateralToken),
    refetchInterval: 30_000,
    retry: false,
  });
  return fromPair.data !== undefined ? { price: fromPair.data, source: "pair" as const, isPending: false } : { price: fromTerminal.data, source: "terminal" as const, isPending: fromTerminal.isPending };
}
