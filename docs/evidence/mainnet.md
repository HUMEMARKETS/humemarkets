# Mainnet evidence (chain 4663)

One file for the mainnet open, 2026-10-10. Owner and only signer: `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`. Hashes, not prose.

## Budget

About 6.5 USD of ETH sent to the owner wallet. 0.002 ETH (about 5.0 USDG) was swapped to USDG; 0.0007 ETH stays as gas. All the gas of this run (listing four markets, the router, 140 cap writes, the swap and the pool top-up, three round trips) came to under 0.001 ETH: gas on this chain is about 0.02 gwei.

## Chain steps

| Step | Result | Hashes |
|---|---|---|
| ETH to USDG (`SwapEthForUsdg.s.sol`, Uniswap v3 WETH/USDG 0.01% pool `0x52e6…71ca`) | 0.002 ETH in, 5.008068 USDG out, min-out 98.5% of spot | `0xb3145dca…ba44`, `0x7a4af4df…4e94` |
| List BTC, ETH, LINK, GLD (`AddMarketsMainnet.s.sol`, feed-only, token = feed) | 36 markets on chain (was 32) | first `0x76038346…a556`, last `0xb75ba286…4327` (24 tx, block 85139320) |
| `HumePonsRouter` (`DeployPonsRouter.s.sol`) | `0x908A1371a1c994B01431D1DAF14E809E8EF90bB9`, block 85140364 | `0xed9065bd…76f4` |
| Pool top-up (`FundPool.s.sol`, 3,850,000 raw) | pool 4,000,000 raw = 4.00 USDG | `0x10a64da8…fdd92`, `0xc041587b…c5ff` |
| Launch caps (`SetLaunchCaps.s.sol`, 36 markets) | position 0.20 USDG, open interest 0.80 USDG, net open interest 0.20 USDG per market; crypto has no session and 90,000 s staleness | 140 tx, first `0xe7e7cb1c…8c71`, last `0x56c1805f…f55c` |

Sizing check: 36 markets x 0.20 USDG net open interest = 7.2 USDG; at a 50% one-sided move that is 3.6 USDG, which the 4.00 USDG pool covers. Read back from chain: every one of the 36 markets has `maxNetOpenInterest` 200000 and open interest cap 800000. (`check-launch-limits.sh` takes whole units only and cannot express 0.2 USDG, so the arithmetic was done by hand.)

## Round trips on mainnet

- Perp, BTC long, 0.04 USDG margin at 5x (0.20 USDG notional), opened and closed with the SDK: `0xa04b3022…eccf` (approve), `0xcf08ae6b…cf7b` (deposit), `0x87b03154…7067` (open), `0x1127ed06…e3c3` (close). Pass.
- Pons, buy 0.00001 ETH of HARMONIC, approve, sell, through the new router: `0xfd5dd8b1…e3b8`, `0x86214fd7…cc84`, `0xd9eff495…fa5e`. Pass. The history panel in a browser lists both trades for the owner wallet.
- Option round trip: not done. The pricing service signs quotes with the owner key, and an agent may not write that key to Railway; `scripts/railway-mainnet-secrets.sh` does it (run by the operator). Equity options are also closed at the weekend.

## Listing, prices

BTC, ETH, LINK and GLD read through `OracleRouter` on the fork and live: BTC 82,944, ETH 2,501.6, LINK 13.10, GLD 384.1. US equity markets answer `MarketSessionClosed` outside 13:30 to 20:30 UTC on weekdays, as designed, so the markets open at 02:00 WIB on Sunday are the four crypto and gold markets plus Pons.

## Services and site

- Railway `mainnet` environment: `api` (serverless), `pricing` (serverless), `indexer` (cron every 5 min, run once), `keeper` (cron every 5 min, run once), own Postgres. Branch `mainnet`. RPC: `https://robinhood.drpc.org`, because the official public RPC answers a Cloudflare challenge to Railway's Node client and the old Alchemy key was over its monthly limit. dRPC's free plan caps `getLogs` at 10,000 blocks, so the indexer runs with `INDEXER_MAX_BLOCK_RANGE=9000`.
- Vercel project `humemarkets-mainnet` (`prj_47Vs8ldXy8UdKI876fkAMKd6KZ0c`), root `apps/web`, build chain 4663, domains `humemarkets.com` and `www.humemarkets.com`. Reads go through the API's `/v1/rpc` proxy; the Pons history is read by the browser from the router's logs.
- Pons list: 60 curated tokens (`MAINNET_FEATURED` in `packages/config/src/pons.ts`), 60 priced, 55 with a logo (DexScreener's copy of the image; the public IPFS gateways are shut down).

## Not done

- Lending: the credit stack is not deployed on mainnet (it needs a price feeder for its oracle and USDG to lend). The page says so.
- Option round trip, copy trading on mainnet (both need the keeper and pricing keys on Railway).
- HUME token address: shown after `NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS` and `NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true` are set on the Vercel project and it is redeployed.
- No audit. Caps are the loss bound.

## End-to-end pass on the live site (2026-10-11, after the open)

Run in a browser against `https://humemarkets.com` with an injected wallet (the owner key), real transactions on chain 4663.

| Check | Result |
|---|---|
| Markets page | Pass after a fix. Equity rows showed `–` while the session is shut; they now show the last close from Robinhood's quote endpoint (labelled "close", with its own change), and the ticker, the terminal header and the terminal list do the same. BTC, ETH, LINK, GLD show the chain price. |
| Logos | Pass after a fix. Features and Markets listed few logos, and the Robinhood token logo is one generic mark for every asset. Each market now has a company logo (FMP ticker logos; CoinGecko for BTC, ETH, LINK): 57 of 57 load at 1440 and 375 px. |
| Perp, through the UI | Pass. BTC long 0.04 USDG at 1x and 0.03 USDG at 5x opened with Review and Confirm, and both closed with Close. A second order that would push net open interest over the 0.20 USDG cap is refused with a sentence, as designed. |
| Pons, through the UI | Pass. HARMONIC buy, approve and sell; the history panel lists both. |
| Options chain | Pass after a fix. BTC, ETH and LINK chart history came from Yahoo's `BTC` (a fund at $38), so the chart axis ran from -30,000 and the model measured 300% volatility. The API now reads `BTC-USD`, `ETH-USD`, `LINK-USD` (`historySymbol` in the market list); BTC shows 29% to 50% volatility and sane prices. The chain opens on a priced underlying. |
| Options order | Not executable at this budget: a contract is one whole underlying (a BTC call is about 1,440 USDG) and the position cap is 0.20 USDG. |
| Portfolio, Activity, Lending, Copy, Leaderboard, Strategies | Load without error. Lending says it is not live on this network. Activity and Leaderboard fill once the indexer has caught up. |
| Indexer | The public RPCs cap `getLogs`: dRPC refuses every range on the free plan, the official RPC is blocked for Railway, thirdweb allows 1,000 blocks. The indexer now uses thirdweb with `INDEXER_MAX_BLOCK_RANGE=1000` and `INDEXER_FROM_BLOCK=85139000` (skip the empty blocks before the open). |
| Pricing and keeper | Both run on Railway mainnet with the owner key; the keeper reports copy trading on and feed refresh off. |
