/* MAP — the travel map: a painted pixel-art sheet with a pin per location. The game supplies the sheet (a Pix
   painter, run on first open; it can use MAP.snap to photograph a 3D room into it), the places
   ({ id, name, sub, x, y (sheet pixels), side: 'l' | 'r' (label beside the pin), room, at, locked }) and what happens
   on a pick.
     MAP.setup(painter, w, h, places)   MAP.open(currentRoomId)   MAP.close()   M key / the map button toggle it */
const MAP = { open_: false, places: [], cur: null };
MAP.setup = function (paint, w, h, places) {
  MAP.places = places; MAP.W = w; MAP.H = h; MAP.paint = paint; MAP.painted = false;   // painted on first open (it may photograph a 3D room)
  const pins = $('mapPins'); pins.innerHTML = '';
  for (const pl of places) { const b = document.createElement('button'); b.className = 'pin' + (pl.side ? ' side-' + pl.side : '');
    b.innerHTML = `<i></i><span>${pl.name}${pl.sub ? `<small>${pl.sub}</small>` : ''}</span>`; b.disabled = !!pl.locked; b.setAttribute('aria-label', pl.locked ? pl.name + ' (not yet)' : 'Go to ' + pl.name);
    b.onclick = () => MAP.pick(pl); pins.appendChild(b); pl.el = b; }
  $('mapClose').onclick = () => MAP.close();
  $('mapBtn').onclick = () => { if (!SCENE.lock && !SCENE.modal && !G.paused && !CUT.playing) MAP.open(); };
};
MAP.open = function () {
  if (MAP.open_ || !MAP.places.length) return;
  if (!MAP.painted) { const p = new Pix(MAP.W, MAP.H), cv = $('mapCanvas'); MAP.paint(p); cv.width = MAP.W; cv.height = MAP.H; cv.getContext('2d').putImageData(new ImageData(p.d, MAP.W, MAP.H), 0, 0); MAP.painted = true;
    for (const pl of MAP.places) { pl.el.style.left = (pl.x / MAP.W * 100) + '%'; pl.el.style.top = (pl.y / MAP.H * 100) + '%'; } }   // the painter may move pins (onto the photographed castle)
  MAP.open_ = true; SCENE.modal = true; $('map').hidden = false; AUDIO.sfx('page', { gain: 0.8 });
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
/* a picture of a 3D room for the map: renders `roomId` from a pose into a small target, tone-mapped, and returns its
   pixels (top row first) for the map painter to ink and colour. prep(room, true/false) switches the room into map light
   (daylight, no rain, no glows) and back. Actors are hidden while it runs. */
MAP.snap = function (roomId, pose, w, h, prep) {
  const room = SCENE.rooms[roomId], cur = SCENE.room, r = R.r; if (!room.built) room.build();
  const vis = SCENE.actors.map((a) => a.visible); for (const a of SCENE.actors) a.setVisible(false);
  if (cur !== room) { R.scene.remove(cur.group); R.scene.add(room.group); }
  const fog = R.scene.fog, bg = R.scene.background; R.scene.fog = null; R.scene.background = new THREE.Color(0x000000);
  if (prep) prep(room, true);
  room.group.updateMatrixWorld(true); r.shadowMap.needsUpdate = true;
  const cam = new THREE.PerspectiveCamera(pose.fov, w / h, 2, 900); cam.layers.enable(2); cam.position.set(pose.x, pose.y, pose.z); cam.lookAt(pose.lx, pose.ly, pose.lz); cam.updateMatrixWorld();
  const hdr = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }), ldr = new THREE.WebGLRenderTarget(w, h);
  r.setRenderTarget(hdr); r.setClearColor(0x000000, 0); r.clear(); r.render(R.scene, cam);
  const tm = new THREE.ShaderMaterial({ vertexShader: R.SH.vert, uniforms: { t: { value: hdr.texture }, uExpo: { value: pose.expo || 1 } }, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D t; uniform float uExpo; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      void main(){ vec4 c = texture2D(t, vUv); gl_FragColor = vec4(pow(aces(c.rgb * uExpo), vec3(1.0 / 2.2)), c.a > 0.0 ? 1.0 : 0.0); }` });
  R.pass(tm, ldr);
  const px = new Uint8Array(w * h * 4); r.readRenderTargetPixels(ldr, 0, 0, w, h, px);
  const out = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) out.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  hdr.dispose(); ldr.dispose(); tm.dispose(); r.setRenderTarget(null);
  if (prep) prep(room, false);
  R.scene.fog = fog; R.scene.background = bg;
  if (cur !== room) { R.scene.remove(room.group); R.scene.add(cur.group); }
  SCENE.actors.forEach((a, i) => a.setVisible(vis[i])); r.shadowMap.needsUpdate = true;
  return new ImageData(out, w, h);
};
