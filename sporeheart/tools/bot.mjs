// Automated boss-fight bot: drives the real input layer, logs phase/attack coverage and any console errors.
//   node tools/bot.mjs [seconds] [--dmg=N]
import { launch, shot, begin, synth } from "./lib.mjs";
const secs = +(process.argv[2] || 120);
const { page, logs, ev, browser } = await launch({ w: 1000, h: 600 });
const T = synth(page);
await page.waitForTimeout(1500);
await begin(page, T);
await ev(() => { G.player.reset({ x: 0, z: 12, facing: Math.PI }); G.game.debugStartBoss(); });
await ev(() => {
  window.__seen = {}; window.__phase = {};
  const I = G.input;
  let n = 0;
  setInterval(() => {
    const P = G.player, b = G.boss.active; if (!b || b.dead) return;
    n++;
    if (G.game.state !== "boss") return;
    P.ent.hp = Math.max(P.ent.hp, 35); P.mana = Math.max(P.mana, 40);       // immortal-ish bot, we're testing the boss
    const d = b.dist(), want = b.form === 3 ? 5 : 2.4;
    I.setStick(0, d > want ? 1 : d < want - 1 ? -0.6 : 0.2);
    if (d < want + 3 && n % 3 === 0) { I.press("attack"); setTimeout(() => I.release("attack"), 50); }
    if (n % 17 === 0) { I.press("dash"); setTimeout(() => I.release("dash"), 40); }
    if (n % 23 === 0) { I.press("magic"); setTimeout(() => I.release("magic"), 40); }
    if (n % 31 === 0) { I.press("jump"); setTimeout(() => I.release("jump"), 40); }
    if (n % 41 === 0) { I.press("allyA"); setTimeout(() => I.release("allyA"), 40); }
    if (n % 47 === 0) { I.press("allyB"); setTimeout(() => I.release("allyB"), 40); }
    if (n % 53 === 0) { I.press("hook"); setTimeout(() => I.release("hook"), 40); }
    if (b.atkName) window.__seen[b.form + ":" + b.atkName] = (window.__seen[b.form + ":" + b.atkName] || 0) + 1;
    if (b.state === "stagger") window.__seen[b.form + ":STAGGER"] = (window.__seen[b.form + ":STAGGER"] || 0) + 1;
  }, 90);
});
const t0 = Date.now();
let k = 0;
while (Date.now() - t0 < secs * 1000) {
  await page.waitForTimeout(5000);
  const s = await ev(() => { const b = G.boss.active; return b ? { form: b.form, hp: Math.round(b.ent.hp), state: b.state, atk: b.atkName, ph: G.game.state, php: Math.round(G.player.hp), px: +G.player.x.toFixed(1), pz: +G.player.z.toFixed(1) } : null; });
  console.log(Math.round((Date.now() - t0) / 1000) + "s", JSON.stringify(s));
  if (k++ % 3 === 2) await shot(page, "bot_" + k);
  if (s && (s.ph === "victory")) break;
}
console.log("attacks seen:", JSON.stringify(await ev(() => window.__seen)));
console.log(logs.join("\n") || "no console errors");
await browser.close();
