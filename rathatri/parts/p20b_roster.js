/* ROSTER — the Phantom Menace good guys as enemy types, plus their special behaviours. */
Object.assign(ENEMY.TYPES, {
  guard: { tpl: 'guard', hp: 40, brain: 'gunner', moves: 'trooper', weapon: 'rifle', dmg: 6, burst: 3, acc: 0.085, range: [6, 13], speed: 3.1, name: 'Naboo Security', drain: 4, col: [1, 0.15, 0.08] },
  panaka: { tpl: 'panaka', hp: 170, brain: 'gunner', moves: 'trooper', weapon: 'rifle', dmg: 7, burst: 5, acc: 0.06, range: [7, 14], speed: 3.4, name: 'Captain Panaka', drain: 20, col: [1, 0.2, 0.08], elite: true },
  csf: { tpl: 'csf', hp: 46, brain: 'gunner', moves: 'trooper', weapon: 'rifle', dmg: 6, burst: 3, acc: 0.08, range: [6, 12], speed: 3.1, name: 'Coruscant Security', drain: 4, col: [1, 0.2, 0.1] },
  senate: { tpl: 'senate', hp: 80, brain: 'melee', moves: 'melee', weapon: 'staff', staffKind: 'pike', dmg: 12, speed: 3.4, name: 'Senate Guard', drain: 8, blocks: 0.35 },
  gungan: { tpl: 'gungan', hp: 64, brain: 'melee', moves: 'melee', weapon: 'staff', staffKind: 'electro', dmg: 11, speed: 3.8, name: 'Gungan Warrior', drain: 6, blocks: 0.1 },
  gunganShield: { tpl: 'gungan', hp: 70, brain: 'melee', moves: 'melee', weapon: 'staff', staffKind: 'electro', dmg: 10, speed: 3.2, name: 'Gungan Shieldbearer', drain: 8, shield: 90 },
  gunganBooma: { tpl: 'gungan', hp: 50, brain: 'booma', moves: 'melee', weapon: 'staff', staffKind: 'cesta', dmg: 12, speed: 3.0, name: 'Gungan Booma Thrower', drain: 6, range: [9, 16] },
});
/* staff variants: Senate pike, Gungan cesta (booma sling) */
(function () {
  const s0 = CAST.staff;
  CAST.staff = function (kind) {
    if (kind !== 'pike' && kind !== 'cesta') return s0(kind);
    const g = new THREE.Group();
    if (kind === 'pike') {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 1.9, 10), CAST.pm(0x1a1c24, 0.35, 0.7)); rod.position.y = 0.2; g.add(rod);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 4), CAST.pm(0xc8ccd4, 0.2, 1.0)); blade.position.y = 1.32; g.add(blade);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), CAST.pm(0xb89040, 0.3, 1.0)); cuff.position.y = 1.1; g.add(cuff);
    } else {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.2, 8), CAST.pm(0x6a4a2a, 0.8, 0)); g.add(rod);
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, TAU, 0, HALF * 1.2), CAST.pm(0x5a3a22, 0.7, 0)); cup.position.y = 0.62; cup.rotation.x = PI; g.add(cup);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 3, 6), toneMapped: false })); ball.position.y = 0.66; g.add(ball); g.userData.ball = ball;
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.position.y = 0.7; g.add(glow); g.userData.glow = glow; const mz = new THREE.Object3D(); mz.position.y = kind === 'pike' ? 1.3 : 0.66; g.add(mz); g.userData.muzzle = mz;
    R.scene.add(g); return g;
  };
})();
/* electropole glow colour for Gungans (blue-white ends) is the default electro staff */
/* ---- shields, blocks, boomas */
(function () {
  const ctor = Enemy.prototype.constructor;
  const post = function (e) {
    if (e.D.shield) { e.shieldHP = e.D.shield; e.shieldM = CAST.shield(); e.inst.bones[7].add(e.shieldM); e.shieldM.position.set(0.06, -0.12, 0.05); }
  };
  const upd0 = Enemy.prototype.update;
  Enemy.prototype.update = function (dt) {
    if (!this._post) { this._post = true; post(this); }
    upd0.call(this, dt);
    if (this.shieldM) { this.shieldM.visible = this.alive && this.shieldHP > 0; this.shieldM.material.opacity = 0.25 + 0.15 * Math.sin(MG.t * 9) + (this.shieldFlash || 0); this.shieldFlash = Math.max(0, (this.shieldFlash || 0) - dt * 2); }
  };
  void ctor;
  Enemy.prototype.tryBlock = function (atk, dmg, kind, p) {
    if (!this.alive || this.stunned || this.state === 'knock' || this.gripped) return false;
    const facing = Math.abs(wrapA(this.angTo(atk) - this.yaw)) < 1.2;
    const heavy = kind === 'slam' || kind === 'sweep' || kind === 'whirl' || kind === 'thrust' || kind === 'plunge';
    if (!facing) return false;
    if (this.shieldHP > 0) {
      this.shieldHP -= dmg * (heavy ? 2.5 : 1); this.shieldFlash = 0.6; FX.spark(p, V3(0, 1, 0), 14, 4, [1, 2.5, 4]);
      if (this.shieldHP <= 0) { HUD.pop('SHIELD BROKEN'); FX.ring(V3(this.x, this.y + 1, this.z), [0.4, 0.9, 1.6], 1.8, 0.4); this.stunned = true; this.stop(); this.play('stun'); this.setState('stun'); }
      return !heavy || this.shieldHP > 0;
    }
    if (this.D.blocks && !heavy && RNG() < this.D.blocks && !(this.act === 'strike')) { this.play('block', { fade: 0.03 }); this.setState('stagger'); FX.spark(p, V3(0, 1, 0), 10, 4, [3, 2.5, 1.5]); return true; }
    return false;
  };
  const think0 = Enemy.prototype.think;
  Enemy.prototype.think = function (dt) {
    if (this.brain === 'booma' && this.alerted && !this.passive) { this.graceT -= dt; return this.thinkBooma(dt, this.dist(this.P)); }
    return think0.call(this, dt);
  };
  Enemy.prototype.thinkBooma = function (dt, d) {
    const P = this.P, D = this.D; if (!P || !P.alive) return;
    this.yaw = dampA(this.yaw, this.angTo(P), 6, dt);
    if (this.act === 'wind' || this.act === 'strike') { this.vx *= 0.85; this.vz *= 0.85; if (this.act === 'strike' && this.actT > 0.1 && !this.thrown) { this.thrown = true; const mz = this.gun.userData.muzzle.getWorldPosition(V3()); const tgt = V3(P.x + P.vx * 0.8, P.y + 0.3, P.z + P.vz * 0.8); COMBAT.booma(mz, tgt, this); if (this.gun.userData.ball) this.gun.userData.ball.visible = false; } return; }
    this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(1.5, 3); }
    const [dmin, dmax] = D.range, ax = (P.x - this.x) / (d || 1), az = (P.z - this.z) / (d || 1);
    let fx = 0, fz = 0; if (d > dmax) { fx += ax; fz += az; } else if (d < dmin) { fx -= ax; fz -= az; }
    fx += -az * this.strafe * 0.7; fz += ax * this.strafe * 0.7; const L = Math.hypot(fx, fz) || 1;
    this.vx = damp(this.vx, fx / L * D.speed, 6, dt); this.vz = damp(this.vz, fz / L * D.speed, 6, dt); this.setBase(this.speed > 1.2 ? 'run' : 'idle');
    this.shootCd -= dt;
    if (this.shootCd <= 0 && this.graceT <= 0 && d < dmax + 4 && this.seesPlayer(24) && COMBAT.wantToken('shoot', this, 2)) { this.thrown = false; if (this.gun.userData.ball) this.gun.userData.ball.visible = true; this.play('wind', { fade: 0.08, speed: 1.3 }); this.shootCd = rnd(3.2, 4.8); }
  };
  const actEnd0 = Enemy.prototype.actEnd;
  Enemy.prototype.actEnd = function (n) { if (this.brain === 'booma') { if (n === 'wind') { this.play('strike', { fade: 0.02 }); return; } if (n === 'strike') COMBAT.freeToken('shoot', this); return; } return actEnd0.call(this, n); };
})();
/* Force push sends boomas back where they came from */
(function () { const p0 = PLAYER.push; PLAYER.push = function (air) { p0(air); MG.after(0.2, () => { const a = PLAYER.a; if (!COMBAT.boomas || !a) return; for (const b of COMBAT.boomas) { const dx = b.p.x - a.x, dz = b.p.z - a.z; if (Math.hypot(dx, dz) < 10 && b.team === 'foe') { b.team = 'hero'; const s = b.shooter; const tgt = s && s.alive ? V3(s.x, s.y + 1, s.z) : V3(a.x + dx * 3, a.y, a.z + dz * 3); const T = 0.8; b.v.set((tgt.x - b.p.x) / T, (tgt.y - b.p.y + 7 * T * T) / T, (tgt.z - b.p.z) / T); HUD.pop('BOOMA RETURNED'); COMBAT.stylePoint(2); } } }); }; })();
/* ---- holographic Jedi (Sidious' training shadows) */
CM.holoSkinned = function () {
  if (CM.cache.holo) return CM.cache.holo;
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(0.25, 0.6, 1.4), emissiveIntensity: 1, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, roughness: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = { value: 0 }; m.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; varying vec3 vWp;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat scan = 0.55 + 0.45 * sin(vWp.y * 70.0 - uT * 6.0); float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.5); totalEmissiveRadiance *= scan * (0.35 + 1.6 * fr) * (0.9 + 0.1 * sin(uT * 50.0));');
  };
  m.customProgramCacheKey = () => 'holoSk';
  CM.cache.holo = m; return m;
};

