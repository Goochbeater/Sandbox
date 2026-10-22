/* CORE — shared helpers, flags from the URL, error reporting. Parts are concatenated in name order into one page. */
'use strict';
const G = { t: 0, dt: 0, frame: 0, paused: false, flags: {} };
(function () {
  const q = new URLSearchParams(location.search);
  for (const [k, v] of q.entries()) G.flags[k] = v === '' ? true : v;
})();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
/* deterministic noise so the room is the same every load */
const hash = (x, y = 0, z = 0) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
const noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed), hash(i + 1, seed), u); };
const $ = (id) => document.getElementById(id);
function fail(e) {
  const el = $('err'); if (!el) return; el.hidden = false;
  el.textContent += (e && (e.stack || e.message) || String(e)) + '\n';
  console.error(e);
}
window.addEventListener('error', (ev) => fail(ev.error || ev.message));
window.addEventListener('unhandledrejection', (ev) => fail(ev.reason));
function setLoad(p, msg) { const b = $('ldBar'); if (b) b.style.width = Math.round(p * 100) + '%'; if (msg && $('ldMsg')) $('ldMsg').textContent = msg; }
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
