import { InsufficientCollateralError, toBaseUnits, type Amount, type Hume, type TxEvent, type TxOptions } from "@hume/sdk";
import type { Hex } from "@hume/types";
import type { Fill } from "./fills";
import { env } from "./env";
import { humeRead } from "./hume";
import { loadSampleMarket } from "./sampleMarket";
import {
  SAMPLE_HASH_PREFIX,
  SampleRefusedError,
  SampleUnsupportedError,
  availableBalance,
  cancelOrder,
  closePosition,
  increasePosition,
  liquidateAt,
  liquidationPriceOf,
  openPosition,
  placeLimitOrder,
  reducePosition,
  tick,
  topUp,
  openPositions,
  type SampleFill,
  type SampleMarket,
} from "./sampleEngine";
import { useSampleStore } from "@/stores/sample";

/// A stand-in for the SDK client that writes to the sample account instead of a wallet. Components call
/// `wallet.perps.openPosition(...)` exactly as they do with a real wallet, and get the same result
/// shape, the same status events and the same typed refusals. That is what keeps sample mode one
/// component tree instead of a second interface that drifts.
///
/// It implements only what the interface calls. Anything else answers with `SampleUnsupportedError`,
/// which `errorMessage` turns into a sentence, never a "not a function" crash.

let settlementDecimals: Promise<number> | undefined;
const decimals = () => (settlementDecimals ??= humeRead.erc20.decimals(env.addresses.settlementToken));

let hashes = 0;
const sampleHash = () => `${SAMPLE_HASH_PREFIX}${String(++hashes).padStart(6, "0")}` as Hex;

const maxPositionNotional = (places: number) => BigInt(env.sample.maxPositionUsd) * 10n ** BigInt(places);

const store = () => useSampleStore.getState();

/// Runs one simulated write with the same status events a real transaction emits, minus the wallet.
async function simulate<T>(tx: TxOptions | undefined, work: () => Promise<T>): Promise<{ hash: Hex; result: T }> {
  const emit = (event: TxEvent) => {
    try {
      tx?.onStatus?.(event);
    } catch {
      // A listener error must never undo a fill.
    }
  };
  emit({ status: "preparing" });
  try {
    const result = await work();
    const hash = sampleHash();
    emit({ status: "confirmed", hash });
    return { hash, result };
  } catch (error) {
    emit({ status: "failed", error });
    throw error;
  }
}

function positionOf(positionId: bigint) {
  const position = store().account?.positions.find((candidate) => candidate.positionId === positionId && candidate.open);
  if (!position) throw new SampleRefusedError("That position is already closed.");
  return position;
}

function unsupported(name: string): unknown {
  return new Proxy(() => undefined, {
    get: (_target, key) => (key === "then" ? undefined : unsupported(`${name}.${String(key)}`)),
    apply: () => Promise.reject(new SampleUnsupportedError(`${name} is not simulated in sample mode`)),
  });
}

/// An object whose missing members answer with a refusal, so the interface never meets `undefined`.
function withFallback<T extends object>(name: string, known: T): T {
  return new Proxy(known, { get: (target, key) => (key in target ? (target as Record<string | symbol, unknown>)[key] : unsupported(`${name}.${String(key)}`)) });
}

const perps = withFallback("perps", {
  async openPosition(params: { market: string; side: "LONG" | "SHORT"; collateral: Amount; leverage: number | bigint; marginMode?: "ISOLATED" | "CROSS"; tx?: TxOptions }) {
    if (params.marginMode === "CROSS") throw new SampleUnsupportedError("Cross margin is not simulated in sample mode");
    return simulate(params.tx, async () => {
      const places = await decimals();
      const market = await loadSampleMarket(params.market);
      let positionId = 0n;
      store().apply((account) => {
        const opened = openPosition(account, {
          market,
          isLong: params.side === "LONG",
          collateral: toBaseUnits(params.collateral, places),
          leverage: BigInt(params.leverage),
          now: Date.now(),
          maxPositionNotional: maxPositionNotional(places),
        });
        positionId = opened.positionId;
        return opened.account;
      });
      return positionId;
    }).then(({ hash, result }) => ({ hash, positionId: result }));
  },

  async closePosition(positionId: bigint, params: { tx?: TxOptions } = {}) {
    return (
      await simulate(params.tx, async () => {
        const market = await loadSampleMarket(positionOf(positionId).marketId);
        store().apply((account) => closePosition(account, positionId, market, Date.now()));
      })
    ).hash;
  },

  async reducePosition(positionId: bigint, params: { size: Amount; tx?: TxOptions }) {
    return (
      await simulate(params.tx, async () => {
        const places = await decimals();
        const market = await loadSampleMarket(positionOf(positionId).marketId);
        store().apply((account) => reducePosition(account, positionId, toBaseUnits(params.size, places), market, Date.now()));
      })
    ).hash;
  },

  async increasePosition(positionId: bigint, params: { addSize: Amount; addCollateral?: Amount; tx?: TxOptions }) {
    return (
      await simulate(params.tx, async () => {
        const places = await decimals();
        const market = await loadSampleMarket(positionOf(positionId).marketId);
        store().apply((account) =>
          increasePosition(
            account,
            positionId,
            toBaseUnits(params.addSize, places),
            toBaseUnits(params.addCollateral ?? 0n, places),
            market,
            Date.now(),
            maxPositionNotional(places),
          ),
        );
      })
    ).hash;
  },

  async placeLimitOrder(params: { market: string; side: "LONG" | "SHORT"; collateral: Amount; leverage: number | bigint; limitPrice: Amount; expiry?: bigint; tx?: TxOptions }) {
    const { hash, result } = await simulate(params.tx, async () => {
      const places = await decimals();
      const market = await loadSampleMarket(params.market);
      let orderId = 0n;
      store().apply((account) => {
        const placed = placeLimitOrder(account, {
          market,
          isLong: params.side === "LONG",
          collateral: toBaseUnits(params.collateral, places),
          leverage: BigInt(params.leverage),
          triggerPrice: toBaseUnits(params.limitPrice, 18),
          expiry: params.expiry ?? BigInt(Math.floor(Date.now() / 1000) + 86_400),
          now: Date.now(),
          maxPositionNotional: maxPositionNotional(places),
        });
        orderId = placed.orderId;
        return placed.account;
      });
      return orderId;
    });
    return { hash, orderId: result };
  },

  async cancelLimitOrder(orderId: bigint, tx?: TxOptions) {
    return (await simulate(tx, async () => store().apply((account) => cancelOrder(account, orderId, Date.now())))).hash;
  },

  /// Stop-loss and take-profit are not simulated, and saying so here hides their controls.
  async supportsTriggerOrders() {
    return false;
  },
});

