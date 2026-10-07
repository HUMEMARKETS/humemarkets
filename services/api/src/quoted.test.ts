import assert from "node:assert/strict";
import { test } from "node:test";
import { quotedRows } from "./quoted.js";

test("quoted rows list the four display-only China names with no trade fields", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ quotes: [{ bid: "100", ask: "102", generatedAt: "2026-10-08T00:00:00Z" }] }))) as typeof fetch;
  try {
    const rows = await quotedRows(1);
    assert.deepEqual(rows.map((r) => r.symbol).sort(), ["EWT", "FUTU", "SIMO", "UMC"]);
    assert.ok(rows.every((r) => r.tier === "quoted" && r.price === 101 && r.group === "china"));
  } finally {
    globalThis.fetch = realFetch;
  }
});
