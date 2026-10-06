# UI rework — Session 2 evidence: data-truth bug fixes

Date: 2026-10-06. Plan: `docs/UI_REWORK_PLAN.md`, Session 2. Result: **amber**.

Amber because the Accept check was not proven in a rendered app with live prices. The code, unit tests and
all end-of-session commands are green. See "Accept checks" for what was and was not shown.

## Root causes and fixes

| Step | Root cause | Fix | Files |
| --- | --- | --- | --- |
| 1 | `TrustStrip`, `SupportedMarkets` and `DocsLiveParameters` already read `usePerpMarkets`. The contradiction came from `DocsLiveParameters`: it called `perps.get` per market, which reads the oracle and reverts while an equity session is shut. Every row dropped, and the table then said "No market is listed on the registry yet" next to a count of 21. | The docs table reads `risk.get` (RiskManager, no oracle) instead. If every row fails it shows the chain error, not "no market". One shared string, `REGISTRY_ERROR`, is used wherever the registry cannot be read. | `apps/web/src/components/DocsLiveParameters.tsx`, `SupportedMarkets.tsx`, `TrustStrip.tsx`, `apps/web/src/lib/market.ts` |
| 2 | `TrustStrip` and the option-chain cells printed a literal "…" while loading. | `Skeleton` in both places. | `TrustStrip.tsx`, `OptionChain.tsx` |
| 3 | Option quotes came only from `services/api`, then `services/pricing`, then the live oracle. With any of those unavailable, or the session shut, no quote arrived. `StrategyBuilder` treats a missing quote as "loading", so it read "Loading quotes…" for good. The options page also refused to render without `NEXT_PUBLIC_API_URL`. | `useOptionChain` is sample-aware. In sample mode each quote is priced locally from the sample-aware index price (`useIndexPrice`, which falls back to the last close) with the same Black-Scholes as `services/pricing`. The flat volatility comes from `NEXT_PUBLIC_SAMPLE_OPTION_IV_BPS` (default 5000, the pricing service's own default). The `NEXT_PUBLIC_API_URL` gate is skipped in sample mode. `StrategyBuilder` now shows an error when a quote failed, instead of "Loading quotes…" for good. | `apps/web/src/hooks/queries.ts`, `apps/web/src/lib/sampleOptions.ts`, `apps/web/src/lib/env.ts`, `OptionChain.tsx`, `StrategyBuilder.tsx`, `.env.example` |
| 4 | The API answers `"0"` for a market with no events, and the registry answers 0 open interest for a market nobody has opened. `MarketsTable` printed both as `$0`. | `fmtUsdOrDash`: zero or missing shows "–", for options volume, perp volume and open interest. | `apps/web/src/lib/format.ts`, `MarketsTable.tsx` |
| 5 | "Any hour, no market hours" contradicted the docs ("24 hours a day, 5 days a week") and `MarketHeader`'s "Closed · last close". | Title "24 hours, 5 days."; the summary says prices update 24 hours a day, 5 days a week, and that a stale feed shows its last close and refuses new orders. `MarketHeader` is unchanged. | `apps/web/src/components/landing/content.ts` |
| 6 | `LandingStage` mounted `TrustStrip` twice, once per breakpoint. | One copy under the hero, visible at every width. | `apps/web/src/components/landing/LandingStage.tsx` |

## Accept checks

**Accept:** in sample mode with no wallet, the perps, options, strategies and markets pages all show data. No page
contradicts another about the market count.

### Market count: shown

Production build served with `next start`, rendered with headless Chrome (`--dump-dom`) in sample mode, no wallet.
The landing page and `/docs` both read "Markets listed 21". The landing page has exactly one "Markets listed"
block. `/markets` lists the same 21 symbols. No page shows a count next to an empty-registry message.

### Pages show data: not shown

The render ran at 12:17 UTC on a Tuesday, about 75 minutes before the US equity session opens, with
`NEXT_PUBLIC_API_URL` unset in the local environment. In that state no price source exists: the oracle reverts
for a shut session, and there is no API to give a last close. The result:

- `/perpetuals` shows every index price as "–". This is existing behaviour and not touched by this session.
- `/options` reads "Waiting for the index price…" and `/strategies` reads "Loading quotes…". Both depend on the same index price, so they stay empty until it loads. The sample-mode options path therefore did not run end to end.
- `/markets` shows the registry rows, open interest and funding from the chain. Index price, 24h change and volumes are "–".

A render at or after the session open (13:30 UTC), or with `NEXT_PUBLIC_API_URL` set to a running `services/api`,
would prove the options, strategies and perps pages show data. A job set up to do that was stopped when this
evidence was written as amber. **Rerun this check before relying on Session 2.**

### What is proven by tests

| Check | Proof |
| --- | --- |
| Sample option pricer is correct | `apps/web/src/lib/sampleOptions.test.ts`: at the money, one year, 20% volatility gives a call of 7.9656 (the Black-Scholes value) and an equal put; put-call parity holds off the money; an expired series throws, which the chain shows as "–". |
| Zero volume is never "$0" | `apps/web/src/lib/format.test.ts`: `fmtUsdOrDash(0n)` and `fmtUsdOrDash(undefined)` give "–". |

## Assumptions and deviations

- **Step 4, first bullet not done as written.** The plan says `useMarketStats` returns labelled sample stats in sample mode. I did not add them. Without the API there is no honest source for volumes or 24h change, and inventing figures would break "sample data is always labelled". Sample mode reads the same indexer stats as live mode, and missing or zero figures show "–". Say so if you want invented sample volumes.
- **Evidence file name.** The request said `session-1.md`, which holds Session 1 evidence. This file is `session-2.md`, as the plan's `session-N.md` rule says.
- **The sample option pricer duplicates `services/pricing/src/blackScholes.ts`.** The web app cannot import a service. A `ponytail:` comment in `sampleOptions.ts` marks it.
- **Option orders are still not simulated in sample mode.** The option ticket says "Options are not in sample mode". Out of scope for this session.

## End-of-session commands

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test` | passed (web: 97 tests, 0 failed) |
| `pnpm build` | passed |
| `bash scripts/check-brand.sh` | passed |
| `bash scripts/check-hex.sh` | passed |

## Changed paths

Modified:

- `.env.example`
- `apps/web/src/components/DocsLiveParameters.tsx`
- `apps/web/src/components/MarketsTable.tsx`
- `apps/web/src/components/OptionChain.tsx`
- `apps/web/src/components/StrategyBuilder.tsx`
- `apps/web/src/components/SupportedMarkets.tsx`
- `apps/web/src/components/TrustStrip.tsx`
- `apps/web/src/components/landing/LandingStage.tsx`
- `apps/web/src/components/landing/content.ts`
- `apps/web/src/hooks/queries.ts`
- `apps/web/src/lib/env.ts`
- `apps/web/src/lib/format.ts`
- `apps/web/src/lib/format.test.ts`
- `apps/web/src/lib/market.ts`

New:

- `apps/web/src/lib/sampleOptions.ts`
- `apps/web/src/lib/sampleOptions.test.ts`
- `docs/evidence/ui-rework/session-2.md`

`docs/DEVELOPMENT_PHASES.md` was already modified before this session and is not part of it.
