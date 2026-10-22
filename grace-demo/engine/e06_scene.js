/* SCENE — runs whichever room the player is in: room switching behind a fade, the follow camera on its rail, input
   (keys, hold-to-walk, tap-to-walk, tap a marker), the ◇ markers over things worth a closer look, speech bubbles and
   conversations, the pause menu. Game code talks to it through:
     SCENE.addRoom(room)  SCENE.addActor(actor)  SCENE.go(id, { x, face })  SCENE.say(actor, text)
     SCENE.talk([[actor, text], …])  SCENE.cycle(key, lines)  SCENE.caption(title, sub)  SCENE.lock / SCENE.modal */
const SCENE = { rooms: {}, room: null, actors: [], player: null, lock: 0, modal: false, near: null, marks: [], camX: 0, dir: 0, bubble: null, lineIdx: {}, touch: false, moved: false, ft: [], autoQ: false };
SCENE.addRoom = function (room) { SCENE.rooms[room.id] = room; return room; };
SCENE.addActor = function (a) { SCENE.actors.push(a); return a; };
/* switch rooms at once (used at boot and behind the fade) */
SCENE.enter = function (id, at) {
  at = at || {};
  if (SCENE.room) R.scene.remove(SCENE.room.group);
  const room = SCENE.rooms[id]; SCENE.room = room; R.scene.add(room.group);
  R.reflU.uReflK.value = room.reflK; R.mat.final.uniforms.uExpo.value = room.exposure;
  R.baseFov = room.cam.fov; R.cam.fov = room.cam.fov * R.fovK; R.cam.updateProjectionMatrix();
  for (const k in room.dof || {}) R.dofU[k].value = room.dof[k];
  const P = SCENE.player; if (P) { P.stand(); P.x = at.x !== undefined ? at.x : P.x; P.z = room.KZ; P.face = at.face || P.face; P.yaw = P.face * 1.0; P.target = null; P.v = 0; }
  for (const a of SCENE.actors) a.setVisible(a === P || (a.home === id && !a.offstage));
  SCENE.buildMarks(); SCENE.bubbleOff();
  R.r.shadowMap.needsUpdate = true;
  SCENE.camX = SCENE.camGoal(true);
  if (room.onEnter) room.onEnter(at);
};
SCENE.go = async function (id, at) {
  SCENE.lock++; SCENE.dir = 0; if (SCENE.player) { SCENE.player.target = null; }
  const f = $('fade'); f.classList.remove('off'); await SCENE.wait(900);
  SCENE.enter(id, at);
  R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame();
  f.classList.add('off'); await SCENE.wait(400); SCENE.lock--;
};
SCENE.wait = (ms) => new Promise((r) => setTimeout(r, ms));
SCENE.caption = function (title, sub) { const c = $('caption'); c.innerHTML = ''; c.append(title); if (sub) { const s = document.createElement('small'); s.textContent = sub; c.append(s); }
  setTimeout(() => c.classList.add('on'), 700); setTimeout(() => c.classList.remove('on'), 4600); SCENE.markDelay = G.t + 4.6; };
