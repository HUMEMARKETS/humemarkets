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
| 2 | Product features on testnet: crypto set (4 markets, mock feeds), plain-language failure states, mobile and keyboard pass, copy-trading entry point | 11, 12, 13, 14 | **done 2026-10-08** (Phase 11 mainnet half deferred to WP4); gate green |
| 3 | Testnet live and demo-ready: Railway `testnet` env, Vercel on testnet, pool funded, simulator running, Tier A walkthrough, shot list for the video | T (amber items), 15 | **Live 2026-10-08**: site, API, 25 markets, pool, lending, pause drill, shot list (`docs/evidence/shot-list.md`). Open: Railway keys (keeper, quotes), faucet gas, operator films 9 clips |
| 4 | Mainnet: delete testnet env, fund USDG, list the crypto set, caps, launch gate, open | L, 16 (reduced), 17, 18 | operator-approved; **blocked on USDG funding and an open date** |
| 5 | All eight features testable on testnet: China market, Pons market (buy Pons tokens), copy trading, plus a walkthrough of leaderboard and PnL card | 18 items 1b, 5, 7, 8 | each feature has a pass line in `docs/evidence/testnet.md`; gate green; deployed to `testnet` |

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

## Findings carried to WP4 (mainnet)

- Crypto listing (Phase 11 mainnet half): `AddMainnetMarket.s.sol` needs a feed-only path (no `symbol()` check when token is the feed), and `MAX_PRICE_AGE` must follow each feed's heartbeat. See `docs/evidence/testnet.md`.
- Testnet demo polish (WP3): the credit pair's caps display as 10^18 dollars; set demo-sized caps and seed the pair before filming.
- Fork suite (`MainnetFork.t.sol`) is 5 of 7: `launchListing...` is stale only outside US market hours; `deployedStackIsOwnedByTheDeployer` (`150000 != 0`) and `usdgDepositAndWithdraw...` (1000.15 vs 1000 USDG) need investigation. It skips silently unless `ROBINHOOD_MAINNET_RPC_URL` is set.


## WP5 — the eight features (2026-10-08)

Decisions: China and Pons are **not cut**. Pons means *spot*: a user buys a graduated Pons token (not HUME) on
the Hume site from the Pons market. Pons tokens trade in Uniswap v4 pools (ETH / token) on Robinhood Chain; the
v4 `PoolManager` `0x8366…0951` exists on testnet too, so the same router code is tested on both chains.

| Step | Work | Pass when |
| --- | --- | --- |
| 5a China | List BABA, TSM, EWY on testnet (mock token + feed owned by the deployer, `AddMarket.s.sol`); add quoted rows (UMC, FUTU, EWT, SIMO) with tier badge, source, age and no trade button; group label "China & Greater China"; simulator drives the three | `/v1/markets` has BABA/TSM/EWY; a perp opens on BABA; quoted rows show no trade button |
| 5b Pons | `HumePonsRouter` (v4 unlock callback, buy with ETH, sell for ETH, min-out, deadline); testnet mock Pons factory + 3 mock tokens + real v4 pools; API `/v1/pons/tokens` (factory `LaunchSwept` logs, `getTokenInfo`, pool price from `extsload`); web `/pons` list and token page with buy/sell behind the review step | buy and sell tx hashes on testnet; list renders at 375 and 1440 px; mainnet path reads the real factory |
| 5c Copy trading | `copy_follows` and `copy_executions` tables (Drizzle); follow, unfollow, list endpoints; follower makes a copy `Subaccount`, the executor is its delegate (cannot withdraw); executor service mirrors leader opens/closes within caps and records skips; web follow flow behind the review step, flag on | the five executor checks in Phase 18 pass on testnet |
| 5d Leaderboard + PnL card | Walk both on testnet with real fills; fix what breaks; 24h window | screenshots at 375 and 1440 px, card image renders |
| 5e Ship | gate, evidence, `git push origin main:testnet`, Railway/Vercel verify | each of the eight features has a `pass`, `amber` or `fail` line |

Gas: the testnet deployer holds about 0.003 ETH. Every deploy is sized to that; pools get thin liquidity.
