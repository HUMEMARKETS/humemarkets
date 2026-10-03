# Phase 3 — Palette, the UI contract and the state inventory

**Result: pass.** `globals.css` carries only the `UI_CONTRACT.md` Section 4 values, no token was
renamed, the 8 pages render charcoal-and-ivory with a sage accent and no teal anywhere, the new hex
check fails on a planted colour and passes once removed, and the contract now holds the recomputed
contrast table, the 8-by-7 state grid and the Guided/Pro split. Lint and typecheck are 28 of 28.

One change beyond a values-only swap was unavoidable and is called out in Section 3: the brand mark
itself was a teal PNG, so "no stray teal on any page" could not be met without recolouring it.

- Date: 2026-10-04
- Screenshots: `docs/evidence/phase-3/<page>-before.png` and `-after.png`, 8 pages, 1440 px wide,
  captured from `next dev` on chain 46630 with no RPC configured — which is why several pages show
  their error and empty states. Those shots are the source of Section 6 of the contract.

## 1. The palette, values only

Every token **name** is unchanged, so no component was renamed and no class string moved. What changed
is the right-hand side.

| Token            | Was (teal set) | Now (Section 4)  |
| ---------------- | -------------- | ----------------- |
| `--color-ground` | `#0b1211`      | `#0b0b0b`         |
| `--color-surface`| `#121b1a`      | `#141414`         |
| `--color-raised` | `#1a2624`      | `#1e1e1d`         |
| `--color-line`   | `#293937`      | `#2e2e2c`         |
| `--color-text`   | `#eef4f2`      | `#f3f1ea`         |
| `--color-muted`  | `#a4b5b1`      | `#a8a29a`         |
| `--color-faint`  | `#93a4a0`      | `#8c8780`         |
| `--color-accent` | `#3adbd0`      | `#6b7f6b`         |
| `--color-accent-hover` | `#66e8df` | `#7d917d`        |
| `--color-accent-ink`   | `#031a18` | `#0b0b0b`        |
| `--color-accent-soft`  | `#1b4c47` | `#1c221c`        |
| `--color-accent-press` | `#24b3a9` | `#748874`        |
| `--color-accent-line`  | teal at 0.4 | sage at 0.4     |
| `--color-up`     | `#72d977`      | `#93bc92`         |
| `--color-down`   | `#ee7069`      | `#c4705f`         |
| `--color-up-hover` / `--color-up-press`     | `#8be890` / `#5cc262` | `#a6c9a5` / `#7fa87e` |
| `--color-down-hover` / `--color-down-press` | `#f38c86` / `#d95d56` | `#d08575` / `#b46554` |
| `--color-up-soft` / `--color-down-soft`     | 0.2 alpha | 0.12 alpha             |
| `--shadow-up-glow` / `--shadow-down-glow`   | the old green and red | the new up and down |

Three tokens were added, each because a raw literal had nowhere else to go: `--color-up-line`,
`--color-down-line` (the direction twin of the existing `--color-accent-line`) and `--shadow-lift`.

### The arithmetic changed three proposed values

`UI_CONTRACT.md` Section 4 asked Phase 3 to re-run the contrast arithmetic rather than assume it. Doing
so found three values that fail WCAG AA **in their own documented use**. The contract's Section 4.1 now
records all three; the short version:

| Token          | Proposed  | Shipped   | Measurement that forced it                                                          |
| -------------- | --------- | --------- | ------------------------------------------------------------------------------------ |
| `accent-press` | `#5A6C5A` | `#748874` | The primary button fills with it and keeps charcoal ink: **3.49:1**, fails. `#748874` is **5.17:1**. A press now lifts slightly rather than darkening |
| `down-press`   | `#AD5F4F` | `#B46554` | Same shape: charcoal on it was **4.24:1**, now **4.62:1**                            |
| `accent-soft`  | `#273027` | `#1C221C` | The hover fill under accent text                                                     |

