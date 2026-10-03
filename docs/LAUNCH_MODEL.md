# Hume — Launch Model

**What Hume is, and the decisions that shaped the launch.** Settled choices live here so they are not
re-argued mid-execution. Each one records who decided it, when, and how to reverse it.

Companion files: [`DEVELOPMENT_PHASES.md`](DEVELOPMENT_PHASES.md) is the work sequence,
[`REFERENCE.md`](REFERENCE.md) holds the measured facts, and [`UI_CONTRACT.md`](UI_CONTRACT.md)
governs the interface.

---

## 1. The eight features

Hume is an onchain derivatives and credit venue for tokenized equities on Robinhood Chain. Eight
features define it. Nothing outside this list is in scope before launch.

| #   | Feature                 | What it is                                                                                                                                                                                                   | Built in                  |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1   | **Perps**               | Trade an asset with leverage and no expiry. Long if the price should rise, short if it should fall                                                                                                           | Exists. Phases 4, 6       |
| 2   | **Options**             | Contracts giving the right, not the obligation, to buy or sell at a strike before or at expiry. Calls and puts                                                                                               | Exists. Phases 5, 6       |
| 3   | **China market**        | A dedicated group for China-linked assets. Research complete: **BABA** and **TSM** are the only two with a Chainlink feed; UMC, FUTU, EWT and SIMO are tokenized but unpriced. **Cut from launch, Phase 18** | **Phase 18**              |
| 4   | **Pons market**         | A dedicated, risk-isolated group for Pons tokens, priced off a TWAP with the tightest limits in the venue                                                                                                    | **Phase 18**, post-launch |
| 5   | **Leaderboard**         | Traders ranked by PNL, ROI or volume, over a 24-hour and an all-time window                                                                                                                                  | Phase 10                  |
| 6   | **PNL card**            | A trader's result as a shareable image. The one light surface in the product (`UI_CONTRACT.md` Section 4)                                                                                                    | Phase 10                  |
| 7   | **Copy trading**        | Mirror another trader's positions proportionally into a capped subaccount. **Cut to a visible entry point at launch; the whole feature is Phase 18**                                                         | Phase 14, 18              |
| 8   | **Lending / borrowing** | Deposit to earn yield; deposit collateral to borrow against it, within a health requirement. One pair at launch: TSLA collateral, USDG borrowed                                                              | Phase 9                   |

**At the open:** features 1, 2, 5, 6 and 8 are live, plus a crypto market group that is not on this list
because it was not requested — BTC, ETH, LINK and GLD, added in Phase 11 because without it the venue
shows nothing but closed markets outside US trading hours.

**Not at the open:** feature 3 (China) and feature 4 (Pons) are deferred whole; feature 7 (copy trading)
is a visible but explicitly unavailable entry point. All three are Phase 18, and Section 6 here and `DEVELOPMENT_PHASES.md` Section 3.1
give the reasoning.

Two of the eight need no new contracts — the leaderboard and the PNL card are read-only derivations over
the indexer's event log. Two more are already written and only need deploying: lending/borrowing and
Pons were ported from Levier (`REFERENCE.md` Section 1). That is why eight features fit in three days.

## 2. The decision: no audit

**A smart-contract audit is skipped entirely** — not deferred, not pending. Decided 2026-10-03 and
confirmed, because the goal is to launch as soon as possible. Not re-argued, and no phase waits on a
security review; `DEVELOPMENT_PHASES.md` Section 0.8 records the check that nothing does.

What replaces it is a bound on the loss, not a claim of equivalent safety — four controls that are
phases rather than intentions:

1. **The testnet `46630` walkthrough must pass before mainnet opens**, and is filmed (Phase 15).
2. **Caps are tiny and enforced on chain** (Phase 4), sized against the real owner balance.
3. **Only the owner wallet seeds liquidity.** No external deposits solicited on day one.
4. **Pause is rehearsed on both chains before open** (Phase 16). An unrehearsed pause is not a control.

The web app carries a plain "unaudited" notice on every page with a trade button.

## 3. Testing that was removed, and what stays

Instruction on 2026-10-03: remove unnecessary testing. Removed:

