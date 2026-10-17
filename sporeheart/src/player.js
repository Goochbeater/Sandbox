/* SPOREHEART — player.js : Mira's controller — touch-only input, movement tech, staff combat, spells, ally links
   Attaches G.player. All numeric state is plain numbers (x/y/z/vx/..) and pushed into THREE once per frame.

   TOUCH MAP (see ui.js)
     stick      run / sprint (analog)           drag pad   camera
     STRIKE     tap = 4-hit chain · hold = charged slam · in air = air chain · right after DASH = lunge
     JUMP       jump / double jump / wall-kick / hold in air = glide
     DASH       2 charges, i-frames, works in air, cancels attacks, perfect-dodge slow-mo
     SPELL      tap = spore bolt · hold = charge a Bloom Nova
     WARP       zip to the locked / best target (or a spore-pod) and strike on arrival
     ALLY A/B   Brood-Crane barrage · Thistle & Hob mend+strafe. Call during a chain for a link strike,
                call both within 3s for TRIPLE BLOOM.
     LOCK       toggle lock-on (the camera also assists on bosses)                                  */
(function () {
  "use strict";
  const G = window.G;
  if (!G) return;
  const P = (G.player = {});
  const TAU = Math.PI * 2;

  /* ---------------- tuning ---------------- */
  const WALK = 3.6, RUN = 7.6, SPRINT = 10.4;
  const ACCEL_G = 26, ACCEL_A = 9.5;
  const GRAV = 27, JUMP_V = 9.4, DJUMP_V = 8.4, GLIDE_FALL = 1.7, TERMINAL = -30;
  const COYOTE = 0.12, PLAYER_R = 0.42, PLAYER_H = 1.55;
  const DASH_TIME = 0.2, DASH_SPEED = 23, DASH_RECHARGE = 1.3, DASH_MAX = 2;
  const WARP_RANGE = 24, WARP_SPEED = 46;
  const MANA_REGEN = 7.5;
  const LOCK_RANGE = 26;

  const COMBO = [
    { dur: 0.32, hitAt: 0.11, dmg: 8,  range: 2.4, arc: 2.1, knock: 3.0, stagger: 0.14, hitstop: 0.04, step: 6.0, color: 0xffd9ea },
    { dur: 0.34, hitAt: 0.12, dmg: 9,  range: 2.5, arc: 2.3, knock: 3.6, stagger: 0.18, hitstop: 0.04, step: 6.4, color: 0xffb3d4 },
    { dur: 0.40, hitAt: 0.15, dmg: 11, range: 2.8, arc: 3.4, knock: 5.0, stagger: 0.26, hitstop: 0.06, step: 6.8, color: 0xff94c4 },
    { dur: 0.58, hitAt: 0.22, dmg: 16, range: 3.0, arc: 2.8, knock: 7.5, stagger: 0.50, hitstop: 0.09, step: 8.0, color: 0xff6aa8, up: 4.5 }
  ];
  const AIR = [
    { dur: 0.30, hitAt: 0.10, dmg: 8,  range: 2.5, arc: 3.0, knock: 3.0, stagger: 0.14, hitstop: 0.04, color: 0xbfe8ff },
    { dur: 0.32, hitAt: 0.11, dmg: 9,  range: 2.6, arc: 3.4, knock: 3.4, stagger: 0.18, hitstop: 0.04, color: 0x9fe0ff }
  ];

  /* ---------------- public state ---------------- */
  P.cooldowns = { a: { cur: 0, max: 14 }, b: { cur: 0, max: 18 }, hook: { cur: 0, max: 1.6 }, magic: { cur: 0, max: 0.001 } };
  P.dashCharges = DASH_MAX; P.dashCdT = 0; P.maxDashCharges = DASH_MAX;
  P.lockTarget = null; P.dmgBuff = 0; P.surge = 0; P.hookReady = false;
  P.scene = null; P.camera = null;
  P.cam = { yaw: 0, pitch: 0.34, dist: 5.4, x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, init: false, targetFov: 58, idle: 0 };
  P.x = 0; P.y = 0; P.z = 9; P.vx = 0; P.vy = 0; P.vz = 0; P.facing = 0;
  P.grounded = true; P.jumps = 0; P.coyote = COYOTE; P.airDash = 0;
  P.action = null; P.comboIndex = 0; P.chainT = 0; P.comboCount = 0; P.comboT = 0;
  P.moveX = 0; P.moveZ = 1; P.hasInput = false; P.gliding = false; P.sprinting = false; P.boost = 0;
  P.crane = { active: false }; P.thistle = { active: false }; P.healField = null;

  let entRef = null, lastEnt = null, animBase = "";
  let tmpLook = { dx: 0, dy: 0 };

  function defStat(name, def) {
    Object.defineProperty(P, name, { configurable: true, get() { return entRef ? entRef[name] : def; }, set(v) { if (entRef) entRef[name] = v; } });
  }
  defStat("hp", 100); defStat("maxHp", 100); defStat("mana", 100); defStat("maxMana", 100);
  Object.defineProperty(P, "alive", { configurable: true, get() { return entRef ? entRef.alive !== false : true; } });

  /* ---------------- helpers ---------------- */
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
  const rand = (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const sfx = (name, opts) => { try { G.sfx.play(name, opts); } catch (e) { /* audio optional */ } };
  const buzz = (ms) => G.input.haptic(ms);
  function groundAt(x, z) {
    const w = G.world;
    if (w && w.heightAt) { const h = w.heightAt(x, z); if (typeof h === "number" && isFinite(h)) return h; }
    return 0;
  }
  /* terrain + landable platforms (mushroom caps etc.) for a body whose feet are at y */
  function surfaceAt(x, z, y) {
    let h = groundAt(x, z);
    const pl = G.world && G.world.platforms;
    if (pl) for (let i = 0; i < pl.length; i++) {
      const p = pl[i];
      if (p.alive === false) continue;
      const dx = x - p.x, dz = z - p.z, d2 = dx * dx + dz * dz;
      if (d2 >= p.r * p.r) continue;
      const top = p.dome ? p.y0 + p.h * Math.sqrt(Math.max(0, 1 - d2 / (p.R * p.R))) : p.top;
      if (top > h && y >= top - 0.45) h = top;
    }
    return h;
  }
  function play(name, opts, fb) {
    const a = P.anim; if (!a) return false;
    if (!a.has(name)) { if (fb && a.has(fb)) name = fb; else return false; }
    a.play(name, opts); return true;
  }
  function base(name) { if (P.anim && P.anim.has(name)) P.anim.setBase(name); }
  const EP = { x: 0, y: 0, z: 0 };
  function entPos(e, out) {
    out = out || EP;
    const o = e && (e.object3D || e.mesh || e.root);
    if (o && o.position) { out.x = num(o.position.x, 0); out.y = num(o.position.y, 0); out.z = num(o.position.z, 0); }
    else { out.x = num(e && e.x, 0); out.y = num(e && e.y, 0); out.z = num(e && e.z, 0); }
    return out;
  }
  const enemies = () => (G.combat && G.combat.entities) || [];
  const isFoe = (e) => e && e.team === "enemy" && e.alive !== false && !(typeof e.hp === "number" && e.hp <= 0) && !e.untargetable;

  /* ---------------- fallback art ---------------- */
  function fallbackFigure(color, h) {
    const THREE = G.THREE, g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, h - 0.6, 4, 8), new THREE.MeshToonMaterial({ color }));
    m.position.y = h / 2; g.add(m);
    return { root: g, parts: {}, anim: null };
  }
  function buildChar(id, color, h) {
    let b = null;
    try { b = G.chars.build(id); } catch (e) { console.warn("[player] build failed", id, e); }
    return b && b.root ? b : fallbackFigure(color, h);
  }

  /* ---------------- init ---------------- */
  P.init = function (scene, camera) {
    const THREE = G.THREE;
    P.scene = scene; P.camera = camera;
    const ent = {
      object3D: null, team: "player", radius: PLAYER_R, height: PLAYER_H,
      hp: 100, maxHp: 100, mana: 100, maxMana: 100, alive: true, iframeTimer: 0,
      takeDamage(amt, hit) { P._damage(amt, hit); },
      onInvulnHit(hit) { P._onInvuln(hit); }
    };
    if (lastEnt && G.combat) G.combat.unregister(lastEnt);
    lastEnt = ent; entRef = P.ent = ent;
    P._hbPos = new THREE.Vector3(); P._hbDir = new THREE.Vector3(0, 0, 1);
    P._shakeVec = new THREE.Vector3(); P._staffPos = new THREE.Vector3();
    P._trailPts = []; for (let i = 0; i < 9; i++) P._trailPts.push({ x: 0, y: 0, z: 0 });

    const built = buildChar("witch", 0x232b3a, 1.45);
    P.root = built.root; P.parts = built.parts || {}; P.anim = built.anim || null; P.rig = built.rig || (P.root.userData && P.root.userData.rig) || null;
    P.staffGlow = null;
    if (G.assets.glowSprite) {
      const gs = G.assets.glowSprite(0x59d8e8, 1.25, 0.0);
      (P.parts.staffEye || P.parts.propR || P.root).add(gs);
      P.staffGlow = gs;
    }
    P.cloakPanels = []; P.cloakBase = [];
    if (Array.isArray(P.parts.cloak)) for (const p of P.parts.cloak) if (p && p.rotation) { P.cloakPanels.push(p); P.cloakBase.push(p.rotation.x); }
    P.root.position.set(P.x, P.y, P.z); scene.add(P.root);
    ent.object3D = P.root;
    G.combat.setScene(scene); G.combat.register(ent);
    P.reset({ x: 0, z: 9 });
    return P;
  };

  P.reset = function (pos) {
    const p = pos || { x: 0, z: 9 };
    if (!entRef) return;
    entRef.hp = entRef.maxHp = 100; entRef.mana = entRef.maxMana = 100;
    entRef.alive = true; entRef.iframeTimer = 0; entRef._killEmitted = false;
    P.x = num(p.x, 0); P.z = num(p.z, 9); P.y = num(p.y, groundAt(P.x, P.z));
    P.vx = P.vy = P.vz = 0;
    P.facing = num(p.facing, Math.atan2(-P.x, -P.z));
    P.grounded = true; P.jumps = 0; P.coyote = COYOTE; P.airDash = 0;
    P.action = null; P.comboIndex = 0; P.chainT = 0; P.comboCount = 0; P.comboT = 0;
    P.bufAttack = 0; P.bufJump = 0; P.bufDash = 0;
    P.dashCharges = DASH_MAX; P.dashCdT = 0; P.dashIFrames = 0; P.perfectDodged = false;
    P.dmgBuff = 0; P.castGlow = 0; P.deadT = 0; P.gliding = false; P.boost = 0; P.sprintT = 0;
    P.airAttacks = 0; P.afterDash = 0; P.hoverT = 0; P.surge = 0; P.lastHitT = 9; P.wallT = 0;
    P.cooldowns.a.cur = P.cooldowns.b.cur = P.cooldowns.hook.cur = 0; P.wallKickCd = 0; P.bounceCd = 0; P.afterDash = 0; P.stickMag = 0;
    P.lockTarget = null; P.healField = null; P.tripleT = 0; P.lastAllyT = 9; P.lastAlly = null;
    animBase = ""; despawnAllies();
    P.cam.yaw = P.facing; P.cam.pitch = 0.34; P.cam.dist = 5.4; P.cam.distGoal = 5.4; P.cam.baseFov = 58; P.cam.pitchGoal = null; P.cam.init = false; P.cam.targetFov = 58; P.cam.idle = 0;
    P.root.position.set(P.x, P.y, P.z); P.root.rotation.y = P.facing; P.root.scale.setScalar(1);
    if (P.anim) { play("idle", { fade: 0.2 }); base("idle"); }
    snapCamera();
    return P;
  };

  /* ================================================================
     CAMERA
     ================================================================ */
  function readCamera(dt) {
    const I = G.input;
    I.consumeLook(tmpLook);
    const s = G.settings, k = s.lookSens || 1;
    if (tmpLook.dx || tmpLook.dy) {
      P.cam.idle = 0;
      if (!P.lockTarget) P.cam.yaw -= tmpLook.dx * 0.0056 * k;
      P.cam.pitch = clamp(P.cam.pitch + tmpLook.dy * 0.0040 * k * (s.invertY ? -1 : 1), -0.2, 1.2);
    } else P.cam.idle += dt;
    /* orbit assist: holding the stick sideways swings the camera round, so one thumb can steer */
    if (!P.lockTarget && P.cam.idle > 0.7 && P.hasInput && P.grounded) {
      const sx = G.input.move.x, sy = G.input.move.y;
      P.cam.yaw -= sx * Math.abs(sx) * (sy > -0.3 ? 1.5 : 0.4) * dt;
    }
    P.cam.yaw = P.cam.yaw % TAU;
    const cg = P.cam;
    if (cg.distGoal) cg.dist = damp(cg.dist, cg.distGoal, 2.2, dt);
    if (cg.pitchGoal != null && cg.idle > 1.2) cg.pitch = damp(cg.pitch, cg.pitchGoal, 1.2, dt);
  }

  function findLockTarget() {
    const fx = Math.sin(P.cam.yaw), fz = Math.cos(P.cam.yaw);
    let best = null, bs = Infinity;
    const es = enemies();
    for (let i = 0; i < es.length; i++) {
      const e = es[i]; if (!isFoe(e)) continue;
      const ep = entPos(e), dx = ep.x - P.x, dz = ep.z - P.z, d = Math.hypot(dx, dz);
      if (d < 0.01 || d > LOCK_RANGE) continue;
      const dot = (dx * fx + dz * fz) / d;
      const bossBias = e.isBoss ? 0.5 : 1;
      const score = d * (1.9 - dot) * bossBias;
      if (score < bs) { bs = score; best = e; }
    }
    return best;
  }

  function updateLock(dt) {
    if (P.lockTarget) {
      const t = P.lockTarget, reg = enemies().indexOf(t) >= 0;
      if (!isFoe(t) || !reg) P.lockTarget = null;
    }
    if (G.input.pressed("lock")) {
      P.lockTarget = P.lockTarget ? null : findLockTarget();
      sfx("uiClick"); buzz(12);
      if (G.ui) G.ui.toast(P.lockTarget ? "Locked" : "Free camera");
    }
    if (P.lockTarget) {
      const ep = entPos(P.lockTarget);
      const want = Math.atan2(ep.x - P.x, ep.z - P.z);
      P.cam.yaw = G.util.angleLerp(P.cam.yaw, want, 1 - Math.exp(-6 * dt));
    }
  }

  function snapCamera() {
    computeCameraTarget(); P.cam.init = false;
    P.cam.x = P._camTX; P.cam.y = P._camTY; P.cam.z = P._camTZ;
    P.cam.lx = P._camLX; P.cam.ly = P._camLY; P.cam.lz = P._camLZ; P.cam.init = true;
    pushCamera(0, true);
  }
  P._camTX = P._camTY = P._camTZ = P._camLX = P._camLY = P._camLZ = 0;

  function computeCameraTarget() {
    const fx = Math.sin(P.cam.yaw), fz = Math.cos(P.cam.yaw);
    const rx = -fz, rz = fx;
    /* shoulder offset: nudge the witch off-centre so the bottom-left thumb never hides her */
    const lookX = P.x + rx * 0.5, lookY = P.y + 1.35, lookZ = P.z + rz * 0.5;
    const cosP = Math.cos(P.cam.pitch), sinP = Math.sin(P.cam.pitch);
    const dist = P.cam.dist;
    let cx = lookX - fx * dist * cosP, cz = lookZ - fz * dist * cosP, cy = lookY + dist * sinP;
    const cols = G.world && G.world.colliders;
    if (cols && cols.length) {
      const dx = cx - lookX, dz = cz - lookZ, len = Math.hypot(dx, dz);
      if (len > 0.001) {
        let minT = 1;
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i]; if (!c || c.alive === false) continue;
          const y0 = num(c.y0, 0), y1 = num(c.y1, 4.5);
          if (lookY < y0 - 1 || cy > y1 + 1.5) continue;
          const t = ((c.x - lookX) * dx + (c.z - lookZ) * dz) / (len * len);
          if (t <= 0.04 || t >= minT) continue;
          const px = lookX + dx * t, pz = lookZ + dz * t;
          const dd = Math.hypot(c.x - px, c.z - pz), rr = num(c.r, 0.5) + 0.42;
          if (dd < rr) minT = Math.max(0.14, t - (rr - dd) / len);
        }
        cx = lookX + dx * minT; cz = lookZ + dz * minT; cy = lookY + (cy - lookY) * Math.max(0.3, minT);
      }
    }
    const fl = groundAt(cx, cz) + 0.45; if (cy < fl) cy = fl;
    P._camTX = cx; P._camTY = cy; P._camTZ = cz; P._camLX = lookX; P._camLY = lookY; P._camLZ = lookZ;
    if (P.lockTarget && P.lockTarget.alive !== false) {
      const ep = entPos(P.lockTarget), th = num(P.lockTarget.height, 1.8);
      const k = P.lockTarget.isBoss ? 0.42 : 0.3;
      P._camLX = lookX + (ep.x - lookX) * k; P._camLY = lookY + (ep.y + th * 0.55 - lookY) * 0.3; P._camLZ = lookZ + (ep.z - lookZ) * k;
    }
  }

  function pushCamera(dt, snap) {
    const cam = P.cam, co = P.camera; if (!co) return;
    const k = snap ? 1 : 1 - Math.exp(-15 * (dt || 0.016)), kl = snap ? 1 : 1 - Math.exp(-22 * (dt || 0.016));
    cam.x += (P._camTX - cam.x) * k; cam.y += (P._camTY - cam.y) * k; cam.z += (P._camTZ - cam.z) * k;
    cam.lx += (P._camLX - cam.lx) * kl; cam.ly += (P._camLY - cam.ly) * kl; cam.lz += (P._camLZ - cam.lz) * kl;
    let sx = 0, sy = 0, sz = 0;
    if (G.vfx && G.vfx.getShakeOffset) { G.vfx.getShakeOffset(dt || 0, P._shakeVec); sx = P._shakeVec.x; sy = P._shakeVec.y; sz = P._shakeVec.z; }
    co.position.set(cam.x + sx, cam.y + sy, cam.z + sz);
    co.lookAt(cam.lx + sx * 0.35, cam.ly + sy * 0.35, cam.lz + sz * 0.35);
    const speed = Math.hypot(P.vx, P.vz);
    const baseFov = cam.baseFov || 58;
    cam.targetFov = damp(cam.targetFov, baseFov + (P.sprinting ? 5 : 0) + Math.min(6, speed * 0.2), 6, dt || 0.016);
    co.fov = damp(co.fov, cam.targetFov, 12, dt || 0.016);
    co.updateProjectionMatrix();
  }

  /* ================================================================
     MOVEMENT
     ================================================================ */
  function readMove() {
    const m = G.input.move;
    const fx = Math.sin(P.cam.yaw), fz = Math.cos(P.cam.yaw), rx = -fz, rz = fx;
    let dx = fx * m.y + rx * m.x, dz = fz * m.y + rz * m.x;
    const l = Math.hypot(dx, dz);
    P.hasInput = m.mag > 0.05 && l > 0.001;
    P.stickMag = P.hasInput ? Math.min(1, m.mag) : 0;
    if (l > 0.001) { dx /= l; dz /= l; }
    P.moveX = dx; P.moveZ = dz;
  }

  function moveUpdate(dt) {
    const a = P.action;
    const dash = a && (a.type === "dash"), warp = a && a.type === "warp", lunge = a && a.type === "lunge";
    const stag = a && a.type === "stagger";
    const rooted = a && (a.type === "nova" || a.type === "charge");
    const atk = a && (a.type === "combo" || a.type === "air");

    if (dash) { P.vx = a.dirX * DASH_SPEED; P.vz = a.dirZ * DASH_SPEED; P.vy = a.air ? 0 : Math.max(P.vy, -1.5); }
    else if (warp) { /* velocity set by updateAction */ }
    else if (lunge) { P.vx = a.dirX * 17 * (1 - a.t / a.dur * 0.6); P.vz = a.dirZ * 17 * (1 - a.t / a.dur * 0.6); }
    else if (stag || rooted) { P.vx = damp(P.vx, 0, 9, dt); P.vz = damp(P.vz, 0, 9, dt); }
    else {
      let top = P.stickMag < 0.5 ? WALK + (RUN - WALK) * (P.stickMag / 0.5) : RUN;
      P.sprinting = false;
      if (P.hasInput && P.stickMag > 0.85 && P.grounded && !atk) { P.sprintT += dt; } else if (!P.hasInput) P.sprintT = 0;
      if (P.sprintT > 0.55 && P.stickMag > 0.8) { top = SPRINT; P.sprinting = true; }
      top *= 1 + P.boost;
      if (atk) top *= 0.4;
      const tvx = P.hasInput ? P.moveX * top : 0, tvz = P.hasInput ? P.moveZ * top : 0;
      const acc = P.grounded ? ACCEL_G : ACCEL_A * (1 + P.boost * 1.2);
      P.vx = damp(P.vx, tvx, acc, dt); P.vz = damp(P.vz, tvz, acc, dt);
    }
    if (P.boost > 0) P.boost = Math.max(0, P.boost - dt * 0.45);

    /* gravity, hover, glide, wall-slide */
    if (!warp && !(dash && a.air)) {
      if (P.hoverT > 0) { P.hoverT -= dt; P.vy = damp(P.vy, 0.4, 14, dt); }
      else P.vy -= GRAV * dt;
    }
    if (P.vy < TERMINAL) P.vy = TERMINAL;
    P.gliding = false;
    if (!P.grounded && G.input.down("jump") && P.vy < -0.8 && !dash && !warp && P.jumps > 0 && !atk && P.hoverT <= 0 && G.input.heldFor("jump") > 0.18) {
      P.gliding = true;
      if (P.vy < -GLIDE_FALL) P.vy = damp(P.vy, -GLIDE_FALL, 12, dt);
      P.vx += P.moveX * 6 * dt * (P.hasInput ? 1 : 0); P.vz += P.moveZ * 6 * dt * (P.hasInput ? 1 : 0);
    }

    P.x += P.vx * dt; P.z += P.vz * dt; P.y += P.vy * dt;

    /* landing */
    const gy = surfaceAt(P.x, P.z, P.y + 0.6);
    const wasAir = !P.grounded;
    if (P.y <= gy + 0.001 && P.vy <= 0.5) {
      if (wasAir && P.vy < -9) {
        G.vfx.burst({ x: P.x, y: gy + 0.12, z: P.z }, { count: 10, color: 0xd8e9d0, speed: 3.2, size: 0.26, life: 0.4, gravity: -3, spread: 1, tex: "glow" });
        sfx("land"); if (P.vy < -17) G.vfx.shake(0.16);
        play("land", { fade: 0.04, once: true });
      }
      P.y = gy; P.vy = 0; P.grounded = true; P.jumps = 0; P.coyote = COYOTE; P.airDash = 0; P.airAttacks = 0; P.wallT = 0;
      /* bouncers launch on contact */
      checkBouncers();
    } else { P.grounded = false; P.coyote = Math.max(0, P.coyote - dt); checkBouncers(); }

    resolveColliders(dt);
    clampBounds();
  }

  function checkBouncers() {
    const bs = G.world && G.world.bouncers; if (!bs) return;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i], dx = P.x - b.x, dz = P.z - b.z;
      if (dx * dx + dz * dz > b.r * b.r) continue;
      if (P.y > b.y + 0.9 || P.vy > 3 || (P.bounceCd || 0) > 0) continue;
      P.vy = b.power; P.grounded = false; P.jumps = 1; P.airDash = 0; P.airAttacks = 0; P.bounceCd = 0.25;
      P.action = null;
      b.squash = 1;
      G.vfx.ringShockwave({ x: b.x, y: b.y, z: b.z }, 0xff9ec4, 2.2);
      G.vfx.burst({ x: b.x, y: b.y + 0.4, z: b.z }, { count: 22, color: 0xffd9ea, speed: 5.5, size: 0.3, life: 0.6, gravity: 1, spread: 1, tex: "glow" });
      sfx("jump", { vol: 1, rate: 0.7 }); buzz(25);
      play("doubleJump", { fade: 0.04, once: true }, "jump");
      G.bus.emit("player:bounce", {});
    }
  }

  function resolveColliders() {
    const cols = G.world && G.world.colliders; if (!cols) return;
    const top = P.y + PLAYER_H;
    P.touchWall = null;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i]; if (!c || c.alive === false) continue;
      const y0 = num(c.y0, 0), y1 = num(c.y1, 4.5);
      if (top < y0 || P.y > y1 - 0.1) continue;
      let dx = P.x - c.x, dz = P.z - c.z; const d = Math.hypot(dx, dz), minD = num(c.r, 0.5) + PLAYER_R;
      if (d >= minD) { if (!P.grounded && d < minD + 0.35 && y1 - y0 > 2.4) P.touchWall = { nx: dx / (d || 1), nz: dz / (d || 1), c: c }; continue; }
      if (d < 0.0001) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
      P.x = c.x + dx * minD; P.z = c.z + dz * minD;
      const into = P.vx * dx + P.vz * dz;
      if (into < 0) { P.vx -= dx * into; P.vz -= dz * into; }
      if (!P.grounded && y1 - y0 > 2.4) P.touchWall = { nx: dx, nz: dz, c: c };
    }
    /* wall slide: hugging a tall wall in the air slows the fall */
    if (P.touchWall && P.vy < -2.4 && P.hasInput && P.action == null) { P.vy = Math.max(P.vy, -2.4); P.wallT = 0.15; }
  }

  function clampBounds() {
    const w = G.world; if (!w || !w.bounds) return;
    const br = w.bounds.r, bx = num(w.bounds.x, 0), bz = num(w.bounds.z, 0);
    if (br <= 1) return;
    const dx = P.x - bx, dz = P.z - bz, d = Math.hypot(dx, dz), lim = br - 1;
    if (d > lim && d > 0.0001) {
      P.x = bx + dx / d * lim; P.z = bz + dz / d * lim;
      const out = (P.vx * dx + P.vz * dz) / d;
      if (out > 0) { P.vx -= dx / d * out; P.vz -= dz / d * out; }
    }
  }

  /* ================================================================
     TARGETING / AIM ASSIST
     ================================================================ */
  function aimTarget(maxD, cone) {
    if (P.lockTarget && isFoe(P.lockTarget)) return P.lockTarget;
    let ax = P.hasInput ? P.moveX : Math.sin(P.facing), az = P.hasInput ? P.moveZ : Math.cos(P.facing);
    let best = null, bs = Infinity; const es = enemies();
    for (let i = 0; i < es.length; i++) {
      const e = es[i]; if (!isFoe(e)) continue;
      const ep = entPos(e), dx = ep.x - P.x, dz = ep.z - P.z, d = Math.hypot(dx, dz) - num(e.radius, 0.4);
      if (d > maxD) continue;
      const dot = (dx * ax + dz * az) / (Math.hypot(dx, dz) || 1);
      if (dot < cone) continue;
      const s = d * (2 - dot);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }
  function aimAngle(assist) {
    const t = aimTarget(assist || 7.5, 0.35);
    if (t) { const ep = entPos(t); return Math.atan2(ep.x - P.x, ep.z - P.z); }
    if (P.hasInput) return Math.atan2(P.moveX, P.moveZ);
    return P.facing;
  }

  /* ================================================================
     ACTIONS
     ================================================================ */
  const A_FREE = 0;
  function canAct() {
    const a = P.action; if (!a) return true;
    switch (a.type) {
      case "stagger": case "dash": case "warp": return false;
      case "nova": return a.t > a.dur * 0.65;
      case "heavy": return !!a.impacted || a.t > 0.9;
      case "combo": case "air": return a.t / a.dur >= 0.5;
      case "lunge": return a.t / a.dur >= 0.7;
      case "charge": return true;
      default: return true;
    }
  }
  const canDash = () => !(P.action && (P.action.type === "stagger" || P.action.type === "dash" || P.action.type === "warp"));
  const canJump = () => !(P.action && (P.action.type === "stagger" || P.action.type === "dash" || P.action.type === "warp")) && (canAct() || P.action.type === "charge");
  const dmgMult = () => (P.dmgBuff > 0 ? 1.25 : 1);

  function addCombo(n) {
    P.comboCount += n; P.comboT = 2.4;
    G.bus.emit("player:combo", { n: P.comboCount });
  }
  function addSurge(v) { P.surge = Math.min(100, P.surge + v); }

  function sectorHit(cfg, face, o) {
    o = o || {};
    P._hbPos.set(P.x, P.y + 1.0, P.z); P._hbDir.set(Math.sin(face), 0, Math.cos(face));
    const act = P.action;
    G.combat.hitbox({
      team: "player", shape: { type: "sector", pos: P._hbPos, dir: P._hbDir, range: cfg.range, arc: cfg.arc },
      dmg: cfg.dmg * dmgMult() * (o.mult || 1), knock: cfg.knock, stagger: cfg.stagger, up: cfg.up || 0, life: 0.09, once: true, src: entRef,
      onHit(e) {
        if (act && act.connected) return; if (act) act.connected = true;
        G.combat.hitstop(cfg.hitstop); G.vfx.shake(0.2 + (cfg.up ? 0.15 : 0)); sfx("hitFlesh");
        addCombo(1); addSurge(2.5); buzz(14);
        if (P.lockTarget === null && e && e.isBoss) P.lockTarget = e;
        P.lastHitT = 0;
      }
    });
    if (G.vfx.slashTrail) {
      const pts = P._trailPts, n = pts.length;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), ang = face - cfg.arc * 0.45 + cfg.arc * 0.9 * (o.flip ? 1 - k : k), rr = cfg.range * 0.86;
        pts[i].x = P.x + Math.sin(ang) * rr; pts[i].y = P.y + (o.airy ? 1.2 : 1.0) + Math.sin(Math.PI * k) * 0.3; pts[i].z = P.z + Math.cos(ang) * rr;
      }
      G.vfx.slashTrail(pts, cfg.color);
    }
    G.vfx.burst({ x: P.x + Math.sin(face) * cfg.range * 0.8, y: P.y + 1.0, z: P.z + Math.cos(face) * cfg.range * 0.8 },
      { count: 5, color: cfg.color, speed: 2.4, size: 0.24, life: 0.28, gravity: -1, spread: 1, tex: "glow" });
  }

  function startCombo() {
    let stage = P.chainT > 0 ? P.comboIndex : 0;
    if (stage < 0 || stage > 3) stage = 0;
    P.comboIndex = (stage + 1) % 4; P.chainT = 0;
    const cfg = COMBO[stage];
    P.action = { type: "combo", t: 0, dur: cfg.dur, hitAt: cfg.hitAt, cfg: cfg, stage: stage, hit: false, connected: false, face: aimAngle() };
    P.facing = P.action.face;
    P.vx += Math.sin(P.action.face) * cfg.step; P.vz += Math.cos(P.action.face) * cfg.step;
    play("attack" + (stage + 1), { fade: 0.05, once: true, speed: 1.12 }, "attack1");
    sfx("swing" + Math.min(3, stage + 1));
  }

  function startAirAttack() {
    if (P.airAttacks >= 3) return false;
    const idx = P.airAttacks; P.airAttacks++;
    P.hoverT = 0.28; P.vy = Math.max(P.vy, 2.2);
    if (idx >= 2) { startPlunge(); return true; }
    const cfg = AIR[idx];
    P.action = { type: "air", t: 0, dur: cfg.dur, hitAt: cfg.hitAt, cfg: cfg, hit: false, connected: false, face: aimAngle(9), idx: idx };
    P.facing = P.action.face;
    P.vx += Math.sin(P.action.face) * 3; P.vz += Math.cos(P.action.face) * 3;
    play("air" + (idx + 1), { fade: 0.05, once: true, speed: 1.1 }, "attack" + (idx + 1));
    sfx("swing" + (idx + 1));
    return true;
  }

  function startPlunge() {
    P.action = { type: "heavy", t: 0, dur: 1.0, impacted: false, falling: true, face: aimAngle(), power: 0.7, plunge: true };
    P.facing = P.action.face; P.hoverT = 0; P.vy = -26;
    play("plunge", { fade: 0.05, once: true }, "attack3");
    sfx("swing3");
  }

  function startLunge() {
    const face = aimAngle(9);
    P.action = { type: "lunge", t: 0, dur: 0.3, dirX: Math.sin(face), dirZ: Math.cos(face), face: face, hit: false, connected: false };
    P.facing = face; P.afterDash = 0;
    play("lunge", { fade: 0.04, once: true }, "attack2");
    sfx("swing3");
    G.vfx.burst({ x: P.x, y: P.y + 0.9, z: P.z }, { count: 10, color: 0xffd9ea, speed: 5, size: 0.3, life: 0.3, gravity: 0, spread: 1, tex: "glow" });
  }
  function lungeHit(a) {
    sectorHit({ range: 3.7, arc: 1.5, dmg: 15, knock: 7, stagger: 0.45, up: 3, hitstop: 0.07, color: 0xffe3a8 }, a.face);
  }

  function startCharge() {
    P.action = { type: "charge", t: 0, face: aimAngle() };
    P.castGlow = 0.3; play("charge", { fade: 0.08 }, "attack3");
  }
  function releaseCharge(a) {
    const power = clamp(a.t / 0.75, 0, 1);
    if (a.t < 0.22) { P.action = null; startCombo(); return; }
    P.action = { type: "heavy", t: 0, dur: 1.05, impacted: false, falling: false, face: aimAngle(), power: 0.45 + power * 0.55 };
    P.facing = P.action.face;
    if (P.grounded) { P.vy = 7.2; P.grounded = false; P.jumps = Math.max(P.jumps, 1); }
    else P.vy = Math.max(P.vy, 1.5);
    P.vx += Math.sin(P.action.face) * 2.5; P.vz += Math.cos(P.action.face) * 2.5;
    play("slam", { fade: 0.06, once: true }, "attack3"); sfx("swing3");
  }

  function heavyImpact(a) {
    const pw = a.power || 0.6, mult = dmgMult();
    P._hbPos.set(P.x, P.y + 0.6, P.z);
    G.combat.hitbox({
      team: "player", shape: { type: "sphere", pos: P._hbPos, r: 2.4 + pw * 1.6 },
      dmg: (18 + 16 * pw) * mult, knock: 8 + 4 * pw, stagger: 0.7, up: 4.5, life: 0.1, once: true, src: entRef,
      onHit(e) { if (a.connected) return; a.connected = true; sfx("hitFlesh"); addCombo(2); addSurge(6); buzz(30); }
    });
    const R = 3 + pw * 2;
    G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xffb347, R); G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xffe6b0, R * 0.7);
    G.vfx.burst({ x: P.x, y: P.y + 0.18, z: P.z }, { count: 30, color: 0xffd9a0, speed: 9, size: 0.42, life: 0.55, gravity: -7, spread: 1, tex: "glow" });
    G.vfx.petals({ x: P.x, y: P.y + 0.5, z: P.z }); G.vfx.shake(0.4 + pw * 0.3);
    if (G.world.shatterNear) G.world.shatterNear(P.x, P.z, R, 40);
    G.combat.hitstop(0.075); P.cam.targetFov = 66; sfx("explosion"); buzz(40);
  }

  /* ---- magic ---- */
  function staffWorld(out) {
    const eye = P.parts && P.parts.staffEye;
    if (eye && eye.getWorldPosition) { eye.getWorldPosition(out); if (out.x || out.y || out.z) return out; }
    out.set(P.x + Math.sin(P.facing) * 0.5, P.y + 1.05, P.z + Math.cos(P.facing) * 0.5); return out;
  }
  function castBolt(count) {
    if (P.mana < 10) { if (G.ui) G.ui.toast("Not enough mana"); return false; }
    P.mana = Math.max(0, P.mana - 10); P.castGlow = 0.4;
    const aim = aimAngle(14), tgt = aimTarget(20, 0.2);
    staffWorld(P._staffPos);
    G.combat.projectile({
      from: P._staffPos, dir: { x: Math.sin(aim), y: 0.02, z: Math.cos(aim) }, target: tgt,
      speed: 22, r: 0.3, dmg: 11 * dmgMult(), team: "player", homing: tgt ? 9 : 2.5, gravity: 0, life: 2.4, color: 0xff9ec4, trail: true,
      knock: 3, stagger: 0.25, src: entRef,
      onHit(t, info) { if (info && info.applied) { sfx("hitFlesh"); addSurge(1.2); addCombo(1); } }
    });
    G.vfx.burst(P._staffPos, { count: 10, color: 0xffc2dd, speed: 3.5, size: 0.3, life: 0.3, gravity: 0, spread: 0.8, tex: "glow" });
    if (!P.action || P.action.type === "charge") { play("cast", { fade: 0.05, once: true }); P.facing = aim; }
    sfx("bolt"); buzz(10);
    return true;
  }
  function startNova() {
    if (P.mana < 25) { if (G.ui) G.ui.toast("Not enough mana"); return false; }
    P.mana = Math.max(0, P.mana - 25);
    P.action = { type: "nova", t: 0, dur: 0.6, fired: false, face: aimAngle() };
    P.facing = P.action.face; P.castGlow = 0.6;
    play("nova", { fade: 0.06, once: true }, "cast"); sfx("novaCharge");
    return true;
  }
  function novaFire(a) {
    P._hbPos.set(P.x, P.y + 0.9, P.z);
    G.combat.hitbox({
      team: "player", shape: { type: "sphere", pos: P._hbPos, r: 4.8 },
      dmg: 30 * dmgMult(), knock: 10, stagger: 0.9, up: 6, life: 0.12, once: true, src: entRef,
      onHit() { if (a.connected) return; a.connected = true; sfx("hitFlesh"); addCombo(3); addSurge(8); buzz(40); }
    });
    G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xff9ec4, 5.6); G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0x8effc0, 4.0);
    G.vfx.burst({ x: P.x, y: P.y + 0.7, z: P.z }, { count: 46, color: 0xff9ec4, speed: 11, size: 0.45, life: 0.7, gravity: -2, spread: 1, tex: "glow" });
    G.vfx.petals({ x: P.x, y: P.y + 1.0, z: P.z }); G.vfx.shake(0.45);
    if (G.world.shatterNear) G.world.shatterNear(P.x, P.z, 5, 60);
    G.combat.hitstop(0.06); P.cam.targetFov = 70; G.render.fx.aberration = 0.7; sfx("nova"); buzz(50);
  }

  /* ---- dash / jump / warp ---- */
  function startDash() {
    if (P.dashCharges <= 0) return false;
    const air = !P.grounded;
    if (air && P.airDash >= 2) return false;
    const f = P.hasInput ? Math.atan2(P.moveX, P.moveZ) : P.facing;
    P.action = { type: "dash", t: 0, dur: DASH_TIME, dirX: Math.sin(f), dirZ: Math.cos(f), face: f, trailT: 0, air: air };
    P.dashCharges--; if (air) P.airDash++;
    P.perfectDodged = false; P.dashIFrames = DASH_TIME + 0.1; P.facing = f;
    P.vx = P.action.dirX * DASH_SPEED; P.vz = P.action.dirZ * DASH_SPEED; P.vy = air ? 0 : Math.max(P.vy, 0);
    P.chainT = 0; P.afterDash = 0.3;
    G.combat.iframe(entRef, DASH_TIME + 0.1);
    G.render.fx.radial = 1; G.render.fx.radialX = 0.5; G.render.fx.radialY = 0.5;
    P.cam.targetFov = 70;
    G.vfx.burst({ x: P.x, y: P.y + 0.22, z: P.z }, { count: 16, color: 0x9fe8ff, speed: 5.5, size: 0.32, life: 0.42, gravity: 0.4, spread: 1, tex: "glow" });
    G.vfx.shake(0.1);
    play("dash", { fade: 0.03, once: true }); sfx("dash"); buzz(18);
    return true;
  }

  function tryJump() {
    if (P.grounded || P.coyote > 0) {
      P.vy = JUMP_V + P.boost * 1.5; P.grounded = false; P.coyote = 0; P.jumps = 1; P.action = null;
      if (P.afterDash > 0) P.boost = Math.max(P.boost, 0.38);        // dash-jump: carry the speed
      G.vfx.burst({ x: P.x, y: P.y + 0.1, z: P.z }, { count: 8, color: 0xd8e9d0, speed: 2.6, size: 0.24, life: 0.35, gravity: -2, spread: 1, tex: "glow" });
      play("jump", { fade: 0.05, once: true }); sfx("jump"); return true;
    }
    if (P.touchWall && !P.grounded && P.wallKickCd <= 0) {          // wall-kick: refresh everything
      const w = P.touchWall;
      P.vy = 10.4; P.vx = w.nx * 8.5 + P.moveX * 3; P.vz = w.nz * 8.5 + P.moveZ * 3;
      P.facing = Math.atan2(w.nx, w.nz); P.jumps = 1; P.airDash = 0; P.airAttacks = 0; P.action = null; P.wallKickCd = 0.3; P.dashCharges = Math.min(DASH_MAX, P.dashCharges + 1);
      G.vfx.ringShockwave({ x: P.x - w.nx * 0.4, y: P.y + 0.9, z: P.z - w.nz * 0.4 }, 0xbfe3d2, 1.4);
      G.vfx.burst({ x: P.x, y: P.y + 0.9, z: P.z }, { count: 12, color: 0xbfe3d2, speed: 4, size: 0.28, life: 0.4, gravity: -1, spread: 1, tex: "glow" });
      play("wallkick", { fade: 0.04, once: true }, "doubleJump"); sfx("jump", { rate: 1.25 }); buzz(14);
      return true;
    }
    if (P.jumps < 2) {
      P.vy = DJUMP_V; P.jumps = 2; P.action = null;
      G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xbfe3d2, 1.6);
      G.vfx.burst({ x: P.x, y: P.y + 0.5, z: P.z }, { count: 10, color: 0xbfe3d2, speed: 3, size: 0.26, life: 0.35, gravity: -1, spread: 1, tex: "glow" });
      play("doubleJump", { fade: 0.05, once: true }, "jump"); sfx("jump", { rate: 1.12 }); return true;
    }
    return false;
  }

  /* ---- warp: zip to the best target / pod, strike on arrival ---- */
  function findWarpTarget() {
    if (P.lockTarget && isFoe(P.lockTarget)) { const ep = entPos(P.lockTarget); return { e: P.lockTarget, x: ep.x, y: ep.y, z: ep.z, r: num(P.lockTarget.radius, 0.5) }; }
    const t = aimTarget(WARP_RANGE, 0.1);
    if (t) { const ep = entPos(t); return { e: t, x: ep.x, y: ep.y, z: ep.z, r: num(t.radius, 0.5) }; }
    const hp = G.world && G.world.hookPoints;
    if (hp) {
      let best = null, bs = Infinity;
      const fx = P.hasInput ? P.moveX : Math.sin(P.cam.yaw), fz = P.hasInput ? P.moveZ : Math.cos(P.cam.yaw);
      for (const h of hp) {
        const dx = h.x - P.x, dz = h.z - P.z, d = Math.hypot(dx, dz);
        if (d < 2 || d > WARP_RANGE) continue;
        const dot = (dx * fx + dz * fz) / d; if (dot < 0.25) continue;
        const s = d * (2 - dot); if (s < bs) { bs = s; best = h; }
      }
      if (best) return { pod: best, x: best.x, y: best.y, z: best.z, r: 0.6 };
    }
    return null;
  }
  function updateHookReady() { P.hookReady = P.cooldowns.hook.cur <= 0 && !!findWarpTarget(); }

  function startWarp() {
    if (P.cooldowns.hook.cur > 0) return false;
    let tg = findWarpTarget(), tx, ty, tz;
    if (tg) {
      const dx = tg.x - P.x, dz = tg.z - P.z, d = Math.hypot(dx, dz) || 1;
      const stop = tg.e ? tg.r + 1.5 : 0.1;
      tx = tg.x - dx / d * stop; tz = tg.z - dz / d * stop; ty = tg.pod ? tg.y : Math.max(groundAt(tx, tz), tg.y);
    } else {                                                   // short blink
      const f = P.hasInput ? Math.atan2(P.moveX, P.moveZ) : P.facing;
      tx = P.x + Math.sin(f) * 9; tz = P.z + Math.cos(f) * 9; ty = groundAt(tx, tz);
      tg = null;
    }
    P.action = { type: "warp", t: 0, tx, ty, tz, tg, face: Math.atan2(tx - P.x, tz - P.z), fired: false, connected: false };
    P.facing = P.action.face; P.cooldowns.hook.cur = P.cooldowns.hook.max;
    P.dashIFrames = 0.5; G.combat.iframe(entRef, 0.5);
    P.chainT = 0; P.hoverT = 0; P.vy = 0;
    G.render.fx.radial = 1; G.render.fx.aberration = 0.5; P.cam.targetFov = 74;
    G.vfx.burst({ x: P.x, y: P.y + 1, z: P.z }, { count: 26, color: 0xffd166, speed: 6, size: 0.35, life: 0.5, gravity: 0, spread: 1, tex: "glow" });
    G.vfx.portal({ x: P.x, y: P.y, z: P.z }, 0xffd166, { life: 0.5, face: P.facing });
    play("warp", { fade: 0.02, once: true }, "dash"); sfx("portal", { vol: 0.8, rate: 1.4 }); buzz(24);
    return true;
  }
  function updateWarp(a, dt) {
    const dx = a.tx - P.x, dy = a.ty - P.y, dz = a.tz - P.z, d = Math.hypot(dx, dy, dz);
    const step = WARP_SPEED * dt;
    if (d <= step + 0.05) {
      P.x = a.tx; P.y = Math.max(a.ty, surfaceAt(a.tx, a.tz, a.ty + 1)); P.z = a.tz; P.vx = P.vy = P.vz = 0;
      if (!a.fired) {
        a.fired = true;
        if (a.tg && a.tg.e) {                                  // arrive with a rising strike
          const ep = entPos(a.tg.e); a.face = Math.atan2(ep.x - P.x, ep.z - P.z); P.facing = a.face;
          P.action = { type: "air", t: 0, dur: 0.34, hitAt: 0.06, cfg: { range: 3.2, arc: 2.6, dmg: 16, knock: 6, stagger: 0.45, up: 4, hitstop: 0.08, color: 0xffd166 }, hit: false, connected: false, face: a.face, idx: 0, warpStrike: true };
          P.hoverT = 0.35; P.vy = 3; P.airAttacks = 1; P.grounded = false;
          play("air1", { fade: 0.03, once: true }, "attack2"); G.vfx.shake(0.25);
        } else {
          P.action = null; P.vy = a.tg && a.tg.pod ? 6 : 0; P.grounded = false; P.jumps = 1; P.airDash = 0;
          if (a.tg && a.tg.pod) { P.dashCharges = DASH_MAX; P.cooldowns.hook.cur = 0.3; G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xffd166, 2.4); sfx("jump", { rate: 1.3 }); }
        }
        P.cam.targetFov = 62;
      }
      return;
    }
    P.vx = dx / d * WARP_SPEED; P.vy = dy / d * WARP_SPEED; P.vz = dz / d * WARP_SPEED;
    P.x += dx / d * step; P.y += dy / d * step; P.z += dz / d * step;
    if (((a.t * 1000) | 0) % 2 === 0) G.vfx.burst({ x: P.x, y: P.y + 0.9, z: P.z }, { count: 3, color: 0xffd166, speed: 0.8, size: 0.34, life: 0.3, gravity: 0, spread: 0.6, tex: "glow" });
  }

  /* ---- action state machine ---- */
  function updateAction(dt) {
    const a = P.action; if (!a) return;
    a.t += dt;
    switch (a.type) {
      case "combo": case "air":
        if (!a.hit && a.t >= a.hitAt) {
          a.hit = true;
          sectorHit(a.cfg, a.face, a.type === "air" ? { airy: true, flip: a.idx === 1 } : { flip: (a.stage & 1) === 1 });
        }
        if (a.t >= a.dur) { P.action = null; if (a.type === "combo") P.chainT = 0.5; }
        break;
      case "lunge":
        if (!a.hit && a.t >= 0.04) { a.hit = true; lungeHit(a); }
        if (a.t >= a.dur) { P.action = null; P.vx *= 0.3; P.vz *= 0.3; }
        break;
      case "dash":
        a.trailT -= dt;
        if (a.trailT <= 0) { a.trailT = 0.03; G.vfx.burst({ x: P.x, y: P.y + 0.7, z: P.z }, { count: 2, color: 0x9fe8ff, speed: 0.8, size: 0.3, life: 0.28, gravity: 0, spread: 0.6, tex: "glow" }); }
        if (a.t >= a.dur) { P.action = null; P.vx *= 0.6; P.vz *= 0.6; }
        break;
      case "warp": updateWarp(a, dt); if (a.t > 1.2) P.action = null; break;
      case "charge":
        P.castGlow = Math.max(P.castGlow, 0.25);
        if (!G.input.down("attack")) releaseCharge(a);
        else if (a.t > 0.75 && !a.full) { a.full = true; sfx("uiClick", { rate: 1.6 }); buzz(30); G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xffd166, 1.6); }
        break;
      case "heavy":
        if (!a.falling && a.t >= 0.26) { a.falling = true; P.vy = -23; }
        if (a.falling && P.grounded && !a.impacted) { a.impacted = true; heavyImpact(a); a.t = Math.max(a.t, 0.9); }
        if (a.t >= 1.1) P.action = null;
        break;
      case "nova":
        if (!a.fired && a.t >= 0.12) { a.fired = true; novaFire(a); }
        if (a.t >= a.dur) P.action = null;
        break;
      case "stagger": if (a.t >= a.dur) P.action = null; break;
    }
  }

  function actionInputs(dt) {
    const I = G.input;
    P.bufAttack = Math.max(0, P.bufAttack - dt); P.bufJump = Math.max(0, P.bufJump - dt); P.bufDash = Math.max(0, P.bufDash - dt);
    if (I.pressed("attack")) P.bufAttack = 0.22;
    if (I.pressed("jump")) P.bufJump = 0.16;
    if (I.pressed("dash")) P.bufDash = 0.16;

    /* dash — highest priority, cancels nearly everything */
    if (P.bufDash > 0 && canDash() && P.dashCharges > 0) {
      if (startDash()) P.bufDash = 0;
      else if (!P.grounded) { /* out of air dashes: swallow */ P.bufDash = 0; }
    }
    /* warp */
    if (I.pressed("hook") && canDash()) { if (!startWarp()) { sfx("uiClick", { rate: 0.7 }); } }

    /* spells */
    if (I.pressed("magic") && canAct()) { castBolt(); P.magicHeld = true; P.magicT = 0; }
    if (I.down("magic") && P.magicHeld) {
      P.magicT += dt;
      if (P.magicT > 0.22) { P.castGlow = Math.max(P.castGlow, 0.3); }
      if (P.magicT > 0.55 && canAct()) { P.magicHeld = false; startNova(); }
    } else if (!I.down("magic")) P.magicHeld = false;

    /* jump */
    if (P.bufJump > 0 && canJump()) { if (tryJump()) P.bufJump = 0; }

    /* strike */
    if (P.bufAttack > 0) {
      const a = P.action;
      if (a && a.type === "charge") { /* handled in charge update */ }
      else if (canAct()) {
        P.bufAttack = 0;
        if (!P.grounded) startAirAttack();
        else if (P.afterDash > 0 && P.afterDash < 0.3) startLunge();
        else startCombo();
        /* hold → charge (only if the button is still down after the first hit queues) */
      } else if (a && a.type === "dash" && a.t > a.dur * 0.35) {
        P.bufAttack = 0; P.action = null; if (P.grounded) startLunge(); else startAirAttack();
      }
    }
    /* hold strike on the ground without a swing in flight → charge */
    if (I.down("attack") && I.heldFor("attack") > 0.28 && P.grounded && (!P.action || (P.action.type === "combo" && P.action.t / P.action.dur > 0.4)) && P.action !== null) {
      /* held past the first swing — enter charge */
      P.action = null; startCharge();
    }

    /* allies */
    if (I.pressed("allyA")) callAlly("crane");
    if (I.pressed("allyB")) callAlly("thistle");
  }

  /* ================================================================
     DAMAGE / PERFECT DODGE / DEATH
     ================================================================ */
  P._onInvuln = function () {
    if (!P.action || (P.action.type !== "dash" && P.action.type !== "warp")) return;
    if (P.perfectDodged) return;
    P.perfectDodged = true;
    G.bus.emit("player:perfectDodge", { pos: { x: P.x, y: P.y, z: P.z } });
    G.vfx.slowmo(0.3, 1.0); G.vfx.flash(0xbfe8ff, 0.35);
    G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0x9fe8ff, 2.8);
    G.vfx.burst({ x: P.x, y: P.y + 1, z: P.z }, { count: 22, color: 0xd6f6ff, speed: 7, size: 0.3, life: 0.55, gravity: 0, spread: 1, tex: "glow" });
    P.dashCharges = DASH_MAX; P.cooldowns.hook.cur = 0; addSurge(10);
    P.cam.targetFov = 74; G.render.fx.aberration = 0.9; sfx("parry"); buzz([20, 30, 20]);
  };

  P._damage = function (amt, hit) {
    const e = entRef; if (!e || e.alive === false) return;
    amt = Math.max(0, num(amt, 0)); if (amt <= 0) return;
    e.hp = Math.max(0, e.hp - amt);
    e.iframeTimer = Math.max(e.iframeTimer || 0, 0.55);
    G.bus.emit("player:damaged", { amt: amt, hp: e.hp, maxHp: e.maxHp });
    G.vfx.flash(0xe8433a, 0.2 + Math.min(0.3, amt / 70)); G.vfx.shake(0.4); G.render.fx.hurt = 1; G.render.fx.aberration = 0.8;
    G.vfx.burst({ x: P.x, y: P.y + 1, z: P.z }, { count: 12, color: 0xe8433a, speed: 5, size: 0.3, life: 0.4, gravity: -3, spread: 1, tex: "glow" });
    if (hit && hit.from) {
      let dx = P.x - num(hit.from.x, P.x), dz = P.z - num(hit.from.z, P.z); const l = Math.hypot(dx, dz);
      if (l > 0.001) { dx /= l; dz /= l; } else { dx = 0; dz = 1; }
      const kb = num(hit.knock, 4) * 0.9; P.vx += dx * kb; P.vz += dz * kb; P.vy = Math.max(P.vy, 3 + num(hit.up, 0) * 0.3);
    }
    P.action = { type: "stagger", t: 0, dur: 0.38 }; P.chainT = 0; P.comboIndex = 0; P.comboCount = 0; P.hoverT = 0;
    P.cam.targetFov = 60; play("hurt", { fade: 0.04, once: true }); sfx("stagger"); G.combat.hitstop(0.06);
    if (e.hp <= 0) P._die();
  };

  P._die = function () {
    const e = entRef; if (!e || e.alive === false) return;
    e.hp = 0; e.alive = false; P.action = null; P.deadT = 0;
    play("dead", { fade: 0.12, once: true });
    G.vfx.burst({ x: P.x, y: P.y + 1, z: P.z }, { count: 34, color: 0xff9ec4, speed: 5, size: 0.4, life: 1.2, gravity: 0.4, spread: 1, tex: "petal" });
    G.vfx.flash(0x1a0a10, 0.5); G.vfx.shake(0.5);
    G.bus.emit("player:dead", { pos: { x: P.x, y: P.y, z: P.z } }); sfx("stagger"); buzz([60, 40, 80]);
  };

  /* ================================================================
     ALLIES — dash in, strike, dash out. Link strikes while the chain is live.
     ================================================================ */
  function removeRoot(r) { if (r && r.parent) r.parent.remove(r); }
  function despawnAllies() {
    if (P.crane && P.crane.root) removeRoot(P.crane.root);
    if (P.thistle && P.thistle.root) removeRoot(P.thistle.root);
    P.crane = { active: false }; P.thistle = { active: false };
    if (P.healField && P.healField.telegraph && P.healField.telegraph.kill) { try { P.healField.telegraph.kill(); } catch (e) { /* noop */ } }
    P.healField = null;
  }

  function callAlly(id) {
    const cd = id === "crane" ? P.cooldowns.a : P.cooldowns.b;
    const st = id === "crane" ? P.crane : P.thistle;
    if (cd.cur > 0 || st.active || !P.alive) { sfx("uiClick", { rate: 0.6, vol: 0.5 }); return false; }
    const linked = P.comboT > 0 && P.lastHitT < 1.2;
    cd.cur = cd.max;
    const f = P.facing, side = id === "crane" ? 1 : -1;
    const px = P.x + Math.cos(f) * 2.4 * side - Math.sin(f) * 0.8, pz = P.z - Math.sin(f) * 2.4 * side - Math.cos(f) * 0.8;
    G.vfx.portal({ x: px, y: groundAt(px, pz), z: pz }, id === "crane" ? 0xff7ab8 : 0x8effc0, { face: f + Math.PI, life: 1.2 });
    const comp = buildChar(id, id === "crane" ? 0x171a22 : 0x9fd070, id === "crane" ? 2.1 : 1.4);
    comp.root.position.set(px, groundAt(px, pz), pz); comp.root.rotation.y = f + Math.PI; P.scene.add(comp.root);
    const tgtE = aimTarget(30, -1) || null;
    const rec = { active: true, t: 0, linked: linked, root: comp.root, anim: comp.anim, parts: comp.parts, x: px, z: pz, tgt: tgtE, shots: 0, shotT: 0.3, potion: false, salute: false };
    if (id === "crane") P.crane = rec; else P.thistle = rec;
    if (comp.anim) { play2(comp.anim, "idle", { fade: 0.1 }); if (comp.anim.has("idle")) comp.anim.setBase("idle"); play2(comp.anim, "summon", { fade: 0.05, once: true }); }
    sfx("portal"); G.bus.emit("companion:cast", { id: id });
    P.lastAllyT = 0;
    /* triple bloom: both allies inside 3 s */
    const other = id === "crane" ? P.thistle : P.crane;
    if (other.active || (P.lastAlly && P.lastAlly !== id && P.lastAllyAge < 3)) tripleBloom();
    P.lastAlly = id; P.lastAllyAge = 0;
    if (linked && G.ui) G.ui.toast("Link strike");
    buzz(30);
    return true;
  }
  const play2 = (anim, n, o) => { if (anim && anim.has(n)) anim.play(n, o); };
  function tripleBloom() {
    if (P.tripleT > 0) return;
    P.tripleT = 6; P.dmgBuff = Math.max(P.dmgBuff, 6);
    G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xff9ec4, 6); G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0xffb347, 4.4); G.vfx.ringShockwave({ x: P.x, y: P.y, z: P.z }, 0x8effc0, 3);
    G.vfx.burst({ x: P.x, y: P.y + 1, z: P.z }, { count: 50, color: 0xffb347, speed: 8, size: 0.4, life: 0.8, gravity: 0.6, spread: 1, tex: "glow" });
    G.vfx.flash(0xffd9a0, 0.3); G.vfx.slowmo(0.4, 0.7); G.vfx.shake(0.4);
    P.mana = P.maxMana; P.surge = Math.min(100, P.surge + 25);
    if (G.ui) { G.ui.toast("Triple Bloom!"); }
    G.bus.emit("companion:synergy", { buff: 0.25, dur: 6 });
    sfx("victory", { vol: 0.4 });
  }

  function bossStaggered(t) { return t && t.staggered; }

  function craneVolley(c) {
    let tx, tz, tgt = null;
    if (P.lockTarget && isFoe(P.lockTarget)) tgt = P.lockTarget; else if (c.tgt && isFoe(c.tgt)) tgt = c.tgt;
    if (tgt) { const ep = entPos(tgt); tx = ep.x; tz = ep.z; } else { tx = P.x + Math.sin(P.facing) * 6; tz = P.z + Math.cos(P.facing) * 6; }
    const gy = groundAt(tx, tz), sx = tx + rand(-1.8, 1.8), sz = tz + rand(-1.8, 1.8), sy = gy + 8 + rand(0, 2);
    const mult = (c.linked ? 1.35 : 1) * (bossStaggered(tgt) ? 1.4 : 1);
    G.combat.projectile({
      from: { x: sx, y: sy, z: sz }, dir: { x: 0, y: -1, z: 0 }, target: tgt || { x: tx, y: gy + 0.5, z: tz },
      speed: 28, r: 0.4, dmg: 13 * mult, team: "player", homing: 3, gravity: 0, life: 3, color: 0xff4a60, trail: true,
      knock: 5, stagger: 0.6, src: entRef, onHit() { sfx("hitFlesh"); addCombo(1); addSurge(1); }
    });
    G.vfx.burst({ x: sx, y: sy, z: sz }, { count: 3, color: 0xff7a90, speed: 1.5, size: 0.3, life: 0.25, gravity: 0, spread: 1, tex: "glow" });
    if (c.shots % 3 === 0) G.vfx.petals({ x: tx, y: gy + 0.4, z: tz });
    sfx("bolt", { vol: 0.5, rate: 0.8 });
  }
  function updateCrane(dt) {
    const c = P.crane; if (!c.active) return;
    c.t += dt;
    if (c.anim) c.anim.update(dt);
    if (c.root) {
      c.root.position.y = groundAt(c.x, c.z) + Math.sin(c.t * 3.2) * 0.03;
      const t = P.lockTarget && isFoe(P.lockTarget) ? P.lockTarget : c.tgt;
      if (t && isFoe(t)) { const ep = entPos(t); c.root.rotation.y = G.util.angleLerp(c.root.rotation.y, Math.atan2(ep.x - c.x, ep.z - c.z), 1 - Math.exp(-10 * dt)); }
    }
    if (c.t > 0.5 && !c.fired1) { c.fired1 = true; play2(c.anim, "fire", { fade: 0.06, once: true }); }
    if (c.t > 0.55 && c.t < 2.0 && c.shots < 16) { c.shotT -= dt; if (c.shotT <= 0) { c.shotT = 0.09; craneVolley(c); c.shots++; } }
    if (c.t > 2.1 && !c.salute) { c.salute = true; play2(c.anim, "salute", { fade: 0.08, once: true }); }
    if (c.t > 2.9) {
      const k = Math.max(0, 1 - (c.t - 2.9) / 0.6); c.root.scale.setScalar(Math.max(0.01, k));
      if (k <= 0.02) { removeRoot(c.root); P.crane = { active: false }; }
    }
  }

  function thistleSeed(d) {
    let tgt = P.lockTarget && isFoe(P.lockTarget) ? P.lockTarget : null;
    if (!tgt) { let bd = 18 * 18; for (const e of enemies()) { if (!isFoe(e)) continue; const ep = entPos(e); const q = (ep.x - d.x) ** 2 + (ep.z - d.z) ** 2; if (q < bd) { bd = q; tgt = e; } } }
    if (!tgt) return;
    const y = groundAt(d.x, d.z) + 1.0;
    G.combat.projectile({
      from: { x: d.x, y: y, z: d.z }, target: tgt, speed: 17, r: 0.2, dmg: (d.linked ? 7 : 5) * (bossStaggered(tgt) ? 1.4 : 1), team: "player", homing: 6, life: 2.2, color: 0xb6f04a, trail: true,
      knock: 0.8, stagger: 0.06, src: entRef, onHit() { sfx("hitFlesh", { vol: 0.35 }); addSurge(0.6); }
    });
    G.vfx.burst({ x: d.x, y: y, z: d.z }, { count: 2, color: 0xe0ff9a, speed: 1.2, size: 0.2, life: 0.2, gravity: 0, spread: 1, tex: "glow" });
  }
  function thistlePotion(d) {
    d.potion = true;
    P.healField = { active: true, t: 4.5, x: P.x, z: P.z, rate: d.linked ? 14 : 9, tick: 0, telegraph: null };
    const fx = P.x, fz = P.z, gy = groundAt(fx, fz);
    if (G.vfx.telegraph) P.healField.telegraph = G.vfx.telegraph({ x: fx, y: gy, z: fz }, 4.4, 0x8effc0, 4.5);
    G.vfx.burst({ x: fx, y: gy + 0.3, z: fz }, { count: 18, color: 0x8effc0, speed: 3.4, size: 0.3, life: 0.9, gravity: 1.2, spread: 1, tex: "glow" });
    G.vfx.ringShockwave({ x: fx, y: gy, z: fz }, 0x8effc0, 4.4);
    play2(d.anim, "cast", { fade: 0.05, once: true }); sfx("heal");
  }
  function updateThistle(dt) {
    const d = P.thistle; if (!d.active) return;
    d.t += dt;
    if (d.anim) d.anim.update(dt);
    if (d.root) {
      d.root.position.y = groundAt(d.x, d.z) + 0.08 + Math.sin(d.t * 4.0) * 0.05;
      let t = null, bd = 400; for (const e of enemies()) { if (!isFoe(e)) continue; const ep = entPos(e); const q = (ep.x - d.x) ** 2 + (ep.z - d.z) ** 2; if (q < bd) { bd = q; t = e; } }
      if (t) { const ep = entPos(t); d.root.rotation.y = G.util.angleLerp(d.root.rotation.y, Math.atan2(ep.x - d.x, ep.z - d.z), 1 - Math.exp(-10 * dt)); }
    }
    if (!d.potion && d.t > 0.5) thistlePotion(d);
    if (d.t < 4.2) { d.shotT -= dt; if (d.shotT <= 0) { d.shotT = d.linked ? 0.26 : 0.4; thistleSeed(d); } }
    if (d.t > 4.9) {
      const k = Math.max(0, 1 - (d.t - 4.9) / 0.6); d.root.scale.setScalar(Math.max(0.01, k));
      if (k <= 0.02) { removeRoot(d.root); P.thistle = { active: false }; }
    }
  }
  function updateHeal(dt) {
    const hf = P.healField; if (!hf || !hf.active) return;
    hf.t -= dt;
    if (hf.t <= 0) { hf.active = false; if (hf.telegraph && hf.telegraph.kill) { try { hf.telegraph.kill(); } catch (e) { /* noop */ } } hf.telegraph = null; return; }
    if (Math.hypot(P.x - hf.x, P.z - hf.z) < 4.4 && entRef.alive !== false) {
      entRef.hp = Math.min(entRef.maxHp, entRef.hp + hf.rate * dt);
      hf.tick -= dt;
      if (hf.tick <= 0) { hf.tick = 0.32; G.vfx.burst({ x: P.x + rand(-0.4, 0.4), y: P.y + 0.3, z: P.z + rand(-0.4, 0.4) }, { count: 3, color: 0x8effc0, speed: 0.8, size: 0.26, life: 0.7, gravity: 1.4, spread: 0.8, tex: "glow" }); }
    }
  }

  /* ================================================================
     TIMERS / VISUALS
     ================================================================ */
  function updateTimers(dt) {
    const cd = P.cooldowns;
    for (const k of ["a", "b", "hook"]) if (cd[k].cur > 0) cd[k].cur = Math.max(0, cd[k].cur - dt * (P.surge >= 100 && k !== "hook" ? 1.6 : 1));
    if (P.dashCharges < DASH_MAX) {
      P.dashCdT += dt;
      while (P.dashCdT >= DASH_RECHARGE && P.dashCharges < DASH_MAX) { P.dashCdT -= DASH_RECHARGE; P.dashCharges++; }
      if (P.dashCharges >= DASH_MAX) P.dashCdT = 0;
    } else P.dashCdT = 0;
    if (P.mana < P.maxMana) P.mana = Math.min(P.maxMana, P.mana + MANA_REGEN * dt * (P.lastHitT < 1 ? 1.4 : 1));
    for (const k of ["dmgBuff", "castGlow", "dashIFrames", "afterDash", "tripleT", "bounceCd", "wallKickCd"]) if (P[k] > 0) P[k] = Math.max(0, P[k] - dt);
    P.wallKickCd = P.wallKickCd || 0;
    P.lastHitT += dt; P.lastAllyAge = (P.lastAllyAge || 0) + dt;
    if (P.chainT > 0) { P.chainT = Math.max(0, P.chainT - dt); if (P.chainT <= 0) P.comboIndex = 0; }
    if (P.comboT > 0) { P.comboT -= dt; if (P.comboT <= 0) P.comboCount = 0; }
    if (P.surge > 0 && P.lastHitT > 6) P.surge = Math.max(0, P.surge - dt * 2);
  }

  const clipExists = (n) => P.anim && P.anim.has(n);
  function updateVisuals(dt) {
    let face = P.facing;
    const a = P.action;
    if (a && (a.type === "combo" || a.type === "heavy" || a.type === "nova" || a.type === "dash" || a.type === "air" || a.type === "lunge" || a.type === "warp" || a.type === "charge")) face = a.face;
    else if (P.lockTarget && isFoe(P.lockTarget)) { const ep = entPos(P.lockTarget); face = Math.atan2(ep.x - P.x, ep.z - P.z); }
    else if (P.hasInput) face = Math.atan2(P.moveX, P.moveZ);
    P.facing = G.util.angleLerp(P.facing, face, 1 - Math.exp(-(P.grounded ? 18 : 10) * dt));
    P.root.position.set(P.x, P.y, P.z); P.root.rotation.y = P.facing;

    /* body lean into motion */
    const body = P.rig && P.rig.body;
    if (body) {
      const sp = Math.hypot(P.vx, P.vz);
      const want = P.grounded ? clamp(sp * 0.018, 0, 0.2) * (P.sprinting ? 1.4 : 1) : (P.gliding ? 0.9 : clamp(sp * 0.012, 0, 0.18));
      body.rotation.x = damp(body.rotation.x, want, 10, dt);
    }
    if (P.anim) P.anim.update(dt, { speed: Math.hypot(P.vx, P.vz) });

    if (!P.action) {
      let b = "idle";
      if (!P.grounded) b = P.gliding ? "glide" : "air";
      else if (P.hasInput) b = P.sprinting && clipExists("sprint") ? "sprint" : "run";
      if (b !== animBase) {
        animBase = b; base(b);
        if (b === "glide" || b === "air") play(b, { fade: 0.08 }); else if (P.anim) P.anim.play(b, { fade: 0.12 });
      }
      if (P.anim && (b === "run" || b === "sprint")) P.anim.setSpeed(clamp(Math.hypot(P.vx, P.vz) / 6.5, 0.6, 1.7));
      else if (P.anim) P.anim.setSpeed(1);
    } else if (P.action.type === "stagger") animBase = "hurt";
    else animBase = "";

    if (P.cloakPanels.length) {
      const flare = P.gliding ? 0.95 : (P.grounded ? 0 : clamp(Math.hypot(P.vx, P.vz) * 0.04, 0, 0.5));
      for (let i = 0; i < P.cloakPanels.length; i++) {
        const p = P.cloakPanels[i]; p.rotation.x = damp(p.rotation.x, P.cloakBase[i] + flare, 9, dt);
      }
    }
    if (P.staffGlow) {
      const k = clamp(P.castGlow / 0.4, 0, 1);
      P.staffGlow.material.opacity = k * 0.95;
      P.staffGlow.scale.setScalar(1.0 + k * 0.9 + Math.sin(performance.now() * 0.004) * 0.04);
    }
    /* aura while Triple Bloom is live */
    P.root.userData.aura = P.tripleT > 0;
  }

  /* ================================================================
     MAIN UPDATE
     ================================================================ */
  P.update = function (dt) {
    dt = num(dt, 0.016); if (dt <= 0) dt = 0.0001; if (dt > 0.05) dt = 0.05;
    if (!entRef) return;
    G.input.tick(dt);
    updateTimers(dt);
    readMove();
    readCamera(dt);
    updateLock(dt);
    if (!P.alive) {
      P.deadT += dt; P.hasInput = false; P.moveX = P.moveZ = 0;
      moveUpdate(dt); updateCrane(dt); updateThistle(dt); updateHeal(dt); updateVisuals(dt);
      computeCameraTarget(); pushCamera(dt, false); return;
    }
    updateHookReady();
    moveUpdate(dt);
    updateAction(dt);
    actionInputs(dt);
    updateCrane(dt); updateThistle(dt); updateHeal(dt);
    updateVisuals(dt);
    computeCameraTarget(); pushCamera(dt, false);
  };

  P.setLockTarget = function (e) { P.lockTarget = e || null; };
  P.isLocked = function () { return !!P.lockTarget; };
})();
