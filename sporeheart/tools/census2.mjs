// breakdown of the world's unbatched meshes in the hub
import { launch, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1060, h: 880 });
const T = synth(page);
await page.waitForTimeout(1500); await begin(page, T); await page.waitForTimeout(2500);
const r = await ev(() => {
  const out = {}, scene = G.game.scene, root = scene.children.find((c) => c.name === "world");
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
    const m = o.material, why = o.name.startsWith("batch") ? "BATCH" : o.isInstancedMesh ? "inst" :
      (m.isShaderMaterial ? "shader" : m.blending === 2 ? "additive" : m.transparent ? "transp" : "plain");
    let anc = ""; for (let p = o.parent; p && p !== root; p = p.parent) if (p.name) { anc = p.name; break; }
    const k = why + " | " + (o.userData.isOutline ? "OL " : "") + (o.name || "-") + " < " + anc;
    out[k] = (out[k] || 0) + 1;
  });
  return Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 40);
});
for (const [k, v] of r) console.log(String(v).padStart(4), k);
console.log(logs.join("\n") || "no console errors");
await browser.close();