And one structural finding that is now a rule in the contract: **sage is 4.57:1 on charcoal, so
sage-coloured text cannot sit on any lighter surface** — 4.28:1 on `surface`, 3.87:1 on `raised`,
3.76:1 on `accent-soft`. No value of `accent-soft` fixes it; even at near-black sage text reaches only
4.13:1. Accent-coloured text on a lifted surface therefore uses `accent-hover` (4.94:1 on `raised`,
4.80:1 on `accent-soft`). Ten files were swept from `hover:text-accent` to `hover:text-accent-hover`
for this, and the same arithmetic set the soft fills to 0.12 alpha and gave the up/down controls their
`*-hover` ink.

The two findings the contract called rules both hold and are enforced: `--color-accent-ink` is charcoal
`#0b0b0b` everywhere a sage fill carries text, and `up` / `down` appear only as direction — the only
non-direction use in the codebase, the two glow shadows, is a halo built from those same two colours on
`TriggerAlerts`, which is a direction signal.

## 2. Where the old palette had leaked

| Place                               | What it held                                                        | Now                                                        |
| ----------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| `--shadow-up-glow` / `-down-glow`   | `rgb(114 217 119)` and `rgb(238 112 105)` — the outgoing green and red | Built from the new `up` and `down`                         |
| `packages/ui/src/Button.tsx`        | The same two colours again, as raw `rgb()` literals inside two Tailwind arbitrary values | `var(--color-up-line)` / `var(--color-down-line)` |
| `HeroSilkBackground.tsx`            | `#3adbd0` and `#0b1211` as canvas fallbacks                         | Reads them from `theme-colors.ts`                           |
| `lib/theme-colors.ts`               | The three teal-era values for browser chrome and the OG image        | The four palette values, plus two RGB triples for the canvas |
| `HeroMarketCarousel.tsx`            | `rgb(0 0 0 / 0.7)` elevation shadow                                 | `var(--shadow-lift)`                                        |
| `opengraph-image.tsx`, `Logo.tsx`   | Comments describing "the teal mark"                                  | Corrected, and the mark itself recoloured — Section 3       |
| `BrandLogos.tsx`                    | Tesla red, NVIDIA green, Robinhood green…                           | **Unchanged**, and allowed by name in the hex check: these are other companies' marks, not Hume's palette |

## 3. The brand mark was teal, and had to be recoloured

The one thing in this phase that is not a values-only change, flagged because it touches a supplied
brand asset.

`apps/web/src/assets/hume-mark.png` is the mark in the header, the footer lockup and the social preview.
Measured: **55,426 of its 77,136 opaque pixels were saturated teal**, around `#14C4BA` — the outgoing
accent. With the palette swapped it was the only teal left, on all 8 pages and on every shared link, so
the acceptance condition "no stray teal on any page" could not be met while it stood.

It is now **ivory**: each pixel keeps its own alpha and its relative luminance, and the hue is replaced
by `#F3F1EA`. The shading and the shape are untouched; the file measures 0 saturated pixels afterwards.

Ivory rather than sage, because the contract reserves sage: "Action, selection, focus, the price line."
A logo is none of those, and spending the one accent on a mark that sits on every screen would make the
accent ambient rather than meaningful.

**This is reversible and it is your call.** The original teal mark is in git history (`fc76118`). If you
would rather the mark carry sage, or rather keep the teal mark as a deliberate exception, say so and it
is one command either way. `apps/web/src/assets/hume-logo.svg` — the landing page's larger lockup —
needed nothing: its embedded image has zero saturated pixels and was already monochrome.

## 4. The hex check

`scripts/check-hex.sh`, wired into `.github/workflows/ci.yml` as **Palette check** (after Brand check)
and into `package.json` as `pnpm check:hex`. It enforces UI contract rule 1 over `apps/web/src` and
`packages/ui/src`, catching hex literals **and** raw `rgb()` / `rgba()` / `hsl()` / `hsla()` values,
tracked files and untracked alike.

