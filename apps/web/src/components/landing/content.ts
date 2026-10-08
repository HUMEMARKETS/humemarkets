/// The landing page's copy, one entry per section, in rail order. Numbers never live here: every figure
/// on the page is read from the registry or `packages/config` by the section that shows it.

export interface LandingSection {
    id: string;
    /// The rail label.
    nav: string;
    eyebrow: string;
    title: string;
    lede: string;
}

export const SECTIONS: LandingSection[] = [
    {
        id: 'start',
        nav: 'Start',
        eyebrow: 'Derivatives for tokenized equities',
        title: 'Global markets, onchain.',
        lede: 'Perpetuals, options and lending on tokenized stocks, with a China group and spot trading of Pons tokens. Priced by oracles, settled by contracts, and open for anyone to check.',
    },
    {
        id: 'markets',
        nav: 'Markets',
        eyebrow: '01 / Markets',
        title: 'Every market, one place.',
        lede: 'Every tokenized stock, ETF and crypto asset with a live price feed, grouped by region, including a China group. Each market sets its own leverage cap. While its session is shut, a market shows its last close and refuses new orders.',
    },
    {
        id: 'trade',
        nav: 'Trade',
        eyebrow: '02 / Trade',
        title: 'Take a view.',
        lede: 'Go long or short with a perpetual, buy a call or a put, or combine options into a strategy. The worst case is drawn before you sign.',
    },
    {
        id: 'capital',
        nav: 'Capital',
        eyebrow: '03 / Capital',
        title: 'Put conviction to work.',
        lede: 'Lock a stock token as collateral and borrow against it. One number, the health factor, says how close the loan is to liquidation.',
    },
    {
        id: 'social',
        nav: 'Social',
        eyebrow: '04 / Social',
        title: 'Follow skill, not noise.',
        lede: 'A leaderboard ranked by results, not by followers. Copy trading follows a trader you choose, with limits you set.',
    },
    {
        id: 'verify',
        nav: 'Verify',
        eyebrow: '05 / Verify',
        title: 'Check everything.',
        lede: 'Every contract is listed with its address and a link to the explorer, and every market limit is read from the registry.',
    },
    {
        id: 'vision',
        nav: 'Vision',
        eyebrow: '06 / Vision',
        title: 'Open to anyone. Checkable by everyone.',
        lede: 'The world’s equities as markets anyone can trade, on contracts anyone can read. Pick Robinhood Chain Testnet or Mainnet, then connect a wallet.',
    },
];

export interface TradeProduct {
    label: string;
    lead: string;
    body: string;
    href: string;
    /// What the payoff drawing beside it shows, for a screen reader and as its caption.
    payoff: string;
}

/// The three ways to trade, in the Trade section's tabs. Each tab's payoff drawing is in `sections.tsx`.
export const TRADE_PRODUCTS: TradeProduct[] = [
    {
        label: 'Perpetuals',
        lead: 'Long or short, with leverage.',
        body: 'Pick a market and a side. Margin, fees and the liquidation price are shown before the wallet is asked for anything.',
        href: '/perpetuals',
        payoff: 'Gains and losses move with the price, both ways.',
    },
    {
        label: 'Options',
        lead: 'Calls and puts, cash-settled.',
        body: 'A bought option can lose its premium and no more. Settlement uses the oracle price at expiry.',
        href: '/options',
        payoff: 'A call: the premium is the most it can lose.',
    },
    {
        label: 'Strategies',
        lead: 'Several legs, one view.',
        body: 'Combine options into a spread or a straddle, and see the maximum loss and the break-even first.',
        href: '/strategies',
        payoff: 'A call spread: loss and gain both capped.',
    },
];
