// Market News states and dark theme. Usage: node walk-news-states.mjs <outdir> <base>
// The API is mocked in the browser so each state can be forced; the data for the "good" answer is the live /api/news.
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const [OUT, BASE = "http://localhost:3000"] = process.argv.slice(2);
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};
const good = await (await fetch(`${BASE}/api/news`)).json();
const rows = (page) => page.locator("[data-news-card] > a");
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const answer = (route, mode) =>
  mode === "ok" ? route.fulfill({ json: good }) : mode === "empty" ? route.fulfill({ json: { items: [], updatedAt: good.updatedAt, failed: 0 } }) : route.fulfill({ status: 502, json: { error: "no feed could be read" } });
const show = (page) => page.goto(`${BASE}/news`, { waitUntil: "domcontentloaded", timeout: 60000 });

const browser = await chromium.launch();
for (const [label, width, height] of [["1440", 1440, 900], ["375", 375, 812]]) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500 });
  const open = async (mode, wait = 0, fakeClock = false) => {
    const page = await context.newPage();
    if (fakeClock) await page.clock.install();
    const state = { mode };
    await page.route("**/api/news**", async (route) => {
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      await answer(route, state.mode);
    });
    await show(page);
    return { page, state };
  };

  // Loading: skeleton while the answer is held back.
  {
    const { page } = await open("ok", 5000);
    await page.locator("[aria-busy=true]").waitFor({ timeout: 4000 });
    check(`@${label} loading: skeleton shows`, (await rows(page).count()) === 0);
    await page.screenshot({ path: `${OUT}/news-loading-${label}.png` });
    await rows(page).first().waitFor({ timeout: 15000 });
    check(`@${label} loading: rows replace the skeleton`, (await page.locator("[aria-busy=true]").count()) === 0);
    await page.close();
  }

  // Error, then retry.
  {
    const { page, state } = await open("fail");
    await page.getByText("The news feeds did not answer").waitFor({ timeout: 20000 });
    check(`@${label} error: says what happened`, await page.getByText("Nothing is wrong with your account").isVisible());
    await page.screenshot({ path: `${OUT}/news-error-${label}.png` });
    state.mode = "ok";
    await page.getByRole("button", { name: "Try again" }).click();
    await rows(page).first().waitFor({ timeout: 15000 });
    check(`@${label} error: Try again recovers`, (await rows(page).count()) > 0);
    check(`@${label} error: no overflow`, (await overflow(page)) <= 0);
    await page.close();
  }

  // Empty.
  {
    const { page } = await open("empty");
    await page.getByText("No headlines right now.").waitFor({ timeout: 20000 });
    check(`@${label} empty: one sentence, no rows`, (await rows(page).count()) === 0);
    await page.screenshot({ path: `${OUT}/news-empty-${label}.png` });
    await page.close();
  }

  // Stale: good first, then the refresh fails.
  {
    const { page, state } = await open("ok", 0, true);
    await rows(page).first().waitFor({ timeout: 15000 });
    const before = await rows(page).count();
    state.mode = "fail";
    // The page refreshes every five minutes: jump the page clock to the next refresh.
    await page.clock.fastForward(5 * 60_000 + 1000);
    await page.clock.resume();
    await page.getByText(/Showing news from \d\d:\d\d\. The refresh failed/).waitFor({ timeout: 20000 });
    check(`@${label} stale: banner with the time, rows kept`, (await rows(page).count()) === before, `${before} rows`);
    await page.screenshot({ path: `${OUT}/news-stale-${label}.png` });
    state.mode = "ok";
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByText(/refresh failed/).waitFor({ state: "detached", timeout: 15000 });
    check(`@${label} stale: Try again clears the banner`, true);
    check(`@${label} stale: no overflow`, (await overflow(page)) <= 0);
    await page.close();
  }

  // Offline, with rows on screen.
  {
    const { page } = await open("ok");
    await rows(page).first().waitFor({ timeout: 15000 });
    await context.setOffline(true);
    await page.getByText(/You are offline\. Showing news from/).waitFor({ timeout: 10000 });
    check(`@${label} offline with data: banner, rows kept`, (await rows(page).count()) > 0);
    await page.screenshot({ path: `${OUT}/news-offline-${label}.png` });
    await context.setOffline(false);
    await page.getByText(/You are offline/).waitFor({ state: "detached", timeout: 10000 });
    check(`@${label} offline with data: banner clears on reconnect`, true);
    await page.close();
  }

  // Offline from the start, nothing loaded.
  {
    const page = await context.newPage();
    await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false }));
    await page.route("**/api/news**", (route) => route.abort());
    await show(page);
    await page.getByText("You are offline, so the news cannot load").waitFor({ timeout: 20000 });
    check(`@${label} offline, no data: one sentence and Try again`, await page.getByRole("button", { name: "Try again" }).isVisible());
    await page.screenshot({ path: `${OUT}/news-offline-empty-${label}.png` });
    await page.close();
  }

  // Dark theme.
  {
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("hume-theme", "dark"));
    await show(page);
    await rows(page).first().waitFor({ timeout: 30000 });
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    check(`@${label} dark theme applied`, theme === "dark", String(theme));
    const colours = await page.evaluate(() => {
      const first = document.querySelector("[data-news-card] time");
      const panel = document.querySelector("[data-news-card]");
      return { text: getComputedStyle(first).color, panel: getComputedStyle(panel).backgroundColor };
    });
    const lum = (rgb) => rgb.match(/\d+/g).slice(0, 3).map(Number).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    check(`@${label} dark theme: text lighter than panel`, lum(colours.text) > lum(colours.panel) + 100, JSON.stringify(colours));
    check(`@${label} dark theme: no overflow`, (await overflow(page)) <= 0);
    await page.screenshot({ path: `${OUT}/news-dark-${label}.png` });
    await page.close();
  }
  await context.close();
}
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
