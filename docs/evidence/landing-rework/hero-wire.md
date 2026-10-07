# Landing hero: wireframe band (2026-10-07)

The START station's voxel Möbius band is replaced by a hairline wireframe band after
`UI_REFERENCES/hume-3d-illustration.jpeg`. It is drawn in three layers: a faint fill, the wire grid, and
dust that drifts along the skin. The reference's black background is not used, so the band takes the theme
tone. No copy, layout or other station changed.

- Screenshots: `hero-wire-{1440,375}-{light,dark}.png`, `hero-wire-1440-light-reduced-motion.png`.
- Trace, full scroll at 1440 px, headed Chrome on the GPU, production build (`docs/evidence/ui-rework/s4/trace.mjs`):
  59.8 / 59.9 fps on two runs, p95 16.7 ms, no long task, CLS 0. The baseline is 59.8 fps. The raw summary is in
  `hero-wire-trace-summary.json`.
- Idle at START: 60.0 fps.
- Reduced motion: `StaticScene` renders and no canvas mounts.
- Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `check-hex.sh` and `check-brand.sh` all pass.
- Open: at 375 px the copy panel overlaps the bottom edge of the band. This is the existing layout and was
  not changed.
