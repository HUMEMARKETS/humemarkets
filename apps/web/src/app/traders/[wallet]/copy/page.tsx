import { Panel, SampleBadge, chip, cn } from "@hume/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/AppPage";
import { PanelState } from "@/components/PanelState";
import { env } from "@/lib/env";
import { MONO } from "@/lib/frame";

export const metadata: Metadata = { title: "Copy a trader · HUME" };

type Props = { params: Promise<{ wallet: string }> };

/// The copy flow, a labelled shell behind `NEXT_PUBLIC_FEATURE_COPY_TRADING` until Phase 14. It names the
/// steps the real flow will take and offers none of them: there is nothing to sign here.
export default async function Page({ params }: Props) {
  const { wallet } = await params;
  if (!env.copyTrading || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) notFound();
  return (
    <AppPage title="Copy a trader" description={<span className={cn(MONO, "break-all")}>{wallet}</span>} actions={<SampleBadge label="In development" />}>
      <Panel className="flex-1" title="Copy flow">
        <PanelState
          action={
            <Link href={`/traders/${wallet}`} className={cn(chip, "h-8 px-2.5 text-xs font-medium")}>
              Back to the trader
            </Link>
          }
        >
          Copy trading is in development. When it opens you will set a budget and limits, review the cost and the most you can lose, then sign. Nothing can be signed here yet.
        </PanelState>
      </Panel>
    </AppPage>
  );
}
