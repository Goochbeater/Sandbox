/* SPOREHEART — core.js : namespace, config, bus, util, input, quality
   Load first. Nothing here touches THREE objects (G.THREE is set at boot). */
(function () {
  "use strict";
  const G = (window.G = window.G || {});

  /* ---------------- CONFIG ---------------- */
  G.CONF = {
    VERSION: "1.0.0",
    PAL: {
      inkNavy: 0x232b3a, cloakBlack: 0x171a22, orange: 0xff7a33, red: 0xe8433a,
      pinkGlow: 0xff9ec4, pinkCore: 0xfff0f6, cream: 0xf2e9d8, bone: 0xeae3d0,
      mint: 0xbfe3d2, olive: 0x93a344, skyTeal: 0x5fb5a0, deepMoss: 0x1d3a30,
      capRed: 0xd64533, spotCream: 0xf5ead2, woodDark: 0x4a3626, wood: 0x6b4e33,
      amber: 0xffb347, cyan: 0x59d8e8, boneWhite: 0xf4efe2, slate: 0x5b6f95,
      purple: 0x8a5fb0, gold: 0xffd166, dark: 0x0d1210
    },
    pixelRatioMax: 1.5,
    fov: 55,
    cameraNear: 0.1,
    cameraFar: 220,
    shadowMap: 2048,
    quality: "hi", // 'hi' | 'lo' (toggled from title screen)
    debug: false
  };

  /* ---------------- EVENT BUS ---------------- */
  const listeners = new Map();
  G.bus = {
    on(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt).add(fn);
      return () => G.bus.off(evt, fn);
    },
    off(evt, fn) { const s = listeners.get(evt); if (s) s.delete(fn); },
    emit(evt, data) {
      const s = listeners.get(evt);
      if (!s) return;
      for (const fn of [...s]) {
        try { fn(data); } catch (e) { console.error("[bus:" + evt + "]", e); }
      }
    },
    once(evt, fn) {
      const off = G.bus.on(evt, (d) => { off(); fn(d); });
      return off;
    }
  };

  /* ---------------- UTIL ---------------- */
  const TAU = Math.PI * 2;
  G.util = {
    TAU,
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    // framerate-independent smoothing
    damp(cur, target, lambda, dt) { return G.util.lerp(cur, target, 1 - Math.exp(-lambda * dt)); },
    rand(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); },
    randi(a, b) { return Math.floor(G.util.rand(a, b + 1)); },
    pick(arr) { return arr[(Math.random() * arr.length) | 0]; },
    sign(v) { return v < 0 ? -1 : 1; },
    angleLerp(a, b, t) {
      let d = (b - a) % TAU;
      if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
      return a + d * t;
    },
    ease(t, name) {
      t = G.util.clamp01(t);
      switch (name) {
        case "inQuad": return t * t;
        case "outQuad": return t * (2 - t);
        case "inOutQuad": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        case "outCubic": return 1 - Math.pow(1 - t, 3);
        case "inCubic": return t * t * t;
        case "outBack": { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
        case "outElastic": return t === 0 ? 0 : t === 1 ? 1 :
          Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;
        case "outExpo": return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        default: return t; // 'linear'
      }
    },
    dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; },
    // temp vectors (populated after boot with real THREE.Vector3)
    tmp: {},
    initTmp() {
      const V = G.THREE.Vector3;
      G.util.tmp = { v1: new V(), v2: new V(), v3: new V(), v4: new V(), v5: new V(), v6: new V() };
    },
    fmtTime(sec) {
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return m + ":" + String(s).padStart(2, "0");
    }
  };

  /* ---------------- OBJECT POOL ---------------- */
  G.pool = class Pool {
    constructor(factory, reset, prealloc = 8) {
      this.factory = factory; this.reset = reset; this.free = []; this.used = new Set();
      for (let i = 0; i < prealloc; i++) this.free.push(factory());
    }
    get() {
      const o = this.free.pop() || this.factory();
      this.used.add(o);
      return o;
    }
    put(o) {
      if (!this.used.has(o)) return;
      this.used.delete(o);
      if (this.reset) this.reset(o);
      this.free.push(o);
    }
    putAll() { for (const o of [...this.used]) this.put(o); }
  };

  /* ---------------- INPUT (touch only) ----------------
     Everything is driven by two sources:
       * the floating stick + camera-drag pad (pointer events on one full-screen element)
       * on-screen action buttons (ui.js calls G.input.press / release)
     There is deliberately NO keyboard or mouse handling anywhere in the game.
     Edge semantics: pressed()/released() are true for exactly one *simulation* step —
     the flag is cleared by postUpdate(), which game.js only calls after the sim ran,
     so an input that lands during a hit-stop / pause frame is never dropped. */
  const ACTIONS = ["attack", "jump", "dash", "magic", "hook", "lock", "allyA", "allyB", "pause"];
  const st = Object.create(null);
  for (const a of ACTIONS) st[a] = { down: false, pressed: false, released: false, t: 0, buf: 0 };
  const stick = { active: false, id: -1, ox: 0, oy: 0, px: 0, py: 0, x: 0, y: 0, mag: 0, radius: 80 };
  const look = { dx: 0, dy: 0 };
  const cam = { id: -1, lx: 0, ly: 0 };
  let inputEnabled = true;
  const touchInfo = { count: 0 };

  G.input = {
    ACTIONS,
    stick,
    look,
    get move() { return inputEnabled ? stick : ZERO_STICK; },
    down(a) { return inputEnabled && st[a].down; },
    pressed(a) { return inputEnabled && st[a].pressed; },
    released(a) { return inputEnabled && st[a].released; },
    heldFor(a) { return inputEnabled && st[a].down ? st[a].t : 0; },
    press(a) {
      const s = st[a]; if (!s || s.down) return;
      s.down = true; s.pressed = true; s.t = 0;
    },
    release(a) {
      const s = st[a]; if (!s || !s.down) return;
      s.down = false; s.released = true;
    },
    /* tick: advance hold timers (called once per sim step) */
    tick(dt) { for (const a of ACTIONS) { const s = st[a]; if (s.down) s.t += dt; } },
    consumeLook(out) {
      out.dx = inputEnabled ? look.dx : 0; out.dy = inputEnabled ? look.dy : 0;
      look.dx = look.dy = 0; return out;
    },
    postUpdate() {
      for (const a of ACTIONS) { st[a].pressed = false; st[a].released = false; }
    },
    setEnabled(v) {
      inputEnabled = !!v;
      if (!v) {
        for (const a of ACTIONS) { st[a].down = false; st[a].pressed = false; st[a].released = false; }
        stick.active = false; stick.x = stick.y = stick.mag = 0; stick.id = -1; cam.id = -1; look.dx = look.dy = 0;
      }
    },
    get enabled() { return inputEnabled; },
    haptic(ms) { try { if (navigator.vibrate && G.settings.haptics) navigator.vibrate(ms); } catch (e) { /* ignore */ } },
    /* test / bot hook: set the analogue stick directly (x right, y forward) */
    setStick(x, y) {
      stick.x = x; stick.y = y; stick.mag = Math.min(1, Math.hypot(x, y));
      stick.active = stick.mag > 0.01;
    }
  };
  const ZERO_STICK = { active: false, x: 0, y: 0, mag: 0 };

  G.settings = { haptics: true, lookSens: 1.0, invertY: false, quality: "auto" };
  try {
    const raw = localStorage.getItem("sporeheart.settings");
    if (raw) Object.assign(G.settings, JSON.parse(raw));
  } catch (e) { /* storage may be blocked */ }
  G.saveSettings = function () {
    try { localStorage.setItem("sporeheart.settings", JSON.stringify(G.settings)); } catch (e) { /* ignore */ }
  };

  G.core = {
    /* pad = full-screen element that receives raw pointers for stick + camera drag.
       Buttons live above it and swallow their own pointers. */
    attachPad(pad) {
      pad.style.touchAction = "none";
      const area = () => ({ w: window.innerWidth, h: window.innerHeight });
      pad.addEventListener("pointerdown", (e) => {
        if (!inputEnabled) return;
        const { w, h } = area();
        try { pad.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const leftSide = e.clientX < w * 0.46;
        if (leftSide && !stick.active) {
          stick.active = true; stick.id = e.pointerId;
          stick.ox = stick.px = e.clientX; stick.oy = stick.py = e.clientY;
          stick.radius = Math.max(52, Math.min(w, h) * 0.13);
          stick.x = stick.y = stick.mag = 0;
        } else if (cam.id < 0) {
          cam.id = e.pointerId; cam.lx = e.clientX; cam.ly = e.clientY;
        }
        e.preventDefault();
      });
      pad.addEventListener("pointermove", (e) => {
        if (e.pointerId === stick.id && stick.active) {
          let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
          const d = Math.hypot(dx, dy);
          const R = stick.radius;
          /* drag the origin along when the finger overshoots — thumb never "runs out" of stick */
          if (d > R * 1.35) {
            const k = (d - R * 1.35) / d;
            stick.ox += dx * k; stick.oy += dy * k;
            dx = e.clientX - stick.ox; dy = e.clientY - stick.oy;
          }
          const dd = Math.hypot(dx, dy) || 1;
          const m = Math.min(1, dd / R);
          stick.px = stick.ox + (dx / dd) * Math.min(dd, R);
          stick.py = stick.oy + (dy / dd) * Math.min(dd, R);
          const dead = 0.10;
          const mm = m < dead ? 0 : (m - dead) / (1 - dead);
          stick.mag = mm;
          stick.x = (dx / dd) * mm;
          stick.y = (-dy / dd) * mm;       // up on screen = forward
        } else if (e.pointerId === cam.id) {
          look.dx += e.clientX - cam.lx; look.dy += e.clientY - cam.ly;
          cam.lx = e.clientX; cam.ly = e.clientY;
        }
        e.preventDefault();
      });
      const end = (e) => {
        if (e.pointerId === stick.id) { stick.active = false; stick.id = -1; stick.x = stick.y = stick.mag = 0; }
        if (e.pointerId === cam.id) cam.id = -1;
      };
      pad.addEventListener("pointerup", end);
      pad.addEventListener("pointercancel", end);
      pad.addEventListener("lostpointercapture", end);
      pad.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  };

  /* ---------------- STATS / DEBUG ---------------- */
  G.stats = { fps: 60, ms: 0, drawCalls: 0, tris: 0, kills: 0, breaks: 0, hits: 0, playTime: 0 };
  if (new URLSearchParams(location.search).has("debug")) G.CONF.debug = true;
})();
