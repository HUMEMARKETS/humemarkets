# Hume — lanes, waves and phase anchors

How the phases in [`DEVELOPMENT_PHASES.md`](DEVELOPMENT_PHASES.md) are split across parallel Claude
lanes. **This file duplicates nothing.** The phases doc stays the source of truth for the work
itself; this file only says who runs which phase, when, and which lines to read.

Read [`../CLAUDE.md`](../CLAUDE.md) first — it holds the rules every lane obeys.

## 1. Lane path ownership

One git worktree per lane per wave. A lane that writes outside its owned paths has broken the
isolation that makes the wave safe.

| Lane          | Owns                                                               | Never touches                          |
| ------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **contracts** | `packages/contracts/**`, `packages/config/**`, `packages/types/**` | `apps/web/**`, `services/**`           |
| **backend**   | `services/**`                                                      | `packages/contracts/**`, `apps/web/**` |
| **frontend**  | `apps/web/**`, `packages/ui/**`, `packages/sdk/**`                 | `packages/contracts/**`, `services/**` |

`services/` is api, indexer, keeper, pricing, hedger, risk-monitor and simulator.

**`packages/config` and `packages/types` are the real collision risk**, because every lane consumes
them. The contracts lane owns both outright. Any other lane that needs a type or a config key stops
and reports it as a blocker; the lead applies the edit serially between waves. This is cheaper than
resolving the conflict after three PRs are open.

Shared files no lane owns: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
`CLAUDE.md`, this file. Only the lead edits them.

## 2. Waves

Derived from the dependency graph in `DEVELOPMENT_PHASES.md` Section 4, not from the three lane
names. The graph is mostly a chain, so most phases cannot be parallelised and the honest wave table
is short.

| Wave   | Phases                                                      | Mode               | Lanes                                   |
| ------ | ----------------------------------------------------------- | ------------------ | --------------------------------------- |
| **0**  | P4 caps                                                     | serial             | contracts — no fan-out exists           |
| **1**  | P5 backend → P6 web                                         | serial             | P6 needs P5's API                       |
| **2**  | P7 sample · P9 credit · P10 leaderboard                     | **parallel, 3**    | frontend · contracts · backend          |
| **2b** | P8 guided review                                            | serial             | frontend — P7 gates it                  |
| **3**  | P11 crypto · P12 states · P13 mobile                        | **parallel, 2-3**  | contracts+backend · frontend · frontend |
| **4**  | P14 copy → P15 testnet + recording → P16 rails → P17 open    | serial             | P15 is the operator's; P17 asks first   |
| after  | P14b toggle if it was cut, then P18                          | serial             | —                                       |

**Why so little parallelism.** Section 4's graph is `P4 → P5 → P6 → P7 → P8 → P14`, a near-pure
chain, and `P15` needs every feature built. Wave 2 and Wave 3 are the only genuine branch points.
Running a lane before its gate phase means reworking it, which is slower than waiting.

Two gates no wave may cross: **P3 gates every UI phase** (merged, `c1df028`), and **P15 gates P17** —
nothing opens before the testnet walkthrough passes.

## 3. Phase line anchors

Read your phase with `sed`, never the whole file.

```bash
sed -n '588,659p' docs/DEVELOPMENT_PHASES.md   # Phase 4
```

| Phase | Lines     | Phase | Lines       |
| ----- | --------- | ----- | ----------- |
| 0     | 312–380   | 10    | 1085–1160   |
| 1     | 381–435   | 11    | 1161–1252   |
| 2     | 436–503   | 12    | 1253–1320   |
| 3     | 504–587   | 13    | 1321–1382   |
| 4     | 588–659   | 14    | 1383–1463   |
| 5     | 660–786   | 14b   | 1464–1572   |
| 6     | 787–853   | 15    | 1573–1729   |
| 7     | 854–931   | 16    | 1730–1806   |
| 8     | 932–1007  | 17    | 1807–1904   |
| 9     | 1008–1084 | 18    | 1905–2119   |

Section 0 is lines 99–286 and holds the access facts, the USDG blocker and the working agreement.
Regenerate this table after any edit that moves the phases:

```bash
grep -n '^#### Phase' docs/DEVELOPMENT_PHASES.md
```

## 4. Running a wave

The lead session does this. The operator still runs every commit, push and PR.

```bash
git worktree add ../hume-frontend  -b phase-07-sample main
git worktree add ../hume-contracts -b phase-09-credit main
git worktree add ../hume-backend   -b phase-10-board  main
```

Branch names stay `phase-NN-<slug>`, so Section 0.7's one-branch-one-commit-one-PR-per-phase
convention is unchanged: a three-lane wave produces three branches and therefore three PRs, each
with its own evidence file and its own acceptance result.

