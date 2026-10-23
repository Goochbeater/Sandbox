/* TITLE, OPENING, SAVE — the title screen over the fortress in the storm, the opening cutscene (STORY.md §3), the
   settings and credits panels, and what goes in the save slot. */
const TITLE = { on: false };
TITLE.CAM = [[-18, 21, 74, -12, 18.5, -24, 22], [-14, 22, 70, -10, 19, -24, 21.5]];   // the fortress on the right, the name over the near hill at left
TITLE.CAM_N = [[-26, 24, 112, -17, 19.5, -24, 23], [-22, 25, 106, -15, 20, -24, 22.5]];   // the same on a near-square frame (a Fold's inner screen)
TITLE.show = function () {
  TITLE.on = true; document.body.classList.add('intitle'); $('title').hidden = false;
  EXTERIOR.modeName = 'title'; SCENE.enter('exterior', {}); EXTERIOR.mode('title');
  TITLE.camSet();
  SCENE.menu = true; $('title').classList.remove('leaving'); $('tCont').hidden = !SAVE.get(); AUDIO.playMusic('title', 3);
};
/* two framings: wide phones, and a narrower frame (a Fold's inner screen) where the fortress has to sit further right */
TITLE.camSet = function () { const P = R.A < 2.4 ? TITLE.CAM_N : TITLE.CAM, t = CUT.cam && CUT.cam.loop ? CUT.cam.t : 0;
  CUT.cam = { a: CUT.pose(P[0]), b: CUT.pose(P[1]), t, dur: 45, loop: true }; };
TITLE.hide = function () { TITLE.on = false; SCENE.menu = false; document.body.classList.remove('intitle'); $('title').hidden = true; if (!CUT.playing) CUT.cam = null; };
TITLE.init = function () {
  const begin = () => { AUDIO.unlock(); if (!$('title').classList.contains('ready')) { $('title').classList.add('ready'); AUDIO.playMusic('title', 3); AUDIO.ambience(EXTERIOR.ambience); setTimeout(() => $('tNew').focus(), 300); } };
  $('stage').addEventListener('pointerdown', begin, { capture: true }); window.addEventListener('keydown', begin, { capture: true });
  $('tNew').onclick = () => { AUDIO.sfx('click'); TITLE.newGame(); };
  $('tCont').onclick = () => { AUDIO.sfx('click'); TITLE.cont(); };
  $('tSet').onclick = () => TITLE.panel('settings', true); $('tCred').onclick = () => TITLE.panel('credits', true);
  $('setBack').onclick = () => TITLE.panel('settings', false); $('credBack').onclick = () => TITLE.panel('credits', false);
  $('pSetBtn').onclick = () => TITLE.panel('settings', true);
  $('pTitleBtn').onclick = () => { GAME.save(); SCENE.pause(false); $('fade').classList.remove('off'); setTimeout(() => { TITLE.show(); $('fade').classList.add('off'); }, 800); };
  const vm = $('volMusic'), vs = $('volSfx'); vm.value = Math.round(AUDIO.vol.music * 100); vs.value = Math.round(AUDIO.vol.sfx * 100);
  vm.oninput = () => { AUDIO.vol.music = vm.value / 100; AUDIO.saveVol(); }; vs.oninput = () => { AUDIO.vol.sfx = vs.value / 100; AUDIO.saveVol(); AUDIO.sfx('click'); };
  $('credText').innerHTML = CREDITS.html();
  R.onResize = () => { if (TITLE.on) TITLE.camSet(); };
  window.addEventListener('keydown', (e) => { if (e.code !== 'Escape') return; for (const id of ['settings', 'credits']) if (!$(id).hidden) { TITLE.panel(id, false); e.stopImmediatePropagation(); e.preventDefault(); return; } }, true);
};
TITLE.panel = function (id, on) { $(id).hidden = !on; SCENE.modal = on && !TITLE.on; if (on) $(id).querySelector('button, input').focus();
  else (TITLE.on ? $(id === 'settings' ? 'tSet' : 'tCred') : G.paused ? $('resumeBtn') : $('cv')).focus(); };
