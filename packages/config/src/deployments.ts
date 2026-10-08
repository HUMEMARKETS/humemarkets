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

/// The code behind each proxy of a chain's deployment, and the empty UUPS placeholder `DeployAll` also deploys.
/// Every contract in the stack is an upgradeable proxy, so a reader who checks a contract on the explorer needs
/// both addresses: the proxy that holds the state and the implementation that holds the code. The core stack
/// mirrors `packages/contracts/deployments/<network>.implementations.json`; the credit implementations were read
/// from each proxy's EIP-1967 slot (`cast implementation`), and the placeholder from the `DeployAll` broadcast.
export interface ImplementationRecord {
  implementations: Partial<Record<keyof ContractAddresses, Address>>;
  upgradePlaceholder?: Address;
}

const robinhoodTestnetImplementations: ImplementationRecord = {
  implementations: {
    buybackModule: "0x1442178047eB7AeD0A1992cF968F662873d97016",
    collateralManager: "0x3e91e189685e1AA9D419837028cC82d439b86DDB",
    crossMargin: "0x70532B29924F26648eF25d0c121DfCd5C87cEAb6",
    feeManager: "0x96469c8e86f5f24fa39e098deC5B2751cb74a081",
    fundingManager: "0x80b0910fdaAaF35E15b01f814046B26a71eed3d2",
    insuranceFund: "0xA795faF59a8314d9A1ed15740D0a12217a00F6A1",
    liquidationEngine: "0xe726862939dFF210621F5A3caaE11B9278c37c78",
    marketRegistry: "0x74731890b66e729511d112d3ecF060726208e2e4",
    optionMarket: "0x845D6CeF7191B3a9d0E6E07d16a7182d28d8dD06",
    optionPositionManager: "0x16Dc9Bf7C8E980Dc4a6e4d768F124C713134660C",
    optionsEngine: "0x967f3Ba1C7113D0bc45D4111F11E3880009214C8",
    oracleRouter: "0xBcA81fFc345315b683CdD524fa27609E92BA0deD",
    perpOrderManager: "0x0b5197A7329dbEd27a89073513216B7915829BE1",
    perpPositionManager: "0xb6AA98019A7AC3def7ae547fB088E138bf730086",
    perpsEngine: "0xdB6E91915BdD30C1e82Cb9CDf644443c341Aad19",
    priceValidator: "0x1d7e31D3964b8316926503B593b84d5dE9e05E6D",
    rfqManager: "0xf0bfdE031eeFf632FfCA25Ea253294F8BC72f11b",
    riskManager: "0x0f458436361b084837B6f73949a68697016447b5",
    subaccountFactory: "0x18457af07EfF9BEF5f778486F7D0d83fc4c92F9B",
    vault: "0x3283fE5a2f10D1Dce381C1a25952E411E8DD9CAB",
    creditRegistry: "0xBFFCa2aFc35f0970caaAECe43a17289811F54BfD",
    creditRouter: "0xde4f3d9D7C9fea37447D0A965fE27037993Ed597",
    creditVault: "0xA29E07205B437cf1737BD00D811933eE2418417F",
    creditPairTslaUsdg: "0x0272607F65Ac2d7b8F42096B1749cCa0F3fDD0E7",
  },
  upgradePlaceholder: "0x8281801548Aa1a43A2e351351895fc6162ACA446",
};

const robinhoodMainnetImplementations: ImplementationRecord = {
  implementations: {
    buybackModule: "0x9f6207312aA6D431f51235DfFF3884EAaa14218D",
    collateralManager: "0x498249bC18986216FEC0BECd2f6130D162C970eD",
    crossMargin: "0x113b7E4E7B70797f25B8A95627c0a3439089E565",
    feeManager: "0x4398d1D38613D2010eCac29600ed70366A62a873",
    fundingManager: "0x5cbCA4eD07d5597208539FF53E76f75a1C2c61Cb",
    insuranceFund: "0xBA5256Ca177a797600BAe6Fe666b2171c6C776e4",
    liquidationEngine: "0x44D68f1eD1Bb5a352062f451Cf6689fE6BcC9587",
    marketRegistry: "0x9a2C84c0AEf8e4fc2a88Cc65aAf9ef8E600179A1",
    optionMarket: "0x73261B27AFca7110cB3b591Ca3B3376223678425",
    optionPositionManager: "0x90622fCB4861036A5A4B47a6d26aBa28fa3EA134",
    optionsEngine: "0x0a1F47a4eF84acb7C85cf54Fbe15C912FcB70BEE",
    oracleRouter: "0xD656Db63141B7Df88699964AC0B22ed0865dBd3f",
    perpOrderManager: "0xCD077cb2CAD5f4c7B9b06FB9958dB36535A0aEd2",
    perpPositionManager: "0x3e46dBCa6916B13512b705Eb58FFf2994b4a3857",
    perpsEngine: "0x1f9903f49b80E58fDcc7bFC90f8a9c1373C5eaD2",
    priceValidator: "0x44e086815e2E84287Df285BC03eab864a9F10fB3",
    rfqManager: "0xCC321f37FF752B03D04c3dF9BC93c3Da96c256D2",
    riskManager: "0x16239Dc67101fE6A20E27FFC7222aeD48A37571F",
    subaccountFactory: "0xC3eF7f7901B8ea4bd4EcC8CD8E795f4Bf51b8a9F",
    vault: "0xfe97357eBa1dED613A3E7A560c35cF2DB360e939",
  },
};

export const implementationRecords: Record<ChainId, ImplementationRecord> = {
  [ROBINHOOD_TESTNET_CHAIN_ID]: robinhoodTestnetImplementations,
  [ROBINHOOD_MAINNET_CHAIN_ID]: robinhoodMainnetImplementations,
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
