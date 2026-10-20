/* FX — spark streaks, glow/smoke particles, shockwave rings, scorch decals, debris chunks, flashes, camera shake. */
const FX = { sparks: [], parts: [], rings: [], decals: [], debris: [], shake: 0, flashes: [] };
FX.init = function () {
  // spark streaks (additive line segments)
  const NS = 1400;
  FX.sPos = new Float32Array(NS * 6); FX.sCol = new Float32Array(NS * 6);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(FX.sPos, 3).setUsage(THREE.DynamicDrawUsage));
  sg.setAttribute('color', new THREE.BufferAttribute(FX.sCol, 3).setUsage(THREE.DynamicDrawUsage));
  FX.sLines = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  FX.sLines.frustumCulled = false; FX.sLines.renderOrder = 7; FX.NS = NS;
  // soft particles (points): additive glow + alpha smoke/dust
  FX.mkPts = (N, additive) => {
    const g = new THREE.BufferGeometry();
    const P = new Float32Array(N * 3), C = new Float32Array(N * 4), S = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(C, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(S, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
      uniforms: { uScale: { value: 600 } },
      vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vC; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: additive ? `varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = pow(max(0.0, 1.0 - r), 2.2); gl_FragColor = vec4(vC.rgb * vC.a * a, 1.0); }`
        : `varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = 1.0 - smoothstep(0.2, 1.0, r); gl_FragColor = vec4(vC.rgb, vC.a * a); }` });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 8 : 4;
    return { pts, P, C, S, N, list: [] };
  };
  FX.glow = FX.mkPts(1200, true); FX.smoke = FX.mkPts(700, false);
  FX.group = new THREE.Group(); FX.group.add(FX.sLines, FX.glow.pts, FX.smoke.pts); R.scene.add(FX.group);
  FX.ringGeo = new THREE.PlaneGeometry(2, 2); FX.ringGeo.rotateX(-Math.PI / 2);
  { // shockwave: a thin hot leading edge with a soft wake inside it (a hard flat band read as a painted disc)
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(255,255,255,0.12)'); g.addColorStop(0.93, 'rgba(255,255,255,0.75)'); g.addColorStop(0.97, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); FX.ringTex = new THREE.CanvasTexture(c); }
  FX.decalGeo = new THREE.PlaneGeometry(1, 1);
  FX.decalMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: FX.scorchTex() });
};
FX.scorchTex = function () {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
};
FX.reattach = function () { if (FX.group && FX.group.parent !== R.scene) R.scene.add(FX.group); };
/* sparks: burst at p along normal n (world), colour hex-ish array [r,g,b] (HDR ok) */
FX.spark = function (p, n, count, speed, col, life) {
  col = col || [4, 2.2, 1.0];
  for (let i = 0; i < count; i++) {
    if (FX.sparks.length >= FX.NS) FX.sparks.shift();
    const d = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
    if (n) d.addScaledVector(n, 1.2).normalize();
    const sp = (speed || 6) * rnd(0.4, 1.3);
    FX.sparks.push({ p: p.clone(), v: d.multiplyScalar(sp), life: (life || 0.35) * rnd(0.5, 1.2), t: 0, col });
  }
};
FX.puff = function (p, count, o) {
  o = o || {};
  const sys = o.add ? FX.glow : FX.smoke;
  for (let i = 0; i < count; i++) {
    if (sys.list.length >= sys.N) sys.list.shift();
    const v = new THREE.Vector3(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).multiplyScalar(o.spread || 0.8);
    if (o.vel) v.add(o.vel);
    sys.list.push({ p: p.clone().add(new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(o.jit || 0.1)), v, t: 0, life: (o.life || 1.2) * rnd(0.7, 1.3),
      s0: (o.size || 0.3) * rnd(0.7, 1.2), s1: (o.grow || 2.2), col: o.col || [0.5, 0.48, 0.45], a: o.a !== undefined ? o.a : 0.5, drag: o.drag || 1.5, rise: o.rise || 0.3 });
  }
};
FX.ring = function (p, col, r1, life) {
  const m = new THREE.Mesh(FX.ringGeo, new THREE.MeshBasicMaterial({ map: FX.ringTex, color: new THREE.Color(col[0], col[1], col[2]).multiplyScalar(0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  m.position.copy(p); m.position.y += 0.05; R.scene.add(m);
  FX.rings.push({ m, t: 0, life: life || 0.45, r1: r1 || 4 });
};
FX.scorch = function (p, n, size) {
  if (FX.decals.length > 60) { const d = FX.decals.shift(); if (d.parent) d.parent.remove(d); }
  const m = new THREE.Mesh(FX.decalGeo, FX.decalMat); m.position.copy(p).addScaledVector(n, 0.01);
  m.lookAt(_v1.copy(p).add(n)); m.scale.setScalar(size || 0.25); m.rotateZ(rnd(0, TAU)); R.scene.add(m); FX.decals.push(m);
};
/* debris: a mesh flung with spin, bounces on PHY ground, fades after `life` */
FX.chunk = function (mesh, v, spin, life) {
  R.scene.add(mesh);
  FX.debris.push({ m: mesh, v: v.clone(), w: spin || new THREE.Vector3(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)), t: 0, life: life || 5, rest: false });
};
FX.addShake = function (a) { FX.shake = Math.min(1.2, FX.shake + a); };
FX.flashLight = function (p, col, i, range, life) { const L = R.addLight({ pos: p.clone(), col: new THREE.Color(col[0], col[1], col[2]), i, range: range || 6, prio: 4, on: true }); FX.flashes.push({ L, t: 0, life: life || 0.15, i0: i }); };
FX.clear = function () {
  FX.sparks.length = 0; FX.glow.list.length = 0; FX.smoke.list.length = 0;
  if (FX.burns) { for (const b of FX.burns) { if (b.me.parent) b.me.parent.remove(b.me); b.m.dispose(); } FX.burns.length = 0; }
  if (FX.flashed) { for (const a of FX.flashed) { a.inst.meshes.forEach((m, k) => { m.material = a._flashM[k]; }); a._flashUntil = 0; } FX.flashed.length = 0; }
  if (FX.imps) for (const q of FX.imps) { q.on = false; if (q.sp.parent) q.sp.parent.remove(q.sp); }
  for (const r of FX.rings) R.scene.remove(r.m); FX.rings.length = 0;
  for (const d of FX.decals) if (d.parent) d.parent.remove(d); FX.decals.length = 0;
  for (const d of FX.debris) if (d.m.parent) d.m.parent.remove(d.m); FX.debris.length = 0;
  for (const f of FX.flashes) R.removeLight(f.L); FX.flashes.length = 0;
};
FX.update = function (dt) {
  FX.updateBurns(dt); FX.updateImpacts();
  // sparks
  let n = 0; const SP = FX.sPos, SC = FX.sCol;
  for (let i = FX.sparks.length - 1; i >= 0; i--) { const s = FX.sparks[i]; s.t += dt; if (s.t > s.life) { FX.sparks.splice(i, 1); continue; } s.v.y -= 9.8 * dt; s.v.multiplyScalar(1 - 1.5 * dt); s.p.addScaledVector(s.v, dt); }
  for (const s of FX.sparks) {
    if (n >= FX.NS) break;
    const k = 1 - s.t / s.life, L = 0.018 + 0.012 * s.v.length() * 0.2;
    SP[n * 6] = s.p.x; SP[n * 6 + 1] = s.p.y; SP[n * 6 + 2] = s.p.z;
    SP[n * 6 + 3] = s.p.x - s.v.x * L; SP[n * 6 + 4] = s.p.y - s.v.y * L; SP[n * 6 + 5] = s.p.z - s.v.z * L;
    for (let q = 0; q < 2; q++) { SC[n * 6 + q * 3] = s.col[0] * k; SC[n * 6 + q * 3 + 1] = s.col[1] * k * k; SC[n * 6 + q * 3 + 2] = s.col[2] * k * k * k; }
    n++;
  }
  FX.sLines.geometry.setDrawRange(0, n * 2); FX.sLines.geometry.attributes.position.needsUpdate = true; FX.sLines.geometry.attributes.color.needsUpdate = true;
  // points
  for (const sys of [FX.glow, FX.smoke]) {
    let m = 0;
    for (let i = sys.list.length - 1; i >= 0; i--) { const q = sys.list[i]; q.t += dt; if (q.t > q.life) { sys.list.splice(i, 1); continue; } q.v.multiplyScalar(1 - q.drag * dt); q.v.y += q.rise * dt; q.p.addScaledVector(q.v, dt); }
    for (const q of sys.list) {
      if (m >= sys.N) break; const u = q.t / q.life;
      sys.P[m * 3] = q.p.x; sys.P[m * 3 + 1] = q.p.y; sys.P[m * 3 + 2] = q.p.z;
      const a = q.a * (sys === FX.glow ? (1 - u) : Math.sin(Math.min(1, u * 3) * HALF) * (1 - u));
      sys.C[m * 4] = q.col[0]; sys.C[m * 4 + 1] = q.col[1]; sys.C[m * 4 + 2] = q.col[2]; sys.C[m * 4 + 3] = a;
      sys.S[m] = q.s0 * (1 + q.s1 * u); m++;
    }
    const g = sys.pts.geometry; g.setDrawRange(0, m); g.attributes.position.needsUpdate = true; g.attributes.aCol.needsUpdate = true; g.attributes.aSize.needsUpdate = true;
    sys.pts.material.uniforms.uScale.value = R.h / (2 * Math.tan(R.camera.fov * D2R / 2));
  }
  for (let i = FX.rings.length - 1; i >= 0; i--) { const r = FX.rings[i]; r.t += dt; const u = r.t / r.life; if (u >= 1) { R.scene.remove(r.m); r.m.material.dispose(); FX.rings.splice(i, 1); continue; } r.m.scale.setScalar(0.2 + easeOut(u) * r.r1); r.m.material.opacity = (1 - u) * (1 - u); }
  for (let i = FX.debris.length - 1; i >= 0; i--) {
    const d = FX.debris[i]; d.t += dt;
    if (d.t > d.life) { d.m.scale.multiplyScalar(0.9); if (d.t > d.life + 0.6) { if (d.m.parent) d.m.parent.remove(d.m); FX.debris.splice(i, 1); } continue; }
    if (d.rest) continue;
    d.v.y -= 18 * dt; d.m.position.addScaledVector(d.v, dt);
    d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
    const g = PHY.ground(d.m.position.x, d.m.position.z, 0.05, d.m.position.y + 0.3, d.m.position.y - 0.5);
    if (g !== null && d.m.position.y < g + 0.06) { d.m.position.y = g + 0.06; d.v.y *= -0.3; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.6); if (Math.abs(d.v.y) < 0.6 && d.v.length() < 0.8) d.rest = true; }
    if (d.m.position.y < -200) d.t = d.life;
  }
  for (let i = FX.flashes.length - 1; i >= 0; i--) { const f = FX.flashes[i]; f.t += dt; f.L.i = f.i0 * Math.max(0, 1 - f.t / f.life); if (f.t >= f.life) { R.removeLight(f.L); FX.flashes.splice(i, 1); } }
  FX.shake = Math.max(0, FX.shake - dt * 1.8);
};

/* saber burns: a glowing cauterised slash stuck to the nearest bone where the blade connected, cooling from white-hot
   to ember over ~2.5 s and trailing smoke. */
FX.burns = [];
FX.burnGeo = null;
FX.burn = function (t, p, sweep) {
  const I = t.inst; if (!I || !I.bones || !I.bones.length) return;
  let best = null, bd = 1e9; const w = _v4;
  for (const b of I.bones) { b.getWorldPosition(w); const d = w.distanceToSquared(p); if (d < bd) { bd = d; best = b; } }
  if (!best || bd > 0.5) return;
  if (!FX.burnGeo) FX.burnGeo = new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.2, 1.4), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const me = new THREE.Mesh(FX.burnGeo, m); me.scale.set(0.26 + Math.random() * 0.12, 0.022, 0.03);
  best.add(me); best.updateMatrixWorld(true);
  me.position.copy(best.worldToLocal(p.clone()));
  const inv = new THREE.Quaternion(); best.getWorldQuaternion(inv).invert();
  const dir = (sweep && sweep.lengthSq() > 1e-6 ? sweep.clone() : V3(Math.random() - 0.5, (Math.random() - 0.5) * 0.6, Math.random() - 0.5)).normalize();
  me.quaternion.setFromUnitVectors(V3(1, 0, 0), dir).premultiply(inv);
  me.renderOrder = 5;
  FX.burns.push({ me, m, t: 0, bone: best, act: t });
  if (FX.burns.length > 28) { const o = FX.burns.shift(); if (o.me.parent) o.me.parent.remove(o.me); o.m.dispose(); }
};
FX.updateBurns = function (dt) {
  for (let i = FX.burns.length - 1; i >= 0; i--) {
    const b = FX.burns[i]; b.t += dt;
    const k = b.t < 0.15 ? 1 : Math.max(0, 1 - (b.t - 0.15) / 2.4);
    b.m.color.setRGB(6 * k * k + 0.6 * k, 3.2 * k * k * k + 0.08 * k, 1.4 * k * k * k);
    if (b.t < 1.6 && Math.random() < dt * 9) { b.me.getWorldPosition(_v4); FX.puff(_v4, 1, { size: 0.06, grow: 4, col: [0.22, 0.2, 0.19], a: 0.35, life: 1.4, spread: 0.08, rise: 0.8, drag: 0.8 }); }
    if (b.t > 2.6 || (b.act && b.act.gone)) { if (b.me.parent) b.me.parent.remove(b.me); b.m.dispose(); FX.burns.splice(i, 1); }
  }
};

/* impact flash: the struck body renders white-hot for a couple of frames (real time, so hit-stop does not stretch it) */
FX.flashed = [];
FX.flashActor = function (a, dur) {
  if (!a || !a.inst || !a.inst.meshes) return;
  FX.flashMat = FX.flashMat || new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.62, 0.3), toneMapped: false });
  const until = performance.now() + (dur || 0.07) * 1000;
  if (a._flashUntil) { a._flashUntil = until; return; }
  a._flashUntil = until; a._flashM = a.inst.meshes.map((m) => m.material);
  for (const m of a.inst.meshes) m.material = Array.isArray(m.material) ? m.material.map(() => FX.flashMat) : FX.flashMat;
  FX.flashed.push(a);
};
/* impact star: an additive four-point burst at the contact point */
FX.impactTex = function () {
  if (FX._impTex) return FX._impTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,240,220,0.9)'); g.addColorStop(0.35, 'rgba(255,160,90,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter';
  for (const [w, l, a] of [[3, 62, 0], [3, 62, Math.PI / 2], [1.5, 40, Math.PI / 4], [1.5, 40, -Math.PI / 4]]) { x.save(); x.translate(64, 64); x.rotate(a); const lg = x.createLinearGradient(-l, 0, l, 0); lg.addColorStop(0, 'rgba(255,200,150,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = lg; x.fillRect(-l, -w, l * 2, w * 2); x.restore(); }
  FX._impTex = new THREE.CanvasTexture(c); FX._impTex.colorSpace = THREE.SRGBColorSpace; return FX._impTex;
};
FX.imps = [];
FX.impact = function (p, col, size) {
  let s = FX.imps.find((q) => !q.on);
  if (!s) { if (FX.imps.length >= 20) s = FX.imps[0]; else { const m = new THREE.SpriteMaterial({ map: FX.impactTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }); s = { sp: new THREE.Sprite(m) }; s.sp.renderOrder = 6; FX.imps.push(s); } }
  if (!s.sp.parent) R.scene.add(s.sp);
  s.on = true; s.t0 = performance.now(); s.size = size || 0.8; s.sp.position.copy(p); s.sp.material.rotation = Math.random() * Math.PI; const c = col || [3, 1.6, 0.8]; s.sp.material.color.setRGB(c[0], c[1], c[2]); s.sp.visible = true;
};
FX.updateImpacts = function () {
  const now = performance.now();
  for (let i = FX.flashed.length - 1; i >= 0; i--) { const a = FX.flashed[i]; if (now >= a._flashUntil) { a.inst.meshes.forEach((m, k) => { m.material = a._flashM[k]; }); a._flashUntil = 0; a._flashM = null; FX.flashed.splice(i, 1); } }
  for (const s of FX.imps) { if (!s.on) continue; const u = (now - s.t0) / 130; if (u >= 1) { s.on = false; s.sp.visible = false; continue; } const k = s.size * (0.55 + u * 0.9); s.sp.scale.set(k, k, k); s.sp.material.opacity = (1 - u) * (1 - u); }
};
