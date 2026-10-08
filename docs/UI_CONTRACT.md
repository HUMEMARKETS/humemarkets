# Hume — UI Contract

**The rules every interface change obeys.** Phase 3 of `DEVELOPMENT_PHASES.md` delivers this file; it
exists early because Phases 7, 8, 11, 12 and 13 all execute against it. A change that breaks a rule here
is wrong even if it looks better.

Companion files: [`DEVELOPMENT_PHASES.md`](DEVELOPMENT_PHASES.md) is the work sequence,
[`REFERENCE.md`](REFERENCE.md) holds the measured facts, and [`LAUNCH_MODEL.md`](LAUNCH_MODEL.md) holds
the scope decisions.

**Completed by Phase 3 on 2026-10-04:** `globals.css` carries the Section 4 values, the contrast table
in Section 4 is recomputed from them, Section 6 holds the page-by-state grid for all 8 pages (the Phase
12 and 13 backlog), Section 7 holds the Guided/Pro field split per trading surface, and Section 8 sets
the motion budget. Rule 1 is enforced by `scripts/check-hex.sh` in CI.

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
| High-contrast, one accent (amended 2026-10-06, UI rework: monochrome, light default plus dark)                                                       | **Adopt — monochrome ivory and charcoal, light and dark themes**    | Charcoal on ivory is 17.42:1 both ways; the only hues left on the page are direction. Section 4 |
| Large display type, numbered `01`–`04` sections                                                                                                     | Landing page only, Phase 18                                         | Marketing surface, not a drop-off                                                                                           |
| Heavy motion: "DRAG OR MOVE TO EXPLORE PERSPECTIVE"                                                                                                 | **Reject for the app**                                              | A trading terminal must be fast and still                                                                                   |
| Chain switcher with isolated sample balances per environment                                                                                        | **Adopt**                                                           | Both chains are already in `packages/config`. Phase 7                                                                       |

## 3. The UI contract

Written in `DEVELOPMENT_PHASES.md` Phase 3, enforced by every later phase. Rules, not aspirations:

1. **The Section 4 palette is the only palette.** Four brand colours plus the derived tokens there,
   all living in `globals.css`. No new colours, radii or fonts. A raw hex literal in `apps/web/src` or
   `packages/ui/src` fails CI. The type is Inter (body, tables, forms), Playfair Display (display: hero,
   page and section titles, big figures; weights 600 to 700, short phrases) and Geist Mono (addresses
   and verifiable data); amended 2026-10-06 (UI rework), replacing Geist and Space Grotesk. The one other exception is the pair of chart-only candle colours in Section 4.
2. **Seven states per screen: loading, empty, error, success, paused, not-connected, sample.** A screen
   missing one is unfinished.
3. **No money-moving action reaches a signature without a review step** showing cost and downside.
4. **Every failure says what happened in plain words and what to do next.** No raw revert strings.
5. **Numbers use `Num`** from `packages/ui`, so decimals, units and signs stay consistent.
6. **Guided is the default, Pro is a toggle,** remembered per device. Guided never hides what Pro shows;
   it sequences it.
7. **Works at 375 px** with a 16 px gutter and no horizontal page scroll.
9. **Layout (amended 2026-10-06).** The shell is `h-dvh` with one scroll region. Every page that is not a
   terminal uses `AppPage`: full width (capped at 1920 px), the shared `APP_GUTTER` (16 / 24 / 40 px) that
   the header also uses, a body that grows to fill the space under the title, and a thin footer line (brand, tagline, network, Features, Docs, X; not a menu) pinned to the
   bottom. Terminals (`/perpetuals`, `/options`) fill the scroll region at `lg` and above. Panels stretch
   to the bottom of the screen. An empty, loading, error or not-connected state fills its panel with one
   sentence and one next step (`PanelState`), never a one-line strip at the top of a blank box. A width
   cap applies to prose only, inside a full-width page.
   The landing page is the one exception to the page gutter: it uses `LANDING_FRAME` (about 91% of the
   viewport, a fluid gutter of 40 to 112 px from 768 px up, cap 2560 px) and a 96 px header, after
   zupiter.tech, so the scene and the headline get the whole screen. `/docs` keeps its 1600 px reading
   column.
8. **Keyboard reachable, focus always visible.** Do not regress the computed contrast.

## 4. Palette

