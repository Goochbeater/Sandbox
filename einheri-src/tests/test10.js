// one boss, posed: node test10.js <bid> <js to run after entering> <shot>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const [bid, js, name, dpr] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: +(dpr || 2), hasTouch: true });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').slice(0, 300)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html') + ''); await pg.waitForTimeout(1500);
  await pg.evaluate(bid => { document.getElementById('title').classList.add('off'); EIN.S.stage = 5; EIN.enterArena(bid, false, true); EIN.P.hp = 9999; }, bid);
  await pg.waitForTimeout(800);
  await pg.evaluate(js || '0');
  await pg.waitForTimeout(+(process.env.WAIT || 3500));
  await pg.screenshot({ path: __dirname + '/shots/' + (name || 'x') + '.png' });
  console.log(errs.join('\n')); await b.close();
})();
