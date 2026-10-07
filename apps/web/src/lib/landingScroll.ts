/// Scroll maths for the landing page, kept free of the DOM so it can be tested.

/// How far the camera, the rail and the copy close on their target each frame at 60 fps. One value for
/// all three, so they move as one (docs/UI_REWORK_PLAN.md Session 4, step 5).
export const DAMPING = 0.1;

/// The damping for a frame that took `dt` seconds, so the glide feels the same at 30, 60 or 120 fps.
export function dampFactor(dt: number): number {
  return 1 - Math.pow(1 - DAMPING, dt * 60);
}

/// The scroll position as a section index, fractional: 1.5 is halfway from the top of section 1 to the
/// top of section 2. `tops` are the sections' offsets in the scroller, ascending.
export function progressOf(scrollTop: number, tops: readonly number[]): number {
  if (tops.length === 0) return 0;
  let index = 0;
  tops.forEach((top, position) => {
    if (scrollTop >= top - 1) index = position;
  });
  const start = tops[index]!;
  const end = tops[index + 1];
  if (end === undefined || end <= start) return index;
  return index + Math.min(1, Math.max(0, (scrollTop - start) / (end - start)));
}

/// Where a keyboard step lands. A section taller than the screen is paged through before the next
/// one, so nothing is skipped. `bottom` is the scroll height; `view` the scroller's height.
export function keyTarget(
  key: string,
  scrollTop: number,
  tops: readonly number[],
  bottom: number,
  view: number,
): number | undefined {
  const last = tops.length - 1;
  if (last < 0) return undefined;
  if (key === "Home") return tops[0];
  if (key === "End") return tops[last];
  const index = Math.floor(progressOf(scrollTop, tops));
  const page = view * 0.85;
  if (key === "ArrowDown" || key === "PageDown") {
    const end = tops[index + 1] ?? bottom;
    if (scrollTop + view < end - 2) return Math.min(scrollTop + page, end - view);
    return tops[Math.min(last, index + 1)];
  }
  if (key === "ArrowUp" || key === "PageUp") {
    const start = tops[index]!;
    if (scrollTop > start + 2) return Math.max(scrollTop - page, start);
    return tops[Math.max(0, index - 1)];
  }
  return undefined;
}

/// One wheel gesture so far: when its last event came, its direction, its largest delta and its
/// smallest delta since that peak.
export interface WheelGesture {
  at: number;
  sign: number;
  peak: number;
  low: number;
}

export const wheelGesture = (): WheelGesture => ({ at: -Infinity, sign: 0, peak: 0, low: 0 });

/// A wheel pause this long (ms) ends a gesture.
const QUIET_MS = 180;

/// One step per wheel gesture: +1 down, -1 up, 0 for every later event of the same gesture, so a
/// trackpad's momentum tail never moves a second section. A new gesture is a pause of `QUIET_MS`, a
/// change of direction, or a delta rising again after it has decayed (a second flick during momentum).
/// Free of the DOM; updates `state` in place.
export function wheelStep(state: WheelGesture, deltaY: number, now: number): -1 | 0 | 1 {
  if (deltaY === 0) return 0;
  const size = Math.abs(deltaY);
  const sign = Math.sign(deltaY);
  // ponytail: fixed thresholds tuned on Chrome trackpad trains; recalibrate if a device double-steps.
  const decayed = state.low < state.peak * 0.7;
  const fresh = now - state.at > QUIET_MS || sign !== state.sign || (decayed && size > state.low * 1.5 + 4);
  state.at = now;
  if (fresh) {
    state.sign = sign;
    state.peak = state.low = size;
    return sign > 0 ? 1 : -1;
  }
  if (size > state.peak) state.peak = state.low = size;
  else state.low = Math.min(state.low, size);
  return 0;
}