Decided 2026-10-03 (charcoal, ivory, sage, stone). Amended 2026-10-06 to a signal-green accent on a
green-black ground. **Amended again 2026-10-06 (UI rework, `docs/UI_REWORK_PLAN.md`):** the palette is
monochrome ivory and charcoal, with two themes. **Light is the default** (charcoal on ivory), and **dark
is its inverse** (ivory on charcoal). Charcoal is the accent in light and ivory is the accent in dark;
there is no green brand accent. Green and red survive only as direction (`up`, `down`) and candles. The
green-black tint and signal green are retired. Reason: the operator chose an editorial, monochrome look,
and a bright green fails on ivory (1.56:1). Token names are unchanged, so no component is renamed; a
theme is a set of values for the same names, switched by `data-theme` on `<html>`. The full measured
table is `docs/evidence/ui-rework/palette.md`.

| Name         | Hex       | Role                                                                     |
| ------------ | --------- | ------------------------------------------------------------------------ |
| **Ivory**    | `#F3F1EA` | Light ground; dark-theme text and accent; the PNL card in both themes     |
| **Charcoal** | `#0B0B0B` | Light-theme text and accent; dark ground                                 |
| **Stone**    | `#A8A29A` | Dark-theme secondary text. Its light twin is `#57534C`                    |

#### Measured contrast, not assumed

| Pair                  | Ratio       | Verdict                                   |
| --------------------- | ----------- | ----------------------------------------- |
| Charcoal on Ivory     | **17.42:1** | Body text, light theme. The accent's ink in dark |
| Ivory on Charcoal     | **17.42:1** | Body text, dark theme. The accent's ink in light |

**Three findings that are rules, not preferences:**

**1. The accent's ink is always the ground of its theme.** `--color-accent-ink` is ivory in light and
charcoal in dark (17.42:1 either way).

**2. Direction never shares the accent's job.** The accent means "you can act here". `up` and `down` are
the only hues on the page and mean direction only. Colour alone never carries direction: a price, PNL
or change always shows a `+` / `-` sign or a ▲ / ▼ as well.

**3. The PNL card is ivory in both themes.** It is the shareable surface and matches its share image, so
it uses fixed tokens (`ivory`, `charcoal`, `card-accent`, `card-loss`) that do not switch with the theme.

#### Derived tokens

Nothing beyond this list is allowed. Ratios are on `ground` / `surface` / `raised`.

| Token          | Light       | Dark        | Light ratios        | Dark ratios         | Role                                    |
| -------------- | ----------- | ----------- | ------------------- | ------------------- | --------------------------------------- |
| `ground`       | `#F3F1EA`   | `#0B0B0B`   | —                   | —                   | Page                                    |
| `surface`      | `#ECE9E1`   | `#141414`   | 1.07 on ground      | 1.07 on ground      | Panels                                  |
| `raised`       | `#E3DFD5`   | `#1C1C1B`   | 1.18 on ground      | 1.15 on ground      | Inputs, hovered rows, menus             |
| `line`         | `#CFC9BC`   | `#2E2D2B`   | 1.46 on ground      | 1.43 on ground      | Hairlines, table rules                  |
| `text`         | `#0B0B0B`   | `#F3F1EA`   | 17.42 / 16.22 / 14.79 | 17.42 / 16.30 / 15.09 | Body                              |
| `muted`        | `#57534C`   | `#A8A29A`   | 6.76 / 6.30 / 5.75  | 7.78 / 7.28 / 6.74  | Labels, column heads                    |
| `faint`        | `#625D56`   | `#8C8780`   | 5.77 / 5.38 / 4.90  | 5.52 / 5.17 / 4.79  | Timestamps, hints                       |
| `accent`       | `#0B0B0B`   | `#F3F1EA`   | 17.42 / 16.22 / 14.79 | 17.42 / 16.30 / 15.09 | Action, selection, focus, price line |
| `accent-ink`   | `#F3F1EA`   | `#0B0B0B`   | —                   | —                   | Text on an accent fill. Finding 1       |
| `accent-hover` | `#2B2A28`   | `#FFFFFF`   | 12.69 / 11.82 / 10.78 | 19.68 / 18.42 / 17.06 | Hover                               |
| `accent-press` | `#000000`   | `#D6D2C8`   | 18.58 / 17.31 / 15.78 | 13.04 / 12.20 / 11.30 | Active                              |
| `accent-soft`  | `#E3DFD5`   | `#262523`   | —                   | —                   | The hover fill behind an accent control |
| `accent-line`  | the accent at 0.4 alpha | same rule | —        | —                   | Focus ring, hover ring                  |
| `up`           | `#1D6B3F`   | `#22C55E`   | 5.76 / 5.36 / 4.89  | 8.64 / 8.08 / 7.48  | Direction only. Dark was a pale mint `#B9E8C9`; changed 2026-10-08 so a Long button reads as green |
| `down`         | `#A63D2C`   | `#C4705F`   | 5.59 / 5.21 / 4.75  | 5.46 / 5.11 / 4.73  | Direction only                          |
| `up-hover` / `up-press`     | `#17573A` / `#124A2E` | `#4ADE80` / `#16A34A` | 7.55 / 9.09 ink | 11.30 / 5.97 ink | The up control's states |
| `down-hover` / `down-press` | `#8F3324` / `#7A2A1D` | `#D08575` / `#B46554` | 6.97 / 8.54 ink | 6.84 / 4.62 ink   | The down control's states |
| `up-soft` / `down-soft`     | the up/down colour at 0.12 alpha | same rule | — | — | The hover fill behind an up/down control |
| `up-line` / `down-line`     | the up/down colour at 0.35 alpha | same rule | — | — | Focus ring on up/down controls |
| `ivory` / `charcoal`        | `#F3F1EA` / `#0B0B0B` | fixed | — | — | The PNL card only |
| `card-accent` / `card-loss` | `#1D6B3F` / `#7A2A1D` | fixed | 5.76 / 8.54 on ivory | — | PNL card frame, gain bar, loss bar |

