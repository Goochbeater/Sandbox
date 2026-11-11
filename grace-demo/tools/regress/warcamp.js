// War camp check: an accusation that makes a war (Ilka escapes: Krasna marches) opens chapter five in the camp. The king
// plans at the map table, feeds the host, speaks at the fire, is refused the map, and gives the order; the battle plays
// (skipped here), its result is told and applied, and the ending runs to the title. Checks the camp's state is saved,
// the result follows from the army and the choices, the lock is released and the page logged no errors.
// Run: node tools/regress.js warcamp
const DRV = require('./drv.js');
const st = ['eval', `JSON.stringify({ room: SCENE.room.id, phase: CAL.phase, camp: WARCAMP.state(), army: REALM.army, stores: COURT.stats.stores, mood: COURT.stats.mood, battle: REALM.flags.battle, strength: WARCAMP.strength(), saved: !!GAME.state().camp, walk: SCENE.walkCheck().length, lock: SCENE.lock, errs: (window.__errs || []).length })`];

module.exports = {
  name: 'warcamp',
  runs: [{
    label: 'krasna',
    query: '?test&room=throne&catchup=4',
    steps: [['wait', 4000], ['eval', DRV + '1'],
      ['eval', `Object.assign(CAL, { phase: 'crisis', crisis: 9, feastDone: true }); REALM.army = 5; window.__c = INV.conclude('ilkaTunnel'); 1`],
      ['eval', `DRV.adv(() => SCENE.room.id === 'warcamp' && SCENE.lock === 0 && document.getElementById('fade').classList.contains('off'), 120000)`], ['wait', 1500], st,
      ['eval', `MAP.open(); JSON.stringify({ mapOpen: !!MAP.open_ })`], ['eval', `DRV.adv(() => !SCENE.bubble, 20000)`],
      ['eval', `DRV.use('ride'); 1`], ['eval', `DRV.adv(() => !SCENE.bubble && SCENE.lock === 0, 20000)`],   // refused: no plan yet
      ['eval', `DRV.use('plan'); 1`], ['eval', `DRV.adv(() => WARCAMP.plan && SCENE.lock === 0 && !SCENE.bubble, 60000)`],
      ['eval', `DRV.use('stores'); 1`], ['eval', `DRV.adv(() => WARCAMP.fed && SCENE.lock === 0 && !SCENE.bubble, 60000)`],
      ['eval', `DRV.use('wSergeant'); 1`], ['eval', `DRV.adv(() => WARCAMP.spoke && SCENE.lock === 0 && !SCENE.bubble, 60000)`], st,
      ['eval', `DRV.use('ride'); 1`], ['eval', `DRV.adv(() => BATTLE.on, 60000)`],
      ['eval', `DRV.until(() => SCENE.room.id === 'battle' && CUT.cam, 240000)`], ['wait', 3000], ['eval', `CUT.skip = true; 1`],
      ['eval', `DRV.adv(() => REALM.flags.battle !== undefined, 120000)`], st,
      ['eval', `DRV.until(() => CUT.playing, 60000)`], ['wait', 2000], ['eval', `CUT.skip = true; 1`],
      ['eval', `DRV.until(() => TITLE.on && SCENE.lock === 0, 240000)`], ['wait', 1500],
      ['eval', `JSON.stringify({ end: END.seen, phase: CAL.phase, title: TITLE.on, lock: SCENE.lock, errs: (window.__errs || []).length })`]],
  }],
  check(label, evals) {
    if (evals.includes('timeout')) return 'an eval timed out';
    const objs = evals.filter((v) => v && typeof v === 'object'), [a, m, b, c, d] = objs;
    if (!d) return `expected 5 results, got ${objs.length}`;
    if (a.room !== 'warcamp' || a.phase !== 'ch5' || a.camp.war !== 'krasna' || !a.saved) return `camp not opened: ${JSON.stringify(a)}`;
    if (a.walk !== 0) return `walk ${a.walk}`;
    if (m.mapOpen) return 'the map opened in the camp';
    if (b.camp.plan !== 1 || b.camp.fed !== 1 || b.camp.spoke !== 1 || b.camp.fought) return `camp choices: ${JSON.stringify(b.camp)}`;
    if (b.stores !== a.stores - 2 || b.mood !== a.mood + 1) return `costs: stores ${a.stores}->${b.stores}, mood ${a.mood}->${b.mood}`;
    if (b.strength !== 8) return `strength ${b.strength} (5 + fed + word + the rise)`;
    if (c.battle !== 2 || c.army !== 4 || c.mood !== b.mood + 2) return `result: ${JSON.stringify({ battle: c.battle, army: c.army, mood: c.mood })}`;
    if (d.phase !== 'done' || !d.title || !d.end) return `ending: ${JSON.stringify(d)}`;
    for (const s of [a, b, d]) { if (s.lock !== 0) return `lock ${s.lock}`; if (s.errs !== 0) return `errs ${s.errs}`; }
    return null;
  },
};
