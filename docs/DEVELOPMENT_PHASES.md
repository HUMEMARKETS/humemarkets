# Hume — Development Phases

**The work sequence.** Claude is the main developer; this file is the instruction set it follows, in
order. Every phase states its scope, the exact files and commands, and an acceptance check someone else
can verify.

- **Target:** Hume live on Robinhood Chain mainnet (chain ID `4663`)
- **Launch:** **date set by the operator** (the original 2026-10-06 passed). Open 30 minutes after the US
  equity open on a trading day, so the feeds are fresh (Section 3.2): **21:00 WIB = 14:00 UTC** while US
  daylight time runs, **22:00 WIB = 15:00 UTC** from 2026-11-01
- **Launch shape — testnet first (re-planned 2026-10-07).** Every remaining phase builds and verifies on
  Robinhood testnet (chain ID `46630`), where gas and collateral cost nothing. Mainnet money (USDG, the
  mainnet Railway compute, the paid plan) is spent only in **Phase L**, just before the open. Section 0.9
- **Audit: skipped. No phase waits on a security review.** Decided 2026-10-03 and confirmed. Section 0.8
- **Hosting:** a pnpm + Turborepo monorepo (`REFERENCE.md` Section 1.0). **Railway** runs the services
  **and** Postgres, **Vercel** serves the web app. Changed 2026-10-04 — Section 0.1
- **Budget:** $5–6 total
- **Repository:** `/home/bennyworkstation/next_project/hume`

## The other three files

This file changes constantly during execution, so the parts that do not change were moved out:

| File                                 | Holds                                                                                     | Read it                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------- |
| [`REFERENCE.md`](REFERENCE.md)       | What already exists; the measured market coverage — 194 assets, 58 feeds, 282 Pons tokens | Once, then for coverage questions |
| [`LAUNCH_MODEL.md`](LAUNCH_MODEL.md) | The eight features; no audit; Option A's cuts; the feature state at open                  | When scope is questioned          |
| [`UI_CONTRACT.md`](UI_CONTRACT.md)   | The eight interface rules; the palette; the zupiter.tech mapping                          | Before any interface change       |

**Read Section 0 first.** It holds the unresolved blocker and the access facts the whole plan assumes.

## How to run this

Every phase below carries a **Prompt** block. Paste it and the phase runs — the prompt names the files
to read, the work, the acceptance check, and the instruction to stop afterwards. No other context is
needed; the prompts are self-contained on purpose, so a phase can be run in a fresh session.

| Stage                         | Prompt order                                                       |
| ----------------------------- | ------------------------------------------------------------------ |
| **Done** (2026-10-04 to 10-07) | Phase 0 to 10. Ambers carried: 5, 6, 8, 9, 10 (Section 0.9)        |
| **Testnet**                   | **Phase T**, then 11, 12, 13, 14, 14b, 15 — all on chain `46630`   |
| **Mainnet**                   | **Phase L**, then 16, 17 — the open                                |
| After                         | Phase 18                                                           |

**No phase carries an hour estimate.** Claude does the work, so the plan is an ordered list, not a
timetable: run each phase, pass its acceptance check, run the next. The open has no fixed date now: the
operator sets it, at the hour in Section 3.2. The only resource that is actually scarce is the $5-6
budget (Section 1).

**Phase 14b (the mainnet/testnet toggle) is optional by design.** Nothing waits on it, so it is the first
phase to skip; it then becomes Phase 18 item 1c. Testnet-first makes it more useful than before: it is
how a visitor reaches the testnet build from the public site.

Each phase also carries a **Ship** block: the exact `git` and `gh` commands for its branch, commit, push
and PR. **The operator runs those, not Claude** (Section 0.6). The prompts enforce it — each one ends
with "do NOT commit, push, stage or open a PR", and asks Claude to list the changed paths and print the
Ship block instead.

**Four rules the prompts enforce:**

1. **One phase per prompt.** Each ends with "do not start Phase N+1". A phase that fails stops the run.
2. **Acceptance, not vibes.** Nothing is ticked because it looks finished. Evidence goes to
   `docs/evidence/phase-N.md` with transaction hashes.
3. **Claude never touches git.** It writes files and reports; the working tree is left dirty for you.
4. **Phase 17 asks before the first unpause.** It is the only irreversible phase.

**Before Phase 0's Ship block works, add a git remote** — there is none today. Section 0.7.

**Runnable today without the missing prerequisites:** Phases 0, 1, 2 and 3. Phase 4 needs
`.env`; Phase 6 needs DNS or a decision to launch on a Vercel URL. See Section 0.1.

---

## Feature tracker

One row per feature, for progress at a glance. It duplicates nothing: the phases are the source of
truth and this table only points at them. `LAUNCH_MODEL.md` Section 1 defines what each feature is.

| #   | Feature               | Phases that touch it | State at open                         | Gate |
| --- | --------------------- | -------------------- | ------------------------------------- | ---- |
| 1   | Perps                 | 4, 6, 15, 17         | **Open**, capped, 32 equity markets   | 6    |
| 2   | Options               | 4, 6, 15, 17         | **Open**, capped                      | 6    |
| 3   | China market          | 2, **18**            | Cut from launch — research done       | —    |
| 4   | Pons market           | **18**               | Cut from launch — stack ported        | —    |
| 5   | Leaderboard           | 10, 15, 17           | **Open**, one window (`all`)          | 10   |
| 6   | PNL card              | 10, 15, 17           | **Open**                              | 10   |
| 7   | Copy trading          | 14, **18**           | Entry point only, flag off            | 14   |
| 8   | Lending / borrowing   | 4, 9, 15, 17         | **Open**, 1 pair, owner-seeded        | 9    |
| +   | Crypto markets        | 11, 15, L, 17        | **Open** — BTC, ETH, LINK, GLD        | 11   |
| +   | Sample mode           | 7, 15, 17            | **Live** — hard gate                  | 7    |
| +   | Guided review         | 8, 15, 17            | **Live** — hard gate                  | 8    |
| +   | Plain-language states | 12, 15, 17           | **Live** — hard gate                  | 12   |
| +   | Mobile and keyboard   | 13, 15, 17           | **Live** — hard gate                  | 13   |
| +   | Network toggle        | 14b, **18**          | Optional — cut first if time is short | —    |

The four `+` interface rows are not on the original feature list. They are hard gates anyway, because
shipping markets nobody can use is the failure this plan exists to avoid — see `UI_CONTRACT.md`
Section 1.

---

## 0. Prerequisites, access and the funding blocker

### 0.1 Access, verified on the machine 2026-10-03

Checked rather than assumed. Three items were reported available and measured otherwise.

| Resource                   | Verified state                                                                                                                                                                                                            | Used by                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Railway CLI                | **Account changed 2026-10-04.** Hume lives in a project on a **second email**, id `fcfcb48b-28fc-4469-8e70-3f3fdae9d235`. Runs compute **and** Postgres, on a **free or trial plan** — Phase 5 holds what that constrains | Phase 5                 |
| Supabase                   | **Dropped 2026-10-04 — project limit reached.** Postgres moved to Railway. No Supabase project, no `supabase` CLI, and nothing in the code ever imported its SDK                                                          | —                       |
| Railway MCP in Claude Code | **Needs re-auth.** It is authenticated as the first account and returns `You don't have the required role (viewer)` on the new project. Run `/mcp` in a fresh session before Phase 5                                      | Phase 5                 |
| Vercel CLI                 | **OK** — logged in as `rubencahyadi504-9120`                                                                                                                                                                              | Phase 6                 |
| Mainnet RPC `4663`         | **OK** — reachable, block 79,197,152                                                                                                                                                                                      | Most phases             |
| Testnet RPC `46630`        | **OK** — reachable, `eth_chainId` returns `0xb626`                                                                                                                                                                        | Phase 15                |
| Toolchain                  | **OK** — node v24.16.0, pnpm 9.15.0, forge 1.8.3, `node_modules` present, `turbo typecheck` passes                                                                                                                        | All                     |
| **`.env`**                 | **MISSING.** No `.env` and no `packages/contracts/.env` anywhere in the repo — only `.env.example`. `.env*` is correctly gitignored (`.gitignore:45`)                                                                     | **Blocks 4, 9, 11, 16** |
| **`hume.tech` DNS**        | **NOT RESOLVING.** Registered in whois, but no A record and no NS records                                                                                                                                                 | **Blocks 6**            |
| **Vercel `hume-mainnet`**  | **DOES NOT EXIST.** Projects are `alphamarkets`, `leverage-market-web`, `alphaperp-web` and four unrelated. The old README's claim that `hume-mainnet` serves `hume.tech` was never true                                  | **Blocks 6**            |
| Screen recorder            | `ffmpeg` present; `wf-recorder`, OBS, grim absent. **X11 + XFCE**, so `ffmpeg -f x11grab` or `simplescreenrecorder` works with no install                                                                                 | Phase 15                |

**Consequence.** Phases 0 to 3 need none of the missing items and can run now. Phase 4 stops without
`.env`. Phase 6 needs either DNS plus a Vercel project, or an explicit
decision to launch on a `*.vercel.app` URL and attach the domain afterwards.

**Owed by the operator, in order:**

1. Write `.env` from `.env.example` with the owner key, plus `CHAIN_ID=4663` and `RPC_URL`. Same for
   `packages/contracts/.env`. Claude will not ask for a key in chat; it goes in the file.
2. Fund the owner wallet with USDG (Section 0.3).
3. Point `hume.tech` at Vercel, or say to launch on a Vercel URL.

### 0.2 Owner wallet, measured not assumed

Read directly from `https://rpc.mainnet.chain.robinhood.com` on 2026-10-03, block **79,173,830**:

| Field         | Value                                        |
| ------------- | -------------------------------------------- |
| Owner address | `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C` |
| Gas balance   | `0.000374962177736677` ETH                   |
| USDG balance  | `0.295277` USDG                              |
| USDG decimals | 6 (confirmed on chain)                       |

**Gas is sufficient.** Robinhood Chain prices gas at roughly 0.01 gwei — Levier's receipt shows
1,413,750 gas costing 0.0000141375 ETH. The current balance therefore buys about **37 million gas**,
against an estimated 10–12 million for everything this plan deploys. No gas top-up is required for the
contract work, though each new key in Phase 16 needs its own small float.

### 0.3 THE BLOCKER: USDG

**0.295277 USDG is 29.5 cents.** It cannot fund a vault reserve, a lending pair, or one real test trade.
Three phases depend on it directly:

| Phase | Needs USDG for                               | Minimum to be meaningful   |
| ----- | -------------------------------------------- | -------------------------- |
| 4     | Sizing the caps against real holdings        | Must know the final figure |
| 6     | One real perp and one real option round trip | ~$1                        |
| 9     | Seeding the TSLA/USDG credit pair            | ~$2                        |
| 17    | A vault pool reserve that is not zero        | ~$1                        |

**Action required before Phase L** (was Phase 4; moved by the testnet-first re-plan, Section 0.9): convert
the USDG part of the budget on chain 4663 at
`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, held by the owner address above. Target **$4–5 USDG**,
leaving the rest for the Railway subscription.

**If USDG is not funded by the start of Phase 4**, the plan degrades as follows rather than stopping:

1. Phase 4 caps are set to the smallest non-zero values the contracts accept.
2. Phase 6 verifies the trade path in sample mode and on testnet only; the mainnet round trip moves to
   Phase 18. Gate 6 goes amber, recorded.
3. Phase 9 deploys the credit stack and the pair but **seeds nothing**, and the pair ships
   listed-and-paused. Gate 9 goes amber.
4. Everything else — all five UI gates, the leaderboard, the PNL card, the crypto set, the walkthrough,
   rails — is unaffected, because none of it needs USDG.

That degradation is survivable. It is not the intended launch, so fund the wallet.

### 0.4 Key plan, decided 2026-10-03

Five distinct keys replace today's single environment variable. Claude generates four of them locally,
writes them to `.env`, and prints the addresses for funding. **The deployer stays
`0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`** and is never regenerated — it owns every deployed proxy.

| Role       | Key source                    | Env variable             | Gas float needed      |
| ---------- | ----------------------------- | ------------------------ | --------------------- |
| Deployer   | **Existing, unchanged**       | `DEPLOYER_PRIVATE_KEY`   | Already funded        |
| Quoter     | Generated by Claude, Phase 16 | `QUOTER_PRIVATE_KEY`     | None (signs offchain) |
| Keeper     | Generated by Claude, Phase 16 | `KEEPER_PRIVATE_KEY`     | ~0.00005 ETH          |
| Liquidator | Generated by Claude, Phase 16 | `LIQUIDATOR_PRIVATE_KEY` | ~0.00005 ETH          |
| Pauser     | Generated by Claude, Phase 16 | `PAUSER_PRIVATE_KEY`     | ~0.00005 ETH          |

Generated keys are written to `.env` only. `.env` is gitignored; Claude verifies that before writing and
never prints a private key into the transcript, a commit, or an evidence file — only addresses.

### 0.5 One ambiguity to confirm

The launch time was given as "14:00 AM WIB". This plan read it as 14:00 WIB (2 PM), and **Section 3.2
then moved the open to 21:00 WIB for a technical reason**: at 14:00 WIB the US equity session is shut and
every equity feed reads 16–27 hours old, so the venue would open with every equity market closed. If
02:00 WIB was meant, say so and the schedule is re-cut around it; nothing else in the plan changes.

### 0.6 Working agreement

- **Who does what:** Claude writes the code and the evidence. **The operator runs every `git commit`,
  `git push` and `gh pr create`.** Claude never commits, never pushes, never opens a PR, and never
  stages files. Each phase ends with Claude reporting the result and handing over the **Ship** block.
- **Evidence:** `docs/evidence/phase-N.md` per phase, plus `docs/evidence/dry-run.md` and
  `docs/evidence/launch-gate.md`. Transaction hashes, not prose. UI phases also attach screenshots at
  375 px and 1440 px.
- **Reporting:** at the end of each phase Claude reports the acceptance result — pass, amber or fail —
  in one short message, and does not start the next phase if the current one failed.
- **Blocking versus proceeding:** Claude asks only when an answer changes what gets built. Anything
  else gets a stated assumption and keeps moving.
- **Secrets:** never in a commit, an evidence file or the transcript. Addresses are fine.

### 0.7 Shipping: one branch and one PR per phase

**Prerequisite, unresolved:** `git remote -v` is **empty**. There is no remote, so `git push` and
`gh pr create` both fail today. The history shows merges from `Alpha-Markets/`, so the remote was lost
when this directory was copied. `gh` itself is fine — authenticated as `rubengitdev`.

Fix it once, before Phase 0's Ship block:

```bash
# Either re-attach the existing repository
git remote add origin https://github.com/Alpha-Markets/hume.git

