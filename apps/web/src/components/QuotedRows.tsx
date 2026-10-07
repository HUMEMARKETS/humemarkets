"use client";

import { cn } from "@hume/ui";
import { useQuotedMarkets } from "@/hooks/queries";
import { MONO } from "@/lib/frame";

/// Tier 2 rows: a price with its source and age, a "Quoted" badge, and no trade control at all (not a disabled
/// one). They share the page with tradeable markets so a group such as China reads as a full list, honestly.
function age(asOf: string | null): string {
  if (!asOf) return "no price";
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(asOf)) / 60_000));
  return minutes < 60 ? `${minutes} min old` : `${Math.round(minutes / 60)} h old`;
}

export function QuotedRows({ group }: { group: string }) {
  const { data } = useQuotedMarkets();
  const rows = (data ?? []).filter((row) => group === "all" || row.group === group);
  if (rows.length === 0) return null;
  return (
    <div className="border-t border-line">
      <h3 className={cn(MONO, "px-3 pt-3 text-[11px] uppercase tracking-[0.08em] text-faint")}>Quoted · price only, no trading</h3>
      <table className="w-full text-cell">
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className="border-t border-line first:border-t-0">
              <th scope="row" className="px-3 py-2.5 text-left font-medium">
                {row.symbol}
                <span className="ml-2 text-xs font-normal text-muted max-sm:hidden">{row.name.replace(" • Robinhood Token", "")}</span>
              </th>
              <td className="px-3 py-2.5 text-right tabular-nums">{row.price === null ? "–" : `$${row.price.toFixed(2)}`}</td>
              <td className="px-3 py-2.5 text-right text-xs text-muted max-md:hidden">
                {row.source}, {age(row.asOf)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className={cn(MONO, "rounded-pill border border-line px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-faint")}>Quoted</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
