// pose sheet: node test13.js <bid> <span> <name> '<json list of {an:{k:v}, label}>'
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const [bid, span, name, posesJ, oy, setup] = process.argv.slice(2);
  const poses = JSON.parse(posesJ);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').slice(0, 300)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html')); await pg.waitForTimeout(1500);
  await pg.evaluate(bid => { document.getElementById('title').classList.add('off'); EIN.S.stage = 5; EIN.enterArena(bid, false, true); EIN.P.hp = 99999; }, bid);
  await pg.waitForTimeout(1200);
  if (setup) await pg.evaluate(setup);
  const shots = [];
  for (const p of poses) {
    await pg.evaluate(([p, span, oy]) => { const b = EIN.G.boss; b.intro = false; b.gen = null; b.cd = 99; G.hazards && (G.hazards.length = 0);
      for (const k in b.an) { b.an[k].to = b.an[k].v = (p.an[k] ?? 0); }
      EIN.G.camLock = { x: b.x, y: b.y - (+oy || 520), span: +span }; document.querySelectorAll('#hud, .hud, #bossbar').forEach(e => e.style.visibility = 'hidden'); }, [p, span, oy]);
    await pg.waitForTimeout(p.wait || 700);
    shots.push(await pg.screenshot({ type: 'png' }));
  }
  console.log(errs.join('\n'));
  await b.close();
  const { execSync } = require('child_process'), fs = require('fs'), dir = __dirname + '/shots/';
  shots.forEach((s, i) => fs.writeFileSync(dir + '_p' + i + '.png', s));
  require('child_process').execFileSync('python3', [__dirname + '/montage.py', dir, name, JSON.stringify(poses.map(p => p.label || ''))]);
})();
