// in-game perf snapshot per phase: draw calls, triangles, JS sim time, render submit time
import { launch, shot, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1060, h: 880 });
const T = synth(page);
await page.waitForTimeout(1500);
await begin(page, T);
await page.waitForTimeout(3000);
const snap = async (label) => { await page.waitForTimeout(2500); const r = await ev(() => ({ calls: G.stats.drawCalls, tris: G.stats.tris, simMs: +G.stats.simMs.toFixed(2), renderMs: +G.stats.renderMs.toFixed(1), fps: G.stats.fps, scale: G.render.info().scale, cloth: G.cloth.sims.length })); console.log(label, JSON.stringify(r)); await shot(page, "perf_" + label); };
await snap("hub");
await ev(() => { G.player.reset({ x: 0, z: 12, facing: Math.PI }); G.game.debugStartBoss(); });
await page.waitForFunction(() => G.game.state === "boss", null, { timeout: 90000 });
await ev(() => { G.input.press("allyA"); setTimeout(() => G.input.release("allyA"), 50); G.input.press("allyB"); setTimeout(() => G.input.release("allyB"), 50); });
await snap("form1_allies");
await ev(() => { const b = G.boss.active; b.ent.hp = G.boss.phaseFloor(2) + 1; b.transforming = false; b.form = 2; b.onDamage(5, {}); });
await page.waitForFunction(() => G.boss.active.form === 3 && !G.boss.active.transforming, null, { timeout: 120000 });
await snap("form3");
console.log(logs.join("\n") || "no console errors");
await browser.close();
