'use client';

import { groupForSymbol } from '@hume/config';
import { analyzeStrategy, payoffCurve, type Leg } from '@hume/sdk';
import { Num, SampleBadge, Skeleton, Tabs, cn } from '@hume/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react';
import { ArrowIcon } from '@/components/ArrowIcon';
import { ContractAddressBadge } from '@/components/ContractAddressBadge';
import { LtvBar } from '@/components/LendingView';
import { useCreditMarket, useLeaderboard, usePerpMarkets } from '@/hooks/queries';
import { useAccountMode } from '@/hooks/useAccountMode';
import { CONTRACTS } from '@/lib/contracts';
import { env } from '@/lib/env';
import { explorerAddressUrl } from '@/lib/explorer';
import { fmtSigned, shortHash, signTone } from '@/lib/format';
import { MONO, SPACED_CAPS } from '@/lib/frame';
import { fmtHealth, healthBand, healthFactorBps, healthWords, statusSentence } from '@/lib/lending';
import { groupTabs, inGroup, REGISTRY_ERROR, symbolOf, type GroupTab } from '@/lib/market';
import { useLandingLink } from '@/stores/landing';
import { TRADE_PRODUCTS } from './content';

/// The body of each landing section, below its eyebrow, title and lede (which `LandingStage` draws from
/// `content.ts`). Every figure is read from the registry, the deployment record or the environment.
/// Data-backed bodies cover loading, error, sample and paused.

export interface SectionProps {
    onContracts: () => void;
}

const label = cn(SPACED_CAPS, 'text-faint');
const card = 'rounded-panel border border-line bg-surface/85 backdrop-blur-sm';
const more =
    'group inline-flex items-center gap-2 text-sm font-medium text-text underline decoration-line underline-offset-4 transition-colors duration-150 hover:decoration-text';
const primary =
    'inline-flex h-14 items-center justify-between gap-10 rounded-sharp bg-accent px-6 text-base font-medium text-accent-ink transition-[background-color,box-shadow] duration-150 hover:bg-accent-hover hover:shadow-[0_0_0_3px_var(--color-accent-line),var(--shadow-accent-glow)] active:bg-accent-press active:shadow-none';
const secondary =
    'inline-flex h-14 items-center gap-3 px-2 text-base text-muted transition-colors duration-150 hover:text-text';

function Retry({ onRetry }: { onRetry: () => void }) {
    return (
        <button type="button" onClick={onRetry} className="ml-1 underline underline-offset-4 transition-colors duration-150 hover:text-text">
            Try again
        </button>
    );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
    return (
        <div>
            <dt className={label}>{term}</dt>
            <dd className={cn(MONO, 'mt-1 text-2xl text-text')}>{children}</dd>
        </div>
    );
}

/// The single stats block: markets and the highest leverage from the registry, contracts from the
/// deployment record.
function Facts() {
    const markets = usePerpMarkets();
    const list = markets.data;
    const deployed = CONTRACTS.filter((contract) => Boolean(contract.address)).length;
    const maxLeverage = list?.reduce((max, market) => (market.maxLeverage > max ? market.maxLeverage : max), 0n);
    const paused = list?.filter((market) => !market.active).length ?? 0;
    const value = (text: ReactNode) =>
        markets.isPending ? <Skeleton className="w-10" /> : markets.isError ? '–' : text;
    return (
        <div className="mt-10 max-w-[34rem] border-t border-line pt-5">
            <dl className="flex flex-wrap gap-x-10 gap-y-4">
                <Fact term="Markets">{value(list?.length)}</Fact>
                <Fact term="Max leverage">{value(maxLeverage ? `${maxLeverage}x` : '–')}</Fact>
                <Fact term="Contracts verified">
                    <a href="#contracts" className="underline decoration-line underline-offset-4 transition-colors duration-150 hover:decoration-text">
                        {deployed}
                    </a>
                </Fact>
            </dl>
            {markets.isError ? (
                <p className="mt-3 text-sm text-muted">
                    {REGISTRY_ERROR}
                    <Retry onRetry={() => void markets.refetch()} />
                </p>
            ) : paused > 0 ? (
                <p className="mt-3 text-sm text-muted">{paused} paused. A paused market still prices and refuses new trades.</p>
            ) : null}
        </div>
    );
}

