// Performance trace of a full landing-page scroll at 1440 px, headed Chrome on the GPU.
// Usage: node trace.mjs <base-url> <out-dir>
// Writes trace-summary.json and trace.json.gz (the raw Chrome trace; open it in DevTools > Performance).
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { launch, sleep } from "./cdp.mjs";

const [base, out] = process.argv.slice(2);
const page = await launch({ headed: true, port: 9336 });
const { send, ev, on } = page;
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: base + "/" });
await sleep(6000);
const renderer = await ev(`(() => { const c = document.createElement('canvas').getContext('webgl'); const i = c && c.getExtension('WEBGL_debug_renderer_info'); return i ? c.getParameter(i.UNMASKED_RENDERER_WEBGL) : 'none'; })()`);

// In-page observers: frame intervals from requestAnimationFrame, long tasks, layout shifts.
await ev(`(() => {
  window.__perf = { frames: [], longTasks: [], shifts: [], maxTop: 0 };
  const scroller = document.getElementById('start').parentElement;
  new PerformanceObserver((list) => { for (const e of list.getEntries()) __perf.longTasks.push(e.duration); }).observe({ type: 'longtask' });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) __perf.shifts.push(e.value); }).observe({ type: 'layout-shift', buffered: true });
  let last = 0;
  const tick = (t) => { if (last) __perf.frames.push(t - last); last = t; __perf.maxTop = Math.max(__perf.maxTop, scroller.scrollTop); if (!__perf.stop) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})()`);

const events = [];
on("Tracing.dataCollected", (p) => events.push(...p.value));
const done = new Promise((r) => on("Tracing.tracingComplete", r));
await send("Tracing.start", {
  categories: "devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,loading,toplevel,blink.user_timing",
  transferMode: "ReportEvents",
});

// A full scroll: wheel down to the last section, the way a person reads it, then back to the top.
const started = Date.now();
for (const direction of [1, -1]) {
  for (let step = 0; step < 70; step += 1) {
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 900, y: 450, deltaX: 0, deltaY: 100 * direction });
    await sleep(70);
  }
  await sleep(1500);
}
const elapsed = Date.now() - started;
await ev(`__perf.stop = true`);
await send("Tracing.end");
await done;
const perf = await ev(`__perf`);
const reached = await ev(`({ maxTop: __perf.maxTop, visionTop: document.getElementById('vision').offsetTop, endTop: document.getElementById('start').parentElement.scrollTop })`);

// From the trace: main-thread tasks over 50 ms, layout shifts, and frames presented.
const main = events.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain");
const mainTasks = events.filter((e) => e.ph === "X" && e.name === "RunTask" && main && e.pid === main.pid && e.tid === main.tid);
const longTrace = mainTasks.filter((e) => e.dur > 50_000).map((e) => +(e.dur / 1000).toFixed(1));
const traceShifts = events.filter((e) => e.name === "LayoutShift").map((e) => e.args?.data?.score ?? 0);

const frames = perf.frames.filter((ms) => ms < 1000);
const sorted = [...frames].sort((a, b) => a - b);
const mean = frames.reduce((s, v) => s + v, 0) / frames.length;
const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const summary = {
  url: base + "/",
  viewport: "1440x900 @1x",
  webgl: renderer,
  scrollMs: elapsed,
  frames: frames.length,
  fpsMean: +(1000 / mean).toFixed(1),
  frameMsP50: +pct(0.5).toFixed(2),
  frameMsP95: +pct(0.95).toFixed(2),
  frameMsP99: +pct(0.99).toFixed(2),
  framesOver20ms: frames.filter((ms) => ms > 20).length,
  longTasksObserved: perf.longTasks.map((d) => +d.toFixed(1)),
  mainThreadTasksOver50msInTrace: longTrace,
  mainThreadTasksInTrace: mainTasks.length,
  longestMainThreadTaskMs: +(Math.max(0, ...mainTasks.map((e) => e.dur)) / 1000).toFixed(1),
  cls: +perf.shifts.reduce((s, v) => s + v, 0).toFixed(4),
  layoutShiftEventsInTrace: traceShifts.length,
  traceEvents: events.length,
  scroll: reached,
};
writeFileSync(`${out}/trace-summary.json`, JSON.stringify(summary, null, 2) + "\n");
writeFileSync(`${out}/trace.json.gz`, gzipSync(JSON.stringify({ traceEvents: events })));
console.log(JSON.stringify(summary, null, 2));
await page.close();
