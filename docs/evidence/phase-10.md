# Phase 10 — Leaderboard and PNL card: evidence

Status: **backend slice written, not deployed.** Response shapes were published before the derivation was
written so the frontend lane could build against a fixture. A field rename after publishing is a blocker to
report, not a silent change; none has been made.

## Handoff: response shapes (backend lane -> frontend lane)

Routes are served under `/v1/`, like every other route in `services/api`. All amounts are **decimal
strings of an integer**, never JSON numbers, and may be negative (`"-1250000"`). The two units:

- **Money** (`realisedPnl`, `unrealisedPnl`, `totalPnl`, `volume`, `size`, `collateral`, `capital`) is in
  settlement-token base units. Divide by `10 ** settlementDecimals`, which every response carries.
- **Prices** (`entryPrice`, `exitPrice`, `markPrice`) are 18-decimal fixed point, the same as `/v1/prices`.
- **Ratios** are basis points as integers: `roiBps`, `winRateBps` (`1 bp = 0.01 %`, so `roiBps: "1250"` is +12.50 %).

Wallet addresses are lowercase hex.

### `GET /v1/leaderboard`

Query, all optional:

| param    | values                  | default | note                                                                       |
| -------- | ----------------------- | ------- | -------------------------------------------------------------------------- |
| `metric` | `pnl` \| `roi` \| `volume` | `pnl`   | `pnl` ranks by total PNL (realised + unrealised)                           |
| `window` | `all`                   | `all`   | In the signature for Phase 18. Any other value is `400`. Launch value is `all` only |
| `limit`  | integer 1 to 100        | `50`    | Page size. `50` unless asked                                               |
| `offset` | integer >= 0            | `0`     | Rank offset, so page 2 is `offset=50`                                      |
| `sample` | `1`                     | absent  | Sample board, see below                                                    |

`200` response:

```json
{
  "metric": "pnl",
  "window": "all",
  "sample": false,
  "updatedAt": "2026-10-05T12:00:00.000Z",
  "settlementDecimals": 6,
  "total": 123,
  "limit": 50,
  "offset": 0,
  "entries": [
    {
      "rank": 1,
      "wallet": "0xabc0000000000000000000000000000000000001",
      "realisedPnl": "1250000000",
      "unrealisedPnl": "-30000000",
      "totalPnl": "1220000000",
      "roiBps": "1220",
      "volume": "98000000000",
      "tradeCount": 41,
      "winRateBps": 6250,
      "sample": false
    }
  ]
}
```

Field notes:

- `sample` (envelope): `true` only when every row is simulated, that is, on a `?sample=1` request. It is
  the flag that drives the `SAMPLE DATA` label on the whole board. Never hide it.
- `entries[].sample`: `true` when that wallet is a simulator bot (`SAMPLE_WALLETS`). A real board on testnet
  can mix bots and people, so label each row, not only the board.
- `updatedAt`: when the indexer last wrote the stats, ISO 8601. `null` when it has never run, and always
  `null` on the synthetic fallback.
- `total`: wallets on this board after the privacy opt-out. Use it to page.
- `winRateBps`: share of **closed** positions that ended in profit, `0` to `10000`. `null` when the wallet has
  closed nothing yet. Render `null` as an em dash, not `0 %`.
- `tradeCount`: executions, a number. Opens, increases, reductions, closes, liquidations and option opens and closes each count one.
- `roiBps`: total PNL over capital deployed (margin posted on perps plus premium paid on options), signed.
- `rank`: 1-based position in this response's ordering. It is **unique**: ties never share a rank.
- A wallet with no trades is not on the board. A wallet that opted out (below) is not on the board.

**Ordering and ties.** Sort by the chosen metric descending, as a number (not as text). Ties break on
`volume` descending, then on `wallet` ascending. So the order is fully deterministic and a refresh with
no new trades never reshuffles rows.

**Empty.** A board with nobody on it is `200` with `"total": 0` and `"entries": []`. It is not a `404`.
The frontend renders its `empty` state from that.

**Sample board.** `GET /v1/leaderboard?sample=1` returns the board for the simulator wallets
(`SAMPLE_WALLETS`) when they have stats, and otherwise a fixed synthetic board of 12 rows so launch day is
never blank. Either way the envelope says `"sample": true` and every row says `"sample": true`. Synthetic
rows have `updatedAt: null`, and their wallets are not real addresses anyone controls.

Errors, in the existing `{ "error": "<message>" }` shape: `400` for a bad `metric`, `window`, `limit` or `offset`.

### `POST /v1/leaderboard/visibility` and `GET /v1/leaderboard/visibility/:wallet` (privacy opt-out)

A wallet can hide itself from the leaderboard and from its PNL card. It is a signed message, so nobody can
hide someone else. The default is visible.

