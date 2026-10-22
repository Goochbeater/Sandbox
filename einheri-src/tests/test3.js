const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('PAGEERR: ' + e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html'));
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { EIN.S.stage = 1; EIN.S.powers.frigg = 1; EIN.S.boss.angr = 1; EIN.S.slots = ['frigg', null]; document.getElementById('title').classList.add('off'); EIN.enterHub('fire'); EIN.G.camLock = { x: 1000, y: 800, span: 230 }; });
  await pg.waitForTimeout(2500); await pg.screenshot({ path: __dirname + '/shots/c_hub.png' });
  await pg.evaluate(() => { EIN.enterRealm('iron', 'start'); const w = EIN.G.world; const n = w.nodes[2]; EIN.P.x = n.x; EIN.P.y = n.y + 60; EIN.G.enemies.length = 0;
    for (const [k, dx, dy] of [['draugr', -60, -30], ['varg', 60, -40], ['hag', 0, -90], ['troll', 110, 30]]) { const e = EIN.G.enemies.push(Object.assign({}, {})); }
    EIN.G.enemies.length = 0; });
  await pg.evaluate(() => { const P = EIN.P; for (const [k, dx, dy] of [['draugr', -70, -30], ['varg', 70, -50], ['hag', 0, -100], ['troll', 120, 30], ['frostdraugr', -120, 40], ['imp', -30, 70]]) spawnFoe(k, P.x + dx, P.y + dy); for (const e of EIN.G.enemies) { e.aggro = false; e.state = 'idle'; } EIN.G.camLock = { x: P.x, y: P.y - 20, span: 260 }; });
  await pg.waitForTimeout(1500); await pg.screenshot({ path: __dirname + '/shots/c_foes.png' });
  await b.close();
})();
