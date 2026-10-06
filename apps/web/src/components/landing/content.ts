export interface LandingTab {
    label: string;
    lead: string;
    body: string;
}

export interface LandingSection {
    id: string;
    nav: string;
    eyebrow: string;
    title: [string, string];
    summary: string;
    caption: [string, string];
    tabs: LandingTab[];
    link?: { href: string; label: string };
}

export const SECTIONS: LandingSection[] = [
    {
        id: 'beginning',
        nav: 'The beginning',
        eyebrow: 'Onchain derivatives for stock tokens',
        title: ['Equities,', 'unchained.'],
        summary:
            'Perpetuals and options on tokenized stocks. Priced in real time, settled onchain, built for Robinhood Chain.',
        caption: ['The HUME landscape', 'A perspective on the HUME architecture'],
        tabs: [],
    },
    {
        id: 'perpetuals',
        nav: 'Trade perpetuals',
        eyebrow: '01 / Perpetuals, plainly',
        title: ['Long or short.', '24 hours, 5 days.'],
        summary:
            'Take either side of a tokenized stock with leverage. No broker and no waiting. Prices update 24 hours a day, 5 days a week. When a feed is stale, the market shows its last close and refuses new orders.',
        caption: ['The perpetuals architecture', 'Three steps between you and a position'],
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
        nav: 'Price options',
        eyebrow: '02 / Options, defined',
        title: ['Know the risk.', 'Before you trade.'],
        summary:
            'Calls and puts on tokenized stocks, with the worst case drawn before you buy.',
        caption: ['The options architecture', 'A series, a payoff, a settlement'],
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
        nav: 'One vault',
        eyebrow: '03 / One vault, explained',
        title: ['One vault.', 'Every position.'],
        summary:
            'Collateral, positions and credit share one onchain vault, so what you hold is what backs what you owe.',
        caption: ['The vault design', 'Collateral, credit and health, one ledger'],
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
    {
        id: 'move',
        nav: 'Make your move',
        eyebrow: '04 / Make your move',
        title: ['Verify it.', 'Then trade.'],
        summary:
            'Every contract HUME runs on is listed in full. Try sample mode first, no wallet needed. The contracts are unaudited: trade only what you can lose.',
        caption: ['The landscape ahead', 'Sample mode and mainnet, side by side'],
        tabs: [],
    },
];
