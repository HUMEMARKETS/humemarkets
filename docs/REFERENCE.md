# Hume — Reference

**Measured facts, not plans.** Everything here was read from the chain, from an API, or from the
repository on 2026-10-03. It changes only when the world changes, which is why it lives apart from
`DEVELOPMENT_PHASES.md`.

Companion files: [`DEVELOPMENT_PHASES.md`](DEVELOPMENT_PHASES.md) is the work sequence,
[`LAUNCH_MODEL.md`](LAUNCH_MODEL.md) holds the features and the scope decisions, and
[`UI_CONTRACT.md`](UI_CONTRACT.md) governs the interface.

**Re-measure before trusting a number here.** Chainlink adds feeds, Robinhood adds tokenized assets,
and the owner wallet's balances change. Each section says what to re-run.

---

## 1. What already exists (verified 2026-10-03)

### 1.0 The monorepo

Already implemented. `pnpm-workspace.yaml` declares three globs and Turborepo orchestrates the tasks:

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

**13 workspace packages**, all cross-referenced with `workspace:*` rather than versions:

| Area        | Packages                                                                              |
| ----------- | ------------------------------------------------------------------------------------- |
| `apps/`     | `web`                                                                                 |
| `services/` | `api`, `indexer`, `pricing`, `keeper`, `risk-monitor`, `hedger`, `simulator`           |
| `packages/` | `contracts`, `sdk`, `ui`, `config`, `types`                                            |

`turbo.json` defines `build`, `dev`, `lint`, `test` and `typecheck`, so one command runs a task across
the graph in dependency order:

```bash
pnpm turbo run typecheck                              # everything
pnpm turbo run test --filter @hume/config             # one package
pnpm --filter @hume/indexer exec tsx src/db/migrate.ts  # one package's binary
```

Nothing in the launch plan changes this. Every phase's commands already use `pnpm turbo` or
`pnpm --filter`.

### 1.1 This repository is AlphaMarkets, renamed

Hume is not greenfield. This repository **is** the former `alphamarkets` repository with a rename in
progress: the working tree holds an uncommitted `alphamarkets → hume` rebrand across the web app,
packages, services and assets. `~/next_project/alphamarkets` is the pre-rename copy — a reference, not a
source to port from.

**Consequence:** perps and options do not need building. They need finishing, pointing at mainnet,
making usable by a stranger, and switching on.

### 1.2 Already deployed to mainnet (chain 4663)

21 contracts, deployed 2026-09-25, recorded in `packages/contracts/deployments/robinhood_mainnet.json`.
Deployed **empty and not open**: no pool funding, one wallet holding every admin role, no backend.

| Group      | Contracts                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Core       | `marketRegistry`, `vault`, `collateralManager`, `feeManager`, `insuranceFund`, `buybackModule`                |
| Perps      | `perpsEngine`, `perpPositionManager`, `perpOrderManager`, `fundingManager`, `liquidationEngine`, `rfqManager` |
| Options    | `optionsEngine`, `optionMarket`, `optionPositionManager`                                                      |
| Risk       | `riskManager`, `crossMargin`                                                                                  |
| Oracle     | `oracleRouter`, `priceValidator`                                                                              |
| Accounts   | `subaccountFactory`                                                                                           |
| Settlement | USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 decimals, Paxos, upgradeable)                            |

All behind UUPS proxies, so upgrades keep every address and all state.

A parallel testnet deployment exists at `packages/contracts/deployments/robinhood_testnet.json`
(chain `46630`). It is the Phase 15 walkthrough environment (`DEVELOPMENT_PHASES.md`). **Do not tear it down.**

### 1.3 Market inventory already prepared

`packages/contracts/deployments/robinhood_mainnet.markets.json` — 32 markets with token address,
Chainlink feed, max leverage, maintenance margin:

```
NVDA AAPL TSLA MSFT GOOGL AMZN META COIN MSTR SPY QQQ AMD ASML BABA CLSK
CRCL CRWV EWY GME INTC IONQ MU NBIS ORCL PLTR RGTI RKLB SLV SNDK SPCX TSM USO
```

11 had a live Chainlink feed as of 2026-09-25; 21 more are prepared but unlisted. Feeds have a **24-hour
heartbeat**, which drives `DEVELOPMENT_PHASES.md` Phase 4's staleness policy.

### 1.4 The web app that already exists

The interface is not missing. It is unfinished in a specific way.

