import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/// Which data source the whole app reads: the sample account, or a real wallet. Sample is the default,
/// so a first visit works with no wallet, no extension and no signature (docs/UI_CONTRACT.md, the
/// largest drop-off on the previous platform). Persisted per device, so a person who chose a wallet is
/// not sent back to the sample on every reload.
export type ModePreference = "sample" | "live";

interface ModeState {
  preference: ModePreference;
  /// The connect explainer has been read once; later connects go straight to the wallet.
  explainerSeen: boolean;
  /// False until the persisted choice has been read, so the server render and the first client
  /// render agree (both show the default) and a stored choice applies a moment later.
  ready: boolean;
  setPreference: (preference: ModePreference) => void;
  markExplainerSeen: () => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      preference: "sample",
      explainerSeen: false,
      ready: false,
      setPreference: (preference) => set({ preference }),
      markExplainerSeen: () => set({ explainerSeen: true }),
    }),
    {
      name: "hume-mode-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ preference: state.preference, explainerSeen: state.explainerSeen }),
      skipHydration: true,
      onRehydrateStorage: () => () => useModeStore.setState({ ready: true }),
    },
  ),
);
