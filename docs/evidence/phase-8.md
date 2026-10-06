# Phase 8 — Guided review before every signature

**Result: amber.** The review step, the Guided/Pro toggle and the paused-market refusal are built. Every
gate passes. The paused refusal and the lending review were driven in a browser at 375 px and 1440 px. Three
things were not proven in a browser, for reasons outside the code:

1. **Perp and option review figures.** The walk ran at 22:25 UTC on 2026-10-06, while the US equity session
   was shut. Outside the session the oracle reverts, and the sample falls back to the API's last close. The
   local build has no API URL, and Railway has no `testnet` environment (only `mainnet`), so no price reached
   the ticket. The figures are proven by unit tests instead (`apps/web/src/lib/review.test.ts`). Rerun
   `docs/evidence/phase-8/walk-in-session.mjs` during the session (13:30–20:00 UTC) to screenshot them.
2. **Connected mode.** The harness has no wallet extension, so no signature was made. Connected mode uses
   the same component and the same review figures; only the Confirm handler differs.
3. **Credit with a live pair.** The credit pair is not deployed on any network (Phase 9 is amber), so a real
   supply or borrow cannot run. The review renders against the example thresholds, and Confirm says why it
   cannot sign.

No transaction was sent in this phase, so there are no hashes.

## What was built

| Item | Where |
| ---- | ----- |
| `ReviewStep`: rows, the worst case in one sentence, a note, a refusal, `Back` and `Confirm`. Without `onConfirm` it renders the Pro form: the worst case in full and every figure in a collapsed row (UI contract 7.1). Focus moves to the heading, not to Confirm. | `packages/ui/src/ReviewStep.tsx` |
| Review figures for the three paths, plus the rule that refuses an order whose liquidation price cannot be stated. A long's level must sit below entry, a short's above it, and both must be above zero. Anything else is refused, never guessed. | `apps/web/src/lib/review.ts` |
| Perp open: Guided shows `Review order`, and the review replaces the form so nothing can change under it. Pro keeps the one-shot button with the review collapsed above it. Changing side or market, a refusal, a pause or losing the wallet sends the ticket back to the form. Submit checks that the preview's side is the side being sent. | `OrderPanel.tsx` |
| Perp close: `Close` opens a review (closes near, profit or loss, funding, fee, venue cut, what comes back, liquidation "None once closed", and the price bound the close will not fill past). In both modes, with no Pro shortcut. | `PositionsTable.tsx` |
| Option buy: a review in Guided, collapsed in Pro. Liquidation price: "None. A bought option cannot be liquidated." Max loss in bold. The sample reaches the review; Confirm says a wallet is needed. | `OptionTicket.tsx` |
| Credit supply and borrow: a new ticket with the review. The caps, the loan to value, the health factor and the collateral's liquidation price come before the first token approval. A borrow past the limit, past a cap, without a price, or with no collateral is refused in words. Interest, fees and venue cut: none. | `CreditTicket.tsx`, `LendingView.tsx` |
| SDK writes `credit.depositCollateral` and `credit.borrow` | `packages/sdk/src/credit.ts` |
| Guided/Pro preference, persisted per device in the shell's mode store (`hume-mode-v1`). Guided is the default. | `stores/mode.ts`, `TicketModeToggle.tsx` |
| Paused: the option ticket reads the underlying's `active` flag and refuses with `tradeBlocker` before any review, even before a series is picked. `/strategies` and both position tables on `/portfolio` show the same sentence. | `OptionTicket.tsx`, `StrategyBuilder.tsx`, `PositionsTable.tsx`, `OptionPositionsTable.tsx` |
| Root cause of the paused gap on options: `useOptionUnderlyings` filtered out `active === false`, so a paused market vanished from `/options` and `/strategies` instead of rendering and refusing. The filter is removed. | `hooks/queries.ts` |

**Venue cut.** `FeeManager.collectFee` keeps the whole fee as protocol revenue and passes a buyback share
on from there. The review states the fee as the venue's cut: "$4.00, the whole fee".

