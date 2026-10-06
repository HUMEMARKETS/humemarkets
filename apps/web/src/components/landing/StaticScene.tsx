import type { ReactNode } from 'react';

/// What the landing page shows instead of the WebGL world: with reduced motion, with "Immersive motion"
/// off, or without WebGL. One still line drawing per section, in the page tokens, so it follows the theme.
/// It swaps with the active section and never animates.
const DRAWINGS: ReactNode[] = [
    // Start: the loop mark, open.
    <g key="start">
        <ellipse cx="50" cy="50" rx="26" ry="11" transform="rotate(-18 50 50)" />
        <path d="M30 60 C 40 30, 64 30, 72 44" className="text-text" />
    </g>,
    // Markets: a globe.
    <g key="markets">
        <circle cx="50" cy="50" r="24" />
        <ellipse cx="50" cy="50" rx="10" ry="24" />
        <ellipse cx="50" cy="50" rx="19" ry="24" />
        <path d="M27 42 H73 M27 58 H73" />
        <path d="M50 26 V22 M71 38 l3 -2 M29 62 l-3 2 M66 67 l2 3" className="text-text" />
    </g>,
    // Trade: a payoff at expiry.
    <g key="trade">
        <path d="M22 70 H78 M22 70 V26" />
        <path d="M24 60 H50 L76 32" className="text-text" />
    </g>,
    // Capital: a health gauge.
    <g key="capital">
        <path d="M26 60 A24 24 0 0 1 74 60" className="text-text" />
        <path d="M50 60 L64 44" className="text-text" />
        <path d="M32 72 H68 M32 72 V64 M68 72 V64" />
    </g>,
    // Social: a leader and followers.
    <g key="social">
        <path d="M50 50 L30 34 M50 50 L72 36 M50 50 L28 64 M50 50 L70 68 M30 34 L28 64 M72 36 L70 68" />
        <circle cx="50" cy="50" r="3" className="text-text" />
        <circle cx="30" cy="34" r="1.5" />
        <circle cx="72" cy="36" r="1.5" />
        <circle cx="28" cy="64" r="1.5" />
        <circle cx="70" cy="68" r="1.5" />
    </g>,
    // Verify: contract blocks in a chain.
    <g key="verify">
        {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
                <rect key={`${row}-${col}`} x={28 + col * 9.5} y={32 + row * 9.5} width="6" height="6" className={(row + col) % 3 === 0 ? 'text-text' : undefined} />
            )),
        )}
    </g>,
    // Vision: the loop mark, closed.
    <g key="vision">
        <circle cx="50" cy="50" r="30" />
        <ellipse cx="50" cy="50" rx="22" ry="9" transform="rotate(-18 50 50)" className="text-text" />
        <ellipse cx="50" cy="50" rx="22" ry="9" transform="rotate(30 50 50)" className="text-text" />
    </g>,
];

export function StaticScene({ index }: { index: number }) {
    return (
        <div aria-hidden="true" data-static-scene className="absolute inset-0 overflow-hidden">
            <svg
                viewBox="0 0 100 100"
                className="absolute left-1/2 top-[16%] w-[min(70vw,22rem)] -translate-x-1/2 fill-none stroke-current text-muted md:left-[68%] md:top-1/2 md:w-[min(38vw,34rem)] md:-translate-y-1/2"
                strokeWidth="0.5"
            >
                {DRAWINGS[index] ?? DRAWINGS[0]}
            </svg>
        </div>
    );
}