# Or create a fresh one under your account and push main
gh repo create hume --private --source=. --remote=origin
git push -u origin main
```

**The pattern, every phase.** One branch, one commit, one PR, based on `main`:

```
phase-NN-<slug>  ──commit──►  push ──►  gh pr create --base main  ──►  merge
```

Branch off an up-to-date `main` each time, so Phase N+1 starts from Phase N's merged work:

```bash
git checkout main && git pull
git checkout -b phase-NN-<slug>
```

**Conventions.** Conventional Commits for the subject. The PR title is `Phase N — <title>`. The PR body
states what changed and quotes the phase's acceptance result, so the gate in Phase 17 can be assembled
from the PRs alone. **Never stage `.env`** — it is gitignored, and every Ship block below names its
paths explicitly rather than using `git add -A`, for exactly that reason.

**The one exception is Phase 0.** Its branch carries the 253-file rebrand as its own commit before the
evidence commit, because that work predates this plan.

### 0.8 No audit, and nothing in this plan waits on one

Confirmed 2026-10-03. The goal is to launch as soon as possible, so a smart-contract audit is **out of
scope entirely** — not deferred, not pending, not a Phase 18 item.

**Verified across the repository, so nothing blocks on it by accident:**

| Checked                                  | Result                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Any audit step in Phases 0–18            | **None.** No phase has an audit, a security review or an external sign-off                               |
| The Phase 17 launch gate, all 17 rows    | **No audit row.** Nothing in the gate references a review                                                |
| `.github/workflows/`                     | **No audit job.** `ci.yml`, `contracts.yml` and `release-sdk.yml` gate on lint, typecheck and tests only |
| `packages/contracts/script/`, `scripts/` | **No audit script.** The only `audit`-named thing is `check-brand.sh`, a naming check                    |
| Phase 18's deferred list                 | **No audit item.** A multisig and timelock for the owner role is there; a review is not                  |

**Where the word still appears, and why that is correct:**

- **The "unaudited" notice** on every page with a trade button, and in the connect explainer. That is a
  disclosure to users, not an audit step, and it is gate 17. Keep it.
- **Phase 1 "brand audit"** and Phase 3's state inventory. Different sense of the word; neither involves
  a security review.

**What stands in for an audit.** Four controls, each a phase rather than an intention. This is a bound on
the loss, not a claim of equivalent safety:

1. The testnet walkthrough is a hard gate before the open (Phase 15).
2. Caps are tiny and enforced on chain, sized against the real balance (Phase 4).
3. Only the owner wallet seeds liquidity. No external deposits are solicited on day one.
4. Pause is rehearsed on both chains before the open (Phase 15 and Phase 16).

The repository's own test suite — 48 files across 14 directories, including invariant, fork and
integration suites — is the standing evidence, and `REFERENCE.md` Section 1 records it.

**What actually gates the launch date now.** Not a review. Three operator items, all in Section 0.1 and
0.3: add a git remote, write `.env`, fund the wallet with USDG. Phases 0 to 3 run without any of them.

### 0.9 Testnet first, decided 2026-10-07

The operator's call: test the whole product on testnet, and pay for mainnet only at launch. Until then
the plan was mainnet-first, with testnet arriving at Phase 15. What was already done stays done:

| Already on mainnet                                   | Cost while idle | What happens to it                                     |
| ---------------------------------------------------- | --------------- | ------------------------------------------------------ |
| Contracts, 32 markets, deployed and paused           | $0              | Kept. Opening is an unpause in Phase 17                |
| Railway `mainnet` environment: api, pricing, indexer | ~$0.21/day      | **Stopped in Phase T** (operator confirms), back in Phase L |
| Railway `mainnet` Postgres                           | a few cents/day | Kept, so the indexed history survives                  |

**The ambers this closes on testnet, for $0:** Phase 8 (perp and option review figures in a browser,
because simulator prices move at any hour; connected mode with a testnet wallet), Phase 9 (the credit
pair deployed and seeded with minted collateral), Phase 10 (the leaderboard deployed against the testnet
indexer). Their **mainnet** halves move to Phase L: the real round trip, the seeded pair, the mainnet
leaderboard.

**One environment at a time.** The account is on Railway's **Trial**: a one-time $5.00 credit from
2026-10-04, 30 days or until it is spent, then the **Free** plan with $1 a month. Phase 5 measured one
environment at **$0.21–0.26/day** (0.60–0.74 GB RAM across four services). Two environments double the
burn, and the trial limits RAM to 1 GB, which two environments would pass. So Phase T stops the mainnet
compute before it creates `testnet`, and Phase L does the reverse.

**What the launch actually costs.** $1 a month cannot run the four always-on services (~$6.30/month
measured), so unless the open lands while trial credit is left, the open needs **Railway Hobby, $5/month
including $5 of usage** (about $1.30/month over at the measured rate), plus **$4–5 of USDG**. That is
about **$10–11 for the first month**, not $5–6. The operator decides between paying that, opening while
trial credit remains, or opening with USDG unfunded under Section 0.3.

---

## 1. Budget

| Item                                                     | Cost                  | Note                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract deployments (credit, listings, caps, config)    | ~$0 of new spend      | Owner wallet's 0.000375 ETH already buys ~37M gas (Section 0.2)                                                                                                                                                                                                             |
| Gas floats for keeper, liquidator, pauser                | ~0.00015 ETH          | Phase 16                                                                                                                                                                                                                                                                    |
| **USDG for pool reserve, credit seed, real test trades** | **$4–5 — NOT FUNDED** | **Section 0.3. The one real blocker**                                                                                                                                                                                                                                       |
| Railway — compute (indexer, API, pricing, keeper)        | ~$0.21–0.26/day       | **One environment at a time** (Section 0.9): `testnet` from Phase T to Phase L, `mainnet` from Phase L on. Trial: one-time $5 to ~2026-11-03. Free after that: $1/month, too little for four always-on services. Hobby: $5/month with $5 included, needed at the open unless trial credit remains |
| **Railway Postgres — one per environment**               | **usage-based**       | Supabase's project limit was reached 2026-10-04. **Free and Trial cap the volume at 0.5 GB**, so `PRICE_TICK_RETENTION_DAYS` is sized against that in Phase 5. The `testnet` Postgres is created in Phase T and deleted in Phase L; the `mainnet` one is kept throughout |
| Vercel (web)                                             | $0                    | Hobby plan. **DNS not pointed yet** — Section 0.1                                                                                                                                                                                                                           |
| Domain                                                   | $0                    | Already held                                                                                                                                                                                                                                                                |
| Testnet walkthrough, recording and sample mode           | $0                    | Faucet gas; the collateral token has a public `mint`                                                                                                                                                                                                                        |

**Testnet stage: $0 beyond trial credit. Open: ~$10–11 for the first month** (Hobby $5 + ~$1.30 usage over
+ $4–5 USDG), then ~$6.30/month, unless the open lands while trial credit remains (Section 0.9). Section
0.3 still degrades rather than stalls if USDG is not funded.

---

## 2. Phases

Do not start a phase until its predecessor's acceptance check passes. The order is the plan; there are
no time estimates.

### Day 1 — foundation, the UI contract, backend

#### Phase 0 — Freeze and inventory

**Prompt.** Paste this to run the phase.

```text
Run Phase 0 of docs/DEVELOPMENT_PHASES.md: freeze and inventory.

Read Section 0 of that file first, then the Phase 0 body.

Do not commit anything. Verify .env* is gitignored, then leave the in-flight alphamarkets-to-hume
rebrand in the working tree for me to commit. Verify every address in packages/contracts/deployments/robinhood_mainnet.json
has bytecode on https://rpc.mainnet.chain.robinhood.com. Read the proxy owner of marketRegistry and
vault. Re-read the owner wallet's USDG and gas balances with the block number. Run
packages/contracts/script/check-admin-roles.sh.

Acceptance: docs/evidence/phase-0.md lists every address with code yes/no and its owner, both
balances with a block number, and the admin-role output.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail in one short message, list the paths you changed, then print the
Phase 0 Ship block for me to run. Do not start Phase 1.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-00-freeze

git add -A  # the 253-file rebrand; .env is gitignored so nothing secret is staged
git commit -m "chore(rebrand): rename alphamarkets to hume across the monorepo"
git add docs/evidence/phase-0.md
git commit -m "docs(phase-0): record the mainnet address and owner inventory"

git push -u origin phase-00-freeze

gh pr create --base main \
  --title "Phase 0 — Freeze and inventory" \
  --body "Renames alphamarkets to hume across the web app, packages, services and assets, then records the verified state of the 21 mainnet contracts.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-0.md"
```

**Scope.** Commit the in-flight rebrand for a clean baseline. Confirm on-chain state before trusting the
deployment file.

**Work.**

1. Leave the 253-file rebrand staged-ready but **uncommitted** — the operator commits it on the
   `phase-00-freeze` branch via this phase's Ship block. Verify `.env*` is gitignored before anything
   else, so no secret can reach that commit.
2. For each address in `robinhood_mainnet.json`, `eth_getCode` against the mainnet RPC; confirm bytecode.
3. Read the proxy owner of `marketRegistry` and `vault`; confirm it is the Section 0.2 address.
4. Re-read the owner's USDG and gas balances. Section 0.2's figures are from 2026-10-03 and the USDG
   number is expected to change once Section 0.3 is actioned.
5. Run `packages/contracts/script/check-admin-roles.sh` and record which roles sit on one key.

```bash
pnpm install
git check-ignore -v .env            # must print a .gitignore rule
bash packages/contracts/script/check-admin-roles.sh
```

**Done when.** `docs/evidence/phase-0.md` lists every address with `code: yes/no` and its owner, the two
balances with a block number, and the admin-role output.

**Cost.** $0, reads only.

#### Phase 1 — Brand audit

**Prompt.** Paste this to run the phase.

```text
Run Phase 1 of @docs/DEVELOPMENT_PHASES.md: brand audit.

No alphamarkets, alpha-market or AlphaMarkets string may ship in code, metadata, the SDK package name
or UI copy. Run scripts/check-brand.sh, fix what it reports, then extend it to fail on the old names.
Check apps/web/src/app/layout.tsx, opengraph-image.tsx, packages/sdk/package.json, packages/ui and
the README.

Acceptance: check-brand.sh exits 0; grep -ri alphamarket over the repo excluding node_modules, .git
and docs returns nothing; pnpm turbo run lint typecheck passes.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 1 Ship block for me to
run. Do not start Phase 2.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-01-brand

git add scripts/check-brand.sh apps/web packages .github docs/evidence/phase-1.md
git commit -m "chore(brand): fail the build on legacy brand strings"

git push -u origin phase-01-brand

gh pr create --base main \
  --title "Phase 1 — Brand audit" \
  --body "Removes the remaining legacy brand strings and extends check-brand.sh to fail on them, so they cannot come back.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-1.md"
```

**Scope.** No `alphamarkets`, `alpha-market` or `AlphaMarkets` string in shipped code, metadata, the SDK
package name or UI copy.

**Work.** Run `scripts/check-brand.sh`, fix what it reports, extend it to fail on the old names. Check
`apps/web/src/app/layout.tsx`, `opengraph-image.tsx`, `packages/sdk/package.json`, `packages/ui`, README.

```bash
bash scripts/check-brand.sh
grep -ri alphamarket --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs .
pnpm turbo run lint typecheck
```

**Done when.** `check-brand.sh` exits 0, the grep returns nothing, `lint` and `typecheck` pass.

**Cost.** $0.

#### Phase 2 — Market groups in config

**Prompt.** Paste this to run the phase.

```text
Run Phase 2 of @docs/DEVELOPMENT_PHASES.md: market groups and listing tiers in config.

Read the Phase 2 body and REFERENCE.md Section 2 for the three-tier model.

Add MarketGroup (us-equities, china, crypto, pons) and ListingTier (tradeable, quoted, listed) to
packages/types. Add group and tier to the market shape in packages/config/src/deployments.ts with
marketsForGroup and marketsForTier accessors. Tag all 32 entries in robinhood_mainnet.markets.json as
tier tradeable, group us-equities. Keep groups and tiers as data in the deployment file, never
literals in app code.

Acceptance: pnpm turbo run test --filter @hume/config --filter @hume/types passes; a tier invariant
test fails when a quoted entry is given a feed address AND when a tradeable entry has none. Assert
both directions — this boundary is what stops a display price reaching settlement.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 2 Ship block for me to
run. Do not start Phase 3.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-02-config

git add packages/types packages/config packages/contracts/deployments docs/evidence/phase-2.md
git commit -m "feat(config): add market groups and listing tiers"

git push -u origin phase-02-config

gh pr create --base main \
  --title "Phase 2 — Market groups and listing tiers" \
  --body "Adds MarketGroup and ListingTier with group and tier accessors, and the invariant that a tradeable market has a feed while a quoted one does not. That boundary is what stops a display price reaching settlement.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-2.md"
```

**Scope.** The grouping concept the China market needs and Pons will need in Phase 18.

**Work.**

1. Add `MarketGroup` to `packages/types`: `us-equities`, `china`, `crypto`, `pons`.
2. Add **`ListingTier`** to `packages/types`: `tradeable`, `quoted`, `listed` — the three-tier model in `REFERENCE.md` Section 2.
   Both the China group and the Pons group depend on it, so it lands here, not later.
3. Add `group` and `tier` to the market shape in `packages/config/src/deployments.ts`, plus
   `marketsForGroup(chainId, group)` and `marketsForTier(chainId, tier)`.
4. Add `group` and `tier` to each entry in `robinhood_mainnet.markets.json`: all 32 are
   `tier: "tradeable"`, defaulting `group` to `us-equities`.
5. Groups and tiers stay data in the deployment file, read through config — no literals in app code.
6. Tests: an unknown group or tier is an error, never a silent empty list. **A `quoted` or `listed` entry
   must have no feed address, and a `tradeable` entry must have one** — assert both directions, because
   this is the boundary that stops a display price reaching settlement.

```bash
pnpm turbo run test --filter @hume/config --filter @hume/types
```

**Done when.** Tests pass, `marketsForGroup(4663, "china")` returns the China set from the file, and the
tier invariant test fails when a `quoted` entry is given a feed address.

**Cost.** $0.

#### Phase 3 — Palette, the UI contract and state inventory

**Prompt.** Paste this to run the phase.

```text
Run Phase 3 of @docs/DEVELOPMENT_PHASES.md: palette, the UI contract and the state inventory.

Read @docs/UI_CONTRACT.md in full first — it is the governing document and this phase finishes it.

Re-tokenize @apps/web/src/app/globals.css to the UI_CONTRACT.md Section 4 palette: charcoal ground,
ivory text, sage accent, stone secondary, with the derived up/down and elevation tokens. Keep every
token NAME identical so no component is renamed; this is a values-only change. Two rules that are not
preferences: a sage fill takes charcoal ink because ivory on sage is 3.81:1 and fails AA, and up/down
are direction only, never decoration. Sweep the places the old teal leaked: the up/down glow shadows,
HeroSilkBackground, opengraph-image.tsx, Logo and BrandLogos.

Then finish UI_CONTRACT.md: recompute the contrast table from the final values, fill the 8-pages-by-
7-states grid (this grid is the Phase 12 and 13 backlog), and write the Guided/Pro field split per
trading surface. Add a hex-literal check over apps/web/src and packages/ui/src wired into ci.yml.

Acceptance: globals.css carries only the new values; no stray teal on any page; the hex check fails on
a planted colour and passes once removed; the grid and the Guided/Pro split are written. Before-and-
after screenshots of all 8 pages in docs/evidence/phase-3.md.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 3 Ship block for me to
run. Do not start Phase 4.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-03-palette

