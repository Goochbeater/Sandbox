/* SCENE — runs whichever room the player is in: room switching behind a fade, the follow camera on its rail, input
   (keys, hold-to-walk, tap-to-walk, tap a marker), the ◇ markers over things worth a closer look, speech bubbles and
   conversations, the pause menu. Game code talks to it through:
     SCENE.addRoom(room)  SCENE.addActor(actor)  SCENE.go(id, { x, face })  SCENE.say(actor, text)
     SCENE.talk([[actor, text], …])  SCENE.cycle(key, lines)  SCENE.caption(title, sub)  SCENE.lock / SCENE.modal / SCENE.menu */
const SCENE = { rooms: {}, room: null, actors: [], player: null, lock: 0, modal: false, near: null, marks: [], camX: 0, dir: 0, bubble: null, lineIdx: {}, touch: false, moved: false, ft: [], autoQ: false,
  walkK: 1, autoJog: true, JOG: 1.75, jogKey: false, holdK: 1 };
/* how the king moves (Settings, remembered in this browser): walkK scales his walking speed (0.7–1.6); he jogs at JOG times
   that while Shift is held, while a touch is held far from him, or (autoJog) on the way to a spot more than 3.5 m off */
try { const m = JSON.parse(localStorage.getItem('grace.move') || 'null'); if (m) { SCENE.walkK = clamp(+m.walkK || 1, 0.7, 1.6); SCENE.autoJog = m.autoJog !== false; } } catch (e) { /* storage may be blocked */ }
SCENE.saveMove = function () { try { localStorage.setItem('grace.move', JSON.stringify({ walkK: SCENE.walkK, autoJog: SCENE.autoJog })); } catch (e) { /* */ } };
SCENE.DOF0 = { uNear0: 0.8, uNearR: 3.2, uFar0: 3.0, uFarR: 10 };   // depth-of-field ramps (m) every room starts from; room.dof overrides
SCENE.addRoom = function (room) { SCENE.rooms[room.id] = room; return room; };
SCENE.addActor = function (a) { SCENE.actors.push(a); return a; };
/* before a room is entered, the game may need to get it ready (the cast builds its lazy actors here: CAST.ensure). Every
   way into a room awaits it: SCENE.go behind its fade, Continue, and a ?room= test link at boot */
