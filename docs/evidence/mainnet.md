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

- Lending: deployed 2026-10-12, see "Lending and option sizes (2026-10-12)" below.
- Option round trip, copy trading on mainnet (both need the keeper and pricing keys on Railway).
- HUME token address `0xfc6d48974ac0a538624ca97380c9a3753664c85b`: recorded in `packages/config` (`protocolTokens`); `scripts/deploy-web-netlify.sh` sets `NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true`, copies every `NEXT_PUBLIC_*` value to the Netlify site and fails if the live pages lack the address.
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
| Indexer | The public RPCs cap `getLogs`: the official RPC is blocked for Railway, thirdweb answers from a laptop but hangs from Railway, and dRPC's free plan allows about 100 blocks per call. The indexer now uses dRPC with `INDEXER_MAX_BLOCK_RANGE=100` and `INDEXER_FROM_BLOCK=85139000` (skip the empty blocks before the open). A 5-minute cron run never finished its first pass, so it runs always-on (`INDEXER_RUN_ONCE=false`, no cron) until it has caught up; return it to the cron when the Railway credit matters. |
| Pricing and keeper | Both run on Railway mainnet with the owner key; the keeper reports copy trading on and feed refresh off. |

## Vault implementation renamed (2026-10-11)

The explorer showed `AlphaMarketsVault` on the HumeVault proxy: the implementation had been deployed and verified under the pre-rebrand name. All 24 source files of that implementation are identical to the repo after the rename (checked against Blockscout), so `scripts/upgrade-vault-mainnet.sh` deployed a new implementation from `src/core/HumeVault.sol` (same constructor argument, the collateral manager) and pointed the proxy at it. Proxy `0x9aC6782D82D980f2623bBE78C8882832baC94903` is unchanged. Rehearsed on a mainnet fork first (pool, balances, deposit, perp open and close, withdraw). Mainnet: new implementation `0x1DF1ab609a1f1a67a3ACa6D915Af82B283055aED`, upgrade tx `0x7b5cab2478cd1b470cd8c5497cf84e61d57b8af6668e2517200f36f9bc6713c3`; pool still 4,000,000 raw. The new implementation is verified on Blockscout as `HumeVault` (partial match; the metadata hash differs, the code matches). Still unverified: 15 other implementations and `HumePonsRouter`.

## Web: navigation icons and the features price tape (2026-10-11)

Web only, no transaction. The 12 menu icons (dropdowns, mobile sheet) are hairline wireframe SVG in `NavIcon`; the landing bar and the footer use the up-right arrow. `/features` has one price tape that moves the perpetual, option and vault previews together (all labelled `SAMPLE DATA`); it pauses on hover, focus, off screen, in a hidden tab and under reduced motion. Gate: typecheck, lint, test, `check-hex.sh` pass. Screenshots: `screens/features-tape-1440.png`, `screens/features-tape-375.png`, `screens/landing-nav-1440.png`. Also synced `packages/config` to the HumeVault implementation `0x1DF1…5aED` (its test had been failing since the upgrade).

## 2026-10-12: DELL, USAR, SGOV listed (39 markets), 7 US names quoted

Signer: owner `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`. New Chainlink feeds DELL `0x1C6c…06b`, USAR `0xA994…2DD9`, SGOV `0xa0DF…A11`.

| Step | Result | Hashes |
|---|---|---|
| List DELL, USAR, SGOV (`AddMarketsMainnet.s.sol`, `scripts/list-mainnet-markets.sh`) | 39 markets on chain (was 36) | 18 tx, first `0xabb70d76…8b32`, last `0x97f9ad54…7dcc` (block 86244676) |
| Launch caps for the three (`SetLaunchCaps.s.sol`, `SYMBOLS=DELL,USAR,SGOV`) | position 0.20 USDG, open interest 0.80 USDG, net 0.20 USDG, staleness 32,400 s | 12 tx, first `0x2b400991…dfaa`, last `0x06dd3465…9bbb` (block 86245822) |

Read back: all three `isActive` true, `maxNetOpenInterest` 200000; `check-launch-limits.sh` ok for DELL, USAR, SGOV and the pool. Sizing: 39 x 0.20 x 50% = 3.9 of 4.00 USDG. Prices answer `MarketSessionClosed` outside the session (read on a Sunday), as designed. NFLX, AVGO, CRM, COST, BA, ADBE, QCOM are quoted rows with no feed. Web live on humemarkets.com with all ten (screens `mainnet-us10-live-375.png`, `mainnet-us10-live-1440.png`).

## 2026-10-12: ten China and Greater China quoted rows, reference price fix

