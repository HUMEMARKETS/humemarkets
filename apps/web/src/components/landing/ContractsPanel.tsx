'use client';

import { cn } from '@hume/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowIcon } from '@/components/ArrowIcon';
import { ContractCopyButton } from '@/components/ContractCopyButton';
import { ALL_CONTRACTS } from '@/lib/contracts';
import { env } from '@/lib/env';
import { explorerAddressUrl } from '@/lib/explorer';
import { MONO, SPACED_CAPS } from '@/lib/frame';

const FILTERS = ['All', 'Core', 'Perps', 'Options', 'Risk', 'Lending', 'Pons'] as const;
type Filter = (typeof FILTERS)[number];

const CATEGORY: Record<string, Exclude<Filter, 'All'>> = {
    'Perps engine': 'Perps',
    'Perp position manager': 'Perps',
    'Funding manager': 'Perps',
    'Perp order manager': 'Perps',
    'Options engine': 'Options',
    'Option market': 'Options',
    'Option position manager': 'Options',
    'Risk manager': 'Risk',
    'Liquidation engine': 'Risk',
    'Insurance fund': 'Risk',
    'Oracle router': 'Risk',
    'Price validator': 'Risk',
    'Lending oracle': 'Lending',
    'Lending registry': 'Lending',
    'Lending router': 'Lending',
    'Lending vault': 'Lending',
    'Lending pair': 'Lending',
    'Pons router': 'Pons',
};

/// An implementation sits in the same category as its proxy.
const categoryOf = (label: string): Exclude<Filter, 'All'> =>
    CATEGORY[label.replace(/ implementation$/, '')] ?? 'Core';

/// Every contract, in a panel that slides in from the right, opened by `#contracts`. A reader can
/// search, filter, copy and open each address on the explorer without leaving the page.
export function ContractsPanel({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [filter, setFilter] = useState<Filter>('All');
    const [query, setQuery] = useState('');
    const closeButton = useRef<HTMLButtonElement>(null);
    const dialog = useRef<HTMLElement>(null);

    // While open: focus moves into the panel, Tab stays inside it, Escape closes it, and focus goes back
    // to whatever opened it. The panel is `inert` while closed, so nothing outside can reach it.
    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        closeButton.current?.focus({ preventScroll: true });
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !dialog.current) return;
            const focusable = Array.from(
                dialog.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((element) => element.tabIndex >= 0);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;
            const current = document.activeElement;
            if (event.shiftKey && (current === first || !dialog.current.contains(current))) {
                event.preventDefault();
                last.focus({ preventScroll: true });
            } else if (!event.shiftKey && (current === last || !dialog.current.contains(current))) {
                event.preventDefault();
                first.focus({ preventScroll: true });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
        };
    }, [open, onClose]);

    const rows = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return ALL_CONTRACTS.filter(
            (contract) =>
                (filter === 'All' || categoryOf(contract.label) === filter) &&
                (needle === '' ||
                    contract.label.toLowerCase().includes(needle) ||
                    (contract.address ?? '').toLowerCase().includes(needle)),
        );
    }, [filter, query]);

    return (
        <div
            className={cn(
                'fixed inset-0 z-[70] transition-opacity duration-200',
                open ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            aria-hidden={!open}
            inert={!open}
            data-ui
        >
            <button
                type="button"
                tabIndex={-1}
                aria-label="Close contracts"
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-ground/70"
            />
            <aside
                ref={dialog}
                role="dialog"
                aria-modal="true"
                aria-label="Smart contracts"
                className={cn(
                    'absolute inset-y-0 right-0 flex w-full max-w-[34rem] flex-col border-l border-line bg-surface transition-transform duration-200',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <div className="flex items-start justify-between gap-4 border-b border-line p-5">
                    <div>
                        <p className={cn(SPACED_CAPS, 'text-muted')}>
                            Smart contracts
                        </p>
                        <p className="mt-2 text-muted">
                            All {ALL_CONTRACTS.length} contracts HUME runs on, each proxy with the code behind it.
                            Collateral, positions and settlement are checkable
                            onchain.
                        </p>
                    </div>
                    <button
                        ref={closeButton}
                        type="button"
                        onClick={onClose}
                        tabIndex={open ? 0 : -1}
                        className={cn(
                            SPACED_CAPS,
                            'shrink-0 rounded-sharp border border-line px-3 py-2 text-text transition-colors duration-150 hover:border-accent hover:text-accent-hover',
                        )}
                    >
                        Close
                    </button>
                </div>
                <div className="flex flex-col gap-3 border-b border-line p-5">
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        tabIndex={open ? 0 : -1}
                        placeholder="Search by name or address"
                        aria-label="Search contracts"
                        className="h-11 rounded-control border border-line bg-ground px-3 text-text placeholder:text-faint focus:border-accent"
                    />
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map((name) => (
                            <button
                                key={name}
                                type="button"
                                tabIndex={open ? 0 : -1}
                                aria-pressed={filter === name}
                                onClick={() => setFilter(name)}
                                className={cn(
                                    SPACED_CAPS,
                                    'rounded-sharp border px-3 py-1.5 tracking-[0.18em] transition-colors duration-150',
                                    filter === name
                                        ? 'border-accent bg-accent text-accent-ink'
                                        : 'border-line text-muted hover:border-accent hover:text-accent-hover',
                                )}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
                <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
                    {rows.length === 0 ? (
                        <li className="p-5 text-muted">
                            No contract matches that search.
                        </li>
                    ) : (
                        rows.map((contract) => {
                            const url = contract.address
                                ? explorerAddressUrl(
                                      env.explorerUrl,
                                      contract.address,
                                  )
                                : undefined;
                            return (
                                <li key={contract.label} className="p-5">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className="font-medium">
                                            {contract.label}
                                        </p>
                                        <span
                                            className={cn(
                                                SPACED_CAPS,
                                                'text-[10px] text-faint',
                                            )}
                                        >
                                            {categoryOf(contract.label)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-muted">
                                        {contract.description}
                                    </p>
                                    {contract.address ? (
                                        <div className="mt-3 flex items-start gap-2 rounded-control bg-raised px-3 py-2">
                                            <span
                                                className={cn(
                                                    MONO,
                                                    'flex-1 break-all text-xs text-text',
                                                )}
                                            >
                                                {contract.address}
                                            </span>
                                            <ContractCopyButton
                                                address={contract.address}
                                                label={contract.label}
                                            />
                                            {url ? (
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    tabIndex={open ? 0 : -1}
                                                    aria-label={`View ${contract.label} on the explorer`}
                                                    className="shrink-0 rounded-control p-1 text-muted transition-colors duration-150 hover:bg-accent-soft hover:text-accent-hover"
                                                >
                                                    <ArrowIcon className="size-3.5" />
                                                </a>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <p
                                            className={cn(
                                                MONO,
                                                'mt-3 text-xs text-faint',
                                            )}
                                        >
                                            Not deployed
                                        </p>
                                    )}
                                </li>
                            );
                        })
                    )}
                </ul>
            </aside>
        </div>
    );
}
