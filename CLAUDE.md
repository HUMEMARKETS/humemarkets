# Hume — working rules

Derivatives for tokenized equities. pnpm + turbo monorepo. Solidity in `packages/contracts`,
Node services in `services/`, Next.js in `apps/web`.

`docs/DEVELOPMENT_PHASES.md` is the source of truth for what to build.
Work is serial: one session, one phase at a time, in the order of the Phase index below.

## Hard rules

- **Never touch git.** No `commit`, `push`, `add`, `stage`, `tag` or `gh pr create`. Leave the
  working tree dirty, list the paths you changed, and print the phase's **Ship** block for the
  operator to run. The operator owns every git mutation.
- **Never read `docs/DEVELOPMENT_PHASES.md` whole.** It is 2534 lines. Read only your phase's line
  range from the Phase index below: `sed -n '1404,1485p' docs/DEVELOPMENT_PHASES.md`.
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

Order (testnet first, re-planned 2026-10-07, `docs/DEVELOPMENT_PHASES.md` Sections 0.9 and 0.10):
0–10 done → **T0** → **T** → 11 → 12 → 13 → 14 → 15 (testnet `46630`; 14b skipped) → **L** → 16 → 17 (mainnet) → 18.
The open is **2026-10-08, 03:00 WIB** (= 2026-10-07 20:00 UTC, the US equity close).

| Phase   | Lines     | Phase | Lines     |
| ------- | --------- | ----- | --------- |
| 0       | 393-461   | 11    | 1486-1586 |
| 1       | 462-516   | 12    | 1587-1654 |
| 2       | 517-584   | 13    | 1655-1716 |
| 3       | 585-668   | 14    | 1717-1797 |
| 4       | 669-740   | 14b   | 1798-1905 |
| 5       | 741-941   | 15    | 1906-2068 |
| 6       | 942-1008  | **L** | 2069-2126 |
| 7       | 1009-1086 | 16    | 2127-2204 |
| 8       | 1087-1174 | 17    | 2205-2311 |
| 9       | 1175-1252 | 18    | 2312-2534 |
| 10      | 1253-1330 |       |           |
| **T0**  | 1331-1403 |       |           |
| **T**   | 1404-1485 |       |           |

## Scope

No smart-contract audit is in scope (`docs/DEVELOPMENT_PHASES.md` Section 0.8). The local
`/security-review` on a diff is not an audit and does not change that.
