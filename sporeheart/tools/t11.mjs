import { launch, shot, begin, synth } from "./lib.mjs";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const sizes = [["cover_l", 920, 360], ["cover_p", 360, 920], ["inner_l", 1060, 880], ["inner_p", 880, 1060]];
for (const [name, w, h] of sizes) {
  const { page, logs, ev, browser } = await launch({ w, h });
  const T = synth(page);
  await page.waitForTimeout(1500);
  await shot(page, "t11_" + name + "_title");
  await begin(page, T);
  await page.waitForTimeout(2500);
  await ev(() => { G.ui.hintHide(); G.ui.hideBanner(); });
  await page.waitForTimeout(600);
  await shot(page, "t11_" + name + "_hud");
  if (logs.length) console.log(name, logs.join("\n"));
  await browser.close();
}
