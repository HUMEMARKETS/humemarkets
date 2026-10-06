'use client';

import { cn } from '@hume/ui';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePerpMarkets } from '@/hooks/queries';
import { CONTRACTS } from '@/lib/contracts';
import { LANDING_FRAME, SPACED_CAPS } from '@/lib/frame';
import { dampFactor, keyTarget, progressOf, settleTarget } from '@/lib/landingScroll';
import { useTheme } from '@/lib/theme';
import { ContractsPanel } from './ContractsPanel';
import { SECTIONS } from './content';
import type { World } from './LandingCanvas';
import { LandingRail } from './LandingRail';
import { SECTION_BODIES } from './sections';
import { StaticScene } from './StaticScene';

const LandingCanvas = dynamic(
    () => import('./LandingCanvas').then((module) => module.LandingCanvas),
    { ssr: false },
);

const MOTION_KEY = 'hume.landing.motion';
const DEPLOYED = CONTRACTS.map((contract) => Boolean(contract.address));

/// Keys the page itself answers, so a control that uses them keeps them.
const OWN_KEYS = 'input, textarea, select, [role="tablist"], [role="dialog"], [contenteditable="true"]';

const reveal = (distance: number) => {
    // Copy arrives over the last stretch of the camera's travel and lands as the camera settles.
    const t = Math.min(1, Math.max(0, (distance + 0.65) / 0.57));
    return t * t * (3 - 2 * t);
};

