// UI edge cases for the Ask Walter sheet (hostile text, limits, double send, bad API answers, dark). Scripted API answers: no model tokens.
// PLAYWRIGHT_DIR=<dir with node_modules/playwright> WEB_URL=http://localhost:3000 [SHOTS=<dir>] node scripts/e2e-ai-edge.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR ?? ""}/`)("playwright");
const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS;
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const json = (status, body, headers = {}) => ({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", ...headers }, body: JSON.stringify(body) });
const SRC = [{ tool: "get_market_snapshot", source: "Hume oracle and indexer", asOf: "2026-10-14T14:05:00.000Z" }];
const noSide = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth);

const browser = await chromium.launch();
async function open(width, path = "/perpetuals?market=NVDA", scheme = "light") {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 812 : 900 }, colorScheme: scheme });
  const page = await context.newPage();
  await page.goto(`${WEB}${path}`, { waitUntil: "domcontentloaded" });
  const chip = page.getByRole("button", { name: "Ask Walter" });
  await chip.waitFor({ timeout: 60_000 });
  await chip.evaluate((el) => new Promise((r) => { const t = setInterval(() => { if (Object.keys(el).some((k) => k.startsWith("__reactProps"))) { clearInterval(t); r(); } }, 50); }));
  return { context, page, chip };
}
const ask = async (page, text) => { await page.getByLabel("Your question").fill(text); await page.getByRole("button", { name: "Ask", exact: true }).click(); };