Chart-only candles: light `#0E8A4A` / `#D63A3A` (3.64 and 3.82 on `surface`), dark `#00E676` /
`#FF3B4E` (11.04 and 5.25 on `surface`). Never used for text; direction is also carried by the body's
shape.

Shadows: `shadow-accent-glow` is a halo of the current accent at 0.35 alpha; `shadow-up-glow` and
`shadow-down-glow` are the direction colours at 0.25 alpha. None is a new hue.

### 4.1 Ink on fills, measured

| Fill           | Light: ivory ink | Dark: charcoal ink |
| -------------- | ---------------- | ------------------ |
| `accent`       | **17.42:1**      | **17.42:1**        |
| `accent-hover` | **12.69:1**      | **19.68:1**        |
| `accent-press` | **18.58:1**      | **13.04:1**        |
| `up`           | **5.76:1**       | **14.48:1**        |
| `down`         | **5.59:1**       | **5.46:1**         |
| `down-press`   | **8.54:1**       | **4.62:1**         |

Up/down filled controls take `text-ground` as ink, which is the theme's ground, so the same class works
in both themes. Soft fills: light `up` on `up-soft` 4.86, `down` on `down-soft` 4.68; dark 11.34 and 4.87.

A later change to any value re-runs this arithmetic rather than assuming it still holds.

#### Themes

Light is the default for every visitor; the OS `prefers-color-scheme` is not consulted until the visitor
picks a theme with the header toggle, and the choice persists per device. An inline script sets
`data-theme` before first paint, so there is no flash of the wrong theme. Canvas surfaces that read the
tokens at runtime (the price chart, the landing scene) re-read them when the theme changes.

## 5. How Zupiter's style reaches each Hume surface

Section 2 decides what to borrow. This is where each borrowing lands.

| Hume surface                           | What changes                                                                                                                                                                                                                   | Phase |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Landing `/`                            | Zupiter's progressive reveal: large display type, numbered `01`–`04` sections, one idea per section, motion allowed within the 200 ms budget. The landing scene follows the current theme | 18    |
| Header / `AppShell`                    | Zupiter's network selector becomes a three-way environment switcher: Mainnet, Testnet, Sample — each with isolated balances. Plus the `SAMPLE DATA` chip and the unaudited notice                                              | 6, 7  |
| First visit, any page                  | No connect wall. The app opens in Sample. Zupiter's "no extension opens, no signatures are requested and no funds move" is the literal behaviour, not a claim                                                                  | 7     |
| Connect flow                           | Zupiter's considered-connection screen: what a wallet does here, sample balances do not carry over, the caps, the unaudited notice. Shown once, at the moment the user chooses to connect                                      | 7     |
| Perp ticket, option ticket, `/lending` | Zupiter's `Back` / `Continue` / review sequence replaces submit-straight-to-signature. Guided by default, Pro toggle restores today's dense `OrderPanel`                                                                       | 8     |
| The review screen                      | Zupiter's itemised fee table, translated to derivatives: margin required, **liquidation price**, funding, fees, venue cut, the binding cap, and the worst case in one sentence                                                 | 8     |
| Deposit path                           | Zupiter's recovery-before-deposit ordering becomes caps-and-risk-before-first-approval                                                                                                                                         | 8     |
| Tables and charts                      | **Zupiter's motion is rejected here.** Dense data stays still. Direction uses `up` / `down` only; the accent marks the price line and the selected row                                                                               | 3     |
| Every failure                          | Zupiter's transparency applied to errors: a plain sentence and a next action, never a raw revert                                                                                                                               | 12    |
| PNL card                               | Inverted to ivory, per Section 4. Charcoal figure, deep-green frame, one number that dominates                                                                                                                                       | 10    |

