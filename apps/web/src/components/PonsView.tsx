"use client";

import { ponsForChain } from "@hume/config";
import { toBaseUnits } from "@hume/sdk";
import type { Address } from "@hume/types";
import { Button, Panel, ReviewStep, Segmented, Skeleton, TextField, cn } from "@hume/ui";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useWalletHume } from "@/hooks/useHume";
import { usePonsHistory, usePonsTokens, type PonsHistoryRow, type PonsRow } from "@/hooks/queries";
import { useOnline } from "@/hooks/useOnline";
import { fmtDateTime } from "@/lib/options";
import { useTx } from "@/hooks/useTx";
import { env } from "@/lib/env";
import { MONO } from "@/lib/frame";
import { humeRead } from "@/lib/hume";
import { estimateBuy, estimateSell, minimumOut, PONS_WARNING, ponsReview, type PoolSnapshot } from "@/lib/pons";
import { cell, head, TxCell } from "./ActivityTables";
import { ConnectButton } from "./ConnectButton";
import { PanelState } from "./PanelState";

type Side = "buy" | "sell";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/// A small dollar price keeps two significant digits: $0.0025, not $0.00.
function fmtSmallUsd(value: number | null): string {
  if (value === null) return "–";
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(Math.min(12, Math.ceil(-Math.log10(value)) + 2))}`;
}

/// The dollar price when the ETH price is known, the ETH price when it is not (a stale feed must not blank the list).
const priceText = (token: PonsRow) => (token.priceUsd !== null ? fmtSmallUsd(token.priceUsd) : token.priceEth !== null ? `${token.priceEth.toPrecision(3)} ETH` : "–");

const amountText = (value: bigint, decimals: number, digits: number) =>
  Number(formatUnits(value, decimals)).toLocaleString("en-US", { maximumFractionDigits: digits });

/// A logo only when the token gives an https address; anything else is initials, so a token's own metadata can
/// never put a non-web URL on the page.
function Logo({ token }: { token: PonsRow }) {
  const [failed, setFailed] = useState(false);
  const src = token.logo?.startsWith("https://") ? token.logo : undefined;
  return src && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-7 rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className={cn(MONO, "grid size-7 place-items-center rounded-full border border-line text-[10px] uppercase text-muted")}>
      {token.symbol.slice(0, 2)}
    </span>
  );
}

function PonsTicket({ token, router }: { token: PonsRow; router?: Address }) {
  const mode = useAccountMode();
  const { address } = useAccount();
  const wallet = useWalletHume();
  const run = useTx();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  const eth = useBalance({ address });
  const held = useQuery({
    queryKey: ["pons-balance", token.address, address],
    queryFn: () => humeRead.erc20.balanceOf(token.address, address as Address),
    enabled: Boolean(address),
    refetchInterval: 10_000,
  });

  const places = side === "buy" ? 18 : token.decimals;
  const valid = /^\d+(\.\d+)?$/.test(amount) && (amount.split(".")[1]?.length ?? 0) <= places && Number(amount) > 0;
  const base = valid ? toBaseUnits(amount, places) : 0n;
  // The list is cached for 15 s, and in a thin pool one trade moves the price by tens of percent, so the quote
  // reads the pool itself every few seconds (and again after each trade) and uses the list only until it arrives.
  const live = useQuery({
    queryKey: ["pons-pool", token.address, env.apiUrl],
    queryFn: async (): Promise<PoolSnapshot> => {
      const response = await fetch(`${env.apiUrl}/v1/pons/pool/${token.address}`);
      if (!response.ok) throw new Error("pool unavailable");
      return response.json();
    },
    refetchInterval: 4_000,
    retry: false,
  });
  const pool: PoolSnapshot | undefined = live.data ?? (token.sqrtPriceX96 && token.liquidity ? { sqrtPriceX96: token.sqrtPriceX96, liquidity: token.liquidity } : undefined);
  const estimate = pool && valid ? (side === "buy" ? estimateBuy(pool, base) : estimateSell(pool, base)) : undefined;
  const minimum = estimate ? minimumOut(estimate.out) : undefined;
  const outDecimals = side === "buy" ? token.decimals : 18;

  const have = side === "buy" ? eth.data?.value : held.data;
  const refusal = !valid
    ? undefined
    : !pool
      ? "This token's pool has no price yet, so it cannot be traded."
      : !estimate
        ? "This pool has no liquidity in range, so the swap cannot be priced."
        : have !== undefined && have < base
          ? side === "buy"
            ? "Not enough ETH in your wallet for this amount and the network fee."
            : `You hold less ${token.symbol} than this amount.`
          : undefined;
  const review =
    estimate && minimum !== undefined && !refusal
      ? ponsReview({
          side,
          symbol: token.symbol,
          inAmount: amountText(base, places, 8),
          estimate: amountText(estimate.out, outDecimals, side === "buy" ? 4 : 8),
          minimum: amountText(minimum, outDecimals, side === "buy" ? 4 : 8),
          impactPct: estimate.impactPct,
          priceLine: token.priceUsd !== null ? `${token.priceEth?.toPrecision(3)} ETH (${fmtSmallUsd(token.priceUsd)})` : `${token.priceEth?.toPrecision(3)} ETH`,
        })
      : undefined;
  const unsigned = !router ? "Buying and selling Pons tokens is not open on this network yet." : !wallet ? "Connect a wallet first." : undefined;

  async function submit() {
    if (!router || !wallet || !address || !review || minimum === undefined) return;
    setBusy(true);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    let ok: boolean;
    if (side === "buy") {
      ok = (await run({ title: `Buy ${token.symbol}`, summary: `${amountText(base, 18, 8)} ETH` }, (tx) => wallet.pons.buy(router, token.address, base, minimum, address, deadline, tx))).ok;
    } else {
      const allowance = await wallet.erc20.allowance(token.address, address, router);
      if (allowance < base) {
        const approved = await run({ title: `Approve ${token.symbol}` }, (tx) => wallet.erc20.approve(token.address, router, base, tx));
        if (!approved.ok) return setBusy(false);
      }
      ok = (await run({ title: `Sell ${token.symbol}`, summary: `${amountText(base, token.decimals, 4)} ${token.symbol}` }, (tx) => wallet.pons.sell(router, token.address, base, minimum, address, deadline, tx))).ok;
    }
    if (ok) {
      setAmount("");
      setReviewing(false);
    }
    setBusy(false);
  }

  const label = `${side === "buy" ? "Buy" : "Sell"} ${token.symbol}`;

  if (reviewing && review) {
    return (
      <div className="border-t border-line p-4">
        <ReviewStep title={label} className="max-w-md" rows={review.rows} worstCase={review.worstCase} blocked={unsigned} busy={busy} confirmLabel={`Confirm: ${label}`} onBack={() => setReviewing(false)} onConfirm={submit} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line p-4">
      <div className="flex items-center gap-3">
        <Logo token={token} />
        <div>
          <p className="font-medium">
            {token.name} <span className="text-muted">{token.symbol}</span>
          </p>
          <p className="text-xs text-muted">
            {priceText(token)} · {held.data !== undefined ? `you hold ${amountText(held.data, token.decimals, 4)}` : "connect to see your balance"}
          </p>
        </div>
      </div>
      {token.description ? <p className="max-w-prose text-sm leading-snug text-muted">{token.description}</p> : null}
      <Segmented<Side>
        label="Buy or sell"
        className="max-w-xs"
        value={side}
        onChange={(next) => {
          setSide(next);
          setAmount("");
        }}
        options={[
          { value: "buy", label: "Buy" },
          { value: "sell", label: "Sell" },
        ]}
      />
      <TextField label={side === "buy" ? "Amount (ETH)" : `Amount (${token.symbol})`} className="max-w-xs" value={amount} onValueChange={setAmount} placeholder="0.00" invalid={amount !== "" && !valid} />
      {estimate && minimum !== undefined ? (
        <p className="text-xs text-muted">
          About {amountText(estimate.out, outDecimals, side === "buy" ? 4 : 8)} {side === "buy" ? token.symbol : "ETH"}, price impact {estimate.impactPct.toFixed(2)}%.
        </p>
      ) : null}
      {refusal ? <p className="max-w-prose leading-snug text-down">{refusal}</p> : null}
      {mode === "disconnected" ? (
        <ConnectButton className="max-w-xs" />
      ) : (
        <Button variant="primary" className="max-w-xs" disabled={!review} onClick={() => setReviewing(true)}>
          Review
        </Button>
      )}
      <p className="max-w-prose text-xs leading-snug text-muted">{PONS_WARNING}</p>
    </div>
  );
}

/// What this wallet bought and sold here, newest first. The same states as the list: not connected, no router on
/// this network, no API, offline, loading, error (with a retry), empty and populated.
function PonsHistory({ tokens, routerOpen }: { tokens: PonsRow[]; routerOpen: boolean }) {
  const mode = useAccountMode();
  const online = useOnline();
  const history = usePonsHistory();
  const rows = history.data;
  const info = (address: Address) => tokens.find((t) => t.address.toLowerCase() === address.toLowerCase());

  return (
    <Panel title="Your Pons history">
      {mode === "disconnected" ? (
        <HistoryNotice action={<ConnectButton />}>Connect a wallet to see the Pons tokens you have bought and sold.</HistoryNotice>
      ) : !routerOpen ? (
        <HistoryNotice>Buying and selling is not open on this network yet, so there is no history.</HistoryNotice>
      ) : !env.apiUrl ? (
        <HistoryNotice>Your history comes from the API. It is not set up on this build.</HistoryNotice>
      ) : !online && !rows ? (
        <HistoryNotice>You are offline, so your history cannot load. It will refresh by itself when you reconnect.</HistoryNotice>
      ) : history.isPending ? (
        <div aria-busy="true" aria-label="Loading your history" className="flex flex-col gap-2 p-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      ) : history.isError ? (
        <HistoryNotice action={<Button size="sm" onClick={() => void history.refetch()}>Try again</Button>}>
          Your history could not be read right now. Your funds are not affected. Try again in a moment.
        </HistoryNotice>
      ) : !rows || rows.length === 0 ? (
        <HistoryNotice>Nothing yet. Each Pons token you buy or sell here is listed with its transaction.</HistoryNotice>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr>
                <th className={head}>Time</th>
                <th className={head}>Action</th>
                <th className={head}>Token</th>
                <th className={head}>Tokens</th>
                <th className={head}>ETH</th>
                <th className={head}>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: PonsHistoryRow) => {
                const token = info(row.token);
                return (
                  <tr key={`${row.txHash}-${row.side}-${row.tokens}`} className="border-t border-line">
                    <td className={cell}>{row.timestamp ? fmtDateTime(new Date(row.timestamp * 1000).toISOString()) : "–"}</td>
                    <td className={cell}>{row.side === "buy" ? "Bought" : "Sold"}</td>
                    <td className={cell}>{token?.symbol ?? `${row.token.slice(0, 6)}…${row.token.slice(-4)}`}</td>
                    <td className={cell}>{amountText(BigInt(row.tokens), token?.decimals ?? 18, 4)}</td>
                    <td className={cell}>{amountText(BigInt(row.eth), 18, 8)}</td>
                    <TxCell hash={row.txHash} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function HistoryNotice({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-3 p-4">
      <p className="max-w-prose text-muted">{children}</p>
      {action}
    </div>
  );
}

/// The Pons market: graduated Pons tokens from `/v1/pons/tokens`, and a ticket to buy or sell one through the
/// review step. Tokens other than HUME's own; Hume lists them and adds no fee.
export function PonsView() {
  const { data, isPending, error } = usePonsTokens();
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<Address>();
  const router = ponsForChain(env.chainId).router;

  const rows = (data ?? []).filter((t) => `${t.symbol} ${t.name}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const selected = rows.find((t) => t.address === picked);

  return (
    <div className="flex flex-1 flex-col gap-4">
    <Panel
      className="flex-1"
      title="Pons tokens"
      actions={
        (data?.length ?? 0) > 5 || filter ? (
          <input
            type="search"
            aria-label="Filter Pons tokens"
            placeholder="Filter tokens"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="my-1 h-8 w-44 rounded-md border border-line bg-ground px-2 text-sm placeholder:text-faint hover:border-accent-line focus:border-accent"
          />
        ) : null
      }
    >
      <div className="flex flex-1 flex-col overflow-x-auto">
        {!env.apiUrl ? (
          <PanelState>The Pons list needs the Hume API, which is not set up for this network.</PanelState>
        ) : isPending ? (
          <div className="flex flex-col gap-2 p-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <PanelState>The Pons list could not be loaded. Check your connection and try again in a moment.</PanelState>
        ) : (data?.length ?? 0) === 0 ? (
          <PanelState>No Pons tokens have graduated on this network yet.</PanelState>
        ) : rows.length === 0 ? (
          <PanelState>No token matches “{filter}”.</PanelState>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted">
                <th scope="col" className="px-3 py-2 text-left font-normal">Token</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Price</th>
                <th scope="col" className="px-3 py-2 text-right font-normal max-sm:hidden">Market cap</th>
                <th scope="col" className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((token) => (
                <Fragment key={token.address}>
                <tr className={cn("border-t border-line", token.address === picked && "bg-accent-soft")}>
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">
                    <span className="flex items-center gap-2.5">
                      <Logo token={token} />
                      <span>
                        {token.symbol}
                        <span className="ml-2 text-xs font-normal text-muted max-sm:hidden">{token.name}</span>
                      </span>
                    </span>
                  </th>
                  <td className="px-3 py-2.5 text-right tabular-nums">{priceText(token)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums max-sm:hidden">{token.marketCapUsd === null ? "–" : `$${compact.format(token.marketCapUsd)}`}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="secondary" onClick={() => setPicked(token.address)} aria-pressed={token.address === picked}>
                      Trade
                    </Button>
                  </td>
                </tr>
                {token.address === picked ? (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <PonsTicket key={token.address} token={token} router={router} />
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!selected && (data?.length ?? 0) > 0 ? <p className="border-t border-line p-3 text-xs text-muted">{PONS_WARNING}</p> : null}
    </Panel>
    <PonsHistory tokens={data ?? []} routerOpen={Boolean(router)} />
    </div>
  );
}
