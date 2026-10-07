import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateBuy, estimateSell, minimumOut } from "./pons.js";

// The testnet PFROG pool: 1,000,000 tokens per ETH, liquidity 1.98e17.
const pool = { sqrtPriceX96: (1000n << 96n).toString(), liquidity: "198000000000000000" };

test("a tiny buy fills at the spot price with no impact", () => {
  const e = estimateBuy(pool, 10n ** 9n)!;
  assert.ok(Math.abs(Number(e.out) / 1e9 - 1_000_000) < 10);
  assert.ok(e.impactPct < 0.001);
});

test("a buy of 10% of the ETH side moves the price about 10% and the estimate matches the live fill", () => {
  // Measured on testnet: 0.00002 ETH bought 18.165 PFROG in a pool seeded with 0.0002 ETH.
  const e = estimateBuy(pool, 20_000_000_000_000n)!;
  assert.ok(Math.abs(Number(e.out) / 1e18 - 18.165) < 0.7, `got ${Number(e.out) / 1e18}`);
  assert.ok(e.impactPct > 5 && e.impactPct < 15);
});

test("selling back returns a little less ETH than was spent", () => {
  const bought = estimateBuy(pool, 20_000_000_000_000n)!;
  const back = estimateSell(pool, bought.out)!;
  assert.ok(back.out < 20_000_000_000_000n);
});

test("no liquidity or no amount gives no estimate, and the minimum is the estimate less the tolerance", () => {
  assert.equal(estimateBuy({ ...pool, liquidity: "0" }, 1n), undefined);
  assert.equal(estimateSell(pool, 0n), undefined);
  assert.equal(minimumOut(10_000n, 300n), 9_700n);
});
