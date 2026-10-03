import { custom, http, type EIP1193Provider } from "viem";
import { Hume } from "@hume/sdk";
import type { Address } from "@hume/types";
import { env } from "./env";

const shared = {
  chainId: env.chainId,
  addresses: env.addresses,
  apiUrl: env.apiUrl,
  explorerUrl: env.explorerUrl,
} as const;

/// Read-only client over the app's own RPC. Everything the terminal displays goes through this,
/// so reads never depend on which network the wallet happens to be on.
export const humeRead = new Hume({ ...shared, transport: http(env.readRpcUrl) });

/// Client that signs with the connected wallet. The frontend only ever talks to the chain and
/// the API through the SDK (DEVELOPMENT_STEPS.md Phase 3, step 14).
export function humeWithWallet(provider: EIP1193Provider, account: Address): Hume {
  return new Hume({ ...shared, transport: custom(provider), account });
}