Each lane is launched with the matching agent in `.claude/agents/` and is given one phase, its line
range, and its worktree path. Its task slice lives in `docs/tasks/<lane>.md`:
[`tasks/contracts.md`](tasks/contracts.md), [`tasks/backend.md`](tasks/backend.md),
[`tasks/frontend.md`](tasks/frontend.md).

**Two phases cross lanes, and only two: P9 and P10.** Each one's task file carries a *handoff* block —
the shapes the other lanes build against. The owning lane publishes its handoff into that phase's
evidence file **before** it starts implementing, so the dependent lanes do not idle for a wave. P11 and
P12 look cross-lane but only read the other lane's files, so they need no handoff. A lane reports at most 25 lines: paths changed, acceptance result,
blockers. It does not narrate and it does not dump diffs.

Before each lane's PR, run `/security-review` on that lane's diff. For the contracts lane the
priority targets are `packages/contracts/src/risk`, `src/oracle` and `src/credit`. This is a local
review, not an audit — Section 0.8 still holds.

After the wave merges, the repo must be green from the root:

```bash
pnpm typecheck && pnpm lint && pnpm test
bash scripts/check-brand.sh && bash scripts/check-hex.sh
cd packages/contracts && forge test
```

Then remove the worktrees:

```bash
git worktree remove ../hume-frontend && git worktree remove ../hume-contracts && git worktree remove ../hume-backend
```

If three PRs in a wave conflict, the cause is path ownership, not the lanes. Tighten the table in
Section 1 rather than going back to serial.

## 5. Operator runbook — what to type

Three prompt shapes. Nothing else is needed.

### 5a. A serial phase — unchanged

Waves 0, 1, 2b and 4 are serial. Paste the phase's own **Prompt** block from
`DEVELOPMENT_PHASES.md`, exactly as it is written there. It is self-contained on purpose. One session,
one phase, then it stops.

Nothing about the lane setup changes this. Most of the remaining plan runs this way.

### 5b. A parallel wave — the lead prompt

One session is the lead. Paste this, with the wave number changed:

```text
Run Wave 2 as docs/LANES.md Section 4 defines it. You are the lead, not a lane.

Read CLAUDE.md and docs/LANES.md. Create the three worktrees for this wave with the branch names in
Section 4. Then launch the three lane agents in parallel, one phase each:

  hume-frontend  Phase 7   ../hume-frontend    phase-07-sample
  hume-contracts Phase 9   ../hume-contracts   phase-09-credit
  hume-backend   Phase 10  ../hume-backend     phase-10-leaderboard

Give each lane its worktree path, its branch name, its phase line range, and the instruction to read
docs/tasks/<its lane>.md.

Enforce the handoff rule: the contracts lane publishes the Phase 9 health-factor block into
docs/evidence/phase-9.md before it deploys, and the backend lane publishes both Phase 10 response
shapes into docs/evidence/phase-10.md before it writes the derivation. The dependent lanes build
against those, not against a deployed route.

When all three report, check that each worktree's changed paths stay inside its owned paths per
Section 1, run /security-review on each diff, and report the three results in one table.

Do NOT commit, push, stage or open a PR — I do that myself. Print the three Ship blocks.
```

The lead does not write code during a wave. It creates the worktrees, launches the lanes, checks
isolation, and collects three reports.

### 5c. One lane in its own terminal

For a single lane, or to watch one lane in its own tmux pane, start a session in that worktree and
paste:

```text
You are the hume-backend lane. Your worktree is this directory and your branch is phase-10-leaderboard.

Read CLAUDE.md, docs/LANES.md Sections 1 and 3, and docs/tasks/backend.md. Then read Phase 10 only:
sed -n '1085,1160p' docs/DEVELOPMENT_PHASES.md

Do your slice of that phase and nothing else. Publish the two response shapes into
docs/evidence/phase-10.md before you write the derivation — the frontend lane is building against
them in parallel.

Do NOT commit, push, stage or open a PR. Report at most 25 lines in your agent file's format, then
stop.
```

Swap the lane name, the phase number and the line range from Section 3. One terminal per lane costs
more tokens than the lead launching them, because each session reads the rules again from cold.

### 5d. After a wave

Three branches exist, one per phase. Run each phase's own **Ship** block from
`DEVELOPMENT_PHASES.md`, from inside that phase's worktree, in dependency order. Merge, then from the
main checkout:

```bash
git checkout main && git pull
pnpm typecheck && pnpm lint && pnpm test
bash scripts/check-brand.sh && bash scripts/check-hex.sh
cd packages/contracts && forge test
```

Then remove the worktrees, as Section 4 shows. A wave is not finished until `main` is green.
