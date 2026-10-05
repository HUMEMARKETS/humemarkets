"use client";

import { usePerpMarkets } from "@/hooks/queries";
import { symbolOf } from "@/lib/market";
import { SYMBOL_LOGO } from "./BrandLogos";
import { PanelState } from "./PanelState";

/// Every market the registry lists, as a tile: the company mark where there is one, the ticker always.
/// A paused market is listed like any other, because it still prices and only refuses the trade.
export function SupportedMarkets() {
  const markets = usePerpMarkets();
  if (markets.isPending) return <PanelState>Reading the registry…</PanelState>;
  if (markets.isError) return <PanelState>The registry could not be read right now. Try again in a moment.</PanelState>;
  if (markets.data.length === 0) return <PanelState>No market is listed yet. They appear here as the registry lists them.</PanelState>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {markets.data.map((market) => {
        const symbol = symbolOf(market.marketId);
        const brand = SYMBOL_LOGO[symbol];
        return (
          <li key={market.marketId} className="flex items-center gap-3 rounded-panel border border-line/70 bg-surface p-3">
            {brand ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-control" style={{ background: brand.background, color: brand.ink }}>
                <brand.Logo className="size-5" />
              </span>
            ) : (
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-control bg-raised text-xs text-muted">
                {symbol.slice(0, 2)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-medium">{symbol}</span>
              <span className="block text-xs text-muted">{market.active ? "Open" : "Paused"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
