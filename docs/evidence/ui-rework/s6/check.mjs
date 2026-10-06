// Session 6 QA. Drives headless Chrome over CDP (the Session 4 client) against `next start`.
// Both modes run against one production build configured for mainnet from the shell (NEXT_PUBLIC_CHAIN_ID=4663, the
// public mainnet RPC, the Railway API's public domain), so prices are real and the chain's recorded explorer applies.
//   node check.mjs qa <port>     CTAs, sample trade, themes, screenshots
//   node check.mjs links <port>  every contract explorer link, over HTTP
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "../s4/cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [mode = "qa", port = "3419"] = process.argv.slice(2);
const BASE = `http://localhost:${port}`;
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "pass" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  console.log(results.at(-1));
};
const { send, ev, close } = await launch({ port: 9338 });
const size = (width) => send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
const go = async (path, wait = 3000) => {
  await send("Page.navigate", { url: BASE + path });
  await sleep(wait);
};
const until = async (expr, ms = 20000) => {
  for (let t = 0; t < ms; t += 250) {
    if (await ev(expr)) return true;
    await sleep(250);
  }
  return false;
};
const text = () => ev(`document.body.innerText`);
const setTheme = async (theme) => {
  await ev(`localStorage.setItem('hume-theme', '${theme}')`);
  await ev(theme === "dark" ? `document.documentElement.dataset.theme = 'dark'` : `delete document.documentElement.dataset.theme`);
  await sleep(400);
};
const shot = async (name) => writeFileSync(join(here, `${name}.png`), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
const noHorizontal = () => ev(`document.documentElement.scrollWidth <= innerWidth`);
const clickText = (re, sel = "a,button") => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((n) => ${re}.test(n.innerText) && n.getBoundingClientRect().width > 0); if (!e) return false; e.click(); return true; })()`);
const status = async (url) => {
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 hume-qa" }, signal: AbortSignal.timeout(15000) });
    await r.arrayBuffer();
    return { ok: r.status >= 200 && r.status < 300, code: r.status };
  } catch (e) {
    return { ok: false, code: String(e.cause?.code ?? e.message) };
  }
};

if (mode === "links") {
  // Every contract link, as the visitor sees it: open the landing page's contracts drawer, then /features and /docs.
  await size(1440);
  const found = new Map();
  const collect = async (page) => {
    for (const [href, label] of await ev(`[...document.querySelectorAll('a[href*="/address/"]')].map((a) => [a.href, (a.closest('li,tr,div')?.innerText ?? '').split('\\n')[0]])`)) found.set(href, `${label} (${page})`);
  };
  await go("/features", 5000);
  await collect("/features");
  const featuresCount = found.size;
  check("/features lists the 20 contracts, each with an explorer link", featuresCount === 20, `${featuresCount} links`);
  await go("/", 5000);
  await ev(`localStorage.setItem('hume-theme','light')`);
  await collect("/ section");
  await clickText(/contracts|verify/i, "button");
  await sleep(1500);
  await collect("/ drawer");
  await go("/docs", 4000);
  await collect("/docs");
  const urls = [...found.keys()];
  check("explorer links found", urls.length >= 20, `${urls.length} distinct`);
  const hosts = new Set(urls.map((u) => new URL(u).origin));
  check("every explorer link points at the chain's recorded explorer", hosts.size === 1, [...hosts].join(" "));
  const failed = [];
  const statuses = await Promise.all(urls.map((url) => status(url)));
  urls.forEach((url, i) => {
    const r = statuses[i];
    results.push(`${r.ok ? "pass" : "FAIL"}  GET ${url}  ${r.code}`);
    console.log(results.at(-1));
    if (!r.ok) failed.push(`${url} ${r.code}`);
  });
  // A Blockscout address page answers 200 for any address (it is a client-rendered app), so a 2xx proves the link is
  // live, not that the contract is verified. The explorer's JSON API would say, but it sits behind a bot challenge.
  // That is recorded as amber below; it is not bypassed.
  const probe = await fetch(`${[...hosts][0]}/api/v2/smart-contracts/${urls[0].split("/address/")[1]}`, { headers: { "user-agent": "Mozilla/5.0 hume-qa" }, signal: AbortSignal.timeout(15000) });
  const body = await probe.text();
  const challenged = probe.status === 403 && /just a moment/i.test(body);
  results.push(`amber  "Verified source" per contract cannot be read over HTTP: explorer API answers ${probe.status}${challenged ? " (bot challenge)" : ""}. Check the ${urls.length} pages in a browser.`);
  console.log(results.at(-1));
  check(`all ${urls.length} explorer links return 2xx`, failed.length === 0, failed.join("; ") || "none failed");
  // Verified source and unaudited, on the page a visitor reads them.
  await go("/", 5000);
  const landing = await text();
  check('landing says "Verified source"', /verified source/i.test(landing));
  check('landing says "unaudited"', /unaudited/i.test(landing));
  await go("/features", 4000);
  check("/features names the explorer, not a bare address", /explorer|verify/i.test(await text()));
} else {
  // 1. CTAs. Every internal link the visitor can reach from the landing page, the header menus and the footer.
  await size(1440);
  await go("/", 5000);
  await ev(`localStorage.setItem('hume-theme','light')`);
  const hrefs = new Set();
  const grab = async () => (await ev(`[...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href'))`)).forEach((h) => hrefs.add(h.split('#')[0].split('?')[0] || "/"));
  await grab();
  for (const label of ["Trade", "Capital", "Social"]) {
    await clickText(new RegExp(`^${label}$`, "i"), "header button");
    await sleep(400);
    await grab();
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  }
  await go("/markets", 3000);
  await grab();
  const internal = [...hrefs].filter((h) => !h.startsWith("/_next") && !/\.(png|ico|svg|woff2?|css|js)$/.test(h)).sort();
  check("CTA hrefs collected", internal.length >= 8, internal.join(" "));
  for (const href of internal) {
    const r = await status(BASE + href);
    check(`CTA ${href} resolves`, r.ok, String(r.code));
  }
  const launch1 = ["Launch App", "Explore Markets"];
  for (const label of launch1) {
    await go("/", 5000);
    const clicked = await clickText(new RegExp(label, "i"));
    await sleep(2500);
    const path = await ev(`location.pathname`);
    check(`click "${label}" on the landing page goes to an app route`, clicked && path !== "/", `${clicked ? "→ " + path : "no such button"}`);
  }
  // Explorer links exist on the landing page, /features and /docs; the `links` mode requests each one.
  await go("/features", 4000);
  check("/features draws 20 explorer links", (await ev(`document.querySelectorAll('a[href*="/address/"]').length`)) === 20);

  // 2. Verified source / unaudited.
  await go("/", 5000);
  const landing = await text();
  check('landing says "Verified source"', /verified source/i.test(landing));
  check('landing says "unaudited"', /unaudited/i.test(landing));

  // 3. Sample mode, no wallet.
  await ev(`localStorage.clear(); localStorage.setItem('hume-theme','light')`);
  for (const path of ["/perpetuals", "/options", "/strategies"]) {
    await go(path, 6000);
    const t = await text();
    check(`${path}: renders in sample mode with no wallet`, (await ev(`document.querySelectorAll('[data-sample-banner]').length`)) === 1 && !/application error|something went wrong|unhandled/i.test(t));
    check(`${path}: no connect wall`, !/connect a wallet to (continue|trade|use)/i.test(t));
  }
  await go("/perpetuals", 3000);
  check("/perpetuals: collateral field appears", await until(`!!document.querySelector('input[inputmode=decimal]') && /\\d{2,}\\.\\d\\d/.test(document.querySelector('main').innerText)`, 40000));
  await ev(`(() => { const i = document.querySelector('input[inputmode=decimal]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '100'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(1500);
  await shot("sample-ticket-1440");
  check("/perpetuals: ticket shows estimated entry, liquidation price, fee and total before signing", /Estimated entry\s+\d[\d,.]+[\s\S]*Liquidation price\s+\d[\d,.]+[\s\S]*Fee[^\n]*\n?\s*\$[\d.]+[\s\S]*Total from vault\s+\$[\d,.]+/.test(await text()));
  check("/perpetuals: Open long is enabled", await clickText(/^Open long$/i, "button"));
  await sleep(2500);
  const afterOpen = await text();
  await shot("sample-trade-1440");
  check("/perpetuals: the sample trade confirms, marked Simulated", /Open long confirmed/i.test(afterOpen) && /Nothing was sent to a wallet/i.test(afterOpen), afterOpen.match(/Open long[^\n]*/)?.[0] ?? "no toast");
  await go("/portfolio", 5000);
  check("/portfolio: the sample position is listed and marked sample", /NVDA/.test(await text()) && (await ev(`document.querySelectorAll('[data-sample-banner]').length`)) === 1);
  await go("/options", 9000);
  await shot("sample-options-1440");
  await go("/strategies", 9000);
  await shot("sample-strategies-1440");
  check("/strategies: builder shows a payoff or analysis, not a connect wall", /max (profit|loss)|break.?even|payoff/i.test(await text()));

  // 4. Every route, both widths, both themes.
  const routes = [["landing", "/"], ["markets", "/markets"], ["perpetuals", "/perpetuals"], ["options", "/options"], ["strategies", "/strategies"], ["lending", "/lending"], ["portfolio", "/portfolio"], ["activity", "/activity"], ["leaderboard", "/leaderboard"], ["docs", "/docs"], ["features", "/features"], ["pnl-sample", "/pnl/sample/1"]];
  for (const width of [1440, 375]) {
    await size(width);
    for (const [name, path] of routes) {
      for (const theme of ["light", "dark"]) {
        await go(path, name === "landing" ? 4500 : 3500);
        await setTheme(theme);
        const ground = await ev(`getComputedStyle(document.body).backgroundColor`);
        const dark = theme === "dark";
        const lum = ground.match(/\d+/g).slice(0, 3).map(Number).reduce((a, b) => a + b, 0) / 3;
        check(`${name} ${width} ${theme}: theme applies (ground ${ground})`, dark ? lum < 60 : lum > 200);
        check(`${name} ${width} ${theme}: no horizontal scroll`, await noHorizontal());
        check(`${name} ${width} ${theme}: no error page`, !/application error|this page could not be found|500/i.test((await text()).slice(0, 400)));
        await shot(`${name}-${width}-${theme}`);
      }
    }
  }
}

await close();
writeFileSync(join(here, `results-${mode}.txt`), results.join("\n") + "\n");
console.log(`${results.filter((r) => r.startsWith("pass")).length} pass, ${results.filter((r) => r.startsWith("amber")).length} amber, ${results.filter((r) => r.startsWith("FAIL")).length} fail`);
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
