# Shot list: eleven clips for the testnet demo

Site: **https://humemarkets.vercel.app** (Vercel production follows the `testnet` branch). Desktop 1440 px, plus
375 px for clips 2 and 6. There is no sample mode: the header switches between **Robinhood Chain Testnet** and **Robinhood Chain Mainnet**, and every trade needs a wallet. This machine is X11, so record with `simplescreenrecorder` or
`ffmpeg -f x11grab`. Keep the files out of git.

**Say this at the start of every clip, and put it in every description:** "This is testnet, with mock prices and
simulated traders." The bots are not users and their volume is not real volume. These recordings outlive the launch.

Updated 2026-10-08: China, Pons and copy trading are built on testnet, so they have clips (9, 10, 11). Order matters:
clip 2 (deposit) comes before clip 11 (copy), because the copy account is funded from the vault.

## Prepare once

1. In your wallet add network **Robinhood Chain Testnet**, chain id 46630, RPC `https://rpc.testnet.chain.robinhood.com`.
2. Run `bash scripts/demo.sh up 0xYourWallet`. It sends your wallet gas, mints it 100,000 mUSDC and 100 mock TSLA, tops up the
   five bots and the liquidator, and starts the simulator in the background. The simulator moves 11 mock feeds once a minute
   (NVDA, TSLA, AAPL, META, SPY, BTC, ETH, GLD, BABA, TSM, EWY), runs the bots (scalper-1, trend-1, reverter-1, degen-long,
   degen-short) and keeps the lending oracle fresh. It costs about 0.0001 ETH an hour. Your wallet is also on the liquidator's
   watch list, for clip 4.
3. **Start it an hour before filming.** Charts fill from price ticks, and a market that started five minutes ago films badly.
4. `bash scripts/demo.sh status` shows the deployer balance and the last log lines; `bash scripts/demo.sh down` stops it. Mock feeds
   go stale after an hour, so with the simulator stopped markets refuse trades until it runs again.
5. Check before you start: https://api-testnet-8703.up.railway.app/v1/markets returns 28 markets, and the header of
   https://humemarkets.vercel.app reads "Robinhood Chain Testnet". Only the 11 driven markets move; film those.
6. The log line `liquidator: could not liquidate #N ... reverted` is noise from old positions in markets nobody drives. Ignore it.

## The eleven clips

| # | Clip | Open | Do | The clip must show |
| --- | --- | --- | --- | --- |
| 1 | **Network switch, no wallet** | A fresh browser profile with no wallet extension, `/` | Read the landing prices. Open **Markets**, then `/markets?group=crypto`. Open the network menu in the header: **Robinhood Chain Testnet** is selected; switch to **Robinhood Chain Mainnet** and back. Open **Trade → Perpetuals** and show that trading asks you to connect a wallet. | The header names the network; public data loads with no wallet; anything of yours says to connect. Mainnet is not live yet, so say so if you show it. |
| 2 | **Perps** (also at 375 px) | `/perpetuals`, wallet connected on testnet | **Connect wallet**. Deposit mUSDC (approve, then deposit). **Long**, collateral `100`, leverage 3x, **Review order**, **Confirm**, sign. Let the price move. **Portfolio → Close**. | The review step with its liquidation price; the position's PNL moving against a moving price; the explorer link on the confirmed toast. |
| 3 | **Options** | `/options` | Pick **NVDA**, an expiry, read bid, ask and Greeks (toggle **Greeks**). Pick a call row, **Review**, **Confirm**, sign. Open it in **Portfolio → Options**. | The chain with bid and ask and Greeks; the max-loss line in the review; the open option. Expiries are 7, 14 and 30 days out, so settlement at expiry cannot be filmed in one session: say so. |
| 4 | **Liquidation** | `/perpetuals`, your wallet | Open a **Long NVDA** at **10x** (collateral `100`). In a terminal: `pnpm --filter @hume/simulator nudge NVDA -6`. Watch the mark price fall for about 90 seconds. | The position disappearing, the "liquidated" alert on screen, and the entry in **Activity**. |
| 5 | **Lending** | `/lending` | **Supply** `10` TSLA (approve, then supply). **Borrow** `500` (review, confirm). Watch the health factor and the liquidation price. **Repay** all, then **Withdraw** all. | The health factor moving as you borrow; the plain sentence under it. The oracle price is a manual feed refreshed by the simulator; do not call it a live market feed. |
| 6 | **Leaderboard and PNL card** (also at 375 px) | `/leaderboard` | Click **PNL**, **ROI**, **Volume**. Open **Activity**, click **PNL card** on a closed position (your clip 2 trade), open the share link. | Bot wallets ranked on all three metrics, labelled as simulated; the card rendering. |
| 7 | **Crypto group** | `/markets?group=crypto` | Show BTC, ETH, LINK and GLD with moving prices. Open one. | Four rows, prices changing. Mock feeds seeded from real prices: do not claim real feed freshness. |
| 8 | **Failures** | `/perpetuals` | (a) A revert: pick **E2E** (paused), try to open; the page says "This market is paused. Try again once trading resumes." (b) A cap hit: collateral `10000000` on NVDA; "This size is above the position limit for the market. Lower the size." (c) A rejected signature: start any order and click **Reject** in the wallet; the toast reads "cancelled". | One plain sentence and a next action each; never hex, a contract name or the wallet's own words. |
| 9 | **China market** | `/markets?group=china` | Show BABA, TSM and EWY with moving prices (mock feeds). Show UMC, FUTU, EWT and SIMO with the **Quoted** badge and no trade control. Open **BABA** and open a small long (collateral `50`, 2x): Review, Confirm, sign. Close it in **Portfolio**. | Two tiers: trade-able China markets, and quoted-only rows that refuse a trade. Say the quoted prices come from Robinhood's public quote endpoint, not an oracle. |
| 10 | **Pons spot** | `/pons` | Read the list (PFROG, PMOON, PCAT). Filter. Open **PFROG**, **Buy** with `0.00002` ETH, **Review**, **Confirm**, sign. Then **Sell** the tokens back (approve, then sell). | The price tolerance (3%) in the review; the balance changing; the explorer link. These three tokens are mocks with thin pools: say so. Mainnet Pons (282 tokens) is not live yet. |
| 11 | **Copy trading** | `/leaderboard`, wallet with a vault balance from clip 2 | Find the row `0xBa19…b247` (scalper-1), click its **Copy** button (or open the row for the profile, then **Copy this trader**). Budget `100`, limit per trade `200`, exposure `400`, highest leverage `3x`. **Review**, read it aloud, **Confirm** and sign each step (create account, fund, allow executor, sign limits). Open `/copy`. Wait for scalper-1's next new trade to be mirrored. Then **Stop copying** and **Withdraw**. | The review step saying the executor cannot withdraw; the "Already open positions are not copied" line; a mirrored position or a skip with its plain reason; stop and withdraw returning the money. The Railway keeper runs every 5 minutes, so a copy can lag up to 5 minutes: film the wait, then cut it, and say copies are delayed on this setup. A skip such as "The leader used 5x, over your 3x limit." is a good thing to show. |

Clip 9 and 10 are not in the old nine-clip list; the old clip 9 (Mobile) is now the end of the run: repeat clips 2 and 6 at 375 px
(browser device mode). The ticket sheet opens from the bottom bar, **Escape** or **Close** shuts it, no horizontal scroll.

## After filming

Name the files and tell me the names; they go in `docs/evidence/testnet.md`. Stop the simulator with `bash scripts/demo.sh down`. If it ignores
the stop for more than a minute, kill it by PID.
