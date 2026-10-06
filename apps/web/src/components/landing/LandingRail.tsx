'use client';

import { cn } from '@hume/ui';
import { useEffect, useRef, type MouseEvent, type MutableRefObject } from 'react';
import { SPACED_CAPS } from '@/lib/frame';
import { SECTIONS } from './content';

/// Height of one rail item in px; matches `h-9`. The fill and the marker move in these steps.
const ITEM = 36;
const LAST = SECTIONS.length - 1;

export const railNumber = (index: number) => (index === 0 ? '' : String(index).padStart(2, '0'));

interface Props {
    active: number;
    /// Set by the rail: the stage calls it every frame with the damped progress.
    paint: MutableRefObject<((progress: number) => void) | null>;
    onSelect: (index: number) => void;
    motion: boolean;
    onToggleMotion: () => void;
}

/// The section rail, after robinid.vercel.app. On a wide screen: a vertical list on the left, with a line
/// that fills with the scroll and a marker that slides between items. At phone width: a strip under the
/// header with the current section's name and the same fill. The active item is marked by ink weight
/// and the marker, never by a new colour.
export function LandingRail({ active, paint, onSelect, motion, onToggleMotion }: Props) {
    const fill = useRef<HTMLSpanElement>(null);
    const marker = useRef<HTMLSpanElement>(null);
    const bar = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        paint.current = (progress) => {
            const share = Math.min(1, Math.max(0, progress / LAST));
            if (fill.current) fill.current.style.transform = `scaleY(${share.toFixed(4)})`;
            if (marker.current) marker.current.style.transform = `translate3d(0, ${(share * LAST * ITEM).toFixed(2)}px, 0)`;
            if (bar.current) bar.current.style.transform = `scaleX(${share.toFixed(4)})`;
        };
        return () => {
            paint.current = null;
        };
    }, [paint]);

    const click = (event: MouseEvent, index: number) => {
        event.preventDefault();
        onSelect(index);
    };
    const current = SECTIONS[active] ?? SECTIONS[0]!;

    return (
        <>
            <nav
                aria-label="Landing sections"
                className="pointer-events-none absolute inset-y-0 left-[clamp(40px,4.2vw,112px)] z-30 hidden items-center md:flex"
            >
                <div className="pointer-events-auto relative pl-5">
                    <span aria-hidden="true" className="absolute left-0 w-px bg-line" style={{ top: ITEM / 2, height: LAST * ITEM }} />
                    <span
                        ref={fill}
                        aria-hidden="true"
                        className="absolute left-0 w-px origin-top bg-text"
                        style={{ top: ITEM / 2, height: LAST * ITEM, transform: 'scaleY(0)' }}
                    />
                    <span
                        ref={marker}
                        aria-hidden="true"
                        className="absolute -left-[3px] size-[7px] bg-text"
                        style={{ top: ITEM / 2 - 3.5 }}
                    />
                    <ol>
                        {SECTIONS.map((section, index) => (
                            <li key={section.id}>
                                <a
                                    href={`#${section.id}`}
                                    aria-current={index === active ? 'location' : undefined}
                                    onClick={(event) => click(event, index)}
                                    className={cn(
                                        SPACED_CAPS,
                                        'flex h-9 items-center gap-3 transition-colors duration-150 hover:text-text',
                                        index === active ? 'font-semibold text-text' : 'text-faint',
                                    )}
                                >
                                    <span className="w-5 tabular-nums">{railNumber(index)}</span>
                                    {section.nav}
                                </a>
                            </li>
                        ))}
                    </ol>
                    <button
                        type="button"
                        aria-pressed={motion}
                        onClick={onToggleMotion}
                        className="mt-8 flex items-center gap-2 text-xs text-muted transition-colors duration-150 hover:text-text"
                    >
                        <span aria-hidden="true" className={cn('size-1.5 rounded-pill', motion ? 'bg-text' : 'border border-faint')} />
                        Immersive motion
                    </button>
                </div>
            </nav>

            <div className="absolute inset-x-0 top-24 z-30 border-b border-line bg-ground/80 backdrop-blur-sm md:hidden">
                <p className={cn(SPACED_CAPS, 'flex h-9 items-center justify-between px-4 text-[10px]')}>
                    <a href={`#${current.id}`} onClick={(event) => click(event, active)} className="flex gap-3 text-text">
                        <span className="tabular-nums">{railNumber(active)}</span>
                        {current.nav}
                    </a>
                    <span className="text-faint tabular-nums">
                        {active + 1} / {SECTIONS.length}
                    </span>
                </p>
                <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px origin-left bg-text" ref={bar} style={{ transform: 'scaleX(0)' }} />
            </div>
        </>
    );
}
