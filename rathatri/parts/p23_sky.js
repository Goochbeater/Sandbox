/* SKY — per-world skies and far scenery: Coruscant night (dome, endless lit towers, air traffic, Jedi Temple),
   Tatooine day (twin suns, haze), Naboo (warm dusk). Each returns an env scene for PMREM. */
const SKY = {};
SKY.dome = function (U, frag) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `varying vec3 vD; uniform float uT;
      float h21(vec2 p){ p = fract(p*vec2(233.34, 851.73)); p += dot(p, p+23.45); return fract(p.x*p.y); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      float fb(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*n2(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
      ${frag}` });
  const me = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), m); me.renderOrder = -10; me.frustumCulled = false;
  return me;
};
SKY.coruscant = function (L, o) {
  o = o || {};
  const sd = (o.sunDir || new THREE.Vector3(-0.35, 0.07, 1)).clone().normalize();
  const U = { uT: { value: 0 }, uGlow: { value: new THREE.Color(1.25, 0.5, 0.2) }, uSun: { value: sd } };
  const dome = SKY.dome(U, `uniform vec3 uGlow; uniform vec3 uSun;
    void main(){
      vec3 d = normalize(vD); float el = d.y; float sdot = max(dot(d, uSun), 0.0);
      vec3 zen = vec3(0.025, 0.03, 0.085), mid = vec3(0.32, 0.12, 0.13), hor = uGlow;
      vec3 c = mix(hor, mid, smoothstep(-0.02, 0.2, el)); c = mix(c, zen, smoothstep(0.15, 0.75, el));
      c = mix(c, hor * 0.55, 1.0 - smoothstep(-0.35, 0.0, el));
      c += vec3(1.4, 0.55, 0.18) * pow(sdot, 6.0) * 0.8 + vec3(2.2, 1.0, 0.4) * pow(sdot, 40.0);
      c += vec3(26.0, 14.0, 6.0) * smoothstep(0.9993, 0.9997, sdot);
      // long cloud bands, lit gold from the low sun
      vec2 cp = d.xz / max(0.08, el + 0.14) * 1.4 + vec2(uT * 0.008, 0.0);
      float cl = smoothstep(0.42, 0.82, fb(cp * vec2(0.5, 1.6)));
      vec3 ccol = mix(vec3(0.16, 0.06, 0.08), vec3(1.4, 0.6, 0.25), pow(sdot, 3.0) * 0.8 + 0.2 * (1.0 - smoothstep(0.0, 0.3, el)));
      c = mix(c, ccol, cl * smoothstep(0.015, 0.09, el) * 0.85);
      float st = step(0.9986, h21(floor(d.xy * 900.0 + d.z * 300.0))) * smoothstep(0.35, 0.7, el) * (1.0 - cl);
      c += vec3(st) * 0.8;
      gl_FragColor = vec4(c, 1.0);
    }`);
  L.updates.push((dt, t) => { U.uT.value = t; });
  const grp = new THREE.Group(); grp.add(dome);
  // ---- far towers (instanced, world-projected window texture)
  const R0 = o.r0 || 70, R1 = o.r1 || 760, N = o.n || 900, rs = MG.rs('cor' + (o.seed || 1));
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const set = TEX.sets.towerWin;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: set.map, emissiveMap: set.emissiveMap, emissive: new THREE.Color(1.0, 0.85, 0.7), emissiveIntensity: 1.5, roughness: 0.6, metalness: 0.2, envMapIntensity: 0.4 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying float vSeed;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ mat4 im = modelMatrix * instanceMatrix; vWP = (im * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(im) * objectNormal); vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453); }');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying float vSeed;')
      .replace('#include <map_fragment>', `vec2 wuv = (abs(vWN.x) > 0.5 ? vWP.zy : vWP.xy) / 24.0 + vec2(vSeed * 7.0, vSeed * 13.0);
        float roof = step(0.5, abs(vWN.y));
        vec4 texelColor = texture2D(map, wuv);
        float fy = fract(vWP.y / (14.0 + vSeed * 10.0) + vSeed), ledge = step(0.9, fy);
        float fx = fract((abs(vWN.x) > 0.5 ? vWP.z : vWP.x) / (9.0 + vSeed * 8.0) + vSeed * 3.0), pier = step(0.86, fx) * step(0.5, fract(vSeed * 7.3));
        diffuseColor.rgb *= mix(mix(texelColor.rgb, vec3(0.1, 0.095, 0.1), max(ledge, pier)), vec3(0.06), roof);`)
      .replace('#include <emissivemap_fragment>', `vec3 em = texture2D(emissiveMap, wuv).rgb * (1.0 - roof) * (1.0 - max(ledge, pier)); em *= 0.6 + 0.8 * vSeed;
        em += vec3(1.6, 0.8, 0.45) * step(0.985, fy) * step(0.7, fract(vSeed * 11.0)) * (1.0 - roof);
        totalEmissiveRadiance *= em;`);
  };
  mat.customProgramCacheKey = () => 'tower';
  const im = new THREE.InstancedMesh(geo, mat, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const keep = o.keepOut || [];
  let n = 0;
  for (let i = 0; i < N * 3 && n < N; i++) {
    const a = rs() * TAU, r = R0 + Math.pow(rs(), 0.7) * (R1 - R0);
    const x = Math.cos(a) * r + (o.cx || 0), z = Math.sin(a) * r + (o.cz || 0);
    if (keep.some((k) => Math.abs(x - k[0]) < k[2] && Math.abs(z - k[1]) < k[3])) continue;
    const w = 12 + rs() * 30, d = 12 + rs() * 30, top = (o.base || 0) + (rs() < 0.15 ? 60 + rs() * 260 : -40 + rs() * 110) * (0.4 + r / R1);
    p.set(x, -500, z); s.set(w, top + 500, d); q.setFromAxisAngle(YUP, rs() * PI);
    m4.compose(p, q, s); im.setMatrixAt(n++, m4);
  }
  im.count = n; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
  grp.add(im);
  // tower crowns: setbacks, crowns with spires, stepped tops (fixed absolute size, sat on the trunk tops)
  const caps = SKY.capGeos(), capIm = caps.map((g) => new THREE.InstancedMesh(g, mat, n)), capN = caps.map(() => 0);
  for (let i = 0; i < n; i++) {
    im.getMatrixAt(i, m4); m4.decompose(p, q, s);
    const ty = rs() * 4 | 0; if (ty === 3) continue;
    const top = p.y + s.y, ch = Math.min(s.x, s.z) * (0.9 + rs() * 1.4);
    p.y = top; m4.compose(p, q, V3(s.x, ch, s.z)); capIm[ty].setMatrixAt(capN[ty]++, m4);
  }
  capIm.forEach((c, i) => { c.count = capN[i]; c.frustumCulled = false; grp.add(c); });
  // spires + beacons on the tallest few
  const beaconMat = KIT.emis(0xff2a14, 8); const bg = new THREE.SphereGeometry(1.2, 8, 6);
  const bIm = new THREE.InstancedMesh(bg, beaconMat, 60); let bn = 0;
  for (let i = 0; i < n && bn < 60; i++) { im.getMatrixAt(i, m4); m4.decompose(p, q, s); if (s.y - 500 > 90) { p.y = s.y - 500 + 2; m4.compose(p, q, V3(1, 1, 1)); bIm.setMatrixAt(bn++, m4); } }
  bIm.count = bn; bIm.frustumCulled = false; grp.add(bIm);
  // ---- Jedi Temple on the horizon (ziggurat + five spires)
  const jt = new THREE.Group(), jm = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.7, emissive: 0x201810, emissiveIntensity: 1 });
  const zig = new THREE.Mesh(new THREE.CylinderGeometry(60, 110, 120, 4), jm); zig.rotation.y = PI / 4; zig.position.y = 60; jt.add(zig);
  for (const [dx, dz, h] of [[0, 0, 160], [45, 45, 110], [-45, 45, 110], [45, -45, 110], [-45, -45, 110]]) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(3, 12, h, 8), jm); sp.position.set(dx, 120 + h / 2, dz); jt.add(sp); const b = new THREE.Mesh(bg, KIT.emis(0xffe0b0, 6)); b.position.set(dx, 120 + h + 2, dz); jt.add(b); }
  jt.position.set((o.cx || 0) + (o.templeX || -620), -40, (o.cz || 0) + (o.templeZ || 520)); grp.add(jt);
  // the Galactic Senate: a vast mushroom dome on a slender stem, a ring of lit windows under the rim
  const sen = new THREE.Group(), sm = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.5, metalness: 0.3, emissive: 0x151820, emissiveIntensity: 1 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(110, 48, 18, 0, TAU, 0, HALF * 0.62), sm); cap.scale.y = 0.45; cap.position.y = 60; sen.add(cap);
  const under = new THREE.Mesh(new THREE.SphereGeometry(110, 48, 12, 0, TAU, HALF * 1.35, HALF * 0.65), sm); under.scale.y = 0.45; under.position.y = 60; sen.add(under);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(34, 50, 140, 32), sm); stem.position.y = -10; sen.add(stem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(104, 2.2, 6, 64), KIT.emis(0xffe0b0, 3)); ring.rotation.x = HALF; ring.position.y = 55; sen.add(ring);
  sen.position.set((o.cx || 0) + (o.senateX || 480), -20, (o.cz || 0) + (o.senateZ || 620)); grp.add(sen);
  // ---- air traffic: skylanes of speeders, animated entirely on the GPU
  grp.add(SKY.traffic(L, o, rs));
  LEVEL.add(grp);
  // env scene: the dome + a warm glow band
  const env = new THREE.Scene(); env.add(new THREE.Mesh(dome.geometry, dome.material));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(300, 300, 60, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.6, 0.3), side: THREE.BackSide }));
  band.position.y = -20; env.add(band);
  L.env = env;
  R.scene.fog = new THREE.FogExp2(new THREE.Color(0.36, 0.17, 0.12), o.fog || 0.0026);
  return grp;
};

