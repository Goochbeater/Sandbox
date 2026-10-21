/* COMBAT — blade sweeps vs capsules, blaster bolts (block / deflect / perfect reflect), damage & reactions,
   style meter, attack tokens (never more than two shooters or one melee attacker at a time). */
const COMBAT = { actors: [], bolts: [], style: { n: 0, t: 0, pts: 0, rank: 0, best: 0 }, tokens: { shoot: new Set(), melee: new Set() }, kills: 0, deflects: 0 };
COMBAT.RANKS = ['', 'DARK', 'CRUEL', 'BRUTAL', 'SAVAGE', 'SITH', 'SITH LORD'];
COMBAT.reset = function () {
  for (const b of COMBAT.bolts) b.dispose(); COMBAT.bolts.length = 0;
  if (COMBAT.boomas) { for (const b of COMBAT.boomas) { R.scene.remove(b.m); R.removeLight(b.L); } COMBAT.boomas.length = 0; }
  COMBAT.actors.length = 0; COMBAT.style = { n: 0, t: 0, pts: 0, rank: 0, best: 0 }; COMBAT.tokens.shoot.clear(); COMBAT.tokens.melee.clear();
};
COMBAT.foes = () => COMBAT.actors.filter((a) => a.alive && a.team === 'foe' && !a.hidden);
/* closest point distance between segment [a,b] and segment [c,d] */
COMBAT._s = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
COMBAT._hp = new THREE.Vector3();
COMBAT.segSeg = function (a, b, c, d) {
  const T = COMBAT._s;
  const d1 = T[0].subVectors(b, a), d2 = T[1].subVectors(d, c), r = T[2].subVectors(a, c);
  const A = d1.dot(d1), E = d2.dot(d2), F = d2.dot(r);
  let s, t;
  if (A < 1e-9 && E < 1e-9) return a.distanceTo(c);
  if (A < 1e-9) { s = 0; t = clamp(F / E, 0, 1); }
  else { const C = d1.dot(r); if (E < 1e-9) { t = 0; s = clamp(-C / A, 0, 1); } else { const B = d1.dot(d2), den = A * E - B * B; s = den !== 0 ? clamp((B * F - C * E) / den, 0, 1) : 0; t = (B * s + F) / E; if (t < 0) { t = 0; s = clamp(-C / A, 0, 1); } else if (t > 1) { t = 1; s = clamp((B - C) / A, 0, 1); } } }
  const p = T[3].copy(a).addScaledVector(d1, s), q = T[4].copy(c).addScaledVector(d2, t);
  COMBAT._hp.copy(p).add(q).multiplyScalar(0.5);
  return p.distanceTo(q);
};
COMBAT._lb = new THREE.Vector3(); COMBAT._lt = new THREE.Vector3(); COMBAT._c0 = new THREE.Vector3(); COMBAT._c1 = new THREE.Vector3(); COMBAT._sb = new THREE.Vector3(); COMBAT._st = new THREE.Vector3();
/* sweep the saber's blades (mask bits) from prev segs to now; calls onHit(target, point) once per target per window */
COMBAT.sweep = function (atk, saber, mask, prev, onHit, reach) {
  const hits = [];
  for (let i = 0; i < saber.ends.length; i++) {
    if (!(mask & (1 << i)) || saber.ign[i] < 0.5) continue;
    saber.bladeSeg(i, COMBAT._sb, COMBAT._st);
    const pb = prev[i] ? prev[i].b : COMBAT._sb, pt = prev[i] ? prev[i].t : COMBAT._st;
    for (const t of COMBAT.actors) {
      if (t === atk || !t.alive || t.team === atk.team || t.hidden) continue;
      if (Math.hypot(t.x - atk.x, t.z - atk.z) > (reach || 3.6) + (t.ext || 0)) continue;
      const caps = t.caps ? t.caps() : null;   // long bodies (beasts) supply several world capsules; everyone else is one upright capsule
      let hit = false;
      for (let ci = 0; ci < (caps ? caps.length : 1) && !hit; ci++) {
        const C = caps && caps[ci], c0 = C ? COMBAT._c0.set(C[0], C[1], C[2]) : COMBAT._c0.set(t.x, t.y + 0.25, t.z), c1 = C ? COMBAT._c1.set(C[3], C[4], C[5]) : COMBAT._c1.set(t.x, t.y + t.h * 0.92, t.z);
        const rr = (C ? C[6] : t.r) + 0.06;
        for (let s = 0; s <= 3; s++) {
          const f = s / 3;
          const b = COMBAT._lb.lerpVectors(pb, COMBAT._sb, f), tp = COMBAT._lt.lerpVectors(pt, COMBAT._st, f);
          const d = COMBAT.segSeg(b, tp, c0, c1);
          if (d < rr) { hits.push({ t, p: COMBAT._hp.clone(), blade: i }); hit = true; break; }
        }
      }
    }
  }
  for (const h of hits) onHit(h.t, h.p, h.blade);
  return hits.length;
};
COMBAT.snapBlades = function (saber, out) { for (let i = 0; i < saber.ends.length; i++) { out[i] = out[i] || { b: new THREE.Vector3(), t: new THREE.Vector3() }; saber.bladeSeg(i, out[i].b, out[i].t); } return out; };
/* ---------------------------------------------------------------- damage */
COMBAT.damage = function (t, amt, info) {
  info = info || {};
  if (!t.alive || t.god) return false;
  if (t.iframe > 0 && !info.unblockable) return false;
  if (info.kind === 'exec' && t.isBoss) amt = Math.min(amt, t.hpMax * 0.15);   // a Jedi survives an execution strike: a heavy punish, not a kill (duel phases need several guard breaks)
  if (t.onDamage) { const r = t.onDamage(amt, info); if (r === false) return false; if (typeof r === 'number') amt = r; }
  t.hp -= amt; t.flash = 0.12;
  if (info.src && info.src.isPlayer && info.kind !== 'grip' && info.kind !== 'fall') COMBAT.stylePoint(info.kind === 'exec' ? 5 : amt >= 25 ? 2 : 1);
  if (t.hp <= 0) { t.hp = 0; t.alive = false; COMBAT.kill(t, info); return true; }
  if (t.react) t.react(info);
  return true;
};
COMBAT.kill = function (t, info) {
  t.alive = false; t.deadT = 0;
  COMBAT.tokens.shoot.delete(t); COMBAT.tokens.melee.delete(t);
  if (t.team === 'foe') { COMBAT.kills++; if (info.src && info.src.isPlayer) { COMBAT.stylePoint(2); PLAYER.onKill(t, info); }
    if (!t.isBoss && COMBAT.foes().length === 0 && !BOSS.list.some((b) => b.alive)) { MG.slowmo = 0.3; MG.slowmoT = 0; FX.addShake(0.2); if (t.chest) { R.shock(t.chest(V3()), 0.9); R.kick(0.6); } } }
  if (t.die) t.die(info);
};
COMBAT.stylePoint = function (p) {
  const S = COMBAT.style; S.n += 1; S.t = 3.2; S.pts += p * (1 + S.rank * 0.15);
  const th = [0, 3, 9, 18, 32, 52, 80];
  let r = 0; for (let i = 0; i < th.length; i++) if (S.pts >= th[i]) r = i; S.rank = r; S.best = Math.max(S.best, S.n);
  if (PLAYER.a) PLAYER.rage = Math.min(100, PLAYER.rage + p * (PLAYER.rageOn ? 0 : 1.6));
};
COMBAT.updateStyle = function (dt) { const S = COMBAT.style; if (S.t > 0) { S.t -= dt; if (S.t <= 0) { S.n = 0; S.pts = 0; S.rank = 0; } } else S.pts = Math.max(0, S.pts - dt * 2); };
/* ---------------------------------------------------------------- bolts */
COMBAT.boltGeo = null;
class Bolt {
  constructor(p, dir, o) {
    this.p = p.clone(); this.v = dir.clone().normalize().multiplyScalar(o.speed || 26); this.shooter = o.shooter; this.team = o.team || 'foe'; this.dmg = o.dmg || 6;
    this.t = 0; this.life = 2.6; this.dead = false; this.deflected = false; this.col = o.col || [1.0, 0.15, 0.08];
    if (!COMBAT.boltGeo) { COMBAT.boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6, 1); COMBAT.boltGeo.rotateX(Math.PI / 2); }
    const c = this.col;
    this.core = new THREE.Mesh(COMBAT.boltGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * 5 + 0.7, c[1] * 5 + 0.7, c[2] * 5 + 0.7), toneMapped: false }));   // hot core, still reads as its colour
    this.glow = new THREE.Mesh(COMBAT.boltGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * 3, c[1] * 3, c[2] * 3), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.core.scale.set(0.8, 0.8, 1.1); this.glow.scale.set(2.2, 2.2, 1.2);
    this.g = new THREE.Group(); this.g.add(this.core, this.glow); R.scene.add(this.g);
    this.L = R.addLight({ pos: this.p, col: new THREE.Color(c[0], c[1], c[2]), i: 1.2, range: 3, prio: 2, on: true });
    this.orient();
  }
  orient() { this.g.position.copy(this.p); this.g.lookAt(_v1.copy(this.p).add(this.v));
    // a bolt whipping past the lens must not bloom into a glowing log: fade it inside ~3 m of the camera
    const k = smooth(0.6, 3.2, this.p.distanceTo(R.camera.position)); if (this.k0 === undefined) { this.k0 = 1; this.c0 = this.core.material.color.clone(); this.o0 = this.glow.material.opacity; }
    if (Math.abs(k - this.k0) > 0.02) { this.k0 = k; this.core.material.color.copy(this.c0).multiplyScalar(0.15 + 0.85 * k); this.glow.material.opacity = this.o0 * k; } }
  dispose() { this.dead = true; if (this.g.parent) this.g.parent.remove(this.g); R.removeLight(this.L); }
}
COMBAT.fire = function (p, dir, o) { const b = new Bolt(p, dir, o); COMBAT.bolts.push(b); return b; };
COMBAT.updateBolts = function (dt) {
  const P = PLAYER.a;
  for (let i = COMBAT.bolts.length - 1; i >= 0; i--) {
    const b = COMBAT.bolts[i];
    if (b.dead) { COMBAT.bolts.splice(i, 1); continue; }
    b.t += dt;
    const step = b.v.length() * dt, dir = _v1.copy(b.v).normalize();
    // world
    const hit = PHY.ray(b.p.x, b.p.y, b.p.z, dir.x, dir.y, dir.z, step, 'shot');
    const np = _v2.copy(b.p).addScaledVector(b.v, dt);
    // actors
    let done = false;
    for (const a of COMBAT.actors) {
      if (!a.alive || a.team === b.team || a.hidden) continue;
      const c0 = COMBAT._c0.set(a.x, a.y + 0.2, a.z), c1 = COMBAT._c1.set(a.x, a.y + a.h * 0.95, a.z);
      const d = COMBAT.segSeg(b.p, np, c0, c1);
      // the player's deflection bubble (front arc)
      if (a === P && a.alive && PLAYER.canDeflect(b)) {
        const dd = COMBAT.segSeg(b.p, np, c0, c1);
        if (dd < a.r + 0.75) { PLAYER.deflect(b); done = true; break; }
      }
      if (d < a.r + 0.03) { COMBAT.damage(a, b.dmg, { src: b.shooter, kind: 'bolt', dir: dir.clone(), p: COMBAT._hp.clone() }); FX.spark(COMBAT._hp, dir.clone().negate(), 10, 4, [4, 1.2, 0.5]); b.dispose(); done = true; break; }
    }
    if (done) continue;
    // sabers of any blocking fighter (Jedi, player blade sweeping)
    if (hit && hit.t <= step) {
      const hp = _v3.copy(b.p).addScaledVector(dir, hit.t);
      FX.spark(hp, V3(hit.nx, hit.ny, hit.nz), 8, 3, [3, 1, 0.4]); FX.scorch(hp, V3(hit.nx, hit.ny, hit.nz), 0.22); FX.puff(hp, 2, { size: 0.12, col: [0.3, 0.3, 0.3], a: 0.35, life: 0.8 });
      b.dispose(); continue;
    }
    b.p.copy(np); b.orient();
    if (b.t > b.life) b.dispose();
  }
};
/* ---------------------------------------------------------------- tokens */
COMBAT.wantToken = function (kind, a, max) { const S = COMBAT.tokens[kind]; if (S.has(a)) return true; if (S.size >= max) return false; S.add(a); return true; };
COMBAT.freeToken = function (kind, a) { COMBAT.tokens[kind].delete(a); };
COMBAT.update = function (dt) { COMBAT.updateBolts(dt); COMBAT.updateStyle(dt); if (COMBAT.updateBoomas) COMBAT.updateBoomas(dt); };
