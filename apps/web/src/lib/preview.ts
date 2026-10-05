/// Where a long position is liquidated, for the product preview: the entry price less the margin that
/// is not kept back for maintenance. With leverage L and maintenance margin rate m, the margin is 1/L of
/// the position, so the price can fall by 1/L - m before the position is at risk. A display estimate for a
/// preview, not the contract's own figure; the terminal's review step shows the real one.
export function longLiquidationPrice(entry: number, leverage: number, maintenanceMarginRate: number): number {
  return entry * (1 - 1 / leverage + maintenanceMarginRate);
}
