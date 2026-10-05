import type { ReactNode } from "react";
import { cn } from "./cn.js";
import { Num } from "./Num.js";
import { SampleBadge } from "./SampleBadge.js";

export interface PnlCardProps {
  symbol: string;
  side: "long" | "short";
  leverage: number;
  /// `liquidated` is rendered as itself, never as a plain loss.
  status: "open" | "closed" | "liquidated";
  /// The headline: total PNL, signed and formatted by the caller (`+$246.30`).
  pnl: string;
  /// ROI on the margin posted, signed and formatted (`+24.63%`).
  roi: string;
  direction: "gain" | "loss" | "flat";
  entry: string;
  /// Where the position closed, or the live mark while it is open. `undefined` shows a dash.
  exit?: string;
  size: string;
  /// One line of context, usually when it opened or closed.
  period?: string;
  /// The card shows simulated figures: it carries a `SAMPLE DATA` mark that cannot be removed.
  sample?: boolean;
  /// The Hume mark, passed in because it is an image asset that belongs to the app.
  mark?: ReactNode;
  className?: string;
}

const statusLabel = { open: "Open", closed: "Closed", liquidated: "Liquidated" } as const;

/// The one light surface in the product (docs/UI_CONTRACT.md Section 4): charcoal and sage on ivory, so a
/// shared card is unmistakably Hume's in a light feed, not one more dark screenshot. Every colour on it is
/// a token. Contrast, measured: charcoal on ivory 17.42:1 for the figure and the labels. Sage never carries
/// text here (ivory on sage is 3.81:1, which fails), only the frame and the bar, which need 3:1. Gain and
/// loss are told apart by the sign, the word and the bar, never by a red that ivory cannot hold at text size.
export function PnlCard({ symbol, side, leverage, status, pnl, roi, direction, entry, exit, size, period, sample = false, mark, className }: PnlCardProps) {
  return (
    <figure
      aria-label={`${symbol} ${side} ${status} position, ${pnl}, ${roi}`}
      className={cn("relative m-0 w-full overflow-hidden rounded-feature border-2 border-accent bg-text p-6 text-ground sm:p-8", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {mark}
          <span className="text-sm font-medium tracking-[0.32em]">HUME</span>
        </div>
        {sample ? <SampleBadge onLight /> : null}
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-title font-medium">{symbol}-PERP</span>
        <span className="text-sm font-medium uppercase tracking-[0.08em]">
          {side} {leverage}x
        </span>
        <span className={cn("text-xs font-medium uppercase tracking-[0.1em]", status === "liquidated" ? "rounded-sharp bg-ground px-1.5 py-0.5 text-text" : "text-ground/70")}>{statusLabel[status]}</span>
      </div>

      <div className="mt-5 flex items-stretch gap-4">
        <span aria-hidden="true" className={cn("w-1.5 shrink-0 rounded-sharp", direction === "loss" ? "bg-down-press" : direction === "gain" ? "bg-accent" : "bg-ground/30")} />
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-ground/70">Total PNL</p>
          <Num tone="inherit" className="block text-[3rem] font-light leading-none tracking-[-0.03em] sm:text-[4rem]">{pnl}</Num>
          <Num tone="inherit" className="mt-2 block text-xl">{roi}</Num>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-ground/15 pt-4">
        <div>
          <dt className="text-xs text-ground/70">Entry</dt>
          <dd className="text-sm font-medium tabular-nums">{entry}</dd>
        </div>
        <div>
          <dt className="text-xs text-ground/70">{status === "open" ? "Mark" : "Exit"}</dt>
          <dd className="text-sm font-medium tabular-nums">{exit ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ground/70">Size</dt>
          <dd className="text-sm font-medium tabular-nums">{size}</dd>
        </div>
      </dl>
      {period || sample ? (
        <p className="mt-4 text-xs text-ground/70">
          {period}
          {sample ? `${period ? " · " : ""}Simulated. Not a real position.` : ""}
        </p>
      ) : null}
    </figure>
  );
}