| Removed                                       | Why it was redundant                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `TestnetFork.t.sol` run                       | The live testnet walkthrough in Phase 15 covers the same ground against a real chain |
| Three deliberately failed transactions        | Reduced to one per failure class: revert, cap hit, user rejection                    |
| The 15-minute wait between every unpause step | Reduced to 5 minutes, and only between the first three steps                         |

**Reinstated on 2026-10-03**, after the requirement for a recorded testnet walkthrough:

| Reinstated                                | Why the earlier removal was wrong                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The credit stack on testnet               | It was cut because Phase 9 proves the lifecycle on mainnet. That covers verification and not **documentation** — lending cannot be filmed on mainnet with a sub-dollar balance |
| The copy-trading tables on testnet        | Same reason. Mainnet gives one capped subaccount; testnet gives a leader, a follower and a visible skip                                                                        |
| **Every feature, end to end, on testnet** | A recorded walkthrough is a different purpose from a redundant check. Phase 15 is now the acceptance **and** the documentation pass                                            |

Testnet costs nothing and risks nothing: the chain `46630` deployment already exists, gas comes from the
faucet, and the testnet collateral token has a **public `mint`**. None of this touches the mainnet USDG
blocker in `DEVELOPMENT_PHASES.md` Section 0.3 — **the walkthrough can be filmed in full even if mainnet is never funded.**

Kept, and not negotiable:

- **`MainnetFork.t.sol`** — 7 tests against real feeds and real USDG. It is the only thing covering the
  one gap a mock-feed testnet cannot (Section 15).
- **The Phase 15 walkthrough** of every feature, filmed, including a liquidation and all five UI surfaces.
- **The Phase 16 mainnet pause rehearsal.**
- **`check-launch-limits.sh` and `check-admin-roles.sh`** at the gate.

## 4. Launch day sequence, 2026-10-06

```
1. Testnet acceptance and recording pass      (Phase 15)
2. Safety rails verified on mainnet           (Phase 16)
3. Launch gate table filled in                (Phase 17)
4. Mainnet markets unpaused, in tiers         (Phase 17.3) ── 21:00 WIB
```

Mainnet contracts are already deployed and already closed, so "opening" is an unpause, market by market.
Cheapest possible launch, easiest to reverse.

## 5. Feature state at open

| Tier  | Item                               | State on 2026-10-06 21:00 WIB                                                                   |
| ----- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| **A** | Perps, Options                     | Open, capped — 32 equity markets                                                                |
| **A** | Crypto markets                     | Open, capped — BTC, ETH, LINK, GLD. The 24/7 liveness fix (Phase 11)                            |
| **A** | Sample mode, guided review, states | Live on every trading page — same tier as the markets                                           |
| **B** | Lending, Borrowing                 | Open, 1 pair (TSLA/USDG), owner-seeded, capped — subject to `DEVELOPMENT_PHASES.md` Section 0.3 |
| **B** | Leaderboard, PNL card              | Open — read-only, no custody risk                                                               |
| **—** | China market                       | **Cut from launch (`DEVELOPMENT_PHASES.md` Section 3.1).** Phase 18                             |
| **C** | Copy trading                       | **Visible entry point, explicitly unavailable.** No follow flow. Phase 18                       |
| **C** | Pons market                        | **Not deployed on launch day.** Deferred whole to Phase 18                                      |

## 6. Three scope decisions, and how to reverse them

**Pons moves out of launch day entirely.** The earlier plan spent 4 hours deploying a group that would
launch paused anyway. Those hours now pay for sample mode. Pons is ported, the Levier scripts exist, and
nothing gets harder in a week. _Reverse:_ take 4 hours back from Phases 7 and 8 and accept that a
stranger still meets a wallet wall.

**Copy trading ships with the executor off.** It needs leaders with a track record, and on launch day the
leaderboard is empty — there is nobody to copy. Phase 14 builds the model, the capped subaccount and the
follow flow; the executor turns on in Phase 18. _Reverse:_ Phase 14 grows from 2 h to 6 h and must pass
the Phase 18 executor acceptance.

**Four UI phases ship a launch scope, not their full scope.** Phases 8, 10, 12 and 13 each name a launch
scope and a full scope deferred to Phase 18. This is what makes three days arithmetically possible.
