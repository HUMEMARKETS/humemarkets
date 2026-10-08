import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppPage } from '@/components/AppPage';
import { ContractsTable } from '@/components/ContractsTable';
import { ChainName } from '@/components/NetworkText';
import { ArrowIcon } from '@/components/ArrowIcon';
import { DocsLiveParameters } from '@/components/DocsLiveParameters';
import { OptionsPreview, PerpPreview, VaultPreview } from '@/components/ProductPreviews';
import { SupportedMarkets } from '@/components/SupportedMarkets';
import { TrustStrip } from '@/components/TrustStrip';
import { env } from '@/lib/env';
import { MONO, SPACED_CAPS } from '@/lib/frame';
import { cn } from '@hume/ui';

export const metadata: Metadata = {
    description:
        'Perpetuals, options, lending, a China market, Pons spot trading, a leaderboard and copy trading on Robinhood Chain: how each works, what it costs, and how to check it yourself.',
};

const STEPS = [
    { title: 'Choose', body: 'Pick a market and a side, or an option series and a strike.' },
    { title: 'Review', body: 'See the size, the fees and the worst case before the wallet is asked for anything.' },
    { title: 'Sign', body: 'One signature in your wallet. Nothing is signed without a review first.' },
    { title: 'Settle', body: 'Margin, funding and PnL settle onchain, and every step can be checked on the explorer.' },
];

const FAQ = [
    {
        q: 'Is HUME audited?',
        a: 'No. The contracts are unaudited, so trade only what you can lose. Every contract is listed in full below so you can read it on the explorer.',
    },
    {
        q: 'Can I try it without risking money?',
        a: 'Yes. Choose Robinhood Chain Testnet in the header. It uses test tokens with no value and mock prices; the header shows which network you are on. Mainnet uses real funds.',
    },
    {
        q: 'Which markets can I trade?',
        a: 'Tokenized stocks, ETFs and crypto assets, in groups such as US, China and crypto. China-linked names without a Chainlink feed show a reference price and have no trade buttons. Pons tokens trade as spot, not as perpetuals.',
    },
    {
        q: 'Can I copy another trader?',
        a: 'Yes, where copy trading is switched on. You pick a trader and a budget, set limits, and review them before you sign. Trades are copied into a separate account. HUME cannot withdraw from it, and you can stop at any time.',
    },
    {
        q: 'What happens when a market is paused?',
        a: 'It still renders and still prices. It refuses new trades, and the page says why in plain words.',
    },
    {
        q: 'Where do prices come from?',
        a: 'An oracle router supplies the mark and index price every contract reads, and a price validator rejects stale or out-of-bounds prices before they are used.',
    },
    {
        q: 'How are options settled?',
        a: 'In cash, at expiry, from the oracle price. Nothing is delivered and nothing is left to a counterparty.',
    },
    {
        q: 'Who can liquidate a position?',
        a: 'Anyone can liquidate an eligible position for a reward. An insurance fund covers a shortfall so bad debt stays rare.',
    },
];

/// The three product modules, each beside its preview. They were the landing page's chapters before the
/// UI rework; this page is now their only reader.
interface Module {
    id: string;
    eyebrow: string;
    title: [string, string];
    summary: string;
    tabs: { label: string; lead: string; body: string }[];
    link?: { href: string; label: string };
}

