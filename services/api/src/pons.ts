import { ponsForChain, type ChainId, type PonsConfig } from "@hume/config";
import { encodeAbiParameters, encodePacked, keccak256, parseAbi, parseAbiItem, type Address, type Hex, type PublicClient } from "viem";

/// The Pons market: graduated Pons tokens, found from the factory's `LaunchSwept` events, with the token's own
/// on-chain metadata and a price read from its Uniswap v4 pool. Nothing here is a settlement price; the page
/// only shows it and the router (`HumePonsRouter`) trades at the pool's own price with the caller's minimum.

const factoryAbi = parseAbi([
  "struct LaunchedToken { address token; address curve; address deployer; address creatorFeeRecipient; address pairToken; uint256 graduationThreshold; uint24 poolFee; int24 tickSpacing; uint16 creatorTaxBps; bool buybackEnabled; uint8 phase; uint256 sweptQuote; uint256 sweptTokens; uint256 sweptAt; bool exists; }",
  "function getLaunchedToken(address token) view returns (LaunchedToken)",
]);
const launchSwept = parseAbiItem("event LaunchSwept(address indexed token, uint256 sweptQuote, uint256 sweptTokens)");
const tokenAbi = parseAbi([
  "struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, Socials tokenSocials)",
]);
const poolManagerAbi = parseAbi(["function extsload(bytes32 slot) view returns (bytes32)"]);

/// `PoolManager._pools` storage slot, as in `HumePonsTwapOracle`.
const POOLS_SLOT = 6n;
/// `Pool.State.liquidity` sits three slots after `slot0` (slot0, feeGrowthGlobal0X128, feeGrowthGlobal1X128, liquidity).
const LIQUIDITY_OFFSET = 3n;
const SCAN_CHUNK = 9_000_000n; // the RPC allows 10M blocks per getLogs
const PRICE_TTL_MS = 15_000;
const MAX_READ_ATTEMPTS = 3;
const READ_BATCH = 8;
const DEXSCREENER = "https://api.dexscreener.com/tokens/v1";
const DEXSCREENER_BATCH = 30;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export interface PonsToken {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  poolId: Hex;
  /// The pool's current sqrt price (Q64.96, token per ETH) and in-range liquidity, as decimal strings, so the
  /// page can estimate a swap before it asks for a signature. Null while the pool is not initialised.
  sqrtPriceX96: string | null;
  liquidity: string | null;
  /// ETH per whole token, or null while the pool has no price.
  priceEth: number | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
}

interface Meta extends Omit<PonsToken, "sqrtPriceX96" | "liquidity" | "priceEth" | "priceUsd" | "marketCapUsd"> {
  poolFee: number;
  tickSpacing: number;
}

/// A logo the page can load: an https address stays; `ipfs://` (no public gateway serves it any more), a `data:`
/// URI or a script scheme is dropped, so the page shows initials unless DexScreener has the image.
export function logoUrl(logo: string | undefined): string | null {
  return logo?.startsWith("https://") ? logo : null;
}

export function poolIdOf(config: Pick<PonsConfig, "hook">, token: Address, fee: number, tickSpacing: number): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }],
      [ZERO, token, fee, tickSpacing, config.hook],
    ),
  );
}

/// ETH per whole token from `slot0`'s sqrtPriceX96 (token1 per token0 is price squared; the pool is ETH / token).
export function ethPerToken(sqrtPriceX96: bigint, tokenDecimals: number): number | null {
  if (sqrtPriceX96 === 0n) return null;
  const root = Number(sqrtPriceX96) / 2 ** 96;
  const tokenPerEth = root * root;
  return (10 ** (tokenDecimals - 18)) / tokenPerEth;
}

