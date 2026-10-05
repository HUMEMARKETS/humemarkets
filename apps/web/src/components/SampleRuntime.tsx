"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAccountMode } from "@/hooks/useAccountMode";
import { openPositions } from "@/lib/sampleEngine";
import { runSampleTick, startSampleAccount } from "@/lib/sampleClient";
import { useFillStore } from "@/stores/fills";
import { useModeStore } from "@/stores/mode";
import { useSampleStore } from "@/stores/sample";

/// How often the sample checks the real price against its positions and orders. A real liquidation
/// engine runs on every block; a person watching a sample position does not need that, and the API
/// prices come from a cache.
const TICK_MS = 8_000;

/// Prefix of the page title in sample mode. Persistent: it is re-applied whenever a route change
/// rewrites the title.
export const SAMPLE_TITLE_PREFIX = "Sample · ";

/// Everything sample mode needs that is not a screen. Mounted once in `AppShell`, renders nothing.
///
/// - reads the stored mode and the stored sample account (on the client only, so the server render and
///   the first client render agree);
/// - opens the sample account once the token's decimals are known;
/// - watches the real price against the sample account's positions and orders, so a liquidation or a
///   limit fill happens without anyone clicking;
/// - keeps `Sample ·` at the front of the page title.
export function SampleRuntime() {
  const mode = useAccountMode();
  const sample = mode === "sample";
  // A real wallet's PNL card is not sample data, whoever is looking at it: its title stays its own. A
  // sample card (`/pnl/sample/...`) keeps the prefix.
  const pathname = usePathname();
  const realCard = pathname.startsWith("/pnl/") && !pathname.startsWith("/pnl/sample");
  const ready = useSampleStore((state) => state.ready);
  const account = useSampleStore((state) => state.account);
  const push = useFillStore((state) => state.push);

  useEffect(() => {
    void useModeStore.persist.rehydrate();
    void useSampleStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (ready && !account) void startSampleAccount().catch(() => undefined);
  }, [ready, account]);

  const watching = sample && Boolean(account) && (openPositions(account!).length > 0 || account!.orders.some((order) => order.status === "OPEN"));
  useEffect(() => {
    if (!watching) return;
    let cancelled = false;
    const run = async () => {
      const fills = await runSampleTick().catch(() => []);
      if (!cancelled) push(fills, false);
    };
    void run();
    const timer = setInterval(run, TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [watching, push]);

  const titled = sample && !realCard;
  useEffect(() => {
    if (!titled) return;
    const apply = () => {
      if (!document.title.startsWith(SAMPLE_TITLE_PREFIX)) document.title = `${SAMPLE_TITLE_PREFIX}${document.title}`;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      if (document.title.startsWith(SAMPLE_TITLE_PREFIX)) document.title = document.title.slice(SAMPLE_TITLE_PREFIX.length);
    };
  }, [titled]);

  return null;
}
