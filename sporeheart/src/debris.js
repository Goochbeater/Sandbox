/* SPOREHEART — debris.js : chunky physics debris for breakable set pieces + collectable spore orbs
   G.debris.burst(x, y, z, { kind, n, power, up, size, dir:{x,z} })
        kinds: wood · stall · clay · shroom · glass · pod · stone
   G.pickups.spawn(x, y, z, "heal"|"mana", n)  — glowing orbs that fly to Mira (heal 9 hp / +14 mana)
   Everything is pooled InstancedMesh work: no allocation after init, ≤ 420 live fragments.                      */
(function () {
  "use strict";
  const G = window.G;
  const D = (G.debris = {});
  const PK = (G.pickups = { list: [] });
  const MAX = 420;
  let THREE, inst = {}, parts = [], cursor = 0, dummy, color, ready = false;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const KINDS = {
    wood:  { shapes: ["plank", "plank", "plank", "chunk"], colors: [0x7a5636, 0x5a4028, 0x8b6a46, 0x3f2d1e], n: 16, size: 1 },
    stall: { shapes: ["plank", "plank", "cloth", "cloth", "chunk"], colors: [0x7a5636, 0x5a4028, 0xd64533, 0xf5ead2, 0x3f8f83], n: 30, size: 1.3 },
    clay:  { shapes: ["shard", "shard", "chunk"], colors: [0xb99a72, 0xa5805a, 0xd2b48c], n: 12, size: 0.8 },
    stone: { shapes: ["chunk", "shard"], colors: [0x8d9a94, 0x6c7a74, 0xa9b4ac], n: 10, size: 0.9 },
    shroom:{ shapes: ["chunk", "chunk", "shard"], colors: [0xd64533, 0xf5ead2, 0xb23a2c, 0xffd9a8], n: 18, size: 1.1 },
    glass: { shapes: ["shard", "shard"], colors: [0xffd9a0, 0xfff0c0, 0xffb347], n: 12, size: 0.6, glow: true },
    pod:   { shapes: ["chunk", "shard"], colors: [0xff7a33, 0xffb347, 0xe8433a], n: 18, size: 1.0, glow: true }
  };

  function mkInst(geo, mat, name) {
    const m = new THREE.InstancedMesh(geo, mat, MAX);
    m.count = 0; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = false; m.name = "debris_" + name;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    return m;
  }

  D.init = function (scene) {
    THREE = G.THREE; dummy = new THREE.Object3D(); color = new THREE.Color();
    const A = G.assets;
    const toon = A.mat.toon(0xffffff, { noCache: true, rim: 0.6 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const geos = {
      plank: new THREE.BoxGeometry(1, 1, 1), cloth: new THREE.PlaneGeometry(1, 1), chunk: new THREE.IcosahedronGeometry(1, 0), shard: new THREE.TetrahedronGeometry(1, 0)
    };
    inst.solid = {}; inst.glow = {};
    for (const k of Object.keys(geos)) {
      inst.solid[k] = mkInst(geos[k], toon, k); inst.solid[k].material = toon; scene.add(inst.solid[k]);
      inst.glow[k] = mkInst(geos[k], glowMat, k + "G"); inst.glow[k].castShadow = false; scene.add(inst.glow[k]);
    }
    cloth(inst.solid.cloth); cloth(inst.glow.cloth);
    function cloth(m) { m.material = m.material.clone(); m.material.side = THREE.DoubleSide; }
    for (let i = 0; i < MAX; i++) parts.push({ a: false, shape: "plank", glow: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, sx: 1, sy: 1, sz: 1, life: 0, max: 1, r: 0, g: 0, b: 0, bounces: 0 });
    ready = true;
    /* pickups: pooled billboard orbs */
    const tex = A.tex.glowdot();
    for (let i = 0; i < 24; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x8effc0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.visible = false; scene.add(sp);
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8ffe8 })); core.visible = false; scene.add(core);
      PK.list.push({ a: false, sp, core, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, type: "heal", mag: false });
    }
  };

  D.burst = function (x, y, z, o) {
    if (!ready) return;
    o = o || {};
    const K = KINDS[o.kind || "wood"] || KINDS.wood;
    const n = Math.round((o.n || K.n) * (G.render && G.render.scale < 0.7 ? 0.6 : 1));
    const size = (o.size || 1) * K.size;
    const power = o.power || 6.5, up = o.up || 5.5;
    for (let i = 0; i < n; i++) {
      const p = parts[cursor++ % MAX];
      const shape = K.shapes[(Math.random() * K.shapes.length) | 0];
      p.a = true; p.shape = shape; p.glow = !!K.glow; p.bounces = 0;
      const col = K.colors[(Math.random() * K.colors.length) | 0];
      color.setHex(col); if (K.glow) color.multiplyScalar(1.8);
      p.r = color.r; p.g = color.g; p.b = color.b;
      const a = Math.random() * 6.283, sp = rnd(0.3, 1) * power;
      let dx = Math.cos(a), dz = Math.sin(a);
      if (o.dir) { dx = dx * 0.5 + o.dir.x; dz = dz * 0.5 + o.dir.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
      p.x = x + dx * rnd(0, 0.5); p.y = y + rnd(0, 0.6); p.z = z + dz * rnd(0, 0.5);
      p.vx = dx * sp; p.vz = dz * sp; p.vy = rnd(0.35, 1) * up;
      p.rx = rnd(0, 6.28); p.ry = rnd(0, 6.28); p.rz = rnd(0, 6.28);
      p.wx = rnd(-9, 9); p.wy = rnd(-9, 9); p.wz = rnd(-9, 9);
      const s = size * rnd(0.6, 1.25);
      if (shape === "plank") { p.sx = 0.07 * s; p.sy = 0.08 * s; p.sz = rnd(0.28, 0.6) * s; }
      else if (shape === "cloth") { p.sx = rnd(0.35, 0.65) * s; p.sy = rnd(0.25, 0.5) * s; p.sz = 1; }
      else if (shape === "shard") { p.sx = p.sy = p.sz = 0.12 * s; p.sy *= rnd(1, 1.8); }
      else { p.sx = p.sy = p.sz = rnd(0.08, 0.18) * s; }
      p.life = p.max = rnd(2.6, 4.6);
    }
    /* dust + spore puff */
    G.vfx.burst({ x: x, y: y + 0.2, z: z }, { count: 10, color: o.kind === "shroom" ? 0xffd9a8 : 0xcdbfa0, speed: 3, size: 0.9, life: 0.7, gravity: 0.5, spread: 1, tex: "glow" });
  };

  D.update = function (dt) {
    if (!ready) return;
    const counts = { solid: {}, glow: {} };
    for (const k in inst.solid) { counts.solid[k] = 0; counts.glow[k] = 0; }
    const hAt = G.world && G.world.heightAt;
    for (let i = 0; i < MAX; i++) {
      const p = parts[i]; if (!p.a) continue;
      p.life -= dt;
      if (p.life <= 0) { p.a = false; continue; }
      p.vy -= 22 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const gy = (hAt ? hAt(p.x, p.z) : 0) + 0.06;
      if (p.y < gy) {
        p.y = gy;
        if (p.vy < -1.6 && p.bounces < 3) { p.vy = -p.vy * 0.38; p.vx *= 0.65; p.vz *= 0.65; p.wx *= 0.6; p.wy *= 0.6; p.wz *= 0.6; p.bounces++; }
        else { p.vy = 0; p.vx *= Math.exp(-dt * 6); p.vz *= Math.exp(-dt * 6); p.wx *= 0.9; p.wy *= 0.9; p.wz *= 0.9; }
      }
      p.rx += p.wx * dt; p.ry += p.wy * dt; p.rz += p.wz * dt;
      const fade = Math.min(1, p.life / 0.7);
      const set = p.glow ? inst.glow : inst.solid;
      const m = set[p.shape], idx = (p.glow ? counts.glow : counts.solid)[p.shape]++;
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.set(p.sx * fade, p.sy * fade, p.sz * fade); dummy.updateMatrix();
      m.setMatrixAt(idx, dummy.matrix);
      m.instanceColor.setXYZ(idx, p.r, p.g, p.b);
    }
    for (const k in inst.solid) {
      for (const set of ["solid", "glow"]) {
        const m = inst[set][k], c = counts[set][k];
        m.count = c; if (c) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
        m.visible = c > 0;
      }
    }
    updatePickups(dt);
  };

  D.reset = function () { for (const p of parts) p.a = false; for (const o of PK.list) { o.a = false; o.sp.visible = false; o.core.visible = false; } };

  /* ---------------- pickups ---------------- */
  PK.spawn = function (x, y, z, type, n) {
    n = n || 1;
    for (let k = 0; k < n; k++) {
      let o = null; for (const q of PK.list) if (!q.a) { o = q; break; }
      if (!o) return;
      o.a = true; o.type = type || "heal"; o.t = 0; o.mag = false;
      o.x = x; o.y = y + 0.5; o.z = z; const a = Math.random() * 6.28;
      o.vx = Math.cos(a) * rnd(1.5, 4); o.vz = Math.sin(a) * rnd(1.5, 4); o.vy = rnd(4, 7);
      const c = o.type === "heal" ? 0x8effc0 : 0x59d8e8;
      o.sp.material.color.setHex(c); o.core.material.color.setHex(o.type === "heal" ? 0xd8ffe8 : 0xd8f8ff);
      o.sp.visible = true; o.core.visible = true; o.sp.material.opacity = 0.9;
    }
  };
  function updatePickups(dt) {
    const P = G.player;
    for (const o of PK.list) {
      if (!o.a) continue;
      o.t += dt;
      const dx = P.x - o.x, dy = P.y + 1 - o.y, dz = P.z - o.z, d = Math.hypot(dx, dy, dz);
      if (o.t > 0.55 && d < 5.5) o.mag = true;
      if (o.mag) {
        const s = Math.min(1, dt * 7); o.vx += (dx / d * 16 - o.vx) * s; o.vy += (dy / d * 16 - o.vy) * s; o.vz += (dz / d * 16 - o.vz) * s;
      } else {
        o.vy -= 14 * dt; const gy = (G.world.heightAt(o.x, o.z)) + 0.4;
        if (o.y < gy) { o.y = gy; o.vy = Math.abs(o.vy) * 0.45; o.vx *= 0.7; o.vz *= 0.7; }
      }
      o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      if (o.t > 14) { o.a = false; o.sp.visible = o.core.visible = false; continue; }
      if (d < 0.9 && o.t > 0.3 && P.alive) {
        o.a = false; o.sp.visible = o.core.visible = false;
        if (o.type === "heal") P.hp = Math.min(P.maxHp, P.hp + 9); else P.mana = Math.min(P.maxMana, P.mana + 14);
        G.vfx.burst({ x: P.x, y: P.y + 1, z: P.z }, { count: 6, color: o.type === "heal" ? 0x8effc0 : 0x59d8e8, speed: 2, size: 0.3, life: 0.4, gravity: 1, spread: 1, tex: "glow" });
        try { G.sfx.play("heal", { vol: 0.35, rate: 1.4 }); } catch (e) { /* audio optional */ }
        continue;
      }
      const pul = 1 + Math.sin(o.t * 8) * 0.15;
      o.sp.position.set(o.x, o.y, o.z); o.sp.scale.setScalar(0.9 * pul);
      o.core.position.set(o.x, o.y, o.z); o.core.scale.setScalar(0.11);
    }
  }
})();
