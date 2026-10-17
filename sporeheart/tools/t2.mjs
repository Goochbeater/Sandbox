import { launch, shot, begin, press, btnPos, synth } from "./lib.mjs";
const { page, T: _T, logs, ev, browser } = await launch({ w: 1100, h: 700 });
const T = synth(page); T.tap = async (x, y) => { await T.down(9, x, y); await page.waitForTimeout(50); await T.up(9, x, y); };
await page.waitForTimeout(1500);
await begin(page, T);
await page.waitForTimeout(1500);
// run forward with the left thumb for 2.5s
await T.down(1, 150, 520); await T.move(1, 150, 440); await page.waitForTimeout(2500);
// plus a camera drag with a second finger
await T.down(2, 800, 300); for (let i = 0; i < 8; i++) { await T.move(2, 800 + i * 18, 300); await page.waitForTimeout(30); }
await T.up(2);
await page.waitForTimeout(500);
await shot(page, "t2_run");
console.log("run:", await ev(() => ({ x: G.player.x.toFixed(1), z: G.player.z.toFixed(1), vz: G.player.vz.toFixed(1), sprint: G.player.sprinting, st: G.input.stick.mag.toFixed(2) })));
await T.up(1);
// jump x2, dash, attack, spell, warp
await T.tapBtn("jump"); await page.waitForTimeout(250); await T.tapBtn("jump"); await page.waitForTimeout(150);
await shot(page, "t2_air");
await page.waitForTimeout(700);
await T.tapBtn("dash"); await page.waitForTimeout(100); await shot(page, "t2_dash");
for (let i = 0; i < 4; i++) { await T.tapBtn("attack", 40); await page.waitForTimeout(220); }
await T.tapBtn("magic", 60); await page.waitForTimeout(400);
await shot(page, "t2_combat");
console.log("after:", await ev(() => ({ mana: G.player.mana.toFixed(0), combo: G.player.comboCount, act: G.player.action && G.player.action.type, breaks: G.stats.breaks })));
console.log(logs.join("\n") || "no console errors");
await browser.close();
