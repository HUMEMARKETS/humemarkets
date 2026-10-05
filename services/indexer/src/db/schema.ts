import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

/// Materialized current-state view of MarketRegistry, kept in sync from `MarketAdded` /
/// `MarketUpdated` events (DEVELOPMENT_STEPS.md Phase 2 item 1) — `services/api` serves
/// `GET /markets` from this instead of an RPC call per request. `MarketRegistry` on-chain
/// remains the actual source of truth (PROJECT_BRIEF.md Section 18); this is a read cache.
/// uint256 fields (`maxLeverage`, `openInterestCap`) are stored as `text`, not `bigint` or
/// `numeric` — token amounts are 18-decimal fixed point and can exceed Postgres bigint's
/// ~9.2e18 ceiling (a $5M open interest cap already does); `text` avoids that overflow the
/// same way `numeric` would, written via `.toString()` in `src/index.ts`. Any future query
/// needing numeric range comparisons on these columns should switch them to `numeric`
/// first — comparing `text` values as `text` sorts/compares lexicographically, not numerically.
export const markets = pgTable("markets", {
  marketId: text("market_id").primaryKey(),
  underlyingToken: text("underlying_token").notNull(),
  oracleId: text("oracle_id").notNull(),
  optionsEnabled: boolean("options_enabled").notNull(),
  perpsEnabled: boolean("perps_enabled").notNull(),
  maxLeverage: text("max_leverage").notNull(),
  openInterestCap: text("open_interest_cap").notNull(),
  active: boolean("active").notNull(),
  blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/// Generic append-only log of every contract event this indexer watches (PROJECT_BRIEF.md
/// Section 31 / Section 35's event list) — one row per (tx_hash, log_index), the natural
/// idempotency key for a replay-safe indexer (DEVELOPMENT_STEPS.md "Backend services").
/// `args` stores the decoded event arguments as JSON (bigints pre-converted to strings by
/// the caller — see `src/serialize.ts` — since `jsonb` cannot hold a bigint directly).
/// `services/api` derives `/history/:wallet` from this by matching wallet-shaped args
/// fields; per-position live state is read from the chain, not reconstructed here.
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    contractName: text("contract_name").notNull(),
    eventName: text("event_name").notNull(),
    args: jsonb("args").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("events_tx_hash_log_index_key").on(table.txHash, table.logIndex)],
);

/// Single-row table (id is always 1) tracking indexing progress, so a restart resumes from
/// `lastIndexedBlock + 1` instead of re-scanning from genesis or losing track entirely.
export const indexerState = pgTable("indexer_state", {
  id: integer("id").primaryKey(),
  lastIndexedBlock: bigint("last_indexed_block", { mode: "bigint" }).notNull(),
});

/// Index-price samples taken by the indexer on a fixed interval (`PRICE_SAMPLE_INTERVAL_MS`), so
/// the API can serve a price history and 24h change — the chain only exposes the current price.
/// `price` is the 18-decimal fixed-point index price as `text` (see `markets` for why not bigint).
/// Rows older than `PRICE_TICK_RETENTION_DAYS` are pruned; this is display history, not an audit
/// trail, and never feeds settlement or liquidation (those read the oracle onchain).
export const priceTicks = pgTable(
  "price_ticks",
  {
    id: serial("id").primaryKey(),
    marketId: text("market_id").notNull(),
    price: text("price").notNull(),
    sampledAt: timestamp("sampled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("price_ticks_market_sampled_idx").on(table.marketId, table.sampledAt)],
);

/// Per-wallet trading statistics for the leaderboard, derived from `events` (never written by hand)
/// by `src/traderStats.ts` on a fixed interval, then replaced wholesale for a window. One row per
/// (wallet, window); `all` is the only launch window, `24h` is a Phase 18 value of the same column.
/// Every amount is `text` for the reason `markets` documents (settlement-token base units and
/// 18-decimal values overflow bigint). `text` sorts lexicographically, so `services/api` casts to
/// `numeric` before ordering: never `order by` one of these as text.
///   realised_pnl      price PNL realised + funding - fees, signed.
///   unrealised_pnl    PNL of open perp positions at the live mark, signed.
///   capital_deployed  margin posted on perps + premium paid on options; the ROI denominator.
///   roi_bps           (realised + unrealised) * 10000 / capital_deployed, signed, "0" with no capital.
///   volume            perp notional traded + option premium paid.
/// `win_rate_bps` is null until the wallet has closed a position.
export const traderStats = pgTable(
  "trader_stats",
  {
    wallet: text("wallet").notNull(),
    window: text("window").notNull(),
    realisedPnl: text("realised_pnl").notNull(),
    unrealisedPnl: text("unrealised_pnl").notNull(),
    capitalDeployed: text("capital_deployed").notNull(),
    roiBps: text("roi_bps").notNull(),
    volume: text("volume").notNull(),
    tradeCount: integer("trade_count").notNull(),
    closedCount: integer("closed_count").notNull(),
    winRateBps: integer("win_rate_bps"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.wallet, table.window] })],
);

/// A wallet's choice to hide from the leaderboard and its PNL card. Written by `services/api` after it
/// verifies an EIP-191 signature from the wallet; absent means visible. `issued_at` is the signed unix
/// time of the last accepted change, so an old signature cannot be replayed to undo a newer choice.
export const leaderboardVisibility = pgTable("leaderboard_visibility", {
  wallet: text("wallet").primaryKey(),
  hidden: boolean("hidden").notNull(),
  issuedAt: bigint("issued_at", { mode: "bigint" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