git add apps/web/src/app/globals.css apps/web/src packages/ui scripts .github docs/UI_CONTRACT.md docs/evidence/phase-3.md
git commit -m "feat(ui): adopt the charcoal palette and publish the UI contract"

git push -u origin phase-03-palette

gh pr create --base main \
  --title "Phase 3 — Palette and UI contract" \
  --body "Swaps the design tokens to charcoal, ivory, sage and stone, values only with no token renamed. Adds the hex-literal check to CI and completes the UI contract with the state grid and the recomputed contrast table.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-3.md"
```

**Scope.** Re-tokenize `globals.css` to the `UI_CONTRACT.md` Section 4 palette, then turn the
`UI_CONTRACT.md` rules into a checked-in document and a state inventory, so the later UI phases are
execution rather than debate. First UI phase, deliberately on Day 1 — every later UI phase inherits
these tokens. (Nothing here is a security review; Section 0.8.)

**Work.**

1. **Replace the palette in `apps/web/src/app/globals.css`.** Swap the dark-teal `@theme` block for the
   `UI_CONTRACT.md` Section 4 tokens: `ground`, `surface`, `raised`, `line`, `text`, `muted`, `faint`, `accent`,
   `accent-ink`, `accent-hover`, `accent-press`, `up`, `down`, plus the soft variants the existing file
   uses. Keep every token **name** identical so no component needs renaming — this is a values-only
   change, and that is what keeps it a swap instead of a rewrite.
2. Re-run the contrast arithmetic on the final values and record the table in `docs/UI_CONTRACT.md`.
   Confirm the two `UI_CONTRACT.md` Section 4 findings hold: the primary button uses `accent-ink` (charcoal) and not
   ivory, and `up` / `down` are never used for decoration.
3. Sweep for the places the old palette leaked: the `--shadow-up-glow` / `--shadow-down-glow` halos
   rebuilt from the new `up` / `down`, `HeroSilkBackground` re-tinted, `opengraph-image.tsx`, and the
   `Logo` / `BrandLogos` marks.
4. Write `docs/UI_CONTRACT.md`: the eight rules, the final token table, the contrast table,
   the surface map, and the Zupiter adopt/reject table.
5. Audit all 8 pages against the seven states. Produce a grid, page by state, each cell pass, missing or
   broken. **This grid is the Phase 12 and 13 backlog** — without it those phases have no defined scope.
6. Decide the Guided/Pro field split per trading surface: what Guided sequences, what Pro shows at once.
   Record it; build nothing yet.
7. Add a hex-literal check to `scripts/check-brand.sh` (or a sibling script) covering `apps/web/src` and
   `packages/ui/src`, wired into `ci.yml`. It is the enforcement for rule 1, so it lands with the palette.
8. Set the motion budget: no animation over 200 ms in the app; motion allowed on the landing page.

**Done when.** `globals.css` carries only the `UI_CONTRACT.md` Section 4 values; the app renders charcoal-and-ivory with
a sage accent on every page with no stray teal; `docs/UI_CONTRACT.md` exists with the filled grid and the
recomputed contrast table; the hex check fails on a deliberately planted colour and passes once removed;
the Guided/Pro split is written per surface. Screenshots of all 8 pages before and after, in
`docs/evidence/phase-3.md`.

**Cost.** $0.

#### Phase 4 — Feed reality and launch caps

**Prompt.** Paste this to run the phase.

```text
Run Phase 4 of @docs/DEVELOPMENT_PHASES.md: feed reality and launch caps.

PREREQUISITE: .env with the owner key must exist, and the owner's USDG balance must be known. If
either is missing, stop and say so rather than guessing — Section 0.3 holds the degradation path.

Read all 32 feeds' latestRoundData and record each answer's age. Expect 16 to 27 hours outside the US
session; REFERENCE.md Section 2 finding 4 measured exactly that. Set the staleness limit per market in
PriceValidator session-aware: tight while the underlying's session is open, and outside the session
the market reads closed rather than halted. Never widen a limit to make a market pass during its own
session. Then size and apply the caps against the ACTUAL USDG balance: per-market open interest,
per-wallet position, per-market supply, vault pool reserve.

Acceptance: @docs/evidence/phase-4.md holds the feed-age table and the chosen numbers; the caps are set
on chain; bash packages/contracts/script/check-launch-limits.sh exits 0.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 4 Ship block for me to
run. Do not start Phase 5.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-04-caps

git add packages/contracts docs/evidence/phase-4.md
git commit -m "feat(risk): set session-aware staleness limits and launch caps"

git push -u origin phase-04-caps

gh pr create --base main \
  --title "Phase 4 — Staleness limits and launch caps" \
  --body "Sets the per-market oracle staleness limit session-aware, and the open interest, per-wallet and supply caps sized against the real USDG balance. Without an audit these caps are the primary loss bound.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-4.md"
```

**Scope.** Decide, in writing and on chain, the per-market staleness limit and the launch caps. Without
an audit these caps are the primary loss bound.

**Prerequisite.** Section 0.3. Size the caps against the **actual** USDG balance at the time this phase
runs, not against the hoped-for one.

**Work.**

1. For all 32 markets, read `latestRoundData` and record the answer age. `REFERENCE.md` Section 2 already did this
   once: on a Saturday every equity feed read 16–27 hours old. Expect the same and do not be surprised.
2. Set the staleness limit per market in `PriceValidator`, **session-aware per `REFERENCE.md` Section 2, finding 4**: a
   tight limit while the underlying's session is open, and outside the session the market reads _closed_
   rather than halted-and-broken. Never widen a limit to make a market pass during its own session —
   that trades on a stale price.
3. Apply, sized against the real balance: per-market open-interest cap (`SetNetOpenInterest.s.sol`),
   per-wallet position cap, per-market supply cap, vault pool reserve.
4. Run the limits check and wire it into the Phase 17 gate.

```bash
bash packages/contracts/script/check-launch-limits.sh
forge script script/SetNetOpenInterest.s.sol --rpc-url "$RPC_URL" --broadcast
```

**Done when.** `docs/evidence/phase-4.md` holds the feed-age table and the chosen numbers, the caps are
set on chain, and `check-launch-limits.sh` exits 0.

**Cost.** A few cents of gas.

#### Phase 5 — Mainnet backend bring-up

**Prompt.** Paste this to run the phase.

```text
Run Phase 5 of @docs/DEVELOPMENT_PHASES.md: mainnet backend bring-up.

Railway runs compute AND Postgres. Supabase was dropped on 2026-10-04 when its project limit was
reached, so ignore any Supabase instruction you find elsewhere in this file. Read the Phase 5 body
first.

PREREQUISITE: the Railway MCP must be authenticated against the account that owns project
fcfcb48b-28fc-4469-8e70-3f3fdae9d235. If a Railway call returns "You don't have the required role
(viewer)", stop and say so — the operator runs /mcp to re-authenticate. Do not create a project
anywhere else.

This repository is a pnpm + Turborepo MONOREPO. One repository, many deployables: packages/config,
types, ui, sdk, contracts; services/api, indexer, keeper, pricing, hedger, risk-monitor, simulator;
apps/web. Railway must build each service with its OWN root directory and pnpm --filter, so one
repository gives three separate deployments. Each service already carries a railway.json — read it
before inventing build settings. Never deploy the repository root as one service.

In that project, create the mainnet environment with a Postgres service plus services/indexer,
services/api and services/pricing. Do NOT create the testnet environment: its Postgres is created in
Phase 15 and deleted after the recording, to protect the budget.

THE ACCOUNT IS ON A FREE OR TRIAL PLAN, and this changes what is safe to build. Measured from
Railway's docs on 2026-10-04: the Free plan carries $0 subscription with only $1 of included usage per
month, 0.5 GB RAM and 1 replica per service, and a 0.5 GB volume cap. Trial carries a ONE-TIME $5
grant with 1 GB RAM and the same 0.5 GB volume cap. Resources bill at $10/GB/month RAM, $20/vCPU/month
CPU and $0.15/GB/month volume. Four always-on containers — indexer, api, pricing, Postgres — cost more
per month than $1 of included usage, and the indexer must not sleep.

So do three things rather than assume it fits:
1. Read the plan and the current usage from the Railway account and report both as numbers.
2. Size PRICE_TICK_RETENTION_DAYS against the 0.5 GB VOLUME CAP, not against a guess. It defaults to 8
   (services/indexer/src/index.ts:25). Measure the events and price_ticks growth rate per hour after
   the indexer catches up, extrapolate to the 2026-10-06 open and a week past it, and state the
   retention value that keeps the volume under 0.5 GB.
3. Set the smallest RAM that each service actually needs, and report the measured figure.

If the plan cannot carry four always-on services to the open, say so as a number and stop. Do not
upgrade a plan, add a payment method, or buy credit — that is the operator's decision, not yours.

One DATABASE_URL per environment covers runtime and migrations. Railway Postgres is a direct
connection, so there is no transaction pooler: prepare: false is NOT needed and DIRECT_DATABASE_URL is
NOT needed. Keep the existing transform: postgres.camel in services/api/src/db.ts. The three db clients
already read DATABASE_URL and need no change — confirm that rather than editing them.

Set CHAIN_ID 4663, RPC_URL, DATABASE_URL, INDEXER_START_BLOCK, API_PORT, PRICING_PORT,
PRICING_SERVICE_URL, CORS_ORIGINS, QUOTER_PRIVATE_KEY and QUOTER_ADDRESS. Run the Drizzle migrations.
Start the indexer from the deployment block, not genesis. PRICE_TICK_RETENTION_DAYS already prunes
ticks and defaults to 8; report the Postgres volume size so the operator can see what it costs.

Acceptance: GET /markets returns the listed mainnet markets with live prices;
indexer_state.last_indexed_block is within 10 blocks of the chain head; all three services connect to
Postgres with no error; the testnet environment is confirmed absent, not misconfigured; and
docs/evidence/phase-5.md records the plan, the measured usage, the volume growth rate and the chosen
PRICE_TICK_RETENTION_DAYS with the arithmetic behind it.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 5 Ship block for me to
run. Do not start Phase 6.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-05-backend

git add services packages/config .env.example docs/evidence/phase-5.md
git commit -m "feat(infra): bring up the mainnet indexer, API and pricing"

git push -u origin phase-05-backend

gh pr create --base main \
  --title "Phase 5 — Mainnet backend" \
  --body "Railway hosts compute and Postgres. Brings up the indexer, API and pricing services against chain 4663 in the mainnet environment, with a Railway Postgres service behind a single DATABASE_URL. Supabase was dropped on 2026-10-04 when its project limit was reached; no code change was needed, because nothing ever imported its SDK.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-5.md"
```

**Scope.** **Railway runs the services and Postgres.** Bring up the indexer, API and pricing against
chain 4663, with their data in a Railway Postgres service in the same project.

**Architecture, revised 2026-10-04.** The 2026-10-03 decision put Postgres on Supabase and used Railway
for compute only. **Supabase's project limit was reached, so Postgres moved to Railway.** The project is
`fcfcb48b-28fc-4469-8e70-3f3fdae9d235`, on a **second email** — see Section 0.1, including the MCP
re-auth this requires.

**Two environments, `mainnet` and `testnet`, each with its own Postgres service.** The convention that
testnet and mainnet never share a database still holds. The `levier` project already uses this exact
environment split, so the pattern is proven on this account.

**Only `mainnet` is created in this phase.** A Railway Postgres is billed on compute and volume while it
runs, and the whole budget is $5–6 including gas, so the testnet Postgres is created in Phase 15 for the
walkthrough and deleted after the recording. Phase 15 owns that step.

**The plan, measured from Railway's docs 2026-10-04.** The operator intends to run this on a free
account, so these are the numbers the phase has to fit inside:

| Plan      | Subscription | Included usage   | RAM / service | Replicas | Volume cap |
| --------- | ------------ | ---------------- | ------------- | -------- | ---------- |
| **Free**  | $0           | **$1 per month** | 0.5 GB        | 1        | **0.5 GB** |
| **Trial** | $0           | **$5, one time** | 1 GB          | 2        | **0.5 GB** |
| **Hobby** | $5 / month   | $5 per month     | 48 GB         | 6        | 5 GB       |

Resources bill on top: RAM $10/GB/month, CPU $20/vCPU/month, egress $0.05/GB, volume $0.15/GB/month.
Builds are free.

**Two consequences, and neither is a reason to change the plan without the operator.**

1. **$1 per month of included usage does not cover four always-on containers.** Indexer, API, pricing
   and Postgres at even 0.15 GB RAM each is 0.6 GB, roughly $6/month in RAM before any CPU, and the
   indexer must not sleep — there is no idle saving to find. Trial's one-time $5 reaches the
   2026-10-06 open comfortably; keeping the site up for a month after it does not fit either free plan.
   This is the operator's call, so the phase reports the number and stops rather than upgrading.
2. **The 0.5 GB volume cap binds before the credit does, and it applies to Free and Trial alike.**
   `events` is append-only and `price_ticks` grows continuously.

So `PRICE_TICK_RETENTION_DAYS` stops being a default and becomes a sized number. Measure the growth
rate per hour once the indexer has caught up, extrapolate to the open and a week past it, and record
the arithmetic in the evidence file. The default is 8 (`services/indexer/src/index.ts:25`).

**Monorepo deployment, not one service.** This is a pnpm + Turborepo monorepo: `packages/` holds
config, types, ui, sdk and contracts; `services/` holds api, indexer, keeper, pricing, hedger,
risk-monitor and simulator; `apps/web` is the Next.js app. Each service carries its own
`railway.json` — read it rather than inventing build settings. Railway builds each with its own root
directory and `pnpm --filter`, so one repository gives three separate deployments. Deploying the
repository root as a single service is wrong and will build everything.

**No code change is needed, and this is the part worth checking rather than assuming.** All three
clients already read a single `DATABASE_URL`:

```
services/indexer/src/db/client.ts:14      postgres(requireEnv("DATABASE_URL"))
services/risk-monitor/src/db/client.ts:10 postgres(requireEnv("DATABASE_URL"))
services/api/src/db.ts:12                 postgres(requireEnv("DATABASE_URL"), { transform: postgres.camel })
```

`services/indexer/src/db/migrate.ts` calls `getDb()`, so it uses the same variable. Nothing in
`services/`, `packages/` or `apps/` ever imported a Supabase SDK — verified 2026-10-04, zero matches —
so dropping Supabase touches documentation and environment variables only.

**One connection string, not two.** Railway Postgres is a direct connection with no transaction-mode
pooler, so the two things the Supabase plan required are both unnecessary here:

| Dropped               | Why it is not needed on Railway                                                       |
| --------------------- | ------------------------------------------------------------------------------------- |
| `prepare: false`      | No transaction pooler, so `postgres.js` prepared statements work as they do locally   |
| `DIRECT_DATABASE_URL` | One direct `DATABASE_URL` serves runtime and DDL both; Railway injects it per service |

Keep `transform: postgres.camel` in `services/api/src/db.ts` exactly where it is.

**Work.**

1. Confirm the Railway MCP reaches project `fcfcb48b-28fc-4469-8e70-3f3fdae9d235`. A
   `You don't have the required role (viewer)` error means it is still authenticated as the first
   account: **stop and hand back to the operator**, who runs `/mcp`. Do not create a project elsewhere.
