# UI rework — Session 4 evidence: landing rebuild

Date: 2026-10-06. Plan: `docs/UI_REWORK_PLAN.md`, Session 4. Result: **pass**.

## What changed

| Step | Change | Files |
| --- | --- | --- |
| 1 | The five chapters (beginning, perpetuals, options, vault, move), the 00–04 bottom rail, the hotspots and the "THE HUME LANDSCAPE" caption are gone. `LandingStage` and `LandingCanvas` stay as the frame. The features page was the only other reader of the old chapters, so it now holds its three product modules itself. | `landing/content.ts`, `landing/LandingStage.tsx`, `app/features/page.tsx` |
| 2 | Section rail, after robinid.vercel.app: "Start", then 01 Markets … 06 Vision in spaced caps on the left. A line fills with the scroll and a marker slides between items. The active item gets ink weight plus the marker, not a new colour. `IntersectionObserver` on a line across the middle of the screen picks the active section. A click glides there (or jumps under reduced motion), updates the hash and moves focus to the section heading. At 375 px the rail becomes a strip under the header with the current section, `n / 7` and the same fill. | `landing/LandingRail.tsx` (new), `landing/LandingStage.tsx` |
| 3 | *(Superseded by the solid rework below.)* One world, seven wireframe stations along a Catmull-Rom camera path: Möbius loop mark (open), globe with one tick per registry market, option-value surface whose front edge is the expiry hockey stick, health gauge on a vault, trader network around a leader, one block per contract in the deployment (faint when it has no address), and the loop mark closed inside a tick ring. Colours come from `--color-text`, `--color-muted` and `--color-ground`. A theme change recolours the scene in place, with no remount. | `landing/scenes.ts`, `landing/LandingCanvas.tsx` |
| 4 | Seven section bodies. Hero: wordmark, "Global markets, onchain.", thesis, market search to `/markets?q=`, and the one facts strip. Markets: group tabs from `MARKET_GROUPS` and `marketForSymbol`. Trade: Perpetuals / Options / Strategies tabs, each with a payoff drawn by the SDK's `payoffCurve` and `analyzeStrategy`. Capital: `healthFactorBps` over the pair's limits, or the env example limits, with the lending page's `LtvBar`. Social: top 3 of the leaderboard, plus copy trading and risk metrics marked "In development". Verify: contracts with explorer links, "Verified source", per-market leverage tiers, paused list, the unaudited line and the CA badge (the drawer is `ContractsPanel`). Vision: Launch App and Explore Markets. `/markets` now reads `?q=`. | `landing/sections.tsx` (new), `lib/market.ts` (group labels), `components/MarketsTable.tsx`, `app/markets/page.tsx` |
| 5 | One fixed canvas behind the sections. One rAF loop damps scroll progress (`DAMPING = 0.1` per 60 fps frame, frame-rate independent) and feeds the camera, the rail fill and marker, and the copy reveal (opacity and `translate3d` only). Rail clicks and keyboard moves glide `scrollTop` on the same curve. Arrow keys, PageUp/PageDown, Home and End move between sections. A section taller than the screen is paged through first. DPR is capped at 2, or 1.5 under 768 px, and phones get half the segments. The loop stops when the tab is hidden or motion is off. Reduced motion or "Immersive motion" off shows the per-section `StaticScene`, with no canvas. | `lib/landingScroll.ts` (+ test), `landing/LandingStage.tsx`, `landing/StaticScene.tsx` |
| — | Removed dead code: the `landing-fade` keyframes and the `THEME_ACCENT` constant. | `app/globals.css`, `lib/theme-colors.ts` |

### Deviation from the plan, measured

The plan asks for `scroll-snap-type: y proximity`. Measured in Chrome on this page, proximity snap pulled each 100 px wheel notch back to
the section top, which trapped the wheel (12 notches: `99,99,77,78,78,1,107,78,…` then `0`). Without snap the same notches gave
`0,200,…,1200`. The CSS snap is replaced by a narrow settle on `scrollend`: when a scroll ends within 8% of the screen from a
section top, the page glides there on the camera's curve. `settleTarget` in `lib/landingScroll.ts` has a unit test, and `check.mjs`
has a wheel check. Lenis was not added. Native scroll measured smooth (below).

