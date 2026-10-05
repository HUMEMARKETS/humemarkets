"use client";

import { PnlCard, Skeleton } from "@hume/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { Logo } from "@/components/Logo";
import { useSettlementDecimals } from "@/hooks/queries";
import { symbolOf } from "@/lib/market";
import { cardPartsFromSample, cardProps } from "@/lib/pnlCard";
import { priceSetWithFallback } from "@/lib/samplePrices";
import { useSampleStore } from "@/stores/sample";

/// A sample position's card. It is built from the sample account, which lives on this device, so there is
/// nothing to share: no link would open anywhere else. The page says that instead of offering a dead share
/// button. Same card, same formatter and the same `SAMPLE DATA` mark as a real one.
export default function SampleCardPage({ params }: { params: Promise<{ positionId: string }> }) {
  const { positionId } = use(params);
  const ready = useSampleStore((state) => state.ready);
  const account = useSampleStore((state) => state.account);
  const { data: decimals = 6 } = useSettlementDecimals();
  const position = account?.positions.find((candidate) => candidate.positionId.toString() === positionId);
  const symbol = position ? symbolOf(position.marketId) : "";
  const mark = useQuery({
    queryKey: ["sample-card-mark", symbol],
    queryFn: async () => (await priceSetWithFallback(symbol)).mark.price,
    enabled: Boolean(position?.open),
    refetchInterval: 15_000,
  });

  return (
    <div className="mx-auto w-full max-w-2xl p-6 lg:p-10">
      {!ready ? (
        <div aria-busy="true" aria-label="Loading the PNL card" className="rounded-feature border-2 border-line bg-surface p-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-6 block h-16 w-72" />
        </div>
      ) : !position ? (
        <div className="rounded-panel border border-line/70 bg-surface p-6">
          <h1 className="text-title font-normal">This sample card is not here</h1>
          <p className="mt-2 max-w-prose text-muted">Sample positions live on the device that opened them, and are erased when the sample account is reset. Open one from the Perpetuals page and its card appears here.</p>
          <Link href="/perpetuals" className="mt-4 inline-block text-sm font-medium text-accent-hover underline underline-offset-2">
            Open the terminal
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <PnlCard {...cardProps(cardPartsFromSample(position, symbol, mark.data, decimals))} mark={<Logo />} />
          <p className="max-w-prose text-sm leading-snug text-muted">
            This is a sample card. It shows a simulated position that exists only on this device, so there is no link to share. A position opened with a
            wallet gets a card anyone can open.
          </p>
        </div>
      )}
    </div>
  );
}
