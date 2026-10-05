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
