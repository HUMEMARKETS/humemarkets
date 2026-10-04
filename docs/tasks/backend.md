# Backend lane — tasks

`services/` only: api, indexer, keeper, pricing, hedger, risk-monitor, simulator. Agent:
`.claude/agents/hume-backend.md`.

Read [`../LANES.md`](../LANES.md) for the wave order and the phase line anchors. Read each phase's own
lines in `docs/DEVELOPMENT_PHASES.md` for the detail — this file is the lane's slice, not a copy.

| Phase | Lines     | Wave | Your slice                             | Depends on                     |
| ----- | --------- | ---- | -------------------------------------- | ------------------------------ |
| 5     | 660–786   | 1    | all of it                              | Phase 4's caps on chain        |
| 9     | 1008–1084 | 2    | the API route for the credit pair      | contracts lane's P9 handoff    |
| 10    | 1085–1160 | 2    | steps 1–4: schema, derivation, 2 routes | nothing — start immediately    |
| 11    | 1161–1252 | 3    | the four crypto feeds in pricing       | contracts lane's `crypto` group |

## Phase 5 — mainnet bring-up (wave 1, serial)

All of it. Phase 6 cannot start until the API answers, so this phase is the critical path for the whole
remaining plan. Do not add scope to it.

Postgres runs on Railway, in the same project as the services but as its own service. One
`DATABASE_URL` per environment covers runtime and migrations — Railway Postgres is a direct connection,
so there is no pooler, no `prepare: false` and no `DIRECT_DATABASE_URL`. Prove each service with a
response, not with the Railway dashboard.

Only the `mainnet` environment exists. The `testnet` Postgres is created in Phase 15 and deleted after
the recording, so do not configure it here.

The account is on a **free or trial** Railway plan: $1 of included usage per month on Free, a one-time
$5 on Trial, and a **0.5 GB volume cap** on both. Four always-on containers cost more than $1 a month,
so treat capacity as a real constraint — size `PRICE_TICK_RETENTION_DAYS` against the volume cap and
report measured usage. Changing the plan is the operator's decision.

## Phase 10 — leaderboard and PNL card (wave 2, parallel with P7 and P9)

Yours: steps 1–4. Both features derive read-only from the indexer's append-only `events` table, so
there is no contract work and no custody risk.

1. `trader_stats` in `services/indexer/src/db/schema.ts`: wallet, realised PNL, unrealised PNL, ROI,
   volume, trade count, win rate, window. **Amounts as `text`** — the 18-decimal overflow reason the
   existing schema already documents.
2. Derive from `events` on a fixed interval.
3. `GET /leaderboard?metric=pnl|roi|volume&window=all` in `services/api/src/routes/`. **Keep `window` in
   the signature** even though `all` is the only launch value, so Phase 18 adds `24h` without an API
   change.
4. `GET /pnl-card/:wallet/:positionId`.
5. Privacy opt-out. Cheap now, expensive to retrofit.

Not yours: the leaderboard page, the PNL card component and the OG image route.

### Handoff: publish the response shapes first

The frontend lane builds the page in the same wave, so it cannot wait for your routes to deploy. **Your
first commit of this phase is the response shape, not the implementation.** Write both JSON shapes into
`docs/evidence/phase-10.md` before you touch the derivation:

- `GET /leaderboard` — the array element: every field name, its type, and amounts as decimal strings;
  how ties break; the page size; what an empty leaderboard returns.
- `GET /pnl-card/:wallet/:positionId` — every field the card renders, and the 404 shape.

Then the frontend builds against a fixture and both lanes integrate at the end of the wave. If you
change a field name after publishing it, that is a blocker to report, not a silent rename.

Sample mode: populate the leaderboard from simulator wallets so launch day is never a blank page. The
simulator is yours; it already has backfill.

## Phase 9 — credit API (wave 2)

One route surfacing the pair the contracts lane deploys. Wait for their handoff block in
`docs/evidence/phase-9.md` — it carries the pair address and the health-factor view signature and
scaling. Do not guess the scaling.

## Phase 11 — crypto feeds (wave 3)

Add BTC, ETH, LINK and GLD to the pricing service once the contracts lane lists them. These feeds have
no session, so the staleness handling differs from the 32 equity markets. Do not reuse the equity path.
