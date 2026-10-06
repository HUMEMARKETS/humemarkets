import type { OptionsQuoteResult, OptionSide } from "@hume/sdk";

const SECONDS_PER_YEAR = 365 * 24 * 3600;

/// Abramowitz & Stegun 7.1.26, the same approximation `services/pricing` uses, so a sample quote and a
/// live one agree to display precision.
function normCdf(x: number): number {
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-ax * ax);
  return 0.5 * (1 + (x < 0 ? -y : y));
}

const normPdf = (x: number) => Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);

/// A display quote for sample mode, from the index price and a flat volatility, in the shape of the
/// pricing service's answer. Sample mode has no pricing service or signing key to ask, and a shut
/// equity session makes the live oracle revert, so the chain and the strategy builder would otherwise
/// sit empty. Rate is 0 and there is no spread, as in the service's defaults. Throws when the series
/// is already past expiry, which the chain shows as "–".
// ponytail: duplicates services/pricing/src/blackScholes.ts because the web app cannot import a service; share it through a package if the model changes.
export function sampleOptionQuote(params: { spot: number; strike: number; type: OptionSide; expiry: bigint; now: number; volatility: number }): OptionsQuoteResult {
  const { spot: S, strike: K, type, volatility: sigma } = params;
  const T = (Number(params.expiry) - params.now / 1000) / SECONDS_PER_YEAR;
  if (!(T > 0 && sigma > 0 && S > 0 && K > 0)) throw new Error("This series has expired.");
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (sigma * sigma * T) / 2) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const call = type === "CALL";
  const premium = call ? S * normCdf(d1) - K * normCdf(d2) : K * normCdf(-d2) - S * normCdf(-d1);
  const decay = -(S * normPdf(d1) * sigma) / (2 * sqrtT);
  return {
    premium,
    bid: premium,
    ask: premium,
    ivSource: "default",
    iv: sigma,
    delta: call ? normCdf(d1) : normCdf(d1) - 1,
    gamma: normPdf(d1) / (S * sigma * sqrtT),
    theta: decay,
    vega: S * normPdf(d1) * sqrtT,
    breakEven: call ? K + premium : K - premium,
    spot: S,
  };
}
