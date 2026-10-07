# Hume — working rules

Derivatives for tokenized equities. pnpm + turbo monorepo. Solidity in `packages/contracts`,
Node services in `services/`, Next.js in `apps/web`.

`docs/PLAN.md` is the plan: four work packages, testnet first. `docs/DEVELOPMENT_PHASES.md` holds the
detailed acceptance checks per phase; it is 2534 lines, so read only the range you need from the
index below: `sed -n '1486,1586p' docs/DEVELOPMENT_PHASES.md`.

## Git (changed 2026-10-08: Claude owns it)

- Three branches only: `main`, `testnet`, `mainnet`. Never create another branch.
- Work on `main`: commit and push straight to `origin/main`. No PRs, no GitHub Actions.
- Deploy testnet: `git push origin main:testnet`. Deploy mainnet (launch only, ask first):
  `git push origin main:mainnet`. Railway `testnet` env and Vercel follow `testnet`; Railway `mainnet`
  env follows `mainnet`. A push to `main` deploys nothing.
- Commit messages: one short line, lowercase, `type: what` (`feat: crypto set on testnet`). No body,
  no trailers. **Never add a `Co-Authored-By` line, a "Generated with" line or any Claude/Anthropic
  mention** in a commit, PR or file header; the operator does not want Claude in the contributors.
- Stage explicit paths, never `git add -A`, so no dotenv file can be staged. Never force-push.
- Run `pnpm typecheck && pnpm lint && pnpm test` (and `forge test` if contracts changed) before a push.
  The gate is local; there is no CI.

## Hard rules

- **One wallet per chain.** Testnet: the deployer `0x75962B2A0750293E01E8205b31717329Fae78147` is
  admin, quoter, keeper, liquidator, pauser, maker and owner of every mock feed. Mainnet: the owner
  `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`. No other signing key, except the simulator's derived bot
  wallets. Testnet and mainnet keys never share an environment. `KEEPER_PRIVATE_KEY` is the deployer
  key under another name.
- **A phase is done only when its acceptance check passes.** Report `pass`, `amber` or `fail` in one
  line. Do not tick something because it looks finished.
- **Secrets never reach a commit, an evidence file or the transcript.** Addresses are fine. Never
  read, print or stage `.env` or `.env.testnet`; source them in a subshell, never `cat` them.
- **Nothing is hardcoded.** Chain IDs, RPC URLs, addresses, leverage caps, fee percentages and
  market groups stay in `packages/config` or the environment.
- **`docs/UI_CONTRACT.md` governs every interface change.** No new colours, radii or fonts. Seven
  states per screen. No signature without a review step. No raw revert strings on screen.
- **Drizzle owns the schema.** `services/indexer/src/db/schema.ts` is the source of truth. Drizzle is
  the only migration system.
- **Testnet and mainnet never share a database.** Railway runs compute _and_ Postgres, in two
  environments, `mainnet` and `testnet`, each with its own Postgres. One `DATABASE_URL` per
  environment serves runtime and migrations.
- **Sample data is always labelled.** No exceptions, no dismissable notices.
- **A paused market is a shipped market.** It renders, it prices, it refuses trades.
- **Ask only when the answer changes what gets built.** Otherwise state the assumption and keep
  moving. Ask before anything that spends mainnet money or flips Vercel/Railway to mainnet.

## Evidence

One file for the whole run: `docs/evidence/testnet.md` (mainnet adds `docs/evidence/mainnet.md`).
Transaction hashes, not prose. UI work attaches screenshots at 375 px and 1440 px.

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
file is edited; re-check with `grep -n '^#### Phase' docs/DEVELOPMENT_PHASES.md`. Phases 0–10 are
done; Phase T0 is done; Phase T is amber (finished by work package 3 in `docs/PLAN.md`).

| Phase   | Lines     | Phase | Lines     |
| ------- | --------- | ----- | --------- |
| 11      | 1486-1586 | 15    | 1906-2068 |
| 12      | 1587-1654 | **L** | 2069-2126 |
| 13      | 1655-1716 | 16    | 2127-2204 |
| 14      | 1717-1797 | 17    | 2205-2311 |
| 14b     | skipped   | 18    | 2312-2534 |

## Scope

No smart-contract audit is in scope (`docs/DEVELOPMENT_PHASES.md` Section 0.8). The local
`/security-review` on a diff is not an audit and does not change that.
