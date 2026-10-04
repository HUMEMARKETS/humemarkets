import { cn } from "@hume/ui";
import { MONO } from "@/lib/frame";
import { chain } from "@/lib/wagmi";

/// The one thing every visitor must read before a signature: these contracts carry no audit
/// (docs/DEVELOPMENT_PHASES.md Section 0.8). It sits at the top of `AppShell`, so it is on every
/// page rather than only the ones with a trade button, and it is not dismissable — a notice a
/// visitor can clear is a notice most visitors never see.
///
/// Its height is fixed at `h-7` and the wording shortens below `sm`, so the line never wraps. The
/// phone trade sheet is positioned against the chrome above it (`TradeSheet`), and a notice that
/// grew a second line on narrow screens would push that sheet out of place.
export function UnauditedNotice() {
  return (
    <p
      role="note"
      className={cn(
        MONO,
        "flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap border-b border-down-line bg-down-soft px-3 text-[10px] uppercase tracking-[0.08em] text-down sm:text-[11px]",
      )}
    >
      <span className="sm:hidden">Unaudited contracts. Trade at your own risk.</span>
      <span className="hidden sm:inline">Unaudited contracts on {chain.name}. Trade only what you can lose.</span>
    </p>
  );
}
