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
| Dark, high-contrast, **one vivid accent** (amended 2026-10-06: was "no vivid accent")                                                              | **Adopt — one signal-green accent on a green-black ground**         | Charcoal and ivory are higher contrast than the outgoing teal, and the signal-green accent is the only saturated colour on the page. Section 4 |
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
9. **Layout (amended 2026-10-06).** The shell is `h-dvh` with one scroll region. Every page that is not a
   terminal uses `AppPage`: full width (capped at 1920 px), the shared `APP_GUTTER` (16 / 24 / 40 px) that
   the header also uses, a body that grows to fill the space under the title, and a footer pinned to the
   bottom. Terminals (`/perpetuals`, `/options`) fill the scroll region at `lg` and above. Panels stretch
   to the bottom of the screen. An empty, loading, error or not-connected state fills its panel with one
   sentence and one next step (`PanelState`), never a one-line strip at the top of a blank box. A width
   cap applies to prose only, inside a full-width page.
8. **Keyboard reachable, focus always visible.** Do not regress the computed contrast.

## 4. Palette

Decided 2026-10-03 (charcoal, ivory, sage, stone). **Amended 2026-10-06:** the sage accent is replaced by a
signal green, and the dark elevation steps gain a faint green cast. Reason: the sage page read as grey
line art with one muted accent. Ivory text, the stone secondary and the clay `down` are unchanged.
Token names are unchanged, so no component is renamed. The full measured table is
`docs/evidence/landing-rework/palette.md`.

| Name             | Hex       | Role                                                                   |
| ---------------- | --------- | ---------------------------------------------------------------------- |
| **Charcoal**     | `#0A0D0B` | Ground. A green-black, so the page has a temperature                   |
| **Ivory**        | `#F3F1EA` | Primary text, and the ground of the light surfaces                     |
| **Signal green** | `#22E06B` | The one accent. Action, selection, focus, the price line, the lit scene |
| **Stone**        | `#C9C3B8` | Secondary text, labels, borders, the quiet half of the page            |

#### Measured contrast, not assumed

Computed from the sRGB relative-luminance formula:

| Pair                       | Ratio       | Verdict                                         |
| -------------------------- | ----------- | ----------------------------------------------- |
| Ivory on Charcoal          | **17.28:1** | Body text. Excellent                            |
| Signal green on Charcoal   | **11.11:1** | Text and icons. Excellent, on every elevation   |
| Charcoal on Signal green   | **11.11:1** | The ink on every accent fill                    |
| **Ivory on Signal green**  | **1.56:1**  | **FAILS.** Never put ivory on the accent        |
| **Signal green on Ivory**  | **1.56:1**  | **FAILS.** The PNL card uses `card-accent`      |
| Charcoal on Ivory          | **17.28:1** | Light surfaces                                  |

**Three findings that are rules, not preferences:**

**1. Every accent-filled control takes charcoal ink, never ivory.** `--color-accent-ink: #0A0D0B`.

**2. Direction never shares the accent's job.** The accent means "you can act here" and nothing else. `up`
is a pale mint (lighter and less saturated than the accent) and `down` is clay. Colour alone does not
carry direction: a price, PNL or change always shows a `+` / `-` sign or a ▲ / ▼ as well, so the pale mint
is never the only signal.

**3. The PNL card is the one light surface.** The bright accent is 1.56:1 on ivory, so the card draws its
frame and bar in `card-accent` (`#0F8F3E`, 3.70:1, enough for a frame or a bar, never for text).

#### Derived tokens

Four colours cannot build a dense terminal. These are derived, and nothing beyond this list is allowed:

