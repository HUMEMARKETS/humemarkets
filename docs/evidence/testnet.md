# Testnet evidence — one file for the whole run

Chain: Robinhood testnet 46630. RPC: https://rpc.testnet.chain.robinhood.com. Deployer (the only wallet): `0x75962B2A0750293E01E8205b31717329Fae78147`.

## WP1 — one wallet (2026-10-08)

`packages/contracts/script/RepointFeeds.s.sol` deployed a new `MockPriceFeed` per market owned by the deployer, at the old feed's price, and called `OracleRouter.setPrimarySource`. 42 transactions, all status 1, so every contract address from Phase T0 is unchanged. The old keeper wallet `0x80F8c14b40f51B3C2dBf33ca1e094F3c39Ead8B5` is retired.

Check: `OracleRouter.primarySource(id)` then `owner()` for every id from `MarketRegistry.allMarketIds()` returned the deployer for **21 of 21**.

First tx `0xc83436bc69102302a8fd9f323255480b1f1cc09bcc4e4dedb2eeefb69533d42c`, last tx `0x6caa53f43618f0b146589b6db1991a371a8100ccaefabd4a0f90cd5cbcebab69`. Full list: `jq -r '.receipts[].transactionHash' packages/contracts/broadcast/RepointFeeds.s.sol/46630/run-latest.json` (the broadcast folder is gitignored).

New feed addresses, by market: NVDA `0xcA95464d9042B55846ea9f66b743C84Fa9Ac1C2F`, AAPL `0xC618824D6BeED249343737A46A97bB3DFee51734`, TSLA `0x89bB18Fd3F2C97F93bf9d626ddb0fD84a75Ed6CC`, META `0xB3EF5ea7808fe07B2ac7245a634920FA1F0df981`, HOOD `0x23021d2F0a58ce52CE08604b8f1E041007Cb75Ff`, AMZN `0x738Dae3db7B601113659c159860551BAFfC12313`, PLTR `0x9b90f26565885443D475d2425B6B8BEfe5E8194C`, NFLX `0xDcCFd5Ca25ff8f9187dC747a65F2bD3cA8B11A42`, AMD `0x5F444d37ddeD37Cb0A3DFCB19da474e78a99eE12`, MSFT `0x5438D8a3811D00AC51A588Ba6BC752B69669e97B`, GOOGL `0x79f850fA7026f7Da457606DAC7a74f9648F28b52`, COIN `0x583d6AE5A685fEdA062154144ECf50CB7364DaA7`, MSTR `0x6f3b0B2C4075347b40641163e93d28E6861e42A0`, SPY `0x1Ff9759E5BA2E2Dcc4206C2e7Aae84143f09A3f1`, QQQ `0x3B73d200D175b7665F11Db9C2b1Ecc8F70340a33`, AVGO `0x9B7dF3578643Ce80760548A319586bE685749d6F`, JPM `0xdfE118fCC975ba5DE041BC66da0e89f152fe75F0`, DIS `0xE9B27CB42FF640588A2241A099D767C4dEAd6080`, UBER `0xf733c0ea2E79a6a83908521B569e8DE99fFA54Fd`, SHOP `0xAa1E03e3C9373B45E0e450410768e4fe3623F5f2`, E2E `0xADEbCde1CEe326C0f772A62c29723b3b60e7F250`.

## WP2 / Phase 11 — crypto set on testnet (2026-10-08)

Result: **testnet pass, mainnet amber** (dry run deferred to Phase L, reasons below).

`packages/contracts/script/add-markets.sh` listed BTC, ETH, LINK and GLD (5x, 7.5% maintenance, deployer-owned mock feeds, prices from the live mainnet feeds, whole dollars). The four rows are in `deployments/robinhood_mainnet.markets.json` with `group: crypto`, which testnet borrows through `groupForSymbol`. `/markets?group=crypto` now opens the Crypto tab.

| Market | Mock token | Mock feed | Start | After simulator, 75 s |
| --- | --- | --- | --- | --- |
| BTC | `0x89e70eA807FA168470E3840B9B2d64AcEC4A48be` | `0x16A4F3b8EF0dfAFBCD6F7c4350EbA6754a7075d7` | 83,345 | 83,306.02 |
| ETH | `0x39594a0358C51c01426ea82cCc23d085204960F1` | `0x3E16e3D4A36D42D6C69C3ded4CB42B89f56014C7` | 2,555 | 2,554.84 |
| LINK | `0x756AaEE893f377fc5303c2f887c399FFfaA3bC6C` | `0x4f240FCdBadb25F98B9988B3403534FcD3180f38` | 13 | 13.01 |
| GLD | `0xFfF233bf8245D360C536d5172eA6fd64A4addE06` | `0x9ea9EF7616a2F874920eE957a34E86bfD43F84F1` | 376 | 376.05 |

Prices read from `GET /v1/prices/:symbol` (`indexPrice`). The simulator's default `SIM_MARKETS` now includes the four.

