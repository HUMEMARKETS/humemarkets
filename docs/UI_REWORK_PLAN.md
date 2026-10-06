# HUME Landing and App UI rework: six-session plan

## Context

The landing page and app UI move from the dark green-black and Space Grotesk look to an editorial ivory/charcoal look with Playfair Display and Inter. Light mode is the default, and dark mode is a toggle. The landing page is rebuilt around seven product sections. Data and state contradictions are fixed so the page never claims one thing and shows another.

`docs/UI_CONTRACT.md` rule 1 forbids new colours and fonts, and the contract says the app is dark with the PNL card as its only light surface. So Session 1 amends the contract first, with a dated amendment like the existing 2026-10-06 one. Every later session builds on the amended contract.

### Decisions (from the operator, 2026-10-06)

- **Palette: monochrome.** Charcoal is the accent. There is no green brand accent. Green and red stay only for up and down direction and candles.
- **Dark mode: inverted ivory/charcoal.** The dark ground is charcoal `#0B0B0B` with ivory text and neutral greys. The green-black tint is retired.
- **Social: UI shell only.** Copy trading and the leaderboard risk metrics (drawdown, minimum trades) show "In development". The real data comes in Phase 10 (leaderboard) and Phase 14 (copy trading, `NEXT_PUBLIC_FEATURE_COPY_TRADING`).
- **Sample label: one banner per app page.** A persistent, non-dismissable banner sits in `PageHeader` on every app page in sample mode. The per-row badges and the header chip are removed. The landing page has no banner.

### Assumptions (no question needed)

- "Hume" becomes "HUME" in user-visible text, alt text, metadata and comments only. Package names (`@hume/*`), imports, env vars, file names and identifiers stay unchanged. `check-brand.sh` is case-insensitive and does not care.
- The `theme-color` meta is ivory. The light ground is `#F3F1EA`, the single value from the contract. `#f4efe4` is dropped.
- The light theme is the default for every visitor. The OS `prefers-color-scheme` setting is ignored until the visitor picks a theme, and the choice persists in `localStorage`.
- The hero facts strip ("N markets · Nx max leverage · N contracts verified") reads every number from the registry or `packages/config`. Nothing is a literal.
- "Any hour, no market hours" is false while `MarketHeader` shows "Closed · last close". The fix is honest copy. A mechanism change is out of scope.
- **Landing UX (operator, 2026-10-06).** Navigation is a section rail like https://robinid.vercel.app/: a vertical rail on the left, with numbered items and labels, a "Start" link to the top, and the active section highlighted as the visitor scrolls.
- **Landing visuals.** The visual language stays Zupiter: wireframe 3D, spaced-caps labels and slide-out panels.
- **3D scenes.** The Three.js stack (`LandingCanvas`, `scenes.ts`, `StaticScene`) is kept and improved. The abstract decorative shapes (torus knot, spheres, octahedron "diamond") are replaced by one scene per section that depicts that section's content. The scenes are re-themed to the monochrome ivory/charcoal tokens in both themes.

## Step 0: Save this plan to the repo (on approval)

Write this plan to `docs/UI_REWORK_PLAN.md`, a new file. Plan mode allows edits only to the plan file, so this happens right after approval. The file becomes the source each session reads. Each session prompt names its section, for example: "Execute Session 2 of `docs/UI_REWORK_PLAN.md`."

## How to run a session

1. Open a fresh Claude Code session in the repo (`claude`, or `/clear` in an open one). Never chain two sessions in one context.
2. Switch the model with `/model opus` or `/model sonnet`, following the table below.
3. Press Shift+Tab until plan mode is on, then paste that session's prompt from "Session prompts".
4. Approve the plan Claude proposes. Claude then implements, runs the checks and writes the evidence file.
5. Read the one-line result.
    - **pass:** run the Ship block yourself (commit and push), then start the next session.
    - **amber:** read the note and decide whether to fix it now or carry it forward.
    - **fail:** rerun the same session with the failure pasted in.
6. Run the sessions in order, 1 to 6. Each session assumes the previous one shipped.

### Session prompts

All six share this template. Replace `N`, and add the per-session line under it.

```text
Execute Session N of docs/UI_REWORK_PLAN.md.

Read only these parts of that file: "Decisions", "Assumptions", "Session N" and
"Every session ends with". Find them with `grep -n '^##' docs/UI_REWORK_PLAN.md`.
Do not read other sessions or docs/DEVELOPMENT_PHASES.md.

Follow CLAUDE.md hard rules: no git, never read .env, nothing hardcoded,
docs/UI_CONTRACT.md governs every visual change.

Plan first: list the files you will touch and how each Session N "Accept" check
will be proven. Then implement.

Done means every Session N "Accept" check passes and the end-of-session commands
are green. Write docs/evidence/ui-rework/session-N.md.

Finish with one line (pass, amber or fail), the changed paths, and a Ship block
(branch `feat-ui-rework-sN`, Conventional Commit message). Do not start Session N+1.
```

