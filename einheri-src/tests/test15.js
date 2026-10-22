// NPCs up close in the hall: node test15.js <name> <span> [setupjs]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const [name, span, setup] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').slice(0, 300)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html')); await pg.waitForTimeout(1500);
  await pg.evaluate(s => { document.getElementById('title').classList.add('off'); EIN.S.stage = 3; EIN.S.boss.angr = 1; if (s) eval(s); EIN.enterHub(); EIN.P.hp = 9999; }, setup || '');
  await pg.waitForTimeout(1500);
  const ids = ['hildr', 'bjarki', 'asta', 'kolr'], fs = require('fs'), dir = __dirname + '/shots/';
  for (let i = 0; i < ids.length; i++) {
    await pg.evaluate(([id, span]) => { const n = EIN.G.npcs.find(n => n.id === id); EIN.P.x = n.x + 60; EIN.P.y = n.y + 30; EIN.G.camLock = { x: n.x, y: n.y - 22, span: +span }; }, [ids[i], span || 110]);
    await pg.waitForTimeout(2200);
    fs.writeFileSync(dir + '_p' + i + '.png', await pg.screenshot());
  }
  console.log(errs.join('\n')); await b.close();
  require('child_process').execFileSync('python3', [__dirname + '/montage.py', dir, name, JSON.stringify(ids)]);
})();
