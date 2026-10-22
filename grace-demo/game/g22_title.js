/* TITLE, OPENING, SAVE — the title screen over the fortress in the storm, the opening cutscene (STORY.md §3), the
   settings and credits panels, and what goes in the save slot. */
const TITLE = { on: false };
TITLE.CAM = [[-11, 5.5, 82, -10, 15.5, -12, 22], [-8, 6.5, 76, -7, 16, -12, 21]];   // the fortress on the right, the name on the hillside at left
TITLE.CAM_N = [[-17, 6, 92, -15, 16.5, -12, 25], [-14, 7, 86, -12, 17, -12, 24]];   // the same on a near-square frame (a Fold's inner screen)
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
  { room: 'exterior', setup: () => EXTERIOR.mode('title'), music: 'intro', musicFade: 2, cam: { from: [6, 5, 48, 12, 12, -12, 22], to: [9, 7, 34, 13, 14, -12, 20] }, dur: 8,
    caption: 'Twelve years ago, the rain fell on Lodmir for forty days.', sfx: [['thunder', 1.6, { gain: 0.9 }]] },
  { room: 'exterior', setup: () => EXTERIOR.mode('siege'), cam: { from: [-3, 2.4, 22, 5, 6, -8, 24], to: [7, 3.2, 17, 11, 7, -8, 22] }, dur: 8.5,
    caption: 'Under it came the Margrave of Hal, to the walls of the Swan Fortress.',
    sfx: [['drum', 0.2, { gain: 0.8 }], ['drum', 0.9, { gain: 0.6 }], ['drum', 1.6, { gain: 0.8 }], ['clang', 2.2, { gain: 0.5, pan: -0.4 }], ['drum', 2.4, { gain: 0.6 }], ['clang', 3.3, { gain: 0.4, pan: 0.5 }], ['drum', 3.1, { gain: 0.8 }], ['clang', 4.6, { gain: 0.5 }], ['thunder', 5.5, { gain: 0.7 }]] },
  { room: 'throne', setup: () => THRONE.night(true), cam: { from: [1.5, 2.7, 17, 1.5, 1.9, 1.0, 19], to: [1.5, 2.3, 11, 1.5, 1.7, 1.0, 19] }, dur: 8.5,
    caption: 'King Bolesław held the gate for nineteen days. He did not see the twentieth.', ambience: { rainGlass: 0.8, tone: 0.4 }, acoustics: { size: 3.2, wet: 0.45 } },
  { room: 'exterior', setup: () => { THRONE.night(false); EXTERIOR.mode('wood'); },
    cam: { from: [-50, 1.7, 13, -50, 1.25, 2, 22], to: [-50, 1.45, 9.5, -50, 1.1, 2, 20] }, dur: 9,
    caption: 'On the twentieth night, his son rode out alone to the Woman in the Wood.' },
  { room: 'exterior', setup: () => EXTERIOR.mode('dawn'), cam: { from: [4, 4, 42, 10, 9.5, -10, 22], to: [7, 5, 36, 11, 10.5, -10, 21] }, dur: 8,
    caption: 'By morning the Margrave’s army was gone. No one has ever said where.' },
  { room: 'exterior', setup: () => EXTERIOR.mode('present'), cam: { from: [12, 8, 32, 15, 16, -14, 18], to: [14, 10, 25, 15, 18.5, -14, 16] }, dur: 7.5,
    caption: 'Twelve years later, the rain has come back.', sfx: [['thunder', 2.4, { gain: 1 }]] },
];
/* ---------------------------------------------------------------- the save slot */
const GAME = {};
GAME.reset = function () { SCENE.player.crownMesh.visible = false; COURT.reset(); };
GAME.state = function () { const K = SCENE.player, R0 = SCENE.room;
  return { room: R0 && R0.id !== 'exterior' ? R0.id : 'bedroom', x: K.x, crown: K.crownMesh.visible,
    court: { done: COURT.done, prosperity: COURT.prosperity, stats: COURT.stats, agents: COURT.agents.map((a) => ({ id: a.id, ap: a.ap, wound: a.wound })), items: COURT.items.map((i) => ({ id: i.id, n: i.n })) } }; };
GAME.save = function () { if (SCENE.room && SCENE.room.id !== 'exterior' && !CUT.playing) SAVE.put(GAME.state()); };
GAME.load = function (s) {
  const K = SCENE.player; K.crownMesh.visible = !!s.crown;
  if (s.court) { COURT.done = s.court.done; COURT.greeted = COURT.done; COURT.prosperity = s.court.prosperity || 0; Object.assign(COURT.stats, s.court.stats || {});
    for (const a of s.court.agents || []) { const g = COURT.agents.find((q) => q.id === a.id); if (g) Object.assign(g, a); }
    for (const i of s.court.items || []) { const g = COURT.items.find((q) => q.id === i.id); if (g) g.n = i.n; } }
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
