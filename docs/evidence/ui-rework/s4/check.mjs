// Session 4 accept checks for the landing page, against a production build (`next start`).
// Usage: node check.mjs <base-url> <out-dir>
// Writes screenshots and results.txt to <out-dir>. Headless Chrome (software WebGL) is enough here;
// the performance trace runs headed, on the GPU, in trace.mjs.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out] = process.argv.slice(2);
const results = [];
let fails = 0;
const check = (name, ok, detail = "") => {
  const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`;
  results.push(line);
  console.log(line);
  if (!ok) fails++;
};

/// Luminance stats (0-255) of a screenshot region, decoded by ffmpeg: no image library needed.
function luma(png, crop) {
  const raw = execFileSync("ffmpeg", ["-loglevel", "error", "-i", "pipe:0", "-vf", `crop=${crop}`, "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"], { input: png, maxBuffer: 64 << 20 });
  let min = 255, max = 0, sum = 0;
  for (const v of raw) { if (v < min) min = v; if (v > max) max = v; sum += v; }
  return { min, max, mean: Math.round(sum / raw.length) };
}

const page = await launch({ port: 9335 });
const { send, ev } = page;
const shotPng = async () => Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64");
const shot = async (name) => writeFileSync(`${out}/${name}.png`, await shotPng());
const go = async (path = "/") => { await send("Page.navigate", { url: base + path }); await sleep(4500); };
const ids = ["start", "markets", "trade", "capital", "social", "verify", "vision"];
const navs = ["Start", "Markets", "Trade", "Capital", "Social", "Verify", "Vision"];
const scrollToSection = (id) => ev(`(() => { const s = document.getElementById('${id}'); s.parentElement.scrollTop = s.offsetTop; })()`);
const noHorizontal = () => ev(`(() => { const s = document.getElementById('start').parentElement; return document.documentElement.scrollWidth <= innerWidth && s.scrollWidth <= s.clientWidth; })()`);
const current = (wide) => ev(wide
  ? `document.querySelector('nav[aria-label="Landing sections"] a[aria-current]')?.textContent.trim() ?? ''`
  : `document.querySelector('.md\\\\:hidden a[href^="#"]')?.textContent.trim() ?? ''`);
const click = async (x, y) => {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
};
const key = async (k, vk) => { for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: k, code: k, windowsVirtualKeyCode: vk }); };

for (const [name, width, height] of [["1440", 1440, 900], ["375", 375, 812]]) {
  const wide = width >= 768;
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: !wide });
  for (const theme of ["light", "dark"]) {
    await go("/");
    await ev(`localStorage.setItem('hume-theme', '${theme}')`);
    if (theme === "dark") await ev(`document.documentElement.dataset.theme = 'dark'`);
    else await ev(`delete document.documentElement.dataset.theme`);
    await sleep(600);
    for (const [index, id] of ids.entries()) {
      await scrollToSection(id);
      await sleep(2300);
      await shot(`${id}-${name}-${theme}`);
      check(`[${name} ${theme}] #${id}: no horizontal scroll`, await noHorizontal());
      const label = await current(wide);
      check(`[${name} ${theme}] scrolled to #${id}: rail marks ${navs[index]}`, label.endsWith(navs[index]), label);
    }
  }
}

// Rail clicks at 1440: the rail item, the scroll position, the address and focus all follow.
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await go("/");
for (const index of [3, 1, 6, 0, 5]) {
  const box = await ev(`(() => { const a = document.querySelectorAll('nav[aria-label="Landing sections"] a')[${index}]; const r = a.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await click(box.x, box.y);
  await sleep(2600);
  const state = await ev(`(() => { const s = document.getElementById('${ids[index]}'); return { top: s.parentElement.scrollTop, want: s.offsetTop, hash: location.hash, focus: document.activeElement?.id ?? '' }; })()`);
  const label = await current(true);
  check(`[1440] click ${navs[index]}: rail marks it, page at its top, hash and focus follow`,
    label.endsWith(navs[index]) && Math.abs(state.top - state.want) < 2 && state.hash === (index === 0 ? "" : `#${ids[index]}`) && state.focus === `${ids[index]}-title`,
    `${label} top=${state.top}/${state.want} hash=${state.hash || "(none)"} focus=${state.focus}`);
}

