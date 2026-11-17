// Animation pose strips: one row of frames per clip, stitched into a single image.
//   node tools/strip.mjs --html=gal.html --out=/path/strip.jpg --id=veil --yaw=0.6 --dist=7 --lookY=1 [--frames=6] [--w=300 --h=420] clipA clipB:dur ...
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((x) => x.startsWith("--" + n + "=")); return a ? a.slice(n.length + 3) : d; };
const html = opt("html"), out = opt("out"), id = opt("id"), yaw = +opt("yaw", 0.6), pitch = +opt("pitch", 0.1), dist = +opt("dist", 7), lookY = +opt("lookY", 1), N = +opt("frames", 6);
const W = +opt("w", 300), H = +opt("h", 420), fov = +opt("fov", 30), face = +opt("face", 0);
const clips = args.filter((a) => !a.startsWith("--"));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on("console", (m) => { if (m.type() !== "log") logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
await page.goto("file://" + html);
await page.waitForFunction(() => window.G && G.gallery && G.gallery.ready, null, { timeout: 90000 });
const tmp = out.replace(/\.[a-z]+$/, "") + "_f";
const rows = [];
for (const c of clips) {
  const [name, durS] = c.split(":");
  const dur = durS ? +durS : await page.evaluate(({ id, name }) => { const o = G.chars.build(id); return o.anim && o.anim.clips[name] ? o.anim.clips[name].dur : 0; }, { id, name });
  if (!dur) { logs.push("missing clip " + name); continue; }
  const row = [];
  for (let i = 0; i < N; i++) {
    const t = dur * (i + 0.5) / N;
    await page.evaluate(({ id, name, t, yaw, pitch, dist, lookY, fov, face }) => {
      if (!window.__o || window.__oid !== id) { window.__o = G.chars.build(id); window.__oid = id; }
      const o = window.__o; o.anim.play("idle", { fade: 0 }); o.anim.update(0.02);
      G.gallery.show(o, { yaw, pitch, dist, lookY, fov, clip: name, t, loop: false, face });
    }, { id, name, t, yaw, pitch, dist, lookY, fov, face });
    await page.waitForTimeout(260);
    const f = `${tmp}_${name}_${i}.png`; await page.screenshot({ path: f }); row.push(f);
  }
  rows.push({ name, dur, row });
}
fs.writeFileSync(tmp + ".json", JSON.stringify(rows));
execFileSync("python3", ["-c", `
import json,sys
from PIL import Image, ImageDraw
rows=json.load(open(sys.argv[1])); W,H=${W},${H}
s=Image.new('RGB',(W*${N},H*len(rows)),(0,0,0)); d=ImageDraw.Draw(s)
for r,row in enumerate(rows):
    for i,f in enumerate(row['row']): s.paste(Image.open(f).convert('RGB'),(i*W,r*H))
    d.rectangle((0,r*H,150,r*H+14),fill=(0,0,0)); d.text((3,r*H+1),"%s %.2fs"%(row['name'],row['dur']),fill=(255,255,0))
s.save(sys.argv[2],quality=86); print(s.size)
`, tmp + ".json", out], { stdio: "inherit" });
for (const r of rows) for (const f of r.row) fs.unlinkSync(f);
console.log(logs.slice(0, 12).join("\n") || "ok");
await browser.close();
