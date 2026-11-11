// Siege-court check: the steward's reports of earlier choices (REALM.ECHO) in a court week and in the crisis, and two of
// the siege petitions (the aid panel and a decision) heard to the end. Checks each echo is told once, the petitions set
// their flags, the lock is released and the page logged no errors.
// Run: node tools/regress.js siege
const DRV = require('./drv.js');

const auto = `window.__auto = setInterval(() => { const c = document.getElementById('court'), w = document.getElementById('week');
  if (c && !c.hidden) { const g = document.getElementById('cpGrant'), note = document.getElementById('cpNote').textContent; const plus = [...c.querySelectorAll('.pm')].filter(b => b.textContent === '+' && !b.disabled);
    if (/Meets/.test(note) || !plus.length) (g.disabled ? document.getElementById('cpRefuse') : g).click(); else plus[0].click(); }
  else if (w && !w.hidden) { const seal = document.getElementById('wkSeal'), res = document.getElementById('wkResult'); if (!res.hidden) document.getElementById('wkDone').click(); else if (!seal.disabled) seal.click(); else { const p = [...w.querySelectorAll('#wkRows .pm')].filter(b => b.textContent === '+' && !b.disabled); if (p.length) p[0].click(); } } }, 300); 1`;
const court = [['eval', `SCENE.advance(); DRV.use('throne')`], ['eval', `DRV.adv(() => COURT.done && SCENE.lock === 0 && !SCENE.bubble && !SCENE.modal, 400000)`]];
const st = ['eval', `JSON.stringify({ echo: Object.keys(REALM.done).filter(k => k.startsWith('echo:')), flags: REALM.flags, heard: Object.keys(REALM.heardIds), crisis: CAL.crisis, lock: SCENE.lock, errs: (window.__errs || []).length })`];

module.exports = {
  name: 'siege',
  runs: [{
    label: 'throne',
    query: '?test&room=throne&catchup=4',
    steps: [['wait', 4000], ['eval', DRV + '1'], ['eval', auto], ['eval', `SCENE.player.crownMesh.visible = true; 1`],
      // a court week: three reports are due, a fourth (week 4's) is not
      ['eval', `REALM.flags = { marta: 1, tolls: 0, pensions: 2, zofiaShoots: 1 }; CAL.phase = 'court'; CAL.week = 3; REALM.newWeek(); JSON.stringify({ due: REALM.echoDue().map(r => r[0]) })`],
      ...court, st,
      ['eval', `COURT.rise(); 1`], ['eval', `DRV.adv(() => !SCENE.player.sitting && SCENE.lock === 0, 60000)`],
      // the crisis, day 10: only the wall and the herald are left to hear
      ['eval', `Object.assign(CAL, { phase: 'crisis', crisis: 10, feastDone: true }); Object.assign(REALM.flags, { jacek: 0, warehouse: 1 });
        for (const [id] of REALM.CRISIS) if (id !== 'sWall' && id !== 'sQuarter') REALM.heardIds[id] = 1; COURT.done = !REALM.waiting();
        JSON.stringify({ q: REALM.queue().map(p => p.id), due: REALM.echoDue().map(r => r[0]) })`],
      ...court, st],
  }],
  check(label, evals) {
    if (evals.includes('timeout')) return 'an eval timed out';
    const objs = evals.filter((v) => v && typeof v === 'object');
    const [due1, s1, q2, s2] = objs;
    if (!s2) return `expected 4 results, got ${objs.length}`;
    if (due1.due.join() !== 'marta,tolls,pensions') return `week 3 due: ${due1.due}`;
    if (s1.echo.join() !== 'echo:marta:1,echo:tolls:0,echo:pensions:2') return `week 3 told: ${s1.echo}`;
    if (q2.q.join() !== 'sWall,sQuarter') return `crisis queue: ${q2.q}`;
    if (q2.due.join() !== 'zofiaShoots,inquiry,jacek') return `crisis due: ${q2.due}`;   // week 3's canon set inquiry; three at a time
    if (s2.echo.length !== 6) return `crisis told: ${s2.echo}`;
    if (!('sWall' in s2.flags) || s2.flags.sQuarter !== 1) return `siege flags: ${JSON.stringify(s2.flags)}`;
    if (s2.crisis !== 9) return `crisis day ${s2.crisis} (the herald's first answer buys a day)`;
    for (const s of [s1, s2]) { if (s.lock !== 0) return `lock ${s.lock}`; if (s.errs !== 0) return `errs ${s.errs}`; }
    return null;
  },
};
