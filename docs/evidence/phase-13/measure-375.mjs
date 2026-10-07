// Phase 13 measurement at 375 px: horizontal scroll, left gutter, tap targets, on the four launch surfaces.
// Needs the web app on :3000 (bash scripts/web-testnet.sh start). Usage: node measure-375.mjs <outdir>
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3000";
const OUT = process.argv[2];
const SURFACES = ["", "markets", "perpetuals", "portfolio"];
const MIN = 44;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true });
let bad = 0;
for (const name of SURFACES) {
  await page.goto(`${BASE}/${name}`);
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(3_000);
  const r = await page.evaluate((MIN) => {
    const vw = innerWidth;
    const overflow = document.documentElement.scrollWidth - vw;
    const small = [];
    const sel = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], summary";
    for (const el of document.querySelectorAll(sel)) {
      const b = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (b.width === 0 || b.height === 0 || style.visibility === "hidden" || style.display === "none") continue;
      if (b.bottom < 0 || b.right < 0 || b.left > vw) continue;
      // An inline text link inside a sentence is exempt (WCAG 2.5.8 inline exception); a bare link or control is not.
      const inline = el.tagName === "A" && style.display === "inline";
      if (inline) continue;
      if (b.height < MIN || b.width < MIN) {
        small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 24)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
    }
    const main = document.querySelector("main");
    const first = main ? [...main.querySelectorAll("h1, h2, p, section, div")].find((e) => e.getBoundingClientRect().height > 20) : null;
    const gutter = first ? Math.round(first.getBoundingClientRect().left) : null;
    return { overflow, gutter, small };
  }, MIN);
  const ok = r.overflow <= 0;
  if (!ok) bad++;
  console.log(`/${name}`.padEnd(13), "h-scroll px:", r.overflow, "| left gutter:", r.gutter, "| small targets:", r.small.length);
  for (const s of r.small.slice(0, 40)) console.log("    ", s);
  await page.screenshot({ path: `${OUT}/${name || "landing"}-375.png` });
}
await browser.close();
console.log(bad === 0 ? "NO HORIZONTAL SCROLL on any surface" : `FAIL: ${bad} surface(s) scroll sideways`);
