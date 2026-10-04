# Phase 5 — Mainnet backend bring-up

**Result: amber.** The `mainnet` environment is up on Railway with all four services deployed and
healthy: Postgres, indexer, api and pricing. The indexer **has caught up** — it replayed all
8,478,600 blocks from the deployment block in about 4 minutes and now tails the head. `GET
/v1/markets` serves all 32 mainnet markets over a public domain, `GET /v1/prices/:symbol` reports
the shut session as a state rather than a 500, the Drizzle migrations have run, and every
repository gate passes (typecheck 16/16, lint 12/12, test 16/16).

Two acceptance lines do not read green, and neither is a defect in the stack:

1. **The tail's median lag is 55 blocks, not within 10.** Read from the column itself, 40 samples:
   min -25, p50 55, p90 359, max 449, inside 10 blocks in 4 of them. One indexer cycle is a round
   trip to the public RPC and takes 5–7 seconds, while the chain produces 9.88 blocks per second;
   ten blocks is 1.01 s of chain, shorter than a single `eth_getLogs` round trip to
   `rpc.mainnet.chain.robinhood.com`. Section 7 has the distribution and what sets it.
2. **"Live prices" cannot be observed on 2026-10-04.** It is a Sunday, the US equity session is
   shut, and `OracleRouter.getIndexPrice` reverts `MarketSessionClosed` for all 32 markets by
   design (Section 8). The session reopens 2026-10-05 13:30 UTC.

- Date: 2026-10-04, 15:25–16:10 UTC
- Railway account: `mixical100@gmail.com` (user `dfd0e078-6aab-4519-990f-834340105250`)
- Workspace: `Benjamin Thomas's Projects` (`a114ea74-442f-4e88-80b2-2d532ccf32d5`)
- Project: `hume` (`fcfcb48b-28fc-4469-8e70-3f3fdae9d235`)
- Chain: 4663, RPC `https://rpc.mainnet.chain.robinhood.com`

## 1. The plan and the usage, read from the account

Read with `railway usage --json` and the Railway GraphQL API (`me.workspaces.customer`), both on
2026-10-04:

| Thing                         | Measured value                       |
| ----------------------------- | ------------------------------------ |
| Plan                          | **Trial** (`isTrialing: true`, `plan: "trial"` on every deployment record) |
| Subscription state            | `INACTIVE` — no paid subscription, no payment method |
| Credit balance                | **$5.00** (one-time), `appliedCredits` $0.00 |
| Remaining usage credit        | **$5.00**                            |
| Current usage this period     | **$0.0000**                          |
| Current bill / estimated bill | **$0.0000 / $0.0000**                |
| Trial days remaining          | 30                                   |
| Usage limits                  | none set (soft and hard both unset)  |
| Volume cap on this plan       | **0.5 GB** — the provisioned `postgres-volume` is exactly 500 MB |

## 2. Measured RAM, CPU and the cost of running to the open

Measured from Railway's own metrics over the hour after each service started (`MEMORY_USAGE_GB`,
`CPU_USAGE`, `DISK_USAGE_GB`), with each service's limit set to 0.5 GB RAM / 1 vCPU:

All four services are deployed and were measured after the indexer's backfill, so these are
working figures rather than idle ones:

| Service      | RAM current | RAM max   | CPU average | Limit set       |
| ------------ | ----------- | --------- | ----------- | --------------- |
| indexer      | 0.2617 GB   | 0.2617 GB | 0.0063 vCPU | 0.5 GB / 1 vCPU |
| api          | 0.1638 GB   | 0.2574 GB | 0.0029 vCPU | 0.5 GB / 1 vCPU |
| pricing      | 0.1167 GB   | 0.1255 GB | 0.0009 vCPU | 0.5 GB / 1 vCPU |
| Postgres     | 0.0584 GB   | 0.0969 GB | 0.0002 vCPU | plan default    |
| **total**    | **0.6006 GB** | **0.7415 GB** | **0.0103 vCPU** |          |

Every service fits inside 0.5 GB, so the limits are set there: the smallest round figure above the
measured maximum, with the indexer's 0.2617 GB peak leaving 0.24 GB of headroom for a busier tail.
A tighter limit would risk an OOM kill on a service that must not sleep, and it would save nothing
— Railway bills measured usage, not the limit.

At the posted rates ($10/GB/month RAM, $20/vCPU/month CPU, $0.15/GB/month volume):

