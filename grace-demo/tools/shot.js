// Headless check of the built page: loads it in Chromium (software WebGL), waits for the scene, runs a list of steps and
// saves screenshots plus the page's console. Usage:
//   node tools/shot.js [page] [outPrefix] ['<steps json>']
// steps: [["wait", ms], ["key", "ArrowRight", holdMs], ["shot", "name"], ["eval", "js"], ["tap", x, y]]
// env: W, H (CSS px, default 1000x446 ≈ the phone screenshots), DPR (default 2)
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const page0 = path.resolve(process.argv[2] || path.join(__dirname, '../build/index.html'));
  const out = process.argv[3] || path.join(__dirname, '../out/shot');
  const steps = JSON.parse(process.argv[4] || '[["wait",1500],["shot","a"]]');
  const W = +(process.env.W || 1000), H = +(process.env.H || 446), DPR = +(process.env.DPR || 2);
  require('fs').mkdirSync(path.dirname(out), { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: !!process.env.TOUCH });
  const page = await ctx.newPage();
  const log = [];
  page.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
  const q = process.env.Q || '';
  await page.goto('file://' + page0 + q);
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }); } catch (e) { log.push('[shot] timeout waiting for __ready'); }
  for (const s of steps) {
    if (s[0] === 'wait') await page.waitForTimeout(s[1]);
    else if (s[0] === 'key') { await page.keyboard.down(s[1]); await page.waitForTimeout(s[2] || 500); await page.keyboard.up(s[1]); }
    else if (s[0] === 'press') await page.keyboard.press(s[1]);
    else if (s[0] === 'tap') await page.mouse.click(s[1], s[2]);
    else if (s[0] === 'eval') log.push('[eval] ' + JSON.stringify(await page.evaluate(s[1])));
    else if (s[0] === 'shot') await page.screenshot({ path: `${out}_${s[1]}.png` });
  }
  console.log(log.join('\n'));
  await browser.close();
})();