/* ---------------------------------------------------------------- speech */
SCENE.cycle = function (key, lines) { const i = SCENE.lineIdx[key] || 0; SCENE.lineIdx[key] = (i + 1) % lines.length; return lines[i]; };
/* show a bubble over an actor; resolves when it's gone (after its reading time, or when advanced if o.wait) */
SCENE.say = function (actor, text, o) {
  o = o || {};
  SCENE.bubbleOff();
  const b = $('bubble'); b.textContent = text; b.style.width = ''; b.style.whiteSpace = 'nowrap'; b.classList.toggle('wait', !!o.wait);
  const one = b.offsetWidth, max = Math.min(R.vw * 0.46, 420); b.style.whiteSpace = '';
  if (one > max) b.style.width = Math.min(max, Math.ceil(one / 2) + 28) + 'px';   // two balanced lines, no slack box
  b.classList.add('on'); actor.talking = true;
  return new Promise((res) => { SCENE.bubble = { actor, t: o.wait ? 60 : 2.6 + text.length * 0.045, res, wait: !!o.wait, min: G.t + 0.35 }; });
};
SCENE.bubbleOff = function () { const B = SCENE.bubble; if (!B) return; SCENE.bubble = null; B.actor.talking = false; $('bubble').classList.remove('on'); B.res(); };
SCENE.advance = function () { const B = SCENE.bubble; if (B && G.t > B.min) { SCENE.bubbleOff(); return true; } return false; };
SCENE.talk = async function (seq) { SCENE.lock++; for (const [a, t] of seq) { if (a.visible) { await SCENE.say(a, t, { wait: true }); await SCENE.wait(120); } } SCENE.lock--; };
/* ---------------------------------------------------------------- markers */
SCENE.buildMarks = function () {
  for (const m of SCENE.marks) m.el.remove();
  SCENE.marks = SCENE.room.inter.map((it) => { const el = document.createElement('div'); el.className = 'mk'; el.innerHTML = '<i></i>'; el.setAttribute('role', 'button'); el.setAttribute('aria-label', it.label || 'Look at the ' + it.id);
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!SCENE.lock && !SCENE.modal && !G.paused) SCENE.goUse(it); }); $('ui').appendChild(el); return { it, el, pos: { x: 0, y: 0, z: 0 } }; });
};
SCENE.goUse = function (it) {
  const P = SCENE.player; if (Math.abs(P.x - it.x) < it.r) { SCENE.use(it); return; }
  const room = SCENE.room; P.walkTo(clamp(it.x + Math.sign(P.x - it.x) * Math.min(it.r * 0.6, 0.5), room.X0 + 1, room.X1 - 0.9), () => SCENE.use(it)); SCENE.onMove();
};
SCENE.pulse = function (it) { const m = SCENE.marks.find((q) => q.it === it); if (!m) return; const far = it.far; it.far = 40; m.el.classList.add('pulse'); setTimeout(() => { it.far = far; m.el.classList.remove('pulse'); }, 3000); };
SCENE.use = function (it) { const P = SCENE.player; P.faceTo(it.x); if (it.use) it.use(SCENE.room, it); };
/* ---------------------------------------------------------------- input */
SCENE.initInput = function () {
  const keys = {};
  const dirFromKeys = () => (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (!SCENE.modal) SCENE.pause(!G.paused); e.preventDefault(); return; }
    if (G.paused) return;
    keys[e.code] = true;
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (SCENE.advance()) return; if (!SCENE.lock && !SCENE.modal && SCENE.near) SCENE.use(SCENE.near); return; }
    SCENE.dir = dirFromKeys(); if (SCENE.dir && !SCENE.lock && !SCENE.modal) { SCENE.player.target = null; SCENE.player.onArrive = null; SCENE.onMove(); }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; SCENE.dir = dirFromKeys(); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; SCENE.dir = 0; });
  // touch / mouse: hold to walk toward the pointer, a quick tap walks to the spot (or to the nearest marker)
  const view = $('view'); let hold = null;
  view.addEventListener('pointerdown', (e) => {
    if (G.paused || SCENE.modal) return; if (e.pointerType === 'touch') SCENE.touch = true; SCENE.hint();
    if (SCENE.advance()) return;
    if (SCENE.lock) return;
    hold = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), held: false };
    try { view.setPointerCapture(e.pointerId); } catch (er) { /* */ }
  });
  view.addEventListener('pointermove', (e) => { if (hold && hold.id === e.pointerId) { hold.x = e.clientX; hold.y = e.clientY; } });
  const up = (e) => { if (!hold || hold.id !== e.pointerId) return;
    if (!hold.held && !SCENE.lock) { const r = view.getBoundingClientRect(); SCENE.tap(hold.x - r.left, hold.y - r.top); }
    hold = null; SCENE.dir = dirFromKeys(); };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  SCENE.holdTick = () => { if (!hold) return; if (SCENE.lock || SCENE.modal) { hold = null; SCENE.dir = 0; return; }
    if (!hold.held && performance.now() - hold.t > 170) { hold.held = true; SCENE.player.target = null; SCENE.player.onArrive = null; }
    if (hold.held) { const r = view.getBoundingClientRect(), P = SCENE.player, k = R.toView(new THREE.Vector3(P.x, 1 + P.y, P.z), {}); const dx = hold.x - r.left - k.x; SCENE.dir = Math.abs(dx) < 14 ? 0 : Math.sign(dx); if (SCENE.dir) SCENE.onMove(); } };
  $('pauseBtn').addEventListener('click', () => { if (!SCENE.modal) SCENE.pause(true); });
  $('resumeBtn').addEventListener('click', () => SCENE.pause(false));
  $('qualBtn').addEventListener('click', () => { R.q = R.q === 'high' ? 'low' : 'high'; R.resize(); SCENE.labels(); });
  $('fxBtn').addEventListener('click', () => { R.fx = !R.fx; SCENE.labels(); });
  SCENE.labels(); SCENE.hint();
};
SCENE.labels = function () { $('qualBtn').textContent = 'Quality: ' + (R.q === 'high' ? 'High' : 'Low'); $('fxBtn').textContent = 'Effects: ' + (R.fx ? 'On' : 'Off');
  $('helpTxt').textContent = 'Walk with the arrow keys or A and D, or hold either side of the king. Tap a diamond, or press E beside it, to look closer. Tap or press E to move a conversation on.'; };
