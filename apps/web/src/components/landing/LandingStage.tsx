'use client';

import { cn } from '@hume/ui';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { ArrowIcon } from '@/components/ArrowIcon';
import { ContractAddressBadge } from '@/components/ContractAddressBadge';
import { TrustStrip } from '@/components/TrustStrip';
import { PAGE_FRAME, SPACED_CAPS } from '@/lib/frame';
import { X_URL } from '@/lib/social';
import { ContractsPanel } from './ContractsPanel';
import { SECTIONS } from './content';
import { StaticScene } from './StaticScene';

const LandingCanvas = dynamic(
    () => import('./LandingCanvas').then((module) => module.LandingCanvas),
    { ssr: false },
);

const MOTION_KEY = 'hume.landing.motion';
const pad = (index: number) => String(index).padStart(2, '0');

const primary =
    'inline-flex h-14 items-center justify-between gap-10 rounded-sharp bg-accent px-6 text-base font-medium text-accent-ink transition-[background-color,box-shadow] duration-150 hover:bg-accent-hover hover:shadow-[0_0_0_3px_var(--color-accent-line),var(--shadow-accent-glow)] active:bg-accent-press active:shadow-none';
const secondary =
    'inline-flex h-14 items-center gap-3 px-2 text-base text-muted transition-colors duration-150 hover:text-text';

function Plus() {
    return (
        <span aria-hidden="true" className="text-xl leading-none">
            +
        </span>
    );
}

