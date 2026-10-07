// WP5 screenshots of the live testnet site at 375 and 1440 px. Usage: node shots.mjs <outdir> [base]
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const OUT = process.argv[2];
const BASE = process.argv[3] ?? "https://humemarkets.vercel.app";
const PAGES = process.argv.slice(4).length ? process.argv.slice(4) : ["markets?group=china", "pons", "leaderboard", "copy"];
const browser = await chromium.launch();
for (const [label, width, height] of [["375", 375, 812], ["1440", 1440, 900]]) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
  for (const path of PAGES) {
    await page.goto(`${BASE}/${path}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const name = path.replace(/[^a-z0-9]+/gi, "-");
    await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: false });
    console.log(`${path} @${label}: horizontal overflow ${overflow}px`);
  }
  await page.close();
}
await browser.close();
