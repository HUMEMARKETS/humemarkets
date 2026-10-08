import { marketsForTier, ROBINHOOD_MAINNET_CHAIN_ID } from "@hume/config";
import { fetchReferenceQuotes } from "@hume/sdk";

/// Reference prices for the Markets page's display-only rows (the China names with no feed). Served from the web
/// app itself, so they read the same on Testnet and on Mainnet and do not depend on either network's API. The
/// symbols come from the market list, never from the request.
export async function GET() {
  const symbols = marketsForTier(ROBINHOOD_MAINNET_CHAIN_ID, "quoted").map((market) => market.symbol);
  const quotes = await fetchReferenceQuotes(symbols);
  return Response.json(Object.fromEntries(quotes), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
