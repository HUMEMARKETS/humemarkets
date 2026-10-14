// Where News is linked. Usage: node walk-news-nav.mjs <outdir> <base>
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";
const [OUT, BASE = "http://localhost:3000"] = process.argv.slice(2);
let ok = true;
const check = (name, pass, detail = "") => { ok &&= pass; console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('nav[aria-label="Landing"]');
check("landing header has a News link", (await page.locator('nav[aria-label="Landing"] a[href="/news"]').count()) === 1);
await page.screenshot({ path: `${OUT}/news-landing-header-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });
await page.locator('nav[aria-label="Landing"] a[href="/news"]').click();
await page.waitForURL("**/news");
check("the landing link opens /news", page.url().endsWith("/news"));
for (const path of ["/markets", "/leaderboard", "/perpetuals"]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('nav[aria-label="Primary"]');
  check(`app header on ${path} has no News link`, (await page.locator('header a[href="/news"]').count()) === 0 && !(await page.locator('nav[aria-label="Primary"]').innerText()).includes("News"));
}
const phone = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true });
await phone.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 60000 });
await phone.getByRole("button", { name: "Open menu" }).click();
check("app menu on a phone has no News link", (await phone.locator('#mobile-nav a[href="/news"]').count()) === 0);
await phone.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await phone.waitForTimeout(4000); // the landing page hydrates slowly; a click before that is lost
await phone.getByRole("button", { name: "Open menu" }).click();
await phone.waitForSelector("#mobile-nav");
check("landing menu on a phone has a News link", (await phone.locator('#mobile-nav a[href="/news"]').count()) === 1);
await browser.close();
process.exit(ok ? 0 : 1);
