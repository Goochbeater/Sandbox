/* STORYCAST — the story characters for cutscenes (and the combat cast where named): Milian (+ hood), Kyros (dual blades), Celene (+ knight greys),
   Bosskarr and the Trandoshan palettes, Vak, Donn, Traya as a hologram, and the story props. Cast entries follow the SPECS + QC + QO recipe
   (docs/api/B section 10, C section 14). Nothing here edits an engine part: CAST.human is wrapped to run SC.extra[name] on each built template,
   Actor.pose3D / dispose and CINE.spawn gain story hooks (hold poses, offhand saber, ground props), and CLOTH.mats gets the witch cloth. */
const SC = { extra: {}, tex: {}, holo: {} };
SC.lift = (hex) => new THREE.Color(hex).multiplyScalar(1.4).getHex();
SC.mats = (k, t, tr, l, b) => () => [CM.cloth(t, SC.lift(t), 0.9, k + 'T', true), CM.cloth(tr, SC.lift(tr), 0.9, k + 'Tr', true), CM.leather(l, 0.5, k + 'L'), CM.leather(b, 0.45, k + 'B')];
SC.spec = (name, o) => Object.assign({ name, height: 1, shoulders: 1, eyes: 'brown', skin: { tone: 0xc08a6a, brow: 0x3a2818, stubble: 0 }, headRes: 0.0029, fistRes: 0.0034,
  body: { bulk: 1, collar: 'low', sleeve: [0.056, 0.048, 0.042], trouser: [0.08, 0.058], bootTop: 0.46, mats: { torso: 'tunic', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'extra', collar: 'tunic' } },
  mats: SC.mats(name, 0x3a3a44, 0x2a2a30, 0x3a2618, 0x1a1410) }, o);
/* QO grade helpers (same values as p15f's local helpers: ranger green 115 deg, leather 28, peasant shirt 38) */
SC.g = (rules, sat, val, tint) => ({ rules, sat, val, tint });
SC.R = (p, g, o) => ['ranger', p, g, o];
SC.Pz = (p, g, o) => ['peasant', p, g, o];
SC.toH = (h, s, v) => ({ h: 115, w: 80, toH: h, s, v, minS: 0.03 });
SC.leatherV = (v, s) => ({ h: 28, w: 45, s: s === undefined ? 1 : s, v });
SC.CREAM = (s, v) => ({ h: 38, w: 30, s, v, minS: 0.02 });
SC.jediQO = (body, legs, boots) => [SC.Pz('Body', body), SC.Pz('Arms', body), SC.Pz('Legs', legs), SC.R('Feet_Boots', boots), SC.R('Body_Belt_1', SC.g([], 1, 0.8), { metal: 0.6 })];

