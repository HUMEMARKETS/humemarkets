import { loadDotEnv } from "@hume/config";
loadDotEnv();

import { requireEnv, resolveAddresses, resolveChainId } from "@hume/config";
import { Hume } from "@hume/sdk";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chains } from "@hume/config";
import { createKeeper } from "./keeper.js";

const chainId = resolveChainId(process.env.CHAIN_ID);
const account = privateKeyToAccount(requireEnv("KEEPER_PRIVATE_KEY") as Hex);
const transport = http(requireEnv("RPC_URL"));

const intervalMs = Number(process.env.KEEPER_INTERVAL_MS ?? 15_000);
/// Half the oracle's default 1 hour staleness window, so one missed tick does not stall the market.
const refreshSeconds = BigInt(process.env.KEEPER_FEED_REFRESH_SECONDS ?? 1_800);
/// Free-plan mode: one pass, then exit, for a Railway cron service. Unset keeps the always-on loop.
const runOnce = process.env.KEEPER_RUN_ONCE === "true";
const refreshFeeds = (process.env.KEEPER_REFRESH_FEEDS ?? "true") !== "false";

const hume = new Hume({ chainId, transport, account, addresses: resolveAddresses(chainId) });
const keeper = createKeeper({
  hume,
  publicClient: createPublicClient({ chain: chains[chainId], transport }),
  walletClient: createWalletClient({ account, chain: chains[chainId], transport }),
  refreshSeconds,
  refreshFeeds,
});

console.log(`keeper: ${account.address} on chain ${chainId}, every ${intervalMs}ms (feed refresh ${refreshFeeds ? "on" : "off"})`);
for (;;) {
  try {
    await keeper.tick();
  } catch (error) {
    console.error("keeper: tick failed", error);
  }
  if (runOnce) process.exit(0);
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
