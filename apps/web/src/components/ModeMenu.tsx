"use client";

import { SampleBadge, cn, menuItem } from "@hume/ui";
import { useCallback, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useDismiss } from "@/hooks/useDismiss";
import { topUpSample } from "@/lib/sampleClient";
import { env } from "@/lib/env";
import { chain } from "@/lib/wagmi";
import { useConnectDialog } from "@/stores/connectDialog";
import { useModeStore } from "@/stores/mode";
import { useSampleStore } from "@/stores/sample";

const item = cn(menuItem, "flex min-h-11 w-full flex-col justify-center px-3 py-1.5 text-left");

/// The environment switcher. The `SAMPLE DATA` label is not here: each app page carries it as a banner
/// (`SampleBanner`). This control names the environment and switches between the sample account and the
/// real network, and resets the sample.
///
/// Mainnet and testnet are separate deployments of this app, each with its own sample account, so the
/// switch here is between Sample and this deployment's own network.
export function ModeMenu({ menuAbove = false }: { menuAbove?: boolean }) {
  const mode = useAccountMode();
  const sample = mode === "sample";
  const { isConnected } = useAccount();
  const setPreference = useModeStore((state) => state.setPreference);
  const explainerSeen = useModeStore((state) => state.explainerSeen);
  const showExplainer = useConnectDialog((state) => state.show);
  const reset = useSampleStore((state) => state.reset);
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setConfirmReset(false);
  }, []);
  useDismiss(ref, open, close);

  function goLive() {
    close();
    // A wallet that is already connected needs no second explainer; a first connect does.
    if (isConnected || explainerSeen) setPreference("live");
    else showExplainer();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${sample ? "Sample account" : chain.name}. Open the environment menu.`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-control border border-line bg-raised px-2.5 text-[10px] sm:px-3 sm:text-[11px] font-medium uppercase tracking-[0.1em] text-text transition-colors duration-150 hover:border-accent hover:bg-accent-soft hover:text-accent-hover max-xl:h-10"
      >
        {sample ? (
          "Sample"
        ) : (
          <>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-up" />
            {chain.name}
          </>
        )}
        <svg aria-hidden="true" viewBox="0 0 10 6" className="h-1.5 w-2.5 fill-none stroke-current" strokeWidth="1.5">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open ? (
        <div role="menu" className={cn("absolute right-0 z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-panel border border-line bg-raised py-1", menuAbove ? "bottom-full mb-1" : "top-full mt-1")}>
          <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Environment</p>
          <button type="button" role="menuitemradio" aria-checked={sample} className={item} onClick={() => { setPreference("sample"); close(); }}>
            <span className="flex items-center gap-2 text-sm font-medium">
              Sample
              {sample ? <SampleBadge label="Active" /> : null}
            </span>
            <span className="text-xs text-muted">Simulated USDG, real prices. No wallet, no signatures.</span>
          </button>
          <button type="button" role="menuitemradio" aria-checked={!sample} className={item} onClick={goLive}>
            <span className="text-sm font-medium">{chain.name}</span>
            <span className="text-xs text-muted">{isConnected ? "Use your connected wallet. Real funds." : "Connect a wallet. Real funds."}</span>
          </button>
          {sample ? (
            <div className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                role="menuitem"
                className={cn(item, "min-h-9 justify-center text-sm")}
                onClick={() => {
                  void topUpSample();
                  close();
                }}
              >
                Add {env.sample.topUpUsd.toLocaleString("en-US")} sample USDG
              </button>
              {confirmReset ? (
                <button
                  type="button"
                  role="menuitem"
                  className={cn(item, "min-h-9 justify-center text-sm text-down")}
                  onClick={() => {
                    reset();
                    close();
                  }}
                >
                  Confirm: erase sample positions and balance
                </button>
              ) : (
                <button type="button" role="menuitem" className={cn(item, "min-h-9 justify-center text-sm")} onClick={() => setConfirmReset(true)}>
                  Reset sample account
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
