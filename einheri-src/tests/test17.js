// realm readability sheet: node test17.js <realm> <name>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const [realm, name] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html')); await pg.waitForTimeout(1500);
  await pg.evaluate(r => { document.getElementById('title').classList.add('off'); EIN.S.stage = 5; EIN.enterRealm(r, 'start'); EIN.P.hp = 9999; }, realm);
  await pg.waitForTimeout(2000);
  const fs = require('fs'), dir = __dirname + '/shots/', L = [];
  for (let i = 0; i < 6; i++) {
    await pg.evaluate(i => { const w = EIN.G.world; if (i) { const n = w.nodes[(i * 4) % w.nodes.length], e = w.edges ? null : null; EIN.P.x = n.x + (i % 2 ? 140 : -120); EIN.P.y = n.y + 90; } EIN.G.cs = null; }, i);
    await pg.waitForTimeout(1600);
    fs.writeFileSync(dir + '_p' + i + '.png', await pg.screenshot()); L.push('spot ' + i);
  }
  console.log(errs.join('\n')); await b.close();
  require('child_process').execFileSync('python3', [__dirname + '/montage.py', dir, name, JSON.stringify(L)]);
})();