SCENE.beforeEnter = null;
SCENE.prepare = async function (id) { if (SCENE.beforeEnter) await SCENE.beforeEnter(id); };
/* switch rooms at once (used at boot and behind the fade) */
SCENE.enter = function (id, at) {
  at = at || {};
  if (SCENE.room) R.scene.remove(SCENE.room.group);
  const room = SCENE.rooms[id]; if (!room.built) room.build();   // rooms are built the first time they're entered
  SCENE.room = room; R.scene.add(room.group);
  if (!CUT.playing || at.sound) { if (room.music !== undefined) AUDIO.playMusic(room.music); AUDIO.ambience(room.ambience || {}); AUDIO.acoustics(room.acoustics || { size: 1.4, wet: 0.2 }); }
  R.reflU.uReflK.value = room.reflK; R.mat.final.uniforms.uExpo.value = room.exposure;
  R.scene.fog = room.fog ? new THREE.FogExp2(room.fog[0], room.fog[1]) : null;   // room.fog: [colour, density] — distance haze outdoors
  R.cam.near = room.near || 1; R.cam.far = room.far || 70; R.dofU.uCNear.value = R.cam.near; R.dofU.uCFar.value = R.cam.far;   // outdoor rooms see much further
  R.baseFov = room.cam.fov; R.cam.fov = room.cam.fov * R.fovK; R.cam.updateProjectionMatrix();
  for (const k in SCENE.DOF0) R.dofU[k].value = SCENE.DOF0[k]; for (const k in room.dof || {}) R.dofU[k].value = room.dof[k];
  R.grade(room.grade); SCENE.focusSnap = true;   // the room's own split tone; the focus starts on its walking line
  const P = SCENE.player; if (P) { P.stand(); P.x = at.x !== undefined ? at.x : P.x; P.z = room.KZ; P.face = at.face || P.face; P.yaw = P.face * 1.0; P.target = null; P.v = 0;
    if (P.disguise) P.disguise(!!room.disguise); }   // a room with { disguise: true } (the river quarter) has the king in his plain coat; every other room has him himself
  Actor.assignLayers(id, P);   // deal the layers first, so showing an actor never has to claim one
  for (const a of SCENE.actors) { if (a !== P) a.placeIn(id); a.setVisible(a === P ? !room.noPlayer : a.livesIn(id) && !a.offstage); }
  SCENE.buildMarks(); SCENE.bubbleOff();
  R.r.shadowMap.needsUpdate = true;
  SCENE.camX = SCENE.camGoal(true);
  if (room.onEnter) room.onEnter(at);
  if (SCENE.afterEnter) SCENE.afterEnter(room, at);   // the game's word on every room (the calendar: rain on the glass in the crisis weeks)
};
SCENE.go = async function (id, at) {
  SCENE.lock++; SCENE.dir = 0; if (SCENE.player) { SCENE.player.target = null; }
  const f = $('fade'); f.classList.remove('off'); await SCENE.wait(900);
  await SCENE.prepare(id);
  SCENE.enter(id, at);
  R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame();
  f.classList.add('off'); await SCENE.wait(400); SCENE.lock--;
};
SCENE.wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* ease the room's lens to { focus, dist, y, look, fov } over dur seconds (a show, a scene); SCENE.lens(room, null) eases back
   to the room's own (kept in room.cam0 the first time). The focus is still clamped by SCENE.camGoal, so near a wall a scene
   can only come part of the way: put the action where the clamp lets the lens reach (ENGINE.md §13i) */
/* put a room's own lens back at once (no ease: SCENE.lens runs on the room's ticks, which stop when another room is entered,
   so awaiting it for a room you've left never returns) */
