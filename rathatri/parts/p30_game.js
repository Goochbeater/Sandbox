/* GAME — flow: title → campaign (see p30b_campaign) → levels; level loading with the boot overlay, pause / death handling, and the per-frame
   play update (ground, space, cinematics). Persistent state lives in SAVE (p30a). */
const GAME = {
  acts: [
    { n: 'ACT I', t: 'SLAVE 426', p: 'HUTTA · ZX34', first: 'a1_pit', d: 'Born in the pens. Bought for blood. A witch in the crowd sees what the pit could not break.', lore: '“You are persistent. Like a parasite that refuses to die.”' },
    { n: 'ACT II', t: 'THE DEMON MOON', p: 'DXUN', first: 'a2_flight', d: 'The master is dead. A junker, a jungle moon, and a ring of old Sith tombs to hide in.', lore: '“Dxun is a moon that does not forgive. Neither will you.”' },
    { n: 'ACT III', t: 'ECHOES OF BETRAYAL', p: 'AMBRIA · RAXUS PRIME', first: 'a3_ambria', d: 'Battlefields remember. The Jedi hunters learn your name; you learn how the old Sith fell.', lore: '“Your victories hinge on your victims’ mistakes, not your mastery.”' },
    { n: 'ACT IV', t: 'THE SHROUD', p: 'KRAYISS · LENICO · ONDERON', first: 'a4_krayiss', d: 'A cult takes shape. Seven masks. A black ship. A tomb that was meant to stay shut.', lore: '“A tool, not a master. A sharpened weapon.”' },
    { n: 'ACT V', t: 'DARTH', p: 'DXUN', first: 'a5_orbital', d: 'The hunt cell closes on the warrens. A title is not given. It is taken — from someone.', lore: '“Are you ready to murder your own assassins for this hollow title?”' },
  ],
};
GAME.load = function () { SAVE.load(); };
GAME.store = function () { SAVE.store(); };
GAME.saveCP = function () { if (LEVEL.cur) { SAVE.d.cps[LEVEL.cur.id] = LEVEL.cur.cp; SAVE.store(); } };
GAME.actOf = function (missionId) { const m = CAMPAIGN.M[missionId]; return m ? m.act : 1; };
GAME.quote = function () { const q = (typeof LORE !== 'undefined' && LORE.quotes) || []; return q.length ? q[Math.floor(Math.random() * q.length)] : ''; };
/* load + enter a ground level (from a mission, the hub, or a debug flag) */
GAME.start = async function (lvl, cp, o) {
  o = o || {};
  MENU.close(); if (typeof TOUCH !== 'undefined') TOUCH.want = 'ground';
  if (typeof SPACE !== 'undefined' && SPACE.on) SPACE.stop();
  { const d = LEVEL.defs[lvl]; const b = MG.$('boot');
    if (!d) { MG.fail('no level ' + lvl); return; }
    if (b) { const h1 = b.querySelector('h1'), h2 = b.querySelector('h2'); if (h1) h1.textContent = d.name; if (h2) h2.textContent = (d.chapter || ''); MG.$('ldQuote').textContent = o.quote || GAME.quote(); } }
  MG.$('boot').style.display = 'flex'; MG.$('boot').style.opacity = 1; MG.loadUI(0.05, 'Travelling');
  try {
    await LEVEL.load(lvl, { cp: cp || 0, progress: (p) => MG.loadUI(0.1 + p * 0.8, 'Building ' + LEVEL.defs[lvl].name.toLowerCase()) });
    MG.loadUI(1, 'Ready');
  } catch (e) { MG.fail(e); return; }
  GAME.levelStart = { t: MG.rt, kills: COMBAT.kills };
  const b = MG.$('boot'); b.style.opacity = 0; setTimeout(() => { b.style.display = 'none'; }, 900);
  if (PLAYER.state !== 'cine') HUD.show(true); MG.state = 'play';
};
GAME.onPlayerDeath = function () { SAVE.d.stats.deaths++; SAVE.store(); MG.state = 'dead'; MENU.open('dead'); };
GAME.retry = function () {
  if (typeof SPACE !== 'undefined' && SPACE.on) { SPACE.restart(); return; }
  GAME.start(LEVEL.cur.id, LEVEL.cur.cp);
};
/* ------------------------------------------------------------------ per-frame play */
GAME.update = function (rdt) {
  if (typeof TOUCH !== 'undefined' && TOUCH.portrait && MG.state === 'play') { HUD.update(rdt); return; }   // rotate-your-device: the world waits
  if (MG.pauseReq) { MG.pauseReq = false; if (MG.state === 'play' && !(CAM.cine || PLAYER.state === 'cine')) { MENU.open('pause'); return; } }
  // hit-stop / slow motion: the world slows, input stays live
  let k = 1;
  if (MG.hitStop > 0) { MG.hitStop -= rdt; k = 0.06; }
  if (MG.slowmo) { MG.slowmoT = (MG.slowmoT || 0) + rdt; k *= MG.slowmo; if (MG.slowmoT > (MG.slowmoDur || 0.6)) { MG.slowmo = 0; MG.slowmoT = 0; MG.slowmoDur = 0; } }
  const inSpace = typeof SPACE !== 'undefined' && SPACE.on;
  const cineNow = MG.state === 'play' && !inSpace && PLAYER.state === 'cine' && !BOSS.lockT;
  document.body.classList.toggle('cine', (cineNow && !!CAM.cine) || (typeof CINE !== 'undefined' && !!CINE.cur));
  const skip = cineNow && (IN.down('confirm') || IN.down('skip'));
  if (skip) k *= 6;
  const dt = Math.min(rdt, 0.05) * k;
  MG.dt = dt; MG.t += dt;
  if (MG.state === 'play' || MG.state === 'cine') {
    if (IN.hit('pause') && !CAM.cine && PLAYER.state !== 'cine' && !(typeof CINE !== 'undefined' && CINE.cur)) { MENU.open('pause'); return; }
    if (inSpace) SPACE.update(dt);
    else {
      PLAYER.update(dt);
      ENEMY.update(dt);
      COMBAT.update(dt);
      LEVEL.update(dt);
      if (BOSS && BOSS.update) BOSS.update(dt);
    }
    if (typeof CINE !== 'undefined' && CINE.update) CINE.update(dt);
  } else if (MG.state === 'title') {
    MENU.titleUpdate(rdt);
  } else if (MG.state === 'dead' || MG.state === 'pause' || MG.state === 'result') {
    // world idles under the menu
    if (PLAYER.a && !inSpace) { PLAYER.a.animate(dt * 0.3); PLAYER.a.pose3D(dt * 0.3); }
  }
  FX.update(dt);
  if (MG.state !== 'title' && !inSpace) CAM.update(rdt * (skip ? 6 : 1));
  if (PLAYER.a && !inSpace) R.updateShadow(V3(PLAYER.a.x, PLAYER.a.y, PLAYER.a.z));
  HUD.update(rdt);
  if (MG.state === 'play') SAVE.d.stats.time += rdt;
};
MG.gameUpdate = GAME.update;
MG.difficulty = 'normal';
