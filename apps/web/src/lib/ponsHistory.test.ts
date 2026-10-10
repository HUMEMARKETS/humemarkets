import assert from "node:assert/strict";
import { test } from "node:test";
import { ponsHistoryRows, type PonsHistoryLog } from "./ponsHistory.js";

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
