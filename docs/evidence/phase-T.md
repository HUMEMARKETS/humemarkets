# Phase T — The testnet environment

Date: 2026-10-07 (UTC). Chain: Robinhood testnet, 46630. RPC: https://rpc.testnet.chain.robinhood.com.
Result: **amber**. Every acceptance line holds except the ones below, which need an operator action or a decision:

- The keeper cron service exists, but `KEEPER_PRIVATE_KEY` is not set on Railway, so its pass cannot run there (Section 6).
- `pricing` does not sleep with Serverless on, so free-plan mode projects to about $2.28/month, not under $1 (Section 7).
- The 24-hour measurement is skipped by decision (Section 0.10), so the burn is a one-hour reading.

## 1. The plan, read from the account (before anything changed)

Read with `railway usage --json` and the Railway GraphQL API (`me.workspaces.customer`), 2026-10-07 ~16:10 UTC:

| Thing | Value |
| --- | --- |
| Plan | Trial (`isTrialing: true`, subscription `INACTIVE`, no payment method) |
| Credit balance | $5.00 one-time, `appliedCredits` $0 |
| Current usage | $0.5883 (CPU $0.0229, memory $0.5329, egress $0.0316, volume $0.0018) |
| Credit left | $4.4117 |
| Trial days left | 27 |
| Usage limits | none |

After the phase (18:01 UTC): usage $0.5998, credit left $4.4002, trial days left 27 (billing lags the metrics by minutes).

## 2. Mainnet compute stopped (operator said yes)

The operator approved the stop in the session. `railway down -s <svc> -e mainnet -y` removed the latest deployment of each:

| Mainnet service | Deployment removed | State now |
| --- | --- | --- |
| indexer `1d1399e9` | `ac2aee53` | REMOVED |
| api `1b638e34` | `9470e366` | REMOVED |
| pricing `ce9d93f0` | `0614a9a1` | REMOVED |
| Postgres `9e60905c` | not touched | SUCCESS, volume `postgres-volume` (500 MB) kept |

Services, variables and the domain `api-mainnet-e81a.up.railway.app` are kept. Nothing was deleted on mainnet.

