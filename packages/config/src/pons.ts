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
}

const pons: Record<ChainId, PonsConfig> = {
  [ROBINHOOD_TESTNET_CHAIN_ID]: {
    factory: "0x6b0bf164575160d43125e97785BBb3Cce21f94Bf",
    router: "0x36Db1af59A6B2be59420dA9D2D93ba1179B39969",
    hook: "0x0000000000000000000000000000000000000000",
    poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
    fromBlock: 130_733_000,
  },
  [ROBINHOOD_MAINNET_CHAIN_ID]: {
    factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
    hook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
    poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
    fromBlock: 0,
  },
};

export function ponsForChain(chainId: ChainId): PonsConfig {
  const config = pons[chainId];
  if (!config) throw new Error(`@hume/config: no Pons configuration for chain ${chainId}`);
  return config;
}
