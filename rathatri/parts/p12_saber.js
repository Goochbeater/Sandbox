/* LIGHTSABERS — lathe hilts (Maul's saberstaff, Qui-Gon's and Obi-Wan's hilts), layered HDR blades, swept trails,
   and a light-pool source per blade. The hilt's local +Y is the blade axis; y = 0 is the hilt centre. */
const SABER = { COL: { red: [1.0, 0.07, 0.03], green: [0.18, 1.0, 0.12], blue: [0.1, 0.35, 1.0], yellow: [1.0, 0.8, 0.1] } };
SABER.mats = function () {
  if (SABER._m) return SABER._m;
  SABER._m = {
    satin: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe8ecf0, metalness: 1.0, roughness: 0.12, envMapIntensity: 1.4 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, metalness: 0.3, roughness: 0.55, envMapIntensity: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3c40, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.0 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9a0a06, metalness: 0.2, roughness: 0.35, emissive: 0x200000 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc8962e, metalness: 1.0, roughness: 0.3 }),
  };
  return SABER._m;
};
/* lathe from a profile [[r, y], ...] (y ascending), with ribs helper */
SABER.lathe = function (prof, seg) { const pts = prof.map((p) => new THREE.Vector2(p[0], p[1])); const g = new THREE.LatheGeometry(pts, seg || 40); g.computeVertexNormals(); return g; };
SABER.ribs = function (y0, y1, n, r0, r1, duty) { const out = []; const step = (y1 - y0) / n; for (let i = 0; i < n; i++) { const a = y0 + i * step, b = a + step * (duty || 0.5); out.push([r0, a], [r1, a + 0.0006], [r1, b - 0.0006], [r0, b]); } return out; };
SABER.buildStaff = function () {
  const M = SABER.mats(), g = new THREE.Group(), R = 0.0176;
  // one half (y >= 0), mirrored for the other
  const half = [[R, 0.0], [R, 0.0014], [R - 0.0004, 0.002], [R - 0.0004, 0.004], [R, 0.0046], [R, 0.04], [R + 0.0008, 0.0405], [R + 0.0008, 0.044], [R, 0.0445], [R, 0.111]]
    .concat(SABER.ribs(0.1135, 0.148, 5, R, R + 0.0017, 0.42))
    .concat([[R, 0.151], [R, 0.222], [R + 0.0006, 0.2225], [R + 0.0006, 0.2255], [R, 0.226], [0.0212, 0.263], [0.0223, 0.2635], [0.0223, 0.2755], [0.0214, 0.2768], [0.0214, 0.28], [0.019, 0.281], [0.0114, 0.2812], [0.0114, 0.27], [0.006, 0.27]]);
  const H = SABER.lathe(half, 40);
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(H, M.satin); m.scale.y = s; m.castShadow = true; g.add(m);
    // emitter cage vents: dark slots on the flared shroud
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + Math.PI / 8, v = new THREE.Mesh(SABER._slot || (SABER._slot = new THREE.BoxGeometry(0.0055, 0.028, 0.004)), M.black);
      v.position.set(Math.cos(a) * 0.0205, s * 0.2445, Math.sin(a) * 0.0205); v.rotation.y = -a + Math.PI / 2; v.rotation.x = s * -0.1 * Math.cos(0); g.add(v);
    }
    // control studs: red stud, slide switch, silver stud
    const stud = (y, mat, r) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 0.004, 16), mat); c.rotation.x = Math.PI / 2; c.position.set(0, s * y, R + 0.0015); g.add(c); };
    stud(0.062, M.red, 0.0033); stud(0.028, M.red, 0.0033); stud(0.081, M.chrome, 0.0029); stud(0.17, M.red, 0.003);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.0056, 0.0105, 0.003), M.dark); sw.position.set(0, s * 0.0715, R + 0.0012); g.add(sw);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.0062, 0.015, 0.0015), M.satin); plate.position.set(R + 0.0005, s * 0.076, 0); plate.rotation.z = Math.PI / 2; g.add(plate);
    // black o-rings
    for (const y of [0.042, 0.112, 0.224]) { const t = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0005, 0.0011, 6, 32), M.black); t.rotation.x = Math.PI / 2; t.position.y = s * y; g.add(t); }
  }
  g.userData = { ends: [0.281, -0.281], grips: [0.132, -0.132], len: 0.562 };
  return g;
};
SABER.buildSingle = function (kind) {
  const M = SABER.mats(), g = new THREE.Group();
  let prof;
  if (kind === 'quigon') {
    prof = [[0.006, -0.14], [0.017, -0.139], [0.018, -0.13], [0.0165, -0.12], [0.0165, -0.05]].concat(SABER.ribs(-0.05, 0.03, 7, 0.0165, 0.0185, 0.55)).concat([[0.0165, 0.035], [0.0175, 0.06], [0.0175, 0.1], [0.0195, 0.105], [0.0215, 0.13], [0.0215, 0.14], [0.012, 0.141]]);
  } else {
    prof = [[0.006, -0.135], [0.0175, -0.134], [0.0185, -0.125], [0.0165, -0.115], [0.0165, -0.06]].concat(SABER.ribs(-0.06, 0.02, 6, 0.0165, 0.0182, 0.5)).concat([[0.0165, 0.025], [0.017, 0.07], [0.019, 0.075], [0.019, 0.1], [0.022, 0.118], [0.022, 0.135], [0.012, 0.136]]);
  }
  const m = new THREE.Mesh(SABER.lathe(prof, 32), M.satin); m.castShadow = true; g.add(m);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0172, 0.0172, 0.075, 24), M.black); grip.position.y = -0.012; g.add(grip);
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.07, 0.003), M.dark); const a = i / 6 * TAU; r.position.set(Math.cos(a) * 0.0178, -0.012, Math.sin(a) * 0.0178); r.rotation.y = -a; g.add(r); }
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.004), kind === 'quigon' ? M.gold : M.black); btn.position.set(0, 0.05, 0.018); g.add(btn);
  g.userData = { ends: [0.14], grips: [-0.05, 0.02], len: 0.28 };
  return g;
};
/* ------------------------------------------------------------------ blades */
SABER.BLADE_VS = `
attribute float aTip; uniform float uLen, uR, uT;
varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vA;
void main() {
  vec3 p = position; vA = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
  float y = p.y * uLen + aTip * uR;
  vec3 q = vec3(p.x * uR, y, p.z * uR);
  vec3 n = normalize(vec3(p.x, aTip * 0.9, p.z));
  vec4 wp = modelMatrix * vec4(q, 1.0);
  vN = normalize(mat3(modelMatrix) * n); vV = cameraPosition - wp.xyz; vY = y / max(uLen, 0.01);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
SABER.BLADE_FS = `
uniform vec3 uCol; uniform float uI, uPow, uWhite;
varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vA;
void main() {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float k = pow(ndv, uPow);
  vec3 c = mix(uCol, vec3(1.0), uWhite) * uI * k;
  float nearFade = mix(0.18, 1.0, smoothstep(0.7, 2.6, length(vV)));   // a blade swung right past the lens must not bloom into a white wall
  nearFade *= 1.0 - 0.8 * smoothstep(0.8, 0.98, abs(dot(vA, normalize(vV))));   // end-on, the whole blade stacks into one spot: dim it or it blooms into a blob
  gl_FragColor = vec4(c * smoothstep(0.0, 0.02, vY) * nearFade, 1.0);
}`;
SABER.bladeGeo = function () {
  if (SABER._bg) return SABER._bg;
  const nu = 20, nv = 12, nt = 6, P = [], T = [], I = [];
  for (let i = 0; i <= nv + nt; i++) {
    let y, rr, tip;
    if (i <= nv) { y = i / nv; rr = 1; tip = 0; } else { const a = (i - nv) / nt * HALF; y = 1; rr = Math.cos(a); tip = Math.sin(a); }
    for (let j = 0; j <= nu; j++) { const th = TAU * j / nu; P.push(Math.cos(th) * rr, y, Math.sin(th) * rr); T.push(tip); }
  }
  const W = nu + 1;
  for (let i = 0; i < nv + nt; i++) for (let j = 0; j < nu; j++) { const a = i * W + j, b = a + 1, c = a + W + 1, d = a + W; I.push(a, d, c, a, c, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aTip', new THREE.Float32BufferAttribute(T, 1)); g.setIndex(I);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1.5);
  SABER._bg = g; return g;
};
SABER.layer = function (r, i, pow, white, col) {
  const m = new THREE.ShaderMaterial({ vertexShader: SABER.BLADE_VS, fragmentShader: SABER.BLADE_FS,
    uniforms: { uLen: { value: 0 }, uR: { value: r }, uT: { value: 0 }, uCol: { value: new THREE.Color(col[0], col[1], col[2]) }, uI: { value: i }, uPow: { value: pow }, uWhite: { value: white } },
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, toneMapped: false });
  const me = new THREE.Mesh(SABER.bladeGeo(), m); me.frustumCulled = false; me.renderOrder = 5; me.userData.i0 = i; return me;
};
/* trail ribbon: stores (base, tip) samples and draws a fading additive strip */
SABER.TRAIL_VS = `attribute float aAge; attribute float aSide; varying float vAge; varying float vSide; void main(){ vAge = aAge; vSide = aSide; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`;
SABER.TRAIL_FS = `uniform vec3 uCol; uniform float uI; varying float vAge; varying float vSide;
  void main(){ float a = 1.0 - vAge; a = a * a * a; float e1 = smoothstep(0.15, 1.0, vSide); float edge = e1 * e1 * e1 * (0.35 + 0.65 * e1);   // light concentrated at the tip: a streak, not a painted sheet
    vec3 c = mix(uCol, vec3(1.0), 0.45 * a * a * pow(vSide, 6.0)) * uI * a * edge; gl_FragColor = vec4(c, 1.0); }`;
class SaberTrail {
  constructor(col, n) {
    this.N = n || 48; this.buf = []; this.maxAge = 0.11;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.N * 2 * 3); this.age = new Float32Array(this.N * 2); this.side = new Float32Array(this.N * 2);
    for (let i = 0; i < this.N; i++) { this.side[i * 2] = 0; this.side[i * 2 + 1] = 1; }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSide', new THREE.BufferAttribute(this.side, 1));
    const I = []; for (let i = 0; i + 1 < this.N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; I.push(a, c, b, b, c, d); }
    g.setIndex(I); g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: SABER.TRAIL_VS, fragmentShader: SABER.TRAIL_FS, uniforms: { uCol: { value: new THREE.Color(col[0], col[1], col[2]) }, uI: { value: 2.2 } },
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; this.geo = g;
  }
  push(t, base, tip) { this.buf.push({ t, b: base.clone(), p: tip.clone() }); if (this.buf.length > this.N) this.buf.shift(); }
  clear() { this.buf.length = 0; this.geo.setDrawRange(0, 0); }
  update(now, strength) {
    while (this.buf.length && now - this.buf[0].t > this.maxAge) this.buf.shift();
    const n = this.buf.length;
    if (n < 2 || strength <= 0.01) { this.geo.setDrawRange(0, 0); return; }
    for (let i = 0; i < n; i++) {
      const s = this.buf[n - 1 - i], k = i * 2;
      // the inner edge starts 35% up the blade: the trail is the sweep of the outer blade
      const bx = lerp(s.b.x, s.p.x, 0.55), by = lerp(s.b.y, s.p.y, 0.55), bz = lerp(s.b.z, s.p.z, 0.55);
      this.pos[k * 3] = bx; this.pos[k * 3 + 1] = by; this.pos[k * 3 + 2] = bz;
      this.pos[k * 3 + 3] = s.p.x; this.pos[k * 3 + 4] = s.p.y; this.pos[k * 3 + 5] = s.p.z;
      const a = sat((now - s.t) / this.maxAge); this.age[k] = a; this.age[k + 1] = a;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aAge.needsUpdate = true;
    this.geo.setDrawRange(0, (n - 1) * 6);
    this.mat.uniforms.uI.value = 0.8 * strength;
  }
}
/* a complete saber: hilt group + blades + trails + lights. Place `group` (hilt centre, +Y blade axis). */
class Saber {
  constructor(kind, color, opt) {
    opt = opt || {};
    this.kind = kind; this.col = SABER.COL[color] || SABER.COL.red; this.colName = color;
    this.group = new THREE.Group();
    this.hilt = kind === 'staff' ? SABER.buildStaff() : SABER.buildSingle(kind);
    this.group.add(this.hilt);
    this.ends = this.hilt.userData.ends; this.len = opt.len || 0.92; this.ign = this.ends.map(() => 0); this.ignT = this.ends.map(() => 0);
    this.blades = []; this.trails = []; this.lights = [];
    const c = this.col;
    for (let i = 0; i < this.ends.length; i++) {
      const bg = new THREE.Group(); bg.position.y = this.ends[i]; if (this.ends[i] < 0) bg.rotation.z = Math.PI;
      const layers = [SABER.layer(0.0072, 6.0, 0.35, 0.92, c), SABER.layer(0.0125, 2.6, 1.1, 0.12, c), SABER.layer(0.027, 0.75, 2.0, 0.0, c), SABER.layer(0.06, 0.13, 3.0, 0.0, c)];
      for (const l of layers) bg.add(l);
      this.group.add(bg); this.blades.push({ g: bg, layers });
      const tr = new SaberTrail(c); this.trails.push(tr);
      const L = R.addLight({ pos: new THREE.Vector3(), col: new THREE.Color(c[0], c[1] * 0.9 + 0.02, c[2] * 0.9 + 0.02), i: 0, range: 4.8, prio: opt.prio || 3, on: true, persist: true });
      this.lightK = Math.min(1, 0.3 / Math.max(0.05, 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]));   // green would otherwise flood everything
      this.lights.push(L);
    }
    this.flick = 1; this.trailOn = 0;
    this._b = new THREE.Vector3(); this._t = new THREE.Vector3();
  }
  addTo(scene) { scene.add(this.group); for (const t of this.trails) scene.add(t.mesh); }
  remove() { if (this.group.parent) this.group.parent.remove(this.group); for (const t of this.trails) if (t.mesh.parent) t.mesh.parent.remove(t.mesh); for (const L of this.lights) R.removeLight(L); }
  ignite(which, on) { for (let i = 0; i < this.ends.length; i++) if (which === undefined || which === i) this.ignT[i] = on ? 1 : 0; }
  setVisible(v) { this.group.visible = v; if (!v) for (const t of this.trails) t.clear(); for (const L of this.lights) L.on = v; }
  /* world base / tip of blade i */
  bladeSeg(i, base, tip) {
    const e = this.ends[i], sg = e >= 0 ? 1 : -1, m = this.group.matrixWorld;
    base.set(0, e, 0).applyMatrix4(m); tip.set(0, e + sg * this.len * this.ign[i], 0).applyMatrix4(m);
  }
  update(dt, now) {
    this.flick = 1 + 0.02 * Math.sin(now * 47) + 0.012 * Math.sin(now * 113.3 + 1.3);
    for (let i = 0; i < this.ends.length; i++) {
      const tgt = this.ignT[i];
      this.ign[i] = tgt > this.ign[i] ? Math.min(tgt, this.ign[i] + dt * 5.5) : Math.max(tgt, this.ign[i] - dt * 4);
      const b = this.blades[i], L = this.len * easeOut(this.ign[i]);
      for (const l of b.layers) { l.material.uniforms.uLen.value = L; l.material.uniforms.uI.value = l.userData.i0 * this.flick; l.visible = this.ign[i] > 0.002 && this.group.visible; }
    }
    this.group.updateMatrixWorld(true);
    for (let i = 0; i < this.ends.length; i++) {
      this.bladeSeg(i, this._b, this._t);
      const Ls = this.lights[i]; Ls.pos.copy(this._b).lerp(this._t, 0.5); Ls.i = this.ign[i] > 0.01 && this.group.visible ? 1.5 * (this.lightK || 1) * this.ign[i] * this.flick : 0;
    }
  }
  /* record trail samples, subdividing between the previous and current transform so fast spins stay round */
  sampleTrails(now, strength) {
    this.trailOn = strength;
    for (let i = 0; i < this.ends.length; i++) {
      this.bladeSeg(i, this._b, this._t);
      const tr = this.trails[i], last = tr.buf[tr.buf.length - 1];
      if (strength > 0.01 && this.ign[i] > 0.5) {
        if (last && now - last.t < 0.06) {
          const steps = 4;
          for (let s = 1; s < steps; s++) {
            const f = s / steps;
            // interpolate around the hilt centre: lerp base, and rotate the blade direction
            const c0 = last.b, c1 = this._b, b = c0.clone().lerp(c1, f);
            const d0 = last.p.clone().sub(last.b), d1 = this._t.clone().sub(this._b), L0 = d0.length(), L1 = d1.length();
            const q = new THREE.Quaternion().setFromUnitVectors(d0.normalize(), d1.normalize()); const qf = new THREE.Quaternion().slerp(q, f);
            const dir = d0.applyQuaternion(qf).multiplyScalar(lerp(L0, L1, f));
            tr.push(lerp(last.t, now, f), b, b.clone().add(dir));
          }
        }
        tr.push(now, this._b, this._t);
      }
      tr.update(now, strength);
    }
  }
}