Pool and trade (`pnpm --filter @hume/sdk perp:testnet`, script `packages/sdk/scripts/testnet-perp.ts`):

| Step | Tx |
| --- | --- |
| mint 100,000 mUSDC | `0xc0e42c6cd281d28abc25216682ced966770837c17435b022217b7206c538b473` |
| `fundPool` 100,000 (pool was empty, hence `InsufficientPoolReserves` in Phase T) | `0x8c7fdd908d7c5bb97886059dac3a1ee22882c7cbbab30c288f16bd0750c5dbf8` |
| mint 1,000 | `0xea5f8f30bb185e84bf986eb11513504479fb15490783b610a2f2fc8ddaeea45a` |
| open BTC long #98, 100 collateral, 2x | `0x523920ad475ddb62570066c5d199ce04dcbfba87eb3c8b6e1d1f605e00a02ea5` |
| close BTC #98 | `0x532edd465afed8fbf80953e1065d4ae4a42dc8812227307b2a6c2ca3cf3871ec` |

The API listed 23 of 25 markets right after (LINK and GLD wait for the next `*/5` indexer pass).

Mainnet, read-only, feed ages at 2026-10-07 ~19:46 UTC (`latestRoundData`, 8 decimals): BTC $83,345.38 aged 3.3 h, ETH $2,554.62 aged 1.1 h, LINK $13.37 aged 1.1 h, GLD $376.28 aged 3.5 h. Acceptance wanted GLD and LINK under 10 minutes: **not met at this reading**. Feeds update on 0.5% deviation or heartbeat, so a "tight constant" `MAX_PRICE_AGE` would make BTC and ETH reads revert for hours.

Open for Phase L: (1) `AddMainnetMarket.s.sol` calls `symbol()` and `decimals()` on `TOKEN`, so it reverts for BTC, ETH and LINK, which have no tokenized asset (token = feed address); it needs a feed-only path. (2) Pick `MAX_PRICE_AGE` per feed from its heartbeat, not a global tight value. (3) GLD token is `0xC9a981FEE1F9DEc688bb123ccDeCc63D0deBFC4e` (from api.robinhood.com/rhj/assets).

## WP2 / Phase 12 — failures and empty states in plain language (2026-10-08)

Result: **pass**.

- **Map:** `apps/web/src/lib/revertReasons.ts` holds one sentence plus one next action for each of the 81 custom errors the SDK decodes (`allErrorsAbi`, now exported from `@hume/sdk`). `revertReasons.test.ts` fails when the ABI gains an error without a sentence, and when a sentence shows hex, "revert", "Error" or its own error name. `errorMessage` (`stores/tx.ts`) looks a `HumeContractError` up by `errorName`; an unmapped one reads "That did not go through (Name). Nothing was lost. Try again…"; any other error is generic, never hex and never the wallet's wording.
- **Declined signature:** `TxRecord.rejected`; the toast reads "<action> cancelled" in muted text, not "failed" in the error colour.
- **Failed orders on testnet (real reverts, deployer account):** opening on the paused `E2E` market shows "This market is paused. Try again once trading resumes."; 10,000,000 collateral on NVDA shows "This size is above the position limit for the market. Lower the size."
- **Raw text removed:** `StrategyBuilder` shows only its own validation sentences, anything else is "This strategy could not be priced right now."; `OptionPositionsTable` no longer names `NEXT_PUBLIC_API_URL`.
- **Empty and loading:** `EmptyRow` (shared with Portfolio) gives Activity's empty states a next-step link; Activity's "Loading…" strips are `Skeleton` rows. Portfolio, Lending, Perpetuals and Options already had designed states.
- **Walk:** `docs/evidence/phase-12/walk-empty-states.mjs` against `bash scripts/web-testnet.sh start`: five pages (`perpetuals`, `options`, `portfolio`, `activity`, `lending`) in a fresh sample account at 1440 and 375 px, no hex, env var name, revert or wallet wording on any (`PASS`). Screenshots in `docs/evidence/phase-12/`.

Not done: the SDK error ABI does not include `MarketSessionClosed`, `InvalidTradingSession` or the Pons errors, so those would read as the generic sentence without a name. Add them to `generate-abis.mjs` if a session-gated market goes live.

Seen while walking, for WP3: `/lending` shows the testnet TSLA/USDG pair caps as "$1,000,000,000,000,000,000" borrowed and "1,000,000,000 TSLA" supplied. The pair is unseeded and its caps are not demo-sized; set them with an admin call before filming.

## WP2 / Phase 13 — mobile and keyboard (2026-10-08)

Result: **pass** on the four launch surfaces (landing, `/markets`, `/perpetuals`, `/portfolio`).

Measured with `docs/evidence/phase-13/measure-375.mjs` and `keyboard-order.mjs` against `bash scripts/web-testnet.sh start`, screenshots in `docs/evidence/phase-13/`.

