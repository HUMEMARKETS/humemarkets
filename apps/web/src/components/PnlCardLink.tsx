"use client";

import { chip, cn } from "@hume/ui";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useAccountMode } from "@/hooks/useAccountMode";

/// Where a position's PNL card lives. A real position has a public URL under its wallet, which is what makes
/// it shareable. A sample position has no wallet and exists on this device only, so its card is a local page
/// that says so. Nothing renders while there is no wallet to put in a URL.
export function PnlCardLink({ positionId, className, label = "PNL card" }: { positionId: bigint | string; className?: string; label?: string }) {
  const mode = useAccountMode();
  const { address } = useAccount();
  const href = mode === "sample" ? `/pnl/sample/${positionId}` : mode === "connected" && address ? `/pnl/${address.toLowerCase()}/${positionId}` : undefined;
  if (!href) return null;
  return (
    <Link href={href} className={cn(chip, "h-7 px-2.5 text-xs font-medium", className)}>
      {label}
    </Link>
  );
}
