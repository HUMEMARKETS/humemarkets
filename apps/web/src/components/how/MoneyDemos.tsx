"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@hume/ui";
import { Choice, Line, Note, Review, Slider, Steps, useGoal, usd } from "./kit";

/// Chapters 7 and 8: lending and Pons. Lending uses the formulas in /docs ("Lending"): loan to value =
/// debt / collateral value, health factor = liquidation limit / loan to value, liquidated below 1, and a
/// liquidator takes the matching collateral plus a 5% bonus. The two limits below are the example's own: a real
/// pair publishes its own and the Lending page reads them from the pair. Pons uses a plain constant-product
/// pool, which is how a swap's price impact arises.

const BORROW_LIMIT = 0.6;
const LIQUIDATION_LIMIT = 0.75;
const REFERENCE = 250;
const BONUS = 0.05;

export function LendingDemo() {
  const goal = useGoal();
  const [units, setUnits] = useState(10);
  const [debtInput, setDebt] = useState(0);
  const [price, setPrice] = useState(REFERENCE);
  const wasRisky = useRef(false);

  const maxBorrow = units * REFERENCE * BORROW_LIMIT;
  const debt = Math.min(debtInput, maxBorrow);
  const value = units * price;
  const ltv = value > 0 ? debt / value : 0;
  const health = debt > 0 ? LIQUIDATION_LIMIT / ltv : Infinity;
  const risky = health < 1;

  useEffect(() => {
    if (debt > 0) goal("borrow");
    if (risky) {
      goal("drop");
      wasRisky.current = true;
    } else if (wasRisky.current && health >= 1.2) goal("rescue");
  }, [debt, risky, health, goal]);

  const repaid = debt / 2;
  const seized = (repaid * (1 + BONUS)) / price;
  const bar = (share: number) => `${Math.min(share, 1) * 100}%`;

  return (
    <>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <Slider label="Collateral: stock tokens you lock" value={units} min={1} max={20} onChange={setUnits} display={`${units} tokens`} />
        <Slider label="Borrow (USD tokens)" value={debt} min={0} max={Math.round(maxBorrow)} step={50} onChange={setDebt} display={usd(debt, 0)} />
      </div>
      <Slider label="Stock token price (drag it down to test the loan)" value={price} min={80} max={300} step={5} onChange={setPrice} display={usd(price, 0)} />

      <div>
        <div className="relative flex h-5 overflow-hidden rounded-sharp" role="img" aria-label={`Loan to value ${(ltv * 100).toFixed(0)} percent. Borrow limit ${BORROW_LIMIT * 100} percent, liquidation limit ${LIQUIDATION_LIMIT * 100} percent.`}>
          <span className="bg-up-soft" style={{ width: bar(BORROW_LIMIT) }} />
          <span className="bg-raised" style={{ width: bar(LIQUIDATION_LIMIT - BORROW_LIMIT) }} />
          <span className="flex-1 bg-down-soft" />
          <span className={cn("absolute inset-y-0 w-1 -translate-x-1/2 bg-text transition-[left] duration-150")} style={{ left: bar(ltv) }} />
        </div>
        <p className="mt-1.5 flex justify-between text-[11px] text-muted">
          <span>0% safe</span>
          <span>{BORROW_LIMIT * 100}% borrow limit</span>
          <span>{LIQUIDATION_LIMIT * 100}% liquidation</span>
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-x-4 rounded-control border border-line bg-ground px-3">
        <Cell label="Collateral value">{usd(value, 0)}</Cell>
        <Cell label="Loan to value">{(ltv * 100).toFixed(0)}%</Cell>
        <Cell label="Health factor">
          <span className={cn("font-medium", risky ? "text-down" : health < 1.3 ? "text-text" : "text-up")}>{Number.isFinite(health) ? `${health.toFixed(2)}x` : "No loan"}</span>
        </Cell>
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={debt === 0} onClick={() => setDebt(Math.max(0, debt - Math.max(debt / 4, 50)))} className={act}>
          Repay 25%
        </button>
        <button type="button" disabled={units >= 20} onClick={() => setUnits(units + 1)} className={act}>
          Add 1 token of collateral
        </button>
      </div>

      {risky ? (
        <Note tone="down">
          Health factor under 1.00x. Anyone can now repay part of the debt and take the matching collateral plus a {BONUS * 100}% bonus. If a liquidator repays {usd(repaid, 0)}, they take {seized.toFixed(2)} tokens ({usd(seized * price, 0)}). You keep the rest, {(units - seized).toFixed(2)} tokens. Repay or add collateral to climb back above 1.00x.
        </Note>
      ) : debt === 0 ? (
        <Note>Nothing borrowed yet. Move the borrow slider: you can borrow up to {BORROW_LIMIT * 100}% of the value you locked (example limit). The pair is isolated, so this loan cannot touch your trading vault.</Note>
      ) : (
        <Note tone={health >= 1.3 ? "up" : undefined}>
          {health >= 1.3 ? "Comfortable. The price can fall a long way before this loan is in danger." : "Getting close. A small fall in the price pushes the health factor under 1.00x."} Caps are small on purpose at launch.
        </Note>
      )}
    </>
  );
}

const act =
  "h-11 rounded-control border border-line bg-raised px-3 text-sm font-medium transition-colors duration-150 enabled:hover:border-accent enabled:hover:bg-accent-soft enabled:hover:text-accent-hover enabled:active:bg-accent enabled:active:text-accent-ink disabled:cursor-not-allowed disabled:text-faint";

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm tabular-nums text-text">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- Pons

