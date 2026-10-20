/* RIDE — Maul's Bloodfin speeder bike: hover over the heightfield, boost, bank into turns, crash on rocks. */
/* riding: crouched astride the saddle, hands on the grips, feet on the pegs. Body-space targets come from the bike's
   anchors (PROPS.BF) relative to the rider origin, which sits RIDE.CR below the pelvis. */
const RIDE = { bike: null, on: false, spd: 0, yaw: 0, bank: 0, h: 0.8, CR: 0.5,
  PH: 0.935 - 0.075,   // rider pelvis joint sits 7.5 cm above the saddle (base-body pelvis height 0.935)
  BF: { seat: [0, 0.28, -0.3], gripL: [0.29, 0.38, 0.45], gripR: [-0.29, 0.38, 0.45], pegL: [0.23, -0.19, -0.04], pegR: [-0.23, -0.19, -0.04] } };   // bike-local rider anchors (PROPS.speeder)
const RIDE_CR = RIDE.CR;
MOV.maul.ride = (function () { const BF = RIDE.BF, oy = BF.seat[1] - (RIDE.PH - RIDE_CR), oz = BF.seat[2], b = (p, dy) => [p[0], p[1] - oy + (dy || 0), p[2] - oz];
  // hands free of the (holstered) saber and IK'd onto the grips; feet on the pegs; a racing crouch over the cowl
  return { loop: true, keys: [K(0, [-0.3, 0.9, -0.1], [0, 1, 0.1], { g: 'none', fl: b(BF.gripL), fr: b(BF.gripR), fL: b(BF.pegL, 0.022), fR: b(BF.pegR, 0.022), liftL: 0, liftR: 0, toeL: 0.1, toeR: 0.1, cr: RIDE_CR, pi: 0.78, tw: 0, air: 1, headPitch: -0.7, headYaw: 0 })] }; })();
RIDE.spawnBike = function (x, z, yaw) {
  const b = PROPS.speeder(); LEVEL.add(b);
  const y = (PHY.hf ? PHY.hf(x, z) : 0) || 0; b.position.set(x, y + RIDE.h, z); b.rotation.y = yaw;
  RIDE.bike = b; RIDE.yaw = yaw; RIDE.on = false; RIDE.spd = 0;
  const L = LEVEL.cur; L.prompt = null;
  L.updates.push(() => { if (!RIDE.on && PLAYER.a && b.position.distanceTo(V3(PLAYER.a.x, PLAYER.a.y + 0.8, PLAYER.a.z)) < 2.6) L.prompt = { p: b.position.clone().add(V3(0, 1.2, 0)), text: IN.keyLabel('grip') + ' RIDE THE BLOODFIN', fn: RIDE.mount }; else if (L.prompt && L.prompt.text.includes('BLOODFIN')) L.prompt = null; });
  return b;
};
RIDE.mount = function () {
  const a = PLAYER.a, b = RIDE.bike; RIDE.on = true; PLAYER.state = 'ride'; a.play('ride', { fade: 0.2 }); PLAYER.saber.setVisible(false); a.setProp(null);
  RIDE.yaw = b.rotation.y; RIDE.spd = 0; RIDE.vx = RIDE.vz = RIDE.vy = 0; RIDE.air = false; RIDE.pitch = 0; LEVEL.cur.prompt = null; HUD.hint(IN.keyLabel('attack') + '/W throttle · A/D steer · ' + IN.keyLabel('dodge') + ' boost · ' + IN.keyLabel('grip') + ' jump off', 5);
};
RIDE.dismount = function (crash) {
  const a = PLAYER.a; a.poseLean = 0; a.inst.extraCol = null; a.inst.wind = null; a.inst.flutter = 0; a.inst.drape = null; RIDE.on = false; PLAYER.state = 'air'; a.stop(0.2); PLAYER.saber.setVisible(true); a.setProp(PLAYER.saber, true);
  a.vx = Math.sin(RIDE.yaw) * RIDE.spd * 0.3; a.vz = Math.cos(RIDE.yaw) * RIDE.spd * 0.3; a.vy = 5; a.y += 0.6;
  if (crash) { COMBAT.damage(a, 12, { kind: 'crash', unblockable: true, knock: true, dir: V3(Math.sin(RIDE.yaw), 0, Math.cos(RIDE.yaw)) }); FX.addShake(0.6); FX.spark(RIDE.bike.position, V3(0, 1, 0), 30, 6, [4, 2, 1]); FX.puff(RIDE.bike.position, 10, { size: 0.8, col: [0.8, 0.65, 0.45], a: 0.4, spread: 3, life: 2 }); }
  RIDE.spd = 0;
};
/* riding: throttle / boost / brake, a heading with a little drift, and a hover that leaves the ground when the ground
   falls away faster than the bike can (crests and drop-offs launch it) and lands with a thump. Rocks and walls are
   scraped past (the bike glances off with sparks and loses speed); only a head-on smash at speed is a wipeout, and a
   wipeout puts Maul straight back on the line a little way behind. */
