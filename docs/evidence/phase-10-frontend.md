# Phase 10 — frontend slice: leaderboard page, PNL card, share image (steps 5 to 7)

Date: 2026-10-05. Result: **amber**. Everything the frontend owns is built and verified against the
response shapes in `docs/evidence/phase-10.md` (the backend lane's published handoff). It is amber, not
pass, because the routes themselves are not deployed yet, so the card and the board were verified against
a local stand-in that serves the published shapes, not against the real API.

Built against `GET /v1/leaderboard`, `GET /v1/pnl-card/:wallet/:positionId` as published. No field was
renamed or added; the client reads exactly those. The privacy opt-out (step 8, signed visibility message) is
backend work and has no screen yet. See Section 5.

## 1. What was built

| Step | Piece | Where |
| ---- | ----- | ----- |
| 5 | Leaderboard page, `/leaderboard`, three metrics (PNL, ROI, volume), window fixed to `all` | `app/leaderboard`, `components/LeaderboardView.tsx` |
| 5 | SDK client, restores bigints, typed 404 | `packages/sdk/src/leaderboard.ts` (+ test), `hume.leaderboard.board()` and `.pnlCard()` |
| 5 | Sample board fixture, kept in the repo as sample-mode and loading-state data | `lib/leaderboardFixture.ts` (12 rows, all marked `sample`) |
| 6 | `PnlCard`, the one light surface | `packages/ui/src/PnlCard.tsx` |
| 6 | Card page at a shareable URL, `/pnl/[wallet]/[positionId]` | `app/pnl/[wallet]/[positionId]/page.tsx`, `loading.tsx` |
| 6 | Sample card, local only | `app/pnl/sample/[positionId]/page.tsx` |
| 7 | Share image through the Next OG route, 1200 x 630 | `app/pnl/[wallet]/[positionId]/opengraph-image.tsx` |
| 7 | Copy link, post on X, save image | `components/PnlShare.tsx` |

One formatter, `lib/pnlCard.ts` (`cardProps`), feeds the page, the sample page and the OG image, so the image
and the page cannot disagree on a figure. Tested: gain, liquidation, open with and without a mark, flat.

## 2. Behaviour against the published shapes

| Shape rule (phase-10.md) | Frontend behaviour |
| ------------------------ | ------------------ |
| `sample` on the envelope and on each row | Panel badge on the board, a badge on each row (hidden below 640 px only when the panel header already carries it) |
| `winRateBps: null` | Rendered as an en dash, not `0%` |
| `total: 0`, `entries: []` | The empty state: `No one is on the board yet. A trader appears after their first trade.` |
| Ranks unique, ties on volume then wallet | The fixture is ranked by `rankEntries`, which implements the same rule and is tested; the sample account is ranked among the 12 by it |
| `status: liquidated` | Its own label and a loss bar, never a plain loss |
| `markPrice: null` while open | The card renders, `Mark` reads a dash, and the page says `This market has no live price right now, because it is closed or paused.` A paused market keeps its card |
| `404` (missing, someone else's, or opted out, indistinguishable) | `This card is not available` with one sentence that does not say which |
| `502` | `The card could not be loaded`, with `Try again`; nothing is said about the position |
| `sample: true` on a card | `SAMPLE DATA` on the card and in the footer, in the image too |

Sample mode asks `?sample=1` and falls back to the fixture if the API has no sample board (not deployed, or
unreachable), so the page is populated either way. Connected mode never falls back: a real board that
cannot be read says so.

## 3. The card, to the UI contract

Section 4 inversion: charcoal and sage on ivory, the only light surface. Measured, not assumed:

| Pair | Ratio | Use |
| ---- | ----- | --- |
| Charcoal on ivory | 17.42:1 | the figure, symbol, values |
| Charcoal at 70% on ivory (`#514f4e`) | 7.2:1 | labels |
| Sage frame on ivory | 3.81:1 | the border and the gain bar. Non-text, needs 3:1. Sage carries no text on the card |
| `down-press` bar on ivory | 3.8:1 | the loss bar. Non-text |
| Ivory on charcoal | 17.42:1 | the `SAMPLE DATA` and `LIQUIDATED` chips |

Gain and loss are told apart by the sign, the word and the bar. A red figure would fail on ivory at text
size (`down` is 3.19:1). `Num` gained an `inherit` tone for this: its default neutral is ivory text, which
vanishes on an ivory card (found in the first render, fixed before this file).

## 4. Screenshots

`docs/evidence/phase-10/`, each at 1440 and 375 where it has a page:

| File | State |
| ---- | ----- |
| `card-closed-*` | closed winner, `+$246.30`, `+24.63%` |
| `card-liquidated-*` | liquidated short, `−$1,005.00` |
| `card-open-paused-*` | open, no mark: the paused/closed treatment |
| `card-not-found-*`, `card-unavailable-*` | 404 and 502 |
| `card-sample-*` | sample card with `SAMPLE DATA` and the note that it cannot be shared |
| `og-closed.png`, `og-13.png`, `og-14.png`, `og-404.png` | the share image at 1200 x 630 for closed, liquidated, open, and unavailable |

Leaderboard states are in `docs/evidence/phase-7/`: `07-*` (populated, sample), `23-*` loading, `24-*`
error, `25-*` empty, `26-*` offline.

`og:image` resolves in the page's own metadata (`.../opengraph-image?f51770572855ff71`), so a pasted link
unfurls to the card.

## 5. Seven states, per screen

| Screen | loading | empty | populated | error | offline | unauthorized | paused | sample |
| ------ | ------- | ----- | --------- | ----- | ------- | ------------ | ------ | ------ |
| `/leaderboard` | skeleton rows | yes | yes | `Try again` | yes, refreshes on reconnect | n/a: public | n/a: ranks traders | yes |
| `/pnl/[wallet]/[id]` | `loading.tsx` card skeleton | n/a: a card or a not-found | yes | 502 sentence | server-rendered; the browser's own offline page | not-found covers an owner who opted out | open, no mark | `sample: true` marks it |
| `/pnl/sample/[id]` | skeleton | `This sample card is not here` | yes | n/a: local | n/a: local | n/a | n/a | yes |

## 6. What was not done, and why

1. **Verified against a local stand-in, not the deployed API.** The mock serves the published JSON for a closed,
   a liquidated and an open position, a 404 and a 502. The page and the image are therefore proven against the
   shape, which is the handoff's purpose, but a real card (a real position id, a real wallet) is for the
   integration check once the backend ships. The one assumption worth re-checking then: the OG image fetches the
   card server-side, so it needs `NEXT_PUBLIC_API_URL` at build and request time.
2. **No privacy opt-out screen.** `POST /v1/leaderboard/visibility` needs a signed message and, per the
   handoff, a review step showing the exact text. That is a signing flow and belongs with Phase 8's review
   pattern; the page already respects the result (a hidden wallet is simply absent and its card is a 404).
3. **Real-card links need a wallet.** The `Card` link on an open position and the `PNL card` link on a closed
   one appear in connected mode and in sample mode (to the local page). They were exercised in sample mode;
   the connected links are built from the connected address and were not clicked with a funded wallet.
4. **The leaderboard ranks are not reconciled against the chain.** That is the backend's acceptance
   ("PNL reconciles for one hand-checked wallet"), not the frontend's.

## 7. Paths changed

```
apps/web/src/app/leaderboard/page.tsx
apps/web/src/app/pnl/[wallet]/[positionId]/page.tsx, opengraph-image.tsx, loading.tsx
apps/web/src/app/pnl/sample/[positionId]/page.tsx
apps/web/src/components/LeaderboardView.tsx, PnlShare.tsx, PnlCardLink.tsx, Header.tsx (nav item)
apps/web/src/lib/leaderboard.ts, leaderboardFixture.ts, pnlCard.ts, pnlCardApi.ts (+ tests), theme-colors.ts
apps/web/src/hooks/queries.ts (useLeaderboard), useOnline.ts
packages/ui/src/PnlCard.tsx, Num.tsx (inherit tone), SampleBadge.tsx (onLight), index.ts
packages/sdk/src/leaderboard.ts (+ test), client.ts, index.ts
docs/evidence/phase-10-frontend.md, docs/evidence/phase-10/*.png
```

The header nav gained `Leaderboard` and `Lending`, which no longer fit one row below 1280 px with the
environment menu; the full nav now shows from `xl`, the hamburger below it, and the redundant `Trade` chip only
from `2xl`. Verified at 375, 1024, 1280, 1366, 1440 and 1920: no overlap (88 px clear at 1280), no horizontal scroll.