TITLE.newGame = async function () {
  SAVE.clear(); GAME.reset(); $('title').classList.add('leaving');
  TITLE.hide(); document.body.classList.add('intitle');   // keep the buttons hidden until the cutscene's class takes over
  await CUT.play(INTRO, { then: async () => { SCENE.enter('bedroom', { x: -1.6, face: 1, sound: true }); R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame(); $('fade').classList.add('off'); GAME.save(); } });
  document.body.classList.remove('intitle');
};
TITLE.cont = function () {
  const s = SAVE.get(); if (!s) return TITLE.newGame(); GAME.load(s);
  $('fade').classList.remove('off');
  setTimeout(async () => { TITLE.hide(); SCENE.enter(s.room || 'bedroom', { x: s.x, face: 1, sound: true }); R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame(); $('fade').classList.add('off'); }, 800);
};
/* ---------------------------------------------------------------- the opening (see STORY.md §3) */
const INTRO = [
  { room: 'exterior', setup: () => EXTERIOR.mode('title'), music: 'intro', musicFade: 2, cam: { from: [-20, 22, 92, -6, 17, -24, 22], to: [-12, 20, 70, 0, 16, -24, 20] }, dur: 8,
    caption: 'Twelve years ago, the rain fell on Lodmir for forty days.', sfx: [['thunder', 1.6, { gain: 0.9 }]] },
  { room: 'exterior', setup: () => EXTERIOR.mode('siege'), cam: { from: [-16, 5, 44, -2, 10, -12, 26], to: [2, 6, 36, 8, 11, -12, 24] }, dur: 8.5,
    caption: 'Under it came the Margrave of Hal, to the walls of the Swan Fortress.',
    sfx: [['drum', 0.2, { gain: 0.8 }], ['drum', 0.9, { gain: 0.6 }], ['drum', 1.6, { gain: 0.8 }], ['clang', 2.2, { gain: 0.5, pan: -0.4 }], ['drum', 2.4, { gain: 0.6 }], ['clang', 3.3, { gain: 0.4, pan: 0.5 }], ['drum', 3.1, { gain: 0.8 }], ['clang', 4.6, { gain: 0.5 }], ['thunder', 5.5, { gain: 0.7 }]] },
  { room: 'throne', setup: () => THRONE.night(true), cam: { from: [1.5, 2.95, 22.6, 1.5, 2.6, 3.2, 19], to: [1.5, 2.55, 15.2, 1.5, 1.85, 0.9, 17] }, dur: 8.5,
    caption: 'King Bolesław held the gate for nineteen days. He did not see the twentieth.', ambience: { rainGlass: 0.8, tone: 0.4 }, acoustics: { size: 3.2, wet: 0.45 } },
  { room: 'exterior', setup: () => { THRONE.night(false); EXTERIOR.mode('wood'); },
    cam: { from: [-62, 1.7, 13, -62, 1.25, 2, 22], to: [-62, 1.45, 9.5, -62, 1.1, 2, 20] }, dur: 9,
    caption: 'On the twentieth night, his son rode out alone to the Woman in the Wood.' },
  { room: 'exterior', setup: () => EXTERIOR.mode('dawn'), cam: { from: [-18, 16, 86, 0, 14, -20, 22], to: [-10, 17, 78, 2, 14.5, -20, 21] }, dur: 8,
    caption: 'By morning the Margrave’s army was gone. No one has ever said where.' },
  { room: 'exterior', setup: () => EXTERIOR.mode('present'), cam: { from: [6, 11, 56, 14, 24, -33, 20], to: [10, 13, 46, 14.5, 27, -33, 17] }, dur: 7.5,
    caption: 'Twelve years later, the rain has come back.', sfx: [['thunder', 2.4, { gain: 1 }]] },
];
/* ---------------------------------------------------------------- the save slot */
const GAME = {};
GAME.reset = function () { SCENE.player.crownMesh.visible = false; COURT.reset(); CHAPEL.met = CHAPEL.queenMet = CHAPEL.priestMet = false; CHAPEL.flirt = CHAPEL.cold = 0; };
GAME.state = function () { const K = SCENE.player, R0 = SCENE.room;
  return { room: R0 && R0.id !== 'exterior' ? R0.id : 'bedroom', x: K.x, crown: K.crownMesh.visible,
    court: { done: COURT.done, prosperity: COURT.prosperity, stats: COURT.stats, agents: COURT.agents.map((a) => ({ id: a.id, ap: a.ap, wound: a.wound })), items: COURT.items.map((i) => ({ id: i.id, n: i.n })) },
    chapel: { met: CHAPEL.met, queenMet: CHAPEL.queenMet, priestMet: CHAPEL.priestMet, flirt: CHAPEL.flirt, cold: CHAPEL.cold } }; };
GAME.save = function () { if (SCENE.room && SCENE.room.id !== 'exterior' && !CUT.playing) SAVE.put(GAME.state()); };
GAME.load = function (s) {
  const K = SCENE.player; K.crownMesh.visible = !!s.crown;
  if (s.court) { COURT.done = s.court.done; COURT.greeted = COURT.done; COURT.prosperity = s.court.prosperity || 0; Object.assign(COURT.stats, s.court.stats || {});
    for (const a of s.court.agents || []) { const g = COURT.agents.find((q) => q.id === a.id); if (g) Object.assign(g, a); }
    for (const i of s.court.items || []) { const g = COURT.items.find((q) => q.id === i.id); if (g) g.n = i.n; } }
  if (s.chapel) { CHAPEL.met = !!s.chapel.met; CHAPEL.queenMet = !!s.chapel.queenMet; CHAPEL.priestMet = !!s.chapel.priestMet; CHAPEL.flirt = s.chapel.flirt || 0; CHAPEL.cold = s.chapel.cold || 0; }
};
/* ---------------------------------------------------------------- credits */
const CREDITS = {
  music: [['Rulers of Our Lands', 'Rafael Krux', 'title'], ['Kings Trailer', 'FreePD', 'the opening'], ['Night in the Castle', 'Kevin MacLeod', 'bedchamber, study'], ['Royal Coupling', 'Kevin MacLeod', 'throne room'],
    ['Magic in the Garden', 'Rafael Krux', 'gardens'], ['The Britons', 'Kevin MacLeod', 'training yard'], ['Travelers Notebook', 'FreePD', 'the map']],
  html() {
    const m = this.music.map(([t, a, w]) => `<p><b>${t}</b> · ${a} <i>(${w})</i></p>`).join('');
    return `<h4>Music</h4>${m}<p>Public domain, from <a href="https://freepd.com" target="_blank" rel="noopener">FreePD</a>, via the SoundSafari CC0-1.0-Music collection. Credited with thanks whatever the licence requires.</p>
      <h4>Sound</h4><p>Rain, wind, fire, birds, footsteps, thunder and the rest are synthesised in the browser. The coin is from <a href="https://kenney.nl" target="_blank" rel="noopener">Kenney</a> (CC0).</p>
      <h4>Characters and animation</h4><p>Base bodies, outfits, hair and motion capture by <a href="https://quaternius.com" target="_blank" rel="noopener">Quaternius</a> (CC0).</p>
      <h4>Engine</h4><p><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> r160 (MIT). Fonts: Alegreya and Cinzel Decorative (SIL Open Font Licence).</p>
      <h4>Everything else</h4><p>Pixel art, rooms, characters, story and words: original to this project.</p>`;
  },
};
