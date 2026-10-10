import type { Hume } from "@hume/sdk";
import type { ChainId } from "@hume/config";
import type { FastifyInstance } from "fastify";
import type { Address, PublicClient } from "viem";
import { createPonsMarket } from "../pons.js";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

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

  /// A listed token's pool price and liquidity right now (no cache), for the ticket's quote.
  app.get<{ Params: { token: string } }>("/v1/pons/pool/:token", async (request, reply) => {
    if (!ADDRESS.test(request.params.token)) return reply.code(400).send({ error: "token must be an address" });
    try {
      await tokens(); // makes sure the token list has been read at least once
      const pool = await tokens.pool(request.params.token as Address);
      return pool ?? reply.code(404).send({ error: "not a listed Pons token" });
    } catch (error) {
      request.log.error({ err: error }, "pons: pool read failed");
      return reply.code(502).send({ error: "chain unavailable" });
    }
  });
}
