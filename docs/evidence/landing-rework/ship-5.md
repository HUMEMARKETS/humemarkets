# Ship 5: logo, candles, footer line and heading type

Date: 2026-10-06.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (89 web tests, 16 of 16 tasks).
- `pnpm build` in `apps/web`: pass (`/icon.png`, `/apple-icon.png`, both OG image routes build).
- `bash scripts/check-hex.sh`: pass. `bash scripts/check-brand.sh`: pass.

## What changed

- Logo: the Möbius ring from `apps/web/src/assets/hume-logo.svg`, which is a 1.5 MB Canva export that draws one embedded raster through a mask. It was rasterised once (Playwright, transparent background), trimmed to the ring and saved as `assets/hume-mark.png` (360 x 192, 61 KB), plus a 192 px `app/icon.png` and a 180 px `app/apple-icon.png` on the charcoal ground. `Logo.tsx` is sized by height. The social image draws it at 216 x 115; the PNL share image puts it on a charcoal tile, because the ring is pale and the card is ivory. The SVG stays in `assets/` as the master.
- Candles: the price chart opens on candles when `NEXT_PUBLIC_API_URL` is set and on the line when it is not (`defaultChartMode`, tested). New chart-only tokens `--color-candle-up` `#00E676` (11.05:1 on surface) and `--color-candle-down` `#FF3B4E` (5.26:1); body, wick and border use them, volume bars at 0.6 alpha. `--color-up` and `--color-down` are unchanged. `ship5-candles-before-after.png` compares old and new on the same synthetic series with the same lightweight-charts options.
- Footer: the menu links are gone. One thin line is left: logo, tagline, CA badge on the left; Features, Docs, network and X on the right.
- Type: Space Grotesk (500, 600, 700) replaces Tomorrow as `--font-display`. Hero, section titles, docs titles, page titles (`PageHeader`) and the big figures are bold or semibold with tight tracking. Body stays Geist, addresses stay Geist Mono.
- `docs/UI_CONTRACT.md`: rule 1 (fonts, chart tokens), rule 9 (footer), Section 4 (chart tokens). `palette.md` has the candle contrast rows.

## Screenshots

- `ship5-candles-before-after.png`, `ship5-landing-{1440,1100,375}.png`, `ship5-features-{1440,375}.png`, `ship5-markets-1440.png`, `ship5-footer-1440.png`, `ship5-docs-1440.png`, `ship5-lending-1440.png`.
- The hero title stays inside the viewport at 1440, 1100 and 375 px (right edge 806, 778 and 361 px) with no horizontal scroll.

## Not verified

- The candle chart inside the real terminal: it needs an RPC with a listed market and the API, which this machine does not have. The before and after image uses the same series, colours and options in a standalone page instead.
- Whether Space Grotesk's figures align in dense columns: the big figures use it, tables stay Geist.
- The docs, lending and markets shots were captured but only the markets footer, the landing hero and the features top were looked at.
