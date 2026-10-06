import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:3417";
const OUT = process.argv[2];
const PORT = 9333;
const chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.argv[3], "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(method + ": " + d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }).catch((e) => { throw new Error(e.message + " :: " + expr.slice(0, 160)); }); /*"Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); */ if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description ?? "")); return r.result.value; };
const results = []; let fails = 0;
const check = (name, ok, detail = "") => { const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`; results.push(line); console.log(line); if (!ok) fails++; };
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await sleep(2500); };
const key = async (k, code = k, vk = 0) => { const text = k === "Enter" ? "\r" : k === " " ? " " : undefined; for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk, ...(type === "keyDown" && text ? { text } : {}) }); await sleep(150); };
const tab = () => key("Tab", "Tab", 9);
const enter = () => key("Enter", "Enter", 13);
const esc = () => key("Escape", "Escape", 27);
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64")); };
const active = () => ev(`document.activeElement ? (document.activeElement.textContent||'').trim().slice(0,30) + '|' + document.activeElement.tagName : ''`);
const click = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); await sleep(250); };
const tap = async (x, y) => { await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(350); };
const center = (sel, text) => ev(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.offsetParent!==null && (${JSON.stringify(text)}===''||e.textContent.trim().startsWith(${JSON.stringify(text)}))); const e=els[0]; if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,h:r.height,w:r.width}; })()`);

await send("Page.enable");
const ROUTES = ["/markets", "/perpetuals", "/options", "/strategies", "/lending", "/leaderboard", "/portfolio", "/activity", "/features", "/docs"];

