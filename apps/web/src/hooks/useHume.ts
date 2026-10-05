"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { EIP1193Provider } from "viem";
import type { Hume } from "@hume/sdk";
import { useAccountMode } from "@/hooks/useAccountMode";
import { humeWithWallet } from "@/lib/hume";
import { sampleClient } from "@/lib/sampleClient";

/// The SDK client every action signs with, or `undefined` when there is nothing to sign with. Reads use
/// `humeRead`; only actions that change something need this.
///
/// In sample mode it is the sample client: it has the same methods, the same status events and the same
/// refusals, and it writes to the sample account instead of a wallet. In connected mode it is the real
/// client bound to the wallet. Callers cannot tell the difference, which is the point.
export function useWalletHume(): Hume | undefined {
  const mode = useAccountMode();
  const { address, connector, isConnected } = useAccount();
  const [client, setClient] = useState<Hume>();

  useEffect(() => {
    let cancelled = false;
    if (mode !== "connected" || !isConnected || !address || !connector) {
      setClient(undefined);
      return;
    }
    void connector.getProvider().then((provider) => {
      if (!cancelled) setClient(humeWithWallet(provider as EIP1193Provider, address));
    });
    return () => {
      cancelled = true;
    };
  }, [address, connector, isConnected, mode]);

  return mode === "sample" ? sampleClient : client;
}
