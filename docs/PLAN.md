# Hume — plan (2026-10-08)

Goal now: the full product live on **testnet 46630** so the operator can screen-record the demo.
Mainnet follows. One wallet per chain, three git branches, push to `main`, deploy by pushing
`main:testnet` or `main:mainnet`. Rules live in `CLAUDE.md`; per-phase acceptance detail in
`docs/DEVELOPMENT_PHASES.md` (ranges in the CLAUDE.md index).

## Work packages

| WP | What | Phases folded in | Done when |
| --- | --- | --- | --- |
| 0 | Workflow reset: 3 branches, no Actions, Claude-free commits, Railway/Vercel follow `testnet`/`mainnet` | — | `git branch -r` shows main, testnet, mainnet; Railway `testnet` services track `testnet`; Vercel production branch is `testnet` |
| 1 | One wallet on testnet: every mock feed owned by the deployer, keeper/simulator use the deployer key | T0 follow-up | 21 of 21 feeds `owner()` is the deployer (**done 2026-10-08**, `docs/evidence/testnet.md`) |
| 2 | Product features on testnet: crypto set (4 markets, mock feeds), plain-language failure states, mobile and keyboard pass, copy-trading entry point | 11, 12, 13, 14 | each phase's acceptance check in `DEVELOPMENT_PHASES.md`; `pnpm typecheck && lint && test` green |
| 3 | Testnet live and demo-ready: Railway `testnet` env, Vercel on testnet, pool funded, simulator running, Tier A walkthrough, shot list for the video | T (amber items), 15 | operator can open the Vercel URL, trade, get liquidated on camera; `docs/evidence/testnet.md` complete |
| 4 | Mainnet: delete testnet env, fund USDG, list the crypto set, caps, launch gate, open | L, 16 (reduced), 17, 18 | operator-approved; **blocked on USDG funding and an open date** |

## Order and parallelism

WP0 then WP1 (done) then WP2 then WP3. WP2 items are independent features but touch the same web
files, so they run serially, one commit each to `main`. WP4 starts only after the operator has
recorded the demo.

## Faster loop

- One commit per feature to `main`, gate local, no PRs, no per-phase evidence file, no Ship blocks.
- Skills: `lean-build` for each feature, `surgical-patch` for fixes, `verify-and-stop` for gates,
  `run` for 375/1440 screenshots, `simplify` then `code-review` before the testnet deploy,
  `deploy-checklist` before WP3 and WP4.

## Single-wallet consequences

- Testnet: the deployer is also the simulator's price pusher, so a Railway keeper pass and the local
  simulator can race on nonces. A failed push retries on the next step (15 s), which is acceptable on
  testnet. The simulator's ten bot wallets are derived in code and funded by the deployer; the operator
  does not manage them.
- Mainnet: the owner key `0xd09D…9a7C` would be admin, quoter, keeper, liquidator and pauser, and would
  sit in Railway's environment to sign. Phase 16 shrinks to "grant the roles to the deployer and run
  one pause drill". A leaked Railway variable then means full control of the vault. This is the
  operator's decision (2026-10-08); revisit before real money grows.