Per-session line to append:

- **Session 1:** "Show me the amended contract palette and the contrast table before you change any component."
- **Session 2:** "Root-cause each bug before you patch it. If the options sample-mode cause is unclear after one pass, stop and tell me to switch to Opus."
- **Session 3:** "Keep the existing route paths. Only the nav structure and the sample label change."
- **Session 4:** "Prototype the camera path and rail sync first, show me a recording, then build the seven sections. Use the browser tool for the performance trace if one is available. Otherwise list the exact manual steps for me to capture it."
- **Session 5:** "If market groups are missing in packages/config, add them there, never in apps/web."
- **Session 6:** "Check every explorer link with an HTTP request and list any that fail."

## Model per session

| Session                         | Model                                 | Why                                                                                                                              |
| ------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1 Foundation and theme          | **Opus 5.5**                          | Contract amendment, contrast arithmetic for two themes, a token architecture that every file depends on.                         |
| 2 Data-truth bug fixes          | **Sonnet 5.5**                        | The bug sites are already located. Switch to Opus only if the options sample-mode root cause is unclear after one pass.          |
| 3 Navigation and sample banner  | **Sonnet 5.5**                        | Mechanical restructure of `Header.tsx` and `PageHeader`.                                                                         |
| 4 Landing rebuild               | **Opus 5.5** (Fable 5.1 if available) | Largest design session, with seven sections, an interactive health-factor calculator, a payoff chart, two themes and two widths. |
| 5 Markets tabs and social shell | **Sonnet 5.5**                        | Config-driven tabs plus static "In development" shells.                                                                          |
| 6 OG image and QA               | **Sonnet 5.5**                        | OG rewrite plus a checklist pass. Judgment is low, but screenshot review needs vision.                                           |

Start each session with `/model`, then plan mode. Each session's prompt names its section of this file so the session reads nothing else.

## Session 1: Foundation, contract and theme (Opus 5.5)

1. **Amend `docs/UI_CONTRACT.md`.** Add a dated amendment (2026-10-06 or the session date):
    - The palette is ivory `#F3F1EA` and charcoal `#0B0B0B`, with neutral greys derived from them. Light is the default, and dark is the inverse.
    - The fonts are Playfair Display (headlines), Inter (body) and Geist Mono (numbers, unchanged).
    - The rule that the app is dark-only is lifted.
    - Up and down get one value per theme.
    - Redo the contrast table for both themes in `docs/evidence/ui-rework/palette.md`.
2. **Restructure the tokens in `apps/web/src/app/globals.css`.**
    - Move the `@theme` colour values into CSS variables under `:root` (light) and `:root[data-theme="dark"]`.
    - Use `@theme inline` so the Tailwind utilities point at the variables. Token names stay the same, so components need no renames.
    - Make `color-scheme` follow the theme.
3. **Add the theme toggle without a dependency.**
    - Put an inline script in the `layout.tsx` `<head>` that sets `data-theme` from `localStorage` before paint. This prevents a flash of the wrong theme.
    - Build a small `ThemeToggle` client component that sets the attribute and persists the choice. Wrap the storage access in try/catch.
4. **Swap the fonts in `layout.tsx`.** Playfair Display goes on `--font-display` and Inter on `--font-sans`, both through `next/font/google`. Geist Mono stays.
5. **Update `apps/web/src/lib/theme-colors.ts`.** Set the ivory and charcoal values. `opengraph-image.tsx` and `themeColor` consume them.
6. **Update the brand strings.**
    - Change "Hume" to "HUME" under the rules in Assumptions.
    - In `lib/social.ts`, change `HUMEMARKETS` to `HumeMarkets`.
    - Change the CTA "Explore Hume +" (`LandingStage.tsx:343`) to "Explore Markets".
7. **Update the metadata in `layout.tsx`.** The title is "HUME — Markets are beliefs in motion", and the description is "Global markets, onchain."
8. **Update the footer.** Replace "Onchain Derivatives for Stock Tokens" (`Footer.tsx:24`) with "Global markets, onchain."

**Accept:** both themes render on every route without a flash of the wrong theme. `check-hex.sh` passes, with raw values only in `globals.css` and `theme-colors.ts`. The contrast table passes AA for text in both themes.

## Session 2: Data-truth bug fixes (Sonnet 5.5)

