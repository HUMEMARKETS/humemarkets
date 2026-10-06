// Records the landing page while the rail is clicked: CDP screencast frames, stitched by ffmpeg.
// Usage: node record.mjs <base-url> <out.mp4> [width height] [--headed] [--load]
// --load records the page loading (the hero assembling) instead of rail clicks.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launch, sleep } from "./cdp.mjs";

const [base, out, w = "1440", h = "900"] = process.argv.slice(2);
const headed = process.argv.includes("--headed");
const load = process.argv.includes("--load");
const width = Number(w), height = Number(h);
const page = await launch({ headed, width, height });
await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
if (!load) {
  await page.send("Page.navigate", { url: base + "/" });
  await sleep(6000);
}
const renderer = await page.ev(`(() => { const c = document.createElement('canvas').getContext('webgl'); const i = c && c.getExtension('WEBGL_debug_renderer_info'); return i ? c.getParameter(i.UNMASKED_RENDERER_WEBGL) : 'none'; })()`);
console.log("WebGL renderer:", renderer);

const dir = mkdtempSync(join(tmpdir(), "hume-frames-"));
const frames = [];
page.on("Page.screencastFrame", async (f) => {
  frames.push({ t: f.metadata.timestamp, file: join(dir, `${String(frames.length).padStart(5, "0")}.jpg`) });
  writeFileSync(frames[frames.length - 1].file, Buffer.from(f.data, "base64"));
  page.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await page.send("Page.startScreencast", { format: "jpeg", quality: 80, everyNthFrame: 1 });
await sleep(1200);
if (load) {
  await page.send("Page.navigate", { url: base + "/" });
  await sleep(7000);
}
const clickRail = async (label) => {
  const box = await page.ev(`(() => { const a=[...document.querySelectorAll('nav[aria-label="Landing sections"] a')].find(e=>e.textContent.includes(${JSON.stringify(label)})); if(!a) return null; const r=a.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (!box) throw new Error("no rail item " + label);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
};
for (const label of load ? [] : ["Markets", "Trade", "Capital", "Social", "Verify", "Vision", "Trade", "Start"]) {
  await clickRail(label);
  await sleep(2200);
}
await page.send("Page.stopScreencast");
await page.close();

// Variable frame times become a constant 30 fps video by repeating each frame for its own duration.
const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, ((frames[i + 1]?.t ?? f.t + 0.033) - f.t)).toFixed(4)}`).join("\n");
writeFileSync(join(dir, "list.txt"), list + `\nfile '${frames[frames.length - 1].file}'\n`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "26", out]);
console.log(`frames: ${frames.length}, written ${out}`);