2. Create the `mainnet` environment with a **Postgres service**. Record the service name and the
   injected `DATABASE_URL` reference — never the resolved string, which is a secret.
3. Deploy `services/indexer`, `services/api` and `services/pricing` into that environment from this
   monorepo — Railway builds each service with its own root directory and `pnpm --filter`, so one
   repository gives three deployments.
4. Set from `.env.example`: `CHAIN_ID=4663`, `RPC_URL`, `DATABASE_URL`, `INDEXER_START_BLOCK`,
   `API_PORT`, `PRICING_PORT`, `PRICING_SERVICE_URL`, `CORS_ORIGINS`, `QUOTER_PRIVATE_KEY`,
   `QUOTER_ADDRESS`, plus the `HUME_ADDRESSES` override if any address differs from the recorded file.
   Reference the Postgres service's variable rather than pasting a connection string.
5. Run the Drizzle migrations against that database.
6. Start the indexer from the deployment block, not genesis (`services/indexer/src/startBlock.ts`).
7. Bring up `services/api`; confirm `/markets`, `/prices`, `/portfolio`.
8. Start `services/pricing` for option quotes and Greeks.
9. **Report the Postgres volume size and what it is costing.** The append-only `events` table and
   `price_ticks` grow continuously, and on Railway that volume is billed rather than capped.
   `PRICE_TICK_RETENTION_DAYS` already prunes ticks and defaults to 8
   (`services/indexer/src/index.ts:25`); lower it if the volume grows faster than the budget allows.
   This replaces the Supabase free-tier size check, which no longer applies.

```bash
railway whoami                                 # must be the account owning fcfcb48b-...
railway variables --environment mainnet
pnpm --filter @hume/indexer exec tsx src/db/migrate.ts
psql "$DATABASE_URL" -c "select count(*) from events;"
curl -s "$API_URL/markets" | head -c 400
```

**Done when.** `GET /markets` returns the listed mainnet markets with live prices;
`indexer_state.last_indexed_block` is within 10 blocks of the chain head; the three services connect to
Postgres without error; and the `testnet` environment is confirmed **absent**, so Phase 15 creates it
rather than inheriting a half-configured one.

**Cost.** Railway for three services plus one Postgres, usage-based on top of the plan's included
usage. This is now the largest recurring line in the budget, because Supabase's $0 free tier is gone.
Report the **measured** figure in the evidence file — the plan, the current usage, the volume growth
rate — rather than an estimate, so Section 1 can be corrected against it. The free plans reach the
open; they do not keep the site up for a month after it.

### Day 2 — the product a stranger can use

#### Phase 6 — Web on mainnet

**Prompt.** Paste this to run the phase.

```text
Run Phase 6 of @docs/DEVELOPMENT_PHASES.md: web on mainnet.

NOTE: hume.tech does not resolve and no Vercel hume-mainnet project exists (Section 0.1). Either set
both up first, or confirm launching on a *.vercel.app URL with the domain attached later. Ask once,
then proceed.

Point the Vercel project at the mainnet API with NEXT_PUBLIC_CHAIN_ID=4663 and every NEXT_PUBLIC_*
value from .env.example. Add the unaudited notice as a layout-level banner in AppShell. Verify with a
browser wallet: connect, deposit USDG, open and close a small perp, buy and settle one option. Confirm
a paused market renders as paused with a live price and a disabled trade button — the crypto and
quoted work later depends on that path.

Degradation: if USDG is unfunded, do the config, the banner and the paused-market check, verify the
trade path in sample mode and on testnet, and mark gate 6 amber.

Acceptance: one real perp round trip and one real option round trip from the browser, hashes in
docs/evidence/phase-6.md; or the amber path recorded.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 6 Ship block for me to
run. Do not start Phase 7.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-06-web-mainnet

git add apps/web docs/evidence/phase-6.md
git commit -m "feat(web): serve the mainnet build with the unaudited notice"

git push -u origin phase-06-web-mainnet

gh pr create --base main \
  --title "Phase 6 — Web on mainnet" \
  --body "Points the web app at mainnet, adds the unaudited notice to every page with a trade button, and verifies one real perp and one real option round trip.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-6.md"
```

**Scope.** `hume.tech` serves a mainnet build. Perps and options tradeable within caps.

**Work.**

1. Point the Vercel `hume-mainnet` project at the mainnet API; set `NEXT_PUBLIC_CHAIN_ID=4663`,
   `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL=https://hume.tech`, and every
   `NEXT_PUBLIC_*` address from `.env.example`.
2. Add the unaudited notice as a layout-level banner in `AppShell`.
3. Verify with a browser wallet: connect, deposit USDG, open and close a small perp, buy and settle one
   option.
4. Confirm a paused market renders as paused, with a live price and a disabled trade button.

**Degradation.** If USDG is unfunded (Section 0.3), do steps 1, 2 and 4, verify the trade path in sample
mode and on testnet, and mark gate 6 amber.

**Done when.** One real perp round trip and one real option round trip complete from the browser, hashes
in `docs/evidence/phase-6.md`; or the amber path is recorded.

**Cost.** Gas, plus the USDG used as margin, returned on close.

#### Phase 7 — Sample mode: the product without a wallet

**Prompt.** Paste this to run the phase.

```text
Run Phase 7 of docs/DEVELOPMENT_PHASES.md: sample mode, the product without a wallet.

This is the highest-value phase in the plan. The stated reason the previous platform went unused is
the interface, and the wallet wall is the largest drop-off.

Add a sampleAccount zustand store with its own USDG balance, positions, orders, fills and a reset. Add
a useAccountMode() seam returning sample, connected or disconnected, and route every read and write
hook through it. Sample mode is a DATA-SOURCE SWAP, not a parallel UI — one component tree, or it
drifts. Prices are real from the public API; fills simulate locally against the real index price.
Default a first visit to sample mode with no connect wall. Mark it everywhere: a header chip, a mark
on every balance and position panel, and sample in the page title. Add the connect explainer: what a
wallet does here, that sample balances do not carry over, the caps, the unaudited notice. Simulate the
unhappy paths too — a rejected order, an insufficient-margin refusal, a liquidation.

Acceptance: in a clean browser profile with NO wallet extension installed, a visitor can land on the
site, read prices, place a sample perp, see the liquidation price, close it, read the PNL and view the
leaderboard — and every sample surface is marked. Screenshots at 375 px and 1440 px in
docs/evidence/phase-7.md.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 7 Ship block for me to
run. Do not start Phase 8.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-07-sample-mode

git add apps/web packages/ui docs/evidence/phase-7.md
git commit -m "feat(web): add sample mode so the product works without a wallet"

git push -u origin phase-07-sample-mode

gh pr create --base main \
  --title "Phase 7 — Sample mode" \
  --body "A first visitor sees the whole product — prices, ticket, positions, portfolio, leaderboard — with no wallet, no extension popup and no signature. Removes the largest drop-off in the previous platform. Every sample surface is labelled.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-7.md"
```

**Scope.** The highest-value phase for the stated problem. A first visitor sees the whole product working
— markets, chart, ticket, positions, portfolio, leaderboard — with no wallet, no extension popup, no
signature, no funds.

**Design.** A client-side account in `zustand` with its own balance, positions and fills. Prices are
real, read from the public API. Fills simulate locally against the real index price. Nothing touches a
wallet or the chain. The chain switcher offers Mainnet, Testnet and Sample, each with isolated balances.

**Work.**

1. Add a `sampleAccount` store: USDG balance, positions, orders, fills, reset.
2. Add a `useAccountMode()` seam returning `sample`, `connected` or `disconnected`, and route every read
   and write hook through it. **Sample mode is a data-source swap, not a parallel UI** — one component
   tree, or it will drift.
3. Default a first visit to sample mode. No connect wall.
4. Persistent `SAMPLE DATA` marking: a header chip, a mark on every balance and position panel, and
   `sample` in the page title. Non-negotiable — an unlabelled simulation is a liability.
5. A one-screen explainer at the point the user chooses to connect: what a wallet does here, that sample
   balances do not carry over, what the caps are, that the contracts are unaudited.
6. A `Reset sample account` control.
7. Simulate the unhappy paths too: a rejected order, an insufficient-margin refusal, a liquidation. A
   sample mode that only ever succeeds teaches the wrong thing.

**Done when.** In a clean browser profile with **no wallet extension installed**, a visitor can land on
`hume.tech`, read prices, place a sample perp order, see the position and its liquidation price, close
it, see the PNL, and view the leaderboard — and every sample surface is marked. Screenshots at 375 px and
1440 px in `docs/evidence/phase-7.md`.

**Cost.** $0.

#### Phase 8 — Guided review before every signature

**Prompt.** Paste this to run the phase.

```text
Run Phase 8 of docs/DEVELOPMENT_PHASES.md: the guided review step.

No money-moving action may reach a wallet popup without a review the user can evaluate. Build
ReviewStep in packages/ui with Back and Confirm, used by all three money paths: perp open/close,
option buy, credit deposit/borrow. Each review shows what you pay and get, margin required and
resulting account margin, the LIQUIDATION PRICE stated plainly, funding and fees and venue cut
itemised, the worst case in one sentence, and the cap that binds this order if one does.

Compute the liquidation price before submit. If it cannot be computed, REFUSE the order rather than
guessing. Add the Guided/Pro toggle to AppShell per the Phase 3 split, remembered per device; Pro
keeps today's one-shot OrderPanel and TradeSheet behaviour exactly. Wire it in sample mode first so
the flow is exercised without gas.

Also close the paused-market gap the UI rework QA found (docs/evidence/ui-rework/session-6.md): the
option ticket does not say a market is paused. Make it refuse a paused market with `tradeBlocker`
from apps/web/src/lib/market.ts, the same way OrderPanel does, before the review step is reached.
Mark a paused underlying in the strategy builder and a paused market's position on /portfolio with the
same sentence. Prices keep showing. A paused market renders, prices and refuses trades.

Acceptance: all three paths show a review with a liquidation price before any signature, in sample and
connected mode; the Pro toggle restores the one-shot panel; the review cannot be skipped by keyboard
or by deep link; the option ticket refuses a paused market with a plain sentence and no review step,
and /strategies and /portfolio mark one.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 8 Ship block for me to
run. Do not start Phase 9.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-08-review-step

git add apps/web packages/ui docs/evidence/phase-8.md
git commit -m "feat(web): require a review step before every signature"

git push -u origin phase-08-review-step

gh pr create --base main \
  --title "Phase 8 — Guided review before signing" \
  --body "No money-moving action reaches a wallet popup without a review showing the liquidation price, the margin, the itemised fees and the worst case. Guided is the default; the Pro toggle restores the dense panel.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-8.md"
```

**Scope.** No money-moving action reaches a wallet popup without a review the user can evaluate.

**Launch scope.** A review step on three money paths: perp open/close, option buy, credit deposit/borrow.
Each shows, before the signature:

- what you pay, what you get
- margin required, and resulting account margin
- **liquidation price**, stated plainly
- funding rate, fees, venue cut — itemised
- the worst case in one sentence: "If NVDA falls to $X you lose your $Y margin"
- the cap that binds this order, if one does

**Work.**

1. Build `ReviewStep` in `packages/ui` with `Back` and `Confirm`, used by all three paths.
2. Add the Guided/Pro toggle to `AppShell`, remembered per device. Pro keeps today's one-shot
   `OrderPanel` and `TradeSheet` behaviour exactly.
3. Compute the liquidation price before submit. If it cannot be computed, **refuse the order** rather
   than guessing.
4. Order the first-time path deposit-and-caps-explained **before** the first token approval.
5. Wire it in sample mode first, so the flow is exercised without gas.
6. **Paused markets on the option path.** `OptionTicket` reads the market's `active` flag and refuses
   with `tradeBlocker` before the review step, as `OrderPanel` does for perps. `/strategies` marks a
   paused underlying and `/portfolio` marks a position in a paused market, with the same sentence.
   The price keeps updating. A unit test covers the option refusal; a market that is paused on the
   testnet registry (E2E) proves it in the browser.

**Full scope, Phase 18.** A multi-step stepper for option strategies and `StrategyBuilder`, per-leg.

**Done when.** All three paths show a review with a liquidation price before any signature, in sample and
connected mode; the Pro toggle restores the one-shot panel; the review cannot be skipped by keyboard or
deep link; the option ticket refuses a paused market and `/strategies` and `/portfolio` mark one.

**Cost.** $0 in sample mode; a small gas spend for connected mode.

#### Phase 9 — Lending and borrowing live

**Prompt.** Paste this to run the phase.

```text
Run Phase 9 of docs/DEVELOPMENT_PHASES.md: lending and borrowing live.

The contracts are already ported to packages/contracts/src/credit/ and Levier proved this exact
lifecycle on this exact chain, so this is a deploy and a lifecycle run, not new development. Use
Levier's scripts/deploy-rh-lending.mjs as the template.

Deploy HumeCreditRegistry, HumeCreditRouter and HumeCreditVault behind proxies on 4663, then one
HumeCreditPair with TSLA collateral (0x322F0929c4625eD5bAd873c95208D54E1c003b2d) borrowing USDG. Set
the supply cap and collateral factor to the Phase 4 numbers. Seed supply from the owner wallet only.
Run deposit, borrow, accrue, repay, withdraw on mainnet. Record the addresses, then surface the pair
through the API and a /lending page built to docs/UI_CONTRACT.md, with a health factor readable by
someone who has never used a lending market.

Degradation: if USDG is unfunded, deploy and configure but seed nothing, ship the pair paused, mark
gate 9 amber.

Acceptance: the four-step lifecycle completes on mainnet with real USDG, the health factor reads
correctly at every step, four hashes in docs/evidence/phase-9.md; or the amber path recorded.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 9 Ship block for me to
run. Do not start Phase 10.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-09-credit

git add packages/contracts services apps/web docs/evidence/phase-9.md
git commit -m "feat(credit): deploy the credit stack and open the TSLA/USDG pair"

git push -u origin phase-09-credit

gh pr create --base main \
  --title "Phase 9 — Lending and borrowing" \
  --body "Deploys the ported credit stack and one TSLA collateral, USDG borrow pair, then runs deposit, borrow, repay and withdraw on mainnet.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-9.md"
```

**Scope.** Deploy the ported credit stack and open exactly one pair. Two features in one phase because
the contracts are ported and Levier proved this lifecycle on this chain.

**Work.**

1. Deploy `HumeCreditRegistry`, `HumeCreditRouter`, `HumeCreditVault` behind proxies on 4663, using
   Levier's `scripts/deploy-rh-lending.mjs` as the template.
2. Deploy one `HumeCreditPair`: collateral TSLA (`0x322F0929c4625eD5bAd873c95208D54E1c003b2d`), borrow
   USDG — the pair Levier's lifecycle passed with.
3. Set the supply cap and collateral factor to the Phase 4 numbers.
4. Seed supply from the owner wallet only.
5. Run the lifecycle on mainnet: deposit, borrow, accrue, repay, withdraw.
6. Record addresses in `robinhood_mainnet.json`; surface the pair through the API and a `/lending` page
   built to the Phase 3 contract, with a health factor readable by someone who has never used a lending
   market.

