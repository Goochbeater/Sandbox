/* LEVEL — definitions, loading/teardown, triggers, encounters (waves), doors, checkpoints, objectives. */
const LEVEL = { cur: null, defs: {}, order: [] };
LEVEL.def = function (id, d) { d.id = id; LEVEL.defs[id] = d; LEVEL.order.push(id); return d; };
LEVEL.load = async function (id, o) {
  o = o || {};
  const def = LEVEL.defs[id]; if (!def) throw new Error('no level ' + id);
  MG.state = 'loading';
  // teardown
  if (LEVEL.cur) { const L = LEVEL.cur; if (L.group) { R.scene.remove(L.group); L.group.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); } for (const x of L.extras) if (x.parent) x.parent.remove(x); if (L.dispose) L.dispose(); }
  ENEMY.clear(); BOSS.clear(); COMBAT.reset(); FX.clear(); PHY.clear(); R.clearLevelLights(); HUD.setBoss(null); CAM.cine = null; MG.timers = MG.timers.filter((t) => t.real);
  if (PLAYER.a) { PLAYER.a.dispose(); PLAYER.a = null; }
  R.scene.background = null; R.scene.fog = null;
  await TEX.init(def.tex || [], o.progress ? (p) => o.progress(p * 0.5) : null);
  await CAST.need((def.cast || []).concat([HERO.name(def)]), o.progress ? (p) => o.progress(0.5 + p * 0.45) : null);   // the hero's stage template always rides along
  const L = { def, id, skipIntro: !!MG.skipIntro, triggers: [], waves: [], doors: [], extras: [], killY: def.killY !== undefined ? def.killY : -40, t: 0, cp: o.cp || 0, updates: [], prompt: null, flags: {} };
  LEVEL.cur = L;
  R.resetGrade(); R.setShadowBox(16);   // after LEVEL.cur so per-world character light defaults apply
  KIT.begin();
  await def.build(L);
  L.group = KIT.end(); R.scene.add(L.group);
  FX.reattach();
  const sp = (def.checkpoints && def.checkpoints[L.cp]) || def.start;
  PLAYER.spawn(sp[0], sp[1], sp[2], sp[3] || 0);
  CAM.reset(sp[3] || 0);
  if (L.env) R.setEnvFromScene(L.env);
  HUD.chapter(def.chapter + ' · ' + def.name);
  if (def.onStart) def.onStart(L, L.cp);
  MG.state = 'play';
  return L;
};
LEVEL.add = function (obj) { R.scene.add(obj); LEVEL.cur.extras.push(obj); return obj; };
/* triggers: box on XZ (+ optional y range); fires once unless repeat */
LEVEL.trigger = function (x0, z0, x1, z1, fn, o) { const t = Object.assign({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), fn, done: false, y0: -1e9, y1: 1e9 }, o || {}); LEVEL.cur.triggers.push(t); return t; };
/* a wave: list of [type, x, z, opts]; spawned now (or when triggered); onClear when all dead */
LEVEL.wave = function (list, onClear, o) {
  o = o || {};
  const W = { list, onClear, enemies: [], cleared: false, spawned: false, stagger: o.stagger || 0 };
  W.spawn = () => {
    if (W.spawned) return; W.spawned = true;
    list.forEach((s, i) => {
      const go = () => { const e = ENEMY.spawn(s[0], s[1], s[2], Object.assign({ alert: o.alert !== false, grace: 1.2 + i * 0.25, yaw: Math.atan2((PLAYER.a ? PLAYER.a.x : 0) - s[1], (PLAYER.a ? PLAYER.a.z : 0) - s[2]) }, s[3] || {})); W.enemies.push(e); if (o.fx !== false) LEVEL.spawnFx(e); };
      if (W.stagger) MG.after(i * W.stagger, go); else go();
    });
  };
  LEVEL.cur.waves.push(W);
  if (o.now) W.spawn();
  return W;
};
LEVEL.spawnFx = function (e) { const p = V3(e.x, e.y + 0.05, e.z); FX.ring(p, [1.5, 0.3, 0.2], 1.4, 0.5); FX.puff(p.clone().add(V3(0, 0.8, 0)), 4, { size: 0.5, col: [0.2, 0.2, 0.22], a: 0.35, spread: 0.8, life: 1 }); };
/* a door: a collider + mesh that slides up when opened */
LEVEL.door = function (x0, y0, z0, x1, y1, z1, mat, o) {
  o = o || {};
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true;
  if (mat.map) { g.attributes.uv.array.forEach((v, i, a) => { a[i] = v * Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)) / (mat.userData.tscale || 3); }); }
  LEVEL.add(m);
  const c = PHY.box(x0, y0, z0, x1, y1, z1);
  const D = { m, c, open: false, t: 0, h: Math.abs(y1 - y0), y: m.position.y, lamp: o.lamp };
  D.openIt = () => { if (D.open) return; D.open = true; c.off = true; FX.addShake(0.15); FX.puff(V3(m.position.x, y0 + 0.2, m.position.z), 8, { size: 0.5, col: [0.4, 0.4, 0.42], a: 0.3, spread: 2, life: 1.5 }); };
  D.close = () => { D.open = false; c.off = false; };
  LEVEL.cur.doors.push(D); return D;
};
LEVEL.update = function (dt) {
  const L = LEVEL.cur; if (!L) return; L.t += dt;
  const P = PLAYER.a;
  if (P) for (const t of L.triggers) {
    if (t.done && !t.repeat) continue;
    const inside = P.x >= t.x0 && P.x <= t.x1 && P.z >= t.z0 && P.z <= t.z1 && P.y >= t.y0 && P.y <= t.y1;
    if (inside && !t.inside) { t.inside = true; t.done = true; t.fn(); } else if (!inside) t.inside = false;
  }
  for (const W of L.waves) {
    if (!W.spawned || W.cleared) continue;
    if (W.enemies.length === W.list.length && W.enemies.every((e) => !e.alive)) { W.cleared = true; if (W.onClear) MG.after(0.8, W.onClear); }
    // watchdog: a straggler that ends up somewhere unreachable (knocked onto a ledge, wedged in scenery) for 20 s comes back
    if (P && P.alive && !W.cleared) for (const e of W.enemies) {
      if (!e.alive || e.hidden || e.isBoss) continue;
      const far = Math.abs(e.y - P.y) > 2.6 || Math.hypot(e.x - P.x, e.z - P.z) > 28;
      e.strandT = far && PLAYER.state !== 'cine' ? (e.strandT || 0) + dt : 0;
      if (e.strandT > 20) {
        e.strandT = 0; const a = Math.random() * TAU; const sp = ENEMY.findSpot(P.x + Math.sin(a) * 9, P.z + Math.cos(a) * 9, P.y);
        if (sp) { e.x = sp[0]; e.y = sp[1]; e.z = sp[2]; e.vx = e.vz = e.vy = 0; if (e.alert) e.alert(); }
      }
    }
  }
  for (const D of L.doors) { const k = D.open ? 1 : 0; D.t = damp(D.t, k, 2.5, dt); D.m.position.y = D.y + D.t * (D.h + 0.05); }
  for (const u of L.updates) u(dt, L.t);
  if (L.def.update) L.def.update(L, dt);
};
LEVEL.checkpoint = function (i) { const L = LEVEL.cur; if (i > L.cp) { L.cp = i; GAME.saveCP(); HUD.pop('CHECKPOINT'); } };

/* establishing shot at a level's first start: a crane / dolly through the set that settles behind Maul (skippable) */
LEVEL.establish = function (L, cp, sh) {
  if (cp > 0 || L.skipIntro || MG.test || !PLAYER.a) return;
  const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false);
  CAM.play({ dur: sh.dur || 5, fov: sh.fov || 44, p0: sh.p0, p1: sh.p1, l0: sh.l0, l1: sh.l1,
    onEnd: () => { if (PLAYER.state === 'cine') { PLAYER.state = 'move'; HUD.show(true); } CAM.reset(P.yaw); } });
};
