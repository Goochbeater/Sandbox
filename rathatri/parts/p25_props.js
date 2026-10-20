/* PROPS — hero set pieces built from lathes and boxes: N-1 starfighter, the Sith Infiltrator, speeder bike,
   moisture vaporators, Naboo lamps, cargo crates. Each returns a Group (world units, +Z forward). */
const PROPS = {};
PROPS.m = function (key, o) { PROPS._m = PROPS._m || {}; if (PROPS._m[key]) return PROPS._m[key]; const m = new THREE.MeshStandardMaterial(o); PROPS._m[key] = m; return m; };
PROPS.lathe = function (prof, seg, mat) { const g = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), seg || 32); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };
/* sculpted hard-surface prop: build(grp) adds SDF items to material groups (grp(matIndex, k) -> {add, both}); meshed once at
   resolution res inside box and cached by key. Returns a BufferGeometry with one draw group per material index. */
PROPS.sdfMesh = function (key, build, box, res) {
  PROPS._sdf = PROPS._sdf || {}; if (PROPS._sdf[key]) return PROPS._sdf[key];
  const G = [], grp = (mat, k) => { const items = []; G.push({ items, op: 'su', k: k || 0.01, mat }); return SCULPT.it(items); };
  build(grp);
  const f = SDF.compile(G);
  let m = MESH.nets(f, box, res); m = MESH.largest(m, 200);
  const A = MESH.fieldAttrs(f, m.pos, m.nv), gf = f.groups, matOf = new Uint8Array(m.nv);
  for (let v = 0; v < m.nv; v++) { const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2]; let best = 0, bd = 1e9; for (let i = 0; i < gf.length; i++) { const d = gf[i](x, y, z); if (d < bd) { bd = d; best = i; } } matOf[v] = G[best].mat; }
  const g = MESH.geometry(m.pos, m.idx, A.nrm, { aAO: new THREE.BufferAttribute(A.ao, 1) });
  CHAR.groupByMat(g, matOf, m.idx);
  PROPS._sdf[key] = g; return g;
};
/* Naboo N-1 starfighter (≈11 m): yellow forward fuselage, chrome nose + engine cowls, long tail spike */
PROPS.n1 = function () {   // forward = -Z. Sculpted hull (fuselage, wing roots and nacelles blend smoothly), chrome nose + cowls
  const g = new THREE.Group();
  const yel = PROPS._n1y || (PROPS._n1y = new THREE.MeshPhysicalMaterial({ color: 0xe8b12a, metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 }));
  const chr = PROPS.m('n1c2', { color: 0xd8dce2, metalness: 1.0, roughness: 0.08, envMapIntensity: 1.5 });
  const dk = PROPS.m('n1d', { color: 0x2a2a2e, metalness: 0.6, roughness: 0.4 });
  const glass = PROPS.m('n1g', { color: 0x14202c, metalness: 0.7, roughness: 0.04, envMapIntensity: 2 });
  const hull = PROPS.sdfMesh('n1', (grp) => {
    const Y = grp(0, 0.15), C = grp(1, 0.015), D = grp(2, 0.01);
    Y.add(SDF.ell([0, 0, -0.4], [1.08, 0.6, 3.1]));
    Y.add(SDF.rcone([0, 0.04, 1.9], [0, 0.06, 6.4], 0.5, 0.03), 'su', 0.5);
    Y.add(SDF.ell([0, 0.36, -1.1], [0.52, 0.3, 1.2]), 'su', 0.25);
    Y.both(SDF.box([1.45, -0.06, 0.45], [0.75, 0.075, 0.72], 0.05, SDF.rot(0, 10, -3)), 'su', 0.22);
    Y.both(SDF.rcone([2.25, -0.06, -1.2], [2.25, -0.06, 1.7], 0.56, 0.44), 'su', 0.12);
    Y.both(SDF.rcone([2.25, -0.06, 1.7], [2.25, -0.06, 4.7], 0.44, 0.025), 'su', 0.2);
    C.add(SDF.rcone([0, 0.0, -3.35], [0, -0.02, -5.7], 0.52, 0.02));
    C.both(SDF.rcone([2.25, -0.06, -1.15], [2.25, -0.06, -2.55], 0.575, 0.2));
    D.add(SDF.ell([0, 0.5, 0.35], [0.3, 0.13, 0.3]));   // astromech socket
  }, [-2.95, -0.75, -5.8, 2.95, 0.85, 6.5], 0.05);
  const h = new THREE.Mesh(hull, [yel, chr, dk]); g.add(h);
  // crisp separate details: nacelle fins, seam rings where chrome meets paint, intake grilles, cockpit vents
  const ext = (pts, depth, bev) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2 }); eg.translate(0, 0, -depth / 2); eg.rotateY(-HALF); return eg; };
  for (const s of [1, -1]) {
    const fin = new THREE.Mesh(ext([[1.1, 0.0], [2.7, 0.0], [2.85, 0.32], [1.75, 0.3]], 0.04, 0.012), yel); fin.position.set(s * 2.25, 0.4, 0); g.add(fin);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.566, 0.022, 8, 40), dk); ring.position.set(s * 2.25, -0.06, -1.16); g.add(ring);
    const gr = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20), dk); gr.position.set(s * 2.25, -0.06, -2.56); gr.rotation.y = PI; g.add(gr);
    for (let k = 0; k < 3; k++) { const v = new THREE.Mesh(KIT.chamferGeo(0.02, 0.012, 0.13, 0.006), dk); v.position.set(s * 0.72, 0.28 - k * 0.05, -2.3); v.rotation.z = s * 0.5; g.add(v); }
  }
  { const nr = new THREE.Mesh(new THREE.TorusGeometry(0.515, 0.02, 8, 40), dk); nr.position.set(0, 0.0, -3.33); nr.scale.set(1, 1.0, 1); g.add(nr); }
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 16, 0, TAU, 0, HALF), glass); can.position.set(0, 0.42, -1.35); can.scale.set(0.82, 0.62, 1.75); g.add(can);
  const cf = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 40), dk); cf.position.set(0, 0.42, -1.35); cf.rotation.x = HALF; cf.scale.set(0.82, 1.75, 1); g.add(cf);
  // astromech: white body, silver dome, blue panels
  const r2b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 20), PROPS.m('r2w', { color: 0xe8e8ea, roughness: 0.35, metalness: 0.1 })); r2b.position.set(0, 0.58, 0.35); g.add(r2b);
  const r2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 10, 0, TAU, 0, HALF), PROPS.m('r2s', { color: 0xc8ccd4, roughness: 0.2, metalness: 1.0 })); r2.position.set(0, 0.73, 0.35); g.add(r2);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.02), PROPS.m('r2p', { color: 0x1a4aa8, roughness: 0.3 })); p.position.set(Math.sin(a) * 0.22, 0.81, 0.35 + Math.cos(a) * 0.22); p.lookAt(0, 0.81, 0.35); g.add(p); }
  // twin cannons + engine glow
  for (const s of [1, -1]) {
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.6, 10), dk); gun.rotation.x = HALF; gun.position.set(s * 0.72, -0.16, -3.2); g.add(gun);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 10), chr); tip.rotation.x = HALF; tip.position.set(s * 0.72, -0.16, -4.5); g.add(tip);
    const ex = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), KIT.emis(0x5a8aff, 1.2)); ex.position.set(s * 2.25, -0.06, 1.2); ex.visible = false; g.add(ex);
  }
  // landing gear: raked struts with oleo sleeves and broad pads
  for (const [x, z] of [[0, -2.4], [1.1, 1.0], [-1.1, 1.0]]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.25, 10), dk); st.position.set(x, -0.72, z); st.rotation.x = z < 0 ? 0.12 : -0.12; g.add(st);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.4, 10), chr); sl.position.set(x, -0.45, z); g.add(sl);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 16), dk); pad.position.set(x, -1.32, z + (z < 0 ? -0.08 : 0.08)); g.add(pad);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
};
/* Naboo standing lamp: slender column with a glowing globe */
PROPS.nabooLamp = function (mat) {
  const g = new THREE.Group(); const c = PROPS.lathe([[0.25, 0], [0.18, 0.1], [0.08, 0.2], [0.07, 2.4], [0.12, 2.5], [0.05, 2.6]], 16, mat || PROPS.m('brass', { color: 0xc8a060, metalness: 1, roughness: 0.3 }));
  g.add(c); const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), KIT.emis(0xffe0b0, 4)); b.position.y = 2.78; g.add(b); return g;
};
/* moisture vaporator (Tatooine) */
PROPS.vaporator = function () {
  const g = new THREE.Group(), m = PROPS.m('vap', { color: 0x9a948a, metalness: 0.6, roughness: 0.5 }), d = PROPS.m('vapd', { color: 0x4a4640, metalness: 0.5, roughness: 0.6 });
  g.add(PROPS.lathe([[0.45, 0], [0.4, 0.3], [0.22, 0.4], [0.2, 2.2], [0.3, 2.3], [0.3, 2.6], [0.12, 2.7], [0.1, 3.8], [0.05, 3.9]], 18, m));
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 18), d); r.rotation.x = HALF; r.position.y = 1.0 + i * 0.4; g.add(r); }
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.3), m); const a = i / 3 * TAU; f.position.set(Math.cos(a) * 0.32, 3.2, Math.sin(a) * 0.32); f.rotation.y = -a; g.add(f); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
};
/* Sith Infiltrator "Scimitar": central hull with a large folded wing arc */
PROPS.arcPanel = function (cx, cy, r, a0, a1, z0, z1, mat, n) {   // curved plate (arc in XY, extruded along Z)
  n = n || 16; const P = [], I = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, t = 1 - Math.abs((i / n) - 0.5) * 0.35; P.push(x, y, lerp(z0, z1, 0.5) - (z1 - z0) * 0.5 * t, x, y, lerp(z0, z1, 0.5) + (z1 - z0) * 0.5 * t); }
  for (let i = 0; i < n; i++) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); return m;
};
PROPS.scimitar = function () {   // Sith Infiltrator, landed: raised hull, round-eyed nose pod, the great wing folded down to the sand
  const g = new THREE.Group();
  const hullT = TEX.sets.hull ? TEX.mat('hull', { color: 0x464952, metal: 0.35, rough: 0.38, env: 0.6, macro: 1.2, streak: 0.6 }) : PROPS.m('scim', { color: 0x34363c, metalness: 0.75, roughness: 0.32 });
  const hullD = TEX.sets.hull ? TEX.mat('hull', { color: 0x141518, metal: 0.4, rough: 0.5, env: 0.6 }) : PROPS.m('scimd', { color: 0x16171a, metalness: 0.6, roughness: 0.5 });
  const wing = TEX.sets.hull ? TEX.mat('hull', { color: 0x383a42, metal: 0.35, rough: 0.36, env: 0.6, side: THREE.DoubleSide }) : PROPS.m('scimw', { color: 0x2a2c31, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide });
  const glass = PROPS.m('scimg2', { color: 0x0a0406, metalness: 0.9, roughness: 0.03, envMapIntensity: 2.0, emissive: 0x2a0402 });
  const add = (m) => { g.add(m); return m; };
  // hull: one sculpted body — the nose pod swells out of it, a raised dorsal spine, engine housings blended in at the tail
  const sculpt = PROPS.sdfMesh('scimitar', (grp) => {
    const Hh = grp(0, 0.5), D = grp(1, 0.03);
    Hh.add(SDF.ell([0, 1.2, 0.5], [2.5, 1.3, 8.4]));
    Hh.add(SDF.ell([0, 1.45, -8.1], [1.52, 1.28, 1.45]), 'su', 1.1);
    Hh.add(SDF.ell([0, 2.2, 1.2], [0.75, 0.75, 6.8]), 'su', 0.6);
    Hh.both(SDF.rcone([1.3, 1.2, 6.5], [1.3, 1.2, 9.0], 0.72, 0.62), 'su', 0.5);
    Hh.both(SDF.ell([1.9, 1.5, -2.0], [0.55, 0.35, 3.2]), 'su', 0.4);
    Hh.add(SDF.box([0, -0.5, 0.5], [3.5, 0.7, 12.0], 0.0), 'ss', 0.3);
    D.add(SDF.ell([0, 1.45, -7.05], [1.42, 1.2, 0.08]));
    D.both(SDF.ell([1.3, 1.2, 9.0], [0.64, 0.64, 0.1]), 'su', 0.02);
  }, [-3.2, -0.3, -9.8, 3.2, 3.3, 9.4], 0.06);
  add(new THREE.Mesh(sculpt, [hullT, hullD]));
  for (const sx of [-1, 1]) { const st = add(new THREE.Mesh(KIT.chamferGeo(0.5, 0.18, 5.5, 0.06), hullD)); st.position.set(sx * 1.55, 2.05, 2.2); st.rotation.z = sx * 0.35; }
  // the two round viewports on the pod
  const collar = add(new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 10, 48), hullD)); collar.position.set(0, 1.45, -7.05); collar.scale.set(1.08, 0.9, 1);
  for (const sx of [-1, 1]) {
    const vp = add(new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 14, 0, TAU, 0, HALF), glass)); vp.rotation.x = -HALF; vp.scale.set(1, 0.35, 1); vp.position.set(sx * 0.55, 1.6, -9.5);
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.07, 8, 28), hullD)); rim.position.set(sx * 0.55, 1.6, -9.44);
  }
  // the great wing: two folded halves with thick edges, ribs and emitter nodes
  for (const s of [1, -1]) {
    const a0 = s > 0 ? HALF * 0.95 : HALF * 1.05, a1 = s > 0 ? -0.05 : PI + 0.05;
    add(PROPS.arcPanel(0, -2.0, 3.9, a0, a1, -2.5, 9.5, wing, 28));
    add(PROPS.arcPanel(0, -2.0, 3.72, a0, a1, -2.2, 9.2, wing, 28));
    for (const z of [-2.35, 9.35]) { const tr = add(new THREE.Mesh(new THREE.TorusGeometry(3.82, 0.13, 8, 24, Math.abs(a1 - a0)), hullD)); tr.position.set(0, -2.0, z); tr.rotation.z = Math.min(a0, a1); }
    for (let k = 1; k < 6; k++) { const a = lerp(a0, a1, k / 6); const rib = add(new THREE.Mesh(KIT.chamferGeo(0.09, 0.06, 5.6, 0.02), hullD)); rib.position.set(Math.cos(a) * 3.95, -2.0 + Math.sin(a) * 3.95, 3.5); rib.rotation.z = a + HALF; }
    const node = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), KIT.emis(0xff3018, 5))); node.position.set(Math.cos(lerp(a0, a1, 0.08)) * 4.05, -2.0 + Math.sin(lerp(a0, a1, 0.08)) * 4.05, 9.55);
    // engines
    const ex = add(new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), KIT.emis(0x5a1008, 1.0))); ex.position.set(s * 1.3, 1.2, 9.12);
    for (let k = 0; k < 4; k++) { const v = add(new THREE.Mesh(KIT.chamferGeo(0.04, 0.2, 0.5, 0.015), hullD)); v.position.set(s * (2.25 - k * 0.02), 1.5, -3 + k * 0.7); v.rotation.z = s * 0.4; }
  }
  // lowered ramp, lit red from inside
  const ramp = add(new THREE.Mesh(KIT.chamferGeo(1.1, 0.08, 2.6, 0.04), hullD)); ramp.position.set(0, -0.35, -2.2); ramp.rotation.x = 0.45;
  const inner = add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), KIT.emis(0xff2a14, 1.8))); inner.position.set(0, 0.55, 0.3); inner.rotation.x = -HALF + 0.4;
  // antennae + sensor dome
  const ant = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 2.2, 6), hullD)); ant.position.set(0.3, 3.9, 6.5); ant.rotation.x = 0.5;
  const dome = add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10, 0, TAU, 0, HALF), hullD)); dome.position.set(0, 2.85, -4.5);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.rampLight = [0, 0.8, 0.5];
  return g;
};
/* Bloodfin speeder bike (≈4.1 m, forward = +Z, origin at the hover centre, metres). The hull is an SDF sculpture
   (smooth bodywork: long nose, cowl, leg fairings, a narrow waist under the saddle so a rider can straddle it) meshed once
   and cached; fin, vanes, bars and engine are crisp separate parts. userData carries the rider anchors. */