**What Hume does not take.** Zupiter is a swap venue; Hume is a derivatives terminal. Zupiter can afford
a scroll-driven, motion-led surface because a swap is one decision. A trader watching funding on five
positions cannot. So the borrowings are the **flow and the honesty** — sample first, review before
signing, itemised costs, labelled simulation — and not the choreography.

---

## 6. The page-by-state grid

**This grid is the Phase 12 and 13 backlog.** Rule 2 asks every screen for seven states; this is where
all 8 pages stand on 2026-10-04, read from the components each page renders and from the screenshots in
`docs/evidence/phase-3/`. Three marks only:

- **pass** — the state renders, in plain words, with a next action where one exists.
- **partial** — it renders, but it is bare: a sentence with no next action, or only some panels cover it.
- **missing** — nothing distinguishes the state. The screen renders empty, or as if the data were fine.

| Page           | loading                  | empty                             | error                            | success | paused                     | not-connected                   | sample      |
| -------------- | ------------------------ | --------------------------------- | -------------------------------- | ------- | -------------------------- | ------------------------------- | ----------- |
| `/` landing    | partial — the hero carousel shows `Skeleton`s, the ticker and market list do not | partial — "No perpetual markets are listed yet" | partial — a market read failure falls back to the empty copy, so a down RPC reads as "no markets" | pass | **missing** — a paused market is not distinguished in the hero or ticker | n/a — the landing page asks for no wallet | **missing** |
| `/markets`     | pass — `Skeleton` rows   | pass — "No perpetual markets are listed yet" | pass — "Could not read markets from the chain. Check NEXT_PUBLIC_RPC_URL." | pass | **pass** — a `Paused` chip per row, the only page that has one | n/a — reads are public | **missing** |
| `/perpetuals`  | pass — chart, list and analytics all skeleton | partial — the market list says so; the ticket does not | pass — the analytics panel names the failure | pass | **missing** — the ticket does not refuse a paused market | pass — `OrderPanel` shows a connect prompt | **missing** |
| `/options`     | partial — the chain skeletons, positions do not | pass — "No market on the registry has options enabled yet" | pass — the chain names a market read failure | pass | **missing** | pass — `OptionPositions` prompts to connect | **missing** |
| `/strategies`  | **missing** — the builder renders its form with no price and no skeleton | partial — a prompt to pick a market | partial — a computed-analysis failure prints the thrown message, which is close to a raw error | pass | **missing** | **missing** — the builder reads as usable, then cannot price | **missing** |
| `/portfolio`   | pass — `Skeleton` on every figure | pass — `Empty` with a next action per tab | pass — a named failure for the summary | pass | **missing** | pass — "Connect a wallet to see your collateral, positions and history." | **missing** |
| `/activity`    | pass — "Loading funding…", "Loading history…" | pass — "No activity yet for this wallet." | pass — "The transaction history is not available right now." | pass | n/a — history has no paused state | pass — "Connect a wallet to see its transactions and funding payments." | **missing** |
| `/docs`        | pass — live parameters wait on the chain | n/a — the prose is static | partial — a failed live read leaves the parameter blank rather than saying why | pass | n/a | n/a — the page is public | **missing** |

### What the grid says

| Count | State                                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| 8 of 8 | **`sample` is missing everywhere.** That is expected: Phase 7 builds sample mode, and this grid is its acceptance surface   |
| 5 of 6 applicable | **`paused` is missing.** Only `/markets` marks a paused market. A paused market can still be opened in the ticket |
| 3     | `loading` is missing or partial: `/strategies`, `/options` positions, the landing ticker and market list                    |
| 3     | `error` is partial: the landing page reads a failure as emptiness, `/strategies` prints a thrown message, `/docs` goes blank |
| 2     | `empty` is partial: `/perpetuals`' ticket and the landing page                                                             |
| 1     | `not-connected` is missing: `/strategies`                                                                                   |

**Phase 12 takes** the `error` and `empty` column: the landing page distinguishing a failure from an
empty venue, `/strategies` replacing its thrown message, `/docs` saying why a parameter is blank.
**Phase 13 takes** the `loading` column and the mobile and keyboard pass over all 8.
**Phase 7 takes** the `sample` column, all 8 pages.
**The `paused` column has no phase yet** — it is the one gap this grid turns up that the plan does not
already own. The cheapest home for it is Phase 6, which already touches every trading surface for
mainnet, and a paused market reaching a ticket is a real-money failure rather than a cosmetic one.

