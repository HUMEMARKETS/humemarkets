# Frontend lane — tasks

`apps/web`, `packages/ui`, `packages/sdk`. Agent: `.claude/agents/hume-frontend.md`.

Read [`../UI_CONTRACT.md`](../UI_CONTRACT.md) in full before every phase — it governs every change.
Read [`../LANES.md`](../LANES.md) for the wave order and the phase line anchors. This file is the lane's
slice, not a copy of the phases.

| Phase | Lines     | Wave | Your slice                            | Depends on                   |
| ----- | --------- | ---- | ------------------------------------- | ---------------------------- |
| 6     | 787–853   | 1    | all of it                             | Phase 5's API                |
| 7     | 854–931   | 2    | all of it                             | Phase 6 — the real price API |
| 9     | 1008–1084 | 2    | the `/lending` page                   | contracts lane's P9 handoff  |
| 10    | 1085–1160 | 2    | steps 5–7: page, card, OG route       | backend lane's P10 shapes    |
| 8     | 932–1007  | 2b   | all of it                             | Phase 7                      |
| 12    | 1253–1320 | 3    | all of it                             | reads `Errors.sol`, no edit  |
| 13    | 1321–1382 | 3    | all of it                             | nothing                      |
| 14    | 1383–1463 | 4    | all of it — entry point only, flag off | Phase 10                    |

This lane carries four of the five hard UI gates. The previous platform failed on its interface, not on
its contracts. A market nobody can use is a market that did not ship.

## Standing rules, every phase

- Reuse `packages/ui` before writing a component: `Button`, `Panel`, `Stat`, `Num`, `Tabs`, `Segmented`,
  `TextField`, `Skeleton`, `cn`, `interaction`.
- Seven states per screen. No exceptions, and `paused market` is one of them.
- `bash scripts/check-hex.sh` fails on an off-palette hex. There is no red in the palette, so up and
  down are derived from it.
- Screenshots at 375 px and 1440 px in the evidence file, or the phase is `amber` at best.

## Phase 7 — sample mode (wave 2, parallel with P9 and P10)

The product without a wallet, and a hard gate. `SAMPLE DATA` is persistent on every balance and
position surface, plus the header chip and the page title. Not dismissable. A user must never believe
they hold a position.

## Phase 10 — leaderboard page and PNL card (wave 2)

Yours: steps 5–7. The page, the PNL card component in `packages/ui`, and the shareable image through a
Next OG route reusing `apps/web/src/app/opengraph-image.tsx`.

**The card inverts to ivory** — `UI_CONTRACT.md` Section 4, the one light surface in the product. Check
contrast there specifically: ivory on sage fails AA.

Build against the response shapes the backend lane publishes in `docs/evidence/phase-10.md` at the
start of the wave, not against a deployed route. Keep the fixture in the repo as the page's sample-mode
and loading-state data — it is useful after integration, not scaffolding to delete.

## Phase 9 — the `/lending` page (wave 2)

One page. The health factor must be readable by someone who has never used a lending market: say what
it means and what happens if it falls, not just a number.

Take the view signature, the scaling and the liquidation threshold from the contracts lane's handoff
block in `docs/evidence/phase-9.md`. Do not guess the scaling — a health factor rendered at the wrong
magnitude reads as safe when it is not.

If the pair ships paused (the USDG degradation path), the page still renders and still prices. It
refuses actions with a sentence.

## Phase 12 — plain-language states (wave 3)

Map every custom error in `packages/contracts/src/interfaces/Errors.sol` to one plain sentence plus one
next action. **Read that file; never edit it** — it belongs to the contracts lane. Unmapped errors fall
back to a generic sentence plus the error name: never a raw hex string, never the wallet's own wording.

Handle user-rejected-signature explicitly. It is the most common "failure" and it is not an error.

## Phase 13 — mobile and keyboard (wave 3)

Parallel with Phase 12 and both are yours, so run them in one worktree in sequence rather than two
worktrees racing on the same files.

## Phase 14 — copy trading entry only (wave 4)

The entry point is explicitly unavailable, the flag is off, and no endpoints exist. A user must not read
it as working, and no Phase 15 clip shows it.
