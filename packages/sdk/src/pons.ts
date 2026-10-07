import type { Address, Hex } from "@hume/types";
import type { HumeClient } from "./client.js";
import { ponsRouterAbi } from "./abis.js";
import { executeTx, type TxOptions } from "./transactions.js";

/// Spot trading of graduated Pons tokens through `HumePonsRouter`: native ETH in, token out, and back. The
/// caller names a minimum output and a deadline, so a price that moved between review and signing reverts
/// (`SlippageExceeded`) and not into a worse trade. A sell needs a prior `erc20.approve(token, router, amount)`.
export interface PonsNamespace {
  buy(router: Address, token: Address, ethIn: bigint, minOut: bigint, recipient: Address, deadline: bigint, tx?: TxOptions): Promise<Hex>;
  sell(router: Address, token: Address, amountIn: bigint, minOut: bigint, recipient: Address, deadline: bigint, tx?: TxOptions): Promise<Hex>;
}

export function createPons(client: HumeClient): PonsNamespace {
  return {
    async buy(router, token, ethIn, minOut, recipient, deadline, tx) {
      const result = await executeTx(
        client,
        () => client.simulateContract({ address: router, abi: ponsRouterAbi, functionName: "buy", args: [token, minOut, recipient, deadline], value: ethIn }),
        tx,
      );
      return result.hash;
    },
    async sell(router, token, amountIn, minOut, recipient, deadline, tx) {
      const result = await executeTx(
        client,
        () => client.simulateContract({ address: router, abi: ponsRouterAbi, functionName: "sell", args: [token, amountIn, minOut, recipient, deadline] }),
        tx,
      );
      return result.hash;
    },
  };
}
