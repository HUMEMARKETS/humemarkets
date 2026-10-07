import { marketsForTier, ROBINHOOD_MAINNET_CHAIN_ID } from "@hume/config";

/// Tier 2 of the listing model (`REFERENCE.md` Section 2): a display price for a token that has no Chainlink
/// feed. It comes from Robinhood's public quote endpoint, never reaches `PriceValidator`, and carries its source
/// and age so the page can say both. The same rows show on every network, because the price is the real stock's.

const QUOTE_URL = process.env.QUOTE_API_URL ?? "https://api.robinhood.com/rhj/prices";
const REQUEST_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 30_000;

export interface QuotedRow {
  symbol: string;
  name: string;
  group: string;
  tier: "quoted";
  token: string;
  /// Mid of bid and ask in USD, or null when the source did not answer.
  price: number | null;
  source: "Robinhood reference price";
  /// ISO time the source generated the quote, or null.
  asOf: string | null;
}

let cache: { at: number; rows: QuotedRow[] } | undefined;

async function quote(symbol: string): Promise<{ price: number; asOf: string } | null> {
  try {
    const response = await fetch(`${QUOTE_URL}/${encodeURIComponent(symbol)}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return null;
    const body = (await response.json()) as { quotes?: Array<{ bid?: string; ask?: string; generatedAt?: string }> };
    const q = body.quotes?.[0];
    const bid = Number(q?.bid);
    const ask = Number(q?.ask);
    if (!q?.generatedAt || !(bid > 0) || !(ask > 0)) return null;
    return { price: (bid + ask) / 2, asOf: q.generatedAt };
  } catch {
    return null;
  }
}

export async function quotedRows(now = Date.now()): Promise<QuotedRow[]> {
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.rows;
  const listings = marketsForTier(ROBINHOOD_MAINNET_CHAIN_ID, "quoted");
  const rows = await Promise.all(
    listings.map(async (listing): Promise<QuotedRow> => {
      const q = await quote(listing.symbol);
      return {
        symbol: listing.symbol,
        name: listing.name,
        group: listing.group,
        tier: "quoted",
        token: listing.token,
        price: q?.price ?? null,
        source: "Robinhood reference price",
        asOf: q?.asOf ?? null,
      };
    }),
  );
  cache = { at: now, rows };
  return rows;
}
