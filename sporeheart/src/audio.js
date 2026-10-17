/* SPOREHEART — audio.js : 100% synthesized WebAudio SFX + layered adaptive music
   Agent E. No audio files, no libraries.

   API:
     G.sfx.init()                              — call once at boot (idempotent)
     G.sfx.play(name, {vol, rate, pos})        — one-shot SFX; pos {x,z} pans/attenuates
     G.sfx.music('title'|'hub'|'boss'|'victory'|'off')
     G.sfx.setMuted(bool) / isMuted() / toggleMuted()
     G.sfx.setMasterVolume(0..1)
     G.sfx.ensure()                            — lazily builds the graph (returns ctx|null)

   Every voice is oscillator + noise + filter + envelope and disconnects itself in `onended`.
   The AudioContext is created on init and *resumed* on the first pointerdown/keydown, so the
   menu music is already warm when the player presses Start (browsers keep it suspended until
   that gesture, which is exactly what we want). */
(function () {
  "use strict";
  const G = (window.G = window.G || {});
  const S = (G.sfx = G.sfx || {});

  /* ================================================================
     STORAGE
     ================================================================ */
  const MUTE_KEY = "sporeheart_mute";
  function readStore(k) {
    try { if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(k); } catch (e) { /* private mode */ }
    return null;
  }
  function writeStore(k, v) {
    try { if (typeof localStorage !== "undefined" && localStorage) localStorage.setItem(k, v); } catch (e) { /* ignore */ }
  }

  /* ================================================================
     STATE
     ================================================================ */
  let ctx = null, master = null, sfxBus = null, musicBus = null, comp = null, noiseBuf = null;
  let muted = readStore(MUTE_KEY) === "1";
  let initCalled = false;
  let gestureArmed = false;
  let voices = 0;                            // live voices (diagnostic, released in onended)
  const RATE_WINDOW_MS = 1000;               // sliding window safety valve
  const MAX_STARTS = 40;                     // one-shot sounds started per second
  const starts = [];                         // timestamps of recent one-shots
  const recent = Object.create(null);        // name -> ms, guards double-triggered events
  const DEDUPE_MS = 25;
  let musicState = "off", musicBuilt = false;
  const layers = { drone: null, shimmer: null, arp: null, pulse: null, thump: null };
  let droneOscs = [], droneBase = [];
  let schedTimer = null, schedStep = 0, schedNext = 0;

  const VOL_DEFAULT = 0.85;

  /* ================================================================
     SMALL HELPERS
     ================================================================ */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function nowMs() {
    try {
      if (typeof performance !== "undefined" && performance && typeof performance.now === "function") return performance.now();
    } catch (e) { /* ignore */ }
    return Date.now();
  }
  function later(ms, fn) {
    try { if (typeof setTimeout === "function") setTimeout(fn, ms); } catch (e) { /* ignore */ }
  }
  function safe(fn) { try { fn(); } catch (e) { /* audio must never break the game */ } }

  /* ================================================================
     AUDIO GRAPH  (master -> compressor -> destination, two sub-buses)
     ================================================================ */
  function ensure() {
    if (ctx) return ctx;
    let AC = null;
    try { AC = window.AudioContext || window.webkitAudioContext || (typeof AudioContext !== "undefined" ? AudioContext : null); } catch (e) { AC = null; }
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }

    safe(function () {
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOL_DEFAULT;

      comp = ctx.createDynamicsCompressor();
      if (comp && comp.threshold && comp.ratio) {
        comp.threshold.value = -16;
        comp.knee.value = 22;
        comp.ratio.value = 3.2;
        comp.attack.value = 0.004;
        comp.release.value = 0.25;
        master.connect(comp);
        comp.connect(ctx.destination);
      } else {
        master.connect(ctx.destination);
      }

      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);

      musicBus = ctx.createGain();
      musicBus.gain.value = 0.6;
      musicBus.connect(master);

      noiseBuf = makeNoiseBuffer();
    });

    S.ctx = ctx;
    if (musicState !== "off") applyMusic();
    return ctx;
  }

  /* pink-ish noise bed, 1 second, looped by every noise voice */
  function makeNoiseBuffer() {
    try {
      const sr = isNum(ctx.sampleRate) ? ctx.sampleRate : 22050;
      const len = Math.max(1024, Math.floor(Math.min(sr, 44100) * 1.0));
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = (w * 0.55 + last * 3.2) * 0.5;
      }
      return buf;
    } catch (e) { return null; }
  }

  function gnode(v) {
    const g = ctx.createGain();
    try { g.gain.value = v; } catch (e) { /* ignore */ }
    return g;
  }
  function biquad(type, f, q) {
    const b = ctx.createBiquadFilter();
    b.type = type || "lowpass";
    if (isNum(f)) b.frequency.value = f;
    if (isNum(q)) b.Q.value = q;
    return b;
  }

  /* release a voice: disconnect everything once the source stops */
  function trackSource(src, nodes, isMusic) {
    if (!isMusic) voices++;
    try {
      src.onended = function () {
        if (!isMusic) voices = Math.max(0, voices - 1);
        for (let i = 0; i < nodes.length; i++) {
          try { nodes[i].disconnect(); } catch (e) { /* ignore */ }
        }
      };
    } catch (e) { /* ignore */ }
  }

  /* position-aware output: stereo pan + distance attenuation vs the player */
  function outputFor(opts) {
    const out = { node: sfxBus, att: 1 };
    const pos = opts && opts.pos;
    if (!pos || !isNum(pos.x) || !ctx || !ctx.createStereoPanner) return out;
    const P = G.player || {};
    const px = isNum(P.x) ? P.x : 0;
    const pz = isNum(P.z) ? P.z : 0;
    const dx = pos.x - px;
    const dz = (isNum(pos.z) ? pos.z : 0) - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const panner = ctx.createStereoPanner();
    try { panner.pan.value = clamp(dx / 14, -0.92, 0.92); } catch (e) { /* ignore */ }
    panner.connect(sfxBus);
    out.node = panner;
    out.att = clamp(1 / (1 + dist * 0.16), 0.16, 1);
    later(6000, function () { try { panner.disconnect(); } catch (e) { /* ignore */ } });
    return out;
  }

  /* ================================================================
     PRIMITIVES — tone() / noise() build the whole sound library
     ================================================================ */
  /* tone({type,f0,f1,t0,dur,vol,atk,dest,att,detune,glide,filter:{type,f0,f1,q}}) */
  function tone(o) {
    const t0 = o.t0, dur = Math.max(0.03, o.dur);
    const atk = o.atk === undefined ? 0.006 : o.atk;
    const vol = Math.max(0.0003, (o.vol === undefined ? 0.2 : o.vol) * (o.att === undefined ? 1 : o.att));
    const osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    const f0 = Math.max(8, o.f0 || 440);
    osc.frequency.setValueAtTime(f0, t0);
    if (isNum(o.f1) && o.f1 !== f0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(8, o.f1), t0 + Math.max(0.02, o.glide === undefined ? dur * 0.8 : o.glide));
    }
    if (isNum(o.detune)) osc.detune.value = o.detune;

    const g = gnode(0.0001);
    const p = g.gain;
    p.setValueAtTime(0.0001, t0);
    p.exponentialRampToValueAtTime(vol, t0 + Math.max(0.002, atk));
    p.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, atk + 0.05));

    let tail = osc;
    let flt = null;
    if (o.filter) {
      flt = biquad(o.filter.type || "lowpass", o.filter.f0 || 1200, o.filter.q);
      if (isNum(o.filter.f1)) {
        flt.frequency.setValueAtTime(Math.max(30, o.filter.f0 || 1200), t0);
        flt.frequency.exponentialRampToValueAtTime(Math.max(30, o.filter.f1), t0 + Math.max(0.03, dur * 0.9));
      }
      osc.connect(flt);
      tail = flt;
    }
    tail.connect(g);
    g.connect(o.dest || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
    trackSource(osc, [osc, g, tail], !!o.music);
    return osc;
  }

  /* noise({t0,dur,vol,atk,dest,att,rate,filter:{type,f0,f1,q,sweep}}) */
  function noise(o) {
    const t0 = o.t0, dur = Math.max(0.02, o.dur);
    const atk = o.atk === undefined ? 0.004 : o.atk;
    const vol = Math.max(0.0003, (o.vol === undefined ? 0.2 : o.vol) * (o.att === undefined ? 1 : o.att));
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    if (isNum(o.rate) && o.rate > 0) src.playbackRate.value = o.rate;
    const flt = o.filter ? biquad(o.filter.type || "bandpass", o.filter.f0 || 1200, o.filter.q) : null;
    if (flt && isNum(o.filter.f1)) {
      flt.frequency.setValueAtTime(Math.max(30, o.filter.f0 || 1200), t0);
      flt.frequency.exponentialRampToValueAtTime(Math.max(30, o.filter.f1), t0 + Math.max(0.03, o.filter.sweep === undefined ? dur * 0.9 : o.filter.sweep));
    }
    const g = gnode(0.0001);
    const p = g.gain;
    p.setValueAtTime(0.0001, t0);
    p.exponentialRampToValueAtTime(vol, t0 + Math.max(0.002, atk));
    p.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, atk + 0.04));
    if (flt) { src.connect(flt); flt.connect(g); } else { src.connect(g); }
    g.connect(o.dest || sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
    trackSource(src, [src, g].concat(flt ? [flt] : []), !!o.music);
  }

  /* wobbling sine — used by breakShroom / stagger / assassin death */
  function wobble(o) {
    const t0 = o.t0, dur = Math.max(0.05, o.dur);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(o.f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(8, o.f1), t0 + dur * 0.85);
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = o.lfoHz || 14;
    const lg = gnode(o.depth || 30);
    lfo.connect(lg);
    lg.connect(osc.frequency);
    const g = gnode(0.0001);
    const p = g.gain;
    p.setValueAtTime(0.0001, t0);
    p.exponentialRampToValueAtTime(Math.max(0.0003, o.vol * (o.att === undefined ? 1 : o.att)), t0 + 0.012);
    p.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(o.dest || sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
    lfo.start(t0); lfo.stop(t0 + dur + 0.03);
    trackSource(osc, [osc, g, lfo, lg], !!o.music);
  }

  /* ================================================================
     SFX RECIPES
     Each recipe: fn(t0, o) with o = {dest, att, rate, vol}
     ================================================================ */
  const R = Object.create(null);

  function swing(t0, o, i) {
    const r = o.rate, base = [780, 1020, 660][i];
    const dur = 0.26 - i * 0.025;
    noise({ t0: t0, dur: dur, vol: 0.26, atk: 0.02, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: base * 0.5 * r, f1: base * 2.8 * r, q: 1.15 } });
    noise({ t0: t0 + 0.015, dur: dur * 0.55, vol: 0.1, atk: 0.01, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 1900 * r, f1: 900 * r, q: 0.7 } });
    tone({ type: "sine", f0: 340 * r, f1: 150 * r, t0: t0, dur: 0.15, vol: 0.07, dest: o.dest, att: o.att });
  }
  R.swing1 = function (t0, o) { swing(t0, o, 0); };
  R.swing2 = function (t0, o) { swing(t0, o, 1); };
  R.swing3 = function (t0, o) { swing(t0, o, 2); };
  R.swing = R.swing1; // legacy alias used by player.js while chaining

  R.hitFlesh = function (t0, o) {
    const r = o.rate;
    tone({ type: "sine", f0: 172 * r, f1: 52 * r, t0: t0, dur: 0.2, vol: 0.36, dest: o.dest, att: o.att });
    tone({ type: "square", f0: 96 * r, f1: 44 * r, t0: t0, dur: 0.11, vol: 0.1, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 700, f1: 200, q: 0.8 } });
    noise({ t0: t0, dur: 0.11, vol: 0.24, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 1400 * r, f1: 180 * r, q: 0.9 } });
  };

  R.hitWood = function (t0, o) {
    const r = o.rate;
    tone({ type: "square", f0: 470 * r, f1: 210 * r, t0: t0, dur: 0.07, vol: 0.15, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 2400, f1: 900, q: 1 } });
    noise({ t0: t0, dur: 0.08, vol: 0.2, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 1500 * r, f1: 900 * r, q: 3.2 } });
    tone({ type: "sine", f0: 220 * r, f1: 110 * r, t0: t0, dur: 0.1, vol: 0.13, dest: o.dest, att: o.att });
  };

  R.breakWood = function (t0, o) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.34, vol: 0.32, atk: 0.004, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 1500 * r, f1: 380 * r, q: 0.85 } });
    tone({ type: "sine", f0: 124 * r, f1: 42 * r, t0: t0, dur: 0.26, vol: 0.2, dest: o.dest, att: o.att });
    for (let i = 0; i < 3; i++) {
      const t = t0 + 0.02 + i * 0.055 + Math.random() * 0.03;
      noise({ t0: t, dur: 0.045, vol: 0.13, dest: o.dest, att: o.att,
        filter: { type: "highpass", f0: 2400 * r, f1: 3200 * r, q: 0.7 } });
    }
  };

  R.breakShroom = function (t0, o) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.3, vol: 0.28, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 1200 * r, f1: 500 * r, q: 1.1 } });
    wobble({ t0: t0 + 0.01, dur: 0.42, f0: 430 * r, f1: 96 * r, vol: 0.2, lfoHz: 15, depth: 55 * r, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 190 * r, f1: 70 * r, t0: t0, dur: 0.3, vol: 0.12, dest: o.dest, att: o.att });
    for (let i = 0; i < 2; i++) {
      noise({ t0: t0 + 0.03 + i * 0.06, dur: 0.05, vol: 0.1, dest: o.dest, att: o.att,
        filter: { type: "highpass", f0: 2600 * r, f1: 3400 * r, q: 0.6 } });
    }
  };

  R.dash = function (t0, o) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.3, vol: 0.24, atk: 0.05, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 480 * r, f1: 2400 * r, q: 0.85 } });
    noise({ t0: t0 + 0.02, dur: 0.2, vol: 0.08, atk: 0.03, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 3200 * r, f1: 1400 * r, q: 0.6 } });
    tone({ type: "sine", f0: 180 * r, f1: 540 * r, t0: t0, dur: 0.2, vol: 0.05, dest: o.dest, att: o.att });
  };

  R.jump = function (t0, o) {
    const r = o.rate;
    tone({ type: "sine", f0: 250 * r, f1: 520 * r, t0: t0, dur: 0.16, vol: 0.13, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.12, vol: 0.06, atk: 0.01, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 900 * r, f1: 2200 * r, q: 1 } });
  };

  R.land = function (t0, o) {
    const r = o.rate;
    tone({ type: "sine", f0: 122 * r, f1: 46 * r, t0: t0, dur: 0.17, vol: 0.28, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.13, vol: 0.16, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 780 * r, f1: 120 * r, q: 0.8 } });
  };

  R.bolt = function (t0, o) {
    const r = o.rate;
    tone({ type: "sawtooth", f0: 1600 * r, f1: 220 * r, t0: t0, dur: 0.18, vol: 0.13, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 3600, f1: 520, q: 2.4 } });
    tone({ type: "square", f0: 900 * r, f1: 160 * r, t0: t0, dur: 0.1, vol: 0.05, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.1, vol: 0.08, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 2200 * r, f1: 800 * r, q: 0.8 } });
  };

  R.novaCharge = function (t0, o) {
    const r = o.rate;
    tone({ type: "sine", f0: 220 * r, f1: 900 * r, t0: t0, dur: 0.52, vol: 0.1, atk: 0.16, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.52, vol: 0.12, atk: 0.4, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 400 * r, f1: 2400 * r, q: 1.4 } });
  };

  R.nova = function (t0, o) {
    const r = o.rate;
    tone({ type: "sine", f0: 104 * r, f1: 30 * r, t0: t0, dur: 1.15, vol: 0.34, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.95, vol: 0.3, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 900 * r, f1: 70 * r, q: 0.9 } });
    tone({ type: "sine", f0: 1420 * r, f1: 2100 * r, t0: t0, dur: 0.85, vol: 0.045, atk: 0.02, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 2130 * r, f1: 2600 * r, t0: t0 + 0.04, dur: 0.7, vol: 0.03, atk: 0.02, dest: o.dest, att: o.att });
  };

  R.heal = function (t0, o) {
    const r = o.rate;
    const notes = [784, 1046.5, 1318.5, 1568];
    for (let i = 0; i < notes.length; i++) {
      tone({ type: "sine", f0: notes[i] * r, t0: t0 + i * 0.075, dur: 0.55, vol: 0.085, atk: 0.008, dest: o.dest, att: o.att });
      tone({ type: "triangle", f0: notes[i] * 0.5 * r, t0: t0 + i * 0.075, dur: 0.5, vol: 0.03, dest: o.dest, att: o.att });
    }
  };

  R.portal = function (t0, o) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.95, vol: 0.2, atk: 0.55, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 260 * r, f1: 3400 * r, q: 1.1, sweep: 0.8 } });
    tone({ type: "sine", f0: 58 * r, f1: 130 * r, t0: t0, dur: 0.85, vol: 0.09, atk: 0.3, dest: o.dest, att: o.att });
  };

  function roar(t0, o, n) {
    const r = o.rate;
    const lvl = n;                                     // 1..3 → bigger each step
    const base = [0, 74, 62, 49][lvl] * r;
    const dur = 0.95 + lvl * 0.22;
    const spread = 12 + lvl * 5;
    for (let i = 0; i < 2; i++) {
      tone({ type: "sawtooth", f0: base * (i ? 1.006 : 0.994), f1: base * 0.62, detune: i ? spread : -spread,
        t0: t0, dur: dur, vol: 0.2 + lvl * 0.02, atk: 0.07, dest: o.dest, att: o.att,
        filter: { type: "lowpass", f0: 760 + lvl * 120, f1: 240, q: 3.2 } });
    }
    tone({ type: "sine", f0: base * 0.5, f1: base * 0.3, t0: t0, dur: dur * 1.05, vol: 0.34, atk: 0.05, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: dur * 0.85, vol: 0.18, atk: 0.09, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 620 + lvl * 90, f1: 140, q: 1.2 } });
    // throat grit
    wobble({ t0: t0 + 0.05, dur: dur * 0.7, f0: base * 1.5, f1: base, vol: 0.06, lfoHz: 24, depth: base * 0.35, dest: o.dest, att: o.att });
  }
  R.roar1 = function (t0, o) { roar(t0, o, 1); };
  R.roar2 = function (t0, o) { roar(t0, o, 2); };
  R.roar3 = function (t0, o) { roar(t0, o, 3); };
  R.roar = R.roar2;

  R.petal = function (t0, o) {
    const r = o.rate;
    for (let i = 0; i < 4; i++) {
      noise({ t0: t0 + i * 0.055, dur: 0.07, vol: 0.055, atk: 0.008, dest: o.dest, att: o.att,
        filter: { type: "bandpass", f0: (2200 + i * 420) * r, f1: (3100 + i * 300) * r, q: 2.2 } });
    }
    tone({ type: "sine", f0: 1760 * r, f1: 2340 * r, t0: t0, dur: 0.28, vol: 0.03, atk: 0.02, dest: o.dest, att: o.att });
  };

  R.uiClick = function (t0, o) {
    const r = o.rate;
    tone({ type: "square", f0: 880 * r, t0: t0, dur: 0.035, vol: 0.07, atk: 0.002, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 3200, f1: 1800, q: 0.7 } });
    tone({ type: "sine", f0: 1320 * r, t0: t0, dur: 0.03, vol: 0.05, atk: 0.002, dest: o.dest, att: o.att });
  };

  R.parry = function (t0, o) {
    const r = o.rate;
    tone({ type: "square", f0: 2600 * r, t0: t0, dur: 0.14, vol: 0.11, atk: 0.002, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 900, f1: 1800, q: 0.8 } });
    tone({ type: "sine", f0: 3400 * r, t0: t0, dur: 0.18, vol: 0.075, atk: 0.002, dest: o.dest, att: o.att });
    tone({ type: "square", f0: 1750 * r, t0: t0, dur: 0.1, vol: 0.05, atk: 0.002, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.06, vol: 0.1, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 3200 * r, f1: 5000 * r, q: 0.7 } });
  };

  R.stagger = function (t0, o) {
    wobble({ t0: t0, dur: 0.36, f0: 300 * o.rate, f1: 170 * o.rate, vol: 0.12, lfoHz: 17, depth: 60 * o.rate, dest: o.dest, att: o.att });
  };

  R.bossStep = function (t0, o) {
    const r = o.rate;
    tone({ type: "sine", f0: 72 * r, f1: 26 * r, t0: t0, dur: 0.42, vol: 0.48, atk: 0.004, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.26, vol: 0.22, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 240 * r, f1: 60 * r, q: 1.1 } });
  };

  R.explosion = function (t0, o) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.85, vol: 0.38, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 1900 * r, f1: 60 * r, q: 0.9 } });
    tone({ type: "sine", f0: 84 * r, f1: 24 * r, t0: t0, dur: 0.7, vol: 0.42, dest: o.dest, att: o.att });
    tone({ type: "sawtooth", f0: 240 * r, f1: 40 * r, t0: t0, dur: 0.3, vol: 0.09, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 900, f1: 120, q: 1.6 } });
    for (let i = 0; i < 3; i++) {
      noise({ t0: t0 + 0.08 + i * 0.09, dur: 0.06, vol: 0.1, dest: o.dest, att: o.att,
        filter: { type: "highpass", f0: 2000 + i * 600, f1: 1400, q: 0.6 } });
    }
  };

  R.victory = function (t0, o) {
    const r = o.rate;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    for (let i = 0; i < notes.length; i++) {
      const t = t0 + i * 0.11;
      tone({ type: "triangle", f0: notes[i] * r, t0: t, dur: 0.7, vol: 0.11, atk: 0.006, dest: o.dest, att: o.att,
        filter: { type: "lowpass", f0: 4200, f1: 1800, q: 0.7 } });
      tone({ type: "sine", f0: notes[i] * 2 * r, t0: t, dur: 0.4, vol: 0.03, dest: o.dest, att: o.att });
    }
    tone({ type: "sine", f0: 130.81 * r, t0: t0, dur: 1.4, vol: 0.14, atk: 0.02, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 196 * r, t0: t0 + 0.05, dur: 1.2, vol: 0.07, atk: 0.03, dest: o.dest, att: o.att });
  };

  R.perfectDodge = function (t0, o) {
    const r = o.rate;
    const f = [900, 1350, 1800];
    for (let i = 0; i < f.length; i++) {
      tone({ type: "sine", f0: f[i] * r, f1: f[i] * 2.6 * r, t0: t0 + i * 0.018, dur: 0.5, vol: 0.05, atk: 0.02, dest: o.dest, att: o.att });
    }
    noise({ t0: t0, dur: 0.4, vol: 0.08, atk: 0.22, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 1800 * r, f1: 5200 * r, q: 0.8, sweep: 0.3 } });
  };

  R.killChime = function (t0, o) {
    const r = o.rate;
    tone({ type: "sine", f0: 1046.5 * r, t0: t0, dur: 0.3, vol: 0.07, atk: 0.004, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 1568 * r, t0: t0 + 0.06, dur: 0.25, vol: 0.05, atk: 0.004, dest: o.dest, att: o.att });
  };

  /* ================================================================
     RECIPES — assassin kit, boss telegraphs, props, imps (boss/assassin pass)
     ================================================================ */

  /* --- assassin: air before the blink-dash ------------------------- */
  R.assassin_wind = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.22, vol: 0.15, atk: 0.07, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 620 * r, f1: 2700 * r, q: 0.95, sweep: 0.18 } });
    noise({ t0: t0 + 0.01, dur: 0.13, vol: 0.05, atk: 0.05, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 3000 * r, f1: 1700 * r, q: 0.7 } });
    tone({ type: "sine", f0: 210 * r, f1: 380 * r, t0: t0, dur: 0.16, vol: 0.03, atk: 0.04, dest: o.dest, att: o.att });
  };

  /* --- assassin: the dash itself (brighter + shorter than R.dash) --- */
  R.assassin_dash = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.19, vol: 0.22, atk: 0.02, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 950 * r, f1: 3900 * r, q: 0.8 } });
    noise({ t0: t0 + 0.015, dur: 0.1, vol: 0.07, atk: 0.01, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 4300 * r, f1: 2100 * r, q: 0.6 } });
    tone({ type: "sine", f0: 260 * r, f1: 780 * r, t0: t0, dur: 0.12, vol: 0.045, dest: o.dest, att: o.att });
  };

  /* --- assassin: blade (bright swing variant + edge ring) ---------- */
  R.assassin_slash = function (t0, o, i) {
    const r = o.rate;
    swing(t0, o, 1);
    tone({ type: "square", f0: 2600 * r, f1: 1450 * r, t0: t0, dur: 0.09, vol: 0.06, atk: 0.002, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 1200, f1: 2400, q: 0.8 } });
    noise({ t0: t0 + 0.005, dur: 0.07, vol: 0.07, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 3600 * r, f1: 5200 * r, q: 0.7 } });
  };

  /* --- assassin: heavy blow (low swing + metallic ring) ------------ */
  R.assassin_heavy = function (t0, o, i) {
    const r = o.rate;
    swing(t0, o, 2);
    tone({ type: "sine", f0: 92 * r, f1: 38 * r, t0: t0, dur: 0.3, vol: 0.22, atk: 0.004, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.16, vol: 0.14, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 900 * r, f1: 160 * r, q: 0.9 } });
    // inharmonic partials = blade ring
    tone({ type: "square", f0: 1480 * r, t0: t0, dur: 0.34, vol: 0.035, atk: 0.003, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 900, f1: 1600, q: 0.8 } });
    tone({ type: "sine", f0: 2213 * r, t0: t0 + 0.008, dur: 0.28, vol: 0.028, atk: 0.004, dest: o.dest, att: o.att });
  };

  /* --- assassin: vanish (soft reverse shimmer, petal-like) --------- */
  R.assassin_vanish = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.5, vol: 0.13, atk: 0.34, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 1100 * r, f1: 5200 * r, q: 0.9, sweep: 0.42 } });
    const notes = [1568, 2093, 2637];
    for (let n = 0; n < notes.length; n++) {
      tone({ type: "sine", f0: notes[n] * r, f1: notes[n] * 1.5 * r, t0: t0 + n * 0.07, dur: 0.34, vol: 0.032, atk: 0.09, dest: o.dest, att: o.att });
    }
    for (let n = 0; n < 3; n++) {
      noise({ t0: t0 + 0.05 + n * 0.06, dur: 0.07, vol: 0.045, atk: 0.012, dest: o.dest, att: o.att,
        filter: { type: "bandpass", f0: (2400 + n * 400) * r, f1: (3300 + n * 300) * r, q: 2.4 } });
    }
  };

  /* --- assassin: death (low thud + falling tone) ------------------- */
  R.assassin_down = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "sine", f0: 118 * r, f1: 32 * r, t0: t0, dur: 0.72, vol: 0.34, atk: 0.004, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.55, vol: 0.2, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 950 * r, f1: 80 * r, q: 0.9 } });
    tone({ type: "triangle", f0: 540 * r, f1: 120 * r, t0: t0 + 0.03, dur: 0.62, vol: 0.08, atk: 0.01, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 2600, f1: 700, q: 0.9 } });
    noise({ t0: t0 + 0.12, dur: 0.3, vol: 0.06, atk: 0.06, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 2200 * r, f1: 900 * r, q: 1.6 } });
  };

  /* --- boss: stagger (deep wobble / groan) ------------------------- */
  R.boss_stagger = function (t0, o, i) {
    const r = o.rate;
    wobble({ t0: t0, dur: 0.72, f0: 128 * r, f1: 62 * r, vol: 0.17, lfoHz: 11, depth: 26 * r, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 76 * r, f1: 40 * r, t0: t0, dur: 0.7, vol: 0.2, atk: 0.02, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.5, vol: 0.12, atk: 0.03, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 340 * r, f1: 90 * r, q: 1.1 } });
  };

  /* --- boss: big layered roar (own stack, distinct from roar1..3) -- */
  R.boss_roar = function (t0, o, i) {
    const r = o.rate;
    const base = 55 * r;
    for (let n = 0; n < 2; n++) {
      tone({ type: "sawtooth", f0: base * (n ? 1.008 : 0.992), f1: base * 0.58, detune: n ? 16 : -16,
        t0: t0, dur: 1.5, vol: 0.22, atk: 0.09, dest: o.dest, att: o.att,
        filter: { type: "lowpass", f0: 900, f1: 210, q: 3.4 } });
    }
    tone({ type: "sine", f0: base * 0.5, f1: base * 0.3, t0: t0, dur: 1.6, vol: 0.34, atk: 0.06, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 1.3, vol: 0.19, atk: 0.12, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 780, f1: 130, q: 1.2 } });
    wobble({ t0: t0 + 0.06, dur: 1.0, f0: base * 1.6, f1: base, vol: 0.07, lfoHz: 21, depth: base * 0.4, dest: o.dest, att: o.att });
    noise({ t0: t0 + 1.05, dur: 0.35, vol: 0.07, atk: 0.12, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 1400, f1: 600, q: 1.4 } });
  };

  /* --- prop: plate armour shatter (breakWood family, brighter) ----- */
  R.plate_break = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.32, vol: 0.32, atk: 0.003, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 2700 * r, f1: 720 * r, q: 0.9 } });
    tone({ type: "square", f0: 620 * r, f1: 210 * r, t0: t0, dur: 0.14, vol: 0.1, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 3200, f1: 1100, q: 1.1 } });
    tone({ type: "sine", f0: 150 * r, f1: 48 * r, t0: t0, dur: 0.28, vol: 0.2, dest: o.dest, att: o.att });
    for (let n = 0; n < 4; n++) {
      const t = t0 + 0.02 + n * 0.045 + Math.random() * 0.025;
      noise({ t0: t, dur: 0.04, vol: 0.1, dest: o.dest, att: o.att,
        filter: { type: "highpass", f0: (3200 + n * 500) * r, f1: (4200 + n * 400) * r, q: 0.7 } });
    }
  };

  /* --- generic shatter (own recipe, not an alias) ------------------ */
  R.break = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.28, vol: 0.26, atk: 0.003, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 1150 * r, f1: 340 * r, q: 1.05 } });
    noise({ t0: t0 + 0.005, dur: 0.12, vol: 0.1, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 2500 * r, f1: 1300 * r, q: 0.7 } });
    tone({ type: "triangle", f0: 300 * r, f1: 82 * r, t0: t0, dur: 0.2, vol: 0.11, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 1800, f1: 400, q: 0.9 } });
    for (let n = 0; n < 2; n++) {
      noise({ t0: t0 + 0.04 + n * 0.055, dur: 0.045, vol: 0.08, dest: o.dest, att: o.att,
        filter: { type: "highpass", f0: 2800 * r, f1: 3600 * r, q: 0.6 } });
    }
  };

  /* --- boss mine: spawn (soft magical plip) ------------------------ */
  R.mine_spawn = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "sine", f0: 880 * r, f1: 1320 * r, t0: t0, dur: 0.13, vol: 0.07, atk: 0.012, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 1760 * r, f1: 1980 * r, t0: t0 + 0.05, dur: 0.09, vol: 0.03, atk: 0.008, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.09, vol: 0.035, atk: 0.02, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 3600 * r, f1: 5200 * r, q: 0.8 } });
  };

  /* --- boss mine: pop (small bright pop) --------------------------- */
  R.mine_pop = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "square", f0: 1500 * r, f1: 720 * r, t0: t0, dur: 0.05, vol: 0.09, atk: 0.002, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 4200, f1: 1600, q: 0.9 } });
    tone({ type: "sine", f0: 2400 * r, f1: 1250 * r, t0: t0, dur: 0.045, vol: 0.05, atk: 0.002, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.035, vol: 0.07, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 3200 * r, f1: 5000 * r, q: 0.7 } });
  };

  /* --- boss mine: boom (medium, shorter than R.explosion) ---------- */
  R.mine_boom = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.42, vol: 0.28, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 1600 * r, f1: 70 * r, q: 0.9 } });
    tone({ type: "sine", f0: 100 * r, f1: 30 * r, t0: t0, dur: 0.34, vol: 0.26, dest: o.dest, att: o.att });
    noise({ t0: t0 + 0.03, dur: 0.06, vol: 0.07, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 2400 * r, f1: 1300 * r, q: 0.6 } });
  };

  /* --- boss: blink (quick descending teleport zap) ----------------- */
  R.boss_blink = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "sawtooth", f0: 2400 * r, f1: 300 * r, t0: t0, dur: 0.17, vol: 0.11, atk: 0.003, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 4800, f1: 900, q: 3 } });
    tone({ type: "square", f0: 1200 * r, f1: 180 * r, t0: t0, dur: 0.1, vol: 0.05, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 2200, f1: 600, q: 2.2 } });
    noise({ t0: t0, dur: 0.13, vol: 0.07, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 4200 * r, f1: 900 * r, q: 0.8 } });
  };

  /* --- boss: leap (huge upward whoosh) ----------------------------- */
  R.boss_leap = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.55, vol: 0.24, atk: 0.12, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 220 * r, f1: 3200 * r, q: 0.9, sweep: 0.5 } });
    noise({ t0: t0 + 0.05, dur: 0.35, vol: 0.08, atk: 0.1, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 900 * r, f1: 4400 * r, q: 0.7 } });
    tone({ type: "sine", f0: 46 * r, f1: 120 * r, t0: t0, dur: 0.5, vol: 0.11, atk: 0.06, dest: o.dest, att: o.att });
  };

  /* --- boss: charge (rising rumble / build) ------------------------ */
  R.boss_charge = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.9, vol: 0.2, atk: 0.5, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 130 * r, f1: 900 * r, q: 1.1, sweep: 0.82 } });
    tone({ type: "sawtooth", f0: 44 * r, f1: 96 * r, t0: t0, dur: 0.9, vol: 0.13, atk: 0.3, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 200, f1: 950, q: 2.2 } });
    tone({ type: "sine", f0: 58 * r, f1: 112 * r, t0: t0, dur: 0.85, vol: 0.13, atk: 0.28, dest: o.dest, att: o.att });
  };

  /* --- boss: step (deep thud + sub, stays audible at low vol) ------ */
  R.boss_step = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "sine", f0: 64 * r, f1: 22 * r, t0: t0, dur: 0.5, vol: 0.42, atk: 0.004, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 41 * r, f1: 18 * r, t0: t0, dur: 0.62, vol: 0.26, atk: 0.008, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.26, vol: 0.17, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 190 * r, f1: 50 * r, q: 1.1 } });
  };

  /* --- boss: crashing into a wall (stone) -------------------------- */
  R.wall_impact = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.42, vol: 0.33, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 1400 * r, f1: 260 * r, q: 0.85 } });
    tone({ type: "sine", f0: 96 * r, f1: 30 * r, t0: t0, dur: 0.4, vol: 0.3, atk: 0.004, dest: o.dest, att: o.att });
    tone({ type: "square", f0: 380 * r, f1: 120 * r, t0: t0, dur: 0.16, vol: 0.08, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 1600, f1: 400, q: 1.2 } });
    for (let n = 0; n < 3; n++) {
      noise({ t0: t0 + 0.06 + n * 0.07, dur: 0.05, vol: 0.08, dest: o.dest, att: o.att,
        filter: { type: "highpass", f0: (2200 + n * 700) * r, f1: (3200 + n * 500) * r, q: 0.7 } });
    }
  };

  /* --- boss: inhale (~0.8s rising air) ---------------------------- */
  R.boss_inhale = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.8, vol: 0.17, atk: 0.52, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 300 * r, f1: 2800 * r, q: 1.3, sweep: 0.74 } });
    noise({ t0: t0 + 0.04, dur: 0.72, vol: 0.07, atk: 0.46, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 620 * r, f1: 4200 * r, q: 0.7 } });
    tone({ type: "sine", f0: 60 * r, f1: 168 * r, t0: t0, dur: 0.8, vol: 0.05, atk: 0.42, dest: o.dest, att: o.att });
  };

  /* --- boss: death (massive layered collapse) --------------------- */
  R.boss_down = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "sine", f0: 70 * r, f1: 20 * r, t0: t0, dur: 1.4, vol: 0.44, atk: 0.004, dest: o.dest, att: o.att });
    tone({ type: "sawtooth", f0: 120 * r, f1: 32 * r, t0: t0, dur: 1.15, vol: 0.14, atk: 0.01, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 620, f1: 90, q: 1.8 } });
    noise({ t0: t0, dur: 1.3, vol: 0.32, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 1400 * r, f1: 50 * r, q: 0.9 } });
    wobble({ t0: t0 + 0.08, dur: 1.05, f0: 92 * r, f1: 40 * r, vol: 0.12, lfoHz: 9, depth: 22 * r, dest: o.dest, att: o.att });
    for (let n = 0; n < 4; n++) {
      noise({ t0: t0 + 0.4 + n * 0.13, dur: 0.06, vol: 0.08, dest: o.dest, att: o.att,
        filter: { type: "highpass", f0: (1800 + n * 500) * r, f1: 1200 * r, q: 0.6 } });
    }
  };

  /* --- imp: pop (tiny squeaky pop) -------------------------------- */
  R.imp_pop = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "square", f0: 2050 * r, f1: 1400 * r, t0: t0, dur: 0.045, vol: 0.07, atk: 0.002, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 5200, f1: 2400, q: 0.8 } });
    tone({ type: "sine", f0: 2650 * r, f1: 1850 * r, t0: t0, dur: 0.05, vol: 0.05, atk: 0.002, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.03, vol: 0.05, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 4200 * r, f1: 6000 * r, q: 0.7 } });
  };

  /* --- imp: yelp (small high-pitched) ----------------------------- */
  R.imp_yell = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "triangle", f0: 900 * r, f1: 1550 * r, t0: t0, dur: 0.14, vol: 0.09, atk: 0.006, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 4200, f1: 2600, q: 1.1 } });
    tone({ type: "sine", f0: 1800 * r, f1: 2700 * r, t0: t0 + 0.01, dur: 0.12, vol: 0.04, atk: 0.006, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.1, vol: 0.045, atk: 0.01, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 2000 * r, f1: 3200 * r, q: 4 } });
  };

  /* --- cue: soft bright shimmer (enemy wind-up) ------------------- */
  R.telegraph = function (t0, o, i) {
    const r = o.rate;
    tone({ type: "sine", f0: 1760 * r, t0: t0, dur: 0.5, vol: 0.05, atk: 0.02, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 2637 * r, t0: t0 + 0.04, dur: 0.4, vol: 0.03, atk: 0.02, dest: o.dest, att: o.att });
    noise({ t0: t0, dur: 0.35, vol: 0.04, atk: 0.06, dest: o.dest, att: o.att,
      filter: { type: "highpass", f0: 4000 * r, f1: 6500 * r, q: 0.8 } });
  };

  /* --- gate: low wooden creak + rumble ---------------------------- */
  R.gate = function (t0, o, i) {
    const r = o.rate;
    noise({ t0: t0, dur: 0.8, vol: 0.14, atk: 0.16, dest: o.dest, att: o.att,
      filter: { type: "bandpass", f0: 320 * r, f1: 180 * r, q: 6 } });
    wobble({ t0: t0, dur: 0.7, f0: 180 * r, f1: 118 * r, vol: 0.07, lfoHz: 7, depth: 40 * r, dest: o.dest, att: o.att });
    tone({ type: "sine", f0: 62 * r, f1: 44 * r, t0: t0, dur: 0.9, vol: 0.15, atk: 0.04, dest: o.dest, att: o.att });
    noise({ t0: t0 + 0.06, dur: 0.7, vol: 0.09, atk: 0.1, dest: o.dest, att: o.att,
      filter: { type: "lowpass", f0: 240 * r, f1: 90 * r, q: 1 } });
  };

  /* ================================================================
     PLAY
     ================================================================ */
  S.play = function (name, opts) {
    opts = opts || {};
    if (!name) return false;
    const recipe = R[name];
    if (!recipe) return false;
    if (muted) return false;
    const c = ensure();
    if (!c) return false;

    // sliding-window density limit: never let one chaotic frame melt the audio thread,
    // but never latch off either (unlike a simultaneous-voice counter, this self-heals)
    const stamp = nowMs();
    while (starts.length && stamp - starts[0] > RATE_WINDOW_MS) starts.shift();
    if (starts.length >= MAX_STARTS) return false;

    // two systems often trigger the same sound for one event (combat event + local call) — keep it clean
    if (recent[name] && stamp - recent[name] < DEDUPE_MS) return false;
    recent[name] = stamp;
    starts.push(stamp);

    const out = outputFor(opts);
    const t0 = isNum(c.currentTime) ? c.currentTime + 0.005 : 0;
    const vol = isNum(opts.vol) ? clamp(opts.vol, 0, 2) : 1;
    const rate = isNum(opts.rate) && opts.rate > 0 ? clamp(opts.rate, 0.25, 4) : 1;
    try {
      recipe(t0, { dest: out.node, att: out.att * vol, rate: rate, vol: vol });
    } catch (e) {
      if (G.CONF && G.CONF.debug) console.warn("[sfx:" + name + "]", e);
      return false;
    }
    return true;
  };

  S.names = function () { return Object.keys(R).sort(); };

  /* ================================================================
     MUSIC — layered drone / shimmer / arp / pulse / thump with crossfades
     ================================================================ */
  const MUSIC = {
    title: {
      step: 1.9, droneMul: 1,
      pattern: [587.33, 880, 698.46, 523.25],
      level: { drone: 0.30, shimmer: 0.55, arp: 0.22, pulse: 0, thump: 0 },
      thumpEvery: 0, pulseEvery: 0
    },
    hub: {
      step: 0.62, droneMul: 1,
      pattern: [293.66, 349.23, 440, 523.25, 440, 349.23, 392, 293.66],
      level: { drone: 0.42, shimmer: 0.10, arp: 0.55, pulse: 0, thump: 0 },
      thumpEvery: 0, pulseEvery: 0
    },
    boss: {
      step: 0.30, droneMul: 0.5,
      pattern: [73.42, 73.42, 87.31, 110, 73.42, 73.42, 98, 87.31],
      level: { drone: 0.55, shimmer: 0, arp: 0.3, pulse: 0.34, thump: 0.4 },
      thumpEvery: 5, pulseEvery: 1
    },
    boss2: {
      step: 0.24, droneMul: 0.56,
      pattern: [82.41, 82.41, 98, 123.47, 82.41, 110, 98, 130.81, 82.41, 82.41, 98, 146.83],
      level: { drone: 0.58, shimmer: 0.05, arp: 0.34, pulse: 0.42, thump: 0.5 },
      thumpEvery: 4, pulseEvery: 1
    },
    boss3: {
      step: 0.36, droneMul: 0.42,
      pattern: [55, 55, 65.41, 73.42, 55, 55, 82.41, 73.42, 55, 61.74, 65.41, 98],
      level: { drone: 0.7, shimmer: 0.0, arp: 0.28, pulse: 0.5, thump: 0.75 },
      thumpEvery: 2, pulseEvery: 1
    },
    victory: {
      step: 0.42, droneMul: 1.25,
      pattern: [293.66, 369.99, 440, 587.33, 739.99, 880],
      level: { drone: 0.4, shimmer: 0.32, arp: 0.55, pulse: 0, thump: 0.12 },
      thumpEvery: 4, pulseEvery: 0
    }
  };

  function buildMusic() {
    if (musicBuilt || !ctx) return;
    musicBuilt = true;

    /* pad drone */
    layers.drone = gnode(0);
    layers.drone.connect(musicBus);
    const dfilter = biquad("lowpass", 520, 1.1);
    dfilter.connect(layers.drone);
    droneBase = [73.42, 110.0, 146.83];
    droneOscs = [];
    const droneVols = [0.34, 0.22, 0.16];
    for (let i = 0; i < droneBase.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "triangle" : "sawtooth";
      osc.frequency.value = droneBase[i];
      osc.detune.value = [-7, 6, 0][i];
      const g = gnode(droneVols[i]);
      osc.connect(g);
      g.connect(dfilter);
      osc.start();
      droneOscs.push(osc);
    }
    const dlfo = ctx.createOscillator();
    dlfo.frequency.value = 0.055;
    const dlg = gnode(140);
    dlfo.connect(dlg);
    dlg.connect(dfilter.frequency);
    dlfo.start();

    /* airy shimmer */
    layers.shimmer = gnode(0);
    layers.shimmer.connect(musicBus);
    const trem = gnode(0.5);
    trem.connect(layers.shimmer);
    const shimF = [1568, 2349.3];
    for (let i = 0; i < shimF.length; i++) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = shimF[i];
      o.detune.value = i ? 8 : -8;
      const g = gnode(i ? 0.5 : 1);
      o.connect(g);
      g.connect(trem);
      o.start();
    }
    const slfo = ctx.createOscillator();
    slfo.frequency.value = 0.17;
    const slg = gnode(0.22);
    slfo.connect(slg);
    slg.connect(trem.gain);
    slfo.start();

    /* note buses (voices are spawned per note by the scheduler) */
    layers.arp = gnode(0); layers.arp.connect(musicBus);
    layers.pulse = gnode(0); layers.pulse.connect(musicBus);
    layers.thump = gnode(0); layers.thump.connect(musicBus);
  }

  function pluck(t, f, dest) {
    tone({ type: "triangle", f0: f, t0: t, dur: 0.75, vol: 0.15, atk: 0.006, dest: dest, music: true,
      filter: { type: "lowpass", f0: 2800, f1: 800, q: 0.7 } });
    tone({ type: "sine", f0: f * 2, t0: t, dur: 0.45, vol: 0.045, atk: 0.004, dest: dest, music: true });
  }
  function pulseNote(t, f) {
    tone({ type: "sawtooth", f0: f, t0: t, dur: 0.17, vol: 0.14, atk: 0.004, dest: layers.pulse, music: true,
      filter: { type: "lowpass", f0: 320, f1: 160, q: 1.6 } });
    tone({ type: "square", f0: f * 2, t0: t, dur: 0.1, vol: 0.04, atk: 0.003, dest: layers.pulse, music: true,
      filter: { type: "lowpass", f0: 900, f1: 400, q: 1 } });
  }
  function thumpNote(t) {
    tone({ type: "sine", f0: 64, f1: 28, t0: t, dur: 0.45, vol: 0.42, atk: 0.005, dest: layers.thump, music: true });
    noise({ t0: t, dur: 0.2, vol: 0.12, dest: layers.thump, att: 1, music: true,
      filter: { type: "lowpass", f0: 220, f1: 70, q: 1 } });
  }

  function applyMusic() {
    if (!ctx) return;
    if (!musicBuilt) buildMusic();
    const cfg = MUSIC[musicState];
    const off = musicState === "off" || !cfg;
    const t = ctx.currentTime;
    const lv = off ? { drone: 0, shimmer: 0, arp: 0, pulse: 0, thump: 0 } : cfg.level;
    const ramp = 0.85;
    const set = function (node, v) {
      if (!node || !node.gain) return;
      try { node.gain.setTargetAtTime(v, t, ramp); } catch (e) { try { node.gain.value = v; } catch (e2) { /* ignore */ } }
    };
    set(layers.drone, lv.drone);
    set(layers.shimmer, lv.shimmer);
    set(layers.arp, lv.arp);
    set(layers.pulse, lv.pulse);
    set(layers.thump, lv.thump);

    const mul = off ? 1 : cfg.droneMul;
    for (let i = 0; i < droneOscs.length; i++) {
      try { droneOscs[i].frequency.setTargetAtTime(droneBase[i] * mul, t, 1.1); } catch (e) { /* ignore */ }
    }
  }

  function schedTick() {
    if (!ctx || musicState === "off") return;
    const cfg = MUSIC[musicState];
    if (!cfg) return;
    // headless / stub context guard: currentTime is a real number only in a browser
    if (!isNum(ctx.currentTime)) return;
    const ahead = ctx.currentTime + 0.22;
    let guard = 0;
    while (schedNext < ahead && guard++ < 24) {
      const idx = schedStep % cfg.pattern.length;
      pluck(schedNext, cfg.pattern[idx], layers.arp);
      if (cfg.pulseEvery && schedStep % cfg.pulseEvery === 0) pulseNote(schedNext, cfg.pattern[idx]);
      if (cfg.thumpEvery && schedStep % cfg.thumpEvery === 0) thumpNote(schedNext);
      schedStep++;
      schedNext += cfg.step;
    }
  }

  function startSched() {
    if (schedTimer || !ctx) return;
    schedStep = 0;
    schedNext = isNum(ctx.currentTime) ? ctx.currentTime + 0.12 : 0;
    try {
      if (typeof setInterval === "function") schedTimer = setInterval(schedTick, 40);
    } catch (e) { schedTimer = null; }
  }
  function stopSched() {
    if (!schedTimer) return;
    try { clearInterval(schedTimer); } catch (e) { /* ignore */ }
    schedTimer = null;
  }

  S.music = function (state) {
    const next = state || "off";
    if (!MUSIC[next] && next !== "off") return musicState;
    if (next === musicState && musicBuilt) return musicState;
    musicState = next;
    if (!ensure()) return musicState;
    applyMusic();
    if (next === "off") {
      stopSched();
    } else {
      startSched();
    }
    return musicState;
  };
  S.getMusic = function () { return musicState; };

  /* ================================================================
     MUTE / VOLUME
     ================================================================ */
  S.setMuted = function (b) {
    muted = !!b;
    writeStore(MUTE_KEY, muted ? "1" : "0");
    if (!muted) ensure();
    if (master && master.gain && ctx) {
      try { master.gain.setTargetAtTime(muted ? 0 : VOL_DEFAULT, ctx.currentTime, 0.04); }
      catch (e) { try { master.gain.value = muted ? 0 : VOL_DEFAULT; } catch (e2) { /* ignore */ } }
    }
    return muted;
  };
  S.isMuted = function () { return muted; };
  S.toggleMuted = function () { return S.setMuted(!muted); };

  S.setMasterVolume = function (v) {
    const val = clamp(isNum(v) ? v : VOL_DEFAULT, 0, 1);
    try { if (master && master.gain) master.gain.value = muted ? 0 : val; } catch (e) { /* ignore */ }
    return val;
  };

  /* ================================================================
     INIT + GESTURE UNLOCK
     ================================================================ */
  function unlock() {
    const c = ensure();
    if (!c) return;
    try {
      if (c.state === "suspended" && typeof c.resume === "function") {
        const p = c.resume();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
    } catch (e) { /* ignore */ }
    if (musicState !== "off" && !schedTimer) startSched();
  }

  function hookGesture() {
    if (gestureArmed) return;
    gestureArmed = true;
    const opts = { once: true, passive: true };
    try {
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("pointerdown", unlock, opts);
        window.addEventListener("keydown", unlock, opts);
        window.addEventListener("touchstart", unlock, opts);
      }
    } catch (e) { /* ignore */ }
  }

  S.init = function () {
    if (initCalled) return S;
    initCalled = true;
    hookGesture();
    ensure();
    if (musicState === "off") musicState = "off";
    return S;
  };
  S.ensure = ensure;
  S.unlock = unlock;

  /* ================================================================
     BUS AUTO-SUBSCRIPTIONS (spec §AUDIO)
     ================================================================ */
  function bindBus() {
    if (!G.bus || typeof G.bus.on !== "function") return;
    const posOf = function (d) {
      if (!d) return undefined;
      if (d.pos && isNum(d.pos.x)) return d.pos;
      if (d.x !== undefined && d.z !== undefined) return { x: d.x, z: d.z };
      return undefined;
    };

    G.bus.on("hit", function (d) {
      if (!d) return;
      const t = d.target || {};
      const wood = t.scheme === "wood" || t.debris === "wood" || t.type === "breakable" ||
        t.kind === "prop" || t.material === "wood";
      S.play(wood ? "hitWood" : "hitFlesh", { pos: posOf(d), vol: d.crit ? 1.05 : 0.85 });
    });
    G.bus.on("kill", function (d) { S.play("killChime", { pos: posOf(d), vol: 0.8 }); });
    G.bus.on("breakable:burst", function (d) {
      const scheme = d && (d.scheme || d.debris);
      S.play(scheme === "wood" || scheme === "stall" ? "breakWood" : "breakShroom", { pos: posOf(d) });
    });
    G.bus.on("boss:phase", function (d) {
      const raw = d && (d.phase !== undefined ? d.phase : d.n);
      const n = clamp(isNum(raw) ? raw : 1, 1, 3) | 0;
      S.play("roar" + n);
    });
    G.bus.on("boss:step", function (d) { S.play("bossStep", { pos: posOf(d) }); });
    G.bus.on("assassin:down", function (d) {
      S.play("petal", { pos: posOf(d) });
      S.play("killChime", { vol: 0.7 });
    });
    G.bus.on("player:perfectDodge", function (d) { S.play("perfectDodge", { pos: posOf(d) }); });
  }
  bindBus();

  /* tiny self-check so a broken bus never silently kills audio */
  if (G.CONF && G.CONF.debug) {
    console.log("[sfx] recipes:", Object.keys(R).length);
  }
})();
