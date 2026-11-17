// breakables: batched -> first hit swaps to real meshes (wobble) -> smash collapses everything
import { launch, shot, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 900, h: 700 });
const T = synth(page);
await page.waitForTimeout(1500); await begin(page, T); await page.waitForTimeout(2000);
const pick = await ev(() => {
  const P = G.player, bs = G.world.breakables.filter((b) => b.alive && b.batched);
  bs.sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
  const b = bs[0]; window.__b = b;
  P.reset({ x: b.x + 3, z: b.z + 3, facing: Math.atan2(-3, -3) });
  return { n: G.world.breakables.length, batched: bs.length, kind: b.kind, debris: b.debris, hidden: b.hidden.length, hp: b.hp };
});
console.log("pick", JSON.stringify(pick));
await page.waitForTimeout(1500); await shot(page, "t12_a_batched");
const hit = await ev(() => { const b = window.__b; G.world.hitBreakables({ x: b.x, y: 0.5, z: b.z }, 0.3, 1, "player"); return { batched: !!b.batched, shown: b.mesh.visible && (b.mesh.isMesh ? true : true), flash: b.flash, alive: b.alive, hp: b.hp }; });
console.log("after hit", JSON.stringify(hit));
await page.waitForTimeout(60); await shot(page, "t12_b_hit");
const kill = await ev(() => { const b = window.__b; G.world.hitBreakables({ x: b.x, y: 0.5, z: b.z }, 0.3, 9999, "player"); return { alive: b.alive, vis: b.mesh.visible, orph: b.orphans }; });
console.log("after smash", JSON.stringify(kill));
await page.waitForTimeout(1200); await shot(page, "t12_c_smashed");
// smash an untouched batched one in one blow (collapse path without unbatch)
const one = await ev(() => { const b = G.world.breakables.find((x) => x.alive && x.batched); const r = b.batched[0]; G.world.hitBreakables({ x: b.x, y: 0.5, z: b.z }, 0.3, 9999, "player"); const a = r.geo.attributes.position.array; return { alive: b.alive, y0: a[r.start * 3 + 1] }; });
console.log("one-shot", JSON.stringify(one));
console.log(logs.join("\n") || "no console errors");
await browser.close();