function Hero() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const needle = query.trim();
        router.push(needle ? `/markets?q=${encodeURIComponent(needle)}` : '/markets');
    };
    return (
        <>
            <form
                role="search"
                onSubmit={submit}
                className="mt-8 flex max-w-[30rem] items-center gap-1 rounded-control border border-line bg-surface p-1 transition-colors duration-150 focus-within:border-accent"
            >
                <label htmlFor="landing-search" className="sr-only">
                    Search markets
                </label>
                <input
                    id="landing-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search markets by ticker"
                    autoComplete="off"
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-text outline-none placeholder:text-faint"
                />
                <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sharp bg-accent px-4 text-sm font-medium text-accent-ink transition-colors duration-150 hover:bg-accent-hover active:bg-accent-press"
                >
                    Search
                    <ArrowIcon />
                </button>
            </form>
            <Facts />
        </>
    );
}

/// How many market links the section lists before pointing to the full table.
const MARKET_CHIPS = 24;

function Markets() {
    const markets = usePerpMarkets();
    const [group, setGroup] = useState<GroupTab>('all');
    const rows = useMemo(
        () =>
            (markets.data ?? []).map((market) => {
                const symbol = symbolOf(market.marketId);
                return { market, symbol, group: groupForSymbol(env.chainId, symbol) };
            }),
        [markets.data],
    );
    const tabs = groupTabs(rows);
    const shown = inGroup(rows, group);
    // The globe turns to face the chosen group.
    useEffect(() => {
        useLandingLink.setState({ region: group === 'all' ? [] : inGroup(rows, group).map((row) => row.market.marketId) });
    }, [group, rows]);
    return (
        <div className="mt-8">
            {tabs.length > 0 ? (
                <Tabs
                    tabs={tabs}
                    value={group}
                    onChange={setGroup}
                    label="Market groups"
                />
            ) : null}
            {markets.isPending ? (
                <div aria-busy="true" aria-label="Loading markets" className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: 8 }, (_, index) => (
                        <Skeleton key={index} className="h-8 w-20" />
                    ))}
                </div>
            ) : markets.isError ? (
                <p className="mt-4 text-sm text-muted">
                    {REGISTRY_ERROR}
                    <Retry onRetry={() => void markets.refetch()} />
                </p>
            ) : shown.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No market is listed on this network yet.</p>
            ) : (
                <ul className="mt-4 flex flex-wrap gap-2">
                    {shown.slice(0, MARKET_CHIPS).map(({ market, symbol }) => (
                        <li key={market.marketId}>
                            <Link
                                href={`/perpetuals?market=${symbol}`}
                                className="inline-flex h-8 items-center gap-2 rounded-sharp border border-line bg-surface/85 px-2.5 text-sm text-text transition-colors duration-150 hover:border-text"
                            >
                                {symbol}
                                <span className={cn(MONO, 'text-xs text-faint')}>{market.active ? `${market.maxLeverage}x` : 'Paused'}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <Link href="/markets" className={cn(more, 'mt-5')}>
                {rows.length > 0 ? `Explore all ${rows.length} markets` : 'Explore markets'}
                <ArrowIcon />
            </Link>
        </div>
    );
}

/// The shape of each product's payoff at expiry. These are drawing coordinates, not prices: no figure
/// from here is shown as a number. The maths is the strategy builder's (`@hume/sdk` strategies).
const SHAPES: Leg[][] = [
    [{ kind: 'UNDERLYING', side: 'LONG', quantity: 1, price: 100 }],
    [{ kind: 'CALL', side: 'LONG', strike: 100, quantity: 1, price: 6 }],
    [
        { kind: 'CALL', side: 'LONG', strike: 95, quantity: 1, price: 8 },
        { kind: 'CALL', side: 'SHORT', strike: 110, quantity: 1, price: 3 },
    ],
];

function Payoff({ legs, caption }: { legs: Leg[]; caption: string }) {
    const width = 176;
    const height = 96;
    const low = 70;
    const high = 130;
    const points = payoffCurve(legs, low, high);
    const { breakEvens } = analyzeStrategy(legs);
    const values = points.map(([, value]) => value);
    const top = Math.max(0, ...values);
    const bottom = Math.min(0, ...values);
    const x = (price: number) => ((price - low) / (high - low)) * width;
    const y = (value: number) => 6 + (1 - (value - bottom) / (top - bottom)) * (height - 12);
    // The pointer's price, shared with the 3D price line; the curve's value there is read off its nearest point.
    const share = useLandingLink((state) => state.price);
    const at = share === null ? null : points[Math.round(share * (points.length - 1))];
    return (
        <figure>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Payoff at expiry. ${caption}`} className="w-full overflow-visible">
                <line x1={0} x2={width} y1={y(0)} y2={y(0)} className="stroke-line" strokeDasharray="3 3" />
                <polyline
                    points={points.map(([price, value]) => `${x(price).toFixed(1)},${y(value).toFixed(1)}`).join(' ')}
                    className="fill-none stroke-text"
                    strokeWidth={1.5}
                />
                {at ? (
                    <g aria-hidden="true">
                        <line x1={x(at[0])} x2={x(at[0])} y1={0} y2={height} className="stroke-text" strokeOpacity={0.45} />
                        <circle cx={x(at[0])} cy={y(at[1])} r={2.5} className="fill-text" />
                    </g>
                ) : null}
                {breakEvens
                    .filter((price) => price > low && price < high)
                    .map((price) => (
                        <circle key={price} cx={x(price)} cy={y(0)} r={3} className="fill-ground stroke-text" />
                    ))}
            </svg>
            <figcaption className="mt-2 text-xs leading-snug text-faint">
                {caption} <span aria-hidden="true">○</span> break-even.
            </figcaption>
        </figure>
    );
}

function Trade() {
    const [tab, setTab] = useState('0');
    const index = Number(tab);
    const product = TRADE_PRODUCTS[index] ?? TRADE_PRODUCTS[0]!;
    return (
        <div className="mt-8 max-w-[34rem]">
            <Tabs tabs={TRADE_PRODUCTS.map((item, position) => ({ id: String(position), label: item.label }))} value={tab} onChange={setTab} label="Ways to trade" />
            <div className={cn(card, 'mt-3 grid gap-5 p-5 sm:grid-cols-[1fr_11rem] sm:items-center')}>
                <div>
                    <p className="text-text">{product.lead}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{product.body}</p>
                    <Link href={product.href} className={cn(more, 'mt-4')}>
                        Open {product.label}
                        <ArrowIcon />
                    </Link>
                </div>
                <Payoff legs={SHAPES[index] ?? SHAPES[0]!} caption={product.payoff} />
            </div>
        </div>
    );
}

/// The lending page's health-factor arithmetic over the pair's own limits, or the example limits from the
/// environment while no pair is deployed here.
function Capital() {
    const market = useCreditMarket();
    const deployed = Boolean(env.creditPair);
    const pair = market.data;
    const [share, setShare] = useState(40);
    const maxLtv = pair?.maxLtvBps ?? BigInt(env.creditExample.maxLtvBps);
    const liquidationLtv = pair?.liquidationLtvBps ?? BigInt(env.creditExample.liquidationLtvBps);
    const ltv = BigInt(share) * 100n;
    // Health depends only on the share borrowed, so any collateral value gives the same answer.
    const health = healthFactorBps(10_000n, ltv, liquidationLtv);
    const band = healthBand(health);
    // The 3D gauge needle: nothing borrowed at the left end, the liquidation limit at the right.
    useEffect(() => {
        const limit = Number(liquidationLtv);
        useLandingLink.setState({ gauge: limit > 0 ? Math.min(1, Number(ltv) / limit) : 0 });
    }, [ltv, liquidationLtv]);
    const refusal = pair ? statusSentence(pair.status) : undefined;
    const note = !deployed
        ? 'Example limits: lending is not live on this network yet.'
        : market.isError
          ? 'The lending pair could not be read right now, so these are example limits.'
          : refusal;
    return (
        <div className={cn(card, 'mt-8 max-w-[30rem] p-5')}>
            <p className={label}>Health factor</p>
            {deployed && market.isPending ? (
                <div aria-busy="true" aria-label="Loading the lending pair" className="mt-3 flex flex-col gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="w-56" />
                </div>
            ) : (
                <>
                    <p className="mt-2 flex items-baseline gap-3">
                        <Num className="font-display text-[2.5rem] font-semibold leading-none">{fmtHealth(health)}</Num>
                        <span className="text-sm font-medium text-text">{healthWords[band].label}</span>
                    </p>
                    <label className="mt-4 flex flex-col gap-1 text-xs text-muted">
                        <span>Borrow {share}% of the collateral&apos;s value</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={share}
                            onChange={(event) => setShare(Number(event.target.value))}
                            className="h-11 w-full accent-accent"
                            aria-valuetext={`${share} percent`}
                        />
                    </label>
                    <LtvBar ltv={ltv} maxLtv={maxLtv} liquidationLtv={liquidationLtv} />
                </>
            )}
            {note ? (
                <p className="mt-3 text-xs leading-snug text-muted">
                    {note}
                    {deployed && market.isError ? <Retry onRetry={() => void market.refetch()} /> : null}
                </p>
            ) : null}
            <Link href="/lending" className={cn(more, 'mt-4')}>
                Open lending
                <ArrowIcon />
            </Link>
        </div>
    );
}

function InDevelopment({ title, body }: { title: string; body: string }) {
    return (
        <li className={cn(card, 'p-4')}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-text">{title}</p>
                <SampleBadge label="In development" />
            </div>
            <p className="mt-1 text-sm leading-snug text-muted">{body}</p>
        </li>
    );
}

function Social() {
    const board = useLeaderboard('pnl');
    const sample = Boolean(board.data?.sample);
    const rows = board.data?.entries.slice(0, 3) ?? [];
    const decimals = board.data?.settlementDecimals ?? 0;
    return (
        <div className="mt-8 grid max-w-[34rem] gap-3">
            <div className={card}>
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                    <p className={label}>Top traders by PNL</p>
                    {sample && board.data ? <SampleBadge /> : null}
                </div>
                {board.isPending ? (
                    <div aria-busy="true" aria-label="Loading the leaderboard" className="flex flex-col gap-3 p-4">
                        <Skeleton className="w-full" />
                        <Skeleton className="w-full" />
                        <Skeleton className="w-full" />
                    </div>
                ) : board.isError ? (
                    <p className="p-4 text-sm text-muted">
                        The leaderboard could not be read right now.
                        <Retry onRetry={() => void board.refetch()} />
                    </p>
                ) : rows.length === 0 ? (
                    <p className="p-4 text-sm text-muted">No trader is ranked yet.</p>
                ) : (
                    <ol>
                        {rows.map((entry) => (
                            <li key={entry.wallet} className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-2.5 text-sm last:border-b-0">
                                <span className="flex min-w-0 items-center gap-3">
                                    <span className="w-4 tabular-nums text-faint">{entry.rank}</span>
                                    <span className={cn(MONO, 'truncate text-text')}>
                                        {entry.wallet.startsWith('0x') ? shortHash(entry.wallet) : entry.wallet}
                                    </span>
                                </span>
                                <Num tone={signTone(entry.totalPnl, decimals)}>{fmtSigned(entry.totalPnl, decimals)}</Num>
                            </li>
                        ))}
                    </ol>
                )}
                <div className="border-t border-line px-4 py-3">
                    <Link href="/leaderboard" className={more}>
                        Open the leaderboard
                        <ArrowIcon />
                    </Link>
                </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
                <InDevelopment title="Copy trading" body="Follow a trader you choose, with limits you set." />
                <InDevelopment title="Risk metrics" body="Drawdown and a minimum trade count beside every rank." />
            </ul>
        </div>
    );
}

/// How many contracts the section lists before the full drawer.
const CONTRACT_ROWS = 4;

function Verify({ onContracts }: SectionProps) {
    const markets = usePerpMarkets();
    const listed = CONTRACTS.filter((contract) => Boolean(contract.address));
    const tiers = useMemo(() => {
        const byLeverage = new Map<bigint, string[]>();
        for (const market of markets.data ?? []) {
            byLeverage.set(market.maxLeverage, [...(byLeverage.get(market.maxLeverage) ?? []), symbolOf(market.marketId)]);
        }
        return [...byLeverage.entries()].sort(([a], [b]) => (a === b ? 0 : a > b ? -1 : 1));
    }, [markets.data]);
    const paused = (markets.data ?? []).filter((market) => !market.active).map((market) => symbolOf(market.marketId));
    const lit = useLandingLink((state) => state.contract);
    // A row and its 3D block light together, from a pointer or from keyboard focus.
    const point = (index: number) => ({
        onPointerEnter: () => useLandingLink.setState({ contract: index }),
        onPointerLeave: () => useLandingLink.setState({ contract: -1 }),
        onFocus: () => useLandingLink.setState({ contract: index }),
        onBlur: () => useLandingLink.setState({ contract: -1 }),
    });
    return (
        <div className="mt-8 grid max-w-[34rem] gap-6">
            <div>
                <div className="flex items-center justify-between gap-3">
                    <p className={label}>Contracts</p>
                    <Link href="/docs#verify" className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors duration-150 hover:text-text">
                        Verified source
                        <ArrowIcon />
                    </Link>
                </div>
                {listed.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">No contract is deployed on this network yet.</p>
                ) : (
                    <ul className="mt-2 divide-y divide-line border-y border-line">
                        {listed.slice(0, CONTRACT_ROWS).map((contract) => {
                            const address = contract.address!;
                            const url = explorerAddressUrl(env.explorerUrl, address);
                            const index = CONTRACTS.indexOf(contract);
                            return (
                                <li
                                    key={contract.label}
                                    {...point(index)}
                                    className={cn(
                                        'flex items-center justify-between gap-3 py-2 text-sm transition-colors duration-150',
                                        lit === index && 'bg-surface',
                                    )}
                                >
                                    <span className={cn('text-text', lit === index && 'font-medium')}>{contract.label}</span>
                                    {url ? (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`${contract.label} on the explorer`}
                                            className={cn(MONO, 'inline-flex items-center gap-1.5 text-xs text-muted transition-colors duration-150 hover:text-text')}
                                        >
                                            {shortHash(address)}
                                            <ArrowIcon />
                                        </a>
                                    ) : (
                                        <span className={cn(MONO, 'text-xs text-muted')}>{shortHash(address)}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                <button type="button" onClick={onContracts} className={cn(more, 'mt-3')}>
                    All {CONTRACTS.length} contracts
                    <span aria-hidden="true">+</span>
                </button>
            </div>
            <div>
                <p className={label}>Per-market limits</p>
                {markets.isPending ? (
                    <div aria-busy="true" aria-label="Loading market limits" className="mt-2 flex flex-col gap-2">
                        <Skeleton className="w-64" />
                        <Skeleton className="w-48" />
                    </div>
                ) : markets.isError ? (
                    <p className="mt-2 text-sm text-muted">
                        {REGISTRY_ERROR}
                        <Retry onRetry={() => void markets.refetch()} />
                    </p>
                ) : tiers.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">No market is listed on this network yet.</p>
                ) : (
                    <dl className="mt-2 grid gap-1 text-sm">
                        {tiers.map(([leverage, symbols]) => (
                            <div key={leverage.toString()} className="flex gap-3">
                                <dt className={cn(MONO, 'w-12 shrink-0 text-text')}>{`${leverage}x`}</dt>
                                <dd className="min-w-0 text-muted">
                                    {symbols.length} {symbols.length === 1 ? 'market' : 'markets'}: {symbols.slice(0, 6).join(', ')}
                                    {symbols.length > 6 ? ', …' : ''}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
                {paused.length > 0 ? (
                    <p className="mt-2 text-sm text-muted">Paused: {paused.join(', ')}. A paused market still prices and refuses new trades.</p>
                ) : null}
            </div>
            <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted">The contracts are unaudited. Trade only what you can afford to lose.</p>
                <ContractAddressBadge />
            </div>
        </div>
    );
}

function Vision() {
    return (
        <>
            <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href="/perpetuals" className={primary}>
                    Launch App
                    <ArrowIcon />
                </Link>
                <Link href="/markets" className={secondary}>
                    Explore Markets
                    <ArrowIcon />
                </Link>
            </div>
            <p className="mt-4 text-sm text-muted">No wallet needed to look around. The contracts are unaudited: trade only what you can lose.</p>
        </>
    );
}

/// In section order, matching `SECTIONS`.
export const SECTION_BODIES: ComponentType<SectionProps>[] = [Hero, Markets, Trade, Capital, Social, Verify, Vision];
