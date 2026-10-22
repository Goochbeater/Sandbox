/* AUDIO — music, ambience and sound effects.
   Music: real recordings (public-domain tracks in audio/*.mp3), streamed by <audio> elements and cross-faded, so they
   work from file:// as well as when hosted. Ambience and effects are synthesised with WebAudio, so they cost no
   download and never loop audibly: rain (hiss + drops + rumble), rain on glass, wind, fire (roar + crackle), birds,
   a murmuring crowd, a fountain, room tone; footsteps per floor surface, thunder, door, clang, chime, page, click.
   Everything goes through a room reverb (generated impulse) sized per room.
   Use:  AUDIO.unlock() on the first tap · AUDIO.playMusic('throne') · AUDIO.ambience({ rain: 0.8, fire: 0.4 })
         AUDIO.acoustics({ size: 2.2, wet: 0.35 }) · AUDIO.sfx('thunder', { gain: 1 }) · AUDIO.step('stone', 0.8, pan)
   Volumes (0–1) live in AUDIO.vol and are remembered in this browser. */
const AUDIO = { ctx: null, ready: false, vol: { music: 0.7, sfx: 0.85 }, tracks: {}, cur: null, beds: {}, want: {}, base: 'audio/', muted: false };
try { const v = JSON.parse(localStorage.getItem('grace.vol') || 'null'); if (v) Object.assign(AUDIO.vol, v); } catch (e) { /* storage may be blocked */ }
AUDIO.saveVol = function () { try { localStorage.setItem('grace.vol', JSON.stringify(AUDIO.vol)); } catch (e) { /* */ } AUDIO.applyVol(); };
/* the first tap: create the context and the bus graph */
AUDIO.unlock = function () {
  if (AUDIO.ctx) { if (AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = new AC(); AUDIO.ctx = c;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(c.destination);
  AUDIO.master = c.createGain(); AUDIO.master.connect(comp);
  AUDIO.sfxBus = c.createGain(); AUDIO.ambBus = c.createGain();
  AUDIO.verb = c.createConvolver(); AUDIO.wet = c.createGain(); AUDIO.wet.gain.value = 0.25; AUDIO.verb.connect(AUDIO.wet); AUDIO.wet.connect(AUDIO.master);
  for (const b of [AUDIO.sfxBus, AUDIO.ambBus]) { b.connect(AUDIO.master); b.connect(AUDIO.verb); }
  AUDIO.N = { white: AUDIO.noiseBuf('white'), pink: AUDIO.noiseBuf('pink'), brown: AUDIO.noiseBuf('brown') };
  AUDIO.acoustics({ size: 1.6, wet: 0.25 });
  AUDIO.ready = true; AUDIO.applyVol();
  setInterval(AUDIO.schedule, 60);
  document.addEventListener('visibilitychange', () => { if (!AUDIO.ctx) return; if (document.hidden) { AUDIO.ctx.suspend(); if (AUDIO.cur) AUDIO.cur.el.pause(); } else { AUDIO.ctx.resume(); if (AUDIO.cur) AUDIO.cur.el.play().catch(() => {}); } });
  for (const k in AUDIO.want) AUDIO.bed(k);
  if (AUDIO.pendingMusic) AUDIO.playMusic(AUDIO.pendingMusic);
};
AUDIO.applyVol = function () {
  if (AUDIO.ctx) { AUDIO.sfxBus.gain.value = AUDIO.vol.sfx; AUDIO.ambBus.gain.value = AUDIO.vol.sfx * 0.9; }
  for (const k in AUDIO.tracks) { const t = AUDIO.tracks[k]; t.el.volume = clamp(t.level * AUDIO.vol.music * (AUDIO.duckK || 1), 0, 1); }
};
AUDIO.noiseBuf = function (kind) {
  const c = AUDIO.ctx, n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else if (kind === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
    else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } }
  return b;
};
/* a room's reverb: exponentially decaying noise, `size` seconds long */
AUDIO.acoustics = function (o) {
  if (!AUDIO.ctx) { AUDIO.pendingAcoustics = o; return; }
  const c = AUDIO.ctx, len = Math.max(0.3, o.size || 1.5), n = Math.floor(c.sampleRate * len), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, o.decay || 3.2); }
  AUDIO.verb.buffer = b; AUDIO.wet.gain.setTargetAtTime(o.wet === undefined ? 0.25 : o.wet, c.currentTime, 0.3);
};
/* ---------------------------------------------------------------- music */
AUDIO.track = function (name) {
  if (AUDIO.tracks[name]) return AUDIO.tracks[name];
  const el = new Audio(); el.src = AUDIO.base + name + '.mp3'; el.loop = true; el.preload = 'auto'; el.volume = 0;
  return (AUDIO.tracks[name] = { el, level: 0, target: 0, name });
};
AUDIO.playMusic = function (name, fade) {
  AUDIO.pendingMusic = name; if (!AUDIO.ready) return;
  const next = name ? AUDIO.track(name) : null; if (AUDIO.cur === next) return;
  for (const k in AUDIO.tracks) AUDIO.tracks[k].target = 0;
  if (next) { next.target = 1; if (next.el.paused) { try { next.el.currentTime = 0; } catch (e) { /* */ } next.el.play().catch(() => {}); } }
  AUDIO.cur = next; AUDIO.fadeRate = 1 / (fade || 2.0);
};
AUDIO.duck = function (k) { AUDIO.duckK = k; AUDIO.applyVol(); };
/* ---------------------------------------------------------------- ambience beds */
AUDIO.ambience = function (levels) {
  for (const k in AUDIO.beds) if (!(k in levels)) AUDIO.want[k] = 0;
  for (const k in levels) AUDIO.want[k] = levels[k];
  if (AUDIO.ready) for (const k in levels) AUDIO.bed(k);
};
AUDIO.loopSrc = function (buf, rate) { const s = AUDIO.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate || 1; s.loopStart = Math.random(); s.start(0, Math.random() * 2); return s; };
AUDIO.filt = function (type, f, q) { const n = AUDIO.ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
AUDIO.chain = function (...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; };
AUDIO.bed = function (kind) {
  if (AUDIO.beds[kind]) return AUDIO.beds[kind];
  const c = AUDIO.ctx, out = c.createGain(); out.gain.value = 0; out.connect(AUDIO.ambBus);
  const B = { out, level: 0, kind, mods: [] };
  const N = AUDIO.N, F = AUDIO.filt;
  if (kind === 'rain' || kind === 'rainGlass') {
    const glass = kind === 'rainGlass';
    const hiss = AUDIO.chain(AUDIO.loopSrc(N.pink), F('highpass', glass ? 300 : 500), F('lowpass', glass ? 1800 : 7000), c.createGain()); hiss.gain.value = glass ? 0.35 : 0.55; hiss.connect(out);
    const rum = AUDIO.chain(AUDIO.loopSrc(N.brown), F('lowpass', 140), c.createGain()); rum.gain.value = glass ? 0.25 : 0.4; rum.connect(out);
    B.drops = glass ? 9 : 26;
  } else if (kind === 'wind') {
    const bp = F('bandpass', 420, 0.8), g = c.createGain(); g.gain.value = 0.5; AUDIO.chain(AUDIO.loopSrc(N.brown, 0.7), bp, g, out);
    B.mods.push((t) => { bp.frequency.value = 300 + 260 * (0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.07 + 1)); g.gain.value = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.13 + 2)); });
  } else if (kind === 'fire') {
    const roar = AUDIO.chain(AUDIO.loopSrc(N.brown), F('lowpass', 520), c.createGain()); roar.gain.value = 0.45; roar.connect(out);
    B.crackle = 14;
  } else if (kind === 'crowd') {
    for (const [f, q] of [[320, 4], [560, 4], [900, 5], [1350, 6]]) { const bp = F('bandpass', f, q), g = c.createGain(); g.gain.value = 0; AUDIO.chain(AUDIO.loopSrc(N.pink, 0.9 + Math.random() * 0.2), bp, g, out);
      let v = 0.5; B.mods.push((t, dt) => { v = clamp(v + (Math.random() - 0.5) * dt * 3, 0.1, 1); g.gain.value = v * 0.9; bp.frequency.value = f * (0.94 + 0.12 * Math.sin(t * (1 + f / 900))); }); }
  } else if (kind === 'fountain') {
    const bp = F('bandpass', 2400, 0.7), g = c.createGain(); AUDIO.chain(AUDIO.loopSrc(N.white), bp, g, out);
    const lo = AUDIO.chain(AUDIO.loopSrc(N.pink), F('lowpass', 700), c.createGain()); lo.gain.value = 0.4; lo.connect(out);
    B.mods.push(() => { g.gain.value = 0.22 + Math.random() * 0.12; });
  } else if (kind === 'tone') {
    const g = AUDIO.chain(AUDIO.loopSrc(N.brown, 0.6), F('lowpass', 180), c.createGain()); g.gain.value = 0.6; g.connect(out);
  } else if (kind === 'birds') { B.birds = true; }
  else if (kind === 'clangs') { B.clangs = true; }
  return (AUDIO.beds[kind] = B);
};
/* the 60 ms scheduler: fades, modulation, and the random events (drops, crackles, birdsong, distant thunder) */
AUDIO.schedule = function () {
  const c = AUDIO.ctx; if (!c || c.state !== 'running') return;
  const t = c.currentTime, dt = 0.06;
  for (const k in AUDIO.tracks) { const T = AUDIO.tracks[k]; if (T.level === T.target) continue;
    T.level = T.target > T.level ? Math.min(T.target, T.level + dt * AUDIO.fadeRate) : Math.max(T.target, T.level - dt * AUDIO.fadeRate);
    T.el.volume = clamp(T.level * AUDIO.vol.music * (AUDIO.duckK || 1), 0, 1); if (T.level === 0 && !T.el.paused) T.el.pause(); }
  for (const k in AUDIO.beds) { const B = AUDIO.beds[k], w = AUDIO.want[k] || 0;
    B.level += clamp(w - B.level, -dt * 0.6, dt * 0.6); B.out.gain.value = B.level;
    if (B.level < 0.01) continue;
    for (const m of B.mods) m(t, dt);
    if (B.drops && Math.random() < B.drops * dt * B.level) AUDIO.drop(B.out, t + Math.random() * dt, B.kind === 'rainGlass');
    if (B.crackle && Math.random() < B.crackle * dt) AUDIO.crackle(B.out, t + Math.random() * dt);
    if (B.birds && Math.random() < 0.55 * dt * B.level) AUDIO.bird(B.out, t + Math.random() * 0.05);
    if (B.clangs && Math.random() < 0.9 * dt * B.level) AUDIO.sfx('clang', { gain: 0.18 + Math.random() * 0.2, pan: (Math.random() - 0.5) * 0.8, out: B.out }); }
};
AUDIO.burst = function (out, when, dur, type, freq, q, gain, buf) {
  const c = AUDIO.ctx, s = c.createBufferSource(); s.buffer = buf || AUDIO.N.white; const f = AUDIO.filt(type, freq, q), g = c.createGain();
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
  AUDIO.chain(s, f, g, out); s.start(when, Math.random() * 2, dur + 0.05); return g;
};
AUDIO.drop = (out, when, glass) => AUDIO.burst(out, when, 0.03 + Math.random() * 0.03, 'bandpass', (glass ? 1800 : 2600) + Math.random() * 2600, 4, 0.12 + Math.random() * 0.25);
AUDIO.crackle = (out, when) => { const big = Math.random() < 0.15; AUDIO.burst(out, when, big ? 0.05 : 0.012, big ? 'bandpass' : 'highpass', big ? 900 : 2200, 1.5, big ? 0.7 : 0.25 + Math.random() * 0.35); };
AUDIO.bird = function (out, when) {
  const c = AUDIO.ctx, pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(out); }
  const dest = pan || out, kind = Math.random(), base = 2400 + Math.random() * 2200, notes = 2 + Math.floor(Math.random() * 5);
  for (let i = 0; i < notes; i++) { const o = c.createOscillator(), g = c.createGain(), t0 = when + i * (kind < 0.5 ? 0.09 : 0.16), d = kind < 0.5 ? 0.06 : 0.12;
    o.type = 'sine'; o.frequency.setValueAtTime(base * (kind < 0.5 ? 1 : 0.8), t0); o.frequency.exponentialRampToValueAtTime(base * (kind < 0.5 ? 1.35 : 1.1 + Math.random() * 0.3), t0 + d * 0.7);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.06, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t0 + d);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + d + 0.02); }
};
/* ---------------------------------------------------------------- effects */
AUDIO.sfx = function (name, o) {
  const c = AUDIO.ctx; if (!c || c.state !== 'running') return; o = o || {};
  const t = c.currentTime + (o.delay || 0), gain = (o.gain === undefined ? 1 : o.gain);
  let out = o.out || AUDIO.sfxBus;
  if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); p.connect(out); out = p; }
  if (name === 'thunder') {
    const g = c.createGain(), lp = AUDIO.filt('lowpass', 900); const s = c.createBufferSource(); s.buffer = AUDIO.N.brown;
    lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(120, t + 3.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.6 * gain, t + 0.08); g.gain.exponentialRampToValueAtTime(0.4 * gain, t + 0.9); g.gain.exponentialRampToValueAtTime(0.001, t + 5.5);
    AUDIO.chain(s, lp, g, out); s.start(t, Math.random(), 6);
    for (let i = 0; i < 5; i++) AUDIO.burst(out, t + Math.random() * 0.4, 0.2, 'lowpass', 600, 1, 0.5 * gain, AUDIO.N.brown);
  } else if (name === 'step') {
    const k = o.surface || 'stone', g = gain * (0.85 + Math.random() * 0.3);
    if (k === 'wood') { AUDIO.burst(out, t, 0.09, 'lowpass', 420 + Math.random() * 120, 2, 0.9 * g, AUDIO.N.pink); AUDIO.burst(out, t + 0.005, 0.03, 'bandpass', 1200, 3, 0.25 * g); }
    else if (k === 'grass' || k === 'gravel' || k === 'sand') { AUDIO.burst(out, t, k === 'gravel' ? 0.12 : 0.1, 'bandpass', k === 'gravel' ? 3200 : k === 'sand' ? 1400 : 2200, 0.9, (k === 'gravel' ? 0.5 : 0.35) * g); AUDIO.burst(out, t, 0.06, 'lowpass', 300, 1, 0.3 * g, AUDIO.N.brown); }
    else { AUDIO.burst(out, t, 0.05, 'bandpass', 1900 + Math.random() * 500, 2.5, 0.55 * g); AUDIO.burst(out, t, 0.07, 'lowpass', 260, 1, 0.6 * g, AUDIO.N.brown); }
  } else if (name === 'clang') {
    for (const [f, d] of [[2200, 0.5], [3150, 0.35], [4700, 0.25], [1250, 0.6]]) { const os = c.createOscillator(), g = c.createGain(); os.type = 'triangle'; os.frequency.value = f * (0.97 + Math.random() * 0.06);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12 * gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d); os.connect(g); g.connect(out); os.start(t); os.stop(t + d + 0.05); }
    AUDIO.burst(out, t, 0.06, 'highpass', 2500, 1, 0.5 * gain);
  } else if (name === 'chime') {
    [0, 0.09, 0.2].forEach((dt, i) => { const os = c.createOscillator(), g = c.createGain(), f = [1318, 1760, 2637][i]; os.type = 'sine'; os.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dt); g.gain.linearRampToValueAtTime(0.16 * gain, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 1.6); os.connect(g); g.connect(out); os.start(t + dt); os.stop(t + dt + 1.7); });
  } else if (name === 'door') {
    const os = c.createOscillator(), bp = AUDIO.filt('bandpass', 380, 6), g = c.createGain(); os.type = 'sawtooth'; os.frequency.setValueAtTime(70, t);
    for (let i = 0; i < 8; i++) os.frequency.linearRampToValueAtTime(60 + Math.random() * 40, t + 0.08 * (i + 1));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2 * gain, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 0.75); AUDIO.chain(os, bp, g, out); os.start(t); os.stop(t + 0.8);
    AUDIO.burst(out, t + 0.75, 0.25, 'lowpass', 200, 1, 0.9 * gain, AUDIO.N.brown);
  } else if (name === 'page') { AUDIO.burst(out, t, 0.18, 'bandpass', 3500, 0.7, 0.35 * gain, AUDIO.N.pink); AUDIO.burst(out, t + 0.06, 0.12, 'bandpass', 5200, 0.9, 0.2 * gain); }
  else if (name === 'click') { const os = c.createOscillator(), g = c.createGain(); os.frequency.value = 1400; g.gain.setValueAtTime(0.12 * gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); os.connect(g); g.connect(out); os.start(t); os.stop(t + 0.08); }
  else if (name === 'drum') { const os = c.createOscillator(), g = c.createGain(); os.frequency.setValueAtTime(120, t); os.frequency.exponentialRampToValueAtTime(48, t + 0.25); g.gain.setValueAtTime(0.9 * gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); os.connect(g); g.connect(out); os.start(t); os.stop(t + 0.55); AUDIO.burst(out, t, 0.08, 'lowpass', 900, 1, 0.4 * gain, AUDIO.N.pink); }
  else if (name === 'whoosh') { const s = c.createBufferSource(); s.buffer = AUDIO.N.pink; const f = AUDIO.filt('bandpass', 400, 1.2), g = c.createGain(); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * gain, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.7); AUDIO.chain(s, f, g, out); s.start(t, 0, 0.8); }
  else if (name === 'coin') { const a = new Audio(AUDIO.base + 'coin.mp3'); a.volume = clamp(0.8 * gain * AUDIO.vol.sfx, 0, 1); a.play().catch(() => {}); }
};
/* footsteps: called by actors on each foot contact; quieter and panned with distance from the frame's centre */
AUDIO.step = function (surface, x, z) {
  if (!AUDIO.ready) return; const dx = x - R.cam.position.x, k = clamp(1 - Math.abs(dx) / 14, 0, 1) * clamp(1 - Math.abs(z - (SCENE.room ? SCENE.room.KZ : 0)) / 8, 0.4, 1);
  if (k > 0.05) AUDIO.sfx('step', { surface, gain: 0.55 * k, pan: clamp(dx / 10, -0.8, 0.8) });
};