/// The landing page: five full-height sections that snap as you scroll, one shared WebGL canvas
/// behind them, and a numbered rail at the bottom. All five sections are in the page at once, so
/// the text reads without WebGL, without motion and without a pointer; the canvas only adds the
/// scene. Extended motion is allowed here and nowhere else (docs/UI_CONTRACT.md Section 8).
export function LandingStage() {
    const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
    const sectionEls = useRef<(HTMLElement | null)[]>([]);
    const progress = useRef(0);
    const [active, setActive] = useState(0);
    const [tabs, setTabs] = useState<number[]>(() => SECTIONS.map(() => 0));
    const [hover, setHover] = useState<number | null>(null);
    const [motion, setMotion] = useState(true);
    const [failed, setFailed] = useState(false);
    const [panel, setPanel] = useState(false);

    useEffect(() => {
        let stored: string | null = null;
        try {
            stored = window.localStorage.getItem(MOTION_KEY);
        } catch {
            stored = null;
        }
        const reduced = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        setMotion(stored === null ? !reduced : stored === 'on');
    }, []);

    useEffect(() => {
        const sync = () => setPanel(window.location.hash === '#contracts');
        sync();
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, []);

    // A section id in the address (`/#vault`) opens at that section, and a rail move writes it back, so a
    // section can be linked to and survives a reload. `#contracts` belongs to the drawer, not a section.
    useEffect(() => {
        const toHash = () => {
            const index = SECTIONS.findIndex(
                (section) => section.id === window.location.hash.slice(1),
            );
            if (index >= 0) {
                sectionEls.current[index]?.scrollIntoView({ block: 'start' });
            }
        };
        toHash();
        window.addEventListener('hashchange', toHash);
        return () => window.removeEventListener('hashchange', toHash);
    }, []);

    useEffect(() => {
        if (window.location.hash === '#contracts') return;
        const id = SECTIONS[active]?.id;
        const hash = active === 0 || !id ? '' : `#${id}`;
        if (window.location.hash === hash) return;
        window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search + hash,
        );
    }, [active]);

    const closePanel = useCallback(() => {
        setPanel(false);
        window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search,
        );
    }, []);

    const toggleMotion = () => {
        const next = !motion;
        setMotion(next);
        try {
            window.localStorage.setItem(MOTION_KEY, next ? 'on' : 'off');
        } catch {
            // Storage can be blocked; the toggle still works for this visit.
        }
    };

    const onScroll = useCallback(() => {
        if (!scroller) return;
        const tops = sectionEls.current.map((element) => element?.offsetTop ?? 0);
        const top = scroller.scrollTop;
        let index = 0;
        tops.forEach((start, position) => {
            if (top >= start - 1) index = position;
        });
        const start = tops[index] ?? 0;
        const end = tops[index + 1];
        progress.current =
            end === undefined
                ? index
                : index + Math.min(1, Math.max(0, (top - start) / (end - start)));
        const nearest = Math.round(progress.current);
        setActive((current) => (current === nearest ? current : nearest));
    }, [scroller]);

    useEffect(() => {
        onScroll();
    }, [onScroll]);

    const goTo = (index: number) => {
        const target = sectionEls.current[
            Math.max(0, Math.min(SECTIONS.length - 1, index))
        ];
        target?.scrollIntoView({
            behavior: motion ? 'smooth' : 'auto',
            block: 'start',
        });
    };

    const selectTab = (section: number, tab: number) => {
        setTabs((current) => current.map((value, index) => (index === section ? tab : value)));
    };

    const onTabKey = (event: KeyboardEvent, section: number, count: number) => {
        const current = tabs[section] ?? 0;
        const next =
            event.key === 'ArrowRight'
                ? (current + 1) % count
                : event.key === 'ArrowLeft'
                  ? (current + count - 1) % count
                  : null;
        if (next === null) return;
        event.preventDefault();
        selectTab(section, next);
        document.getElementById(`tab-${section}-${next}`)?.focus();
    };

    const current = SECTIONS[active] ?? SECTIONS[0]!;
    const previous = SECTIONS[active - 1];
    const next = SECTIONS[active + 1];

    return (
        <div className="relative h-full min-h-[34rem] overflow-hidden bg-ground">
            {failed ? <StaticScene /> : (
                <LandingCanvas
                    progress={progress}
                    active={active}
                    tab={tabs[active] ?? 0}
                    hover={hover}
                    motion={motion}
                    hotspotLabels={current.tabs.map((tab) => tab.label)}
                    pointerTarget={scroller}
                    onHover={setHover}
                    onSelect={(tab) => selectTab(active, tab)}
                    onFailed={() => setFailed(true)}
                />
            )}

            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[68%] bg-gradient-to-t from-ground from-65% to-transparent md:hidden"
            />

            <div
                ref={setScroller}
                onScroll={onScroll}
                tabIndex={0}
                role="region"
                aria-label="Hume, in five sections"
                className={cn(
                    'absolute inset-0 z-10 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] focus-visible:outline-offset-[-2px] [&::-webkit-scrollbar]:hidden',
                    motion && 'scroll-smooth',
                )}
            >
                {SECTIONS.map((section, index) => {
                    const isActive = index === active;
                    const tab = tabs[index] ?? 0;
                    const detail = section.tabs[tab];
                    const Heading = index === 0 ? 'h1' : 'h2';
                    return (
                        <section
                            key={section.id}
                            id={section.id}
                            ref={(element) => {
                                sectionEls.current[index] = element;
                            }}
                            aria-labelledby={`${section.id}-title`}
                            inert={!isActive}
                            className="relative flex min-h-full snap-start items-end md:items-center"
                        >
                            <div
                                className={cn(
                                    PAGE_FRAME,
                                    'pb-20 pt-24 md:pb-44 md:pt-32',
                                )}
                            >
                                <div
                                    data-ui
                                    className={cn(
                                        'max-w-[46rem] transition-[opacity,transform] duration-700',
                                        isActive
                                            ? 'translate-y-0 opacity-100'
                                            : 'translate-y-4 opacity-0',
                                    )}
                                >
                                    <p
                                        className={cn(
                                            SPACED_CAPS,
                                            'flex items-center gap-3 text-muted',
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="size-1.5 bg-text"
                                        />
                                        {section.eyebrow}
                                    </p>
                                    <Heading
                                        id={`${section.id}-title`}
                                        className="mt-5 font-display text-[clamp(2.5rem,min(6vw,11dvh),6.75rem)] font-bold md:whitespace-nowrap leading-[0.98] tracking-[-0.04em] text-text"
                                    >
                                        {section.title[0]}
                                        <br />
                                        {section.title[1]}
                                    </Heading>
                                    <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-muted sm:text-lg">
                                        {section.summary}
                                    </p>

                                    {section.tabs.length > 0 ? (
                                        <div className="mt-8 max-w-[28rem]">
                                            <div
                                                role="tablist"
                                                aria-label={`${section.nav} steps`}
                                                className="flex border-b border-line"
                                            >
                                                {section.tabs.map((item, position) => {
                                                    const selected = position === tab;
                                                    return (
                                                        <button
                                                            key={item.label}
                                                            id={`tab-${index}-${position}`}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={selected}
                                                            aria-controls={`panel-${index}`}
                                                            tabIndex={selected ? 0 : -1}
                                                            onClick={() => selectTab(index, position)}
                                                            onKeyDown={(event) =>
                                                                onTabKey(event, index, section.tabs.length)
                                                            }
                                                            onPointerEnter={() =>
                                                                isActive && setHover(position)
                                                            }
                                                            onPointerLeave={() => setHover(null)}
                                                            className={cn(
                                                                '-mb-px flex flex-1 items-center gap-2 border-b py-3 text-left text-sm transition-colors duration-150',
                                                                selected
                                                                    ? 'border-text text-text'
                                                                    : 'border-transparent text-faint hover:text-text',
                                                            )}
                                                        >
                                                            <span className="text-[11px] tracking-[0.18em] text-faint">
                                                                {pad(position + 1)}
                                                            </span>
                                                            {item.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div
                                                id={`panel-${index}`}
                                                role="tabpanel"
                                                aria-labelledby={`tab-${index}-${tab}`}
                                                className="pt-5"
                                            >
                                                <p className="text-text">{detail?.lead}</p>
                                                <p className="mt-2 leading-relaxed text-muted">
                                                    {detail?.body}
                                                </p>
                                            </div>
                                            {section.link ? (
                                                <Link
                                                    href={section.link.href}
                                                    className="group mt-6 inline-flex items-center gap-2 text-sm text-accent-hover transition-colors duration-150 hover:text-text"
                                                >
                                                    {section.link.label}
                                                    <ArrowIcon className="size-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </Link>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {index === 0 ? (
                                        <>
                                            <div className="mt-9 flex flex-wrap items-center gap-4">
                                                <Link href="/perpetuals" className={primary}>
                                                    Open app
                                                    <ArrowIcon />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => goTo(1)}
                                                    className={secondary}
                                                >
                                                    Explore Hume
                                                    <Plus />
                                                </button>
                                            </div>
                                            <ContractAddressBadge className="mt-6 md:hidden" />
                                            <TrustStrip className="mt-12 max-w-[46rem] max-md:hidden" />
                                        </>
                                    ) : null}
                                    {index === SECTIONS.length - 1 ? (
                                        <div className="mt-9 flex flex-wrap items-center gap-4">
                                            <Link href="/perpetuals" className={primary}>
                                                Open app
                                                <ArrowIcon />
                                            </Link>
                                            <a href="#contracts" className={secondary}>
                                                View contracts
                                                <Plus />
                                            </a>
                                            <Link href="/features" className={secondary}>
                                                All features
                                                <Plus />
                                            </Link>
                                        </div>
                                    ) : null}
                                    {index === SECTIONS.length - 1 ? (
                                        <TrustStrip className="mt-8 max-w-[40rem] md:hidden" />
                                    ) : null}
                                </div>
                            </div>
                        </section>
                    );
                })}
            </div>

            <div
                key={current.id}
                aria-hidden="true"
                className="pointer-events-none absolute bottom-40 left-[52%] z-20 hidden animate-[landing-fade_0.7s_ease-out] md:block"
            >
                <p className={cn(SPACED_CAPS, 'flex items-center gap-3 text-text')}>
                    <span className="text-base leading-none">+</span>
                    {current.caption[0]}
                </p>
                <p className="mt-1 pl-6 text-xs text-faint">{current.caption[1]}</p>
            </div>

            <div
                className={cn(
                    PAGE_FRAME,
                    'absolute inset-x-0 bottom-[4.5rem] z-20 hidden items-center gap-4 md:flex',
                )}
            >
                <button
                    type="button"
                    aria-pressed={motion}
                    onClick={toggleMotion}
                    className="flex items-center gap-2 text-xs text-muted transition-colors duration-150 hover:text-text"
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-1.5 rounded-pill',
                            motion ? 'bg-text' : 'border border-faint',
                        )}
                    />
                    Immersive motion
                </button>
            </div>

            <nav
                aria-label="Landing sections"
                className="absolute inset-x-0 bottom-0 z-30 bg-ground/70 backdrop-blur-sm"
            >
                <div className={PAGE_FRAME}>
                    <div className="hidden h-11 items-center justify-between gap-6 md:flex">
                        <a
                            href={X_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted transition-colors duration-150 hover:text-text"
                        >
                            @HumeRH
                        </a>
                        <div className="flex items-center gap-5 text-xs">
                            <button
                                type="button"
                                disabled={!previous}
                                onClick={() => goTo(active - 1)}
                                className="flex items-center gap-2 text-muted transition-colors duration-150 hover:text-text disabled:opacity-30"
                            >
                                {previous ? <ArrowIcon className="size-3 rotate-180" /> : null}
                                <span className="sr-only">Previous: </span>
                                {previous?.nav ?? ''}
                            </button>
                            <button
                                type="button"
                                disabled={!next}
                                onClick={() => goTo(active + 1)}
                                className="flex items-center gap-2 text-text transition-colors duration-150 hover:text-accent-hover disabled:opacity-30"
                            >
                                <span className="sr-only">Next: </span>
                                {next?.nav ?? ''}
                                {next ? <ArrowIcon className="size-3" /> : null}
                            </button>
                        </div>
                    </div>
                    <ol className="flex border-t border-line">
                        {SECTIONS.map((section, index) => {
                            const isActive = index === active;
                            return (
                                <li key={section.id} className={cn('relative min-w-0 md:flex-1', isActive ? 'flex-[2.6]' : 'flex-1')}>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'absolute inset-x-0 -top-px h-px transition-colors duration-300',
                                            isActive ? 'bg-text' : 'bg-transparent',
                                        )}
                                    />
                                    <button
                                        type="button"
                                        aria-current={isActive ? 'step' : undefined}
                                        aria-label={`${pad(index)} ${section.nav}`}
                                        onClick={() => goTo(index)}
                                        className={cn(
                                            'flex h-14 w-full items-center gap-3 border-l border-line px-3 text-left text-xs transition-colors duration-150 first:border-l-0 md:h-[4.5rem] md:px-4 md:text-[13px]',
                                            isActive ? 'text-text' : 'text-faint hover:text-text',
                                        )}
                                    >
                                        <span className="text-[11px] tracking-[0.18em]">{pad(index)}</span>
                                        <span className={cn('truncate', isActive ? 'inline' : 'hidden md:inline')}>{section.nav}</span>
                                        {isActive ? (
                                            <span
                                                aria-hidden="true"
                                                className="ml-auto hidden size-1 rounded-pill bg-text md:block"
                                            />
                                        ) : null}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </nav>

            <ContractsPanel open={panel} onClose={closePanel} />
        </div>
    );
}
