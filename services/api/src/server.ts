import { requireEnv, resolveChainId } from "@hume/config";
import { Hume } from "@hume/sdk";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { createPublicClient, http, type PublicClient } from "viem";
import { registerCors } from "./cors.js";
import { resolveCreditPair } from "./credit.js";
import { registerCreditRoutes } from "./routes/credit.js";
import { registerAdvancedRoutes } from "./routes/advanced.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerLeaderboardRoutes } from "./routes/leaderboard.js";
import { registerMarketRoutes } from "./routes/markets.js";
import { registerOptionRoutes } from "./routes/options.js";
import { registerPerpRoutes } from "./routes/perps.js";
import { registerPortfolioRoutes } from "./routes/portfolio.js";
import { registerPonsRoutes } from "./routes/pons.js";
import { registerQuotedRoutes } from "./routes/quoted.js";
import { registerPriceRoutes } from "./routes/prices.js";
import { registerRfqRoutes } from "./routes/rfq.js";
import { httpUpstream, registerRpcProxy } from "./rpcProxy.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { registerTradeRoutes } from "./routes/trade.js";
import { registerWebSocket } from "./ws.js";

export function buildServer() {
  const chainId = resolveChainId(process.env.CHAIN_ID);
  const rpcUrl = requireEnv("RPC_URL");
  const hume = new Hume({ chainId, transport: http(rpcUrl) });

  const app = Fastify({ logger: true });

  registerCors(app);
  app.register(websocket);
  app.get("/health", async () => ({ ok: true }));

  app.register(async (instance) => {
    registerRpcProxy(instance, httpUpstream(rpcUrl));
    registerMarketRoutes(instance, hume);
    registerOptionRoutes(instance, hume);
    registerPerpRoutes(instance, hume);
    registerPriceRoutes(instance, hume);
    registerPortfolioRoutes(instance, hume);
    registerQuotedRoutes(instance);
    registerPonsRoutes(instance, hume, createPublicClient({ transport: http(rpcUrl, { batch: true }) }) as PublicClient, chainId);
    registerStatsRoutes(instance);
    registerAnalyticsRoutes(instance);
    registerAdvancedRoutes(instance, hume);
    registerLeaderboardRoutes(instance, hume);
    registerCreditRoutes(instance, createPublicClient({ transport: http(rpcUrl) }), resolveCreditPair(hume.addresses, process.env.CREDIT_PAIR_ADDRESS));
    registerTradeRoutes(instance, hume);
    registerRfqRoutes(instance, hume);
    registerWebSocket(instance, hume);
  });

  return app;
}