/// The landing page: seven sections over one fixed WebGL world. Native scroll moves the page; one
/// damped progress value moves the camera, the rail and the copy together. The text is all in the page,
/// so it reads without WebGL, without motion and without a pointer. Extended motion is allowed here and
/// nowhere else (docs/UI_CONTRACT.md Section 8).
export function LandingStage() {
    const theme = useTheme();
    const markets = usePerpMarkets();
    const scroller = useRef<HTMLDivElement>(null);
    const sectionEls = useRef<(HTMLElement | null)[]>([]);
    const copyEls = useRef<(HTMLDivElement | null)[]>([]);
    const headingEls = useRef<(HTMLHeadingElement | null)[]>([]);
    const world = useRef<World | null>(null);
    const railPaint = useRef<((progress: number) => void) | null>(null);
    const tops = useRef<number[]>([]);
    const target = useRef(0);
    const shown = useRef(0);
    const glide = useRef<{ from: number; to: number } | null>(null);
    const [active, setActive] = useState(0);
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
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setMotion(stored === null ? !reduced : stored === 'on');
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

    // One loop drives everything that moves: the rail, the copy and the camera all read `shown`.
    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const paint = (dt: number) => {
            const progress = shown.current;
            railPaint.current?.(progress);
            copyEls.current.forEach((copy, index) => {
                if (!copy) return;
                const amount = motion ? reveal(progress - index) : 1;
                copy.style.opacity = amount.toFixed(3);
                copy.style.transform = amount >= 1 ? '' : `translate3d(0, ${((1 - amount) * 28).toFixed(1)}px, 0)`;
            });
            world.current?.frame(progress, dt);
        };
        const onScroll = () => {
            target.current = progressOf(el.scrollTop, tops.current);
            if (!motion) {
                shown.current = target.current;
                paint(0);
            }
        };
        const measure = () => {
            tops.current = sectionEls.current.map((section) => section?.offsetTop ?? 0);
            onScroll();
        };
        const stopGlide = () => {
            glide.current = null;
        };
        // Sections settle when a scroll ends close to one, on the same glide as a rail click.
        const onScrollEnd = () => {
            if (glide.current) return;
            const goal = settleTarget(el.scrollTop, tops.current, el.clientHeight);
            if (goal === undefined) return;
            if (motion) glide.current = { from: el.scrollTop, to: goal };
            else el.scrollTop = goal;
        };
        measure();
        if (motion) shown.current = target.current;
        const resize = new ResizeObserver(measure);
        resize.observe(el);
        for (const section of sectionEls.current) if (section) resize.observe(section);
        el.addEventListener('scroll', onScroll, { passive: true });
        el.addEventListener('scrollend', onScrollEnd);
        el.addEventListener('wheel', stopGlide, { passive: true });
        el.addEventListener('touchstart', stopGlide, { passive: true });

        let frame = 0;
        let last = 0;
        const tick = (now: number) => {
            const dt = last === 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
            last = now;
            const k = dampFactor(dt);
            const move = glide.current;
            if (move) {
                // A rail click glides the page on the same curve as the camera, so the two move as one.
                move.from += (move.to - move.from) * k;
                if (Math.abs(move.to - move.from) < 0.5) {
                    el.scrollTop = move.to;
                    stopGlide();
                } else {
                    el.scrollTop = move.from;
                }
                target.current = progressOf(el.scrollTop, tops.current);
            }
            shown.current += (target.current - shown.current) * k;
            paint(dt);
            frame = requestAnimationFrame(tick);
        };
        // The loop runs only while motion is on and the tab is visible.
        const run = () => {
            if (motion && !document.hidden) {
                if (frame === 0) {
                    last = 0;
                    frame = requestAnimationFrame(tick);
                }
            } else if (frame !== 0) {
                cancelAnimationFrame(frame);
                frame = 0;
            }
        };
        document.addEventListener('visibilitychange', run);
        run();
        if (!motion) paint(0);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', run);
            resize.disconnect();
            el.removeEventListener('scroll', onScroll);
            el.removeEventListener('scrollend', onScrollEnd);
            el.removeEventListener('wheel', stopGlide);
            el.removeEventListener('touchstart', stopGlide);
            stopGlide();
        };
    }, [motion]);

    const scrollTo = useCallback(
        (top: number) => {
            const el = scroller.current;
            if (!el) return;
            if (motion) {
                glide.current = { from: el.scrollTop, to: top };
            } else {
                el.scrollTop = top;
            }
        },
        [motion],
    );

    const goTo = useCallback(
        (index: number) => {
            const top = tops.current[index];
            if (top === undefined) return;
            scrollTo(top);
            // Focus follows the section, so a screen reader announces where the page went.
            headingEls.current[index]?.focus({ preventScroll: true });
        },
        [scrollTo],
    );

    // The section crossing the middle of the screen is the active one.
    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
                }
            },
            { root: el, rootMargin: '-49% 0px -50% 0px' },
        );
        for (const section of sectionEls.current) if (section) observer.observe(section);
        return () => observer.disconnect();
    }, []);

    // `#contracts` opens the drawer; a section id in the address opens at that section.
    useEffect(() => {
        const sync = () => {
            const hash = window.location.hash.slice(1);
            setPanel(hash === 'contracts');
            const index = SECTIONS.findIndex((section) => section.id === hash);
            const top = tops.current[index];
            if (index >= 0 && top !== undefined && scroller.current) scroller.current.scrollTop = top;
        };
        sync();
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, []);

    // The address follows the active section, so a section can be linked to and survives a reload.
    useEffect(() => {
        if (window.location.hash === '#contracts') return;
        const hash = active === 0 ? '' : `#${SECTIONS[active]?.id ?? ''}`;
        if (window.location.hash === hash) return;
        window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
    }, [active]);

    // Arrow keys, PageUp/PageDown, Home and End move between sections.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const el = scroller.current;
            if (!el || panel || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const from = event.target instanceof Element ? event.target : null;
            if (from && from !== document.body && !el.contains(from)) return;
            if (from?.closest(OWN_KEYS)) return;
            const goal = keyTarget(event.key, el.scrollTop, tops.current, el.scrollHeight, el.clientHeight);
            if (goal === undefined) return;
            event.preventDefault();
            const index = tops.current.findIndex((top) => Math.abs(top - goal) < 1);
            if (index >= 0) goTo(index);
            else scrollTo(goal);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [panel, goTo, scrollTo]);

    const closePanel = useCallback(() => {
        setPanel(false);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }, []);

    return (
        <div className="relative h-full min-h-[34rem] overflow-hidden bg-ground">
            {motion && !failed ? (
                <LandingCanvas
                    world={world}
                    theme={theme}
                    markets={markets.data?.length ?? 0}
                    deployed={DEPLOYED}
                    onFailed={() => setFailed(true)}
                />
            ) : (
                <StaticScene index={active} />
            )}

            <div
                ref={scroller}
                tabIndex={-1}
                className="absolute inset-0 z-10 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {SECTIONS.map((section, index) => {
                    const Body = SECTION_BODIES[index];
                    return (
                        <section
                            key={section.id}
                            id={section.id}
                            data-index={index}
                            ref={(element) => {
                                sectionEls.current[index] = element;
                            }}
                            aria-labelledby={`${section.id}-title`}
                            className="relative flex min-h-full items-end md:items-center"
                        >
                            <div className={cn(LANDING_FRAME, 'pb-12 pt-[40dvh] md:py-32 md:pl-[calc(clamp(40px,4.2vw,112px)+11rem)]')}>
                                <div
                                    ref={(element) => {
                                        copyEls.current[index] = element;
                                    }}
                                    // On a phone the scene shares the screen with the copy, so the copy sits on the ground.
                                    className="max-w-[40rem] will-change-[opacity,transform] max-md:-mx-4 max-md:bg-ground/90 max-md:px-4 max-md:py-5"
                                >
                                    <p className={cn(SPACED_CAPS, 'flex items-center gap-3 text-muted')}>
                                        <span aria-hidden="true" className="size-1.5 bg-text" />
                                        {section.eyebrow}
                                    </p>
                                    {index === 0 ? (
                                        <h1
                                            id={`${section.id}-title`}
                                            ref={(element) => {
                                                headingEls.current[index] = element;
                                            }}
                                            tabIndex={-1}
                                            className="mt-5 font-display font-bold leading-[0.9] tracking-[-0.04em] text-text outline-none"
                                        >
                                            <span className="block text-[clamp(4rem,min(14vw,22dvh),12rem)]">HUME</span>
                                            <span className="mt-3 block text-[clamp(1.75rem,min(4vw,6dvh),3.5rem)] leading-[1.05] tracking-[-0.03em]">
                                                {section.title}
                                            </span>
                                        </h1>
                                    ) : (
                                        <h2
                                            id={`${section.id}-title`}
                                            ref={(element) => {
                                                headingEls.current[index] = element;
                                            }}
                                            tabIndex={-1}
                                            className="mt-5 font-display text-[clamp(2.25rem,min(5.5vw,9dvh),5.5rem)] font-bold leading-[1] tracking-[-0.04em] text-text outline-none"
                                        >
                                            {section.title}
                                        </h2>
                                    )}
                                    <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-muted sm:text-lg">
                                        {section.lede}
                                    </p>
                                    {Body ? <Body onContracts={() => (window.location.hash = 'contracts')} /> : null}
                                </div>
                            </div>
                        </section>
                    );
                })}
            </div>

            <LandingRail active={active} paint={railPaint} onSelect={goTo} motion={motion} onToggleMotion={toggleMotion} />
            <ContractsPanel open={panel} onClose={closePanel} />
        </div>
    );
}
