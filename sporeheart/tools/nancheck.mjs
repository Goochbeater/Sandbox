// sample every clip of every character and report bones whose world matrix goes NaN / explodes
//   node tools/build.mjs --gallery --out=/tmp/x/gal.html && node tools/nancheck.mjs --html=/tmp/x/gal.html
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const html = (process.argv.find((a) => a.startsWith("--html=")) || "").slice(7);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 200, height: 200 } });
const logs = [];
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
await page.goto("file://" + html);
await page.waitForFunction(() => window.G && G.gallery && G.gallery.ready, null, { timeout: 90000 });
const res = await page.evaluate(() => {
  const out = [];
  for (const id of ["witch", "crane", "thistle", "veil", "veil2", "beast"]) {
    const o = G.chars.build(id), a = o.anim, bones = o.rig.bones;
    for (const clip of a.clipNames()) {
      a.play(clip, { fade: 0 });
      const bad = new Set();
      for (let i = 0; i < 40; i++) {
        a.update(1 / 30); o.root.updateMatrixWorld(true);
        for (const p in bones) { const e = bones[p].matrixWorld.elements; for (let k = 0; k < 16; k++) if (!isFinite(e[k]) || Math.abs(e[k]) > 1e4) { bad.add(p + "@" + (i / 30).toFixed(2)); break; } }
      }
      if (bad.size) out.push(id + "/" + clip + ": " + [...bad].slice(0, 6).join(", "));
    }
  }
  return out;
});
console.log(res.length ? res.join("\n") : "all clips finite");
console.log(logs.join("\n") || "no page errors");
await browser.close();
