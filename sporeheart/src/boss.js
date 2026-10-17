/* SPOREHEART — boss.js : THE POPPIED VEIL — one assassin, three faces, one HP bar.
     Form I   "Duelist"   (veil)   fast katana duel — dash-slash, interruptible overhead, petals, flank, spin
     Form II  "Unveiled"  (veil2)  dual blades — blade dance, crimson cross, petal storm, rising leap, imps
     Form III "The Beast" (beast)  7 m greatsword titan — sweep, slam + jumpable shockwave, stomp quake, charge into
                                   the houses (crash = stagger), petal beam, leap slam, spin
   Every attack is a small timeline object { dur, start(b), tick(b, t, dt), end(b) } with ground telegraphs that
   FILL as the hit approaches, so the player can read it and time a dash (perfect-dodge slow-mo) or a jump.
   POISE: hits fill a poise bar; when it breaks (or an Overhead wind-up is interrupted) the boss kneels and takes
   +50% damage — the ally barrage deals extra to a staggered boss.                                            */
(function () {
  "use strict";
  const G = window.G;
  const B = (G.boss = { active: null });
  const U = G.util;
  const T = () => G.THREE;

  const HP = [700, 900, 1100];
  const START = { x: 0, z: -7 };
  const ARENA_R = 19;

  let sceneRef = null;
  let teleMats = null, teleGeo = null;
  const telePool = [];

  /* ---------------------------------------------------------------- helpers */
  const rnd = (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const ang = (dx, dz) => Math.atan2(dx, dz);
  function groundAt(x, z) { const w = G.world; return w && w.heightAt ? w.heightAt(x, z) : 0; }
  const sfx = (n, o) => { try { G.sfx.play(n, o); } catch (e) { /* audio optional */ } };

  /* ---------------------------------------------------------------- telegraphs */
  function initTele() {
    if (teleMats) return;
    const THREE = T();
    const add = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    teleMats = { fill: () => add(0xff2a1c, 0.18), edge: () => add(0xff7a4a, 0.85), prog: () => add(0xff3a24, 0.42) };
    teleGeo = { circle: new THREE.CircleGeometry(1, 48), ring: new THREE.RingGeometry(0.93, 1, 56), plane: new THREE.PlaneGeometry(1, 1) };
  }
  function getTele() {
    for (const t of telePool) if (!t.busy) return t;
    const THREE = T();
    const g = new THREE.Group();
    const t = { busy: false, g, fill: null, edge: null, prog: null, m: { fill: teleMats.fill(), edge: teleMats.edge(), prog: teleMats.prog() }, dur: 1, life: 0, kind: "circle", cb: null, arcGeos: [] };
    t.fill = new THREE.Mesh(teleGeo.circle, t.m.fill); t.edge = new THREE.Mesh(teleGeo.ring, t.m.edge); t.prog = new THREE.Mesh(teleGeo.circle, t.m.prog);
    for (const m of [t.fill, t.edge, t.prog]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 6; g.add(m); }
    t.line = new THREE.Mesh(teleGeo.plane, t.m.fill); t.lineProg = new THREE.Mesh(teleGeo.plane, t.m.prog);
    for (const m of [t.line, t.lineProg]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 6; g.add(m); }
    g.visible = false; sceneRef.add(g);
    telePool.push(t);
    return t;
  }
  function releaseTele(t) { t.busy = false; t.g.visible = false; t.cb = null; if (t.arc) { t.g.remove(t.arc); t.arc.geometry.dispose(); t.arc = null; } if (t.arcProg) { t.g.remove(t.arcProg); t.arcProg.geometry.dispose(); t.arcProg = null; } }
  /* kind: circle | line | arc.  circle(x,z,r) · line(x,z,yaw,len,width) · arc(x,z,yaw,range,arcAngle) */
  function tele(kind, x, z, a, b, c, dur, cb) {
    initTele();
    const t = getTele(); t.busy = true; t.kind = kind; t.dur = dur; t.life = 0; t.cb = cb || null;
    const y = groundAt(x, z) + 0.12;
    t.g.position.set(x, y, z); t.g.visible = true; t.g.rotation.set(0, 0, 0);
    const show = (circ, line) => { t.fill.visible = t.edge.visible = t.prog.visible = circ; t.line.visible = t.lineProg.visible = line; };
    if (kind === "circle") {
      show(true, false); t.fill.scale.setScalar(a); t.edge.scale.setScalar(a); t.prog.scale.setScalar(0.01); t.r = a;
    } else if (kind === "line") {
      show(false, true); t.g.rotation.y = a; t.len = b; t.wid = c;
      t.line.scale.set(c, b, 1); t.line.position.set(0, 0, b / 2); t.lineProg.scale.set(c * 0.96, 0.01, 1); t.lineProg.position.set(0, 0, 0);
    } else {   // arc
      show(false, false); t.g.rotation.y = a; const THREE = T();
      const gA = new THREE.RingGeometry(0, 1, 40, 1, -Math.PI / 2 - b / 2, b), gB = new THREE.RingGeometry(0, 1, 40, 1, -Math.PI / 2 - b / 2, b);
      t.arc = new THREE.Mesh(gA, t.m.fill); t.arcProg = new THREE.Mesh(gB, t.m.prog);
      for (const m of [t.arc, t.arcProg]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 6; m.scale.setScalar(c); t.g.add(m); }
      t.arcProg.scale.setScalar(0.01); t.range = c;
    }
    return t;
  }
  function updateTeles(dt) {
    for (const t of telePool) {
      if (!t.busy) continue;
      t.life += dt;
      const k = Math.min(1, t.life / t.dur);
      const pulse = 0.55 + 0.45 * Math.sin(t.life * 30);
      t.m.fill.opacity = 0.16 + 0.12 * pulse * k; t.m.edge.opacity = 0.55 + 0.4 * pulse; t.m.prog.opacity = 0.32 + 0.3 * k;
      if (t.kind === "circle") t.prog.scale.setScalar(Math.max(0.01, t.r * k));
      else if (t.kind === "line") { t.lineProg.scale.y = Math.max(0.01, t.len * k); t.lineProg.position.z = t.len * k / 2; }
      else if (t.arcProg) t.arcProg.scale.setScalar(Math.max(0.01, t.range * k));
      if (t.life >= t.dur) { const cb = t.cb; releaseTele(t); if (cb) cb(); }
    }
  }
  function clearTeles() { for (const t of telePool) if (t.busy) releaseTele(t); }

  /* ---------------------------------------------------------------- model building (with graceful fallbacks) */
  function build(form) {
    const id = form === 1 ? "veil" : form === 2 ? "veil2" : "beast";
    let b = null;
    try { if (G.chars.has(id)) b = G.chars.build(id); } catch (e) { console.warn("[boss] build failed", id, e); }
    if (!b) {
      try {
        const v = form < 3 ? G.villains.buildAssassin() : G.villains.buildBoss(3);
        b = { root: v.root, parts: v.parts, anim: null, height: v.height, radius: v.radius };
      } catch (e) {
        const THREE = T(); const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(form < 3 ? 0.4 : 2, form < 3 ? 1.2 : 4, 4, 8), new THREE.MeshToonMaterial({ color: 0xaa2030 }));
        m.position.y = form < 3 ? 1 : 3.5; g.add(m); b = { root: g, parts: {}, anim: null };
      }
    }
    return b;
  }
  const DIM = { 1: { h: 1.85, r: 0.45 }, 2: { h: 1.85, r: 0.45 }, 3: { h: 7.0, r: 2.2 } };

  /* ================================================================ BOSS */
  function Boss(ctx) {
    this.ctx = ctx; this.form = 1; this.t = 0; this.state = "spawn"; this.stateT = 0;
    this.cd = 1.4; this.attack = null; this.last = ""; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 2;
    this.vx = 0; this.vz = 0; this.knockX = 0; this.knockZ = 0; this.dashing = 0;
    this.poise = 0; this.poiseMax = 6; this.poiseDecayT = 0; this.interruptible = false;
    this.timers = []; this.dead = false; this.hit0 = 0; this.transforming = false;
    this.total = HP[0] + HP[1] + HP[2];
    this.skin = null;
    this.attacksDone = 0; this.rage = false;
  }
  B.Boss = Boss;

  Boss.prototype.after = function (t, fn) { this.timers.push({ t: t, fn: fn }); };
  Boss.prototype.clip = function (name, o) { if (this.anim && this.anim.has(name)) { this.anim.play(name, o || { fade: 0.08, once: true }); return true; } return false; };
  Boss.prototype.loopClip = function (name, o) { if (this.anim && this.anim.has(name)) { this.anim.play(name, Object.assign({ fade: 0.15, loop: true }, o || {})); return true; } return false; };
  Boss.prototype.pos = function () { return this.root.position; };

  Boss.prototype.mountModel = function (form, keepPos) {
    const prev = this.root;
    const m = build(form);
    this.model = m; this.root = m.root; this.parts = m.parts || {}; this.anim = m.anim || null;
    const d = DIM[form];
    if (prev) { this.root.position.copy(prev.position); this.root.rotation.y = prev.rotation.y; if (prev.parent) prev.parent.remove(prev); }
    else this.root.position.set(START.x, groundAt(START.x, START.z), START.z);
    sceneRef.add(this.root);
    if (this.anim && this.anim.has("idle")) { this.anim.setBase("idle"); this.anim.play("idle", { fade: 0 }); }
    this.form = form;
    if (this.ent) { this.ent.object3D = this.root; this.ent.radius = d.r; this.ent.height = d.h; }
    this.flash = null;
  };

  Boss.prototype.init = function () {
    const THREE = T();
    this.mountModel(1);
    const self = this;
    const ent = this.ent = {
      object3D: this.root, team: "enemy", radius: DIM[1].r, height: DIM[1].h, hp: this.total, maxHp: this.total, alive: true,
      isBoss: true, staggered: false, iframeTimer: 0, name: "veil",
      takeDamage(amt, hit) { self.onDamage(amt, hit); }
    };
    G.combat.register(ent);
    this.pp = new THREE.Vector3();
    this.setupPhase(1, true);
  };

  /* hp thresholds: phase 1 ends at total-HP[0]; phase 2 at HP[2] remaining */
  Boss.prototype.phaseFloor = function (form) { return form === 1 ? HP[1] + HP[2] : form === 2 ? HP[2] : 0; };

  Boss.prototype.setupPhase = function (form, first) {
    this.poise = 0; this.poiseMax = form === 1 ? 6 : form === 2 ? 8 : 11;
    this.cd = first ? 1.2 : 1.6; this.attack = null; this.attacksDone = 0; this.rage = false;
    if (G.ui) G.ui.setBoss(this.ent.hp / this.total, form, form === 3 ? "THE POPPIED BEAST" : "THE POPPIED VEIL");
  };

  /* ------------------------------------------------ damage / poise */
  Boss.prototype.onDamage = function (amt, hit) {
    const e = this.ent; if (!e.alive || this.transforming) return;
    const stag = this.state === "stagger";
    let dmg = Math.max(1, amt * (stag ? 1.5 : 1));
    if (this.form === 3 && !stag && !this.attack) dmg *= 1.0;
    const floor = this.phaseFloor(this.form);
    e.hp = Math.max(floor, e.hp - dmg);
    e.flashT = 1;
    if (hit && hit.from) {
      const p = this.pos(); let dx = p.x - hit.from.x, dz = p.z - hit.from.z; const d = Math.hypot(dx, dz) || 1;
      const k = (hit.knock || 2) * (this.form === 3 ? 0.04 : 0.28);
      this.knockX += dx / d * k; this.knockZ += dz / d * k;
    }
    const sp = e.object3D.position;
    G.combat.damageNumber({ x: sp.x, y: sp.y + e.height * 0.7, z: sp.z }, dmg, { crit: stag, color: stag ? 0xffd166 : 0xfff0f6 });
    if (G.vfx.hitSpark) G.vfx.hitSpark({ x: sp.x, y: sp.y + e.height * 0.55, z: sp.z });
    G.bus.emit("boss:hit", { dmg: dmg, hp: e.hp });
    /* interrupt: hitting the overhead wind-up staggers instantly (forms I/II) */
    const st = hit && hit.stagger || 0;
    if (this.interruptible && st >= 0.2 && this.form < 3) { this.breakPoise("parry"); }
    else if (!stag && !this.attackNoPoise) {
      this.poise += st * (this.form === 3 && this.attack ? 0.5 : 1); this.poiseDecayT = 2.2;
      if (this.poise >= this.poiseMax) this.breakPoise("poise");
    }
    if (e.hp <= floor + 0.01) this.phaseDown();
    if (G.ui) G.ui.setBoss(e.hp / this.total, this.form, null);
  };

  Boss.prototype.breakPoise = function (why) {
    if (this.state === "stagger" || this.transforming) return;
    this.cancelAttack(); this.poise = 0;
    this.enter("stagger");
    this.ent.staggered = true;
    this.staggerDur = this.form === 3 ? 4.0 : this.form === 2 ? 2.8 : 3.0;
    G.vfx.burst(this.pos(), { count: 24, color: 0xffd166, speed: 7, size: 0.4, life: 0.6, gravity: 0, spread: 1, tex: "glow" });
    G.vfx.ringShockwave(this.pos(), 0xffd166, this.form === 3 ? 6 : 2.6);
    G.combat.hitstop(0.12); G.vfx.shake(0.4); sfx("parry", { vol: 0.9 }); G.bus.emit("parry", {});
    G.bus.emit("boss:stagger", { why: why });
    if (G.ui) G.ui.toast(why === "parry" ? "Interrupted!" : "Poise broken!");
  };

  Boss.prototype.phaseDown = function () {
    if (this.transforming) return;
    if (this.form >= 3) return this.die();
    this.transforming = true; this.cancelAttack(); clearTeles();
    this.ent.iframeTimer = 99; this.ent.staggered = false;
    const next = this.form + 1, self = this;
    this.enter("transform");
    G.bus.emit("boss:phaseStart", { n: next });
    G.vfx.slowmo(0.25, 1.6); G.vfx.flash(0xffffff, 0.35); G.vfx.shake(0.6); sfx(next === 2 ? "roar2" : "roar3", { vol: 1 });
    G.render.fx.aberration = 1;
    clearProjectiles();
    if (next === 2) {
      this.clip("transform", { fade: 0.1, once: true });
      this.after(1.1, function () { self.mountModel(2); self.clip("transform", { fade: 0, once: true }); petalBurst(self.pos(), 40); });
      this.after(2.4, function () { self.finishTransform(2); });
    } else {
      /* the veil kneels, petals pour out of her and the beast rises where she stood */
      this.clip("transform", { fade: 0.1, once: true });
      G.vfx.shake(0.8);
      this.after(1.2, function () {
        petalBurst(self.pos(), 80);
        G.vfx.ringShockwave(self.pos(), 0xff3a2a, 10); G.vfx.ringShockwave(self.pos(), 0xffb347, 6);
        self.mountModel(3); self.root.scale.setScalar(0.35); self.rise = 0; self.clip("rise", { fade: 0, once: true });
        if (G.world.beastArena) G.world.beastArena(true);
        G.render.fx.boss = 1;
        G.bus.emit("boss:beast", {});
        sfx("roar3", { vol: 1 }); G.vfx.shake(1);
      });
      this.after(4.6, function () { self.finishTransform(3); });
    }
  };

  Boss.prototype.finishTransform = function (form) {
    this.transforming = false; this.ent.iframeTimer = 0; this.root.scale.setScalar(1);
    this.setupPhase(form, false); this.enter("approach");
    G.bus.emit("boss:phase", { n: form, phase: form });
    if (form === 2) {
      for (let i = 0; i < 2; i++) { const a = i * Math.PI + rnd(0.5); try { G.villains.spawnImp({ x: this.pos().x + Math.sin(a) * 6, z: this.pos().z + Math.cos(a) * 6 }); } catch (e) { /* imps optional */ } }
      G.bus.emit("assassin:adds", {});
    }
  };

  Boss.prototype.die = function () {
    if (this.dead) return; this.dead = true; this.cancelAttack(); clearTeles(); clearProjectiles();
    this.ent.alive = false; this.ent.hp = 0; this.state = "dead";
    this.clip("death", { fade: 0.1, once: true });
    G.combat.unregister(this.ent);
    G.bus.emit("boss:down", {});
    G.vfx.slowmo(0.2, 2.4); G.vfx.flash(0xffffff, 0.5); G.vfx.shake(1); sfx("explosion", { vol: 1 }); G.render.fx.aberration = 1;
    const self = this;
    for (let i = 0; i < 6; i++) this.after(0.3 + i * 0.35, function () {
      const p = self.pos(); const o = { x: p.x + rnd(-2, 2) * (self.form === 3 ? 1.5 : 0.4), y: p.y + rnd(0.5, self.form === 3 ? 6 : 1.8), z: p.z + rnd(-2, 2) * (self.form === 3 ? 1.5 : 0.4) };
      G.vfx.burst(o, { count: 24, color: pick([0xff3a2a, 0xffb347, 0xff9ec4]), speed: 6, size: 0.5, life: 0.9, gravity: -2, spread: 1, tex: "glow" }); G.vfx.petals(o); sfx("explosion", { vol: 0.5 });
    });
    this.after(3.2, function () { petalBurst(self.pos(), 120); if (self.root.parent) self.root.parent.remove(self.root); });
  };

  /* ------------------------------------------------ state machine */
  Boss.prototype.enter = function (s) {
    this.state = s; this.stateT = 0; this.interruptible = false; this.attackNoPoise = false;
    if (s === "stagger") { this.loopClip("stagger"); }
    else if (s === "approach") { this.ent.staggered = false; }
    if (s === "approach") this.loopClip(this.speedClip || "idle");
  };
  Boss.prototype.cancelAttack = function () {
    if (this.attack && this.attack.end) { try { this.attack.end(this); } catch (e) { console.error(e); } }
    this.attack = null; this.dashing = 0; this.interruptible = false; this.attackNoPoise = false; this.timers.length = 0; clearTeles();
  };

  Boss.prototype.vanish = function (dur) { this.root.visible = false; this.hidden = true; this.ent.iframeTimer = Math.max(this.ent.iframeTimer || 0, dur); };
  Boss.prototype.appear = function () { this.root.visible = true; this.hidden = false; this.ent.iframeTimer = 0; };
  Boss.prototype.playerPos = function () { const P = G.player; return { x: P.x, y: P.y, z: P.z }; };
  Boss.prototype.dist = function () { const p = this.pos(), P = G.player; return Math.hypot(P.x - p.x, P.z - p.z); };
  Boss.prototype.face = function (dt, rate) {
    const p = this.pos(), P = G.player;
    this.root.rotation.y = U.angleLerp(this.root.rotation.y, ang(P.x - p.x, P.z - p.z), 1 - Math.exp(-(rate || 8) * dt));
  };
  Boss.prototype.faceSnap = function () { const p = this.pos(), P = G.player; this.root.rotation.y = ang(P.x - p.x, P.z - p.z); };
  Boss.prototype.fwd = function () { const y = this.root.rotation.y; return { x: Math.sin(y), z: Math.cos(y) }; };

  /* move with collisions; the beast bulldozes small props but not houses */
  Boss.prototype.move = function (dx, dz, dt, bulldoze) {
    const p = this.pos(); let x = p.x + dx, z = p.z + dz;
    const r = this.ent.radius * (this.form === 3 ? 0.7 : 1);
    const cols = G.world.colliders;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i]; if (!c || c.alive === false) continue;
      if (this.form === 3 && c.r < 1.3 && c.y1 < 3.2) { if (bulldoze && G.world.shatterNear && Math.hypot(x - c.x, z - c.z) < c.r + r) G.world.shatterNear(c.x, c.z, 2.2, 200); continue; }
      const cr = c.r + r, ax = x - c.x, az = z - c.z, d2 = ax * ax + az * az;
      if (d2 < cr * cr) {
        const d = Math.sqrt(d2) || 0.001; x += ax / d * (cr - d); z += az / d * (cr - d);
        if (this.state === "charge" && this.attack) this.crash(c);
      }
    }
    const d = Math.hypot(x, z - (G.world.plazaCenter.z || 0));
    if (d > ARENA_R) { x *= ARENA_R / d; z = (G.world.plazaCenter.z || 0) + (z - (G.world.plazaCenter.z || 0)) * ARENA_R / d; }
    p.x = x; p.z = z; p.y = groundAt(x, z);
  };

  /* ---------------- hit helpers (all route through combat.applyDamage so dash i-frames / perfect dodge work) */
  Boss.prototype.hurtPlayer = function (dmg, knock, up, fx, fz, stagger) {
    const ent = G.player.ent; if (!ent || ent.alive === false) return false;
    const p = this.pos();
    return G.combat.applyDamage(ent, dmg, knock, stagger || 0.3, this.ent, fx === undefined ? p.x : fx, p.y + 1, fz === undefined ? p.z : fz, false, "enemy", up || 0);
  };
  Boss.prototype.hitCircle = function (x, z, r, dmg, knock, up, airOK) {
    const P = G.player; if (!airOK && P.y - groundAt(P.x, P.z) > 1.2) return false;
    if (Math.hypot(P.x - x, P.z - z) > r + 0.35) return false;
    return this.hurtPlayer(dmg, knock, up, x, z);
  };
  Boss.prototype.hitLine = function (x, z, yaw, len, wid, dmg, knock, up) {
    const P = G.player, dx = P.x - x, dz = P.z - z, fx = Math.sin(yaw), fz = Math.cos(yaw);
    const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
    if (along < -0.3 || along > len || side > wid / 2 + 0.4) return false;
    return this.hurtPlayer(dmg, knock, up, x, z);
  };
  Boss.prototype.hitSector = function (range, arc, dmg, knock, up, yaw, mult) {
    const p = this.pos(), P = G.player, dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz);
    if (d > range + 0.4) return false;
    const a = yaw === undefined ? this.root.rotation.y : yaw;
    const dot = (dx * Math.sin(a) + dz * Math.cos(a)) / (d || 1);
    if (d > 0.8 && dot < Math.cos(arc / 2)) return false;
    return this.hurtPlayer(dmg * (mult || 1), knock, up, p.x, p.z);
  };
  Boss.prototype.ringWave = function (x, z, r0, r1, speed, dmg, knock, color) {
    /* an expanding ground ring: hits a grounded player once, jump over it */
    const w = { x: x, z: z, r: r0, r1: r1, speed: speed, dmg: dmg, knock: knock, hit: false, color: color || 0xff3a2a };
    G.vfx.ringShockwave({ x: x, y: groundAt(x, z), z: z }, w.color, r1);
    this.waves = this.waves || []; this.waves.push(w);
  };
  Boss.prototype.updateWaves = function (dt) {
    if (!this.waves) return;
    const P = G.player;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i]; w.r += w.speed * dt;
      if (!w.hit) {
        const d = Math.hypot(P.x - w.x, P.z - w.z), air = P.y - groundAt(P.x, P.z);
        if (Math.abs(d - w.r) < 0.9 && air < 0.75) { w.hit = true; this.hurtPlayer(w.dmg, w.knock, 3, w.x, w.z); }
      }
      if (w.r >= w.r1) this.waves.splice(i, 1);
    }
  };

  function petalBurst(p, n) {
    G.vfx.burst({ x: p.x, y: p.y + 1, z: p.z }, { count: n || 30, color: 0xe8333a, speed: 9, size: 0.45, life: 1.3, gravity: -2, spread: 1, tex: "petal" });
    G.vfx.petals({ x: p.x, y: p.y + 1, z: p.z });
  }
  function clearProjectiles() { /* enemy projectiles are short-lived; nothing pooled to flush */ }

  Boss.prototype.slashTrail = function (cfg) {
    const p = this.pos(), y = this.root.rotation.y, pts = this._pts || (this._pts = Array.from({ length: 9 }, () => ({ x: 0, y: 0, z: 0 })));
    const range = cfg.range || 3, arc = cfg.arc || 2.4, h = cfg.h || 1.1;
    for (let i = 0; i < pts.length; i++) {
      const k = i / (pts.length - 1), a = y - arc * 0.5 + arc * (cfg.flip ? 1 - k : k);
      pts[i].x = p.x + Math.sin(a) * range * 0.9; pts[i].y = p.y + h + Math.sin(Math.PI * k) * (cfg.lift || 0.3); pts[i].z = p.z + Math.cos(a) * range * 0.9;
    }
    G.vfx.slashTrail(pts, cfg.color || 0xff5a3a);
  };

  Boss.prototype.fireProjectile = function (yaw, speed, dmg, y, color, life) {
    const p = this.pos();
    const f = this.form === 3 ? 2.2 : 0.5;
    G.combat.projectile({
      from: { x: p.x + Math.sin(yaw) * f, y: p.y + (y || 1.2), z: p.z + Math.cos(yaw) * f }, dir: { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) },
      speed: speed, r: this.form === 3 ? 0.55 : 0.3, dmg: dmg, team: "enemy", homing: 0, life: life || 2.6, color: color || 0xff3a4a, trail: true, knock: 3, stagger: 0.2, src: this.ent
    });
  };

  /* ================================================================ ATTACKS */
  const ATK = {};

  /* ---- FORM I ---- */
  ATK.dashSlash = {
    dur: 1.7, range: [4, 99], w: 3,
    start(b) {
      b.faceSnap(); const P = G.player, p = b.pos(); b.dirYaw = ang(P.x - p.x, P.z - p.z);
      b.clip("slash1", { fade: 0.06, once: true, speed: 0.4 });
      tele("line", p.x, p.z, b.dirYaw, 10.5, 1.7, 0.55);
      sfx("telegraph", { vol: 0.5 }); G.vfx.burst(p, { count: 8, color: 0xff3a2a, speed: 2, size: 0.3, life: 0.4, gravity: 0, spread: 1, tex: "glow" });
    },
    tick(b, t, dt) {
      const p = b.pos();
      if (t < 0.55) { b.root.rotation.y = U.angleLerp(b.root.rotation.y, b.dirYaw, 1 - Math.exp(-14 * dt)); return; }
      if (t >= 0.55 && !this.a) { this.a = 1; b.clip("dash", { fade: 0.02, once: true }); sfx("dash", { vol: 0.8 }); b.root.rotation.y = b.dirYaw; this.hit = false; b.sx = p.x; b.sz = p.z; b.dashT = 0.3; G.vfx.burst(p, { count: 14, color: 0xff6a3a, speed: 6, size: 0.4, life: 0.4, gravity: 0, spread: 1, tex: "glow" }); }
      if (b.dashT > 0) {
        b.dashT -= dt; const s = 30 * dt; b.move(Math.sin(b.dirYaw) * s, Math.cos(b.dirYaw) * s, dt);
        G.vfx.burst({ x: p.x, y: p.y + 1, z: p.z }, { count: 2, color: 0xff3a2a, speed: 0.8, size: 0.35, life: 0.3, gravity: 0, spread: 0.6, tex: "glow" });
        if (!this.hit && b.hitLine(b.sx, b.sz, b.dirYaw, Math.hypot(p.x - b.sx, p.z - b.sz) + 1, 1.6, 15, 6, 1)) this.hit = true;
        if (b.dashT <= 0) { b.faceSnap(); b.clip("slash2", { fade: 0.04, once: true }); this.fin = t; }
      }
      if (this.fin && t - this.fin > 0.12 && !this.s2) { this.s2 = 1; b.slashTrail({ range: 3.2, arc: 2.6, color: 0xff4a3a }); sfx("swing2"); b.hitSector(3.4, 2.4, 12, 6, 2); }
    },
    end(b) { this.a = this.s2 = this.fin = 0; }
  };

  ATK.overhead = {
    dur: 2.0, range: [0, 6], w: 3,
    start(b) {
      b.faceSnap(); b.clip("overhead", { fade: 0.08, once: true });
      const p = b.pos(); const f = b.fwd();
      tele("arc", p.x, p.z, b.root.rotation.y, 1.9, 4.2, 0.85);
      tele("line", p.x, p.z, b.root.rotation.y, 8, 1.1, 1.0);
      b.interruptible = true; sfx("telegraph", { vol: 0.6 });
      b.glow = 1;
    },
    tick(b, t, dt) {
      if (t < 0.85) b.root.rotation.y = U.angleLerp(b.root.rotation.y, ang(G.player.x - b.pos().x, G.player.z - b.pos().z), 1 - Math.exp(-3 * dt));
      if (t >= 0.85 && !this.a) {
        this.a = 1; b.interruptible = false; const p = b.pos(), y = b.root.rotation.y;
        b.hitSector(4.2, 1.9, 24, 8, 3); b.slashTrail({ range: 4, arc: 1.9, color: 0xff3a2a, lift: 0.8 });
        b.hitLine(p.x, p.z, y, 8, 1.2, 14, 4, 0);
        G.vfx.ringShockwave({ x: p.x + Math.sin(y) * 3, y: p.y, z: p.z + Math.cos(y) * 3 }, 0xff4a3a, 3);
        G.vfx.burst({ x: p.x + Math.sin(y) * 3, y: p.y + 0.3, z: p.z + Math.cos(y) * 3 }, { count: 20, color: 0xff5a3a, speed: 7, size: 0.4, life: 0.5, gravity: -3, spread: 1, tex: "glow" });
        G.vfx.shake(0.35); sfx("swing3"); sfx("explosion", { vol: 0.5 });
        if (G.world.shatterNear) G.world.shatterNear(p.x + Math.sin(y) * 3, p.z + Math.cos(y) * 3, 3, 40);
      }
    },
    end(b) { this.a = 0; b.interruptible = false; }
  };

  ATK.petalVolley = {
    dur: 1.5, range: [5, 99], w: 2,
    start(b) { b.faceSnap(); b.clip("cast", { fade: 0.08, once: true }); sfx("petal", { vol: 0.6 }); G.vfx.ringShockwave(b.pos(), 0xff3a4a, 2); },
    tick(b, t, dt) {
      b.face(dt, 10);
      if (t >= 0.55 && !this.a) {
        this.a = 1; const base = b.root.rotation.y;
        for (let i = -2; i <= 2; i++) b.fireProjectile(base + i * 0.22, 15, 9, 1.2, 0xff3a4a);
        sfx("bolt", { vol: 0.7, rate: 0.8 }); G.vfx.burst(b.pos(), { count: 16, color: 0xff5a6a, speed: 5, size: 0.35, life: 0.4, gravity: 0, spread: 1, tex: "petal" });
      }
    },
    end() { this.a = 0; }
  };

  ATK.flank = {
    dur: 1.9, range: [2, 99], w: 3,
    start(b) {
      b.clip("teleportOut", { fade: 0.03, once: true }); const p = b.pos();
      petalBurst(p, 24); sfx("portal", { vol: 0.7, rate: 1.6 }); b.vanish(0.8);
      const P = G.player, a = Math.random() * Math.PI * 2, d = 2.6;
      this.tx = P.x + Math.sin(a) * d; this.tz = P.z + Math.cos(a) * d;
      const q = Math.hypot(this.tx, this.tz); if (q > ARENA_R - 1) { this.tx *= (ARENA_R - 1) / q; this.tz *= (ARENA_R - 1) / q; }
      tele("circle", this.tx, this.tz, 2.4, 0, 0, 0.7);
    },
    tick(b, t, dt) {
      if (t >= 0.7 && !this.a) {
        this.a = 1; const p = b.pos(); p.x = this.tx; p.z = this.tz; p.y = groundAt(p.x, p.z);
        b.appear(); b.faceSnap(); b.clip("teleportIn", { fade: 0.02, once: true }); petalBurst(p, 20); sfx("portal", { vol: 0.7, rate: 1.9 });
      }
      if (t >= 0.82 && !this.b) { this.b = 1; b.clip("slash1", { fade: 0.02, once: true }); b.slashTrail({ range: 3.1, arc: 2.5, color: 0xff4a3a }); sfx("swing1"); b.hitSector(3.3, 2.6, 13, 5, 1); }
      if (t >= 1.12 && !this.c) { this.c = 1; b.faceSnap(); b.clip("slash2", { fade: 0.02, once: true }); b.slashTrail({ range: 3.1, arc: 2.5, flip: true, color: 0xff4a3a }); sfx("swing2"); b.hitSector(3.3, 2.6, 10, 6, 2); }
    },
    end(b) { this.a = this.b = this.c = 0; b.appear(); }
  };

  ATK.spin = {
    dur: 1.5, range: [0, 4], w: 3,
    start(b) { b.faceSnap(); b.clip("taunt", { fade: 0.06, once: true, speed: 2 }); const p = b.pos(); tele("circle", p.x, p.z, 3.8, 0, 0, 0.65); sfx("telegraph", { vol: 0.6 }); },
    tick(b, t, dt) {
      if (t >= 0.65 && !this.a) {
        this.a = 1; b.clip("spin", { fade: 0.02, once: true }); const p = b.pos();
        b.hitCircle(p.x, p.z, 3.8, 16, 9, 2, true); G.vfx.ringShockwave(p, 0xff3a2a, 3.8); sfx("swing3");
        for (let i = 0; i < 3; i++) b.after(i * 0.05, function () { b.slashTrail({ range: 3.5, arc: 6, flip: i % 2 === 1, color: 0xff3a2a }); });
        G.vfx.shake(0.3);
      }
    },
    end() { this.a = 0; }
  };

  /* ---- FORM II ---- */
  ATK.bladeDance = {
    dur: 2.5, range: [0, 99], w: 4,
    start(b) { b.faceSnap(); this.n = 0; this.next = 0.35; const p = b.pos(); tele("circle", p.x, p.z, 3.4, 0, 0, 0.35); sfx("telegraph", { vol: 0.5 }); },
    tick(b, t, dt) {
      if (this.n < 5 && t >= this.next) {
        const i = this.n++; this.next += i === 3 ? 0.45 : 0.3;
        b.faceSnap(); b.clip(i % 2 ? "slash2" : "slash1", { fade: 0.02, once: true, speed: 1.4 });
        const p = b.pos(), P = G.player, d = Math.hypot(P.x - p.x, P.z - p.z);
        if (d > 2.2) { const k = Math.min(d - 2, 5), y = b.root.rotation.y; b.move(Math.sin(y) * k, Math.cos(y) * k, dt); }
        const last = i === 4;
        b.slashTrail({ range: 3.2, arc: 2.6, flip: i % 2 === 1, color: 0xff4a3a, lift: last ? 0.9 : 0.3 });
        sfx("swing" + (1 + (i % 3))); b.hitSector(3.4, 2.6, last ? 14 : 7, last ? 8 : 4, last ? 5 : 0.5);
        if (last) { G.vfx.shake(0.3); G.vfx.ringShockwave(b.pos(), 0xff4a3a, 3); }
      }
    },
    end() { this.n = 0; }
  };

  ATK.crimsonCross = {
    dur: 2.9, range: [0, 99], w: 3,
    start(b) {
      b.clip("teleportOut", { fade: 0.03, once: true }); petalBurst(b.pos(), 20); b.vanish(2.15); sfx("portal", { rate: 1.5 });
      this.k = 0; this.sched = [0.05, 0.5, 0.95];
    },
    tick(b, t, dt) {
      while (this.k < 3 && t >= this.sched[this.k]) {
        this.k++; const P = G.player;
        const vx = G.input.move.mag > 0.1 ? P.vx * 0.35 : 0, vz = G.input.move.mag > 0.1 ? P.vz * 0.35 : 0;
        const x = P.x + vx, z = P.z + vz;
        tele("circle", x, z, 2.5, 0, 0, 0.8, function () {
          G.vfx.burst({ x: x, y: groundAt(x, z) + 0.4, z: z }, { count: 28, color: 0xff3a2a, speed: 8, size: 0.45, life: 0.6, gravity: -3, spread: 1, tex: "glow" });
          G.vfx.petals({ x: x, y: groundAt(x, z) + 0.5, z: z }); G.vfx.ringShockwave({ x: x, y: groundAt(x, z), z: z }, 0xff3a2a, 2.8); G.vfx.shake(0.2);
          sfx("explosion", { vol: 0.45 }); b.hitCircle(x, z, 2.5, 18, 6, 3, false);
        });
        sfx("telegraph", { vol: 0.4, rate: 1.2 });
      }
      if (t >= 2.1 && !this.a) {
        this.a = 1; const P = G.player, p = b.pos(), a = Math.random() * 6.28;
        p.x = P.x + Math.sin(a) * 4.5; p.z = P.z + Math.cos(a) * 4.5; const q = Math.hypot(p.x, p.z); if (q > ARENA_R - 1) { p.x *= (ARENA_R - 1) / q; p.z *= (ARENA_R - 1) / q; }
        p.y = groundAt(p.x, p.z); b.appear(); b.faceSnap(); b.clip("teleportIn", { fade: 0.02, once: true }); petalBurst(p, 24); sfx("portal", { rate: 1.9 });
      }
    },
    end(b) { this.k = 0; this.a = 0; b.appear(); }
  };

  ATK.petalStorm = {
    dur: 3.4, range: [0, 99], w: 2,
    start(b) { b.clip("cast", { fade: 0.08, once: true, speed: 0.6 }); this.n = 0; this.nx = 0.7; this.ang = Math.random() * 6; sfx("novaCharge", { vol: 0.7 }); G.vfx.ringShockwave(b.pos(), 0xff3a4a, 3); b.attackNoPoise = false; },
    tick(b, t, dt) {
      b.root.rotation.y += dt * 1.2;
      if (t > 0.7 && t < 3.0 && t >= this.nx) {
        this.nx += 0.075; this.ang += 0.62;
        b.fireProjectile(this.ang, 9.5, 6, 1.1, 0xff3a4a, 3.2); b.fireProjectile(this.ang + Math.PI, 9.5, 6, 1.1, 0xff3a4a, 3.2);
        if (this.n++ % 6 === 0) sfx("bolt", { vol: 0.35, rate: 0.7 });
      }
    },
    end() { this.n = 0; }
  };

  ATK.risingLeap = {
    dur: 2.1, range: [0, 99], w: 3,
    start(b) {
      b.clip("teleportOut", { fade: 0.03, once: true }); b.vanish(1.1); petalBurst(b.pos(), 14); sfx("jump", { rate: 0.8 });
      const P = G.player; this.tx = P.x; this.tz = P.z;
      tele("circle", this.tx, this.tz, 4.4, 0, 0, 1.0);
      this.rise = 0;
    },
    tick(b, t, dt) {
      if (t < 1.0) { const P = G.player; this.tx += (P.x - this.tx) * Math.min(1, dt * 1.5); this.tz += (P.z - this.tz) * Math.min(1, dt * 1.5); }
      if (t >= 1.05 && !this.a) {
        this.a = 1; const p = b.pos(); p.x = this.tx; p.z = this.tz; p.y = groundAt(p.x, p.z);
        b.appear(); b.clip("overhead", { fade: 0, once: true, speed: 2.2 });
        b.hitCircle(p.x, p.z, 4.4, 22, 8, 5, false); b.ringWave(p.x, p.z, 1, 9, 12, 12, 5, 0xff4a3a);
        petalBurst(p, 50); G.vfx.shake(0.55); sfx("explosion", { vol: 0.8 }); G.combat.hitstop(0.05);
        if (G.world.shatterNear) G.world.shatterNear(p.x, p.z, 4.4, 80);
      }
    },
    end(b) { this.a = 0; b.appear(); }
  };

  ATK.chainDash = {
    dur: 2.3, range: [3, 99], w: 3,
    start(b) { this.n = 0; this.t0 = 0; this.phase = 0; },
    tick(b, t, dt) {
      const p = b.pos(), P = G.player;
      if (this.phase === 0 && t >= this.t0) {
        this.phase = 1; b.faceSnap(); this.yaw = b.root.rotation.y; this.sx = p.x; this.sz = p.z; this.hit = false;
        tele("line", p.x, p.z, this.yaw, 11, 1.8, 0.5); b.clip("thrust", { fade: 0.04, once: true, speed: 0.5 }); sfx("telegraph", { vol: 0.5 });
        this.t1 = t + 0.5;
      } else if (this.phase === 1 && t >= this.t1) {
        this.phase = 2; this.dashT = 0.28; b.clip("dash", { fade: 0.02, once: true }); sfx("dash", { vol: 0.8 });
      } else if (this.phase === 2) {
        this.dashT -= dt; const s = 34 * dt; b.move(Math.sin(this.yaw) * s, Math.cos(this.yaw) * s, dt);
        G.vfx.burst({ x: p.x, y: p.y + 1, z: p.z }, { count: 2, color: 0xff3a2a, speed: 0.8, size: 0.35, life: 0.3, gravity: 0, spread: 0.6, tex: "glow" });
        if (!this.hit && b.hitLine(this.sx, this.sz, this.yaw, Math.hypot(p.x - this.sx, p.z - this.sz) + 1, 1.7, 14, 7, 2)) this.hit = true;
        if (this.dashT <= 0) { this.phase = 0; this.n++; this.t0 = t + 0.18; b.slashTrail({ range: 3, arc: 2.6, color: 0xff3a2a }); b.hitSector(3, 2.2, 8, 4, 1); if (this.n >= 2) this.phase = 9; }
      }
    },
    end() { this.n = 0; this.phase = 0; }
  };

  /* ---- FORM III : THE BEAST ---- */
  ATK.sweep = {
    dur: 2.4, range: [0, 11], w: 4,
    start(b) {
      b.faceSnap(); b.clip(Math.random() < 0.5 ? "slash1" : "slash2", { fade: 0.1, once: true });
      const p = b.pos(); tele("arc", p.x, p.z, b.root.rotation.y, 2.6, 10.5, 1.0); sfx("telegraph", { vol: 0.8, rate: 0.6 }); b.interruptible = false;
    },
    tick(b, t, dt) {
      if (t < 1.0) b.root.rotation.y = U.angleLerp(b.root.rotation.y, ang(G.player.x - b.pos().x, G.player.z - b.pos().z), 1 - Math.exp(-2.5 * dt));
      if (t >= 1.0 && !this.a) {
        this.a = 1; const p = b.pos();
        b.hitSector(10.5, 2.6, 28, 11, 4); b.slashTrail({ range: 10, arc: 2.6, h: 1.6, lift: 1.2, color: 0xff5a2a });
        G.vfx.shake(0.6); sfx("swing3", { vol: 1, rate: 0.55 }); G.combat.hitstop(0.05);
        const y = b.root.rotation.y;
        G.vfx.burst({ x: p.x + Math.sin(y) * 7, y: p.y + 0.5, z: p.z + Math.cos(y) * 7 }, { count: 30, color: 0xff7a3a, speed: 9, size: 0.6, life: 0.7, gravity: -3, spread: 1, tex: "glow" });
        if (G.world.shatterNear) { for (let r = 3; r < 10; r += 3) G.world.shatterNear(p.x + Math.sin(y) * r, p.z + Math.cos(y) * r, 3.2, 120); }
      }
    },
    end() { this.a = 0; }
  };

  ATK.slam = {
    dur: 2.8, range: [0, 14], w: 4,
    start(b) {
      b.faceSnap(); b.clip("overhead", { fade: 0.1, once: true });
      const f = b.fwd(), p = b.pos(); const d = Math.min(9, Math.max(5, b.dist() - 0.5));
      this.sx = p.x + f.x * d; this.sz = p.z + f.z * d;
      tele("circle", this.sx, this.sz, 5.5, 0, 0, 1.25); sfx("telegraph", { vol: 0.8, rate: 0.5 });
    },
    tick(b, t, dt) {
      if (t < 0.9) b.root.rotation.y = U.angleLerp(b.root.rotation.y, ang(G.player.x - b.pos().x, G.player.z - b.pos().z), 1 - Math.exp(-2 * dt));
      if (t >= 1.3 && !this.a) {
        this.a = 1; const x = this.sx, z = this.sz, y = groundAt(x, z);
        b.hitCircle(x, z, 5.5, 34, 12, 6, false); b.ringWave(x, z, 2, 17, 13, 22, 8, 0xff4a2a);
        G.vfx.burst({ x: x, y: y + 0.4, z: z }, { count: 60, color: 0xffa04a, speed: 12, size: 0.7, life: 0.9, gravity: -5, spread: 1, tex: "glow" }); petalBurst({ x: x, y: y, z: z }, 60);
        G.vfx.shake(0.9); sfx("explosion", { vol: 1 }); G.combat.hitstop(0.08); G.render.fx.aberration = 0.8;
        if (G.world.shatterNear) G.world.shatterNear(x, z, 8, 200);
      }
    },
    end() { this.a = 0; }
  };

  ATK.stompQuake = {
    dur: 3.3, range: [0, 14], w: 3,
    start(b) { this.n = 0; this.nx = 0.5; b.faceSnap(); b.clip("stomp", { fade: 0.1, once: true }); },
    tick(b, t, dt) {
      b.face(dt, 3);
      if (this.n < 3 && t >= this.nx) {
        const i = this.n++; this.nx += 0.85; const p = b.pos(), P = G.player;
        const yaw = ang(P.x - p.x, P.z - p.z) + (i - 1) * 0.35;
        tele("line", p.x, p.z, yaw, 20, 2.6, 0.7, function () {
          G.vfx.shake(0.5); sfx("explosion", { vol: 0.8, rate: 0.8 });
          b.hitLine(p.x, p.z, yaw, 20, 2.6, 24, 8, 4);
          for (let r = 2; r < 20; r += 3) G.vfx.burst({ x: p.x + Math.sin(yaw) * r, y: groundAt(p.x, p.z) + 0.3, z: p.z + Math.cos(yaw) * r }, { count: 8, color: 0xffa04a, speed: 6, size: 0.55, life: 0.6, gravity: -4, spread: 1, tex: "glow" });
          if (G.world.shatterNear) for (let r = 2; r < 20; r += 4) G.world.shatterNear(p.x + Math.sin(yaw) * r, p.z + Math.cos(yaw) * r, 2.5, 80);
        });
        b.clip("stomp", { fade: 0.02, once: true }); sfx("bossStep", { vol: 1 }); G.vfx.shake(0.25);
      }
    },
    end() { this.n = 0; }
  };

  ATK.charge = {
    dur: 4.2, range: [7, 99], w: 3,
    start(b) {
      b.faceSnap(); b.clip("roar", { fade: 0.1, once: true, speed: 1.6 }); this.t1 = 1.2; this.running = false; this.dist = 0;
      this.yaw = b.root.rotation.y; sfx("roar2", { vol: 0.9 });
      const p = b.pos(); tele("line", p.x, p.z, this.yaw, 28, 4.4, 1.2);
    },
    tick(b, t, dt) {
      if (t < this.t1) { const p = b.pos(); this.yaw = U.angleLerp(this.yaw, ang(G.player.x - p.x, G.player.z - p.z), 1 - Math.exp(-4 * dt)); b.root.rotation.y = this.yaw; return; }
      if (!this.running) { this.running = true; b.state = "charge"; b.loopClip("run"); this.hit = false; this.cr = false; }
      const p = b.pos(); const s = 24 * dt;
      b.move(Math.sin(this.yaw) * s, Math.cos(this.yaw) * s, dt, true); this.dist += s;
      if (((t * 30) | 0) % 4 === 0) { G.vfx.shake(0.12); }
      if (!this.hit && b.hitCircle(p.x + Math.sin(this.yaw) * 2, p.z + Math.cos(this.yaw) * 2, 3, 30, 14, 5, true)) this.hit = true;
      if (this.dist > 34 || this.cr) b.endAttack();
    },
    end(b) { this.running = false; if (b.state === "charge") b.state = "attack"; }
  };

  ATK.beam = {
    dur: 4.6, range: [0, 99], w: 3,
    start(b) { b.faceSnap(); b.clip("cast", { fade: 0.1, once: true }); sfx("novaCharge", { vol: 1, rate: 0.6 }); this.yaw = b.root.rotation.y; this.on = false; G.vfx.ringShockwave(b.pos(), 0xff3a2a, 5); },
    tick(b, t, dt) {
      const p = b.pos();
      if (t < 1.6) { const k = t / 1.6; G.vfx.burst({ x: p.x + Math.sin(b.root.rotation.y) * 2, y: p.y + 4, z: p.z + Math.cos(b.root.rotation.y) * 2 }, { count: 2, color: 0xff5a3a, speed: -2, size: 0.5 + k, life: 0.4, gravity: 0, spread: 1.5, tex: "glow" }); b.face(dt, 2); this.yaw = b.root.rotation.y; this.sweep = (Math.random() < 0.5 ? 1 : -1); return; }
      if (!this.on) { this.on = true; sfx("nova", { vol: 1, rate: 0.6 }); this.bt = 0; }
      this.yaw += this.sweep * dt * 0.62; b.root.rotation.y = this.yaw;
      const len = 26, f = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; this.bt -= dt;
      for (let r = 3; r < len; r += 2.2) G.vfx.burst({ x: p.x + f.x * r, y: p.y + 3.4 - r * 0.07, z: p.z + f.z * r }, { count: 1, color: pick([0xff3a2a, 0xffb347]), speed: 1, size: 0.9, life: 0.28, gravity: 0, spread: 0.5, tex: "glow" });
      if (this.bt <= 0) { this.bt = 0.25; b.hitLine(p.x, p.z, this.yaw, len, 2.2, 10, 5, 1); G.vfx.shake(0.25); if (G.world.shatterNear) G.world.shatterNear(p.x + f.x * 10, p.z + f.z * 10, 4, 60); }
    },
    end() { this.on = false; }
  };

  ATK.leapSlam = {
    dur: 2.2, range: [6, 99], w: 3,
    start(b) {
      b.faceSnap(); b.clip("leap", { fade: 0.08, once: true }); const P = G.player; this.tx = P.x; this.tz = P.z; this.sx = b.pos().x; this.sz = b.pos().z; this.air = 0; this.landed = false;
      tele("circle", this.tx, this.tz, 6, 0, 0, 1.25); sfx("jump", { rate: 0.5, vol: 1 });
    },
    tick(b, t, dt) {
      const p = b.pos();
      if (t < 0.4) return;
      if (t < 1.25) {
        const k = (t - 0.4) / 0.85; const e = k * k * (3 - 2 * k);
        p.x = this.sx + (this.tx - this.sx) * e; p.z = this.sz + (this.tz - this.sz) * e; p.y = groundAt(p.x, p.z) + Math.sin(k * Math.PI) * 9;
        b.root.rotation.y = U.angleLerp(b.root.rotation.y, ang(this.tx - this.sx, this.tz - this.sz), 0.2);
      } else if (!this.landed) {
        this.landed = true; p.y = groundAt(p.x, p.z); b.clip("land", { fade: 0.02, once: true });
        b.hitCircle(this.tx, this.tz, 6, 32, 12, 6, false); b.ringWave(this.tx, this.tz, 2, 16, 14, 20, 8, 0xff4a2a);
        petalBurst(p, 70); G.vfx.shake(1); sfx("explosion", { vol: 1 }); G.combat.hitstop(0.08); G.render.fx.aberration = 0.9;
        if (G.world.shatterNear) G.world.shatterNear(p.x, p.z, 8, 220);
      }
    },
    end(b) { const p = b.pos(); p.y = groundAt(p.x, p.z); this.landed = false; }
  };

  ATK.beastSpin = {
    dur: 2.4, range: [0, 8], w: 2,
    start(b) { b.faceSnap(); b.clip("spin", { fade: 0.1, once: true }); const p = b.pos(); tele("circle", p.x, p.z, 10.5, 0, 0, 0.95); sfx("telegraph", { vol: 0.8, rate: 0.5 }); },
    tick(b, t, dt) {
      if (t >= 0.95 && !this.a) {
        this.a = 1; const p = b.pos(); b.hitCircle(p.x, p.z, 10.5, 26, 13, 5, true); G.vfx.ringShockwave(p, 0xff4a2a, 10.5); G.vfx.shake(0.8); sfx("swing3", { rate: 0.5 });
        for (let i = 0; i < 4; i++) b.after(i * 0.08, function () { b.slashTrail({ range: 10, arc: 6, h: 1.6, flip: i % 2 === 1, color: 0xff5a2a }); });
        if (G.world.shatterNear) G.world.shatterNear(p.x, p.z, 10, 120);
      }
    },
    end() { this.a = 0; }
  };

  Boss.prototype.endAttack = function () {
    if (!this.attack) return;
    const a = this.attack; this.attack = null;
    if (a.end) a.end(this);
    this.interruptible = false; this.attackNoPoise = false;
    if (this.state !== "stagger" && this.state !== "transform") this.enter("approach");
    this.cd = (this.form === 1 ? 1.15 : this.form === 2 ? 0.8 : 1.15) * (this.rage ? 0.65 : 1) * rnd(0.85, 1.2);
    this.attacksDone++;
  };

  Boss.prototype.startAttack = function (name) {
    const a = ATK[name]; if (!a) return;
    this.attack = a; this.atkName = name; this.atkT = 0; this.state = "attack"; this.last = name;
    a.start(this);
  };

  Boss.prototype.chooseAttack = function () {
    const d = this.dist();
    const pool = [];
    const add = (n, w) => { if (n === this.last) w *= 0.25; for (let i = 0; i < Math.round(w * 4); i++) pool.push(n); };
    if (this.form === 1) {
      add("dashSlash", d > 4 ? 3 : 1); add("overhead", d < 6 ? 3 : 0.5); add("petalVolley", d > 5 ? 2.5 : 0.7); add("flank", 2.5); add("spin", d < 4 ? 3 : 0);
    } else if (this.form === 2) {
      add("bladeDance", d < 9 ? 3 : 1.5); add("crimsonCross", 2.5); add("petalStorm", 2); add("risingLeap", 2.5); add("chainDash", d > 4 ? 2.5 : 1); add("flank", 1.5);
    } else {
      add("sweep", d < 11 ? 3 : 0.3); add("slam", 2.5); add("stompQuake", 2.2); add("charge", d > 8 ? 3 : 1); add("beam", 2); add("leapSlam", d > 7 ? 2.8 : 0.8); add("beastSpin", d < 8 ? 2.2 : 0);
    }
    if (!pool.length) pool.push(this.form === 3 ? "slam" : "dashSlash");
    return pick(pool);
  };

  Boss.prototype.crash = function (c) {
    const a = this.attack; if (!a || a !== ATK.charge || a.cr) return;
    a.cr = true; const p = this.pos();
    G.vfx.shake(1); sfx("explosion", { vol: 1 }); G.combat.hitstop(0.1); petalBurst(p, 60); G.vfx.ringShockwave(p, 0xffd166, 8);
    if (G.world.shatterNear) G.world.shatterNear(p.x, p.z, 7, 400);
    this.ent.hp = Math.max(this.phaseFloor(3), this.ent.hp - 40);
    this.breakPoise("crash");
  };

  /* ------------------------------------------------ per-frame */
  Boss.prototype.update = function (dt) {
    if (this.dead && this.timers.length === 0 && !this.root.parent) return;
    this.t += dt; this.stateT += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); try { t.fn(); } catch (e) { console.error("[boss] timer", e); } } }
    updateTeles(dt); this.updateWaves(dt);
    if (this.anim) this.anim.update(dt, { speed: Math.hypot(this.vx, this.vz) });
    if (this.dead) return;
    const e = this.ent;
    if (e.flashT > 0) e.flashT = Math.max(0, e.flashT - dt * 5);
    /* glow flicker via root userData for the renderer */
    if (this.transforming) {
      if (this.form === 3 && this.rise !== undefined) { this.rise = Math.min(1, this.rise + dt / 3); const k = this.rise; this.root.scale.setScalar(0.35 + 0.65 * (1 - Math.pow(1 - k, 3))); G.vfx.shake(0.3 * (1 - k)); }
      return;
    }
    if (this.poiseDecayT > 0) this.poiseDecayT -= dt; else if (this.poise > 0) this.poise = Math.max(0, this.poise - dt * 0.7);
    /* rage: beast below 35% of its bar */
    if (this.form === 3 && !this.rage && e.hp < HP[2] * 0.35) {
      this.rage = true; G.ui && G.ui.banner("THE BEAST ENRAGES", "the poppies bleed light", 2); sfx("roar3", { vol: 1 }); G.vfx.shake(0.8); G.vfx.flash(0xff3a2a, 0.3);
    }
    const p = this.pos();
    /* knockback drift */
    if (Math.abs(this.knockX) + Math.abs(this.knockZ) > 0.01) { this.move(this.knockX * Math.min(1, dt * 12), this.knockZ * Math.min(1, dt * 12), dt); this.knockX *= Math.exp(-dt * 10); this.knockZ *= Math.exp(-dt * 10); }

    switch (this.state) {
      case "spawn":
        if (this.stateT > 0.1) { this.enter("approach"); }
        break;
      case "approach": {
        this.face(dt, this.form === 3 ? 3.5 : 8);
        const d = this.dist();
        const ideal = this.form === 3 ? 9 : this.form === 2 ? 3.8 : 4.8;
        const speed = this.form === 3 ? 4.2 : this.form === 2 ? 7.5 : 6.2;
        let mx = 0, mz = 0;
        const toP = ang(G.player.x - p.x, G.player.z - p.z);
        if (d > ideal + 0.8) { mx = Math.sin(toP); mz = Math.cos(toP); }
        else if (d < ideal - 1.2 && this.form !== 3) { mx = -Math.sin(toP) * 0.6; mz = -Math.cos(toP) * 0.6; }
        else { this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(1.5, 3); } mx = Math.cos(toP) * this.strafe * 0.7; mz = -Math.sin(toP) * this.strafe * 0.7; }
        let l = Math.hypot(mx, mz);
        if (l > 0.01) {                                           /* steer round obstacles (fountain, houses) */
          const hx = mx / l, hz = mz / l, r = this.ent.radius * (this.form === 3 ? 0.7 : 1), cols = G.world.colliders;
          let ax = 0, az = 0;
          for (let i = 0; i < cols.length; i++) {
            const c = cols[i]; if (!c || c.alive === false) continue;
            if (this.form === 3 && c.r < 1.3 && c.y1 < 3.2) continue;
            const rx = c.x - p.x, rz = c.z - p.z, look = 5 + c.r + r, ahead = rx * hx + rz * hz;
            if (ahead < 0 || ahead > look) continue;
            const lat = rx * -hz + rz * hx, need = c.r + r + 1.0;
            if (Math.abs(lat) > need) continue;
            const w = (1 - ahead / look) * 1.8, sg = Math.abs(lat) < 0.35 ? this.strafe : (lat > 0 ? -1 : 1);
            ax += -hz * sg * w; az += hx * sg * w;
          }
          mx = hx + ax; mz = hz + az; const l2 = Math.hypot(mx, mz) || 1; mx = mx / l2 * l; mz = mz / l2 * l;
        }
        l = Math.hypot(mx, mz);
        this.vx = l > 0.01 ? mx / l * speed * Math.min(1, l) : 0; this.vz = l > 0.01 ? mz / l * speed * Math.min(1, l) : 0;
        this.move(this.vx * dt, this.vz * dt, dt, true);
        const moving = l > 0.05;
        const want = moving ? (d > ideal + 3 ? "run" : "walk") : "idle";
        if (want !== this.speedClip) { this.speedClip = want; this.loopClip(this.anim && this.anim.has(want) ? want : "idle"); }
        if (this.form === 3 && this.stateT < 0.5) this.cd = Math.max(this.cd, 0.6);
        this.cd -= dt;
        if (this.cd <= 0) this.startAttack(this.chooseAttack());
        break;
      }
      case "attack": case "charge":
        this.atkT += dt;
        if (this.attack) { this.attack.tick(this, this.atkT, dt); if (this.attack && this.atkT >= this.attack.dur) this.endAttack(); }
        break;
      case "stagger":
        this.vx = this.vz = 0;
        if (this.stateT > 0.25 && this.stateT < 0.3) { G.vfx.burst({ x: p.x, y: p.y + e.height * 0.5, z: p.z }, { count: 8, color: 0xffd166, speed: 3, size: 0.4, life: 0.5, gravity: 0, spread: 1, tex: "glow" }); }
        if (((this.stateT * 8) | 0) !== ((this.stateT - dt) * 8 | 0)) G.vfx.burst({ x: p.x + rnd(-1, 1) * (this.form === 3 ? 2 : 0.4), y: p.y + e.height * rnd(0.3, 0.8), z: p.z + rnd(-1, 1) * (this.form === 3 ? 2 : 0.4) }, { count: 2, color: 0xffd166, speed: 1.5, size: 0.35, life: 0.5, gravity: 0, spread: 1, tex: "glow" });
        if (this.stateT >= (this.staggerDur || 3)) {
          this.ent.staggered = false; this.clip("roar", { fade: 0.08, once: true, speed: 2 });
          G.vfx.ringShockwave(p, 0xff3a2a, this.form === 3 ? 9 : 4); this.hitCircle(p.x, p.z, this.form === 3 ? 5 : 2.5, this.form === 3 ? 18 : 8, 9, 3, false);
          this.cd = 0.9; this.enter("approach");
        }
        break;
    }
    /* keep feet on the ground when idling */
    if (this.state !== "attack" || !this.attack || this.attack !== ATK.leapSlam) { /* y handled by move() */ }
  };

  Boss.prototype.reset = function () {
    /* player died: heal the boss back to the start of the current phase and send it home */
    this.cancelAttack(); clearTeles(); this.waves = [];
    const form = this.form; const e = this.ent;
    e.hp = this.phaseFloor(form) + HP[form - 1]; e.alive = true; e.iframeTimer = 0; this.dead = false;
    this.ent.staggered = false; this.transforming = false; this.root.visible = true; this.hidden = false; this.root.scale.setScalar(1);
    const p = this.pos(); p.x = START.x; p.z = START.z; p.y = groundAt(p.x, p.z);
    this.setupPhase(form, true); this.enter("approach");
  };

  /* ================================================================ module API */
  B.init = function (scene) { sceneRef = scene; };
  B.spawn = function (ctx) {
    if (B.active) B.despawn();
    initTele();
    const b = new Boss(ctx); b.init(); B.active = b;
    return b;
  };
  B.despawn = function () {
    const b = B.active; if (!b) return;
    b.cancelAttack(); clearTeles(); if (b.root.parent) b.root.parent.remove(b.root);
    try { G.combat.unregister(b.ent); } catch (e) { /* noop */ }
    B.active = null;
  };
  B.update = function (dt) { if (B.active) B.active.update(dt); };
  B.phaseFloor = (f) => (f === 1 ? HP[1] + HP[2] : f === 2 ? HP[2] : 0);
  B.HP = HP;
  B.total = HP[0] + HP[1] + HP[2];
})();
