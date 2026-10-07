# Landing interaction (2026-10-07)

Every station on the landing canvas reacts to the visitor. There is one damped pointer, held in
`LandingCanvas.tsx`. It is set by a passive `pointermove`, registered only for `pointer: fine`, and touch
events are ignored. It is passed to `Station.update` together with the station's fade, so a station the
camera is leaving lets go smoothly. Hit testing runs only on the frame after the pointer moved, at most once
per frame, and only on the active station. The per-frame pointer maths reuses preallocated objects. The copy
and the canvas talk through one zustand store, `apps/web/src/stores/landing.ts`. The canvas reads it once a
frame and writes only on change.

| Station | Reaction | Evidence |
| ------- | -------- | -------- |
| All | The eye moves up to 0.6 / 0.4 world units with the pointer (about 3°) | every shot |
| Start | The band tilts toward the pointer; a `uPointer` ripple lifts and brightens the wire skin under it; the dust drifts to it | `interaction-start.png` |
| Markets | A hovered pillar lifts and shows its market label; the region tabs turn the globe to face that group | `interaction-markets-hover.png` (META · 5x), `interaction-markets-region-{us,etf}.png` |
| Trade | The pointer's x is the price: a 3D post and floor line, and the same price as a line and dot on the payoff drawing | `interaction-trade-{left,right}.png` |
| Capital | The health-factor slider drives the gauge needle, from nothing borrowed at the left to the liquidation limit at the right | `interaction-capital-{low,high}.png` (5.00× and 1.17×) |
| Social | Traders near the pointer move out of its way | `interaction-social-{away,near}.png` |
| Verify | Hovering or focusing a contract row lights its block and holds the scan; hovering a block marks its row | `interaction-verify-{row,block}.png` |
| Vision | The band leans after the pointer; a click sends one pulse round the tick ring | `interaction-vision-pulse.png` |

Checks, on the production build, in headed Chrome on the GPU at 1440 px:

- **Verify:** hovering the Vault row lit row 1; hovering block 1 lit row 1; moving away cleared it (−1).
- **Markets tabs:** after the ETF click, the selected tab was ETF and the globe's pixels differ from the US view.
- **Pointer sweep:** a figure-eight at every station, plus tab clicks, a slider click, row and block hover and a Vision click.
  - Run 1: 60.0 fps, p95 16.7 ms, no long task, CLS 0, INP 64 ms.
  - Run 2: 60.1 fps, p95 16.7 ms, no long task, CLS 0.0389, INP 64 ms.
  - Run 3: 60.1 fps, CLS 0, INP 64 ms.
- **Unchanged `trace.mjs`:** 60.1 fps, no long task, CLS 0.0274 (reaches section 1 only, as before).
- **Full-page trace:** 60.1 fps, no long task, CLS 0.024; on two later runs CLS 0.
- **Reduced motion:** no canvas mounts, so there is no parallax and no ripple. On touch, `hover` stays 0 and
  only the idle motion runs.
- **Gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `check-hex.sh` and `check-brand.sh` all pass.

Open: CLS is not always 0. The recorded shift comes from the Markets section body, which grows by 137 px
when the registry data arrives after the camera has already reached Markets. In these runs it arrived about
12 s after load. The same late-data pattern hits the hero's "N paused" line. Both predate this work. Runs
where the data arrived first read CLS 0. The fix is to reserve the chip list's height while it loads.
