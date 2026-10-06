"use client";

import { Num, Panel, Row, Stat, cn } from "@hume/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { usePerpMarket, usePerpMarkets } from "@/hooks/queries";
import { env } from "@/lib/env";
import { fmt, fmtBps, fmtPrice } from "@/lib/format";
import { humeRead } from "@/lib/hume";
import { fallToLiquidationBps, fmtHealth, healthBand, healthFactorBps, healthWords } from "@/lib/lending";
import { symbolOf } from "@/lib/market";
import { longLiquidationPrice } from "@/lib/preview";
import { PREVIEW_OPTION, PREVIEW_PERP, PREVIEW_VAULT } from "@/lib/previewFixture";
import { fmtLimit, fmtNet } from "@/lib/strategies";
import { ArrowIcon } from "./ArrowIcon";
import { LtvBar } from "./LendingView";
import { PayoffChart } from "./StrategyBuilder";
import { Term } from "./Term";

const linkClass = "group inline-flex items-center gap-2 text-sm text-accent-hover transition-colors duration-150 hover:text-text";

function OpenLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className={linkClass}>
      {children}
      <ArrowIcon className="size-3 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

/// A long position the way the terminal's review step shows it: side, size, leverage, entry, the price
/// that liquidates it and the fee. It reads the first listed market when there is one and says nothing
/// is sample then; with no market listed it shows the illustrative position, labelled. Nothing here can
/// be signed: the only control is a link to the terminal.
export function PerpPreview({ className }: { className?: string }) {
  const markets = usePerpMarkets();
  const first = markets.data?.[0];
  const symbol = first ? symbolOf(first.marketId) : "";
  const live = usePerpMarket(symbol);
  const fees = useQuery({ queryKey: ["preview-fees", symbol], queryFn: () => humeRead.fees.get(symbol), enabled: Boolean(symbol), staleTime: 30_000 });
  const risk = live.data?.risk;
  const mark = live.data?.markPrice;
  const isLive = Boolean(first && risk && mark !== undefined);

  const view = useMemo(() => {
    if (isLive && risk && mark !== undefined) {
      const tiers = risk.allowedLeverageTiers.map(Number);
      const leverage = tiers.find((tier) => tier >= 3) ?? tiers[0] ?? 1;
      const entry = Number(mark) / 1e18;
      return { symbol, leverage, entry, mmr: Number(risk.maintenanceMarginRateBps) / 10_000, feeBps: fees.data?.takerFee };
    }
    return { symbol: PREVIEW_PERP.symbol, leverage: PREVIEW_PERP.leverage, entry: PREVIEW_PERP.mark, mmr: PREVIEW_PERP.maintenanceMarginRate, feeBps: undefined };
  }, [isLive, risk, mark, symbol, fees.data]);

  const liquidation = longLiquidationPrice(view.entry, view.leverage, view.mmr);
  const label = `${view.symbol}-PERP`;
  return (
    <Panel className={className} title={label}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <Num className="font-display text-[2rem] font-semibold leading-tight">{isLive ? `$${fmtPrice(mark)}` : `$${view.entry.toFixed(2)}`}</Num>
          <span className="text-xs text-muted">{isLive ? "Mark price" : "Illustrative price"}</span>
        </div>
        <dl>
          <Row label="Side">Long</Row>
          <Row label="Leverage">{`${view.leverage}x`}</Row>
          <Row label="Entry">{`$${view.entry.toFixed(2)}`}</Row>
          <Row label={<Term term="liquidationPrice">Liquidation price</Term>}>{`$${liquidation.toFixed(2)}`}</Row>
          <Row label="Taker fee">{view.feeBps === undefined ? "Shown before you sign" : fmtBps(view.feeBps)}</Row>
        </dl>
        <p className="text-xs leading-snug text-muted">This is the review step. Nothing is signed until you confirm it in your wallet.</p>
        <div className="mt-auto">
          <OpenLink href="/perpetuals">Open the terminal</OpenLink>
        </div>
      </div>
    </Panel>
  );
}

/// The payoff of a long straddle at expiry, drawn by the same chart the strategy builder uses. Option
/// quotes need the pricing service, so this one is always the illustrative strategy, and says so.
export function OptionsPreview({ className }: { className?: string }) {
  const { analysis, spot, low, high, label } = PREVIEW_OPTION;
  return (
    <Panel className={className} title={`${PREVIEW_PERP.symbol} ${label}, payoff at expiry`}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Net premium">{fmtNet(analysis.netPremium)}</Stat>
          <Stat label="Max loss">{fmtLimit(analysis.maxLoss)}</Stat>
          <Stat label="Break-even">{analysis.breakEvens.map((price) => price.toFixed(2)).join(" · ")}</Stat>
        </dl>
        <PayoffChart legs={analysis.legs} low={low} high={high} spot={spot} breakEvens={analysis.breakEvens} />
        <p className="text-xs leading-snug text-muted">The worst case is drawn before you buy. Options are cash-settled at expiry from the oracle price.</p>
        <div className="mt-auto">
          <OpenLink href="/strategies">Build a strategy</OpenLink>
        </div>
      </div>
    </Panel>
  );
}

/// The health of a vault position as the lending page shows it: the number, what it means, and the
/// distance to the liquidation line. The limits come from the environment's example pair (the same
/// numbers the lending page's calculator uses), and the position is illustrative.
export function VaultPreview({ className }: { className?: string }) {
  const { maxLtvBps, liquidationLtvBps } = env.creditExample;
  const collateral = PREVIEW_VAULT.collateralUsd;
  const debt = (collateral * PREVIEW_VAULT.borrowedShare) / 100n;
  const hf = healthFactorBps(collateral, debt, BigInt(liquidationLtvBps));
  const band = healthBand(hf);
  const fall = fallToLiquidationBps(hf);
  const ltv = (debt * 10_000n) / collateral;
  const tone = band === "safe" ? "up" : band === "watch" ? "neutral" : "down";
  return (
    <Panel className={className} title={`${env.creditSymbol} collateral, borrowing USDG`}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Num tone={tone} className={cn("font-display text-[2rem] font-semibold leading-tight")}>{fmtHealth(hf)}</Num>
          <span className="text-sm font-medium"><Term term="healthFactor">{healthWords[band].label}</Term></span>
        </div>
        <p className="text-sm leading-snug text-muted">{healthWords[band].meaning}</p>
        <dl>
          <Row label="Collateral value">{`$${fmt(collateral, 18, 0)}`}</Row>
          <Row label="Borrowed">{`$${fmt(debt, 18, 0)}`}</Row>
          {fall !== undefined ? <Row label="Room before liquidation">{`${(Number(fall) / 100).toFixed(0)}% fall in the collateral`}</Row> : null}
        </dl>
        <LtvBar ltv={ltv} maxLtv={BigInt(maxLtvBps)} liquidationLtv={BigInt(liquidationLtvBps)} />
        <div className="mt-auto">
          <OpenLink href="/lending">Open lending</OpenLink>
        </div>
      </div>
    </Panel>
  );
}