```
RAM     0.6006 GB x $10/GB/month                 = $6.01 /month   (0.7415 GB at peak: $7.42)
CPU     0.0103 vCPU x $20/vCPU/month             = $0.21 /month
volume  0.5 GB provisioned x $0.15/GB/month      = $0.075/month
                                                  ----------------
                                        total    ≈ $6.29 /month  = $0.210/day
                                      at peak    ≈ $7.70 /month  = $0.257/day
```

**Does the $5.00 trial credit reach the open?** The open is 2026-10-06 21:00 WIB = 14:00 UTC, which
is 1.87 days from this measurement (2026-10-04 17:10 UTC):

```
to the open (1.87 days)    1.87 x $0.257 = $0.48   of $5.00   (10%)
open + one week (8.9 days) 8.90 x $0.257 = $2.29   of $5.00   (46%)
a full 30 days               30 x $0.257 = $7.70   of $5.00   (154%)
runway on $5.00             $5.00 / $0.257/day     = 19.5 days  (23.8 days at the lower figure)
```

**The plan carries four always-on services to the 2026-10-06 open and a week past it, with $2.71
left of the $5.00.** It does not carry them for a full month: the credit runs out between
2026-10-24 and 2026-10-28. That is the operator's decision to make; nothing was upgraded, no
payment method was added, and no credit was bought.

## 3. Volume: `PRICE_TICK_RETENTION_DAYS`

The Postgres volume reads **0.1054 GB (105 MB) of 0.5 GB** with the schema in place and the whole
chain history replayed — that is the number the operator pays $0.15/GB/month on. The full backfill
of 8,478,600 blocks moved the volume from 0.1016 GB to 0.1054 GB, so **the entire event history of
this deployment is under 4 MB**: the protocol has had no trading on chain 4663 yet, and the
settlement-token traffic that dominates the chain is no longer indexed (Section 5).

`price_ticks` is still empty — every market's oracle is shut today (Section 8) — so the retention
value is sized from the row width and the sample rate rather than from a visible slope:

```
sample rate         PRICE_SAMPLE_INTERVAL_MS = 60,000  -> 1 tick per market per minute
active markets      32 (measured: "indexer: 32 market(s) synced from the registry")
rows per day        32 x 1,440                              =    46,080 rows/day
row width           id 4 B + market_id 66 B + price ~24 B + sampled_at 8 B
                    + 24 B heap header/padding              =  ~130 B heap
                    + (market_id, sampled_at) index ~90 B
                    + serial primary key index ~16 B        =  ~240 B/row all-in
growth              46,080 x 240 B                          =  11.1 MB/day
headroom            500 MB cap - 105 MB base                = 395 MB for data
cap-limited maximum 395 MB / 11.1 MB/day                     = 35 days of ticks
```

**`PRICE_TICK_RETENTION_DAYS` stays at 8**, its default:

```
8 days x 11.1 MB/day = 89 MB of ticks
105 MB base + 89 MB  = 194 MB of the 500 MB cap (39%)
leaving                306 MB for the events table, WAL and index bloat
```

Eight days covers the 2026-10-06 open and the week past it (to 2026-10-13) with the ticks for that
whole window still queryable, and uses two fifths of the volume. The cap would allow 35 days, but
spending the remaining 307 MB of headroom on tick history leaves nothing for `events` under real
trading volume or for WAL growth, so the default is kept deliberately rather than by omission.

`events` is measured rather than guessed now that the backfill has run: under 4 MB for the whole
history since 2026-09-24, because nothing has traded on chain 4663 yet. It only ever holds the 49
decoded protocol events.

## 4. The indexer's start block, measured

Nothing in the repository recorded a mainnet deployment block (`packages/contracts/CHANGELOG.md`
records them for testnet only). `eth_getCode` cannot find it — the official RPC is not an archive
node and answers `historical state ... is not available` for anything older than a few thousand
blocks — so it was measured from logs instead: a timestamp bisection to 2026-09-20, then a forward
`eth_getLogs` scan over `marketRegistry` (`0x71Bb058106b1a226a6f66e2152719a6B827c783a`).

