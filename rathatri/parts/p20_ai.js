/* AI — enemies: gunners (droids, thugs, guards, Tusken snipers) and melee fighters (enforcers, Tusken raiders).
   Telegraphed attacks, a shoot/melee token budget, stagger / knockback / Force grip / stun / execution reactions. */
const ENEMY = { list: [] };
ENEMY.TYPES = {
  b1: { tpl: 'b1', hp: 26, brain: 'gunner', moves: 'trooper', weapon: 'rifle', droid: true, dmg: 4, burst: 2, acc: 0.11, range: [6, 12], speed: 2.6, name: 'B1 Battle Droid', drain: 2, col: [1, 0.15, 0.08] },
  thug: { tpl: 'thug', hp: 42, brain: 'gunner', moves: 'trooper', weapon: 'rifle', dmg: 6, burst: 3, range: [6, 12], speed: 3.0, name: 'Black Sun Gunman', drain: 4, col: [1, 0.15, 0.08] },
  enforcer: { tpl: 'enforcer', hp: 90, brain: 'melee', moves: 'melee', weapon: 'staff', staffKind: 'electro', dmg: 12, speed: 3.6, name: 'Black Sun Enforcer', drain: 8, blocks: 0.35 },
  guard: { tpl: 'guard', hp: 36, brain: 'gunner', moves: 'trooper', weapon: 'rifle', dmg: 6, burst: 3, range: [6, 13], speed: 3.0, name: 'Naboo Security', drain: 4, col: [1, 0.15, 0.08] },
  tusken: { tpl: 'tusken', hp: 48, brain: 'melee', moves: 'melee', weapon: 'staff', staffKind: 'gaffi', dmg: 10, speed: 3.4, name: 'Tusken Raider', drain: 5, blocks: 0.15 },
  sniper: { tpl: 'tusken', hp: 32, brain: 'gunner', moves: 'trooper', weapon: 'rifle', dmg: 11, burst: 1, range: [12, 24], speed: 2.2, name: 'Tusken Sniper', drain: 4, col: [1, 0.35, 0.1] },
  b1cmd: { tpl: 'b1cmd', hp: 40, brain: 'gunner', moves: 'trooper', weapon: 'rifle', droid: true, dmg: 6, burst: 4, range: [7, 13], speed: 2.8, name: 'Droid Commander', drain: 4, col: [1, 0.15, 0.08] },
};
ENEMY.tplOf = function (name) {
  if (CHAR.T[name]) return CHAR.T[name];
  if (name === 'b1') return (CHAR.T.b1 = CAST.buildB1());
  if (name === 'b1cmd') return (CHAR.T.b1cmd = CAST.buildB1('cmd'));

  throw new Error('no template ' + name);
};
class Enemy extends Actor {
  constructor(type, o) {
    const D = ENEMY.TYPES[type];
    const T = ENEMY.tplOf(D.tpl);
    super(T, Object.assign({ hp: D.hp * (MG.difficulty === 'hard' ? 1.3 : MG.difficulty === 'easy' ? 0.7 : 1), team: 'foe', moves: MOV[D.moves], r: D.r || 0.32, h: D.h || 1.8 }, o));
    this.D = D; this.type = type; this.isDroid = !!D.droid; this.drain = D.drain || 3; this.edgeGuard = true;
    this.brain = D.brain; this.state = o.state || 'idle'; this.stT = 0; this.alerted = !!o.alert; this.graceT = o.grace !== undefined ? o.grace : 1.6;
    this.shootCd = rnd(0.8, 1.8); this.strafe = RNG() < 0.5 ? 1 : -1; this.strafeT = rnd(1.5, 3);
    this.base = D.brain === 'melee' ? 'idle' : 'idle';
    if (D.weapon) { this.gun = D.weapon === 'staff' ? CAST.staff(D.staffKind) : CAST.rifle(D.weapon); this.setProp(this.gun, D.weapon === 'staff'); }
    this.onActEnd = (n) => this.actEnd(n);
    this.react = (info) => this.onHit(info);
    this.die = (info) => this.onDie(info);
    ENEMY.list.push(this); COMBAT.actors.push(this);
    this.physics(0); this.animate(0.016); this.pose3D(0.016);
    if (o.patrol) this.patrol = o.patrol;
  }
  get P() { return PLAYER.a; }
  seesPlayer(maxD) {
    const P = this.P; if (!P || !P.alive) return false; const d = this.dist(P); if (d > (maxD || 22)) return false;
    return PHY.los(this.x, this.y + 1.5, this.z, P.x, P.y + 1.3, P.z);
  }
  update(dt) {
    this.flash = Math.max(0, this.flash - dt); this.stT += dt; this.iframe = Math.max(0, this.iframe - dt);
    const P = this.P;
    if (!this.alive && this.rag) { this.deadT = (this.deadT || 0) + dt; RAG.update(this, dt); this.postPose(); if (this.deadT > 7 && !this.gone) this.vanish(); return; }
    if (!this.alive) { this.deadT = (this.deadT || 0) + dt;
      const tp = this.topple;
      if (tp && !tp.done) {
        tp.w += (4.2 + 7.5 * Math.sin(tp.ang)) * dt; tp.ang += tp.w * dt;
        if (tp.ang >= tp.max) { tp.ang = tp.max;
          if (!tp.landed) { tp.landed = true; tp.w = -tp.w * 0.16; const d = V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const hp = V3(this.x, this.y + 0.08, this.z).addScaledVector(V3(tp.axis.z, 0, -tp.axis.x).normalize(), -1.0);
            FX.puff(hp, 6, { size: 0.35, col: [0.55, 0.52, 0.5], a: 0.35, spread: 1.4, life: 1.1, rise: 0.2 }); if (PLAYER.a && PLAYER.a.dist(this) < 9) FX.addShake(0.08); void d; }
          else if (Math.abs(tp.w) < 0.4) tp.done = true; else tp.w = -tp.w * 0.2; }
      }
      if (this.grounded) { this.vx *= 0.86; this.vz *= 0.86; } else { this.vx *= 0.995; this.vz *= 0.995; }
      this.physics(dt); this.animate(dt); this.pose3D(dt); this.postPose(); if (this.deadT > 7 && !this.gone) this.vanish(); return; }
    if (this.gripped) { this.gripUpdate(dt); return; }
    if (this.state === 'knock') { if (this.grounded && this.stT > 0.25) { this.vx *= 0.85; this.vz *= 0.85; } if (!this.act) this.setState('engage'); }
    else if (this.state === 'stagger') { this.vx *= 0.8; this.vz *= 0.8; if (!this.act) this.setState('engage'); }
    else if (this.state === 'stun') { this.vx = 0; this.vz = 0; if (this.stT > 2.6) { this.stunned = false; this.stop(); this.setState('engage'); if (this.dodge !== undefined) this.dodge = this.dodgeMax * 0.5; } }
    else if (this.state === 'execd') { this.vx = 0; this.vz = 0; }
    else this.think(dt);
    this.speed = Math.hypot(this.vx, this.vz);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    if (this.speed > 0.1) { this.mvx = (this.vx * cy - this.vz * sy) / this.speed; this.mvz = (this.vx * sy + this.vz * cy) / this.speed; }
    this.separate(dt);
    this.physics(dt);
    if (LEVEL.cur && this.y < LEVEL.cur.killY) { this.alive = true; COMBAT.damage(this, 9999, { src: PLAYER.a, kind: 'fall', unblockable: true }); this.vanish(); return; }
    this.animate(dt);
    this.aimOverride();
    this.pose3D(dt);
    this.postPose();
  }
  setState(s) { this.state = s; this.stT = 0; }
  separate(dt) {
    for (const o of COMBAT.actors) { if (o === this || !o.alive || o.hidden) continue; const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz), m = this.r + o.r + 0.15; if (d < m && d > 1e-4 && Math.abs(o.y - this.y) < 1.5) { const k = (m - d) / d * (o.isPlayer ? 1 : 0.5); this.moveH(dx * k, dz * k); } }
  }
  think(dt) {
    const P = this.P, D = this.D;
    if (this.passive) { this.vx *= 0.8; this.vz *= 0.8; this.setBase('idle'); return; }
    if (!P || !P.alive) { this.vx *= 0.9; this.vz *= 0.9; this.setBase('idle'); return; }
    const d = this.dist(P);
    if (!this.alerted) {
      if (this.patrol) { const tp = this.patrol[this.pi || 0]; this.steer(tp[0], tp[1], 1.2, dt); if (Math.hypot(tp[0] - this.x, tp[1] - this.z) < 0.5) this.pi = ((this.pi || 0) + 1) % this.patrol.length; this.yaw = dampA(this.yaw, Math.atan2(this.vx, this.vz), 4, dt); this.setBase(this.speed > 0.3 ? 'run' : 'idle'); }
      else { this.vx *= 0.8; this.vz *= 0.8; this.setBase('idle'); }
      if ((d < 16 && this.seesPlayer(16)) || d < 5) this.alert();
      return;
    }
    this.graceT -= dt;
    if (this.brain === 'gunner') this.thinkGunner(dt, d);
    else if (this.brain === 'melee') this.thinkMelee(dt, d);
    else if (this.brainFn) this.brainFn(dt, d);
  }
  alert() { if (this.alerted) return; this.alerted = true; this.graceT = Math.max(this.graceT, 1.1); for (const e of ENEMY.list) if (e !== this && e.alive && !e.alerted && e.dist(this) < 10) { e.alerted = true; e.graceT = Math.max(e.graceT, 1.4); } }
  thinkGunner(dt, d) {
    const P = this.P, D = this.D;
    this.yaw = dampA(this.yaw, this.angTo(P), 8, dt);
    // positioning: hold a distance band, strafe
    this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(1.4, 3.2); }
    const [dmin, dmax] = D.range;
    let fx = 0, fz = 0; const ax = (P.x - this.x) / (d || 1), az = (P.z - this.z) / (d || 1);
    if (d > dmax) { fx += ax; fz += az; } else if (d < dmin) { fx -= ax; fz -= az; }
    fx += -az * this.strafe * 0.7; fz += ax * this.strafe * 0.7;
    const aiming = this.aimT !== undefined;
    const spd = aiming ? 0.6 : D.speed;
    const L = Math.hypot(fx, fz) || 1; this.vx = damp(this.vx, fx / L * spd, 6, dt); this.vz = damp(this.vz, fz / L * spd, 6, dt);
    this.setBase(aiming || d < dmax + 2 ? 'aim' : 'run');
    // shooting
    this.shootCd -= dt;
    if (this.aimT === undefined && this.shootCd <= 0 && this.graceT <= 0 && d < 26) {
      if (this.seesPlayer(26) && COMBAT.wantToken('shoot', this, MG.difficulty === 'hard' ? 3 : 2)) { this.aimT = 0; this.burstN = 0; }
      else this.shootCd = 0.5;
    }
    if (this.aimT !== undefined) {
      this.aimT += dt;
      const g = this.gun.userData.glow; g.material.opacity = sat(this.aimT / 0.55); g.scale.setScalar(1 + this.aimT * 2);
      if (this.aimT > 0.55 + this.burstN * 0.2) {
        this.fireAt(P); this.burstN++;
        if (this.burstN >= D.burst) { this.aimT = undefined; g.material.opacity = 0; COMBAT.freeToken('shoot', this); this.shootCd = rnd(2.2, 4.0) * (MG.difficulty === 'easy' ? 1.5 : MG.difficulty === 'hard' ? 0.75 : 1); }
      }
    }
  }
  fireAt(P) {
    const mz = this.gun.userData.muzzle.getWorldPosition(new THREE.Vector3());
    const tgt = P.chest(new THREE.Vector3()); tgt.y -= 0.1;
    const spread = (this.D.acc || 0.075) + Math.min(0.05, this.dist(P) * 0.003) + (P.speed > 4 ? 0.05 : 0);
    const dir = tgt.sub(mz).normalize(); dir.x += rnd(-spread, spread); dir.y += rnd(-spread, spread) * 0.6; dir.z += rnd(-spread, spread); dir.normalize();
    COMBAT.fire(mz, dir, { shooter: this, team: 'foe', dmg: this.D.dmg, speed: 24, col: this.D.col });
    FX.flashLight(mz, [1, 0.3, 0.1], 4, 4, 0.07); FX.puff(mz, 1, { add: true, size: 0.12, col: [1, 0.4, 0.2], a: 1, life: 0.08, spread: 0.1 });
    FX.impact(mz, [3.0, 0.8, 0.35], 0.55); FX.puff(mz, 2, { size: 0.08, grow: 5, col: [0.4, 0.38, 0.36], a: 0.3, life: 0.7, spread: 0.25, rise: 0.4 });
  }
  thinkMelee(dt, d) {
    const P = this.P, D = this.D;
    this.yaw = dampA(this.yaw, this.angTo(P), this.act === 'strike' ? 2 : 7, dt);
    if (this.act === 'wind' || this.act === 'strike') { this.vx *= 0.85; this.vz *= 0.85; if (this.act === 'strike') this.strikeCheck(); return; }
    const has = COMBAT.tokens.melee.has(this);
    const want = has ? 1.5 : 3.4;
    this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(1.2, 2.6); }
    const ax = (P.x - this.x) / (d || 1), az = (P.z - this.z) / (d || 1);
    let fx = 0, fz = 0; if (d > want + 0.3) { fx += ax; fz += az; } else if (d < want - 0.4) { fx -= ax * 0.6; fz -= az * 0.6; }
    if (!has) { fx += -az * this.strafe * 0.6; fz += ax * this.strafe * 0.6; }
    const L = Math.hypot(fx, fz); const spd = L > 0.01 ? D.speed : 0; this.vx = damp(this.vx, L ? fx / L * spd : 0, 6, dt); this.vz = damp(this.vz, L ? fz / L * spd : 0, 6, dt);
    this.setBase(this.speed > 1.2 ? 'run' : 'idle');
    this.atkCd = (this.atkCd || rnd(0.5, 1.5)) - dt;
    if (d < 2.2 && this.graceT <= 0 && this.atkCd <= 0 && COMBAT.wantToken('melee', this, MG.difficulty === 'hard' ? 2 : 1)) { this.play('wind', { fade: 0.08 }); this.telegraph = 0.55; this.didHit = false; }
  }
  strikeCheck() {
    const P = this.P; if (this.didHit || this.actT < 0.06 || this.actT > 0.22) return;
    const d = this.dist(P), ang = Math.abs(wrapA(this.angTo(P) - this.yaw));
    if (d < 2.3 && ang < 1.0 && Math.abs(P.y - this.y) < 1.2) { this.didHit = true; COMBAT.damage(P, this.D.dmg, { src: this, kind: 'melee', dir: V3(P.x - this.x, 0, P.z - this.z).normalize() }); }
  }
  actEnd(n) {
    if (n === 'wind') { this.play('strike', { fade: 0.02 }); return; }
    if (n === 'strike') { COMBAT.freeToken('melee', this); this.atkCd = rnd(1.2, 2.4); }
    if (this.state === 'stagger' || this.state === 'knock') this.setState('engage');
  }
  onParried() { this.stop(); COMBAT.freeToken('melee', this); this.stunned = true; this.play('stun'); this.setState('stun'); this.iframe = 0; }
  aimOverride() {
    if (this.brain !== 'gunner' || this.base !== 'aim' || this.act || !this.alive) return;
    const P = this.P; if (!P) return;
    // point the rifle at the player (body space)
    const dx = P.x - this.x, dz = P.z - this.z, dy = (P.y + 1.2) - (this.y + 1.36);
    const a = Math.atan2(dx, dz) - this.yaw, h = Math.hypot(dx, dz);
    const bx = Math.sin(a), bz = Math.cos(a), by = dy / Math.max(1, h);
    ANIM.axisQ(bx, by, bz, 0, this.pose.hq);
  }
  postPose() {}
  onHit(info) {
    if (this.state === 'execd') return;
    this.alert();
    if (this.aimT !== undefined) { this.aimT = undefined; if (this.gun) this.gun.userData.glow.material.opacity = 0; COMBAT.freeToken('shoot', this); this.shootCd = rnd(0.8, 1.6); }
    COMBAT.freeToken('melee', this);
    const knockKinds = { sweep: 4.2, slam: 3.6, thrust: 4.6, plunge: 3.2, lunge: 4.6 };
    if (!info.knock && !info.force && knockKinds[info.kind] && !this.isBoss && !this.D.shield) { info.knock = true; info.force = knockKinds[info.kind]; }
    if (info.knock || info.force) {
      const d = info.dir || V3(0, 0, 1), f = info.force || 7;
      this.vx = d.x * f; this.vz = d.z * f; this.vy = 2.6 + f * 0.22; this.grounded = false;
      this.yaw = Math.atan2(-d.x, -d.z); this.play('knock', { fade: 0.04 }); this.setState('knock');
      if (this.isDroid && info.kind === 'push' && RNG() < 0.35) { COMBAT.damage(this, 999, info); }
      return;
    }
    if (this.stunned) { this.flinch(info.dir, 1.2); return; }
    // directional reaction: which way the blade was travelling decides which way the body is thrown
    const k = info.kind, src = info.src;
    let clip = 'hit';
    if (this.moves.hitL) {
      if (k === 'twirl' || k === 'whirl') clip = 'hitSpin';
      else if (info.heavy || k === 'jedi') clip = 'hitHeavy';
      else if (src && src.isPlayer && src.act) clip = ({ a1: 'hitL', a2: 'hitR', a4: 'hitR', a5: 'hitHeavy', deflectL: 'hitL', deflectR: 'hitR' })[src.act] || (RNG() < 0.5 ? 'hitL' : 'hitR');
      else clip = RNG() < 0.5 ? 'hitL' : 'hitR';
    }
    this.play(clip, { fade: 0.025 }); this.setState('stagger');
    const d = info.dir; if (d) { const f = clip === 'hitHeavy' ? 5.2 : 3.6; this.vx = d.x * f; this.vz = d.z * f; }
  }
  onGrip() { this.stop(); this.play('choke', { fade: 0.15 }); this.setState('gripped'); this.gy0 = this.y; this.vx = this.vz = 0; COMBAT.freeToken('shoot', this); COMBAT.freeToken('melee', this); if (this.gun) this.gun.userData.glow.material.opacity = 0; this.aimT = undefined; }
  gripUpdate(dt) {
    this.stT += dt; this.air = 1;
    this.y = damp(this.y, this.gy0 + 1.3, 5, dt); this.vy = 0; this.grounded = false;
    this.x += Math.sin(MG.t * 9) * 0.002; this.animate(dt); this.pose3D(dt);
  }
  onGripThrow(v) { this.gripped = false; this.air = 0; this.vx = v.x; this.vz = v.z; this.vy = v.y; this.play('knock', { fade: 0.05 }); this.setState('knock'); }
  onExec(atk) { this.stop(); this.play('execd', { fade: 0.05 }); this.setState('execd'); this.vx = this.vz = 0; }
  onDie(info) {
    COMBAT.freeToken('shoot', this); COMBAT.freeToken('melee', this);
    if (this.gun) this.gun.userData.glow.material.opacity = 0;
    if (this.isDroid && (info.kind !== 'grip')) { this.shatter(info); return; }
    this.gripped = false; this.air = 0;
    const physical = this.moves && this.moves.deathFall && info.kind !== 'grip' && info.kind !== 'fall' && info.kind !== 'exec';
    if (physical) {
      // struck down: thrown back along the blow, the body topples over its feet and the weapon flies loose
      const d = info.dir ? V3(info.dir.x, 0, info.dir.z) : V3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); if (d.lengthSq() < 1e-6) d.set(0, 0, 1); d.normalize();
      const blown = !!(info.knock || info.heavy || info.kind === 'push' || info.kind === 'slam' || info.kind === 'whirl');
      if (!MG.flags.norag) {   // ragdoll: the blow launches a limp body that tumbles, rolls and slides
        const w = this.inst.prop; if (w && (this.gun || this.staff)) { const g = w; this.setProp(null); g.updateMatrixWorld(true); const hold = new THREE.Group(); g.getWorldPosition(hold.position); g.getWorldQuaternion(hold.quaternion); g.position.set(0, 0, 0); g.quaternion.identity(); if (g.parent) g.parent.remove(g); hold.add(g);
          FX.chunk(hold, V3(d.x * 2.5 + rnd(-1, 1), 2.8 + rnd(0, 1.5), d.z * 2.5 + rnd(-1, 1)), V3(rnd(-10, 10), rnd(-10, 10), rnd(-10, 10)), 7); }
        this.stop(0.01); RAG.start(this, d, info.kind === 'push' ? 9 : blown ? 6.5 : 3.4, info.p);
        return;
      }
      this.play('deathFall', { fade: 0.04 });
      this.vx = d.x * (blown ? 5.8 : 2.6); this.vz = d.z * (blown ? 5.8 : 2.6); if (blown) { this.vy = 3.8; this.grounded = false; }
      this.topple = { axis: V3(d.z, 0, -d.x), ang: 0, w: blown ? 3.4 : 1.3, max: 1.5, landed: false, done: false };
      if (this.gun && this.inst.prop) { const g = this.gun; this.setProp(null); g.updateMatrixWorld(true); const w = new THREE.Group(); g.getWorldPosition(w.position); g.getWorldQuaternion(w.quaternion); g.position.set(0, 0, 0); g.quaternion.identity(); if (g.parent) g.parent.remove(g); w.add(g);
        FX.chunk(w, V3(d.x * 2.5 + rnd(-1, 1), 2.8 + rnd(0, 1.5), d.z * 2.5 + rnd(-1, 1)), V3(rnd(-10, 10), rnd(-10, 10), rnd(-10, 10)), 7); }
    } else {
      this.play('death', { fade: 0.05 });
      const d = info.dir; if (d) { const f = info.knock ? 6 : info.heavy ? 4.5 : 2.2; this.vx = d.x * f; this.vz = d.z * f; if (info.heavy || info.knock) { this.vy = 3.2; this.grounded = false; } }
    }
    if (info.src && info.src.isPlayer && (info.heavy || info.kind === 'exec')) { MG.hitStop = Math.max(MG.hitStop, 0.11); FX.addShake(0.3); }
  }
  /* droids fall apart: every rigid part becomes a debris chunk */
  shatter(info) {
    const d = info.dir || V3(0, 0, 1), cut = this.y + 1.0 + rnd(-0.2, 0.2);
    this.root.updateMatrixWorld(true);
    const parts = []; this.root.traverse((o) => { if (o.isMesh) parts.push(o); });
    for (const m of parts) {
      const w = new THREE.Mesh(m.geometry, m.material); m.getWorldPosition(w.position); m.getWorldQuaternion(w.quaternion); w.castShadow = true;
      const up = w.position.y > cut;
      const v = V3(d.x * (up ? 4 : 1.2) + rnd(-1.5, 1.5), up ? rnd(2, 5) : rnd(0, 1.5), d.z * (up ? 4 : 1.2) + rnd(-1.5, 1.5));
      FX.chunk(w, v, null, rnd(5, 8));
    }
    if (this.gun) { const g = this.gun; const w = g.clone(); w.position.copy(g.position); w.quaternion.copy(g.quaternion); R.scene.remove(g); FX.chunk(w, V3(rnd(-2, 2), 3, rnd(-2, 2)), null, 6); this.gun = null; }
    const c = this.chest(V3()); FX.spark(c, V3(0, 1, 0), 36, 7, [4, 2.5, 1.2]); FX.puff(c, 6, { size: 0.35, col: [0.25, 0.23, 0.22], a: 0.5, life: 1.6, spread: 1.2 }); FX.flashLight(c, [1, 0.5, 0.2], 6, 6, 0.2);
    this.vanish();
  }
  vanish() { this.gone = true; this.hidden = true; this.alive = false; this.root.visible = false; if (this.gun && this.gun.parent) this.gun.parent.remove(this.gun); if (this.inst.cloth) this.inst.cloth.setVisible(false); }
}
/* find clear floor near (x,z) at the intended height (never on top of / inside a crate) */
ENEMY.findSpot = function (x, z, yHint) {
  for (const r of [0, 0.9, 1.8, 2.7, 3.6, 4.5]) {
    const n = r === 0 ? 1 : 10;
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const g = PHY.ground(px, pz, 0.35, (yHint !== undefined ? yHint : 150) + 0.6, -200);
      if (g === null) continue;
      if (yHint !== undefined && Math.abs(g - yHint) > 0.6) continue;
      if (PHY.solidAt(px, g + 1.0, pz) || PHY.solidAt(px, g + 0.4, pz)) continue;
      return [px, g, pz];
    }
  }
  const g = PHY.ground(x, z, 0.2, 200, -200); return [x, g !== null ? g : 0, z];
};
ENEMY.spawn = function (type, x, z, o) {
  o = o || {};
  const yHint = o.y !== undefined ? o.y : (PHY.hf ? undefined : 0);
  const sp = ENEMY.findSpot(x, z, yHint);
  if (type === 'holojedi') { const k = (ENEMY._hj = (ENEMY._hj || 0) + 1); const j = new Jedi('holo', Object.assign({}, o, { x: sp[0], y: sp[1], z: sp[2], tpl: ['obiwan', 'quigon', 'darsha'][k % 3], holo: true, color: k % 2 ? 'blue' : 'green' })); j.home = [sp[0], sp[2]]; return j; }
  const Cls = o.cls || Enemy;
  return new Cls(type, Object.assign({}, o, { x: sp[0], y: sp[1], z: sp[2], yaw: o.yaw || 0 }));
};
ENEMY.update = function (dt) { for (const e of ENEMY.list) e.update(dt); };
ENEMY.clear = function () { for (const e of ENEMY.list) { e.dispose(); if (e.gun && e.gun.parent) e.gun.parent.remove(e.gun); } ENEMY.list.length = 0; };
ENEMY.alive = () => ENEMY.list.filter((e) => e.alive && !e.hidden && e.team === 'foe');
