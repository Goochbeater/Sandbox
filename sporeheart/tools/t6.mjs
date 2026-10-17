import { launch, shot, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1100, h: 700 });
const T = synth(page);
await page.waitForTimeout(1200);
await begin(page, T);
await ev(() => { G.player.reset({ x: 0, z: 9, facing: Math.PI }); G.game.debugStartBoss(); });
await page.waitForFunction(() => G.game.state === "boss", null, { timeout: 60000 });
for (let k = 0; k < 10; k++) { await page.waitForTimeout(1000); console.log(k, await ev(() => { G.player.ent.hp = 100; const b = G.boss.active, p = b.pos(); return b.state + ":" + b.atkName + " pos=" + p.x.toFixed(1) + "," + p.z.toFixed(1) + " d=" + b.dist().toFixed(1); })); }
console.log(logs.join("\n") || "no errors");
await browser.close();
