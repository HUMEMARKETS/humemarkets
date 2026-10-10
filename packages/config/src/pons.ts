import type { Address } from "@hume/types";
import { ROBINHOOD_MAINNET_CHAIN_ID, ROBINHOOD_TESTNET_CHAIN_ID, type ChainId } from "./chains.js";

/// Where Pons tokens live on each chain, and the router that buys and sells them. A Pons token that has
/// graduated trades in a Uniswap v4 pool (native ETH against the token) on the chain's `PoolManager`.
export interface PonsConfig {
  /// The Pons launchpad factory. Testnet has no real one, so it holds a mock that reports mock launches.
  factory: Address;
  /// `HumePonsRouter`. Absent until it is deployed on that chain; the page then lists tokens and says buying is not open.
  router?: Address;
  /// The Pons pool hook (`0x0` on testnet, where the mock pools have none).
  hook: Address;
  poolManager: Address;
  /// First block to scan for `LaunchSwept` events (the factory's deployment block, or earlier).
  fromBlock: number;
  /// How many launches the list reads, newest first, when the chain has no `featured` list.
  listSize: number;
  /// A fixed list of tokens to show, when the chain has thousands (mainnet: 4,979 graduated). Without it the
  /// list is every launch the factory reports, up to `listSize`.
  featured?: readonly Address[];
  /// DexScreener's chain id. Pons logos are `ipfs://` addresses and the public IPFS gateways are shut down, so
  /// the API takes DexScreener's copy of the image. Absent where DexScreener does not index the chain.
  dexscreenerChain?: string;
}


