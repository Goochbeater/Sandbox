const { chromium } = require('/opt/node-tools/node_modules/playwright');
const only = process.argv[2] ? process.argv[2].split(',') : null;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + '\n' + (e.stack || '').slice(0, 400)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html'));
  await pg.waitForTimeout(1000);
  const S = n => pg.screenshot({ path: __dirname + `/shots/hd_${n}.png` });
  const want = k => !only || only.includes(k);
  await pg.evaluate(() => { EIN.S.stage = 1; EIN.S.powers.frigg = 1; EIN.S.slots = ['frigg', 'thor']; EIN.S.powers.thor = 1; document.getElementById('title').classList.add('off'); });
  if (want('hub')) { await pg.evaluate(() => EIN.enterHub('fire')); await pg.waitForTimeout(1500); await S('h_hub'); await pg.evaluate(() => { EIN.P.x = 1000; EIN.P.y = 520; }); await pg.waitForTimeout(1200); await S('h_hub2'); }
  for (const r of ['iron', 'ice', 'sea', 'fire']) {
    if (!want(r)) continue;
    const t = Date.now(); await pg.evaluate(r => EIN.enterRealm(r, 'start'), r); console.log(r, 'gen ms', Date.now() - t, await pg.evaluate(() => EIN.G.world.genMs | 0));
    await pg.waitForTimeout(1200); await S('r_' + r);
    await pg.evaluate(() => { const w = EIN.G.world, n = w.nodes[5]; EIN.P.x = n.x; EIN.P.y = n.y + 150; });
    await pg.waitForTimeout(1200); await S('r_' + r + '2');
  }
  for (const bid of ['angr', 'thrym', 'nidhogg', 'surtr', 'utgard', 'skogul']) {
    if (!want(bid)) continue;
    await pg.evaluate(bid => { EIN.enterArena(bid, false, true); EIN.P.hp = 9999; }, bid);
    await pg.waitForTimeout(4500); await S('b_' + bid);
  }
  console.log('ERRORS:\n' + errs.slice(0, 20).join('\n'));
  await b.close();
})();
