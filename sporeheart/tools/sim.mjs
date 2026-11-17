// Live motion test (cloth / verlet follow-through): runs the character through a motion and grabs frames.
//   node tools/sim.mjs --html=gal.html --out=/path/sim.jpg --id=witch --clip=run --motion=circle|line|spin|hop|still
//        [--speed=7] [--yaw=2.6] [--dist=6] [--lookY=0.9] [--pitch=0.15] [--frames=8] [--every=180] [--warm=1200] [--w=320 --h=400] [--fixedCam=1]
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((x) => x.startsWith("--" + n + "=")); return a ? a.slice(n.length + 3) : d; };
const html = opt("html"), out = opt("out"), id = opt("id"), N = +opt("frames", 8), every = +opt("every", 180), warm = +opt("warm", 1200);
const W = +opt("w", 320), H = +opt("h", 400);
const o = { clip: opt("clip", "idle"), motion: opt("motion", "circle"), speed: +opt("speed", 7), yaw: +opt("yaw", 2.6), dist: +opt("dist", 6), lookY: +opt("lookY", 0.9), pitch: +opt("pitch", 0.15), fov: +opt("fov", 30), fixedCam: !!opt("fixedCam", ""), rate: +opt("rate", 5) };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on("console", (m) => { if (m.type() !== "log") logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
await page.goto("file://" + html);
await page.waitForFunction(() => window.G && G.gallery && G.gallery.ready, null, { timeout: 90000 });
const err = await page.evaluate(({ id, o }) => { try { G.gallery.sim(G.chars.build(id), o); return null; } catch (e) { return e.stack; } }, { id, o });
if (err) logs.push("ERR " + err);
await page.waitForTimeout(warm);
const tmp = out.replace(/\.[a-z]+$/, "") + "_f", files = [];
for (let i = 0; i < N; i++) { const f = `${tmp}_${i}.png`; await page.screenshot({ path: f }); files.push(f); await page.waitForTimeout(every); }
const fps = await page.evaluate(() => { let n = 0; const t0 = performance.now(); return new Promise((res) => { (function f() { n++; if (performance.now() - t0 > 1000) res(n); else requestAnimationFrame(f); })(); }); });
execFileSync("python3", ["tools/sheet.py", out, String(H), ...files], { stdio: "inherit" });
for (const f of files) fs.unlinkSync(f);
console.log("fps~" + fps + " " + (logs.slice(0, 12).join("\n") || "ok"));
await browser.close();