| What exists       | Where                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design tokens     | `apps/web/src/app/globals.css` — Tailwind 4 `@theme`: token names (`ground`, `surface`, `raised`, `line`, `text`, `muted`, `faint`, `accent`, up/down), a four-step radius hierarchy, and computed contrast ratios. **The values are dark teal today and are replaced by the `UI_CONTRACT.md`.4 palette in Phase 3**; the names do not change |
| Typography        | Geist for text, Tomorrow for display, via `--font-sans` / `--font-serif`                                                                                                                                                                                                                                                                      |
| Shared primitives | `packages/ui/src/` — `Button`, `Panel`, `Tabs`, `Segmented`, `Stat`, `Num`, `TextField`, `Skeleton`, `cn`, `interaction`                                                                                                                                                                                                                      |
| App components    | 55 in `apps/web/src/components/` — `AppShell`, `OrderPanel`, `TradeSheet`, `OptionChain`, `OptionTicket`, `StrategyBuilder`, `RiskLadder`, `PositionsTable`, `TradingChart`, `TxToasts`, `WalletButton` and more                                                                                                                              |
| Charts            | `lightweight-charts` v5                                                                                                                                                                                                                                                                                                                       |
| Pages             | `/`, `/markets`, `/perpetuals`, `/options`, `/strategies`, `/portfolio`, `/activity`, `/docs`                                                                                                                                                                                                                                                 |
| Stack             | Next 15, React 19, wagmi 2, viem 2, `@tanstack/react-query` 5, `zustand` 5, Tailwind 4                                                                                                                                                                                                                                                        |

### 1.5 Scripts, tests and CI that already exist

The plan cites these by their real paths. Verified present on 2026-10-03:

| Artifact                                              | Path                                                                                                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand audit                                           | `scripts/check-brand.sh`                                                                                                                                                                                    |
| Launch-limits check                                   | `packages/contracts/script/check-launch-limits.sh`                                                                                                                                                          |
| Admin-role check                                      | `packages/contracts/script/check-admin-roles.sh`                                                                                                                                                            |
| Deploy, market, pool, OI, handover scripts            | `packages/contracts/script/DeployAll.s.sol`, `AddMarket.s.sol`, `AddMainnetMarket.s.sol`, `ConfigureMarkets.s.sol`, `FundPool.s.sol`, `SetNetOpenInterest.s.sol`, `HandOverAdmin.s.sol`, `UpgradeAll.s.sol` |
| Verification helpers                                  | `packages/contracts/script/verify.sh`, `verify-full.sh`, `verify-retry.sh`                                                                                                                                  |
| Mainnet fork suite (7 tests: state, USDG, every feed) | `packages/contracts/test/fork/MainnetFork.t.sol`                                                                                                                                                            |
| Testnet fork suite                                    | `packages/contracts/test/fork/TestnetFork.t.sol`                                                                                                                                                            |
| CI                                                    | `.github/workflows/ci.yml`, `contracts.yml`, `release-sdk.yml`                                                                                                                                              |
| Turbo tasks                                           | `build`, `dev`, `lint`, `test`, `typecheck`                                                                                                                                                                 |

### 1.6 Code already ported from Levier

`~/next_project/levier` is a separate product **already live on the same mainnet chain 4663**. Parts are
already ported here:

| Hume feature         | Where the code already is                                                                                                                                                                                | State                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Lending / borrowing  | `packages/contracts/src/credit/` — `HumeCreditPair`, `HumeCreditRouter`, `HumeCreditVault`, `HumeCreditRegistry`, `HumeCreditProxies`                                                                    | Ported, **not deployed to mainnet** |
| Pons market          | `packages/contracts/src/ponsperp/` — `HumePonsPerpManager`, `HumePonsTwapOracle`, `HumePonsVault`, `IPonsFactory`                                                                                        | Ported, **not deployed** (Phase 18) |
| Pons token discovery | Levier `mainnet_pons_fast_1m.json`, `scripts/deploy-rh-mainnet-pons.mjs`, `scripts/open-rh-mainnet-pons.mjs`. Pons factory V2 `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e`, DexScreener, `graduatedOnly` | Reusable as-is                      |
| Credit deploy script | Levier `scripts/deploy-rh-lending.mjs`                                                                                                                                                                   | Template for Phase 9                |
| Price publishing     | Levier `apps/price-oracle/`                                                                                                                                                                              | Reference, Phase 18                 |

**Also reusable, already here:**

- `packages/contracts/src/accounts/Subaccount.sol` and `SubaccountFactory.sol` — the delegation
  primitive copy trading uses (Phase 14). No new custody contract needed.