/* booma: a blue plasma ball that arcs and bursts */
COMBAT.booma = function (from, to, shooter) {
  const p = from.clone(), T = 1.05, g = 14, v = to.clone().sub(from); v.y = 0; const dist = v.length(); v.normalize().multiplyScalar(dist / T); v.y = (to.y - from.y + 0.5 * g * T * T) / T;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 3.2, 6), toneMapped: false })); m.position.copy(p); R.scene.add(m);
  const L = R.addLight({ pos: m.position, col: new THREE.Color(0.3, 0.7, 1), i: 3, range: 5, prio: 2, on: true });
  const b = { p, v, t: 0, m, L, shooter, dead: false, team: 'foe', isBooma: true };
  COMBAT.boomas = COMBAT.boomas || []; COMBAT.boomas.push(b); return b;
};
COMBAT.updateBoomas = function (dt) {
  if (!COMBAT.boomas) return;
  for (let i = COMBAT.boomas.length - 1; i >= 0; i--) {
    const b = COMBAT.boomas[i]; b.t += dt; b.v.y -= 14 * dt; b.p.addScaledVector(b.v, dt); b.m.position.copy(b.p); b.m.scale.setScalar(1 + 0.15 * Math.sin(b.t * 30));
    if (RNG() < dt * 30) FX.puff(b.p, 1, { add: true, size: 0.2, col: [0.3, 0.7, 1.2], a: 0.8, life: 0.3, spread: 0.2 });
    const g = PHY.ground(b.p.x, b.p.z, 0.1, b.p.y + 0.5, b.p.y - 0.5); const P = PLAYER.a;
    const hitP = P && P.alive && b.team === 'foe' && Math.hypot(P.x - b.p.x, P.z - b.p.z) < 0.6 && b.p.y > P.y && b.p.y < P.y + 1.9;
    const hitFoe = b.team === 'hero' && COMBAT.foes().some((e) => Math.hypot(e.x - b.p.x, e.z - b.p.z) < 0.7 && b.p.y > e.y && b.p.y < e.y + 2);
    if ((g !== null && b.p.y <= g + 0.1) || hitP || hitFoe || b.t > 4) {
      FX.ring(b.p.clone(), [0.4, 1.0, 2.0], 2.6, 0.35); FX.spark(b.p, V3(0, 1, 0), 24, 5, [1.5, 3, 5]); FX.flashLight(b.p, [0.4, 0.8, 1.4], 8, 7, 0.2); FX.addShake(0.2);
      if (P && P.alive && b.team === 'foe' && Math.hypot(P.x - b.p.x, P.z - b.p.z) < 2.2 && Math.abs(P.y - b.p.y) < 2) COMBAT.damage(P, 12, { src: b.shooter, kind: 'booma', knock: true, dir: V3(P.x - b.p.x, 0, P.z - b.p.z).normalize() });
      if (b.team === 'hero') for (const e of COMBAT.foes()) if (Math.hypot(e.x - b.p.x, e.z - b.p.z) < 2.4) COMBAT.damage(e, 30, { src: PLAYER.a, kind: 'booma', knock: true, dir: V3(e.x - b.p.x, 0, e.z - b.p.z).normalize(), force: 8 });
      R.scene.remove(b.m); R.removeLight(b.L); COMBAT.boomas.splice(i, 1);
    }
  }
};