const MODULES: Module[] = [
    {
        id: 'perpetuals',
        eyebrow: '01 / Perpetuals, plainly',
        title: ['Long or short.', '24 hours, 5 days.'],
        summary:
            'Take either side of a tokenized stock with leverage. No broker and no waiting. Prices update 24 hours a day, 5 days a week. When a feed is stale, the market shows its last close and refuses new orders.',
        tabs: [
            {
                label: 'Choose',
                lead: 'Start with a market and a side.',
                body: 'Pick a tokenized stock, go long or short, and set the size. Margin and leverage stay inside the limits the market sets.',
            },
            {
                label: 'Review',
                lead: 'See it before you sign.',
                body: 'Size, fees and the liquidation price are shown before the wallet is asked for anything. A paused market still prices and refuses the trade.',
            },
            {
                label: 'Confirm',
                lead: 'One signature.',
                body: 'The position opens against the shared vault. Margin, funding and PnL settle onchain, and you can verify every step.',
            },
        ],
        link: { href: '/perpetuals', label: 'Open the terminal' },
    },
    {
        id: 'options',
        eyebrow: '02 / Options, defined',
        title: ['Know the risk.', 'Before you trade.'],
        summary:
            'Calls and puts on tokenized stocks, with the worst case drawn before you buy.',
        tabs: [
            {
                label: 'Chain',
                lead: 'Every series in one view.',
                body: 'Browse calls and puts by expiry and strike, with the premium and the greeks beside each one.',
            },
            {
                label: 'Payoff',
                lead: 'The shape of the trade.',
                body: 'Maximum loss, break-even and payoff at expiry are shown up front, for a single option or a strategy built from several.',
            },
            {
                label: 'Settle',
                lead: 'Cash-settled at expiry.',
                body: 'Settlement is computed onchain from the oracle price at expiry. Nothing is delivered and nothing is left to a counterparty.',
            },
        ],
        link: { href: '/options', label: 'Open the option chain' },
    },
    {
        id: 'vault',
        eyebrow: '03 / One vault, explained',
        title: ['One vault.', 'Every position.'],
        summary:
            'Collateral, positions and credit share one onchain vault, so what you hold is what backs what you owe.',
        tabs: [
            {
                label: 'Collateral',
                lead: 'Deposit once.',
                body: 'Collateral sits in the vault and backs your perpetual and option positions. Withdraw what is free at any time.',
            },
            {
                label: 'Credit',
                lead: 'Lend and borrow, capped.',
                body: 'Lend, or borrow against a stock token. Caps are deliberately small at launch, and a paused pair stays visible and refuses new loans.',
            },
            {
                label: 'Health',
                lead: 'Risk in plain sight.',
                body: 'Health factor and liquidation price are shown for every position, so danger is visible before it is urgent.',
            },
        ],
        link: { href: '/lending', label: 'Open lending' },
    },
];

interface More {
    title: string;
    body: string;
    href?: string;
    action: string;
}

/// The features that are not one of the three product modules above. A feature that is switched off on this
/// build has no link, so nobody is sent to a page that is not there.
const MORE: More[] = [
    {
        title: 'China market',
        body: 'The largest group on HUME: China-linked stocks and ETFs, each with a live price. Names with a Chainlink feed trade like any other perpetual; the rest are priced from the Robinhood reference quote.',
        href: '/markets?group=china',
        action: 'See the China group',
    },
    {
        title: 'Pons market',
        body: 'Buy and sell Pons tokens for ETH without leaving HUME. Each swap shows its price, its price impact and the least you will receive before you sign.',
        href: '/pons',
        action: 'Open Pons',
    },
    {
        title: 'Leaderboard and PNL card',
        body: 'Traders ranked by PNL, ROI or volume. A closed position becomes a card you can share.',
        href: '/leaderboard',
        action: 'Open the leaderboard',
    },
    {
        title: 'Copy trading',
        body: 'Follow a trader you choose, with a budget and limits you set. Skipped trades are shown with the reason, and you can stop and withdraw at any time.',
        href: env.copyTrading ? '/copy' : undefined,
        action: 'Open copy trading',
    },
];

const PREVIEWS: Record<string, ReactNode> = {
    perpetuals: <PerpPreview className="h-full" />,
    options: <OptionsPreview className="h-full" />,
    vault: <VaultPreview className="h-full" />,
};