- `services/simulator/` — moves mock prices, runs bot traders and a liquidator. The Phase 15 walkthrough
  engine and the Phase 10 sample-mode data source. Already written.

### 1.7 What does not exist yet

- Leaderboard, PNL card, copy trading — no code, no schema, no endpoint
- Market groups — `packages/config/src/` has `chains.ts`, `deployments.ts`, `env.ts` and no notion of a
  group, so the China market has nowhere to live (Phase 2)
- A mainnet backend — indexer, API, pricing, keeper all run free-plan against testnet
- **Sample mode** — nothing in the app works without a connected wallet (Phase 7)
- **A review step before signing** — `OrderPanel` and `TradeSheet` submit directly (Phase 8)
- **Plain-language failures and zero states** (Phase 12)

---

---

## 2. Market coverage: what can actually be listed

Researched and measured on 2026-10-03. Every number here was read from the chain or from Chainlink's
feed directory, not estimated.

### What exists

| Source                                               | Count   | Note                                                                                                             |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| Tokenized assets on Robinhood Chain                  | **194** | `api.robinhood.com/rhj/assets`. Each carries `logoUrl`, `isin`, `status`, `tokenDecimals`, `tradingCapabilities` |
| Already prepared in `robinhood_mainnet.markets.json` | 32      | **All 32 token addresses verified against the live API: 0 mismatches**                                           |
| Chainlink feeds on chain 4663                        | **58**  | Every one: `decimals 8`, `heartbeat 86400`, `deviation threshold 0.5%`                                           |
| Feeds that map to a tokenized asset                  | 33      | 32 already prepared. **`GLD` is the only unused equity/ETF feed**                                                |
| Feeds with no tokenized asset                        | 25      | Crypto, LSTs, stablecoins, FX — see "the perp unlock" below                                                      |
| Graduated Pons tokens                                | **282** | Counted by Levier's own factory scan (`totalGraduatedFound`)                                                     |

### Finding 1 — equity coverage is capped by Chainlink, not by effort

Only 33 of the 194 tokenized assets have a price feed, and 32 are already prepared. **Listing more
tokenized equities is not available**: there is no backlog of feeds waiting to be wired. The ceiling is
Chainlink's coverage of this chain, which we do not control.

### Finding 2 — the China market is hard-capped at two tradeable names

| Candidate | Tokenized on 4663 | Chainlink feed                                       | Verdict                              |
| --------- | ----------------- | ---------------------------------------------------- | ------------------------------------ |
| **BABA**  | Yes               | **Yes** `0x62Cc8F9b5f56a33c9C8A60c8B92779f523c4E984` | **Tradeable**                        |
| **TSM**   | Yes               | **Yes** `0x874cF94aa8eC88Fd9560094dD065f2fB3E41Fc2F` | **Tradeable** (Taiwan, not mainland) |
| UMC       | Yes               | **No**                                               | Quoted only                          |
| FUTU      | Yes               | **No**                                               | Quoted only                          |
| EWT       | Yes               | **No**                                               | Quoted only                          |
| SIMO      | Yes               | **No**                                               | Quoted only                          |

**ISIN is a useless filter for China exposure.** BABA's ISIN is `US01609W1027` — it is a US-listed ADR.
The chain carries **zero** CN, HK or TW ISINs; the only non-US domiciles are 6 Cayman registrations
(WhiteFiber, Nu, Webull, Credo, Ambarella, Joby), none of them Chinese. The China group must therefore be
curated by the company's actual market, and it must say so.

### Finding 3 — Pons scales to 282 tokens with no curation

The discovery pipeline already exists in Levier and needs porting, not designing:

1. Enumerate `LaunchSwept(address token, uint256 sweptQuote, uint256 sweptTokens)` events from Pons V2
   factory `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e`. A swept launch is a graduated token. **282 found.**
2. `getLaunchedToken(token)` returns the curve, pair token, phase, pool fee and tick spacing.
3. The token's own `getTokenInfo()` returns **logo, description and socials — on chain**. No off-chain
   metadata service, no manual entry.
4. DexScreener (`api.dexscreener.com/latest/dex/tokens/<address>`) gives price and market cap; Pyth
   Hermes gives ETH/USD for conversion.

That is a 282-row listing page with logos, descriptions and links, from two RPC calls per token. Supply
is not the Pons problem — **quality is**. At Levier's $1M market-cap floor only 1 token qualified; a
softer scan found 7 above $1M and 10 below.

### Finding 4 — feed freshness depends on whether the underlying trades

