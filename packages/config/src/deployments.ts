import type { Address } from "@hume/types";
import { ROBINHOOD_MAINNET_CHAIN_ID, ROBINHOOD_TESTNET_CHAIN_ID, type ChainId } from "./chains.js";

export interface ContractAddresses {
  marketRegistry: Address;
  oracleRouter: Address;
  vault: Address;
  collateralManager: Address;
  feeManager: Address;
  buybackModule: Address;
  riskManager: Address;
  optionsEngine: Address;
  optionMarket: Address;
  optionPositionManager: Address;
  perpsEngine: Address;
  perpPositionManager: Address;
  /// Absent on deployments made before limit orders (`[1.1.0-testnet]` and earlier); the SDK
  /// reports limit orders as unavailable there instead of calling a contract that lacks them.
  perpOrderManager?: Address;
  /// Absent on deployments made before `[1.3.0]`: the loss buffer that pays a liquidated position's
  /// shortfall (Phase 7, clearing).
  insuranceFund?: Address;
  /// Absent before `[1.3.0]`: account-level margin, other collateral and portfolio margin.
  crossMargin?: Address;
  /// Absent before `[1.3.0]`: creates subaccounts.
  subaccountFactory?: Address;
  /// Absent before `[1.3.0]`: request-for-quote and block trades for perps.
  rfqManager?: Address;
  liquidationEngine: Address;
  fundingManager: Address;
  priceValidator: Address;
  settlementToken: Address;
  /// Credit stack (Phase 9). All absent until `DeployCreditStack.s.sol` is broadcast.
  creditOracle?: Address;
  creditRegistry?: Address;
  creditRouter?: Address;
  creditVault?: Address;
  creditPairTslaUsdg?: Address;
}

/// Contracts a deployment may not have, because they were added after it was made. They are absent
/// from the recorded literal below until a deployment includes them, but `HUME_ADDRESSES` may
/// still supply them (a local or fresh deployment).
export const OPTIONAL_CONTRACTS = ["perpOrderManager", "insuranceFund", "crossMargin", "subaccountFactory", "rfqManager", "creditOracle", "creditRegistry", "creditRouter", "creditVault", "creditPairTslaUsdg"] as const satisfies ReadonlyArray<keyof ContractAddresses>;

/// Mirrors `packages/contracts/deployments/robinhood_testnet.json`. Kept as a checked-in
/// literal rather than read from disk at build time — there is no deploy-to-config sync step
/// yet, so this must be updated by hand whenever that file changes (see CHANGELOG entry for
/// the deploy that produced it).
const robinhoodTestnetAddresses: ContractAddresses = {
  marketRegistry: "0xD56A8cB9A047d38c0A16048756627FDc43E17077",
  oracleRouter: "0xf009Ba3BE0987c51Fd2260E7184A61b10195418f",
  vault: "0xE27eB199e5957a948D304518Fc8fcCF6e88AaF26",
  collateralManager: "0xbCB4B5f52A9b8A12a1707948a4479AA727898fb5",
  feeManager: "0x8eDD2215ffDD41144685A00826326DddB6cb487E",
  buybackModule: "0x8f5f75370B44792154baC8f69f36456557826693",
  riskManager: "0xa0D5Ae076151788DFA03583Bf42D13B420263Dd4",
  optionsEngine: "0x043F2882360e5f33803610960bdf57c47011A828",
  optionMarket: "0x6C0BF76640aBf555CE129dC4F96A34d2955aB738",
  optionPositionManager: "0x9b37F4579dbcbB1ae2FDF469EDc2Bc6Dc544d0d3",
  perpsEngine: "0x7c15B52f50BFFE0bc9f762EaEEc77a1cba37D044",
  perpPositionManager: "0x18F8040BDDb7292D90Ca0Df045463d9809010E0A",
  liquidationEngine: "0x571bFdF07297Fb880B43C1FDbCbBcBB55A010b85",
  fundingManager: "0x5DE0abc2cf0821677C5D56Db326c305B331303fc",
  priceValidator: "0xA38311d14f89764a2D5e4A45E1FEF7A07Ac1BEB0",
  settlementToken: "0x70b0FDa35dEb7BA710C601Ed9c45b9F992027112",
  perpOrderManager: "0x4d05B3f5E1dBF1bBA3a935bF2634C54C56E19bFF",
  insuranceFund: "0x3626E18E05F870a136d6C3198e8Cb2fD289b63C8",
  crossMargin: "0x3f7F8019695D3D09eFe22d3752E12EBd3588Fa88",
  subaccountFactory: "0x8981D3f0B8332Eb4F31da89caCD87E5c95537326",
  rfqManager: "0x8E5ce4013777bFbF95D8c7DB985feF1D971086d3",
  creditOracle: "0x57fD77ab420880d9309cF34eB3212726993E97D5",
  creditRegistry: "0x5Ea79891C3E050513b9997bf300283B924cb9E24",
  creditRouter: "0x45563Db7F1A66703fAb36dE5396753FdFcABaC08",
  creditVault: "0x1e77BFDEBed372Bc40cceAc2D5343b2Be360776c",
  creditPairTslaUsdg: "0x4b166551CdD904D8D7AfB7170D92A0d8D35cF141",
};

