"use client";

import { useAccount } from "wagmi";
import { useModeStore } from "@/stores/mode";

/// The one seam between the interface and where its numbers come from.
///
/// - `sample`: the simulated account. Real prices, simulated balance, nothing signed.
/// - `connected`: a wallet is connected and the person chose to use it.
/// - `disconnected`: the person chose a wallet and has not connected one.
///
/// Every hook that reads or writes account data goes through this, so there is one component tree and
/// the sample cannot drift from the real thing. Before the stored choice has loaded it answers `sample`,
/// the same answer the server renders.
export type AccountMode = "sample" | "connected" | "disconnected";

export function useAccountMode(): AccountMode {
  const preference = useModeStore((state) => state.preference);
  const ready = useModeStore((state) => state.ready);
  const { isConnected } = useAccount();
  if (!ready || preference === "sample") return "sample";
  return isConnected ? "connected" : "disconnected";
}
