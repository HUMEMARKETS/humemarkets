# Phase T0 — A fresh testnet deployment under wallets the operator controls

Date: 2026-10-07. Chain: Robinhood testnet, 46630. RPC: https://rpc.testnet.chain.robinhood.com.
Result: **pass** (details under Acceptance).

## Why

The previous testnet deployment is abandoned. Its admin `0xC804c6c50CE6F5B5dFB035378A3F84145914697F` and the owner of its mock
price feeds `0xa22e9da21Ae258f733EE932f767c46CB6508eD69` are keys the operator does not hold, so prices could not move and the
pause could not be rehearsed. The old addresses are recorded in `packages/contracts/CHANGELOG.md`.

## Wallets (new, testnet only; keys are in the gitignored `.env.testnet`, never shown)

| Role | Address | Funded |
| --- | --- | --- |
| Deployer (admin, quoter, maker) | `0x75962B2A0750293E01E8205b31717329Fae78147` | 0.01 ETH from the faucet |
| Keeper (owns every mock price feed) | `0x80F8c14b40f51B3C2dBf33ca1e094F3c39Ead8B5` | 0.01 ETH from the faucet |

`QUOTER_ADDRESS` and `MAKER_ADDRESS` were not set, so both roles went to the deployer. The pricing service in Phase T must sign
with the deployer key, or the quoter role must be granted to another address first.

## Verifications

| # | Check | Result |
| --- | --- | --- |
| 1 | New `MarketRegistry` `0xD56A8cB9A047d38c0A16048756627FDc43E17077` lists the markets | `allMarketIds()` returns 21 (20 from the old registry plus E2E) |
| 2 | Each feed's `owner()` is the keeper | 21 of 21 feeds read `0x80F8c14b40f51B3C2dBf33ca1e094F3c39Ead8B5` (every feed read through `OracleRouter.primarySource`) |
| 3 | `hasRole(DEFAULT_ADMIN_ROLE, deployer)` on the registry | `true` |
| 4 | E2E is paused | `isActive(E2E)` is `false`; `isActive(TSLA)` is `true`. Pause tx `0xd4af49611af7e57494142bacf5892d49c93d0dbc485974b5b928035893a241cd` |
| 5 | Settlement token unchanged | `settlementToken` in the new deployment is `0x70b0FDa35dEb7BA710C601Ed9c45b9F992027112`, symbol mUSDC, 18 decimals |
| 6 | Public mint works from an unrelated address | Throwaway `0x47203F5C60F709C4Eb9F3dA2B7B8f5F753df558f` (gas tx `0x2150ed9284eabc136f76fd19ee841b007d3d18cebdd16ab52300e5a70a0c1d10`) minted 1000 mUSDC, tx `0xa8394cb8e7d85222e36e05c6ad3e109d1cd58ecaa66c85ac3c80c7c520fb06ff`, status 1; balance 1e21 |

## Market set

