/* GAME — walking the bedchamber: input (keys, hold-to-walk, tap-to-walk), the follow camera, the things worth a closer
   look and what the king says about them, the pause menu. */
const GAME = { dir: 0, target: null, pending: null, bubbleT: 0, lineIdx: {}, near: null, touch: false, moved: false, ft: [], autoQ: false };
GAME.LINES = {
  fire: ['The hearth keeps the frost out. Mostly.', 'Grandfather said a king may be cold anywhere but in front of his people.'],
  bed: ['Not yet. The petitioners come at first light, and I have only read half their letters.', 'Sleep is for kings with smaller kingdoms.'],
  window: ['Snow on the passes already. The harvest had better hold.', 'From up here the lower town looks peaceful. It never is.'],
  chest: ["My father's campaign chest. It still smells of oil and old rope.", 'Maps, a broken spur, and a letter I promised never to read.'],
  vanity: ['Ink, sealing wax, and a dozen decrees waiting for my name.', 'Every signature costs somebody something.'],
  cabinet: ['Grapes from the southern valleys. A gift, they said. Gifts are never only gifts.', 'Someone keeps eating the good ones.'],
  table: ['Two goblets. The queen will be up late again.', 'Wine from the neighbours. I should have it tasted first.'],
  door: ['The throne room is through there. It opens in the next build.'],
  mirrorOn: ['There. Now I look like someone people should obey.'],
  mirrorOff: ['Heavier every week. Off it comes, just for tonight.'],
};
GAME.init = function () {
  const ui = $('ui');
  GAME.marks = ROOM.inter.map((it) => { const el = document.createElement('div'); el.className = 'mk'; el.innerHTML = '<i></i>'; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Look at the ' + it.id);
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); GAME.goUse(it); }); ui.appendChild(el); return { it, el, pos: { x: 0, y: 0, z: 0 } }; });
  const keys = {};
  const dirFromKeys = () => (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { GAME.pause(!G.paused); e.preventDefault(); return; }
    if (G.paused) return;
    keys[e.code] = true; GAME.dir = dirFromKeys(); if (GAME.dir) { GAME.target = null; GAME.pending = null; GAME.onMove(); }
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { if (GAME.near) GAME.use(GAME.near); e.preventDefault(); }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; GAME.dir = dirFromKeys(); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; GAME.dir = 0; });
  // touch / mouse: hold to walk toward the pointer, a quick tap walks to the spot (or to the nearest marker)
  const view = $('view'); let hold = null;
  view.addEventListener('pointerdown', (e) => {
    if (G.paused) return; if (e.pointerType === 'touch') GAME.touch = true; GAME.hint();
    hold = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), held: false };
    try { view.setPointerCapture(e.pointerId); } catch (er) { /* */ }
  });
  view.addEventListener('pointermove', (e) => { if (hold && hold.id === e.pointerId) { hold.x = e.clientX; hold.y = e.clientY; } });
  const up = (e) => { if (!hold || hold.id !== e.pointerId) return;
    if (!hold.held) { const r = view.getBoundingClientRect(); GAME.tap(hold.x - r.left, hold.y - r.top); }
    hold = null; GAME.dir = dirFromKeys(); };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  GAME.holdTick = () => { if (!hold) return; if (!hold.held && performance.now() - hold.t > 170) { hold.held = true; GAME.target = null; GAME.pending = null; }
    if (hold.held) { const r = view.getBoundingClientRect(), k = R.toView(new THREE.Vector3(KING.x, 1, KING.z), {}); const dx = hold.x - r.left - k.x; GAME.dir = Math.abs(dx) < 14 ? 0 : Math.sign(dx); if (GAME.dir) GAME.onMove(); } };
  $('pauseBtn').addEventListener('click', () => GAME.pause(true));
  $('resumeBtn').addEventListener('click', () => GAME.pause(false));
  $('qualBtn').addEventListener('click', () => { R.q = R.q === 'high' ? 'low' : 'high'; R.resize(); GAME.labels(); });
  $('fxBtn').addEventListener('click', () => { R.fx = !R.fx; GAME.labels(); });
  GAME.labels(); GAME.hint();
  if (G.flags.x !== undefined) KING.x = +G.flags.x;
  if (G.flags.crown) { KING.crown = true; KING.crownMesh.visible = true; }
  GAME.camX = GAME.camGoal();
};
GAME.labels = function () { $('qualBtn').textContent = 'Quality: ' + (R.q === 'high' ? 'High' : 'Low'); $('fxBtn').textContent = 'Effects: ' + (R.fx ? 'On' : 'Off');
  $('helpTxt').textContent = 'Walk with the arrow keys or A and D, or hold either side of the king. Tap a diamond, or press E beside it, to look closer.'; };
