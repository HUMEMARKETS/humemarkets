# Shot list: nine clips for the testnet demo

Site: **https://humemarkets.vercel.app** (Vercel production follows the `testnet` branch). Desktop 1440 px, plus
375 px for clips 2 and 6. There is no sample mode: the header switches between **Robinhood Chain Testnet** and **Robinhood Chain Mainnet**, and every trade needs a wallet. This machine is X11, so record with `simplescreenrecorder` or
`ffmpeg -f x11grab`. Keep the files out of git.

**Say this at the start of every clip, and put it in every description:** "This is testnet, with mock prices and
simulated traders." The bots are not users and their volume is not real volume. These recordings outlive the launch.

No China clip and no copy-trading clip: both were cut, and filming them would show something that does not exist.

## Prepare once (about 15 minutes, then let it run for an hour before filming)

1. Fund the deployer `0x75962B2A0750293E01E8205b31717329Fae78147` from https://faucet.testnet.chain.robinhood.com
   (about 0.02 ETH; the bots and the price driver pay gas from it). Fund your recording wallet the same way.
2. Mint collateral to your recording wallet: `bash scripts/mint-testnet.sh 0xYourWallet` (100,000 mUSDC and 100 TSLA).
3. In your wallet add network **Robinhood Chain Testnet**, chain id 46630, RPC `https://rpc.testnet.chain.robinhood.com`.
4. Start the simulator from the repo root. It moves all 24 mock feeds, runs ten bot traders and a liquidator, and keeps the
   lending oracle fresh. Set your wallet so the liquidator may liquidate it on camera (clip 4):
   ```bash
   set -a; . ./.env.testnet; set +a
   export CHAIN_ID=46630 RPC_URL=https://rpc.testnet.chain.robinhood.com SIM_RPC_URL=https://rpc.testnet.chain.robinhood.com HUME_ADDRESSES=
   export SIM_LIQUIDATE_WALLETS=0xYourWallet
   pnpm --filter @hume/simulator bootstrap 4
   pnpm --filter @hume/simulator start
   ```
   Charts fill from price ticks once a minute, so a market started five minutes ago films badly. Start this an hour early.
   `pnpm --filter @hume/simulator backfill 72 replace` draws 72 hours at once but needs `SIM_DATABASE_URL`; those candles are
   simulated, so say so on camera if you use it.
5. Check before you start: https://api-testnet-8703.up.railway.app/v1/markets returns 25 markets, and the footer of the site
   reads "Robinhood Chain Testnet".

## The nine clips

| # | Clip | Open | Do | The clip must show |
| --- | --- | --- | --- | --- |
| 1 | **Network switch, no wallet** | A fresh browser profile with no wallet extension, `/` | Read the landing prices. Open **Markets**, then `/markets?group=crypto`. Open the network menu in the header: **Robinhood Chain Testnet** is selected; switch to **Robinhood Chain Mainnet** and back. Open **Trade → Perpetuals** and show that trading asks you to connect a wallet. | The header names the network; public data (markets, prices, the option chain) loads with no wallet; anything of yours says to connect. Mainnet is not live yet, so say so if you show it. |
| 2 | **Perps** (also at 375 px) | `/perpetuals`, wallet connected on testnet | **Connect wallet**. Deposit mUSDC (approve, then deposit). **Long**, collateral `100`, leverage 3x, **Review order**, **Confirm**, sign. Let the price move. **Portfolio → Close**. | The review step with its liquidation price; the position's PNL moving against a moving price; the explorer link on the confirmed toast. |
| 3 | **Options** | `/options` | Pick **NVDA**, an expiry, read bid, ask and Greeks (toggle **Greeks**). Pick a call row, **Review**, **Confirm**, sign. Open it in **Portfolio → Options**. | The chain with bid and ask and Greeks; the max-loss line in the review; the open option. Expiries are 7, 14 and 30 days out, so settlement at expiry cannot be filmed in one session: say so, or film it on the day it lapses. |
| 4 | **Liquidation** | `/perpetuals`, your wallet | Open a **Long NVDA** at **10x** (collateral `100`). In a terminal: `pnpm --filter @hume/simulator nudge NVDA -6`. Watch the mark price fall for about 90 seconds. | The position disappearing, the "liquidated" alert on screen, and the entry in **Activity**. This is the clip that proves the risk engine works; it cannot be shown safely on mainnet. |
| 5 | **Lending** | `/lending` | **Supply** `10` TSLA (approve, then supply). **Borrow** `500` (review, confirm). Watch the health factor and the liquidation price. **Repay** all, then **Withdraw** all. | The health factor moving as you borrow; the plain sentence under it; the caps reading $1,000,000 and 1,000,000 TSLA. The oracle price is a manual feed refreshed every 10 minutes by the simulator; do not call it a live market feed. |
| 6 | **Leaderboard and PNL card** (also at 375 px) | `/leaderboard` | Click **PNL**, **ROI**, **Volume**. Open **Activity**, click **PNL card** on a closed position, open the share link. | Bot wallets ranked on all three metrics, labelled as simulated; the card rendering; the **Copy** buttons disabled with "In development". |
| 7 | **Crypto group** | `/markets?group=crypto` | Show BTC, ETH, LINK and GLD with moving prices. Open one. | Four rows, prices changing. These are mock feeds seeded from the real prices, so do **not** claim real feed freshness on camera. |
| 8 | **Failures** | `/perpetuals` | (a) A revert: pick **E2E** (paused), try to open; the page says "This market is paused. Try again once trading resumes." (b) A cap hit: collateral `10000000` on NVDA; "This size is above the position limit for the market. Lower the size." (c) A rejected signature: start any order and click **Reject** in the wallet; the toast reads "cancelled" with "You declined the request in your wallet. Nothing was sent." | One plain sentence and a next action each; never hex, a contract name or the wallet's own words. |
| 9 | **Mobile** | `/` at 375 px (browser device mode) | Repeat clips 2 and 6 at phone width. | The ticket sheet opens from the bottom bar, **Escape** or **Close** shuts it, no horizontal scroll. |

## After filming

Name the nine files and tell me the names; they go in `docs/evidence/testnet.md`. Stop the simulator with Ctrl+C. If it ignores
Ctrl+C for more than a minute, kill it by PID.
