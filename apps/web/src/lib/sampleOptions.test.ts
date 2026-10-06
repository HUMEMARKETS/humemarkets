import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleOptionQuote } from "./sampleOptions";

const now = Date.UTC(2026, 9, 6);
const year = BigInt(Math.floor(now / 1000) + 365 * 24 * 3600);
const base = { spot: 100, strike: 100, expiry: year, now, volatility: 0.2 };

test("at the money, one year, 20% vol, no rate: call is 7.9656 and put equals call", () => {
  const call = sampleOptionQuote({ ...base, type: "CALL" });
  const put = sampleOptionQuote({ ...base, type: "PUT" });
  assert.ok(Math.abs(call.premium - 7.9656) < 1e-3);
  assert.ok(Math.abs(put.premium - call.premium) < 1e-6);
  assert.equal(call.ask, call.premium);
  assert.equal(call.bid, call.premium);
});

test("put-call parity holds off the money (rate 0): call - put = spot - strike", () => {
  const call = sampleOptionQuote({ ...base, strike: 90, type: "CALL" });
  const put = sampleOptionQuote({ ...base, strike: 90, type: "PUT" });
  assert.ok(Math.abs(call.premium - put.premium - 10) < 1e-6);
  assert.ok(call.delta > 0 && put.delta < 0);
});

test("an expired series throws, so the chain shows a dash", () => {
  assert.throws(() => sampleOptionQuote({ ...base, expiry: BigInt(Math.floor(now / 1000) - 1), type: "CALL" }));
});
