# UI rework — Session 6 evidence: OG image and QA

Date: 2026-10-07. Plan: `docs/UI_REWORK_PLAN.md`, Session 6. Result: **amber**.

The operator's prompt named `session-5.md` as the evidence file. That file holds the Session 5 evidence, and the plan names `session-6.md`, so this file is `session-6.md` and `session-5.md` is untouched.

## What changed

| Step | Change | Files |
| --- | --- | --- |
| 1 | The OG image was already ivory with the loop mark (Session 1). One comment still said "charcoal ground, ivory text"; it now says ivory ground, charcoal text. The rendered image is `s6/og-image.png`. The PNL OG keeps its deep-green frame and gain bar: that is the documented ivory PNL card (`theme-colors.ts`, contract Sections 4 and 5), not the old neon accent, so it is unchanged. | `apps/web/src/app/opengraph-image.tsx` |
| 1 | "Delete the old neon-green assets": none exist. A scan of every PNG, ICO and SVG in the repo found no green-dominant pixels. `hume-logo.svg` is the unused vector source of the mark; its hex-like strings are filter ids, not colours. The app icons did carry the retired green-black tint (`#0a0d0b`); they now use the charcoal `#0b0b0b`. | `apps/web/src/app/icon.png`, `apps/web/src/app/apple-icon.png` |
| 2 | Contract explorer links did not exist unless `NEXT_PUBLIC_EXPLORER_URL` was set, so a build without it showed none. `env.explorerUrl` now falls back to the explorer recorded for the chain in `@hume/config` (mainnet: Blockscout). The environment value still wins. Testnet has no recorded explorer, so testnet draws no explorer link. | `apps/web/src/lib/env.ts` |
| 3 | The QA script and its output. | `docs/evidence/ui-rework/s6/` |

## How the checks ran

`s6/check.mjs` uses the Session 4 CDP client to drive headless Chrome against `next start`. Both modes ran against one production build configured for mainnet from the shell only (`NEXT_PUBLIC_CHAIN_ID=4663`, the public mainnet RPC, and the public domain of the Railway `api` service), so prices are real and the recorded explorer applies. No `.env` file was read. The final gates ran on a default build afterwards.

Outputs: `s6/results-qa.txt` (**172 pass, 0 fail**) and `s6/results-links.txt` (**28 pass, 1 amber, 0 fail**).

## QA checklist

| Item | Proof | Result |
| --- | --- | --- |
| Every CTA routes correctly | Every internal link reachable from the landing page, the Trade, Capital and Social menus, the footer and `/markets` (10 routes) answers 200. Clicking "Launch App" goes to `/perpetuals`; clicking "Explore Markets" goes to `/markets`. | pass |
| All 20 contract explorer links resolve | `/features` draws 20 links. Across `/`, `/features` and `/docs` there are 21 distinct links (the 21st is not a contract row on `/features`). All 21 return HTTP 2xx from `https://robinhoodchain.blockscout.com`, requested one by one, and all point at the one recorded explorer. **No link failed.** | pass |
| "Verified source" and "unaudited" present | Both strings are on the landing page (`results-links.txt`, `results-qa.txt`). | pass |
| Whether each contract is actually verified | **Not proven.** A Blockscout address page returns 200 for any address, so a 2xx proves the link is live, not that the source is verified. The explorer's JSON API answers 403 behind a bot challenge, and I did not bypass it. The operator should open the 21 URLs in `results-links.txt` in a browser. A second HTTPS source was tried afterwards (`s6/verify.mjs`, `s6/results-verify.txt`): all 21 addresses hold bytecode on chain (20 are 163-byte proxies, one is the 170-byte settlement token), and the 20 implementations in `deployments/robinhood_mainnet.implementations.json` hold bytecode too. Sourcify has source for only the settlement token (exact match); it has none for the 20 proxies or the 20 implementations. That is expected, because `script/verify-full.sh` verifies on Blockscout, not Sourcify, so this does not show the contracts are unverified. | **amber** |
| Sample mode with no wallet works on perps, options and strategies | `/perpetuals`, `/options` and `/strategies` render with one sample banner, no connect wall and no error. On `/perpetuals` a real sample trade ran: NVDA, $100 collateral, 1x. The ticket showed estimated entry 240.66, liquidation price 18.05, fee $0.10 and total $100.10 before the click. `Open long` then produced "Open long confirmed", marked `SAMPLE DATA` with "Simulated. Nothing was sent to a wallet or a chain.". The position appears in the positions table and on `/portfolio`. `/strategies` shows a straddle with net premium, break-even and payoff. `s6/sample-ticket-1440.png`, `s6/sample-trade-1440.png`, `s6/sample-options-1440.png`, `s6/sample-strategies-1440.png`. | pass |
| Both themes work on every route | 12 routes (landing, markets, perpetuals, options, strategies, lending, portfolio, activity, leaderboard, docs, features, PNL sample) at 1440 and 375 px in light and dark: the page ground is ivory or charcoal as expected, there is no horizontal scroll and no error page. 48 screenshots: `s6/<route>-<width>-<theme>.png`. | pass |
| All seven states are covered | A source audit (below), not a behavioural test. | **amber** |

### Seven states

The script did not drive every state of every page. A grep of each page's components shows each state is handled in text or code, with these gaps:

- **Paused: `/options`, `/strategies`, `/portfolio`.** No component of these pages reads a market's `active` flag or uses `tradeBlocker`. Only `/perpetuals` (ticket and market list) and `/markets` refuse or mark a paused market. The option ticket therefore does not say a market is paused before signing. CLAUDE.md says a paused market renders, prices and refuses trades, so on options the refusal is left to the contract. I did not add it: it is a feature, not a QA fix, and no paused option market exists to prove it against. It needs its own session.
- **Not connected:** sample mode is the default, so the real not-connected state shows only after the visitor leaves sample mode. This script stays in sample mode.
- The seven-state grid in `docs/UI_CONTRACT.md` Section 6 is dated 2026-10-04 and is out of date (it still lists `sample` as missing everywhere). I left it unchanged.

## Observations (not changed)

- The footer network badge uses a green dot. Direction colours only are meant to be green and red. I left it for the operator to decide.
- The 24h change and candle area on `/perpetuals` read "Not enough price samples for 15m candles yet" on this API; that is data, not UI.

## End-of-session commands

```
pnpm typecheck   Tasks: 16 successful, 16 total
pnpm lint        Tasks: 12 successful, 12 total
pnpm test        Tasks: 16 successful, 16 total (0 fail in every package)
pnpm build       Tasks: 12 successful, 12 total
check-brand.sh   Brand check passed
check-hex.sh     Hex check passed
```

These ran on a default build after the mainnet-configured one, so `.next` is in the default state.