The 20 markets of the old registry were recreated at the old feed prices, rounded to whole dollars, with the same risk numbers
(NVDA, AAPL, SPY, QQQ at 10x or the brief's NVDA numbers; the rest at 5x, 7.5% maintenance margin). `E2E` is an extra mock market at
$100, 5x, left paused. Prices: NVDA 190, AAPL 230, TSLA 348, META 701, HOOD 101, AMZN 219, PLTR 180, NFLX 1196, AMD 170, MSFT 481,
GOOGL 210, COIN 321, MSTR 377, SPY 649, QQQ 580, AVGO 339, JPM 301, DIS 120, UBER 90, SHOP 149, E2E 100.
`script/AddMarket.s.sol` was run once per market with `PRICE_FEED_OWNER` set to the keeper.

## Credit stack

`script/DeployCreditStack.s.sol` with collateral token = the new TSLA mock `0x32033EAc61d1896F4fC18de1f6Fa15443BEe2eAd`, `CREDIT_PAUSED=false`.
The pair is unseeded; seed it with minted collateral in Phase 15. Testnet limits are in `packages/contracts/deployments/robinhood_testnet.limits.json`
(new file; mainnet's file has USDG's 6-decimal amounts, which do not fit an 18-decimal token).

## Addresses (proxies, from `packages/contracts/deployments/robinhood_testnet.json`)

| Contract | Address |
| --- | --- |
| buybackModule | `0x8f5f75370B44792154baC8f69f36456557826693` |
| collateralManager | `0xbCB4B5f52A9b8A12a1707948a4479AA727898fb5` |
| crossMargin | `0x3f7F8019695D3D09eFe22d3752E12EBd3588Fa88` |
| feeManager | `0x8eDD2215ffDD41144685A00826326DddB6cb487E` |
| fundingManager | `0x5DE0abc2cf0821677C5D56Db326c305B331303fc` |
| insuranceFund | `0x3626E18E05F870a136d6C3198e8Cb2fD289b63C8` |
| liquidationEngine | `0x571bFdF07297Fb880B43C1FDbCbBcBB55A010b85` |
| marketRegistry | `0xD56A8cB9A047d38c0A16048756627FDc43E17077` |
| optionMarket | `0x6C0BF76640aBf555CE129dC4F96A34d2955aB738` |
| optionPositionManager | `0x9b37F4579dbcbB1ae2FDF469EDc2Bc6Dc544d0d3` |
| optionsEngine | `0x043F2882360e5f33803610960bdf57c47011A828` |
| oracleRouter | `0xf009Ba3BE0987c51Fd2260E7184A61b10195418f` |
| perpOrderManager | `0x4d05B3f5E1dBF1bBA3a935bF2634C54C56E19bFF` |
| perpPositionManager | `0x18F8040BDDb7292D90Ca0Df045463d9809010E0A` |
| perpsEngine | `0x7c15B52f50BFFE0bc9f762EaEEc77a1cba37D044` |
| priceValidator | `0xA38311d14f89764a2D5e4A45E1FEF7A07Ac1BEB0` |
| rfqManager | `0x8E5ce4013777bFbF95D8c7DB985feF1D971086d3` |
| riskManager | `0xa0D5Ae076151788DFA03583Bf42D13B420263Dd4` |
| settlementToken | `0x70b0FDa35dEb7BA710C601Ed9c45b9F992027112` |
| subaccountFactory | `0x8981D3f0B8332Eb4F31da89caCD87E5c95537326` |
| vault | `0xE27eB199e5957a948D304518Fc8fcCF6e88AaF26` |
| creditOracle | `0x57fD77ab420880d9309cF34eB3212726993E97D5` |
| creditRegistry | `0x5Ea79891C3E050513b9997bf300283B924cb9E24` |
| creditRouter | `0x45563Db7F1A66703fAb36dE5396753FdFcABaC08` |
| creditVault | `0x1e77BFDEBed372Bc40cceAc2D5343b2Be360776c` |
| creditPairTslaUsdg | `0x4b166551CdD904D8D7AfB7170D92A0d8D35cF141` |

Implementations: `packages/contracts/deployments/robinhood_testnet.implementations.json`.

## Transaction hashes

**DeployAll** (94 transactions)

| # | Kind | Function / contract | Hash |
| --- | --- | --- | --- |
| 1 | CREATE | UpgradePlaceholder | `0x5e175b5c28e3fe9b29ae37a927f759e4fc4dcf7b909078f96fa1d594c7c4ea8f` |
| 2 | CREATE | ERC1967Proxy.default | `0x7f97cec841a8637fa1b5a6b711d4237fdf9a6469bcac6858a5712c4582726ba0` |
| 3 | CREATE | ERC1967Proxy.default | `0xe12a49a8809762c13b6e52b9b92169cb9378bd9d965f8a35dfa6ee7874972f0c` |
| 4 | CREATE | ERC1967Proxy.default | `0x7ebfdbb56a72c6a7e0b1425d49141f4392e53a424d7b08619612f97b8f761712` |
| 5 | CREATE | ERC1967Proxy.default | `0xf3bd8e31b579f3331b7ba2c250a6b984159b7b20011e568d8196b6aec0e00549` |
| 6 | CREATE | ERC1967Proxy.default | `0xfa4783c9ffa24701ed6df1f46e20c06b50613c3c008b501f9f0313d64d34bf1e` |
| 7 | CREATE | ERC1967Proxy.default | `0x6fbe4f3a1058b6b05112564b984854bbd37e7c6c081acc8cf234d9eacb24238f` |
| 8 | CREATE | ERC1967Proxy.default | `0x4340b6cf41846c7b9b5ca9c45362e376d7976229dac2feeab280ee1ff2d6900b` |
| 9 | CREATE | ERC1967Proxy.default | `0x5e9e3da158b0ca71941b53330bec3af7d6dd6cbc9454fb0cba7778f178bd54d2` |
| 10 | CREATE | ERC1967Proxy.default | `0x1c2aebf2de3742eae4b5b53c1de70e9605e48cfdce27c859f79ed1d1fa29403d` |
| 11 | CREATE | ERC1967Proxy.default | `0xaa31336be622cbcf2b1291ee0529ade538f5f58246d003bad9a9cbf7333ee0af` |
| 12 | CREATE | ERC1967Proxy.default | `0x75fbb7785b10ca763b1fdbd26d8409ad02482649c2b664601cd649986eb50462` |
| 13 | CREATE | ERC1967Proxy.default | `0xb5cef081ab3e7cf16938da81fe9e6e184183bb00e5a96570801a4dd3e0084d6e` |
| 14 | CREATE | ERC1967Proxy.default | `0xa25971976a95e65ec821657d4cc2fb63fd97a4b2e35ca9b1bb18c63baf8bcd0b` |
| 15 | CREATE | ERC1967Proxy.default | `0x156affa232db244d8c252aafa5cc0786d451309b4aa8349c79dbf383266a9d87` |
| 16 | CREATE | ERC1967Proxy.default | `0x454320dfbddd138afe699df3d8c61c3ce39504cb0a219779aa72173dc022dd81` |
| 17 | CREATE | ERC1967Proxy.default | `0x1cd608581015de4ae736105b879ed77c158298cbb70a25925fc9b1af26c60b72` |
| 18 | CREATE | ERC1967Proxy.default | `0x9055e46bd14e0a318611b1e8cda026ee8093669cea74164566d20aa3d9cec3ec` |
| 19 | CREATE | ERC1967Proxy.default | `0xdcfb7b5b998f065cc6e1bcfe2d95a24ed6bc0295622331da66b9f4f4a29c28be` |
| 20 | CREATE | ERC1967Proxy.default | `0x5edbba051678c7b3b9db18920d3ea4171b3ff3af320e2b1ca2d51b49f141f5e2` |
| 21 | CREATE | ERC1967Proxy.default | `0x1aeab7cba4b21a56380a96ce63de0782bae5fb6512821ca58335ceb257728d74` |
| 22 | CREATE | MarketRegistry | `0x755c34cc28018685ef1b68431afe35e2b69bf1a0ed694e3e32744d06561d33dc` |
| 23 | CREATE | CollateralManager | `0x12b046daff5fd4c762912dfb3aeaede4db34189b57017253309f4fc113cb114c` |
| 24 | CREATE | HumeVault | `0x162c600d0bbcf98631365ecc1d532b3e61fd9d5362c4ac49d2bcf4aeb0c9d063` |
| 25 | CREATE | FeeManager | `0x7cb695ed6eb3e600662ef6d9e52e0dd915cdf0fc5c4dd4ea2540ffd5f96ea42e` |
| 26 | CREATE | BuybackModule | `0x6e2e2fc2ecc1ccfc0c2bee3b2016087fc35a4e1b98c5369623a633d1dc8eddad` |
| 27 | CREATE | PriceValidator | `0x0626f8d449bce9cefc3d0c5abcb13222533d52f3ba657c4a656491845c7eae69` |
| 28 | CREATE | OracleRouter | `0x9da799a9389d1acbd9ad12cee12300a18d520aa05ff2dc8296602e4b8bafea00` |
| 29 | CREATE | RiskManager | `0xcb0c10c75353cb02e3995f6e92e48a1a78ee04f10bafa3af6d7174c57b3e7ff3` |
| 30 | CREATE | OptionPositionManager | `0x371759e0147d5c6354de70ece929525f3f569fdc923b1c614af17b60b7e00d8f` |
| 31 | CREATE | OptionMarket | `0x6c219bc6bcb81a64b57368a077beafc5233fb6b578cc710efb44a8f51ccdacbe` |
| 32 | CREATE | PerpPositionManager | `0x9bae1b732645144b388d8bc67595e0840024f82c060c3b1904cca68b03181be6` |
| 33 | CREATE | PerpOrderManager | `0x446046ac39f7e9a40355017eda3af1ac66f18f7fc30d116587b6d71417b76b0a` |
| 34 | CREATE | FundingManager | `0x37bc9bc8d0dbc83e6b4f1afb0704f90892f7b7d4f2a4ad4310dd4e7e3f5ab83b` |
| 35 | CREATE | OptionsEngine | `0xd6b608cc1233060d93318131fabfc86d55f8227f5910c071b1a1e896d4008bdb` |
| 36 | CREATE | InsuranceFund | `0x7ac99dfd5402ca2cf49f0b7e9e7ab703ae5b420166ae3412daa9e1f46f9e7dbd` |
| 37 | CREATE | CrossMarginManager | `0x99d427fb0cea8785b624259dfe32947c3188f2be730a3db0dfebb8b31b668f9a` |
| 38 | CREATE | SubaccountFactory | `0xb2977701683f7f3558a758c992b9f52d7122c3b87069854b0d2d6a9f1d61bbc4` |
| 39 | CREATE | PerpsEngine | `0xdbd1b5bbb6ec878621afbf6b27ace0c6abc216d47f237544ab91c5a058ec8ced` |
| 40 | CREATE | LiquidationEngine | `0xa6bdb4a13c820d550be0eac540ad750de9f035e387b79d0ad089191fbeda10cb` |
| 41 | CREATE | RFQManager | `0x01cca40e5e1762ed1ed54152e4cda1540b058813dd434c30adcc948634ead695` |
| 42 | CALL | ERC1967Proxy.default | `0x43616ac204088d2ffec979b21abeb702a867a5d3be1e24cfb6a46287696610a9` |
| 43 | CALL | ERC1967Proxy.default | `0x5e9501af84ba0a7f06dec4b70f80574fe888f4b639ec418212e70ee6be25ff58` |
| 44 | CALL | ERC1967Proxy.default | `0x584b9e9518dcfa2844989b0c00f841075594e23edf8ede90e5ad2c2eb26f0734` |
| 45 | CALL | ERC1967Proxy.default | `0x57bdf07be8a295de0d1882e2a211fd1baf2497995fad88aced506f5739cf62ca` |
| 46 | CALL | ERC1967Proxy.default | `0x448739715aa45eb4faf4041e070508eaba02d077fcad375c82f0090c49518ae7` |
| 47 | CALL | ERC1967Proxy.default | `0xa3e1e83c500825d953dd4dedfadafca1ad160a1ebd190c2dbb81367bb993e204` |
| 48 | CALL | ERC1967Proxy.default | `0xe41ecb476fe21f1479469cc198a3e3639b116977a03f4d3988ee20376d4fbbe4` |
| 49 | CALL | ERC1967Proxy.default | `0x4a1db06180191ba284401a9b5a6d81707595db891503ae5a2af2c472fdd598e3` |
| 50 | CALL | ERC1967Proxy.default | `0xc7ebd7b9cc7ef574a27a049c40bf63e480691df4a6a439013cb725e22f3e26b0` |
| 51 | CALL | ERC1967Proxy.default | `0xfd87e40b8b9bd40b03802081c009673c6bd1b8f2357816ce82e883e93a9951e9` |
| 52 | CALL | ERC1967Proxy.default | `0x5e562107726a93710dc774f58f5a6bc2575c8f0bfeb2958d3b129ac1fdf782cf` |
| 53 | CALL | ERC1967Proxy.default | `0x2a49f6788a02c315d5ff136caea6241a45a637ada10b1c2b578ae91f41d3ad49` |
| 54 | CALL | ERC1967Proxy.default | `0x60dae83c2ad7089ca72f964d86c4bfa5d89027a63227481bb8f42af9cb061138` |
| 55 | CALL | ERC1967Proxy.default | `0x1ca0398da512b5183e8b0a80d3b08a33ebe89c859480c08bf5f62f9e31612bd8` |
| 56 | CALL | ERC1967Proxy.default | `0x815cb5aff1f5cd23d76fb6d05373a404659bcf93bb67f6b594df563d003775ff` |
| 57 | CALL | ERC1967Proxy.default | `0xe835c3fad0782d4be0a31c11c3ff9fef3fcac665694d8fe5d59b8d1f41d8a0a7` |
| 58 | CALL | ERC1967Proxy.default | `0x04fb90cfbd4477df0da4246b73af80110e05bf62cd8032db64604b48e7f1383f` |
| 59 | CALL | ERC1967Proxy.default | `0x5b72522cae97dd9b060afe265cbd5534d8c5d54f8fe15beb76c2c9f524cbf0e2` |
| 60 | CALL | ERC1967Proxy.default | `0x08702b660fe656bdb6fa1f8ba25ad5e3691fa136449f151a2f38cbf7578e98c0` |
| 61 | CALL | ERC1967Proxy.default | `0x5295de8cecd3aca5389cd47f837ba71b713ffbeecf8a158bb8ebbb73c75bb186` |
| 62 | CALL | ERC1967Proxy.default | `0x40503b4e5f9a9e0a746b3e6b3742115835e5ab5b8cc327a8c2465e9af36eebdf` |
| 63 | CALL | ERC1967Proxy.default | `0x13cd110ee258a203889808e5073199916f790631fd44841cf344c1d48ca54e64` |
| 64 | CALL | ERC1967Proxy.default | `0x7d47b86e393099116fe0cf9020ed2941250507ae1e30803a2b8e7e41db6a1ad1` |
| 65 | CALL | ERC1967Proxy.default | `0x9d085c480aff7b18db8a2dda8d429973c4308efc99b6c74f3c258a8e5bf5e3c3` |
| 66 | CALL | ERC1967Proxy.default | `0xfd4745b7686af3b0d780186aead9600594d8a385fff730b8771701633c40a0c3` |
| 67 | CALL | ERC1967Proxy.default | `0xcb4e68b6aa5ce73e45bac9700bdb1ab0ba25a1d810fd3264b97733739158d053` |
| 68 | CALL | ERC1967Proxy.default | `0x1421288ce10b914d2a488cef95045a5e0c3dcb2ff3a3f9068eb014ba84d2e427` |
| 69 | CALL | ERC1967Proxy.default | `0x5336f5b211e2d2e73858364aefe17bc3f924142439dc34073fc5763c92dbb54b` |
| 70 | CALL | ERC1967Proxy.default | `0x140b540f62dea22a5a079b39009ca1a176feb66154c8d9402aded7e3e4ce5266` |
| 71 | CALL | ERC1967Proxy.default | `0x7589c1fb7572aeb1cf0b9114021075c1df4c7b3610676d48a67870e8905ca540` |
| 72 | CALL | ERC1967Proxy.default | `0x5c7b0af072b85079ef9dfbe39dd38a6e6dbd13c1663e0afb818b236e8f25f31b` |
| 73 | CALL | ERC1967Proxy.default | `0x2c4e6308a6e1acf7d5b13a4b00b11e8efa272d5f11889380bb8dd0d617f4f0ef` |
| 74 | CALL | ERC1967Proxy.default | `0x6f380b0924ed1228f53282a99e2f9cc5960141d6808ee17326415fb5c5a28b3f` |
| 75 | CALL | ERC1967Proxy.default | `0xc80fafa1cb47a5c177cbc6b1247873f1c2c6431bc5e6a41da5f2b5c056d61974` |
| 76 | CALL | ERC1967Proxy.default | `0xa14097fcaf3de95cbb530f1c98b182d3cf2a0b8c74494747a1f356bd85e6e785` |
| 77 | CALL | ERC1967Proxy.default | `0xeae69370e291f3718dbc18b6447dff63364528c828ebcbfc6d1fdad9f3574e78` |
| 78 | CALL | ERC1967Proxy.default | `0x16fd5884edb1bafd9d9aa59f30361f0cae8b1ca1d895fd42abab7d4cbdbe2f05` |
| 79 | CALL | ERC1967Proxy.default | `0x42aca9678bf90fbe855d2dc416196ab23a84e5341fd351385263504160f12873` |
| 80 | CALL | ERC1967Proxy.default | `0x49e5e83cf19d55093ae5694a63e7908bdc789167c8229f7604b2808992b14adc` |
| 81 | CALL | ERC1967Proxy.default | `0xf70fd1b31fea1dfc4cd1eecf150de0cd8a97ab766081e2f88c68c27fdceb7eb6` |
| 82 | CALL | ERC1967Proxy.default | `0x55670bd17f93da3ad8a61a497dda2d09c4c53e81591c67221db53aaf021f4ec5` |
| 83 | CALL | ERC1967Proxy.default | `0xf6008667330d6bdf8dcd0e78bc4d2e5d82cb0ef05d4619fa8095eb597204bcae` |
| 84 | CALL | ERC1967Proxy.default | `0xac677de625c3eaeba66a8f741372031aa9149ea4f8d4afaaaf73ff5d0373cf52` |
| 85 | CALL | ERC1967Proxy.default | `0x4f353176d8aeb2c5d60e8bb3ba46423b444622fa3ebf798c4fb1a0a06c5e67c3` |
| 86 | CALL | ERC1967Proxy.default | `0x4447a1e5cee465b20f0124152ec047666d2c05a3706f28741af019dd10050c21` |
| 87 | CALL | ERC1967Proxy.default | `0xca919ab30520a43a775a9ebcccacbe0b200f648737975613c058defca1addf93` |
| 88 | CALL | ERC1967Proxy.default | `0xc097d862d110ec4f637f21ec9303e333db4b3c10087644e33db4e5fa9206af72` |
| 89 | CALL | ERC1967Proxy.default | `0x418139a556482492f9b6cfddce6e1a87585cf36dadf84b0e2cc8690dfe841506` |
| 90 | CALL | ERC1967Proxy.default | `0x08f1253e24ddad765e07a2f6374ae0c0f88fe63d95d933f8790824d1e938862e` |
| 91 | CALL | ERC1967Proxy.default | `0xd2273eba1a04b8e8b7c76179f4b79815870e77872d1528c8531fdb4a2798bc6e` |
| 92 | CALL | ERC1967Proxy.default | `0xe5061185900254470b5fa4d4fa1c80fe63cbd1dd2176aa80c27517236dada673` |
| 93 | CALL | ERC1967Proxy.default | `0xe260747dca9552bd9314840f306a4ebe08e8b74c9b27b6239f48996e41fc1c94` |
| 94 | CALL | ERC1967Proxy.default | `0x677789e5dd7ff017119567bff4ed244c406373110250fe942fe43b8942b6ec41` |

**ConfigureMarkets (NVDA)** (6 transactions)

| # | Kind | Function / contract | Hash |
| --- | --- | --- | --- |
| 1 | CREATE | MockERC20 | `0x63b79172e9c577e2f8c772d58ad685f4e79d6f3ca52adfe79dac8fdc04179301` |
| 2 | CREATE | MockPriceFeed | `0xb5eb72bb2f7c2d75159f95329a9f8eaa127585ea4a0ed2b329617ef94ffe096e` |
| 3 | CALL | setPrimarySource(bytes32,address,uint8) | `0x5e30eb305dc35561b2b0405ba18d014cce52251eff6da530bb0306e35464832e` |
| 4 | CALL | addMarket((bytes32,address,bytes32,bool,bool,uint256,uint256,bool)) | `0x37675b5e3f991a155d78f038cd64f8d3247600977d889d6374ab5c66755d3ebf` |
| 5 | CALL | setRiskConfig(bytes32,(uint256,uint256[],uint256,uint256,uint256,uint256)) | `0x8773942302c5417ba529e976816a6fed42e0843f3b7251fa15ad59ab633bde90` |
| 6 | CALL | setFeeConfig(bytes32,(uint256,uint256,uint256,uint256,uint256,uint256)) | `0x57dfd2a659f4552097165ac2f373d5ab99b52df2534d0a511ea20a5cca5b6a7f` |

**AddMarket** (20 runs against the new registry)

| Market | addMarket tx |
| --- | --- |
| Apple (tokenized, mock) | `0x984159648fbea63a805ff64a18b17e908a98e969b17cb7af70c3ded1781f855c` |
| Tesla (tokenized, mock) | `0x433e5d1d72fdb887d5526abe7b1cb9a71550c1c5f5a88f4a2e8ccf3d45746a32` |
| Meta (tokenized, mock) | `0xbe3e053a82746b8f34473a052660be84b1dd1df4144bc7795b27f8c17213f6d8` |
| Robinhood (tokenized, mock) | `0xb9b6fe2671d3e264e320a9f56c05085b096d3043f811150eeb1e4048ef04dff9` |
| Amazon (tokenized, mock) | `0xf5889aa8dfe6a060fb0c924a4e33518151e86c23455cfcabdf179090a9e207ca` |
| Palantir (tokenized, mock) | `0xcf5f3335cdebecd62f9ef0fcfd99964609abfac8c84f96bed2b302d3b06d3e72` |
| Netflix (tokenized, mock) | `0x064398c0979ee48581f6c81709f21ebab7f96c0df76ff22253501d5f7018b25b` |
| AMD (tokenized, mock) | `0xef00d180ae5c7c4f403bf8a36c7a0da1241415fcc09ef63794205b3ec662bd10` |
| Microsoft (tokenized, mock) | `0x7a47e3fba921ee809ac2aa8bbb11a165e3a5cd73f2da8ec7ab825bae485fb75c` |
| Alphabet (tokenized, mock) | `0x2222b3710f545b9438cf481694bcd994371d4233890e58dd6f25f1e95be87fb2` |
| Coinbase (tokenized, mock) | `0xe5e9dae7ab318d3d4bbf68be1e3f800702052eab87381eaf2b409fe55382bd97` |
| Strategy (tokenized, mock) | `0x38069d74eff880d66bef37c6e17ba325709a81920d8916c071635b55dd102e9f` |
| SPDR S&P 500 ETF (tokenized, mock) | `0xf9f8c2a9468d28e73635c1d5a3ccfdcadf869905a3e8c0e3b3e103b2a61b42b2` |
| Invesco QQQ ETF (tokenized, mock) | `0xccbe304ce373d3bbcaaa3f943c2726524a0e8a8553aa214059ecfa974578fdd8` |
| Broadcom (tokenized, mock) | `0x0e66aa9ad76403a28bfa3c38eea1429a163d61dff80cd33b84cf0813090cd2e9` |
| JPMorgan Chase (tokenized, mock) | `0xf9c16eebc552eb6e0bc0e47e53dcf968a08bfe31231ecb6b58666c430d824bf2` |
| Walt Disney (tokenized, mock) | `0xf930eed76e0cafa41c88a8eb960d44621c29d69180e9efc9f84ee2ea33b92ac7` |
| Uber (tokenized, mock) | `0x5b1b3deff2e7aa1242b56c01e23b8f7f21d84a4368ecbcc291fd7aa7ae09245c` |
| Shopify (tokenized, mock) | `0xc03da36e388dab7aa5137535c1c9cfefd2609af6f66e820844b78c4cff6607b5` |
| End-to-end test (mock, paused) | `0x827a7b7424d0ab541f1035330c531a8e5b0caf0385aca3afce85fe4ea6a892eb` |

**DeployCreditStack** (12 transactions)

| # | Kind | Function / contract | Hash |
| --- | --- | --- | --- |
| 1 | CREATE | CompositeSanityOracle.credit-via-ir | `0xe253f838e88dab9c3145a9bf5df9ff8982f13470947010d2794a744132649671` |
| 2 | CALL | setMaxStaleness(uint256) | `0x906929b6c1e4ba63b3fa015dea30c340acbe93bbd8a3e81895550cee885f901a` |
| 3 | CREATE | HumeCreditRegistry | `0x8d36744c6d13ca9bfb7e3e5cba3f37ba637774c116c82c60f5b6d5edca9e56e7` |
| 4 | CREATE | ERC1967Proxy.credit-via-ir | `0xb458c067e4840eeb257032216e7318bd35906f475813a6493b84b9d9de1c384e` |
| 5 | CREATE | HumeCreditRouter | `0x90615ec14ceee518398be192d79edbadec776e5bfba80297edd7db1dc5358d4f` |
| 6 | CREATE | ERC1967Proxy.credit-via-ir | `0x0028c253c4f5f79ad0b341ffc343b6457923e47033deaf75b39a4fd40e21465d` |
| 7 | CREATE | HumeCreditVault | `0xb7cdc90a6fb39e651cb21b3f2a8f66f64f77eec4e65e0c18807a07097962e50c` |
| 8 | CREATE | ERC1967Proxy.credit-via-ir | `0x2581b6fe098150b3a8facfc23a0e79e4c45afad0958fb8e567d33cc6a0d4c713` |
| 9 | CREATE | HumeCreditPair | `0xce746a605f2a19f462f57f67c86e783de124a5b3a9d28d603c79b517cb611d31` |
| 10 | CREATE | ERC1967Proxy.credit-via-ir | `0xd3a5cda55af1e038c5175c5997c6d113c3edba873751c4fc6b4188f87248ca84` |
| 11 | CALL | ERC1967Proxy.credit-via-ir | `0x275e964ebf337a37b3356ce02e128fca3097422a456891c7a641783a82c4f6ee` |
| 12 | CALL | ERC1967Proxy.credit-via-ir | `0xecdac2dba7ac029456ba81952f73cdb0a104ea7ab00b72bc94f5213820a88650` |


## Repo checks

`pnpm typecheck && pnpm lint && pnpm test` from the root: every turbo run reported all tasks successful (typecheck 16 of 16, lint 12 of 12, test 16 of 16). No contract source changed, so `forge test` was not rerun.

## Acceptance

Evidence lists the new addresses (not keys), the deployment transaction hashes and the six verifications. The old deployment is
recorded as abandoned in the CHANGELOG. `packages/config/src/deployments.ts` now carries the new testnet addresses, including the credit stack.