**Degradation.** If USDG is unfunded, do steps 1 to 3 and 6, skip 4 and 5, ship the pair paused, mark
gate 9 amber.

**Done when.** Deposit, borrow, repay and withdraw complete on mainnet with real USDG, the health factor
reads correctly at every step, four hashes recorded; or the amber path is recorded.

**Cost.** ~$0.50 gas. The seed is the owner's and is withdrawable.

### Day 3 — social layer, UI hardening, the recorded walkthrough, open

Superseded 2026-10-07 by the testnet-first order (Section 0.9): Phase 10 below is done, then the testnet
stage (Phase T, 11 to 15), then the mainnet stage (Phase L, 16, 17). The open is still 30 minutes after the
US equity open (Section 3.2), on a date the operator sets. Section 3.3's clock times are historical.

#### Phase 10 — Leaderboard and PNL card

**Prompt.** Paste this to run the phase.

```text
Run Phase 10 of docs/DEVELOPMENT_PHASES.md: leaderboard and PNL card.

Both derive read-only from the indexer's append-only events table. No contract work, no custody risk.
Launch scope is ONE window, all — the 24h window is deferred to Phase 18 and is only a query
parameter, so keep window in the API signature.

Add trader_stats to services/indexer/src/db/schema.ts and derive it from events on a fixed interval.
Keep amounts as text, for the 18-decimal overflow reason the existing schema already documents. Add
GET /leaderboard?metric=pnl|roi|volume&window=all and GET /pnl-card/:wallet/:positionId. Build the
leaderboard page and a PNL card component in packages/ui to docs/UI_CONTRACT.md. Render the card as a
shareable image through a Next OG route, reusing apps/web/src/app/opengraph-image.tsx — note the card
inverts to ivory per UI_CONTRACT.md Section 4, the one light surface in the product. Populate the
leaderboard in sample mode from simulator wallets so launch day is never a blank page. Offer a privacy
opt-out: cheap now, expensive to retrofit.

Acceptance: the leaderboard ranks real wallets on all three metrics; PNL reconciles against the chain
for one hand-checked wallet; the card renders at a shareable URL; the page is populated in sample mode.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 10 Ship block for me to
run. Do not start Phase 11.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-10-leaderboard

git add services apps/web packages/ui docs/evidence/phase-10.md
git commit -m "feat(api): add the leaderboard and the PNL card"

git push -u origin phase-10-leaderboard

gh pr create --base main \
  --title "Phase 10 — Leaderboard and PNL card" \
  --body "Both derive read-only from the indexer event log, so there is no contract work and no custody risk. The PNL card renders as a shareable image on ivory, the one light surface in the product.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-10.md"
```

**Scope.** Two features derived read-only from the indexer's append-only `events` table. No contract
work, no custody risk.

**Launch scope (cut per Section 3.1).** **One window, `all`.** Three metrics. The `24h` window is the
first thing to add back in Phase 18: it is a query parameter, not new machinery.

**Work.**

1. Add `trader_stats` to `services/indexer/src/db/schema.ts`: wallet, realised PNL, unrealised PNL, ROI,
   volume, trade count, win rate, window.
2. Derive it from `events` on a fixed interval. Keep amounts as `text` — the 18-decimal overflow reason
   the existing schema already documents.
3. `GET /leaderboard?metric=pnl|roi|volume&window=all` in `services/api/src/routes/`. Keep `window` in
   the signature so Phase 18 adds `24h` without an API change.
4. `GET /pnl-card/:wallet/:positionId`.
5. Leaderboard page, and a PNL card component in `packages/ui`, to the Phase 3 contract.
6. Render the card as a shareable image through a Next OG route, reusing
   `apps/web/src/app/opengraph-image.tsx`.
7. Populate the leaderboard in sample mode from simulator wallets, so launch day is never a blank page.
8. Privacy default: offer an opt-out. Cheap now, expensive to retrofit.

**Full scope, Phase 18.** The `24h`, `7d` and `30d` windows, follower counts, per-market breakdown.

**Done when.** The leaderboard ranks real wallets on all three metrics, PNL reconciles against the chain
for one hand-checked wallet, the card renders at a shareable URL, and the page is populated in sample
mode.

**Cost.** $0.

### Testnet stage — everything below runs on chain `46630` until Phase L (Section 0.9)

#### Phase T — The testnet environment

**Prompt.** Paste this to run the phase.

```text
Run Phase T of docs/DEVELOPMENT_PHASES.md: the testnet environment. Section 0.9 says why.

From here until Phase L every phase builds and verifies on Robinhood testnet 46630, and only one Railway
environment runs at a time, because the account is on the Trial ($5 one-time credit, 1 GB RAM).

1. Read the Railway plan, credit left, trial days left and current usage, and record them as numbers.
2. ASK ME before stopping anything on mainnet. With my yes, stop the mainnet api, pricing and indexer
   deployments (remove the deployments, keep the services, variables and domains). Keep the mainnet
   Postgres and its volume: its indexed history is not rebuilt cheaply. Delete nothing on mainnet.
3. Create the Railway environment `testnet` with api, pricing and indexer, and its OWN Postgres service.
   Point them at chain 46630 and the addresses in packages/contracts/deployments/robinhood_testnet.json
   through packages/config, never at a mainnet value. One DATABASE_URL, the testnet Postgres, serves
   runtime and Drizzle migrations; apply the migrations with Drizzle. Set the same 0.5 GB limits Phase 5
   set and the same PRICE_TICK_RETENTION_DAYS.
4. Start the simulator against testnet (bootstrap 4, start, backfill 72 replace) so prices move at any
   hour. Never read or print .env; tell me which variables to set, by name.
5. Print the testnet API URL and the NEXT_PUBLIC_* names a local web build needs to use it. Rerun
   docs/evidence/phase-8/walk-in-session.mjs against that build: simulator prices move at any hour, so
   the perp and option review figures can now be screenshotted.

Acceptance: GET /v1/markets on the testnet API lists the testnet markets, with E2E as paused; the indexer
is within 100 blocks of the testnet head; a simulator price change reaches GET /v1/prices; the mainnet
compute is stopped (or kept, by my decision, recorded); the testnet daily burn is measured and the trial
runway re-computed; the Phase 8 walk shows a perp and an option review with a liquidation line, at 375 and
1440 px. Evidence in docs/evidence/phase-T.md.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase T Ship block for me to
run. Do not start Phase 11.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-t-testnet-env

git add docs/evidence/phase-T.md docs/evidence/phase-8 packages/config services
git commit -m "chore(infra): run the testnet environment and stop mainnet compute until launch"

git push -u origin phase-t-testnet-env

gh pr create --base main \
  --title "Phase T — Testnet environment" \
  --body "Testnet-first: the Railway testnet environment with its own Postgres, the simulator driving prices, and the mainnet compute stopped until Phase L so one environment runs at a time.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-T.md"
```

**Scope.** The environment every remaining testnet phase uses. No contract changes: the testnet
deployment already exists (21 contracts), gas comes from the faucet, and the collateral token has a
public `mint`.

**Why mainnet compute stops.** Two environments double the ~$0.21–0.26/day burn and pass the trial's
1 GB RAM limit (Phase 5 measured 0.60–0.74 GB for one). The mainnet contracts are paused and nobody can
trade them, so an idle mainnet API serves no one until the open.

**What it closes.** Phase 8's browser proof of the perp and option figures. Phase 9 and Phase 10 finish
on this environment in Phase 15, with minted collateral and the testnet indexer.

**Done when.** The acceptance in the prompt holds and `docs/evidence/phase-T.md` records it.

**Cost.** Trial credit only, at one environment's rate.

#### Phase 11 — The crypto set

**Prompt.** Paste this to run the phase.

```text
Run Phase 11 of docs/DEVELOPMENT_PHASES.md: the crypto set. TESTNET FIRST (Section 0.9): list the
four on testnet 46630 now; write the mainnet listing and dry-run it, but do NOT broadcast it — Phase L
does.

This is the 24/7 liveness fix. Without it the venue shows nothing but closed markets to anyone
visiting outside US trading hours, which is most of the week. A perp needs an oracle feed and NOT a
tokenized asset — underlyingToken is registry metadata and nothing transfers it, confirmed by
grep -c underlyingToken returning 0 across src/perps/ and src/options/.

On testnet, prices come from mock feeds the simulator's price driver moves (services/simulator/README.md).
Price the four the way the existing testnet markets are priced (read
packages/contracts/deployments/robinhood_testnet.json and AddMarket.s.sol): one mock feed each, owned by
the key the price driver signs with, and add the four to the simulator's driven set. Mock prices start
from the real feeds' current readings.

For mainnet, prepare group crypto, tier tradeable markets for BTC, ETH, LINK and GLD with
AddMainnetMarket.s.sol, and run it WITHOUT --broadcast against the mainnet RPC:
  BTC   0xa2c5184bF03d373Dc9dE4876eb4Bce595B460251
  ETH   0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9
  LINK  0xe86e3422Aa9B5e8ee9f3E41a63975bC387A8bce9
  GLD   0x470A51258068043bd43dC0a56245625C9fE86eB0
Set underlyingToken to the matching tokenized asset where one exists (GLD has one) and to the feed
address otherwise; MarketRegistry only rejects the zero address. Give crypto its own risk tier: the
staleness limit is tight and CONSTANT with no session carve-out, the opposite of the equity markets,
because these feeds move on 0.5% deviation around the clock. Leverage no higher than the equity tier —
these are not less volatile, only fresher. Add /markets?group=crypto on the Phase 2 accessor.

The China group is NOT in this phase; Section 3.1 cut it to Phase 18 with its research intact.

Acceptance (testnet): /markets?group=crypto lists all four with a moving price; one small perp opens and
closes on one of them, hashes recorded. Acceptance (mainnet, read-only, $0): the AddMainnetMarket dry run
succeeds, and docs/evidence/phase-11.md records a real feed age per market, GLD and LINK under 10 minutes.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 11 Ship block for me to
run. Do not start Phase 12.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-11-crypto

git add packages/contracts packages/config services/simulator apps/web docs/evidence/phase-11.md
git commit -m "feat(markets): list the BTC, ETH, LINK and GLD perps on testnet"

git push -u origin phase-11-crypto

gh pr create --base main \
  --title "Phase 11 — Crypto markets" \
  --body "Four markets whose feeds stay fresh outside US trading hours. A perp needs an oracle feed and not a tokenized asset, so this is four config rows and no contracts. Without it the venue shows nothing but closed markets most of the week.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-11.md"
```

**Scope.** Four markets that are fresh around the clock, so the venue is never dead. Per `REFERENCE.md` Section 2, finding 5, a perp needs an oracle
feed and not a tokenized asset. That makes this four config rows and no contracts — the cheapest
liveness available anywhere in the plan.

**The China group is cut from launch per Section 3.1** and moves to Phase 18, where its research is
already finished and waiting. The quoted-tier UI goes with it, since with China gone nothing at launch
renders a quoted row.

**Work.**

1. Add `group: "crypto"`, `tier: "tradeable"` markets for **BTC, ETH, LINK and GLD**, using
   `AddMainnetMarket.s.sol`. Feeds:

```
BTC   0xa2c5184bF03d373Dc9dE4876eb4Bce595B460251
ETH   0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9
LINK  0xe86e3422Aa9B5e8ee9f3E41a63975bC387A8bce9
GLD   0x470A51258068043bd43dC0a56245625C9fE86eB0
```

2. `underlyingToken` is registry metadata and nothing transfers it, so set it to the matching tokenized
   asset where one exists — `GLD` has one — and to the feed address otherwise. `MarketRegistry` only
   rejects the zero address.
3. Give crypto its own risk tier: these feeds move on 0.5% deviation around the clock, so the staleness
   limit is **tight and constant, with no session carve-out** — the opposite of the equity markets in
   Phase 4. Leverage no higher than the equity tier; these are not less volatile, only fresher.
4. Add `/markets?group=crypto` on the Phase 2 accessor.

**Why these four.** Measured on a Saturday with US markets shut: GLD 1 minute old, LINK 4 minutes. BTC
and ETH read 14–16 hours because neither had moved 0.5%, but both update whenever they do, at any hour.
Equities cannot: NVDA read 22.2 hours old. Without this phase the site shows nothing but closed markets
to anyone visiting outside US session hours, which is most of the week.

**Done when.** `/markets?group=crypto` lists BTC, ETH, LINK and GLD with a live price each; GLD and LINK
read under 10 minutes old; one small perp opens and closes on one of them; and `docs/evidence/phase-11.md`
records a feed-age reading per market.

**Cost.** $0 on testnet (faucet gas). The mainnet broadcast in Phase L: ~$0.20 gas per market, about $0.80.

#### Phase 12 — Failure and empty states in plain language

**Prompt.** Paste this to run the phase.

```text
Run Phase 12 of docs/DEVELOPMENT_PHASES.md: failure and empty states in plain language.

This is the second-largest drop-off after the wallet wall: a user who sees an unexplained failure does
not retry. Launch scope is the four trading pages plus /lending, money paths only.

Build a revert-reason map from every custom error in packages/contracts/src/interfaces/Errors.sol to
one plain sentence plus one next action. Unmapped errors fall back to a generic sentence plus the error
name — never a raw hex string, never the wallet's own wording. Route every failure through TxToasts
with that mapping. Give each of the five pages a designed empty state that says what to do next, not
"no data". Replace spinner-only loading with the existing Skeleton. Handle user-rejected-signature
explicitly: it is the most common "failure" and it is not an error.

Use the Phase 3 state grid as the backlog for which page is missing which state.

Acceptance: every Errors.sol error maps to a sentence; the five pages show a designed empty state in a
fresh account; a deliberately failed order produces a sentence a non-trader can act on.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 12 Ship block for me to
run. Do not start Phase 13.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-12-states

git add apps/web packages/ui docs/evidence/phase-12.md
git commit -m "feat(web): map contract errors to plain language and design the empty states"

git push -u origin phase-12-states

gh pr create --base main \
  --title "Phase 12 — Plain-language failures and empty states" \
  --body "Every custom error in Errors.sol maps to one plain sentence and one next action, and no raw revert string reaches a user. The five money-path pages get designed empty states.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-12.md"
```

**Scope.** Close the Phase 3 grid on the paths a user hits. The second-largest drop-off after the wallet
wall: a user who sees an unexplained failure does not retry.

**Launch scope.** The four trading pages plus `/lending`, money paths only.

**Work.**

1. Build a revert-reason map: every custom error in `packages/contracts/src/interfaces/Errors.sol` to one
   plain sentence plus one next action. Unmapped errors fall back to a generic sentence plus the error
   name — never a raw hex string, never a wallet's own wording.
2. Route every failure through `TxToasts` with that mapping.
3. Give each of the five pages a designed empty state saying what to do next, not "no data".
4. Replace spinner-only loading on those pages with the existing `Skeleton`.
5. Handle user-rejected-signature explicitly: the most common "failure", and not an error.

**Full scope, Phase 18.** Remaining pages, plus a copy review of every string.

**Done when.** Every `Errors.sol` error maps to a sentence; the five pages show a designed empty state in
a fresh account; a deliberately failed order produces a sentence a non-trader can act on.

**Cost.** $0.

#### Phase 13 — Mobile and keyboard pass

**Prompt.** Paste this to run the phase.

