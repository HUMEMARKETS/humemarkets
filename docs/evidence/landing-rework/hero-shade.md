# Landing hero: band shading (2026-10-07)

The wireframe band (`wireSurface` in `apps/web/src/components/landing/kit.ts`) is drawn in four passes:

1. A depth-only body with polygon offset, so the far side's grid is hidden.
2. A glow just outside the silhouette: an inverted hull, back faces only, pushed out along the normals.
3. A faint body in the muted tone, rising to the text tone at the rim.
4. Hairline grid lines, lit from the top left in view space (`0.35 + 0.65 · max(n·L, 0)`), with a Blinn-Phong streak.

All four passes are transparent, at render order 10 to 13, so the depth body hides only the band's own
later passes. Rings, labels, dust and other stations are not cut out. The tuning values live at the call site
in `scenes.ts`. There is no post-processing, no new dependency and no new tone. No ghost back-line pass was
needed, because the band does not read as thin.

- Screenshots: `hero-shade-{1440,375}-{light,dark}.png`. Comparison with the reference:
  `hero-shade-vs-reference.png` (reference, then the dark band and the light band at 2×).
- Trace, headed Chrome on the GPU, production build, 1440 px:
  - The unchanged `docs/evidence/ui-rework/s4/trace.mjs`: 60.1 fps, p95 16.7 ms, no long task, CLS 0. Since the
    one-scroll change, its 70 ms wheel train counts as one gesture, so it reaches section 1 only.
  - A copy that sends one notch per section across the whole page, run twice: 60.1 / 60.1 fps, p95 16.7 ms,
    no frame over 20 ms, no long task, CLS 0.
- Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `check-hex.sh` and `check-brand.sh` all pass.

Still different from the reference:

- The reference's crease is a crisp bright line that spirals over the top of the band. Here the twist shows
  as a pinch on the right with no continuous crease line. That comes from the shape (`mobiusTube` is an
  elliptical cross-section), not from the shading.
- The reference's contour is a thin, hard white line. Here it is a softer glow about one grid cell wide.
- The reference shows the object alone, on black. Here the rings, dust, market labels and the ground grid
  remain, and the light theme inverts it (dark lines on ivory).
