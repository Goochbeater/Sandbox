// god power fx sheet: node test14.js <power> <name> <times csv>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const [pw, name, times, realm] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').slice(0, 300)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html')); await pg.waitForTimeout(1500);
  await pg.evaluate(r => { document.getElementById('title').classList.add('off'); EIN.S.stage = 5; EIN.enterRealm(r); EIN.P.hp = 9999; }, realm || 'ice');
  await pg.waitForTimeout(1500);
  const T = times.split(',').map(Number), fs = require('fs'), dir = __dirname + '/shots/';
  for (let i = 0; i < T.length; i++) {
    await pg.evaluate(([pw, t]) => { EIN.G.fx.length = 0; EIN.G.camLock = { x: EIN.P.x, y: EIN.P.y - 200, span: 760 };
      EIN.G.fx.push({ t, life: 1.5, draw: window['fx' + pw], x: EIN.P.x + 60, y: EIN.P.y - 20, frozen: 1 }); window.updFx = () => {}; }, [pw, T[i]]);
    await pg.waitForTimeout(i ? 400 : 2500);
    fs.writeFileSync(dir + '_p' + i + '.png', await pg.screenshot());
  }
  console.log(errs.join('\n')); await b.close();
  require('child_process').execFileSync('python3', [__dirname + '/montage.py', dir, name, JSON.stringify(T.map(t => 't=' + t))]);
})();