/// Mirrors `packages/contracts/deployments/robinhood_mainnet.json` (DeployAll, 2026-09-25). The
/// stack is deployed but empty: no markets, feeds or funds, and the deployer wallet still holds
/// every admin role. Not open for real funds until docs/MAINNET_READINESS.md is closed.
const robinhoodMainnetAddresses: ContractAddresses = {
  marketRegistry: "0x71Bb058106b1a226a6f66e2152719a6B827c783a",
  oracleRouter: "0x831255818E492f31a5515b0b62a1406F00c7BA7c",
  vault: "0x9aC6782D82D980f2623bBE78C8882832baC94903",
  collateralManager: "0x5Dd7bf74253D392C6D071D00e873F6660edb6D78",
  feeManager: "0xa8D4641d988411fa4F312ac942da1e063C19cB47",
  buybackModule: "0xEE8AE4155C653B664727CA5EF0757914aA4769CE",
  riskManager: "0xCe8d2D037f32B61E4a3023bAB62Fb125A9b97f07",
  optionsEngine: "0xFa58B6B1D9B9de3A841B463ed1e945f8422932aD",
  optionMarket: "0x71C64D56ae35a85E18E24A53264E73f4d058338C",
  optionPositionManager: "0xdfE7AaDBA3574760Be45d0B3D3Ce09507361fa78",
  perpsEngine: "0xf7Ce817965156A308b0Cdf1FED554e35055f3190",
  perpPositionManager: "0x3eA78624f5F9a514FA69427a691c62418f4C9493",
  liquidationEngine: "0x0979B96607C44435BC5462A738a7F10D55a4142C",
  fundingManager: "0xe9DFC7B3e2179A826095b87E24e657d6e6e45bB0",
  priceValidator: "0x8eBEB401A0a4f676B63dcC687Cf300B81f239ba6",
  settlementToken: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  perpOrderManager: "0x170ed757E332547d27b7ca0644Fee22259A25279",
  insuranceFund: "0xE10833Aa9C438e84626e1D73B4ec5319B5ebc263",
  crossMargin: "0xea3Ce04FA538FE6C0AEd377Cd0Cc86FE4CD0A28F",
  subaccountFactory: "0x7bd8f7D7E615A692821d6A31275dB38BC6836980",
  rfqManager: "0xE4B6aA5FdC12491e89D999FDe17e69340e19344C",
};

export const deployments: Record<ChainId, ContractAddresses> = {
  [ROBINHOOD_TESTNET_CHAIN_ID]: robinhoodTestnetAddresses,
  [ROBINHOOD_MAINNET_CHAIN_ID]: robinhoodMainnetAddresses,
};

export function addressesForChain(chainId: ChainId): ContractAddresses {
  const addresses = deployments[chainId];
  if (!addresses) {
    throw new Error(`@hume/config: no deployment recorded for chain ${chainId}`);
  }
  return addresses;
}

/// The recorded deployment for `chainId`, with any addresses in the `HUME_ADDRESSES`
/// environment variable (a JSON object of `ContractAddresses` keys) replacing the recorded ones
/// for those contracts only. This lets backend services and staging point at a fresh deployment
/// (a redeploy, a local Anvil node) without editing checked-in code. Unknown keys and malformed
/// addresses are rejected rather than silently ignored — a typo here would otherwise send
/// requests to the wrong contract.
export function resolveAddresses(
  chainId: ChainId,
  env: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env,
): ContractAddresses {
  const recorded = addressesForChain(chainId);
  const raw = env.HUME_ADDRESSES;
  if (!raw) return recorded;

  let overrides: Record<string, unknown>;
  try {
    overrides = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("@hume/config: HUME_ADDRESSES is not valid JSON");
  }

  const resolved = { ...recorded };
  for (const [key, value] of Object.entries(overrides)) {
    const known = key in recorded || (OPTIONAL_CONTRACTS as readonly string[]).includes(key);
    if (!known) throw new Error(`@hume/config: HUME_ADDRESSES has unknown contract "${key}"`);
    if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error(`@hume/config: HUME_ADDRESSES.${key} is not an address`);
    }
    resolved[key as keyof ContractAddresses] = value as Address;
  }
  return resolved;
}

/// The protocol token of a chain, when one exists. It is not a contract of this stack: `BuybackModule`
/// takes it through `setProtocolToken`, and nothing here reads it on chain. The mainnet token was created
/// outside this repository (18 decimals, 1,000,000,000 supply), so it is recorded here as a display fact,
/// not a deployment. A web build may override both values with `NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS` and
/// `NEXT_PUBLIC_PROTOCOL_TOKEN_SYMBOL`.
///
/// **This token still carries the retired brand on chain.** Read at block 79379560 on 2026-10-04:
/// `symbol()` is "ALPHA" and `name()` is the retired venue name — an earlier version of this comment
/// claimed the name was "Hume", which was never true. The values are immutable, so no rename is
/// possible; the launch choices are to deploy a fresh token, to leave the buyback module unset, or to
/// display the overridden symbol everywhere. Recorded in `docs/evidence/phase-2.md` for the operator.
/// `scripts/check-brand.sh` cannot catch this: the string comes from the chain, not the repository.
export const protocolTokens: Partial<Record<ChainId, { address: Address; symbol: string }>> = {
  [ROBINHOOD_MAINNET_CHAIN_ID]: { address: "0xaf9eb3274b41e372c58b39fabd01e1d1eebc3579", symbol: "ALPHA" },
};