const POOLS = {
  deep: { label: "Deep pool", eth: 400, token: 4_000_000 },
  thin: { label: "Thin pool", eth: 4, token: 40_000 },
};
const out = (amount: number, reserveIn: number, reserveOut: number) => (reserveOut * amount) / (reserveIn + amount);
const num = (value: number) => (value >= 1000 ? Math.round(value).toLocaleString("en-US") : value.toFixed(value < 1 ? 4 : 2));

export function PonsDemo() {
  const goal = useGoal();
  const [pool, setPool] = useState<keyof typeof POOLS>("deep");
  const [buy, setBuy] = useState(true);
  const [amount, setAmount] = useState(1);
  const [slip, setSlip] = useState(0.03);
  const [rival, setRival] = useState(0);
  const [phase, setPhase] = useState<"choose" | "review" | "done">("choose");
  const [result, setResult] = useState<{ got: number; ok: boolean }>();

  const { eth, token } = POOLS[pool];
  const [rIn, rOut] = buy ? [eth, token] : [token, eth];
  // Selling the same value as the buy is shown in tokens at the pool's starting price.
  const input = buy ? amount : (amount * token) / eth;
  const spot = rOut / rIn;
  const quote = out(input, rIn, rOut);
  const impact = 1 - quote / input / spot;
  const least = quote * (1 - slip);
  const unitIn = buy ? "ETH" : "tokens";
  const unitOut = buy ? "tokens" : "ETH";

  const run = () => {
    // Another trader trades the same way just before this swap lands: the pool has moved.
    const moved = buy ? { i: rIn + rival, o: rOut - out(rival, rIn, rOut) } : { i: rIn + (rival * token) / eth, o: rOut - out((rival * token) / eth, rIn, rOut) };
    const got = out(input, moved.i, moved.o);
    setResult({ got, ok: got >= least });
    setPhase("done");
    if (got < least) goal("revert");
  };

  return (
    <>
      <Choice label="Pool" value={pool} onChange={(value) => { setPool(value); setPhase("choose"); if (value === "thin") goal("thin"); }} options={Object.entries(POOLS).map(([value, item]) => ({ value: value as keyof typeof POOLS, label: item.label }))} />
      <p className="-mt-3 text-xs text-faint">
        {POOLS[pool].label} holds {num(eth)} ETH. Anyone can launch a Pons token and pools can be thin: HUME lists them and does not vet them.
      </p>
      <Choice label="Direction" value={buy ? "buy" : "sell"} onChange={(value) => { setBuy(value === "buy"); setPhase("choose"); }} options={[{ value: "buy", label: "Buy with ETH" }, { value: "sell", label: "Sell for ETH" }]} />
      <Slider label={buy ? "You pay (ETH)" : "You sell, worth about (ETH)"} value={amount} min={0.05} max={5} step={0.05} onChange={(value) => { setAmount(value); setPhase("choose"); }} display={`${amount.toFixed(2)} ETH`} />

      <div className="rounded-control border border-line bg-ground p-3">
        <Line label="You pay">{num(input)} {unitIn}</Line>
        <Line label="You get (quote)">{num(quote)} {unitOut}</Line>
        <Line label="Price impact"><span className={cn(impact > 0.05 && "text-down")}>{(impact * 100).toFixed(2)}%</span></Line>
        <div className="mt-2 h-2 overflow-hidden rounded-sharp bg-raised" role="img" aria-label={`Price impact ${(impact * 100).toFixed(1)} percent`}>
          <span className={cn("block h-full transition-[width] duration-150", impact > 0.05 ? "bg-down" : "bg-up")} style={{ width: `${Math.min(impact / 0.25, 1) * 100}%` }} />
        </div>
      </div>

      <Steps steps={["Choose", "Review", "Sign"]} current={phase === "choose" ? 0 : phase === "review" ? 1 : 2} />

      {phase === "choose" ? (
        <button type="button" onClick={() => { setPhase("review"); goal("review"); setResult(undefined); }} className="h-11 rounded-control bg-accent text-sm font-medium text-accent-ink transition-colors duration-150 hover:bg-accent-hover active:bg-accent-press">
          Review swap
        </button>
      ) : phase === "review" ? (
        <>
          <div>
            <p className="mb-1.5 text-sm text-muted">Allow the price to slip by up to</p>
            <Choice label="Slippage" value={slip} onChange={setSlip} options={[0.01, 0.03, 0.05].map((value) => ({ value, label: `${value * 100}%` }))} />
          </div>
          <Review onBack={() => setPhase("choose")} onConfirm={run}>
            <Line label="Pay">{num(input)} {unitIn}</Line>
            <Line label="Price impact">{(impact * 100).toFixed(2)}%</Line>
            <Line strong label="Least you will receive">{num(least)} {unitOut}</Line>
            <Line label="HUME fee">None</Line>
          </Review>
          <Slider label="What if a rival buys just before you? (ETH)" value={rival} min={0} max={5} step={0.25} onChange={setRival} display={`${rival.toFixed(2)} ETH`} />
        </>
      ) : (
        <>
          <Note tone={result?.ok ? "up" : "down"}>
            {result?.ok
              ? `Swapped. You received ${num(result.got)} ${unitOut}, at or above your minimum of ${num(least)}.`
              : `The swap stopped. A rival moved the price first, the pool would have paid ${num(result?.got ?? 0)} ${unitOut}, under your minimum of ${num(least)}, so nothing was spent apart from gas. Try a thicker pool or a wider limit.`}
          </Note>
          <button type="button" onClick={() => setPhase("review")} className="h-11 rounded-control border border-line bg-raised text-sm font-medium transition-colors duration-150 hover:border-accent hover:bg-accent-soft hover:text-accent-hover">
            Try the swap again
          </button>
        </>
      )}
    </>
  );
}
