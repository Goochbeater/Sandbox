/* INPUT — keyboard, mouse (pointer lock optional, never required), gamepad → one action state per frame.
   Every action works without pointer lock: the camera also turns with the arrow keys / right stick / drag. */
const IN = {
  keys: {}, pressed: {}, released: {}, mb: [false, false, false], mbP: [false, false, false], mbR: [false, false, false],
  mdx: 0, mdy: 0, wheel: 0, locked: false, dragLook: false, lastDevice: 'kb',
  pad: null, padPrev: {}, padNow: {},
  A: { mx: 0, my: 0, lx: 0, ly: 0 },     // move + look
  buf: {},                                 // action -> time pressed (for buffering)
  sens: 1, invertY: false,
};
IN.ACT = {
  attack: { k: ['T_attack'], m: 0, p: 2 }, heavy: { k: ['T_heavy'], m: 2, p: 3 }, jump: { k: ['Space', 'T_jump'], p: 0 }, dodge: { k: ['ShiftLeft', 'ShiftRight', 'T_dodge'], p: 1 },
  block: { k: ['KeyQ', 'T_block'], p: 4 }, push: { k: ['KeyE', 'T_push'], p: 5 }, grip: { k: ['KeyF', 'T_grip'], p: 6 }, throw: { k: ['KeyR', 'T_throw'], p: 7 },
  lock: { k: ['Tab', 'KeyC', 'T_lock'], m: 1, p: 11 }, rage: { k: ['KeyX', 'KeyV', 'T_rage'], p: 10 }, pause: { k: ['Escape', 'KeyP', 'T_pause'], p: 9 },
  confirm: { k: ['Enter', 'NumpadEnter', 'T_confirm'], p: 0 }, back: { k: ['Backspace'], p: 1 },
  /* RATHATRI additions (touch buttons; keys are dev-only fallbacks) */
  interact: { k: ['KeyG', 'T_interact'] }, ship: { k: ['KeyH', 'T_ship'] }, scan: { k: ['KeyT', 'T_scan'] }, dominate: { k: ['KeyY', 'T_dominate'] },
  fire: { k: ['T_fire'] }, boost: { k: ['T_boost'] }, roll: { k: ['T_roll'] }, missile: { k: ['T_missile'] }, brake: { k: ['T_brake'] }, skip: { k: ['T_skip'] },
  assist1: { k: ['Digit1', 'T_assist1'] }, assist2: { k: ['Digit2', 'T_assist2'] },
};
IN.init = function () {
  const cv = MG.$('cv');
  const kd = (e) => {
    if (e.repeat) { if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); return; }
    IN.keys[e.code] = true; IN.pressed[e.code] = true; IN.lastDevice = 'kb';
    for (const a in IN.ACT) if (IN.ACT[a].k.includes(e.code)) IN.buf[a] = MG.rt;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (MG.onKey) MG.onKey(e.code);
  };
  const ku = (e) => { IN.keys[e.code] = false; IN.released[e.code] = true; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  window.addEventListener('blur', () => { IN.keys = {}; IN.mb = [false, false, false]; });
  const md = (e) => {
    const b = e.button; if (b > 2) return;
    IN.mb[b] = true; IN.mbP[b] = true; IN.lastDevice = 'kb';
    for (const a in IN.ACT) if (IN.ACT[a].m === b) IN.buf[a] = MG.rt;
    if (MG.onMouse) MG.onMouse(b);
  };
  const mu = (e) => { const b = e.button; if (b > 2) return; IN.mb[b] = false; IN.mbR[b] = true; };
  window.addEventListener('mousedown', md); window.addEventListener('mouseup', mu);
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => {
    const dx = e.movementX || 0, dy = e.movementY || 0;
    if (IN.locked) { IN.mdx += dx; IN.mdy += dy; }
    else if (MG.state === 'play' && (IN.mb[1] || e.altKey)) { IN.mdx += dx; IN.mdy += dy; }  // unlocked: middle-drag / alt looks
    IN.mouseX = e.clientX; IN.mouseY = e.clientY;
  });
  window.addEventListener('wheel', (e) => { IN.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { IN.locked = document.pointerLockElement === cv; });
  window.addEventListener('gamepadconnected', () => { IN.lastDevice = 'pad'; });
  if (typeof TOUCH !== 'undefined') TOUCH.init();
};
IN.down = (a) => { const d = IN.ACT[a]; if (!d) return false; for (const k of d.k) if (IN.keys[k]) return true; if (d.m !== undefined && IN.mb[d.m]) return true; if (d.p !== undefined && IN.padNow[d.p]) return true; return false; };
IN.hit = (a) => { const d = IN.ACT[a]; if (!d) return false; for (const k of d.k) if (IN.pressed[k]) return true; if (d.m !== undefined && IN.mbP[d.m]) return true; if (d.p !== undefined && IN.padNow[d.p] && !IN.padPrev[d.p]) return true; return false; };
IN.up = (a) => { const d = IN.ACT[a]; if (!d) return false; for (const k of d.k) if (IN.released[k]) return true; if (d.m !== undefined && IN.mbR[d.m]) return true; if (d.p !== undefined && !IN.padNow[d.p] && IN.padPrev[d.p]) return true; return false; };
/* buffered press: true if the action was pressed within `win` seconds and not yet consumed */
IN.take = (a, win = 0.28) => { const t = IN.buf[a]; if (t === undefined || MG.rt - t > win) return false; delete IN.buf[a]; return true; };
IN.peek = (a, win = 0.28) => { const t = IN.buf[a]; return t !== undefined && MG.rt - t <= win; };
IN.poll = function () {
  if (typeof TOUCH !== 'undefined') TOUCH.frame();
  // gamepad
  IN.padPrev = IN.padNow; IN.padNow = {};
  let gp = null;
  try { const gps = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of gps) if (g && g.connected) { gp = g; break; } } catch (e) { gp = null; }
  IN.pad = gp;
  let px = 0, py = 0, rx = 0, ry = 0;
  if (gp) {
    gp.buttons.forEach((b, i) => { IN.padNow[i] = b.pressed || b.value > 0.5; if (IN.padNow[i] && !IN.padPrev[i]) { IN.lastDevice = 'pad'; for (const a in IN.ACT) if (IN.ACT[a].p === i) IN.buf[a] = MG.rt; } });
    const dz = (v) => Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84;
    px = dz(gp.axes[0] || 0); py = dz(gp.axes[1] || 0); rx = dz(gp.axes[2] || 0); ry = dz(gp.axes[3] || 0);
    if (Math.abs(px) + Math.abs(py) + Math.abs(rx) + Math.abs(ry) > 0) IN.lastDevice = 'pad';
    // L3+R3 (10+11) = rage, handled by ACT.rage p:10 (L3) as well
  }
  let mx = 0, my = 0;
  if (IN.keys.KeyW) my -= 1; if (IN.keys.KeyS) my += 1; if (IN.keys.KeyA) mx -= 1; if (IN.keys.KeyD) mx += 1;
  mx += px; my += py;
  if (typeof TOUCH !== 'undefined' && TOUCH.on) { mx += TOUCH.jx; my += TOUCH.jy; }
  const L = Math.hypot(mx, my); if (L > 1) { mx /= L; my /= L; }
  IN.A.mx = mx; IN.A.my = my;
  let lx = IN.mdx * 0.0024 * IN.sens, ly = IN.mdy * 0.0024 * IN.sens;
  if (typeof TOUCH !== 'undefined' && TOUCH.on) { lx += TOUCH.lx * TOUCH.LOOK_K * TOUCH.cfg.sens; ly += TOUCH.ly * TOUCH.LOOK_K * TOUCH.cfg.sens; TOUCH.lx = 0; TOUCH.ly = 0; }
  const kr = 2.4 * MG.rdt;
  if (IN.keys.ArrowLeft) lx -= kr; if (IN.keys.ArrowRight) lx += kr; if (IN.keys.ArrowUp) ly -= kr * 0.6; if (IN.keys.ArrowDown) ly += kr * 0.6;
  lx += rx * 3.2 * MG.rdt; ly += ry * 2.2 * MG.rdt;
  if (IN.invertY) ly = -ly;
  IN.A.lx = lx; IN.A.ly = ly;
  IN.mdx = 0; IN.mdy = 0;
};
IN.endFrame = function () { IN.pressed = {}; IN.released = {}; IN.mbP = [false, false, false]; IN.mbR = [false, false, false]; IN.wheel = 0; };
/* synthetic helpers for tests / autopilot: real DOM events */
IN.fireKey = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
IN.fireMouse = (button, down) => window.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', { button, bubbles: true }));
/* touch-only labels: the on-screen button names, as small chips */
IN.keyLabel = (a) => {
  const T = { attack: 'STRIKE', heavy: 'HEAVY', jump: 'JUMP', dodge: 'DASH', block: 'GUARD', push: 'PUSH', grip: 'CHOKE', throw: 'THROW', lock: 'LOCK', rage: 'RAGE', pause: 'II',
    interact: 'USE', ship: 'SHIP', scan: 'SCAN', dominate: 'DOMINATE', fire: 'FIRE', boost: 'BOOST', roll: 'ROLL', missile: 'MISSILE' };
  return '<kbd class="tb">' + (T[a] || a.toUpperCase()) + '</kbd>';
};
