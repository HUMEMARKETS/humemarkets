# Ship 4: immersive navigation and a green scene

Date: 2026-10-06. Plan: workstream F, and the scene rework in workstream E.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (16 of 16 tasks).
- `pnpm build` in `apps/web`: pass.
- `bash scripts/check-hex.sh`: pass (the glow texture is computed into a data texture, so no colour literal). `bash scripts/check-brand.sh`: pass.

## Verified in a browser (Playwright, software WebGL)

- Deep link: opening `/#vault` lands on section 03 and the rail marks it current. Scrolling to a section writes its id to the address (`#vault`); section 00 clears it.
- Contracts drawer: opened from the header link, focus starts inside, 40 Tab presses never leave it, Escape closes it, and focus returns to the link that opened it.
- Route transition: `app/template.tsx` wraps every page in a 0.16 s fade and rise (`.route-in`); reduced motion collapses it with the existing global rule.
- Screenshots: `ship4-hero-1440.png`, `ship4-scene-{1,3}-1440.png`, `ship4-travel-1440.png` (halfway between sections 01 and 02), `ship4-lending-1440.png`.

## What changed

- Scenes: the scene in view is washed green and the part under the pointer goes to the full accent. The floor rings, tick ring and grid are green, with a ring that travels outward from the centre. A soft additive glow sits behind the scene in view. No post-processing pass.
- Camera: it orbits slightly, rises and dollies with the scroll position, so moving between sections reads as travel. All of it is scaled by the motion state and is still when motion is off.
- Perpetuals scene: the middle hotspot sits lower so its label no longer runs into the right-hand one.
- Drawer: `ContractsPanel` traps Tab, closes on Escape and restores focus.
- Anchors: section ids in the address work and are written back.

## Not done

- Smooth scroll-linked travel is driven by the existing snap scroller; there is no scrubbing between two scenes beyond the crossfade and camera move.
- The visual check was one desktop viewport per scene; the green wash was not re-checked at 375 px.
