// Hearth check: the royal night scene played on the bearskin by the fire instead of the bed (NIGHT.SPOTS.rug), from the
// bed's prompt through the 18+ gate, the "By the fire" choice, a change of position and the finish, to the next morning.
// Checks the stage offset is set and cleared, the menu has no "Bed's edge", the bedding is laid out and put away, the
// engine never draws the king's parts, the week advances, the lock is released and the page logged no errors.
// Run: node tools/regress.js hearth
const DRV = require('./drv.js');

// like DRV.adv, but picks the choice whose label matches `prefer` when there is one
const advP = `window.advP = (cond, ms, prefer) => new Promise(r => { const t0 = performance.now(); const f = () => { let ok = false; try { ok = cond(); } catch (e) {}
  if (ok) return r('ok ' + Math.round((performance.now() - t0) / 1000) + 's'); if (performance.now() - t0 > (ms || 120000)) return r('timeout');
  const bs = [...document.querySelectorAll('#nAsk .btn')]; if (bs.length && !document.getElementById('night').hidden) { (bs.find(b => prefer.test(b.textContent)) || bs[0]).click(); }
  if (!document.getElementById('ageGate').hidden) document.getElementById('ageYes').click();
  SCENE.advance(); setTimeout(f, 250); }; f(); }); 1`;
const st = ['eval', `JSON.stringify({ on: NIGHT.on, spot: !!NIGHT.spot, ox: LOVERS.O.x, pos: NIGHT.pos, hearth: BEDROOM.hearthProps.filter(m => m.visible).length, week: CAL.week, lock: SCENE.lock, menu: [...document.querySelectorAll('#nPos button')].map(b => b.textContent), penis: !!(SCENE.player.sexGroup && SCENE.player.sexGroup.visible), errs: (window.__errs || []).length })`];

module.exports = {
  name: 'hearth',
  runs: [{
    label: 'bedroom',
    query: '?test&room=bedroom&catchup=4',
    steps: [['wait', 4000], ['eval', DRV + '1'], ['eval', advP], ['eval', `COURT.done = true; SCENE.player.x = -6.5; 1`], ['eval', `DRV.use('bed')`],
      ['eval', `advP(() => NIGHT.inBed && !NIGHT.busy && !SCENE.bubble, 240000, /Halina|fire/i)`], ['wait', 2000], st,
      ['eval', `NIGHT.to('ride'); 1`], ['eval', `advP(() => NIGHT.pos === 'ride' && !NIGHT.busy && !SCENE.bubble, 60000, /x/)`], ['wait', 2000],
      ['eval', `NIGHT.finish(); 1`],
      ['eval', `advP(() => !NIGHT.on && SCENE.lock === 0 && !SCENE.bubble && document.getElementById('fade').classList.contains('off'), 240000, /x/)`], ['wait', 1500], st],
  }],
  check(label, evals) {
    if (evals.includes('timeout')) return 'an eval timed out';
    const [a, b] = evals.filter((v) => v && typeof v === 'object');
    if (!b) return 'expected two state results';
    if (!a.on || !a.spot || a.ox === 0) return `not staged at the hearth: ${JSON.stringify(a)}`;
    if (a.hearth < 3) return `bedding laid out: ${a.hearth}`;
    if (a.menu.some((t) => /edge/i.test(t))) return `menu offers the bed's edge: ${a.menu}`;
    if (a.penis || b.penis) return 'the king is drawn with his parts';
    if (b.on || b.spot || b.ox !== 0 || b.hearth !== 0) return `not cleared: ${JSON.stringify(b)}`;
    if (b.week !== a.week + 1) return `week ${a.week} -> ${b.week}`;
    if (b.lock !== 0) return `lock ${b.lock}`;
    if (a.errs || b.errs) return `errs ${a.errs + b.errs}`;
    return null;
  },
};
