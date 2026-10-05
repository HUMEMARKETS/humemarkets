import assert from "node:assert/strict";
import { test } from "node:test";
import { longLiquidationPrice } from "./preview.js";

test("a 5x long with a 5% maintenance rate is liquidated 15% under entry", () => {
  assert.ok(Math.abs(longLiquidationPrice(250, 5, 0.05) - 212.5) < 1e-9);
});

test("1x with no maintenance margin can only be liquidated at zero", () => {
  assert.equal(longLiquidationPrice(100, 1, 0), 0);
});

test("more leverage moves the liquidation price closer to entry", () => {
  assert.ok(longLiquidationPrice(100, 10, 0.05) > longLiquidationPrice(100, 3, 0.05));
});
