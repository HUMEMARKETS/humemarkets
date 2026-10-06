import { Panel, SampleBadge, chip, cn } from "@hume/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/AppPage";
import { PanelState } from "@/components/PanelState";
import { env } from "@/lib/env";
import { MONO } from "@/lib/frame";

export const metadata: Metadata = { title: "Trader · HUME" };

type Props = { params: Promise<{ wallet: string }> };

/// The trader profile, a labelled shell behind `NEXT_PUBLIC_FEATURE_COPY_TRADING` until Phase 14 fills it.
/// It shows the address from the URL and nothing else: no figure appears here before the indexer records one.
export default async function Page({ params }: Props) {
  const { wallet } = await params;
  if (!env.copyTrading || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) notFound();
  return (
    <AppPage title="Trader" description={<span className={cn(MONO, "break-all")}>{wallet}</span>} actions={<SampleBadge label="In development" />}>
      <Panel className="flex-1" title="Trader profile">
        <PanelState
          action={
            <span className="flex flex-wrap justify-center gap-2">
              <Link href={`/traders/${wallet}/copy`} className={cn(chip, "h-8 px-2.5 text-xs font-medium")}>
                Copy this trader
              </Link>
              <Link href="/leaderboard" className={cn(chip, "h-8 px-2.5 text-xs font-medium")}>
                Back to the leaderboard
              </Link>
            </span>
          }
        >
          The trader profile is in development. Positions, PNL history and max drawdown appear here once the indexer records them.
        </PanelState>
      </Panel>
    </AppPage>
  );
}