for (const [name, w, h, mobile] of [["1440", 1440, 900, false], ["375", 375, 812, true]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
  // Banner count and header chip, every route.
  for (const r of ROUTES) {
    await go(r);
    const n = await ev(`document.querySelectorAll('[data-sample-banner]').length`);
    const visible = await ev(`(() => { const e=document.querySelector('[data-sample-banner]'); if(!e) return false; const b=e.getBoundingClientRect(); return b.width>0 && b.height>0 && getComputedStyle(e).visibility==='visible'; })()`);
    const chip = await ev(`/sample data/i.test(document.querySelector('header').innerText)`);
    const ca = await ev(`document.querySelector('header,footer') && !![...document.querySelectorAll('header,footer')].find(e=>/\\bCA\\b/.test(e.innerText))`);
    const over = await ev(`document.documentElement.scrollWidth <= window.innerWidth`);
    check(`[${name}] ${r}: exactly one banner, visible`, n === 1 && visible, `count=${n}`);
    check(`[${name}] ${r}: no header chip, no CA in header or footer, no horizontal scroll`, !chip && !ca && over);
  }
  await go("/");
  check(`[${name}] /: no banner`, (await ev(`document.querySelectorAll('[data-sample-banner]').length`)) === 0);
  check(`[${name}] /: no CA in header`, !(await ev(`/\\bCA\\b/.test(document.querySelector('header').innerText)`)));
}

// Desktop 1440: keyboard.
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await go("/markets");
const top = await ev(`[...document.querySelectorAll('nav[aria-label=Primary] > a, nav[aria-label=Primary] button')].map(e=>e.textContent.trim())`);
check("[1440] top level is Markets · Trade · Capital · Social · Portfolio", JSON.stringify(top) === JSON.stringify(["Markets", "Trade", "Capital", "Social", "Portfolio"]), top.join(" · "));
await ev(`document.querySelector('a[aria-label="HUME home"]').focus()`);
let seen = [];
for (let i = 0; i < 2; i++) { await tab(); seen.push(await active()); }
check("[1440] Tab reaches Markets, then the Trade button", seen[0].startsWith("Markets") && seen[1].startsWith("Trade|BUTTON"), seen.slice(0, 2).join(" > "));
check("[1440] Enter opens Trade", (await enter(), await ev(`document.querySelector('nav[aria-label=Primary] button[aria-expanded=true]')?.textContent.trim()`)) === "Trade");
await shot("markets-1440-trade-open");
await tab();
check("[1440] Tab moves into the open menu, first link Perpetuals", (await active()).startsWith("Perpetuals|A"), await active());
await esc();
check("[1440] Escape closes it and returns focus to Trade", (await active()).startsWith("Trade|BUTTON") && (await ev(`!document.querySelector('nav[aria-label=Primary] [aria-expanded=true]')`)));
await key(" ", "Space", 32);
check("[1440] Space opens Trade", (await ev(`!!document.querySelector('nav[aria-label=Primary] button[aria-expanded=true]')`)));
await tab(); await tab(); // Perpetuals, Options
check("[1440] second link is Options", (await active()).startsWith("Options|A"), await active());
await enter(); await sleep(2000);
check("[1440] Enter on Options navigates to /options and closes the menu", (await ev(`location.pathname`)) === "/options" && (await ev(`!document.querySelector('nav[aria-label=Primary] [aria-expanded=true]')`)));
check("[1440] Trade is marked current on /options", await ev(`document.querySelector('nav[aria-label=Primary] button').textContent.trim()==='Trade' && [...document.querySelectorAll('nav[aria-label=Primary] button')].find(b=>b.textContent.trim()==='Trade').className.includes('border-accent')`));
// Tabbing out closes the menu.
await go("/markets");
await ev(`[...document.querySelectorAll('nav[aria-label=Primary] button')].find(b=>b.textContent.trim()==='Capital').focus()`);
await enter();
await tab(); await tab(); // Lending, then out to Social
check("[1440] Tabbing out of Capital closes it", (await active()).startsWith("Social|BUTTON") && !(await ev(`!!document.querySelector('nav[aria-label=Primary] [aria-expanded=true]')`)), await active());
// Mouse: open, switch group, click outside.
await go("/markets");
let p = await center("nav[aria-label=Primary] button", "Trade"); await click(p.x, p.y);
check("[1440] click opens Trade", (await ev(`!!document.querySelector('nav[aria-label=Primary] [aria-expanded=true]')`)));
p = await center("nav[aria-label=Primary] button", "Social"); await click(p.x, p.y);
check("[1440] opening Social closes Trade (one at a time)", (await ev(`[...document.querySelectorAll('nav[aria-label=Primary] [aria-expanded=true]')].map(b=>b.textContent.trim()).join()`)) === "Social");
await click(800, 80);
check("[1440] click outside closes the menu", !(await ev(`!!document.querySelector('nav[aria-label=Primary] [aria-expanded=true]')`)));
// Footer links.
await go("/markets");
const foot = await ev(`[...document.querySelectorAll('footer nav a')].map(a=>a.textContent.trim()).filter(Boolean)`);
check("[1440] footer lists Activity, Docs, Features", ["Activity", "Docs", "Features"].every((l) => foot.includes(l)), foot.join(" · "));
await go("/perpetuals"); await shot("perpetuals-1440-banner");
await go("/docs"); await shot("docs-1440-banner");
await go("/leaderboard"); await shot("leaderboard-1440-banner");

// Mobile 375: touch.
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await go("/markets");
check("[375] desktop nav hidden", !(await ev(`!!document.querySelector('nav[aria-label=Primary]') && document.querySelector('nav[aria-label=Primary]').offsetParent!==null`)));
p = await center("button[aria-controls=mobile-nav]", ""); await tap(p.x, p.y);
check("[375] tap opens the sheet", await ev(`!!document.getElementById('mobile-nav')`));
const sections = await ev(`[...document.querySelectorAll('#mobile-nav [role=group]')].map(g=>g.getAttribute('aria-label')+': '+[...g.querySelectorAll('a')].map(a=>a.textContent.trim()).join(', '))`);
check("[375] sheet sections", sections.length === 4 && sections[0].startsWith("Trade: Perpetuals, Options, Strategies") && sections[3] === "More: Activity, Docs, Features", sections.join(" | "));
const tops = await ev(`[...document.querySelectorAll('#mobile-nav > a')].map(a=>a.textContent.trim()).join()`);
check("[375] sheet top-level links", tops === "Markets,Portfolio", tops);
await shot("markets-375-sheet-open");
const small = await ev(`[...document.querySelectorAll('#mobile-nav a')].filter(a=>a.getBoundingClientRect().height<42).length`);
check("[375] every sheet link is at least 42 px tall (the previous sheet rows)", small === 0, `short=${small}`);
const scrolls = await ev(`(() => { const n=document.getElementById('mobile-nav'); n.scrollTop=n.scrollHeight; return {top:n.scrollTop, scrollable:n.scrollHeight>n.clientHeight}; })()`);
await sleep(200);
const lastVisible = await ev(`(() => { const n=document.getElementById('mobile-nav'); const w=n.querySelector('button'); const r=w.getBoundingClientRect(); return r.bottom<=window.innerHeight; })()`);
check("[375] the sheet scrolls to the wallet button", lastVisible, JSON.stringify(scrolls));
await ev(`document.getElementById('mobile-nav').scrollTop=0`);
p = await center("#mobile-nav a", "Perpetuals"); await tap(p.x, p.y); await sleep(2000);
check("[375] tapping Perpetuals navigates and closes the sheet", (await ev(`location.pathname`)) === "/perpetuals" && (await ev(`!document.getElementById('mobile-nav')`)));
await shot("perpetuals-375-banner");
p = await center("button[aria-controls=mobile-nav]", ""); await tap(p.x, p.y);
p = await center("#mobile-nav a", "Features"); await tap(p.x, p.y); await sleep(2000);
check("[375] tapping Features (More) navigates", (await ev(`location.pathname`)) === "/features");
await shot("features-375-banner");
// Keyboard on the sheet at 375.
await go("/markets");
await ev(`document.querySelector('button[aria-controls=mobile-nav]').focus()`);
await enter();
check("[375] Enter on the menu button opens the sheet", await ev(`!!document.getElementById('mobile-nav')`));
await esc();
check("[375] Escape closes the sheet", await ev(`!document.getElementById('mobile-nav')`));
await go("/docs"); await shot("docs-375-banner");

// Live mode: no banner.
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await go("/markets");
const key0 = await ev(`Object.keys(localStorage).filter(k=>/mode/i.test(k)).join()`);
results.push("info: mode storage key = " + (key0 || "(none yet)"));


// Dark theme shots of the open menus.
await ev(`localStorage.setItem("hume-theme","dark")`);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await go("/markets");
await ev(`[...document.querySelectorAll('nav[aria-label=Primary] button')].find(b=>b.textContent.trim()==='Trade').click()`);
await sleep(300); await shot("markets-1440-trade-open-dark");
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await go("/markets");
await ev(`document.querySelector('button[aria-controls=mobile-nav]').click()`);
await sleep(300); await shot("markets-375-sheet-open-dark");
await ev(`localStorage.removeItem("hume-theme")`);

writeFileSync(`${OUT}/results.txt`, results.join("\n") + "\n");
console.log(results.join("\n"));
console.log(fails ? `FAILS=${fails}` : "ALL PASS");
ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);
