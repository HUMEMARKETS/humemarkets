import assert from "node:assert/strict";
import { test } from "node:test";
import { dampFactor, DAMPING, keyTarget, progressOf, wheelGesture, wheelStep } from "./landingScroll.js";

const tops = [0, 900, 1800, 3000];

test("progressOf is fractional between section tops and clamps at the ends", () => {
  assert.equal(progressOf(0, tops), 0);
  assert.equal(progressOf(450, tops), 0.5);
  assert.equal(progressOf(900, tops), 1);
  assert.equal(progressOf(2400, tops), 2.5);
  assert.equal(progressOf(3200, tops), 3);
  assert.equal(progressOf(10, []), 0);
});

test("dampFactor is the per-frame damping at 60 fps and frame-rate independent", () => {
  assert.ok(Math.abs(dampFactor(1 / 60) - DAMPING) < 1e-12);
  const twoFrames = 1 - (1 - dampFactor(1 / 120)) ** 2;
  assert.ok(Math.abs(twoFrames - DAMPING) < 1e-12);
});

test("keyTarget steps sections, and pages through a section taller than the screen", () => {
  const view = 900;
  assert.equal(keyTarget("ArrowDown", 0, tops, 4000, view), 900);
  assert.equal(keyTarget("PageUp", 900, tops, 4000, view), 0);
  assert.equal(keyTarget("Home", 2000, tops, 4000, view), 0);
  assert.equal(keyTarget("End", 0, tops, 4000, view), 3000);
  // Section 2 runs 1800 to 3000, taller than the 900 px screen: page down inside it first.
  assert.equal(keyTarget("ArrowDown", 1800, tops, 4000, view), 2100);
  assert.equal(keyTarget("ArrowDown", 2100, tops, 4000, view), 3000);
  assert.equal(keyTarget("ArrowUp", 2100, tops, 4000, view), 1800);
  assert.equal(keyTarget("Tab", 0, tops, 4000, view), undefined);
});

/// A trackpad flick: a ramp up, then momentum decaying every 16 ms until `ms` have passed.
const flick = (start: number, ms: number) => {
  const events: [number, number][] = [];
  for (let t = 0, i = 0; t <= ms; t += 16, i += 1) events.push([start + t, Math.max(1, i < 4 ? 15 * (i + 1) : 60 * 0.93 ** (i - 4))]);
  return events;
};
const steps = (events: [number, number][]) => {
  const state = wheelGesture();
  return events.map(([at, delta]) => wheelStep(state, delta, at)).filter((step) => step !== 0);
};

test("wheelStep: a mouse notch is one step, each way", () => {
  assert.deepEqual(steps([[0, 100], [400, 100], [800, -100]]), [1, 1, -1]);
});

test("wheelStep: a one-second momentum train is exactly one step", () => {
  assert.deepEqual(steps(flick(0, 1000)), [1]);
});

test("wheelStep: two quick flicks are two steps, even inside the first one's momentum", () => {
  assert.deepEqual(steps([...flick(0, 300), ...flick(316, 1000)]), [1, 1]);
});
