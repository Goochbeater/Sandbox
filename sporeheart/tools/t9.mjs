import { launch, begin, synth } from "./lib.mjs";
const { page, logs, ev, browser } = await launch({ w: 1100, h: 700 });
const T = synth(page);
await page.waitForTimeout(1200);
await begin(page, T);
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(400);
  console.log(i, await ev(() => ({ pt: +G.stats.playTime.toFixed(2), paused: G.game.paused, scr: G.ui.getScreen(), en: G.input.enabled, hidden: document.hidden, vis: document.visibilityState, ts: G.timeScale, hs: G.hitstopTimer })));
}
await browser.close();
