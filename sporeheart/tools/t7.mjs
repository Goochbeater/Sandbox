import { launch, shot, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1100, h: 700 });
const T = synth(page);
await page.waitForTimeout(1200);
await begin(page, T);
// bounce pad
await ev(() => { G.player.reset({ x: -4.4, z: 31, facing: Math.PI }); });
await page.waitForTimeout(600);
await T.down(1, 150, 520); await T.move(1, 150, 440);
await page.waitForTimeout(1600);
console.log("bounce", await ev(() => ({ y: G.player.y.toFixed(1), vy: G.player.vy.toFixed(1), z: G.player.z.toFixed(1) })));
await shot(page, "t7_bounce");
await T.up(1, 150, 440);
// stall smash: teleport next to a stall in the plaza
await ev(() => { G.player.reset({ x: -6.5, z: -1.2, facing: -2.2 }); G.player.cam.yaw = -2.2; });
await page.waitForTimeout(500);
for (let i = 0; i < 5; i++) { await T.tapBtn("attack", 40); await page.waitForTimeout(260); }
await page.waitForTimeout(150);
await shot(page, "t7_smash");
console.log("breaks", await ev(() => G.stats.breaks));
// heavy slam
await ev(() => { G.player.reset({ x: 3, z: 8, facing: Math.PI }); });
await page.waitForTimeout(400);
await T.tapBtn("magic", 700); await page.waitForTimeout(300);
await shot(page, "t7_nova");
console.log(logs.join("\n") || "no errors");
await browser.close();