`GET /v1/leaderboard/visibility/:wallet` returns `200 { "wallet": "0x…", "hidden": false }`.

`POST` body, all fields required:

```json
{ "wallet": "0xabc…", "hidden": true, "issuedAt": 1790000000, "signature": "0x…" }
```

`signature` is an EIP-191 `personal_sign` of exactly this text, with `\n` line breaks and no trailing newline.
`wallet` is lowercase in the text, `hidden` is `true` or `false`, `issuedAt` is unix seconds:

```
Hume leaderboard visibility
Wallet: 0xabc0000000000000000000000000000000000001
Hidden: true
Issued: 1790000000
```

`200` returns `{ "wallet", "hidden" }`. Errors: `400` malformed body, `401` the signature does not recover to
`wallet`, `409` `issuedAt` is not newer than the last accepted change, `400` `issuedAt` more than 10 minutes from
now. Contract wallets (EIP-1271) are not supported, so only an EOA can opt out. This is a signature on a
message, not a transaction: the UI must still show a review step (the exact text above) before asking for it.

### `GET /v1/pnl-card/:wallet/:positionId`

`:positionId` is the perp position id, a decimal integer. Launch covers **perp positions only**; the option
card is deferred (a query `kind` is not accepted yet).

`200` response:

```json
{
  "wallet": "0xabc0000000000000000000000000000000000001",
  "positionId": "12",
  "kind": "perp",
  "marketId": "0x4e56444100000000000000000000000000000000000000000000000000000000",
  "symbol": "NVDA",
  "side": "long",
  "status": "closed",
  "leverage": 5,
  "size": "5000000000",
  "collateral": "1000000000",
  "entryPrice": "190000000000000000000",
  "exitPrice": "199500000000000000000",
  "markPrice": null,
  "pricePnl": "250000000",
  "fundingPnl": "-1200000",
  "fees": "2500000",
  "unrealisedPnl": null,
  "totalPnl": "246300000",
  "roiBps": "2463",
  "openedAt": "2026-10-05T09:00:00.000Z",
  "closedAt": "2026-10-05T11:30:00.000Z",
  "settlementDecimals": 6,
  "sample": false
}
```

Field notes:

- `status`: `open`, `closed` or `liquidated`. Render `liquidated` in the paused/negative treatment, never as a plain loss.
- `side`: `long` or `short`. `symbol` is the ticker, `NVDA`, with no `-PERP` suffix.
- `size` and `collateral` are the position's **current** values on chain. For a closed position they are the values it had when it closed.
- `entryPrice`: the position's weighted entry price from chain.
- `exitPrice`: `null` while `open`. Otherwise the price of the closing fill (the liquidation mark for `liquidated`).
- `markPrice`: the live mark while `open`, `null` once closed, and `null` while open if the market's price is
  unavailable (session shut or paused). A paused market is a shipped market: still render the card.
- `pricePnl`: realised price PNL, summed over every reduction and the close. `0` while nothing has been closed.
- `fundingPnl`: funding received (positive) or paid (negative), summed over the position's life.
- `fees`: taker and liquidation fees paid on this position, a non-negative magnitude, **already subtracted** in `totalPnl`.
- `unrealisedPnl`: PNL of the open remainder at `markPrice`. `"0"` once closed, `null` while open with no mark.
- `totalPnl = pricePnl + fundingPnl - fees + (unrealisedPnl ?? 0)`. This is the headline number on the card.
- `roiBps`: `totalPnl` over the margin posted on this position (opening margin plus any added later), signed.
- `closedAt`: `null` while open. `openedAt` and `closedAt` are the indexer's insert time, accurate while the indexer is at the chain head.
- `sample`: `true` when the wallet is a simulator bot, so the card must carry the `SAMPLE DATA` mark.

`404` (existing error shape), returned for a position that does not exist, that belongs to a different wallet,
or whose owner opted out of the leaderboard, with no way to tell those apart:

```json
{ "error": "no position 12 for wallet 0xabc0000000000000000000000000000000000001" }
```

`400` `{ "error": "wallet must be an address" }` or `{ "error": "positionId must be a whole number" }` for a malformed path.
`502` `{ "error": "chain unavailable" }` when the chain read for a position fails. The card is retryable.

## Implementation evidence (backend lane)

Nothing here is deployed and no live database was touched. The checks ran against a throwaway local
PostgreSQL 18 with migrations `0000` to `0002` applied from the SQL files.

