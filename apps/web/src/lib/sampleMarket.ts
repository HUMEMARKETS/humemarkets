import { DEFAULT_SLIPPAGE_BPS, margin, toBaseUnits, type PerpOpenPreview } from "@hume/sdk";
import type { Hex } from "@hume/types";
import { env } from "./env";
import { humeRead } from "./hume";
import { symbolOf } from "./market";
import { priceSetWithFallback, type PriceSource } from "./samplePrices";
import { availableBalance, openViolations, type SampleAccount, type SampleMarket } from "./sampleEngine";

export type SampleMarketQuote = SampleMarket & { symbol: string; source: PriceSource; indexPrice: bigint };

/// Everything the engine needs to fill an order against one market right now: the real index price, the
/// real taker fee, the real maintenance-margin rate, the real leverage tiers and whether the registry
/// has the market active. Read at the moment of the action, never cached in the account.
export async function loadSampleMarket(symbolOrId: string | Hex): Promise<SampleMarketQuote> {
  const symbol = symbolOrId.startsWith("0x") ? symbolOf(symbolOrId as Hex) : symbolOrId;
  const [config, risk, fees, prices] = await Promise.all([
    humeRead.markets.get(symbol),
    humeRead.risk.get(symbol),
    humeRead.fees.get(symbol),
    priceSetWithFallback(symbol),
  ]);
  return {
    symbol,
    marketId: config.marketId,
    price: prices.index.price,
    indexPrice: prices.index.price,
    source: prices.source,
    takerFeeBps: fees.takerFee,
    maintenanceMarginRateBps: risk.maintenanceMarginRateBps,
    allowedLeverageTiers: risk.allowedLeverageTiers,
    active: config.active,
  };
}

/// `perps.previewOpen`, for the sample account: the same figures, from the same real inputs (price, fee,
/// maintenance rate, funding rate), checked against the sample account's balance and limits instead of the
/// chain's vault and caps. The launch caps on chain are sized to a treasury of cents, so applying them to
/// a $10,000 sample would refuse every order; the sample has limits of its own (`env.sample`).
export async function samplePreviewOpen(
  params: { market: string; side: "LONG" | "SHORT"; collateral: string; leverage: number; limitPrice?: bigint },
  account: SampleAccount | undefined,
): Promise<PerpOpenPreview> {
  const places = await humeRead.erc20.decimals(env.addresses.settlementToken);
  const [quote, funding] = await Promise.all([loadSampleMarket(params.market), humeRead.funding.get(params.market)]);
  const isLong = params.side === "LONG";
  const collateral = toBaseUnits(params.collateral, places);
  const leverage = BigInt(params.leverage);
  const notional = collateral * leverage;
  const fee = margin.feeFromBps(notional, quote.takerFeeBps);
  const entryPrice = params.limitPrice ?? quote.price;
  const available = account ? availableBalance(account) : undefined;
  return {
    marketId: quote.marketId,
    side: params.side,
    indexPrice: quote.indexPrice,
    entryPrice,
    worstPrice: margin.applyBps(entryPrice, isLong ? BigInt(DEFAULT_SLIPPAGE_BPS) : -BigInt(DEFAULT_SLIPPAGE_BPS)),
    collateral,
    leverage,
    notional,
    fee,
    feeBps: quote.takerFeeBps,
    totalRequired: collateral + fee,
    maintenanceMarginRateBps: quote.maintenanceMarginRateBps,
    liquidationPrice: margin.liquidationPrice(isLong, entryPrice, collateral, notional, quote.maintenanceMarginRateBps),
    fundingRateBps: funding.currentFundingRateBps,
    nextFundingTimestamp: funding.nextFundingTimestamp,
    availableBalance: available,
    sufficientCollateral: available === undefined ? undefined : available >= collateral + fee,
    violations: openViolations({ market: quote, collateral, leverage, maxPositionNotional: BigInt(env.sample.maxPositionUsd) * 10n ** BigInt(places) }),
  };
}
