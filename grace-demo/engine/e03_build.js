/* BUILD — the room builder. A Room is a THREE.Group plus everything the scene needs to run it: walk bounds, camera rail,
   interactables, animated flames and glows, flickering lights and per-frame ticks. Rooms are laid out in metres
   (x along the back wall, z toward the camera, y up). Architecture and furniture are boxes whose faces get texel-true
   UVs (32 texels/m, projected on each face's dominant plane); small props are pixel "cards" standing in the room, so
   they are lit, shadowed and reflected like everything else.
   Usage:  const room = new Room('id', { X0, X1, CEIL, KZ, cam }); BUILD.begin(room); BUILD.box(...); …; BUILD.end(); */
class Room {
  constructor(id, o) {
    Object.assign(this, { id, X0: -10, X1: 10, CEIL: 4.7, KZ: 2.6, cam: { y: 2.45, look: 2.18, dist: 19.4, fov: 19 }, exposure: 1.0, reflK: 0.6, walkMin: null, walkMax: null }, o || {});
    this.group = new THREE.Group(); this.group.name = id;
    this.inter = []; this.flames = []; this.glows = []; this.shafts = []; this.flick = []; this.tick = []; this.actors = []; this.lights = {};
  }
  update(t, dt) {
    for (const f of this.flames) { const fr = Math.floor(t * f.rate + f.ph) % f.n; f.t.offset.x = fr / f.n; }
    for (const g of this.glows) g.s.scale.setScalar(g.size * (0.92 + 0.12 * noise1(t * 5 + g.ph, 3)));
    for (const s of this.shafts) s.me.material.opacity = 0.8 + 0.2 * Math.sin(t * 0.4 + s.ph);
    for (const l of this.flick) l.L.intensity = l.base * (0.82 + 0.22 * noise1(t * l.rate + l.ph, 1) + 0.1 * noise1(t * l.rate * 2.3 + l.ph, 2));
    for (const f of this.tick) f(t, dt);
  }
  /* things the king can look at: { id, x, y, z, r, use } — use(room, it) runs when he does */
  interact(id, x, y, z, r, use) { const it = { id, x, y, z, r, use, p: new THREE.Vector3(x, y, z), hidden: false }; this.inter.push(it); return it; }
}
const BUILD = { room: null, mats: {} };
BUILD.begin = function (room) { BUILD.room = room; return room; };
BUILD.end = function () { const r = BUILD.room; if (!r.noMerge) BUILD.merge(r); r.built = true; BUILD.room = null; return r; };
/* static batching: every plain mesh in the room that shares a material, layer and shadow flags is merged into one
   geometry, so a room of a few hundred boxes and cards draws in a few dozen calls. Things marked { dyn: true } (and
   anything animated, toggled or multi-material) stay separate. */
