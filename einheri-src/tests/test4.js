const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5, hasTouch: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').slice(0, 300)));
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html'));
  await pg.waitForTimeout(16000);
  await pg.screenshot({ path: __dirname + '/shots/t_title.png' });
  for (const v of ['void', 'ship', 'hrafnsey', 'choosing', 'valhalla', 'endB', 'endC', 'deathbed']) {
    await pg.evaluate(v => { document.getElementById('title').classList.add('off'); EIN.G.vig = v; EIN.G.vigT = 4; }, v);
    await pg.waitForTimeout(1500); await pg.screenshot({ path: __dirname + '/shots/v_' + v + '.png' });
  }
  console.log('ERR', errs.join('\n'));
  await b.close();
})();