Two of the three had just started building from the Phase T0 merge (PR #38) when I stopped them, so `railway down` had to be run again once those builds reached SUCCESS.

**Trap:** the services deploy from `main` on GitHub. Merging this phase touches `services/**`, so the mainnet api and indexer will build and start again. After the merge run `railway down -s api -e mainnet -y` and the same for `indexer`, or disconnect the repo trigger on the three mainnet services.

## 3. The `testnet` environment

`railway environment new testnet --duplicate mainnet`, with these variables overridden in the same call. Environment id `f3187bb7-e532-4196-bbc4-de1dc325b0c0`.

| Service | Variable | Value |
| --- | --- | --- |
| api, indexer, pricing | `CHAIN_ID` | `46630` |
| api, indexer, pricing | `RPC_URL` | `https://rpc.testnet.chain.robinhood.com` |
| indexer | `INDEXER_START_BLOCK` | `130577648` (the block of `UpgradePlaceholder`, the first DeployAll tx `0x5e175b5c…ea8f`) |
| indexer | `INDEXER_MAX_BLOCK_RANGE` | `2000` (the testnet RPC caps by matched logs; `.env.example` says about 2000) |
| indexer | `PRICE_TICK_RETENTION_DAYS` | `8` (copied, same as Phase 5) |
| pricing | `QUOTER_ADDRESS` | `0x75962B2A0750293E01E8205b31717329Fae78147` (the T0 deployer; T0 gave both roles to it) |
| api | `SAMPLE_WALLETS` | the ten simulator bot addresses (`wallets` command), so the leaderboard labels them `sample` |

- Addresses come from `packages/config` (`resolveAddresses(46630)` reads `robinhood_testnet.json`'s mirror). No `HUME_ADDRESSES` is set. No mainnet value is set on a testnet service.
- Limits copied from Phase 5: 0.5 GB / 1 vCPU on api, indexer and pricing.
- It has its **own Postgres**: the duplicate got a new generated password (SHA-256 prefixes of `POSTGRES_PASSWORD` differ between environments) and a fresh volume instance. `DATABASE_URL` is `${{Postgres.DATABASE_URL}}` on api and indexer, which resolves to the testnet Postgres. One URL serves runtime and Drizzle migrations; the indexer's pre-deploy `db:migrate` ran on it and the deployment reached SUCCESS.
- Testnet API domain: **`https://api-testnet-8703.up.railway.app`**.
- I did not set `QUOTER_PRIVATE_KEY`. Option quotes are unsigned until the operator sets it on pricing (the T0 deployer key).

## 4. Acceptance checks

| Check | Result |
| --- | --- |
| `GET /v1/markets` lists the testnet markets, E2E paused | 21 markets, paused: `E2E` only (read 18:00 UTC) |
| Indexer within 100 blocks of the head after a cron pass | pass at 16:50:28 UTC indexed to block 130,610,319; the head read 130,610,796 at 16:51:21, and at 9.4 blocks/s the head was about 130,610,326 when the pass ended: **about 7 blocks behind**. Between passes the lag grows to about 2,800 blocks (5 min × 9.4/s) |
| A simulator price change reaches `GET /v1/prices/:symbol` within 5 minutes | reads 16 s apart at 18:00: NVDA index 189.51, 189.59, 189.57, chain timestamps 1791396046, …061, …077. The route reads the oracle on chain, so a change shows within one simulator step (15 s). There is no `GET /v1/prices` list route; the route is `/v1/prices/:symbol` |
| Mainnet compute stopped | yes, by the operator's decision (Section 2) |
| Normal and free-plan burn read, projection against $1, runway re-computed | Section 7. Free-plan: amber (24-hour wait skipped by decision) |
| Phase 8 walk shows a perp and an option review with a liquidation line at 375 and 1440 px | pass, Section 5 |

## 5. Simulator and the Phase 8 walk

Simulator (runs locally, sourcing the gitignored `.env.testnet`; `CHAIN_ID`, `RPC_URL`, `SIM_RPC_URL` and an empty `HUME_ADDRESSES` are pinned so the mainnet root `.env` cannot override them):

- `bootstrap 4` failed: the funder `0x75962B2A…8147` held 0.009074 ETH and the plan needed 0.019532 ETH. `bootstrap 2` fit and funded the bots for **2 hours**, so the simulator's gas lasts until about 18:35 UTC. The funder has about 0.0035 ETH left. Top it up from the faucet to run longer.
- `start`: prices moved at the next step (15 s). 38 positions opened in the first 30 minutes.
- `backfill 72 replace`: 86,400 simulated ticks written (72 h, 20 markets), via a temporary TCP proxy on the testnet Postgres that I deleted afterwards. These candles are simulated and must be labelled so.
- Seen in the log: bots log `could not trade: InsufficientPoolReserves` because the testnet pool is unfunded (not this phase), and `Nonce provided … is higher than the next one expected` on a few price pushes (the driver retries on the next step).

Local web build against testnet (`pnpm --filter @hume/web build`, then `start` on port 3000). Names to set:

```
NEXT_PUBLIC_CHAIN_ID=46630
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.chain.robinhood.com
NEXT_PUBLIC_API_URL=https://api-testnet-8703.up.railway.app
NEXT_PUBLIC_MARKET_REGISTRY  NEXT_PUBLIC_HUME_VAULT  NEXT_PUBLIC_OPTIONS_ENGINE  NEXT_PUBLIC_PERPS_ENGINE
NEXT_PUBLIC_ORACLE_ROUTER  NEXT_PUBLIC_RISK_MANAGER  NEXT_PUBLIC_FEE_MANAGER  NEXT_PUBLIC_COLLATERAL_TOKEN
NEXT_PUBLIC_COLLATERAL_MANAGER  NEXT_PUBLIC_OPTION_MARKET  NEXT_PUBLIC_OPTION_POSITION_MANAGER
NEXT_PUBLIC_PERP_POSITION_MANAGER  NEXT_PUBLIC_PERP_ORDER_MANAGER  NEXT_PUBLIC_LIQUIDATION_ENGINE
NEXT_PUBLIC_FUNDING_MANAGER  NEXT_PUBLIC_PRICE_VALIDATOR  NEXT_PUBLIC_BUYBACK_MODULE
NEXT_PUBLIC_CREDIT_PAIR  NEXT_PUBLIC_CREDIT_SYMBOL=TSLA
```

The address variables take the values in `robinhood_testnet.json`. They must be set explicitly: `apps/web/next.config.ts` loads the root `.env` (mainnet), and Next does not override variables that are already set.

`node docs/evidence/phase-8/walk-in-session.mjs docs/evidence/phase-8/testnet` ran at 1440 and 375 px. Both widths printed:

```
perp review has liquidation: true | worst: If NVDA falls to $9.51, the position is liquidated and you lose the $100.00 margin.
close review: You get back, about | Liquidation price | If the price moves against you before the close lands, it fills no worse than $189.18...
option review: Max loss | Liquidation price | If NVDA is at or below $140 at expiry, the option expires worthless and you lose $53.68. | Buying an option needs a connected wallet...
option confirm disabled: true
credit review: Liquidation price of TSLA | While you owe nothing, no fall in TSLA can liquidate you. | Sample mode has no lending account...
borrow refusal: Supply TSLA first: a loan needs collateral behind it.
enter-in-field shows confirm: 0   deep link confirm buttons: 0
```

Screenshots: `docs/evidence/phase-8/testnet/` — `01-perp-guided-form`, `02-perp-guided-review`, `03-perp-pro-review-row`, `04-perp-close-review`, `05-option-guided-review`, `06-credit-guided-review`, each `-1440.png` and `-375.png`. The walk runs in sample mode: Confirm opens a sample position and never signs. No transaction hash exists for it.

## 6. Free-plan mode

Code (loop mode stays the default; nothing changes when the flag is unset):

| File | Change |
| --- | --- |
| `services/indexer/src/index.ts` | `INDEXER_RUN_ONCE=true`: one pass of `tick()`, price sampling and trader stats, then close the database and exit 0. The price sampler already ran in the same loop, so it is part of the pass. |
| `services/keeper/src/index.ts` | `KEEPER_RUN_ONCE=true`: one `tick()`, then exit 0. Checked locally against testnet: exit 0 in 2.3 s. |
| `services/api/src/db.ts` | `idle_timeout: 20`. Without it the API never slept: an open pooled Postgres connection counts as activity (the API used its full 0.12 GB for 20 minutes after Serverless was on). With it the API sleeps. |
| `.env.example` | documents `INDEXER_RUN_ONCE` and `KEEPER_RUN_ONCE` |

Railway, testnet environment:

| Service | Setting |
| --- | --- |
| indexer | `INDEXER_RUN_ONCE=true`, cron `*/5 * * * *`, restart `NEVER`, deployed from the working tree with `railway up` (the code is not on `main` yet) |
| keeper (new, `c6f5daef`) | repo `HUMEMARKETS/humemarkets`, start `pnpm --filter @hume/keeper start`, cron `*/5 * * * *`, restart `NEVER`, 0.5 GB / 1 vCPU, `KEEPER_RUN_ONCE=true`, `KEEPER_REFRESH_FEEDS=false`. **`KEEPER_PRIVATE_KEY` is not set**, so its deployments end CRASHED with a missing-variable error. |
| api | Serverless on, redeployed twice (once for the setting, once for `idle_timeout`) |
| pricing | Serverless on, redeployed. It still never slept (see below). |

Checks:

- Cron passes: 16:45, 16:50 and every 5 minutes after, each about 5 to 17 seconds. The 16:50 log reads `processed blocks 130607630-130609629`, `…130610319`, `trader stats refreshed for 10 wallet(s)`.
- API sleeps and wakes: after 10 idle minutes the deployment reads `SLEEPING`; the first request then took **3.0 s** (HTTP 200), the next 0.34 s, and the status read `SUCCESS`. Seen at 17:24 and again at 17:42 (3.5 s through `/v1/options/NVDA/surface`).
- Pricing: with `sleepApplication: true` its deployment stayed `SUCCESS` and used about 0.13 GB for the whole 17:46–17:58 window. I did not find what keeps it awake; the service has no timer, and its only outbound call is the API history fetch on a quote.
- The keeper cron could not be proven on Railway without its key. The same code ran once locally as above.

## 7. The burn

Source: Railway's GraphQL `usage` query, grouped by service and environment (GB-minutes of memory, vCPU-minutes of CPU). Posted rates: $10/GB/month RAM, $20/vCPU/month CPU, $0.15/GB/month volume; a month is 43,200 minutes. These are one-hour readings projected to a month: a rough figure, not a measurement.

| Service (testnet) | Normal mode, 16:31–16:39 (8 min) | Free-plan mode, 17:46–17:58 (12 min) |
| --- | --- | --- |
| api | 0.119 GB, 0.0042 vCPU | **0** once asleep (awake 6 of the 12 min, from the 17:42 request) |
| indexer | 0.107 GB, 0.0126 vCPU | cron: 0.222 GB-min and 0.069 vCPU-min over 68 min |
| pricing | 0.113 GB, 0.0013 vCPU | 0.131 GB, 0.0009 vCPU (never slept) |
| Postgres | 0.117 GB, 0.0032 vCPU | 0.082 GB, 0.0004 vCPU |
| keeper | not present | CRASHED, about 0 |

Monthly projection:

| | Normal mode | Free-plan mode (API idle) |
| --- | --- | --- |
| RAM | 0.456 GB × $10 = $4.56 | indexer $0.03 + pricing $1.31 + Postgres $0.82 = $2.16 |
| CPU | 0.0213 vCPU × $20 = $0.43 | $0.05 |
| Volume | 0.5 GB × $0.15 = $0.075 | $0.075 |
| **Testnet total** | **$5.07 = $0.169/day** | **$2.28 = $0.076/day** |
| Mainnet Postgres kept (0.062 GB, 500 MB volume) | $0.70 | $0.70 |
| **Account total** | **$5.77/month = $0.192/day** | **$2.98/month = $0.099/day** |

Against $1/month:

- Free-plan mode is **$2.28 for one environment, 2.3 times $1**. Two services decide it: `pricing` ($1.32, because it does not sleep) and Postgres ($0.83, a database cannot sleep).
- With `pricing` asleep it would be about $0.96 for one environment: at the edge of $1, with nothing to spare for requests. An awake API costs about $0.012 per 10 minutes of traffic.
- The result: $1/month needs `pricing` to sleep, and probably a smaller Postgres footprint too. That is a decision for the operator.

Trial runway, from $4.40 left (27 trial days left):

| Mode | Daily | Days the credit lasts |
| --- | --- | --- |
| Normal, testnet plus kept mainnet Postgres | $0.192 | 22.9 (credit ends before the trial's 27 days) |
| Free-plan mode as built | $0.099 | 44 (the trial's 27 days end first) |

Phase 5 had measured four always-on services at $0.257/day at peak and 19.5 days of runway.

## 8. Found along the way

- **A secret reached the transcript.** `railway environment config --json -e mainnet`, filtered by a mask I wrote, printed the mainnet Postgres `POSTGRES_PASSWORD` in clear (the mask missed that key). Railway Postgres is private-network only and mainnet has no TCP proxy, so it is not reachable from outside, but rotate it before Phase L: set a new `POSTGRES_PASSWORD` on mainnet Postgres and redeploy it. It appears nowhere in the repository or this file.
- A temporary public TCP proxy (`viaduct.proxy.rlwy.net:32155`) on the testnet Postgres was created for `backfill` and deleted afterwards.
- Dashboards and CLI list `testnet`'s services under the same ids as mainnet's; they are separate instances (separate deployments, variables and volumes).

## 9. What the operator sets or decides

1. Set on the testnet **keeper** service: `KEEPER_PRIVATE_KEY` (the keeper wallet from `.env.testnet`). The simulator's price driver uses the same wallet, so leave `KEEPER_REFRESH_FEEDS=false` there to avoid two senders on one nonce.
2. Set on the testnet **pricing** service: `QUOTER_PRIVATE_KEY` (the T0 deployer key, which holds `QUOTER_ROLE`), if signed option quotes are wanted.
3. Fund the simulator funder `0x75962B2A0750293E01E8205b31717329Fae78147` from the faucet to run it past about 18:35 UTC, then `bootstrap`.
4. Decide on `pricing` and the $1 target (Section 7).
5. After merging, stop the redeployed mainnet api and indexer again (Section 2), and rotate the mainnet Postgres password (Section 8).
