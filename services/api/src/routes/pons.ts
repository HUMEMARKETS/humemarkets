import type { Hume } from "@hume/sdk";
import { ponsForChain, type ChainId } from "@hume/config";
import type { FastifyInstance } from "fastify";
import type { Address, PublicClient } from "viem";
import { createPonsMarket, ponsEventsAbi, ponsHistoryRows } from "../pons.js";

/// The RPC allows 10M blocks per `getLogs`; the router is days old, so one window from its first block covers it.
const CHUNK = 9_000_000n;
const HISTORY_ROWS = 50;
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

  /// One wallet's Pons buys and sells through `HumePonsRouter`, newest first, read from the router's logs.
  /// `timestamp` is the block's time in seconds. Without a router on this chain the list is empty.
  app.get<{ Params: { wallet: string } }>("/v1/pons/history/:wallet", async (request, reply) => {
    if (!ADDRESS.test(request.params.wallet)) return reply.code(400).send({ error: "wallet must be an address" });
    const { router, fromBlock } = ponsForChain(chainId);
    if (!router) return [];
    const wallet = request.params.wallet as Address;
    try {
      const head = await client.getBlockNumber();
      const windows: { fromBlock: bigint; toBlock: bigint }[] = [];
      for (let from = BigInt(fromBlock); from <= head; from += CHUNK) windows.push({ fromBlock: from, toBlock: from + CHUNK - 1n < head ? from + CHUNK - 1n : head });
      const [bought, sold] = [ponsEventsAbi[0], ponsEventsAbi[1]];
      const found = await Promise.all(
        windows.flatMap((window) => [
          client.getLogs({ address: router, event: bought, args: { buyer: wallet }, ...window }),
          client.getLogs({ address: router, event: sold, args: { seller: wallet }, ...window }),
        ]),
      );
      const rows = ponsHistoryRows(found.flat() as never, HISTORY_ROWS);
      const blocks = await Promise.all([...new Set(rows.map((row) => row.blockNumber))].map((n) => client.getBlock({ blockNumber: BigInt(n) })));
      const time = new Map(blocks.map((block) => [block.number.toString(), Number(block.timestamp)]));
      return rows.map((row) => ({ ...row, timestamp: time.get(row.blockNumber) ?? 0 }));
    } catch (error) {
      request.log.error({ err: error }, "pons: history read failed");
      return reply.code(502).send({ error: "chain unavailable" });
    }
  });
}
