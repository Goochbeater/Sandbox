// Kingdom-loop check: plays the court and the weeks of the realm from the throne room to the bedroom and back, with
// the court and weekly-seal panels answered by an automatic clicker, then checks no step timed out and no errors were logged.
// The scratch original gave no query, so this uses the same boot query as the other suites.
// Run: node tools/regress.js realm
const DRV = require('./drv.js');

const auto = `window.__auto = setInterval(() => { const c = document.getElementById('court'), w = document.getElementById('week');
  if (c && !c.hidden) { const g = document.getElementById('cpGrant'), note = document.getElementById('cpNote').textContent; const plus = [...c.querySelectorAll('.pm')].filter(b => b.textContent === '+' && !b.disabled);
    if (/Meets/.test(note) || !plus.length) (g.disabled ? document.getElementById('cpRefuse') : g).click(); else plus[0].click(); }
  else if (w && !w.hidden) { const seal = document.getElementById('wkSeal'), res = document.getElementById('wkResult'); if (!res.hidden) document.getElementById('wkDone').click(); else if (!seal.disabled) seal.click(); else { const p = [...w.querySelectorAll('#wkRows .pm')].filter(b => b.textContent === '+' && !b.disabled); if (p.length) p[Math.floor(Math.random() * p.length)].click(); } } }, 300); 1`;
const go = (room, x) => [['eval', `SCENE.go('${room}', { x: ${x}, face: 1 }).then(() => 1)`], ['eval', `DRV.adv(() => SCENE.room.id === '${room}' && SCENE.lock === 0, 120000)`]];
const st = ['eval', `JSON.stringify({ week: CAL.week, phase: CAL.phase, stats: COURT.stats, army: REALM.army, fam: REALM.fam, flags: REALM.flags, heard: Object.keys(REALM.heardIds), done: Object.keys(REALM.done), courtDone: COURT.done, lock: SCENE.lock, cap: document.getElementById('caption').textContent })`];

module.exports = {
  name: 'realm',
  runs: [{
    label: 'bedroom',
    query: '?test&room=bedroom&catchup=4',
    steps: [['wait', 4000], ['eval', DRV + '1'], ['eval', auto], ['eval', `SCENE.player.crownMesh.visible = true; 1`],
      ['eval', `DRV.adv(() => REALM.done.zofiaSword && SCENE.lock === 0 && !SCENE.bubble, 90000)`], st,
      ...go('throne', -8), ['wait', 1500], ['eval', `SCENE.advance(); DRV.use('throne')`], ['eval', `DRV.adv(() => COURT.done && SCENE.lock === 0 && !SCENE.bubble && !SCENE.modal, 400000)`], st,
      ['eval', `INV.panel(true); 1`], ['wait', 500], ['eval', `INV.panel(false); COURT.rise(); 1`], ['eval', `DRV.adv(() => !SCENE.player.sitting && SCENE.lock === 0, 60000)`],
      ...go('bedroom', -6.5), ['eval', `DRV.use('bed')`], ['eval', `DRV.adv(() => CAL.week === 2 && SCENE.lock === 0 && document.getElementById('fade').classList.contains('off'), 120000)`], ['wait', 1200], st,
      ['eval', `CAL.week = 4; REALM.newWeek(); 1`], ...go('throne', 0), ['eval', `SCENE.advance(); DRV.use('throne')`], ['eval', `DRV.adv(() => COURT.done && SCENE.lock === 0 && !SCENE.bubble && !SCENE.modal, 400000)`], st,
      ['eval', `COURT.rise(); 1`], ['eval', `DRV.adv(() => !SCENE.player.sitting && SCENE.lock === 0, 60000)`], ...go('bedroom', -6.5), ['eval', `DRV.use('bed')`], ['eval', `DRV.adv(() => CAL.phase === 'festival' && SCENE.lock === 0 && document.getElementById('fade').classList.contains('off'), 120000)`], ['wait', 1200], st,
      ['eval', `Object.assign(CAL, { phase: 'crisis', crisis: 2, feastDone: true, fire: true, konrad: true }); COURT.done = !REALM.waiting(); JSON.stringify({ waiting: REALM.waiting(), q: REALM.queue().map(p => p.id) })`],
      ...go('throne', 0), ['eval', `SCENE.advance(); DRV.use('throne')`], ['eval', `DRV.adv(() => COURT.done && SCENE.lock === 0 && !SCENE.bubble && !SCENE.modal, 400000)`], st,
      ['eval', `JSON.stringify({ save: Object.keys(GAME.state().realm), errs: (window.__errs || []).length })`]],
  }],
  check(label, evals) {
    if (!evals.length) return 'no eval results';
    if (evals.includes('timeout')) return 'an eval timed out';
    for (const v of evals) if (v && typeof v === 'object' && 'errs' in v && v.errs !== 0) return `errs ${v.errs}`;
    return null;
  },
};
