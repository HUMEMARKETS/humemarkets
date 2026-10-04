# Hume — working rules

Derivatives for tokenized equities. pnpm + turbo monorepo. Solidity in `packages/contracts`,
Node services in `services/`, Next.js in `apps/web`.

`docs/DEVELOPMENT_PHASES.md` is the source of truth for what to build.
`docs/LANES.md` maps phases to lanes, holds the phase line anchors, and holds the path-ownership table.
`docs/tasks/<lane>.md` holds your lane's slice of each phase, and the handoffs between lanes.

## Hard rules

- **Never touch git.** No `commit`, `push`, `add`, `stage`, `tag` or `gh pr create`. Leave the
  working tree dirty, list the paths you changed, and print the phase's **Ship** block for the
  operator to run. The operator owns every git mutation.
- **Never read `docs/DEVELOPMENT_PHASES.md` whole.** It is 2198 lines. Read only your phase's line
  range from `docs/LANES.md`: `sed -n '589,660p' docs/DEVELOPMENT_PHASES.md`.
- **A phase is done only when its acceptance check passes.** Nothing is ticked because it looks
  finished. Report `pass`, `amber` or `fail` in one line, and do not start the next phase.
- **Secrets never reach a commit, an evidence file or the transcript.** Addresses are fine. Never
  read, print or stage `.env`.
- **Nothing is hardcoded.** Chain IDs, RPC URLs, addresses, leverage caps, fee percentages and
  market groups stay in `packages/config` or the environment.
- **`docs/UI_CONTRACT.md` governs every interface change.** No new colours, radii or fonts. Seven
  states per screen. No signature without a review step. No raw revert strings on screen.
- **Drizzle owns the schema.** `services/indexer/src/db/schema.ts` is the source of truth. Drizzle is
  the only migration system — do not add a second one.
- **Testnet and mainnet never share a database.** Railway runs compute *and* Postgres, in two
  environments, `mainnet` and `testnet`, each with its own Postgres service. One `DATABASE_URL` per
  environment serves both runtime and migrations: Railway Postgres is a direct connection, so there is
  no transaction pooler and no second connection string.
- **Sample data is always labelled.** No exceptions, no dismissable notices.
- **A paused market is a shipped market.** It renders, it prices, it refuses trades.
- **Ask only when the answer changes what gets built.** Otherwise state the assumption and keep
  moving.

## Evidence

One file per phase: `docs/evidence/phase-N.md`. Transaction hashes, not prose. UI phases also
attach screenshots at 375 px and 1440 px.

## Commands

```bash
pnpm typecheck && pnpm lint && pnpm test   # turbo, from the root
pnpm build
bash scripts/check-brand.sh                # fails on legacy brand strings
bash scripts/check-hex.sh                   # fails on off-palette hex
forge test                                  # in packages/contracts
forge fmt --check
```

## Lane path ownership

Waves run up to three lanes in parallel, one git worktree each. Stay inside your lane.

| Lane      | Owns                                                              | Never touches                  |
| --------- | ----------------------------------------------------------------- | ------------------------------ |
| contracts | `packages/contracts/**`, `packages/config/**`, `packages/types/**` | `apps/web/**`, `services/**`   |
| backend   | `services/**`                                                      | `packages/contracts/**`, `apps/web/**` |
| frontend  | `apps/web/**`, `packages/ui/**`, `packages/sdk/**`                 | `packages/contracts/**`, `services/**` |

`packages/config` and `packages/types` are shared, so the **contracts lane owns both**. If another
lane needs a change there, stop and report it as a blocker — the lead applies it serially between
waves.

## Scope

No smart-contract audit is in scope (`docs/DEVELOPMENT_PHASES.md` Section 0.8). The local
`/security-review` on a lane diff is not an audit and does not change that.
