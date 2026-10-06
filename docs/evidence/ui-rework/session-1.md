# UI rework — Session 1 evidence: foundation, contract and theme

Date: 2026-10-06. Plan: `docs/UI_REWORK_PLAN.md`, Session 1. Result: **pass**.

## What changed

| Step | Change | Files |
| --- | --- | --- |
| 1 | Contract amended: monochrome ivory and charcoal, light default and dark inverse, fonts Inter, Playfair Display and Geist Mono, PNL card fixed ivory | `docs/UI_CONTRACT.md` (rule 1, Sections 2, 4, 5), `docs/evidence/ui-rework/palette.md` |
| 2 | Light values in `@theme`; dark values override the same names under `:root[data-theme="dark"]`; soft fills, rings and glows derived with `color-mix` | `apps/web/src/app/globals.css` |
| 3 | Theme toggle with no dependency: an inline `<head>` script sets `data-theme` from `localStorage` before first paint; `useTheme` and `setTheme`; a toggle in the header, which sits in the menu sheet below `xl` | `apps/web/src/lib/theme-script.ts`, `apps/web/src/lib/theme.ts`, `apps/web/src/components/ThemeToggle.tsx`, `apps/web/src/components/Header.tsx`, `apps/web/src/app/layout.tsx` |
| 3 | Canvas surfaces re-read the tokens on a theme change: the price chart and the landing scene are keyed on the theme | `apps/web/src/components/PriceChart.tsx`, `apps/web/src/components/landing/LandingStage.tsx` |
| 4 | Fonts: Inter (`--font-sans`), Playfair Display 600 and 700 (`--font-display`), Geist Mono unchanged | `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css` |
| 5 | Runtime mirrors set to the light theme; PNL share image uses the fixed card values | `apps/web/src/lib/theme-colors.ts`, `apps/web/src/app/pnl/[wallet]/[positionId]/opengraph-image.tsx` |
| 5 | PNL card and its sample badge use the fixed `ivory`, `charcoal`, `card-accent`, `card-loss` tokens, so the card is ivory in both themes | `packages/ui/src/PnlCard.tsx`, `packages/ui/src/SampleBadge.tsx` |
| 6 | "Hume" to "HUME" in user-visible text, metadata, alt text and comments (identifiers, imports and package names untouched); X handle `@HumeMarkets`; hero CTA "Explore Markets" now links to `/markets` | 14 files under `apps/web/src`, `apps/web/src/lib/social.ts` |
| 7 | Title "HUME — Markets are beliefs in motion", description "Global markets, onchain." (page, Open Graph, Twitter, root share image) | `apps/web/src/app/layout.tsx`, `apps/web/src/app/opengraph-image.tsx` |
| 8 | Footer tagline "Global markets, onchain." | `apps/web/src/components/Footer.tsx` |

## Accept checks

### Both themes render on every route, with no flash of the wrong theme

48 screenshots in `docs/evidence/ui-rework/s1/`: 12 routes (`/`, `/markets`, `/perpetuals`, `/options`,
`/strategies`, `/lending`, `/leaderboard`, `/portfolio`, `/activity`, `/docs`, `/features`,
`/pnl/sample/1`) in light and dark at 1440 px and 375 px. These were captured from a production build
(`next start`) with headless Chrome over the DevTools protocol.

The capture read back the computed values on every shot:

- **Light:** `data-theme` unset, body `rgb(243, 241, 234)` (ivory), text `rgb(11, 11, 11)` (charcoal).
- **Dark:** `data-theme="dark"`, body `rgb(11, 11, 11)`, text `rgb(243, 241, 234)`.
- **Headings:** page titles resolve to `"Playfair Display"` and body text to `Inter`.
- **Width:** `scrollWidth > innerWidth` is false on all 48 shots, so no route scrolls horizontally.

**No flash.** The served HTML carries the theme script inline in `<head>`, before `<body>`:

```html
<script>try{if(localStorage.getItem("hume-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}</script>
```

With `hume-theme=dark` stored, a `PerformanceObserver` registered at document start recorded the theme
at the `first-paint` entry as `dark`, so the first painted frame is already dark. The HTML also sets
`<title>` to `HUME — Markets are beliefs in motion` and `theme-color` to `#f3f1ea`.

**Defect found and fixed during the check.** At 375 px the added toggle pushed the header controls over the
wordmark. The toggle now sits in the menu sheet below `xl`, and the recapture (`landing-*-375.png`)
shows the wordmark clear.

### `check-hex.sh` passes with raw values only in `globals.css` and `theme-colors.ts`

```
Hex check passed: no colour literal in apps/web/src or packages/ui/src outside globals.css.
```

### Contrast table passes AA for text in both themes

See `docs/evidence/ui-rework/palette.md`. The lowest text ratios:

- **Light:** `faint` on `raised` is 4.90:1. The first candidate, `#6B665E`, measured 4.28:1 and was darkened to `#625D56`.
- **Dark:** `faint` on `raised` is 4.79:1.

Every fill clears 4.5:1 for its ink. The lowest is dark `down-press` with charcoal ink, at 4.62:1.

## End-of-session commands

| Command | Result |
| --- | --- |
| `pnpm typecheck` | 16 of 16 tasks successful |
| `pnpm lint` | 12 of 12 tasks successful |
| `pnpm test` | 16 of 16 tasks successful, 0 failures (web 93, sdk 166, api 105, pricing 54, and the rest) |
| `pnpm build` | `@hume/web` compiled successfully |
| `bash scripts/check-brand.sh` | passed |
| `bash scripts/check-hex.sh` | passed |

## Notes for later sessions

- **The screenshots show no market data.** The local web build has no `NEXT_PUBLIC_RPC_URL`, so the app pages render their configured-RPC error state. The `.env` file was not read. Session 2 should capture its evidence with the RPC set.
- **Session 3 restyles the sample label next to page titles.** It currently inherits the display serif.
- **The landing scene is the current Zupiter scene, re-tinted by the tokens.** Session 4 rebuilds it.
- **Two copies of the stats block still show on the landing page.** The "Any hour, no market hours" copy also remains. Both belong to Session 2.
