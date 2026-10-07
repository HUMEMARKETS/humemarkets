// Phase 12 walk: the five money-path pages in a fresh sample account, at 1440 and 375 px.
// Needs the web app on :3000 (bash scripts/web-testnet.sh start). Usage: node walk-empty-states.mjs <outdir>
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3000";
const OUT = process.argv[2];
const PAGES = ["perpetuals", "options", "portfolio", "activity", "lending"];
// Strings that must never reach a screen: hex, env var names, raw revert or wallet wording, empty-data words.
const FORBIDDEN = /0x[0-9a-f]{8,}|NEXT_PUBLIC|execution reverted|User denied|\bundefined\b|\bNaN\b|\[object|No data/i;
let bad = 0;

for (const width of [1440, 375]) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
  for (const name of PAGES) {
    await page.goto(`${BASE}/${name}`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(4_000);
    const text = await page.locator("main").innerText();
    const hit = text.match(FORBIDDEN);
    const skeletons = await page.locator("[class*='animate-pulse']").count();
    if (hit) bad++;
    console.log(width, name.padEnd(11), "forbidden:", hit ? JSON.stringify(hit[0]) : "none", "| skeletons left:", skeletons, "|", text.replace(/\s+/g, " ").slice(0, 110));
    await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: false });
  }
  await browser.close();
}
console.log(bad === 0 ? "PASS: no forbidden text on any page" : `FAIL: ${bad} page(s) show forbidden text`);
process.exit(bad === 0 ? 0 : 1);
