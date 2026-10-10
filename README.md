# HUME

**Derivatives for tokenized equities.**

Trade options and perpetual derivatives on tokenized equities.

Hume is an onchain derivatives venue for tokenized equities, built for Robinhood Chain. It is not a tokenized-stock spot exchange — it is the derivatives layer built on top of tokenized equities, covering options (volatility, hedging, defined risk) and perpetuals (direction, leverage, long/short).

## Status

Hume runs on **Robinhood Chain mainnet** (chain ID `4663`) at <https://humemarkets.com>, and on **Robinhood Chain testnet** (chain ID `46630`) at <https://testnet.humemarkets.com>. The header switches between them. It is **not audited and an audit is not planned**: the launch relies on tiny caps enforced on chain, owner-only liquidity and a rehearsed pause. Only put in what you can lose.

- **Mainnet contracts:** the 20-contract UUPS stack was deployed on 2026-09-25 and is owned by `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`. 36 markets are listed against real Robinhood tokenized-asset tokens and real Chainlink feeds: 32 US equities, ETFs and commodities, BABA, TSM and EWY for China, and four crypto and gold markets (BTC, ETH, LINK, GLD) that trade around the clock. Addresses are in `packages/contracts/deployments/robinhood_mainnet.json`.
- **Mainnet limits:** the pool holds a few USDG and every position is capped at 0.20 USDG, so the venue is a canary, not a deep market. The caps are in `deployments/robinhood_mainnet.limits.json` and `docs/evidence/mainnet.md` says what they were sized against.
- **Pons spot:** buy and sell graduated Pons tokens through `HumePonsRouter` against the Uniswap v4 pools, with a curated list of 60 on mainnet. Hume adds no fee.
- **Lending:** deployed and live on testnet; not deployed on mainnet yet.
- **Testnet:** mock feeds that HUME moves, simulated traders (marked Simulated), a mock Pons factory with 20 mock tokens. Test tokens have no value.
- **Hosting:** the indexer, keeper, API, pricing service and PostgreSQL run on Railway, one environment per network (`mainnet` and `testnet`, each with its own database). The web app runs on Vercel. Deploy with `git push origin main:testnet` or `git push origin main:mainnet`.
- **Features:** perpetuals (market and limit orders, stop-loss, take-profit, cross margin), options (chain, Greeks, strategy builder), RFQ, subaccounts, copy trading, leaderboard and PNL card, Pons spot, portfolio and activity views.
- **HUME token:** launched separately. Its contract address is shown on the site once it is set in `NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS`.
- **SDK:** `@hume/sdk` `0.1.0` is ready to publish and is not published yet.

## Repository structure

```text
hume/
apps/
    web/                Trading terminal (Next.js, React, TypeScript, Tailwind, wagmi, viem)
services/
    api/                REST + WebSocket API
    indexer/            Contract event indexer (PostgreSQL)
    pricing/            Offchain options analytics and signed option quotes (display and quoting only, never settlement truth)
    risk-monitor/       Margin health read path
    keeper/             Fills limit orders, fires stop-loss and take-profit orders, runs copy trading, and refreshes the mock feeds on testnet
    hedger/             Keeps an options book delta neutral with perps (dry run unless told to trade)
    simulator/          Testnet demo: moves mock prices, runs bot traders and a liquidator (see services/simulator/README.md)
packages/
    contracts/          Solidity contracts (Foundry + OpenZeppelin, not a pnpm package)
    sdk/                @hume/sdk — the sanctioned client for contracts/API
    ui/                 Shared brand-styled UI primitives
    config/             Chain/market/fee/risk config — single source of truth, env-driven
    types/              Shared TypeScript shapes (MarketConfig, positions, fee config)
scripts/
    check-brand.sh      Naming audit, run in CI
```

## Requirements

- Node.js 20 or later (CI uses 22)
- pnpm 9 or later (`pnpm@9.15.0`)
- [Foundry](https://book.getfoundry.sh/), only for `packages/contracts`
- PostgreSQL, for the indexer, API and risk monitor

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in chain/contract addresses per environment
pnpm dev
```

No chain ID, RPC URL, contract address, leverage cap, fee percentage, or protocol token symbol/address is ever hardcoded — all of it is environment- or registry-driven. See `.env.example` and `docs/DEVELOPMENT_PHASES.md` Section 6.

After a contract deployment, copy the new addresses into the config package:

```bash
pnpm --filter @hume/config sync:deployments
```

## Commands

Run from the repository root (Turborepo runs them across the workspace):

| Command | What it does |
|---|---|
| `pnpm dev` | Start every package in dev mode |
| `pnpm build` | Build every package (includes `next build`) |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | Lint every package |
| `pnpm test` | Run every unit test suite |
| `pnpm check:brand` | Run the naming audit |

For contracts, run `forge build` and `forge test` in `packages/contracts` (see its README). CI (`.github/workflows/`) runs the brand check, lint, typecheck and tests on every PR, plus a separate contracts workflow with formatting, a storage-layout check, tests and a coverage gate.

## Demo simulator

`services/simulator` makes the testnet look like a live market for a recorded demo: it moves the mock prices, trades with ten bot wallets through the SDK, and runs a liquidator. It can also draw simulated chart history. Simulated activity must be presented as simulated. See `services/simulator/README.md`.

```bash
pnpm --filter @hume/simulator bootstrap 4   # fund the bots (once)
pnpm --filter @hume/simulator start
```

## Development

The build plan is `docs/DEVELOPMENT_PHASES.md`. It is the single benchmark: Phases 0 to 18, each with a
paste-and-run prompt, an acceptance check, and the git commands to ship it.

**Hume is not audited, and an audit is not planned.** The launch relies instead on a recorded testnet
walkthrough as a hard gate, tiny caps enforced on chain, owner-only liquidity, and a rehearsed pause.
See `docs/DEVELOPMENT_PHASES.md` Section 0.8.

## Docs

- `docs/DEVELOPMENT_PHASES.md` — the work sequence, the schedule, the launch gate and the risk register.
- `docs/REFERENCE.md` — what already exists, and the measured market coverage on Robinhood Chain.
- `docs/LAUNCH_MODEL.md` — the eight features and the decisions that shaped the launch.
- `docs/UI_CONTRACT.md` — the interface rules, the palette and the design reference.
- `packages/contracts/README.md` and `CHANGELOG.md` — contract layout, setup, deployments and upgrade flow.
- `packages/sdk/README.md` — SDK usage.
- `services/simulator/README.md` — the simulator used for the testnet walkthrough and its recordings.

## License

See `LICENSE`.