## Prototype first

As asked, the camera path and rail sync were built and recorded before the sections:
`s4/prototype-rail-click.mp4` and `s4/prototype-contact-sheet.png`, both headless with software WebGL. That pass showed the stations too
large for the copy column, so the stand-off went from 7.4 to 10.5 and the stations moved to 74% of the width.

## Accept checks

Script: `s4/check.mjs` drives headless Chrome over CDP against `next start` (production build), sample mode, no wallet. Output:
`s4/results.txt`, **73 pass, 0 fail**.

| Accept | Proof | Result |
| --- | --- | --- |
| Screenshots at 375 and 1440, both themes | `s4/{start,markets,trade,capital,social,verify,vision}-{1440,375}-{light,dark}.png` (28) | pass |
| No horizontal scroll | `documentElement.scrollWidth <= innerWidth` and the scroller's own width, at every section, both widths, both themes (28 checks) | pass |
| Rail highlights the right section on scroll | scroll to each section; `aria-current` item (1440) or strip label (375) matches, 28 checks | pass |
| Rail highlights the right section on click | clicks Capital, Markets, Vision, Start, Verify: rail item, `scrollTop` = section top, hash and focus on the heading all follow | pass |
| Keyboard | ArrowDown, PageDown, End and Home land on sections 1, 2, 6 and 0 | pass |
| Scenes switch with the theme | Theme toggle, same `<canvas>` node (no remount). Scene region luminance: light `mean 238, min 22` (dark lines on ivory), dark `mean 14, max 228` (light lines on charcoal) | pass |
| Reduced motion shows `StaticScene` | `prefers-reduced-motion: reduce` gives `[data-static-scene]` and no canvas, and a rail click lands within 120 ms (a jump). Screenshot `social-1440-light-reduced-motion.png` | pass |
| Chrome performance trace: 60 fps, no long task > 50 ms, CLS 0 | `s4/trace.mjs`, headed Chrome on the GPU, see below | pass |
| Screen recording: rail click moves camera and content together, no cut | `s4/rail-click-1440.mp4`, headed, GPU, about 60 fps capture. The rail clicks Markets, Trade, Capital, Social, Verify, Vision, Trade, Start | pass |
| Every number traces to the registry or config | table below; `check.mjs` also checks that the facts strip count equals the Markets section count | pass |

### Performance trace summary

`s4/trace-summary.json`. The raw trace is `s4/trace.json.gz`; load it in DevTools > Performance. The run was a full scroll: 70 wheel
notches of 100 px down to Vision (`maxTop 5400 = vision offsetTop`), then 70 back to the top, over 17.0 s.

| Metric | Value |
| --- | --- |
| GPU | ANGLE (Intel, Mesa Intel UHD Graphics (TGL GT2), OpenGL 4.6), an integrated laptop GPU |
| Viewport | 1440 × 900 @ 1x |
| Frames | 1020, mean **59.9 fps** |
| Frame time p50 / p95 / p99 | 16.7 / 16.7 / 16.8 ms. 2 frames over 20 ms |
| Long tasks (PerformanceObserver) | **none** |
| Main-thread tasks over 50 ms in the trace | **none** (7527 tasks, longest 25.5 ms) |
| CLS | **0** (no `LayoutShift` event in the trace) |

To capture it by hand: run `pnpm --filter @hume/web build`, then `next start -p 3417`, then `DISPLAY=:0 node docs/evidence/ui-rework/s4/trace.mjs http://localhost:3417 docs/evidence/ui-rework/s4`.
Or open `/` in Chrome at 1440 × 900, go to DevTools > Performance, press Record, wheel to Vision and back, and press Stop.

### Where every number comes from