export function createPonsMarket(client: PublicClient, chainId: ChainId, ethUsd: () => Promise<number | null>) {
  const config = ponsForChain(chainId);
  const metas = new Map<Address, Meta>();
  const failures = new Map<Address, number>();
  const launches = new Map<Address, bigint>();
  const checked = new Set<Address>();
  const looked = new Set<Address>();
  let scannedTo = BigInt(config.fromBlock) - 1n;
  let priced: { at: number; tokens: PonsToken[] } | undefined;
  let scanning: Promise<void> | undefined;

  async function scan() {
    const head = await client.getBlockNumber();
    for (let from = scannedTo + 1n; from <= head; from += SCAN_CHUNK) {
      const to = from + SCAN_CHUNK - 1n < head ? from + SCAN_CHUNK - 1n : head;
      const logs = await client.getLogs({ address: config.factory, event: launchSwept, fromBlock: from, toBlock: to });
      for (const log of logs) if (log.args.token) launches.set(log.args.token, log.args.sweptQuote ?? 0n);
    }
    // Mainnet has thousands of graduated tokens. Read only the `listSize` that swept the most quote at graduation
    // (the biggest launches, free from the log); the testnet mock reports 0 for all, and has fewer than that.
    const wanted = [...launches].sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0)).slice(0, config.listSize).map(([token]) => token);
    const todo = wanted.filter((token) => !checked.has(token));
    for (let i = 0; i < todo.length; i += READ_BATCH) {
      await Promise.all(
        todo.slice(i, i + READ_BATCH).map(async (token) => {
          try {
            const meta = await readMeta(token);
            if (meta) metas.set(token, meta);
            checked.add(token);
          } catch {
            // A token the factory cannot describe is retried on the next scans, then dropped.
            const count = (failures.get(token) ?? 0) + 1;
            failures.set(token, count);
            if (count >= MAX_READ_ATTEMPTS) checked.add(token);
          }
        }),
      );
    }
    await fillLogos();
    scannedTo = head;
  }

  /// Gives a token with no loadable logo DexScreener's copy of its image, once per token.
  async function fillLogos() {
    if (!config.dexscreenerChain) return;
    const bare = [...metas.values()].filter((m) => m.logo === null && !looked.has(m.address));
    for (let i = 0; i < bare.length; i += DEXSCREENER_BATCH) {
      const batch = bare.slice(i, i + DEXSCREENER_BATCH);
      try {
        const response = await fetch(`${DEXSCREENER}/${config.dexscreenerChain}/${batch.map((m) => m.address).join(",")}`);
        if (!response.ok) continue;
        const pairs = (await response.json()) as { baseToken: { address: string }; info?: { imageUrl?: string } }[];
        for (const meta of batch) {
          const found = pairs.find((p) => p.baseToken.address.toLowerCase() === meta.address.toLowerCase() && p.info?.imageUrl);
          meta.logo = logoUrl(found?.info?.imageUrl);
          looked.add(meta.address);
        }
      } catch {
        // DexScreener down: the next scan tries again, and the page shows initials meanwhile.
      }
    }
  }

  async function readMeta(token: Address): Promise<Meta | undefined> {
    const launch = await client.readContract({ address: config.factory, abi: factoryAbi, functionName: "getLaunchedToken", args: [token] });
    // Phase 2 means graduated into a v4 pool; a zero pair token means the pool pairs against native ETH.
    if (!launch.exists || launch.phase !== 2 || launch.pairToken !== ZERO) return undefined;
    const read = <F extends "name" | "symbol" | "decimals" | "totalSupply" | "getTokenInfo">(functionName: F) =>
      client.readContract({ address: token, abi: tokenAbi, functionName } as never) as Promise<never>;
    const [name, symbol, decimals, totalSupply, info] = await Promise.allSettled([
      read("name"),
      read("symbol"),
      read("decimals"),
      read("totalSupply"),
      read("getTokenInfo"),
    ]);
    const ok = <T>(r: PromiseSettledResult<unknown>, fallback: T) => (r.status === "fulfilled" ? (r.value as T) : fallback);
    const tokenInfo = ok<readonly [Address, string, string, { website: string; twitter: string; telegram: string }] | undefined>(info, undefined);
    const text = (value: string | undefined) => (value ? value : null);
    return {
      address: token,
      name: ok(name, "Unknown"),
      symbol: ok(symbol, "???"),
      decimals: ok(decimals, 18),
      totalSupply: ok<bigint>(totalSupply, 0n).toString(),
      logo: logoUrl(tokenInfo?.[1]),
      description: text(tokenInfo?.[2]),
      website: text(tokenInfo?.[3].website),
      twitter: text(tokenInfo?.[3].twitter),
      telegram: text(tokenInfo?.[3].telegram),
      poolId: poolIdOf(config, token, launch.poolFee, launch.tickSpacing),
      poolFee: launch.poolFee,
      tickSpacing: launch.tickSpacing,
    };
  }

  /// The pool's current sqrt price and in-range liquidity, straight from the `PoolManager`.
  async function readPool(poolId: Hex) {
    const base = BigInt(keccak256(encodePacked(["bytes32", "uint256"], [poolId, POOLS_SLOT])));
    const slotAt = (offset: bigint) => `0x${(base + offset).toString(16).padStart(64, "0")}` as Hex;
    const [slot0, inRange] = await Promise.all([
      client.readContract({ address: config.poolManager, abi: poolManagerAbi, functionName: "extsload", args: [slotAt(0n)] }),
      client.readContract({ address: config.poolManager, abi: poolManagerAbi, functionName: "extsload", args: [slotAt(LIQUIDITY_OFFSET)] }),
    ]);
    return { sqrtPriceX96: BigInt(slot0) & ((1n << 160n) - 1n), liquidity: BigInt(inRange) & ((1n << 128n) - 1n) };
  }

  /// Uncached pool state of one listed token, for a ticket that must quote against the pool as it is now (the
  /// 15 s list is stale right after a trade, and in a thin pool one trade moves the price by tens of percent).
  async function pool(token: Address) {
    const meta = metas.get(token) ?? [...metas.values()].find((m) => m.address.toLowerCase() === token.toLowerCase());
    if (!meta) return undefined;
    const { sqrtPriceX96, liquidity } = await readPool(meta.poolId);
    return { sqrtPriceX96: sqrtPriceX96.toString(), liquidity: liquidity.toString() };
  }

  const tokens = async function tokens(now = Date.now()): Promise<PonsToken[]> {
    if (priced && now - priced.at < PRICE_TTL_MS) return priced.tokens;
    scanning ??= scan().finally(() => {
      scanning = undefined;
    });
    await scanning;
    const usd = await ethUsd();
    const list = await Promise.all(
      [...metas.values()].map(async ({ poolFee: _fee, tickSpacing: _spacing, ...meta }): Promise<PonsToken> => {
        let price: number | null = null;
        let sqrtPriceX96: bigint | null = null;
        let liquidity: bigint | null = null;
        try {
          ({ sqrtPriceX96, liquidity } = await readPool(meta.poolId));
          price = ethPerToken(sqrtPriceX96, meta.decimals);
        } catch {
          price = null;
        }
        const priceUsd = price !== null && usd !== null ? price * usd : null;
        const supply = Number(BigInt(meta.totalSupply)) / 10 ** meta.decimals;
        return { ...meta, sqrtPriceX96: sqrtPriceX96?.toString() ?? null, liquidity: liquidity?.toString() ?? null, priceEth: price, priceUsd, marketCapUsd: priceUsd !== null ? priceUsd * supply : null };
      }),
    );
    // Largest market cap first; tokens with no price last.
    list.sort((a, b) => (b.marketCapUsd ?? -1) - (a.marketCapUsd ?? -1));
    priced = { at: now, tokens: list };
    return list;
  };
  return Object.assign(tokens, { pool });
}

/// The router's two events, both with the wallet as the first indexed argument.
export const ponsEventsAbi = parseAbi([
  "event PonsBought(address indexed buyer, address indexed token, uint256 ethIn, uint256 tokensOut)",
  "event PonsSold(address indexed seller, address indexed token, uint256 tokensIn, uint256 ethOut)",
]);

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
}

/// Newest first, at most `limit` rows. Logs that are not a Pons buy or sell are dropped.
export function ponsHistoryRows(logs: PonsHistoryLog[], limit: number): PonsHistoryRow[] {
  return logs
    .filter((log) => (log.eventName === "PonsBought" || log.eventName === "PonsSold") && log.args.token)
    .sort((a, b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : a.blockNumber > b.blockNumber ? -1 : 1))
    .slice(0, limit)
    .map((log) => {
      const buy = log.eventName === "PonsBought";
      return {
        side: buy ? "buy" : "sell",
        token: log.args.token!,
        eth: (buy ? log.args.ethIn : log.args.ethOut ?? 0n)?.toString() ?? "0",
        tokens: (buy ? log.args.tokensOut : log.args.tokensIn)?.toString() ?? "0",
        txHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      };
    });
}
