"use client";

import { Num, cn } from "@hume/ui";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SPACED_CAPS } from "@/lib/frame";
import { TAPE_MAX, TAPE_MIN, TAPE_PATH, TAPE_STEP_MS, clampTape, nearestTapeStep } from "@/lib/preview";

type Tape = { pct: number; set: (pct: number) => void; hold: (held: boolean) => void };

/// With no stage around it a preview sits at its entry price, which is how it rendered before the tape.
const TapeContext = createContext<Tape>({ pct: 0, set: () => undefined, hold: () => undefined });

/// The price move, in percent from entry, that the product previews on the page read, and the way to move it.
export const usePriceTape = () => useContext(TapeContext);

/// Wraps a preview so the tape stands still while the pointer or focus is on it, long enough to read it.
export function TapeHold({ children }: { children: ReactNode }) {
  const { hold } = usePriceTape();
  return (
    <div onPointerEnter={() => hold(true)} onPointerLeave={() => hold(false)} onFocus={() => hold(true)} onBlur={() => hold(false)}>
      {children}
    </div>
  );
}

const span = TAPE_MAX - TAPE_MIN;
const at = (pct: number) => `${((pct - TAPE_MIN) / span) * 100}%`;
const sign = (pct: number) => (pct > 0 ? "+" : pct < 0 ? "−" : "");

/// One price that moves the perpetual, the option and the vault together, so "one vault, every position"
/// can be watched and not only read. It plays a short script of ticks, one step at a time like a market,
/// and hands over to the visitor the moment they touch it: drag the square, press the arrow keys, or drag
/// the line in the option's chart. It stops while the pointer or focus is inside, while it is off screen or
/// the tab is hidden, and it does not start under reduced motion; the controls still work then. Every
/// change is a state change of 150 ms or less. Nothing here is a price or can be signed.
export function PriceTapeStage({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [pct, setPct] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const step = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  // A visitor's move takes the tape off the script; Play puts it back from the nearest point.
  const set = useCallback((value: number) => {
    setPlaying(false);
    setPct(clampTape(value));
  }, []);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const running = playing && !reduced && !held && visible;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      step.current = (step.current + 1) % TAPE_PATH.length;
      setPct(TAPE_PATH[step.current]!);
    }, TAPE_STEP_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const toggle = () => {
    if (!playing) step.current = nearestTapeStep(pct);
    setPlaying(!playing);
  };

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    set(TAPE_MIN + ((event.clientX - box.left) / box.width) * span);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.shiftKey ? 5 : 1;
    const next = event.key === "ArrowRight" || event.key === "ArrowUp" ? pct + delta : event.key === "ArrowLeft" || event.key === "ArrowDown" ? pct - delta : event.key === "Home" ? TAPE_MIN : event.key === "End" ? TAPE_MAX : undefined;
    if (next === undefined) return;
    event.preventDefault();
    set(next);
  };

  return (
    <TapeContext.Provider value={{ pct, set, hold: setHeld }}>
      <div ref={stage}>
        <div className="sticky top-0 z-30 border-y border-line bg-ground/90 backdrop-blur-md">
          <div className="flex items-center gap-3 py-1 sm:gap-5">
            <button
              type="button"
              onClick={toggle}
              disabled={reduced}
              aria-label={playing && !reduced ? "Pause the price tape" : "Play the price tape"}
              className="interactive flex size-11 shrink-0 items-center justify-center text-muted hover:text-text disabled:opacity-40"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                {playing && !reduced ? <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" /> : <path d="M4 2.5l9 5.5-9 5.5z" />}
              </svg>
            </button>
            <div className="hidden shrink-0 sm:block">
              <p className={cn(SPACED_CAPS, "text-muted")}>Price move</p>
            </div>
            <div
              ref={track}
              role="slider"
              tabIndex={0}
              aria-label="Price move from entry, for all three previews"
              aria-valuemin={TAPE_MIN}
              aria-valuemax={TAPE_MAX}
              aria-valuenow={Math.round(pct * 10) / 10}
              aria-valuetext={`${sign(pct)}${Math.abs(pct).toFixed(1)} percent from entry`}
              onKeyDown={onKeyDown}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
                fromPointer(event);
              }}
              onPointerMove={(event) => {
                if (dragging) fromPointer(event);
              }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              className="relative h-11 min-w-0 flex-1 cursor-ew-resize touch-none select-none"
            >
              <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-line" />
              <div aria-hidden="true" className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-text" style={{ left: at(0) }} />
              <div
                aria-hidden="true"
                className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 bg-text", !dragging && "transition-[left] duration-150")}
                style={{ left: at(pct) }}
              />
            </div>
            <Num className="w-24 shrink-0 text-right text-sm">
              {`${sign(pct)}${Math.abs(pct).toFixed(1)}%`}
            </Num>
          </div>
        </div>
        {children}
      </div>
    </TapeContext.Provider>
  );
}