SCENE.lensReset = function (room) { if (room.cam0) Object.assign(room.cam, room.cam0); room.camFocus = null; };
SCENE.lens = function (room, to, dur) {
  const c = room.cam; if (!room.cam0) room.cam0 = { dist: c.dist, y: c.y, look: c.look, fov: c.fov };
  const from = { focus: room.camFocus !== null && room.camFocus !== undefined ? room.camFocus : SCENE.camX, dist: c.dist, y: c.y, look: c.look, fov: c.fov }, goal = Object.assign({ focus: null }, room.cam0, to || {});
  return new Promise((res) => { let t = 0; const f = (T, dt) => { t += dt; const u = smooth(0, 1, t / (dur || 1.2));
    c.dist = lerp(from.dist, goal.dist, u); c.y = lerp(from.y, goal.y, u); c.look = lerp(from.look, goal.look, u); c.fov = lerp(from.fov, goal.fov, u);
    room.camFocus = goal.focus === null ? (u >= 1 ? null : lerp(from.focus, SCENE.player.x, u)) : lerp(from.focus, goal.focus, u);
    if (u >= 1) { room.tick = room.tick.filter((g) => g !== f); res(); } }; room.tick.push(f); });
};
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
/* move a conversation on. Only a waiting line swallows the key/tap; a passing remark just closes and the input carries on */
SCENE.advance = function () { const B = SCENE.bubble; if (!B) return false; if (!B.wait) { SCENE.bubbleOff(); return false; } if (G.t > B.min) { SCENE.bubbleOff(); return true; } return true; };
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
    if (CUT.playing) { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { CUT.skip = true; e.preventDefault(); } return; }
    if (SCENE.menu) return;   // a title screen or other full-screen menu owns the keys
    if (e.code === 'Escape' || e.code === 'KeyP') { if (!SCENE.modal) SCENE.pause(!G.paused); e.preventDefault(); return; }
    if (G.paused) return;
    keys[e.code] = true; SCENE.jogKey = !!(keys.ShiftLeft || keys.ShiftRight);
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (SCENE.advance()) return; if (!SCENE.lock && !SCENE.modal && SCENE.near) SCENE.use(SCENE.near); return; }
    SCENE.dir = dirFromKeys(); if (SCENE.dir && !SCENE.lock && !SCENE.modal) { SCENE.player.target = null; SCENE.player.onArrive = null; SCENE.onMove(); }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; SCENE.jogKey = !!(keys.ShiftLeft || keys.ShiftRight); SCENE.dir = dirFromKeys(); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; SCENE.dir = 0; SCENE.jogKey = false; });
  // touch / mouse: hold to walk toward the pointer, a quick tap walks to the spot (or to the nearest marker)
  const view = $('view'); let hold = null;
  view.addEventListener('pointerdown', (e) => {
    if (G.paused || SCENE.modal || SCENE.menu) return; if (e.pointerType === 'touch') SCENE.touch = true; SCENE.hint();
    if (SCENE.advance()) return;
    if (SCENE.lock) return;
    hold = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), held: false };
    try { view.setPointerCapture(e.pointerId); } catch (er) { /* */ }
  });
  view.addEventListener('pointermove', (e) => { if (hold && hold.id === e.pointerId) { hold.x = e.clientX; hold.y = e.clientY; } });
  const up = (e) => { if (!hold || hold.id !== e.pointerId) return;
    if (!hold.held && !SCENE.lock) { const r = view.getBoundingClientRect(); SCENE.tap(hold.x - r.left, hold.y - r.top); }
    hold = null; SCENE.holdK = 1; SCENE.dir = dirFromKeys(); };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  SCENE.holdTick = () => { if (!hold) return; if (SCENE.lock || SCENE.modal) { hold = null; SCENE.dir = 0; return; }
    if (!hold.held && performance.now() - hold.t > 170) { hold.held = true; SCENE.player.target = null; SCENE.player.onArrive = null; }
    if (hold.held) { const r = view.getBoundingClientRect(), P = SCENE.player, k = R.toView(new THREE.Vector3(P.x, 1 + P.y, P.z), {}); const dx = hold.x - r.left - k.x; SCENE.dir = Math.abs(dx) < 14 ? 0 : Math.sign(dx); if (SCENE.dir) SCENE.onMove();
      SCENE.holdK = SCENE.autoJog ? 1 + (SCENE.JOG - 1) * smooth(0.22, 0.38, Math.abs(dx) / r.width) : 1; } };   // the farther the finger from the king, the faster he goes
  $('pauseBtn').addEventListener('click', () => { if (!SCENE.modal && !CUT.playing) SCENE.pause(true); });
  $('skipBtn').addEventListener('click', () => { CUT.skip = true; });
  Actor.onStep = (a) => { const rm = SCENE.room; AUDIO.step(rm.surfaceAt ? rm.surfaceAt(a.x, a.z) : rm.surface || 'stone', a.x, a.z); };
  $('resumeBtn').addEventListener('click', () => SCENE.pause(false));
  $('qualBtn').addEventListener('click', () => { R.q = R.q === 'high' ? 'low' : 'high'; R.resize(); SCENE.labels(); });
  $('fxBtn').addEventListener('click', () => { R.fx = !R.fx; SCENE.labels(); });
  const ws = $('walkSpd'); ws.value = Math.round(SCENE.walkK * 100);
  ws.addEventListener('input', () => { SCENE.walkK = clamp(ws.value / 100, 0.7, 1.6); SCENE.saveMove(); SCENE.labels(); });
  $('jogBtn').addEventListener('click', () => { SCENE.autoJog = !SCENE.autoJog; SCENE.saveMove(); SCENE.labels(); });
  SCENE.labels(); SCENE.hint();
};
SCENE.labels = function () { $('qualBtn').textContent = 'Quality: ' + (R.q === 'high' ? 'High' : 'Low'); $('fxBtn').textContent = 'Effects: ' + (R.fx ? 'On' : 'Off');
  $('walkLbl').textContent = 'Walk ' + Math.round(SCENE.walkK * 100) + '%'; $('jogBtn').textContent = 'Long walks: ' + (SCENE.autoJog ? 'Jog' : 'Walk');
  $('helpTxt').textContent = 'Walk with the arrow keys or A and D (hold Shift to jog), or hold either side of the king: the farther out you hold, the faster he goes. Tap a diamond, or press E beside it, to look closer. Tap or press E to move a conversation on. Walking speed is in Settings.'; };