## 7. The Guided/Pro field split

Rule 6: Guided is the default and Pro is a toggle, remembered per device. **Guided never hides what Pro
shows; it sequences it.** Phase 8 builds this; Phase 3 decides it, so Phase 8 is execution.

The test for which side a field falls on: *can a first-time user make a wrong-sized, wrong-direction or
liquidatable trade without it?* If yes, Guided shows it. If it only makes an already-correct trade
better, Pro shows it.

### 7.1 Perp ticket (`OrderPanel`, `PerpTradeBar`)

| Step            | Guided shows, one step at a time                                            | Pro shows, all at once          |
| --------------- | --------------------------------------------------------------------------- | -------------------------------- |
| 1 Direction     | Long or short, as two large controls using `up` / `down`                    | The same, as a segmented control |
| 2 Size          | Size in USDG, with the balance and the per-market cap stated                | Size, in USDG or in contracts    |
| 3 Leverage      | A slider with the resulting **liquidation price** updating beside it        | Leverage input, liquidation price in the figures row |
| 4 Review        | Margin required, liquidation price, funding rate, fees, venue cut, the binding cap, and the worst case in one sentence | The same as a collapsed row above the button |
| Order type      | Market only                                                                 | Market, limit, stop-loss, take-profit, reduce-only, post-only |
| Not in Guided   | —                                                                           | Cross vs isolated margin, subaccount selection, RFQ, slippage tolerance, time-in-force |

Guided's step 4 is not optional and not collapsible: rule 3.

### 7.2 Option ticket (`OptionTicket`, `OptionTradeSheet`, `OptionChain`)

| Step          | Guided                                                              | Pro                                    |
| ------------- | -------------------------------------------------------------------- | --------------------------------------- |
| 1 View        | "I think it goes up / down", which picks call or put                | Call/put, directly on the chain         |
| 2 Expiry      | The three proposed expiries, in plain dates                         | Every open series, plus the proposed ladder |
| 3 Strike      | Three strikes around spot, each labelled with its break-even        | The full ladder with bid, ask and Greeks |
| 4 Size        | Contracts, with the premium in USDG beside it                       | Contracts, premium, and the quote's TTL  |
| 5 Review      | Premium paid, **maximum loss**, break-even, expiry in plain words, fees | The same as a collapsed row              |
| Not in Guided | —                                                                   | Delta, gamma, vega, theta, implied volatility, the quote signature's expiry |

A Greek is a Pro field by this test: it refines a correct trade. **Maximum loss is a Guided field**,
because without it a first-time buyer does not know what they can lose.

### 7.3 Lending and borrowing (`/lending`, Phase 9)

| Step          | Guided                                                                     | Pro                               |
| ------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| 1 Intent      | Supply, or borrow against what you supplied                                 | The pair table, both sides at once |
| 2 Amount      | Amount, with the resulting **health factor** and liquidation threshold      | Amount, LTV, health factor         |
| 3 Review      | What you supply, what you can borrow, the liquidation price of the pair, the interest rate now | A collapsed row    |
| Not in Guided | —                                                                           | Utilisation, the rate curve, the reserve factor, per-pair caps |

### 7.4 What the toggle does not change

The toggle changes **sequence and density, never availability**. Both modes reach every order type
through the same components; Pro surfaces them immediately, Guided after step 1. And both modes pass
through the review step before any signature — there is no Pro shortcut past rule 3.

## 8. Motion budget

Set by Phase 3, enforced from here on.

| Surface                       | Budget                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| Anything inside the app       | **No animation over 200 ms.** Transitions are 150 ms (`duration-150`), the existing default |
| Dense data: tables, the chain, the order book | **No animation at all.** Section 5: Zupiter's motion is rejected here |
| The landing page `/`          | Motion allowed: the section fade (0.7 s), the scene turn and scroll travel in the WebGL canvas, the voxel assembly the first time a station is seen (0.55 s per voxel, staggered), the ticker on app pages (70 s loop). The render loop pauses when the tab is hidden or the canvas is off screen |
| `prefers-reduced-motion`      | Every animation collapses to 0.01 ms; the landing scene starts with motion off, so idle motion, pointer tilt and drag coasting stop and smooth scrolling is off. There is no override |

One exception, already in the code and kept: a fill confirmation (`fill-pop`, 350 ms) is a success
signal a trader waits for, not decoration.
