# Phase 9 — Lending and borrowing

**Result: amber.** USDG unfunded (0.295277 USDG, measured Phase 4). Pair deployed paused. Deployment
scripts and configuration are complete; lifecycle skipped per degradation path.

## Handoff: credit stack interface

### Addresses (TBD after broadcast)

The operator broadcasts `DeployCreditStack.s.sol` and records these four addresses below.

| Contract            | Proxy address | Notes                          |
| ------------------- | ------------- | ------------------------------ |
| HumeCreditRegistry  | TBD           | Central registry for all pairs |
| HumeCreditRouter    | TBD           | Atomic deposit+borrow, repay+withdraw |
| HumeCreditVault     | TBD           | ERC-4626 custody (deposits paused at init) |
| HumeCreditPair (TSLA/USDG) | TBD   | The one lending pair           |
| CompositeSanityOracle | TBD         | Manual feeder oracle for credit prices |

Token addresses:
- TSLA collateral: `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` (18 decimals assumed)
- USDG debt: `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 decimals confirmed)

### Health factor view function

```solidity
function getPosition(address user)
    external
    view
    returns (
        uint256 collateralAmount,   // in collateral token base units
        uint256 debtAmount,         // in debt token base units
        uint256 collateralValueUsd, // USD value scaled 1e18
        uint256 healthFactorBps     // basis points: 10000 = 1.00x
    );
```

**Scaling:** `healthFactorBps` is in basis points where 10000 = 1.00x (at liquidation threshold).
Higher is safer. A position with `healthFactorBps < 10000` is liquidatable. No debt returns 9990000
(999.00x). Zero collateral with debt returns 0.

**Computation:** `healthFactorBps = (collateralValueUsd * liquidationLtvBps / 10000) * 10000 / debtValueUsd`

### Liquidation threshold

`isLiquidatable(address user) returns (bool)` — true when debt value exceeds
`collateralValue * liquidationLtvBps / 10000`.

- `liquidationLtvBps`: **7000** (70%). The colour-change point for the frontend.
- `maxLtvBps`: **6000** (60%). The borrow limit. Borrows that would push LTV above this revert.

### Risk parameters as configured

| Parameter         | Value   | Unit / scale                                   |
| ----------------- | ------- | ---------------------------------------------- |
| maxLtvBps         | 6000    | basis points (60%)                             |
| liquidationLtvBps | 7000    | basis points (70%)                             |
| maxLeverageBps    | 25000   | basis points (2.5x, basis 10000 = 1x)         |
| liquidationBonusBps | 500   | basis points (5%), hardcoded in pair           |
| supplyCap         | 1000000000000000 | TSLA base units (1e15 = 0.001 TSLA)  |
| borrowCap         | 8000    | USDG base units (6 dec) = 0.008 USDG          |
| riskTier          | TierA   | enum: TierA=0, TierB=1, TierC=2, Experimental=3 |
| status            | PAUSED  | enum: NORMAL=0, REDUCE_ONLY=1, PAUSED=2       |

Supply cap sized conservatively: 0.001 TSLA (~$0.37 at $370/TSLA). Borrow cap matches Phase 4
maxPositionRaw (8000 base units). Both can be raised when USDG is funded.

### Market slug and ID

- Slug: `tsla-usdg`
- marketId: `keccak256(abi.encodePacked("tsla-usdg", 0x322F0929c4625eD5bAd873c95208D54E1c003b2d, 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168))`

### Oracle

The credit pair uses `CompositeSanityOracle` (manual feeder, not Chainlink-direct). Prices are scaled
1e18 (e.g. $370.00 = 370e18). The pricing service pushes prices to it via `setPrice(address asset,
uint256 newPrice)`. Staleness is set to 32400 seconds (9 hours, matching Phase 4 default).

### Additional view functions for the frontend

On `HumeCreditPair`:
- `accounts(address) returns (uint256 collateral, uint256 debt)` — raw position
- `totalSupplyCollateral() returns (uint256)` — total collateral deposited
- `totalBorrowedDebt() returns (uint256)` — total debt outstanding
- `isLiquidatable(address) returns (bool)` — liquidation check
- `debtValueUsd(uint256 amount) returns (uint256)` — debt value in 1e18 USD

On `HumeCreditRegistry`:
- `getMarket(bytes32 marketId) returns (MarketConfig)` — full market config
- `getMarketCount() returns (uint256)` — number of registered markets
- `allMarketIds(uint256 index) returns (bytes32)` — iterate markets

## Deployment

Script: `packages/contracts/script/DeployCreditStack.s.sol`

```bash
# Dry run (no broadcast):
CREDIT_COLLATERAL_TOKEN=0x322F0929c4625eD5bAd873c95208D54E1c003b2d \
  forge script script/DeployCreditStack.s.sol \
    --rpc-url https://rpc.mainnet.chain.robinhood.com \
    --account hume-mainnet --sender 0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C

# Broadcast (operator only):
CREDIT_COLLATERAL_TOKEN=0x322F0929c4625eD5bAd873c95208D54E1c003b2d \
  forge script script/DeployCreditStack.s.sol \
    --rpc-url https://rpc.mainnet.chain.robinhood.com \
    --account hume-mainnet --sender 0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C \
    --broadcast --slow
```

## On chain

None. Deployment scripts written but not broadcast (operator runs them).

## Lifecycle (post-funding)

Script: `packages/contracts/script/CreditLifecycle.s.sol`

Run only after USDG is funded and the pair is unpaused:
```bash
forge script script/CreditLifecycle.s.sol \
  --rpc-url https://rpc.mainnet.chain.robinhood.com \
  --account hume-mainnet --sender 0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C \
  --broadcast --slow
```


---

## Frontend half: Phase 9 — frontend slice: the `/lending` page

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
