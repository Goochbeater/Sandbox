/* PLAYER — Darth Maul. Camera-relative movement, five-hit combo, heavy whirlwind, dash lunge, air plunge, double-jump
   flip, dodge, block / deflect / perfect reflect, Force push, Force grip, saber throw, Dark Side rage, executions. */
const PLAYER = {
  a: null, saber: null, state: 'move', lock: null, fp: 100, fpMax: 100, rage: 0, rageOn: false, rageT: 0, prevSegs: [],
  blockT: 0, blockPress: -9, lastSafe: new THREE.Vector3(), throwS: null, gripT: null, execT: null, comboQ: null, jumps: 0, regenT: 0,
  skills: { push: true, grip: true, throw: true, rage: true, heavy: true },
};
PLAYER.spawn = function (x, y, z, yaw) {
  if (PLAYER.a) PLAYER.a.dispose();
  const def = LEVEL.cur && LEVEL.cur.def, stage = HERO.stageFor(def); HERO.stage = stage; HERO.baseHp = stage === 1 ? 70 : stage === 3 ? 100 : 120; HERO.baseFp = stage === 1 ? 60 : 100;
  const a = new Actor(CHAR.T[HERO.NAMES[stage]], { x, y, z, yaw, hp: HERO.baseHp, team: 'hero', moves: stage === 1 ? HERO.buildFists() : MOV.maul, r: 0.33, h: 1.8 });   // MOV.maul = the one-handed sword-mocap set; stage I fights bare-handed
  a.isPlayer = true; PLAYER.a = a;
  const S = HERO.makeSaber(stage); S.addTo(R.scene); a.saber = S; PLAYER.saber = S; a.setProp(S.fists ? null : S, false);
  S.ignite(undefined, true); S.ign = S.ends.map(() => 1);
  PLAYER.skills = HERO.skills(def, stage);
  a.onLand = (airT) => PLAYER.onLand(airT);
  a.react = (info) => PLAYER.react(info);
  a.die = (info) => PLAYER.die(info);
  a.onDamage = (amt, info) => PLAYER.onDamage(amt, info);
  a.onActEnd = (n) => PLAYER.onActEnd(n);
  PLAYER.state = 'move'; PLAYER.fp = PLAYER.fpMax; PLAYER.lock = null; PLAYER.throwS = null; PLAYER.gripT = null; PLAYER.execT = null; PLAYER.rageOn = false; PLAYER.rageT = 0;
  PLAYER.lastSafe.set(x, y, z);
  COMBAT.actors.push(a);
  HOLOCRON.apply(); a.hp = a.hpMax; PLAYER.fp = PLAYER.fpMax;
  a.physics(0); a.animate(0.016); a.pose3D(0.016);
  return a;
};
PLAYER.inputDir = function (out) {
  const f = _v1.set(Math.sin(CAM.yaw), 0, Math.cos(CAM.yaw)), r = _v2.set(-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw));
  return out.set(0, 0, 0).addScaledVector(f, -IN.A.my).addScaledVector(r, IN.A.mx);
};
PLAYER._d = new THREE.Vector3();
PLAYER.canAct = () => ['move', 'block'].includes(PLAYER.state) || (PLAYER.state === 'attack' && PLAYER.cancelOK());
PLAYER.cancelOK = () => { const a = PLAYER.a, c = a.actClip; return !c || a.actT >= (c.cancel !== undefined ? c.cancel : c.dur * 0.8); };
/* who an attack goes for: the hard lock; else with a direction held, the best foe in that direction; else the foe
   already being fought, else the nearest one in reach in ANY direction (never swing at air with a foe beside you) */
