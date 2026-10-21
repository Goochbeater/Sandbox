/* HUNTERS (AI) — the Republic militia class (a shield wall for sergeants and shield commandos), the bounty hunter brain
   ('hunter': carbine spacing, jetpack lunges, whip-cord pull, flamer cone), the Jedi hunter (the p31 duellist that sprints
   to Force-use echoes), ENEMY.alertAt, and the bark system (LORE.barks, ENEMY.bark). Hooks are wrapped, not edited. */
HUNT.HEAVY = ['slam', 'sweep', 'whirl', 'thrust', 'plunge'];
HUNTERS.dropped = []; HUNTERS.onDrop = null;
/* Republic militia: the sergeant's shield wall deflects frontal light blows and cracks under heavy ones or a push */
class Militia extends Enemy {
  constructor(type, o) {
    super(type, o);
    this._post = true;   // stops p20b giving the shield its Gungan disc; the militia plate is attached by the template
    this.shieldHP = this.D.shield === true ? 1 : 0; this.shieldDownT = 0;
    this.shieldM = ((this.inst.att && this.inst.att.shield) || [])[0] || null;
  }
  update(dt) { if (this.shieldDownT > 0) { this.shieldDownT -= dt; if (this.shieldDownT <= 0) this.shieldHP = 1; } super.update(dt); }
  tryBlock(atk, dmg, kind, p) {
    if (this.D.shield !== true || !this.alive || this.stunned || this.state === 'knock' || this.gripped) return super.tryBlock(atk, dmg, kind, p);
    if (Math.abs(wrapA(this.angTo(atk) - this.yaw)) >= 1.2) return super.tryBlock(atk, dmg, kind, p);
    if (this.shieldHP <= 0) return super.tryBlock(atk, dmg, kind, p);
    const q = p || this.chest(V3());
    if (HUNT.HEAVY.includes(kind)) { this.breakShield(q); return false; }   // the blow lands; the wall is down for a while
    FX.spark(q, V3(0, 1, 0), 12, 4, [2.6, 2.4, 2.0]); FX.addShake(0.04);
    return true;
  }
  breakShield(q) { this.shieldHP = 0; this.shieldDownT = 4.5; FX.spark(q, V3(0, 1, 0), 22, 6, [3, 2.2, 1.2]); FX.addShake(0.12); HUD.pop('SHIELD BROKEN'); }
  onHit(info) { if (this.D.shield === true && this.shieldHP > 0 && info.kind === 'push') this.breakShield(this.chest(V3())); super.onHit(info); }
  onDie(info) { if (this.D.drop) { HUNTERS.dropped.push({ k: this.D.drop, x: this.x, z: this.z }); if (HUNTERS.dropped.length > 8) HUNTERS.dropped.shift(); if (HUNTERS.onDrop) HUNTERS.onDrop(this, this.D.drop); } super.onDie(info); }
}
/* freelance bounty hunter: the 'hunter' brain sits on the gunner spacing and adds jet lunges, a whip-cord pull and a flamer cone */
class BountyHunter extends Enemy {
  constructor(type, o) {
    super(type, o);
    this.brainFn = (dt, d) => this.thinkHunter(dt, d);
    this.jetT = 0; this.jetCd = rnd(1.5, 3); this.whipCd = rnd(3, 5); this.flameCd = rnd(3, 5); this.flameT = 0; this.flameTk = 0;
    this.lungeT = 0; this.lungeHit = false; this.pullT = 0; this.pullP = null;
    this.flameM = (this.inst.att && this.inst.att.flame) || [];
    for (const m of this.flameM) m.visible = false;
  }
  thinkHunter(dt, d) {
    const P = this.P, D = this.D; if (!P) return;
    this.jetCd -= dt; this.whipCd -= dt; this.flameCd -= dt;
    if (this.flameT > 0) { this.flameT -= dt; this.yaw = dampA(this.yaw, this.angTo(P), 8, dt); this.vx = damp(this.vx, 0, 6, dt); this.vz = damp(this.vz, 0, 6, dt); this.flameTick(dt, P); return; }
    if (this.lungeT > 0) return;   // in the air or striking: update() moves it
    if (D.jet && this.jetCd <= 0 && d > 5 && d < 11) { if (this.seesPlayer(14)) { this.jetLunge(P); return; } this.jetCd = 0.5; }   // no line of sight: retry later, not every frame
    if (D.flamer && this.flameCd <= 0 && d < 4.2 && this.graceT <= 0) { this.startFlame(); return; }
    if (D.whip && this.whipCd <= 0 && d > 3.5 && d < 11) { if (this.seesPlayer(14)) { this.whipPull(P); return; } this.whipCd = 0.5; }
    this.thinkGunner(dt, d);
  }
  jetLunge(P) {
    const dx = P.x - this.x, dz = P.z - this.z, L = Math.hypot(dx, dz) || 1;
    if (this.aimT !== undefined) { this.aimT = undefined; if (this.gun) this.gun.userData.glow.material.opacity = 0; COMBAT.freeToken('shoot', this); }
    this.jetCd = rnd(4.5, 6.5); this.lungeT = 0.85; this.lungeHit = false; this.jetT = 0.5;
    this.yaw = Math.atan2(dx, dz); this.vx = dx / L * 9; this.vz = dz / L * 9; this.vy = 4.2; this.grounded = false;
    this.play('lunge', { fade: 0.06 });
    FX.puff(V3(this.x, this.y + 0.2, this.z), 6, { size: 0.3, col: [0.6, 0.55, 0.5], a: 0.4, spread: 1.2, life: 0.9 }); FX.addShake(0.05);
  }
  whipPull(P) {
    this.whipCd = rnd(7, 9); this.pullT = 0.45; this.pullP = P;
    this.play('whip', { fade: 0.05 });
    COMBAT.damage(P, 3, { src: this, kind: 'whip', dir: V3(this.x - P.x, 0, this.z - P.z).normalize() });
  }
  startFlame() { this.flameCd = rnd(6, 8); this.flameT = 1.25; this.flameTk = 0; this.play('flame', { fade: 0.05 }); }
  flameTick(dt, P) {
    this.flameTk -= dt; if (this.flameTk > 0) return; this.flameTk = 0.22;
    const yy = this.yaw, fx = Math.sin(yy), fz = Math.cos(yy);
    for (let k = 0; k < 3; k++) { const r = 1.0 + k * 0.9; FX.puff(V3(this.x + fx * r, this.y + 1.2, this.z + fz * r), 2, { add: true, size: 0.22 + k * 0.1, col: [1, 0.5, 0.12], a: 0.9, life: 0.35, spread: 0.5, rise: 0.4 }); }
    if (!P.alive) return;
    const dx = P.x - this.x, dz = P.z - this.z;
    if (Math.hypot(dx, dz) < 4.6 && Math.abs(wrapA(Math.atan2(dx, dz) - yy)) < 0.6) COMBAT.damage(P, 3.5, { src: this, kind: 'flame', dir: V3(dx, 0, dz).normalize() });
  }
  update(dt) {
    super.update(dt);
    if (!this.alive || this.gone) return;
    if (this.jetT > 0) { this.jetT -= dt; const yy = this.yaw; FX.puff(V3(this.x - Math.sin(yy) * 0.22, this.y + 1.05, this.z - Math.cos(yy) * 0.22), 2, { add: true, size: 0.12, col: [1, 0.6, 0.2], a: 0.9, life: 0.22, spread: 0.2, rise: 0.1 }); }
    for (const m of this.flameM) m.visible = this.jetT > 0 || this.flameT > 0;
    if (this.lungeT > 0) {   // the landing strike: a short reach once the jet has put it down
      this.lungeT -= dt;
      if (!this.lungeHit && this.lungeT < 0.5 && this.grounded) {
        this.lungeHit = true; const P = this.P;
        if (P && P.alive && this.dist(P) < 2.4 && Math.abs(wrapA(this.angTo(P) - this.yaw)) < 1.2) COMBAT.damage(P, this.D.dmg * 1.2, { src: this, kind: 'melee', dir: V3(P.x - this.x, 0, P.z - this.z).normalize() });
      }
      this.vx *= 0.97; this.vz *= 0.97;
    }
    if (this.pullT > 0) { this.pullT -= dt; const P = this.pullP; if (P && P.alive) { const dx = this.x - P.x, dz = this.z - P.z, L = Math.hypot(dx, dz); if (L > 1.6) P.moveH(dx / L * 7 * dt, dz / L * 7 * dt); } }
  }
}
/* Jedi hunter: the p31 duellist. A Force-use echo (ENEMY.alertAt) draws it in at a sprint; near the player it duels as normal */
class JediHunter extends Jedi {
  constructor(who, o) { super(who, o); this.hunter = true; this.sensesEcho = false; this.lureX = 0; this.lureZ = 0; this.lureT = 0; }
  think(dt) {
    if (this.lureT > 0 && !this.act) {
      this.lureT -= dt;
      const P = this.P, dP = P && P.alive ? this.dist(P) : 99, dl = Math.hypot(this.lureX - this.x, this.lureZ - this.z);
      if (dP < 9 || dl < 1.5 || this.lureT <= 0) this.lureT = 0;
      else { this.yaw = dampA(this.yaw, Math.atan2(this.lureX - this.x, this.lureZ - this.z), 6, dt); this.steer(this.lureX, this.lureZ, 5.6, dt); this.setBase('run'); return; }
    }
    if (RNG() < dt * 0.03) ENEMY.bark(this, 'idle');
    super.think(dt);
  }
  onHit(info) { super.onHit(info); if (this.alive && RNG() < 0.4) ENEMY.bark(this, 'pain'); }
  /* the kit's Jedi strikes always deal the full blow; the template's dmgK scales what this seeker or hunter lands */
  strikeCheck(dt) { const P = this.P, h0 = P ? P.hp : 0; super.strikeCheck(dt); if (P && P.alive && this.dmgK < 1 && P.hp < h0) P.hp = h0 - (h0 - P.hp) * this.dmgK; }
}
/* bind the classes to their types (the Object.assign in p55 ran before these existed) */
for (const t of ['commando', 'commSgt', 'commArmored']) ENEMY.TYPES[t].cls = Militia;
for (const t of ['bhunter', 'bhunterB', 'bhunterC']) ENEMY.TYPES[t].cls = BountyHunter;
/* ENEMY.alertAt(x, z, r): a Force-use echo. Militia within r are alerted; Jedi hunters within r (seekers: 60 m) sprint to it */
ENEMY.alertAt = function (x, z, r) {
  for (const e of ENEMY.list) if (e.alive && !e.hidden && !e.alerted && Math.hypot(e.x - x, e.z - z) <= r) e.alert();
  for (const b of BOSS.list) {
    if (!b.hunter || !b.alive || b.hidden || b.passive) continue;
    const d = Math.hypot(b.x - x, b.z - z);
    if (b.sensesEcho ? d < 60 : d <= r) { b.lureX = x; b.lureZ = z; b.lureT = 7; if (b.sensesEcho) ENEMY.bark(b, 'call'); }
  }
};
/* ---------------------------------------------------------------- barks: LORE.barks[faction] = 20 taunts, 15 pain, 15 idle, 10 callouts */
HUNT.BARK_RANGE = { taunt: [0, 20], pain: [20, 35], idle: [35, 50], call: [50, 60] };
HUNT.barkNext = -99; HUNT.lastLine = {};
HUNT.onScreen = function (e) { const v = HUNT.vs = HUNT.vs || V3(); v.set(e.x, e.y + 1.4, e.z).project(R.camera); return v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.9; };
/* one subtitle line: global gap 3.5 s, 8 s per speaker, speaker within 25 m and on screen. Returns true when it spoke. */
ENEMY.bark = function (e, kind) {
  const fac = HUNT.FAC[e.type], L = fac && LORE.barks && LORE.barks[fac], R0 = HUNT.BARK_RANGE[kind];
  if (!L || !R0 || !e.alive || e.hidden) return false;
  const now = MG.t, P = PLAYER.a;
  if (now < HUNT.barkNext || now - (e.barkAt === undefined ? -99 : e.barkAt) < 8) return false;
  if (!P || !P.alive || e.dist(P) > 25 || !HUNT.onScreen(e)) return false;
  let i = rndi(R0[0], R0[1] - 1); if (i === HUNT.lastLine[fac]) i = R0[0] + ((i - R0[0] + 1) % (R0[1] - R0[0]));
  HUNT.lastLine[fac] = i; HUNT.barkNext = now + 3.5; e.barkAt = now;
  HUD.sub((e.D ? e.D.name : e.name) || 'HUNTER', L[i], 2.2);
  return true;
};
/* wrapped hooks on the kit's Enemy: taunt on alert, pain on a survived hit, idle murmurs and callouts while aiming */
(function () {
  const a0 = Enemy.prototype.alert; Enemy.prototype.alert = function () { const was = this.alerted; a0.call(this); if (!was && this.alerted) ENEMY.bark(this, 'taunt'); };
  const h0 = Enemy.prototype.onHit; Enemy.prototype.onHit = function (info) { h0.call(this, info); if (this.alive && RNG() < 0.5) ENEMY.bark(this, 'pain'); };
  const u0 = Enemy.prototype.update;
  Enemy.prototype.update = function (dt) {
    u0.call(this, dt);
    if (!this.alive || this.hidden || !HUNT.FAC[this.type]) return;
    if (!this.alerted) { if (RNG() < dt * 0.05) ENEMY.bark(this, 'idle'); }
    else if (this.aimT !== undefined && RNG() < dt * 0.3) ENEMY.bark(this, 'call');
  };
})();
