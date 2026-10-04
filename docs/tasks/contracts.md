# Contracts lane — tasks

Solidity, `packages/config` and `packages/types`. Agent: `.claude/agents/hume-contracts.md`.

Read [`../LANES.md`](../LANES.md) for the wave order and the phase line anchors. Read each phase's own
lines in `docs/DEVELOPMENT_PHASES.md` for the detail — this file is the lane's slice, not a copy.

| Phase | Lines     | Wave | Your slice                                  | Shared surface you must announce |
| ----- | --------- | ---- | ------------------------------------------- | -------------------------------- |
| 4     | 588–659   | 0    | all of it                                   | `robinhood_mainnet.limits.json`  |
| 9     | 1008–1084 | 2    | steps 1–5 and the address record in step 6  | credit addresses, pair ABI       |
| 11    | 1161–1252 | 3    | all of it — steps 1–4 are contracts and config | the `crypto` group accessor   |
| 16    | 1730–1806 | 4    | all of it                                   | role addresses                   |

## Phase 4 — caps (wave 0, in progress)

Code is written and green. Four mainnet broadcasts remain, in the order in
`docs/evidence/phase-4.md` Section 6. The `PriceValidator` upgrade must land first, or
`setTradingSession` reverts against the old implementation.

The caps are the primary loss bound for the whole product, because there is no audit. When a number is
uncertain, pick the smaller one and record why.

## Phase 9 — credit stack (wave 2, parallel with P7 and P10)

Yours: deploy `HumeCreditRegistry`, `HumeCreditRouter`, `HumeCreditVault` behind proxies on 4663, then
one `HumeCreditPair` with TSLA collateral (`0x322F0929c4625eD5bAd873c95208D54E1c003b2d`) borrowing USDG.
Supply cap and collateral factor come from the Phase 4 numbers. Seed from the owner wallet only. Run
deposit, borrow, accrue, repay, withdraw on mainnet. Record addresses in `robinhood_mainnet.json`.

Not yours: the API route and the `/lending` page. They are the backend and frontend lanes' slice of the
same phase. **Publish the handoff below before you start deploying**, so both lanes can build against it
while you deploy.

### Handoff: the health factor

Write this into `docs/evidence/phase-9.md` as soon as the pair is configured, before the lifecycle run:

- the three proxy addresses and the pair address;
- the exact view function that returns a health factor, its signature and its scaling (1e18? basis
  points?), because the frontend renders a number a first-time user must understand;
- the liquidation threshold, so the frontend knows where the colour changes;
- the collateral factor and supply cap as set.

Degradation: if USDG is unfunded, do steps 1–3 and the address record, skip the seed and the lifecycle,
ship the pair paused, and say `amber` for gate 9. The handoff above is still required — a paused pair
still renders.

## Phase 11 — crypto set (wave 3)

All four steps are yours. BTC, ETH, LINK, GLD via `AddMainnetMarket.s.sol`, with the feeds listed in the
phase. `underlyingToken` is registry metadata that nothing transfers, so use the tokenized asset where
one exists (GLD) and the feed address otherwise.

The risk tier is the opposite of Phase 4: these feeds move on a 0.5% deviation around the clock, so the
staleness limit is **tight and constant, with no session carve-out**. `robinhood_mainnet.limits.json`
already reserves `staleness.overrides` for exactly this. Leverage no higher than the equity tier.

Tell the backend lane when `/markets?group=crypto` is live on the Phase 2 accessor; the pricing service
may need the four feeds added.

## Phase 16 — rails and key separation (wave 4)

Hard gate, Day 3. Until this phase one key holds every role. Separate them, rehearse the pause, and
record the role holders.