function Block({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
    return (
        <section id={id} aria-labelledby={`${id ?? eyebrow}-title`} className="scroll-mt-6 border-t border-line py-12 first:border-t-0 first:pt-0 lg:py-16">
            <p className={cn(SPACED_CAPS, 'text-muted')}>{eyebrow}</p>
            <h2 id={`${id ?? eyebrow}-title`} className="mt-3 font-display text-[1.75rem] font-bold leading-[1.08] tracking-[-0.03em] text-text sm:text-[2.5rem]">
                {title}
            </h2>
            <div className="mt-8">{children}</div>
        </section>
    );
}

export default function FeaturesPage() {
    return (
        <AppPage title="Features" description="What HUME does, what it costs, and how to check it yourself.">
            <TrustStrip className="mb-12" />

            {MODULES.map((section, index) => (
                <Block key={section.id} id={section.id} eyebrow={section.eyebrow} title={section.title.join(' ')}>
                    <div className={cn('grid gap-8 lg:grid-cols-2 lg:gap-12', index % 2 === 1 && 'lg:[&>*:first-child]:order-2')}>
                        <div className="flex flex-col gap-6">
                            <p className="max-w-[34rem] text-lg leading-relaxed text-muted">{section.summary}</p>
                            <ul className="flex flex-col gap-5">
                                {section.tabs.map((tab) => (
                                    <li key={tab.label} className="border-l border-line pl-4">
                                        <p className="text-text">{tab.lead}</p>
                                        <p className="mt-1 text-muted">{tab.body}</p>
                                    </li>
                                ))}
                            </ul>
                            {section.link ? (
                                <Link href={section.link.href} className="group inline-flex items-center gap-2 text-sm text-accent-hover transition-colors duration-150 hover:text-text">
                                    {section.link.label}
                                    <ArrowIcon className="size-3 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </Link>
                            ) : null}
                        </div>
                        <div>{PREVIEWS[section.id]}</div>
                    </div>
                </Block>
            ))}

            <Block id="more" eyebrow="04 / More on HUME" title="Markets, spot and community.">
                <ul className="grid gap-4 sm:grid-cols-2">
                    {MORE.map((item) => (
                        <li key={item.title} className="flex flex-col rounded-panel border border-line/70 bg-surface p-5">
                            <p className="text-lg font-medium">{item.title}</p>
                            <p className="mt-2 flex-1 text-muted">{item.body}</p>
                            {item.href ? (
                                <Link href={item.href} className="group mt-4 inline-flex items-center gap-2 text-sm text-accent-hover transition-colors duration-150 hover:text-text">
                                    {item.action}
                                    <ArrowIcon className="size-3 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </Link>
                            ) : null}
                        </li>
                    ))}
                </ul>
            </Block>

            <Block id="how-it-works" eyebrow="How it works" title="Four steps, one signature.">
                <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map((step, index) => (
                        <li key={step.title} className="rounded-panel border border-line/70 bg-surface p-5">
                            <p className={cn(MONO, 'text-xs tracking-[0.18em] text-faint')}>{String(index + 1).padStart(2, '0')}</p>
                            <p className="mt-3 text-lg font-medium">{step.title}</p>
                            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                        </li>
                    ))}
                </ol>
            </Block>

            <Block id="risk" eyebrow="Risk and fees" title="The limits are on the page.">
                <div className="flex flex-col gap-6">
                    <p className="max-w-[44rem] text-lg leading-relaxed text-muted">
                        Fees, leverage tiers and caps are set per market and can change, so they are read from the chain when this page opens
                        and never written here. A paused market keeps rendering and pricing, and refuses the trade. Caps are deliberately
                        small at launch.
                    </p>
                    <DocsLiveParameters />
                    <Link href="/docs#parameters" className="group inline-flex items-center gap-2 text-sm text-accent-hover transition-colors duration-150 hover:text-text">
                        How these are used
                        <ArrowIcon className="size-3 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </Block>

            <Block id="markets" eyebrow="Markets" title="Every market, listed on the registry.">
                <SupportedMarkets />
            </Block>

            <Block id="contracts" eyebrow="Verify it" title={<>Every contract, on <ChainName />.</>}>
                <ContractsTable />
            </Block>

            {/* The token and ecosystem section goes here once its details are decided. */}

            <Block id="faq" eyebrow="Questions" title="Plain answers.">
                <div className="divide-y divide-line rounded-panel border border-line/70 bg-surface">
                    {FAQ.map((item) => (
                        <details key={item.q} className="group px-5 py-4">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                                {item.q}
                                <span aria-hidden="true" className="text-xl leading-none text-muted transition-transform duration-150 group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 max-w-[44rem] leading-relaxed text-muted">{item.a}</p>
                        </details>
                    ))}
                </div>
            </Block>

            <section aria-label="Next step" className="flex flex-wrap items-center justify-between gap-6 border-t border-line py-12">
                <div>
                    <p className="font-display text-[1.75rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.25rem]">Verify it. Then trade.</p>
                    <p className="mt-2 text-muted">Pick testnet or mainnet in the header, then connect a wallet.</p>
                </div>
                <Link
                    href="/perpetuals"
                    className="inline-flex h-14 items-center justify-between gap-10 rounded-sharp bg-accent px-6 text-base font-medium text-accent-ink transition-[background-color,box-shadow] duration-150 hover:bg-accent-hover hover:shadow-[0_0_0_3px_var(--color-accent-line),var(--shadow-accent-glow)] active:bg-accent-press active:shadow-none"
                >
                    Open App
                    <ArrowIcon />
                </Link>
            </section>
        </AppPage>
    );
}