GAME.hint = function () { const h = $('hint'); if (!h || GAME.moved) return;
  h.textContent = GAME.touch || matchMedia('(pointer: coarse)').matches ? 'Hold beside the king to walk  ·  tap a diamond to look closer' : '←  →  to walk  ·  E to look closer  ·  Esc to pause'; };
GAME.onMove = function () { if (!GAME.moved) { GAME.moved = true; setTimeout(() => { $('hint').style.opacity = '0'; }, 2500); } };
GAME.pause = function (on) { G.paused = on; $('pause').hidden = !on; GAME.dir = 0; if (on) $('resumeBtn').focus(); else $('cv').focus(); };
/* a tap: on/near a marker → go and look; otherwise walk to that spot on the king's line */
GAME.tap = function (vx, vy) {
  let best = null, bd = 46; for (const m of GAME.marks) { if (!m.el.classList.contains('show')) continue; const d = Math.hypot(m.pos.x - vx, m.pos.y - vy); if (d < bd) { bd = d; best = m; } }
  if (best) { GAME.goUse(best.it); return; }
  const ndc = new THREE.Vector3(vx / R.vw * 2 - 1, -(vy / R.vh) * 2 + 1, 0.5).unproject(R.cam), o = R.cam.position, d = ndc.sub(o).normalize();
  const t = (KING.z - o.z) / d.z; GAME.target = clamp(o.x + d.x * t, ROOM.X0 + 1.0, ROOM.X1 - 0.9); GAME.pending = null; GAME.onMove();
};
GAME.goUse = function (it) { if (Math.abs(KING.x - it.x) < it.r) { GAME.use(it); return; } GAME.target = clamp(it.x + Math.sign(KING.x - it.x) * Math.min(it.r * 0.6, 0.5), ROOM.X0 + 1, ROOM.X1 - 0.9); GAME.pending = it; GAME.onMove(); };
GAME.use = function (it) {
  KING.face = Math.sign(it.x - KING.x) || KING.face; KING.lookAt = it.x;
  let key = it.id;
  if (it.id === 'mirror') { KING.crown = !KING.crown; KING.crownMesh.visible = KING.crown; key = KING.crown ? 'mirrorOn' : 'mirrorOff'; KING.act = 'Interact'; KING.actT = 0; }
  else if (it.id === 'chest' || it.id === 'vanity' || it.id === 'cabinet' || it.id === 'table') { KING.act = 'Interact'; KING.actT = 0; }
  const L = GAME.LINES[key], i = GAME.lineIdx[key] || 0; GAME.lineIdx[key] = (i + 1) % L.length;
  GAME.say(L[i]);
};
GAME.say = function (text) {
  const b = $('bubble'); b.textContent = text; b.style.width = ''; b.style.whiteSpace = 'nowrap';
  const one = b.offsetWidth, max = Math.min(R.vw * 0.46, 420); b.style.whiteSpace = '';
  if (one > max) b.style.width = Math.min(max, Math.ceil(one / 2) + 28) + 'px';   // two balanced lines, no slack box
  b.classList.add('on'); GAME.bubbleT = 2.6 + text.length * 0.045;
};
GAME.camGoal = function () {
  const half = Math.tan(THREE.MathUtils.degToRad(R.cam.fov / 2)) * R.A * GAME.CAMD;   // half the view width on the king's line
  const lo = ROOM.X0 + half - 0.3, hi = ROOM.X1 - half + 0.3;
  const want = KING.x + KING.v * 0.9;
  return lo > hi ? (ROOM.X0 + ROOM.X1) / 2 : clamp(want, lo, hi);
};
GAME.CAMD = 19.4;
GAME.update = function (dt) {
  GAME.holdTick();
  // movement: keys / hold win over a tap target
  let dir = GAME.dir;
  if (!dir && GAME.target !== null) { const d = GAME.target - KING.x; if (Math.abs(d) < 0.06) { GAME.target = null; if (GAME.pending) { const it = GAME.pending; GAME.pending = null; GAME.use(it); } } else dir = Math.sign(d) * Math.min(1, Math.abs(d) / 0.35 + 0.25); }
  const vmax = 1.25;
  KING.v = damp(KING.v, dir * vmax, dir ? 5 : 8, dt);
  KING.x += KING.v * dt;
  const x0 = ROOM.X0 + 1.0, x1 = ROOM.X1 - 0.9; if (KING.x < x0 || KING.x > x1) { KING.x = clamp(KING.x, x0, x1); KING.v = 0; }
  const sp = Math.abs(KING.v);
  if (sp > 0.05) { KING.face = Math.sign(KING.v); KING.lookAt = null; }
  if (sp > 0.2 && KING.act) KING.act = null;
  const yawGoal = sp > 0.12 ? KING.face * 1.32 : KING.face * 0.42;
  KING.yaw = damp(KING.yaw, yawGoal, sp > 0.12 ? 9 : 4, dt);
  // animation: idle, talking while the bubble is up, the formal walk with its playback matched to ground speed
  KING.idleT += dt; KING.talk = damp(KING.talk, GAME.bubbleT > 0 && sp < 0.1 ? 1 : 0, 3, dt);
  const clip = 'Walk_Formal_Loop', V = KING.V[clip] || 1; KING.phase += dt * sp / V;
  const ww = smooth(0.04, 0.55, sp), layers = [['Idle_Loop', KING.idleT, 1], ['Idle_Talking_Loop', KING.idleT * 0.9, KING.talk * 0.85], [clip, KING.phase, ww]];
  if (KING.act) { KING.actT += dt; const c = QA.clips[KING.act], w = smooth(0, 0.25, KING.actT) * smooth(c.dur, c.dur - 0.35, KING.actT); layers.push([KING.act, Math.min(KING.actT, c.dur - 0.02), w * 0.9]); if (KING.actT > c.dur) KING.act = null; }
  KING.pose(layers);
  KING.root.position.set(KING.x, 0, KING.z); KING.root.rotation.y = KING.yaw;
  // camera on a rail
  GAME.camX = damp(GAME.camX, GAME.camGoal(), 2.2, dt);
  R.cam.position.set(GAME.camX, 2.45, KING.z + GAME.CAMD); R.cam.lookAt(GAME.camX, 2.18, KING.z);
  R.dofU.uFocus.value = GAME.CAMD;
  // markers, the bubble
  GAME.near = null; let nd = 9;
  for (const m of GAME.marks) { const d = Math.abs(KING.x - m.it.x); if (d < m.it.r && d < nd) { nd = d; GAME.near = m.it; } }
  for (const m of GAME.marks) { R.toView(m.it.p, m.pos); const show = G.t > 4.6 && Math.abs(KING.x - m.it.x) < 4.2 && m.pos.x > 0 && m.pos.x < R.vw;
    m.el.classList.toggle('show', show && !(GAME.bubbleT > 0 && GAME.near === m.it)); m.el.classList.toggle('near', GAME.near === m.it); m.el.style.transform = ''; m.el.style.left = m.pos.x + 'px'; m.el.style.top = m.pos.y + 'px'; }
  if (GAME.bubbleT > 0) { GAME.bubbleT -= dt; if (GAME.bubbleT <= 0 || sp > 0.6) { $('bubble').classList.remove('on'); GAME.bubbleT = 0; } }
  const bp = R.toView(new THREE.Vector3(KING.x, KING.crown ? 2.22 : 2.12, KING.z), {}), b = $('bubble');
  const bw = b.offsetWidth || 240, bw2 = bw / 2 + 10, bl = clamp(bp.x, bw2, R.vw - bw2);
  b.style.left = bl + 'px'; b.style.top = Math.max(bp.y - 6, b.offsetHeight + 6) + 'px'; b.style.setProperty('--tail', clamp(bp.x - bl + bw / 2, 14, bw - 14) + 'px');
};
/* drop to low quality once if the first seconds run slow */
GAME.perf = function (ms) {
  if (GAME.autoQ || G.flags.q) return; GAME.ft.push(ms); if (GAME.ft.length < 120) return;
  const avg = GAME.ft.reduce((a, b) => a + b, 0) / GAME.ft.length; GAME.ft.length = 0;
  if (avg > 30 && R.q === 'high') { R.q = 'low'; R.resize(); GAME.labels(); }
  GAME.autoQ = true;
};
/* test hook: advance n fixed 1/60 s steps with a held direction, then draw (headless runs far below 60 fps) */
GAME.step = function (n, dir) {
  const d0 = GAME.dir; for (let i = 0; i < n; i++) { GAME.dir = dir || 0; G.t += 1 / 60; GAME.update(1 / 60); ROOM.update(G.t, 1 / 60); }
  GAME.dir = d0; G.render(); return { x: +KING.x.toFixed(2), yaw: +KING.yaw.toFixed(2), v: +KING.v.toFixed(2), crown: KING.crown, near: GAME.near && GAME.near.id };
};
