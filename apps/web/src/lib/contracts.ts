import { implementationRecords, ponsForChain, type ContractAddresses } from "@hume/config";
import type { Address } from "@hume/types";
import { env } from "@/lib/env";

/// Every contract in the deployment (`ContractAddresses`, packages/config/src/deployments.ts) —
/// shown in full so a trader can verify all of it directly on the block explorer instead of taking
/// custody and settlement on trust, matching what the landing page's own FAQ already claims ("every
/// contract HUME runs on is listed"). The five marked optional in `ContractAddresses` (limit
/// orders, the insurance fund, cross margin, subaccounts, RFQ) were added after the first deployment
/// and are `undefined` on a deployment made before they existed; the landing page's contracts panel already renders
/// an `undefined` address as "not yet deployed", so listing them here costs nothing on an older chain.
export const CONTRACTS: ReadonlyArray<{ label: string; description: string; address?: Address; key?: keyof ContractAddresses }> = [
  { label: "Market registry", description: "Lists every tokenized equity market and its parameters.", key: "marketRegistry", address: env.addresses.marketRegistry },
  { label: "Vault", description: "Holds trader collateral and settles every trade's PnL.", key: "vault", address: env.addresses.vault },
  { label: "Collateral manager", description: "Keeps the ledger of what each account has deposited.", key: "collateralManager", address: env.addresses.collateralManager },
  { label: "Fee manager", description: "Collects trading fees and routes a share to the buyback module.", key: "feeManager", address: env.addresses.feeManager },
  { label: "Buyback module", description: "Uses protocol revenue to buy back the protocol token.", key: "buybackModule", address: env.addresses.buybackModule },
  { label: "Risk manager", description: "Sets each market's open-interest cap and leverage tiers.", key: "riskManager", address: env.addresses.riskManager },
  { label: "Oracle router", description: "Routes and validates the mark and index price every contract reads.", key: "oracleRouter", address: env.addresses.oracleRouter },
  { label: "Price validator", description: "Rejects stale or out-of-bounds oracle prices before they're used.", key: "priceValidator", address: env.addresses.priceValidator },
  { label: "Perps engine", description: "Executes leveraged long and short perpetual positions.", key: "perpsEngine", address: env.addresses.perpsEngine },
  { label: "Perp position manager", description: "Stores perpetual positions; the perps engine is the only writer.", key: "perpPositionManager", address: env.addresses.perpPositionManager },
  { label: "Funding manager", description: "Charges the side pushing price away from index, pays the other.", key: "fundingManager", address: env.addresses.fundingManager },
  { label: "Liquidation engine", description: "Lets anyone liquidate an eligible position for a reward.", key: "liquidationEngine", address: env.addresses.liquidationEngine },
  { label: "Perp order manager", description: "Holds resting limit and trigger orders until they fill.", key: "perpOrderManager", address: env.addresses.perpOrderManager },
  { label: "Options engine", description: "Prices and settles cash-settled calls and puts.", key: "optionsEngine", address: env.addresses.optionsEngine },
  { label: "Option market", description: "Tracks each option series and its open interest.", key: "optionMarket", address: env.addresses.optionMarket },
  { label: "Option position manager", description: "Stores option positions; the options engine is the only writer.", key: "optionPositionManager", address: env.addresses.optionPositionManager },
  { label: "Insurance fund", description: "Covers a liquidated position's shortfall so bad debt stays rare.", key: "insuranceFund", address: env.addresses.insuranceFund },
  { label: "Cross margin manager", description: "Backs a cross position with the whole account, not just itself.", key: "crossMargin", address: env.addresses.crossMargin },
  { label: "Subaccount factory", description: "Creates subaccounts and limits what they're allowed to call.", key: "subaccountFactory", address: env.addresses.subaccountFactory },
  { label: "RFQ manager", description: "Lets a market maker quote a user's trade directly, off the order book.", key: "rfqManager", address: env.addresses.rfqManager },
  { label: "Lending pair", description: "Locks a stock token as collateral and lends USDG against it, with a liquidation limit.", key: "creditPairTslaUsdg", address: env.creditPair },
  { label: "Pons router", description: "Buys and sells Pons tokens for ETH in their own pools. No owner, no fee, no funds held.", address: ponsForChain(env.chainId).router },
];

/// One row of the full list: a contract, or the implementation behind a proxy.
export interface ContractRow {
  label: string;
  description: string;
  address: Address;
  group: "Core" | "Lending" | "Pons";
  /// An implementation is the code behind the proxy above it.
  implementation?: true;
}

const recorded = implementationRecords[env.chainId];

/// Everything deployed on this network, with the code behind each proxy: the core stack (every contract is a proxy
/// with an implementation), the lending stack, the Pons router and the upgrade placeholder. `CONTRACTS` above is the
/// shorter list the landing page's 3D scene draws, one block per entry; this is the list a reader checks on the
/// explorer. A contract that is not deployed on this network is left out, not listed as missing.
export const ALL_CONTRACTS: readonly ContractRow[] = (() => {
  const rows: ContractRow[] = [];
  const add = (label: string, description: string, address: Address | undefined, group: ContractRow["group"], key?: keyof ContractAddresses) => {
    if (!address) return;
    rows.push({ label, description, address, group });
    const implementation = key ? recorded?.implementations[key] : undefined;
    if (implementation) rows.push({ label: `${label} implementation`, description: `The code behind the ${label.toLowerCase()} proxy.`, address: implementation, group, implementation: true });
  };
  for (const entry of CONTRACTS) {
    if (entry.key === "creditPairTslaUsdg" || !entry.key) continue;
    add(entry.label, entry.description, entry.address, "Core", entry.key);
  }
  add("Lending oracle", "Holds the collateral price the lending pair reads, with a staleness and jump check.", env.addresses.creditOracle, "Lending");
  add("Lending registry", "Lists the lending pairs and their limits.", env.addresses.creditRegistry, "Lending", "creditRegistry");
  add("Lending router", "The entry point for supplying, borrowing and repaying.", env.addresses.creditRouter, "Lending", "creditRouter");
  add("Lending vault", "Holds the USDG that lenders supply and borrowers draw.", env.addresses.creditVault, "Lending", "creditVault");
  add("Lending pair", "Locks a stock token as collateral and lends USDG against it, with a liquidation limit.", env.creditPair, "Lending", "creditPairTslaUsdg");
  add("Pons router", "Buys and sells Pons tokens for ETH in their own pools. No owner, no fee, no funds held.", CONTRACTS.find((entry) => entry.label === "Pons router")?.address, "Pons");
  add("Upgrade placeholder", "An empty contract the proxies point at while they are being deployed.", recorded?.upgradePlaceholder, "Core");
  return rows;
})();