/// The 60 deepest ETH pools among Pons tokens with a logo, measured 2026-10-10 from the factory's `LaunchSwept`
/// events and each pool's liquidity. Every ETH-paired launch swept the same 4.2 ETH at graduation, so the
/// factory's own data cannot rank them; refresh this list from a new scan when the market moves.
const MAINNET_FEATURED = [
  "0x51250B135174Ca09450EC01c4afF73CF69DBb590", // NOVAAI
  "0x07EBB29a38Fbcb41563817e5E19f2ceC619C90D2", // BUN
  "0x7dbf38976f6D3b9c529e7D9484A71898B409eE6a", // ZZZ
  "0xdEe52F2ab639b6942B0d0F0565400b93b7a0fbe5", // HARMONIC
  "0x806BA27B5e1c4C2E989a3757a8deF9FE1145Ed10", // WOJAK
  "0x15d36B6A28d8327ABc7aFABF0F106AE2c9Af5C4d", // PARE
  "0x5733507868F46D96907132F98431DCeEf67c69CC", // AGE
  "0x5317C0d077D2eEB639448939b930D49c4984B63B", // COPPERINU
  "0x4A72B9702f991b790788f8AFA9e7112541f4E8f8", // ROUTE
  "0xAA5751Ff3Fb61e613993B2EB4EAb1fce017081fc", // HYDX
  "0xEfAb538Cf3C29237A47c6aFB145D50Ddf204A0A3", // UFG
  "0x440e339a46eaa3bE8d723c2cBED2A30af74536D5", // SPRING
  "0x008Df4b3E857D06c4603Aeb11F267ccD32ce2005", // ROBINHOOD
  "0x7163aE1B5AeA2f09EBc609C52b4dcAc0a7a4bC2d", // GAGE
  "0x7CD7073A71eaF5F6E4febFA98460Ee66cd97dEb1", // BISCOTTI
  "0x2205c2232914f3A962fB25EdA51f2d063Dc9E532", // GG
  "0x9fA1C5E90A11294F83A9F135b81ad1b537A5FFdC", // ZEAL
  "0x9f4BA41F91a59A34e17eE8C9EB3A51363B11aBD5", // GRIFT
  "0x5173b8eA6923c2d40267890D45C46a3480954773", // WIF
  "0x1F052479d2ffd9649980adF36A02b8Cb0E9D6263", // COL
  "0xbd9Fceaf34CE6FCCf225cC17A17Bf868924b2480", // MINTFOLIO
  "0xd421141B9d6AfA274572a747E9a3fdd24BA8c400", // CRH
  "0xa92768863a55d8A0591709f7f5E594A249d36Ea3", // ASKR
  "0x89B76DCDDa801f2e456765742C64950eB2A0c93C", // BORRO
  "0x72dc556fff14115c077a540921e5F35499a4DCa7", // THRONE
  "0xD79eb5D4EdF7bd843eeF5109F1a1FF5C96b17948", // Knight
  "0x9cA1cC0c90d97B4F36c5E2232d4fbD705a73c65d", // TA
  "0xe0eba1B76b73BE7bfA7716b6Ca96f724930e2263", // $ROBBIE
  "0x368580343A637B8b91d27C8A8bE124f534329A30", // ROBIT
  "0x183536D2859641a54Dd9C0405E7676E476c7C4ca", // BABYCASHCAT
  "0x238E40b75Ae78A1388A14e517D855893e92e58db", // SGT
  "0x75b19A029d6243A847393F6B8874c8d4b69e5Ee4", // VITA
  "0x61e0DEba0A6BD1D0df92AF816739449c861e3CCe", // SYNTHS
  "0x47569d49471bDBaBFaf5531c0F74d9f2dE82A11A", // PROPHET
  "0xbFdAc6235dBE77C0CD6EDB01c810c7da858c6c41", // COMD
  "0x6D0f5047704cA09d73c946612DC98eF62561fD5c", // DUEL
  "0xd6c0651a0c3f24BBF2794187285a66Da753A1D79", // TAKO
  "0x7BA36BE14dD06ba492f08be6C1B2979c1d0B652C", // PERPSHOOD
  "0xBf818eFe65aac127AC8f9Fec6fEC203ee222C851", // BPEPE
  "0x49bac47750F3dCdBa49350B5D74fd399e90f97C6", // BULL
  "0x923D915DdF0FE60C04AdDac68E13F0d5af03164F", // HADES
  "0x6DB6DcF8Ae8CafbcD5B93d794665a97eB9Efa85D", // ALAMAYO
  "0x4da3916d3ae6FeecE32EC8A2c4856d4aBEb41bfD", // SCROOGE
  "0xc3F40AB7A3B7025Fa544895d7aF5164572CC7A4f", // Dots
  "0xa26992C4268A8a78a4d872FE4BDAD2Ed03aC287d", // MANY
  "0x6249519883B8d7ccf915dfcd6c0442984dAE9d24", // CASHED
  "0xC65a7C91591A2Dd4d5624E75e814b1bBe88b984a", // TRENCHERS
  "0x56fcb5cC32D8ddA466dCC5FE4300576E67fcf20E", // TRIBES
  "0x268AeA4a2C22a879d591e0Feddc50A7539f287B7", // FUDA
  "0xB6ff957E31286F748989Cbf69183b1b5e8d921A8", // CONV
  "0x904E720E92FeE3ef03636B488b98857b6e4c4C67", // LOOP
  "0xFAd17D7cc41D9C9CA4A459Da798a4446dD217974", // POTATCHI
  "0x242EDD4e4CD50b13b46D950911BEEf96d0f9ceBd", // DAEMON
  "0x16391C40e85FB2246A2C8c17bfA2594C5d3EF84b", // GRASS
  "0xf39a492D391970410B4EE685bDea448a5bDA698a", // DUST
  "0x19dCb63C4d2F29A6f077F094a4f858fC790145e1", // CrawlScan
  "0xd577F45d1e43730955213a2aC3e513052D31fb03", // OP
  "0xf7894d31D569e6330592D346ecfeFdf4257F3EC1", // SABLE
  "0x404f8d6168ad19B1a7Fcb15BF8d271cD4389ecB0", // IMPS
  "0xf703ee7C1A9dd263Ce46990e119c69D8fFb98D2A", // ELSE
] as const satisfies readonly Address[];

const pons: Record<ChainId, PonsConfig> = {
  [ROBINHOOD_TESTNET_CHAIN_ID]: {
    factory: "0x2549b97021e6E84D117fD13Dfc7de6436C458004",
    router: "0x8553c25ab09220216169eF9543400E3d26C0D61A",
    hook: "0x0000000000000000000000000000000000000000",
    poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
    fromBlock: 132_339_000,
    listSize: 100,
  },
  [ROBINHOOD_MAINNET_CHAIN_ID]: {
    factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
    router: "0x908A1371a1c994B01431D1DAF14E809E8EF90bB9",
    hook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
    poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
    fromBlock: 0,
    listSize: 100,
    dexscreenerChain: "robinhood",
    featured: MAINNET_FEATURED,
  },
};

export function ponsForChain(chainId: ChainId): PonsConfig {
  const config = pons[chainId];
  if (!config) throw new Error(`@hume/config: no Pons configuration for chain ${chainId}`);
  return config;
}
