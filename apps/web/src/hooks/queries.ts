"use client";

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import type { CandleInterval, Leaderboard, LeaderboardMetric, OpenInterestRange, PerpMarketInfo, PriceSet, ReferenceQuote } from "@hume/sdk";
import type { Address } from "@hume/types";
import { useAccountMode } from "@/hooks/useAccountMode";
import { humeRead } from "@/lib/hume";
import { symbolOf } from "@/lib/market";
import { env } from "@/lib/env";
import { readHistoryAfter } from "@/lib/history";
import { seriesKey } from "@/lib/options";

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

/// Config, risk parameters, funding and the three live prices for one market.
export const perpMarketQuery = (symbol: string) => ({
  queryKey: ["perp-market", symbol],
  queryFn: () => humeRead.perps.get(symbol),
  enabled: Boolean(symbol),
  refetchInterval: TICK_MS,
});

export function usePerpMarket(symbol: string) {
  return useQuery(perpMarketQuery(symbol));
}

export function useSettlementDecimals() {
  return useQuery({
    queryKey: ["settlement-decimals"],
    queryFn: () => humeRead.erc20.decimals(env.addresses.settlementToken),
    staleTime: Infinity,
  });
}

/// A live read of the connected wallet, switched off while no wallet is connected.
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
  return live;
}

export function useWalletTokenBalance() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["wallet-token-balance", address],
    queryFn: () => humeRead.erc20.balanceOf(env.addresses.settlementToken, address as Address),
    enabled,
    refetchInterval: 8_000,
  });
  return live;
}

export function usePositions() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["positions", address],
    queryFn: () => humeRead.portfolio.positions(address as Address),
    enabled,
    refetchInterval: 6_000,
  });
  return live;
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
/// market with, say, no funding configured still shows its price.
async function fetchMarketOverview(symbol: string) {
  const [prices, funding, openInterest] = await Promise.allSettled([
    humeRead.prices.get(symbol),
    humeRead.funding.get(symbol),
    humeRead.risk.openInterest(symbol),
  ]);
  const value = <T,>(result: PromiseSettledResult<T>) => (result.status === "fulfilled" ? result.value : undefined);
  return { prices: value(prices), funding: value(funding), openInterest: value(openInterest) };
}

export const overviewQuery = (symbol: string) => ({
  queryKey: ["market-overview", symbol],
  queryFn: () => fetchMarketOverview(symbol),
  refetchInterval: TICK_MS,
});

/// The overview for several markets at once, in the order given, so a table can sort by it. Each
/// entry is `overviewQuery(symbol)`, so the cache is shared with anything else that reads it.
export function useMarketOverviews(symbols: string[]) {
  return useQueries({ queries: symbols.map((symbol) => overviewQuery(symbol)) });
}

