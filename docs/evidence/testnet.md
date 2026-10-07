# Testnet evidence — one file for the whole run

Chain: Robinhood testnet 46630. RPC: https://rpc.testnet.chain.robinhood.com. Deployer (the only wallet): `0x75962B2A0750293E01E8205b31717329Fae78147`.

## WP1 — one wallet (2026-10-08)

`packages/contracts/script/RepointFeeds.s.sol` deployed a new `MockPriceFeed` per market owned by the deployer, at the old feed's price, and called `OracleRouter.setPrimarySource`. 42 transactions, all status 1, so every contract address from Phase T0 is unchanged. The old keeper wallet `0x80F8c14b40f51B3C2dBf33ca1e094F3c39Ead8B5` is retired.

Check: `OracleRouter.primarySource(id)` then `owner()` for every id from `MarketRegistry.allMarketIds()` returned the deployer for **21 of 21**.

First tx `0xc83436bc69102302a8fd9f323255480b1f1cc09bcc4e4dedb2eeefb69533d42c`, last tx `0x6caa53f43618f0b146589b6db1991a371a8100ccaefabd4a0f90cd5cbcebab69`. Full list: `jq -r '.receipts[].transactionHash' packages/contracts/broadcast/RepointFeeds.s.sol/46630/run-latest.json` (the broadcast folder is gitignored).

New feed addresses, by market: NVDA `0xcA95464d9042B55846ea9f66b743C84Fa9Ac1C2F`, AAPL `0xC618824D6BeED249343737A46A97bB3DFee51734`, TSLA `0x89bB18Fd3F2C97F93bf9d626ddb0fD84a75Ed6CC`, META `0xB3EF5ea7808fe07B2ac7245a634920FA1F0df981`, HOOD `0x23021d2F0a58ce52CE08604b8f1E041007Cb75Ff`, AMZN `0x738Dae3db7B601113659c159860551BAFfC12313`, PLTR `0x9b90f26565885443D475d2425B6B8BEfe5E8194C`, NFLX `0xDcCFd5Ca25ff8f9187dC747a65F2bD3cA8B11A42`, AMD `0x5F444d37ddeD37Cb0A3DFCB19da474e78a99eE12`, MSFT `0x5438D8a3811D00AC51A588Ba6BC752B69669e97B`, GOOGL `0x79f850fA7026f7Da457606DAC7a74f9648F28b52`, COIN `0x583d6AE5A685fEdA062154144ECf50CB7364DaA7`, MSTR `0x6f3b0B2C4075347b40641163e93d28E6861e42A0`, SPY `0x1Ff9759E5BA2E2Dcc4206C2e7Aae84143f09A3f1`, QQQ `0x3B73d200D175b7665F11Db9C2b1Ecc8F70340a33`, AVGO `0x9B7dF3578643Ce80760548A319586bE685749d6F`, JPM `0xdfE118fCC975ba5DE041BC66da0e89f152fe75F0`, DIS `0xE9B27CB42FF640588A2241A099D767C4dEAd6080`, UBER `0xf733c0ea2E79a6a83908521B569e8DE99fFA54Fd`, SHOP `0xAa1E03e3C9373B45E0e450410768e4fe3623F5f2`, E2E `0xADEbCde1CEe326C0f772A62c29723b3b60e7F250`.
