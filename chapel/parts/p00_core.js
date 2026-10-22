'use strict';
/* DARTH MAUL · SITH APPRENTICE — core: namespace, flags, math, rng, noise, timers, loader. */
const MG = {
  VERSION: 'SITH APPRENTICE · build @@BUILD@@',
  flags: {}, ready: false, bootError: null, errors: [],
  t: 0, rt: 0, dt: 1 / 60, frame: 0, paused: false, timeScale: 1, hitStop: 0,
  state: 'boot', // boot | title | play | cine | pause | dead | result
};
(function () {
  const q = new URLSearchParams(location.search);
  for (const [k, v] of q) MG.flags[k] = v === '' ? true : (isNaN(+v) ? v : +v);
  MG.test = !!MG.flags.test; MG.dbg = !!MG.flags.dbg;
  MG.headless = navigator.webdriver === true;
  window.addEventListener('error', (e) => { MG.errors.push(String(e.message || e) + ' @' + (e.lineno || '')); });
  window.addEventListener('unhandledrejection', (e) => { MG.errors.push('REJECT ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
})();

const TAU = Math.PI * 2, PI = Math.PI, HALF = Math.PI / 2, D2R = Math.PI / 180;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sat = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
const lerp = (a, b, t) => a + (b - a) * t;
const invl = (a, b, x) => (x - a) / (b - a);
const smooth = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const dampA = (a, b, k, dt) => a + wrapA(b - a) * (1 - Math.exp(-k * dt));
const easeIO = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeIOC = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const sgn = (x) => x < 0 ? -1 : 1;

function mulberry(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = mulberry(19990519);
const rnd = (a = 0, b = 1) => a + (b - a) * RNG();
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(RNG() * arr.length) % arr.length];
function hash3(x, y, z) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function hash2(x, y) { return hash3(x, y, 7); }
function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz); const h = hash3, L = lerp;
  const a = L(h(ix, iy, iz), h(ix + 1, iy, iz), ux), b = L(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), ux);
  const c = L(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), ux), d = L(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), ux);
  return L(L(a, b, uy), L(c, d, uy), uz);
}
function vnoise2(x, y) { return vnoise3(x, y, 0.5); }
function fbm2(x, y, oct = 4) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise2(x, y); n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return s / n; }
function fbm3(x, y, z, oct = 4) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise3(x, y, z); n += a; x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; } return s / n; }

/* small array-vector helpers (build-time geometry) */
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]), norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  mx: (a) => [-a[0], a[1], a[2]],
};
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _e1 = new THREE.Euler();
const YUP = new THREE.Vector3(0, 1, 0);

MG.timers = [];
MG.after = function (sec, fn, real) { MG.timers.push({ t: (real ? MG.rt : MG.t) + sec, fn, real: !!real }); };
MG.runTimers = function () {
  if (!MG.timers.length) return;
  const keep = [], due = [];
  for (const x of MG.timers) ((x.real ? MG.rt : MG.t) >= x.t ? due : keep).push(x);
  if (!due.length) return;
  MG.timers = keep;
  for (const d of due) { try { d.fn(); } catch (e) { console.error(e); MG.errors.push(String(e.stack || e)); } }
};
MG.yield = function () { return new Promise((res) => { const mc = new MessageChannel(); mc.port1.onmessage = () => res(); mc.port2.postMessage(0); }); };
MG.loadUI = async function (p, msg) {
  const b = document.getElementById('ldBar'); if (b) b.style.width = (sat(p) * 100).toFixed(1) + '%';
  const t = document.getElementById('ldMsg'); if (t && msg) t.textContent = msg;
  await MG.yield();
};
MG.fail = function (e) {
  const m = String(e && (e.stack || e.message) || e);
  MG.bootError = m; console.error(m);
  const el = document.getElementById('err'); el.style.display = 'block'; el.textContent = 'DARTH MAUL failed to start:\n' + m;
};
MG.$ = (id) => document.getElementById(id);
/* deterministic per-name random stream (so a level builds the same each time) */
MG.rs = (name) => { let h = 2166136261; for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619); return mulberry(h >>> 0); };
