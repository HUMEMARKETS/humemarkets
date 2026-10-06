// A small Chrome DevTools Protocol client for the Session 4 checks: no dependency beyond Node and Chrome.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/// Launches Chrome and returns a client on its first page. `headed` uses the real display and GPU, which
/// is what the performance trace needs; headless falls back to software WebGL.
export async function launch({ headed = false, port = 9334, width = 1440, height = 900 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "hume-s4-"));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${width},${height + 120}`,
    ...(headed ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : ["--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"]),
    "about:blank",
  ];
  const chrome = spawn("google-chrome", args, { stdio: "ignore" });
  let target;
  for (let i = 0; i < 75 && !target; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://localhost:${port}/json`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  if (!target) throw new Error("Chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    } else if (d.method) {
      for (const fn of listeners.get(d.method) ?? []) fn(d.params);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, (d) => (d.error ? rej(new Error(method + ": " + d.error.message)) : res(d.result)));
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const on = (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]);
  const ev = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description ?? "") + " :: " + expression.slice(0, 120));
    return r.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  return {
    send,
    on,
    ev,
    async close() {
      ws.close();
      chrome.kill();
    },
  };
}
