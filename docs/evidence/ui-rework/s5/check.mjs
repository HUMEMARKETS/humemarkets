// Session 5 checks: /markets group tabs, the leaderboard shell and the copy-trading routes. Drives headless
// Chrome over CDP (the Session 4 client) against `next start`. Usage: node check.mjs <port> <flag:on|off>
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "../s4/cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = `http://localhost:${process.argv[2] ?? 3418}`;
const FLAG = process.argv[3] === "on";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "pass" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  console.log(results.at(-1));
};

// Expected groups come from the deployment file, the same data @hume/config is generated from.
const file = JSON.parse(readFileSync(join(here, "../../../../packages/contracts/deployments/robinhood_mainnet.markets.json"), "utf8"));
const LABEL = { "us-equities": "US", china: "China & Asia", commodities: "Commodities", etf: "ETF", crypto: "Crypto", pons: "Pons" };
const groupOf = Object.fromEntries(file.markets.map((m) => [m.symbol, LABEL[m.group]]));

const { send, ev, close } = await launch({ port: 9335 });
const shot = async (name) =>
  writeFileSync(join(here, `${name}.png`), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
const size = (width) => send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
const go = async (path) => {
  await send("Page.navigate", { url: BASE + path });
  await sleep(2500);
};
const until = async (expr, ms = 20000) => {
  for (let t = 0; t < ms; t += 250) {
    if (await ev(expr)) return true;
    await sleep(250);
  }
  return false;
};
const noHorizontal = () => ev(`document.documentElement.scrollWidth <= innerWidth`);
const setTheme = async (theme) => {
  await ev(`localStorage.setItem('hume-theme', '${theme}')`);
  await ev(theme === "dark" ? `document.documentElement.dataset.theme = 'dark'` : `delete document.documentElement.dataset.theme`);
  await sleep(300);
};
const rowSymbols = `[...document.querySelectorAll('tbody tr td:first-child > div > .font-medium')].map((e) => e.textContent.trim())`;
const tabNames = `[...document.querySelectorAll('[role=tablist][aria-label="Market groups"] [role=tab]')].map((t) => t.textContent.trim())`;
const clickTab = (label) => ev(`[...document.querySelectorAll('[role=tablist][aria-label="Market groups"] [role=tab]')].find((t) => t.textContent.trim() === ${JSON.stringify(label)}).click()`);

if (!FLAG) {
  // 1. /markets: tabs from the config groups, and each tab shows exactly its group's registry markets.
  await size(1440);
  await go("/markets");
  check("/markets: rows loaded", await until(`${rowSymbols}.length > 0`));
  const tabs = await ev(tabNames);
  const all = await ev(rowSymbols);
  // The tabs are "All" plus every group that has a market on this network, in config order. On mainnet that
  // is All · US · China & Asia · Commodities · ETF; testnet lists no China, Asia or commodity market.
  const order = ["US", "China & Asia", "Commodities", "ETF", "Crypto", "Pons"];
  const present = order.filter((label) => all.some((s) => groupOf[s] === label));
  check("/markets: tabs are All plus each group with a market, in order", JSON.stringify(tabs) === JSON.stringify(["All", ...present]), tabs.join(" · "));
  check("/markets: every tab is one of US · China & Asia · Commodities · ETF", tabs.slice(1).every((t) => order.slice(0, 4).includes(t)));
  const ungrouped = all.filter((s) => !groupOf[s]);
  for (const label of tabs.slice(1)) {
    await clickTab(label);
    await sleep(300);
    const shown = (await ev(rowSymbols)).sort();
    const want = all.filter((s) => groupOf[s] === label).sort();
    check(`/markets [${label}]: rows equal the group's markets`, shown.length > 0 && JSON.stringify(shown) === JSON.stringify(want), shown.join(","));
    check(`/markets [${label}]: tab marked selected`, await ev(`document.querySelector('[role=tab][aria-selected=true]').textContent.trim() === ${JSON.stringify(label)}`));
  }
  await clickTab("All");
  await sleep(300);
  check("/markets [All]: every row back, ungrouped ones under All only", (await ev(rowSymbols)).length === all.length, `${all.length} rows; ungrouped: ${ungrouped.join(",") || "none"}`);
  // Tab plus text filter combine.
  await clickTab("ETF");
  await ev(`(() => { const i = document.querySelector('input[aria-label="Filter markets"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'SPY'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(300);
  check("/markets [ETF] + filter SPY: one row", JSON.stringify(await ev(rowSymbols)) === JSON.stringify(["SPY"]));

  for (const width of [1440, 375]) {
    await size(width);
    for (const theme of ["light", "dark"]) {
      await go("/markets");
      await setTheme(theme);
      await until(`${rowSymbols}.length > 0`);
      await clickTab(tabs.at(-1));
      await sleep(400);
      await shot(`markets-${width}-${theme}`);
      check(`/markets ${width} ${theme}: no horizontal scroll`, await noHorizontal());
    }
  }

  // 2. Leaderboard shell.
  await size(1440);
  await setTheme("light");
  await go("/leaderboard");
  await until(`!!document.querySelector('tbody tr') || /No one is on the board|not available|offline/.test(document.body.innerText)`);
  const heads = await ev(`[...document.querySelectorAll('thead th')].map((t) => t.innerText.replace(/\\s+/g, ' ').trim())`);
  check("/leaderboard: Max drawdown and Trades columns", heads.includes("Max drawdown") && heads.includes("Trades"), heads.join(" | "));
  check("/leaderboard: Copy column marked In development", heads.some((h) => /Copy/.test(h) && /In development/i.test(h)));
  const rows = await ev(`document.querySelectorAll('tbody tr').length`);
  const dd = await ev(`[...document.querySelectorAll('tbody tr')].map((r) => r.children[6].textContent.trim())`);
  check("/leaderboard: drawdown is – on every row", rows > 0 && dd.every((v) => v === "–"), `${rows} rows`);
  const copy = await ev(`[...document.querySelectorAll('tbody tr td:last-child button')].map((b) => b.disabled && b.textContent.trim() === 'Copy')`);
  check("/leaderboard: Copy is a disabled button on every row", copy.length === rows && copy.every(Boolean));
  check("/leaderboard: minimum-trades note shown", await ev(`/minimum number of trades/.test(document.body.innerText)`));
  const sampleRows = await ev(`/Sample board|simulated/.test(document.body.innerText)`);
  const banner = await ev(`document.querySelectorAll('[data-sample-banner]').length`);
  check("/leaderboard: simulated rows carry the sample banner", !sampleRows || banner === 1, `simulated=${sampleRows} banner=${banner}`);
  check("/leaderboard: no profile links while the flag is off", (await ev(`document.querySelectorAll('a[href^="/traders/"]').length`)) === 0);
  for (const width of [1440, 375]) {
    await size(width);
    for (const theme of ["light", "dark"]) {
      await go("/leaderboard");
      await setTheme(theme);
      await sleep(800);
      await shot(`leaderboard-${width}-${theme}`);
      check(`/leaderboard ${width} ${theme}: no horizontal scroll`, await noHorizontal());
    }
  }

  // 3. Flag off: the routes do not exist.
  for (const path of ["/traders/0x0000000000000000000000000000000000000001", "/traders/0x0000000000000000000000000000000000000001/copy"]) {
    await go(path);
    check(`${path}: not found while the flag is off`, await ev(`/could not be found/.test(document.body.innerText)`));
  }
} else {
  const wallet = "0x0000000000000000000000000000000000000001";
  for (const width of [1440, 375]) {
    await size(width);
    await go(`/traders/${wallet}`);
    await setTheme("light");
    check(`/traders ${width}: labelled In development`, await ev(`/In development/i.test(document.body.innerText) && /trader profile is in development/i.test(document.body.innerText)`));
    check(`/traders ${width}: no figure on the page (no $ or %)`, await ev(`!/[$%]/.test(document.querySelector('main')?.innerText ?? document.body.innerText)`));
    await shot(`trader-${width}`);
    check(`/traders ${width}: no horizontal scroll`, await noHorizontal());
    await go(`/traders/${wallet}/copy`);
    check(`/traders/copy ${width}: labelled, nothing to sign`, await ev(`/Copy trading is in development/.test(document.body.innerText) && /Nothing can be signed/.test(document.body.innerText)`));
    await shot(`copy-${width}`);
    check(`/traders/copy ${width}: no horizontal scroll`, await noHorizontal());
  }
  await go("/traders/not-a-wallet");
  check("/traders/not-a-wallet: not found", await ev(`/could not be found/.test(document.body.innerText)`));
  await size(1440);
  await go("/leaderboard");
  await sleep(1500);
  const links = await ev(`[...document.querySelectorAll('a[href^="/traders/"]')].map((a) => a.getAttribute('href'))`);
  const hexRows = await ev(`[...document.querySelectorAll('tbody tr td:nth-child(2) [title]')].filter((e) => /^0x[0-9a-fA-F]{40}$/.test(e.title)).length`);
  check("/leaderboard (flag on): a profile link for each real wallet", links.length === hexRows, `${links.length} links, ${hexRows} wallets`);
  check("/leaderboard (flag on): Copy stays disabled", await ev(`[...document.querySelectorAll('tbody tr td:last-child button')].every((b) => b.disabled)`));
}

await close();
writeFileSync(join(here, `results-flag-${FLAG ? "on" : "off"}.txt`), results.join("\n") + "\n");
console.log(`${results.filter((r) => r.startsWith("pass")).length} pass, ${results.filter((r) => r.startsWith("FAIL")).length} fail`);
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
