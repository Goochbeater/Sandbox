// Endings check: sets up five realm states (D, E, C, B, A), checks END.pick() chooses the matching ending for each,
// then plays the ending through to the title screen and checks the scene lock is released and no errors were logged.
// Run: node tools/regress.js endings
const DRV = require('./drv.js');

const pick = `(() => { const out = {}; const set = (F, fam, st, army, oc) => { REALM.flags = F; Object.assign(REALM.fam, fam); Object.assign(COURT.stats, st); REALM.army = army; INV.outcome = oc; return END.pick(); };
  out.D = set({ hela: 1, dobrawa: 1, anzelm: 1, told: 1 }, { halina: 6, zofia: 6, kazik: 6 }, { gold: 8, stores: 8, mood: 8 }, 5, 'ilkaHand');
  out.E = set({ bargain2: 1 }, { halina: 6, zofia: 6, kazik: 6 }, { gold: 8, stores: 8, mood: 8 }, 5, 'konrad');
  out.C = set({}, { halina: 6, zofia: 6, kazik: 6 }, { gold: 2, stores: 2, mood: 5 }, 2, 'ilkaHand');
  out.B = set({}, { halina: 5, zofia: 6, kazik: 9 }, { gold: 8, stores: 8, mood: 8 }, 5, 'ilkaHand');
  out.A = set({}, { halina: 7, zofia: 6, kazik: 6 }, { gold: 8, stores: 8, mood: 8 }, 5, 'ilkaHand'); return JSON.stringify(out); })()`;

const WANT = { D: 'D', E: 'E', C: 'C', B: 'B', A: 'A' };

module.exports = {
  name: 'endings',
  runs: [{
    label: 'bedroom',
    query: '?test&room=bedroom&catchup=4',
    steps: [['wait', 4000], ['eval', DRV + '1'], ['eval', pick], ['eval', `window.__e = END.play(); 1`],
      ['eval', `DRV.until(() => /The End/.test(document.getElementById('cutCap').textContent) && document.getElementById('cutCap').classList.contains('on'), 300000)`], ['wait', 1500],
      ['eval', `DRV.until(() => TITLE.on && SCENE.lock === 0, 120000)`], ['wait', 1500],
      ['eval', `JSON.stringify({ seen: END.seen, phase: CAL.phase, title: TITLE.on, lock: SCENE.lock, cont: !document.getElementById('tCont').hidden, errs: (window.__errs || []).length })`]],
  }],
  check(label, evals) {
    if (evals.includes('timeout')) return 'an eval timed out';
    const table = evals.find((v) => v && typeof v === 'object' && 'D' in v);
    if (!table) return 'no pick table';
    const keys = Object.keys(table);
    if (keys.length !== 5 || keys.some((k) => table[k] !== WANT[k])) return `pick table ${JSON.stringify(table)}`;
    const last = [...evals].reverse().find((v) => v && typeof v === 'object');
    if (!last) return 'no final result';
    if (last.phase !== 'done') return `phase ${last.phase}`;
    if (last.title !== true) return `title ${last.title}`;
    if (last.lock !== 0) return `lock ${last.lock}`;
    if (last.errs !== 0) return `errs ${last.errs}`;
    return null;
  },
};