/* crowns for the far towers, unit footprint (x,z in -0.5..0.5), y 0..1 = cap height */
SKY.capGeos = function () {
  const merge = (parts) => {
    const P = [], Nn = [];
    for (const [g, x, y, z] of parts) { g.translate(x, y, z); const ng = g.index ? g.toNonIndexed() : g; P.push(...ng.attributes.position.array); Nn.push(...ng.attributes.normal.array); }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(P.length / 3 * 2), 2)); return out;
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  return [
    merge([[B(0.8, 0.45, 0.8), 0, 0, 0], [B(0.9, 0.03, 0.9), 0, 0.45, 0], [B(0.58, 0.35, 0.58), 0, 0.48, 0], [B(0.36, 0.2, 0.36), 0, 0.83, 0]]),
    merge([[B(1.08, 0.04, 1.08), 0, 0, 0], [B(0.9, 0.3, 0.9), 0, 0.04, 0], [B(1.02, 0.05, 1.02), 0, 0.34, 0], [new THREE.CylinderGeometry(0.03, 0.09, 1.6, 6).translate(0, 0.8, 0), 0, 0.39, 0]]),
    merge([[B(0.86, 0.22, 0.86), 0, 0, 0], [B(0.68, 0.2, 0.68), 0, 0.22, 0], [B(0.5, 0.2, 0.5), 0, 0.42, 0], [B(0.3, 0.2, 0.3), 0, 0.62, 0], [new THREE.CylinderGeometry(0.015, 0.04, 0.9, 5).translate(0, 0.45, 0), 0.08, 0.82, 0.05]]),
  ];
};
/* skylanes: straight corridors of speeders crossing the city, stacked in pairs of opposing streams */
SKY.traffic = function (L, o, rs) {
  const corridors = o.corridors || 34, perLane = o.perLane || 36;
  const A = [], Bv = [];
  for (let c = 0; c < corridors; c++) {
    const ang = rs() * PI, rr = 110 + rs() * 380, a0 = rs() * TAU;
    let ox = (o.cx || 0) + Math.cos(a0) * rr, oz = (o.cz || 0) + Math.sin(a0) * rr; const y = (o.base || 0) + (rs() - 0.35) * 140;
    const len = 1100, sp = 26 + rs() * 30;
    { const cx = o.cx || 0, cz = o.cz || 0, nx = Math.cos(ang), nz = -Math.sin(ang), dd = (ox - cx) * nx + (oz - cz) * nz; if (Math.abs(dd) < 90) { const k = (dd < 0 ? -90 : 90) - dd; ox += nx * k; oz += nz * k; } }
    for (let lane = 0; lane < 4; lane++) {
      const dir = lane % 2 ? 1 : -1, off = (lane - 1.5) * 7, dy = (lane >> 1) * 6;
      const lx = ox + Math.cos(ang) * off, lz = oz - Math.sin(ang) * off;
      for (let j = 0; j < perLane; j++) { A.push(lx, y + dy, lz, ang + (dir < 0 ? PI : 0)); Bv.push(sp * (0.85 + rs() * 0.3), rs() * len, len, rs()); }
    }
  }
  const n = A.length / 4;
  const g = new THREE.InstancedBufferGeometry(); const bx = new THREE.BoxGeometry(1, 1, 1);
  g.index = bx.index; g.setAttribute('position', bx.attributes.position);
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(Bv), 4));
  g.instanceCount = n;
  const fogC = new THREE.Color(0.36, 0.17, 0.12);
  const m = new THREE.ShaderMaterial({ toneMapped: false, fog: false,
    uniforms: { uT: { value: 0 }, uFog: { value: fogC }, uDen: { value: o.fog || 0.0026 } },
    vertexShader: `attribute vec4 aA, aB; uniform float uT; varying vec3 vC; varying float vD;
      void main(){
        vec3 dir = vec3(sin(aA.w), 0.0, cos(aA.w));
        float s = mod(aB.y + uT * aB.x, aB.z) - aB.z * 0.5;
        vec3 base = vec3(aA.x, aA.y + sin(uT * 0.7 + aB.w * 40.0) * 0.6, aA.z) + dir * s;
        vec3 lp = position * vec3(1.5, 0.7, 4.2);
        vec3 side = vec3(dir.z, 0.0, -dir.x);
        vec3 wp = base + side * lp.x + vec3(0.0, lp.y, 0.0) + dir * lp.z;
        float front = step(0.0, position.z), lit = step(0.3, abs(position.z)) * step(-0.2, position.y);
        vC = mix(vec3(0.02, 0.02, 0.025), mix(vec3(3.0, 0.2, 0.1), vec3(2.6, 2.3, 1.8), front) * (0.5 + 0.7 * aB.w), lit);
        vec4 mv = viewMatrix * vec4(wp, 1.0); vD = length(mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uFog; uniform float uDen; varying vec3 vC; varying float vD;
      void main(){ float f = exp(-uDen * uDen * vD * vD * 0.6); gl_FragColor = vec4(mix(uFog * 1.4, vC, f), 1.0); }` });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false;
  L.updates.push((dt, t) => { m.uniforms.uT.value = t; });
  return me;
};