const erc20 = withFallback("erc20", {
  /// The sample wallet holds whatever it needs: there is no allowance to grant.
  async allowance() {
    return 2n ** 255n;
  },
  async approve(_token: unknown, _spender: unknown, _amount: unknown, tx?: TxOptions) {
    return (await simulate(tx, async () => undefined)).hash;
  },
});

const vault = withFallback("vault", {
  async deposit(_token: unknown, amount: Amount, tx?: TxOptions) {
    return (
      await simulate(tx, async () => {
        const value = toBaseUnits(amount, await decimals());
        store().apply((account) => topUp(account, value, Date.now()));
      })
    ).hash;
  },
  async withdraw(_token: unknown, amount: Amount, tx?: TxOptions) {
    return (
      await simulate(tx, async () => {
        const value = toBaseUnits(amount, await decimals());
        store().apply((account) => {
          if (availableBalance(account) < value) throw new InsufficientCollateralError("InsufficientCollateral", [value]);
          return { ...account, balance: account.balance - value };
        });
      })
    ).hash;
  },
});

export const sampleClient = withFallback("hume", { perps, erc20, vault }) as unknown as Hume;

/// Adds the configured top-up to the sample vault. The sample's answer to "deposit": there is no wallet
/// to draw on, so sample USDG is simply handed out, in the open, and labelled.
export async function topUpSample(): Promise<void> {
  const places = await decimals();
  store().apply((account) => topUp(account, BigInt(env.sample.topUpUsd) * 10n ** BigInt(places), Date.now()));
}

/// Starts the sample account at the configured balance. Needs the token's decimals, so it is async.
export async function startSampleAccount(): Promise<void> {
  const places = await decimals();
  store().start(BigInt(env.sample.startingUsd) * 10n ** BigInt(places));
}

/// A sample fill the person did not ask for, in the shape the alert card already renders for a real one.
export function toAlertFill(fill: SampleFill, replayed = false): Fill {
  return {
    id: fill.id,
    kind: "LIQUIDATION",
    positionId: String(fill.positionId ?? 0),
    txHash: `${SAMPLE_HASH_PREFIX}${String(fill.id).padStart(6, "0")}`,
    price: fill.price,
    pnl: fill.pnl,
    isLong: fill.isLong,
    size: fill.size,
    ...(replayed ? { replayed } : {}),
  };
}

/// One pass of the things that react to price on their own: liquidations, and limit orders reaching their
/// trigger. Returns the liquidations, for the alert queue. A market whose price cannot be read this
/// tick is skipped, never guessed.
export async function runSampleTick(): Promise<Fill[]> {
  const account = store().account;
  if (!account) return [];
  const ids = new Set<Hex>([...openPositions(account).map((position) => position.marketId), ...account.orders.filter((order) => order.status === "OPEN").map((order) => order.marketId)]);
  if (ids.size === 0) return [];
  const places = await decimals();
  const markets = new Map<Hex, SampleMarket>();
  await Promise.all(
    [...ids].map(async (id) => {
      const quote = await loadSampleMarket(id).catch(() => undefined);
      if (quote) markets.set(id, quote);
    }),
  );
  let produced: SampleFill[] = [];
  store().apply((current) => {
    const result = tick(current, markets, Date.now(), maxPositionNotional(places));
    produced = result.fills.filter((fill) => fill.kind === "LIQUIDATION");
    return result.account;
  });
  return produced.map((fill) => toAlertFill(fill));
}

/// Replays one position as if the price had reached its liquidation price, so a visitor can see what a
/// liquidation does without waiting for a move that may never come. The real rule, on a real position.
export async function replayLiquidation(positionId: bigint): Promise<Fill> {
  const position = positionOf(positionId);
  const market = await loadSampleMarket(position.marketId);
  const price = liquidationPriceOf(position, market.maintenanceMarginRateBps);
  let produced: SampleFill | undefined;
  store().apply((account) => {
    const next = liquidateAt(account, positionId, price, Date.now());
    produced = next.fills[0];
    return next;
  });
  return toAlertFill(produced as SampleFill, true);
}
