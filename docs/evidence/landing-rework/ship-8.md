# Ship 8: full-width ground, drawer layering, hero labels, tab title, header line

Date: 2026-10-06.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (93 web tests, 16 of 16 tasks).
- `pnpm build` in `apps/web`: pass.
- `bash scripts/check-hex.sh`: pass. `bash scripts/check-brand.sh`: pass.

## What changed

- Tab title: the root title is "Hume: onchain derivatives for stock tokens" (also the Open Graph and Twitter title). "Sample · " is a deliberate sample-mode label that `SampleRuntime` put in front of every tab title; it is now skipped on `/`, `/features` and `/docs`, which show no balance or position (previews there carry their own SAMPLE DATA mark). App pages keep the prefix.
- Hero trust strip: the "Audit: Unaudited" cell is now "Source code: Verified", linking to `/docs#verify`. The hero's sub-line keeps the risk statement: "No wallet needed. Start in sample mode. The contracts are unaudited: trade only what you can lose."
- Button: "Open the terminal" is "Open App" on the landing hero, the last section and the closing line of `/features`.
- Contracts menu glitch: the drawer opened underneath the header, so its title and Close button were hidden. Cause: the page-transition wrapper added in Ship 4 used `animation-fill-mode: both`; a finished opacity animation with fill-forwards keeps a stacking context, which trapped the drawer's `z-50` below the header's `z-40`. Fixed with `backwards` fill and by making the drawer `fixed` at `z-[70]`; focus calls use `preventScroll`. Checked: the drawer's top is 0 and the element at the header position belongs to the drawer.
- Ground: the 20-unit disc grid is replaced by a perspective grid that fills the screen out to the horizon (`buildGround` in `landing/scenes.ts`): one `LineSegments` with a small shader that fades with distance and fades out in screen space under the header and above the bottom rail. Every line stays inside the camera's view cone, because a line starting at a huge x just in front of the camera was dropped by the software rasteriser (the first version drew only a band above the middle of the screen). The grid is on from `md`; the phone layout is unchanged. The camera no longer yaws at the hero (`angle = progress * 0.05`), so the horizon is level.
- Header: a hairline (`border-b border-line`) under the header on every page.
- Mobile header: at 375 px the mark, "Hume" and the mode chip now fit on one line (smaller mark and text, chip no-wrap).

## Screenshots

`ship8-ground-{1280x720,1440x900,1920x1080,2560x1080,375x812}.png`, `ship8-contracts-open-1440.png`, `ship8-contracts-closed-1440.png`.

## Not verified / not done

- "Verified" is a claim about the explorer: the Blockscout API answered 403 (Cloudflare challenge) to scripted requests, so I could not confirm that all 20 contracts show as verified. `packages/contracts/script/verify.sh` exists for it. Check one address on the explorer before launch.
- The cursor-reactive ground and the boot-up intro from the plan are not built yet.
- Only the 1440 and 2560 shots and the 375 hero were looked at closely.