| On screen | Source |
| --- | --- |
| Facts: Markets (21) | `usePerpMarkets()`, registry `perps.list({ includePaused: true })` length |
| Facts: Max leverage (10x) | max `maxLeverage` over the same registry list |
| Facts: Contracts verified (20) | `CONTRACTS` with an address, from `@hume/config` deployments plus env overrides |
| "N paused" and per-chip "Paused" | registry `active === false` |
| Market chips and their `Nx` | registry list, `symbolOf(marketId)`, `maxLeverage` |
| Market group tabs | `MARKET_GROUPS` (`@hume/types`), with each market's group from `marketForSymbol(env.chainId, …)` in `@hume/config`. Testnet records no listing, so only "All" shows there |
| Globe ticks | registry market count |
| Contract blocks | `CONTRACTS.length`, faint where the address is missing |
| Health factor, borrow limit, liquidation line | `useCreditMarket()` `maxLtvBps` / `liquidationLtvBps`, else `env.creditExample` (`NEXT_PUBLIC_CREDIT_EXAMPLE_*`), labelled "Example limits" |
| Leaderboard rows | `useLeaderboard('pnl')`, with the sample fallback labelled `SAMPLE DATA` |
| Per-market leverage tiers | registry `maxLeverage`, grouped |
| "All 20 contracts" | `CONTRACTS.length` |
| Payoff drawings | `payoffCurve` / `analyzeStrategy` from `@hume/sdk`. The legs are drawing coordinates, and no figure from them is printed |

### States per data-backed section

| Section | Loading | Error | Sample | Paused |
| --- | --- | --- | --- | --- |
| Hero facts | skeletons | "–" + `REGISTRY_ERROR` + Try again | registry data is real in both modes | "N paused. A paused market still prices and refuses new trades." |
| Markets | chip skeletons | `REGISTRY_ERROR` + Try again | as above | chip reads "Paused" |
| Capital | skeleton while the pair loads | "could not be read … example limits" + Try again | calculator only, nothing on chain | `statusSentence` (paused / reduce only) |
| Social | row skeletons | "could not be read" + Try again | `SAMPLE DATA` badge (no page banner on `/`, per the Decisions) | n/a |
| Verify | limit skeletons | `REGISTRY_ERROR` + Try again | as Markets | "Paused: E2E. …" |

## Solid rework (operator follow-up, same session)

The operator found the wireframe stations too plain and pointed to robinid.vercel.app. Its production bundle
(the `story-canvas` scene) shows how it gets its look, with no post-processing:

- lit `MeshStandardMaterial` solids under an ambient and a directional light;
- instanced voxels (about 3,400 cubes in one draw call) that fly in with a staggered ease-out;
- thin tilted rings and orbiting round particles;
- mono-type label pills drawn on canvas textures;
- stations 17 units apart, with a keyframed camera that holds still for the first and last fifth of each transition and rises in an arc between;
- pointer parallax.

The operator chose full solid, a voxel Möbius mark and all seven stations in one pass. The approved plan is
`~/.claude/plans/alright-still-in-the-silly-locket.md`.

