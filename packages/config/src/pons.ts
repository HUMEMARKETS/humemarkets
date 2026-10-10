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
  /// How many launches the list reads, largest first (by quote swept at graduation). Mainnet has thousands.
  listSize: number;
  /// DexScreener's chain id. Pons logos are `ipfs://` addresses and the public IPFS gateways are shut down, so
  /// the API takes DexScreener's copy of the image. Absent where DexScreener does not index the chain.
  dexscreenerChain?: string;
}


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
    hook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
    poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
    fromBlock: 0,
    listSize: 100,
    dexscreenerChain: "robinhood",
  },
};

export function ponsForChain(chainId: ChainId): PonsConfig {
  const config = pons[chainId];
  if (!config) throw new Error(`@hume/config: no Pons configuration for chain ${chainId}`);
  return config;
}
