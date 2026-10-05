# Ship 1: signal-green palette and full-screen layout contract

Date: 2026-10-06. Plan: workstreams 0 and H.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (16 of 16 tasks, 85 web tests).
- `bash scripts/check-hex.sh`: pass.
- `bash scripts/check-brand.sh`: pass.
- `pnpm build`: not run in this ship.
- Contrast table: `palette.md`.

## Screenshots

- `layout-<page>-{1440x900,1920x1080,375x812}.png` for markets, portfolio, lending, leaderboard, strategies.
- `palette-landing-{1440x900,375x812}.png` for the landing page.
- Captured from the dev server without `NEXT_PUBLIC_RPC_URL`, so the pages show their error state. The red banner is that missing variable, not a layout fault.

## Not done in this ship

- `/docs` still uses the 1600px `PAGE_FRAME` and 68ch prose, so the right half of its content column is empty on wide screens.
- Landing 3D scene colours are still ivory. Scene tint is Ship 2 and Ship 4.
- Perpetuals and options terminals were not changed.
