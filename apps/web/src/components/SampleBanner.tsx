"use client";

import { cn } from "@hume/ui";
import { useAccountMode } from "@/hooks/useAccountMode";

/// The one `SAMPLE DATA` label of an app page, shown only while the interface reads the sample account.
/// It is a note, not a control, and nothing dismisses it: an unlabelled simulation is a liability, and a
/// person must never believe a sample position is theirs. Accent text on `accent-soft` is 9.29:1 with
/// `accent-hover` (UI_CONTRACT.md Section 4.1). `PageHeader` renders it, and so do the pages that have no
/// `PageHeader` (the two terminals and the docs). The landing page has none.
export function SampleBanner({ className }: { className?: string }) {
  if (useAccountMode() !== "sample") return null;
  return (
    <div
      role="note"
      data-sample-banner
      className={cn("flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-accent-line bg-accent-soft px-3 py-2 text-sm text-accent-hover", className)}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.1em]">Sample data</span>
      <span>Simulated USDG and positions on this device. Prices are real. Nothing here is on chain.</span>
    </div>
  );
}