PLAYER.chooseTarget = function (range) {
  const a = PLAYER.a;
  if (PLAYER.lock && PLAYER.lock.alive && a.dist(PLAYER.lock) < 7.5) return PLAYER.lock;
  const d = PLAYER.inputDir(PLAYER._ct || (PLAYER._ct = new THREE.Vector3()));
  if (d.lengthSq() > 0.04) { d.normalize(); const t = PLAYER.pickTarget(d, range, 1.05); if (t) return t; }
  const F = PLAYER.focus; if (F && F.alive && !F.hidden && a.dist(F) < range && MG.t - (PLAYER.focusT || -9) < 5) return F;
  const fw = a.forward(PLAYER._cf || (PLAYER._cf = new THREE.Vector3()));
  let best = null, bs = 1e9;
  for (const e of COMBAT.foes()) { const dx = e.x - a.x, dz = e.z - a.z, dist = Math.hypot(dx, dz); if (dist > range || Math.abs(e.y - a.y) > 2.5) continue;
    const ang = Math.abs(wrapA(Math.atan2(dx, dz) - Math.atan2(fw.x, fw.z))); const sc = dist + ang * 0.9; if (sc < bs) { bs = sc; best = e; } }
  return best;
};
/* soft-lock: best foe near the aim direction */
PLAYER.pickTarget = function (dir, range, cone) {
  const a = PLAYER.a; let best = null, bs = 1e9;
  for (const e of COMBAT.foes()) {
    const dx = e.x - a.x, dz = e.z - a.z, d = Math.hypot(dx, dz); if (d > range || Math.abs(e.y - a.y) > 3) continue;
    const ang = Math.abs(wrapA(Math.atan2(dx, dz) - Math.atan2(dir.x, dir.z)));
    if (ang > cone) continue;
    const s = d + ang * 3; if (s < bs) { bs = s; best = e; }
  }
  return best;
};
PLAYER.aimDir = function (out) {
  const d = PLAYER.inputDir(out); if (d.lengthSq() < 0.01) { if (PLAYER.lock && PLAYER.lock.alive) d.set(PLAYER.lock.x - PLAYER.a.x, 0, PLAYER.lock.z - PLAYER.a.z); else PLAYER.a.forward(d); }
  return d.normalize();
};
/* start an attack clip, turning toward a soft target and fitting the lunge distance */
PLAYER.attack = function (name) {
  const a = PLAYER.a, dir = PLAYER.aimDir(PLAYER._d);
  let t = PLAYER.chooseTarget(name === 'lunge' ? 9 : 6.2);
  if (!t && name === 'a1') { const far = PLAYER.chooseTarget(9); if (far && a.dist(far) > 3.4) { t = far; name = 'lunge'; } }
  else if (t && name === 'a1' && a.dist(t) > 3.4) name = 'lunge';   // a foe out of reach: leap in with the dash thrust
  if (name === 'lunge') R.kick(0.3);
  PLAYER.yawT = t ? a.angTo(t) : Math.atan2(dir.x, dir.z); if (Math.abs(wrapA(PLAYER.yawT - a.yaw)) < 0.5) a.yaw = PLAYER.yawT;   // small corrections snap; big turns whip round over a few frames
  const c = a.play(name, { speed: PLAYER.rageOn ? 1.22 : 1, fade: name === 'lunge' ? 0.16 : a.act ? 0.09 : 0.12 });   // blend in: from idle a little longer (the mocap arms travel far), chained hits quicker
  PLAYER.state = 'attack'; PLAYER.comboQ = null; PLAYER.atkTarget = t;
  // root motion budget: stop ~1.1 m short of the target
  const mv = c.move ? c.move[c.move.length - 1][1] : 0;
  PLAYER.moveBudget = t ? clamp(a.dist(t) - 1.15, 0, Math.max(mv, name === 'lunge' ? 7.8 : 3.4)) : mv;   // attacks close the gap to the foe (magnetism)
  if (t) { PLAYER.focus = t; PLAYER.focusT = MG.t; }
  PLAYER.movePrev = 0;
  COMBAT.snapBlades(PLAYER.saber, PLAYER.prevSegs);
};
PLAYER.rootMove = function (c, t) {   // cumulative forward distance at time t from the clip's move track
  if (!c.move) return 0; const m = c.move; if (t <= m[0][0]) return 0;
  for (let i = 1; i < m.length; i++) if (t <= m[i][0]) { const u = (t - m[i - 1][0]) / (m[i][0] - m[i - 1][0]); return lerp(m[i - 1][1], m[i][1], easeOut(u)); }
  return m[m.length - 1][1];
};
PLAYER.update = function (dt) {
  const a = PLAYER.a; if (!a) return; if (PLAYER.saber) PLAYER.saber.lightK = 1;
  const st = PLAYER.state;
  a.iframe = Math.max(0, a.iframe - dt); a.flash = Math.max(0, a.flash - dt);
  // resources
  PLAYER.fp = Math.min(PLAYER.fpMax, PLAYER.fp + dt * (PLAYER.rageOn ? 14 : 7));
  if (PLAYER.rageOn) { PLAYER.rageT -= dt; PLAYER.rage = Math.max(0, PLAYER.rageT * 10); if (PLAYER.rageT <= 0) { PLAYER.rageOn = false; HUD.toast('', ''); } }
  PLAYER.regenT += dt; if (PLAYER.regenT > 6 && a.alive && a.hp < a.hpMax) a.hp = Math.min(a.hpMax, a.hp + dt * 4);
  if (!a.alive) { a.speed = damp(a.speed, 0, 8, dt); a.vx = 0; a.vz = 0; a.physics(dt); a.animate(dt); a.pose3D(dt); PLAYER.saber.update(dt, MG.t); PLAYER.saber.sampleTrails(MG.t, 0); return; }
  if (IN.hit('lock')) PLAYER.toggleLock();
  if (PLAYER.lock && (!PLAYER.lock.alive || a.dist(PLAYER.lock) > 25)) PLAYER.lock = null;
  if (IN.hit('rage') && PLAYER.rage >= 100 && !PLAYER.rageOn && PLAYER.skills.rage) PLAYER.startRage();
  // ---- intent
  const dir = PLAYER.inputDir(PLAYER._d); const mag = Math.min(1, dir.length()); if (mag > 0.01) dir.normalize();
  const want = st === 'move' || st === 'block' || st === 'air' || st === 'throw' || st === 'grip';
  let spd = 0;
  if (want) spd = mag * (st === 'block' ? 2.3 : st === 'throw' ? 3.5 : st === 'grip' ? 0 : (PLAYER.lock && PLAYER.lock.alive && PLAYER.a.dist(PLAYER.lock) < 18 ? 4.1 : 6.4));   // lock-on: a measured duelling step
  const accel = a.grounded ? 30 : 9;
  const tvx = dir.x * spd, tvz = dir.z * spd;
  if (st === 'move' || st === 'block' || st === 'air' || st === 'throw' || st === 'grip') { a.vx = damp(a.vx, tvx, accel * 0.35, dt); a.vz = damp(a.vz, tvz, accel * 0.35, dt); }
  a.speed = Math.hypot(a.vx, a.vz);
  // facing
  if (st === 'move' || st === 'air' || st === 'throw') {
    if (PLAYER.lock && PLAYER.lock.alive && a.dist(PLAYER.lock) < 18) a.yaw = dampA(a.yaw, a.angTo(PLAYER.lock), 12, dt);
    else if (mag > 0.1) a.yaw = dampA(a.yaw, Math.atan2(dir.x, dir.z), 12, dt);
  } else if (st === 'block') { const t = PLAYER.lock && PLAYER.lock.alive ? PLAYER.lock : PLAYER.pickTarget(a.forward(_v3), 10, 1.4); if (t) a.yaw = dampA(a.yaw, a.angTo(t), 10, dt); }
  // local move direction for the stride (relative to facing)
  const cy = Math.cos(a.yaw), sy = Math.sin(a.yaw);
  if (a.speed > 0.1) { a.mvx = (a.vx * cy - a.vz * sy) / a.speed; a.mvz = (a.vx * sy + a.vz * cy) / a.speed; }
  // ---- state machine
  const S = PLAYER.states[st]; if (S) S(dt, dir, mag);
  // root motion for attacks
  if (PLAYER.state === 'attack' || PLAYER.state === 'exec') {
    const c = a.actClip;
    if (c) { const m = PLAYER.rootMove(c, a.actT) * (c.move ? PLAYER.moveBudget / Math.max(0.01, c.move[c.move.length - 1][1]) : 0); const dm = m - PLAYER.movePrev; PLAYER.movePrev = m;
      a.vx = 0; a.vz = 0; if (dm > 0) PLAYER.a.moveH(Math.sin(a.yaw) * dm, Math.cos(a.yaw) * dm); }
  }
  if (PLAYER.state !== 'ride') a.physics(dt);
  // safe ground + falls
  if (a.grounded && a.floorC && !a.floorC.hazard) { PLAYER.safeT = (PLAYER.safeT || 0) + dt; if (PLAYER.safeT > 0.25) PLAYER.lastSafe.set(a.x, a.y, a.z); } else PLAYER.safeT = 0;
  if (LEVEL.cur && a.y < LEVEL.cur.killY) PLAYER.fell();
  // animation base
  if (PLAYER.state === 'move') a.setBase(a.speed > 3.2 && !PLAYER.lock ? 'run' : 'guard', 0.22);
  if (PLAYER.state !== 'ride' && MG.zoomOut) MG.zoomOut = damp(MG.zoomOut, 0, 3, dt);
  else if (PLAYER.state === 'block') a.setBase('guard');
  a.animate(dt);
  // blade hits during attack windows
  PLAYER.hitWindows(dt);
  a.pose3D(dt);
  // saber after throw logic
  if (PLAYER.throwS) PLAYER.throwUpdate(dt);
  PLAYER.saber.update(dt, MG.t);
  const trail = (PLAYER.state === 'attack' || PLAYER.state === 'exec' || PLAYER.throwS || (PLAYER.state === 'air' && a.act === 'flip') || a.act === 'dodge' || a.act === 'deflectL' || a.act === 'deflectR') ? 1 : 0;
  PLAYER.saber.sampleTrails(MG.t, trail);
  PLAYER.pullHands();
};
PLAYER.pullHands = function () {};
/* ---------------------------------------------------------------- states */
PLAYER.states = {
  move(dt, dir, mag) {
    const a = PLAYER.a;
    if (!a.grounded) { PLAYER.state = 'air'; a.play('jump', { fade: 0.15 }); return; }
    // idle flourish out of combat
    const calm = a.speed < 0.2 && mag < 0.05 && !PLAYER.lock && !COMBAT.foes().some((e) => e.dist(a) < 16) && !BOSS.list.some((b) => b.alive && !b.hidden && b.dist(a) < 16);
    PLAYER.idleT = calm && !a.act ? (PLAYER.idleT || 0) + dt : 0;
    if (PLAYER.idleT > 6.5) { PLAYER.idleT = -4; if (!HERO.sheathed && !(PLAYER.saber && PLAYER.saber.fists)) a.play('flourish', { fade: 0.2 }); }
    if (a.act === 'flourish' && (mag > 0.05 || IN.peek('attack', 0.05) || IN.peek('jump', 0.05))) a.stop(0.12);
    PLAYER.jumps = 0;
    if (IN.take('jump')) { PLAYER.jump(); return; }
    if (IN.take('dodge')) { PLAYER.dodge(dir, mag); return; }
    if (IN.take('attack')) { if (a.speed > 5.8 && PLAYER.sprintT > 0.35) PLAYER.attack('lunge'); else if (PLAYER.execTarget() && PLAYER.execTarget().stunned && PLAYER.tryExec()) return; else PLAYER.attack('a1'); return; }
    if (IN.take('heavy') && PLAYER.skills.heavy) { PLAYER.attack('heavy'); return; }
    if (IN.hit('grip') && PLAYER.tryExec()) return;
    if (LEVEL.cur && LEVEL.cur.prompt && LEVEL.cur.prompt.fn && IN.peek('grip')) { IN.take('grip'); LEVEL.cur.prompt.fn(); return; }
    if (IN.take('push') && PLAYER.skills.push) { PLAYER.push(); return; }
    if (IN.take('grip') && PLAYER.skills.grip) { PLAYER.grip(); return; }
    if (IN.take('throw') && PLAYER.skills.throw && !PLAYER.throwS) { PLAYER.throwSaber(); return; }
    if (IN.down('block')) { PLAYER.state = 'block'; PLAYER.blockPress = MG.t; a.play('block', { fade: 0.08 }); a.actClip = MOV.maul.block; a.actSpeed = 0; return; }
    PLAYER.sprintT = a.speed > 5.5 ? (PLAYER.sprintT || 0) + dt : 0;
  },
  block(dt) {
    const a = PLAYER.a;
    if (!IN.down('block')) { a.stop(0.12); PLAYER.state = 'move'; return; }
    if (!a.grounded) { a.stop(); PLAYER.state = 'air'; return; }
    if (!a.act || (a.act === 'blockDyn' && a.actT >= a.actClip.dur - 0.01)) { a.play('block', { fade: 0.12 }); a.actSpeed = 0; }
    // anticipation: a Jedi strike on its way in → the staff tracks the incoming blade
    for (const j of BOSS.list) { if (!j.alive || j.hidden || !j.actClip || !j.actClip.ev || a.dist(j) > 3.4) continue;
      const t = j.actT; if (j.actClip.ev.some((e) => t > e[0] - 0.16 && t < e[1] + 0.02) && MG.t - (PLAYER._btr || 0) > 0.05) { PLAYER._btr = MG.t; PLAYER.blockAt(j, true); break; } }
    if (IN.take('attack')) { a.stop(0.05); PLAYER.attack('a1'); }
    else if (IN.take('dodge')) { a.stop(0.05); PLAYER.dodge(PLAYER.inputDir(PLAYER._d), 1); }
  },
  attack(dt) {
    const a = PLAYER.a, c = a.actClip;
    if (PLAYER.yawT !== undefined) { a.yaw = dampA(a.yaw, PLAYER.yawT, 26, dt); if (Math.abs(wrapA(PLAYER.yawT - a.yaw)) < 0.02) PLAYER.yawT = undefined; }
    if (a.actT > 0.1 && IN.take('dodge')) { PLAYER.dodge(PLAYER.inputDir(PLAYER._d), 1); return; }   // dodge always cancels an attack after its first 0.1 s
    if (IN.peek('attack', 0.5) && c && c.next) PLAYER.comboQ = c.next;
    if (IN.peek('heavy', 0.5) && PLAYER.skills.heavy && a.act !== 'heavy') PLAYER.comboQ = 'heavy';
    if (PLAYER.cancelOK()) {
      if (PLAYER.comboQ) { const n = PLAYER.comboQ; IN.take('attack'); IN.take('heavy'); PLAYER.attack(n); return; }
      if (IN.take('dodge')) { PLAYER.dodge(PLAYER.inputDir(PLAYER._d), 1); return; }
      if (IN.take('jump')) { a.stop(0.08); PLAYER.jump(); return; }
      if (IN.take('push') && PLAYER.skills.push) { PLAYER.push(); return; }
    }
    if (c && c.impact !== undefined && a.actT >= c.impact && !PLAYER.impactDone) { PLAYER.impactDone = true; PLAYER.slamImpact(); }
    if (c && c.impact !== undefined && a.actT < c.impact) PLAYER.impactDone = false;
  },
  air(dt) {
    const a = PLAYER.a;
    if (IN.take('jump') && PLAYER.jumps < 2) { PLAYER.jumps = 2; a.vy = 9.2; a.play('flip', { fade: 0.05 }); FX.puff(V3(a.x, a.y, a.z), 6, { size: 0.3, col: [0.5, 0.45, 0.4], a: 0.3, spread: 1.4 }); }
    if (IN.take('attack') || IN.take('heavy')) { a.vy = Math.min(a.vy, -14); a.play('plunge', { fade: 0.05 }); PLAYER.plunging = true; COMBAT.snapBlades(PLAYER.saber, PLAYER.prevSegs); }
    if (IN.take('push') && PLAYER.skills.push) PLAYER.push(true);
    if (!a.act && a.airT > 0.05) a.play('jump', { fade: 0.2 });
  },
  dodge(dt) {
    const a = PLAYER.a;
    if (!a.act) { PLAYER.state = a.grounded ? 'move' : 'air'; return; }
    const u = a.actU(); const sp = u < 0.75 ? 11 * (1 - u) : 0;
    a.vx = PLAYER.dodgeDir.x * sp; a.vz = PLAYER.dodgeDir.z * sp;
    if (u > 0.5 && IN.take('attack')) PLAYER.attack('lunge');
  },
  force(dt) { const a = PLAYER.a; a.vx *= 0.8; a.vz *= 0.8; if (!a.act) PLAYER.state = 'move'; },
  grip(dt) { PLAYER.gripUpdate(dt); },
  throw(dt) {
    const a = PLAYER.a;
    if (IN.take('attack')) { if (!a.act || a.act === 'throwWait') a.play('kick', { fade: 0.06 }); }
    if (IN.take('jump') && a.grounded) { a.vy = 7.2; }
    if (!a.act && PLAYER.throwS) a.play('throwWait', { fade: 0.1 });
  },
  hit(dt) { const a = PLAYER.a; a.vx *= 0.85; a.vz *= 0.85; if (!a.act) PLAYER.state = 'move'; },
  knock(dt) { const a = PLAYER.a; if (a.grounded) { a.vx *= 0.9; a.vz *= 0.9; } if (!a.act) PLAYER.state = 'move'; },
  exec(dt) { PLAYER.execUpdate(dt); },
  cine(dt) { const a = PLAYER.a; a.vx = 0; a.vz = 0; },
};
PLAYER.onActEnd = function (n) {
  const st = PLAYER.state;
  if (st === 'attack') { PLAYER.state = PLAYER.a.grounded ? 'move' : 'air'; PLAYER.comboQ = null; }
  if (st === 'air' && n === 'plunge') PLAYER.a.play('plunge', { t: 0.4 });
};
PLAYER.jump = function () { const a = PLAYER.a; a.vy = 8.4; a.grounded = false; PLAYER.jumps = 1; PLAYER.state = 'air'; a.play('jump', { fade: 0.08 }); };
PLAYER.onLand = function (airT) {
  const a = PLAYER.a;
  if (PLAYER.plunging) { PLAYER.plunging = false; a.play('land', { fade: 0.02 }); PLAYER.state = 'attack'; PLAYER.slamImpact(1.4); return; }
  if (PLAYER.state === 'air') { PLAYER.state = 'move'; if (airT > 0.5) { a.play('land', { fade: 0.05, speed: 1.6 }); PLAYER.state = 'attack'; FX.puff(V3(a.x, a.y + 0.05, a.z), 6, { size: 0.35, col: [0.45, 0.42, 0.4], a: 0.25, spread: 1.6 }); } else a.stop(0.1); }
};
PLAYER.dodge = function (dir, mag) {
  const a = PLAYER.a;
  const back = PLAYER.lock && mag > 0.1 && dir.dot(_v3.set(Math.sin(a.yaw), 0, Math.cos(a.yaw))) < -0.5;
  PLAYER.dodgeDir = PLAYER.dodgeDir || new THREE.Vector3();
  if (mag < 0.1) a.forward(PLAYER.dodgeDir).negate(); else PLAYER.dodgeDir.copy(dir).normalize();
  if (!PLAYER.lock && mag > 0.1) a.yaw = Math.atan2(dir.x, dir.z);
  a.play(back ? 'backflip' : 'dodge', { fade: 0.05 }); a.iframe = 0.34; PLAYER.state = 'dodge'; R.kick(0.35);
};
PLAYER.toggleLock = function () {
  if (PLAYER.lock) { PLAYER.lock = null; return; }
  const a = PLAYER.a; const f = _v3.set(Math.sin(CAM.yaw), 0, Math.cos(CAM.yaw));
  PLAYER.lock = PLAYER.pickTarget(f, 22, 1.2) || PLAYER.pickTarget(f, 22, PI);
};
/* ---------------------------------------------------------------- hit windows */
PLAYER.hitWindows = function (dt) {
  const a = PLAYER.a, c = a.actClip;
  const active = [];
  if (c && c.ev && (PLAYER.state === 'attack' || PLAYER.state === 'exec' || PLAYER.state === 'air')) for (const e of c.ev) if (a.actT >= e[0] && a.actT <= e[1] + dt) active.push(e);
  if (active.length && !PLAYER.throwS) {
    for (const e of active) {
      const mask = e[2] || 3, dmg = e[3] * (PLAYER.rageOn ? 1.6 : 1), kind = e[4];
      COMBAT.sweep(a, PLAYER.saber, mask, PLAYER.prevSegs, (t, p) => {
        const key = t; const last = a.actHit.has(key) ? PLAYER.lastHitT.get(t) || 0 : -9;
        const multi = kind === 'twirl' || kind === 'whirl' || kind === 'spin';
        if (a.actHit.has(key) && (!multi || MG.t - last < 0.14)) return;
        a.actHit.add(key); PLAYER.lastHitT.set(t, MG.t);
        PLAYER.landHit(t, p, dmg, kind);
      }, kind === 'whirl' ? 3.2 : 3.8);
    }
  }
  COMBAT.snapBlades(PLAYER.saber, PLAYER.prevSegs);
};
PLAYER.lastHitT = new Map();
PLAYER.landHit = function (t, p, dmg, kind) {
  const a = PLAYER.a;
  const dir = _v3.set(t.x - a.x, 0, t.z - a.z).normalize();
  // Jedi and guards can block
  if (t.tryBlock && t.tryBlock(a, dmg, kind, p)) { PLAYER.clash(t, p); return; }
  COMBAT.damage(t, dmg, { src: a, kind, dir: dir.clone(), p: p.clone(), heavy: kind === 'slam' || kind === 'sweep' || kind === 'thrust' });
  if (!t.isDroid && !t.holo) FX.burn(t, p, V3(-dir.z, rnd(-0.7, 0.7), dir.x));
  if (a.hp < a.hpMax && PLAYER.rageOn) a.hp = Math.min(a.hpMax, a.hp + 1.5);
  const col = t.isDroid ? [4, 2.4, 1.0] : [4, 1.2, 0.5];
  FX.spark(p, dir.clone().negate().add(V3(0, 0.6, 0)), t.isDroid ? 26 : 20, 7.5, col);
  FX.impact(p, [3.2, 1.3, 0.6], kind === 'slam' || kind === 'thrust' ? 1.4 : 0.95); if (!t.holo && (kind === 'slam' || kind === 'thrust' || kind === 'sweep' || kind === 'plunge' || !t.alive)) FX.flashActor(t, 0.05);
  FX.puff(p, 3, { add: true, size: 0.25, col: [1.0, 0.25, 0.1], a: 0.9, life: 0.25, spread: 0.3 });
  FX.flashLight(p, [1, 0.3, 0.1], 5, 5, 0.12);
  FX.addShake(kind === 'slam' ? 0.5 : 0.22);
  MG.hitStop = Math.max(MG.hitStop, kind === 'slam' || kind === 'thrust' ? 0.11 : 0.06);
  if (kind === 'slam' || kind === 'sweep' || kind === 'thrust') CAM.fov -= 2.5;
};
PLAYER.clash = function (t, p) {
  FX.impact(p, [2.6, 2.6, 3.4], 1.5);
  FX.spark(p, V3(0, 1, 0), 26, 7, [4, 3, 2]); FX.flashLight(p, [1, 0.9, 0.7], 8, 6, 0.1); FX.addShake(0.25); MG.hitStop = Math.max(MG.hitStop, 0.07);
};
PLAYER.slamImpact = function (mul) {
  const a = PLAYER.a, f = a.forward(_v3), p = V3(a.x + f.x * 1.1, a.y + 0.05, a.z + f.z * 1.1);
  FX.ring(p, [3, 0.5, 0.2], 3.6 * (mul || 1), 0.4); FX.spark(p, V3(0, 1, 0), 30, 7, [4, 1.6, 0.6]); R.shock(p, 1.3);
  FX.puff(p, 10, { size: 0.4, col: [0.35, 0.3, 0.28], a: 0.4, spread: 2.5, life: 1.4 }); FX.flashLight(p, [1, 0.3, 0.1], 10, 8, 0.2); FX.addShake(0.55); FX.scorch(p, V3(0, 1, 0), 1.2);
  for (const e of COMBAT.foes()) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < 2.8 * (mul || 1) && Math.abs(e.y - a.y) < 1.5) { COMBAT.damage(e, 16 * (PLAYER.rageOn ? 1.6 : 1), { src: a, kind: 'slam', dir: V3(e.x - p.x, 0, e.z - p.z).normalize(), knock: true, heavy: true }); } }
};
/* ---------------------------------------------------------------- defence */
PLAYER.canDeflect = function (b) {
  const a = PLAYER.a; if (!a.alive || PLAYER.throwS) return false;
  const st = PLAYER.state;
  if (!(st === 'block' || st === 'attack' || st === 'dodge' || st === 'move')) return false;
  if (st === 'move') { if (b._auto === undefined) b._auto = RNG() < (MG.difficulty === 'easy' ? 0.75 : MG.difficulty === 'hard' ? 0.35 : 0.55) && PLAYER.a.speed < 4; if (!b._auto) return false; }
  const toBolt = _v3.set(b.p.x - a.x, 0, b.p.z - a.z).normalize();
  const f = _v4.set(Math.sin(a.yaw), 0, Math.cos(a.yaw));
  return toBolt.dot(f) > (st === 'block' ? -0.2 : 0.25);
};
PLAYER.deflect = function (b) {
  const a = PLAYER.a;
  const perfect = PLAYER.state === 'block' && MG.t - PLAYER.blockPress < 0.35;
  const shooter = b.shooter;
  let dir;
  if ((perfect || PLAYER.rageOn || MG.difficulty === 'easy') && shooter && shooter.alive) dir = shooter.chest(_v4).sub(b.p).normalize();
  else if (PLAYER.lock && PLAYER.lock.alive && RNG() < 0.6) dir = PLAYER.lock.chest(_v4).sub(b.p).normalize();
  else { dir = b.v.clone().normalize().negate(); dir.x += rnd(-0.5, 0.5); dir.y += rnd(0.1, 0.5); dir.z += rnd(-0.5, 0.5); dir.normalize(); }
  b.v.copy(dir).multiplyScalar(b.v.length() * 1.1); b.team = 'hero'; b.shooter = a; b.dmg = 20; b.t = 0; b.deflected = true;
  b.p.addScaledVector(dir, 0.3);
  FX.spark(b.p, dir, 18, 6, [4, 1.5, 0.6]); FX.flashLight(b.p, [1, 0.4, 0.2], 5, 5, 0.09); FX.impact(b.p, perfect ? [3.4, 2.4, 1.6] : [3.2, 1.2, 0.5], perfect ? 1.4 : 0.9);
  COMBAT.deflects++; COMBAT.stylePoint(perfect ? 2 : 1);
  if (PLAYER.state === 'block' || (PLAYER.state === 'move' && !a.act)) { a.play(RNG() < 0.5 ? 'deflectL' : 'deflectR', { fade: 0.03 }); }
  if (perfect) HUD.pop('PERFECT DEFLECT');
};
PLAYER.onDamage = function (amt, info) {
  const a = PLAYER.a;
  if (PLAYER.state === 'exec' || PLAYER.state === 'cine') return false;
  if (MG.god) return false;
  if (PLAYER.state === 'block' && info.kind !== 'bolt' && info.src) {
    const d = _v3.set(info.src.x - a.x, 0, info.src.z - a.z).normalize();
    if (d.dot(a.forward(_v4)) > -0.1) {
      const parry = MG.t - PLAYER.blockPress < 0.3;
      if (parry && info.src.onParried) { info.src.onParried(a); FX.spark(a.chest(_v5).addScaledVector(d, 0.5), d, 30, 7, [4, 3, 2]); HUD.pop('PARRY'); COMBAT.stylePoint(3); MG.hitStop = 0.12; return false; }
      PLAYER._blockedT = MG.t;
      const cp = PLAYER.blockAt(info.src) || a.chest(_v5).addScaledVector(d, 0.5);
      FX.spark(cp, d, 16, 5, [4, 3, 2]); FX.impact(cp, [3, 2.4, 1.8], 1.2); FX.addShake(0.15); MG.hitStop = Math.max(MG.hitStop, 0.06);
      return amt * 0.15;
    }
  }
  PLAYER.regenT = 0;
  const diff = MG.difficulty === 'easy' ? 0.55 : MG.difficulty === 'hard' ? 1.35 : 0.85;
  return amt * diff * (PLAYER.rageOn ? 0.5 : 1);
};
/* procedural block for Maul: the staff meets the incoming blade at the point it would cross his guard, then recoils.
   Returns the contact point (world) or null. */