## Acceptance

| Check | Result |
| ----- | ------ |
| All three paths show a review with a liquidation price before any signature, sample mode | **pass** for credit in the browser (`05-credit-supply-review-*`: "Liquidation price of TSLA: None while you owe nothing"). **amber** for perp and option: proven by unit tests, not in the browser (session shut, see above) |
| Same, connected mode | **amber**: no wallet in the harness |
| Pro toggle restores the one-shot panel | **pass**: `Open long` present and `Review order` absent in Pro; the choice survives a reload (`02-perp-pro-form-*`) |
| Review cannot be skipped by keyboard | **pass**: Enter in the collateral field shows no Confirm. No ticket is inside a `<form>`. Focus lands on the review heading (`H3 Supply TSLA`), so a held Enter does not sign |
| Review cannot be skipped by deep link | **pass**: `/perpetuals?review=1#confirm` loads with 0 Confirm buttons. Review state lives only in memory |
| Option ticket refuses a paused market with a plain sentence and no review step | **pass** on testnet market `E2E`: the sentence is shown, `Market paused` is the button, and there is no `Review order` (`03-option-paused-*`) |
| `/strategies` and `/portfolio` mark a paused market | **pass** for `/strategies` on `E2E` (`04-strategies-paused-*`). `/portfolio`: the marker is in both row components, but no position on `E2E` exists to screenshot, because the market refuses new positions |
| 375 px, no horizontal scroll | **pass** on `/lending` at 375 px |

Browser output (sample mode, `walk-no-price.mjs`, identical at 1440 and 375 except the phone bar line):

```
guided button: 1 | confirm after Enter: 0
pro one-shot: 1 | review button: 0
pro remembered after reload: yes
deep link confirm buttons: 0
perp ticket on E2E paused: true            (375: perp bar Market paused: 1)
option ticket paused sentence: true | Market paused button: 1 | review button: 0
strategies paused sentence: true
credit review: Liquidation price of TSLA | None while you owe nothing | Supply cap | While you owe nothing, no fall in TSLA can liquidate you. | Sample mode has no lending account, so nothing is supplied or borrowed. Connect a wallet to do it for real.
credit confirm disabled: true
focus on: H3 Supply TSLA
borrow refusal: Supply TSLA first: a loan needs collateral behind it.
horizontal scroll: false
```

## Gates

`pnpm typecheck` (16 of 16), `pnpm lint` (12 of 12), `pnpm test` (16 of 16; web 110 tests, review 8),
`pnpm build`, `check-brand.sh`, `check-hex.sh` and `forge fmt --check` all pass.

## Assumptions and what was left out

- **Toggle placement.** The Guided/Pro choice is stored with the shell's other per-device choices, but the
  control sits in each ticket's header (perp, option, lending), not in the global header. That is where the
  difference shows, and the header has no room at 375 px.
- **Guided form.** Guided keeps today's form fields, then a review step. The four-step sequence in UI contract
  7.1 (direction, size, leverage and review as separate screens) and Guided's market-only rule were not built.
  The review step is the rule-3 part; the sequencing can follow.
- **Other money-moving actions** stay as they were: increase or reduce a position (`AdjustPosition`), vault
  deposit and withdraw, TP/SL placement, option close (it already has its own confirm with the price) and
  option settle. Rule 3 covers them too. They are not among this phase's three paths.
- **Sample options and sample lending** reach the review but cannot sign: the sample has no option or
  lending engine (Phase 7).
- **Unit test for the option refusal.** The refusal goes through `tradeBlocker`, which `market.test.ts`
  covers. The browser proves the option ticket uses it on `E2E`.

## Screenshots

`docs/evidence/phase-8/`, each at 375 px and 1440 px: `01-perp-guided-form`, `02-perp-pro-form`,
`03-option-paused`, `04-strategies-paused`, `05-credit-supply-review`, `06-credit-borrow-refused`.