// Keyboard: arrows, PageDown, End and Home move between sections.
await go("/");
await ev(`document.activeElement?.blur()`);
const at = () => ev(`(() => { const s = document.getElementById('start').parentElement; const tops = [...s.querySelectorAll('section')].map((e) => e.offsetTop); return tops.findIndex((t) => Math.abs(t - s.scrollTop) < 2); })()`);
await key("ArrowDown", 40); await sleep(2400);
check("[1440] ArrowDown moves to Markets", (await at()) === 1, String(await at()));
await key("PageDown", 34); await sleep(2400);
check("[1440] PageDown moves to Trade", (await at()) === 2, String(await at()));
await key("End", 35); await sleep(3000);
check("[1440] End moves to Vision", (await at()) === 6, String(await at()));
await key("Home", 36); await sleep(3000);
check("[1440] Home moves to Start", (await at()) === 0, String(await at()));

// The canvas follows the theme in place: same canvas element, lines dark on ivory, light on charcoal.
await go("/");
await ev(`delete document.documentElement.dataset.theme`);
await sleep(1500);
await ev(`document.querySelector('canvas').dataset.probe = 'same'`);
const scene = "560:600:820:150"; // the right of the screen, where the station sits
const lightStats = luma(await shotPng(), scene);
await ev(`[...document.querySelectorAll('header button')].find((b) => /theme|dark|light/i.test(b.getAttribute('aria-label') ?? ''))?.click()`);
await sleep(1500);
const darkStats = luma(await shotPng(), scene);
const sameCanvas = await ev(`document.querySelector('canvas')?.dataset.probe === 'same'`);
check("theme switch keeps the one canvas (no remount)", sameCanvas);
check("light theme: ivory ground, dark lines", lightStats.mean > 200 && lightStats.min < 140, JSON.stringify(lightStats));
check("dark theme: charcoal ground, light lines", darkStats.mean < 60 && darkStats.max > 120, JSON.stringify(darkStats));
await ev(`delete document.documentElement.dataset.theme; localStorage.setItem('hume-theme', 'light')`);

// Hero search routes to /markets?q= and the table opens filtered.
await go("/");
await ev(`(() => { const i = document.getElementById('landing-search'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'nvda'); i.dispatchEvent(new Event('input', { bubbles: true })); i.form.requestSubmit(); })()`);
await sleep(3500);
const routed = await ev(`({ path: location.pathname + location.search, filter: document.querySelector('input[aria-label="Filter markets"]')?.value ?? null })`);
check("hero search routes to /markets?q= and pre-fills the filter", routed.path === "/markets?q=nvda" && routed.filter === "nvda", JSON.stringify(routed));

// Numbers: the facts strip and the markets section agree with the registry the page read.
await go("/");
const numbers = await ev(`(() => {
  const dd = [...document.querySelectorAll('#start dd')].map((e) => e.textContent.trim());
  const explore = document.querySelector('#markets a[href="/markets"]')?.textContent ?? '';
  const chips = document.querySelectorAll('#markets ul a').length;
  return { dd, explore, chips };
})()`);
check("facts strip count matches the markets section", numbers.explore.includes(`all ${numbers.dd[0]} markets`), JSON.stringify(numbers));

// Wheel: single notches are never pulled back to the section top (CSS proximity snap did that).
await go("/");
const wheelTops = [];
for (let i = 0; i < 12; i++) {
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 900, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(150);
  wheelTops.push(await ev(`document.getElementById('start').parentElement.scrollTop`));
}
await sleep(1500);
const rest = await ev(`document.getElementById('start').parentElement.scrollTop`);
check("wheel: twelve 100 px notches move the page down, none pulled back", wheelTops.every((t, i) => i === 0 || t >= wheelTops[i - 1]) && rest >= 1000, `${wheelTops.join(",")} rest=${rest}`);

// Reduced motion: StaticScene instead of the canvas, and a rail click jumps.
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await go("/");
const reduced = await ev(`({ staticScene: !!document.querySelector('[data-static-scene]'), canvas: !!document.querySelector('canvas') })`);
check("reduced motion: StaticScene, no WebGL canvas", reduced.staticScene && !reduced.canvas, JSON.stringify(reduced));
const box = await ev(`(() => { const r = document.querySelectorAll('nav[aria-label="Landing sections"] a')[4].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
await click(box.x, box.y);
await sleep(120);
const jumped = await ev(`(() => { const s = document.getElementById('social'); return Math.abs(s.parentElement.scrollTop - s.offsetTop) < 2; })()`);
check("reduced motion: a rail click jumps, no glide", jumped);
await shot("social-1440-light-reduced-motion");
await send("Emulation.setEmulatedMedia", { features: [] });

await page.close();
writeFileSync(`${out}/results.txt`, results.join("\n") + `\n\n${results.length - fails} pass, ${fails} fail\n`);
console.log(`\n${results.length - fails} pass, ${fails} fail`);
process.exit(fails ? 1 : 0);
