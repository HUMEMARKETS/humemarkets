import assert from "node:assert/strict";
import { test } from "node:test";
import { dampFactor, DAMPING, keyTarget, progressOf, settleTarget } from "./landingScroll.js";

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

test("settleTarget settles only close to a section top, so a wheel notch is never pulled back", () => {
  assert.equal(settleTarget(40, tops, 900), 0);
  assert.equal(settleTarget(870, tops, 900), 900);
  assert.equal(settleTarget(100, tops, 900), undefined);
  assert.equal(settleTarget(900, tops, 900), undefined);
});
