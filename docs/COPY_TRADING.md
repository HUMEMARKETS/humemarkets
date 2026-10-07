# Copy trading: the design for Phase 18

Status: **not built.** Today the leaderboard shows a disabled "Copy" button per row and says copy trading
opens once leaders have a track record, with no date promised. The flag `NEXT_PUBLIC_FEATURE_COPY_TRADING`
is off and the `/traders/[wallet]` routes return 404 until it is on. There are no tables, endpoints,
subaccounts or executor behind it.

## Why it waits

Copy trading needs leaders with a track record. On day one the board is empty or simulated, so a follow
flow would create on-chain subaccounts for nobody to copy and add custody surface for no user.

## Design

1. **Build on what exists.** `Subaccount` and `SubaccountFactory` are already deployed. No new custody
   contract.
2. **A follower makes a copy subaccount.** It is a normal subaccount owned by the follower. The follower
   funds it from the vault with the budget they choose.
3. **The executor is authorised on that subaccount only.** The follower signs one authorisation that names
   the executor address and the caps: maximum size per trade, maximum total exposure, maximum leverage and
   the markets allowed. The caps are written into the authorisation and checked by the subaccount, so the
   limits bind on chain and not only in a service.
4. **The executor can open and close inside the subaccount and can never withdraw.** Withdrawal stays
   owner-only. Revoking the authorisation stops mirroring at once and leaves the funds with the follower.
5. **Skips are explicit.** When a mirrored trade cannot run (insufficient margin, a cap would be hit, the
   market is paused) the system records a skip with the reason and shows it to the follower. It never
   mirrors part of a trade silently.
6. **Review before signing.** The copy flow follows the same review step as every other signature: the
   budget, the caps and the most the follower can lose, in plain words, before one signature.

## Then, in order

1. Indexer: leader trades as events the executor can follow, and the drawdown the board shows as "–".
2. Executor service: reads leader fills, applies the follower's caps, sends or skips.
3. Web: profile and copy routes behind the flag (labelled shells exist today), then switch the flag on.
