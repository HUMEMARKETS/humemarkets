# Hume — working rules

Derivatives for tokenized equities. pnpm + turbo monorepo. Solidity in `packages/contracts`,
Node services in `services/`, Next.js in `apps/web`.

`docs/DEVELOPMENT_PHASES.md` is the source of truth for what to build.
Work is serial: one session, one phase at a time, in the order of the Phase index below.

## Hard rules

- **Never touch git.** No `commit`, `push`, `add`, `stage`, `tag` or `gh pr create`. Leave the
  working tree dirty, list the paths you changed, and print the phase's **Ship** block for the
  operator to run. The operator owns every git mutation.
- **Never read `docs/DEVELOPMENT_PHASES.md` whole.** It is 2198 lines. Read only your phase's line
  range from the Phase index below: `sed -n '589,660p' docs/DEVELOPMENT_PHASES.md`.
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

## Phase index

Line ranges in `docs/DEVELOPMENT_PHASES.md` (start of phase to start of next). Offsets drift when the
file is edited; re-check with `grep -n '^#### Phase' docs/DEVELOPMENT_PHASES.md`.

| Phase | Lines     | Phase | Lines     |
| ----- | --------- | ----- | --------- |
| 0     | 313-381   | 10    | 1172-1247 |
| 1     | 382-436   | 11    | 1248-1339 |
| 2     | 437-504   | 12    | 1340-1407 |
| 3     | 505-588   | 13    | 1408-1469 |
| 4     | 589-660   | 14    | 1470-1550 |
| 5     | 661-861   | 14b   | 1551-1659 |
| 6     | 862-928   | 15    | 1660-1818 |
| 7     | 929-1006  | 16    | 1819-1895 |
| 8     | 1007-1094 | 17    | 1896-2000 |
| 9     | 1095-1171 | 18    | 2001-2071 |

## Scope

No smart-contract audit is in scope (`docs/DEVELOPMENT_PHASES.md` Section 0.8). The local
`/security-review` on a diff is not an audit and does not change that.
