# UI rework — Session 3 evidence: navigation and sample banner

Date: 2026-10-06. Plan: `docs/UI_REWORK_PLAN.md`, Session 3. Result: **pass**.

## What changed

| Step | Change | Files |
| --- | --- | --- |
| 1 | Nav is grouped: Markets · Trade (Perpetuals, Options, Strategies) · Capital (Lending) · Social (Leaderboard) · Portfolio. On desktop the groups are disclosure menus. In the mobile sheet they are titled sections. Activity, Docs and Features moved to the footer, and to a "More" section of the sheet (the terminals have no footer). Route paths are unchanged. | `apps/web/src/lib/nav.ts` (new, one list for header, sheet and footer), `Header.tsx`, `Footer.tsx` |
| 2 | One `SAMPLE DATA` banner per app page, non-dismissable, in sample mode only. `PageHeader` renders it. The two terminals and the docs have no `PageHeader`, so they render it themselves. The `ModeMenu` trigger lost its tint and its "Sample data" text and now reads "Sample" like any environment name. The title mark, the Portfolio value mark, the leaderboard row badge and the three Features preview badges are removed. | `SampleBanner.tsx` (new, replaces `SampleMark.tsx`), `PageHeader.tsx`, `perpetuals/page.tsx`, `options/page.tsx`, `docs/page.tsx`, `ModeMenu.tsx`, `PortfolioView.tsx`, `LeaderboardView.tsx`, `ProductPreviews.tsx`, `packages/ui/src/SampleBadge.tsx` (comment only) |
| 3 | The CA badge is gone from the header (landing) and the footer. | `Header.tsx`, `Footer.tsx` |

## Accept checks

**Accept:** the nav works at 375 px and 1440 px, by keyboard and by touch. Every app page in sample mode shows exactly one sample banner.

Proof: `docs/evidence/ui-rework/s3/check-nav.mjs` drives headless Chrome over the DevTools protocol against a production
build (`next start`), sample mode, no wallet. Output: `s3/results.txt`, **all checks pass, none fail**. Screenshots in `s3/`
at 375 and 1440 px, light and dark.

| Check | Result |
| --- | --- |
| Exactly one visible `[data-sample-banner]` on `/markets`, `/perpetuals`, `/options`, `/strategies`, `/lending`, `/leaderboard`, `/portfolio`, `/activity`, `/features`, `/docs`, at 375 and 1440 | pass |
| No banner on `/` | pass |
| No "sample data" text in the header, no CA in header or footer, no horizontal scroll, on every route, at both widths | pass |
| 1440, keyboard: Tab reaches Markets then the Trade button. Enter and Space open it. Tab enters the menu. Escape closes it and returns focus to the button. Enter on a link navigates and closes the menu. Tabbing out of a group closes it. | pass |
| 1440, mouse: click opens, opening another group closes the first, click outside closes. The current group's button carries the current-page underline. | pass |
| 375, touch: a tap opens the sheet. It has the sections Trade, Capital, Social, More, plus Markets and Portfolio as top-level links. A tap on Perpetuals navigates and closes it. A tap on Features (More) navigates. Every row is at least 42 px tall (the previous sheet's row height). | pass |
| 375, keyboard: Enter on the menu button opens the sheet and Escape closes it | pass |
| Footer lists Activity, Docs and Features | pass |

Screenshots: `markets-1440-trade-open{,-dark}.png`, `markets-375-sheet-open{,-dark}.png`, `perpetuals-{1440,375}-banner.png`,
`docs-{1440,375}-banner.png`, `leaderboard-1440-banner.png`, `features-375-banner.png`.

## End-of-session commands

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test` | pass (16 tasks, 97 web tests) |
| `pnpm build` | pass (12 tasks) |
| `bash scripts/check-brand.sh` | pass |
| `bash scripts/check-hex.sh` | pass |

`apps/web` `lint` is a stub (`scaffold: apps/web lint — Phase 4`), so lint proves nothing for this session.

## Assumptions and deviations

- **Evidence file name.** The request said `session-1.md`, which holds Session 1 evidence. This file is `session-3.md`, as the plan's `session-N.md` rule says.
- **Copy is not in the nav.** The plan lists Social as Leaderboard and Copy. No Copy route exists, and the plan says to keep the existing routes. A link would 404. `nav.ts` says Copy joins Social when its route exists (Session 5).
- **Single-item groups.** Capital and Social each hold one link, as the plan describes, so Lending and Leaderboard are one click further away on desktop until the groups fill.
- **Panel badges stay.** `Panel sample` still draws a `SAMPLE DATA` badge in the header of the order panel, option ticket, positions and similar panels on the terminals and app pages. The plan names only the header chip, the row badge and the Features badges, and these panels hold balances. The banner count is one, but a terminal shows the banner plus those panel badges. Say if you want the panel badges gone too.
- **`ActivityTables.tsx:32` row badge stays.** It reads "Sample" in the transaction column where a hash would be, which says why there is no hash. The plan does not list it.
- **Features previews are no longer badged.** The previews still say "Illustrative price" when no market is live. In sample mode the banner covers them.
- **The leaderboard's fixture board** (shown when the API has no data) is still labelled by its `Panel` badge in live mode, where there is no banner.
- **The CA still renders in two places**: the docs and the landing hero on mobile (`LandingStage.tsx`). The plan names only the header and footer, and Session 4 rebuilds the landing page, so the hero copy is left for it. The docs text "here and on the home page" stays true.
- **The landing header** keeps its Features, Contracts and Markets links. Session 4 replaces them with the section rail.
- **Mobile sheet length.** With Activity, Docs and Features added it is taller. At 375 × 812 it fits without scrolling. A shorter phone scrolls the sheet (`overflow-y-auto`), and the wallet row is at the bottom.
