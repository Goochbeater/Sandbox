/* TOUCH — the ONLY intended control scheme: floating left joystick, right-side camera drag, hit-tested action buttons.
   It feeds the engine's own action layer (p01_input): buttons raise IN.keys['T_<action>'] + IN.pressed + IN.buf, the stick writes TOUCH.jx/jy
   (merged into IN.A.mx/my in IN.poll) and the camera drag writes TOUCH.lx/ly (merged into IN.A.lx/ly). Nothing downstream knows it is touch.
   Modes: 'ground' (on-foot combat), 'space' (twin-stick flight), 'none' (menus / cutscenes: only SKIP when TOUCH.skipOK).
   Layout is in units of u (≈ thumb button) so it scales across phones; TOUCH.cfg is user-tunable + persisted (localStorage 'rathatri-settings'). */
const TOUCH = {
  on: true, mode: 'none', jx: 0, jy: 0, lx: 0, ly: 0, LOOK_K: 4.2, skipOK: false, portrait: false,
  cfg: { size: 1, opacity: 0.9, lefty: false, sens: 1, invertY: false, haptics: true, quality: 'auto', autoBlock: false },
  u: 56, W: 0, H: 0, safe: { l: 0, r: 0, t: 0, b: 0 },
  joy: { id: null, ox: 0, oy: 0, x: 0, y: 0, R: 60, on: false }, look: { id: null, x: 0, y: 0, t: 0, moved: 0, lastTap: 0 },
  btns: [], byName: {}, ptr: new Map(), ctx: null, cd: {},
};
/* Button table. at: polar offset from the PRIMARY button (r in u, deg CCW from +x) or abs {r:u from right edge, b:u from bottom}. size in u. hold: stays down while touched. */
TOUCH.MODES = {
  ground: [
    { n: 'attack', a: 'attack', ic: 'slash', lb: '', size: 1.55, abs: { r: 1.85, b: 1.85 }, hold: true, main: true },
    { n: 'heavy', a: 'heavy', ic: 'heavy', lb: '', size: 1.0, rel: [1.58, 100], hold: true },
    { n: 'block', a: 'block', ic: 'shield', lb: '', size: 1.0, rel: [1.58, 52], hold: true },
    { n: 'jump', a: 'jump', ic: 'jump', lb: '', size: 1.0, rel: [1.58, 148], hold: false },
    { n: 'dodge', a: 'dodge', ic: 'dash', lb: '', size: 1.0, rel: [1.58, 196], hold: false },
    { n: 'push', a: 'push', ic: 'push', lb: '', size: 0.84, rel: [2.8, 68], hold: false },
    { n: 'grip', a: 'grip', ic: 'claw', lb: '', size: 0.84, rel: [2.8, 104], hold: true },
    { n: 'throw', a: 'throw', ic: 'throw', lb: '', size: 0.84, rel: [2.8, 140], hold: false },
    { n: 'rage', a: 'rage', ic: 'flame', lb: 'RAGE', size: 1.1, abs: { r: 4.5, b: 1.55 }, hold: false, show: () => (typeof PLAYER !== 'undefined' && PLAYER.rage >= 100 && !PLAYER.rageOn && PLAYER.skills && PLAYER.skills.rage), pulse: true },
    { n: 'ctx', a: 'interact', ic: 'hand', lb: 'USE', size: 1.2, abs: { r: 4.5, b: 3.45 }, hold: false, show: () => !!TOUCH.ctx, ctxBtn: true, pulse: true },
    { n: 'ship', a: 'ship', ic: 'ship', lb: 'SHIP', size: 0.9, abs: { r: 6.4, b: 1.55 }, hold: false, show: () => (typeof SHIP !== 'undefined' && SHIP.on && SHIP.avail && SHIP.avail()), cdKey: 'ship' },
    { n: 'scan', a: 'scan', ic: 'scan', lb: 'SCAN', size: 0.9, abs: { r: 6.4, b: 3.25 }, hold: false, show: () => (typeof SCAN !== 'undefined' && SCAN.on), cdKey: 'scan' },
    { n: 'lock', a: 'lock', ic: 'lock', lb: '', size: 0.7, abs: { r: 1.7, t: 0.55 }, hold: false },
    { n: 'pause', a: 'pause', ic: 'pause', lb: '', size: 0.7, abs: { r: 0.6, t: 0.55 }, hold: false, always: true },
  ],
  space: [
    { n: 'fire', a: 'fire', ic: 'fire', lb: '', size: 1.6, abs: { r: 1.85, b: 1.85 }, hold: true, main: true },
    { n: 'boost', a: 'boost', ic: 'boost', lb: 'BOOST', size: 1.0, rel: [1.62, 100], hold: true },
    { n: 'roll', a: 'roll', ic: 'roll', lb: '', size: 1.0, rel: [1.62, 150], hold: false },
    { n: 'missile', a: 'missile', ic: 'missile', lb: '', size: 0.95, rel: [1.62, 52], hold: false, cdKey: 'missile' },
    { n: 'brake', a: 'brake', ic: 'brake', lb: 'BRAKE', size: 0.85, rel: [1.62, 198], hold: true },
    { n: 'dominate', a: 'dominate', ic: 'eye', lb: 'DOMINATE', size: 1.2, abs: { r: 4.9, b: 2.6 }, hold: true, show: () => (typeof SPACE !== 'undefined' && SPACE.domReady && SPACE.domReady()), pulse: true },
    { n: 'lock', a: 'lock', ic: 'lock', lb: '', size: 0.7, abs: { r: 1.7, t: 0.55 }, hold: false },
    { n: 'pause', a: 'pause', ic: 'pause', lb: '', size: 0.7, abs: { r: 0.6, t: 0.55 }, hold: false, always: true },
  ],
};
/* SVG glyphs (24×24, stroke currentColor) */
TOUCH.IC = {
  slash: '<path d="M5 19L19 5M14 5h5v5M5 14l5 5"/>', heavy: '<path d="M4 20L20 4M4 4l16 16M12 2v4M12 18v4"/>', shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
  jump: '<path d="M6 15l6-6 6 6M6 20l6-6 6 6"/>', dash: '<path d="M4 6l7 6-7 6M12 6l7 6-7 6"/>', push: '<path d="M4 12h6M13 5c4 2 6 5 6 7s-2 5-6 7M10 8c2 1 3 2.5 3 4s-1 3-3 4"/>',
  claw: '<path d="M7 20c-2-4-2-8 0-12M12 21c-1-5-1-10 0-16M17 20c2-4 2-8 0-12"/>', throw: '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3"/>',
  flame: '<path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/>', hand: '<path d="M8 12V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6.5a1.5 1.5 0 013 0V15c0 4-2 6-6 6s-5-2-6-5l-1-3a1.5 1.5 0 012.5-1z"/>',
  ship: '<path d="M12 2l4 10 5 3-2 3-4-1-3 5-3-5-4 1-2-3 5-3z"/>', scan: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10"/>',
  lock: '<circle cx="12" cy="12" r="6"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  fire: '<circle cx="12" cy="12" r="4"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/>', boost: '<path d="M7 14l5-9 5 9M7 20l5-9 5 9"/>', roll: '<path d="M20 12a8 8 0 11-3-6.2M20 4v5h-5"/>',
  missile: '<path d="M5 19L19 5M14 5h5v5M7 14l-3 1 1-3M10 17l-1 3 3-1"/>', brake: '<path d="M4 6h16M4 12h16M4 18h16"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  skip: '<path d="M4 5l8 7-8 7zM13 5l8 7-8 7z"/>',
};
TOUCH.CSS = `
#touch{position:fixed;inset:0;z-index:30;pointer-events:none;opacity:0;transition:opacity .3s;--u:56px;touch-action:none}
#touch.on{opacity:1}
#touch .tb{position:absolute;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffe9e2;
  background:radial-gradient(circle at 34% 28%,rgba(255,96,72,.30),rgba(22,5,4,.74) 70%);border:2px solid rgba(255,96,72,.50);
  box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 14px rgba(255,40,20,.18),inset 0 0 12px rgba(0,0,0,.55);backdrop-filter:blur(2px);
  transform:translate(-50%,-50%);transition:transform .06s,background .08s,border-color .08s,opacity .15s;will-change:transform;overflow:hidden}
#touch .tb svg{width:50%;height:50%;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 3px rgba(255,60,40,.55))}
#touch .tb b{font:700 calc(var(--u)*.2)/1 var(--f,sans-serif);letter-spacing:.12em;margin-top:2px;opacity:.9}
#touch .tb.small svg{width:56%;height:56%}
#touch .tb.dn{transform:translate(-50%,-50%) scale(.91);background:radial-gradient(circle at 40% 35%,rgba(255,150,120,.60),rgba(80,12,8,.82) 72%);border-color:#ff8f78;box-shadow:0 0 22px rgba(255,60,30,.6),inset 0 0 12px rgba(0,0,0,.4)}
#touch .tb.pulse{animation:tbpulse .9s ease-in-out infinite alternate}
@keyframes tbpulse{from{box-shadow:0 0 6px rgba(255,150,40,.4),inset 0 0 12px rgba(0,0,0,.55)}to{box-shadow:0 0 24px rgba(255,170,60,.95),inset 0 0 12px rgba(0,0,0,.55)}}
#touch .tb.cdw::after{content:'';position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(0,0,0,.66) calc(var(--cd,0)*360deg),transparent 0)}
#touch .tb.hide{display:none}
#touch .tb.main{border-color:rgba(255,120,90,.7);background:radial-gradient(circle at 34% 28%,rgba(255,110,80,.42),rgba(40,6,4,.8) 70%)}
#tjoyBase{position:absolute;border-radius:50%;border:2px solid rgba(255,96,72,.40);background:radial-gradient(circle,rgba(255,60,40,.05),rgba(20,4,3,.38));transform:translate(-50%,-50%);opacity:0;transition:opacity .12s}
#tjoyBase.on{opacity:1}
#tjoyKnob{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 30%,rgba(255,150,120,.72),rgba(120,16,10,.78));border:2px solid rgba(255,170,150,.7);box-shadow:0 0 16px rgba(255,50,30,.5)}
#tjoyHint{position:absolute;border-radius:50%;border:2px dashed rgba(255,96,72,.22);transform:translate(-50%,-50%);transition:opacity .3s}
#tskip{position:fixed;right:calc(14px + env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));z-index:31;display:none;pointer-events:auto;padding:10px 16px;border-radius:22px;
  font:700 12px/1 var(--f,sans-serif);letter-spacing:.3em;color:#ffe2da;background:rgba(10,2,2,.55);border:1px solid rgba(255,96,72,.5)}
#tskip.on{display:block}
#trot{position:fixed;inset:0;z-index:95;background:#050202;color:#e9dccb;display:none;flex-direction:column;align-items:center;justify-content:center;font:700 16px var(--f,sans-serif);letter-spacing:.3em;text-align:center}
#trot.on{display:flex}
#trot svg{width:90px;height:90px;stroke:#ff5a40;fill:none;stroke-width:1.5;margin-bottom:22px;animation:trot 2.2s ease-in-out infinite}
@keyframes trot{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
`;
TOUCH.init = function () {
  if (TOUCH.el) return;
  try { Object.assign(TOUCH.cfg, JSON.parse(localStorage.getItem('rathatri-settings') || '{}').touch || {}); } catch (e) { /* storage unavailable */ }
  const st = document.createElement('style'); st.textContent = TOUCH.CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'touch'; document.body.appendChild(root); TOUCH.el = root;
  root.innerHTML = '<div id="tjoyHint"></div><div id="tjoyBase"><div id="tjoyKnob"></div></div>';
  TOUCH.base = root.querySelector('#tjoyBase'); TOUCH.knob = root.querySelector('#tjoyKnob'); TOUCH.hint = root.querySelector('#tjoyHint');
  const sk = document.createElement('div'); sk.id = 'tskip'; sk.textContent = 'SKIP'; document.body.appendChild(sk); TOUCH.skipEl = sk;
  sk.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); TOUCH.skipDown(); });
  const rot = document.createElement('div'); rot.id = 'trot'; rot.innerHTML = '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/></svg>ROTATE YOUR DEVICE<small style="font-weight:500;letter-spacing:.2em;opacity:.6;margin-top:10px">LANDSCAPE</small>'; document.body.appendChild(rot); TOUCH.rotEl = rot;
  // global (not per-element) pointer routing: a thumb can roll across buttons and never gets "stuck"
  const L = window;
  L.addEventListener('pointerdown', TOUCH.onDown, { passive: false }); L.addEventListener('pointermove', TOUCH.onMove, { passive: false });
  L.addEventListener('pointerup', TOUCH.onUp, { passive: false }); L.addEventListener('pointercancel', TOUCH.onUp, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault()); document.addEventListener('dblclick', (e) => e.preventDefault());
  L.addEventListener('resize', TOUCH.layout); L.addEventListener('orientationchange', () => setTimeout(TOUCH.layout, 120));
  L.addEventListener('blur', TOUCH.releaseAll); document.addEventListener('visibilitychange', () => { if (document.hidden) { TOUCH.releaseAll(); if (MG.state === 'play') MG.pauseReq = true; } });
  TOUCH.setMode('none'); TOUCH.layout();
};
TOUCH.save = function () { try { const s = JSON.parse(localStorage.getItem('rathatri-settings') || '{}'); s.touch = TOUCH.cfg; localStorage.setItem('rathatri-settings', JSON.stringify(s)); } catch (e) { /* ignore */ } };
TOUCH.setCfg = function (k, v) { TOUCH.cfg[k] = v; TOUCH.save(); if (k === 'size' || k === 'lefty') TOUCH.layout(); if (k === 'opacity' && TOUCH.el) TOUCH.el.style.opacity = ''; if (k === 'invertY') IN.invertY = !!v; };
TOUCH.setMode = function (m) {
  if (TOUCH.mode === m && TOUCH.btns.length) return;
  TOUCH.releaseAll(); TOUCH.mode = m;
  for (const b of TOUCH.btns) b.el.remove(); TOUCH.btns = []; TOUCH.byName = {};
  for (const d of (TOUCH.MODES[m] || [])) {
    const el = document.createElement('div'); el.className = 'tb' + (d.main ? ' main' : '') + (d.size < 0.9 ? ' small' : '') + (d.pulse ? ' pulse' : '') + (d.cdKey ? ' cdw' : '');
    el.innerHTML = '<svg viewBox="0 0 24 24">' + (TOUCH.IC[d.ic] || '') + '</svg>' + (d.lb ? '<b>' + d.lb + '</b>' : '');
    TOUCH.el.appendChild(el);
    const b = { d, el, id: null, x: 0, y: 0, r: 0, vis: true }; TOUCH.btns.push(b); TOUCH.byName[d.n] = b;
  }
  TOUCH.layout();
};
/* geometry — everything in u (thumb button) so it scales with the phone */
TOUCH.layout = function () {
  const W = window.innerWidth, H = window.innerHeight; TOUCH.W = W; TOUCH.H = H;
  TOUCH.portrait = H > W * 1.05;
  if (TOUCH.rotEl) TOUCH.rotEl.classList.toggle('on', TOUCH.portrait);
  if (!TOUCH.probe) { const p = document.createElement('div'); p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(p); TOUCH.probe = p; }
  const cs = getComputedStyle(TOUCH.probe), sv = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
  TOUCH.safe = { l: sv('padding-left'), r: sv('padding-right'), t: sv('padding-top'), b: sv('padding-bottom') };
  const u = TOUCH.u = Math.round(clamp(Math.min(H * 0.152, W * 0.074), 40, 78) * TOUCH.cfg.size);
  if (TOUCH.el) TOUCH.el.style.setProperty('--u', u + 'px');
  const lefty = TOUCH.cfg.lefty, sx = lefty ? -1 : 1;
  const edgeR = (r) => lefty ? TOUCH.safe.l + r * u : W - TOUCH.safe.r - r * u;     // x of a point r·u from the "action" edge
  const main = (TOUCH.MODES[TOUCH.mode] || []).find((d) => d.main);
  const cx = main ? edgeR(main.abs.r) : 0, cy = main ? H - TOUCH.safe.b - main.abs.b * u : 0;
  for (const b of TOUCH.btns) {
    const d = b.d, s = d.size * u; let x, y;
    if (d.rel) { const a = d.rel[1] * Math.PI / 180; x = cx + sx * Math.cos(a) * d.rel[0] * u; y = cy - Math.sin(a) * d.rel[0] * u; }   // polar around the primary button
    else { x = edgeR(d.abs.r); y = d.abs.t !== undefined ? TOUCH.safe.t + d.abs.t * u + s / 2 : H - TOUCH.safe.b - d.abs.b * u; }
    b.x = x; b.y = y; b.r = s / 2;
    b.el.style.width = b.el.style.height = s + 'px'; b.el.style.left = x + 'px'; b.el.style.top = y + 'px';
  }
  const R = TOUCH.joy.R = u * 1.05;
  const hx = (lefty ? W - TOUCH.safe.r - R - u * 0.7 : TOUCH.safe.l + R + u * 0.7), hy = H - TOUCH.safe.b - R - u * 0.35;
  TOUCH.joy.hx = hx; TOUCH.joy.hy = hy;
  if (TOUCH.hint) { Object.assign(TOUCH.hint.style, { width: R * 2 + 'px', height: R * 2 + 'px', left: hx + 'px', top: hy + 'px' }); }
  if (TOUCH.base) { Object.assign(TOUCH.base.style, { width: R * 2 + 'px', height: R * 2 + 'px' }); TOUCH.knob.style.width = TOUCH.knob.style.height = R * 0.95 + 'px'; }
};
/* ---- pointer routing */
TOUCH.want = 'ground';   // which control set the current scene wants ('ground' | 'space'); the flow sets it, e.g. SPACE.start -> 'space'
TOUCH.activeMode = () => (MG.state === 'play' && !TOUCH.portrait && TOUCH.want !== 'none' && !TOUCH.cineNow()) ? TOUCH.want : 'none';
TOUCH.cineNow = () => (typeof PLAYER !== 'undefined' && PLAYER.state === 'cine') || (typeof CAM !== 'undefined' && !!CAM.cine) || (typeof CINE !== 'undefined' && !!CINE.cur);
TOUCH.hit = function (x, y) {   // nearest visible button whose (slightly inflated) disc contains the point
  let best = null, bd = 1e9;
  for (const b of TOUCH.btns) { if (!b.vis) continue; const d = Math.hypot(x - b.x, y - b.y); if (d <= b.r * 1.18 && d < bd) { bd = d; best = b; } }
  return best;
};
TOUCH.press = function (b, id) {
  b.id = id; b.el.classList.add('dn'); const a = b.d.a, k = 'T_' + a;
  IN.lastDevice = 'touch'; IN.keys[k] = true; IN.pressed[k] = true; IN.buf[a] = MG.rt;
  if (b.d.n === 'ctx' && TOUCH.ctx && TOUCH.ctx.kind === 'exec') { IN.keys.T_grip = true; IN.pressed.T_grip = true; IN.buf.grip = MG.rt; b.gripToo = true; }
  TOUCH.buzz(8);
};
TOUCH.release = function (b) {
  if (b.id === null) return; const a = b.d.a, k = 'T_' + a; b.id = null; b.el.classList.remove('dn');
  IN.keys[k] = false; IN.released[k] = true; if (b.gripToo) { IN.keys.T_grip = false; IN.released.T_grip = true; b.gripToo = false; }
};
TOUCH.releaseAll = function () {
  for (const b of TOUCH.btns) TOUCH.release(b);
  TOUCH.joy.id = null; TOUCH.joy.on = false; TOUCH.jx = TOUCH.jy = 0; if (TOUCH.base) TOUCH.base.classList.remove('on'); TOUCH.look.id = null; TOUCH.ptr.clear();
};
TOUCH.onDown = function (e) {
  if (e.target && e.target.closest && e.target.closest('.menu,#intro,#boot,.tm,#cineChoice,#err,#codex,#yard,#galaxy,input,button,a')) return;   // DOM UI handles its own taps
  const first = !TOUCH._fs; if (first) TOUCH.goFull();
  if (TOUCH.skipEl && TOUCH.skipEl.classList.contains('on') && e.target === TOUCH.skipEl) return;
  const am = TOUCH.activeMode(); if (am === 'none' || am !== TOUCH.mode) return;
  e.preventDefault(); const x = e.clientX, y = e.clientY, id = e.pointerId;
  const b = TOUCH.hit(x, y);
  if (b) { TOUCH.ptr.set(id, { b }); TOUCH.press(b, id); return; }
  const lefty = TOUCH.cfg.lefty, split = lefty ? TOUCH.W * 0.58 : TOUCH.W * 0.42, inJoy = lefty ? x > split : x < split;
  if (inJoy && TOUCH.joy.id === null && y > TOUCH.H * 0.18) {
    const J = TOUCH.joy, R = J.R; J.id = id; J.on = true;
    J.ox = clamp(x, R + 6, TOUCH.W - R - 6); J.oy = clamp(y, R + 6, TOUCH.H - R - 6); J.x = x; J.y = y;
    Object.assign(TOUCH.base.style, { left: J.ox + 'px', top: J.oy + 'px' }); TOUCH.base.classList.add('on'); TOUCH.knob.style.transform = 'translate(-50%,-50%)';
    TOUCH.ptr.set(id, { joy: true }); return;
  }
  if (TOUCH.look.id === null) { const Lk = TOUCH.look; Lk.id = id; Lk.x = x; Lk.y = y; Lk.t = performance.now(); Lk.moved = 0; TOUCH.ptr.set(id, { look: true }); }
};
TOUCH.onMove = function (e) {
  const p = TOUCH.ptr.get(e.pointerId); if (!p) return; e.preventDefault();
  const x = e.clientX, y = e.clientY;
  if (p.joy) {
    const J = TOUCH.joy; let dx = x - J.ox, dy = y - J.oy; const d = Math.hypot(dx, dy), R = J.R;
    if (d > R) { dx *= R / d; dy *= R / d; }
    TOUCH.knob.style.transform = 'translate(calc(-50% + ' + dx.toFixed(1) + 'px),calc(-50% + ' + dy.toFixed(1) + 'px))';
    let nx = dx / R, ny = dy / R; const m = Math.hypot(nx, ny), dz = 0.14;
    if (m < dz) { nx = ny = 0; } else { const k = (m - dz) / (1 - dz) / m; nx *= k; ny *= k; }
    TOUCH.jx = nx; TOUCH.jy = ny;
  } else if (p.look) {
    const Lk = TOUCH.look; const dx = x - Lk.x, dy = y - Lk.y; Lk.x = x; Lk.y = y; Lk.moved += Math.abs(dx) + Math.abs(dy);
    TOUCH.lx += dx; TOUCH.ly += dy * (TOUCH.cfg.invertY ? -1 : 1);
  }
};
TOUCH.onUp = function (e) {
  const p = TOUCH.ptr.get(e.pointerId); if (!p) return; TOUCH.ptr.delete(e.pointerId);
  if (p.b) TOUCH.release(p.b);
  else if (p.joy) { const J = TOUCH.joy; J.id = null; J.on = false; TOUCH.jx = TOUCH.jy = 0; TOUCH.base.classList.remove('on'); }
  else if (p.look) {
    const Lk = TOUCH.look; Lk.id = null; const now = performance.now();
    if (Lk.moved < 14 && now - Lk.t < 260) {   // a tap in the look zone; a double-tap toggles lock-on
      if (now - Lk.lastTap < 340) { IN.buf.lock = MG.rt; IN.pressed.T_lock = true; Lk.lastTap = 0; TOUCH.buzz(10); } else Lk.lastTap = now;
    }
  }
};
TOUCH.goFull = function () {
  TOUCH._fs = true;
  try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) { const p = el.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* iOS: no element fullscreen */ }
  try { if (screen.orientation && screen.orientation.lock) { const p = screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* not supported */ }
};
TOUCH.buzz = function (ms) { if (TOUCH.cfg.haptics && !MG.headless && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } };
/* SKIP for cutscenes: speed the cinematic until it ends (CINE.skip when the sequencer is up) */
TOUCH.skipDown = function () {
  if (typeof CINE !== 'undefined' && CINE.cur && CINE.skip) { CINE.skip(); return; }
  IN.keys.T_confirm = true; IN.pressed.T_confirm = true; setTimeout(() => { IN.keys.T_confirm = false; }, 2500);
};
/* per-frame: visibility, cooldown rings, context prompt (called from IN.poll via TOUCH.frame) */
TOUCH.frame = function () {
  if (!TOUCH.el) return;
  const am = TOUCH.activeMode(), vis = am !== 'none';
  if (am !== 'none' && am !== TOUCH.mode) { TOUCH.setMode(am); }
  TOUCH.el.classList.toggle('on', vis);
  if (TOUCH.skipEl) TOUCH.skipEl.classList.toggle('on', !vis && MG.state === 'play' && TOUCH.cineNow() && TOUCH.skipOK !== false && !TOUCH.portrait);
  if (TOUCH.hint) TOUCH.hint.style.opacity = (vis && !TOUCH.joy.on) ? 0.7 : 0;
  if (!vis) { if (TOUCH.ptr.size) TOUCH.releaseAll(); return; }
  // context (interact / execute) detection
  let ctx = null;
  if (TOUCH.mode === 'ground') {
    if (typeof PLAYER !== 'undefined' && PLAYER.a && (PLAYER.state === 'move' || PLAYER.state === 'attack') && PLAYER.execTarget && PLAYER.execTarget()) ctx = { kind: 'exec', text: 'EXECUTE' };
    else if (typeof LEVEL !== 'undefined' && LEVEL.cur && LEVEL.cur.prompt) ctx = { kind: 'use', text: String(LEVEL.cur.prompt.text || 'USE').replace(/<[^>]*>/g, '').trim().slice(0, 12).toUpperCase() };
  }
  TOUCH.ctx = ctx;
  for (const b of TOUCH.btns) {
    const d = b.d; const show = d.always || !d.show || d.show(); if (show !== b.vis) { b.vis = show; b.el.classList.toggle('hide', !show); if (!show) TOUCH.release(b); }
    if (d.ctxBtn && ctx) { const lb = b.el.querySelector('b'); if (lb && lb.textContent !== ctx.text) lb.textContent = ctx.text; }
    if (d.cdKey) { const f = TOUCH.cd[d.cdKey]; const v = f ? f() : 0; if (b._cd !== v) { b._cd = v; b.el.style.setProperty('--cd', v.toFixed(3)); } }
  }
  if (TOUCH.cfg.autoBlock && PLAYER && PLAYER.state === 'move' && !IN.keys.T_attack) { /* reserved: guard when idle near a foe */ }
};
/* cooldown providers: parts register e.g. TOUCH.cd.ship = () => SHIP.cd / SHIP.CD  (0 = ready, 1 = full cooldown) */
