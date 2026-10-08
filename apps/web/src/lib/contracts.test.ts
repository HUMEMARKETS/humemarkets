import assert from "node:assert/strict";
import { test } from "node:test";
// The web build chain is read when the module loads, so pin it to testnet (46630), whose record is complete.
process.env.NEXT_PUBLIC_CHAIN_ID = "46630";
const { ALL_CONTRACTS, CONTRACTS, LISTED_CONTRACTS } = await import("./contracts.js");

test("the full list is 51 contracts: every proxy with its implementation, the lending stack, the Pons router and the placeholder", () => {
  assert.equal(ALL_CONTRACTS.length, 51);
  assert.equal(ALL_CONTRACTS.filter((row) => row.implementation).length, 24);
  assert.equal(ALL_CONTRACTS.filter((row) => row.group === "Core").length, 41);
  assert.equal(ALL_CONTRACTS.filter((row) => row.group === "Lending").length, 9);
  assert.equal(ALL_CONTRACTS.filter((row) => row.group === "Pons").length, 1);
  assert.equal(new Set(ALL_CONTRACTS.map((row) => row.address.toLowerCase())).size, 51, "no address is listed twice");
});

test("the website lists proxies only: 26 on testnet, no implementation and no placeholder", () => {
  assert.equal(LISTED_CONTRACTS.length, 26);
  assert.ok(LISTED_CONTRACTS.every((row) => !row.implementation && !row.placeholder));
  assert.equal(LISTED_CONTRACTS.filter((row) => row.group === "Core").length, 20);
  assert.equal(LISTED_CONTRACTS.filter((row) => row.group === "Lending").length, 5);
});

test("the short list the landing page draws in 3D is untouched: one entry per block, 22 of them", () => {
  assert.equal(CONTRACTS.length, 22);
});
