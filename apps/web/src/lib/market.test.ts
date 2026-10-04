import assert from "node:assert/strict";
import { test } from "node:test";
import { perpLabel, symbolOf, tradeBlocker } from "./market.js";
import type { Hex } from "@hume/types";

/// "NVDA" in ASCII, right-padded with zero bytes to 32 bytes, as the registry stores it.
const NVDA = "0x4e56444100000000000000000000000000000000000000000000000000000000" as Hex;

test("symbolOf strips the zero padding the registry adds", () => {
  assert.equal(symbolOf(NVDA), "NVDA");
  assert.equal(perpLabel(NVDA), "NVDA-PERP");
});

test("tradeBlocker refuses a paused market and nothing else", () => {
  assert.equal(tradeBlocker(true), undefined);
  assert.equal(tradeBlocker(undefined), undefined);
  assert.match(tradeBlocker(false) ?? "", /paused/i);
});
