# Hume — UI Contract

**The rules every interface change obeys.** Phase 3 of `DEVELOPMENT_PHASES.md` delivers this file; it
exists early because Phases 7, 8, 11, 12 and 13 all execute against it. A change that breaks a rule here
is wrong even if it looks better.

Companion files: [`DEVELOPMENT_PHASES.md`](DEVELOPMENT_PHASES.md) is the work sequence,
[`REFERENCE.md`](REFERENCE.md) holds the measured facts, and [`LAUNCH_MODEL.md`](LAUNCH_MODEL.md) holds
the scope decisions.

**Still owed by Phase 3:** the page-by-state grid for all 8 pages (the Phase 12 and 13 backlog), the
Guided/Pro field split per trading surface, and the recomputed contrast table once `globals.css` carries
the final values.

---

## 1. The problem being solved

The stated reason users did not adopt the previous platform is the interface. Taken seriously that points
at a path, not a palette — and `REFERENCE.md` Section 1 shows the palette is already done. The gaps as they stand:

| Gap                                                          | What a stranger experiences                               | Phase |
| ------------------------------------------------------------ | --------------------------------------------------------- | ----- |
| Nothing works without a connected wallet                     | A wall before any value is visible. The largest drop-off  | 7     |
| `OrderPanel` and `TradeSheet` submit straight to a signature | A wallet popup they cannot evaluate, so they cancel       | 8     |
| Contract reverts surface as raw errors                       | "It broke and I don't know why." They do not retry        | 12    |
| Pages with no data render empty                              | "It's broken" or "nothing here for me"                    | 12    |
| Mobile and keyboard paths unverified                         | A first visit on a phone bounces before the product loads | 13    |

None of these has anything to do with whether the markets are good.

## 2. Reference: zupiter.tech

Zupiter runs on the same chain, which makes it an unusually fair reference.

| Zupiter trait                                                                                                                                       | Adopt?                                                              | Why                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Sample account: "Explore the complete workflow with an isolated sample account. No extension opens, no signatures are requested and no funds move." | **Adopt — the headline borrow**                                     | Removes the wallet wall. Phase 7                                                                                            |
| Persistent `SAMPLE DATA` labels                                                                                                                     | **Adopt**                                                           | Makes the sample safe. Without it the pattern is a liability                                                                |
| Step-wise flow with `Back` / `Continue`, then a review before authorising                                                                           | **Adopt as the default, not the only, flow**                        | A review turns a signature from a gamble into a decision. A perp trader still needs the dense panel, so Pro stays. Phase 8  |
| Itemised breakdown before confirm: minimum received, price impact, venue fee                                                                        | **Adopt, translated**                                               | The derivatives equivalents: liquidation price, margin required, funding, fees, max loss. Phase 8                           |
| Recovery-before-deposit ordering                                                                                                                    | **Adopt the ordering idea**                                         | Hume's version: deposit and caps explained before the first approval                                                        |
| Dark, high-contrast, **no vivid accent**                                                                                                            | **Adopt — and the new palette fits it better than the old one did** | Charcoal and ivory are higher contrast than the outgoing teal, and sage is a quiet accent rather than a loud one. Section 4 |
| Large display type, numbered `01`–`04` sections                                                                                                     | Landing page only, Phase 18                                         | Marketing surface, not a drop-off                                                                                           |
| Heavy motion: "DRAG OR MOVE TO EXPLORE PERSPECTIVE"                                                                                                 | **Reject for the app**                                              | A trading terminal must be fast and still                                                                                   |
| Chain switcher with isolated sample balances per environment                                                                                        | **Adopt**                                                           | Both chains are already in `packages/config`. Phase 7                                                                       |

## 3. The UI contract

Written in `DEVELOPMENT_PHASES.md` Phase 3, enforced by every later phase. Rules, not aspirations:

1. **The Section 4 palette is the only palette.** Four brand colours plus the derived tokens there,
   all living in `globals.css`. No new colours, radii or fonts. A raw hex literal in `apps/web/src` or
   `packages/ui/src` fails CI.
2. **Seven states per screen: loading, empty, error, success, paused, not-connected, sample.** A screen
   missing one is unfinished.
3. **No money-moving action reaches a signature without a review step** showing cost and downside.
4. **Every failure says what happened in plain words and what to do next.** No raw revert strings.
5. **Numbers use `Num`** from `packages/ui`, so decimals, units and signs stay consistent.
6. **Guided is the default, Pro is a toggle,** remembered per device. Guided never hides what Pro shows;
   it sequences it.
7. **Works at 375 px** with a 16 px gutter and no horizontal page scroll.
8. **Keyboard reachable, focus always visible.** Do not regress the computed contrast.

## 4. Palette

Decided 2026-10-03. These four brand colours **replace** the outgoing dark-teal set in `globals.css`.
Re-tokenizing is a Phase 3 task.

| Name         | Hex       | Role                                                        |
| ------------ | --------- | ----------------------------------------------------------- |
| **Charcoal** | `#0B0B0B` | Ground. The page behind everything                          |
| **Ivory**    | `#F3F1EA` | Primary text, and the ground of the light surfaces          |
| **Sage**     | `#6B7F6B` | The one accent. Action, selection, focus, the price line    |
| **Stone**    | `#C9C3B8` | Secondary text, labels, borders, the quiet half of the page |

#### Measured contrast, not assumed

Computed from the sRGB relative-luminance formula:

| Pair              | Ratio       | Verdict                                      |
| ----------------- | ----------- | -------------------------------------------- |
| Ivory on Charcoal | **17.42:1** | Body text. Excellent                         |
| Stone on Charcoal | **11.23:1** | Secondary text, labels. Excellent            |
| Sage on Charcoal  | **4.57:1**  | Passes 4.5:1 for normal text, with no margin |
| Charcoal on Stone | **11.23:1** | Light surfaces, the PNL card                 |
| Charcoal on Ivory | **17.42:1** | Light surfaces                               |
| **Ivory on Sage** | **3.81:1**  | **FAILS 4.5:1**                              |
| Charcoal on Sage  | **4.57:1**  | Passes                                       |

