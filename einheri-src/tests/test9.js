// close-up of Einar in each facing and state, at phone resolution
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('PAGEERR: ' + e.message + (e.stack || '').slice(0, 300)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html'));
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { EIN.S.stage = 1; document.getElementById('title').classList.add('off'); EIN.enterHub('fire'); });
  await pg.waitForTimeout(500);
  const shots = [['down', Math.PI / 2, 'idle'], ['right', 0, 'move'], ['up', -Math.PI / 2, 'idle'], ['left', Math.PI, 'move']];
  let i = 0;
  for (const [n, f, st] of shots) {
    await pg.evaluate(([f, st, i]) => { const P = EIN.P; P.x = 1000; P.y = 1100; P.face = f; P.state = st; P.vx = st === 'move' ? Math.cos(f) * 120 : 0; P.vy = st === 'move' ? Math.sin(f) * 120 : 0; EIN.G.camLock = { x: 1000, y: 1080, span: 110 }; EIN.G.lock = true; }, [f, st, i]);
    await pg.waitForTimeout(700); await pg.screenshot({ path: __dirname + `/shots/e_${n}.png`, clip: { x: 302, y: 75, width: 240, height: 240 } }); i++;
  }
  await b.close();
})();
