/* HUMANS — organic cast: head (fine SDF) + hair / beard / helmet shells + clothed body + fists + cloth panels.
   Built lazily per level (CAST.need) because each template takes ~0.5–1.5 s to mesh. */
CAST.builders = {};
/* head-local millimetre helpers */
CAST.hm = (HO) => (x, y, z) => [HO[0] + x / 1000, HO[1] + y / 1000, HO[2] + z / 1000];
CAST.mm = (a) => a.map((x) => x / 1000);
/* ------------------------------------------------------------------ hair / beard / headgear shells */
CAST.hairGroups = function (HO, style) {
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, items = [];
  const add = (p, op, k) => items.push({ p, op: op || 'su', k: k || 0.001 }); const both = (p, op, k) => { add(p, op, k); add(SDF.mirror(p), op, k); };
  if (style === 'long' || style === 'short' || style === 'topknot') {
    const sh = style === 'short' ? 7 : 11;
    add(S.ell(hm(0, 33, -15), mm([75 + sh, 88 + sh, 98 + sh])));
    if (style === 'long') {
      add(S.ell(hm(0, -75, -58), mm([86, 135, 48])), 'su', K(34));            // back curtain to the shoulders
      both(S.ell(hm(64, -40, -18), mm([24, 85, 42])), 'su', K(20));             // side locks over the ears
      add(S.ell(hm(0, 72, -8), mm([72, 44, 88])), 'su', K(24));               // volume on the crown
      add(S.cap(hm(0, 132, 52), hm(0, 118, -60), K(3.5)), 'ss', K(3));        // centre parting
      add(S.sph(hm(0, 40, -102), K(21)), 'su', K(8));                          // the half-up tie
      add(S.ell(hm(0, 10, -112), mm([14, 35, 12])), 'su', K(10));
    }
    if (style === 'topknot') { add(S.sph(hm(0, 95, -45), K(26)), 'su', K(14)); add(S.rcone(hm(0, 95, -60), hm(0, -60, -125), K(18), K(9)), 'su', K(12)); }
    // hairline: carve the face and (short) the sides and nape
    add(S.ell(hm(0, -45, 80), mm([95, 100, 72])), 'ss', K(12));
    add(S.box(hm(0, -120, 40), mm([200, 110, 60]), 0), 'ss', K(10));
    if (style === 'short') { add(S.box(hm(0, -105, -40), mm([200, 95, 120]), 0), 'ss', K(14)); both(S.ell(hm(80, -10, 5), mm([25, 40, 45])), 'ss', K(8)); }
    if (style === 'long') both(S.ell(hm(84, -2, 10), mm([16, 30, 40])), 'ss', K(8));
    if (style === 'short') { for (let i = -3; i <= 3; i++) add(S.ell(hm(i * 16, 88, 48 - Math.abs(i) * 4), mm([10, 20, 9]), S.rot(-25, 0, i * 6)), 'su', K(6)); }
  }
  return { name: 'hair', items, op: 'su', k: 0.01 };
};
CAST.beardGroups = function (HO) {
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, items = [];
  const add = (p, op, k) => items.push({ p, op: op || 'su', k: k || 0.001 }); const both = (p, op, k) => { add(p, op, k); add(SDF.mirror(p), op, k); };
  add(S.ell(hm(0, -96, 70), mm([34, 34, 26])));
  both(S.rcone(hm(58, -50, 18), hm(26, -100, 58), K(15), K(18)), 'su', K(14));
  both(S.ell(hm(34, -66, 62), mm([20, 26, 18])), 'su', K(12));
  add(S.ell(hm(0, -47, 87), mm([27, 8.5, 9])), 'su', K(8));                 // moustache
  both(S.ell(hm(24, -58, 82), mm([7, 14, 8])), 'su', K(6));
  add(S.ell(hm(0, -57, 86), mm([20, 3.5, 14])), 'ss', K(3));                 // mouth
  add(S.ell(hm(0, -36, 70), mm([60, 26, 70])), 'ss', K(8));                  // keep the cheeks clear
  return { name: 'beard', items, op: 'su', k: 0.006 };
};
CAST.braidGroups = function (HO, J) {
  const hm = CAST.hm(HO), K = (v) => v / 1000, items = [];
  let p = hm(-62, -18, -12);
  const path = [[-66, -60, 5], [-70, -105, 22], [-78, -150, 35], [-88, -195, 48], [-96, -240, 55], [-100, -280, 58]];
  for (const q of path) { const n = hm(q[0], q[1], q[2]); items.push({ p: SDF.rcone(p, n, K(6.2), K(5.8)), op: 'u', k: K(2) }); items.push({ p: SDF.sph(V.lerp(p, n, 0.5), K(7)), op: 'u', k: K(2) }); p = n; }
  items.push({ p: SDF.rcone(hm(0, -60, -95), hm(0, -140, -100), K(5), K(3.5)), op: 'u', k: K(2) });   // padawan tail
  return { name: 'braid', items, op: 'u', k: 0.003 };
};
CAST.helmetGroups = function (HO, kind) {
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, items = [];
  const add = (p, op, k) => items.push({ p, op: op || 'su', k: k || 0.001 }); const both = (p, op, k) => { add(p, op, k); add(SDF.mirror(p), op, k); };
  if (kind === 'naboo') {   // leather cap with a stiff brim + goggles band
    add(S.ell(hm(0, 38, -12), mm([88, 82, 104])));
    add(S.box(hm(0, -20, -12), mm([200, 50, 200]), 0), 'ss', K(4));
    add(S.box(hm(0, 30, 92), mm([70, 4, 26]), K(3), S.rot(12, 0, 0)), 'su', K(6));
    add(S.rcone(hm(0, 30, -12), hm(0, 33, -12), K(94), K(92)), 'u');
  } else if (kind === 'thug') {   // full helmet + visor
    add(S.ell(hm(0, 20, 0), mm([92, 110, 112])));
    add(S.box(hm(0, -150, 0), mm([200, 80, 200]), 0), 'ss', K(20));
    add(S.box(hm(0, 5, 98), mm([70, 22, 12]), K(6)), 'su', K(4));
    add(S.ell(hm(0, -62, 92), mm([48, 32, 22])), 'su', K(10));
  } else if (kind === 'tusken') {   // wrapped head + goggles + breather
    add(S.ell(hm(0, 20, 0), mm([90, 108, 110])));
    add(S.rcone(hm(0, -40, 10), hm(0, -170, -10), K(70), K(72)), 'su', K(30));
    for (let i = 0; i < 7; i++) add(S.rcone(hm(-95, 70 - i * 22, -10 + i * 4), hm(95, 70 - i * 22, -10 + i * 4), K(5), K(5)), 'su', K(4));
    both(S.rcone(hm(34, 12, 88), hm(36, 12, 118), K(17), K(15)), 'su', K(3));
    add(S.rcone(hm(0, -48, 92), hm(0, -52, 128), K(16), K(12)), 'su', K(4));
    both(S.rcone(hm(16, -62, 100), hm(22, -95, 118), K(7), K(5)), 'u');
  }
  return { name: 'helmet', items, op: 'su', k: 0.006 };
};
/* ------------------------------------------------------------------ skin + hair shading (head-local mm) */
CM.humanSkin = function (key, o) {
  const k = 'hs_' + key; if (CM.cache[k]) return CM.cache[k];
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color(o.sss || 0x803020), sheenRoughness: 0.6, envMapIntensity: 0.7 });
  const c = (h) => { const q = new THREE.Color(h); return `vec3(${q.r.toFixed(4)}, ${q.g.toFixed(4)}, ${q.b.toFixed(4)})`; };
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aHead; attribute float aAO; varying vec3 vHead; varying float vAO;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHead = aHead; vAO = aAO;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vHead; varying float vAO;
      float hh(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float nn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(mix(hh(i),hh(i+vec3(1,0,0)),f.x),mix(hh(i+vec3(0,1,0)),hh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh(i+vec3(0,0,1)),hh(i+vec3(1,0,1)),f.x),mix(hh(i+vec3(0,1,1)),hh(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 P = vHead; float ax = abs(P.x); float feat = ${o.plain ? '0.0' : '1.0'};
        vec3 skin = ${c(o.tone || 0xc8906c)} * (0.9 + 0.2 * nn(P * 0.08));
        // cheeks / nose flush, eye-socket shadow
        skin = mix(skin, skin * vec3(1.05, 0.85, 0.82), (1.0 - smoothstep(0.0, 40.0, length(vec2(ax - 38.0, P.y + 25.0)))) * 0.35 * step(40.0, P.z));
        skin *= 1.0 - 0.3 * feat * (1.0 - smoothstep(6.0, 22.0, length(vec2(ax - 32.0, P.y - 8.0)))) * step(50.0, P.z);
        skin *= 1.0 + (1.0 - feat) * (0.26 * (nn(P * 0.055) - 0.5) + 0.14 * (nn(P * 0.19 + 3.1) - 0.5));
        skin = mix(skin, skin * vec3(0.78, 0.7, 0.66), (1.0 - feat) * smoothstep(0.6, 0.7, nn(P * 0.33 + 7.7)));
        // lips
        float lip = (1.0 - smoothstep(18.0, 24.0, ax)) * smoothstep(-66.0, -60.0, P.y) * (1.0 - smoothstep(-51.0, -47.0, P.y)) * step(70.0, P.z);
        skin = mix(skin, ${c(o.lip || 0xa0584a)}, lip * 0.7 * feat);
        // brows
        float t = clamp((ax - 10.0) / 37.0, 0.0, 1.0); float yc = mix(19.0, 20.5, t) + sin(t * 3.14) * 3.0;
        float brow = (1.0 - smoothstep(2.2, 3.6, abs(P.y - yc))) * step(9.0, ax) * (1.0 - smoothstep(46.0, 50.0, ax)) * step(48.0, P.z);
        skin = mix(skin, ${c(o.brow || 0x3a2616)}, brow * feat * (0.75 + 0.25 * sin(P.x * 3.0 + P.y)));
        // stubble / beard shadow
        float stb = ${(o.stubble || 0).toFixed(2)} * (1.0 - smoothstep(-60.0, -40.0, P.y)) * step(10.0, P.z) * (0.6 + 0.4 * nn(P * 0.9));
        skin = mix(skin, ${c(o.brow || 0x3a2616)}, stb);
        diffuseColor.rgb = skin;`)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= mix(0.3, 1.0, vAO); reflectedLight.directDiffuse *= mix(0.6, 1.0, vAO);\n' + CM.FILL.replace('uFill *', 'uFill * vAO * vec3(1.0, 0.86, 0.78) *') + '\n{ vec3 sss = diffuseColor.rgb * vec3(0.55, 0.16, 0.08) * (0.35 + 0.65 * vAO); reflectedLight.indirectDiffuse += sss * 0.35; }');
    sh.uniforms.uFill = CM.fillU; sh.fragmentShader = sh.fragmentShader.replace('varying vec3 vHead; varying float vAO;', 'uniform vec3 uFill; varying vec3 vHead; varying float vAO;'); CM.rimHook(sh);
  };
  m.customProgramCacheKey = () => k; CM.cache[k] = m; return m;
};
CM.hair = function (key, hex, o) {
  o = o || {};
  const k = 'hair_' + key; if (CM.cache[k]) return CM.cache[k];
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough || 0.6, metalness: 0, envMapIntensity: 0.8 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aHead; attribute float aAO; varying vec3 vHead; varying float vAO;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHead = aHead; vAO = aAO;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHead; varying float vAO;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // strands flow from the crown: coordinate across the flow = azimuth, perturbed by slow waves; clumps at low frequency
        vec3 hp = vHead - vec3(0.0, 120.0, -10.0); float ang = atan(hp.x, hp.z); float fl = length(hp.xz);
        float wav = sin(vHead.y * 0.045 + ang * 3.0) * 0.35 + sin(vHead.y * 0.11 + ang * 7.0) * 0.12;
        float u = ang + wav * 0.25;
        float clump = sin(u * 26.0) * 0.5 + 0.5, fine = sin(u * ${o.strands ? (o.strands * 3.2).toFixed(1) : '290.0'} + sin(vHead.y * 0.3) * 1.5) * 0.5 + 0.5, fine2 = sin(u * 530.0 + vHead.y * 0.07) * 0.5 + 0.5;
        float hs = 0.55 + 0.3 * clump + 0.22 * fine * fine2;
        diffuseColor.rgb *= hs + ${o.grey ? '0.3 * step(0.82, fract(sin(u * 311.0) * 91.7))' : '0.0'};
        float gHS = hs;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 N = normalize(normal), V = normalize(vViewPosition);
          vec3 T = normalize(cross(N, normalize(cross(vec3(0.0, 1.0, 0.0), N)) + 1e-4));   // strand tangent ~ down the surface
          vec3 Lh = normalize((viewMatrix * vec4(0.3, 1.0, 0.45, 0.0)).xyz); vec3 H = normalize(Lh + V);
          float th = dot(T, H); float kk = pow(max(0.0, sqrt(max(0.0, 1.0 - th * th))), 90.0) * 0.18 + pow(max(0.0, sqrt(max(0.0, 1.0 - th * th))), 12.0) * 0.05;
          totalEmissiveRadiance += (vec3(0.9, 0.85, 0.8) * 0.6 + diffuseColor.rgb * 1.2) * kk * vAO * gHS; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = 0.45 + 0.3 * (1.0 - vAO);')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.directDiffuse *= mix(0.5, 1.0, vAO); reflectedLight.indirectSpecular *= vAO;');
  };
  m.customProgramCacheKey = () => k; CM.cache[k] = m; return m;
};
/* ------------------------------------------------------------------ the builder */
CAST.human = async function (spec) {
  // CC0 base body (CAST.qBody) when the assets are loaded; the sculpted body otherwise
  const qc = CAST.useQ(spec), qo = qc && QB.M.meshes.rmale && CAST.QO && CAST.QO[spec.name] && !MG.flags.paint, qkey = qc ? (qc.female ? (qo ? 'rfemale' : 'female') : (qo ? 'rmale' : 'male')) : null, qs = (spec.height || 1) * (qc && qc.female ? 1.0 : 0.985);
  const J = qc ? QB.joints(qkey, qs) : RIG.joints({ height: spec.height || 1, shoulders: spec.shoulders || 1 }), def = RIG.def(J);
  const T = { name: spec.name, J, def, parts: [], attach: [], human: true };
  const HO = qc ? [0, J.head[1] + 0.091 * qs, J.head[2] + 0.027 * qs] : [0, J.head[1] + 0.045 * (spec.height || 1), J.head[2] + 0.012];
  const qHead = qc && !qc.cullHead;      // the base body's own textured head (gungans / closed helmets keep a sculpted one)
  const hRes = spec.headRes || 0.0028;
  const meshField = async (groups, box, res) => { const f = SDF.compile(groups); let m = MESH.nets(f, box, res); m = MESH.largest(m, 200); const A = MESH.fieldAttrs(f, m.pos, m.nv); await MG.yield(); return { pos: m.pos, nrm: A.nrm, ao: A.ao, idx: m.idx, nv: m.nv }; };
  const headBox = [HO[0] - 0.115, HO[1] - 0.2, HO[2] - 0.13, HO[0] + 0.115, HO[1] + 0.145, HO[2] + 0.135];
  const aHead = (m) => { const a = new Float32Array(m.nv * 3); for (let v = 0; v < m.nv; v++) { a[v * 3] = (m.pos[v * 3] - HO[0]) * 1000; a[v * 3 + 1] = (m.pos[v * 3 + 1] - HO[1]) * 1000; a[v * 3 + 2] = (m.pos[v * 3 + 2] - HO[2]) * 1000; } return a; };
  const headW = (m, rigid) => {
    const n = m.nv, idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      const y = (m.pos[v * 3 + 1] - HO[1]) * 1000, z = (m.pos[v * 3 + 2] - HO[2]) * 1000;
      const cut = -45 - 0.4 * (z + 80);
      let wh = rigid ? 1 : smooth(cut - 18, cut + 10, y), wc = rigid ? 0 : 1 - smooth(-200, -150, y);
      if (rigid === 'long') { wh = 1 - smooth(-40, -140, y) * 0.7; wc = 1 - wh; }
      const wn = Math.max(0, 1 - wh - wc), o = [[4, wh], [3, wn], [2, wc]].filter((q) => q[1] > 1e-4); let s = 0; for (const q of o) s += q[1];
      for (let k = 0; k < 4; k++) { idx[v * 4 + k] = k < o.length ? o[k][0] : 0; wts[v * 4 + k] = k < o.length ? o[k][1] / s : 0; }
    }
    return { idx, wts };
  };
  const skinM = CM.humanSkin(spec.name, spec.skin || {});
  if (spec.head !== false && !qHead) {
    const HM = await meshField(HEADS.humanGroups(HO), headBox, hRes);
    T.parts.push({ geo: CHAR.skinGeo(HM.pos, HM.nrm, HM.idx, headW(HM), { aHead: new THREE.BufferAttribute(aHead(HM), 3), aAO: new THREE.BufferAttribute(HM.ao, 1) }), mats: [skinM], name: 'head' });
    const ep = spec.eyePos || [32, 7, 60]; for (const s of [1, -1]) { const e = CAST.hm(HO)(ep[0] * s, ep[1], ep[2]); T.attach.push({ bone: 4, geo: new THREE.SphereGeometry(spec.eyeR || 0.0122, 20, 14), mat: CM.eye(spec.eyes || 'brown'), pos: V.sub(e, J.head), name: 'eye' }); }
  }
  const shells = [];
  if (spec.hair && (!qHead || spec.lekku || qc.sdfHair)) shells.push([CAST.hairGroups(HO, spec.hair), spec.lekku ? CM.plain(spec.hairCol, 0.5, 0, spec.name + 'lek') : CM.hair(spec.name + 'h', spec.hairCol || 0x3a2818, { grey: spec.grey }), spec.hair === 'long' || spec.lekku ? 'long' : true]);
  if (spec.beard && !qHead) shells.push([CAST.beardGroups(HO), CM.hair(spec.name + 'b', spec.beardCol || spec.hairCol || 0x3a2818, { strands: 140, grey: spec.grey }), true]);
  if (spec.braid && !qHead) shells.push([CAST.braidGroups(HO, J), CM.hair(spec.name + 'br', spec.hairCol || 0x3a2818, { strands: 40 }), 'long']);
  const HOh = qHead ? [HO[0], HO[1] + 0.026 * qs, HO[2] - 0.004 * qs] : HO;   // helmets ride higher on the base body's taller skull
  if (spec.helmet) shells.push([CAST.helmetGroups(HOh, spec.helmet), spec.helmetMat || CM.leather(0x3a2a1c, 0.5, spec.name + 'helm'), true]);
  for (const [g, mat, rigid] of shells) {
    const b = SDF.groupBound(g.items), r = b.r + 0.01;
    const box = [b.c[0] - r, Math.max(b.c[1] - r, HO[1] - 0.34), b.c[2] - r, b.c[0] + r, b.c[1] + r, b.c[2] + r];
    const M = await meshField([g], box, spec.hairRes || 0.0036);
    if (!M.nv) continue;
    if (g.name === 'hair' || g.name === 'beard') {   // comb strand grooves into the shell, then re-derive normals
      for (let v = 0; v < M.nv; v++) {
        const x = (M.pos[v * 3] - HO[0]) * 1000, y = (M.pos[v * 3 + 1] - HO[1]) * 1000, z = (M.pos[v * 3 + 2] - HO[2]) * 1000;
        const a = Math.atan2(x, z), r = Math.sin(a * (g.name === 'beard' ? 70 : 46) + Math.sin(y * 0.04) * 2 + vnoise3(x * 0.05, y * 0.02, z * 0.05) * 5) * 0.5 + 0.5;
        const k = (Math.pow(r, 3) - 0.35) * 0.0016 + (vnoise3(x * 0.03, y * 0.03, z * 0.03) - 0.5) * 0.0025;
        M.pos[v * 3] += M.nrm[v * 3] * k; M.pos[v * 3 + 1] += M.nrm[v * 3 + 1] * k; M.pos[v * 3 + 2] += M.nrm[v * 3 + 2] * k;
      }
      M.nrm = MESH.normals(M.pos, M.idx, M.nv);
    }
    T.parts.push({ geo: CHAR.skinGeo(M.pos, M.nrm, M.idx, headW(M, rigid), { aHead: new THREE.BufferAttribute(aHead(M), 3), aAO: new THREE.BufferAttribute(M.ao, 1) }), mats: [mat], name: g.name });
  }
  if (spec.visor) { const e = CAST.hm(HOh); const tv = spec.helm2 === 'senate';
    const g = new THREE.BoxGeometry(tv ? 0.1 : 0.13, tv ? 0.018 : 0.035, 0.02); T.attach.push({ bone: 4, geo: g, mat: spec.visor, pos: V.sub(e(0, 5, tv ? 102 : 108), J.head), name: 'visor' });
    if (tv) { const v2 = new THREE.BoxGeometry(0.02, 0.07, 0.02); T.attach.push({ bone: 4, geo: v2, mat: spec.visor, pos: V.sub(e(0, -32, 102), J.head), name: 'visor' }); } }
  if (spec.goggles) {   // aviator goggles pushed up onto the helmet: rimmed amber lenses, a bridge and the strap
    const e = CAST.hm(HOh), nb = spec.helmet === 'naboo', gy = nb ? 64 : 12, gz = nb ? 90 : 120, tilt = nb ? -0.55 : 0;
    const rim = CAST.pm(0x6a5a44, 0.35, 0.85), lens = new THREE.MeshPhysicalMaterial({ color: 0x3a2206, metalness: 0.2, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.4, emissive: 0x160800 });
    for (const s of [1, -1]) {
      const cup = new THREE.CylinderGeometry(0.0205, 0.0225, 0.016, 20, 1, true); cup.rotateX(HALF);
      T.attach.push({ bone: 4, geo: cup, mat: rim, pos: V.sub(e(31 * s, gy, gz), J.head), rotX: tilt, name: 'lens', shadow: true });
      const ring = new THREE.TorusGeometry(0.0205, 0.0035, 8, 24);
      T.attach.push({ bone: 4, geo: ring, mat: rim, pos: V.sub(e(31 * s, gy + 3, gz + 7), J.head), rotX: tilt, name: 'lens' });
      const gl = new THREE.SphereGeometry(0.0195, 20, 10, 0, TAU, 0, HALF * 0.55); gl.rotateX(HALF);
      T.attach.push({ bone: 4, geo: gl, mat: lens, pos: V.sub(e(31 * s, gy + 3, gz + 5), J.head), rotX: tilt, name: 'lens' });
    }
    const br = new THREE.CylinderGeometry(0.004, 0.004, 0.022, 8); br.rotateZ(HALF);
    T.attach.push({ bone: 4, geo: br, mat: rim, pos: V.sub(e(0, gy + 2, gz + 4), J.head), rotX: tilt, name: 'lens' });
    if (nb) { const st = new THREE.TorusGeometry(0.094, 0.005, 6, 40); st.rotateX(HALF); T.attach.push({ bone: 4, geo: st, mat: CAST.pm(0x2a2016, 0.7, 0.0), pos: V.sub(e(0, gy - 6, -8), J.head), rotX: -0.18, name: 'lens' }); }
  }
  if (qc) { await (qo ? CAST.qOutfit(T, spec, qc, qkey, qs, qHead) : CAST.qBody(T, spec, qc, qkey, qs, qHead)); T.cloth = spec.cloth ? spec.cloth(J) : null; T.height = qs * 1.81; return T; }
  // body
  const G = SCULPT.humanoid(J, spec.body || {});
  const B = await SCULPT.mesh(G, J, { folds: SCULPT.folds(J, spec.folds || 1), res: Math.min(spec.bodyRes || 0.0056, 0.0056), matIds: CHAR.MAT_IDS, box: [-0.62 * (spec.bulk || 1), -0.005, -0.22, 0.62 * (spec.bulk || 1), HO[1] - 0.04, 0.24] });   // must contain the A-pose wrists (x ≈ ±0.49) or the forearms are never meshed
  const bw = RIG.weights(def, B.pos, B.nv, { allow: def.map((b) => b.i !== 4) });
  const bg = CHAR.skinGeo(B.pos, B.nrm, B.idx, bw, { aAO: new THREE.BufferAttribute(B.ao, 1) });
  CHAR.groupByMat(bg, B.mat, B.idx);
  T.parts.push({ geo: bg, mats: spec.mats, name: 'body' });
  const fists = await SCULPT.meshFists(J, { glove: !!spec.gloves, res: spec.fistRes || 0.0038 });
  const fm = spec.gloves ? spec.mats[2] : CM.withAO(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spec.skin && spec.skin.tone || 0xc8906c).multiplyScalar(0.92), roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0x803020) }), spec.name + 'hand');
  fists.forEach((m, i) => T.parts.push({ geo: CHAR.skinGeo(m.pos, m.nrm, m.idx, CHAR.fistWeights(m, J, i === 0 ? 1 : -1, def), { aAO: new THREE.BufferAttribute(m.ao, 1) }), mats: [fm], name: 'fist' + i }));
  T.grip = SCULPT.fistFrame(J);
  T.cloth = spec.cloth ? spec.cloth(J) : null;
  T.height = (spec.height || 1) * 1.8;
  return T;
};
/* skirts/tabards generator for the cast */
CAST.skirt = function (J, o) {
  const y = J.pelvis[1] + 0.012, P = [], base = { y, rx: (o.rx || 0.158), rz: (o.rz || 0.125), len: o.len || 0.42, rows: 8, cols: 5, flare: o.flare || 0.3, mat: o.mat };
  if (o.tabard) {   // leave a gap front and back where the tabard hangs, so two cloth layers never fight
    P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: -58, a1: -19, cols: 3, name: 'sF1' }))); P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 19, a1: 58, cols: 3, name: 'sF2' })));
  } else P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: -58, a1: 58, cols: 6, name: 'sF' })));
  P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 52, a1: 128, len: base.len * 0.95, name: 'sL' })));
  if (o.tabard) { P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 122, a1: 161, cols: 3, name: 'sB1' }))); P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 199, a1: 238, cols: 3, name: 'sB2' }))); }
  else P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 122, a1: 238, cols: 6, name: 'sB' })));
  P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 232, a1: 308, len: base.len * 0.95, name: 'sR' })));
  if (o.tabard) { P.push(CLOTH.arcPanel({ y: y + 0.004, rx: base.rx + 0.026, rz: base.rz + 0.026, a0: -22, a1: 22, len: o.tabard, rows: 9, cols: 4, flare: base.flare * 1.15, name: 'tF', mat: o.tabMat || o.mat })); P.push(CLOTH.arcPanel({ y: y + 0.004, rx: base.rx + 0.026, rz: base.rz + 0.026, a0: 158, a1: 202, len: o.tabard, rows: 9, cols: 4, flare: base.flare * 1.15, name: 'tB', mat: o.tabMat || o.mat })); }
  return { panels: P };
};
/* ------------------------------------------------------------------ roster */
CAST.SPECS = {
  quigon: { name: 'quigon', height: 1.07, shoulders: 1.04, headRes: 0.0029, bodyRes: 0.0072, fistRes: 0.0034, hair: 'long', beard: true, hairCol: 0x4a3322, beardCol: 0x5a4432, grey: true, eyes: 'blue',
    skin: { tone: 0xc08a6a, brow: 0x3a2818, stubble: 0 },
    body: { bulk: 1.05, collar: 'low', lapel: true, tabards: 'trousers', sleeve: [0.058, 0.05, 0.045], cuff: 0.05, belt: { h: 0.055, sash: true, pouches: true }, trouser: [0.08, 0.058], bootTop: 0.5, mats: { torso: 'tunic', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'extra', collar: 'tunic' } },
    mats: () => [CM.cloth(0x6e5a42, 0x6a5e4c, 0.92, 'qgT', true), CM.cloth(0x4e4234, 0x5a5044, 0.92, 'qgTr', true), CM.leather(0x3a2618, 0.5, 'qgL'), CM.leather(0x2a1c12, 0.45, 'qgB')],
    cloth: (J) => CAST.skirt(J, { len: 0.46, mat: 'robeTan', tabard: 0.55, tabMat: 'robeBrown' }) },
  obiwan: { name: 'obiwan', height: 1.0, shoulders: 0.98, headRes: 0.0029, bodyRes: 0.0072, fistRes: 0.0034, hair: 'short', braid: true, hairCol: 0x6a4a2a, eyes: 'blue',
    skin: { tone: 0xd6a07e, brow: 0x5a3a20, stubble: 0.08 },
    body: { bulk: 0.98, collar: 'low', lapel: true, tabards: 'trousers', sleeve: [0.055, 0.047, 0.042], cuff: 0.048, belt: { h: 0.052, sash: true, pouches: true }, trouser: [0.078, 0.056], bootTop: 0.49, mats: { torso: 'tunic', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'extra', collar: 'tunic' } },
    mats: () => [CM.cloth(0xbcae8e, 0x8a8270, 0.92, 'owT', true), CM.cloth(0xa89878, 0x7a7262, 0.92, 'owTr', true), CM.leather(0x4a2e1a, 0.5, 'owL'), CM.leather(0x2a1c12, 0.45, 'owB')],
    cloth: (J) => CAST.skirt(J, { len: 0.42, mat: 'robeTan', tabard: 0.5 }) },
  guard: { name: 'guard', height: 1.0, headRes: 0.0034, bodyRes: 0.0075, hairRes: 0.004, helmet: 'naboo', goggles: true, skin: { tone: 0xc89070 }, gloves: true,
    body: { bulk: 1.02, collar: 'low', sleeve: [0.056, 0.048, 0.042], belt: { h: 0.05 }, trouser: [0.08, 0.058], bootTop: 0.48, mats: { torso: 'leather', arms: 'tunic', belt: 'extra', legs: 'trousers', boots: 'extra', collar: 'tunic' } },
    mats: () => [CM.cloth(0x3e4a5e, 0x6a7a90, 0.85, 'gdT'), CM.cloth(0x3a2a1e, 0x5a4a3a, 0.9, 'gdTr'), CM.leather(0x6a4428, 0.5, 'gdL'), CM.leather(0x141210, 0.4, 'gdB')] },
  thug: { name: 'thug', height: 1.02, headRes: 0.0036, bodyRes: 0.0075, hairRes: 0.004, helmet: 'thug', visor: new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff2a10, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.5 }), skin: { tone: 0xb07a5a }, gloves: true,
    helmetMat: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.35, metalness: 0.6, envMapIntensity: 1.2 }),
    body: { bulk: 1.08, collar: 'low', sleeve: [0.058, 0.05, 0.044], belt: { h: 0.055 }, trouser: [0.085, 0.06], bootTop: 0.46, mats: { torso: 'extra', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'leather', collar: 'tunic' },
      extra: (grp, J) => { const A = grp('armor', 'extra', 0.01); A.add(SDF.box([0, J.chest[1] + 0.03, 0.02], [0.17, 0.15, 0.13], 0.03), 'su', 0.02); A.both(SDF.ell([0.19, J.shoulder[1] - 0.01, -0.02], [0.07, 0.05, 0.075]), 'su', 0.01); } },
    mats: () => [CM.cloth(0x2a2a30, 0x4a4a58, 0.85, 'thT'), CM.cloth(0x222226, 0x3a3a44, 0.9, 'thTr'), CM.leather(0x141414, 0.45, 'thL'), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.3, metalness: 0.7, envMapIntensity: 1.2 })] },
  enforcer: { name: 'enforcer', height: 1.08, shoulders: 1.1, headRes: 0.0036, bodyRes: 0.0078, hairRes: 0.004, helmet: 'thug', visor: new THREE.MeshStandardMaterial({ color: 0x302000, emissive: 0xffa020, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.5 }), skin: { tone: 0x9a6a4a }, gloves: true,
    helmetMat: new THREE.MeshStandardMaterial({ color: 0x2a2010, roughness: 0.3, metalness: 0.8, envMapIntensity: 1.3 }),
    body: { bulk: 1.2, collar: 'high', sleeve: [0.064, 0.056, 0.05], belt: { h: 0.06 }, trouser: [0.09, 0.064], bootTop: 0.46, mats: { torso: 'extra', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'leather', collar: 'extra' },
      extra: (grp, J) => { const A = grp('armor', 'extra', 0.01); A.add(SDF.box([0, J.chest[1] + 0.03, 0.02], [0.19, 0.17, 0.14], 0.035), 'su', 0.02); A.both(SDF.ell([0.21, J.shoulder[1] - 0.005, -0.02], [0.085, 0.06, 0.085]), 'su', 0.01); } },
    mats: () => [CM.cloth(0x3a1414, 0x6a3030, 0.85, 'enT'), CM.cloth(0x1c1c20, 0x3a3a44, 0.9, 'enTr'), CM.leather(0x141414, 0.45, 'enL'), new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 0.3, metalness: 0.85, envMapIntensity: 1.3 })],
    cloth: (J) => CAST.skirt(J, { len: 0.36, mat: 'red' }) },
  tusken: { name: 'tusken', height: 1.02, headRes: 0.0036, bodyRes: 0.0078, hairRes: 0.004, helmet: 'tusken', skin: { tone: 0x8a7a60 }, gloves: true,
    helmetMat: CM.cloth(0x9a8a6a, 0xc8b898, 0.95, 'tkH'),
    body: { bulk: 1.12, collar: 'low', sleeve: [0.068, 0.06, 0.056], cuff: 0.06, belt: { h: 0.06 }, trouser: [0.09, 0.07], bootTop: 0.42, mats: { torso: 'tunic', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'extra', collar: 'tunic' },
      extra: (grp, J) => { const A = grp('bandolier', 'leather', 0.006); A.add(SDF.cap([0.14, J.shoulder[1] - 0.02, 0.1], [-0.12, J.pelvis[1] + 0.1, 0.12], 0.018), 'su', 0.01); A.add(SDF.cap([0.14, J.shoulder[1] - 0.02, -0.11], [-0.12, J.pelvis[1] + 0.1, -0.12], 0.018), 'su', 0.01); } },
    mats: () => [CM.cloth(0x8a7a5e, 0xb8a888, 0.95, 'tkT'), CM.cloth(0x6a5a44, 0x9a8a70, 0.95, 'tkTr'), CM.leather(0x4a3424, 0.6, 'tkL'), CM.cloth(0x5a4a38, 0x8a7a64, 0.95, 'tkB')],
    cloth: (J) => CAST.skirt(J, { len: 0.62, rx: 0.17, rz: 0.14, flare: 0.45, mat: 'tusken' }) },
  garyn: { name: 'garyn', height: 1.03, shoulders: 1.06, headRes: 0.003, bodyRes: 0.007, fistRes: 0.0034, hair: 'topknot', hairCol: 0x0a0a0c, eyes: 'brown',
    skin: { tone: 0x6e8a5a, brow: 0x1a2a14, lip: 0x4a5a3a, sss: 0x3a6020 },
    body: { bulk: 1.1, collar: 'high', lapel: true, sleeve: [0.06, 0.052, 0.046], cuff: 0.055, belt: { h: 0.06, sash: true }, trouser: [0.084, 0.06], bootTop: 0.47, mats: { torso: 'tunic', arms: 'tunic', belt: 'extra', legs: 'trousers', boots: 'leather', collar: 'extra' } },
    mats: () => [CM.cloth(0x4a0e0c, 0x8a3a30, 0.8, 'gyT'), CM.cloth(0x141416, 0x30303a, 0.9, 'gyTr'), CM.leather(0x101010, 0.4, 'gyL'), new THREE.MeshStandardMaterial({ color: 0xa8802a, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.3 })],
    cloth: (J) => CAST.skirt(J, { len: 0.5, mat: 'red', tabard: 0.62, tabMat: 'cape' }) },
};
CAST.need = async function (names, progress) {
  let i = 0;
  for (const n of names) {
    if (!CHAR.T[n]) {
      if (n === 'b1' || n === 'b1cmd') ENEMY.tplOf(n);
      else { const s = CAST.SPECS[n]; const sp = Object.assign({}, s, { mats: s.mats() }); CHAR.T[n] = await CAST.human(sp); }
    }
    i++; if (progress) await progress(i / names.length);
  }
};
/* staffs / electrostaffs / gaffi sticks (+Y axis, grips at -0.25 / +0.2) */
CAST.staff = function (kind) {
  const g = new THREE.Group();
  if (kind === 'electro') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.5, 10), CAST.pm(0x2a2a2e, 0.35, 0.8)); g.add(rod);
    for (const s of [1, -1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.16, 10), CAST.pm(0x6a6a70, 0.3, 0.9)); t.position.y = s * 0.72; g.add(t);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 3.2, 6), toneMapped: false })); e.position.y = s * 0.82; g.add(e); }
  } else {   // gaffi stick: gnarled shaft + crossed metal head
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 1.35, 8), CAST.pm(0x5a4028, 0.8, 0.0)); g.add(rod);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), CAST.pm(0x6a6a64, 0.5, 0.7)); hd.position.y = 0.66; g.add(hd);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 8), CAST.pm(0x6a6a64, 0.5, 0.7)); sp.position.y = 0.78; g.add(sp);
    const bt = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8), CAST.pm(0x6a6a64, 0.5, 0.7)); bt.position.y = -0.72; bt.rotation.z = PI; g.add(bt);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.position.y = 0.7; g.add(glow); g.userData.glow = glow; const mz = new THREE.Object3D(); mz.position.y = 0.7; g.add(mz); g.userData.muzzle = mz;
  R.scene.add(g); return g;
};
