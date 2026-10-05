# Ship 2: landing declutter, accessibility, mobile, canvas performance

Date: 2026-10-06. Plan: workstreams A, G, D and the bug and performance part of E.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (16 of 16 tasks).
- `pnpm build` in `apps/web`: pass.
- `bash scripts/check-hex.sh`: pass. `bash scripts/check-brand.sh`: pass.

## Verified in a browser (Playwright, software WebGL)

- Keyboard: Tab order is skip link, header, scroller region, hero CTAs, motion toggle, rail. No stop lands on an invisible section control and none on the closed contracts drawer (it is now `inert`).
- Reduced motion: a frame taken before and after a pointer move is byte-identical, and `scroll-smooth` is off.
- WebGL disabled: the page shows `StaticScene` (rings and a green wash) and the same text.
- Screenshots: `ship2-landing-{1440,375}-0{0..4}.png` (all five sections), `ship2-reduced-motion-1440.png`, `ship2-fallback-1440.png`.

## Changes

- Declutter: the ticker is not rendered on `/`. The header on `/` loses the "A different kind of market" label and the duplicate "Open app" chip, and the wallet button is secondary there. The vertical "Drag or move to explore perspective" label, "Scroll to travel" and "Independent by design" are removed. The hero primary button gets the accent glow.
- Rename: `font-serif` is now `font-display` (it renders Tomorrow, a sans).
- Accessibility: inactive sections are `inert`; the scroller is a labelled, focusable region; the canvas hotspots are `aria-hidden` and out of the tab order (the tabs stay the accessible control); 9 and 10 px labels are 11 px; `main` no longer scrolls on `/`, so there is one scroller.
- Mobile: the scene sits in the top third, text is anchored to the bottom over a solid scrim, canvas opacity is 70 % (was 40 %), the rail shows the active section's name.
- Canvas: the `const motion = 1` bug is fixed (idle amplitude, pointer tilt and drag coasting now follow the motion state); the render loop stops while the tab is hidden or the canvas is off screen; with motion off a frame is drawn only when something changed; device pixel ratio is capped at 1.5 under 768 px; a WebGL failure shows `StaticScene` instead of nothing.
- `docs/UI_CONTRACT.md` Section 8 motion table updated to match.

## Deviations from the plan

- The hero keeps its own button class strings instead of `@hume/ui` `Button`: the landing CTAs are links, and `Button` renders a `<button>`. The strings now share the accent glow token.
- The landing footer moves to Ship 3 with the trust strip, because a footer inside the snap scroller needs the layout that strip introduces.
- 3D scene colours are still ivory. Tinting them is Ship 4.

## Tooling note

Chrome `--headless --screenshot` captures a blank WebGL canvas on this machine, even with the old canvas code. Use the Playwright script approach for any later screenshot of `/`.
