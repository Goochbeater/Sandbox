// node tools/charinfo.mjs <gallery.html>  — clip list, parts anchors, mesh/tri counts per character
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const html = process.argv[2];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
const logs = [];
page.on("console", (m) => { if (m.type() !== "log") logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
await page.goto("file://" + html);
await page.waitForFunction(() => window.G && G.gallery && G.gallery.ready, null, { timeout: 90000 });
for (const id of ["witch", "crane", "thistle", "veil", "veil2", "beast"]) {
  const r = await page.evaluate((id) => {
    try {
      const t0 = performance.now(); const o = G.chars.build(id); const ms = performance.now() - t0;
      let meshes = 0, tris = 0, outl = 0; const mats = new Set();
      o.root.traverse((m) => { if (m.isMesh) { meshes++; if (m.userData.isOutline) outl++; mats.add(m.material.uuid); const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
      const box = new G.THREE.Box3().setFromObject(o.root);
      return { id, buildMs: Math.round(ms), meshes, outl, tris: Math.round(tris), mats: mats.size, h: +box.max.y.toFixed(2), w: +(box.max.x - box.min.x).toFixed(2), clips: o.anim ? o.anim.clipNames().join(",") : "NONE", parts: Object.keys(o.parts || {}).join(",") };
    } catch (e) { return { id, err: e.stack.split("\n").slice(0, 3).join(" | ") }; }
  }, id);
  console.log(JSON.stringify(r));
}
console.log(logs.slice(0, 20).join("\n") || "no warnings");
await browser.close();