| check                                                         | result                        |
| ------------------------------------------------------------- | ----------------------------- |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` from the root     | pass, 16 / 12 / 16 tasks      |
| indexer unit tests (derivation, pricing the open positions)   | 18 pass                       |
| api unit tests (board, card, opt-out, credit route)            | 105 pass                      |
| leaderboard routes against real PostgreSQL (9 tests)           | pass                          |
| one derivation pass through Drizzle against real PostgreSQL    | pass                          |
| `drizzle-kit generate` migration, applied to a scratch database | `0002_groovy_trauma`, no error |

`analytics.integration.test.ts` (not touched by this phase) has one failing assertion when run against a
database, "one candle per 15 minutes of 2 hours". It depends on clock alignment and is unrelated to this phase.

### How the numbers are defined (`services/indexer/src/traderStats.ts`)

- **Realised PNL** = price PNL of every perp reduction, close and liquidation + funding - fees paid
  (`TAKER`, `LIQUIDATION`, `OPTION_OPEN`) + option PNL (closed, exercised, or expired worthless).
  Option close and settlement fees are not taken twice: the contract already nets them into the PNL it emits.
- **Unrealised PNL** = open perp positions priced at the live mark, read from chain (the weighted entry price of a
  position that was increased is not in the events). `MarginEngine.unrealizedPnl`, truncating toward zero.
- **Volume** = perp notional traded (open, every size change, the size closed or liquidated) + option premium paid.
- **Capital deployed** (the ROI denominator) = margin posted on perps, including margin added later, + option premium.
- **Win** = a position that finished with price PNL + funding above zero. `winRateBps` is null until one finishes.
- An option with no close or exercise event 24 hours after expiry (`LEADERBOARD_OPTION_GRACE_HOURS`) is written off
  as worthless. The contract emits no event for a worthless expiry.
- The liquidator's 5% reward is not in any event, so a liquidated wallet's PNL does not include it. It is a known gap.

### Reconciliation: the hand-check the acceptance asks for

```bash
pnpm --filter @hume/indexer reconcile 0x<wallet>
```

For each of the wallet's perp positions, the event log's price PNL + funding against the chain's own
`realizedPnl + fundingAccrued`. It exits 1 on any difference. **Not run yet**: it needs a populated indexer database
and the chain, so the operator runs it once on testnet or mainnet and pastes the output here.

```text
(operator: paste the reconcile output)
```

### Operator checklist

1. Run `pnpm --filter @hume/indexer db:migrate` for the target environment (creates `trader_stats` and
   `leaderboard_visibility`). The testnet database does not exist until Phase 15.
2. Deploy `indexer` and `api`. The indexer derives every `LEADERBOARD_INTERVAL_MS` (default 60000).
3. Where the simulator trades, run `pnpm --filter @hume/simulator wallets` and set the printed `SAMPLE_WALLETS` on the `api` service.
4. `curl <api>/health` then `curl "<api>/v1/leaderboard?metric=pnl"` and `curl "<api>/v1/leaderboard?sample=1"`; paste the status lines here.
5. Run the reconcile above and paste the output.

New environment variables, all optional: `LEADERBOARD_INTERVAL_MS` (60000), `LEADERBOARD_MAX_LIVE_POSITIONS` (200),
`LEADERBOARD_OPTION_GRACE_HOURS` (24) on the indexer; `SAMPLE_WALLETS` on the api.

Capacity: one pass reads the trading events once and makes one RPC read per open position plus one per market, so
at launch scale it is a few dozen calls a minute. `trader_stats` holds one row per wallet (about 200 bytes each), so it
does not move the 0.5 GB volume question. No new always-on container.

## Phase 9 slice: the credit API (backend lane)

Built to the contracts lane's handoff in `docs/evidence/phase-9.md`, scaling taken from it unchanged. The pair
address is `TBD` there, so the route reads it from the config's `creditPairTslaUsdg` when that lands (it is in the
contracts worktree, not yet on `main`) and otherwise from `CREDIT_PAIR_ADDRESS`. With neither set, `GET /v1/credit/markets`
returns `[]` and the position route returns `404`.

- `GET /v1/credit/markets` returns an array of one: `marketId`, `slug`, `pair`, `collateralToken`, `debtToken`,
  `collateralDecimals`, `debtDecimals`, `status` (`normal` | `reduce_only` | `paused`), `riskTier`, `maxLtvBps`,
  `liquidationLtvBps`, `maxLeverageBps`, `supplyCap`, `borrowCap`, `totalSupplyCollateral`, `totalBorrowedDebt`.
  Amounts are decimal strings in each token's base units. A paused pair is listed, not hidden.
- `GET /v1/credit/positions/:wallet` returns `collateralAmount`, `debtAmount`, `collateralValueUsd` (1e18),
  `healthFactorBps`, `hasDebt`, `liquidatable`. `healthFactorBps`: 10000 = 1.00x, the liquidation boundary; below it
  the position is liquidatable; higher is safer. With no debt the contract returns 9990000, so check `hasDebt` first.
  `503` when the credit oracle price is stale or missing.


---

## Frontend half: Phase 10 — frontend slice: leaderboard page, PNL card, share image (steps 5 to 7)

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
