import { createPublicClient, http, parseAbi, type Address } from "viem";

/// A wallet's Pons buys and sells, read from `HumePonsRouter`'s logs straight from the chain by the browser.
/// (The API cannot do it: the public RPCs that a server can reach refuse a log range this wide.)

const eventsAbi = parseAbi([
  "event PonsBought(address indexed buyer, address indexed token, uint256 ethIn, uint256 tokensOut)",
  "event PonsSold(address indexed seller, address indexed token, uint256 tokensIn, uint256 ethOut)",
]);

/// The RPC allows 10M blocks per `getLogs`.
const CHUNK = 9_000_000n;
export const HISTORY_ROWS = 50;

export interface PonsHistoryLog {
  eventName: string;
  args: { token?: Address; ethIn?: bigint; tokensOut?: bigint; tokensIn?: bigint; ethOut?: bigint };
  transactionHash: string;
  blockNumber: bigint;
  logIndex: number;
}

export interface PonsHistoryRow {
  side: "buy" | "sell";
  token: Address;
  /// Wei, paid on a buy and received on a sell.
  eth: string;
  /// Token base units, received on a buy and paid on a sell.
  tokens: string;
  txHash: string;
  blockNumber: string;
  /// Block time in seconds.
  timestamp: number;
}

/// Newest first, at most `limit` rows. Logs that are not a Pons buy or sell are dropped.
export function ponsHistoryRows(logs: PonsHistoryLog[], limit: number): Omit<PonsHistoryRow, "timestamp">[] {
  return logs
    .filter((log) => (log.eventName === "PonsBought" || log.eventName === "PonsSold") && log.args.token)
    .sort((a, b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : a.blockNumber > b.blockNumber ? -1 : 1))
    .slice(0, limit)
    .map((log) => {
      const buy = log.eventName === "PonsBought";
      return {
        side: buy ? "buy" : "sell",
        token: log.args.token!,
        eth: ((buy ? log.args.ethIn : log.args.ethOut) ?? 0n).toString(),
        tokens: ((buy ? log.args.tokensOut : log.args.tokensIn) ?? 0n).toString(),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      };
    });
}

export async function readPonsHistory(rpcUrl: string, router: Address, fromBlock: number, wallet: Address): Promise<PonsHistoryRow[]> {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const head = await client.getBlockNumber();
  const windows: { fromBlock: bigint; toBlock: bigint }[] = [];
  for (let from = BigInt(fromBlock); from <= head; from += CHUNK) windows.push({ fromBlock: from, toBlock: from + CHUNK - 1n < head ? from + CHUNK - 1n : head });
  const found = await Promise.all(
    windows.flatMap((window) => [
      client.getLogs({ address: router, event: eventsAbi[0], args: { buyer: wallet }, ...window }),
      client.getLogs({ address: router, event: eventsAbi[1], args: { seller: wallet }, ...window }),
    ]),
  );
  const rows = ponsHistoryRows(found.flat() as unknown as PonsHistoryLog[], HISTORY_ROWS);
  const blocks = await Promise.all([...new Set(rows.map((row) => row.blockNumber))].map((n) => client.getBlock({ blockNumber: BigInt(n) })));
  const time = new Map(blocks.map((block) => [block.number.toString(), Number(block.timestamp)]));
  return rows.map((row) => ({ ...row, timestamp: time.get(row.blockNumber) ?? 0 }));
}
