'use strict';
/* =====================================================================
   EINHERI — a saga of Jötunheim
   core: math, canvas, camera, audio, input, save
   ===================================================================== */
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
function angDiff(a, b) { let d = (b - a) % TAU; if (d > PI) d -= TAU; else if (d < -PI) d += TAU; return d; }
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const smooth = t => t * t * (3 - 2 * t);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, o)); }
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function hexA(h, a) { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; }
function mix(h1, h2, t) { const a = hexRGB(h1), b = hexRGB(h2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join(''); }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const $ = id => document.getElementById(id);

/* ---------------- canvas ---------------- */
const cv = $('c');
const ctx = cv.getContext('2d', { alpha: false });
let W = 0, H = 0, DPR = 1;
const LC = mkCanvas(8, 8), lctx = LC.getContext('2d');
let VIG = null, GRAIN = null, GRAINPAT = null;
const QUAL = { cap: 1.75, max: 2, acc: 0, n: 0 };
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, QUAL.cap);
  const px = W * H * DPR * DPR, cap = 2.2e6;
  if (px > cap) DPR = Math.sqrt(cap / (W * H));
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  LC.width = Math.ceil(W / 4); LC.height = Math.ceil(H / 4);
  VIG = mkCanvas(256, 256);
  const g = VIG.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 60, 128, 128, 182);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.7, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,.78)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  if (!GRAIN) {
    GRAIN = mkCanvas(160, 160);
    const gg = GRAIN.getContext('2d'), id = gg.createImageData(160, 160);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255 | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gg.putImageData(id, 0, 0);
    GRAINPAT = ctx.createPattern(GRAIN, 'repeat');
  }
}

/* ---------------- camera ---------------- */
const cam = { x: 0, y: 0, z: 1, tz: 1, span: 460, shake: 0, sx: 0, sy: 0, lock: null, lerp: 6 };
function zoomForSpan(span) { return Math.min(W, H) / span; }
function applyCam() {
  const z = cam.z * DPR;
  ctx.setTransform(z, 0, 0, z, DPR * W / 2 - (cam.x + cam.sx) * z, DPR * H / 2 - (cam.y + cam.sy) * z);
}
function w2s(x, y) { return [(x - cam.x - cam.sx) * cam.z + W / 2, (y - cam.y - cam.sy) * cam.z + H / 2]; }
function inView(x, y, m) { const hw = W / 2 / cam.z + m, hh = H / 2 / cam.z + m; return Math.abs(x - cam.x) < hw && Math.abs(y - cam.y) < hh; }
function shake(a) { cam.shake = Math.max(cam.shake, a * (SET.shake ? 1 : .2)); }

/* ---------------- glow sprites ---------------- */
const GLOWC = {};
function glowSprite(col) {
  if (GLOWC[col]) return GLOWC[col];
  const c = mkCanvas(64, 64), g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, hexA(col, 1)); gr.addColorStop(.22, hexA(col, .55)); gr.addColorStop(.55, hexA(col, .14)); gr.addColorStop(1, hexA(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return GLOWC[col] = c;
}
function glow(x, y, r, col, a = 1) {
  if (a <= 0.003) return;
  const p = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = p;
}
let HOLE = null;
function holeSprite() {
  if (HOLE) return HOLE;
  HOLE = mkCanvas(64, 64); const g = HOLE.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.45, 'rgba(0,0,0,.72)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return HOLE;
}
let FOG = null;
function fogSprite() {
  if (FOG) return FOG;
  FOG = mkCanvas(256, 256); const g = FOG.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 128 + rand(-60, 60), y = 128 + rand(-40, 40), r = rand(40, 90);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  return FOG;
}

/* ---------------- line boil (hand-drawn wobble) ---------------- */
let BOIL = 0, boilT = 0;
const wb = (i, a = 1) => (hash2(i * 1.71, BOIL * 3.13) - .5) * a;

/* ---------------- settings ---------------- */
const SET_KEY = 'einheri.settings.v1', SAVE_KEY = 'einheri.saga.v1';
const SET = { music: .7, sfx: .85, shake: true };
try { const s = JSON.parse(localStorage.getItem(SET_KEY) || 'null'); if (s) Object.assign(SET, s); } catch (e) { }
function storeSet() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { } }

/* =====================================================================
   AUDIO — everything is synthesized; nothing is loaded
   ===================================================================== */