| Change | Files |
| --- | --- |
| Kit: voxel fields (one `InstancedMesh` each, with the assembly), solids, rings, segments that can be updated in place, round particles from a `DataTexture`, and label pills drawn in the `--color-surface`, `--color-line` and `--color-text` tokens and the `--font-mono` font. No colour literal. | `landing/kit.ts` (new) |
| Stations. Start: a voxel Möbius band (about 3,600 cubes on desktop, 1,300 on a phone) that sweeps in around the loop, three rings, 90 particles, and up to 8 registry markets as `SYMBOL · Nx` pills. Markets: a globe of tiles with one pillar per registry market, as tall as its leverage cap, and paused markets short and muted. Trade: an option-value bar field, with the expiry row in the text tone, that breathes. Capital: a vault of stacked block rings under a health gauge whose needle sweeps. Social: a solid leader with icosahedron traders, links that follow the bobbing nodes, and pulses along the follow links. Verify: one block per `CONTRACTS` entry, chained, missing ones smaller, and a scan that lights the deployed blocks in turn. Vision: the mark again inside an instanced tick ring. | `landing/scenes.ts` |
| Camera: RobinID-style keyframes (`cameraAt`) with a dwell and an arc. Ambient light 1.5 and a directional light 2.2 that follows the look point. Pointer parallax (mouse only). DPR caps 1.75 / 1.4. Only stations within 1.05 of the progress are drawn. Each station assembles the first time it is seen. The canvas takes the registry list. A theme change still recolours in place. | `landing/LandingCanvas.tsx`, `landing/LandingStage.tsx` |
| Labels draw on top (`depthTest: false`), so a pill never clips into the band. | `landing/kit.ts` |
| Contract and plan: the motion budget row adds the voxel assembly and the parallax. The "Landing visuals" assumption now names lit solid instanced geometry. | `docs/UI_CONTRACT.md` §8, `docs/UI_REWORK_PLAN.md` Assumptions |
| Check script: after a rail click or key, it waits for the glide to land (3 stable samples, up to 12 s) instead of a fixed sleep. Headless Chrome draws WebGL in software, where frames hit the 50 ms dt cap and a glide lands more slowly. The GPU recording shows the real speed. | `s4/check.mjs` |

Results on the solid build (production, `next start`):

- `s4/check.mjs`: **73 pass, 0 fail**. The 28 screenshots in `s4/` are re-taken. Theme luminance in the scene region: light `mean 219, min 4`, dark `mean 29, max 241`, and the same canvas node.
- `s4/trace.mjs` on the GPU (Intel UHD TGL GT2), full scroll to Vision and back: **59.9 fps** mean, p99 16.8 ms, no long task, longest main-thread task 25.5 ms, **CLS 0**. This covers the assembly of stations 1 to 6, which happens during the scroll.
- `s4/hero-assembly-1440.mp4`: the hero voxels sweeping in on page load, captured headed on the GPU.
- `s4/rail-click-1440.mp4`: re-recorded on the solid world.

### Camera restored (operator follow-up)

The operator preferred the first camera, so the solid rework's camera is reverted. Back:

- the Catmull-Rom path through stations that weave along −z, 13 apart;
- the eye 10.5 back and 2 up, swinging ±0.34 rad between stations;
- a continuous glide with no dwell, no arc, no pointer parallax and no idle bob;
- fog 12–30;
- neighbouring stations blended by `smooth(1 − |d|·0.8)` with the 0.86–1 scale pulse.

Solids cannot fade the way lines did, so each kit item got a `fade()` (material opacity), and stations
expose `setFade`. The camera is closer than in the keyframe version, so each station is scaled down to keep
the on-screen size from the solid rework (`fit` in `buildStations`). Nothing else changed. Results:
`check.mjs` **73 pass, 0 fail**. GPU trace: **59.8 fps**, p99 16.8 ms, longest main-thread task 17.1 ms,
no long task, **CLS 0**, full scroll to Vision. Both recordings were re-taken. The pointer parallax line in
the contract's §8 motion row is removed again.

## End-of-session commands

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test` | pass (16 tasks; web 101 tests, 4 new in `landingScroll.test.ts`) |
| `pnpm build` | pass (12 tasks) |
| `bash scripts/check-brand.sh` | pass |
| `bash scripts/check-hex.sh` | pass |

## Notes

- The evidence folder is about 17 MB: two MP4s (8.6 MB), the raw trace (4.9 MB) and the screenshots. Drop `trace.json.gz` or
  `prototype-rail-click.mp4` before committing if that size is unwanted. The summary and the final recording carry the accept checks.
- In the Markets and Trade tab rows, arrow keys do nothing: the shared `Tabs` has no arrow-key handling, and the page's section keys
  stand aside inside a `tablist`. Tab still moves between the tabs.
- `docs/DEVELOPMENT_PHASES.md` was already modified before this session. This session did not touch it.