/* ---- cloth: the witch's robe panels (CLOTH.mat reads CLOTH.mats first; same shader patch as the engine's panel cloth) */
CLOTH.mats.witch = (function () {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x1a1220, roughness: 0.86, metalness: 0, sheen: 0.9, sheenColor: new THREE.Color(0x403050), sheenRoughness: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  m.onBeforeCompile = (sh) => { sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill;').replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL.replace('rimF = pow(', 'rimF = 0.55 * pow(').replace(', 3.2)', ', 7.0)')); };
  m.customProgramCacheKey = () => 'clothpanel';
  return m;
})();

/* ---- cast entries: SPECS (fallback body, mats), QC (gate + painted costume), QO (modelled outfit where the rig has one) */
CAST.SPECS.milian = SC.spec('milian', { height: 0.96, shoulders: 0.94, skin: { tone: 0xa48a7c, brow: 0x9aa0a8, stubble: 0 }, cloth: (J) => CAST.skirt(J, { len: 0.92, rx: 0.19, rz: 0.15, flare: 0.5, mat: 'witch' }),
  mats: SC.mats('milian', 0x1a1220, 0x1a1220, 0x2a2030, 0x140e18) });
CAST.SPECS.milian_hood = Object.assign({}, CAST.SPECS.milian, { name: 'milian_hood' });
CAST.QC.milian = { outfit: 'robe', female: true, top: 0x1a1220, vest: 0x241a2e, low: 0x1a1220, belt: 0x4a3a22, sash: 0x403050, boots: 0x100a14, bootY: 0.44,
  collarShell: 0x1a1220, hair: ['Hair_Long'], hairCol: 0x9aa0a8, browCol: 0x8a9098, bulk: 0.96 };
CAST.QC.milian_hood = Object.assign({}, CAST.QC.milian, { hair: [] });
CAST.SPECS.kyros = SC.spec('kyros', { height: 1.03, shoulders: 1.06, eyes: 'blue', skin: { tone: 0xb8906c, brow: 0x6a6e74, stubble: 0.12 }, mats: SC.mats('kyros', 0x8a7048, 0x5a4a34, 0x2a2018, 0x2a1e14) });
CAST.QC.kyros = { outfit: 'uniform', top: 0x8a7048, vest: 0x5a4a34, low: 0x5a4a34, belt: 0x2a2018, boots: 0x2a1e14, bootY: 0.44, glove: 0x2a2a2e, collarShell: 0x8a9098,
  hair: ['Hair_Buzzed'], hairCol: 0x8a8e94, browCol: 0x6a6e74, bulk: 1.04 };
CAST.QO.kyros = { glove: 0x2a2a2e, parts: [
  SC.R('Body', SC.g([SC.toH(36, 0.42, 0.8)], 0.9, 0.95, 0xffe8c8)), SC.R('Arms', SC.g([SC.toH(36, 0.42, 0.8)], 0.9, 0.95, 0xffe8c8)),
  SC.R('Arms_Bracer', SC.g([], 0.05, 0.75, 0xdde4ee), { metal: 0.85, ns: 0.6, env: 0.9 }), SC.R('Legs', SC.g([SC.toH(30, 0.3, 0.45)], 0.7, 0.7)),
  SC.R('Feet_Boots', SC.g([SC.leatherV(0.3, 0.7)], 0.6, 0.6), { metal: 0.1 }), SC.R('Body_Belt_1', SC.g([SC.leatherV(0.35)], 1, 0.8), { metal: 0.6 }),
  SC.R('Acc_Pauldron', SC.g([], 0.05, 0.8, 0xe6ecf4), { metal: 0.9, ns: 0.6, env: 1.0 })],
  hair: ['Hair_Buzzed'], hairCol: 0x8a8e94, browCol: 0x6a6e74 };
CAST.SPECS.celene = SC.spec('celene', { height: 0.98, shoulders: 0.9, eyes: 'brown', skin: { tone: 0xc99478, brow: 0x3a2418, stubble: 0 }, mats: SC.mats('celene', 0xb8a27e, 0x8a6e4a, 0x3a2416, 0x2e1e14) });
CAST.SPECS.celene_knight = Object.assign({}, CAST.SPECS.celene, { name: 'celene_knight' });
CAST.QC.celene = { outfit: 'jedi', female: true, top: 0xb8a27e, tabard: 0x8a6e4a, sash: 0x6a4a2a, belt: 0x3a2416, low: 0xa8906c, boots: 0x2e1e14, bootY: 0.44,
  hair: ['Hair_Buns'], hairCol: 0x7a3a1e, browCol: 0x6a3018 };
CAST.QC.celene_knight = Object.assign({}, CAST.QC.celene, { top: 0x7e8694, tabard: 0x4a505c, sash: 0x3a404c, low: 0x5a606c, belt: 0x22262e, boots: 0x1a1e26, hair: ['Hair_Long'] });
CAST.QO.celene = { tabard: { col: 0x6a4a2a, x0: 0.04, x1: 0.1 }, parts: SC.jediQO(SC.g([SC.leatherV(1.1, 0.8), SC.CREAM(1.2, 0.74)], 0.9, 0.95, 0xfff0e0), SC.g([SC.leatherV(2.2, 0.5)], 0.8, 0.95, 0xfff0e0), SC.g([], 0.7, 0.5)),
  hair: ['Hair_Buns'], hairCol: 0x7a3a1e, browCol: 0x6a3018 };
CAST.QO.celene_knight = { tabard: { col: 0x3a404c, x0: 0.04, x1: 0.1 }, parts: SC.jediQO(SC.g([SC.leatherV(0.7, 0.08), SC.CREAM(0.25, 0.62)], 0.2, 0.9, 0xe8ecf4), SC.g([SC.leatherV(0.6, 0.08)], 0.15, 0.7, 0xe8ecf4), SC.g([], 0.1, 0.4)),
  hair: ['Hair_Long'], hairCol: 0x7a3a1e, browCol: 0x6a3018 };
/* Trandoshans: heads are built rigid on the head bone (cullHead), so no sculpted or Quaternius head and no hair */
const TRANDO = { height: 1.08, shoulders: 1.12, head: false, eyes: 'brown', skin: { tone: 0x6e7a4c, brow: 0x3a4226, stubble: 0 }, body: { bulk: 1.12, collar: 'low', sleeve: [0.068, 0.06, 0.056], trouser: [0.09, 0.07], bootTop: 0.42 } };
CAST.SPECS.bosskarr = SC.spec('bosskarr', Object.assign({}, TRANDO, { name: 'bosskarr', mats: SC.mats('bosskarr', 0x4a5232, 0x3e4428, 0x3a2818, 0x2a2014) }));
CAST.SPECS.trandoshan = SC.spec('trandoshan', Object.assign({}, TRANDO, { name: 'trandoshan', mats: SC.mats('trandoshan', 0x4a5232, 0x3e4428, 0x3a2818, 0x2a2014) }));
CAST.SPECS.trandoshan2 = SC.spec('trandoshan2', Object.assign({}, TRANDO, { name: 'trandoshan2', height: 1.04, skin: { tone: 0x8a7a48, brow: 0x4a3a20, stubble: 0 }, mats: SC.mats('trandoshan2', 0x6a5a3a, 0x4a3e26, 0x4a3420, 0x2a2014) }));
CAST.QC.bosskarr = { outfit: 'uniform', top: 0x4a5232, vest: 0x505a36, low: 0x3e4428, belt: 0x2a1c12, boots: 0x2a2014, bootY: 0.44, collarShell: 0x3a2a1a, bulk: 1.12, cullHead: true };
CAST.QC.trandoshan = Object.assign({}, CAST.QC.bosskarr, { collarShell: 0 });
CAST.QC.trandoshan2 = Object.assign({}, CAST.QC.trandoshan, { top: 0x6a5a3a, vest: 0x5a4a30, low: 0x4a3e26, belt: 0x3a2a1a, boots: 0x2a2014 });
CAST.SPECS.vak = SC.spec('vak', { height: 0.96, shoulders: 1.1, head: false, eyes: 'brown', skin: { tone: 0x7c8a62, brow: 0x4a5034, stubble: 0 }, body: { bulk: 1.2, collar: 'low', sleeve: [0.07, 0.06, 0.056], trouser: [0.09, 0.07], bootTop: 0.42 },
  mats: SC.mats('vak', 0x4a4a3a, 0x3e3a2e, 0x3a2a18, 0x2a2014) });
CAST.QC.vak = { outfit: 'uniform', top: 0x4a4a3a, vest: 0x8a7b58, belt: 0x3a2a18, low: 0x3e3a2e, boots: 0x2a2014, bootY: 0.44, bulk: 1.2, cullHead: true };
CAST.QC.donn = { outfit: 'uniform', top: 0x3a3e46, vest: 0x2a2e36, low: 0x2e3238, belt: 0x2a2a2a, boots: 0x1a1a1a, bootY: 0.44, glove: 0x1a1a1a, collarShell: 0xa02020, sash: 0xa02020,
  bulk: 0.96, cullHead: true };
CAST.SPECS.traya_holo = SC.spec('traya_holo', { height: 0.98, shoulders: 0.92, eyes: 'blue', skin: { tone: 0xb8b8c8, brow: 0xc8d0e0, stubble: 0 }, cloth: undefined, mats: SC.mats('traya', 0x2a2f3a, 0x2a2f3a, 0x2a2f3a, 0x20242c) });
CAST.QC.traya_holo = { outfit: 'robe', female: true, top: 0x2a2f3a, vest: 0x2a2f3a, low: 0x2a2f3a, boots: 0x20242c, bootY: 0.44, collarShell: 0x2a2f3a,
  hair: ['Hair_Long'], hairCol: 0xc8d0e0, browCol: 0xc8d0e0, bulk: 0.92 };

/* ---- hologram material (order66 HOLO technique: Fresnel rim, scanlines, flicker, moving band). Skinned variant for body parts */
SC.holoU = () => ({ uT: { value: 0 }, uA: { value: 1 } });
SC.holoMat = function (col, skinned, U) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uT: U.uT, uA: U.uA, uCol: { value: new THREE.Color(col) } },
    vertexShader: `#include <common>
      #include <skinning_pars_vertex>
      varying vec3 vW; varying vec3 vN; varying vec3 vV;
      void main() {
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 w = modelMatrix * vec4(transformed, 1.0);
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * objectNormal); vV = cameraPosition - w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `uniform float uT; uniform float uA; uniform vec3 uCol; varying vec3 vW; varying vec3 vN; varying vec3 vV;
      float h(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float scan = 0.6 + 0.4 * sin(vW.y * 90.0 - uT * 8.0);
        float flick = 0.85 + 0.15 * h(floor(uT * 24.0));
        float band = step(0.97, fract(vW.y * 1.3 - uT * 0.7)) * 0.6;
        vec3 c = uCol * (0.25 + 1.4 * pow(f, 1.6)) * scan * flick + uCol * band;
        gl_FragColor = vec4(c * uA, 1.0);
      }` });
};

/* ---- small geometry helpers: everything is built in metres and merged, so a head is a handful of draw calls */
SC.merge = function (geos) {
  let n = 0; const qs = geos.map((g) => { const q = g.index ? g.toNonIndexed() : g; if (!q.attributes.normal) q.computeVertexNormals(); n += q.attributes.position.count; return q; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0;
  for (const q of qs) { P.set(q.attributes.position.array, o * 3); N.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); return out;
};
SC.ell = (c, r, seg) => { const sg = seg || 14, g = new THREE.SphereGeometry(1, sg, Math.round(sg * 0.7)); g.scale(r[0], r[1], r[2]); g.translate(c[0], c[1], c[2]); return g; };
SC.cone = (c, rad, h, dir) => { const g = new THREE.ConeGeometry(rad, h, 6); g.translate(0, h / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dir[0], dir[1], dir[2]).normalize())); g.translate(c[0], c[1], c[2]); return g; };
SC.tube = (pts, rad) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), 14, rad, 6, false);
SC.box = (c, s) => { const g = new THREE.BoxGeometry(s[0], s[1], s[2]); g.translate(c[0], c[1], c[2]); return g; };
SC.scaleTex = function () {   // procedural olive-ochre scale pattern, cached once
  if (SC.tex.scale) return SC.tex.scale;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#8a8a58'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) { const px = Math.random() * 256, py = Math.random() * 256, r = 3 + Math.random() * 5, k = Math.random();
    x.beginPath(); x.arc(px, py, r, 0, TAU); x.fillStyle = k < 0.5 ? 'rgba(40,42,22,0.42)' : 'rgba(200,196,130,0.22)'; x.fill();
    x.beginPath(); x.arc(px - r * 0.3, py - r * 0.3, r * 0.5, 0, TAU); x.fillStyle = 'rgba(220,215,150,0.12)'; x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; SC.tex.scale = t; return t;
};
SC.runeTex = function () {
  if (SC.tex.rune) return SC.tex.rune;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#fff'; x.lineWidth = 6; x.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const cx = 16 + (i % 3) * 40 + Math.random() * 6, cy = 16 + Math.floor(i / 3) * 40 + Math.random() * 6; x.beginPath();
    x.moveTo(cx, cy); x.lineTo(cx + 18 * (Math.random() - 0.5) * 2, cy + 18); x.moveTo(cx + 8, cy + 8); x.lineTo(cx + 22 * (Math.random() - 0.5) * 2, cy + 2); x.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; SC.tex.rune = t; return t;
};
SC.crackTex = function () {
  if (SC.tex.crack) return SC.tex.crack;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  x.fillStyle = '#c8ccd4'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#1a1e24'; x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(64, 0); x.lineTo(56, 40); x.lineTo(74, 70); x.lineTo(60, 128); x.moveTo(74, 70); x.lineTo(100, 90); x.moveTo(56, 40); x.lineTo(30, 52); x.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; SC.tex.crack = t; return t;
};

/* Donn: the flight helmet (thug shell) with a cracked glass visor; defined here because the visor reads SC.crackTex */
CAST.SPECS.donn = SC.spec('donn', { height: 1.0, shoulders: 0.94, head: false, helmet: 'thug', eyes: 'blue', skin: { tone: 0xd0a080, brow: 0x5a3a24, stubble: 0 },
  visor: new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.12, metalness: 0.6, map: SC.crackTex(), envMapIntensity: 1.2 }), helmetMat: CM.plain(0xc8ccd4, 0.4, 0.2, 'donnHelm'),
  mats: SC.mats('donn', 0x3a3e46, 0x2e3238, 0x2a2a2a, 0x1a1a1a) });

/* ---- head-joint relative placement for helmets, hoods and rigid heads: the base body puts the skull centre at (0, 0.091 s, 0.027 s) */
SC.headC = (T) => { const s = T.qb ? T.qb.s : 1; return [0, 0.091 * s, 0.027 * s]; };
SC.hood = function (T, mat, up) {
  const c = SC.headC(T), gs = [];
  if (up) { const cap = new THREE.SphereGeometry(0.118, 26, 16, 0, TAU, 0, 0.98); cap.scale(1.0, 1.08, 1.12); cap.translate(c[0], c[1] + 0.012 * T.qb.s, c[2] - 0.012 * T.qb.s); gs.push(cap); }
  const back = new THREE.CylinderGeometry(up ? 0.11 : 0.1, up ? 0.15 : 0.13, 0.2, 18, 1, true, Math.PI / 2, Math.PI);
  back.translate(0, c[1] - (up ? 0.1 : 0.04), c[2] - (up ? 0.06 : 0.05)); gs.push(back);
  T.attach.push({ bone: 4, geo: SC.merge(gs), mat, pos: [0, 0, 0], name: 'hood', shadow: true });
};
SC.reptile = function (T, o) {
  const s = T.qb ? T.qb.s : 1, c = [0, 0.091 * s, 0.027 * s], at = (x, y, z) => [c[0] + x, c[1] + y, c[2] + z];
  const skin = [SC.ell(at(0, 0.02, -0.035), [0.075, 0.072, 0.085]), SC.ell(at(0, -0.02, 0.03), [0.062, 0.05, 0.065]), SC.ell(at(0, 0.055, 0.02), [0.072, 0.02, 0.04]),
    SC.ell(at(0, 0.0, 0.11), [0.046, 0.042, 0.07]), SC.ell(at(0, -0.002, 0.19), [0.032, 0.03, 0.05]), SC.ell(at(0, -0.06, 0.09), [0.046, 0.02, 0.095])];
  for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.028; skin.push(SC.cone(at(x, 0.07 - Math.abs(x) * 0.5, -0.06), 0.012, 0.075, [x * 0.6, 0.7, -0.6])); }   // frill spikes
  for (const sx of [1, -1]) skin.push(SC.cone(at(sx * 0.05, 0.07, 0.06), 0.008, 0.03, [sx * 0.3, 0.6, 0.7]));   // brow spikes
  const dark = [], teeth = [], eyes = [];
  for (const sx of [1, -1]) {
    eyes.push(SC.ell(at(sx * 0.047, 0.035, 0.07), [0.018, 0.018, 0.018], 12));
    dark.push(SC.ell(at(sx * 0.047, 0.035, 0.087), [0.004, 0.012, 0.003], 8));
    dark.push(SC.ell(at(sx * 0.012, 0.012, 0.205), [0.006, 0.005, 0.006], 8));
  }
  for (let z = 0.14; z <= 0.2; z += 0.02) for (const x of [-0.022, -0.008, 0.008, 0.022]) { teeth.push(SC.cone(at(x, -0.02, z), 0.0055, 0.022, [0, -1, 0])); teeth.push(SC.cone(at(x, -0.045, z), 0.0055, 0.02, [0, 1, 0])); }
  const T4 = (geo, mat, name) => T.attach.push({ bone: 4, geo, mat, pos: [0, 0, 0], name: name || 'head', shadow: true });
  const tint = o.tint || 0xffffff, skinMat = new THREE.MeshStandardMaterial({ color: tint, map: SC.scaleTex(), roughness: 0.72, metalness: 0, envMapIntensity: 0.6 });
  T4(SC.merge(skin), skinMat, 'head');
  T4(SC.merge(eyes), new THREE.MeshStandardMaterial({ color: 0x3a2a08, emissive: 0xd8b020, emissiveIntensity: 0.9, roughness: 0.2 }), 'eye');
  T4(SC.merge(dark), new THREE.MeshStandardMaterial({ color: 0x0a0a06, roughness: 0.4 }), 'eye');
  T4(SC.merge(teeth), new THREE.MeshStandardMaterial({ color: 0xd6cdb0, roughness: 0.5 }), 'teeth');
  if (o.scar) T4(SC.tube([at(-0.03, 0.03, 0.09), at(0.0, 0.036, 0.13), at(0.032, 0.026, 0.165)], 0.0028), new THREE.MeshStandardMaterial({ color: 0x5a2a20, roughness: 0.8 }), 'scar');
};
SC.claws = function (T, bones) {
  const J = T.J, mat = new THREE.MeshStandardMaterial({ color: 0x2a2a22, roughness: 0.4 });
  for (const [bone, sx] of bones) {
    const off = [sx * (J.fist[0] - J.wrist[0]), J.fist[1] - J.wrist[1], J.fist[2] - J.wrist[2]], gs = [];
    for (const x of [-0.012, 0, 0.012]) gs.push(SC.cone([off[0] + x * sx, off[1] - 0.004, off[2] + 0.03], 0.0075, 0.05, [0, -0.2, 1]));
    T.attach.push({ bone, geo: SC.merge(gs), mat, pos: [0, 0, 0], name: 'claw' });
  }
};

/* ---- per-character builds, run on the template CAST.human returns */
SC.extra.milian = (T) => SC.hood(T, CM.cloth(0x1a1220, 0x403050, 0.9, 'sc_hooddown', true), false);
SC.extra.milian_hood = (T) => SC.hood(T, CM.cloth(0x1a1220, 0x403050, 0.9, 'sc_hoodup', true), true);
SC.extra.kyros = (T) => {   // scar across the brow and cheek: a thin painted-dark tube lying on the skin
  const c = SC.headC(T), at = (x, y, z) => [c[0] + x, c[1] + y, c[2] + z];
  T.attach.push({ bone: 4, geo: SC.tube([at(-0.058, 0.052, 0.07), at(-0.034, 0.034, 0.092), at(-0.012, 0.012, 0.1)], 0.0016), mat: new THREE.MeshStandardMaterial({ color: 0x4a2a22, roughness: 0.8 }), pos: [0, 0, 0], name: 'scar' });
};
/* RATHATRI — the pit wrote on him: a split brow, a cheek slash, a lip scar (every stage), and in stage I the Hutt slave collar,
   pitted iron with a tracking diode that never stops blinking */
SC.rathScars = (T) => {
  const c = SC.headC(T), at = (x, y, z) => [c[0] + x, c[1] + y, c[2] + z], m = new THREE.MeshStandardMaterial({ color: 0x8e6656, roughness: 0.5, metalness: 0, envMapIntensity: 0.5 }), dk = new THREE.MeshStandardMaterial({ color: 0x4a241c, roughness: 0.7 });
  T.attach.push({ bone: 4, geo: SC.merge([SC.tube([at(0.034, 0.072, 0.084), at(0.038, 0.055, 0.093), at(0.041, 0.04, 0.096)], 0.0014),
    SC.tube([at(-0.05, 0.012, 0.075), at(-0.039, -0.006, 0.086), at(-0.026, -0.022, 0.093)], 0.0013),
    SC.tube([at(0.008, -0.036, 0.104), at(0.011, -0.048, 0.1)], 0.0014)]), mat: m, pos: [0, 0, 0], name: 'scar' });
  T.attach.push({ bone: 4, geo: SC.tube([at(0.07, 0.03, 0.02), at(0.074, 0.0, 0.03), at(0.07, -0.03, 0.035)], 0.0021), mat: dk, pos: [0, 0, 0], name: 'scar' });   // burn line under the ear
};
SC.extra.rath3 = SC.extra.rath5 = (T) => SC.rathScars(T);
SC.extra.rath1 = (T) => {
  SC.rathScars(T);
  const r = 0.068;
  const ring = new THREE.TorusGeometry(r, 0.0135, 8, 28); ring.rotateX(Math.PI / 2); ring.scale(1, 1.6, 1.12);
  const lock = new THREE.BoxGeometry(0.034, 0.03, 0.02); lock.translate(0, -0.004, r * 1.12 + 0.012);
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.55, metalness: 0.85, envMapIntensity: 0.7 });
  T.attach.push({ bone: 3, geo: SC.merge([ring, lock]), mat: iron, pos: [0, 0.035, 0.012], name: 'collar', shadow: true });
  const led = new THREE.SphereGeometry(0.0042, 8, 6); led.translate(0.009, 0.0, r * 1.12 + 0.023);
  T.attach.push({ bone: 3, geo: led, mat: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.25, 0.1), toneMapped: false }), pos: [0, 0.035, 0.012], name: 'collarLed' });
};
SC.extra.trandoshan = (T) => { SC.reptile(T, {}); SC.claws(T, [[8, 1], [12, -1]]); };
SC.extra.trandoshan2 = (T) => { SC.reptile(T, { tint: 0xc8a870 }); SC.claws(T, [[8, 1], [12, -1]]); };
SC.extra.bosskarr = (T) => {
  SC.reptile(T, { scar: 1, tint: 0xb0b080 }); SC.claws(T, [[8, 1], [12, -1]]);
  const J = T.J, bead = SABER.mats().bone, nk = [];   // trophy necklace of bone beads and two fangs
  for (let i = 0; i <= 12; i++) { const a = -1.3 + (i / 12) * 2.6; nk.push(SC.ell([Math.sin(a) * 0.088, 0.0, Math.cos(a) * 0.088], [0.009, 0.009, 0.009], 8)); }
  nk.push(SC.cone([0, -0.02, 0.09], 0.008, 0.04, [0, -1, 0.3]));
  T.attach.push({ bone: 3, geo: SC.merge(nk), mat: bead, pos: [0, 0, 0], name: 'necklace' });
  const sh = [0.13, 0.13, 0.1], hp = [-0.13, -0.27, 0.11];   // bandolier strap, shoulder to hip, across the chest
  T.attach.push({ bone: 2, geo: SC.tube([[sh[0], 0.12, 0.12], [0.0, -0.02, 0.15], [hp[0], hp[1], hp[2]]], 0.014), mat: new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.85 }), pos: [0, 0, 0], name: 'bandolier' });
};
SC.extra.vak = (T) => {   // bulb head: a large smooth skull with two dark eyes; gill slits on the throat, bone-oil stains read as darker skin
  const s = T.qb.s, J = T.J, c = [0, 0.091 * s + 0.03, 0.027 * s - 0.005];
  const bulb = SC.ell(c, [0.105, 0.135, 0.115], 24), eyes = SC.merge([SC.ell([c[0] + 0.04, c[1] + 0.02, c[2] + 0.1], [0.022, 0.016, 0.02], 10), SC.ell([c[0] - 0.04, c[1] + 0.02, c[2] + 0.1], [0.022, 0.016, 0.02], 10)]);
  T.attach.push({ bone: 4, geo: bulb, mat: CM.plain(0x7c8a62, 0.45, 0, 'vakBulb'), pos: [0, 0, 0], name: 'head' });
  T.attach.push({ bone: 4, geo: eyes, mat: new THREE.MeshStandardMaterial({ color: 0x0a0a06, roughness: 0.3 }), pos: [0, 0, 0], name: 'eye' });
  const g = SC.merge([SC.box([-0.07, 0.0, 0.04], [0.008, 0.05, 0.016]), SC.box([0.07, 0.0, 0.04], [0.008, 0.05, 0.016])]);
  T.attach.push({ bone: 3, geo: g, mat: new THREE.MeshStandardMaterial({ color: 0x2a2010, roughness: 0.6 }), pos: [0, 0, 0], name: 'gill' });
};
SC.extra.traya_holo = (T) => {   // the whole body is hologram light: skinned parts take the skinned shader, the hood the rigid one
  const U = SC.holoU(), col = 0x7a8cff; T.holoU = U;
  for (const p of T.qb.parts) { p.mats = [SC.holoMat(col, true, U)]; p.shadow = false; }
  SC.hood(T, SC.holoMat(col, false, U), true);
};

/* the CAST.human hook: every story template gets its extras once, after the normal build */
const _castHuman = CAST.human;
CAST.human = async function (spec) { SC.install(); const T = await _castHuman(spec); const f = SC.extra[spec.name]; if (f) f(T, spec); return T; };
const _castNeed = CAST.need;
CAST.need = async function (names, progress) { SC.install(); return _castNeed.call(this, names, progress); };

/* ---- props (PROPS_STORY.* return THREE.Group, origin at the grip or the holder's base) */
const PROPS_STORY = {};
PROPS_STORY.holocron = function () {   // pale gold cube held in a frame, with runes on the core
  const g = new THREE.Group(), L = 0.058, t = 0.0035, E = [];
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {   // the twelve edges of a cube: four along each axis
    E.push(SC.box([0, s1 * L / 2, s2 * L / 2], [L + t, t, t])); E.push(SC.box([s1 * L / 2, 0, s2 * L / 2], [t, L + t, t])); E.push(SC.box([s1 * L / 2, s2 * L / 2, 0], [t, t, L + t])); }
  g.add(new THREE.Mesh(SC.merge(E), new THREE.MeshStandardMaterial({ color: 0x8a6a2e, metalness: 0.9, roughness: 0.35 })));
  const core = new THREE.Mesh(new THREE.BoxGeometry(L * 0.7, L * 0.7, L * 0.7), new THREE.MeshStandardMaterial({ color: 0x3a2a10, emissive: 0xffc070, emissiveMap: SC.runeTex(), emissiveIntensity: 2.2, roughness: 0.3 }));
  g.add(core); g.userData.core = core; return g;
};
PROPS_STORY.gaff = function () {   // Vurrin pit-master's gaff: a wood haft, three brass bands and a hooked head
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.8, metalness: 0 }), brass = new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 1, roughness: 0.32 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.021, 1.45, 10), wood));
  for (const y of [-0.12, 0.12, 0.62]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.024, 12), brass); b.position.y = y; g.add(b); }
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 18, Math.PI * 1.35), brass); hook.position.set(0.045, 0.78, 0); hook.rotation.z = -Math.PI * 0.2; g.add(hook);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 8), brass); spike.position.y = 0.8; g.add(spike);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
};
PROPS_STORY.holocronGlow = function () {   // Traya's cracked black-gold holocron on a stand, projecting her figure in a cone of light
  const g = new THREE.Group(), U = SC.holoU(), dark = new THREE.MeshStandardMaterial({ color: 0x14101a, emissive: 0x4a80ff, emissiveMap: SC.crackTex(), emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.5 });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), dark); core.scale.set(1, 1.25, 1); core.position.y = 0.2; g.add(core);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.62, 1.7, 28, 1, true), SC.holoMat(0x3a70d0, false, U)); cone.position.y = 1.1; g.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.6, 28), SC.holoMat(0x6a8cff, false, U)); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.01; g.add(pool);
  g.userData.U = U; return g;
};
PROPS_STORY.trandoMask = function () {   // carved bone-red ceremonial mask for the trophy wall, facing +Z
  const red = new THREE.MeshStandardMaterial({ color: 0x8a4a34, roughness: 0.58, metalness: 0 }), dark = new THREE.MeshStandardMaterial({ color: 0x0a0606, roughness: 0.9 }), g = new THREE.Group();
  const face = new THREE.Mesh(SC.merge([SC.ell([0, 0, 0], [0.1, 0.13, 0.04], 22), SC.box([0, -0.03, 0.035], [0.08, 0.05, 0.02])]), red); g.add(face);
  const eyes = new THREE.Mesh(SC.merge([SC.ell([-0.04, 0.02, 0.035], [0.026, 0.014, 0.012], 10), SC.ell([0.04, 0.02, 0.035], [0.026, 0.014, 0.012], 10)]), dark); g.add(eyes);
  const horns = new THREE.Mesh(SC.merge([SC.cone([-0.08, 0.06, -0.01], 0.018, 0.12, [-0.5, 0.8, -0.3]), SC.cone([0.08, 0.06, -0.01], 0.018, 0.12, [0.5, 0.8, -0.3])]), red); g.add(horns);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
};
/* Bosskarr's hunting rifle: CAST.rifle adds itself to the scene, so take it back out; bone-pale stock wrap, olive-drab receiver */
SC.rifle = function () {
  const g = CAST.rifle('hunt'); R.scene.remove(g);
  g.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x2e2f33) o.material = new THREE.MeshStandardMaterial({ color: 0x3a3a2c, roughness: 0.4, metalness: 0.3 }); });
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0xcfc2a8, roughness: 0.6 })); stock.position.set(0, -0.09, -0.02); g.add(stock);
  return g;
};

/* ---- holds: a story pose for a prop, applied after animate and before the IK (Pose fields: hp hilt centre, hq axis, grips) */
SC.hold = function (a, prop, o) {
  a.setProp(prop, false);
  a.storyHold = { hp: o.hp || [0.02, 1.12, 0.2], aim: o.aim || [0, 0, 1], gL: o.gL === undefined ? 1 : o.gL, gR: o.gR === undefined ? 1 : o.gR, oL: o.oL === undefined ? 0 : o.oL, oR: o.oR === undefined ? 0 : o.oR };
};
SC.RIFLE_HOLD = { hp: [0.02, 1.12, 0.2], aim: [0, 0.06, 1], oL: 0.2, oR: -0.04 };
/* the saber Actor offhand: a second single blade in the left fist (bone 8 = handL), blade pointing forward, visual only */
CAST.offhandSaber = function (a, colour, lit) {
  if (a.saber2) { a.saber2.remove(); a.saber2 = null; }
  const S = new Saber('single', colour, { prio: 4 });
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.0172, 0.0172, 0.055, 12), SABER.mats().leather); wrap.position.y = -0.035; S.hilt.add(wrap);   // wrapped grip
  S.group.position.set(0, 0.01, 0.03); S.group.rotation.set(Math.PI / 2, 0, 0.15);
  a.inst.bones[8].add(S.group);
  a.saber2 = S; S.ignite(undefined, !!lit); S.ign = S.ends.map(() => (lit ? 1 : 0));
  return S;
};

/* ---- engine hooks. Actor (p17) and CINE (p52) load after this part, so they are wrapped once, on the first CAST.need / CAST.human call (SC.install) */
SC.install = function () {
if (SC.installed) return; SC.installed = true;
const _p3 = Actor.prototype.pose3D;
Actor.prototype.pose3D = function (dt) {
  const h = this.storyHold;
  if (h) { const P = this.pose; P.hp.set(h.hp[0], h.hp[1], h.hp[2]); ANIM.axisQ(h.aim[0], h.aim[1], h.aim[2], 0, P.hq); P.gL = h.gL; P.gR = h.gR; P.oL = h.oL; P.oR = h.oR; }
  if (this.saber2) this.saber2.update(dt, MG.t);
  if (this.T.holoU) { this.T.holoU.uT.value = MG.t; this.T.holoU.uA.value = 0.92 + 0.08 * Math.sin(MG.t * 37.0) * Math.sin(MG.t * 3.1); }
  _p3.call(this, dt);
};
const _dispose = Actor.prototype.dispose;
Actor.prototype.dispose = function () {
  if (this.saber2) { this.saber2.remove(); this.saber2 = null; }
  if (this.groundProp) { R.scene.remove(this.groundProp); this.groundProp = null; }
  _dispose.call(this);
};
const _cineSpawn = CINE.spawn;
CINE.spawn = async function (s) {   // stage fields: prop ('holocron' | 'gaff' | 'rifle' | 'holocronGlow'), hold {hp,aim,oL,oR}, offhand (colour)
  const a = await _cineSpawn(s);
  if (s.offhand) CAST.offhandSaber(a, s.offhand, s.lit);
  if (s.prop === 'rifle') SC.hold(a, SC.rifle(), s.hold || SC.RIFLE_HOLD);
  else if (s.prop === 'holocronGlow') { const g = PROPS_STORY.holocronGlow(), p = s.pos || [0, 0, 0]; g.position.set(p[0], 0, p[2]); R.scene.add(g); a.groundProp = g; }
  else if (s.prop) a.setProp(s.prop === 'gaff' ? PROPS_STORY.gaff() : PROPS_STORY.holocron(), false);
  return a;
};
};