```text
Run Phase 13 of docs/DEVELOPMENT_PHASES.md: the mobile and keyboard pass.

Unverified today, and a large share of first visits arrive on a phone. Launch scope is the landing
page, /markets, one trading page and /portfolio.

Verify at 375 px: a 16 px gutter, no horizontal page scroll, tap targets at least 44 px. Make the
trade ticket reachable on a phone — a desktop side panel that becomes an unreachable column is the
same as no ticket. Tab through the Phase 8 review step: focus visible at every stop, Confirm
reachable, Escape closes the sheet. Confirm the token contrast has not regressed against the ratios
recorded in globals.css.

Acceptance: the four surfaces pass at 375 px with no horizontal scroll, and the full
place-order-to-confirm path completes on keyboard alone. Screenshots in docs/evidence/phase-13.md.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 13 Ship block for me to
run. Do not start Phase 14.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-13-mobile

git add apps/web packages/ui docs/evidence/phase-13.md
git commit -m "fix(web): make the app usable at 375 px and from a keyboard"

git push -u origin phase-13-mobile

gh pr create --base main \
  --title "Phase 13 — Mobile and keyboard" \
  --body "The four main surfaces work at phone width with the trade ticket reachable, and the full place-order-to-confirm path completes on keyboard alone.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-13.md"
```

**Scope.** The app works at 375 px and from a keyboard. Unverified today.

**Launch scope.** Landing page, `/markets`, one trading page, `/portfolio`.

**Work.**

1. Verify at 375 px: 16 px gutter, no horizontal page scroll, tap targets at least 44 px.
2. Make the trade ticket reachable on a phone. A desktop side panel that becomes an unreachable column is
   the same as no ticket.
3. Tab through the Phase 8 review: focus visible at every stop, `Confirm` reachable, `Escape` closes.
4. Confirm the token contrast has not regressed against the ratios recorded in `globals.css`.

**Full scope, Phase 18.** All 8 pages, plus a screen-reader pass.

**Done when.** Four surfaces pass at 375 px with no horizontal scroll, and the full place-order-to-confirm
path completes on keyboard alone. Screenshots in `docs/evidence/phase-13.md`.

**Cost.** $0.

#### Phase 14 — Copy trading: the entry point only

**Prompt.** Paste this to run the phase.

```text
Run Phase 14 of docs/DEVELOPMENT_PHASES.md: the copy trading entry point only.

Section 3.1 cut this to a visible, honest entry point and NOTHING behind it. Build no tables, no
endpoints, no subaccount, no executor. The reason: copy trading needs leaders with a track record and
on launch day the leaderboard is empty, so a follow flow that creates on-chain subaccounts would serve
zero users while adding custody surface.

Add a "Copy trading" entry to the Phase 10 leaderboard as a disabled control per row, stating that
copy trading opens once leaders have a track record, with no date promised. Flag it behind
NEXT_PUBLIC_FEATURE_COPY_TRADING, default off, so Phase 18 switches it on rather than rebuilding the
entry point. Then WRITE THE DESIGN DOWN WITHOUT BUILDING IT in docs/evidence/phase-14.md: build on the
existing Subaccount and SubaccountFactory; a follower creates a copy subaccount, funds it, and
authorises the executor on that subaccount only, with the caps written into the authorisation so the
limits bind on chain and not only in a service; the executor can open and close inside it and can
never withdraw; no new custody contract. Skip semantics: insufficient margin, a cap hit or a paused
market records an explicit skip, never a silent partial mirror.

The copy must not overstate. It says the feature is not available yet and does not imply following
works.

Acceptance: the leaderboard shows the entry in a clearly unavailable state, the flag is off, and the
Phase 18 design is written down.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 14 Ship block for me to
run. Do not start Phase 15.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-14-copy-entry

git add apps/web docs/evidence/phase-14.md
git commit -m "feat(web): add the copy-trading entry point behind a flag"

git push -u origin phase-14-copy-entry

gh pr create --base main \
  --title "Phase 14 — Copy trading entry point" \
  --body "A visible but explicitly unavailable entry on the leaderboard, flag off, with no tables, endpoints or subaccounts. The full design is written down for later rather than half-built now, because on launch day there is nobody with a track record to copy.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-14.md"
```

**Scope, cut per Section 3.1.** A visible, honest entry point and nothing behind it. **No tables, no
endpoints, no subaccount, no executor.** The full model and the capped subaccount move to Phase 18.

**Why cut rather than half-built.** Copy trading needs leaders with a track record, and on launch day the
leaderboard is empty — there is nobody to copy. A follow flow that creates on-chain subaccounts for a
feature that cannot mirror yet serves zero users while adding custody surface. A label serves the same
number of users, honestly, for a fraction of the work.

**Work.**

1. Add a "Copy trading" entry to the Phase 10 leaderboard: a disabled control per row, reading that
   copy trading opens once leaders have a track record, with no date promised.
2. Flag it behind `NEXT_PUBLIC_FEATURE_COPY_TRADING`, default off, so Phase 18 switches it on rather
   than rebuilding the entry point.
3. **Write the design down, do not build it.** Put the Phase 18 design in `docs/evidence/phase-14.md`:
   build on `Subaccount` / `SubaccountFactory`, which already exist; a follower creates a copy
   subaccount, funds it, and authorises the executor **on that subaccount only**, with the caps written
   into the authorisation so the limits bind on chain and not only in a service; the executor can open
   and close inside it and can never withdraw; no new custody contract. Skip semantics: insufficient
   margin, a cap hit or a paused market records an explicit skip, never a silent partial mirror.

**The copy must not overstate.** It says the feature is not available yet. It does not imply that
following works, and no clip in Phase 15 shows it.

**Done when.** The leaderboard shows the entry in a clearly unavailable state, the flag is off, and the
Phase 18 design is written down.

**Cost.** $0.

#### Phase 14b — The mainnet/testnet toggle (optional, cut first if the open is near)

**Prompt.** Paste this to run the phase.

```text
Run Phase 14b of @docs/DEVELOPMENT_PHASES.md: the mainnet/testnet toggle.

This is NOT a launch gate. If Phase 15 has not started by its slot in Section 3.2, skip this phase and
move it to Phase 18 item 1c. Say so and stop rather than eating the walkthrough's time.

One deployment serves both chains, switched at runtime: mainnet 4663 and Robinhood testnet 46630. Both
chain records and both address sets are already in packages/config (chains.ts, deployments.ts), so this
is a wiring job in apps/web, not new chain config.

The blocker to solve first: apps/web/src/lib/env.ts resolves the chain ONCE at module load from
NEXT_PUBLIC_CHAIN_ID, and apps/web/src/lib/wagmi.ts builds a single-chain wagmi config from it. Move
the chain into a client provider that reads the toggle, and derive addresses per chain through
addressesForChain(chainId) rather than from the per-contract NEXT_PUBLIC_* overrides — those overrides
are global, so left as they are they would bleed a mainnet address into the testnet view, which is the
one failure that must not happen. Keep them honoured for the chain they belong to, or ignore them when
the toggle is on; either way say which in the evidence.

Add to wagmi: both chains in createConfig, a transport per chain, useSwitchChain on the toggle, and a
wrong-network state for a wallet that refuses to switch. Chain choice persists per browser and is
shareable as a URL parameter. Testnet needs its own API and RPC values, so add a second set of
NEXT_PUBLIC_* names rather than reusing one.

Honesty requirement, non-negotiable: while testnet is selected every page carries a persistent label
saying this is testnet with mock prices and simulated traders, in the same words the simulator README
requires. A testnet balance, PNL or leaderboard row must never be readable as real money. The mainnet
unaudited banner from Phase 6 stays in both modes.

Acceptance: docs/evidence/phase-14b.md shows both chains served from one deployment - markets, a
position and a balance read correctly on each, the wallet switches chain from the toggle, a refusal
renders the wrong-network state, the testnet label is present on every page in testnet mode and absent
in mainnet mode, and no mainnet address appears in a testnet read. Screenshots at 375 px and 1440 px
for both modes.

Do NOT commit, push, stage or open a PR - I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 14b Ship block for me to
run. Do not start Phase 15.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-14b-network-toggle

git add apps/web packages/config .env.example docs/evidence/phase-14b.md
git commit -m "feat(web): serve mainnet and testnet from one deployment behind a toggle"

git push -u origin phase-14b-network-toggle

gh pr create --base main \
  --title "Phase 14b — Mainnet/testnet toggle" \
  --body "Serves chain 4663 and chain 46630 from one web deployment, switched at runtime, with the wallet switching chain from the toggle and a persistent testnet label so testnet numbers can never read as real.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-14b.md"
```

**Scope.** A visitor picks the network and the whole terminal follows: markets, prices, balances,
positions, the wallet and the explorer links. One build, two chains.

**Why it is worth doing, and why it is not a gate.** Sample mode (Phase 7) already lets someone see the
product with no wallet, so the toggle is not what makes the venue approachable. What it adds is a place
to _trade_ without real money — which, at the Section 0.3 caps of 0.008 USDG of notional per market, is
the only way anyone can take a position worth watching. It also replaces Phase 15's separate testnet
build with a switch on the real one, so the thing filmed is the thing shipped. None of that is required
for the open, which is why it is cut first.

**Work.**

1. **Chain state at runtime.** Move `chainId` out of `apps/web/src/lib/env.ts`'s module-load constant
   into a client provider: a `NetworkProvider` holding the selected chain, persisted per browser and
   readable from a `?network=` URL parameter so a link can open either mode. Default to mainnet.
2. **Addresses per chain.** Resolve every contract through `addressesForChain(chainId)`
   (`packages/config/src/deployments.ts` already records both 4663 and 46630). Decide and document what
   happens to the per-contract `NEXT_PUBLIC_*` overrides, which today apply to whichever chain is
   loaded: scope them to one chain or ignore them while the toggle is on. **A mainnet address reaching a
   testnet read, or the reverse, is the failure this step exists to prevent.**
3. **A second set of environment values.** `NEXT_PUBLIC_TESTNET_RPC_URL`, `NEXT_PUBLIC_TESTNET_API_URL`,
   `NEXT_PUBLIC_TESTNET_EXPLORER_URL`, and the testnet read proxy if one is used. Add them to
   `.env.example` beside the mainnet names, with a note that an unset testnet API disables the toggle
   rather than silently serving mainnet data.
4. **Wallet.** `createConfig` takes both chains and a transport each
   (`apps/web/src/lib/wagmi.ts`), the toggle calls `useSwitchChain`, and a wallet that refuses or
   cannot switch gets an explicit wrong-network state with the chain name and a retry — not a silent
   failure and not a blank page.
5. **The testnet label.** A persistent marker in `AppShell` whenever testnet is selected, stating mock
   prices and simulated traders in the simulator README's words. Per `REFERENCE.md` Section 2's tier
   rules, a number whose source is not what it appears to be must say so on the row, not only in a
   banner — so the balance, PNL and leaderboard surfaces carry it too.
6. **A testnet API that is actually reachable.** Phase T stands up the testnet API and database on
   Railway, on a public domain, so this phase reuses it. No extra service is needed.

**Degradation.** If the testnet API is not hosted, ship the toggle disabled with the reason visible
(not hidden), and record it amber. If the chain-state refactor turns out to touch more of
`apps/web/src/lib/env.ts`'s consumers than this phase can finish cleanly, stop and move the whole phase
to Phase 18 item 1c rather than leaving the app half-switched.

**Done when.** `docs/evidence/phase-14b.md` shows both chains served from one deployment, the wallet
switching from the toggle, the wrong-network state, the testnet label present in testnet mode and absent
in mainnet mode, no cross-chain address leak, and screenshots at 375 px and 1440 px in both modes.

**Cost.** $0 on testnet. One extra Railway service if the testnet API is not already hosted.

#### Phase 15 — Testnet acceptance and the recorded walkthrough

**Prompt.** Paste this to run the phase.

```text
Run Phase 15 of docs/DEVELOPMENT_PHASES.md: testnet acceptance and the recorded walkthrough.

This is the hard gate before mainnet opens, AND the launch documentation. Nothing opens if a Tier A
item is red. Everything runs on Robinhood testnet 46630, which costs nothing: the deployment exists,
gas comes from the faucet, and the collateral token has a public mint.

START THE SIMULATOR FIRST and leave it running — charts come from once-a-minute price ticks with no
chain backfill, so a market that started five minutes ago films badly:
  pnpm --filter @hume/simulator bootstrap 4
  pnpm --filter @hume/simulator start
  pnpm --filter @hume/simulator backfill 72 replace   # if time is short
  pnpm --filter @hume/simulator nudge NVDA -6         # forces a liquidation on camera

Use the testnet environment Phase T created; do not create a second one, and do not delete it — Phase L
does. Deploy what Phase 9 added on testnet if Phase T did not, so every launch feature has something to film.

Record NINE clips, desktop 1440 px, plus 375 px for clips 2 and 6: sample mode with no wallet
extension, perps, options, a liquidation, lending, leaderboard and PNL card, the crypto group,
failures one per class, mobile. No China clip and no copy-trading clip — Section 3.1 cut both features
and filming them would show something that does not exist. This machine is X11 + XFCE, so use
ffmpeg -f x11grab or simplescreenrecorder.

EVERY CLIP AND DESCRIPTION MUST STATE that this is testnet with mock prices and simulated traders.
The simulator's own README requires it. Presenting bot activity as real users or volume would mislead,
and these recordings outlive the launch.

Then the unfilmed checks: the review step on all three money paths, the keyboard path end to end, the
375 px pass, and a pause-and-unpause rehearsal on testnet. Finally run the fork suite, which is the
only check covering real Chainlink staleness and real USDG:
  cd packages/contracts && forge test --match-path test/fork/MainnetFork.t.sol -vv

Acceptance: docs/evidence/dry-run.md shows a pass per Tier A and Tier B item, links all nine clips,
and records the fork suite at 7/7 plus the pause and unpause.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail per item, list the paths you changed, then print the Phase 15 Ship block
for me to run. Do not start Phase 16 if a Tier A item is red.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-15-walkthrough

git add docs/evidence/dry-run.md docs/evidence docs/DEVELOPMENT_PHASES.md
git commit -m "docs(launch): record the testnet walkthrough and the acceptance results"

git push -u origin phase-15-walkthrough

gh pr create --base main \
  --title "Phase 15 — Testnet walkthrough" \
  --body "Nine recorded clips and a pass or fail per feature on Robinhood testnet 46630, plus the mainnet fork suite. Every clip states that this is testnet with mock prices and simulated traders. This is the hard gate before the open.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-15.md"
```

**Scope.** Two jobs in one pass on Robinhood testnet `46630`:

1. **The gate.** Every feature works end to end before mainnet opens. A red Tier A item stops the open.
2. **The documentation.** A screen recording per feature, so the launch has a record of the product
   working. This is the only environment where that is possible — mainnet has sub-dollar balances and
   real money, and sample mode cannot show a real transaction.

Testnet costs nothing: the deployment exists, gas comes from the faucet, and the collateral token has a
public `mint`.

**15.1 — Bring up the environment.**

1. **Use the `testnet` Railway environment from Phase T** and its own Postgres, pointed at the existing
   chain `46630` deployment (`packages/contracts/deployments/robinhood_testnet.json`, 21 contracts).
   Never the mainnet database. **Phase L deletes the environment**, after the recording is captured.