1. **Use one market source.**
    - `TrustStrip`, `DocsLiveParameters.tsx:48` and `SupportedMarkets.tsx:13` must all read `usePerpMarkets` (`hooks/queries.ts:34`) in both sample and live mode.
    - If the registry fails, every place shows the same error state. No place shows a count next to an "empty registry" message.
2. **Fix the first-load "…" placeholder.** Replace it with a skeleton that follows the seven-state rule.
3. **Make options sample mode work.** Make `useOptionChain` (`queries.ts:276-284`) sample-aware, the way the perps hooks are. This fixes the options page and the Strategies page stuck on "Loading quotes…" (`StrategyBuilder.tsx:219`).
4. **Fix the markets table showing `$0`** (`MarketsTable.tsx:122-130`).
    - In sample mode, return labelled sample stats from `useMarketStats`.
    - In live mode, show "—" for no data instead of `$0`.
5. **Fix the market hours copy.** Rewrite "Any hour, no market hours" (`landing/content.ts:33,35`) to state honestly when a market prices and when it closes. Keep `MarketHeader.tsx:32-34` as it is.
6. **Merge the stats block.** It appears twice, so keep only one. Session 4 places it under the hero.

**Accept:** in sample mode with no wallet, the perps, options, strategies and markets pages all show data. No page contradicts another about the market count.

## Session 3: Navigation and sample banner (Sonnet 5.5)

1. **Group the nav.** Replace the 9 flat items in `Header.tsx:20-31` with grouped items: Markets · Trade (Perpetuals, Options, Strategies) · Capital (Lending) · Social (Leaderboard, Copy) · Portfolio. Move Activity, Docs and Features into the footer or the Portfolio menu.
    - Build the groups as disclosure menus in the header and as sections in the mobile sheet (`:145`).
2. **Move the sample label.**
    - Remove the `ModeMenu.tsx:63` chip from global display.
    - Add the persistent banner to `PageHeader.tsx` in sample mode.
    - Remove the per-row badge (`LeaderboardView.tsx:73`) and the badges on the Features page.
3. **Remove the CA from the header** (`Header.tsx:81`) and the footer. `ContractAddressBadge` now renders only in Verify and in docs.

**Accept:** the nav works at 375 px and 1440 px, by keyboard and by touch. Every app page in sample mode shows exactly one sample banner.

## Session 4: Landing rebuild (Opus 5.5)

1. **Replace the old chapter structure.**
    - Remove the five chapters in `content.ts` (beginning, perpetuals, options, vault, move) and the 00 to 04 bottom rail in `LandingStage.tsx`.
    - Keep the `LandingStage` and `LandingCanvas` frame.
    - Fix the overlap of "THE HUME LANDSCAPE" and "SOURCE CODE" by deleting that caption.
2. **Add the section rail, RobinID-style.**
    - Place a vertical rail on the left with "Start" and then 01 Markets, 02 Trade, 03 Capital, 04 Social, 05 Verify, 06 Vision. The labels are spaced caps.
    - Track the active section with `IntersectionObserver` and mark it with ink weight and a tick, not a new colour.
    - Clicking an item smooth-scrolls to its anchor. Under `prefers-reduced-motion` it jumps instead.
    - Update the URL hash for deep links.
    - At 375 px, the rail collapses into a compact top progress indicator with the current section name. It must not cause horizontal scroll.
3. **Make the 3D scenes branded and per section.** Rewrite `scenes.ts` so each section has a wireframe scene that shows its content:
    - Hero: the loop mark.
    - Markets: a market grid or globe.
    - Trade: a payoff surface.
    - Capital: a vault or health gauge.
    - Social: a network of traders.
    - Verify: contract blocks.
    - Vision: the loop mark, resolved.

    The scenes also follow these rules:
    - Colours come from the CSS variables through `cssColor` (`LandingCanvas.tsx:31`), so the scenes switch with the theme.
    - The scenes are stations along one camera path in a single world (see step 5). They are not separate canvases.
    - `StaticScene` stays the fallback for reduced motion and no WebGL.
    - The work stays within the contract Section 8 motion budget.

