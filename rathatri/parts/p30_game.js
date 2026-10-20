/* GAME — flow (title → chapters → levels → results), pause / death menus, save data, the per-frame play update. */
const GAME = {
  seq: ['works', 'rooftops', 'blacksun', 'dunes', 'canyon', 'hangar', 'generator', 'pit'],
  chapters: [
    { n: 'CHAPTER I', t: 'SHADOW HUNTER', p: 'CORUSCANT', first: 'works', d: 'Sidious tests his apprentice against the shadows of the Jedi — then sends him through the Senate District after a Padawan who knows too much.', lore: 'After the novel “Darth Maul: Shadow Hunter”: the traitor Hath Monchar and the Padawan Darsha Assant.' },
    { n: 'CHAPTER II', t: 'THE HUNT', p: 'TATOOINE', first: 'dunes', d: 'The Queen has fled to a desert world. Maul follows her trail through the Dune Sea and the Jundland Wastes — and finds a Jedi.', lore: '“Tatooine is sparsely populated. If the trail is correct, I will find them quickly, Master.”' },
    { n: 'CHAPTER III', t: 'DUEL OF THE FATES', p: 'NABOO', first: 'hangar', d: 'At last we will reveal ourselves to the Jedi. The Theed hangar, the generator shaft, the laser gates — and the melting pit.', lore: 'Two Jedi. One Sith. This time, the apprentice writes the ending.' },
  ],
  levels: [['works', 'rooftops', 'blacksun'], ['dunes', 'canyon'], ['hangar', 'generator', 'pit']],   // per chapter; every chapter is always open
  save: { unlocked: 1, best: {} },
};
GAME.load = function () { try { const s = JSON.parse(localStorage.getItem('maul_sith_apprentice') || 'null'); if (s) GAME.save = Object.assign(GAME.save, s); } catch (e) { /* storage unavailable */ } };
GAME.store = function () { try { localStorage.setItem('maul_sith_apprentice', JSON.stringify(GAME.save)); } catch (e) { /* ignore */ } };
GAME.saveCP = function () { GAME.store(); };
GAME.chapterOf = function (lvl) { const i = GAME.seq.indexOf(lvl); return i < 3 ? 0 : i < 5 ? 1 : 2; };
GAME.LINES = { works: 'Only the strong survive the Master\'s tests.', rooftops: 'Coruscant never sleeps. Neither does the hunter.', blacksun: 'A Padawan who knows too much is a loose thread. The Sith cut loose threads.',
  dunes: 'The Queen\'s trail leads into the desert. The probes will find her.', canyon: 'The wastes are narrow. So is the Jedi\'s chance.', hangar: 'At last we will reveal ourselves to the Jedi.',
  generator: 'Two Jedi. One Sith. The odds favour the Sith.', pit: 'Fear, anger, hatred — weapons the Jedi never learned to hold.' };
GAME.start = async function (lvl, cp) {
  MENU.close();
  { const d = LEVEL.defs[lvl], ch = GAME.chapters[GAME.chapterOf(lvl)]; const b = MG.$('boot');
    if (d && b) { b.querySelector('h1').textContent = d.name; b.querySelector('h2').textContent = ch.n + ' · ' + ch.p; MG.$('ldQuote').textContent = GAME.LINES[lvl] ? '“' + GAME.LINES[lvl] + '”' : ''; } }
  MG.$('boot').style.display = 'flex'; MG.$('boot').style.opacity = 1; MG.loadUI(0.05, 'Travelling');
  try {
    GAME.stats = GAME.stats || { t0: MG.rt, kills0: 0 };
    await LEVEL.load(lvl, { cp: cp || 0, progress: (p) => MG.loadUI(0.1 + p * 0.8, 'Building ' + LEVEL.defs[lvl].name.toLowerCase()) });
    MG.loadUI(1, 'Ready');
  } catch (e) { MG.fail(e); return; }
  GAME.levelStart = { t: MG.rt, kills: COMBAT.kills };
  const b = MG.$('boot'); b.style.opacity = 0; setTimeout(() => { b.style.display = 'none'; }, 900);
  if (PLAYER.state !== 'cine') HUD.show(true); MG.state = 'play';
  const ch = GAME.chapterOf(lvl); if (ch + 1 > GAME.save.unlocked) { GAME.save.unlocked = ch + 1; GAME.store(); }
};
GAME.next = function () {
  let i = GAME.seq.indexOf(LEVEL.cur.id), n = GAME.seq[i + 1];
  while (n && !LEVEL.defs[n]) { i++; n = GAME.seq[i + 1]; }
  if (!n || !LEVEL.defs[n]) { GAME.result(true); return; }
  const chNow = GAME.chapterOf(LEVEL.cur.id), chNext = GAME.chapterOf(n);
  if (chNext !== chNow) { GAME.result(false, n); return; }
  GAME.start(n);
};
GAME.onPlayerDeath = function () { MG.state = 'dead'; MENU.open('dead'); };
GAME.retry = function () { GAME.start(LEVEL.cur.id, LEVEL.cur.cp); };
GAME.result = function (final, nextLvl) {
  MG.state = 'result'; HUD.show(false);
  const ch = GAME.chapters[GAME.chapterOf(LEVEL.cur.id)];
  if (nextLvl) { const c = GAME.chapterOf(nextLvl) + 1; if (c > GAME.save.unlocked) { GAME.save.unlocked = c; GAME.store(); } }
  MENU.open('result', { ch, final, next: nextLvl });
};
/* ------------------------------------------------------------------ per-frame play */
GAME.update = function (rdt) {
  // hit-stop / slow motion: the world slows, input stays live
  let k = 1;
  if (MG.hitStop > 0) { MG.hitStop -= rdt; k = 0.06; }
  if (MG.slowmo) { MG.slowmoT = (MG.slowmoT || 0) + rdt; k *= MG.slowmo; if (MG.slowmoT > (MG.slowmoDur || 0.6)) { MG.slowmo = 0; MG.slowmoT = 0; MG.slowmoDur = 0; } }
  const cineNow = MG.state === 'play' && PLAYER.state === 'cine' && !BOSS.lockT;
  document.body.classList.toggle('cine', cineNow && !!CAM.cine);
  const skip = cineNow && (IN.down('confirm') || IN.down('pause') || IN.down('jump'));
  if (skip) k *= 6;
  const dt = Math.min(rdt, 0.05) * k;
  MG.dt = dt; MG.t += dt;
  if (MG.state === 'play' || MG.state === 'cine') {
    if (IN.hit('pause') && !CAM.cine && PLAYER.state !== 'cine') { MENU.open('pause'); return; }
    PLAYER.update(dt);
    ENEMY.update(dt);
    COMBAT.update(dt);
    LEVEL.update(dt);
    if (BOSS && BOSS.update) BOSS.update(dt);
  } else if (MG.state === 'title') {
    MENU.titleUpdate(rdt);
  } else if (MG.state === 'dead' || MG.state === 'pause' || MG.state === 'result') {
    // world idles under the menu
    if (PLAYER.a) { PLAYER.a.animate(dt * 0.3); PLAYER.a.pose3D(dt * 0.3); }
  }
  FX.update(dt);
  if (MG.state !== 'title') CAM.update(rdt * (skip ? 6 : 1));
  if (PLAYER.a) R.updateShadow(V3(PLAYER.a.x, PLAYER.a.y, PLAYER.a.z));
  HUD.update(rdt);
};
MG.gameUpdate = GAME.update;
MG.difficulty = 'normal';
