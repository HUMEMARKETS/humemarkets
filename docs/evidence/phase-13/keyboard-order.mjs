// Phase 13 keyboard walk: place a sample perp order and confirm it using only Tab, Shift+Tab, Enter and Escape.
// At 375 px the ticket is a sheet opened by "Long"; at 1440 px it is the side panel. Needs the web app on :3000.
// Usage: node keyboard-order.mjs <width> <outdir>
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const width = Number(process.argv[2] ?? 375);
const OUT = process.argv[3];
const mobile = width < 1024;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: mobile ? 812 : 900 } });
const log = (...a) => console.log(width, ...a);
let invisible = 0;
let stops = 0;

const active = () => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return { id: el.id, text: (el.getAttribute("aria-label") || el.textContent || el.id || "").trim().slice(0, 30), tag: el.tagName, outline: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || !!el.closest("[class*='focus-within']"), inView: r.bottom > 0 && r.top < innerHeight };
});
const label = (a) => (a ? a.text : "");
// Tab until the focused control matches, counting stops and checking every stop shows focus.
async function tabTo(match, max = 200) {
  const trail = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const a = await active();
    trail.push(a ? `${a.tag}:${a.text}` : "none");
    stops++;
    if (a && !a.outline) { invisible++; log("  no focus ring on:", a.tag, label(a)); }
    if (a && match(a)) return a;
  }
  throw new Error(`never reached the control; last stops: ${trail.slice(-12).join(" | ")}`);
}

await page.goto("http://localhost:3000/perpetuals");
await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
await page.waitForTimeout(3_000);

if (mobile) {
  await tabTo((a) => a.tag === "BUTTON" && a.text === "Long");
  await page.keyboard.press("Enter");
  log("Long opened the sheet:", await page.getByRole("dialog").count() > 0 || await page.locator("#field-collateral").count() > 0);
  // Escape closes the sheet and returns focus.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  log("Escape closed the sheet:", await page.locator("#field-collateral").isVisible().then((v) => !v));
  await page.screenshot({ path: `${OUT}/kb-${width}-after-escape.png` });
  await tabTo((a) => a.tag === "BUTTON" && a.text === "Long");
  await page.keyboard.press("Enter");
}
const field = page.locator("#field-collateral");
await field.waitFor({ timeout: 30_000 });
await page.waitForTimeout(500);
if (!(await page.evaluate(() => document.activeElement?.id === "field-collateral"))) await tabTo((a) => a.id === "field-collateral", 400);
await page.keyboard.type("100");
await page.screenshot({ path: `${OUT}/kb-${width}-1-form.png` });
await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Review order" && !b.disabled), null, { timeout: 60_000 });
await tabTo((a) => a.text === "Review order");
await page.keyboard.press("Enter");
await page.getByRole("button", { name: /^Confirm/ }).waitFor({ timeout: 30_000 });
log("review shown, liquidation line:", /Liquidation price/.test(await page.locator("section[aria-label^='Open']").innerText()));
await page.screenshot({ path: `${OUT}/kb-${width}-2-review.png` });
await tabTo((a) => a.text.startsWith("Confirm"));
const confirmFocus = await active();
log("Confirm reachable by keyboard, focus ring:", confirmFocus.outline, "| in view:", confirmFocus.inView);
await page.keyboard.press("Enter");
await page.waitForTimeout(4_000);
const toast = await page.locator("ul[aria-live='polite']").innerText().catch(() => "");
log("after Enter on Confirm, toast says:", toast.replace(/\s+/g, " ").slice(0, 90));
await page.screenshot({ path: `${OUT}/kb-${width}-3-confirmed.png` });
log(`stops: ${stops}, stops without a focus ring: ${invisible}`);
const ok = /confirmed/i.test(toast) && invisible === 0;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
