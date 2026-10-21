/* HEAT — exposure 0–100: how loudly the galaxy is whispering about Rathatri. Witnesses, loud Force use, ship runs and surviving hunters raise it;
   assassin dispatch and Force-masking lower it. Tiers gate hunter spawns (HUNTERS.table) and the Dxun raid at tier 4. Persisted in SAVE.d.heat. */
const HEAT = { val: 0, TIERS: [25, 50, 75, 90], NAMES: ['UNSEEN', 'WHISPERS', 'HUNTED', 'WANTED', 'MARKED'] };
HEAT.load = function () { HEAT.val = (SAVE.d && SAVE.d.heat) || 0; if (typeof HUD !== 'undefined' && HUD.heat && HUD.el && HUD.el.hud) HUD.heat(HEAT.val); };
HEAT.tier = function (v) { v = v === undefined ? HEAT.val : v; let t = 0; for (const th of HEAT.TIERS) if (v >= th) t++; return t; };
HEAT.mask = () => 1 - 0.25 * (typeof POWERS !== 'undefined' ? POWERS.rank('mask') : 0);   // Force-masking: ×0.75 / ×0.5 / ×0.25 gain
HEAT.set = function (v) {
  const t0 = HEAT.tier(); HEAT.val = clamp(v, 0, 100); if (SAVE.d) { SAVE.d.heat = HEAT.val; SAVE.store(); }
  if (typeof HUD !== 'undefined' && HUD.heat && HUD.el && HUD.el.hud) HUD.heat(HEAT.val);
  const t1 = HEAT.tier(); if (t1 > t0 && typeof HUD !== 'undefined' && HUD.toast && HUD.el && HUD.el.hud) HUD.toast('EXPOSURE', HEAT.NAMES[t1], 2.2);
};
HEAT.add = function (n, why) { if (n > 0) n *= HEAT.mask(); HEAT.set(HEAT.val + n); HEAT.last = why || ''; };
HEAT.sub = function (n) { HEAT.set(HEAT.val - n); };
/* loud Force use is a beacon: call from powers. Hunters (seekers) converge via ENEMY.alertAt when it exists. */
HEAT.force = function (kind, x, z) {
  const k = { push: 0.6, grip: 1.2, throw: 0.4, rage: 2.5, dominate: 4 }[kind] || 0.5; HEAT.add(k, 'force:' + kind);
  if (typeof ENEMY !== 'undefined' && ENEMY.alertAt && x !== undefined) ENEMY.alertAt(x, z, 30);
};
HEAT.afterMission = function () { HEAT.sub(3); };
/* hunters appropriate to the current tier, spawned around (cx,cz); returns the enemies (HUNTERS owned by p55) */
HEAT.table = function (L, cx, cz, r) { if (typeof HUNTERS === 'undefined' || !HUNTERS.spawnAround) return []; return HUNTERS.spawnAround(L, HEAT.tier(), cx, cz, r || 26); };