Three allowances, each named in the script with its reason: `globals.css` (where the palette is
defined), `lib/theme-colors.ts` (the values that render outside Tailwind's reach), and `BrandLogos.tsx`
(third-party marks).

Probed in both directions, each probe created, run, then deleted:

| Probe                                                       | Exit |
| ------------------------------------------------------------ | ---- |
| Clean tree                                                  | 0    |
| Planted `const PLANTED = "#ff0000";` in `apps/web/src/lib`  | 1    |
| Planted `rgb(12 34 56)` in `packages/ui/src`                | 1    |
| After removing both                                         | 0    |

It also found one real literal on its first run: the `rgb(0 0 0 / 0.7)` elevation shadow in
`HeroMarketCarousel.tsx`, now `--shadow-lift`.

## 5. Screenshots, 8 pages before and after

All at 1440 px, same route, same server, only the palette between them.

| Page          | Before                                   | After                                   |
| ------------- | ----------------------------------------- | ---------------------------------------- |
| `/`           | `phase-3/landing-before.png`             | `phase-3/landing-after.png`             |
| `/markets`    | `phase-3/markets-before.png`             | `phase-3/markets-after.png`             |
| `/perpetuals` | `phase-3/perpetuals-before.png`          | `phase-3/perpetuals-after.png`          |
| `/options`    | `phase-3/options-before.png`             | `phase-3/options-after.png`             |
| `/strategies` | `phase-3/strategies-before.png`          | `phase-3/strategies-after.png`          |
| `/portfolio`  | `phase-3/portfolio-before.png`           | `phase-3/portfolio-after.png`           |
| `/activity`   | `phase-3/activity-before.png`            | `phase-3/activity-after.png`            |
| `/docs`       | `phase-3/docs-before.png`                | `phase-3/docs-after.png`                |

What the pairs show: the teal nav, the teal primary button and the teal mark become sage and ivory on
charcoal; the error line moves from the old red to the clay `down`; the hero's silk canvas re-tints from
teal to sage. No layout moved, which is the point of a values-only swap.

The shots were taken with no `NEXT_PUBLIC_RPC_URL`, so most pages render their error or empty state.
That was useful rather than a limitation: those are the states Section 6 of the contract grades, and the
grid is written from them.

## 6. What the contract now carries

`docs/UI_CONTRACT.md` grew from 159 to 313 lines:

- **Section 4** — the derived token table, now with each token's ratio on `ground`, `surface` **and**
  `raised`, not just one column.
- **Section 4.1** (new) — what the arithmetic changed, the sage ceiling and the rule it forces, the soft
  fill alphas, and ink-on-every-fill measured both ways.
- **Section 6** (new) — the 8-pages-by-7-states grid, with a pass / partial / missing mark per cell and
  a count of what it found. **This is the Phase 12 and 13 backlog.**
- **Section 7** (new) — the Guided/Pro field split for the perp ticket, the option ticket and lending,
  with the test used to place each field: *can a first-time user make a wrong-sized, wrong-direction or
  liquidatable trade without it?*
- **Section 8** (new) — the motion budget: 200 ms in the app, none in dense data, motion allowed on the
  landing page.

### The grid's headline, and one gap the plan does not own

`sample` is missing on all 8 pages, which is expected — Phase 7 builds it, and this grid is its
acceptance surface. The finding worth raising:

**`paused` is missing on 5 of the 6 pages where it applies.** Only `/markets` marks a paused market,
with a chip per row. The perp ticket and the option chain will let a user size a trade on a paused
market and only find out at the signature. Phase 12 and 13 do not own this, and it is a real-money
failure rather than a cosmetic one. The cheapest home is Phase 6, which already touches every trading
surface for mainnet.

## 7. Acceptance

| Condition                                                     | Result                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `globals.css` carries only the new values                      | **pass** — every token re-valued, no token renamed                      |
| No stray teal on any page                                      | **pass** — after recolouring the mark (Section 3); 0 saturated pixels, 0 teal literals |
| The hex check fails on a planted colour and passes once removed | **pass** — both directions probed, plus an `rgb()` probe                |
| The grid and the Guided/Pro split are written                  | **pass** — contract Sections 6 and 7                                     |
| Before-and-after screenshots of all 8 pages                    | **pass** — 16 files in `docs/evidence/phase-3/`                         |

Supporting gates:

```
$ bash scripts/check-brand.sh    Brand check passed.
$ bash scripts/check-hex.sh      Hex check passed.
$ pnpm turbo run lint typecheck  Tasks: 28 successful, 28 total
```

**Cost of this phase: $0.**