TCEHY, XIACY, BYDDY, MPNGY, LKNCY, PONY, WB, IQ, EWH, CQQQ added as `quoted` rows (no token, no feed, never listed on chain), so there is no chain step and no transaction hash. Chainlink's chain-4663 directory has no new China-region feed and the asset list no new China-region token, so none can be tradeable. `parseReferenceQuote` now reads the last trade when the book is wider than 5% of its mid (BIDU had shown 318.50, +279%, from a stub book of bid 82 and ask 555; now 85.35, +1.70%). Screens: `mainnet-china10-markets-375.png`, `mainnet-china10-markets-1440.png`.

## Lending and option sizes (2026-10-12)

Run by the owner with `BROADCAST=1 bash scripts/enable-mainnet-credit-options.sh` (the agent's mainnet sends were blocked). Gas price capped at 0.025 gwei; ETH 0.000437 before, 0.000251 after.

| What | Value / transaction |
| --- | --- |
| CompositeSanityOracle | `0x47BDbCaD5989da46F9DFaaBB577514C277F55208` |
| HumeCreditRegistry | `0x18EB2C50C8Fe3C5dB879f664Cc67fa74A8311D21` |
| HumeCreditRouter | `0x04C2376ca7Fd72095F65B976A6FA01186ed7fDc1` |
| HumeCreditVault | `0x2F5BA12520657cA38478676e61D225337562C45B` |
| HumeCreditPair TSLA/USDG | `0x04DB09382c37Fe3D8cD237D92F96E654e1288e78`, unpaused; supply cap 0.05 TSLA, borrow cap 0.80 USDG |
| Oracle TSLA price 384.66 | `0x96aa7387843a5023644af4657eace525996add9cf2e420e1b66ff54491b43ad9` |
| Oracle USDG price 1.00 | `0xd58c660f241d3e587f245d5c98e399eda6fc250bc5f09f633b3416c0779eae43` |
| ETH contract size 0.00003 | `0x29f4b4a0d1de4088f5177bb3a0c777cc840eef85bf8bd80f1a1d798eb2a7251c` |
| BTC contract size 0.000001 | `0xae6358bb7c2ba07532b77300ae3b68e213c6b3fc21c113107b0432d7bffd6e52` |
| GLD contract size 0.0002 | `0xe64521a9c25e71abd0622d0369da4c1cc36542d7356ae7e9cf399ff25f39b81e` |
| LINK contract size 0.005 | `0x3fa154347be2b0921a4cc0ef821b73f47b475c745d7fd9585b9ddd55de9f1a77` |
| Pair seed 0.80 USDG | `0xa8d070a809563706bd11edc24be24312267a3a789cf7be0450a34828a9f71f19` (the pair has no withdraw: this USDG is lent out for good) |

Read back after the run: pair holds 800000 raw USDG, oracle TSLA 384.66, the four contract sizes as above. Not done: a borrow and a repay (the owner holds no TSLA as far as known), an option order (needs the pricing key on Railway), and explorer verification of the credit contracts. The keeper copies the TSLA Chainlink price into the credit oracle when `KEEPER_CREDIT_FEED=true`.

## Ask Walter (HUME AI assistant) live on mainnet (2026-10-15) — pass

Read-only market assistant. Code on `mainnet` at `3ee92fc`, web on Vercel (`humemarkets.com`), the free-tier Groq key (`openai/gpt-oss-120b`) in the Railway `mainnet` api service only, `NEWS_API_URL=https://www.humemarkets.com`. Cost $0. No transaction or signature anywhere in the feature.

- **Live UI, 375 and 1440 px** (`docs/evidence/screens/mainnet-ai-walter-*.png`): the "Ask Walter" button opens the mini panel with the introduction and the disclaimer; "Why is NVDA down today?" returned an answer with two sources and UTC times, a risk line, no tool names, no horizontal scroll.
- **Live API battery** (`scripts/ai-battery.mjs`, 29 cases against `api-mainnet-e81a`): bad input (13 refused), refusals (buy advice and price target, "open a long and send it", system-prompt request, off-topic), unknown market, market list, glossary, levels, follow-up with history, 9 messages of 2,500 characters, English and Indonesian, HTML in user text. 29 of 29 ok.
- **Known soft spots:** with the market shut, Hume's candles can close at a different price than Robinhood's reference close (221.9 against 221.13 for NVDA), so a support level can sit just above the quoted close; the model once wrote "14:05 UTC" for 22:05 (the source chip under the answer shows the right time); funding is reported as unavailable because mainnet funding is not set up yet.
- **Limits in force:** 4 questions burst then 6 a minute per address, 300 a day for the whole API; the browser shows plain words for each.
