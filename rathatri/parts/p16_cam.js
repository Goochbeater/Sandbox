/* CAMERA — third-person orbit with collision, lock-on framing, auto-follow, cinematic overrides and shake. */
const CAM = { yaw: 0, pitch: -0.2, dist: 3.25, distT: 3.25, fov: 58, fovT: 58, pos: new THREE.Vector3(), look: new THREE.Vector3(), mode: 'follow', idleT: 0,
  cine: null, lockBlend: 0, h: 1.55, shoulder: 0.0 };
CAM.reset = function (yaw) { CAM.yaw = yaw || 0; CAM.pitch = -0.2; CAM.snap = true; CAM.cine = null; };
CAM.update = function (dt) {
  const cam = R.camera, P = PLAYER.a;
  if (CAM.cine) { CAM.cineUpdate(dt); return; }
  if (!P) return;
  // input
  const lx = IN.A.lx, ly = IN.A.ly;
  if (Math.abs(lx) + Math.abs(ly) > 0.0025) CAM.idleT = 0; else CAM.idleT += dt;   // tiny mouse jitter is not 'steering the camera'
  CAM.yaw -= lx; CAM.pitch = clamp(CAM.pitch - ly, -1.0, 0.6);
  const tgt = PLAYER.lock && PLAYER.lock.alive ? PLAYER.lock : null;
  CAM.lockBlend = damp(CAM.lockBlend, tgt ? 1 : 0, 6, dt);
  if (tgt) {
    // keep the target in frame: ease the yaw to look from behind the player toward the target
    const want = Math.atan2(tgt.x - P.x, tgt.z - P.z);
    CAM.yaw = dampA(CAM.yaw, want, 5, dt);
    CAM.pitch = damp(CAM.pitch, -0.22, 2, dt);
  } else if (PLAYER.focus && PLAYER.focus.alive && !PLAYER.focus.hidden && P.dist(PLAYER.focus) < 10 && MG.t - (PLAYER.focusT || -9) < 6 && CAM.idleT > 0.35) {
    // soft combat framing: once you're fighting someone, the camera swings round (gently, with a dead zone) so the foe
    // stays in view beside Maul instead of drifting off-screen
    const F = PLAYER.focus, mx = (F.x + P.x) * 0.5, mz = (F.z + P.z) * 0.5, want = Math.atan2(F.x - P.x, F.z - P.z);
    const d = wrapA(want - CAM.yaw), dz = 0.3;
    if (Math.abs(d) > dz) CAM.yaw += (d - Math.sign(d) * dz) * (1 - Math.exp(-3.2 * dt));
    CAM.pitch = damp(CAM.pitch, -0.24, 1.5, dt); void mx; void mz;
  } else if (CAM.idleT > 1.2 && P.speed > 2.5 && PLAYER.state === 'move') {
    // gentle auto-follow behind the running direction
    const want = P.yaw; const d = wrapA(want - CAM.yaw);
    if (Math.abs(d) < 2.4) CAM.yaw += d * (1 - Math.exp(-0.9 * dt));
  }
  // pivot
  const piv = _v1.set(P.x, P.y + CAM.h - (P.pose ? P.pose.crouch * 0.4 : 0), P.z);
  if (!CAM.pivot) CAM.pivot = piv.clone();
  const k = CAM.snap || PLAYER.state === 'ride' ? 1 : 1 - Math.exp(-14 * dt);   // a lagging pivot drops metres behind a 30 m/s speeder
  CAM.pivot.lerp(piv, k);
  if (Math.abs(CAM.pivot.y - piv.y) > 0.6) CAM.pivot.y = lerp(CAM.pivot.y, piv.y, 0.3);
  CAM.distT = lerp(3.25, 4.1, CAM.lockBlend) + (PLAYER.state === 'air' ? 0.45 : 0) + (MG.zoomOut || 0) + Math.min(0.6, COMBAT.foes().filter((e) => e.dist(P) < 7).length * 0.12);
  CAM.dist = damp(CAM.dist, CAM.distT, 4, dt);
  const cp = Math.cos(CAM.pitch), fwd = _v2.set(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp);
  CAM.shoulder = damp(CAM.shoulder, tgt ? 0.18 : 0.34, 3, dt);
  const right = _v3.set(-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw));
  const look = _v4.copy(CAM.pivot).addScaledVector(right, CAM.shoulder);
  if (tgt) { const mid = _v5.set(tgt.x, tgt.y + 1.2, tgt.z); look.lerp(mid, 0.28 * CAM.lockBlend); }
  // collision: pull in along the ray from the look point
  const back = _v5.copy(fwd).negate();
  let d = CAM.dist;
  const hit = PHY.ray(look.x, look.y, look.z, back.x, back.y, back.z, d + 0.3, 'los');
  if (hit) d = Math.max(0.6, Math.min(d, hit.t - 0.3));
  CAM.curD = CAM.curD === undefined || CAM.snap ? d : (d < CAM.curD ? d : damp(CAM.curD, d, 3, dt));
  const pos = CAM.pos.copy(look).addScaledVector(back, CAM.curD);
  // shake
  const s = FX.shake * FX.shake * 0.12, t = MG.rt * 31;
  pos.x += (vnoise2(t, 1.3) - 0.5) * s; pos.y += (vnoise2(t, 7.1) - 0.5) * s; pos.z += (vnoise2(t, 3.7) - 0.5) * s;
  cam.position.copy(pos);
  cam.lookAt(look);
  if (FX.shake > 0.05) cam.rotateZ((vnoise2(t * 0.8, 9.1) - 0.5) * FX.shake * 0.04);
  CAM.fovT = 58 + (P.speed > 5.5 ? 4 : 0) + (PLAYER.rageOn ? 4 : 0) + (PLAYER.state === 'ride' ? Math.min(14, RIDE.spd * 0.32) : 0);
  CAM.fov = damp(CAM.fov, CAM.fovT, 3, dt);
  if (Math.abs(cam.fov - CAM.fov) > 0.01) { cam.fov = CAM.fov; cam.updateProjectionMatrix(); }
  CAM.snap = false;
};
/* cinematic: {from:[p0,t0], to:[p1,t1], dur, t, ease, fov, onEnd} or a function(t)->{pos,look} */
CAM.play = function (shot) { CAM.cine = Object.assign({ t: 0, fov: 45 }, shot); };
CAM.cineUpdate = function (dt) {
  const c = CAM.cine, cam = R.camera; c.t += dt;
  const u = sat(c.t / c.dur), e = c.ease === 'lin' ? u : easeIO(u);
  let pos, look;
  if (c.fn) { const r = c.fn(c.t, u); pos = r.pos; look = r.look; }
  else { pos = _v1.lerpVectors(c.p0, c.p1, e); look = _v2.lerpVectors(c.l0, c.l1 || c.l0, e); }
  cam.position.copy(pos); cam.lookAt(look);
  const s = FX.shake * FX.shake * 0.1, t = MG.rt * 31; cam.position.x += (vnoise2(t, 1.3) - 0.5) * s; cam.position.y += (vnoise2(t, 7.1) - 0.5) * s;
  const f = c.fov || 45; if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); }
  if (c.t >= c.dur && !c.hold) { const cb = c.onEnd; CAM.cine = null; CAM.snap = true; CAM.fov = cam.fov; if (cb) cb(); }
};
