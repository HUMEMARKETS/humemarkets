# UI rework — Session 5 evidence: markets tabs and social shell

Date: 2026-10-07. Plan: `docs/UI_REWORK_PLAN.md`, Session 5. Result: **pass**.

## What changed

| Step | Change | Files |
| --- | --- | --- |
| 1 | Two groups added where groups live: `commodities` and `etf` in `MARKET_GROUPS`. The order there is the tab order. The deployment file regroups seven markets that already trade: BABA, TSM and EWY move to `china` (shown as "China & Asia"), SLV and USO to `commodities`, SPY and QQQ to `etf`. Tier, feed and leverage are unchanged. `src/markets.ts` is regenerated with `sync:markets`. | `packages/types/src/index.ts` (+ test), `packages/contracts/deployments/robinhood_mainnet.markets.json`, `packages/config/src/markets.ts` (+ test) |
| 1 | `groupForSymbol(chainId, symbol)` in `@hume/config`. A group classifies the ticker, not the chain. Testnet records no listing (mock tokens from `AddMarket.s.sol`), so a testnet ticker uses the mainnet group for the same ticker. A ticker listed nowhere has no group and appears under "All" only. | `packages/config/src/markets.ts`, `packages/config/src/index.ts` |
| 1 | `/markets` gets group tabs above the table: "All", then each group that has a market on this network. The tabs combine with the text filter. The labels and the tab and filter helpers (`groupTabs`, `inGroup`) are in `lib/market.ts`. The landing Markets section uses the same helpers. | `apps/web/src/lib/market.ts` (+ test), `components/MarketsTable.tsx`, `components/landing/sections.tsx` |
| 2 | Leaderboard: a "Max drawdown" column that shows "–" on every row, and a "Copy" column with an "In development" label. Each row has a disabled Copy button. A note under the board says that drawdown and the minimum-trades rule are in development. The Trades column already existed and has real trade counts. | `components/LeaderboardView.tsx` |
| 3 | `NEXT_PUBLIC_FEATURE_COPY_TRADING` is read in `lib/env.ts` as `env.copyTrading`, default off, and documented in `.env.example`. When the flag is on, `/traders/[wallet]` (profile) and `/traders/[wallet]/copy` (copy flow) render shells labelled "In development" with no figures and nothing to sign. Leaderboard wallets link to the profile. When the flag is off, or the wallet is not an address, both routes return not-found. | `lib/env.ts`, `.env.example`, `app/traders/[wallet]/page.tsx`, `app/traders/[wallet]/copy/page.tsx` |

### Choices made without a question

- **Where the groups live.** `MARKET_GROUPS` is in `@hume/types`, and `@hume/config` imports it. The group of each market is in the deployment file, which is read through `@hume/config`. `apps/web` has no group literal. It has only the on-screen labels, as it did before this session.
- **"China & Asia" uses the existing `china` id.** The id is not renamed, so the type, the data and the earlier docs still match. TSM is in this group too, because Finding 2 put it with BABA. ASML stays in US.
- **The tabs show only groups that have markets.** On mainnet the tabs are All · US · China & Asia · Commodities · ETF. Testnet lists no China, Asia or commodity market, so its tabs are All · US · ETF. Crypto and Pons get a tab when they have a market.
- **Missing value is "–" (en dash).** The table already used this character for a missing figure, so the drawdown column uses it too.
- **Copy stays disabled even when the flag is on.** The flag opens the profile and copy-flow shells only. Phase 14 enables the real action.
- **Not-found status.** The root `loading.tsx` streams the page, so a not-found route returns HTTP 200 with the `NEXT_HTTP_ERROR_FALLBACK;404` body and the not-found UI. This is standard Next 15 behaviour for every route here.

## Accept checks

Script: `s5/check.mjs`. It uses the Session 4 CDP client to drive headless Chrome against `next start` (production build, testnet, sample mode, no wallet).
Output: `s5/results-flag-off.txt` (**26 pass, 0 fail**) and `s5/results-flag-on.txt` (**13 pass, 0 fail**, build with `NEXT_PUBLIC_FEATURE_COPY_TRADING=true`).

| Accept | Proof | Result |
| --- | --- | --- |
| The tabs filter correctly (data) | `markets.test.ts`: china = BABA, EWY, TSM; commodities = SLV, USO; etf = SPY, QQQ; us-equities = the other 25; the groups partition all 32. `groupForSymbol` test checks the testnet fallback and that an unknown ticker gets no group. | pass |
| The tabs filter correctly (helpers) | `lib/market.test.ts`: the tab list keeps only groups that have a market, in order; each tab shows only its own rows; an ungrouped row appears under All only. | pass |
| The tabs filter correctly (running app) | The tabs read All · US · ETF on testnet. US shows exactly the 11 grouped US tickers. ETF shows exactly QQQ and SPY. All returns 21 rows, and AVGO, DIS, E2E, HOOD, JPM, NFLX, SHOP and UBER (not listed in config) appear only there. ETF plus the filter "SPY" shows one row. Each clicked tab has `aria-selected`. | pass |
| Shells are visibly labelled | The leaderboard Copy header shows an "In development" label. Every row has a disabled Copy button. Every drawdown cell shows "–". The minimum-trades note is visible. The profile and copy pages show an "In development" label and the sentence in the panel. | pass |
| No fake data without the sample label | The 12 simulated leaderboard rows render with the sample banner on the page and the panel label "Sample data". The profile and copy pages show no `$` or `%`. The only value on them is the address from the URL. No profile link appears while the flag is off. | pass |
| Flag gates the routes | Flag off: both `/traders/…` routes show not-found. Flag on: both render. `/traders/not-a-wallet` shows not-found. There are 12 profile links for 12 address wallets, and Copy stays disabled. | pass |
| 375 and 1440 px, no horizontal scroll | `s5/markets-{1440,375}-{light,dark}.png`, `s5/leaderboard-{1440,375}-{light,dark}.png`, `s5/trader-{1440,375}.png`, `s5/copy-{1440,375}.png`. `scrollWidth <= innerWidth` on each. | pass |

At 375 px the drawdown and Copy columns are hidden, like Volume, Trades and Win rate already were. The note under the board still says what is in development.

## End-of-session commands

```
pnpm typecheck   Tasks: 16 successful, 16 total
pnpm lint        Tasks: 12 successful, 12 total
pnpm test        Tasks: 16 successful, 16 total  (types 5, config 23, web 102, sdk 166, api 105, … — 0 fail)
pnpm build       Tasks: 12 successful, 12 total  (/traders/[wallet], /traders/[wallet]/copy listed)
check-brand.sh   Brand check passed
check-hex.sh     Hex check passed
forge test --match-path test/core/MarketTier.t.sol   6 passed (reads the edited markets JSON)
```

The final `pnpm build` ran without the flag, so `.next` is in the default state (flag off).
