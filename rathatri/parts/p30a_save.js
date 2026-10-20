/* SAVE — versioned persistent state (localStorage 'rathatri-save'; falls back to memory when storage is blocked).
   Mutate SAVE.d, then SAVE.store(). Schema is documented in docs/MASTER_BUILD_ADDENDUM.md §D. */
const SAVE = { KEY: 'rathatri-save', d: null, mem: null, persisted: true };
SAVE.defaults = function () {
  return {
    v: 2, act: 1, mission: 'a1_pit', done: {}, essence: 0, salvage: 0, artifacts: [],
    powers: { push: 0, grip: 0, throw: 0, rage: 0, breaker: 0, fear: 0, mask: 0, dominate: 0, bind: 0 },
    style: 'beast', ship: 'harbinger', shipCfg: { hull: 0, drive: 0, weapons: 0, utility: 0, paint: 0, hullLength: 1, driveScale: 1, wingSweep: 0 }, ships: { harbinger: true, interceptor: false, shroud: false },
    holo: {}, heat: 0, assassins: { vaara: { loyalty: 50, alive: true, away: null }, eren: { loyalty: 50, alive: true, away: null }, e5: [] },
    traya: { lessons: [], judgments: [] }, choices: {}, codex: {}, endings: [], stats: { kills: 0, deaths: 0, time: 0 }, cps: {},
  };
};
SAVE.merge = function (base, over) {   // defaults ← saved (keeps new fields after an update, drops nothing the player had)
  if (over === null || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
  const out = Array.isArray(base) ? over.slice() : Object.assign({}, base);
  for (const k of Object.keys(over)) out[k] = (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) ? SAVE.merge(base[k], over[k]) : over[k];
  return out;
};
SAVE.load = function () {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE.KEY) || 'null'); } catch (e) { SAVE.persisted = false; raw = SAVE.mem; }
  SAVE.d = raw && raw.v === 2 ? SAVE.merge(SAVE.defaults(), raw) : SAVE.defaults();
  SAVE.fresh = !raw;
  return SAVE.d;
};
SAVE.has = function () { try { const r = JSON.parse(localStorage.getItem(SAVE.KEY) || 'null'); return !!(r && r.v === 2 && (Object.keys(r.done || {}).length || r.mission !== 'a1_pit')); } catch (e) { return !!SAVE.mem; } };
SAVE.store = function () {
  if (!SAVE.d) return;
  SAVE.mem = SAVE.d;
  try { localStorage.setItem(SAVE.KEY, JSON.stringify(SAVE.d)); } catch (e) { SAVE.persisted = false; }
};
SAVE.reset = function () { SAVE.d = SAVE.defaults(); SAVE.store(); return SAVE.d; };
/* small helpers other parts use */
SAVE.addEssence = function (n) { SAVE.d.essence = Math.max(0, SAVE.d.essence + Math.round(n)); };
SAVE.hasArtifact = (id) => SAVE.d.artifacts.includes(id);
SAVE.giveArtifact = function (id) { if (!SAVE.d.artifacts.includes(id)) { SAVE.d.artifacts.push(id); SAVE.store(); return true; } return false; };
SAVE.choice = function (k, v) { if (v === undefined) return SAVE.d.choices[k]; SAVE.d.choices[k] = v; SAVE.store(); return v; };
