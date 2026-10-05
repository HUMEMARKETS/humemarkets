"use client";

import { chains } from "@hume/config";
import { cn } from "@hume/ui";
import Link from "next/link";
import { usePerpMarkets } from "@/hooks/queries";
import { CONTRACTS } from "@/lib/contracts";
import { env } from "@/lib/env";
import { MONO } from "@/lib/frame";

const label = "text-[11px] font-medium uppercase tracking-[0.2em] text-faint";
const value = cn(MONO, "text-base text-text");

/// What a visitor can check before anything else: how many markets are listed, how many contracts
/// are deployed and listed in full, which network, and that the contracts are unaudited. Every figure
/// is read from the registry, the deployment record or the environment, never typed in. While the
/// registry loads a figure reads "…", and when it cannot be read it reads "–" and says why.
export function TrustStrip({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  const markets = usePerpMarkets();
  const deployed = CONTRACTS.filter((contract) => Boolean(contract.address)).length;
  const marketsText = markets.isPending ? "…" : markets.isError ? "–" : String(markets.data?.length ?? 0);
  return (
    <dl className={cn(stacked ? "grid grid-cols-1 gap-y-4" : "grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-[repeat(4,auto)] sm:justify-between", className)}>
      <div>
        <dt className={label}>Markets listed</dt>
        <dd className={value} title={markets.isError ? "The registry could not be read right now." : undefined}>{marketsText}</dd>
      </div>
      <div>
        <dt className={label}>Contracts</dt>
        <dd className={value}>
          <Link href="/#contracts" className="underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-accent-hover">
            {`${deployed} of ${CONTRACTS.length} listed`}
          </Link>
        </dd>
      </div>
      <div>
        <dt className={label}>Network</dt>
        <dd className={value}>{chains[env.chainId].name}</dd>
      </div>
      <div>
        <dt className={label}>Source code</dt>
        <dd className={value}>
          <Link href="/docs#verify" className="underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-accent-hover">
            Verified
          </Link>
        </dd>
      </div>
    </dl>
  );
}
