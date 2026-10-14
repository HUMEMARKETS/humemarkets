// Market News walk. Usage: node walk-news.mjs <outdir> <base> [blockedSource]
// With a blockedSource (a feed's source name whose host the server was started with in NEWS_BLOCKED_HOSTS), it checks the rest still renders.
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const [OUT, BASE = "http://localhost:3000", BLOCKED] = process.argv.slice(2);
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};
const tabs = ["All", "US Stocks", "China", "Crypto", "ETF", "Commodities"];

const browser = await chromium.launch();
const api = await (await fetch(`${BASE}/api/news`)).json();

if (BLOCKED) {
  const sources = new Set(api.items.map((item) => item.source));
  check("blocked host: feed counted as failed", api.failed >= 1, `failed=${api.failed}`);
  check(`blocked host: no ${BLOCKED} rows`, !sources.has(BLOCKED));
  check("blocked host: the rest still return rows", api.items.length > 20, `${api.items.length} items, sources ${[...sources].join(", ")}`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/news`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[data-news-card] > a");
  const text = await page.locator("main").innerText();
  check(`blocked host: page renders rows without ${BLOCKED}`, (await page.locator("[data-news-card] > a").count()) > 0 && !text.includes(BLOCKED));
  await browser.close();
  process.exit(results.every(Boolean) ? 0 : 1);
}

for (const [label, width, height] of [["1440", 1440, 900], ["375", 375, 812]]) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
  const rows = page.locator("[data-news-card] > a");
  await page.goto(`${BASE}/news`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await rows.first().waitFor();
  check(`@${label} page loads with rows`, (await rows.count()) > 0, `${await rows.count()} rows`);

  const first = rows.first();
  check(`@${label} first row href is an API item url`, (await first.getAttribute("href")) === api.items[0].url);
  check(`@${label} link opens a new tab safely`, (await first.getAttribute("target")) === "_blank" && /noopener/.test(await first.getAttribute("rel")) && /noreferrer/.test(await first.getAttribute("rel")));
  const bad = await rows.evaluateAll((links) => links.filter((a) => !a.href.startsWith("https://") && !a.href.startsWith("http://")).length);
  check(`@${label} every link is http(s)`, bad === 0);
  const badImg = await page.locator("[data-news-card] img").evaluateAll((imgs) => imgs.filter((img) => !img.src.startsWith("https://")).length);
  check(`@${label} every thumbnail is https`, badImg === 0, `${await page.locator("[data-news-card] img").count()} images`);

  for (const tab of tabs) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await rows.first().waitFor();
    const count = await rows.count();
    check(`@${label} tab ${tab} returns rows`, count > 0, `${count} rows`);
    if (tab === "Crypto") {
      const body = await page.locator("main").innerText();
      check(`@${label} Crypto rows are crypto sources`, /CoinDesk|Cointelegraph|Decrypt/.test(body));
    }
  }
  await page.getByRole("tab", { name: "All", exact: true }).click();

  const filter = page.getByLabel("Filter by ticker");
  await filter.fill("btc");
  await rows.first().waitFor();
  const cards = await page.locator("[data-news-card]").count();
  const btcBadges = await page.locator('[data-news-card] a[href="/perpetuals?market=BTC"]').count();
  check(`@${label} ticker filter btc: every card has a BTC badge`, cards > 0 && btcBadges === cards, `${btcBadges}/${cards}`);
  await filter.fill("ZZZZ");
  check(`@${label} ticker filter with no match shows the empty state`, await page.getByText("No headline names ZZZZ").isVisible());
  await filter.fill("");

  // Navigation: the landing-style header, not the app navigation.
  check(`@${label} no app navigation on /news`, (await page.locator('nav[aria-label="Primary"]').count()) === 0);
  if (width >= 1280) {
    const link = page.locator('nav[aria-label="Landing"] a[href="/news"]');
    check(`@${label} header has a News link marked current`, (await link.count()) === 1 && (await link.getAttribute("aria-current")) === "page");
  } else {
    await page.getByRole("button", { name: "Open menu" }).click();
    check(`@${label} menu has a News link`, (await page.locator('nav[aria-label="Primary mobile"] a[href="/news"]').count()) === 1);
    await page.getByRole("button", { name: "Close menu" }).click();
  }
  const badge = page.locator('[data-news-card] a[href^="/perpetuals?market="]').first();
  check(`@${label} stories carry stock badges`, (await badge.count()) === 1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`@${label} no horizontal overflow`, overflow <= 0, `${overflow}px`);
  if (width < 500) {
    const small = await page.evaluate(() => [...document.querySelectorAll("main a, main button, main input")].filter((el) => el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().height < 43.5).map((el) => `${el.tagName}:${(el.textContent || el.getAttribute("aria-label") || "").slice(0, 20)}:${Math.round(el.getBoundingClientRect().height)}`));
    check(`@${label} touch targets are 44 px`, small.length === 0, small.slice(0, 5).join("; "));
  }
  await page.screenshot({ path: `${OUT}/news-${label}.png` });

  await page.goto(`${BASE}/news?ticker=AAPL`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await rows.first().waitFor();
  check(`@${label} ?ticker=AAPL fills the filter`, (await filter.inputValue()) === "AAPL");
  const aaplCards = await page.locator("[data-news-card]").count();
  const aaplBadges = await page.locator('[data-news-card] a[href="/perpetuals?market=AAPL"]').count();
  check(`@${label} ?ticker=AAPL: every card has an AAPL badge`, aaplCards > 0 && aaplBadges === aaplCards, `${aaplBadges}/${aaplCards}`);
  await page.screenshot({ path: `${OUT}/news-ticker-${label}.png` });
  if (label === "1440") {
    await page.locator('[data-news-card] a[href="/perpetuals?market=AAPL"]').first().click();
    await page.waitForURL("**/perpetuals?market=AAPL", { timeout: 30000 });
    const heading = await page.getByRole("heading", { name: "AAPL-PERP" }).first().waitFor({ timeout: 45000 }).then(() => true, () => false);
    check("badge opens the perps terminal on that market", heading, page.url());
  }

  await page.goto(`${BASE}/news`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.close();
}

// The terminal chip.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/perpetuals`, { waitUntil: "domcontentloaded", timeout: 60000 });
const chip = page.locator('a[href^="/news?ticker="]').first();
await chip.waitFor({ timeout: 30000 }).catch(() => {});
const href = await chip.getAttribute("href").catch(() => null);
check("terminal header has a News chip to /news?ticker=", /^\/news\?ticker=[A-Z]+$/.test(href ?? ""), String(href));
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