| Check at 375 px | Before | After |
| --- | --- | --- |
| Horizontal page scroll | 0 px on all four | 0 px on all four |
| Controls under 44 px | 49 on landing, 69 on `/markets`, 22 on `/perpetuals`, 17 on `/portfolio` | none (the hidden skip link is the one 1 px exception) |
| Trade ticket reachable | sheet opened by Long or Short, no Escape, focus not managed | sheet takes focus, Tab wraps inside it, Escape closes it and returns focus |

Changes: one phone-width rule in `globals.css` gives every control a 44 px minimum (inline links in a sentence are unaffected); the chart's interval and chart-type controls had fixed widths that clipped "1d" at 375 px, now minimum widths; `TradeSheet` gained modal focus handling and a 16 px gutter on its Close row; two search inputs had their focus outline removed, now they keep it.

Keyboard-only walk, `/perpetuals` in sample mode, Tab, Enter and Escape only: open the ticket (Long on a phone), Escape closes it, reopen, type 100, Review order, the review shows the liquidation line, Confirm, toast "Open long confirmed". 375 px: 109 stops, 0 without a visible focus indicator, PASS. 1440 px: 92 stops, 0 without, PASS.

Contrast: `apps/web/src/lib/contrast.test.ts` reads the tokens from `globals.css` for both themes and asserts the recorded 17.42, 6.76 and 5.77 ratios, 4.5:1 for text, muted and faint on ground, surface and raised, the accent ink on the accent, and up and down on ground. It passes.

Not covered (Phase 18): the other pages at 375 px, and a screen-reader pass. The Markets rows are taller at 375 px because the 44 px rule stacks the symbol and its Options link.

## WP2 / Phase 14 — copy trading entry point (2026-10-08)

Result: **pass**. Nothing is behind it.

- Leaderboard: every row has a disabled "Copy" button (`title` "Copy trading is not available yet"), the column header carries an "In development" badge, and the note under the table reads "Copy trading is not available yet. It opens once leaders have a track record, and no date is promised." Verified in a browser at 1440 px: 10 disabled buttons, note present (`docs/evidence/phase-14/leaderboard-1440.png`). On phones the Copy column is hidden and the note stays.
- Flag: `NEXT_PUBLIC_FEATURE_COPY_TRADING` is unset, so `env.copyTrading` is false; `/traders/<wallet>` renders the 404 page (Next streams a 200 status around it).
- No tables, endpoints, subaccounts or executor were added. The Phase 18 design is in `docs/COPY_TRADING.md`.

## WP3 — lending live on testnet (2026-10-08)

Result: **pass**.

- **Bug fixed:** `LendingView` assumed the loan token has 6 decimals (USDG, mainnet). Testnet's mUSDC has 18, so every borrow figure was off by 10^12 ("$1,000,000,000,000,000,000" caps). It now reads the settlement token's decimals. The page reads "Collateral supplied 0.0000 of 1,000,000.0000 TSLA" and "Borrowed $0.000 of $1,000,000.000" (`docs/evidence/phase-12/lending-after-fix-1440.png`).
- **Seeded:** 100,000 mUSDC minted to the pair (it pays borrows from its own balance), tx `0x7ab202bc938b790a690a78a3d97b5376bf05d9414a6d519b05ff26483e3098e3`; 100 mock TSLA minted to the deployer, tx `0x77415b7d41f9cf16e7cb6a03e305207f6406b3b33d8d52eed5c2aea341e344ef`.
- **Oracle:** the credit oracle (`CompositeSanityOracle`, a manual feed with a 24 h staleness limit) had no prices, so every deposit reverted "Oracle: Price not configured for asset". Nothing in the services refreshed it. The simulator now pushes the TSLA price and 1.00 for the loan token every 10 minutes (`SIM_CREDIT_MS`); first push read TSLA 351.01 on chain.
- **Lifecycle, `script/CreditLifecycle.s.sol` on testnet:** approve, depositCollateral, borrow, approve, repay, withdrawCollateral, 6 transactions, none failed. Hashes: `0x8c9ac1bf48fcc109c72c376be961b0b7a0b38cd964c6df8396284c2620dbe14d`, `0xed9455f154b89da635a6862d23785a8b08f453c20d0a7dd162cfd697717b4a03`, `0x5e0d3ccc9a99990cd0db4d8b3f8ab9fc8884869dd4ee5217de1cc8bfb44ce0ee`, `0x4aba053b02fedc3a45afb3747ca2eafddd54747f34723b24ef422ff7a937572b`, `0x3e454c480485fd8f151a79bb2b59c0fba164e0849e2a4e115bb3bc6b92e4c99a`, `0x095622d70c6b409331b3d7d09a238070cfb51129677f7b63a335af6938a9b5ef`.
- **Mainnet note for WP4:** the same credit oracle needs a feeder on mainnet; nothing in the services refreshes it there either.
