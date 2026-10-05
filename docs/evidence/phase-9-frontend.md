# Phase 9 — frontend slice: the `/lending` page

Date: 2026-10-05. Result: **amber**. The page is built to the contracts lane's handoff
(`docs/evidence/phase-9.md`) and verified against a stand-in contract on a local node. It is amber because
the pair is not deployed on mainnet (USDG unfunded; the contracts lane's own result is amber), so there is
no real pair to read, and because the page is read-only by design (Section 4).

## 1. What was built

`/lending`, one page: the pair, your position, and a health-factor calculator.

| Piece | Where |
| ----- | ----- |
| Page | `app/lending/page.tsx`, `components/LendingView.tsx` |
| Health-factor arithmetic, mirrors `HumeCreditPair.getPosition`, 5 tests | `lib/lending.ts` |
| SDK reads: `credit.market(pair)`, `credit.position(pair, user)`, `credit.price(oracle, asset)` and a test | `packages/sdk/src/credit.ts` |
| Config: `NEXT_PUBLIC_CREDIT_PAIR`, `NEXT_PUBLIC_CREDIT_SYMBOL`, example thresholds | `lib/env.ts` |

## 2. Taken from the handoff, not guessed

| Fact | Used as |
| ---- | ------- |
| `healthFactorBps`, 10000 = 1.00x, at the liquidation threshold; under it, liquidatable | `fmtHealth` divides by 10,000; the colour and the words change at 10,000 |
| No debt reads 9,990,000; collateral gone with debt reads 0 | Both handled and tested: no debt shows a dash and `No loan`, not `999.00x` |
| `liquidationLtvBps` 7000 is the colour-change point; `maxLtvBps` 6000 is the borrow limit | Both marked on the loan-to-value bar, and read from the registry, not written in |
| `getPosition(address)` returns four values; `isLiquidatable(address)` | `credit.position` |
| Registry `MarketStatus` NORMAL, REDUCE_ONLY, PAUSED | `CREDIT_STATUS`; an unknown status reads as PAUSED, never as open (tested) |
| Liquidation bonus 5%, hardcoded in the pair | Read from the pair (`liquidationBonusBps()`), not written in the page |

The signatures were also checked against `HumeCreditPair.sol` and `HumeCreditRegistry.sol` in the contracts
worktree, including the registry's `MarketConfig` struct order.

## 3. The health factor, said plainly

Not just a number. For `1.73x`: the band word (`Safe`), what it means, how far the collateral can fall in
percent and in dollars (`Your TSLA can lose 42.1% of its value, falling from $370.00 to $214.29, before the
loan can be liquidated.`), and what happens at 1.00x (`anyone can repay part of the loan and take your
collateral plus a 5% bonus. You keep what is left. Over it, nobody can.`). The four bands are Safe (1.5x and
up), Watch it, Close to liquidation (under 1.2x), Liquidatable (under 1.0x); each is a word and a rule on the
bar, never colour alone.

The calculator has two controls (collateral amount, borrow as a share of its value) and shows the same
readout, so a visitor who has never used a lending market can move the slider past the borrow limit and the
liquidation line and see what each means. It needs no wallet and touches nothing.

## 4. A paused pair renders, prices, and refuses with a sentence

With the stand-in deployed paused: the page shows the pair, its limits, caps and totals, the position and the
health factor, and `Supply` and `Borrow` are disabled with `This market is paused. It still shows its prices
and your position, and it refuses new supply and new borrowing until it reopens.` Reduce-only has its own
sentence.

**The page is read-only in every state, deliberately.** A supply or borrow moves money, so it needs the
review step first (UI contract rule 3, and Phase 8 builds the lending review). Shipping a signing button
without it would be the failure the contract names. The page says so beside the disabled buttons, and says
what this page does do. This is the one thing the lead may want to change.

## 5. Seven states

| State | What renders | Screenshot (`docs/evidence/phase-9/`) |
| ----- | ------------ | ------------------------------------- |
| loading | skeleton rows in the pair and position panels | not captured: reads answer in well under the capture delay |
| empty | `Lending is not live on this network yet...` (no pair address); `You have not supplied anything yet...` (a pair, no position) | `lending-connected-notdeployed-1440`, `lending-sample-paused-375` |
| populated | pair, position, health readout, bar | `lending-connected-paused-1440`, `lending-connected-danger-1440` |
| error | `The lending pair could not be read right now. Nothing is wrong with your funds.` with `Try again` | not captured (needs an unreachable RPC; same component as the leaderboard's tested error) |
| offline | `You are offline, so the pair cannot be read.` | not captured |
| unauthorized / not-connected | `Connect a wallet to see what you have supplied...` with the connect button | `lending-sample-paused-1440` area; `21-disconnected-portfolio-375` is the same pattern |
| paused | the refusal sentence, the `Paused` chip, disabled buttons, everything else still shown | `lending-connected-paused-1440`, `lending-sample-paused-1440/375` |
| sample | `SAMPLE DATA` on the page title, the position panel and the calculator; `Sample mode has no lending account` | `lending-sample-calculator-1440/375` |

Honesty about the screenshots: the pair and position panels were rendered against a stand-in contract on a local
node (`anvil --chain-id 4663`) answering the published signatures, in three configurations: paused with a 1.73x
position, open with a 1.08x position, and no pair. Loading, error and offline use the same patterns as the
leaderboard, which was captured in all three.

## 6. Blockers and notes for the lead

1. **`packages/config` and `packages/types` are not in this worktree.** The contracts lane added
   `creditPairTslaUsdg` (and four siblings) and `CreditPosition`, `CreditMarketConfig`, `CreditMarketStatus`.
   This lane may not edit either package, so `lib/env.ts` reads the pair from `NEXT_PUBLIC_CREDIT_PAIR` first and
   falls back to `addresses.creditPairTslaUsdg` through a loose record, which builds before and after the key
   exists. After the lead merges the contracts branch the fallback activates with no frontend change. The
   SDK's return types are inferred from the ABI rather than re-declaring `CreditPosition`.
2. **Addresses are TBD** in the handoff. Until the operator broadcasts `DeployCreditStack.s.sol` and records
   them, the page shows its not-live state on every network.
3. **The collateral price source.** The calculator prices TSLA from the pair's own oracle when a pair exists
   and from the terminal's index price otherwise (the last close while its session is shut, in sample mode). The
   credit oracle is a manual feeder, so the two can differ; the page labels the terminal price when it is the
   one in use.

## 7. Paths changed

```
apps/web/src/app/lending/page.tsx
apps/web/src/components/LendingView.tsx, Header.tsx (nav item)
apps/web/src/lib/lending.ts (+ test), env.ts
apps/web/src/hooks/queries.ts (useCreditMarket, useCreditPosition, useCreditCollateralPrice)
packages/sdk/src/credit.ts (+ test), client.ts, index.ts
docs/evidence/phase-9-frontend.md, docs/evidence/phase-9/*.png
```
