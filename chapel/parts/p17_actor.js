/* ACTOR — anything with a body: position (feet), velocity, capsule collision against PHY, health, and a clip-based
   animation layer (base loop + one-shot action, cross-faded) feeding ANIM.apply. */
class Actor {
  static _qt = new THREE.Quaternion();
  constructor(T, o) {
    o = o || {};
    this.T = T; this.inst = new CharInst(T); this.root = this.inst.root;
    this.x = o.x || 0; this.y = o.y || 0; this.z = o.z || 0; this.yaw = o.yaw || 0;
    this.vx = 0; this.vy = 0; this.vz = 0; this.r = o.r || 0.34; this.h = o.h || 1.8; this.step = 0.45;
    this.grounded = true; this.airT = 0; this.floorY = this.y; this.hp = o.hp || 100; this.hpMax = this.hp; this.alive = true;
    this.moves = o.moves || MOV.maul; this.team = o.team || 'foe';
    this.base = 'guard'; this.act = null; this.actT = 0; this.actSpeed = 1;
    this.pose = new Pose(); this.poseA = new Pose(); this.poseB = new Pose(); this.fromPose = new Pose(); this.fadeT = 1; this.fadeDur = 0.12;
    this.phase = 0; this.speed = 0; this.mvx = 0; this.mvz = 1; this.lookYaw = 0;
    this.kbT = 0; this.stunT = 0; this.iframe = 0; this.flash = 0; this.hitCd = new Map();
    this.prop = null; this.saber = null;
    this.gy = (x, z) => { const o2 = {}; const g = PHY.ground(x, z, 0.12, this.y + 0.6, this.y - 1.2, o2); return g; };
    R.scene.add(this.root); if (this.inst.cloth) this.inst.cloth.addTo(R.scene);
    if (!MG.flags.nomocap && MOCAP.init()) this.inst.mo = MOCAP.state(this);
  }
  flinch(dir, amp) { const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw); const d = dir || V3(0, 0, 1); this.flinchZ = clamp(-(d.x * sy + d.z * cy), -1, 1) || -1; this.flinchX = clamp(d.x * cy - d.z * sy, -1, 1); if (Math.abs(this.flinchZ) < 0.3) this.flinchZ = -0.5; this.flinchT = 0.3; this.flinchA = amp || 1; }
  setProp(obj, sym) { this.prop = obj; this.inst.prop = obj ? obj.group || obj : null; this.inst.symProp = !!sym; }
  /* one-shot action; returns the clip */
  play(name, o) {
    o = o || {};
    const c = this.moves[name]; if (!c) { console.warn('no clip', name); return null; }
    this.fromPose.copy(this.pose); this.fadeT = 0; this.fadeDur = o.fade !== undefined ? o.fade : 0.08;
    this.act = name; this.actClip = c; this.actT = o.t || 0; this.actSpeed = o.speed || 1; this.actHit = new Set(); this.actEv = 0;
    return c;
  }
  stop(fade) { if (!this.act) return; this.fromPose.copy(this.pose); this.fadeT = 0; this.fadeDur = fade || 0.14; this.act = null; this.actClip = null; }
  setBase(name, fade) { if (this.base === name) return; if (!this.act) { this.fromPose.copy(this.pose); this.fadeT = 0; this.fadeDur = fade || 0.18; } this.base = name; }
  actU() { return this.actClip ? this.actT / this.actClip.dur : 0; }
  /* --------------------------------------------------------------- movement */
  moveH(dx, dz) {
    const e = this; e.hitWall = null;
    // AI never walks off an edge on its own (knockbacks and scripted leaps may)
    if (e.edgeGuard && e.grounded && !e.isPlayer && e.state !== 'knock' && !e.jumpT && (dx || dz)) {
      const L = Math.hypot(dx, dz), ax = dx / (L || 1) * Math.max(L, 0.45), az = dz / (L || 1) * Math.max(L, 0.45);
      // on open terrain it also refuses slopes steeper than ~35° (no climbing canyon walls); built levels keep their stairs
      const steep = LEVEL.cur && LEVEL.cur.def.world === 'tatooine' ? e.y + 0.32 : Infinity;
      const okAt = (x, z) => { const g = PHY.ground(x, z, 0.12, e.y + e.step, e.y - 1.2); return g !== null && g < steep; };
      if (!okAt(e.x + ax, e.z + az)) {
        if (okAt(e.x + ax, e.z)) dz = 0; else if (okAt(e.x, e.z + az)) dx = 0; else return true;
      }
    }
    const blocked = PHY.move(e, dx, dz);
    return blocked;
  }
  physics(dt) {
    // gravity + ground
    const wasG = this.grounded;
    this.vy -= 22 * dt * (this.gravK || 1);
    if (this.vy < -30) this.vy = -30;
    this.moveH(this.vx * dt, this.vz * dt);
    const ny = this.y + this.vy * dt;
    const o = {}; const g = PHY.ground(this.x, this.z, this.r * 0.7, this.y + this.step, ny - 0.05, o);
    if (g !== null && this.vy <= 0 && ny <= g + 0.02) {
      this.y = g; this.vy = 0; this.grounded = true; this.floorC = o.c;
      if (!wasG) this.onLand && this.onLand(this.airT);
      this.airT = 0;
    } else {
      // ceiling
      if (this.vy > 0) { const c = PHY.ceiling(this.x, this.z, this.r * 0.6, this.y + this.h, this.y + this.h + this.vy * dt + 0.05); if (c < this.y + this.h + this.vy * dt) { this.vy = 0; } }
      this.y = ny; this.grounded = false; this.airT += dt;
      // snap down small steps when walking off
      if (wasG && this.vy <= 0) { const g2 = PHY.ground(this.x, this.z, this.r * 0.7, this.y + 0.05, this.y - this.step, o); if (g2 !== null) { this.y = g2; this.vy = 0; this.grounded = true; this.airT = 0; } }
    }
    this.floorY = g !== null ? g : -1e9;
  }
  /* --------------------------------------------------------------- animation */
  animate(dt) {
    const clipB = this.moves[this.base] || this.moves.guard;
    // base (looping)
    this.baseT = (this.baseT || 0) + dt;
    ANIM.sample(clipB, clipB.loop ? this.baseT % clipB.dur : Math.min(this.baseT, clipB.dur), this.poseA);
    // accelerate/turn signals for the body lean
    const dtt = Math.max(dt, 1e-4); const sp0 = this._sp0 === undefined ? this.speed : this._sp0, yw0 = this._yw0 === undefined ? this.yaw : this._yw0;
    this._acc = damp(this._acc || 0, (this.speed - sp0) / dtt, 10, dt); this._turn = damp(this._turn || 0, wrapA(this.yaw - yw0) / dtt, 10, dt); this._sp0 = this.speed; this._yw0 = this.yaw;
    ANIM._lx = ANIM._lx || { acc: 0, turn: 0 }; ANIM._lx.acc = this.grounded ? this._acc : 0; ANIM._lx.turn = this.grounded ? this._turn : 0;
    ANIM.loco(this.poseA, this.grounded ? this.speed : 0, this.mvx, this.mvz, this.phase, this.poseB, ANIM._lx);
    let P = this.poseB;
    if (this.act) {
      const c = this.actClip;
      this.actT += dt * this.actSpeed;
      if (this.actT >= c.dur && !c.loop && !this.alive) this.actT = c.dur - 1e-4;   // the dead hold their last frame
      if (this.actT >= c.dur && !c.loop) { const n = this.act; this.act = null; this.actClip = null; this.fromPose.copy(this.pose); this.fadeT = 0; this.fadeDur = c.fadeOut || 0.12; this.onActEnd && this.onActEnd(n); }
      else { ANIM.sample(c, c.loop ? this.actT % c.dur : this.actT, this.poseA); P = this.poseA; if (c.locoMix) { ANIM.loco(this.poseA, this.speed * c.locoMix, this.mvx, this.mvz, this.phase, this.poseB); P = this.poseB; } }
    }
    if (this.fadeT < 1) { this.fadeT = Math.min(1, this.fadeT + dt / this.fadeDur); this.pose.blend(this.fromPose, P, easeIO(this.fadeT)); }
    else this.pose.copy(P);
    if (this.air !== undefined) this.pose.air = Math.max(this.pose.air, this.air);
    this.pose.headYaw += this.lookYaw || 0;
    if (this.poseLean) this.pose.lean += this.poseLean;
    // additive flinch: a sharp upper-body jolt away from an impact that never interrupts the current action
    if (this.flinchT > 0) { this.flinchT = Math.max(0, this.flinchT - dt); const u = 1 - this.flinchT / 0.3, k = Math.sin(Math.min(1, u * 1.6) * PI) * (1 - u * 0.4) * (this.flinchA || 1);
      this.pose.pitch -= 0.26 * k * this.flinchZ; this.pose.twist += 0.34 * k * this.flinchX; this.pose.lean += 0.12 * k * this.flinchX; this.pose.headPitch -= 0.3 * k * Math.abs(this.flinchZ) + 0.05; this.pose.crouch += 0.03 * k; }
    // footfalls: dust on sand, splashes on wet roofs
    if (this.grounded && this.speed > 2.4 && LEVEL.cur) { const ph = this.phase, pp = this._php === undefined ? ph : this._php; this._php = ph;
      const hitL = pp > ph ? true : false, hitR = pp < 0.5 && ph >= 0.5, w = LEVEL.cur.def.world;
      if ((hitL || hitR) && (w === 'tatooine' || LEVEL.cur.id === 'rooftops')) { const fb = this.inst.bones[hitL ? 15 : 18]; if (fb) { const fp = fb.getWorldPosition(_v5); fp.y = this.y + 0.03;
        if (w === 'tatooine') FX.puff(fp, 2, { size: 0.16, grow: 3.5, col: [0.78, 0.64, 0.46], a: 0.32, life: 0.9, spread: 0.45, rise: 0.25, drag: 2.5 });
        else FX.puff(fp, 2, { add: true, size: 0.05, grow: 4, col: [0.55, 0.6, 0.72], a: 0.6, life: 0.3, spread: 0.6, rise: 0.8, drag: 3 }); } } }
    // stride phase
    const pz = this.poseA; this.phase = (this.phase + dt * (this.grounded ? ANIM.cadence(this.speed, pz.gL > 0.5 && pz.gR > 0.5, Math.abs(this.mvx || 0)) : 0)) % 1;
    if (this.inst.mo) MOCAP.actor(this, dt);
  }
  syncRoot() {
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.set(0, this.yaw, 0);
    if (this.topple) this.root.quaternion.premultiply(Actor._qt.setFromAxisAngle(this.topple.axis, this.topple.ang));   // falling body pivots about its feet
    this.inst.floorY = this.floorY;
  }
  pose3D(dt) {
    this.syncRoot();
    this.inst.inAct = !!this.act; ANIM.apply(this.inst, this.pose, { groundY: this.grounded ? this.gy : null });
    if (this.inst.cloth) this.inst.cloth.step(dt);
    if (this.inst.cape) this.inst.cape.step(dt);
  }
  /* world-space point on the body: chest / head */
  steer(tx, tz, spd, dt) {
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    const vx = d > 0.05 ? dx / d * spd : 0, vz = d > 0.05 ? dz / d * spd : 0;
    this.vx = damp(this.vx, vx, 8, dt); this.vz = damp(this.vz, vz, 8, dt);
  }
  chest(out) { return (out || new THREE.Vector3()).set(this.x, this.y + this.h * 0.68, this.z); }
  head(out) { return this.inst.bones[4].getWorldPosition(out || new THREE.Vector3()); }
  forward(out) { return (out || new THREE.Vector3()).set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  dist(o) { return Math.hypot(o.x - this.x, o.z - this.z); }
  angTo(o) { return Math.atan2(o.x - this.x, o.z - this.z); }
  dispose() { this.inst.dispose(); if (this.saber) this.saber.remove(); if (this.prop && this.prop.group === undefined && this.prop.parent) this.prop.parent.remove(this.prop); }
}
