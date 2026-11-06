/* THE BATTLE (a preview: chapter five's war, and the war camp to come). The king on a rise behind his army commands it,
   and two armies cross a wide field under an overcast morning's drizzle and meet. ENGINE.md §13n.
   How a thousand soldiers are drawn: real actors, baked. A man-at-arms of each side (the knight spec, sword and helmet) and
   a mounted knight of each side (a destrier Beast in its caparison, a knight seated on it with a couched lance) are posed
   through their clips (idle, walk, run, fight; the horse's idle, walk and gallop) and rendered from the front, the back and
   the side into a texture atlas per kind, then put through the people's own outline-and-posterise pass. On the field each
   soldier is one instance of a quad (THREE.InstancedBufferGeometry): it stands upright facing the camera, picks the row
   for the angle it is seen from (the side flipped for the other side), and the frame from the time and its own phase.
   So the armies are drawn in four calls, and still look like the people of the rooms.
   The field (world metres, the armies along Z): ours (Lodmir, blue) with its front at z −40 facing −Z, theirs (red) at
   z −200 facing +Z; five blocks of 16 files × 6 ranks each, cavalry on the wings; the king's rise at (34, 12) behind our
   right. They hold; on the king's order they advance at a walk, then charge; a rank stops behind the man ahead of it in its
   file, the front stops where it meets the enemy's front in its strip of the field, and they fight; men fall. */
const BATTLE = { atlas: {}, ready: false, units: [], on: false };
BATTLE.ROOM = SCENE.addRoom(new Room('battle', { X0: -240, X1: 240, CEIL: 80, KZ: 0, cam: { y: 10, look: 4, dist: 60, fov: 30 }, exposure: 1.3, reflK: 0, noPlayer: true, near: 0.5, far: 1600,
  // depth of field only for the very far: the armies are the picture, near and far (the rooms' 0.8 m near ramp smeared them)
  fog: [0x8a94a6, 0.0021], dof: { uNear0: 400, uNearR: 100, uFar0: 380, uFarR: 600 }, music: null, ambience: { rain: 0.35, wind: 0.7 }, acoustics: { size: 3, wet: 0.06 }, surface: 'grass' }));
BATTLE.RISE = { x: 34, z: 12, h: 6.5, r: 26 };
/* the land: a broad plain with a little roll in it, the rise the king commands from, low hills along both sides and behind
   the enemy, a dark ridge of mountains past them */
