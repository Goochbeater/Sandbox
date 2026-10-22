/* MAP — the travel map: a painted pixel-art sheet with a pin per location. The game supplies the sheet (a Pix
   painter), the places ({ id, name, sub, x, y (sheet pixels), room, at, locked }) and what happens on a pick.
     MAP.setup(painter, w, h, places)   MAP.open(currentRoomId)   MAP.close()   M key / the map button toggle it */
const MAP = { open_: false, places: [], cur: null };
MAP.setup = function (paint, w, h, places) {
  MAP.places = places; MAP.W = w; MAP.H = h;
  const p = new Pix(w, h); paint(p); const cv = $('mapCanvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(new ImageData(p.d, w, h), 0, 0);
  const pins = $('mapPins'); pins.innerHTML = '';
  for (const pl of places) { const b = document.createElement('button'); b.className = 'pin'; b.style.left = (pl.x / w * 100) + '%'; b.style.top = (pl.y / h * 100) + '%';
    b.innerHTML = `<i></i><span>${pl.name}${pl.sub ? `<small>${pl.sub}</small>` : ''}</span>`; b.disabled = !!pl.locked; b.setAttribute('aria-label', pl.locked ? pl.name + ' (not yet)' : 'Go to ' + pl.name);
    b.onclick = () => MAP.pick(pl); pins.appendChild(b); pl.el = b; }
  $('mapClose').onclick = () => MAP.close();
  $('mapBtn').onclick = () => { if (!SCENE.lock && !SCENE.modal && !G.paused && !CUT.playing) MAP.open(); };
};
MAP.open = function () {
  if (MAP.open_ || !MAP.places.length) return; MAP.open_ = true; SCENE.modal = true; $('map').hidden = false; AUDIO.sfx('page', { gain: 0.8 });
  MAP.cur = SCENE.room && SCENE.room.id; for (const pl of MAP.places) { pl.el.classList.toggle('here', pl.room === MAP.cur); pl.el.disabled = !!pl.locked; }
  MAP.prev = AUDIO.cur && AUDIO.cur.name; if (MAP.music) AUDIO.playMusic(MAP.music, 1.2);
  const here = MAP.places.find((p) => p.room === MAP.cur && !p.locked) || MAP.places.find((p) => !p.locked); if (here) here.el.focus();
};
MAP.close = function (keepMusic) { if (!MAP.open_) return; MAP.open_ = false; SCENE.modal = false; $('map').hidden = true; if (!keepMusic && MAP.prev) AUDIO.playMusic(MAP.prev, 1.2); $('cv').focus(); };
MAP.pick = function (pl) {
  if (pl.locked) return; AUDIO.sfx('click');
  if (pl.room === MAP.cur) { MAP.close(); return; }
  MAP.close(true); if (MAP.onPick) MAP.onPick(pl); else SCENE.go(pl.room, pl.at);
};
window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat && !G.paused && !CUT.playing && !SCENE.menu) { if (MAP.open_) MAP.close(); else if (!SCENE.lock && !SCENE.modal) MAP.open(); }
  if (e.code === 'Escape' && MAP.open_) { MAP.close(); e.stopImmediatePropagation(); } }, true);