**Two findings that are rules, not preferences:**

**1. The primary button takes charcoal ink, never ivory.** Ivory text on a sage fill is 3.81:1 and fails
WCAG AA. Charcoal on sage is 4.57:1 and passes. Every sage-filled control uses `--color-accent-ink:
#0B0B0B`.

**2. The palette contains no red, so price direction needs two derived colours.** A derivatives terminal
cannot work without up and down, and sage cannot be both "the accent" and "up" — one hue carrying two
meanings is how a user misreads a position. Sage therefore stays the accent only, and direction gets its
own pair, drawn from the palette's warm neutral family rather than a generic exchange red:

| Token  | Hex       | On Charcoal | Why                                                                      |
| ------ | --------- | ----------- | ------------------------------------------------------------------------ |
| `up`   | `#93BC92` | 9.23:1      | A lifted, lighter sage. Separated from the accent by brightness, not hue |
| `down` | `#C4705F` | 5.46:1      | Clay. Warm, sits with ivory and stone, never reads as a Binance red      |

#### Derived tokens

Four colours cannot build a dense terminal. These are derived, and nothing beyond this list is allowed:

| Token          | Hex                       | On Charcoal | Role                                   |
| -------------- | ------------------------- | ----------- | -------------------------------------- |
| `ground`       | `#0B0B0B` (Charcoal)      | —           | Page                                   |
| `surface`      | `#141414`                 | 1.07:1      | Panels                                 |
| `raised`       | `#1E1E1D`                 | 1.18:1      | Inputs, hovered rows, menus            |
| `line`         | `#2E2E2C`                 | 1.45:1      | Hairlines, table rules                 |
| `text`         | `#F3F1EA` (Ivory)         | 17.42:1     | Body                                   |
| `muted`        | `#A8A29A` (Stone, dimmed) | 7.78:1      | Labels, column heads                   |
| `faint`        | `#8C8780`                 | 5.52:1      | Timestamps, hints. Still above 4.5:1   |
| `accent`       | `#6B7F6B` (Sage)          | 4.57:1      | Action, selection, focus, price line   |
| `accent-ink`   | `#0B0B0B`                 | —           | Text **on** a sage fill. See finding 1 |
| `accent-hover` | `#7D917D`                 | —           | Hover                                  |
| `accent-press` | `#5A6C5A`                 | —           | Active                                 |
| `up` / `down`  | `#93BC92` / `#C4705F`     | 9.23 / 5.46 | Direction only, never decoration       |

Every token above clears 4.5:1 on `ground`, `surface` and `raised` wherever it carries text. Phase 3
re-runs the arithmetic and records it in `docs/UI_CONTRACT.md`; a later change to any value re-runs it
again rather than assuming.

#### One deliberate use of light

The app is dark: ivory on charcoal. The **PNL card is the exception** — it renders charcoal and sage on
ivory. A shareable card is seen outside the app, usually in a light feed, and the inversion makes it
unmistakably Hume's rather than one more dark screenshot. It is the only light surface at launch.

## 5. How Zupiter's style reaches each Hume surface

Section 2 decides what to borrow. This is where each borrowing lands.

| Hume surface                           | What changes                                                                                                                                                                                                                   | Phase |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Landing `/`                            | Zupiter's progressive reveal: large display type, numbered `01`–`04` sections, one idea per section, motion allowed within the 200 ms budget. The existing `HeroSilkBackground` is retained but re-tinted to charcoal and sage | 18    |
| Header / `AppShell`                    | Zupiter's network selector becomes a three-way environment switcher: Mainnet, Testnet, Sample — each with isolated balances. Plus the `SAMPLE DATA` chip and the unaudited notice                                              | 6, 7  |
| First visit, any page                  | No connect wall. The app opens in Sample. Zupiter's "no extension opens, no signatures are requested and no funds move" is the literal behaviour, not a claim                                                                  | 7     |
| Connect flow                           | Zupiter's considered-connection screen: what a wallet does here, sample balances do not carry over, the caps, the unaudited notice. Shown once, at the moment the user chooses to connect                                      | 7     |
| Perp ticket, option ticket, `/lending` | Zupiter's `Back` / `Continue` / review sequence replaces submit-straight-to-signature. Guided by default, Pro toggle restores today's dense `OrderPanel`                                                                       | 8     |
| The review screen                      | Zupiter's itemised fee table, translated to derivatives: margin required, **liquidation price**, funding, fees, venue cut, the binding cap, and the worst case in one sentence                                                 | 8     |
| Deposit path                           | Zupiter's recovery-before-deposit ordering becomes caps-and-risk-before-first-approval                                                                                                                                         | 8     |
| Tables and charts                      | **Zupiter's motion is rejected here.** Dense data stays still. Direction uses `up` / `down` only; sage marks the price line and the selected row                                                                               | 3     |
| Every failure                          | Zupiter's transparency applied to errors: a plain sentence and a next action, never a raw revert                                                                                                                               | 12    |
| PNL card                               | Inverted to ivory, per Section 4. Charcoal figure, sage frame, one number that dominates                                                                                                                                       | 10    |

**What Hume does not take.** Zupiter is a swap venue; Hume is a derivatives terminal. Zupiter can afford
a scroll-driven, motion-led surface because a swap is one decision. A trader watching funding on five
positions cannot. So the borrowings are the **flow and the honesty** — sample first, review before
signing, itemised costs, labelled simulation — and not the choreography.

---