for (const width of [375, 1440]) {
  // 1. hostile answer text is shown as text
  {
    const { context, page, chip } = await open(width);
    const requests = [];
    await page.route("**/v1/ai/chat", async (route) => {
      requests.push(JSON.parse(route.request().postData() ?? "{}"));
      await route.fulfill(json(200, { answer: `<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script> **bold** [link](javascript:alert(1)) ${"W".repeat(400)}\nline two\n\nRisk: test.`, sources: SRC }));
    });
    await chip.click();
    // The market list loads after the page: until it does the sheet says "Any listed market" and sends no symbol.
    await page.getByText("Reading NVDA-PERP").waitFor({ timeout: 60_000 });
    await ask(page, "hello <b>x</b>");
    await page.getByText("line two").waitFor();
    check(`${width}: html/script in an answer is text, not executed`, (await page.evaluate(() => window.__pwned)) === undefined && (await page.locator("dialog img[src='x'], [role=dialog] img[src='x']").count()) === 0);
    check(`${width}: 400-char unbroken word does not scroll sideways`, await noSide(page));
    check(`${width}: user html is escaped in the pill`, (await page.getByText("hello <b>x</b>").count()) >= 1);
    // 2. input limits
    await page.getByLabel("Your question").fill("a".repeat(900));
    const len = await page.getByLabel("Your question").inputValue().then((v) => v.length);
    check(`${width}: input stops at 500 characters`, len === 500, `len ${len}`);
    // 3. empty / whitespace disables send
    await page.getByLabel("Your question").fill("   ");
    check(`${width}: whitespace-only input cannot be sent`, await page.getByRole("button", { name: "Ask", exact: true }).isDisabled());
    // 4. Enter submits
    const before = requests.length;
    await page.getByLabel("Your question").fill("second question");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    check(`${width}: Enter sends the question`, requests.length === before + 1);
    // 5. history sent: roles only user/assistant, <= 6
    const last = requests.at(-1);
    check(`${width}: request carries symbol and history without sources`, last.symbol === "NVDA" && last.messages.length === 3 && last.messages.every((m) => Object.keys(m).sort().join() === "content,role"), JSON.stringify({ symbol: last.symbol, roles: last.messages.map((m) => m.role) }));
    // 6. close and reopen keeps the chat; New chat clears
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    await chip.click();
    check(`${width}: closing and reopening keeps the conversation`, (await page.getByText("line two").count()) >= 1);
    await page.getByRole("button", { name: "New chat" }).click();
    check(`${width}: New chat returns to the suggestions`, (await page.getByText("Explain funding rate").count()) >= 1 && (await page.getByText("line two").count()) === 0);
    // 7. suggestion click sends it
    const n = requests.length;
    await page.getByText("Explain funding rate").first().click();
    await page.waitForTimeout(400);
    check(`${width}: a suggestion sends its question`, requests.length === n + 1 && requests.at(-1).messages.at(-1).content === "Explain funding rate");
    await context.close();
  }
  // 8. double click sends once, then error text has no raw provider text, then Try again works
  {
    const { context, page, chip } = await open(width);
    let calls = 0;
    await page.route("**/v1/ai/chat", async (route) => {
      calls++;
      await new Promise((r) => setTimeout(r, 600));
      if (calls === 1) return route.fulfill(json(502, { code: "unavailable", error: "groq 404 model_not_found sk-SECRET-123" }));
      return route.fulfill(json(200, { answer: "ok now.\nRisk: none.", sources: SRC }));
    });
    await chip.click();
    await page.getByLabel("Your question").fill("price?");
    const send = page.getByRole("button", { name: "Ask", exact: true });
    await send.dblclick();
    await page.getByRole("button", { name: "Try again" }).waitFor();
    const text = await page.locator("body").innerText();
    check(`${width}: double click sends one request`, calls === 1, `calls ${calls}`);
    check(`${width}: no provider text or key on screen`, !/model_not_found|sk-SECRET|groq|404/i.test(text));
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByText("ok now.").waitFor();
    check(`${width}: Try again recovers`, calls === 2 && (await page.getByText("ok now.").count()) >= 1);
    // sources chips present
    check(`${width}: source with UTC time shown`, /14:05 UTC, 14 Oct/.test(await page.locator("body").innerText()));
    await context.close();
  }
  // 9. network failure, HTML proxy error, malformed JSON 200
  for (const [label, handler, expected] of [
    ["network drop", (route) => route.abort("failed"), /offline/i],
    ["html 502 from a proxy", (route) => route.fulfill({ status: 502, contentType: "text/html", headers: { "access-control-allow-origin": "*" }, body: "<html>Bad Gateway</html>" }), /could not answer/i],
    ["200 with no answer field", (route) => route.fulfill(json(200, { nope: 1 })), /could not answer/i],
    ["host 504", (route) => route.fulfill({ status: 504, contentType: "text/plain", headers: { "access-control-allow-origin": "*" }, body: "gateway timeout" }), /too long/i],
    ["503 disabled", (route) => route.fulfill(json(503, { code: "disabled", error: "x" })), /not switched on/i],
  ]) {
    const { context, page, chip } = await open(width);
    await page.route("**/v1/ai/chat", handler);
    await chip.click();
    await ask(page, "hi");
    await page.waitForTimeout(700);
    const body = await page.locator("body").innerText();
    check(`${width}: ${label} shows a plain message`, expected.test(body) && !/Bad Gateway|gateway timeout|undefined|\[object/.test(body));
    await context.close();
  }
  // 10. no market (markets page): suggestions still sane
  {
    const { context, page, chip } = await open(width, "/markets");
    let sent;
    await page.route("**/v1/ai/chat", async (route) => { sent = JSON.parse(route.request().postData() ?? "{}"); await route.fulfill(json(200, { answer: "Funding is a periodic payment.\nRisk: n/a.", sources: [] })); });
    await chip.click();
    const text = await page.locator("body").innerText();
    check(`${width}: /markets suggestions do not say "undefined" or an empty name`, !/undefined|null|Why is\s+moving/.test(text));
    await page.getByText("Explain funding rate").first().click();
    await page.getByText("Funding is a periodic payment.").waitFor();
    check(`${width}: /markets question sent without a symbol`, sent && !sent.symbol);
    check(`${width}: answer with no sources renders`, await noSide(page));
    await context.close();
  }
}
// 11. home page has no button; dark mode screenshot; button does not cover the phone bar
{
  const { context, page } = await (async () => { const context = await browser.newContext({ viewport: { width: 375, height: 812 } }); const page = await context.newPage(); await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2500); return { context, page }; })();
  check("375: landing page has no Ask Walter button", (await page.getByRole("button", { name: "Ask Walter" }).count()) === 0);
  await context.close();
}
{
  const { context, page, chip } = await open(375, "/perpetuals?market=NVDA", "dark");
  await page.route("**/v1/ai/chat", (route) => route.fulfill(json(200, { answer: "Dark mode answer.\nRisk: test.", sources: SRC })));
  await chip.click();
  await ask(page, "hi in dark");
  await page.getByText("Dark mode answer.").waitFor();
  check("375: dark mode answer, no sideways scroll", await noSide(page));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ai-dark-375.png` });
  await context.close();
}
// 12. layout: mini size and corner, no dimming, shadow, expand, minimize, unread dot, logo without a disc
for (const [width, height] of [[1440, 900], [375, 812]]) {
  const { context, page, chip } = await open(width, "/perpetuals?market=NVDA");
  let release;
  await page.route("**/v1/ai/chat", async (route) => { await new Promise((r) => (release = r)); await route.fulfill(json(200, { answer: "Slow answer.\nRisk: x.", sources: SRC })); });
  const fab = await chip.evaluate((el) => { const img = el.querySelector("img"); return { bg: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow, ring: getComputedStyle(el).borderTopWidth, imgH: img.getBoundingClientRect().height }; });
  check(`${width}: button has no background colour, no ring, and a larger logo`, fab.bg === "rgba(0, 0, 0, 0)" && fab.shadow === "none" && fab.imgH >= 48, JSON.stringify(fab));
  const bodyBefore = await page.evaluate(() => getComputedStyle(document.body).opacity + getComputedStyle(document.body).filter);
  await chip.click();
  await page.getByText("Reading NVDA-PERP").waitFor({ timeout: 60_000 });
  await page.waitForTimeout(400);
  const dialog = page.getByRole("dialog", { name: "Walter" });
  const mini = await dialog.evaluate((el) => { const r = el.getBoundingClientRect(); return { h: r.height, w: r.width, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom, shadow: getComputedStyle(el).boxShadow }; });
  const ratio = mini.h / height;
  check(`${width}: mini panel is about a third of the height`, ratio > 0.28 && ratio < 0.5, `${Math.round(mini.h)} px of ${height} (${ratio.toFixed(2)})`);
  check(`${width}: mini panel sits in the bottom-right corner`, mini.right < 30 && mini.bottom < 100, `right ${Math.round(mini.right)}, bottom ${Math.round(mini.bottom)}`);
  check(`${width}: panel has a shadow`, mini.shadow !== "none");
  const covers = await page.evaluate(() => [...document.querySelectorAll("body *")].some((el) => { const css = getComputedStyle(el); const r = el.getBoundingClientRect(); return css.position === "fixed" && r.width >= innerWidth - 2 && r.height >= innerHeight - 2 && el.getAttribute("role") !== "dialog" && (css.backgroundColor !== "rgba(0, 0, 0, 0)" || css.backdropFilter !== "none"); }));
  const after = await page.evaluate(() => getComputedStyle(document.body).opacity + getComputedStyle(document.body).filter);
  check(`${width}: nothing behind the panel is dimmed or blurred`, !covers && after === bodyBefore);
  const clicked = await page.getByRole("button", { name: "Add to watchlist" }).first().isEnabled().catch(() => false);
  check(`${width}: the page behind stays usable`, clicked && (await page.evaluate(() => document.getElementById("main")?.style.overflow ?? "") !== "hidden"));
  check(`${width}: no horizontal scroll (mini)`, await noSide(page));
  // expand and shrink
  await page.getByRole("button", { name: "Make Walter bigger" }).click();
  await page.waitForTimeout(450);
  const big = await dialog.evaluate((el) => { const r = el.getBoundingClientRect(); return { h: r.height, w: r.width }; });
  check(`${width}: bigger makes it at least 2.2x taller`, big.h >= mini.h * 2.2, `${Math.round(mini.h)} to ${Math.round(big.h)}`);
  if (width === 375) check("375: the full size covers the phone screen", big.w >= 374 && big.h >= 811);
  check(`${width}: no horizontal scroll (full)`, await noSide(page));
  await page.getByRole("button", { name: "Make Walter smaller" }).click();
  await page.waitForTimeout(450);
  check(`${width}: smaller goes back to mini`, Math.abs((await dialog.evaluate((el) => el.getBoundingClientRect().height)) - mini.h) < 3);
  // ask, minimize while it is thinking, the unread dot shows when the answer lands
  await ask(page, "slow one");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Minimize Walter" }).click();
  await dialog.waitFor({ state: "detached" });
  check(`${width}: minimize puts the round button back`, await chip.isVisible() && (await chip.evaluate((el) => el === document.activeElement)));
  release();
  await page.getByLabel("New answer").waitFor({ timeout: 5000 });
  check(`${width}: a dot shows an answer arrived while minimized`, true);
  await chip.click();
  await page.getByText("Slow answer.").waitFor();
  check(`${width}: reopening shows the chat and clears the dot`, (await page.getByLabel("New answer").count()) === 0);
  await context.close();
}
await browser.close();
console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASS");
process.exit(failed ? 1 : 0);