PLAYER.blockAt = function (src, track) {
  const a = PLAYER.a, I = a.inst; if (!src || !src.saber || !I || !I.inner) return null;
  const chest = a.chest(V3()), S = src.saber, b = V3(), t = V3(), dm = V3(); let bd = 1e9; const cp = V3();
  for (let i = 0; i < S.ends.length; i++) { if (S.ign[i] < 0.5) continue; S.bladeSeg(i, b, t); const d = COMBAT.segSeg(b, t, chest, chest); if (d < bd) { bd = d; dm.subVectors(t, b).normalize(); cp.copy(COMBAT._hp); } }
  if (bd > 1.6) return null;
  cp.lerp(chest, 0.35);                                                    // meet it in front of the body
  I.inner.updateMatrixWorld(true);
  const inv = Jedi._m.copy(I.inner.matrixWorld).invert(), pc = cp.clone().applyMatrix4(inv); dm.transformDirection(inv);
  const fwd = V3(0, 0, 1); let ax = V3().crossVectors(dm, fwd); if (ax.lengthSq() < 0.05) ax.set(1, 0.25, 0); ax.normalize();
  if (ax.y < -0.1 || (Math.abs(ax.y) < 0.35 && ax.x < 0)) ax.negate(); ax.addScaledVector(fwd, 0.15).normalize();
  const hp = pc.clone().addScaledVector(ax, -0.5), c0 = V3(0, 1.28, 0.1), off = hp.clone().sub(c0);
  if (off.length() > 0.45) hp.copy(c0).addScaledVector(off.normalize(), 0.45);
  hp.z = Math.max(hp.z, 0.25); hp.y = clamp(hp.y, 0.9, 1.7);
  const tw = clamp(-hp.x * 1.2, -0.5, 0.5), back = hp.clone().add(V3(0, -0.03, -0.09)), ar = [ax.x, ax.y, ax.z];
  const clip = track ? { dur: 0.3, keys: [K(0, [hp.x, hp.y, hp.z], ar, { g: 'both', st: 'guard', cr: 0.15, tw }), K(0.3, [hp.x, hp.y, hp.z], ar, { cr: 0.15, tw })] }
    : { dur: 0.34, keys: [K(0, [hp.x, hp.y, hp.z], ar, { g: 'both', st: 'guard', cr: 0.15, tw }), K(0.07, [back.x, back.y, back.z], ar, { cr: 0.2, tw: tw * 1.1, pi: -0.1, ease: 'out' }), K(0.34, [hp.x, hp.y, hp.z], ar, { cr: 0.15, tw })] };
  ANIM.compile(clip, a.pose); clip.moBase = true; MOV.maul.blockDyn = clip; a.play('blockDyn', { fade: track ? (a.act === 'blockDyn' ? 0.05 : 0.09) : 0.035 });
  if (!track) a.flinch(V3(a.x - src.x, 0, a.z - src.z).normalize(), 0.45);
  return cp;
};
PLAYER.react = function (info) {
  const a = PLAYER.a;
  if (PLAYER._blockedT === MG.t) return;   // the staff took it: the block recoil is the reaction
  FX.addShake(0.3); HUD.hurt(); a.flash = 0.15;
  if (PLAYER.state === 'exec' || PLAYER.state === 'grip' || PLAYER.state === 'ride') return;   // riders only feel the sting
  if (info.knock) { a.play('knock', { fade: 0.05 }); PLAYER.state = 'knock'; const d = info.dir || _v3.set(0, 0, -1); a.vx = d.x * 7; a.vz = d.z * 7; a.vy = 4; a.iframe = 1.0; return; }
  if (info.kind === 'bolt' || PLAYER.state === 'attack' && RNG() < 0.5) { a.flinch(info.dir, info.kind === 'bolt' ? 0.8 : 1.1); return; }   // stings: a jolt, no interruption
  if (PLAYER.throwS) return;
  a.play('hit', { fade: 0.04 }); PLAYER.state = 'hit';
};
PLAYER.die = function () {
  const a = PLAYER.a; PLAYER.state = 'dead'; a.play('death', { fade: 0.1 }); PLAYER.lock = null;
  PLAYER.saber.ignite(undefined, false);
  MG.after(2.0, () => GAME.onPlayerDeath());
};
PLAYER.fell = function () {
  const a = PLAYER.a; a.x = PLAYER.lastSafe.x; a.y = PLAYER.lastSafe.y + 0.1; a.z = PLAYER.lastSafe.z; a.vx = a.vy = a.vz = 0;
  COMBAT.damage(a, 20, { kind: 'fall', unblockable: true });
  if (a.inst.cloth) a.inst.cloth.reset(); CAM.snap = true; HUD.pop('THE DARK SIDE CATCHES YOU');
};
PLAYER.onKill = function (t) {
  const a = PLAYER.a; a.hp = Math.min(a.hpMax, a.hp + (t.drain || 3)); PLAYER.fp = Math.min(PLAYER.fpMax, PLAYER.fp + 6);
  if (PLAYER.lock === t) PLAYER.lock = null;
};
PLAYER.startRage = function () {
  if (PLAYER.a) { R.shock(PLAYER.a.chest(V3()), 1.6); R.kick(0.9); }
  PLAYER.rageOn = true; PLAYER.rageT = 10; HUD.toast('DARK SIDE', 'RAGE UNLEASHED'); FX.addShake(0.6); MG.hitStop = 0.25;
  const a = PLAYER.a; FX.ring(V3(a.x, a.y, a.z), [3, 0.2, 0.05], 5, 0.6); FX.flashLight(a.chest(V3()), [1, 0.1, 0.05], 12, 10, 0.5);
};
/* ---------------------------------------------------------------- Force */
PLAYER.push = function (air) {
  if (PLAYER.a) { R.shock(PLAYER.a.chest(V3()).addScaledVector(PLAYER.a.forward(V3()), 0.6), 1.0); R.kick(0.55); }
  const a = PLAYER.a; if (PLAYER.fp < 25) { HUD.pop('NOT ENOUGH FORCE'); return; }
  PLAYER.fp -= 25;
  const dir = PLAYER.aimDir(PLAYER._d); a.yaw = Math.atan2(dir.x, dir.z);
  a.play('push', { fade: 0.05 }); if (!air) PLAYER.state = 'force';
  MG.after(0.2, () => {
    const f = a.forward(V3()), o = a.chest(V3());
    FX.ring(V3(a.x + f.x * 1.2, a.y + 0.1, a.z + f.z * 1.2), [0.22, 0.2, 0.42], 4.2, 0.4);
    for (let i = 0; i < 16; i++) FX.puff(o.clone().addScaledVector(f, 0.8 + i * 0.3), 1, { size: 0.35, col: [0.5, 0.5, 0.55], a: 0.18, vel: f.clone().multiplyScalar(9), drag: 3, life: 0.6, spread: 0.6 });
    FX.addShake(0.3);
    for (const e of COMBAT.foes()) {
      const dx = e.x - a.x, dz = e.z - a.z, d = Math.hypot(dx, dz); if (d > 8.5 || Math.abs(e.y - a.y) > 3) continue;
      const ang = Math.abs(wrapA(Math.atan2(dx, dz) - a.yaw)); if (ang > 0.9) continue;
      const k = 1 - d / 9;
      if (e.resistPush && e.resistPush(a)) continue;
      COMBAT.damage(e, 8, { src: a, kind: 'push', dir: V3(dx, 0, dz).normalize(), knock: true, force: 10 + 8 * k });
    }
    for (const b of COMBAT.bolts) { const dx = b.p.x - a.x, dz = b.p.z - a.z, d = Math.hypot(dx, dz); if (d < 9 && b.team !== 'hero' && Math.abs(wrapA(Math.atan2(dx, dz) - a.yaw)) < 1.0) { b.v.multiplyScalar(-1); b.team = 'hero'; b.shooter = a; b.dmg = 20; } }
    if (LEVEL.cur && LEVEL.cur.onPush) LEVEL.cur.onPush(a, a.forward(V3()));
  });
};
PLAYER.grip = function () {
  const a = PLAYER.a; if (PLAYER.fp < 20) { HUD.pop('NOT ENOUGH FORCE'); return; }
  const dir = PLAYER.aimDir(PLAYER._d);
  const t = (PLAYER.lock && PLAYER.lock.alive && a.dist(PLAYER.lock) < 11) ? PLAYER.lock : PLAYER.pickTarget(dir, 11, 0.8);
  if (!t) { HUD.pop('NO TARGET'); return; }
  a.yaw = a.angTo(t); a.play('grip', { fade: 0.08 }); PLAYER.state = 'grip';
  if (t.resistGrip && t.resistGrip(a)) { PLAYER.gripT = null; MG.after(0.5, () => { if (PLAYER.state === 'grip') PLAYER.state = 'move'; }); return; }
  PLAYER.gripT = { t, time: 0 }; t.gripped = true; if (t.onGrip) t.onGrip(a); COMBAT.stylePoint(2);
  PLAYER.fp -= 10;
};
PLAYER.gripUpdate = function (dt) {
  const a = PLAYER.a, G = PLAYER.gripT;
  if (!G) { if (!a.act) PLAYER.state = 'move'; return; }
  const t = G.t; G.time += dt; PLAYER.fp -= dt * 14;
  a.yaw = dampA(a.yaw, a.angTo(t), 8, dt);
  if (t.alive) { COMBAT.damage(t, dt * 16, { src: a, kind: 'grip' }); }
  const release = !IN.down('grip') || G.time > 2.6 || PLAYER.fp <= 0 || !t.alive;
  if (release && G.time > 0.35) {
    const f = _v3.set(Math.sin(CAM.yaw), 0, Math.cos(CAM.yaw));
    t.gripped = false; if (t.alive || t.ragdollable) { if (t.onGripThrow) t.onGripThrow(f.clone().multiplyScalar(13).add(V3(0, 5, 0))); }
    PLAYER.gripT = null; a.stop(0.15); PLAYER.state = 'move'; FX.addShake(0.25);
  }
};
/* ---------------------------------------------------------------- saber throw */
PLAYER.throwSaber = function () {
  const a = PLAYER.a; if (PLAYER.fp < 15) { HUD.pop('NOT ENOUGH FORCE'); return; }
  PLAYER.fp -= 15;
  const dir = PLAYER.aimDir(PLAYER._d); const t = PLAYER.lock && PLAYER.lock.alive ? PLAYER.lock : PLAYER.pickTarget(dir, 14, 0.5);
  if (t) dir.set(t.x - a.x, 0, t.z - a.z).normalize();
  a.yaw = Math.atan2(dir.x, dir.z);
  a.play('throwWind', { fade: 0.05 }); PLAYER.state = 'throw';
  MG.after(0.22, () => {
    const S = PLAYER.saber; S.group.updateMatrixWorld(true);
    const p0 = S.group.getWorldPosition(V3());
    const aim = t ? t.chest(V3()) : p0.clone().addScaledVector(dir, 11);
    const dist = Math.min(13, p0.distanceTo(aim) + 1.5);
    PLAYER.throwS = { t: 0, p0, dir: aim.clone().sub(p0).normalize(), dist, spin: 0, pos: p0.clone(), back: false, hit: new Map() };
    a.setProp(null); a.inst.prop = null;
    COMBAT.snapBlades(S, PLAYER.prevSegs);
  });
};
PLAYER.throwUpdate = function (dt) {
  const T = PLAYER.throwS, S = PLAYER.saber, a = PLAYER.a; T.t += dt;
  const out = 0.42, hold = 0.12;
  if (T.t < out) T.pos.copy(T.p0).addScaledVector(T.dir, T.dist * easeOut(T.t / out));
  else if (T.t < out + hold) { /* hover */ }
  else {
    const hand = a.inst.bones[12].getWorldPosition(_v4); const d = hand.distanceTo(T.pos);
    const sp = 22 * dt; if (d < sp + 0.1) { PLAYER.catchSaber(); return; }
    T.pos.addScaledVector(_v5.subVectors(hand, T.pos).normalize(), sp);
  }
  T.spin += dt * 26;
  S.group.position.copy(T.pos); S.group.quaternion.setFromEuler(_e1.set(0, T.spin, HALF * 0.96));
  S.group.updateMatrixWorld(true);
  COMBAT.sweep(a, S, 3, PLAYER.prevSegs, (t, p) => { const last = T.hit.get(t) || -9; if (MG.t - last < 0.25) return; T.hit.set(t, MG.t); PLAYER.landHit(t, p, 20, 'throw'); }, 99);
  COMBAT.snapBlades(S, PLAYER.prevSegs);
  if (LEVEL.cur && LEVEL.cur.onSaberAt) LEVEL.cur.onSaberAt(T.pos);
};
PLAYER.catchSaber = function () {
  const a = PLAYER.a; PLAYER.throwS = null; a.setProp(PLAYER.saber, true);
  a.stop(0.08); PLAYER.state = a.grounded ? 'move' : 'air';
  FX.spark(PLAYER.saber.group.position, V3(0, 1, 0), 6, 2, [3, 1, 0.5]);
};
/* ---------------------------------------------------------------- executions */
PLAYER.execTarget = function () {
  const a = PLAYER.a; let best = null, bd = 3.2;
  for (const e of COMBAT.foes()) { if (!(e.stunned || (e.hp < e.hpMax * 0.2 && !e.isBoss)) || (e.noExec && !e.stunned)) continue; const d = a.dist(e); if (d < bd && Math.abs(e.y - a.y) < 1) { bd = d; best = e; } }
  return best;
};
PLAYER.tryExec = function () {
  const t = PLAYER.execTarget(); if (!t) return false;
  const a = PLAYER.a;
  a.yaw = a.angTo(t); t.yaw = t.angTo(a);
  PLAYER.state = 'exec'; a.play('exec', { fade: 0.05 }); a.iframe = 2;
  PLAYER.execT = { t, time: 0 }; PLAYER.moveBudget = clamp(a.dist(t) - 0.95, 0, 1.2); PLAYER.movePrev = 0;
  if (t.onExec) t.onExec(a);
  COMBAT.snapBlades(PLAYER.saber, PLAYER.prevSegs);
  // side-on camera
  const side = RNG() < 0.5 ? 1 : -1, mid = V3((a.x + t.x) / 2, a.y + 1.2, (a.z + t.z) / 2);
  const f = a.forward(V3()), r = V3(-f.z, 0, f.x).multiplyScalar(side);
  CAM.play({ dur: 1.35, fov: 44, fn: (tt, u) => ({ pos: mid.clone().addScaledVector(r, 3.4 - u * 0.6).addScaledVector(f, -0.8 + u * 0.4).add(V3(0, 0.3 - u * 0.2, 0)), look: mid.clone().add(V3(0, -0.1, 0)) }) });
  return true;
};
PLAYER.execUpdate = function (dt) {
  const a = PLAYER.a, E = PLAYER.execT; if (!E) { PLAYER.state = 'move'; return; }
  E.time += dt;
  if (E.time > 0.3 && !E.stab) { E.stab = true; const p = E.t.chest(V3()); FX.spark(p, V3(0, 1, 0), 20, 5, [4, 1.2, 0.5]); FX.flashLight(p, [1, 0.3, 0.1], 8, 5, 0.2); MG.hitStop = 0.1; FX.addShake(0.3); }
  if (E.time > 0.92 && !E.kill) { E.kill = true; const t = E.t; if (t.isBoss) { t.stunned = false; COMBAT.damage(t, t.hpMax * 0.16, { src: a, kind: 'exec', dir: a.forward(V3()), unblockable: true, knock: true }); } else { t.hp = 1; COMBAT.damage(t, 999, { src: a, kind: 'exec', dir: a.forward(V3()), unblockable: true }); } MG.slowmo = 0.5; a.hp = Math.min(a.hpMax, a.hp + 15); PLAYER.fp = PLAYER.fpMax; FX.addShake(0.4); }
  if (!a.act) { PLAYER.execT = null; PLAYER.state = 'move'; }
};
