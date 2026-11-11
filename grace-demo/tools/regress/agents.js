// Recruits check: Dobrawa is met in the garden in week three and taken on (the moment, her place in the court's roster,
// her talk marker, her piece of the Woman's name); then, in the crisis, she and Brother Anzelm each give their own road
// to a clue, the petitions gain the answers that need them, and the name is complete with the midwife's part.
// Run: node tools/regress.js agents
const DRV = require('./drv.js');
const st = ['eval', `JSON.stringify({ vis: !!(CAST.A.dobrawa && CAST.A.dobrawa.visible), flag: REALM.flags.dobrawa, agents: COURT.agents.map(a => a.id), marker: !!SCENE.room.inter.find(i => i.id === 'dobrawa' && !i.hidden), lore: !!REALM.done['lore:dobrawa'], walk: SCENE.walkCheck().length, lock: SCENE.lock, errs: (window.__errs || []).length })`];

module.exports = {
  name: 'agents',
  runs: [{
    label: 'garden',
    query: '?test&room=bedroom&catchup=4',
    steps: [['wait', 3000], ['eval', DRV + '1'],
      ['eval', `CAL.week = 3; REALM.done.truth = 1; SCENE.go('garden', { x: 5.2, face: 1 }).then(() => 1)`],
      ['eval', `DRV.adv(() => REALM.flags.dobrawa !== undefined && SCENE.lock === 0 && !SCENE.bubble, 120000)`], ['wait', 600], st,
      ['eval', `DRV.use('dobrawa')`], ['eval', `DRV.adv(() => REALM.done['lore:dobrawa'] && SCENE.lock === 0 && !SCENE.bubble, 60000)`], st,
      // the crisis: both in service, the signet, the cup and the body already looked at
      ['eval', `Object.assign(CAL, { phase: 'crisis', crisis: 4, feastDone: true }); Object.assign(REALM.flags, { anzelm: 1, hela: 1 }); AGENTS.sync(); REALM.done['lore:anzelm'] = 1;
        INV.found.signet = INV.found.lip = INV.found.wolfsHood = 1; window.__t = INV.talk('dobrawa'); 1`],
      ['eval', `DRV.adv(() => INV.found.dried && SCENE.lock === 0 && !SCENE.bubble, 60000)`],
      ['eval', `SCENE.go('study', { x: -3.2, face: -1 }).then(() => 1)`], ['eval', `DRV.adv(() => SCENE.room.id === 'study' && SCENE.lock === 0 && !SCENE.bubble, 60000)`], ['wait', 800],
      ['eval', `DRV.use('anzelm')`], ['eval', `DRV.adv(() => INV.found.oldSeal && SCENE.lock === 0 && !SCENE.bubble, 60000)`],
      ['eval', `JSON.stringify({ via: INV.via, dried: INV.clue('dried')[2], seal: INV.clue('oldSeal')[2], agents: COURT.agents.map(a => a.id), anzelmVis: CAST.A.anzelm.visible,
        gate: REALM.PETS.sGate.options.filter(q => !q.need || REALM.flags[q.need] === 1).length, named: END.named(), lore: /Woman in the Wood/.test(AGENTS.lore()),
        saved: Object.keys(GAME.state().inv), lock: SCENE.lock, errs: (window.__errs || []).length })`]],
  }],
  check(label, evals) {
    if (evals.includes('timeout')) return 'an eval timed out';
    const [a, b, c] = evals.filter((v) => v && typeof v === 'object');
    if (!c) return 'expected three results';
    if (!a.vis || a.flag !== 1 || !a.marker) return `not recruited: ${JSON.stringify(a)}`;
    if (a.agents.join() !== 'commander,spymaster,herbalist') return `roster ${a.agents}`;
    if (a.walk !== 0) return `walk ${a.walk}`;
    if (!b.lore) return 'her piece of the name was not told';
    if (c.via.dried !== 'dobrawa' || c.via.oldSeal !== 'anzelm') return `via ${JSON.stringify(c.via)}`;
    if (!/Dobrawa/.test(c.dried) || !/Anzelm/.test(c.seal)) return `clue sources: ${c.dried} / ${c.seal}`;
    if (c.agents.join() !== 'commander,spymaster,herbalist,chronicler') return `roster ${c.agents}`;
    if (!c.anzelmVis) return 'Anzelm is not in the study';
    if (c.gate !== 4) return `the gate petition offers ${c.gate} answers`;
    if (!c.named || !c.lore) return 'the name is not complete';
    if (!c.saved.includes('via')) return 'INV.via is not saved';
    for (const s of [a, b, c]) { if (s.lock !== 0) return `lock ${s.lock}`; if (s.errs !== 0) return `errs ${s.errs}`; }
    return null;
  },
};