SCENE.hint = function () { const h = $('hint'); if (!h || SCENE.moved) return;
  h.textContent = SCENE.touch || matchMedia('(pointer: coarse)').matches ? 'Hold beside the king to walk, farther out to jog  ·  tap a diamond to look closer' : '←  →  to walk  ·  Shift to jog  ·  E to look closer  ·  Esc to pause'; };
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
  // the pace: the Settings speed, times the jog when he's asked to hurry. Scenes and cutscenes walk him at his own pace
  const free = !SCENE.lock && !SCENE.modal && !CUT.playing, far = SCENE.autoJog && P.target !== null && Math.abs(P.target - P.x) > 3.5;
  P.speedK = damp(P.speedK, free ? SCENE.walkK * Math.max(SCENE.jogKey ? SCENE.JOG : 1, P.dir ? SCENE.holdK : 1, far ? SCENE.JOG : 1) : 1, 3, dt);
  for (const a of SCENE.actors) if (a.visible) a.update(dt);
  const x0 = room.X0 + 1.0, x1 = room.X1 - 0.9; if (!P.sitting && (P.x < x0 || P.x > x1)) { P.x = clamp(P.x, x0, x1); P.v = 0; }
  if (room.onUpdate) room.onUpdate(dt);
  // camera on a rail
  if (!CUT.apply(dt)) {
    SCENE.camX = damp(SCENE.camX, SCENE.camGoal(), 2.2, dt);
    const cam = room.cam; R.cam.position.set(SCENE.camX, cam.y, room.KZ + cam.dist); R.cam.lookAt(SCENE.camX, cam.look, room.KZ);
    if (Math.abs(R.cam.fov - cam.fov * R.fovK) > 1e-3) { R.cam.fov = cam.fov * R.fovK; R.cam.updateProjectionMatrix(); }
    // focus: the walking line; pulled back to whoever is speaking if they stand beyond the sharp zone (a rack focus: the
    // royal stand calling down, a king at his pavilion's table). Eased, so the pull reads as a lens and not a cut
    let fg = cam.dist + (room.focusDz || 0); const sp = SCENE.bubble && SCENE.bubble.actor;
    if (sp && sp !== P && sp.z !== undefined && room.rack !== false) { const far0 = R.dofU.uFar0.value, sd = room.KZ + cam.dist - sp.z; if (sd - fg > far0 * 0.8) fg = sd - far0 * 0.8; }
    SCENE.focus = SCENE.focus === undefined || SCENE.focusSnap ? fg : damp(SCENE.focus, fg, 3.5, dt); SCENE.focusSnap = false;
    R.dofU.uFocus.value = SCENE.focus;
  }
  // markers, the bubble
  SCENE.near = null; let nd = 9;
  if (!SCENE.lock && !SCENE.modal) for (const m of SCENE.marks) { const it = m.it; if (it.hidden || !!it.seated !== !!P.sitting) continue;
    if (P.sitting) { SCENE.near = it; break; } const d = Math.abs(P.x - it.x); if (d < it.r && d < nd) { nd = d; SCENE.near = it; } }
  const quiet = SCENE.lock || SCENE.modal || CUT.playing || G.t < (SCENE.markDelay || 0);
  const shown = [];
  for (const m of SCENE.marks) { R.toView(m.it.p, m.pos); const show = !quiet && !m.it.hidden && !!m.it.seated === !!P.sitting && (P.sitting || Math.abs(P.x - m.it.x) < (m.it.far || 4.2)) && m.pos.x > 0 && m.pos.x < R.vw;
    m.on = show && !(SCENE.bubble && SCENE.near === m.it); if (m.on) shown.push(m); }
  // markers that land on top of each other on screen (two people side by side, a person before a picture) are pushed apart:
  // the higher one moves up until they're a marker and a half apart. Sorted by screen y, so each settles against the last
  const gap = Math.max(22, R.vw * 0.022); shown.sort((a, b) => b.pos.y - a.pos.y);
  for (let i = 0; i < shown.length; i++) for (let j = 0; j < i; j++) { const a = shown[i], b = shown[j];
    if (Math.abs(a.pos.x - b.pos.x) < gap && Math.abs(a.pos.y - b.pos.y) < gap) a.pos.y = b.pos.y - gap; }
  for (const m of SCENE.marks) { m.el.classList.toggle('show', !!m.on); m.el.classList.toggle('near', SCENE.near === m.it); m.el.style.left = m.pos.x + 'px'; m.el.style.top = m.pos.y + 'px'; }
  const B = SCENE.bubble;
  if (B) { B.t -= dt; if (B.t <= 0 || (!B.wait && Math.abs(B.actor.v) > 0.6)) SCENE.bubbleOff(); }
  if (SCENE.bubble) { const a = SCENE.bubble.actor, b = $('bubble'), bp = R.toView(a.speakAt ? a.speakAt(Actor._c) : Actor._c.set(a.x, a.y + (a.spec.headY || 2.12), a.z), {});
    const bw = b.offsetWidth || 240, bw2 = bw / 2 + 10, bl = clamp(bp.x, bw2, R.vw - bw2);
    const bt = Math.max(bp.y - 6, b.offsetHeight + 6); b.style.left = bl + 'px'; b.style.top = bt + 'px'; b.style.setProperty('--tail', clamp(bp.x - bl + bw / 2, 14, bw - 14) + 'px');
    // a marker the bubble covers is hidden while it's up (a diamond poking through a line of speech read as a typo)
    const L = bl - bw / 2 - 12, Rr = bl + bw / 2 + 12, T = bt - b.offsetHeight - 12, Bt = bt + 4;
    for (const m of SCENE.marks) if (m.on && m.pos.x > L && m.pos.x < Rr && m.pos.y > T && m.pos.y < Bt) m.el.classList.remove('show'); }
};
SCENE.render = function () { const room = SCENE.room; for (const a of SCENE.actors) a.render(room); R.frame(G.t); };
/* test hook: solids standing on a walking line, where someone would walk through them. The lines are the king's (room.KZ,
   the whole floor) and each wandering actor's (its z, over its wander range). A solid counts when it rises above 0.15 m,
   starts below 1.6 m, and its depth reaches within 0.15 m of the line. Run it in every room you build: it should return [] */
