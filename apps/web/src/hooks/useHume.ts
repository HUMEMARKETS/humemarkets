"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { EIP1193Provider } from "viem";
import type { Hume } from "@hume/sdk";
import { humeWithWallet } from "@/lib/hume";

/// The SDK client bound to the connected wallet, or `undefined` while disconnected or on the
/// wrong network. Reads use `humeRead`; only actions that sign need this.
export function useWalletHume(): Hume | undefined {
  const { address, connector, isConnected } = useAccount();
  const [client, setClient] = useState<Hume>();

  useEffect(() => {
    let cancelled = false;
    if (!isConnected || !address || !connector) {
      setClient(undefined);
      return;
    }
    void connector.getProvider().then((provider) => {
      if (!cancelled) setClient(humeWithWallet(provider as EIP1193Provider, address));
    });
    return () => {
      cancelled = true;
    };
  }, [address, connector, isConnected]);

  return client;
}
