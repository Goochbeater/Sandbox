// Bathhouse check: Lena, once she trusts the Falconer, offers the bathhouse; the scene goes through the 18+ gate, down to
// the tub (the positions moved into it, only the upright ones on the menu), changes position, finishes and returns to
// the common room. Checks the stage offset is set and cleared, the king is never drawn with his parts, the night is
// counted, the lock is released and the page logged no errors.
// Run: node tools/regress.js bath
const DRV = require('./drv.js');

const advP = `window.advP = (cond, ms, prefer) => new Promise(r => { const t0 = performance.now(); const f = () => { let ok = false; try { ok = cond(); } catch (e) {}
  if (ok) return r('ok ' + Math.round((performance.now() - t0) / 1000) + 's'); if (performance.now() - t0 > (ms || 120000)) return r('timeout');
  const bs = [...document.querySelectorAll('#nAsk .btn')]; if (bs.length && !document.getElementById('night').hidden) { (bs.find(b => prefer.test(b.textContent)) || bs[0]).click(); }
  if (!document.getElementById('ageGate').hidden) document.getElementById('ageYes').click();
  SCENE.advance(); setTimeout(f, 250); }; f(); }); 1`;
const st = ['eval', `JSON.stringify({ room: SCENE.room.id, on: NIGHT.on, pos: NIGHT.pos, ox: +LOVERS.O.x.toFixed(2), menu: [...document.querySelectorAll('#nPos button')].map(b => b.textContent), penis: !!(SCENE.player.sexGroup && SCENE.player.sexGroup.visible), nights: HOUSE.nights.lena || 0, venue: HOUSE.venue, lena: !!CAST.A.lena.visible, lock: SCENE.lock, errs: (window.__errs || []).length })`];

module.exports = {
  name: 'bath',
  runs: [{
    label: 'lantern',
    query: '?test&room=lantern&catchup=4',
    steps: [['wait', 4000], ['eval', DRV + '1'], ['eval', advP], ['eval', `HOUSE.met.lena = true; HOUSE.trust.lena = 4; SCENE.player.x = 8.6; 1`], ['wait', 600], ['eval', `window.__m = HOUSE.meet('lena'); 1`],
      ['eval', `advP(() => NIGHT.inBed && !NIGHT.busy && NIGHT.pos === 'lap' && !SCENE.bubble, 300000, /bathhouse/i)`], ['wait', 2000], st,
      ['eval', `NIGHT.to('kiss'); 1`], ['eval', `advP(() => NIGHT.pos === 'kiss' && !NIGHT.busy && !SCENE.bubble, 60000, /x/)`], ['wait', 1500],
      ['eval', `NIGHT.finish(); 1`], ['eval', `advP(() => !NIGHT.on && SCENE.lock === 0 && !SCENE.bubble, 240000, /x/)`], ['wait', 1500], st],
  }],
  check(label, evals) {
    if (evals.includes('timeout')) return 'an eval timed out';
    const [a, b] = evals.filter((v) => v && typeof v === 'object');
    if (!b) return 'expected two state results';
    if (a.room !== 'lbath' || !a.on || a.venue !== 'bath' || a.ox === 0 || !a.lena) return `not staged in the tub: ${JSON.stringify(a)}`;
    if (a.menu.join() !== 'Kiss') return `menu in the tub: ${a.menu}`;
    if (a.penis || b.penis) return 'the king is drawn with his parts';
    if (b.room !== 'lantern' || b.on || b.ox !== 0 || b.venue !== null) return `not cleared: ${JSON.stringify(b)}`;
    if (b.nights !== a.nights + 1) return `nights ${a.nights} -> ${b.nights}`;
    if (b.lock !== 0) return `lock ${b.lock}`;
    if (a.errs || b.errs) return `errs ${a.errs + b.errs}`;
    return null;
  },
};
