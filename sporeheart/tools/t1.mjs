import { launch, shot, SP } from "./lib.mjs";
const { page, T, logs, ev, browser } = await launch({ w: 1100, h: 700 });
await page.waitForTimeout(2500);
await shot(page, "t1_title");
// tap BEGIN
const b = await page.evaluate(() => { const r = [...document.querySelectorAll('.sh-btn')].find(x => /begin/i.test(x.textContent)).getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
await T.tap(b.x, b.y);
await page.waitForTimeout(3500);
await shot(page, "t1_hud");
console.log(logs.join("\n"));
console.log(await ev(() => ({ state: G.game.state, scr: G.ui.getScreen(), pl: [G.player.x, G.player.z], r: G.render.info() })));
await browser.close();
