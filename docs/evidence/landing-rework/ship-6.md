# Ship 6: button meaning, CTA labels, glossary and progressive disclosure

Date: 2026-10-06.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (90 web tests, 16 of 16 tasks).
- `pnpm build` in `apps/web`: pass.
- `bash scripts/check-hex.sh`: pass. `bash scripts/check-brand.sh`: pass.

## Verified in a browser (Playwright)

- Glossary (`/perpetuals`): clicking "Liquidation price" opens a card and sets `aria-expanded`; Escape closes it and returns focus to the term; a press outside closes it. On a touch context (`/features`, 375 px, `tap`) the card opens.
- Disclosure: "More detail" in the order panel is closed on first visit, writes `hume.disclosure.order-panel` to local storage when opened, and is open again after a reload.
- Screenshots: `ship6-term-open-1440.png`, `ship6-order-open-1440.png`, `ship6-order-closed-1440.png`, `ship6-landing-375.png`, `ship6-term-touch-375.png`.

## What changed

- Button meaning: red `down` is now Short only. "Market paused" (order panel and mobile trade bar) and "Options are not in sample mode" are neutral disabled buttons with a plain sentence under them. "Switch to {chain}" (order panel, option ticket, wallet button) is a primary action.
- CTAs: the landing hero and last section, and the features closing line, say "Open the terminal" (always true; "Try sample mode" would be wrong for a connected wallet). The hero adds "No wallet needed. Start in sample mode." The header "Trade" chip is "Terminal".
- Glossary: `lib/glossary.ts` (14 terms, no numbers) and `components/Term.tsx` (a button with a dotted underline; the card is drawn in a portal at a fixed position so panels and tables cannot clip it). Used in the order panel, option ticket, option chain column heads (IV, delta, gamma, theta, vega, open interest), market header (funding rate), positions table (cross position), the lending page and the landing preview (health factor, liquidation price). `Stat` now takes a node for its label.
- Disclosure: `components/Disclosure.tsx` (a native `<details>` remembered per device, storage guarded). The order panel's first view is Side, order type, collateral, leverage, risk ladder, and Size, Estimated entry, Liquidation price, Fee, Total. "More detail" holds margin mode and its explanation, worst accepted price and funding rate. The duplicate Side, Leverage and Margin rows are gone. The option ticket's first view is the series in words ("NVDA call, strike 190, expires Sep 25, 2026", with the code beneath), premium, fee, total, break-even, max loss and max profit; "The numbers behind the price" holds price per contract, sell-back price, IV and the Greeks.
- Developer text removed from the option ticket: it no longer names `QUOTER_PRIVATE_KEY` or `NEXT_PUBLIC_API_URL` (UI_CONTRACT rule 4).
- `lib/options.ts` gains `plainSeries` with a test.

## Not done or not verified

- The first view of the order panels was checked without market data (no RPC here), so the numbers read "–". Whether the new first view fits in 900 px with real data is not confirmed.
- Sortable column heads in the markets table (Funding, Open interest) have no glossary term: a term button inside a sort button would nest two controls.
- Two `title=` attributes remain (the "Test liquidation" button and the "nearest the index" marker); the term that carried the longest explanation was moved to a card.
- The Guided/Pro toggle and the review step are Phase 8. The disclosure here is independent of them.
- Still flagged from Ship 5: the landing Review tab and `/features` say "Nothing is signed without a review first". The order panels do not have that step yet.