| Token          | Hex                        | On ground | On surface | On raised | Role                                              |
| -------------- | -------------------------- | --------- | ---------- | --------- | ------------------------------------------------- |
| `ground`       | `#0A0D0B` (Charcoal)       | —         | —          | —         | Page                                              |
| `surface`      | `#101512`                  | 1.06:1    | —          | —         | Panels                                            |
| `raised`       | `#171D19`                  | 1.14:1    | —          | —         | Inputs, hovered rows, menus                       |
| `line`         | `#26302A`                  | 1.43:1    | —          | —         | Hairlines, table rules                            |
| `text`         | `#F3F1EA` (Ivory)          | 17.28:1   | 16.33:1    | 15.15:1   | Body                                              |
| `muted`        | `#A8A29A` (Stone, dimmed)  | 7.72:1    | 7.29:1     | 6.77:1    | Labels, column heads                              |
| `faint`        | `#8C8780`                  | 5.48:1    | 5.18:1     | 4.81:1    | Timestamps, hints. Still above 4.5:1              |
| `accent`       | `#22E06B` (Signal green)   | 11.11:1   | 10.49:1    | 9.74:1    | Action, selection, focus, price line              |
| `accent-ink`   | `#0A0D0B`                  | —         | —          | —         | Text **on** an accent fill. See finding 1         |
| `accent-hover` | `#4AEA88`                  | 12.48:1   | 11.79:1    | 10.94:1   | Hover                                             |
| `accent-soft`  | `#0F2418`                  | 1.20:1    | —          | —         | The hover fill behind an accent control           |
| `accent-press` | `#1FC95F`                  | 8.91:1    | 8.42:1     | 7.81:1    | Active. Darker than the accent; ink stays 8.91:1  |
| `accent-line`  | the accent at 0.4 alpha    | —         | —          | —         | Focus ring, hover ring                            |
| `card-accent`  | `#0F8F3E`                  | —         | —          | —         | PNL card frame and bar on ivory (3.70:1)          |
| `up`           | `#B9E8C9` (pale mint)      | 14.37:1   | 13.58:1    | 12.60:1   | Direction only, never decoration                  |
| `down`         | `#C4705F` (clay)           | 5.42:1    | 5.12:1     | 4.75:1    | Direction only, never decoration                  |
| `up-hover` / `up-press`     | `#CBEFD8` / `#A6D9B9` | 15.70 / 12.32 | — | — | The up control's states                   |
| `down-hover` / `down-press` | `#D08575` / `#B46554` | 6.78 / 4.58   | — | — | The down control's states                 |
| `up-soft` / `down-soft`     | the up/down colour at 0.12 alpha | — | — | — | The hover fill behind an up/down control |
| `up-line` / `down-line`     | the up/down colour at 0.35 alpha | — | — | — | Focus ring, the direction twin of `accent-line` |

Shadows: `shadow-accent-glow` (`0 0 24px` accent at 0.35 alpha) marks the primary button on hover, the
active tab and the lit 3D scene. It is a halo of the accent itself, not a new hue.

### 4.1 Ink and text on fills, measured

Because the accent is bright, the sage-era rule "accent text belongs on ground only" is retired: accent
text clears 4.5:1 on `ground`, `surface`, `raised` and `accent-soft` (9.29:1).

| Fill           | Charcoal ink | Ivory ink | Which is used |
| -------------- | ------------ | --------- | ------------- |
| `accent`       | **11.11:1**  | 1.56:1    | Charcoal      |
| `accent-hover` | **12.48:1**  | 1.39:1    | Charcoal      |
| `accent-press` | **8.91:1**   | 1.94:1    | Charcoal      |
| `up`           | **14.37:1**  | 1.20:1    | Charcoal      |
| `down`         | **5.42:1**   | 3.19:1    | Charcoal      |
| `down-press`   | **4.58:1**   | 3.77:1    | Charcoal      |

Soft fills: `up` on `up-soft` 11.26:1, `up-hover` on `up-soft` 12.31:1, `down` on `down-soft` 4.81:1,
`down-hover` on `down-soft` 6.02:1.

A later change to any value re-runs this arithmetic rather than assuming it still holds.

#### One deliberate use of light

The app is dark: ivory on charcoal. The **PNL card is the exception** — it renders charcoal and deep green
on ivory. A shareable card is seen outside the app, usually in a light feed, and the inversion makes it
unmistakably Hume's rather than one more dark screenshot. It is the only light surface at launch.

## 5. How Zupiter's style reaches each Hume surface

Section 2 decides what to borrow. This is where each borrowing lands.

| Hume surface                           | What changes                                                                                                                                                                                                                   | Phase |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Landing `/`                            | Zupiter's progressive reveal: large display type, numbered `01`–`04` sections, one idea per section, motion allowed within the 200 ms budget. The existing `HeroSilkBackground` is retained but re-tinted to charcoal and signal green | 18    |
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
| The landing page `/`          | Motion allowed: the section fade (0.7 s), the scene turn and scroll travel in the WebGL canvas, the ticker on app pages (70 s loop). The render loop pauses when the tab is hidden or the canvas is off screen |
| `prefers-reduced-motion`      | Every animation collapses to 0.01 ms; the landing scene starts with motion off, so idle motion, pointer tilt and drag coasting stop and smooth scrolling is off. The "Immersive motion" toggle overrides it per device |

One exception, already in the code and kept: a fill confirmation (`fill-pop`, 350 ms) is a success
signal a trader waits for, not decoration.
