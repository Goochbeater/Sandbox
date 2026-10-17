/* SPOREHEART — combat.js : damage kernel, hitbox sweeps, projectiles, damage numbers
   Agent D. Classic script; attaches G.combat. No THREE usage at parse time.

   Contract (SPEC §Entities/combat):
     G.combat.init([scene]) / update(dt) / register(e) / unregister(e)
     G.combat.hitbox({team, shape:{type:'sphere',pos,r}|{type:'sector',pos,dir,range,arc},
                      dmg, knock, stagger, life, once, onHit}) -> handle
     G.combat.meleeArc(entity, {range, arc, dmg, ...}) -> handle
     G.combat.projectile({from, dir|target, speed, r, dmg, team, homing, gravity, life,
                          trail, color, onHit, knock, stagger}) -> handle
     G.combat.damageNumber(pos, amt, {crit, color})
     G.combat.hitstop(sec) / iframe(entity, sec)
   Team rules: 'player' hitboxes only damage 'enemy'/'neutral'; 'enemy' only 'player'.
   Invulnerable entities get `onInvulnHit(hit)` so the player can detect perfect dodges.
   PERF: hitboxes / projectiles / numbers are all fixed pools; texture glyphs are cached. */
(function () {
  "use strict";
  const G = window.G;
  if (!G) return;
  const C = (G.combat = {});

  C.entities = [];
  const hitboxes = [];
  const projectiles = [];
  const numbers = [];
  let stage = null;
  let inited = false;
  let hitCursor = 0, projCursor = 0, numCursor = 0;

  /* ---------------- shared helpers ---------------- */
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  const POS = { x: 0, y: 0, z: 0 };
  function readPos(p, out) {
    out = out || POS;
    if (!p) { out.x = out.y = out.z = 0; return out; }
    const x = p.x, y = p.y, z = p.z;
    out.x = typeof x === "number" && isFinite(x) ? x : 0;
    out.y = typeof y === "number" && isFinite(y) ? y : 0;
    out.z = typeof z === "number" && isFinite(z) ? z : 0;
    return out;
  }
  const EPOS = { x: 0, y: 0, z: 0 };
  function entityPos(e, out) {
    out = out || EPOS;
    const o = e && (e.object3D || e.mesh || e.root);
    if (o && o.position) return readPos(o.position, out);
    out.x = num(e && e.x, 0);
    out.y = num(e && e.y, 0);
    out.z = num(e && e.z, 0);
    return out;
  }
  function groundAt(x, z) {
    if (G.world && typeof G.world.heightAt === "function") {
      const h = G.world.heightAt(x, z);
      if (typeof h === "number" && isFinite(h)) return h;
    }
    return 0;
  }
  function resolveScene() {
    return (G.game && G.game.scene) || G.scene || (G.world && G.world.scene) || (G.player && G.player.scene) || null;
  }
  C.setScene = function (scene) { if (scene) stage = scene; };

  function addToStage(obj) {
    if (stage && typeof stage.add === "function" && obj.parent !== stage) stage.add(obj);
  }

  /* slow-mo support: combat mirrors G.timeScale (game loop scales dt) */
  Object.defineProperty(C, "timeScale", {
    configurable: true,
    get() { return typeof G.timeScale === "number" ? G.timeScale : 1; },
    set(v) { G.timeScale = typeof v === "number" ? v : 1; }
  });

  /* ================================================================
     REGISTRY
     ================================================================ */
  C.register = function (e) {
    if (!e) return e;
    if (C.entities.indexOf(e) < 0) C.entities.push(e);
    return e;
  };
  C.unregister = function (e) {
    const i = C.entities.indexOf(e);
    if (i >= 0) C.entities.splice(i, 1);
  };

  /* ================================================================
     DAMAGE
     ================================================================ */
  let fromVec = null;
  const HIT = { dmg: 0, from: null, knock: 0, stagger: 0, src: null, crit: false, up: 0 };

  function applyDamage(target, dmg, knock, stagger, src, fx, fy, fz, crit, team, up) {
    if (!target) return false;
    if (target.alive === false) return false;
    if (typeof target.hp === "number" && target.hp <= 0) return false;
    const THREE = G.THREE;
    if (!fromVec && THREE) fromVec = new THREE.Vector3();
    if (fromVec) fromVec.set(fx, fy, fz);

    HIT.dmg = dmg;
    HIT.from = fromVec;
    HIT.knock = knock || 0;
    HIT.stagger = stagger || 0;
    HIT.src = src || null;
    HIT.crit = !!crit;
    HIT.up = num(up, 0);

    // i-frames: no damage, but let the entity react (perfect dodge hook)
    if (target.iframeTimer > 0) {
      if (typeof target.onInvulnHit === "function") {
        try { target.onInvulnHit(HIT); } catch (e) { console.error("[combat:onInvulnHit]", e); }
      }
      return false;
    }

    if (typeof target.takeDamage === "function") target.takeDamage(dmg, HIT);
    else if (typeof target.hp === "number") target.hp -= dmg;

    const ep = entityPos(target);
    const pos = { x: ep.x, y: ep.y + (num(target.height, 1.6)) * 0.65, z: ep.z };
    G.bus.emit("hit", { target, amt: dmg, pos, crit: !!crit, team });

    if (target.team !== "player" && dmg >= 1) {
      C.damageNumber(pos, dmg, { crit: !!crit, color: crit ? 0xffd166 : 0xfff0f6 });
    }

    if (target.alive === false || (typeof target.hp === "number" && target.hp <= 0)) {
      if (!target._killEmitted) {
        target._killEmitted = true;
        // the player has its own death event; don't announce a "kill" for it
        if (target.team !== "player") {
          G.bus.emit("kill", { target, pos });
          if (G.stats) G.stats.kills = (G.stats.kills || 0) + 1;
        }
      }
    } else if (G.stats) {
      G.stats.hits = (G.stats.hits || 0) + 1;
    }
    return true;
  }
  C.applyDamage = applyDamage;

  /* ================================================================
     HITBOXES
     ================================================================ */
  function makeHitbox() {
    const THREE = G.THREE;
    return {
      alive: false, team: "enemy", type: "sphere",
      pos: THREE ? new THREE.Vector3() : null,
      dir: THREE ? new THREE.Vector3(0, 0, 1) : null,
      r: 1, range: 2, arc: 2, dmg: 10, knock: 3, stagger: 0.1, crit: false, up: 0,
      life: 0, lifeMax: 0.08, once: true, onHit: null, src: null, hits: new Set()
    };
  }
  function ensureHitboxes() {
    if (hitboxes.length) return;
    for (let i = 0; i < 40; i++) hitboxes.push(makeHitbox());
  }

  C.hitbox = function (o) {
    if (!o) return null;
    const THREE = G.THREE;
    if (!THREE) return null;
    ensureHitboxes();
    let hb = null;
    for (let i = 0; i < hitboxes.length; i++) if (!hitboxes[i].alive) { hb = hitboxes[i]; break; }
    if (!hb) { hb = hitboxes[hitCursor++ % hitboxes.length]; }

    const shape = o.shape || {};
    hb.alive = true;
    hb.team = o.team || "enemy";
    hb.type = shape.type === "sector" ? "sector" : "sphere";
    readPos(shape.pos || o.pos || { x: 0, y: 0, z: 0 }, POS);
    if (hb.pos) hb.pos.set(POS.x, POS.y, POS.z);

    let dx = 0, dz = 1;
    if (shape.dir) {
      readPos(shape.dir, POS);
      dx = POS.x; dz = POS.z;
    } else if (typeof o.angle === "number") {
      dx = Math.sin(o.angle); dz = Math.cos(o.angle);
    }
    const dl = Math.hypot(dx, dz) || 1;
    if (hb.dir) hb.dir.set(dx / dl, 0, dz / dl);

    hb.r = Math.max(0.01, num(shape.r !== undefined ? shape.r : o.r, 1));
    hb.range = Math.max(0.01, num(shape.range !== undefined ? shape.range : o.range, 2));
    hb.arc = Math.max(0.05, num(shape.arc !== undefined ? shape.arc : o.arc, Math.PI));
    hb.dmg = num(o.dmg, 10);
    hb.knock = num(o.knock, 2.5);
    hb.stagger = num(o.stagger, 0.1);
    hb.crit = !!o.crit;
    hb.up = num(o.up, 0);
    hb.once = o.once !== false;
    hb.onHit = typeof o.onHit === "function" ? o.onHit : null;
    hb.src = o.src || null;
    hb.lifeMax = hb.life = Math.max(0.016, num(o.life, 0.08));
    hb.hits.clear();

    // player swings also smash breakables in the world
    if (hb.team === "player" && G.world && typeof G.world.hitBreakables === "function") {
      const br = hb.type === "sphere" ? hb.r : hb.range * 0.7;
      try { G.world.hitBreakables(hb.pos, br, hb.dmg, hb.team); } catch (e) { console.error("[combat:breakables]", e); }
    }
    return hb;
  };

  function teamCanHit(hbTeam, ent) {
    if (!ent || ent.alive === false) return false;
    if (typeof ent.hp === "number" && ent.hp <= 0) return false;
    if (!ent.team || ent.team === hbTeam) return false;
    if (hbTeam === "player") return ent.team === "enemy" || ent.team === "neutral";
    if (hbTeam === "enemy") return ent.team === "player";
    return ent.team !== hbTeam;
  }

  function testHit(hb, e) {
    const ep = entityPos(e);
    const er = Math.max(0.05, num(e.radius, 0.4));
    const eh = Math.max(0.2, num(e.height, 1.6));
    const yTop = ep.y + eh;
    if (hb.type === "sphere") {
      const dx = ep.x - hb.pos.x, dz = ep.z - hb.pos.z;
      const rr = hb.r + er;
      if (dx * dx + dz * dz > rr * rr) return false;
      const cy = Math.max(ep.y, Math.min(hb.pos.y, yTop));
      return Math.abs(hb.pos.y - cy) <= hb.r + eh * 0.35;
    }
    // sector
    const dx = ep.x - hb.pos.x, dz = ep.z - hb.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > hb.range + er) return false;
    if (Math.abs(hb.pos.y - (ep.y + eh * 0.5)) > eh * 0.85 + 0.35) return false;
    if (dist > 0.05) {
      const nx = dx / dist, nz = dz / dist;
      const d = nx * hb.dir.x + nz * hb.dir.z;
      if (d < Math.cos(hb.arc * 0.5)) return false;
    }
    return true;
  }

  function updateHitboxes(dt) {
    for (let i = 0; i < hitboxes.length; i++) {
      const hb = hitboxes[i];
      if (!hb.alive) continue;
      hb.life -= dt;
      const ents = C.entities;
      for (let j = 0; j < ents.length; j++) {
        const e = ents[j];
        if (!teamCanHit(hb.team, e)) continue;
        if (hb.once && hb.hits.has(e)) continue;
        if (!testHit(hb, e)) continue;
        hb.hits.add(e);
        const ok = applyDamage(e, hb.dmg, hb.knock, hb.stagger, hb.src,
          hb.pos.x, hb.pos.y, hb.pos.z, hb.crit, hb.team, hb.up);
        if (ok && hb.onHit) {
          try { hb.onHit(e, hb); } catch (err) { console.error("[combat:onHit]", err); }
        }
      }
      if (hb.life <= 0) hb.alive = false;
    }
  }

  /* ================================================================
     MELEE ARC HELPER
     ================================================================ */
  let arcPos = null, arcDir = null;
  C.meleeArc = function (entity, opts) {
    const THREE = G.THREE;
    const o = opts || {};
    if (!THREE) return null;
    if (!arcPos) { arcPos = new THREE.Vector3(); arcDir = new THREE.Vector3(); }
    let px = 0, py = 0, pz = 0, ang = num(o.angle, 0);
    const root = entity && (entity.object3D || entity.root);
    if (root && root.position) {
      const ep = entityPos(entity);
      px = ep.x; py = ep.y; pz = ep.z;
      if (o.dir === undefined && root.rotation) ang = num(root.rotation.y, ang);
    } else {
      px = num(entity && entity.x, 0);
      py = num(entity && entity.y, 0);
      pz = num(entity && entity.z, 0);
    }
    if (o.dir) { readPos(o.dir, POS); ang = Math.atan2(POS.x, POS.z); }
    arcPos.set(px, py + num(o.y, 0.95), pz);
    arcDir.set(Math.sin(ang), 0, Math.cos(ang));
    return C.hitbox({
      team: (entity && entity.team) || o.team || "player",
      shape: {
        type: "sector", pos: arcPos, dir: arcDir,
        range: num(o.range, 2.2), arc: num(o.arc, Math.PI * 0.75)
      },
      dmg: num(o.dmg, 8),
      knock: num(o.knock, 3),
      stagger: num(o.stagger, 0.15),
      life: num(o.life, 0.08),
      once: o.once !== false,
      crit: o.crit,
      up: o.up,
      src: entity,
      onHit: o.onHit
    });
  };

  /* ================================================================
     PROJECTILES (pooled: glow sprite + core sphere)
     ================================================================ */
  let projGeo = null, glowTexCache = null;

  function makeProjectile() {
    const THREE = G.THREE;
    const group = new THREE.Group();
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff9ec4 });
    const core = new THREE.Mesh(projGeo, coreMat);
    core.scale.setScalar(0.16);
    if (glowTexCache === null) {
      glowTexCache = (G.assets && G.assets.tex && typeof G.assets.tex.glowdot === "function")
        ? G.assets.tex.glowdot() : null;
    }
    const sprMat = new THREE.SpriteMaterial({
      map: glowTexCache, color: 0xff9ec4, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const glow = new THREE.Sprite(sprMat);
    glow.scale.setScalar(1.0);
    group.add(core);
    group.add(glow);
    group.visible = false;
    group.renderOrder = 8;
    return {
      alive: false, group, core, glow, coreMat, sprMat,
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      speed: 18, r: 0.3, dmg: 10, knock: 2, stagger: 0.1, up: 0,
      team: "player", homing: 0, gravity: 0, life: 0, lifeMax: 1,
      trail: false, trailT: 0, color: 0xff9ec4, onHit: null,
      target: null, hasTP: false, tx: 0, ty: 0, tz: 0, src: null
    };
  }

  function ensureProjectilePool() {
    if (projGeo) return;
    const THREE = G.THREE;
    if (!THREE) return;
    projGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 32; i++) projectiles.push(makeProjectile());
  }

  function findNearestEnemy(x, y, z, team, maxDist) {
    let best = null, bestD = maxDist * maxDist;
    for (let i = 0; i < C.entities.length; i++) {
      const e = C.entities[i];
      if (!e || e.alive === false) continue;
      if (team === "player" ? e.team !== "enemy" : e.team !== "player") continue;
      const ep = entityPos(e);
      const d = (ep.x - x) * (ep.x - x) + (ep.z - z) * (ep.z - z);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  C.projectile = function (o) {
    if (!o) return null;
    ensureProjectilePool();
    if (!projGeo) return null;
    let p = null;
    for (let i = 0; i < projectiles.length; i++) if (!projectiles[i].alive) { p = projectiles[i]; break; }
    if (!p) p = projectiles[projCursor++ % projectiles.length];

    readPos(o.from, POS);
    p.x = POS.x; p.y = POS.y; p.z = POS.z;
    p.speed = Math.max(0.5, num(o.speed, 18));
    p.r = Math.max(0.05, num(o.r, 0.3));
    p.dmg = num(o.dmg, 10);
    p.knock = num(o.knock, 2.5);
    p.stagger = num(o.stagger, 0.15);
    p.up = num(o.up, 0);
    p.team = o.team || "player";
    p.homing = num(o.homing, 0);
    p.gravity = num(o.gravity, 0);
    p.lifeMax = p.life = Math.max(0.05, num(o.life, 2.5));
    p.trail = !!o.trail;
    p.trailT = 0;
    p.color = typeof o.color === "number" ? o.color : 0xff9ec4;
    p.onHit = typeof o.onHit === "function" ? o.onHit : null;
    p.src = o.src || null;
    p.target = null;
    p.hasTP = false;

    const maybeTarget = o.target;
    if (maybeTarget && (maybeTarget.object3D || typeof maybeTarget.takeDamage === "function")) {
      p.target = maybeTarget;
    } else if (maybeTarget) {
      readPos(maybeTarget, POS);
      p.tx = POS.x; p.ty = POS.y; p.tz = POS.z; p.hasTP = true;
    }
    if (!p.target && p.homing > 0) {
      const t = findNearestEnemy(p.x, p.y, p.z, p.team, 16);
      if (t) p.target = t;
    }

    let dx = 0, dy = 0, dz = 1;
    if (o.dir) { readPos(o.dir, POS); dx = POS.x; dy = POS.y; dz = POS.z; }
    if (p.target) {
      const ep = entityPos(p.target);
      dx = ep.x - p.x;
      dy = (ep.y + num(p.target.height, 1.6) * 0.5) - p.y;
      dz = ep.z - p.z;
    } else if (!o.dir && p.hasTP) {
      dx = p.tx - p.x; dy = p.ty - p.y; dz = p.tz - p.z;
    }
    let l = Math.hypot(dx, dy, dz);
    if (l < 0.0001) { dx = 0; dy = 0; dz = 1; l = 1; }
    dx /= l; dy /= l; dz /= l;
    p.vx = dx * p.speed; p.vy = dy * p.speed; p.vz = dz * p.speed;

    // color
    const cr = ((p.color >> 16) & 255) / 255, cg = ((p.color >> 8) & 255) / 255, cb = (p.color & 255) / 255;
    p.coreMat.color.setRGB(cr, cg, cb);
    p.sprMat.color.setRGB(cr, cg, cb);
    p.core.scale.setScalar(p.r);
    p.glow.scale.setScalar(p.r * 7.5);
    p.group.visible = true;
    p.group.position.set(p.x, p.y, p.z);
    addToStage(p.group);
    p.alive = true;
    return p;
  };

  function killProjectile(p) {
    p.alive = false;
    p.group.visible = false;
  }

  const TRAIL = { count: 1, color: 0xff9ec4, speed: 0.4, size: 0.22, life: 0.24, gravity: 0, spread: 0.5, tex: "glow", drag: 2, spawnRadius: 0.05 };

  function impactProjectile(p, target) {
    const x = p.x, y = p.y, z = p.z;
    const fromX = p.x - (p.vx / (p.speed || 1)) * 0.4;
    const fromY = p.y - (p.vy / (p.speed || 1)) * 0.4;
    const fromZ = p.z - (p.vz / (p.speed || 1)) * 0.4;
    let applied = false;
    if (target) {
      applied = applyDamage(target, p.dmg, p.knock, p.stagger, p.src, fromX, fromY, fromZ, false, p.team, p.up);
    }
    if (G.vfx && G.vfx.burst) {
      G.vfx.burst({ x, y, z }, {
        count: target ? 8 : 5, color: p.color, speed: 4.5, size: p.r * 0.9,
        life: 0.3, gravity: -3, spread: 1, tex: "glow"
      });
    }
    if (p.onHit) {
      try { p.onHit(target, { dmg: p.dmg, applied }); } catch (e) { console.error("[combat:projectile onHit]", e); }
    }
    killProjectile(p);
  }

  function updateProjectiles(dt) {
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { killProjectile(p); continue; }

      // homing steer
      if (p.homing > 0) {
        let tx = 0, ty = 0, tz = 0, hasTarget = false;
        if (p.target && p.target.alive !== false) {
          const ep = entityPos(p.target);
          tx = ep.x; ty = ep.y + num(p.target.height, 1.6) * 0.5; tz = ep.z; hasTarget = true;
        } else if (p.hasTP) {
          tx = p.tx; ty = p.ty; tz = p.tz; hasTarget = true;
        }
        if (hasTarget) {
          const dx = tx - p.x, dy = ty - p.y, dz = tz - p.z;
          const dl = Math.hypot(dx, dy, dz) || 1;
          const k = Math.min(1, p.homing * dt);
          const wantVX = dx / dl * p.speed, wantVY = dy / dl * p.speed, wantVZ = dz / dl * p.speed;
          p.vx += (wantVX - p.vx) * k;
          p.vy += (wantVY - p.vy) * k;
          p.vz += (wantVZ - p.vz) * k;
          if (p.gravity === 0) {
            const vl = Math.hypot(p.vx, p.vy, p.vz) || 1;
            p.vx = p.vx / vl * p.speed; p.vy = p.vy / vl * p.speed; p.vz = p.vz / vl * p.speed;
          }
        }
      }
      if (p.gravity !== 0) p.vy -= p.gravity * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // ground
      const gy = groundAt(p.x, p.z);
      if (p.y <= gy + 0.06) { impactProjectile(p, null); continue; }

      // world colliders
      let blocked = false;
      const cols = G.world && G.world.colliders;
      if (cols && cols.length) {
        for (let c = 0; c < cols.length; c++) {
          const col = cols[c];
          if (!col) continue;
          const y0 = num(col.y0, 0), y1 = num(col.y1, 4);
          if (p.y < y0 || p.y > y1) continue;
          const dx = p.x - col.x, dz = p.z - col.z;
          const rr = num(col.r, 0.5) + p.r;
          if (dx * dx + dz * dz < rr * rr) { blocked = true; break; }
        }
      }
      if (blocked) { impactProjectile(p, null); continue; }

      // entities
      let hit = null;
      for (let j = 0; j < C.entities.length; j++) {
        const e = C.entities[j];
        if (!e || e.alive === false) continue;
        if (e.team === p.team) continue;
        if (p.team === "player" && e.team !== "enemy" && e.team !== "neutral") continue;
        if (p.team === "enemy" && e.team !== "player") continue;
        const ep = entityPos(e);
        const dx = ep.x - p.x, dz = ep.z - p.z;
        const rr = p.r + Math.max(0.1, num(e.radius, 0.4));
        if (dx * dx + dz * dz > rr * rr) continue;
        const eh = Math.max(0.3, num(e.height, 1.6));
        if (p.y < ep.y - 0.25 || p.y > ep.y + eh + 0.25) continue;
        hit = e;
        break;
      }
      if (hit) { impactProjectile(p, hit); continue; }

      // trail
      if (p.trail) {
        p.trailT -= dt;
        if (p.trailT <= 0) {
          p.trailT = 0.035;
          TRAIL.color = p.color;
          TRAIL.size = p.r * 0.8;
          if (G.vfx && G.vfx.burst) G.vfx.burst({ x: p.x, y: p.y, z: p.z }, TRAIL);
        }
      }

      p.group.position.set(p.x, p.y, p.z);
      p.group.rotation.y += dt * 6;
    }
  }

  /* ================================================================
     DAMAGE NUMBERS (glyph canvas cache, pooled sprites)
     ================================================================ */
  const numTexCache = Object.create(null);
  function numberTexture(text, color, crit) {
    const key = text + "|" + color + "|" + (crit ? 1 : 0);
    if (numTexCache[key]) return numTexCache[key];
    const THREE = G.THREE;
    if (!THREE) return null;
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 128);
    const col = "#" + (color >>> 0).toString(16).padStart(6, "0");
    ctx.font = (crit ? "bold 92px " : "bold 78px ") + 'Georgia, "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = crit ? 14 : 11;
    ctx.strokeStyle = "rgba(8,10,14,0.92)";
    ctx.strokeText(text, 128, 66);
    const g = ctx.createLinearGradient(0, 22, 0, 106);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.55, col);
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.fillText(text, 128, 66);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    numTexCache[key] = tex;
    return tex;
  }

  function makeNumberSprite() {
    const THREE = G.THREE;
    const mat = new THREE.SpriteMaterial({
      transparent: true, depthWrite: false, depthTest: false, opacity: 1
    });
    const spr = new THREE.Sprite(mat);
    spr.visible = false;
    spr.renderOrder = 30;
    spr.scale.set(1.05, 0.52, 1);
    return { spr, mat, alive: false, x: 0, y: 0, z: 0, vy: 0, life: 0, maxLife: 1, crit: false };
  }
  function ensureNumberPool() {
    if (numbers.length) return;
    const THREE = G.THREE;
    if (!THREE) return;
    for (let i = 0; i < 28; i++) numbers.push(makeNumberSprite());
  }

  C.damageNumber = function (pos, amt, opts) {
    const THREE = G.THREE;
    if (!THREE) return null;
    ensureNumberPool();
    if (!numbers.length) return null;
    const o = opts || {};
    const crit = !!o.crit;
    const value = Math.max(1, Math.round(num(amt, 0)));
    const color = typeof o.color === "number" ? o.color : (crit ? 0xffd166 : 0xfff0f6);
    const tex = numberTexture(String(value), color, crit);
    if (!tex) return null;

    let rec = null;
    for (let i = 0; i < numbers.length; i++) if (!numbers[i].alive) { rec = numbers[i]; break; }
    if (!rec) rec = numbers[numCursor++ % numbers.length];

    readPos(pos, POS);
    const jx = (Math.random() - 0.5) * 0.55;
    const jz = (Math.random() - 0.5) * 0.55;
    rec.x = POS.x + jx;
    rec.y = POS.y + 0.25;
    rec.z = POS.z + jz;
    rec.vy = crit ? 2.6 : 2.0;
    rec.maxLife = rec.life = crit ? 1.15 : 0.9;
    rec.crit = crit;
    rec.mat.map = tex;
    rec.mat.needsUpdate = true;
    rec.mat.opacity = 1;
    const s = crit ? 1.45 : 1.0;
    rec.spr.scale.set(1.15 * s, 0.58 * s, 1);
    rec.spr.position.set(rec.x, rec.y, rec.z);
    rec.spr.visible = true;
    rec.alive = true;
    addToStage(rec.spr);
    return rec;
  };

  function updateNumbers(dt) {
    for (let i = 0; i < numbers.length; i++) {
      const n = numbers[i];
      if (!n.alive) continue;
      n.life -= dt;
      if (n.life <= 0) { n.alive = false; n.spr.visible = false; continue; }
      const k = 1 - n.life / n.maxLife;
      n.vy -= 3.4 * dt;
      n.y += n.vy * dt;
      const pop = k < 0.18 ? 0.7 + 0.3 * (k / 0.18) + 0.25 * Math.sin((k / 0.18) * Math.PI) : 1;
      const s = (n.crit ? 1.45 : 1.0) * pop;
      n.spr.scale.set(1.15 * s, 0.58 * s, 1);
      n.spr.position.set(n.x, n.y, n.z);
      n.mat.opacity = Math.min(1, n.life * 3.2);
    }
  }

  /* ================================================================
     GLOBAL TIMERS
     ================================================================ */
  C.hitstop = function (sec) {
    const s = Math.max(0, Math.min(0.16, num(sec, 0.05)));
    G.hitstopTimer = Math.max(G.hitstopTimer || 0, s);
  };

  C.iframe = function (entity, sec) {
    if (!entity) return;
    const s = Math.max(0, num(sec, 0.2));
    entity.iframeTimer = Math.max(entity.iframeTimer || 0, s);
  };

  /* ================================================================
     LIFECYCLE
     ================================================================ */
  C.init = function (scene) {
    scene = scene || resolveScene();
    if (scene) stage = scene;
    ensureHitboxes();
    if (G.hitstopTimer === undefined) G.hitstopTimer = 0;
    if (!inited) {
      inited = true;
      // pools are created lazily on first use (they need THREE + scene)
    }
  };

  C.update = function (dt) {
    dt = typeof dt === "number" && dt > 0 ? Math.min(dt, 0.1) : 0;
    if (!stage) stage = resolveScene();

    // i-frame decay
    for (let i = 0; i < C.entities.length; i++) {
      const e = C.entities[i];
      if (e && typeof e.iframeTimer === "number" && e.iframeTimer > 0) {
        e.iframeTimer = Math.max(0, e.iframeTimer - dt);
      }
    }
    updateHitboxes(dt);
    updateProjectiles(dt);
    updateNumbers(dt);
  };

  C.stats = function () {
    let hb = 0, pr = 0;
    for (let i = 0; i < hitboxes.length; i++) if (hitboxes[i].alive) hb++;
    for (let i = 0; i < projectiles.length; i++) if (projectiles[i].alive) pr++;
    return { entities: C.entities.length, hitboxes: hb, projectiles: pr, pool: projectiles.length };
  };
})();
