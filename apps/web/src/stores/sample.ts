import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { env } from "@/lib/env";
import { createAccount, type SampleAccount } from "@/lib/sampleEngine";

/// The sample account: its own USDG balance, positions, orders and fills, kept on this device only.
/// It never reaches a wallet, a chain or a server. Amounts are `bigint`, which JSON cannot carry, so
/// they are written as `{ "$bigint": "123" }` and read back the same way.
interface SampleState {
  /// Undefined until `start` has run: the starting balance is in settlement-token base units, so it
  /// needs the token's decimals, which are read from the chain.
  account: SampleAccount | undefined;
  /// Bumps on every change. Query keys carry it, so every hook reading the sample account refetches the
  /// moment the account changes, through the same `useQuery` shape the chain reads use.
  version: number;
  ready: boolean;
  start: (startingBalance: bigint) => void;
  /// Replaces the account with the result of `change`. If `change` throws (a refused order), nothing is
  /// stored and the error reaches the caller, so a refusal never half-applies.
  apply: (change: (account: SampleAccount) => SampleAccount) => void;
  reset: () => void;
}

const BIGINT_TAG = "$bigint";

function replacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? { [BIGINT_TAG]: value.toString() } : value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && BIGINT_TAG in value && typeof (value as Record<string, unknown>)[BIGINT_TAG] === "string") {
    return BigInt((value as Record<string, string>)[BIGINT_TAG]!);
  }
  return value;
}

export const useSampleStore = create<SampleState>()(
  persist(
    (set, get) => ({
      account: undefined,
      version: 0,
      ready: false,
      start: (startingBalance) => {
        if (get().account) return;
        set({ account: createAccount(startingBalance), version: get().version + 1 });
      },
      apply: (change) => {
        const account = get().account;
        if (!account) return;
        set({ account: change(account), version: get().version + 1 });
      },
      reset: () => {
        const account = get().account;
        if (account) set({ account: createAccount(account.startingBalance), version: get().version + 1 });
      },
    }),
    {
      // One account per network, so a Mainnet sample and a Testnet sample never share a balance.
      name: `hume-sample-account-v1-${env.chainId}`,
      storage: createJSONStorage(() => localStorage, { replacer, reviver }),
      partialize: (state) => ({ account: state.account }),
      skipHydration: true,
      // Reading the stored account is a change like any other, so it bumps the version too. If it did not,
      // the query key before and after the read would be the same, and a component still hydrating (which
      // sees the empty initial state) would find the stored account's data under its own key: a
      // hydration mismatch between "loading" and "no positions".
      onRehydrateStorage: () => () => useSampleStore.setState((state) => ({ ready: true, version: state.version + 1 })),
    },
  ),
);