4. **Build seven section components** under `components/landing/`, with the copy in `content.ts`:
    1. **Hero:** the HUME wordmark, the thesis line and "Global markets, onchain.", plus a market search that routes to `/markets?q=`. The facts strip below it is derived from the registry and config, and it is the single stats block.
    2. **Markets:** "Every market, one place." Region tabs use the market groups from `packages/config`, the same source as Session 5.
    3. **Trade:** "Take a view." Perpetuals, Options and Strategies, plus a mini payoff chart. Reuse the payoff maths from the strategy builder.
    4. **Capital:** "Put conviction to work." Lending, plus a health-factor calculator. Reuse the existing health-factor function from lending, and read its parameters from config.
    5. **Social:** "Follow skill, not noise." The leaderboard preview and copy trading, labelled "In development".
    6. **Verify:** "Check everything." The contracts list with explorer links (from deployments config), the per-market limits, the "Verified source" label, the "unaudited" disclaimer and the CA. Reuse `landing/ContractsPanel.tsx`.
    7. **Vision:** the closing thesis, with the Launch App and Explore Markets CTAs.
5. **Make the navigation smooth, seamless and immersive.** One continuous 3D world replaces separate scenes:
    - **Single persistent canvas.** One fixed WebGL canvas sits behind all sections, so the scene never remounts. The sections scroll over it.
    - **Scroll-driven, not cut.** Overall scroll progress (0 to 1) drives the camera path and the morph between scenes. Each frame damps toward the target (`lerp` with about 0.08 to 0.12 per frame), so motion glides after the wheel stops. Transitions blend across the scroll distance between two sections, never at a threshold.
    - **Continuous rail.** A progress line in the rail fills with scroll position, and the active marker slides between items instead of jumping. Rail clicks animate scroll with the same easing curve the camera uses, so the rail and the world move as one.
    - **Content in step with the world.** Section copy reveals with opacity and transform only, timed to the same progress value. The section header lands as the camera settles on its scene.
    - **Native scroll, no hijacking.** Keep native scrolling and add `scroll-snap-type: y proximity` so sections settle without trapping the wheel. A smooth-scroll library (Lenis) is added only if native scroll measures choppy after the damping is in place.
    - **Keyboard.** Arrow keys, PageUp/PageDown and Home/End move between sections. Focus follows the active section for screen readers.
    - **Performance budget.** 60 fps while scrolling at 1440 px on a mid-range laptop, and no long tasks over 50 ms during scroll. Cap the device pixel ratio at 2 on desktop and 1.5 on mobile, with lighter geometry on mobile. Pause rendering when the tab is hidden or the canvas is offscreen. Animate only `transform` and `opacity` in the DOM, with zero layout shift.
    - **Reduced motion.** Under `prefers-reduced-motion`, show a static scene per section, jump on click, and play no camera travel.
6. **Cover the states.** Each data-backed section handles loading, error, sample and paused.

**Accept:**

- Screenshots at 375 px and 1440 px, in both themes.
- No horizontal scroll.
- The rail highlights the right section when the page scrolls and when an item is clicked.
- The 3D scenes switch with the theme. Reduced motion shows `StaticScene`.
- A Chrome performance trace of a full scroll shows 60 fps, no long task over 50 ms and a CLS of 0. Save the trace summary in the evidence file.
- A screen recording shows a rail click that moves the camera and the content together, with no visible cut. Save the recording in the evidence file.
- Every number traces to the registry or config.

## Session 5: Markets tabs and social shell (Sonnet 5.5)

1. **Add region tabs to `/markets`.** The tabs are US · China & Asia · Commodities · ETF, from the `packages/config` market groups. Add the groups there if they are missing. BABA and EWY are only grouped, not built as new products.
2. **Add the leaderboard shell.**
    - Add the Max drawdown and Trades columns, with a minimum-trades note. They show "—" until the Phase 10 indexer data exists.
    - Add a disabled "Copy" action marked "In development".
3. **Wire the trader profile and Copy flow route** only as a labelled shell behind `NEXT_PUBLIC_FEATURE_COPY_TRADING`, read through the env config.

**Accept:** the tabs filter correctly. The shells are visibly labelled, and no fake data appears without the sample label.

## Session 6: OG image and QA (Sonnet 5.5)

1. **Rewrite the OG image.** Use ivory and the loop mark in `app/opengraph-image.tsx`, and update the PNL OG if it uses the old colours. Delete the old neon-green assets.
2. **Run the QA checklist.**
    - Every CTA routes correctly.
    - All 20 contract explorer links resolve.
    - "Verified source" and "unaudited" are present.
    - Sample mode with no wallet works on perps, options and strategies.
    - Both themes work on every route.
    - All seven states are covered.
3. **Write the evidence** to `docs/evidence/ui-rework/session-6.md`, with 375 px and 1440 px screenshots in both themes.

## Every session ends with

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build
bash scripts/check-brand.sh
bash scripts/check-hex.sh
```

- Write the evidence to `docs/evidence/ui-rework/session-N.md`.
- List the changed paths.
- Report `pass`, `amber` or `fail` in one line.
- Never touch git. The operator commits.