2. Deploy to testnet what Phase 9 added on mainnet — the credit stack and one credit pair — and add the
   Phase 11 crypto markets, so every launch feature has something to film. Phase 14 added no tables, so
   there is nothing to deploy for copy trading.
3. Bootstrap and start the simulator. It exists for this: ten bot traders with distinct personalities, a
   price driver that moves the mock feeds like a calm market, and a liquidator bot, all trading through
   the same SDK the web app uses, so Activity, Markets, Portfolio and the charts fill with real on-chain
   events rather than seeded rows.

```bash
pnpm --filter @hume/simulator bootstrap 4   # fund bots, mint test collateral, 4 hours of runway
pnpm --filter @hume/simulator start
```

4. **A chart needs history.** Candles come from price ticks the indexer samples once a minute and the
   chain has no backfill, so start the simulator **first** and let it run while 15.2 is set up. A market
   that started five minutes ago films badly. If time is short, draw the history instead:

```bash
pnpm --filter @hume/simulator backfill 72 replace   # 72 hours of candles, immediately
pnpm --filter @hume/simulator backfill undo         # remove it again
```

5. **Getting a liquidation on camera needs a push**, because the simulated market is calm by design. The
   two 10x "degen" bots are liquidated by roughly a 5% move against them, and the simulator has a command
   for it. To be liquidated on camera in a position **you** opened by hand, set `SIM_LIQUIDATE_WALLETS`
   to your address before `start`:

```bash
pnpm --filter @hume/simulator nudge NVDA -6        # 6% down over 90s: the long degen is liquidated
pnpm --filter @hume/simulator nudge AAPL 6 30      # 6% up over 30s
```

**15.2 — Record one clip per feature.** One take each, desktop at 1440 px, plus a phone-width pass
at 375 px for the two that matter most on a phone. This machine is **X11 + XFCE**, so capture with
`ffmpeg -f x11grab` or the already-installed `simplescreenrecorder`; `wf-recorder` is Wayland-only and
is not installed. Keep the files out of git and link them from the evidence file.

| #   | Clip                      | What it must show                                                                                                                                                                                                         |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Sample mode**           | A clean browser profile with **no wallet extension**, landing on the site, reading prices, placing a sample perp, seeing the liquidation price, closing it, reading the PNL. The `SAMPLE DATA` marking visible throughout |
| 2   | **Perps**                 | Connect, deposit, the Phase 8 review step with its liquidation price, open, the position updating against a moving price, close                                                                                           |
| 3   | **Options**               | The option chain with bid/ask and Greeks, buy a call, hold to expiry, settle                                                                                                                                              |
| 4   | **Liquidation**           | A position liquidated on camera, forced with `simulator nudge`. **Film this — it cannot be shown safely on mainnet, and it is the clip that proves the risk engine works**                                                |
| 5   | **Lending**               | Deposit, borrow, the health factor moving, repay, withdraw                                                                                                                                                                |
| 6   | **Leaderboard, PNL card** | Bot wallets ranked on all three metrics, then one trader's card rendered and the share link opened                                                                                                                        |
| 7   | **Crypto group**          | `/markets?group=crypto` with BTC, ETH, LINK and GLD priced, and a feed age under 10 minutes on GLD and LINK                                                                                                               |
| 8   | **Failures**              | One per class: a revert, a cap hit, a rejected signature — each showing a plain sentence and a next action, never a raw error                                                                                             |
| 9   | **Mobile**                | Clips 2 and 6 again at 375 px: ticket reachable, no horizontal scroll                                                                                                                                                     |

**Nine clips, not ten.** The copy-trading clip is dropped because Section 3.1 cut the feature to an
entry point, and the China clip is dropped because Section 3.1 cut the group. Filming either would
show something that does not exist.

**Honesty requirement, non-negotiable.** The simulator's own README says it: this is a testnet with mock
prices and simulated traders. **Every clip and its description says so.** Presenting bot activity as real
users or real volume would mislead anyone who sees it, and the recordings will outlive this launch.

**15.3 — Acceptance checks that are not filmed.**

6. The UI hard gates: the review step on all three money paths; the keyboard path end to end; the 375 px
   pass on the four surfaces.
7. Rehearse the pause on testnet: pause, confirm trading is refused, unpause.

**15.4 — The mainnet fork suite.**

8. `forge test --match-path test/fork/MainnetFork.t.sol`. **The only check covering real Chainlink
   staleness and real USDG behaviour**, which a mock-feed testnet cannot touch. A green testnet
   walkthrough never stands in for it.

```bash
cd packages/contracts && forge test --match-path test/fork/MainnetFork.t.sol -vv
```

**Done when.** `docs/evidence/dry-run.md` shows a pass per Tier A and Tier B item, links all nine clips,
and records the fork suite at 7/7 plus the pause and unpause. **Any Tier A failure stops the open for
that feature.**

**Cost.** $0. Testnet gas from the faucet, test collateral minted.

### Mainnet stage — the money is spent here, and only here (Section 0.9)

#### Phase L — Mainnet bring-back and funding

**Prompt.** Paste this to run the phase.

```text
Run Phase L of docs/DEVELOPMENT_PHASES.md: bring mainnet back and fund it. Section 0.9 says why this is
the first phase that spends money. Phase 15 must have passed.

Before anything, ask me three things and wait: the open date, the Railway plan for the open (Hobby
$5/month, or trial credit if any is left), and whether USDG is funded. Re-read the owner's USDG and ETH
balances on chain 4663; never trust an older figure.

1. ASK ME, then delete the Railway testnet environment and its Postgres. Phase 15's recording must be
   captured first.
2. Redeploy the mainnet api, pricing and indexer. The indexer resumes from its last block; wait until it
   is within 100 blocks of the head.
3. Re-size the launch caps against the real USDG balance (SetLaunchCaps.s.sol, Phase 4's rules). If USDG
   is unfunded, follow Section 0.3 exactly.
4. Broadcast the Phase 11 mainnet listing (AddMainnetMarket.s.sol, BTC, ETH, LINK, GLD), paused like the
   rest. Record the hashes and a feed age per market.
5. With USDG: seed the credit pair (Phase 9's mainnet half) and run one real perp and one real option
   round trip (Phase 6's). Deploy the Phase 10 leaderboard against the mainnet indexer.
6. Re-measure the mainnet daily burn and confirm the plan covers it to the open plus 30 days.

Acceptance: docs/evidence/phase-L.md holds every hash, the cap values and the balance they were sized
against, the feed ages, the indexer lag, and a pass, amber or fail for the mainnet halves of Phases 6, 9,
10 and 11. Unfunded USDG makes 6 and 9 amber under Section 0.3, not red.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase L Ship block for me to
run. Do not start Phase 16.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-l-mainnet

git add docs/evidence/phase-L.md packages/contracts/deployments packages/config
git commit -m "chore(launch): bring mainnet back, list the crypto set and size the caps"

git push -u origin phase-l-mainnet

gh pr create --base main \
  --title "Phase L — Mainnet bring-back and funding" \
  --body "The first phase that spends money: the testnet environment is deleted, mainnet compute returns, the crypto set is listed paused, and the caps are sized against the real USDG balance.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-L.md"
```

**Scope.** Everything testnet proved, made real on chain 4663, still paused. Phase 17 unpauses.

**Cost.** Railway plan for the open (Section 0.9), $4–5 USDG if funded, ~$0.80 gas for the crypto set.

#### Phase 16 — Safety rails and key separation on mainnet

**Prompt.** Paste this to run the phase.

```text
Run Phase 16 of docs/DEVELOPMENT_PHASES.md: safety rails and key separation on mainnet.

These are the controls that make a bad day survivable, and this is a hard gate.

Generate four keys — quoter, keeper, liquidator, pauser — and write them to .env. CONFIRM .env IS
GITIGNORED BEFORE WRITING. Print only the addresses; never a private key into the transcript, a commit
or an evidence file. The deployer stays 0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C and is never
regenerated, because it owns every deployed proxy. Fund keeper, liquidator and pauser with about
0.00005 ETH each. Grant the pauser role to the pauser address and the liquidator role to the
liquidator address.

Rehearse the fast pause on mainnet with the pauser key: pause, confirm trading is refused, unpause.
Add alerts on oracle staleness, indexer lag, keeper wallet balance, BadDebt and any admin event — a
chat webhook is enough, silence is not. Start the liquidation keeper and the option-settlement keeper
against mainnet with KEEPER_REFRESH_FEEDS=false, because feed refresh is a testnet behaviour. Fill in
the runbook: who pauses, how they are reached, what they pause first.

Acceptance: a mainnet pause and unpause recorded with hashes;
bash packages/contracts/script/check-admin-roles.sh shows distinct addresses per role; one alert
deliberately triggered and received.

Do NOT commit, push, stage or open a PR — I do that myself. Leave the working tree dirty.
Report pass, amber or fail, list the paths you changed, then print the Phase 16 Ship block for me to
run. Do not start Phase 17.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-16-rails

git add packages/contracts services docs/evidence/phase-16.md
git commit -m "feat(ops): separate the operator keys and add the alerts"
# .env holds the four new keys and is gitignored. Confirm nothing secret is staged:
git diff --cached --name-only | grep -E "^\\.env" && echo "STOP: a dotenv file is staged" || echo "clean"

git push -u origin phase-16-rails

gh pr create --base main \
  --title "Phase 16 — Safety rails and key separation" \
  --body "Splits the single operator key into deployer, quoter, keeper, liquidator and pauser, rehearses the pause on mainnet, and adds alerts on oracle staleness, indexer lag, keeper balance and bad debt. No key material is committed.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-16.md"
```

**Scope.** The controls that make a bad day survivable.

**Work.**

1. Generate four keys — quoter, keeper, liquidator, pauser — write them to `.env`, print only the
   addresses. **The deployer stays `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`.** Confirm `.env` is
   gitignored before writing.
2. Fund keeper, liquidator and pauser with ~0.00005 ETH each from the owner wallet.
3. Grant the pauser role to the pauser address; grant the liquidator role to the liquidator address.
4. Rehearse the fast pause on mainnet with the pauser key: pause, confirm trading is refused, unpause.
5. Alerts on oracle staleness, indexer lag, keeper wallet balance, `BadDebt`, any admin event. A chat
   webhook is enough. Silence is not.
6. Start the liquidation keeper and the option-settlement keeper against mainnet. Set
   `KEEPER_REFRESH_FEEDS=false` in the mainnet environment — feed refresh is a testnet behaviour.
7. Fill in the runbook: who pauses, how they are reached, what they pause first.

```bash
bash packages/contracts/script/check-admin-roles.sh   # expect distinct addresses per role
```

**Done when.** A mainnet pause and unpause are recorded with hashes, `check-admin-roles.sh` shows
distinct addresses per role, and one alert has been deliberately triggered and received.

**Cost.** ~0.00015 ETH of floats, plus a few cents of gas.

#### Phase 17 — Launch gate and open (ends 21:00 WIB)

**Prompt.** Paste this to run the phase.

```text
Run Phase 17 of docs/DEVELOPMENT_PHASES.md: the launch gate and the open.

This is the only phase that makes Hume live, and it is irreversible in effect. Confirm with me before
the first unpause transaction.

Before filling the gate, open every contract explorer link the landing page shows (list them from
docs/evidence/ui-rework/s6/results-links.txt) in a browser and confirm each shows verified source.
The explorer's API sits behind a bot challenge, so this cannot be checked over HTTP. For any contract
that is not verified, run `packages/contracts/script/verify-full.sh` (it verifies the 20 proxy
implementations on Blockscout) and open it again. Open the proxy pages and the implementation pages. Gate 17 stays red until every one
shows verified source, because the landing page says "Verified source".

Fill the 17-row gate in docs/evidence/launch-gate.md with evidence links from every phase. Apply the
stop rule exactly: gates 1-5, 7, 8, 12, 13, 15, 16 and 17 are HARD, so if any is red NOTHING opens.
Gates 6, 9, 10, 11 and 14 are per feature — a red one keeps that feature paused and does not stop the
others. Gates 6 and 9 go amber rather than red if USDG was never funded, and amber opens the rest.

Then unpause in this order with five minutes of clean readings between steps. Crypto goes first on
purpose: its feeds are fresh at any hour, so it proves the sequence works before the equity markets
depend on a session that has only just started.
  20:40 WIB  perps on the crypto set (BTC, ETH, LINK, GLD)
  20:45 WIB  perps on the 32 equity markets
  20:50 WIB  options on the equity markets
  20:55 WIB  the TSLA/USDG credit pair
  21:00 WIB  verify the leaderboard and PNL card populate, then announce

Acceptance: the gate table is filled with evidence links and every item is marked open, capped, amber,
paused or flagged off.

Do NOT commit, push, stage or open a PR — I do that myself.
Report the final state of every gate row, then print the Phase 17 Ship block for me to run.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-17-launch

git add docs/evidence/launch-gate.md docs/evidence
git commit -m "docs(launch): record the launch gate and the open"

git push -u origin phase-17-launch

gh pr create --base main \
  --title "Phase 17 — Launch gate and open" \
  --body "The filled 17-row gate with evidence links, and the result of each unpause in the open sequence. Every feature is marked open, capped, amber, paused or flagged off.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-17.md"
```

##### 17.1 Gate

| #   | Gate                                                                               | Tier | Source   |
| --- | ---------------------------------------------------------------------------------- | ---- | -------- |
| 1   | Every mainnet address answers with bytecode and a known owner                      | Hard | Phase 0  |
| 2   | No `alphamarkets` string ships; lint and typecheck pass                            | Hard | Phase 1  |
| 3   | `docs/UI_CONTRACT.md` exists; the hex check fails on a planted colour              | Hard | Phase 3  |
| 4   | Caps set on chain; `check-launch-limits.sh` exits 0                                | Hard | Phase 4  |
| 5   | Indexer within 10 blocks of head; API serving mainnet                              | Hard | Phase 5  |
| 6   | One real perp and one real option round trip on mainnet                            | Feat | Phase 6  |
| 7   | **Sample mode works with no wallet extension installed**                           | Hard | Phase 7  |
| 8   | **Review step with a liquidation price on all three money paths; a paused market is refused at the option ticket** | Hard | Phase 8  |
| 9   | Credit lifecycle passed on mainnet                                                 | Feat | Phase 9  |
| 10  | Leaderboard reconciles for one hand-checked wallet; not blank in sample mode       | Feat | Phase 10 |
| 11  | Crypto set live: BTC, ETH, LINK, GLD priced; GLD and LINK under 10 min old         | Feat | Phase 11 |
| 12  | **Every `Errors.sol` error maps to a plain sentence; 5 pages have empty states**   | Hard | Phase 12 |
| 13  | **375 px pass on 4 surfaces; keyboard path completes**                             | Hard | Phase 13 |
| 14  | Copy trading entry visible and clearly unavailable; flag off; design written       | Feat | Phase 14 |
| 15  | **Testnet walkthrough green per item; 10 clips recorded; `MainnetFork.t.sol` 7/7** | Hard | Phase 15 |
| 16  | Pause rehearsed on mainnet; alerts received; roles on distinct addresses           | Hard | Phase 16 |
| 17  | Unaudited notice visible on every page with a trade button; every contract on the landing page shows verified source on the explorer | Hard | Phase 6, 17 |