BATTLE.h = function (x, z) {
  const R0 = BATTLE.RISE, dr = Math.hypot((x - R0.x) / 1.25, z - R0.z), rise = R0.h * Math.pow(Math.max(0, 1 - dr / R0.r), 1.6);
  const roll = (noise1(x * 0.018 + z * 0.011, 801) - 0.5) * 2.2 + (noise1(x * 0.05 - z * 0.04, 802) - 0.5) * 0.6;
  const sides = smooth(120, 230, Math.abs(x)) * (14 + noise1(z * 0.02 + Math.sign(x) * 3, 803) * 16), back = smooth(-300, -420, z) * (22 + noise1(x * 0.012, 804) * 26);
  return Math.max(rise, roll * smooth(-330, -240, z) * 0.6 + roll * 0.4) + sides + back;
};
BATTLE.ROOM.build = function () {
  const room = BUILD.begin(this), T = PX.T;
  room.ground = BUILD.terrain({ x0: -420, x1: 420, z0: -600, z1: 240, step: 5, h: BATTLE.h, cls: (x, z, ny) => (ny > 0.8 ? 'turf' : 'rock'),
    tex: { turf: T.fieldPix, rock: T.cragPix }, side: { rock: true }, facet: { rock: true }, cast: false });
  /* the sky all round (the cameras look every way: a single backdrop plane left black voids in the side views): a cylinder
     of the overcast gradient, and two bands of cloud drifting on cylinders inside it */
  const C0 = new THREE.Vector3(0, -120, -120);
  { const g = new THREE.CylinderGeometry(900, 900, 900, 48, 1, true); g.translate(C0.x, C0.y + 450, C0.z);
    const m = new THREE.MeshBasicMaterial({ map: T.skyBattle, side: THREE.BackSide, fog: false, depthWrite: false, color: new THREE.Color(1.15, 1.15, 1.15) });
    const me = BUILD.add(new THREE.Mesh(g, m), { cast: false, recv: false, dyn: true }); me.renderOrder = -10; room.skyMat = m; room.skyK = 1.15; }
  room.clouds = [];
  for (const [tex, r, y0, h, spd, k, op, rep] of [[T.cloudsDay, 860, 110, 240, 0.0012, 1.25, 0.8, 6], [T.cloudsDay, 820, 200, 200, -0.0018, 1.35, 0.6, 4]]) {
    const g = new THREE.CylinderGeometry(r, r, h, 48, 1, true); g.translate(C0.x, y0 + h / 2, C0.z); const t2 = tex.clone(); t2.needsUpdate = true; t2.wrapS = THREE.RepeatWrapping; t2.repeat.x = rep;
    const cm = new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: op, side: THREE.BackSide, fog: false, depthWrite: false, color: new THREE.Color(0xffffff).multiplyScalar(k) });
    const me = BUILD.add(new THREE.Mesh(g, cm), { cast: false, recv: false, dyn: true }); me.renderOrder = -9; room.clouds.push({ t: t2, spd, m: cm, k, col: new THREE.Color(1, 1, 1) }); }
  room.tick.push((t) => { for (const c of room.clouds) c.t.offset.x = t * c.spd; });
  for (const [z, s, tex] of [[-640, 1.4, T.ridgeFar], [-560, 1.1, T.ridgeNear]]) { const g = new THREE.PlaneGeometry(1800, 120 * s); g.translate(0, 26 * s, z); BUILD.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true, depthWrite: true, color: new THREE.Color(1.3, 1.3, 1.4) })), { cast: false, dyn: true }); }
  /* on the rise: the swan's great standard planted beside the king, flapping */
  { const R0 = BATTLE.RISE, x = R0.x - 3.2, z = R0.z - 0.6, y = BATTLE.h(x, z);
    BUILD.box(x - 0.05, x + 0.05, y, y + 4.6, z - 0.05, z + 0.05, T.woodDark, { cast: false, dyn: true });
    room.standard = BUILD.windCard(T.swanBanner, x + 0.05, y + 2.6, z, 'flag', 0.35, { s: 1.0 }); }
  /* light: an overcast morning with the low sun breaking under the cloud from the west, rain, lightning far off */
  BUILD.light(new THREE.HemisphereLight(0xb8c2d4, 0x3a3a2a, 2.4), 0, 60, 0);
  const sun = BUILD.light(new THREE.DirectionalLight(0xffd8b0, 2.2), -160, 60, 30); sun.target.position.set(0, 0, -120);
  BUILD.rain({ n: 2600, box: [-40, 120, 0, 30, -150, 60], speed: 16, wind: 0.22, len: 0.6, opacity: 0.12 });   // a drizzle (the forty days), not a curtain
  BUILD.lightning({ x: -60, z: -400, min: 9, max: 18, k: 2.5, thunder: 0.8 });
  room.update(0, 0);
  return BUILD.end();
};
/* ---------------------------------------------------------------- the bake */
BATTLE.KINDS = {
  infBlue: { spec: () => Object.assign(knight('bkBlue', 0x24405a, 0, 1), { lazy: true }), cell: [1.9, 2.6], anims: [['Sword_Idle', 4], ['Walk_Loop', 8], ['Jog_Fwd_Loop', 8], ['Sword_Regular_Combo', 8]] },
  infRed: { spec: () => Object.assign(knight('bkRed', 0xa82a24, 0, 1), { lazy: true }), cell: [1.9, 2.6], anims: [['Sword_Idle', 4], ['Walk_Loop', 8], ['Jog_Fwd_Loop', 8], ['Sword_Regular_Combo', 8]] },
  cavBlue: { spec: () => Object.assign(knight('bcBlue', 0x24405a, 0, 1), { lazy: true, prop: 'lance' }), horse: { beast: 'grey', h: 2.3, caparison: { col: [0x24405a, 0xe8e2d6], n: 6 } }, cell: [3.6, 3.4], anims: [['Idle', 4], ['Walk', 8], ['Gallop', 8]] },
  cavRed: { spec: () => Object.assign(knight('bcRed', 0xa82a24, 0, 1), { lazy: true, prop: 'lance' }), horse: { beast: 'horse', h: 2.3, col: { Main: 0x6a2e14, Main_Dark: 0x3e1a0c, Main_Light: 0x8a4a22, Hair: 0x120c0a }, caparison: { col: [0xa82a24, 0xf0e8d8], n: 8 } }, cell: [3.6, 3.4], anims: [['Idle', 4], ['Walk', 8], ['Gallop', 8]] },
};
BATTLE.DIRS = [0, Math.PI, Math.PI / 2];   // the actor's yaw for the three rows: facing the lens, its back to the lens, facing screen-right
BATTLE.LAYER = 31;
BATTLE.bake = async function (onStep) {
  if (BATTLE.ready) return;
  const r = R.r, L = BATTLE.LAYER, D = PX.D;
  for (const a of SCENE.actors) if (a.layer === L) a.setLayer(Actor.PARK);   // the bake's layer is its own while it runs
  const hemi = new THREE.HemisphereLight(0xc8d0e0, 0x4a4434, 1.8); hemi.layers.set(L); R.scene.add(hemi);
  const key = Actor.key, rim = Actor.rim, keep = { kp: key.position.clone(), kt: key.target.position.clone(), ki: key.intensity, rp: rim.position.clone(), rt: rim.target.position.clone(), ri: rim.intensity, rc: rim.color.clone() };
  key.position.set(-2.4, 4.5, 6); key.target.position.set(0, 1.2, 0); key.intensity = 2.0; rim.position.set(3, 3.5, -4); rim.target.position.set(0, 1.2, 0); rim.intensity = 0.7; rim.color.set(0xffd8b0);
  const bg = R.scene.background, fog = R.scene.fog; R.scene.background = null; R.scene.fog = null;
  try {
    for (const [kind, K] of Object.entries(BATTLE.KINDS)) {
      const man = await new Actor(K.spec()).build(); man.setLayer(L); man.setVisible(false); man.root.visible = true;
      let horse = null; if (K.horse) { horse = await new Beast(Object.assign({ id: 'bh' + kind, box: K.cell }, K.horse)).build(); horse.setLayer(L); horse.setVisible(false); horse.root.visible = true; }
      const [cw, ch] = K.cell, PW = Math.round(cw * D), PH = Math.round(ch * D), cols = 8, rows = K.anims.length * 3;
      const mk = () => new THREE.WebGLRenderTarget(cols * PW, rows * PH, { type: R.type, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, generateMipmaps: false });
      const rt = mk(), out = mk();
      const cam = new THREE.OrthographicCamera(-cw / 2, cw / 2, ch / 2, -ch / 2, 0.1, 30); cam.layers.set(L);
      r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear();
      K.anims.forEach(([clip, n], ai) => BATTLE.DIRS.forEach((yaw, di) => { for (let f = 0; f < 8; f++) {
        const fr = f % n, row = ai * 3 + di;
        BATTLE.posePair(man, horse, clip, fr / n, yaw);
        cam.position.set(0, ch / 2 - 0.05, 12); cam.lookAt(0, ch / 2 - 0.05, 0); cam.updateMatrixWorld();
        rt.viewport.set(f * PW, (rows - 1 - row) * PH, PW, PH); rt.scissor.copy(rt.viewport); rt.scissorTest = true;
        r.setRenderTarget(rt); r.render(R.scene, cam); } }));
      rt.scissorTest = false;
      // the people's own sprite pass over the whole sheet: a 1 px dark rim, colours posterised to 24 levels
      const fx = Actor.fxMat(); fx.uniforms.t.value = rt.texture; fx.uniforms.uTexel.value.set(1 / (cols * PW), 1 / (rows * PH));
      R.quad.material = fx; r.setRenderTarget(out); r.clear(); r.render(R.quadScene, R.quadCam); r.setRenderTarget(null);
      BATTLE.atlas[kind] = { tex: out.texture, rt: out, cols, rows, cell: K.cell, anims: K.anims };
      for (const a of [man, horse]) if (a) { R.scene.remove(a.root); for (const m of [a.card, a.blob, a.shadow, a.propObj]) if (m && m.parent) m.parent.remove(m); }
      rt.dispose(); if (onStep) await onStep(kind); await nextFrame();
    }
    BATTLE.ready = true;
  } finally {
    R.scene.remove(hemi); R.scene.background = bg; R.scene.fog = fog;
    key.position.copy(keep.kp); key.target.position.copy(keep.kt); key.intensity = keep.ki; rim.position.copy(keep.rp); rim.target.position.copy(keep.rt); rim.intensity = keep.ri; rim.color.copy(keep.rc);
  }
};
/* one frame of a soldier (or a knight on his horse) at fraction u through a clip, turned to yaw */
BATTLE.posePair = function (man, horse, clip, u, yaw) {
  if (horse) {
    const act = horse.action(clip); horse.mixer.stopAllAction(); act.reset(); act.setLoop(THREE.LoopRepeat, Infinity); act.play(); act.time = u * act.getClip().duration; horse.mixer.update(0);
    horse.root.position.set(0, 0, 0); horse.root.rotation.y = yaw; horse.root.updateMatrixWorld(true);
    const bob = clip === 'Gallop' ? Math.sin(u * Math.PI * 2) * 0.07 : clip === 'Walk' ? Math.sin(u * Math.PI * 4) * 0.02 : 0;
    man.pose([['Sitting_Idle_Loop', 0.4, 1]]); man.root.position.set(0, 1.72 - (man.sitDrop - 0.12) * (man.spec.s || 1) + bob, 0); man.root.rotation.y = yaw; man.root.updateMatrixWorld(true);
    if (man.propObj) { man.propBone.getWorldPosition(man.propObj.position); const d = new THREE.Vector3(Math.sin(yaw), -0.12, Math.cos(yaw)).normalize(); man.propObj.quaternion.setFromUnitVectors(BATTLE._up, d); man.propObj.updateMatrixWorld(true); }
  } else {
    const c = QA.clips[clip]; man.pose([[clip, u * c.dur, 1]]); man.root.position.set(0, 0, 0); man.root.rotation.y = yaw; man.root.updateMatrixWorld(true);
  }
};
BATTLE._up = new THREE.Vector3(0, 1, 0);
/* ---------------------------------------------------------------- the instanced soldiers */
BATTLE.mat = function (A) {
  return new THREE.ShaderMaterial({ uniforms: { uMap: { value: A.tex }, uTime: { value: 0 }, uCell: { value: new THREE.Vector2(A.cell[0], A.cell[1]) }, uGrid: { value: new THREE.Vector2(A.cols, A.rows) },
      uFogCol: { value: new THREE.Color(0x3a4252) }, uFogD: { value: 0.0026 }, uFlash: { value: 0 } },
    vertexShader: `attribute vec3 iPos; attribute float iYaw; attribute vec4 iAnim; attribute float iFall; attribute float iTint;
      uniform float uTime; uniform vec2 uCell, uGrid; varying vec2 vUv; varying float vTint, vDist;
      void main(){
        vec3 toCam = cameraPosition - iPos; float rel = atan(toCam.x, toCam.z) - iYaw; rel = atan(sin(rel), cos(rel));
        float dir = 2.0, flip = rel < 0.0 ? 1.0 : -1.0;                     // seen side-on; the baked side faces screen-right
        if (abs(rel) < 0.785) { dir = 0.0; flip = 1.0; } else if (abs(rel) > 2.356) { dir = 1.0; flip = 1.0; }
        float f = floor(mod(uTime * iAnim.z + iAnim.w, iAnim.y)), row = iAnim.x * 3.0 + dir;
        float u = flip > 0.0 ? uv.x : 1.0 - uv.x;
        vUv = vec2((f + u) / uGrid.x, 1.0 - (row + 1.0 - uv.y) / uGrid.y);
        vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x)), back = -normalize(vec3(toCam.x, 0.0, toCam.z));
        vec3 up = normalize(mix(vec3(0.0, 1.0, 0.0), back, iFall));          // a fallen man lies back from the lens
        vec3 p = iPos + right * (position.x * uCell.x) + up * (position.y * uCell.y) + vec3(0.0, iFall * 0.06, 0.0);
        vTint = iTint; vec4 mv = viewMatrix * vec4(p, 1.0); vDist = length(mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uFogCol; uniform float uFogD, uFlash; varying vec2 vUv; varying float vTint, vDist;
      void main(){ vec4 c = texture2D(uMap, vUv); if (c.a < 0.5) discard; float fg = 1.0 - exp(-uFogD * uFogD * vDist * vDist);
        gl_FragColor = vec4(mix(c.rgb * vTint * (1.0 + uFlash * 1.5), uFogCol, fg), 1.0); }` });
};
BATTLE.mesh = function (kind, n) {
  const A = BATTLE.atlas[kind], g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1); q.translate(0, 0.5, 0);
  g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv); g.instanceCount = n;
  const at = (name, k) => { const b = new THREE.InstancedBufferAttribute(new Float32Array(n * k), k); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, b); return b; };
  const M = { kind, n, g, pos: at('iPos', 3), yaw: at('iYaw', 1), anim: at('iAnim', 4), fall: at('iFall', 1), tint: at('iTint', 1), mat: BATTLE.mat(A) };
  M.mesh = new THREE.Mesh(g, M.mat); M.mesh.frustumCulled = false; return M;
};
/* the armies: blocks of files and ranks, cavalry on the wings. side +1 = ours (front at z −40, facing −Z), −1 = theirs */
BATTLE.layout = function () {
  const U = [], add = (side, kind, x, z, file, rank, block) => U.push({ side, kind, x, z, x0: x, z0: z, file, rank, block, st: 'hold', v: 0, phase: Math.random() * 8, tint: 0.85 + Math.random() * 0.3,
    speed: kind[0] === 'c' ? 9.5 + Math.random() : 5.0 + Math.random() * 1.0, fall: 0, dieAt: 0, jx: (Math.random() - 0.5) * 0.35, jz: (Math.random() - 0.5) * 0.3 });
  for (const [side, front, kinf, kcav, off] of [[1, -40, 'infBlue', 'cavBlue', 0], [-1, -200, 'infRed', 'cavRed', 2]]) {
    [-48, -24, 0, 24, 48].forEach((cx, b) => { for (let f = 0; f < 16; f++) for (let k = 0; k < 6; k++) add(side, kinf, cx + off + (f - 7.5) * 1.25, front + side * k * 1.4, f, k, side * 10 + b); });
    for (const wx of [-86, 86]) for (let f = 0; f < 6; f++) for (let k = 0; k < 2; k++) add(side, kcav, wx + off + (f - 2.5) * 2.8, front + side * (k * 3.2 + 2), f, k, side * 10 + (wx < 0 ? 8 : 9));
  }
  // each man knows the man ahead of him in his file (the rank before), so the ranks stop behind each other
  const key = (u, k) => u.block + ':' + u.file + ':' + k, by = {}; for (const u of U) by[key(u, u.rank)] = u; for (const u of U) u.ahead = by[key(u, u.rank - 1)] || null;
  return U;
};
BATTLE.spawn = function (room) {
  if (room.army) { room.group.remove(room.army.group); }
  const U = BATTLE.layout(), group = new THREE.Group(), meshes = {};
  for (const kind of Object.keys(BATTLE.KINDS)) { const list = U.filter((u) => u.kind === kind); const M = BATTLE.mesh(kind, list.length); list.forEach((u, i) => { u.i = i; }); M.units = list; meshes[kind] = M; group.add(M.mesh); }
  // a soft dark blob under every man, so the crowd stands on the ground
  const blobG = new THREE.InstancedBufferGeometry(), bq = new THREE.PlaneGeometry(1, 1); bq.rotateX(-Math.PI / 2);
  blobG.index = bq.index; blobG.setAttribute('position', bq.attributes.position); blobG.setAttribute('uv', bq.attributes.uv); blobG.instanceCount = U.length;
  const bpos = new THREE.InstancedBufferAttribute(new Float32Array(U.length * 4), 4); bpos.setUsage(THREE.DynamicDrawUsage); blobG.setAttribute('iB', bpos);
  const blob = new THREE.Mesh(blobG, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uMap: { value: PX.T.glow } },
    vertexShader: 'attribute vec4 iB; varying vec2 vUv; void main(){ vUv = uv; vec3 p = vec3(position.x * iB.w, 0.0, position.z * iB.w * 0.6) + iB.xyz; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a; gl_FragColor = vec4(0.0, 0.0, 0.0, a * 0.55); }' }));
  blob.frustumCulled = false; group.add(blob);
  // banners: one over each block's second rank, carried with it
  const flags = []; const ft = { 1: PX.T.swanBanner, '-1': PX.T.bannerKrasna };
  for (const block of [...new Set(U.filter((u) => u.kind[0] === 'i').map((u) => u.block))]) { const side = Math.sign(block), carrier = U.find((u) => u.block === block && u.file === 8 && u.rank === 1);
    const g = new THREE.PlaneGeometry(1.4, 1.9, 6, 2); g.translate(0.7, -0.95, 0); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: ft[side], side: THREE.DoubleSide, alphaTest: 0.5, fog: true }));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.2, 5), new THREE.MeshBasicMaterial({ color: 0x2a1e14, fog: true })); group.add(m, pole);
    flags.push({ m, pole, u: carrier, base: g.attributes.position.array.slice(), ph: Math.random() * 6 }); }
  // dust: puffs kicked up by the running ranks, and a cloud along the line where they meet
  const dust = []; for (let i = 0; i < 160; i++) { const sm = new THREE.SpriteMaterial({ map: PX.T.smokeSoft, color: 0x8a8070, transparent: true, opacity: 0, depthWrite: false, fog: true }); const s = new THREE.Sprite(sm); s.visible = false; group.add(s); dust.push({ s, m: sm, t: 9, life: 1 }); }
  room.group.add(group); room.army = { U, meshes, group, blob: { mesh: blob, a: bpos }, flags, dust, di: 0, t: 0, order: null, clash: 0, sfxT: 0 };
  BATTLE.write(room.army, 0);
};
/* ---------------------------------------------------------------- the fight, frame by frame */
BATTLE.ANIM = { inf: { hold: [0, 4, 4], walk: [1, 8, 9], run: [2, 8, 13], fight: [3, 8, 11] }, cav: { hold: [0, 4, 3], walk: [1, 8, 8], run: [2, 8, 12], fight: [2, 8, 7] } };
BATTLE.step = function (A, dt) {
  A.t += dt; const t = A.t, U = A.U, ord = A.order;
  // where each side's front is, strip by strip across the field (4 m strips), for the front ranks to meet
  const fr = { 1: {}, '-1': {} }; for (const u of U) { if (u.st === 'dead') continue; const b = Math.round(u.x / 4), F = fr[u.side];
    F[b] = F[b] === undefined ? u.z : u.side > 0 ? Math.min(F[b], u.z) : Math.max(F[b], u.z); }
  for (const u of U) {
    if (u.st === 'dead') { u.fall = Math.min(1, u.fall + dt * 2.2); continue; }
    const cav = u.kind[0] === 'c', hold = !ord || (ord === 'hold' && u.side > 0 && !cav) || t < (u.side > 0 ? 0 : 1.2);
    let go = 0;   // the speed this man wants, toward the enemy (−Z for ours)
    if (!hold) { const walking = t < 4 + (u.side > 0 ? 0 : 0.6); go = walking ? (cav ? 1.8 : 1.35) : u.speed * (cav ? 0.7 : 1); if (cav && t > 9) go = u.speed; }   // a few paces at the walk, then the charge: the lines meet ~18 s after the order
    if (u.st === 'fight') go = 0;
    // the man ahead in his file: stop a pace behind him
    if (u.ahead && u.ahead.st !== 'dead') { const gap = (u.z - u.ahead.z) * -u.side; if (gap < 1.15) go = Math.min(go, u.ahead.st === 'fight' ? 0 : u.ahead.v); if (gap < 1.0 && u.ahead.st === 'fight' && u.rank < 4) u.st = 'fight'; }
    // the enemy's front in this strip
    // the enemy's front: this strip, or the nearest one within two (a man in the gap between their blocks used to find no front
    // at all, and ran on through their army). Once the lines have met, nobody runs past where they met
    const b = Math.round(u.x / 4), F = fr[-u.side]; let E = F[b]; for (let k = 1; E === undefined && k <= 2; k++) E = F[b + k] !== undefined ? F[b + k] : F[b - k];
    if (E === undefined && A.lineZ !== undefined) E = A.lineZ;
    if (E !== undefined && (E - u.z) * -u.side < (cav ? 2.6 : 1.4) && u.st !== 'fight') { u.st = 'fight'; u.fightT = t; if (!A.clash) A.clash = t; if (!cav) A.lineZ = A.lineZ === undefined ? u.z : lerp(A.lineZ, u.z, 0.05); BATTLE.puff(A, u.x, u.z, 2.2, 2.6); }
    // the flanking order: our horse swings out round their left before it turns in
    if (cav && u.side > 0 && ord === 'flank' && u.st !== 'fight' && go > 0) { const wing = u.x0 > 0 ? 1 : -1; u.x += wing * dt * go * 0.55 * smooth(-60, -150, u.z) * (u.z > -175 ? 1 : -0.6); }
    u.v = damp(u.v, go, 2.5, dt); u.z -= u.side * u.v * dt;
    if (u.st === 'hold' && u.v > 0.05) u.st = 'move';
    if (u.st === 'fight') { u.x = lerp(u.x, u.x + Math.sin(t * 2 + u.phase) * 0.3, dt); // the melee sways
      if (u.rank < 3 && t - (u.fightT || 0) > 1.5 && Math.random() < dt * (ord === 'flank' && u.side < 0 ? 0.09 : 0.04)) { u.st = 'dead'; u.dieAt = t; } }
    if (u.v > 3 && Math.random() < dt * (cav ? 0.6 : 0.05)) BATTLE.puff(A, u.x, u.z, cav ? 1.4 : 0.9, 0.9);
  }
  // dust
  for (const d of A.dust) { if (d.t > d.life) { d.s.visible = false; continue; } d.t += dt; const k = d.t / d.life; d.s.position.y += dt * 0.8; d.s.scale.setScalar(d.size * (1 + k * 1.6)); d.m.opacity = d.a * Math.sin(Math.min(1, k) * Math.PI); }
  if (A.clash && t - A.clash < 6 && Math.random() < dt * 30) { const u = U[Math.floor(Math.random() * U.length)]; if (u.st === 'fight') BATTLE.puff(A, u.x + (Math.random() - 0.5) * 3, u.z, 2.8, 2.4); }
  if (!A.silent) { BATTLE.sounds(A, dt); BATTLE.write(A, t); }
};
BATTLE.puff = function (A, x, z, size, life) { const d = A.dust[A.di++ % A.dust.length]; d.s.visible = true; d.s.position.set(x, BATTLE.h(x, z) + size * 0.4, z); d.t = 0; d.life = life; d.size = size; d.a = 0.32; };
BATTLE.write = function (A, t) {
  for (const M of Object.values(A.meshes)) { const cav = M.kind[0] === 'c', AN = BATTLE.ANIM[cav ? 'cav' : 'inf'];
    for (const u of M.units) { const i = u.i, st = u.st === 'dead' ? 'fight' : u.st === 'move' ? (u.v > 2.2 ? 'run' : 'walk') : u.st, a = AN[st];
      const y = BATTLE.h(u.x, u.z); M.pos.setXYZ(i, u.x + u.jx, y, u.z + u.jz); M.yaw.setX(i, u.side > 0 ? Math.PI : 0); M.fall.setX(i, u.fall); M.tint.setX(i, u.tint * (u.st === 'dead' ? 0.7 : 1));
      M.anim.setXYZW(i, a[0], a[1], st === 'run' || st === 'walk' ? a[2] * Math.max(0.6, u.v / (st === 'run' ? (cav ? 9 : 5) : (cav ? 1.8 : 1.35))) : a[2], u.phase); }
    for (const k of ['pos', 'yaw', 'anim', 'fall', 'tint']) M[k].needsUpdate = true;
    M.mat.uniforms.uTime.value = t; if (R.scene.fog) { M.mat.uniforms.uFogCol.value.copy(R.scene.fog.color); M.mat.uniforms.uFogD.value = R.scene.fog.density; }
    M.mat.uniforms.uFlash.value = SCENE.room && SCENE.room.flash || 0; }
  const B = A.blob.a; A.U.forEach((u, i) => B.setXYZW(i, u.x + u.jx, BATTLE.h(u.x, u.z) + 0.04, u.z + u.jz, u.kind[0] === 'c' ? 3.0 : 1.3)); B.needsUpdate = true;
  for (const F of A.flags) { const u = F.u; if (!u) continue; const y = BATTLE.h(u.x, u.z); F.pole.position.set(u.x + 0.3, y + 2.1 + (u.st === 'dead' ? -1.4 : 0), u.z); F.pole.visible = F.m.visible = u.st !== 'dead';
    F.m.position.set(u.x + 0.33, y + 4.1, u.z); F.m.rotation.y = 0.5 * Math.sin(t * 0.4 + F.ph);
    const P = F.m.geometry.attributes.position; for (let j = 0; j < P.count; j++) { const bx = F.base[j * 3]; P.setZ(j, Math.sin(t * 6 + F.ph + bx * 3) * 0.12 * bx); } P.needsUpdate = true; }
};
BATTLE.sounds = function (A, dt) {
  A.sfxT -= dt; if (A.sfxT > 0) return;
  const fighting = A.U.filter((u) => u.st === 'fight').length, running = A.U.filter((u) => u.v > 3).length, cx = R.cam.position.x;
  if (fighting > 20) { A.sfxT = 0.12 + Math.random() * 0.2; AUDIO.sfx(Math.random() < 0.6 ? 'clang' : Math.random() < 0.5 ? 'crack' : 'thud', { gain: 0.25 + Math.random() * 0.25, pan: (Math.random() - 0.5) * 1.4 }); }
  else if (running > 40) { A.sfxT = 0.25; AUDIO.sfx('hooves', { gain: 0.25, pan: (Math.random() - 0.5) }); }
  else A.sfxT = 0.4;
};
/* ---------------------------------------------------------------- the scene */
Object.assign(CAST.specs, {
  /* the king's warhorse on the rise: the grey, in the swan's blue and white */
  warhorse: { id: 'warhorse', name: 'the warhorse', beast: 'grey', lazy: true, h: 2.3, box: [3.4, 3.0], homes: { battle: { x: BATTLE.RISE.x, z: BATTLE.RISE.z, face: -1 } }, yawK: 1.5,
    caparison: { col: [0x24405a, 0xe8e2d6], n: 6 } },
  bogdanField: Object.assign({}, CAST.specs.commander, { id: 'bogdanField', name: 'Ser Bogdan', lazy: true, helmet: { col: 0x8a929e }, prop: 'sword', idle: 'Sword_Idle', box: [1.9, 2.6],
    homes: { battle: { x: BATTLE.RISE.x - 2.0, z: BATTLE.RISE.z + 1.4, face: -1 } } }),
});
BATTLE.wait = (ms) => new Promise((res) => { const t0 = performance.now(), f = () => { if (CUT.skip) res(true); else if (performance.now() - t0 >= ms) res(false); else setTimeout(f, 50); }; f(); });   // true: skipped
BATTLE.shot = (from, to, dur) => { CUT.cam = { a: CUT.pose(from), b: CUT.pose(to || from), t: 0, dur }; return BATTLE.wait(dur * 1000); };
BATTLE.cap = (t) => { const c = $('cutCap'); c.textContent = t; c.classList.add('on'); setTimeout(() => c.classList.remove('on'), 4200); };
/* the king up on his horse on the rise (the player actor seated on the warhorse, as the joust's knights are) */
BATTLE.mount = function (room) {
  const A = CAST.A, K = SCENE.player, H = A.warhorse, R0 = BATTLE.RISE; if (!H) return;
  const y = BATTLE.h(R0.x, R0.z); H.x = R0.x; H.z = R0.z; H.baseY = H.y = y; H.face = -1; H.lookYaw = Math.PI; H.yaw = Math.PI;   // facing the field, down −Z
  K.setVisible(true); K.stand(); K.sit({ x: R0.x, y: y + 1.72, z: R0.z + 0.05, yaw: Math.PI, cardDz: 0.25, drop: 0.12 }); K.sitK = 1; K.crownWas = K.crownMesh.visible; K.crownMesh.visible = true;
  const B = A.bogdanField; if (B) { B.baseY = B.y = BATTLE.h(B.x, B.z); B.lookYaw = Math.PI; }
};
BATTLE.play = async function (o) {
  o = o || {}; if (BATTLE.on) return; BATTLE.on = true; const K = SCENE.player, back = SCENE.room ? SCENE.room.id : 'bedroom', backX = K.x;
  SCENE.lock++; CUT.skip = false; document.body.classList.add('cine'); const fade = $('fade'); fade.classList.remove('off'); await SCENE.wait(800);
  try {
    if (!BATTLE.ready) { const c = $('cutCap'); c.textContent = 'The armies gather…'; c.classList.add('on'); await BATTLE.bake(); c.classList.remove('on'); }
    await SCENE.prepare('battle'); SCENE.enter('battle', {}); const room = SCENE.room; BATTLE.spawn(room); BATTLE.mount(room);
    room.tick = room.tick.filter((f) => !f.battle); const tk = (T, dt) => { if (room.army && room.army.order) BATTLE.step(room.army, dt); else if (room.army) BATTLE.write(room.army, (room.army.idle = (room.army.idle || 0) + dt)); }; tk.battle = true; room.tick.push(tk);
    AUDIO.ambience({ rain: 0.6, wind: 0.7 }); AUDIO.playMusic('intro', 2);
    R.r.compile(R.scene, R.cam); const R0 = BATTLE.RISE, ky = BATTLE.h(R0.x, R0.z);
    /* the shots. Distances measured for a 2.2–2.8 wide frame: at 40 m a man is ~25 px tall, at 120 m a block is a band;
       every camera stands where the armies fill its frame, and none looks past the edge of the land */
    // 1. over the king's shoulder, down the field: our blocks below and ahead, theirs a red line across the plain
    CUT.cam = { a: CUT.pose([R0.x + 12, ky + 9, R0.z + 22, 6, 0, -70, 36]), b: CUT.pose([R0.x + 8, ky + 7.5, R0.z + 16, 4, 0, -80, 34]), t: 0, dur: 8 };
    SCENE.update(0); SCENE.render(); await nextFrame(); fade.classList.add('off');
    BATTLE.cap(o.preview ? 'The Kalina Field · a preview of the war' : 'The Kalina Field'); if (await BATTLE.wait(8000)) return;
    // 2. the king on the rise, Bogdan at his stirrup: the order is the player's
    if (await BATTLE.shot([R0.x + 7.2, ky + 2.3, R0.z + 4.6, R0.x - 0.6, ky + 1.9, R0.z - 0.4, 30], [R0.x + 6.6, ky + 2.2, R0.z + 4.2, R0.x - 0.8, ky + 1.9, R0.z - 0.5, 28], 3.2)) return;
    document.body.classList.remove('cine');
    await SCENE.say(CAST.A.bogdanField || K, 'They’re waiting on you, Your Grace. All of them. Theirs too.', { wait: true });
    const pick = await NIGHT.ask(['Sound the advance', 'Send the horse round their left', 'Hold the line. Let them come to us']);
    const order = ['advance', 'flank', 'hold'][pick], meet = order === 'hold' ? -42 : -117;   // where the lines will meet: our front stays put on 'hold'
    await SCENE.say(K, ['For Lodmir! Advance!', 'Horse! Round their left, and in!', 'Hold! Shields up. Let them come!'][pick], { wait: true });
    document.body.classList.add('cine');
    AUDIO.sfx('fanfare', { gain: 1.0 }); AUDIO.sfx('drum', { gain: 0.9, delay: 0.5 }); AUDIO.sfx('drum', { gain: 0.9, delay: 1.1 }); AUDIO.sfx('cheer', { gain: 0.8, dur: 4, delay: 0.8 });
    room.army.order = order; room.army.t = 0;
    if (order === 'hold') { room.army.silent = true; for (let n = 0; n < 450; n++) BATTLE.step(room.army, 1 / 30); room.army.silent = false; }   // only they run: 15 s on, behind the cut, so the lines still meet in shot 5
    // 3. beside our front line: the order runs down it and the ranks step off (or brace, on 'hold')
    if (await BATTLE.shot([64, 2.3, -48, 24, 1.5, -44, 40], [62, 2.3, -58, 22, 1.5, -54, 40], 7.5)) return;
    AUDIO.sfx('cheer', { gain: 1.0, dur: 5 });
    // 4. the charge, low behind our running ranks: the red wall coming on in depth
    const back = order === 'hold' ? [26, 12] : [70, 24];   // on 'hold' our ranks stand: the camera stays close behind them, not 70 m back
    if (await BATTLE.shot([6, 2.8, meet + back[0], 0, 1.6, meet - 6, 40], [6, 2.8, meet + back[1], 0, 1.6, meet - 10, 38], 9)) return;
    // 5. the clash, side-on and close, on the line itself
    if (await BATTLE.shot([14, 2.0, meet + 9, -2, 1.4, meet - 2, 44], [12, 2.3, meet + 6, -2, 1.4, meet - 3, 42], 7)) return;
    // 6. high and wide: the whole line locked, the banners, the dust
    if (await BATTLE.shot([58, 24, meet + 48, 0, 0, meet - 4, 36], [40, 36, meet + 38, 0, 0, meet - 6, 36], 8)) return;
    // 7. back on the rise, behind the king: the battle below him
    if (await BATTLE.shot([R0.x + 3.2, ky + 3.4, R0.z + 7.5, R0.x - 18, ky - 4, meet + 10, 32], [R0.x + 2.6, ky + 3.2, R0.z + 6.6, R0.x - 18, ky - 4, meet + 6, 30], 6)) return;
    BATTLE.cap('The War of the Cup · to be continued in the war camp');
    await BATTLE.wait(4500);
  } finally {
    fade.classList.remove('off'); await SCENE.wait(900);
    CUT.cam = null; CUT.skip = false; $('cutCap').classList.remove('on'); NIGHT.bar([]); document.body.classList.remove('cine'); const room = BATTLE.ROOM; room.tick = room.tick.filter((f) => !f.battle);
    K.stand(); K.crownMesh.visible = !!K.crownWas;
    await SCENE.prepare(back); SCENE.enter(back, { x: backX, face: 1 }); R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame();
    fade.classList.add('off'); BATTLE.on = false; SCENE.lock--;
  }
};
