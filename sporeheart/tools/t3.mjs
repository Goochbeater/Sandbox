import { launch, shot, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1100, h: 700 });
const T = synth(page);
await page.waitForTimeout(1200);
await begin(page, T);
await ev(() => { G.player.reset({ x: 0, z: 14, facing: Math.PI }); G.game.debugStartBoss(); });
await page.waitForTimeout(1500); await shot(page, "t3_intro");
await page.waitForTimeout(3500); await shot(page, "t3_fight1");
for (let k = 0; k < 6; k++) { await page.waitForTimeout(900); await shot(page, "t3_f1_" + k); console.log(k, await ev(() => { const b = G.boss.active; return b.state + ":" + (b.atkName || "") + " hp=" + b.ent.hp.toFixed(0) + " d=" + b.dist().toFixed(1); })); }
console.log(logs.join("\n") || "no errors");
await browser.close();
