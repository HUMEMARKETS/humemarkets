import type { Hume } from "@hume/sdk";
import type { ChainId } from "@hume/config";
import type { FastifyInstance } from "fastify";
import type { PublicClient } from "viem";
import { createPonsMarket } from "../pons.js";

/// Graduated Pons tokens with metadata and pool price. Buying and selling are signed by the user against
/// `HumePonsRouter`; this route only lists. An RPC failure answers 502 with a plain message.
export function registerPonsRoutes(app: FastifyInstance, hume: Hume, client: PublicClient, chainId: ChainId) {
  const ethUsd = async () => {
    try {
      return Number((await hume.oracle.getIndexPrice("ETH")).price) / 1e18;
    } catch {
      return null;
    }
  };
  const tokens = createPonsMarket(client, chainId, ethUsd);
  app.get("/v1/pons/tokens", async (request, reply) => {
    try {
      return await tokens();
    } catch (error) {
      request.log.error({ err: error }, "pons: token read failed");
      return reply.code(502).send({ error: "chain unavailable" });
    }
  });
}
