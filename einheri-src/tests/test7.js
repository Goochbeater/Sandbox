// stress: long random combat in every area, with canvas instrumentation, hunting black-outs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const areas = (process.argv[2] || 'iron,angr,ice,thrym,sea,nidhogg,fire,surtr,utgard,skogul,hub').split(',');
const secs = +(process.argv[3] || 30);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
  await ctx.addInitScript(() => {
    window.__bad = []; window.__depth = 0; window.__maxDepth = 0;
    const P = CanvasRenderingContext2D.prototype;
    const note = (k, a) => { if (window.__bad.length < 60) window.__bad.push(k + ' ' + JSON.stringify(a).slice(0, 80) + ' @ ' + (new Error().stack || '').split('\n').slice(2, 5).join(' | ').replace(/file:\/\/\/[^ ]*einheri\.html/g, '')); };
    const wrap = (name, test) => { const f = P[name]; P[name] = function (...a) { if (test(a)) note(name, a); return f.apply(this, a); }; };
    wrap('arc', a => !(a[2] >= 0) || a.slice(0, 5).some(v => !isFinite(v)));
    wrap('ellipse', a => !(a[2] >= 0 && a[3] >= 0) || a.slice(0, 7).some(v => !isFinite(v)));
    wrap('createRadialGradient', a => !(a[2] >= 0 && a[5] >= 0) || a.some(v => !isFinite(v)));
    wrap('createLinearGradient', a => a.some(v => !isFinite(v)));
    wrap('drawImage', a => a.slice(1).some(v => typeof v === 'number' && !isFinite(v)));
    const sv = P.save, rs = P.restore;
    P.save = function () { if (this.canvas && this.canvas.id === 'c') { window.__depth++; window.__maxDepth = Math.max(window.__maxDepth, window.__depth); } return sv.call(this); };
    P.restore = function () { if (this.canvas && this.canvas.id === 'c') window.__depth--; return rs.call(this); };
  });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 400)); });
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + '\n' + (e.stack || '').slice(0, 400)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html') + '');
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { const S = EIN.S; S.stage = 5; for (const k of ['frigg', 'thor', 'freyja', 'heimdall', 'loki', 'odin']) S.powers[k] = 1; S.slots = ['thor', 'odin']; document.getElementById('title').classList.add('off'); G.scene = { kind: 'none' }; });
  const lum = () => pg.evaluate(() => {
    const c = document.getElementById('c'), t = document.createElement('canvas'); t.width = 64; t.height = 32; const g = t.getContext('2d'); g.drawImage(c, 0, 0, 64, 32);
    const d = g.getImageData(0, 0, 64, 32).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3;
  });
  for (const a of areas) {
    const before = errs.length;
    await pg.evaluate(a => {
      if (a === 'hub') EIN.enterHub('fire');
      else if (EIN.REALMS[a]) EIN.enterRealm(a, 'start');
      else EIN.enterArena(a, false, true);
      window.__depth = 0;
    }, a);
    await pg.waitForTimeout(800);
    const t0 = Date.now(); let i = 0, dark = 0, depthBad = 0, minL = 999;
    while (Date.now() - t0 < secs * 1000) {
      await pg.evaluate(i => {
        const I = EIN.IN, P = EIN.P; if (!P) return;
        const ang = Math.sin(i * .37) * Math.PI + i * .05; I.mx = Math.cos(ang); I.my = Math.sin(ang); I.mag = (i % 9) < 7 ? 1 : 0;
        if (i % 2 === 0) I.atkJ = true; I.atk = (i % 13) < 4; if (i % 7 === 3) I.dodge = true; else I.dodge = false;
        if (i % 23 === 5) I.p[0] = true; if (i % 31 === 9) I.p[1] = true;
        if (P.hp < 30 && Math.random() < .7) P.hp = 100;
        if (G.boss && G.boss.dead) { G.boss.dead = false; G.boss.hp = G.boss.maxhp; }
        if (G.cs && (window.DLG && DLG.open)) { DLG.t = 1; dlgFinish(); if (!DLG.choices) dlgTap(); }
        if (G.cs && G.cardOpen) cardHide();
      }, i);
      await pg.waitForTimeout(120); i++;
      if (i % 12 === 0) {
        const L = await lum(), st = await pg.evaluate(() => ({ d: window.__depth, f: G.fade, vig: G.vig, cs: !!G.cs, sc: G.scene && G.scene.kind, hp: EIN.P && EIN.P.hp, ps: EIN.P && EIN.P.state, fade: G.fade, op: getComputedStyle(document.getElementById('fade')).opacity }));
        minL = Math.min(minL, L);
        if (st.d !== 0) depthBad++;
        if (L < 12 && st.f < .5) { dark++; console.log('DARK', a, L.toFixed(1), JSON.stringify(st)); await pg.screenshot({ path: __dirname + `/shots/dark_${a}_${dark}.png` }); }
        await pg.evaluate(() => { window.__depth = 0; });
      }
    }
    const bad = await pg.evaluate(() => { const b = window.__bad.slice(); window.__bad.length = 0; return b; });
    console.log(a, 'minLum', minL.toFixed(1), 'dark', dark, 'unbalancedSaveSamples', depthBad, 'maxDepth', await pg.evaluate(() => window.__maxDepth), 'errs', errs.length - before);
    for (const x of bad.slice(0, 8)) console.log('   BAD', x);
    for (const e of errs.slice(before, before + 4)) console.log('   ERR', e);
    await pg.evaluate(() => { window.__maxDepth = 0; });
  }
  await b.close();
})();