BUILD.merge = function (room) {
  room.group.updateMatrixWorld(true);
  const groups = new Map();
  for (const o of room.group.children) {
    if (!o.isMesh || o.isSkinnedMesh || o.userData.dyn || Array.isArray(o.material)) continue;
    const g = o.geometry; if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) continue;
    const key = o.material.uuid + '|' + o.layers.mask + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder;
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o);
  }
  let before = 0, after = 0;
  for (const list of groups.values()) {
    before += list.length; if (list.length < 2) { after++; continue; }
    let nv = 0, ni = 0; for (const o of list) { nv += o.geometry.attributes.position.count; ni += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni); let vo = 0, io = 0;
    for (const o of list) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const c = g.attributes.position.count;
      P.set(g.attributes.position.array, vo * 3); N.set(g.attributes.normal.array, vo * 3); U.set(g.attributes.uv.array, vo * 2);
      if (g.index) { const s = g.index.array; for (let k = 0; k < s.length; k++) I[io + k] = s[k] + vo; io += s.length; } else { for (let k = 0; k < c; k++) I[io + k] = vo + k; io += c; }
      vo += c; g.dispose(); o.geometry.dispose(); room.group.remove(o); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(U, 2)); mg.setIndex(new THREE.BufferAttribute(I, 1)); mg.computeBoundingSphere();
    const m = new THREE.Mesh(mg, list[0].material); m.layers.mask = list[0].layers.mask; m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder; m.userData.merged = list.length;
    room.group.add(m); after++;
  }
  room.batch = { before, after };
};
BUILD.std = function (tex, o) {
  o = o || {};
  const key = (tex ? tex.uuid : 'none') + JSON.stringify(o); if (BUILD.mats[key]) return BUILD.mats[key];
  const m = new THREE.MeshStandardMaterial({ map: tex || null, color: o.col === undefined ? 0xffffff : o.col, roughness: o.rough === undefined ? 0.88 : o.rough, metalness: o.metal || 0,
    alphaTest: o.alpha ? 0.5 : 0, side: o.side || THREE.FrontSide, emissive: o.emis || 0x000000, emissiveMap: o.emis ? tex : null, emissiveIntensity: o.ei || 1 });
  return (BUILD.mats[key] = m);
};
/* project world coords onto the face's dominant plane → texel-true UVs, so neighbouring pieces share one grid */
BUILD.planarUV = function (geo, tex) {
  const P = geo.attributes.position, N = geo.attributes.normal, uv = new Float32Array(P.count * 2), w = tex.userData.w || 32, h = tex.userData.h || 32, D = PX.D;
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i)); let a, b;
    if (nz >= nx && nz >= ny) { a = P.getX(i); b = P.getY(i); } else if (nx >= ny) { a = P.getZ(i); b = P.getY(i); } else { a = P.getX(i); b = -P.getZ(i); }
    uv[i * 2] = a * D / w; uv[i * 2 + 1] = b * D / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
};
BUILD.add = function (obj, o) {
  o = o || {};
  if (obj.isMesh) { obj.castShadow = o.cast !== false; obj.receiveShadow = o.recv !== false; }
  if (o.layer !== undefined) obj.layers.set(o.layer);
  if (o.dyn) obj.userData.dyn = true;
  (o.parent || BUILD.room.group).add(obj); return obj;
};
/* box spanning x0..x1, y0..y1, z0..z1. o: { taper: [kx, kz] (narrow the top), front: material for the +z face, col, rough, cast } */
BUILD.box = function (x0, x1, y0, y1, z0, z1, tex, o) {
  o = o || {};
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  if (o.taper) { const P = g.attributes.position, cx = (x0 + x1) / 2, cz = z0; for (let i = 0; i < P.count; i++) if (P.getY(i) > (y0 + y1) / 2) { P.setX(i, cx + (P.getX(i) - cx) * o.taper[0]); P.setZ(i, cz + (P.getZ(i) - cz) * o.taper[1]); } g.computeVertexNormals(); }
  tex = tex || PX.T.woodDark; BUILD.planarUV(g, tex);
  if (tex.userData.tint && o.col === undefined) o = Object.assign({ col: tex.userData.tint }, o);
  const mats = o.front ? [0, 1, 2, 3, 4, 5].map((k) => (k === 4 ? o.front : BUILD.std(tex, o))) : BUILD.std(tex, o);
  if (o.front) { const uv = g.attributes.uv; for (let i = 16; i < 20; i++) uv.setXY(i, (i - 16) % 2, (i - 16) < 2 ? 1 : 0); }
  return BUILD.add(new THREE.Mesh(g, mats), o);
};
/* a flat wall or floor piece with texel-true UVs. axis: 'z' (faces +z), 'x+' / 'x-' (side walls), 'y+' (floor), 'y-' (ceiling) */
BUILD.plane = function (axis, a0, a1, b0, b1, at, tex, o) {
  o = o || {};
  const g = new THREE.PlaneGeometry(a1 - a0, b1 - b0);
  if (axis === 'z') g.translate((a0 + a1) / 2, (b0 + b1) / 2, at);
  else if (axis === 'x+' || axis === 'x-') { g.rotateY(axis === 'x+' ? Math.PI / 2 : -Math.PI / 2); g.translate(at, (b0 + b1) / 2, (a0 + a1) / 2); }
  else { g.rotateX(axis === 'y+' ? -Math.PI / 2 : Math.PI / 2); g.translate((a0 + a1) / 2, at, (b0 + b1) / 2); }
  BUILD.planarUV(g, tex);
  return BUILD.add(new THREE.Mesh(g, o.mat || BUILD.std(tex, { rough: o.rough === undefined ? 0.92 : o.rough, col: o.col })), { cast: false, layer: o.layer });
};
/* a pixel card: bottom-centre at (x, y, z), sized from its texture at 32 texels/m (or o.w / o.h metres, o.s scale) */
BUILD.card = function (tex, x, y, z, o) {
  o = o || {};
  const w = o.w || (tex.userData.w / (tex.userData.n || 1)) / PX.D * (o.s || 1), h = o.h || tex.userData.h / PX.D * (o.s || 1);
  const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0);
  if (o.ru) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * o.ru); }
  const m = o.mat || (o.basic ? new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(o.col || 0xffffff).multiplyScalar(o.k || 1), alphaTest: 0.5, side: THREE.DoubleSide })
    : BUILD.std(tex, { alpha: true, side: THREE.DoubleSide, rough: o.rough, col: o.col }));
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); if (o.ry) me.rotation.y = o.ry; if (o.rx) me.rotation.x = o.rx;
  return BUILD.add(me, { cast: o.cast !== undefined ? o.cast : true, recv: true, layer: o.layer, parent: o.parent, dyn: o.dyn || !!o.mat });
};
/* animated flame card (k = HDR brightness so it blooms) */
BUILD.flame = function (x, y, z, s, big, o) {
  o = o || {};
  const base = big ? PX.T.fire : PX.T.flame, t = base.clone(); t.needsUpdate = true; t.repeat.x = 1 / base.userData.n; t.userData = Object.assign({}, base.userData);
  const m = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(o.col || 0xffffff).multiplyScalar(o.k || (big ? 3.2 : 2.6)), alphaTest: 0.5, side: THREE.DoubleSide });
  const me = BUILD.card(t, x, y, z, { mat: m, s, cast: false, parent: o.parent });
  BUILD.room.flames.push({ t, n: base.userData.n, ph: hash(x * 10, z * 10, 7) * 8, rate: big ? 11 : 9 });
  return me;
};
BUILD.glow = function (x, y, z, size, col, k, o) {
  const m = new THREE.SpriteMaterial({ map: PX.T.glow, color: new THREE.Color(col).multiplyScalar(k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(size); BUILD.add(s, { parent: o && o.parent }); BUILD.room.glows.push({ s, k, size, ph: hash(x * 7, y * 7, 9) * 10 }); return s;
};
BUILD.light = function (L, x, y, z, o) {
  L.position.set(x, y, z); L.layers.enableAll(); BUILD.add(L);
  if (L.target) { BUILD.add(L.target); }
  L.userData.base = L.intensity;
  if (o && o.flicker) BUILD.room.flick.push({ L, base: L.intensity, rate: o.flicker, ph: hash(x * 3, z * 3, 5) * 20 });
  return L;
};
/* static shadows: drawn once when a room is entered (actors don't cast into them; they have their own contact shadows) */
BUILD.shadow = function (L, size) { L.castShadow = true; L.shadow.mapSize.set(size, size); L.shadow.bias = -0.002; L.shadow.normalBias = 0.02; return L; };
BUILD.shaft = function (x, y, z, w, len, alpha, rot, col) {
  const g = new THREE.PlaneGeometry(w, len); g.translate(0, -len / 2, 0);
  const m = new THREE.MeshBasicMaterial({ map: PX.T.shaft, color: new THREE.Color(col || 0xffc887).multiplyScalar(alpha), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.rotation.set(rot[0], rot[1], rot[2]); BUILD.add(me, { cast: false, dyn: true });
  BUILD.room.shafts.push({ me, ph: x * 9 }); return me;
};
/* a rug or runner lying on the floor; o.ru / o.rv repeat the texture (a runner tiles along its length), o.y lifts it (onto a step) */
BUILD.rug = function (tex, x0, x1, z0, z1, o) {
  o = o || {}; const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, (o.y || 0) + 0.006, (z0 + z1) / 2);
  if (o.ru || o.rv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (o.ru || 1), uv.getY(i) * (o.rv || 1)); }
  return BUILD.add(new THREE.Mesh(g, BUILD.std(tex, { rough: 1 })), { cast: false, recv: true, layer: o.layer === undefined ? 2 : o.layer });
};
/* the glossy floor: standard material + the mirrored scene (R.reflU), blurred along the view's vertical, faded with fresnel.
   o.k scales the reflection; o.seam picks how texture darkness masks it (plank gaps / grout stay matte). */
BUILD.reflective = function (tex, o) {
  o = o || {};
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough || 0.5, metalness: 0 }), K = (o.k || 1).toFixed(3);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, R.reflU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uTexMat; varying vec4 vRefl; varying vec3 vWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 wp4 = modelMatrix * vec4(transformed, 1.0); vRefl = uTexMat * wp4; vWP = wp4.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform float uReflK; uniform vec2 uReflRes; varying vec4 vRefl; varying vec3 vWP;')
      .replace('#include <opaque_fragment>', `
        { vec2 ruv = vRefl.xy / vRefl.w; float seam = texture2D(map, vMapUv).r;
          vec2 px = 1.0 / uReflRes; ruv.x += (seam - 0.15) * 0.012;
          vec3 rc = texture2D(tRefl, ruv).rgb * 0.3 + (texture2D(tRefl, ruv + vec2(0.0, px.y * 2.0)).rgb + texture2D(tRefl, ruv - vec2(0.0, px.y * 2.0)).rgb) * 0.22
                  + (texture2D(tRefl, ruv + vec2(px.x, px.y * 5.0)).rgb + texture2D(tRefl, ruv - vec2(px.x, px.y * 5.0)).rgb) * 0.13;
          vec3 V = normalize(cameraPosition - vWP); float fres = 0.35 + 0.65 * pow(1.0 - max(V.y, 0.0), 3.0);
          outgoingLight += rc * uReflK * ${K} * fres * smoothstep(0.02, 0.09, seam); }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'reflfloor' + K;
  return m;
};
/* drifting dust (in a box), optional embers rising from a point, and big motes near the lens that the DOF turns into bokeh */
BUILD.motes = function (o) {
  const room = BUILD.room, N = R.q === 'low' ? Math.round(o.n * 0.5) : o.n, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) seed[i] = rng(i * 31 + 5)() * 100;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: PX.T.mote, size: 0.05, color: new THREE.Color(o.col || 0xffd8a0).multiplyScalar(1.8), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; BUILD.add(pts);
  const boxes = o.boxes;   // [[x0, x1, y0, y1, z0, z1, share], ...]
  let ep = null, epos = null, NE = 0;
  if (o.embers) { NE = 26; epos = new Float32Array(NE * 3); const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(epos, 3));
    ep = new THREE.Points(eg, new THREE.PointsMaterial({ map: PX.T.mote, size: 0.04, color: new THREE.Color(0xff7a2a).multiplyScalar(4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    ep.frustumCulled = false; BUILD.add(ep); }
  room.tick.push((t) => {
    let i = 0;
    for (const b of boxes) { const n = Math.round(N * b[6]); for (let k = 0; k < n && i < N; k++, i++) { const s = seed[i];
      pos[i * 3] = b[0] + ((s * 0.37 + t * 0.05) % (b[1] - b[0])) + Math.sin(t * 0.2 + s) * 0.2; pos[i * 3 + 1] = b[2] + ((s * 0.51) % (b[3] - b[2])) + Math.sin(t * 0.6 + s * 3) * 0.1; pos[i * 3 + 2] = b[4] + (s * 0.73 % (b[5] - b[4])); } }
    g.attributes.position.needsUpdate = true;
    if (ep) { const [ex, ey, ez] = o.embers; for (let j = 0; j < NE; j++) { const life = 2.4, ph = ((t + j * 0.37 * life / 2.6) % life) / life, s = j * 7.1;
      epos[j * 3] = ex + Math.sin(s) * 0.5 + Math.sin(t * 2 + s) * 0.08 * ph; epos[j * 3 + 1] = ey + ph * 1.2; epos[j * 3 + 2] = ez + Math.cos(s) * 0.1 + ph * 0.25; }
      ep.geometry.attributes.position.needsUpdate = true; }
  });
};