SCENE.walkCheck = function () {
  const room = SCENE.room, out = [], lines = [{ who: 'king', z: room.KZ, x0: room.X0 + 1, x1: room.X1 - 0.9 }];
  for (const a of SCENE.actors) { const w = a !== SCENE.player && a.visible && !a.sitting && a.curHome && a.curHome.wander; if (w) lines.push({ who: a.spec.id, z: a.z, x0: w.x0 - 0.4, x1: w.x1 + 0.4 }); }
  for (const [x0, x1, y0, y1, z0, z1, c] of room.solids || []) { if (y1 < 0.15 || y0 > 1.6) continue;
    for (const L of lines) { if (!(z1 > L.z - 0.15 && z0 < L.z + 0.15)) continue;
      let a = x0, b = x1; if (c) { const dz = Math.max(0, Math.abs(L.z - c[1]) - 0.15), w = dz < c[2] ? Math.sqrt(c[2] * c[2] - dz * dz) : 0; a = c[0] - w; b = c[0] + w; }   // a circle's chord along the line
      if (b > L.x0 && a < L.x1 && b > a) out.push({ who: L.who, line: +L.z.toFixed(2), solid: [x0, x1, y0, y1, z0, z1].map((v) => +v.toFixed(2)) }); } }
  return out;
};
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