PROPS.bloodfinHull = function () {
  if (PROPS._bfHull) return PROPS._bfHull;
  const G = [], grp = (mat, k) => { const items = []; G.push({ items, op: 'su', k, mat }); return SCULPT.it(items); };
  const P = grp(0, 0.06), S = grp(1, 0.03), B = grp(2, 0.02);
  P.add(SDF.ell([0, 0.01, 0.9], [0.21, 0.13, 0.98]));
  P.add(SDF.rcone([0, -0.01, 1.45], [0, -0.05, 2.42], 0.12, 0.018), 'su', 0.14);
  P.add(SDF.ell([0, -0.02, -0.3], [0.135, 0.12, 0.6]), 'su', 0.12);
  P.add(SDF.ell([0, 0.04, -1.08], [0.2, 0.15, 0.55]), 'su', 0.12);
  P.add(SDF.rcone([0, 0.06, -1.3], [0, 0.09, -1.6], 0.17, 0.152), 'su', 0.08);
  P.add(SDF.ell([0, 0.15, 0.42], [0.15, 0.1, 0.36]), 'su', 0.08);
  P.both(SDF.ell([0.185, -0.02, 0.4], [0.085, 0.1, 0.46], SDF.rot(0, 0, -8)), 'su', 0.07);
  P.add(SDF.box([0, -0.27, 0.2], [0.6, 0.1, 2.8], 0.0), 'ss', 0.05);                 // flat belly
  P.add(SDF.box([0, 0.26, 1.35], [0.3, 0.08, 0.5], 0.0, SDF.rot(-7, 0, 0)), 'ss', 0.08);   // a crease along the nose
  S.add(SDF.ell([0, 0.12, -0.33], [0.14, 0.072, 0.35]));
  S.add(SDF.ell([0, 0.19, -0.68], [0.12, 0.075, 0.09]), 'su', 0.05);
  B.add(SDF.box([0, -0.15, 0.45], [0.055, 0.035, 1.05], 0.02));
  B.both(SDF.rcone([0.2, 0.03, 0.98], [0.215, 0.02, 1.38], 0.052, 0.042), 'su', 0.01);
  B.add(SDF.rcone([0, 0.085, -1.56], [0, 0.09, -1.67], 0.165, 0.165), 'su', 0.01);
  const f = SDF.compile(G);
  let m = MESH.nets(f, [-0.34, -0.2, -1.75, 0.34, 0.33, 2.5], 0.011);
  m = MESH.largest(m, 400);
  const A = MESH.fieldAttrs(f, m.pos, m.nv), gf = f.groups, matOf = new Uint8Array(m.nv);
  for (let v = 0; v < m.nv; v++) { const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2]; let best = 0, bd = 1e9; for (let i = 0; i < gf.length; i++) { const d = gf[i](x, y, z); if (d < bd) { bd = d; best = i; } } matOf[v] = G[best].mat; }
  const g = MESH.geometry(m.pos, m.idx, A.nrm, { aAO: new THREE.BufferAttribute(A.ao, 1) });
  CHAR.groupByMat(g, matOf, m.idx);
  PROPS._bfHull = g; return g;
};
PROPS.speeder = function () {
  const g = new THREE.Group();
  const red = PROPS._bfPaint || (PROPS._bfPaint = new THREE.MeshPhysicalMaterial({ color: 0x781006, metalness: 0.1, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.75 }));
  const seat = PROPS.m('bfseat', { color: 0x120e0d, roughness: 0.62, metalness: 0.0 });
  const blk = PROPS.m('bfblk', { color: 0x141417, roughness: 0.36, metalness: 0.65, envMapIntensity: 1.0 });
  const chr = PROPS.m('bfchr', { color: 0xa0a3aa, roughness: 0.2, metalness: 1.0, envMapIntensity: 1.2 });
  const add = (m) => { g.add(m); m.castShadow = true; m.receiveShadow = true; return m; };
  add(new THREE.Mesh(PROPS.bloodfinHull(), [red, seat, blk]));
  // the fin: a tall blade swept back off the rear body
  const ext = (pts, depth, bev) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 12 }); eg.translate(0, 0, -depth / 2); eg.rotateY(-HALF); return eg; };
  { const fin = []; for (let i = 0; i <= 10; i++) { const u = i / 10; fin.push([-0.6 - u * 1.12 - u * u * 0.08, 0.12 + Math.pow(u, 1.35) * 0.9]); }
    fin.push([-1.84, 0.98], [-1.74, 0.66], [-1.7, 0.36], [-1.62, 0.12]);
    add(new THREE.Mesh(ext(fin, 0.026, 0.01), red));
    const edge = []; for (let i = 6; i <= 10; i++) { const u = i / 10; edge.push([-0.6 - u * 1.12 - u * u * 0.08, 0.12 + Math.pow(u, 1.35) * 0.9 + 0.012]); } edge.push([-1.84, 1.0]);
    for (let i = edge.length - 1; i >= 0; i--) edge.push([edge[i][0] + 0.02, edge[i][1] - 0.07]);
    add(new THREE.Mesh(ext(edge, 0.034, 0.006), blk)); }
  // forward steering vanes under the nose
  for (const s of [1, -1]) {
    const v = add(new THREE.Mesh(ext([[1.2, 0.0], [1.95, 0.02], [2.12, 0.06], [2.0, 0.08], [1.3, 0.07]], 0.018, 0.007), blk)); v.position.set(s * 0.2, -0.07, 0); v.rotation.z = s * -0.35;
    { const st = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), blk)); st.rotation.z = HALF; st.position.set(s * 0.15, -0.05, 1.4); }
    // handlebar half with grip, footpeg
    const bar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 10), chr)); bar.rotation.z = HALF - s * 0.25; bar.position.set(s * 0.14, 0.34, 0.45);
    const grip = add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.11, 12), seat)); grip.rotation.z = HALF; grip.position.set(RIDE.BF.gripL[0] * s, RIDE.BF.gripL[1], RIDE.BF.gripL[2]);
    const peg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 8), blk)); peg.rotation.z = HALF; peg.position.set(RIDE.BF.pegL[0] * s, RIDE.BF.pegL[1] + 0.02, RIDE.BF.pegL[2]);
    const pod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 20), blk)); pod.position.set(s * 0.12, -0.19, s > 0 ? 1.15 : -0.95);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), KIT.emis(0xff4a20, 1.4)); glow.rotation.x = HALF; glow.position.set(s * 0.12, -0.216, s > 0 ? 1.15 : -0.95); g.add(glow);
  }
  const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.14, 10), chr)); stem.position.set(0, 0.28, 0.45);
  // console on the cowl
  const con = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), KIT.emis(0xff2a14, 1.8)); con.position.set(0, 0.255, 0.3); con.rotation.x = -HALF + 0.55; g.add(con);
  const bez = add(new THREE.Mesh(KIT.chamferGeo(0.095, 0.012, 0.05, 0.008), blk)); bez.position.set(0, 0.245, 0.305); bez.rotation.x = 0.55;
  // engine nozzle + glow
  const noz = add(PROPS.lathe([[0.15, 0], [0.16, -0.04], [0.14, -0.12], [0.12, -0.13], [0.11, -0.02]], 28, blk)); noz.rotation.x = -HALF; noz.position.set(0, 0.085, -1.62);
  const ex = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a20).multiplyScalar(1.2), toneMapped: false })); ex.position.set(0, 0.085, -1.68); ex.rotation.y = PI; g.add(ex);
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.085, 1, 20, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { uA: { value: 0.3 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float k = pow(1.0 - vUv.y, 2.5); gl_FragColor = vec4(vec3(1.8, 0.55, 0.18) * k * uA, 1.0); }' }));
  plume.rotation.x = -HALF; plume.position.set(0, 0.085, -2.2); g.add(plume);
  g.userData.exhaust = ex; g.userData.plume = plume;
  return g;
};
/* astromech (R2-series): barrel body, silver dome, two leg struts + a centre foot; c = panel colour */
PROPS.r2 = function (c) {
  const g = new THREE.Group(), white = PROPS.m('r2w', { color: 0xe8e8ea, roughness: 0.35, metalness: 0.1 }), silver = PROPS.m('r2s', { color: 0xc8ccd4, roughness: 0.2, metalness: 1.0 }),
    pan = new THREE.MeshStandardMaterial({ color: c || 0x1a4aa8, roughness: 0.3, metalness: 0.2 }), dark = PROPS.m('r2d', { color: 0x2a2c30, roughness: 0.5, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.58, 24), white); body.position.y = 0.62; g.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 12, 0, TAU, 0, HALF), silver); dome.position.y = 0.91; g.add(dome);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), pan); p.position.set(Math.sin(a) * 0.21, 1.0, Math.cos(a) * 0.21); p.lookAt(0, 1.0, 0); p.rotateX(-0.5); g.add(p); }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.5 })); eye.position.set(0, 1.04, 0.2); g.add(eye);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), KIT.emis(0xff2010, 6)); led.position.set(0.08, 0.99, 0.2); g.add(led);
  for (const [y, h] of [[0.72, 0.12], [0.52, 0.18]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.03), pan); b.position.set(0, y, 0.228); g.add(b); }
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.16), white); leg.position.set(s * 0.28, 0.5, 0); leg.rotation.z = s * 0.05; g.add(leg);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), pan); sh.rotation.z = HALF; sh.position.set(s * 0.31, 0.78, 0); g.add(sh);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.26), dark); ft.position.set(s * 0.29, 0.06, 0.02); g.add(ft);
  }
  const cf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.18), dark); cf.position.set(0, 0.26, 0); g.add(cf);
  const cl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), white); cl.position.set(0, 0.44, 0); g.add(cl);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
};
