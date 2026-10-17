import { launch, shot, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1100, h: 700 });
const T = synth(page);
await page.waitForTimeout(1200);
await begin(page, T);
await page.waitForTimeout(4000);
console.log(await ev(() => ({ fps: G.stats.fps, calls: G.stats.drawCalls, tris: G.stats.tris, geoms: G.game.scene.children.length, info: G.render.info() })));
// count meshes in scene
console.log(await ev(() => { let m=0, inst=0, pts=0, spr=0, outl=0, tris=0; G.game.scene.traverse(o=>{ if(o.isInstancedMesh) inst++; else if(o.isMesh){ m++; if(o.userData.isOutline) outl++; } else if(o.isPoints) pts++; else if(o.isSprite) spr++; }); return {meshes:m, instanced:inst, outlineMeshes: outl, points:pts, sprites:spr}; }));
await browser.close();
