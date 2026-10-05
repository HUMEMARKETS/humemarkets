import type { PriceSet } from "@hume/sdk";
import { env } from "./env";
import { humeRead } from "./hume";
import { SampleNoPriceError } from "./sampleEngine";

/// Where a sample figure's price came from. `live` is the oracle. `last-close` is the API's last
/// daily close, used only while an equity session is shut: the oracle refuses to price a closed market
/// (`MarketSessionClosed`), and a sample that cannot trade on a weekend is the wall sample mode exists
/// to remove. The screen says so wherever it uses one.
export type PriceSource = "live" | "last-close";

export type SamplePriceSet = PriceSet & { source: PriceSource };

const CLOSE_TTL_MS = 5 * 60_000;
const closes = new Map<string, { at: number; value: { price: bigint; time: number } | undefined }>();

/// The last daily close from the price API, cached for five minutes: it only changes once a session.
async function lastClose(symbol: string): Promise<{ price: bigint; time: number } | undefined> {
  const cached = closes.get(symbol);
  if (cached && Date.now() - cached.at < CLOSE_TTL_MS) return cached.value;
  let value: { price: bigint; time: number } | undefined;
  if (env.apiUrl) {
    const candles = await humeRead.prices.candles(symbol, "1d", 1).catch(() => []);
    const last = candles[candles.length - 1];
    value = last && last.close > 0n ? { price: last.close, time: last.time } : undefined;
  }
  closes.set(symbol, { at: Date.now(), value });
  return value;
}

/// Index, mark and last for one market, from the oracle while it will price, otherwise the last close.
/// Throws `SampleNoPriceError` when there is neither, which a screen words as "no price yet".
export async function priceSetWithFallback(symbol: string): Promise<SamplePriceSet> {
  try {
    return { ...(await humeRead.prices.get(symbol)), source: "live" };
  } catch {
    const close = await lastClose(symbol);
    if (!close) throw new SampleNoPriceError(`No price for ${symbol}`);
    const reading = { price: close.price, timestamp: BigInt(close.time) };
    return { index: reading, mark: reading, last: reading, source: "last-close" };
  }
}
