import assert from "node:assert/strict";
import { test } from "node:test";
import { ethPerToken, poolIdOf } from "./pons.js";

test("poolIdOf matches the id of the live ZZZ pool on mainnet", () => {
  const hook = "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044" as const;
  assert.equal(
    poolIdOf({ hook }, "0x7dbf38976f6D3b9c529e7D9484A71898B409eE6a", 0, 200),
    "0x6538e2c223ed70228114983afecbe5e69fe627e2fafdf367bdd6bdeff2ad391f",
  );
});

test("ethPerToken inverts the pool price: 1,000,000 tokens per ETH is 1e-6 ETH a token", () => {
  assert.ok(Math.abs(ethPerToken(1000n << 96n, 18)! - 1e-6) < 1e-12);
  assert.equal(ethPerToken(0n, 18), null);
});