SCENE.hint = function () { const h = $('hint'); if (!h || SCENE.moved) return;
  h.textContent = SCENE.touch || matchMedia('(pointer: coarse)').matches ? 'Hold beside the king to walk  ·  tap a diamond to look closer' : '←  →  to walk  ·  E to look closer  ·  Esc to pause'; };
SCENE.onMove = function () { if (!SCENE.moved) { SCENE.moved = true; setTimeout(() => { $('hint').style.opacity = '0'; }, 2500); } };
SCENE.pause = function (on) { G.paused = on; $('pause').hidden = !on; SCENE.dir = 0; if (on) $('resumeBtn').focus(); else $('cv').focus(); };
/* a tap: on/near a marker → go and look; otherwise walk to that spot on the king's line */
SCENE.tap = function (vx, vy) {
  let best = null, bd = 46; for (const m of SCENE.marks) { if (!m.el.classList.contains('show')) continue; const d = Math.hypot(m.pos.x - vx, m.pos.y - vy); if (d < bd) { bd = d; best = m; } }
  if (best) { SCENE.goUse(best.it); return; }
  const P = SCENE.player; if (P.sitting) return;
  const ndc = new THREE.Vector3(vx / R.vw * 2 - 1, -(vy / R.vh) * 2 + 1, 0.5).unproject(R.cam), o = R.cam.position, d = ndc.sub(o).normalize();
  const t = (P.z - o.z) / d.z; P.walkTo(clamp(o.x + d.x * t, SCENE.room.X0 + 1.0, SCENE.room.X1 - 0.9)); SCENE.onMove();
};
/* ---------------------------------------------------------------- frame */
SCENE.camGoal = function (snap) {
  const room = SCENE.room, P = SCENE.player, half = Math.tan(THREE.MathUtils.degToRad(R.cam.fov / 2)) * R.A * room.cam.dist;
  const lo = room.X0 + half - 0.3, hi = room.X1 - half + 0.3, want = (room.camFocus !== undefined && room.camFocus !== null ? room.camFocus : P.x + P.v * 0.9);
  return lo > hi ? (room.X0 + room.X1) / 2 : clamp(want, lo, hi);
};
SCENE.update = function (dt) {
  const room = SCENE.room, P = SCENE.player;
  SCENE.holdTick();
  P.dir = SCENE.lock || SCENE.modal ? 0 : SCENE.dir;
  if (P.dir) { P.target = null; P.onArrive = null; }
  for (const a of SCENE.actors) if (a.visible) a.update(dt);
  const x0 = room.X0 + 1.0, x1 = room.X1 - 0.9; if (!P.sitting && (P.x < x0 || P.x > x1)) { P.x = clamp(P.x, x0, x1); P.v = 0; }
  if (room.onUpdate) room.onUpdate(dt);
  // camera on a rail
  SCENE.camX = damp(SCENE.camX, SCENE.camGoal(), 2.2, dt);
  const cam = room.cam; R.cam.position.set(SCENE.camX, cam.y, room.KZ + cam.dist); R.cam.lookAt(SCENE.camX, cam.look, room.KZ);
  R.dofU.uFocus.value = cam.dist + (room.focusDz || 0);
  // markers, the bubble
  SCENE.near = null; let nd = 9;
  if (!SCENE.lock && !SCENE.modal) for (const m of SCENE.marks) { const it = m.it; if (it.hidden || !!it.seated !== !!P.sitting) continue;
    if (P.sitting) { SCENE.near = it; break; } const d = Math.abs(P.x - it.x); if (d < it.r && d < nd) { nd = d; SCENE.near = it; } }
  const quiet = SCENE.lock || SCENE.modal || G.t < (SCENE.markDelay || 0);
  for (const m of SCENE.marks) { R.toView(m.it.p, m.pos); const show = !quiet && !m.it.hidden && !!m.it.seated === !!P.sitting && (P.sitting || Math.abs(P.x - m.it.x) < (m.it.far || 4.2)) && m.pos.x > 0 && m.pos.x < R.vw;
    m.el.classList.toggle('show', show && !(SCENE.bubble && SCENE.near === m.it)); m.el.classList.toggle('near', SCENE.near === m.it); m.el.style.left = m.pos.x + 'px'; m.el.style.top = m.pos.y + 'px'; }
  const B = SCENE.bubble;
  if (B) { B.t -= dt; if (B.t <= 0 || (!B.wait && Math.abs(B.actor.v) > 0.6)) SCENE.bubbleOff(); }
  if (SCENE.bubble) { const a = SCENE.bubble.actor, b = $('bubble'), bp = R.toView(Actor._c.set(a.x, a.y + (a.spec.headY || 2.12) + (a.crownMesh && a.crownMesh.visible ? 0.1 : 0), a.z), {});
    const bw = b.offsetWidth || 240, bw2 = bw / 2 + 10, bl = clamp(bp.x, bw2, R.vw - bw2);
    b.style.left = bl + 'px'; b.style.top = Math.max(bp.y - 6, b.offsetHeight + 6) + 'px'; b.style.setProperty('--tail', clamp(bp.x - bl + bw / 2, 14, bw - 14) + 'px'); }
};
SCENE.render = function () { const room = SCENE.room; for (const a of SCENE.actors) a.render(room); R.frame(G.t); };
/* drop to low quality once if the first seconds run slow */
SCENE.perf = function (ms) {
  if (SCENE.autoQ || G.flags.q) return; SCENE.ft.push(ms); if (SCENE.ft.length < 120) return;
  const avg = SCENE.ft.reduce((a, b) => a + b, 0) / SCENE.ft.length; SCENE.ft.length = 0;
  if (avg > 30 && R.q === 'high') { R.q = 'low'; R.resize(); SCENE.labels(); }
  SCENE.autoQ = true;
};
/* test hook: advance n fixed 1/60 s steps with a held direction, then draw (headless runs far below 60 fps) */
SCENE.step = function (n, dir) {
  const d0 = SCENE.dir; for (let i = 0; i < n; i++) { SCENE.dir = dir || 0; G.t += 1 / 60; SCENE.update(1 / 60); SCENE.room.update(G.t, 1 / 60); }
  SCENE.dir = d0; SCENE.render(); const P = SCENE.player;
  return { room: SCENE.room.id, x: +P.x.toFixed(2), yaw: +P.yaw.toFixed(2), v: +P.v.toFixed(2), crown: P.crownMesh.visible, near: SCENE.near && SCENE.near.id, sit: !!P.sitting };
};