const AU = { ctx: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { AU.ctx = new AC(); } catch (e) { return; }
  const c = AU.ctx;
  AU.comp = c.createDynamicsCompressor(); AU.comp.threshold.value = -16; AU.comp.ratio.value = 5; AU.comp.attack.value = .004; AU.comp.release.value = .2;
  AU.master = c.createGain(); AU.master.gain.value = .9;
  AU.master.connect(AU.comp); AU.comp.connect(c.destination);
  AU.sfx = c.createGain(); AU.sfx.connect(AU.master);
  AU.mus = c.createGain(); AU.mus.connect(AU.master);
  AU.rev = c.createConvolver(); AU.rev.buffer = impulse(3.2, 2.4);
  AU.revG = c.createGain(); AU.revG.gain.value = .42; AU.rev.connect(AU.revG); AU.revG.connect(AU.master);
  const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = nb;
  applyVolumes();
  if (MU.want) { const w = MU.want; MU.want = null; MU.theme = null; playMusic(w); }
  if (AMB.want) { const w = AMB.want; AMB.want = null; AMB.kind = null; ambience(w); }
}
function applyVolumes() { if (!AU.ctx) return; AU.sfx.gain.value = SET.sfx; AU.mus.gain.value = SET.music * .5; }
function impulse(sec, decay) {
  const c = AU.ctx, len = c.sampleRate * sec | 0, b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function envG(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone(type, f0, f1, dur, vol, o = {}) {
  if (!AU.ctx) return;
  const c = AU.ctx, t = (o.at || c.currentTime) + (o.delay || 0);
  const osc = c.createOscillator(); osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = c.createGain(); envG(g, t, o.a || .004, vol, dur);
  let n = osc;
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || .7; osc.connect(f); n = f; }
  n.connect(g); g.connect(o.bus || AU.sfx); if (o.rev) g.connect(AU.rev);
  osc.start(t); osc.stop(t + (o.a || .004) + dur + .05);
}
function noiz(dur, vol, ft, f0, f1, q = 1, o = {}) {
  if (!AU.ctx) return;
  const c = AU.ctx, t = (o.at || c.currentTime) + (o.delay || 0);
  const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
  const f = c.createBiquadFilter(); f.type = ft; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain(); envG(g, t, o.a || .004, vol, dur);
  s.connect(f); f.connect(g); g.connect(o.bus || AU.sfx); if (o.rev) g.connect(AU.rev);
  s.start(t, Math.random() * 1.5); s.stop(t + (o.a || .004) + dur + .05);
}
const _sfxLast = {};
function rl(name, gap) { const n = performance.now(); if (_sfxLast[name] && n - _sfxLast[name] < gap * 1000) return false; _sfxLast[name] = n; return true; }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SFX = {
  swing(p = 1) { if (!rl('sw', .04)) return; noiz(.17, .32, 'bandpass', 600 * p, 2900 * p, 1.4); },
  heavy() { noiz(.36, .55, 'bandpass', 260, 1800, .9); tone('sine', 110, 40, .32, .35); },
  hit(h = 0) { if (!rl('hit', .025)) return; tone('sine', 170, 42, .14 + h * .12, .55 + h * .25); noiz(.1 + h * .08, .38 + h * .2, 'lowpass', 3400, 380, .7); tone('square', 1300, 260, .035, .06); },
  clang() { tone('square', 1800, 1700, .12, .06, { rev: 1 }); tone('sine', 2600, 2400, .25, .07, { rev: 1 }); },
  hurt() { tone('sawtooth', 280, 70, .26, .22, { lp: 900 }); noiz(.2, .32, 'lowpass', 1600, 180); },
  dodge() { noiz(.24, .22, 'lowpass', 380, 2600, .6); },
  perfect() { tone('sine', 1500, 2900, .5, .14, { rev: 1 }); tone('triangle', 700, 1400, .6, .12, { rev: 1 }); noiz(.4, .15, 'highpass', 4000, 9000, .5, { rev: 1 }); },
  coin() { if (!rl('coin', .045)) return; tone('sine', 1760, 1760, .07, .09); tone('sine', 2640, 2640, .12, .06, { delay: .045 }); },
  wisp() { if (!rl('wisp', .06)) return; tone('sine', 820 + Math.random() * 300, 1600, .2, .045, { rev: 1 }); },
  chime(base = 64) { [0, 7, 12, 16].forEach((n, i) => tone('triangle', mtof(base + n), mtof(base + n), .9, .1, { delay: i * .08, rev: 1 })); },
  ui() { if (!rl('ui', .05)) return; tone('triangle', 640, 520, .05, .07); },
  tick() { if (!rl('tick', .03)) return; tone('triangle', 900 + Math.random() * 200, 800, .02, .025); },
  death() { noiz(.5, .32, 'lowpass', 2200, 90, .8); tone('sawtooth', 190, 38, .5, .12, { lp: 600 }); },
  slam(v = 1) { tone('sine', 72, 26, .8, .9 * v); noiz(.7, .55 * v, 'lowpass', 1000, 50, .6); },
  boom() { tone('sine', 60, 22, 1.1, .9); noiz(1.1, .6, 'lowpass', 1800, 40, .5, { rev: 1 }); },
  thunder() { noiz(1.8, .7, 'lowpass', 2600, 70, .5, { rev: 1 }); tone('sine', 52, 28, 1.3, .7); noiz(.08, .5, 'highpass', 3000, 2000, .5); },
  roar(p = 1, dur = 1.5) {
    if (!AU.ctx) return;
    const c = AU.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(80 * p, t); o.frequency.linearRampToValueAtTime(125 * p, t + .3); o.frequency.exponentialRampToValueAtTime(48 * p, t + dur);
    const l = c.createOscillator(); l.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 16 * p; l.connect(lg); lg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(1500, t + .3); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    const g = c.createGain(); envG(g, t, .08, .45, dur);
    o.connect(f); f.connect(g); g.connect(AU.sfx); g.connect(AU.rev);
    o.start(t); l.start(t); o.stop(t + dur + .2); l.stop(t + dur + .2);
    noiz(dur, .3, 'bandpass', 700 * p, 180 * p, .8, { a: .1, rev: 1 });
  },
  heal() { [0, 4, 7, 11, 14].forEach((n, i) => tone('sine', mtof(72 + n), mtof(72 + n), 1.3, .06, { delay: i * .06, rev: 1, a: .05 })); },
  horn() { tone('sawtooth', mtof(43), mtof(43), 1.5, .2, { lp: 650, a: .12, rev: 1 }); tone('sawtooth', mtof(50), mtof(50), 1.5, .13, { lp: 700, a: .2, rev: 1, detune: 6 }); },
  spear() { noiz(.5, .45, 'highpass', 2600, 700, .7); tone('triangle', 500, 1300, .35, .1, { rev: 1 }); },
  speed() { [0, 5, 9, 12, 17].forEach((n, i) => tone('triangle', mtof(69 + n), mtof(69 + n), .25, .07, { delay: i * .045, rev: 1 })); },
  trick() { tone('sine', 300, 600, .6, .1, { rev: 1, detune: 30 }); tone('sine', 310, 590, .6, .1, { rev: 1, detune: -40 }); noiz(.5, .1, 'bandpass', 1200, 3000, 8, { rev: 1 }); },
  charge() { tone('sine', 220, 660, .5, .05); },
  ready() { tone('sine', 1320, 1320, .18, .08, { rev: 1 }); tone('sine', 1980, 1980, .2, .04, { rev: 1, delay: .03 }); },
  rune() { [0, 3, 7, 10, 15].forEach((n, i) => tone('sine', mtof(57 + n), mtof(57 + n), 2.2, .07, { delay: i * .12, rev: 1, a: .08 })); },
  shatter() { if (!rl('sh', .05)) return; tone('sine', 2400, 1600, .2, .06); noiz(.22, .22, 'highpass', 5200, 2600, .8); },
  fire() { if (!rl('fire', .08)) return; noiz(.5, .3, 'bandpass', 500, 1400, .6); },
  splash() { if (!rl('spl', .08)) return; noiz(.55, .35, 'bandpass', 900, 260, .6); },
  zap() { if (!rl('zap', .05)) return; noiz(.12, .4, 'highpass', 3000, 6000, 2); tone('sawtooth', 900, 120, .15, .12); },
  hiss() { noiz(.6, .18, 'highpass', 3000, 6000, .5); },
  page() { noiz(.18, .08, 'bandpass', 2500, 1200, 1.2); },
  heart() { tone('sine', 520, 520, .2, .07, { rev: 1 }); tone('sine', 780, 780, .3, .05, { delay: .1, rev: 1 }); },
  caw() { noiz(.18, .25, 'bandpass', 1500, 900, 6); noiz(.16, .2, 'bandpass', 1400, 800, 6, { delay: .22 }); },
};

/* ---------------- music: generative modal drones, horns, lyres, drums ---------------- */
const THEMES = {
  title: { root: 38, sc: [0, 2, 3, 5, 7, 8, 10], bpm: 52, drone: [0, 7], pad: 'dark', lead: 'choir', p: .22, oct: 24 },
  hub: { root: 38, sc: [0, 2, 3, 5, 7, 9, 10], bpm: 64, drone: [0, 7], pad: 'warm', lead: 'pluck', p: .5, oct: 24 },
  iron: { root: 33, sc: [0, 1, 3, 5, 7, 8, 10], bpm: 58, drone: [0, 7], pad: 'dark', lead: 'horn', p: .14, oct: 12, drum: 'x...............x.......x.......' },
  ice: { root: 40, sc: [0, 2, 3, 5, 7, 8, 10], bpm: 56, drone: [0, 7, 12], pad: 'air', lead: 'bell', p: .3, oct: 36 },
  sea: { root: 36, sc: [0, 1, 3, 5, 7, 8, 10], bpm: 60, drone: [0, 7], pad: 'dark', lead: 'choir', p: .16, oct: 24, drum: 'x...............' },
  fire: { root: 35, sc: [0, 1, 3, 5, 6, 8, 10], bpm: 70, drone: [0, 7], pad: 'dark', lead: 'horn', p: .18, oct: 12, drum: 'x.....x.x.......' },
  boss: { root: 33, sc: [0, 1, 3, 5, 7, 8, 10], bpm: 116, drone: [0, 7], pad: 'dark', lead: 'horn', p: .3, oct: 12, drum: 'x..x..x.x..x.x..', hat: '..x...x...x...xx', bass: 1 },
  final: { root: 35, sc: [0, 1, 4, 5, 7, 8, 10], bpm: 124, drone: [0, 7], pad: 'air', lead: 'choir', p: .32, oct: 24, drum: 'x..x..x.x.x.x..x', hat: '.x.x.x.x.x.x.x.x', bass: 1 },
  sky: { root: 41, sc: [0, 2, 4, 6, 7, 9, 11], bpm: 104, drone: [0, 7], pad: 'air', lead: 'choir', p: .35, oct: 24, drum: 'x...x...x...x.x.', hat: '..x...x...x...x.', bass: 1 },
  memory: { root: 38, sc: [0, 2, 3, 5, 7, 9, 10], bpm: 48, drone: [0, 7], pad: 'warm', lead: 'pluck', p: .42, oct: 24 },
  ending: { root: 41, sc: [0, 2, 4, 5, 7, 9, 11], bpm: 54, drone: [0, 7], pad: 'air', lead: 'pluck', p: .45, oct: 24 },
  void: { root: 31, sc: [0, 1, 3, 5, 7, 8, 10], bpm: 40, drone: [0, 7, 12], pad: 'air', lead: 'choir', p: .12, oct: 24 },
  silence: null,
};
const MU = { theme: null, cfg: null, next: 0, step: 0, drone: [], note: 0, want: null };
function playMusic(name) {
  if (!AU.ctx) { MU.want = name; return; }
  if (MU.theme === name) return;
  const c = AU.ctx, t = c.currentTime;
  for (const d of MU.drone) { try { d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.linearRampToValueAtTime(0, t + 2.2); d.oscs.forEach(o => o.stop(t + 2.4)); } catch (e) { } }
  MU.drone = []; MU.theme = name; MU.cfg = THEMES[name] || null;
  if (!MU.cfg) return;
  const cf = MU.cfg; MU.next = t + .3; MU.step = 0; MU.note = 0;
  for (const iv of cf.drone) {
    const f = mtof(cf.root + iv);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = cf.pad === 'warm' ? 520 : cf.pad === 'air' ? 900 : 300; lp.Q.value = 1.5;
    const lfo = c.createOscillator(); lfo.frequency.value = .07 + Math.random() * .08;
    const lfg = c.createGain(); lfg.gain.value = lp.frequency.value * .45; lfo.connect(lfg); lfg.connect(lp.frequency);
    const g = c.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(cf.pad === 'air' ? .05 : .065, t + 3);
    const oscs = [lfo];
    for (const dt of [-7, 6]) {
      const o = c.createOscillator(); o.type = cf.pad === 'air' ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
      o.connect(lp); o.start(t); oscs.push(o);
    }
    lp.connect(g); g.connect(AU.mus); g.connect(AU.rev); lfo.start(t);
    MU.drone.push({ g, oscs });
  }
}
function voice(kind, f, t, vol) {
  const c = AU.ctx, bus = AU.mus;
  if (kind === 'pluck') {
    tone('triangle', f, f, 1.6, vol * 1.4, { at: t, lp: 2400, bus, rev: 1 });
    tone('sine', f * 2, f * 2, .7, vol * .4, { at: t, bus });
  } else if (kind === 'horn') {
    tone('sawtooth', f, f, 1.9, vol * .9, { at: t, a: .18, lp: 620, bus, rev: 1 });
    tone('sawtooth', f, f, 1.9, vol * .6, { at: t, a: .25, lp: 560, bus, rev: 1, detune: 9 });
  } else if (kind === 'bell') {
    tone('sine', f, f, 3, vol * .9, { at: t, bus, rev: 1 });
    tone('sine', f * 2.76, f * 2.76, 1.4, vol * .25, { at: t, bus, rev: 1 });
  } else if (kind === 'choir') {
    for (const d of [-12, 0, 11]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d;
      const b1 = c.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = 820; b1.Q.value = 4;
      const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol * .9, t + .7); g.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
      o.connect(b1); b1.connect(g); g.connect(bus); g.connect(AU.rev); o.start(t); o.stop(t + 3.3);
    }
  }
}
function musUpdate() {
  if (!AU.ctx || !MU.cfg) return;
  const c = AU.ctx, cf = MU.cfg, spb = 60 / cf.bpm / 4;
  if (MU.next < c.currentTime - 1) MU.next = c.currentTime + .05;
  while (MU.next < c.currentTime + .2) {
    const s = MU.step, t = MU.next;
    if (cf.drum) {
      const ch = cf.drum[s % cf.drum.length];
      if (ch === 'x') { tone('sine', 95, 38, .32, .5, { at: t, bus: AU.mus }); noiz(.06, .2, 'lowpass', 1800, 300, .7, { at: t, bus: AU.mus }); }
      else if (ch === 'o') tone('sine', 140, 70, .25, .3, { at: t, bus: AU.mus });
    }
    if (cf.hat && cf.hat[s % cf.hat.length] === 'x') noiz(.04, .07, 'highpass', 7000, 6000, .7, { at: t, bus: AU.mus });
    if (cf.bass && s % 16 === 0) { const iv = (s / 16 | 0) % 4 === 3 ? 5 : 0; tone('sawtooth', mtof(cf.root - 12 + iv), mtof(cf.root - 12 + iv), 1.2, .18, { at: t, lp: 260, bus: AU.mus }); }
    const melEvery = cf.lead === 'choir' ? 8 : 4;
    if (s % melEvery === 0 && Math.random() < cf.p) {
      MU.note = clamp(MU.note + pick([-2, -1, -1, 1, 1, 2, 0, 3, -3]), -3, 9);
      const n = MU.note, oct = Math.floor(n / cf.sc.length), deg = ((n % cf.sc.length) + cf.sc.length) % cf.sc.length;
      voice(cf.lead, mtof(cf.root + cf.oct + oct * 12 + cf.sc[deg]), t, cf.lead === 'choir' ? .05 : .07);
      if (cf.lead === 'pluck' && Math.random() < .3) voice('pluck', mtof(cf.root + cf.oct + oct * 12 + cf.sc[(deg + 2) % cf.sc.length]), t + spb * 2, .05);
    }
    MU.next += spb; MU.step++;
  }
}
/* ambient beds: wind, fire, sea */
const AMB = { kind: null, nodes: [], want: null };
function ambience(kind) {
  if (!AU.ctx) { AMB.want = kind; return; }
  if (AMB.kind === kind) return;
  const c = AU.ctx, t = c.currentTime;
  for (const n of AMB.nodes) { try { n.g.gain.linearRampToValueAtTime(0, t + 2); n.s.stop(t + 2.2); } catch (e) { } }
  AMB.nodes = []; AMB.kind = kind;
  const spec = { wind: [[400, .5, .07], [1200, .9, .03]], embers: [[260, .5, .05], [3000, .7, .012]], sea: [[300, .4, .1], [900, .6, .05]], fire: [[180, .4, .08], [1600, .9, .03]], hearth: [[220, .4, .04], [2600, .9, .015]], storm: [[350, .5, .12], [1400, .8, .05]], void: [[120, .3, .06]] }[kind];
  if (!spec) return;
  for (const [f, q, v] of spec) {
    const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const lfo = c.createOscillator(); lfo.frequency.value = .08 + Math.random() * .1; const lg = c.createGain(); lg.gain.value = f * .4; lfo.connect(lg); lg.connect(bp.frequency); lfo.start(t);
    const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(v, t + 2.5);
    s.connect(bp); bp.connect(g); g.connect(AU.sfx); s.start(t);
    AMB.nodes.push({ s, g });
  }
}

