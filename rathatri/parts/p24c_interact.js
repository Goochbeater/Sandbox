/* INTERACT — proximity "USE" prompts for levels. LEVEL.interactable(x, y, z, r, label, fn, opts) registers a spot; when Rathatri stands within r
   (and within ±2.5 m in height) the HUD shows `label` over it, the touch USE button appears, and a tap calls fn(it). opts: { once, show() → bool, up (prompt height) }.
   Returns the item ({used, off}) so levels can remove/disable it. Hub stations, dig sites, ward stones, doors, holocrons all use this. */
LEVEL.interactable = function (x, y, z, r, label, fn, o) {
  const L = LEVEL.cur; o = o || {};
  const it = { p: V3(x, y, z), r, label, fn, once: !!o.once, show: o.show || null, up: o.up === undefined ? 1.3 : o.up, used: false, off: false };
  (L.interacts = L.interacts || []).push(it); return it;
};
LEVEL.interactTick = function () {
  const L = LEVEL.cur, P = PLAYER.a; if (!L || !L.interacts || !P || !P.alive) return;
  if (PLAYER.state !== 'move' && PLAYER.state !== 'block') { if (L.promptIsIx) { L.prompt = null; L.promptIsIx = false; } return; }
  let best = null, bd = 1e9;
  for (const it of L.interacts) {
    if (it.off || (it.once && it.used)) continue;
    const dx = it.p.x - P.x, dz = it.p.z - P.z, d = Math.hypot(dx, dz);
    if (d > it.r || Math.abs(it.p.y - P.y) > 2.5 || (it.show && !it.show())) continue;
    if (d < bd) { bd = d; best = it; }
  }
  if (best) {
    L.prompt = { p: _v5.set(best.p.x, best.p.y + best.up, best.p.z).clone(), text: best.label }; L.promptIsIx = true;
    if (IN.hit('interact') || IN.take('interact', 0.12)) { best.used = true; best.fn(best); }
  } else if (L.promptIsIx) { L.prompt = null; L.promptIsIx = false; }
};
{ const _u = LEVEL.update; LEVEL.update = function (dt) { _u(dt); LEVEL.interactTick(dt); }; }
