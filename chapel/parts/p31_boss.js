/* BOSSES — Jedi duellists (Qui-Gon Jinn, Obi-Wan Kenobi) and Alexi Garyn of Black Sun.
   Jedi: telegraphed 2–3 hit strings, blocking with a guard meter (break it → stun → execution window),
   occasional parries, Force push, leaps, and saber locks you win by mashing attack. */
const BOSS = { list: [], lockT: null, update: null };
const JG = { hq: [-0.02, 1.12, 0.3], ha: [0.12, 0.92, 0.36] };   // Jedi guard: hilt, blade dir
const J2 = (t, h, a, x) => K(t, h, a, Object.assign({ g: 'both', oL: -0.075, oR: 0.02 }, x || {}));
MOV.jedi = {
  guard: { loop: true, keys: [J2(0, JG.hq, JG.ha, { st: 'guard', cr: 0.1, tw: -0.25, headYaw: 0.22, pi: 0.05 }), J2(1.4, [-0.02, 1.14, 0.31], [0.1, 0.94, 0.33], { cr: 0.085 }), J2(2.8, JG.hq, JG.ha, { cr: 0.1 })] },
  run: { loop: true, keys: [J2(0, [-0.25, 1.0, 0.05], [-0.3, 0.2, -1], { g: 'R', oR: 0.02, st: 'neutral', fl: [0.26, 0.98, 0.05], cr: 0.05, pi: 0.08 })] },
  // strikes: wind (telegraph) → strike. ev = [t0,t1,mask,dmg,kind]
  over: { dur: 0.95, ev: [[0.48, 0.66, 1, 16, 'jedi']], move: [[0.4, 0], [0.62, 0.7]],
    keys: [J2(0, JG.hq, JG.ha, { st: 'guard', cr: 0.1, tw: -0.25 }), J2(0.42, [0.04, 1.62, 0.1], [-0.3, 0.55, -0.78], { tw: 0.2, pi: -0.2, cr: 0.06 }), J2(0.58, [0.0, 1.2, 0.55], [0.3, -0.25, 0.92], { tw: -0.35, pi: 0.35, cr: 0.2, st: 'lungeL' }),
      J2(0.95, JG.hq, JG.ha, { tw: -0.25, pi: 0.05, cr: 0.1, st: 'guard' })] },
  side: { dur: 0.85, ev: [[0.4, 0.58, 1, 14, 'jedi']], move: [[0.35, 0], [0.55, 0.5]],
    keys: [J2(0, JG.hq, JG.ha, { st: 'guard', cr: 0.1, tw: -0.25 }), J2(0.36, [0.22, 1.35, 0.1], [0.75, 0.35, -0.55], { tw: 0.65, cr: 0.12 }), J2(0.5, [0.0, 1.25, 0.5], [0.0, 0.1, 1], { tw: 0.0, pi: 0.2, st: 'lungeL' }),
      J2(0.6, [-0.2, 1.2, 0.35], [-0.9, 0.1, 0.3], { tw: -0.7 }), J2(0.85, JG.hq, JG.ha, { tw: -0.25, pi: 0.05, st: 'guard' })] },
  thrust: { dur: 0.9, ev: [[0.46, 0.62, 1, 18, 'jedi']], move: [[0.42, 0], [0.58, 1.6]],
    keys: [J2(0, JG.hq, JG.ha, { st: 'guard', cr: 0.1 }), J2(0.4, [-0.12, 1.15, 0.0], [0.05, 0.08, 1], { tw: -0.5, cr: 0.16, pi: 0.05 }), J2(0.56, [0.0, 1.25, 0.66], [0.0, 0.05, 1], { tw: 0.15, st: 'lungeL', pi: 0.35, cr: 0.2 }),
      J2(0.9, JG.hq, JG.ha, { tw: -0.25, pi: 0.05, st: 'guard', cr: 0.1 })] },
  spin: { dur: 1.0, ev: [[0.42, 0.72, 1, 15, 'jedi']], move: [[0.36, 0], [0.7, 1.1]],
    keys: [J2(0, JG.hq, JG.ha, { st: 'guard', cr: 0.1, yaw: 0 }), J2(0.36, [0.1, 1.2, 0.2], [0.8, 0.3, -0.4], { tw: 0.5, cr: 0.16, st: 'spin' })]
      .concat(MOV.spin(0.4, 0.72, 5, (u) => ({ yaw: -u * TAU, h: [0.0, 1.2, 0.42], a: [0.95, 0.05, 0.3], tw: 0.1 })))
      .concat([J2(1.0, JG.hq, JG.ha, { yaw: -TAU, st: 'guard', tw: -0.25, cr: 0.1 })]) },
  leap: { dur: 1.1, ev: [[0.72, 0.9, 1, 22, 'jedi']], keys: [J2(0, JG.hq, JG.ha, { st: 'guard', cr: 0.1 }), J2(0.2, [0.0, 1.0, 0.2], [0.2, 0.9, -0.3], { cr: 0.3, pi: 0.2 }),
    J2(0.45, [0.0, 1.7, 0.0], [0.0, 0.4, -0.9], { cr: 0.05, air: 1, liftL: 0.8, liftR: 0.6, flip: 0.5 }), J2(0.8, [0.0, 1.05, 0.6], [0.0, -0.7, 0.72], { air: 1, pi: 0.5, cr: 0.25, flip: 0.1 }), J2(1.1, JG.hq, JG.ha, { air: 0, liftL: 0, liftR: 0, flip: 0, pi: 0.05, cr: 0.1, st: 'guard' })] },
  blockMid: { keys: [J2(0, [0.02, 1.25, 0.4], [0.35, 0.92, 0.1], { st: 'guard', cr: 0.14, tw: -0.1 })] },
  blockHi: { keys: [J2(0, [0.0, 1.52, 0.35], [1, 0.22, 0.05], { st: 'wide', cr: 0.18, tw: 0 })] },
  blockLo: { keys: [J2(0, [-0.05, 0.98, 0.42], [0.2, -0.95, 0.2], { st: 'wide', cr: 0.22, tw: -0.2, pi: 0.15 })] },
  parry: { dur: 0.45, keys: [J2(0, [0.02, 1.25, 0.4], [0.35, 0.92, 0.1], { st: 'guard', cr: 0.14 }), J2(0.1, [0.2, 1.35, 0.45], [0.9, 0.4, -0.2], { tw: 0.5 }), J2(0.45, JG.hq, JG.ha, { tw: -0.25, cr: 0.1 })] },
  push: { dur: 0.8, keys: [J2(0, JG.hq, JG.ha, { st: 'guard' }), J2(0.3, [-0.3, 1.05, 0.0], [0.05, 0.9, 0.3], { g: 'R', oR: 0.02, fl: [0.28, 1.25, -0.05], tw: 0.4, cr: 0.14 }), J2(0.45, [-0.3, 1.05, 0.0], [0.05, 0.9, 0.3], { g: 'R', fl: [0.1, 1.4, 0.62], tw: -0.25, st: 'lungeL', pi: 0.2 }),
    J2(0.8, JG.hq, JG.ha, { g: 'both', tw: -0.25, st: 'guard', pi: 0.05 })] },
  hit: { dur: 0.42, keys: [J2(0, JG.hq, JG.ha, { st: 'guard' }), J2(0.1, [0.05, 1.2, 0.15], [0.4, 0.85, -0.3], { pi: -0.3, tw: 0.35, headPitch: -0.3, st: 'back', cr: 0.14 }), J2(0.42, JG.hq, JG.ha, { pi: 0.05, tw: -0.25, headPitch: 0, st: 'guard', cr: 0.1 })] },
  stun: { loop: true, keys: [J2(0, [-0.2, 0.9, 0.2], [0.4, -0.5, 0.7], { g: 'R', oR: 0.02, fl: [0.3, 1.0, 0.25], st: 'wide', cr: 0.26, pi: 0.35, headPitch: 0.3 }), J2(0.7, [-0.2, 0.92, 0.2], [0.4, -0.5, 0.7], { cr: 0.3, lean: 0.12 }), J2(1.4, [-0.2, 0.9, 0.2], [0.4, -0.5, 0.7], { cr: 0.26, lean: -0.1 })] },
  knock: MOV.maul.knock, death: MOV.maul.death,
  lock: { loop: true, keys: [J2(0, [0.0, 1.35, 0.42], [0.55, 0.8, 0.2], { st: 'lungeL', cr: 0.2, pi: 0.3, tw: 0 }), J2(0.3, [0.0, 1.36, 0.44], [0.6, 0.78, 0.2], { cr: 0.22 }), J2(0.6, [0.0, 1.35, 0.42], [0.55, 0.8, 0.2], { cr: 0.2 })] },
  kneel: { loop: true, keys: [J2(0, [-0.25, 0.7, 0.3], [0.2, -0.3, 0.9], { g: 'R', oR: 0.02, fL: [0.13, 0, 0.3], fR: [-0.13, 0, -0.32], toeR: 0.9, cr: 0.5, pi: 0.2, headPitch: 0.3, fl: [0.25, 0.8, 0.2] })] },
};
MOV.maul.lock = { loop: true, keys: [K(0, [0.0, 1.35, 0.42], [-0.6, 0.78, 0.2], { g: 'both', st: 'lungeL', cr: 0.2, pi: 0.3, tw: 0 }), K(0.3, [0.0, 1.36, 0.44], [-0.62, 0.76, 0.2], { cr: 0.22 }), K(0.6, [0.0, 1.35, 0.42], [-0.6, 0.78, 0.2], { cr: 0.2 })] };
/* ------------------------------------------------------------------ Jedi */
class Jedi extends Actor {
  static _m = new THREE.Matrix4();
  constructor(who, o) {
    const T = CHAR.T[o.tpl || who];
    const base = { quigon: 640, obiwan: 560, darsha: 400, holo: 95 }[who] || 500;
    const hp = base * (MG.difficulty === 'easy' ? 0.65 : MG.difficulty === 'hard' ? 1.35 : 1) * (o.hpMul || 1);
    super(T, Object.assign({ hp, team: 'foe', moves: MOV.jedi, r: 0.34, h: 1.85 }, o));
    this.who = who; this.isBoss = true; this.noExec = true; this.drain = 20; this.edgeGuard = true;
    this.saber = new Saber(who === 'quigon' ? 'quigon' : 'obiwan', o.color || (who === 'quigon' ? 'green' : 'blue'), { prio: o.holo ? 2 : 4 }); this.saber.addTo(R.scene); this.saber.ignite(undefined, true); this.saber.ign = [1];
    if (o.holo) { this.holo = true; this.noExec = false; this.isBoss = false; this.drain = 6; for (const me of this.inst.meshes) { me.material = CM.holoSkinned(); me.castShadow = false; } if (this.inst.cloth) for (const P of this.inst.cloth.panels) { P.mesh.material = CM.holoSkinned(); P.mesh.castShadow = false; } for (const k in this.inst.att) for (const a of this.inst.att[k]) a.visible = false; this.aggr = 0.55; this.guardMax = 45; this.guard = 45; this.pushCd = 99; }
    this.setProp(this.saber, false);
    this.guardMax = 100; this.guard = 100; this.guardRegen = 0; this.state = 'duel'; this.stT = 0; this.cd = rnd(1.2, 2.2); this.pushCd = rnd(6, 10); this.combo = [];
    this.strafe = 1; this.strafeT = 2; this.aggr = o.aggr !== undefined ? o.aggr : 1; this.prevSegs = []; this.name = { quigon: 'QUI-GON JINN', obiwan: 'OBI-WAN KENOBI', darsha: 'DARSHA ASSANT', holo: 'JEDI SHADOW' }[who] || 'JEDI';
    this.onActEnd = (n) => this.actEnd(n); this.react = (i) => this.onHit(i); this.die = (i) => this.onDie(i);
    this.base = 'guard';
    BOSS.list.push(this); COMBAT.actors.push(this);
    this.physics(0); this.animate(0.016); this.pose3D(0.016); this.saber.update(0, 0);
  }
  get P() { return PLAYER.a; }
  update(dt) {
    const P = this.P; this.stT += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.holo && CM.cache.holo && CM.cache.holo.userData.sh) CM.cache.holo.userData.sh.uniforms.uT.value = MG.t;
    if (this.hidden) return;
    this.guardRegen -= dt; if (this.guardRegen <= 0 && this.state !== 'stun') this.guard = Math.min(this.guardMax, this.guard + dt * 22);
    if (!this.alive) { this.physics(dt); this.animate(dt); this.pose3D(dt); this.saber.update(dt, MG.t); return; }
    if (this.passive) { this.vx *= 0.8; this.vz *= 0.8; }
    else if (this.state === 'duel') {
      this.think(dt);
      // anticipation: during the player's strike windows, the blade comes up to meet his before contact
      const Pa = PLAYER.a, c = Pa && Pa.actClip;
      if (Pa && PLAYER.state === 'attack' && c && c.ev && !this.holo && this.guard > 0 && Pa.dist(this) < 3.2 && Math.abs(wrapA(this.angTo(Pa) - this.yaw)) < 1.3
        && !(this.act && ['over', 'side', 'thrust', 'spin', 'leap', 'push', 'parry'].includes(this.act))) {
        const t = Pa.actT, near = c.ev.some((e) => t > e[0] - 0.14 && t < e[1] + 0.02);
        if (near && MG.t - (this._btr || 0) > 0.05) { this._btr = MG.t; this.blockAt(Pa, null, true); }
      }
    }
    else if (this.state === 'stun') { this.vx = this.vz = 0; if (this.stT > 2.4) { this.stunned = false; this.stop(); this.state = 'duel'; this.guard = this.guardMax * 0.6; this.cd = 0.4; } }
    else if (this.state === 'hit' || this.state === 'knock') { this.vx *= 0.88; this.vz *= 0.88; if (!this.act) { this.state = 'duel'; this.cd = Math.min(this.cd, 0.6); } }
    else if (this.state === 'lock') { this.vx = this.vz = 0; }
    this.speed = Math.hypot(this.vx, this.vz);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    if (this.speed > 0.1) { this.mvx = (this.vx * cy - this.vz * sy) / this.speed; this.mvz = (this.vx * sy + this.vz * cy) / this.speed; }
    // root motion for strikes
    if (this.act && this.actClip.move) { const m = PLAYER.rootMove(this.actClip, this.actT) * this.moveK; const dm = m - (this.movePrev || 0); this.movePrev = m; if (dm > 0) this.moveH(Math.sin(this.yaw) * dm, Math.cos(this.yaw) * dm); }
    for (const o of COMBAT.actors) { if (o === this || !o.alive || o.hidden) continue; const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz), duel = o.isPlayer && !this.holo, m = duel ? 1.12 : this.r + o.r + 0.2;
      if (d < m && d > 1e-4) { const k = (m - d) / d; if (duel) { this.moveH(dx * k * 0.6, dz * k * 0.6); if (o.state !== 'exec' && PLAYER.state !== 'exec') o.moveH(-dx * k * 0.4, -dz * k * 0.4); } else this.moveH(dx * k * 0.5, dz * k * 0.5); } }   // duellists keep blade distance
    this.physics(dt);
    if (LEVEL.cur && this.y < LEVEL.cur.killY) { this.x = this.home ? this.home[0] : 0; this.z = this.home ? this.home[1] : 0; this.y = (PHY.ground(this.x, this.z, 0.3, 100, -100) || 0) + 0.1; this.vy = 0; }
    this.animate(dt);
    this.pose3D(dt);
    this.saber.update(dt, MG.t);
    this.saber.sampleTrails(MG.t, this.act && ['over', 'side', 'thrust', 'spin', 'leap', 'parry'].includes(this.act) ? 1 : 0);
    this.strikeCheck(dt);
  }
  think(dt) {
    const P = this.P; if (!P || !P.alive) { this.vx *= 0.9; this.vz *= 0.9; return; }
    const d = this.dist(P);
    this.yaw = dampA(this.yaw, this.angTo(P), this.act ? 3 : 9, dt);
    if (this.act && this.act !== 'blockMid' && this.act !== 'blockHi' && this.act !== 'blockLo' && this.act !== 'blockDyn') { this.vx *= 0.85; this.vz *= 0.85; return; }
    // footwork
    const other = BOSS.list.find((b) => b !== this && b.alive && !b.passive);
    const myTurn = !other || !other.act || !['over', 'side', 'thrust', 'spin', 'leap'].includes(other.act);
    const want = myTurn ? 2.3 : 4.2;
    this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(1.2, 2.8); }
    const ax = (P.x - this.x) / (d || 1), az = (P.z - this.z) / (d || 1);
    let fx = 0, fz = 0; if (d > want + 0.4) { fx += ax; fz += az; } else if (d < want - 0.5) { fx -= ax * 0.7; fz -= az * 0.7; }
    fx += -az * this.strafe * 0.55; fz += ax * this.strafe * 0.55;
    const spd = d > 7 ? 5.2 : 2.6, L = Math.hypot(fx, fz) || 1;
    this.vx = damp(this.vx, fx / L * spd, 6, dt); this.vz = damp(this.vz, fz / L * spd, 6, dt);
    this.setBase(d > 7 ? 'run' : 'guard');
    if (this.act === 'blockMid' || this.act === 'blockHi' || this.act === 'blockLo' || this.act === 'blockDyn') { if (this.stT > 0.35) this.stop(0.12); }
    // decide
    this.cd -= dt * this.aggr * (MG.difficulty === 'hard' ? 1.3 : MG.difficulty === 'easy' ? 0.7 : 1); this.pushCd -= dt;
    if (!myTurn) return;
    if (this.combo.length && !this.act) { this.strike(this.combo.shift()); return; }
    if (this.pushCd <= 0 && d > 3.5 && d < 9) { this.forcePush(); return; }
    if (this.cd <= 0) {
      if (d > 5 && d < 11 && RNG() < 0.5) { this.strike('leap'); this.cd = rnd(2.2, 3.4); return; }
      if (d < 3.4) { const pool = ['over', 'side', 'thrust', 'spin']; const n = RNG() < 0.35 ? 1 : RNG() < 0.7 ? 2 : 3; this.combo = []; for (let i = 0; i < n; i++) this.combo.push(pick(pool)); this.strike(this.combo.shift()); this.cd = rnd(1.8, 3.2); }
    }
  }
  strike(name) {
    const P = this.P; this.yaw = this.angTo(P); this.play(name, { fade: 0.1 }); this.hitDone = false; this.movePrev = 0;
    const c = this.actClip, mv = c.move ? c.move[c.move.length - 1][1] : 0; this.moveK = mv ? clamp(this.dist(P) - 1.2, 0, mv * 1.6) / mv : 0;
    if (name === 'leap') { this.vy = 6.5; this.grounded = false; const d = this.dist(P) - 1.4; this.vx = Math.sin(this.yaw) * d / 0.75; this.vz = Math.cos(this.yaw) * d / 0.75; }
    COMBAT.snapBlades(this.saber, this.prevSegs);
    this.telegraph = 0.35;
  }
  strikeCheck(dt) {
    const c = this.actClip, P = this.P; if (!c || !c.ev || !P) { COMBAT.snapBlades(this.saber, this.prevSegs); return; }
    // telegraph flash on the blade just before the strike lands
    const e = c.ev[0]; if (this.actT > e[0] - 0.3 && this.actT < e[0]) { const b = this.saber.blades[0]; for (const l of b.layers) l.material.uniforms.uI.value *= 1.6; }
    if (!this.hitDone && this.actT >= e[0] && this.actT <= e[1] + dt) {
      COMBAT.sweep(this, this.saber, 1, this.prevSegs, (t, p) => {
        if (t !== P || this.hitDone) return; this.hitDone = true;
        // the player's own saber can catch it if blocking or mid-swing facing us
        COMBAT.damage(P, e[3] * (this.holo ? 0.3 : 1), { src: this, kind: 'jedi', dir: V3(P.x - this.x, 0, P.z - this.z).normalize(), p });
        FX.spark(p, V3(0, 1, 0), 10, 5, this.saber.col.map((x) => x * 4 + 0.5));
      }, 3.2);
    }
    if (this.act === 'leap' && this.grounded && this.actT > 0.8 && !this.leapFx) { this.leapFx = true; FX.ring(V3(this.x, this.y, this.z), [0.5, 0.8, 1.5], 3, 0.4); FX.addShake(0.3); }
    if (this.act !== 'leap') this.leapFx = false;
    COMBAT.snapBlades(this.saber, this.prevSegs);
  }
  onParried(atk) { this.stop(); this.play('hit'); this.state = 'hit'; this.guard = Math.max(0, this.guard - 35); this.combo = []; if (this.guard <= 0) this.breakGuard(); }
  forcePush() {
    this.play('push', { fade: 0.1 }); this.pushCd = rnd(8, 13);
    MG.after(0.45, () => {
      if (!this.alive || this.act !== 'push') return; const P = this.P; const d = this.dist(P);
      FX.ring(V3(this.x, this.y + 0.1, this.z), [0.2, 0.26, 0.45], 4.2, 0.4);
      if (d < 9 && Math.abs(wrapA(this.angTo(P) - this.yaw)) < 0.8) {
        if (PLAYER.state === 'block') { FX.spark(P.chest(V3()), V3(0, 1, 0), 10, 4, [2, 2, 3]); HUD.pop('RESISTED'); COMBAT.stylePoint(1); }
        else COMBAT.damage(P, 8, { src: this, kind: 'push', knock: true, dir: V3(P.x - this.x, 0, P.z - this.z).normalize() });
      }
    });
  }
  /* procedural block: put our blade THROUGH the contact point, crossed perpendicular to the attacker's blade, then
     recoil from the impact and settle. Returns false if no sensible pose exists (falls back to the stock blocks). */
  blockAt(atk, p, track) {
    const I = this.inst; if (!I || !I.inner || !atk.saber) return false;
    if (!p) { const S0 = atk.saber, b0 = V3(), t0 = V3(), ch = this.chest(V3()); let bb = 1e9; p = V3(); for (let i = 0; i < S0.ends.length; i++) { if (S0.ign[i] < 0.5) continue; S0.bladeSeg(i, b0, t0); const d = COMBAT.segSeg(b0, t0, ch, ch); if (d < bb) { bb = d; p.copy(COMBAT._hp); } } if (bb > 2.2) return false; p.lerp(ch, 0.3); }
    I.inner.updateMatrixWorld(true);
    const inv = Jedi._m.copy(I.inner.matrixWorld).invert();
    const pc = V3().copy(p).applyMatrix4(inv);
    // attacker blade direction at the contact: the nearer of its blades
    const S = atk.saber, b = V3(), t = V3(); let best = 1e9; const dm = V3(0, -1, 0);
    for (let i = 0; i < S.ends.length; i++) { if (S.ign[i] < 0.5) continue; S.bladeSeg(i, b, t); const d = COMBAT.segSeg(b, t, p, p); if (d < best) { best = d; dm.subVectors(t, b).normalize(); } }
    dm.transformDirection(inv);
    const fwd = V3(0, 0, 1); let a = V3().crossVectors(dm, fwd); if (a.lengthSq() < 0.05) a.set(1, 0.2, 0); a.normalize();
    if (a.y < -0.1 || (Math.abs(a.y) < 0.35 && a.x < 0)) a.negate();                   // blade up, or out to our left when flat
    a.addScaledVector(fwd, 0.18).normalize();                                          // a little forward, toward the threat
    const hp = pc.clone().addScaledVector(a, -0.42);
    const chest = V3(0, 1.28, 0.08), off = hp.clone().sub(chest);
    if (off.length() > 0.55) hp.copy(chest).addScaledVector(off.normalize(), 0.55);
    hp.z = Math.max(hp.z, 0.22); hp.y = clamp(hp.y, 0.85, 1.75);
    const tw = clamp(-hp.x * 1.3, -0.6, 0.6), cr = hp.y < 1.0 ? 0.24 : 0.14;
    const back = hp.clone().add(V3(0, -0.03, -0.08)), ar = [a.x, a.y, a.z];
    const clip = track ? { dur: 0.3, keys: [J2(0, [hp.x, hp.y, hp.z], ar, { st: 'guard', cr, tw, pi: -0.04 }), J2(0.3, [hp.x, hp.y, hp.z], ar, { cr, tw, pi: -0.04 })] }
      : { dur: 0.36, keys: [J2(0, [hp.x, hp.y, hp.z], ar, { st: 'guard', cr, tw, pi: -0.04 }), J2(0.07, [back.x, back.y, back.z], ar, { cr: cr + 0.04, tw: tw * 1.1, pi: -0.1, ease: 'out' }), J2(0.36, [hp.x, hp.y, hp.z], ar, { cr, tw, pi: 0 })] };
    ANIM.compile(clip, this.pose);
    this.moves.blockDyn = clip; this.play('blockDyn', { fade: track ? (this.act === 'blockDyn' ? 0.05 : 0.09) : 0.035 }); this.stT = 0;
    if (!track) this.flinch(V3(this.x - atk.x, 0, this.z - atk.z).normalize(), 0.5);
    return true;
  }
  /* the player's blade reaches us: block if we can */
  tryBlock(atk, dmg, kind, p) {
    if (!this.alive || this.state === 'stun' || this.state === 'lock' || this.passive) return false;
    const striking = this.act && ['over', 'side', 'thrust', 'spin', 'leap', 'push'].includes(this.act) && this.actT > 0.25;
    if (striking) return false;
    const facing = Math.abs(wrapA(this.angTo(atk) - this.yaw)) < 1.3;
    if (!facing) return false;
    const heavy = kind === 'slam' || kind === 'sweep' || kind === 'thrust' || kind === 'whirl';
    const cost = dmg * (heavy ? 2.4 : 1.25) * (PLAYER.rageOn ? 1.6 : 1);
    this.guard -= cost; this.guardRegen = 1.6;
    if (this.guard <= 0) { this.breakGuard(); return true; }
    // occasionally riposte with a parry
    if (!heavy && RNG() < 0.12 && this.guard > 40 && !this.combo.length) { this.play('parry', { fade: 0.03 }); this.cd = 0.1; this.combo = [pick(['side', 'thrust'])]; PLAYER.a.play('hit', { fade: 0.03 }); PLAYER.state = 'hit'; }
    else { if (!this.blockAt(atk, p)) { const hy = p.y - this.y; this.play(hy > 1.5 ? 'blockHi' : hy < 0.9 ? 'blockLo' : 'blockMid', { fade: 0.04 }); } this.stT = 0; }
    // saber lock (rare, not in the first seconds)
    if (!BOSS.lockT && heavy && RNG() < 0.25 && this.hp < this.hpMax * 0.8) BOSS.startLock(this);
    return true;
  }
  breakGuard() {
    this.guard = 0; this.stunned = true; this.stop(); this.play('stun', { fade: 0.05 }); this.state = 'stun'; this.stT = 0; this.combo = [];
    HUD.pop('GUARD BROKEN'); FX.spark(this.chest(V3()), V3(0, 1, 0), 30, 6, [3, 3, 4]); MG.hitStop = 0.15; FX.addShake(0.35);
  }
  onHit(info) {
    if (this.state === 'lock') return;
    if (info.knock) { this.play('knock', { fade: 0.05 }); this.state = 'knock'; const d = info.dir || V3(0, 0, -1); this.vx = d.x * 6; this.vz = d.z * 6; this.vy = 3; this.combo = []; return; }
    if (this.state === 'stun') return;
    if (this.act && ['over', 'side', 'thrust', 'spin', 'leap'].includes(this.act) && info.kind !== 'slam') return;   // hyper armour on strikes
    this.play('hit', { fade: 0.03 }); this.state = 'hit'; this.combo = [];
  }
  onExec() { this.stop(); this.play('stun'); this.state = 'stun'; this.stT = 0.5; }
  resistGrip() { HUD.pop(this.name.split(' ')[0] + ' RESISTS'); FX.spark(this.chest(V3()), V3(0, 1, 0), 12, 3, [1.5, 2, 4]); this.pushCd = Math.min(this.pushCd, 0.5); return true; }
  resistPush() { if (this.state === 'stun') return false; this.play('blockMid', { fade: 0.04 }); this.guard -= 25; this.guardRegen = 1.5; if (this.guard <= 0) this.breakGuard(); return true; }
  onDie(info) { if (this.holo) { const c = this.chest(V3()); FX.spark(c, V3(0, 1, 0), 40, 5, [0.8, 1.8, 4]); FX.ring(V3(this.x, this.y + 0.05, this.z), [0.3, 0.7, 1.6], 2, 0.5); FX.flashLight(c, [0.4, 0.7, 1.5], 8, 6, 0.25); this.saber.setVisible(false); this.root.visible = false; if (this.inst.cloth) this.inst.cloth.setVisible(false); this.hidden = true; return; }
    this.play('death', { fade: 0.1 }); this.saber.ignite(undefined, false); if (this.onDefeat) this.onDefeat(info); }
  actEnd(n) { if (this.state === 'duel' && this.combo.length === 0) this.cd = Math.max(this.cd, rnd(0.6, 1.4)); }
  dispose() { super.dispose(); }
}
/* ------------------------------------------------------------------ saber lock */
BOSS.startLock = function (j) {
  const P = PLAYER.a; if (!P || PLAYER.state === 'exec') return;
  BOSS.lockT = { j, t: 0, v: 0.5 };
  j.stop(); j.state = 'lock'; j.play('lock', { fade: 0.1 }); j.yaw = j.angTo(P);
  P.yaw = P.angTo(j); P.play('lock', { fade: 0.1 }); PLAYER.state = 'cine';
  const mid = V3((P.x + j.x) / 2, P.y + 1.4, (P.z + j.z) / 2), f = V3(j.x - P.x, 0, j.z - P.z).normalize(), side = V3(-f.z, 0, f.x);
  const d = P.dist(j); if (d > 1.5) { const k = (d - 1.3) / 2; P.x += f.x * k; P.z += f.z * k; j.x -= f.x * k; j.z -= f.z * k; }
  CAM.play({ dur: 99, hold: true, fov: 38, fn: (t) => ({ pos: mid.clone().addScaledVector(side, 2.3 - Math.min(t, 3) * 0.12).add(V3(0, -0.1, 0)).addScaledVector(f, -0.3), look: mid }) });
  HUD.hint('SABER LOCK — hammer ' + IN.keyLabel('attack') + '!', 3);
};
BOSS.lockUpdate = function (dt) {
  const L = BOSS.lockT; if (!L) return;
  L.t += dt; L.v -= dt * (0.16 + (MG.difficulty === 'hard' ? 0.08 : 0));
  if (IN.take('attack', 0.2) || IN.take('heavy', 0.2)) L.v += 0.075;
  FX.spark(L.j.saber.group.position.clone().lerp(PLAYER.saber.group.position, 0.5).add(V3(0, 0.35, 0)), V3(0, 1, 0), 2, 3, [4, 3, 2], 0.2);
  FX.addShake(0.05); HUD.el.bossSub.textContent = 'LOCK  ' + '■'.repeat(Math.round(clamp(L.v, 0, 1) * 12)).padEnd(12, '·');
  if (L.v >= 1 || L.v <= 0 || L.t > 7) {
    const win = L.v >= 1 || (L.t > 7 && L.v > 0.5), j = L.j, P = PLAYER.a;
    BOSS.lockT = null; CAM.cine = null; CAM.snap = true; PLAYER.state = 'move'; P.stop(0.1); j.state = 'duel'; j.stop(0.1);
    HUD.el.bossSub.textContent = '';
    if (win) { j.breakGuard(); COMBAT.damage(j, 30, { src: P, kind: 'lock', unblockable: true }); HUD.pop('YOU OVERPOWER ' + j.name.split(' ')[0]); FX.addShake(0.5); }
    else { COMBAT.damage(P, 12, { src: j, kind: 'push', knock: true, dir: V3(P.x - j.x, 0, P.z - j.z).normalize() }); }
  }
};
BOSS.update = function (dt) { for (const b of BOSS.list) b.update(dt); BOSS.lockUpdate(dt); if (BOSS.extra) BOSS.extra(dt); };
BOSS.clear = function () { for (const b of BOSS.list) b.dispose(); BOSS.list.length = 0; BOSS.lockT = null; BOSS.extra = null; };