/* =====================================================================
   INPUT — touch first; pointer events so a mouse also works
   ===================================================================== */
const IN = { mx: 0, my: 0, mag: 0, sid: null, ox: 0, oy: 0, atk: false, atkJ: false, atkR: false, atkHeld: 0, dodge: false, p: [false, false], act: false };
function bindInput() {
  const zone = $('stickZone'), base = $('stickBase'), knob = $('stickKnob');
  const R = 52;
  zone.addEventListener('pointerdown', e => {
    if (IN.sid !== null) return;
    audioInit();
    IN.sid = e.pointerId; zone.setPointerCapture(e.pointerId);
    const r = zone.getBoundingClientRect();
    IN.ox = e.clientX - r.left; IN.oy = e.clientY - r.top;
    base.style.left = knob.style.left = IN.ox + 'px'; base.style.top = knob.style.top = IN.oy + 'px';
    zone.classList.add('on'); e.preventDefault();
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== IN.sid) return;
    const r = zone.getBoundingClientRect();
    let dx = e.clientX - r.left - IN.ox, dy = e.clientY - r.top - IN.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { // the base drifts after a thumb that wanders, so the stick never "bottoms out"
      const k = (d - R) / d; IN.ox += dx * k; IN.oy += dy * k; dx -= dx * k; dy -= dy * k;
      base.style.left = IN.ox + 'px'; base.style.top = IN.oy + 'px';
    }
    knob.style.left = (IN.ox + dx) + 'px'; knob.style.top = (IN.oy + dy) + 'px';
    const m = Math.min(1, Math.hypot(dx, dy) / R);
    if (m < .14) { IN.mx = IN.my = IN.mag = 0; } else { const a = Math.atan2(dy, dx); IN.mag = Math.min(1, (m - .14) / .7); IN.mx = Math.cos(a); IN.my = Math.sin(a); }
  });
  const end = e => { if (e.pointerId !== IN.sid) return; IN.sid = null; IN.mx = IN.my = IN.mag = 0; zone.classList.remove('on'); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);

  const btn = (id, down, up) => {
    const el = $(id);
    el.addEventListener('pointerdown', e => { audioInit(); el.classList.add('dn'); try { el.setPointerCapture(e.pointerId); } catch (_) { } down(); e.preventDefault(); e.stopPropagation(); });
    const u = e => { if (!el.classList.contains('dn')) return; el.classList.remove('dn'); up && up(); };
    el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('lostpointercapture', u);
    el.addEventListener('contextmenu', e => e.preventDefault());
  };
  btn('bAtk', () => { IN.atk = true; IN.atkJ = true; IN.atkHeld = 0; }, () => { IN.atk = false; IN.atkR = true; });
  btn('bDodge', () => { IN.dodge = true; });
  btn('bP1', () => { IN.p[0] = true; });
  btn('bP2', () => { IN.p[1] = true; });
  btn('bAct', () => { IN.act = true; });
  $('pauseBtn').addEventListener('click', () => { SFX.ui(); openMenu(); });
  window.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  window.addEventListener('blur', () => { IN.sid = null; IN.mx = IN.my = IN.mag = 0; IN.atk = false; $('stickZone').classList.remove('on'); if (G.playing && !G.cs && !G.menu) openMenu(); });
}
function clearPresses() { IN.atkJ = IN.atkR = IN.dodge = IN.act = false; IN.p[0] = IN.p[1] = false; }

/* =====================================================================
   SAVE
   ===================================================================== */
function newSave() {
  return {
    v: 1, stage: 0, silver: 0, maxhp: 100, deaths: 0, playT: 0,
    up: { edge: 0, mail: 0, haft: 0, focus: 0, drink: 0 },
    powers: { frigg: 0, thor: 0, heimdall: 0, freyja: 0, loki: 0, odin: 0 },
    slots: [null, null], charge: {},
    realm: {}, boss: {}, f: {}, seen: {}, feathers: 0, cloak: 0, ending: null, endings: {}, trials: {},
    cp: null,
  };
}
let S = newSave();
function store() { try { S.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) { const o = JSON.parse(s); if (o && o.v === 1) { const n = newSave(); for (const k in o) n[k] = o[k]; return n; } } } catch (e) { }
  return null;
}
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
function RS(id) { return S.realm[id] || (S.realm[id] = { runes: [0, 0], got: {}, cp: null }); }
