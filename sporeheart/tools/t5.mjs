import { launch, shot, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1100, h: 700 });
const T = synth(page);
await page.waitForTimeout(1200);
await begin(page, T);
await ev(() => { G.player.reset({ x: 0, z: 6, facing: Math.PI }); G.game.debugStartBoss(); });
await page.waitForFunction(() => G.game.state === "boss", null, { timeout: 60000 });
await ev(() => { const b = G.boss.active; b.ent.hp = G.boss.phaseFloor(1) + 1; b.onDamage(5, { stagger: 0 }); });
await page.waitForTimeout(2500); await shot(page, "t5_tr2");
await page.waitForFunction(() => !G.boss.active.transforming, null, { timeout: 60000 });
await page.waitForTimeout(2500); await shot(page, "t5_p2");
for (let k = 0; k < 6; k++) { await page.waitForTimeout(1500); console.log("p2", k, await ev(() => { G.player.ent.hp = 100; const b = G.boss.active; return b.form + " " + b.state + ":" + b.atkName + " d=" + b.dist().toFixed(1); })); }
await ev(() => { const b = G.boss.active; b.ent.hp = G.boss.phaseFloor(2) + 1; b.onDamage(5, { stagger: 0 }); });
await page.waitForTimeout(3000); await shot(page, "t5_tr3");
await page.waitForFunction(() => !G.boss.active.transforming, null, { timeout: 90000 });
await page.waitForTimeout(1500); await shot(page, "t5_p3");
for (let k = 0; k < 10; k++) { await page.waitForTimeout(1500); console.log("p3", k, await ev(() => { G.player.ent.hp = 100; const b = G.boss.active; return b.form + " " + b.state + ":" + b.atkName + " d=" + b.dist().toFixed(1); })); if (k === 2 || k===6) await shot(page, "t5_p3_" + k); }
console.log(logs.join("\n") || "no errors");
await browser.close();
