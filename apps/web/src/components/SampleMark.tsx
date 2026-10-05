"use client";

import { SampleBadge } from "@hume/ui";
import { useAccountMode } from "@/hooks/useAccountMode";

/// `SAMPLE DATA`, shown only while the interface is reading the sample account. Put one on every
/// surface that holds a balance or a position and is not a `Panel` (a `Panel` takes `sample` itself).
export function SampleMark({ className }: { className?: string }) {
  return useAccountMode() === "sample" ? <SampleBadge className={className} /> : null;
}

/// Whether the interface is reading the sample account.
export function useIsSample(): boolean {
  return useAccountMode() === "sample";
}