##### 17.2 Stop rule

**Hard** gates: if any is red, nothing opens. The five UI gates are hard on purpose — shipping markets
nobody can use is the failure this plan exists to avoid.

**Feat** gates are per feature: red keeps that feature paused and does not stop the others. Gates 6 and 9
go **amber** rather than red if USDG was never funded (Section 0.3); amber opens the rest.

##### 17.3 Open sequence

```
20:40 WIB  1. Perps on the crypto set             (BTC, ETH, LINK, GLD — fresh at any hour)
20:45 WIB  2. Perps on the 32 equity markets      (US session now open, feeds refreshing)
20:50 WIB  3. Options on the equity markets
20:55 WIB  4. The TSLA/USDG credit pair
21:00 WIB  5. Verify leaderboard and PNL card populate; announce
```

Five minutes of clean readings between steps. Crypto opens **first** on purpose: its feeds are fresh at
any hour, so it proves the open sequence works before the equity markets depend on a session that has
only just started. Sample mode is already live and needs no unpause. The China group, the Pons market
and copy trading are not in this launch — Phase 18.

**Done when.** `docs/evidence/launch-gate.md` holds the filled table with evidence links, and every item
is marked open, capped, amber, paused or flagged off.

#### Phase 18 — Day-one watch, then deferred work (ongoing)

**Prompt.** Paste this to run the phase.

```text
Run Phase 18 of docs/DEVELOPMENT_PHASES.md: the day-one watch.

The first 24 hours are an observation window, not a build window. Watch oracle age, indexer lag, vault
liabilities against the pool, open interest against cap, and keeper balance. Keep a timestamped log.
Unpause one additional market at a time, never two at once, and only after an hour of clean readings.
Write the first incident review even if nothing goes wrong.

After the watch, work the deferred table in order. Item 1 is anything that went amber at the gate.
Then the China group (research already done; what is left is execution), the full failure and empty-state
pass, the full mobile pass, the landing page rework, the Pons market in two steps — quoted listing of
all 282 graduated tokens first, then tradeable — the options stepper, copy trading in full, the 24h
leaderboard window, and a real multisig for the owner role.

Before the copy-trading executor goes on it must pass: a leader long mirrored proportionally within 2
blocks; a leader close mirrored; a follower over cap recording a skip and opening nothing; unfollow
stopping mirroring at once; and the executor key failing to withdraw from a follower's subaccount.

Do NOT commit, push, stage or open a PR — I do that myself.
Report what you watched and what you advanced, then print the Phase 18 Ship block for me to run.
```

**Ship.** You run these; Claude does not.

```bash
git checkout main && git pull
git checkout -b phase-18-watch

git add docs/evidence docs/DEVELOPMENT_PHASES.md
git commit -m "docs(launch): record the day-one watch"

git push -u origin phase-18-watch

gh pr create --base main \
  --title "Phase 18 — Day-one watch" \
  --body "The first 24 hours of oracle age, indexer lag, vault liabilities, open interest and keeper balance, plus the first incident review.

Acceptance: <paste the result Claude reported>.
Evidence: docs/evidence/phase-18.md"
```

**Watch, first 24 hours.** Oracle age, indexer lag, vault liabilities against pool, open interest against
cap, keeper balance. Timestamped log. Unpause one additional market at a time, never two at once, and
only after an hour of clean readings. Write the first incident review even if nothing goes wrong.

**Then, in priority order.**

| #   | Deferred item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | From                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| 1   | Anything that went amber at the gate — in particular the mainnet round trip and the credit seed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Section 0.3          |
| 1b  | **The China group** — 2 tradeable (BABA, TSM), 4 quoted (UMC, FUTU, EWT, SIMO), labelled "China & Greater China" with Taiwan stated plainly. Plus the quoted-tier UI: tier badges, source and age on a quoted price, no trade button on a quoted row, search spanning all tiers. Research is done; what is left is execution                                                                                                                                                                                                                                                                                                                                                         | §3.1, Phase 11       |
| 1c  | **The mainnet/testnet toggle** (Phase 14b, if it was cut) — one deployment serving chain 4663 and chain 46630, switched at runtime, with the wallet switching chain and a persistent testnet label. The blocker is that `apps/web/src/lib/env.ts` resolves the chain once at module load; both address sets already exist in `packages/config`                                                                                                                                                                                                                                                                                                                                       | Phase 14b            |
| 2   | Full failure and empty-state pass on the remaining pages; copy review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Phase 12             |
| 3   | Full mobile pass on all 8 pages; screen-reader pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Phase 13             |
| 4   | Landing page rework: large display type, numbered `01`–`04` sections, motion within budget                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Phase 18             |
| 5   | **Pons market, in two steps.** First the **quoted** listing: port Levier's discovery pipeline — `LaunchSwept` enumeration off factory `0x7eD598…`, `getLaunchedToken()`, the token's own on-chain `getTokenInfo()` for logo, description and socials, DexScreener for price and market cap — and ship all **282** graduated tokens as `tier: "quoted"`, paginated and searchable. No contracts, no risk, and the group looks complete immediately. Then the **tradeable** step: deploy the ported `ponsperp` stack, promote only tokens clearing a market-cap and liquidity floor to `tier: "tradeable"`, tightest risk tier in the venue, paused first and opened after a clean day | `LAUNCH_MODEL.md` §6 |
| 6   | Multi-step stepper for option strategies and `StrategyBuilder`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Phase 8              |
| 7   | **Copy trading, the whole feature** — the `copy_follows` and `copy_executions` tables, the follow and unfollow endpoints, the capped subaccount, then the executor once leaders have a track record. The design is already written in `docs/evidence/phase-14.md`                                                                                                                                                                                                                                                                                                                                                                                                                    | Phase 14             |
| 8   | The `24h` leaderboard window first (a query parameter, not new machinery), then `7d` and `30d`, follower counts, per-market breakdown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Phase 10             |
| 9   | A real multisig and timelock for the owner role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Phase 16             |

**Executor acceptance, before it goes on.** A leader long mirrored proportionally within 2 blocks; a
leader close mirrored; a follower over cap recording a skip and opening nothing; unfollow stopping
mirroring at once; the executor key failing to withdraw from a follower's subaccount.

---

## 3. Schedule and run order

| Day              | Phases                         |
| ---------------- | ------------------------------ |
| Day 1 2026-10-04 | 0, 1, 2, 3, 4, 5               |
| Day 2 2026-10-05 | 6, 7, 8, 9                     |
| Day 3 2026-10-06 | 10, 11, 12, 13, 14, 15, 16, 17 |

**There are no hour estimates in this plan, by decision.** Claude is the developer, so a phase takes as
long as it takes and an estimate only invites a phase to be declared done on the clock instead of on its
acceptance check. What is fixed is the order, the gates, and the open: 2026-10-06 at 21:00 WIB.

The day grouping above is a target, not a budget. Run phases back to back and the days collapse; the
only hard rule is that Phase 15 passes before mainnet opens.

### 3.1 Option A is the decision (2026-10-03)

Three cuts are **already applied** to the phases above. They are not contingencies.

| Cut applied                                                                               | Phase |
| ----------------------------------------------------------------------------------------- | ----- |
| Leaderboard ships one window, `all`, instead of `24h` + `all`                             | 10    |
| **China group deferred to Phase 18. The crypto set stays** — crypto is the liveness win   | 11    |
| Copy trading becomes a static "coming soon" entry: no tables, no endpoints, no subaccount | 14    |

Consequences recorded honestly rather than quietly:

- **Feature 3, the China market, is not in the launch.** `LAUNCH_MODEL.md` Section 1 and the gate reflect it.
- **Feature 7, copy trading, is a label at launch**, not a working follow flow. Its Phase 15 clip is
  dropped rather than filmed misleadingly, leaving nine clips.
- The `ListingTier` type still lands in Phase 2, because Pons needs it in Phase 18. Only the **tier
  badges in the UI** (old 11c) defer, since with China gone nothing at launch renders a quoted row.

### 3.2 The open moves to 21:00 WIB, for a technical reason

14:00 WIB is 07:00 UTC. **US equity markets are closed then**, and `REFERENCE.md` Section 2, finding 4 measured every
equity feed at 16–27 hours old outside its session. Opening at 14:00 would launch a venue where every
equity market reads "closed" — technically correct and a terrible first impression.

US equity open is 09:30 ET = **20:30 WIB**. Opening at **21:00 WIB (14:00 UTC)** on 2026-10-06, a
Tuesday, means the feeds go fresh within the first half hour and the crypto set is live regardless.

### 3.3 The last day, in order

```
P15.1 Start the simulator             ── FIRST, and leave it running all day
P10   Leaderboard and PNL card
P11   Crypto set
P12   Failure and empty states
P13   Mobile and keyboard
P14   Copy trading static entry
P14b  Network toggle                  ── optional; skip it if the open is near
P15   Testnet acceptance + recording  ── hard gate + the documentation
P16   Rails and key separation
P17   Launch gate and open
      LAUNCH at 21:00 WIB, 30 minutes after US equity open
```

**If the open is getting close**, fire this ladder in order and stop at the first item that buys back
enough room:

1. Skip Phase 14b entirely. Nothing waits on it; it becomes Phase 18 item 1c
2. Phase 10 ships the PNL card only, no leaderboard page. Clip 6 narrows to the card
3. Phase 13 covers two surfaces instead of four
4. Phase 11 crypto set drops to BTC and ETH only

**Never cut:** Phase 7 sample mode, Phase 8 review step, Phase 12 error mapping, **Phase 15 in full
including the recording**, Phase 16 rails. The first three are the reason the previous platform went
unused. Phase 15 is both the gate and the only record that the product worked. Phase 16 is the reason an
unaudited launch is survivable.

**One scheduling note on the recording.** Phase 15 cannot move earlier, because it films features that
Phases 10 to 14 build. But 15.1 can: start the simulator at the beginning of Day 3 and leave it running
all day. Charts need price-tick history and the chain has no backfill, so a market that started five
minutes before filming looks empty. A day of bot activity films far better than ten minutes, and
`simulator backfill 72 replace` is the shortcut when it did not get one.

---

## 4. Phase dependency order

```
P0 Freeze ─► P1 Brand ─► P2 Groups ──────────────────► P11 Crypto
                      └► P3 UI contract ─┬─► P7 Sample ─► P8 Review ─┬─► P14 Copy
                                         ├─► P12 States              │
                                         └─► P13 Mobile              │
            P4 Caps ─► P5 Backend ─► P6 Web ───────────┴─────────────┤
                                            P9 Credit ───────────────┤
                                            P10 Board ──────────────┤
                                                                     │
                 P15 Testnet acceptance + recording ◄────────────────┘
                              │
                              └─► P16 Rails ─► P17 Gate and open ─► P18 Watch and deferred
```

- **Section 0.3 gates P4.** Caps cannot be sized against an unknown balance.
- **P3 gates every UI phase.** The contract precedes the work it governs.
- **P2 gates the crypto group** and, later, China and Pons.
- **P6 gates P7**, because sample mode needs the real price API behind it.
- **P7 gates P8**, because the review step is built and exercised in sample mode first, without gas.
- **P10 gates P14**, because copy trading is entered from the leaderboard.
- **P15 gates P17.** Nothing opens before the testnet walkthrough passes, UI gates included.
- **P15 needs every feature built**, which is why it sits after P14 and cannot move earlier.

---

## 5. Risk register

| Risk                                                 | Likelihood | Effect                                      | Response                                                                                                                      |
| ---------------------------------------------------- | ---------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **USDG never funded (0.295 USDG today)**             | **Open**   | **No pool, no seed, no real test trade**    | Section 0.3's ordered degradation: gates 6 and 9 go amber, everything else ships                                              |
| **The interface is again the reason nobody uses it** | Medium     | The launch works and still fails            | Five hard UI gates; sample mode removes the wallet wall; a review before every signature; UI exercised and filmed in Phase 15 |
| The last day runs out before the open                | **High**   | A phase slips into the open                 | Option A's three cuts are already applied (3.1); the open moved to 21:00 (3.2); a further ladder is in 3.3                    |
| Sample mode mistaken for real trading                | Medium     | A user believes they hold a position        | Persistent `SAMPLE DATA` on every balance and position surface, the header chip, the page title                               |
| Unaudited contracts hold real funds                  | Certain    | An unknown bug reaches user money           | Tiny on-chain caps, owner-only liquidity, the testnet gate, a rehearsed pause, a visible notice                               |
| Chainlink staleness outside the US session           | Certain    | Equity markets read closed much of the week | Session-aware limits (Phase 4); the crypto set is fresh at any hour (Phase 11); the open is timed to the US session (3.2)     |
| Testnet mock feeds hide a feed bug                   | Medium     | The walkthrough passes, mainnet prices fail | Phase 15.4 is the fork suite against real feeds; the Phase 4 feed-age table is separate evidence                              |
| One key holds every role until Phase 16              | Certain    | A leak before Phase 16 loses everything     | Phase 16 is on Day 3 and is a hard gate; the deployer key is the only one reused                                              |
| Copy trading entry read as working                   | Medium     | A user expects their trades to be mirrored  | The entry is explicitly unavailable, the flag is off, no endpoints exist, and no Phase 15 clip shows it                       |
| USDG paused or blacklists                            | Low        | Deposits and withdrawals stop               | Runbook step. Paxos controls this token and we do not                                                                         |

---

## 6. Conventions

- **A phase is done only when its acceptance check passes.** Nothing is ticked because it looks finished.
- **Evidence lives in `docs/evidence/`** with transaction hashes, and for UI phases screenshots at 375 px
  and 1440 px.
- **`docs/UI_CONTRACT.md` governs every interface change.** No new colours, radii or fonts; seven states
  per screen; no signature without a review; no raw revert strings.
- **Nothing is hardcoded.** Chain IDs, RPC URLs, addresses, leverage caps, fee percentages and market
  groups stay environment- or registry-driven, as `packages/config` already enforces.
- **Testnet and mainnet never share a database.** Two Railway environments, `mainnet` and `testnet`,
  each with its own Postgres service. Only one runs at a time (Section 0.9): Phase T creates `testnet` and
  stops the mainnet compute; Phase L deletes `testnet` and brings mainnet back.
- **Railway runs compute and Postgres.** One direct `DATABASE_URL` per environment serves runtime and
  migrations both — no transaction pooler, so no `prepare: false` and no `DIRECT_DATABASE_URL`. Hosting
  moved off Supabase on 2026-10-04 when its project limit was reached.
- **Drizzle owns the schema.** `services/indexer/src/db/schema.ts` is the source of truth. Do not add a
  second migration system — two over one database is how they diverge.
- **A paused market is a shipped market.** It renders, it prices, it refuses trades.
- **Sample data is always labelled.** No exceptions, no dismissable notices.
- **Secrets never reach a commit, an evidence file or the transcript.** Addresses only.
- **The testnet walkthrough is a gate, not a formality.** A red hard gate does not open.
- **Every recording says it is testnet with mock prices and simulated traders.** The clips outlive the launch.
- **Open partial rather than late** on features. Never open partial on the UI gates.
