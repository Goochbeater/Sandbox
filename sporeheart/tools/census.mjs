// visible renderables per top-level group (in the boss arena with allies), outlines / casters split
import { launch, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1060, h: 880 });
const T = synth(page);
await page.waitForTimeout(1500); await begin(page, T); await page.waitForTimeout(2500);
const census = () => ev(() => {
  const THREE = G.THREE, cam = G.game.camera || G.render.camera, out = {}, fr = new THREE.Frustum(), m = new THREE.Matrix4();
  cam.updateMatrixWorld(); m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(m);
  const scene = G.game.scene || G.render.scene;
  let total = 0, cast = 0;
  const walk = (o, top, vis) => {
    if (!o.visible) return;
    if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.material) {
      let inF = true;
      if (o.frustumCulled && o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); inF = fr.intersectsObject(o); }
      if (inF) {
        const k = top + ":" + (o.userData.isOutline ? "outline" : o.isSprite ? "sprite" : o.isPoints ? "points" : o.isInstancedMesh ? "inst" : "mesh");
        out[k] = (out[k] || 0) + 1; total++;
      }
      if (o.castShadow) cast++;
    }
    for (const c of o.children) walk(c, top === "scene" ? (c.name || c.type) : top, vis);
  };
  walk(scene, "scene", true);
  return { total, cast, rows: Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 30) };
});
console.log("HUB", JSON.stringify(await census()));
await ev(() => { G.player.reset({ x: 0, z: 12, facing: Math.PI }); G.game.debugStartBoss(); });
await page.waitForFunction(() => G.game.state === "boss", null, { timeout: 90000 });
await ev(() => { G.input.press("allyA"); setTimeout(() => G.input.release("allyA"), 50); G.input.press("allyB"); setTimeout(() => G.input.release("allyB"), 50); });
await page.waitForTimeout(1500);
console.log("BOSS", JSON.stringify(await census()));
console.log(logs.join("\n") || "no console errors");
await browser.close();