export function usePortfolioSummary() {
  const { address, enabled } = useWalletEnabled();
  const live = useQuery({
    queryKey: ["portfolio-summary", address],
    queryFn: () => humeRead.portfolio.summary(address as Address),
    enabled,
    refetchInterval: 6_000,
  });
  return live;
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
  return live;
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
  return live;
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
/// Paused markets stay in: the chain keeps pricing one, the ticket refuses it and the strategy builder marks it
/// (CLAUDE.md, "a paused market is a shipped market"). Dropping it here made it vanish instead.
export function useOptionUnderlyings() {
  return useQuery({
    queryKey: ["option-underlyings"],
    queryFn: async () => (await humeRead.markets.list()).filter((market) => market.optionsEnabled),
    refetchInterval: 30_000,
  });
}

/// Index price, the spot the strike ladder is centred on.
export function useIndexPrice(symbol: string) {
  return useQuery({
    queryKey: ["index-price", symbol],
    queryFn: async () => (await humeRead.prices.get(symbol)).index.price,
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
export function useOptionChain(symbol: string, expiry: bigint | undefined, strikes: bigint[]) {
  const sides = ["CALL", "PUT"] as const;
  const results = useQueries({
    queries: strikes.flatMap((strike) =>
      sides.map((type) => ({
        queryKey: ["option-chain-quote", symbol, String(expiry), strike.toString(), type],
        queryFn: () => humeRead.options.quote({ underlying: symbol, type, strike, expiry: expiry!, contracts: 1 }),
        enabled: Boolean(env.apiUrl && symbol && expiry),
        refetchInterval: 15_000,
        retry: false,
      })),
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
  return live;
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
  return live;
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

/// The leaderboard, as the indexer ranks it. If it cannot be read the page says so.
export function useLeaderboard(metric: LeaderboardMetric) {
  return useQuery({
    queryKey: ["leaderboard", metric],
    queryFn: (): Promise<Leaderboard> => humeRead.leaderboard.board({ metric }),
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

/// The connected wallet's position in the lending pair.
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
/// the terminal's index price for the same symbol.
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

/// Display-only reference prices for the Markets page, by symbol, from this app's own `/api/quoted` route.
export const referenceQuotesQuery = () => ({
  queryKey: ["reference-quotes"],
  queryFn: async (): Promise<Record<string, ReferenceQuote>> => {
    const response = await fetch("/api/quoted");
    if (!response.ok) throw new Error("reference prices unavailable");
    return response.json();
  },
  refetchInterval: 60_000,
  retry: false,
});

export function useReferenceQuotes() {
  return useQuery(referenceQuotesQuery());
}

export interface PonsRow {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  sqrtPriceX96: string | null;
  liquidity: string | null;
  priceEth: number | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
}

/// Graduated Pons tokens with metadata and pool price, from `services/api` (`/v1/pons/tokens`).
export const ponsQuery = () => ({
  queryKey: ["pons", env.apiUrl],
  queryFn: async (): Promise<PonsRow[]> => {
    const response = await fetch(`${env.apiUrl}/v1/pons/tokens`);
    if (!response.ok) throw new Error("pons unavailable");
    return response.json();
  },
  enabled: Boolean(env.apiUrl),
  refetchInterval: 15_000,
  retry: false,
});

export function usePonsTokens() {
  return useQuery(ponsQuery());
}

export interface CopyFollowRow {
  id: number;
  follower: string;
  leader: string;
  subaccount: Address;
  maxTradeSize: string;
  maxExposure: string;
  maxLeverage: number;
  markets: string[] | null;
  active: boolean;
  createdAt: string;
}

export interface CopyExecutionRow {
  followId: number;
  leaderPositionId: string;
  followerPositionId: string | null;
  status: "open" | "closed" | "skipped" | "failed" | "opening";
  reason: string | null;
  market: string;
  isLong: boolean;
  leaderSize: string;
  followerSize: string | null;
  updatedAt: string;
}

async function copyGet<T>(path: string): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`);
  if (!response.ok) throw new Error("copy unavailable");
  return response.json();
}

/// The executor address a follower authorises, from `services/api` (`/v1/copy/config`).
export function useCopyConfig() {
  return useQuery({
    queryKey: ["copy-config", env.apiUrl],
    queryFn: () => copyGet<{ executor: Address | null }>("/v1/copy/config"),
    enabled: Boolean(env.apiUrl),
    staleTime: 60_000,
    retry: false,
  });
}

export function useCopyFollows(follower: Address | undefined) {
  return useQuery({
    queryKey: ["copy-follows", env.apiUrl, follower],
    queryFn: () => copyGet<{ follows: CopyFollowRow[]; executions: CopyExecutionRow[] }>(`/v1/copy/follows?follower=${follower}`),
    enabled: Boolean(env.apiUrl && follower),
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useCopyFollowers(leader: string) {
  return useQuery({
    queryKey: ["copy-followers", env.apiUrl, leader],
    queryFn: () => copyGet<{ followers: number }>(`/v1/copy/followers/${leader}`),
    enabled: Boolean(env.apiUrl),
    retry: false,
  });
}
