/* CODEX — unlockable lore entries (data generated into LORE.codex by tools/gen_data.py). The browsing UI lives in the menu part (MENU 'codex'). */
const CODEX = { data: (typeof LORE !== 'undefined' && LORE.codex) || {}, CATS: ['HISTORY', 'FACTION', 'FORCE', 'TECH', 'PLACE', 'CREATURE', 'ARTIFACT'] };
CODEX.has = (id) => !!(SAVE.d && SAVE.d.codex[id]);
CODEX.unlock = function (id, silent) {
  const e = CODEX.data[id]; if (!e || CODEX.has(id)) return false;
  SAVE.d.codex[id] = 1; SAVE.store();
  if (!silent && typeof HUD !== 'undefined' && HUD.el && HUD.toast) HUD.toast('CODEX UPDATED', e.title, 2.6);
  return true;
};
CODEX.count = () => Object.keys(SAVE.d.codex).length;
CODEX.total = () => Object.keys(CODEX.data).length;
CODEX.list = function (cat) { return Object.values(CODEX.data).filter((e) => (!cat || e.cat === cat) && CODEX.has(e.id)); };
CODEX.listAll = function (cat) { return Object.values(CODEX.data).filter((e) => !cat || e.cat === cat); };   // locked entries show as ??? in the UI