Measured live at 2026-10-03 15:18 UTC, a Saturday:

| Feed | Age       | Why                                           |
| ---- | --------- | --------------------------------------------- |
| GLD  | **1 min** | Gold trades nearly around the clock           |
| LINK | **4 min** | Crypto never closes                           |
| ETH  | 14.0 h    | Had not moved 0.5% since                      |
| BTC  | 15.6 h    | Same                                          |
| NVDA | 22.2 h    | **US equity market closed**                   |
| USDG | 23.7 h    | A stablecoin never moves 0.5%; heartbeat only |

Every feed updates on **0.5% deviation or a 24-hour heartbeat**. Equities therefore go stale every night
and all weekend, by design, and no choice of feed fixes it.

**Consequence for `DEVELOPMENT_PHASES.md` Phase 4.** A flat 1-hour staleness limit kills the venue every evening. A flat 25-hour
limit lets someone trade on a day-old price. Neither is acceptable, so the limit is **session-aware**:

- A tight limit while the underlying's session is open.
- Outside the session the market reads **closed**, not broken: the last price, its timestamp, and a
  disabled trade button. This is what a real equity venue shows, and `OptionExpiryAlerts` and the paused
  rendering from Phase 6 already give us the component shapes.
- Stablecoin and FX feeds get the full 24-hour tolerance, because deviation is the only thing that would
  ever move them.

### Finding 5 — the perp unlock: a perp needs a feed, not a token

`underlyingToken` is non-zero-checked in `MarketRegistry.addMarket` and then **never read again** —
`grep -c underlyingToken` across `src/perps/` and `src/options/` returns **0** in every file. Margin and
settlement are USDG throughout. A perp market is therefore an oracle plus a config row.

That makes roughly **12 more perp markets available at zero contract cost**, none of which needs a
tokenized asset to exist:

```
BTC  ETH  LINK  WBTC  LBTC  CBBTC  BTC.B  ENA  wstETH  weETH  GLD  EURC
```

**Why this matters for launch.** These are the markets that stay fresh at 03:00 on a Sunday. A venue
whose only markets are US equities looks dead for 60% of the week. Adding BTC, ETH, LINK and GLD makes
the site alive whenever someone visits — which is the actual request behind "ready to use".

### The solution: three listing tiers

One model answers both questions. **Listing an asset is not the same as opening a leveraged market on
it**, and conflating the two is why the group looked empty.

| Tier            | What the user gets                                                             | Price source                            | Count at launch                |
| --------------- | ------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------ |
| **1 Tradeable** | Full ticket, leverage, positions, liquidation price                            | Chainlink feed, session-aware staleness | 32, or ~45 with the crypto set |
| **2 Quoted**    | Price, chart, 24h change, watchlist, appears in groups and search. No leverage | DexScreener, or the RH reference price  | Up to 194 tokenized + 282 Pons |
| **3 Listed**    | Name, logo, description, socials, and an honest "no price feed yet" state      | Metadata only                           | The remainder                  |

Tier 2 is what makes the China group and the Pons group look like real markets on day one. BABA and TSM
are tradeable; UMC, FUTU, EWT and SIMO sit beside them as quoted, clearly marked. The group reads as six
names with two open for trading, which is both fuller and completely honest.

**Rules, so the tiers never mislead.** Each row carries its tier as a visible badge. A Tier 2 or 3 row
never renders a trade button, ever — not disabled, absent. A Tier 2 price shows its source and its age.
And no Tier 2 price is ever written to `PriceValidator` or reaches settlement: Tier 2 is display only,
and that boundary is a code boundary, not a convention.

---

---

## 3. How to re-measure

```bash
# Tokenized assets on chain 4663
curl -s https://api.robinhood.com/rhj/assets | python3 -c "import json,sys;print(len(json.load(sys.stdin)['assets']))"

# Chainlink feeds on chain 4663
curl -s https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json \
  | python3 -c "import json,sys;print(len(json.load(sys.stdin)))"

# One feed's price and age  (latestRoundData selector 0xfeaf968c)
cast call <FEED> "latestRoundData()" --rpc-url https://rpc.mainnet.chain.robinhood.com

# Owner balances
cast balance 0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C --rpc-url https://rpc.mainnet.chain.robinhood.com
cast call 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 \
  "balanceOf(address)(uint256)" 0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C \
  --rpc-url https://rpc.mainnet.chain.robinhood.com

# Graduated Pons tokens: enumerate LaunchSwept from factory 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e
# (Levier's scripts/test-mainnet-pons-full.mjs does this)
```