RIDE.vx = 0; RIDE.vz = 0; RIDE.vy = 0; RIDE.air = false; RIDE.pitch = 0; RIDE.land = 0; RIDE.scrapeT = 0;
RIDE.wipeout = function (why, back, spd) {
  const a = PLAYER.a, b = RIDE.bike;
  if (CAM.cine && PLAYER.state !== 'cine') CAM.cine = null; MG.slowmo = 0; MG.slowmoT = 0; MG.slowmoDur = 0;   // e.g. the chasm shot, then a fall short
  FX.addShake(0.9); FX.spark(b.position, V3(0, 1, 0), 40, 7, [4, 2, 1]); FX.puff(b.position, 12, { size: 1.0, col: [0.8, 0.65, 0.45], a: 0.45, spread: 4, life: 2.2 }); FX.flashLight(b.position, [1, 0.6, 0.3], 8, 10, 0.2);
  COMBAT.damage(a, 10, { kind: 'crash', unblockable: true });
  if (!a.alive) { RIDE.dismount(true); return; }
  HUD.pop(why || 'WIPEOUT');
  // back on the line, 30 m behind, pointing along it
  const z = b.position.z - (back || 30), fx = typeof RUN !== 'undefined' ? RUN.cx : TAT.pathX, x = fx(z) + (typeof RUN !== 'undefined' ? RUN.line(z) * 0.5 : 0), g = (PHY.hf && PHY.hf(x, z)) || 0;
  b.position.set(x, g + RIDE.h, z); RIDE.yaw = Math.atan2(fx(z + 12) - fx(z - 12), 24); RIDE.spd = spd || 6; RIDE.vx = RIDE.vz = RIDE.vy = 0; RIDE.air = false; CAM.yaw = RIDE.yaw; CAM.snap = true;
  if (a.inst.cape) a.inst.cape.reset();
};
PLAYER.states.ride = function (dt) {
  const a = PLAYER.a, b = RIDE.bike;
  if (IN.take('grip') || IN.take('jump')) { RIDE.dismount(false); return; }
  const thr = Math.max(IN.down('attack') ? 1 : 0, -IN.A.my), brake = IN.A.my > 0.1, boost = IN.down('dodge') && thr > 0.1;
  const top = boost ? 72 : 48;
  if (boost && !RIDE.boost0 && RIDE.spd > 15) { R.kick(0.28); FX.addShake(0.25); FX.puff(V3(b.position.x, b.position.y - 0.4, b.position.z), 8, { size: 1.0, grow: 3, col: [0.86, 0.72, 0.52], a: 0.4, spread: 3, life: 1.2 }); } RIDE.boost0 = boost;
  // speed: strong acceleration, a boost surge, coasting drag, hard braking; the air keeps its speed
  if (!RIDE.air) {
    if (thr > 0.1) RIDE.spd += (RIDE.spd < top * thr ? (boost ? 30 : 17) * thr : -14) * dt;
    else if (brake) RIDE.spd = Math.max(-5, RIDE.spd - 34 * dt);
    else RIDE.spd = damp(RIDE.spd, 0, 0.45, dt);
  }
  RIDE.spd = clamp(RIDE.spd, -6, 76);
  const steer = IN.A.mx, sp01 = Math.min(1, Math.abs(RIDE.spd) / 60);
  RIDE.yaw -= steer * dt * (2.0 - sp01 * 1.05) * (RIDE.air ? 0.4 : 1);
  RIDE.yaw += -IN.A.lx * 0.5;
  RIDE.bank = damp(RIDE.bank, -steer * (0.3 + 0.35 * sp01), 5, dt);
  const f = V3(Math.sin(RIDE.yaw), 0, Math.cos(RIDE.yaw));
  // velocity chases the heading (drift at speed, none in the air)
  const grip = RIDE.air ? 0.4 : 7 - sp01 * 3;
  RIDE.vx = damp(RIDE.vx, f.x * RIDE.spd, grip, dt); RIDE.vz = damp(RIDE.vz, f.z * RIDE.spd, grip, dt);
  let nx = b.position.x + RIDE.vx * dt, nz = b.position.z + RIDE.vz * dt;
  const hf = (x, z) => { const g = PHY.hf ? PHY.hf(x, z) : 0; return g === null || g === undefined ? b.position.y - RIDE.h : g; };
  // rocks and props: push out and glance off; head-on at speed = wipeout
  let hit = null;
  PHY.each(nx - 2, nz - 2, nx + 2, nz + 2, (c) => {
    if (hit || c.off) return;
    if (c.k === 3) { const dx = nx - c.cx, dz = nz - c.cz, d = Math.hypot(dx, dz), r = c.rad + 0.75; if (d < r && b.position.y < c.y1 + 0.4 && b.position.y > c.y0 - 1.5) hit = { n: V3(dx / (d || 1), 0, dz / (d || 1)), push: r - d }; }
    else if (c.k !== 9 && PHY.overlaps(c, nx, nz, 0.7) && c.y1 > b.position.y - 0.5 && c.y0 < b.position.y + 1) { const bx = (c.x0 + c.x1) / 2, bz = (c.z0 + c.z1) / 2, dx = nx - bx, dz = nz - bz, d = Math.hypot(dx, dz) || 1; hit = { n: V3(dx / d, 0, dz / d), push: 0.3 }; }
  });
  // near misses: threading past a rock (k 3 = cylinder) within ~1.6 m of its face at speed earns a pop + a kick, once per rock
  if (!hit && !RIDE.air && RIDE.spd > 32) { const nm = RIDE.nm || (RIDE.nm = new Set());
    PHY.each(nx - 3.5, nz - 3.5, nx + 3.5, nz + 3.5, (c) => { if (c.k !== 3 || c.off || nm.has(c) || c.rad < 0.9) return; const gap = Math.hypot(nx - c.cx, nz - c.cz) - c.rad - 0.75;
      if (gap > 0 && gap < 1.6 && b.position.y < c.y1 && ((nx - c.cx) * RIDE.vx + (nz - c.cz) * RIDE.vz) > 0) { nm.add(c); RIDE.nearMiss = (RIDE.nearMiss || 0) + 1; HUD.pop(RIDE.nearMiss > 1 && MG.t - (RIDE.nmT || -9) < 3 ? 'NEAR MISS ×' + (RIDE.nmChain = (RIDE.nmChain || 1) + 1) : (RIDE.nmChain = 1, 'NEAR MISS')); RIDE.nmT = MG.t; R.kick(0.12); FX.addShake(0.12); } }); }
  // terrain walls: a rise steeper than ~50° along the motion is a wall; its normal is the downhill gradient
  const g0 = hf(b.position.x, b.position.z), g1 = hf(nx, nz), run = Math.hypot(nx - b.position.x, nz - b.position.z);
  if (!hit && run > 1e-4 && (g1 - g0) / run > 1.2 && g1 > b.position.y - RIDE.h + 0.9) {
    const e = 0.6, gx = hf(nx + e, nz) - hf(nx - e, nz), gz = hf(nx, nz + e) - hf(nx, nz - e), L = Math.hypot(gx, gz) || 1;
    hit = { n: V3(-gx / L, 0, -gz / L), push: 0, wall: true };
  }
  if (hit) {
    const vIn = RIDE.vx * hit.n.x + RIDE.vz * hit.n.z, sp = Math.hypot(RIDE.vx, RIDE.vz) || 1;
    if (vIn < 0 && -vIn / sp > 0.8 && sp > 30) { RIDE.wipeout(hit.wall ? 'WIPEOUT — THE CANYON WALL' : 'WIPEOUT'); return; }
    if (vIn < 0) { RIDE.vx -= hit.n.x * vIn * 1.25; RIDE.vz -= hit.n.z * vIn * 1.25; }
    const loss = 1 - clamp(-vIn / sp, 0, 1) * 0.55; RIDE.spd *= Math.max(0.55, loss);
    RIDE.yaw = dampA(RIDE.yaw, Math.atan2(RIDE.vx, RIDE.vz), 6, dt);
    nx = b.position.x + RIDE.vx * dt + hit.n.x * hit.push; nz = b.position.z + RIDE.vz * dt + hit.n.z * hit.push;
    if (hit.wall) { nx = b.position.x + hit.n.x * 0.05 + (RIDE.vx * dt) * 0.3; nz = b.position.z + hit.n.z * 0.05 + (RIDE.vz * dt) * 0.3; }
    if (RIDE.scrapeT <= 0) { const cp = V3(b.position.x - hit.n.x * 0.6, b.position.y, b.position.z - hit.n.z * 0.6); FX.spark(cp, V3(hit.n.x, 0.6, hit.n.z), 22, 6, [4, 2.2, 1]); FX.addShake(0.35); RIDE.scrapeT = 0.12; if (-vIn > 8) COMBAT.damage(a, 2, { kind: 'crash', unblockable: true }); }
  }
  RIDE.scrapeT -= dt;
  b.position.x = nx; b.position.z = nz;
  // vertical: glued to the ground unless it drops away faster than gravity; then a ballistic arc and a landing
  const gh = hf(nx, nz) + RIDE.h, bob = Math.sin(MG.t * 3) * 0.04;
  if (!RIDE.air) {
    const y = b.position.y, ny = gh, vyG = (ny - y) / Math.max(dt, 1e-4);
    if (vyG < RIDE.vy - 26 * dt - 0.5 && ny < y - 0.08) { RIDE.air = true; RIDE.vy = Math.max(RIDE.vy, 0); }   // the ground fell away: launch
    else { RIDE.vy = clamp(vyG, -30, 30); b.position.y = damp(y, ny + bob, 22, dt); }
  }
  if (RIDE.air) {
    RIDE.vy -= 21 * dt; b.position.y += RIDE.vy * dt;
    if (b.position.y <= gh) {
      const impact = -RIDE.vy; b.position.y = gh; RIDE.air = false;
      if (impact > 5) { RIDE.land = Math.min(1, impact / 18); FX.addShake(0.2 + RIDE.land * 0.55); FX.puff(V3(nx, gh - RIDE.h + 0.1, nz), 10, { size: 1.1, grow: 3, col: [0.86, 0.72, 0.52], a: 0.5, spread: 3.5, life: 1.6, rise: 0.8 }); RIDE.spd *= 0.96 - RIDE.land * 0.06; MG.hitStop = Math.max(MG.hitStop, RIDE.land * 0.05); }
      RIDE.vy = 0;
    }
  }
  RIDE.land = Math.max(0, RIDE.land - dt * 2.2);
  // attitude: nose follows the ground (or the arc in the air), bank into turns
  const pT = RIDE.air ? clamp(Math.atan2(RIDE.vy, Math.max(8, RIDE.spd)) * 0.8, -0.6, 0.5) : Math.atan2(hf(nx + f.x * 2.2, nz + f.z * 2.2) - hf(nx - f.x * 2.2, nz - f.z * 2.2), 4.4);
  RIDE.pitch = damp(RIDE.pitch, pT, RIDE.air ? 3 : 9, dt);
  b.rotation.set(0, 0, 0); b.rotateY(RIDE.yaw); b.rotateX(-RIDE.pitch); b.rotateZ(RIDE.bank);
  // rider sits on the saddle: the seat anchor (pelvis target) through the bike's full transform
  b.updateMatrixWorld(); const sw = _v4.set(RIDE.BF.seat[0], RIDE.BF.seat[1], RIDE.BF.seat[2]).applyMatrix4(b.matrixWorld);
  a.x = sw.x; a.z = sw.z; a.y = sw.y - (RIDE.PH - RIDE_CR) - RIDE.land * 0.1; a.yaw = RIDE.yaw; a.vx = a.vz = a.vy = 0; a.grounded = true; a.poseLean = -RIDE.bank * 1.4;
  a.floorY = gh - RIDE.h;   // the cloth's floor is the ground under the bike (a stale on-foot floor held the cape up in a standing tube)
  // the rider's cloth: collide with the hull and stream back in the headwind
  { const I = a.inst, M = b.matrixWorld, P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
    // the hull only: a cape caught on the thin tail fin wrapped round it into a standing tube
    I.extraCol = [[P(0, 0.02, -1.6), P(0, 0.02, 2.2), 0.2], [P(0, 0.13, -0.75), P(0, 0.13, 0.1), 0.17], [P(0.19, -0.02, 0.0), P(0.19, -0.02, 0.8), 0.1], [P(-0.19, -0.02, 0.0), P(-0.19, -0.02, 0.8), 0.1]];
    // headwind: enough to lift the cape into a trailing billow, never a flat board; flutter ripples it
    const wind = I.wind || (I.wind = new THREE.Vector3()); wind.set(-f.x, 0.1, -f.z).multiplyScalar(Math.min(2 + RIDE.spd * 0.25, 9)); I.flutter = 0.3 + Math.min(0.35, RIDE.spd / 80);
    // the cape streams back along a set shape (angle grows with speed); the sim only adds ripple on top of it
    const th = clamp(0.95 + RIDE.spd * 0.012, 0.95, 1.35), dr = I.drape || (I.drape = { dir: new THREE.Vector3(), k: 0.2, amp: 0.07 }); dr.amp = 0.05 + Math.min(0.06, RIDE.spd * 0.002); dr.dir.set(-f.x * Math.sin(th), -Math.cos(th), -f.z * Math.sin(th)).normalize(); }
  if (b.userData.exhaust) b.userData.exhaust.material.color.setRGB(1, 0.36, 0.12).multiplyScalar(0.55 + RIDE.spd * 0.028 + (boost ? 0.7 : 0));
  if (b.userData.plume) { const pl = b.userData.plume, k = clamp(RIDE.spd / 30, 0, 1.6); pl.scale.set(1, 0.3 + k * 1.2, 1); pl.position.z = -1.7 - (0.3 + k * 1.2) * 0.5; pl.material.uniforms.uA.value = 0.25 + k * 0.6 + (boost ? 0.5 : 0); }
  a.speed = 0;
  // chase camera: swings in behind, lower and wider with speed; blur and dust sell the pace
  CAM.yaw = dampA(CAM.yaw, RIDE.yaw + RIDE.bank * 0.35, 3.2, dt); CAM.pitch = damp(CAM.pitch, RIDE.air ? -0.32 : -0.17 - sp01 * 0.05, 2, dt);
  MG.zoomOut = -0.6 + RIDE.spd * 0.02;
  const gy0 = gh - RIDE.h, dn = RIDE.air ? 0 : RIDE.spd * dt * 2.4; for (let k = 0; k < 3; k++) if (RNG() < dn - k) FX.puff(V3(b.position.x - f.x * 1.6 + rnd(-0.4, 0.4), gy0 + 0.1, b.position.z - f.z * 1.6 + rnd(-0.4, 0.4)), 1, { size: 0.55 + RIDE.spd * 0.012, grow: 3.2, col: [0.86, 0.72, 0.52], a: 0.42, spread: 1.2, life: 1.8, vel: V3(-f.x * 4 + f.z * RIDE.bank * 6, 1.2, -f.z * 4 - f.x * RIDE.bank * 6) });
  R.G.haze = 0;   // crisp at speed: no held radial blur, no heat shimmer, no constant shake (speed reads from streaks, dust, FOV)
};
/* DRK-1 probe droid: black sphere, antenna, red eye */
RIDE.probe = function () {
  const g = new THREE.Group(); const m = PROPS.m('probe', { color: 0x0e0e10, metalness: 0.8, roughness: 0.25, envMapIntensity: 1.4 });
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), m); g.add(s);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), KIT.emis(0xff2010, 6)); eye.position.z = 0.25; g.add(eye);
  for (const [x, y, l] of [[0.1, 0.1, 0.5], [-0.12, 0.05, 0.4], [0, -0.1, 0.6]]) { const an = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, l, 5), m); an.position.set(x, y, -0.2 - l / 2); an.rotation.x = HALF; g.add(an); }
  LEVEL.add(g); return g;
};
