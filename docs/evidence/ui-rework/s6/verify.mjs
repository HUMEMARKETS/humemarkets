// Is each contract the landing page links to a contract with verified source? Two public HTTPS sources:
//   - the chain's RPC (eth_getCode): proves the address holds bytecode.
//   - Sourcify API v2 (chain 4663): reports the verification status, if the contract was verified there.
// The Blockscout API would answer for Blockscout verification, but it sits behind a bot challenge, so it is not used.
// Usage: node verify.mjs  (reads the addresses from results-links.txt)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const UA = "hume-qa/1 (contract verification check; https://github.com/HUMEMARKETS)";
const addresses = [...new Set([...readFileSync(join(here, "results-links.txt"), "utf8").matchAll(/\/address\/(0x[0-9a-fA-F]{40})/g)].map((m) => m[1]))];
const lines = [];
const log = (line) => (lines.push(line), console.log(line));

async function code(address) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [address, "latest"] }), signal: AbortSignal.timeout(20000) });
  return (await r.json()).result ?? "";
}
async function sourcify(address) {
  const r = await fetch(`https://sourcify.dev/server/v2/contract/4663/${address}`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, match: body.match ?? body.runtimeMatch ?? null, name: body.compilation?.name ?? null };
}

let bytecodeOk = 0, verified = 0;
const missing = [];
for (const address of addresses) {
  const [c, s] = await Promise.all([code(address).catch((e) => `err ${e.message}`), sourcify(address).catch((e) => ({ status: 0, match: null, name: e.message }))]);
  const hasCode = typeof c === "string" && c.length > 2 && c.startsWith("0x");
  const isVerified = s.status === 200 && Boolean(s.match);
  if (hasCode) bytecodeOk++;
  if (isVerified) verified++; else missing.push(address);
  log(`${hasCode ? "pass" : "FAIL"}  bytecode ${address}  ${hasCode ? `${(c.length - 2) / 2} bytes` : "none"}`);
  log(`${isVerified ? "pass" : "amber"}  sourcify ${address}  ${s.status} ${s.match ?? "not verified"} ${s.name ?? ""}`.trimEnd());
}
log(`${bytecodeOk === addresses.length ? "pass" : "FAIL"}  ${bytecodeOk} of ${addresses.length} addresses hold bytecode`);
log(`${verified === addresses.length ? "pass" : "amber"}  ${verified} of ${addresses.length} have verified source on Sourcify${missing.length ? `; not found there: ${missing.join(", ")}` : ""}`);
writeFileSync(join(here, "results-verify.txt"), lines.join("\n") + "\n");
