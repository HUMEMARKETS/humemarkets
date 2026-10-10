import assert from "node:assert/strict";
import { test } from "node:test";
import { ethPerToken, logoUrl, poolIdOf, ponsHistoryRows, type PonsHistoryLog } from "./pons.js";

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

test("logoUrl keeps https and drops ipfs://, http, data: and empty", () => {
  assert.equal(logoUrl("https://example.com/a.png"), "https://example.com/a.png");
  assert.equal(logoUrl("ipfs://bafkreiabc"), null);
  assert.equal(logoUrl("http://example.com/a.png"), null);
  assert.equal(logoUrl("data:image/svg+xml;base64,AAAA"), null);
  assert.equal(logoUrl(""), null);
  assert.equal(logoUrl(undefined), null);
});

test("ponsHistoryRows lists buys and sells newest first and drops other logs", () => {
  const token = "0x0000000000000000000000000000000000000001" as const;
  const logs: PonsHistoryLog[] = [
    { eventName: "PonsBought", args: { token, ethIn: 10n, tokensOut: 500n }, transactionHash: "0xa", blockNumber: 5n, logIndex: 0 },
    { eventName: "PonsSold", args: { token, tokensIn: 200n, ethOut: 4n }, transactionHash: "0xb", blockNumber: 7n, logIndex: 1 },
    { eventName: "PonsSold", args: { token, tokensIn: 100n, ethOut: 2n }, transactionHash: "0xc", blockNumber: 7n, logIndex: 3 },
    { eventName: "Other", args: { token }, transactionHash: "0xd", blockNumber: 9n, logIndex: 0 },
  ];
  const rows = ponsHistoryRows(logs, 10);
  assert.deepEqual(rows.map((r) => r.txHash), ["0xc", "0xb", "0xa"]);
  assert.deepEqual(rows[2], { side: "buy", token, eth: "10", tokens: "500", txHash: "0xa", blockNumber: "5" });
  assert.deepEqual(rows[1], { side: "sell", token, eth: "4", tokens: "200", txHash: "0xb", blockNumber: "7" });
  assert.equal(ponsHistoryRows(logs, 1).length, 1);
});