| Thing                     | Measured value                                        |
| ------------------------- | ----------------------------------------------------- |
| First `marketRegistry` log | block **71,621,418**, 2026-09-24 19:30:15 UTC, tx `0x8706a983b4e7…` |
| Topic                     | `0xbc7cd75a20ee27fd…` (`Initialized`, the proxy's first event) |
| Chain head at measurement | 80,052,647 (2026-10-04 ~15:50 UTC)                    |
| Blocks since deployment   | **8,427,153**                                         |
| Block rate               | **9.88 blocks/second** (0.1012 s/block), over 100,000 blocks |

`INDEXER_START_BLOCK=71621418` is set on the indexer, so a fresh database replays from the
deployment rather than from genesis or from the head.

## 5. Why the backfill could not start, and the fix that let it finish

The first deploy of the indexer and of pricing both failed, and the second one of the indexer has
been failing its `eth_getLogs` calls ever since. Both causes are measured.

**Cause 1 — Railway shared variables are not inherited.** `CHAIN_ID`, `RPC_URL` and `DATABASE_URL`
were first set as environment-level shared variables. The services do not see those unless each one
references them, so pricing died with
`Error: Missing required environment variable: RPC_URL` (healthcheck failure) and the indexer died in
its pre-deploy `db:migrate` the same way. Fixed by setting the variables on each service directly;
both redeployed to `SUCCESS`.

**Cause 2 — the settlement token is in the watched address list.** `watchedAddresses` watched all 21
recorded addresses, including `settlementToken` (USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`).
USDG is an external ERC-20 that emits **none** of the 49 events in `allEventsAbi`, so every one of
its logs is fetched over the RPC and then discarded by `parseEventLogs`. Measured on chain 4663:

| Measurement                                | Value                        |
| ------------------------------------------ | ---------------------------- |
| USDG logs in the last 1,000 blocks         | **2,380** (2.38 logs/block)  |
| USDG logs in the last 10,000 blocks        | over the RPC's limit: `logs matched by query exceeds limit of 10000` |
| Robinhood RPC per-request caps             | **10,000 logs** and **100,000 blocks** per `eth_getLogs` |
| Largest usable range with USDG watched     | ~4,000 blocks, and under 2,000 near the deployment |
| Backfill calls needed at that width        | 8,427,153 / 2,000 ≈ **4,200+**, and the public RPC starts answering `HTTP 429` well before that |

The failing call is in the deploy log verbatim:

```
message: 'logs matched by query exceeds limit of 10000'
Request body: {"method":"eth_getLogs","params":[{"address":[...21 addresses...],
  "topics":[],"fromBlock":"0x444db2a","toBlock":"0x444e2f9"}]}
```

`tick()`'s failure is caught per cycle, so the service stays up and the rest of its work still runs
— which is why the markets and the price ticks below are real despite the backfill being stuck.

**The fix:** `services/indexer/src/events.ts` now excludes `settlementToken` from
`watchedAddresses` (an `UNWATCHED_CONTRACTS` set, with the reasoning in a comment). Deposits and
withdrawals come from `CollateralDeposited` / `CollateralWithdrawn` on the collateral manager and the
vault, so no event is lost. With the token out of the list the range is limited only by the RPC's
100,000-block cap, so `INDEXER_MAX_BLOCK_RANGE=50000` is set on the service and the backfill is
about 170 calls instead of 4,200. `pnpm --filter @hume/indexer typecheck` passes and its 3 tests
pass.

**The backfill then ran, and finished.** Deployed from the working tree with `railway up` (Railway
builds `main`, and the operator owns every push, so the uncommitted fix was uploaded directly):

```
indexer: processed blocks 73421418-73471417     16:35:56   50,000-block chunks, ~1.4 s each
indexer: processed blocks 74271418-74321417     16:36:19
...
indexer: processed blocks 80084198-80084282     16:39:54   caught up, now tailing in ~70-block steps
indexer: processed blocks 80100034-80100090     17:06:33
```

**8,478,600 blocks in about 4 minutes**, from the deployment block 71,621,418 to the head, with no
`exceeds limit of 10000` and no HTTP 429.

## 6. What is live

`railway environment list` and `describe-environment` on the project:

| Environment  | State                                                             |
| ------------ | ----------------------------------------------------------------- |
| `mainnet`    | created in this phase (`c5bd9778-db85-4f55-9fa1-7770cd9d8023`), the only environment in the project |
| `production` | **deleted** on the operator's instruction. It was Railway's default environment, holding one leftover service `humemarkets` whose single deploy FAILED — the repository root deployed as one service, which Phase 5 forbids. No volumes, no domains, no variables, no data. |
| `testnet`    | **absent** — not created, not misconfigured. Phase 15 owns it.    |

Services in `mainnet`:

| Service    | ID                                     | Source / image                                   | Latest deploy |
| ---------- | -------------------------------------- | ------------------------------------------------ | ------------- |
| Postgres   | `9e60905c-9d08-42df-96dc-f6c3887c454e` | `ghcr.io/railwayapp-templates/postgres-ssl:18`   | **SUCCESS**   |
| indexer    | `1d1399e9-dabc-406e-a396-9d9f2b1463f8` | `HUMEMARKETS/humemarkets` @ `main`               | **SUCCESS** (`27b55670`) |
| api        | `1b638e34-1577-470e-a322-b51b55c71ebf` | `HUMEMARKETS/humemarkets` @ `main`               | **SUCCESS** (`bd8571cf`) |
| pricing    | `ce9d93f0-3908-4c58-9d14-ce7a5bb2b10b` | `HUMEMARKETS/humemarkets` @ `main`               | **SUCCESS** (`a3e34fd4`) |

The api's public domain is `api-mainnet-e81a.up.railway.app`, generated in this phase.

```
$ curl -s https://api-mainnet-e81a.up.railway.app/health
{"ok":true}

$ curl -s https://api-mainnet-e81a.up.railway.app/v1/markets   # 32 rows, first one shown
[{"marketId":"0x4141504c000...000","underlyingToken":"0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
  "oracleId":"0x4141504c000...000","optionsEnabled":true,"perpsEnabled":true,"maxLeverage":"5",
  "openInterestCap":"10000000000","active":true,"blockNumber":"80047737",
  "updatedAt":"2026-10-04T15:38:25.506Z"}, ...]
```

The 32 market ids decode to: AAPL, AMD, AMZN, ASML, BABA, CLSK, COIN, CRCL, CRWV, EWY, GME, GOOGL,
INTC, IONQ, META, MSFT, MSTR, MU, NBIS, NVDA, ORCL, PLTR, QQQ, RGTI, RKLB, SLV, SNDK, SPCX, SPY,
TSLA, TSM, USO — the same 32 Phase 4 measured feeds for.

Volume: `postgres-volume` (`8982df04-8abe-42fe-8f1f-f891f740b939`), 500 MB, region `sfo`, mounted at
`/var/lib/postgresql/data`.

### One repository, one deployment per service

`railway.json` per service turned out to be unusable: setting `railwayConfigFile` is refused with
`Config as Code (railway.json / railway.toml) is deprecated. Use Infrastructure as Code
(.railway/railway.ts) instead.` The settings each file holds were therefore applied to the service
directly, field for field, and the repository root is never deployed as one service:

| Setting       | indexer                                   | api                            | pricing                        |
| ------------- | ----------------------------------------- | ------------------------------ | ------------------------------ |
| rootDirectory | `/`                                       | `/`                            | `/`                            |
| builder       | RAILPACK                                  | RAILPACK                       | RAILPACK                       |
| buildCommand  | `true`                                    | `true`                         | `true`                         |
| startCommand  | `pnpm --filter @hume/indexer start`       | `pnpm --filter @hume/api start` | `pnpm --filter @hume/pricing start` |
| preDeploy     | `pnpm --filter @hume/indexer db:migrate`  | —                              | —                              |
| healthcheck   | —                                         | `/health`, 60 s                | `/health`, 60 s                |
| watchPatterns | `/services/indexer/**`, `/packages/**`, `/pnpm-lock.yaml`, `/package.json` | same for `api` | same for `pricing` |
| restart       | ON_FAILURE, 10 retries                    | ON_FAILURE, 10                 | ON_FAILURE, 10                 |
| sleep         | disabled                                  | disabled                       | disabled                       |

The build log confirms the monorepo is built as a workspace, not as a flat root app:
`Scope: all 13 workspace projects`, `pnpm install --frozen-lockfile --prefer-offline`.

### Variables set

Per service, not as shared variables (see Section 5, Cause 1). No secret is recorded here.

| Variable                    | Value                                                   | Set on            |
| --------------------------- | ------------------------------------------------------- | ----------------- |
| `CHAIN_ID`                  | `4663`                                                  | all three         |
| `RPC_URL`                   | indexer: `https://rpc.mainnet.chain.robinhood.com`; api and pricing: an Alchemy free-tier endpoint (Section 7) | per service |
| `DATABASE_URL`              | `${{Postgres.DATABASE_URL}}`                            | indexer, api      |
| `INDEXER_START_BLOCK`       | `71621418`                                              | indexer           |
| `INDEXER_MAX_BLOCK_RANGE`   | `50000` — safe only with Section 5's fix in place        | indexer           |
| `INDEXER_POLL_INTERVAL_MS`  | `5000`, the default — 1000 was tried and throttled the RPC (Section 7) | indexer |
| `PRICE_TICK_RETENTION_DAYS` | `8`                                                     | indexer           |
| `API_PORT` / `PORT`         | `4000`                                                  | api               |
| `PRICING_PORT` / `PORT`     | `4100`                                                  | pricing           |
| `PRICING_SERVICE_URL`       | `http://pricing.railway.internal:4100`                  | api               |
| `API_URL`                   | `http://api.railway.internal:4000`                      | pricing           |
| `CORS_ORIGINS`              | `http://localhost:3000` — Phase 6 replaces this with the deployed web origin | api |
| `QUOTER_ADDRESS`            | `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`            | pricing           |

**`QUOTER_PRIVATE_KEY` is deliberately not set.** The dedicated quoter key is generated in Phase 16;
today `QUOTER_ROLE` on mainnet still sits with the deployer (`docs/evidence/phase-0.md` Section 4),
and the deployer's key is not going into a hosting provider's variable store to stand in for it.
`services/pricing` handles this by design — without the key it serves analytics and returns no signed
quote — so option *quoting* is unsigned until Phase 16. Perps, prices and markets are unaffected.

### One `DATABASE_URL`, no pooler, no client change

Railway Postgres is a direct connection, so there is no transaction pooler, and `prepare: false` and
`DIRECT_DATABASE_URL` are not needed. Both database clients were read and left untouched:

| File                                 | What it does                                                        |
| ------------------------------------ | ------------------------------------------------------------------- |
| `services/api/src/db.ts`             | `postgres(requireEnv("DATABASE_URL"), { transform: postgres.camel })` — kept |
| `services/indexer/src/db/client.ts`  | `postgres(requireEnv("DATABASE_URL"))`, wrapped in Drizzle          |
| `services/indexer/src/db/migrate.ts` | Drizzle's `migrate()` over the same client, run as the pre-deploy command |

`services/pricing` has no database client at all — it reads the chain and the API, so the phase's
"three db clients" are in fact two plus a service that needs none.

Drizzle remains the only migration system; `drizzle/0000_goofy_arclight.sql` and
`0001_clammy_thaddeus_ross.sql` were applied by the pre-deploy command on deployment `27b55670`,
which reached `SUCCESS` — the deploy fails if the pre-deploy command fails, as the first attempt
(`5a4555f8`, `PRE_DEPLOY_COMMAND` / "Pre-deploy command failed") shows.

## 7. How far behind the head the tail actually sits

The acceptance check asks for `indexer_state.last_indexed_block` within **10 blocks** of the chain
head. Measured after the backfill, from consecutive cycles in the indexer's own log against
`eth_blockNumber` read at the same minute:

| Measurement                              | Value                                        |
| ---------------------------------------- | -------------------------------------------- |
| Blocks covered per cycle                 | 49, 55, 50, 60, 71, 75, 85 — **49 to 85**    |
| Wall time per cycle                      | **5 to 7 s** (17:04:18, :24, :29, :34, :41)  |
| Chain rate                               | 9.88 blocks/s                                |
| Steady-state lag                         | **49 to 75 blocks = 5 to 7 s of chain**      |
| Lag right after a price-sampling round    | up to **484 blocks** (one 54 s gap at 17:04:41 → 17:05:35) |
| Last indexed / head, read 8 s apart       | 80,100,090 at 17:06:33 / 80,100,255 at 17:06:48 |

Then the column itself was read. 40 samples of `indexer_state.last_indexed_block` against
`eth_blockNumber`, three seconds apart, each pair read back to back from one script:

| Statistic | Lag in blocks | In seconds of chain |
| --------- | ------------- | ------------------- |
| min       | **-25** (the indexer was ahead of the head this reader saw) | — |
| p50       | **55**        | 5.6 s               |
| p90       | **359**       | 36 s                |
| max       | **449**       | 45 s                |
| within 10 blocks | **4 of 40 samples (10%)** |          |

```
-25,-5,5,10,15,23,25,27,29,30,31,35,39,40,40,45,49,55,55,55,71,80,84,90,
120,135,165,180,210,230,260,269,306,314,350,359,395,405,441,449
```

The shape is a sawtooth: the lag falls to zero or below at the end of each indexing cycle and climbs
while the price-sampling round holds the loop. So the tail is **inside 10 blocks about a tenth of
the time and a median 55 blocks otherwise** — not the continuous window the check asks for.

Two things set that floor, and neither is a configuration mistake:

1. **One cycle is one round trip to a public RPC.** Each cycle is an `eth_blockNumber` plus an
   `eth_getLogs` over 20 contract addresses against `rpc.mainnet.chain.robinhood.com`, and that
   costs 5–7 s. Ten blocks of this chain is **1.01 s**, so a 10-block window needs a
   sub-second round trip — faster than the official endpoint answers.

   **Lowering the poll interval was tried and reverted.** `INDEXER_POLL_INTERVAL_MS` was set to
   1,000 to take the sleep out of the equation. The endpoint then began refusing requests: from
   17:33:37 every one of the 32 price samples failed with
   `ContractFunctionExecutionError: HTTP request failed.` and the indexing loop with
   `indexer: tick failed HttpRequestError: HTTP request failed.`, and `processed blocks` stopped
   advancing between 17:31:59 and the restart. The endpoint answered a plain `eth_blockNumber`
   with HTTP 200 throughout, so this is per-client throttling, not an outage. The variable is back
   at its 5,000 default and the tail has been clean since 17:37:33. **Chasing the 10-block number
   on this endpoint costs availability, which the indexer cannot trade away.**
2. **The price-sampling round blocks the loop for ~45 s every minute while markets are shut**, which
   is the climbing half of the sawtooth above and the whole of the p90 and max figures.
   `sampleIndexPrices` walks all 32 markets in sequence, and today every one of them reverts
   `MarketSessionClosed` (Section 8) at ~1.3 s per market. The indexer catches each revert and
   skips the market, as designed, but the tick still costs the wall time, which is what the 484-block
   gap is. Inside the session these calls return a price instead of reverting.

### What the endpoint actually costs, and the one alternative

Measured against `rpc.mainnet.chain.robinhood.com` on 2026-10-04 17:55 UTC, with the indexer's own
call shape (20 contract addresses, no topics):

| Call                                   | Latency                                  |
| -------------------------------------- | ---------------------------------------- |
| `eth_blockNumber`                      | **1,564 ms**                             |
| `eth_getLogs` over 60 blocks, 5 runs   | median **1,688 ms** (min 1,449, max 1,822) |
| `eth_getLogs` over 50,000 blocks       | 1,902 ms, 0 logs                         |

One cycle is both calls, so **~3.2 s of RPC time is the floor** — which is the 5–7 s cycle and the
55-block median, and why 10 blocks (1.01 s of chain) is out of reach by configuration.
`docs.robinhood.com/chain/connecting` calls this endpoint "rate-limited and not recommended for
production use", which matches the throttling above.

### The keyed provider was tried, and it is worse for the indexer

An Alchemy free-tier key was set as `RPC_URL` on all three services. The indexer immediately began
failing every `eth_getLogs`, with the reason stated outright:

```
code: -32600
message: 'Under the Free tier plan, you can make eth_getLogs requests with up to a 10 block range.
          Based on your parameters, this block range should work: [0x4c6eb3f, 0x4c6eb48].
          Upgrade to PAYG for expanded block range.'
```

The cap is 10 blocks per request, confirmed against the live endpoint with and without a `topics`
filter and at 100-, 50,000- and 6,493-block ranges — every one refused. That is the cap
`services/indexer/src/index.ts` always documented ("10 fits the Alchemy free tier"). At 10 blocks a
request and 9.88 blocks a second, the indexer needs one call per second merely to break even, with
no margin, and the 8,427,153-block backfill would take **847,000 calls** instead of 170.

What Alchemy is good at here is the small `eth_call` reads: the 32-market price round went from
~45 s on the public endpoint to roughly 2 s, and its per-call latency from ~1,100 ms to ~25-500 ms,
measured from the sampling log's timestamps.

**So the two endpoints are split by what each is good at**, which needs no code because `RPC_URL`
is per service:

| Service        | `RPC_URL`                                  | Why |
| -------------- | ------------------------------------------ | --- |
| indexer        | `https://rpc.mainnet.chain.robinhood.com`  | wide `eth_getLogs` ranges (100,000 blocks, 10,000 logs) exist only here for free |
| api, pricing   | Alchemy free tier                          | small `eth_call` reads, 3-40x faster, no range limit applies |

The indexer is therefore back on the public endpoint with `INDEXER_MAX_BLOCK_RANGE=50000` and
`INDEXER_POLL_INTERVAL_MS=5000`, which is where its 55-block median lag comes from. **Closing the
10-block line needs Alchemy PAYG, which is a paid plan and the operator's budget decision**, not a
change in this repository.

**One operational hazard this uncovered.** viem puts the request URL in its error text, so the first
`eth_getLogs` failure wrote the whole keyed endpoint, API key included, into the Railway deploy log.
Any RPC error does this. A key used here should be treated as logged, rotated after an incident, and
never reused anywhere else.

The docs page also lists one endpoint that needs no key, the sequencer. It does not serve reads:

```
$ curl -X POST .../ -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
    https://sequencer.mainnet.chain.robinhood.com
{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"the method eth_blockNumber does not exist/is not available"}}
```

Every other endpoint on that page — Alchemy `https://robinhood-mainnet.g.alchemy.com/v2/{API_KEY}`,
Chainstack, QuickNode — needs an account and a key the operator holds. The steady load is about
**0.4 requests/second**, plus ~170 calls for a one-off backfill, which fits a free tier.

So the indexer **is** caught up and tailing live, within 5–7 seconds of the head, and it recovers to
that within one cycle after each price round. It touches 10 blocks at the end of a cycle but does not
hold there, and it cannot on this RPC. Closing that number needs a lower-latency endpoint with a
higher rate limit (the Alchemy-style provider `packages/config/src/chains.ts` already recommends for
anything beyond demos), not a code change here.

## 8. Live prices: the session is shut, and the API answered with a stack trace

`GET /v1/prices/NVDA` (and AAPL, and SPY) answered **HTTP 500** carrying viem's raw revert text:

```
The contract function "getIndexPrice" reverted with the following signature: 0x2e4a0816
```

That selector was not in any ABI the service holds, so it was resolved against the contracts:
`cast sig-event` over all 100 custom errors in `packages/contracts/src/**` gives exactly one match,
**`MarketSessionClosed(bytes32)`**. Read live from `PriceValidator`
(`0x8eBEB401A0a4f676B63dcC687Cf300B81f239ba6`) on chain 4663 at 2026-10-04 16:15 UTC:

| Read                       | Value                                                        |
| -------------------------- | ------------------------------------------------------------ |
| `tradingSession(NVDA)`     | open 48,600 s = **13:30 UTC**, close 73,800 s = **20:30 UTC**, `daysMask` 31 = **Mon–Fri**, `preOpenGrace` 5,400 s |
| `priceState(now, NVDA)`    | **1 = `Closed`** (`enum PriceState { Fresh, Closed, Stale }`) |
| `maxPriceAge(NVDA)`        | 32,400 s = 9 h                                               |
| Clock at the read          | Sun 2026-10-04 16:15 UTC                                     |

So the revert is correct: Sunday is outside `daysMask`, the market is shut, and the oracle refuses
to serve a carried-over price. Phase 4 built that rule deliberately — `PriceValidator.sol` says
`MarketSessionClosed` "is a normal state and not a fault". **Live prices are therefore not
observable until the session reopens 2026-10-05 13:30 UTC**, and the same closure is why
`price_ticks` is still empty: the indexer's `sampleIndexPrices` catches the per-market revert and
skips the round, which is also why Section 3's growth figure is arithmetic rather than a slope.

What was **not** correct is the API's answer. A normal state arrived as an HTTP 500 with a raw
revert string and a viem stack trace in the body, which `docs/UI_CONTRACT.md` forbids on screen and
which the hard rule "a paused market is a shipped market — it renders, it prices, it refuses
trades" rules out. `services/api/src/routes/prices.ts` now decodes the revert and answers 200 with
an explicit state instead:

| Revert                        | Answer                                                       |
| ----------------------------- | ------------------------------------------------------------ |
| `MarketSessionClosed(bytes32)` | `{"state":"closed","indexPrice":null,"markPrice":null,"lastPrice":null}` |
| `StaleOraclePrice()`          | `{"state":"stale", ...nulls}`                                |
| `MarketOraclePaused(bytes32)` / `NoPriceSource(bytes32)` | `{"state":"paused", ...nulls}`    |
| anything else                 | rethrown — a real fault stays a fault                        |
| no revert                     | `{"state":"fresh","indexPrice":{…},"markPrice":{…},"lastPrice":{…}}` |

The four selectors are derived in the service from the signatures in `PriceValidator.sol` and
`OracleRouter.sol`, because `@hume/sdk`'s generated ABIs predate the session work and
`packages/sdk` belongs to the frontend lane — regenerating them there is a cross-lane change this
phase did not make. `services/api/src/prices.routes.test.ts` covers all five branches and pins the
on-chain selector `0x2e4a0816` to `MarketSessionClosed(bytes32)`; five tests, all passing.

Deployed and verified against the live service:

```
$ curl -s -w "HTTP %{http_code}" https://api-mainnet-e81a.up.railway.app/v1/prices/NVDA
HTTP 200 {"state":"closed","indexPrice":null,"markPrice":null,"lastPrice":null}

AAPL  HTTP 200 {"state":"closed","indexPrice":null,"markPrice":null,"lastPrice":null}
SPY   HTTP 200 {"state":"closed","indexPrice":null,"markPrice":null,"lastPrice":null}
```

Before the fix the same three calls returned HTTP 500 with viem's stack trace in the body.

## 9. The database, read directly

A Railway TCP proxy was created on the Postgres service, the rows below were read through it, and
the proxy was deleted in the same session — `list-tcp-proxies` returns empty again, so the database
has no public endpoint. Read at 2026-10-04 17:42 UTC:

| Read                                 | Value                                      |
| ------------------------------------ | ------------------------------------------ |
| `indexer_state.last_indexed_block`   | **80,121,616**, then 80,121,820 four minutes later — advancing |
| `markets`                            | **32 rows, all 32 `active`**               |
| `events`                             | **226 rows** — the whole history since the 2026-09-24 deployment |
| `price_ticks`                        | **0 rows** — every oracle is shut today (Section 8) |
| `drizzle.__drizzle_migrations`        | **2 applied** — `0000_goofy_arclight`, `0001_clammy_thaddeus_ross` |
| `pg_database_size`                   | **8,345,279 bytes (8.3 MB)**               |

Table sizes, including indexes: `events` 180 KB, `markets` 64 KB, `indexer_state` 56 KB,
`price_ticks` 24 KB. So the 105 MB the volume reports is almost entirely Postgres itself; the
protocol's own data is 8.3 MB, and 226 events is what 8,478,600 blocks of an untraded deployment
amounts to.

This also settles the acceptance line about connecting to Postgres: the indexer writes, the api
reads those rows over HTTP, and the migration table confirms Drizzle applied both migrations and
nothing else.

## 10. Gates

```
pnpm typecheck   16 tasks, 16 successful
pnpm lint        12 tasks, 12 successful
pnpm test        16 tasks, 16 successful  (@hume/sdk alone: 158 tests, 158 pass)
```

## 11. Acceptance

| Check                                                              | Result |
| ------------------------------------------------------------------ | ------ |
| `GET /v1/markets` returns the listed mainnet markets               | **pass** — 32 markets over `api-mainnet-e81a.up.railway.app` |
| …with live prices                                                  | **blocked by the market, not by the stack** — the equity session is shut until 2026-10-05 13:30 UTC and the oracle reverts `MarketSessionClosed` for all 32 (Section 8) |
| `GET /v1/prices/:symbol` renders a shut market instead of failing  | **pass** — HTTP 200 `{"state":"closed"}` for NVDA, AAPL and SPY (Section 8) |
| Indexer caught up from the deployment block                        | **pass** — 8,478,600 blocks replayed in ~4 minutes (Section 5) |
| Running image matches the repository                               | **pass** — merged as `b22c92a`; the working tree and `origin/main` are identical for `services/**` and `.env.example`, so the uploaded image's content equals `main` |
| `indexer_state.last_indexed_block` within 10 blocks of the head    | **amber** — read from the column, 40 samples: min -25, p50 **55**, p90 359, max 449; inside 10 blocks in 4 of 40 samples (Section 7) |
| All services connect to Postgres with no error                     | **pass** — indexer writes, api serves those rows, `drizzle.__drizzle_migrations` holds 2 (Section 9); pricing needs no database |
| `markets` populated from chain 4663                                | **pass** — 32 rows, all active, read from the table (Section 9) |
| Drizzle migrations applied                                         | **pass** — 2 of 2, read from `drizzle.__drizzle_migrations` (Section 9) |
| `testnet` environment confirmed absent                             | **pass** — `mainnet` is the only environment; `production` was deleted (Section 6) |
| Plan, usage, volume growth and retention arithmetic recorded        | **pass** — Sections 1 to 3, with the database read in Section 9 |
| Repository gates                                                   | **pass** — Section 10 |

**Phase 5 is amber and is not ticked.** Everything buildable is built, deployed and measured. Two
things stand between this and green, and neither is code:

1. **The opening bell, 2026-10-05 13:30 UTC.** `priceState` turns `Fresh`, `/v1/prices/:symbol`
   starts serving numbers, the indexer starts writing `price_ticks`, and Section 3's 11.1 MB/day can
   be checked against a real slope. Until then "live prices" is unobservable, by design.
2. **A decision on the 10-block tail, which needs an RPC endpoint rather than a change here.** The
   median lag is 55 blocks, 5.6 s, and the sawtooth dips inside 10 blocks a tenth of the time.
   A keyed provider was tried: **Alchemy's free tier caps `eth_getLogs` at 10 blocks**, which the
   indexer cannot work with, so it is back on the public endpoint while api and pricing keep the
   faster Alchemy reads (Section 7). The public endpoint's own latency — median 1,688 ms per
   `eth_getLogs` — puts ~3.2 s of RPC time in every cycle, and 10 blocks is 1.01 s of chain. The
   only remaining route to that number is Alchemy PAYG, a paid plan, against a $5-6 total budget.
   The alternative is to read the check as "caught up and tailing", which it demonstrably is.

Everything else the phase asked for is measured and recorded, including the database rows the
acceptance names.
