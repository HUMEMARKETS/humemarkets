# Ship 7: wider landing frame, brand header, X account, token "Coming Soon"

Date: 2026-10-06.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (93 web tests, 16 of 16 tasks).
- `pnpm build` in `apps/web`: pass.
- `bash scripts/check-hex.sh`: pass. `bash scripts/check-brand.sh`: pass.

## Measured in a browser (Playwright)

| Viewport | Left gutter | Header height | Horizontal scroll |
| --- | --- | --- | --- |
| 1280 | 54 px | 96 px | none |
| 1440 | 60 px | 96 px | none |
| 1920 | 81 px | 96 px | none |
| 375 | 14 px | 96 px | none |

(At 2560 the gutter is 112 px after the cap was raised to 2560 px; the first 2560 shot was taken with the 2400 px cap.)
- X links point to `https://x.com/HUMEMARKETS`; the rail text reads `@HUMEMARKETS`; `<meta name="twitter:site">` is `@HUMEMARKETS`.
- The CA badge reads "Coming Soon" in the header, and twice on `/docs` (the badge and its footer copy).
- Screenshots: `ship7-landing-{1280,1440,1920,2560,375}.png`.

## What changed

- `LANDING_FRAME` (`lib/frame.ts`): `px-4 sm:px-6 md:px-[clamp(40px,4.2vw,112px)]`, cap 2560 px. Used by the landing header, the section content, the rail meta row and the bottom rail. `/docs` keeps `PAGE_FRAME` (1600 px). Landing header is 96 px (Zupiter's 97 px); app pages keep 80 px. The headline scales up to 9.5 rem.
- `Logo`: the ring mark at 38.5 px with the name "Hume" in Space Grotesk bold beside it, on every page; `size="sm"` in the footer and the PNL pages. The social image and the PNL share image say "Hume" in bold.
- X: `X_URL`, new `X_HANDLE`, rail text, and `twitter.site` / `twitter.creator` metadata.
- Token: `pickProtocolToken` (`lib/protocolToken.ts`, tested) returns none unless `NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true`, so every CA badge reads "Coming Soon" regardless of the recorded mainnet entry (`0xaf9eb327…`, symbol "ALPHA", left untouched in `packages/config`). The docs sentence now says the token has not launched.
- `docs/UI_CONTRACT.md` rule 9 notes the landing frame exception.

## Note

- Tailwind in this project counts spacing in 3.5 px units (`--spacing: 0.21875rem`), so `h-24` is 84 px, not 96 px. The header uses `h-[96px]`. The earlier ring logo sizes (`h-7`, `h-10`) were 24.5 and 35 px; the header mark is now `h-11` (38.5 px).
- The named `md:` breakpoint is used for the gutter: `min-[900px]:` was emitted before `sm:` in the stylesheet and lost.
- To show a token address at launch: set `NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true` and `NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS` (or record the address in `packages/config`).
