/* OUTDOOR — what open-air rooms need: a painted sky backdrop (with drifting cloud layers), GPU rain, lightning with
   thunder, foliage that sways and flags that wave in the wind, flocks of birds or crows, animated water.
   All of it is built with BUILD calls inside a room's build(), and animated from R.timeU (seconds) or room ticks. */
R.timeU = { value: 0 };
/* sway / wave: a shared vertex tweak keyed by amplitude, anchored at the bottom (sway) or the pole side (wave) */
BUILD.motionMat = function (tex, kind, amp, o) {
  o = o || {};
  const key = 'mot' + tex.uuid + kind + amp + JSON.stringify(o); if (BUILD.mats[key]) return BUILD.mats[key];
  const m = o.basic ? new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, color: new THREE.Color(o.col || 0xffffff).multiplyScalar(o.k || 1) })
    : new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, color: o.col || 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = R.timeU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec4 wp0 = modelMatrix * vec4(position, 1.0);
        ${kind === 'sway' ? `float k = uv.y * uv.y; transformed.x += (sin(uTime * 1.3 + wp0.x * 0.7 + wp0.z) * 0.6 + sin(uTime * 2.9 + wp0.x * 1.9) * 0.25) * ${amp.toFixed(3)} * k;`
        : `float k = uv.x; transformed.z += sin(uTime * 5.0 - uv.x * 7.0 + wp0.x) * ${amp.toFixed(3)} * k; transformed.y += sin(uTime * 3.1 - uv.x * 5.0) * ${(amp * 0.35).toFixed(3)} * k;`} }`);
  };
  m.customProgramCacheKey = () => 'motion' + kind + amp.toFixed(3) + (o.basic ? 'b' : 's');
  return (BUILD.mats[key] = m);
};
/* a card that moves in the wind: kind 'sway' (plants, trees) or 'wave' (flags, banners) */
BUILD.windCard = function (tex, x, y, z, kind, amp, o) {
  o = o || {}; return BUILD.card(tex, x, y, z, Object.assign({}, o, { mat: BUILD.motionMat(tex, kind, amp, o), dyn: true }));
};
/* the sky: a huge painted backdrop far behind the room, plus scrolling cloud layers in front of it */
BUILD.sky = function (tex, o) {
  o = o || {}; const room = BUILD.room, z = o.z === undefined ? -40 : o.z, w = o.w || 220, h = o.h || 90, y = o.y === undefined ? -10 : o.y;
  const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(o.col || 0xffffff).multiplyScalar(o.k || 1), fog: false, depthWrite: false });
  const g = new THREE.PlaneGeometry(w, h); g.translate(o.x || 0, y + h / 2, z);
  const me = BUILD.add(new THREE.Mesh(g, m), { cast: false, recv: false, dyn: true }); me.renderOrder = -10; room.skyMat = m; room.skyK = o.k || 1;
  room.clouds = [];
  for (const L of o.clouds || []) {   // [tex, z, y, h, speed, k, opacity]
    const [ct, cz, cy, ch, spd, ck, op] = L, cw = w * 1.2, cg = new THREE.PlaneGeometry(cw, ch); cg.translate(o.x || 0, cy + ch / 2, cz);
    const t2 = ct.clone(); t2.needsUpdate = true; t2.wrapS = THREE.RepeatWrapping; t2.repeat.x = cw / (ch * ct.userData.w / ct.userData.h) / (o.cloudScale || 1);   // keep the painting's aspect; cloudScale > 1 stretches it wide
    const cm = new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: op === undefined ? 1 : op, color: new THREE.Color(0xffffff).multiplyScalar(ck || 1), depthWrite: false, fog: false });
    const cme = BUILD.add(new THREE.Mesh(cg, cm), { cast: false, recv: false, dyn: true }); cme.renderOrder = -9; room.clouds.push({ t: t2, spd, m: cm, k: ck || 1, col: new THREE.Color(1, 1, 1) });   // tint a layer with c.col, brighten with c.k
  }
  room.tick.push((t) => { for (const c of room.clouds) c.t.offset.x = t * c.spd; });
  return me;
};
/* rain: line streaks animated entirely on the GPU, falling through a box around the walking line */
BUILD.rain = function (o) {
  o = o || {}; const room = BUILD.room, N = Math.round((o.n || 2400) * (R.q === 'low' ? 0.5 : 1)), box = o.box || [-30, 30, 0, 16, -4, 14];
  const pos = new Float32Array(N * 6), tip = new Float32Array(N * 2), r = rng(77);
  for (let i = 0; i < N; i++) { const x = lerp(box[0], box[1], r()), y = lerp(box[2], box[3], r()), z = lerp(box[4], box[5], r());
    for (let k = 0; k < 2; k++) { pos[i * 6 + k * 3] = x; pos[i * 6 + k * 3 + 1] = y; pos[i * 6 + k * 3 + 2] = z; tip[i * 2 + k] = k; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
  const U = { uTime: R.timeU, uH: { value: box[3] - box[2] }, uY0: { value: box[2] }, uSpeed: { value: o.speed || 14 }, uWind: { value: o.wind === undefined ? 0.28 : o.wind }, uLen: { value: o.len || 0.55 },
    uCol: { value: new THREE.Color(o.col || 0x9ab0d8).multiplyScalar(o.k || 1.0) }, uOp: { value: o.opacity || 0.45 }, uFlash: { value: 0 } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float tip; uniform float uTime, uH, uY0, uSpeed, uWind, uLen; varying float vT;
      void main(){ vec3 p = position; float ph = fract((p.y - uY0) / uH - uTime * uSpeed / uH + fract(p.x * 13.7 + p.z * 7.3)); p.y = uY0 + ph * uH;
        p.x += uWind * p.y; vec3 d = normalize(vec3(uWind, -1.0, 0.0)); p -= d * uLen * tip; vT = tip;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uOp, uFlash; varying float vT; void main(){ gl_FragColor = vec4(uCol * (1.0 + uFlash * 3.0), uOp * (1.0 - vT * 0.8)); }` });
  const L = new THREE.LineSegments(g, m); L.frustumCulled = false; BUILD.add(L, { dyn: true }); room.rainU = U;
  return L;
};
/* lightning: every few seconds the sky and a cold light flash (2–3 pulses), thunder follows. Indoors, pass the light
   that comes through the window (o.light, its intensity is driven 0…k) and o.onFlash(f) to brighten the glass. */
BUILD.lightning = function (o) {
  o = o || {}; const room = BUILD.room, L = o.light || new THREE.DirectionalLight(o.col || 0xb8c8ff, 0);
  if (!o.light) { L.position.set(o.x || 10, 30, o.z || -20); L.layers.enableAll(); BUILD.add(L); BUILD.add(L.target); }
  const st = { next: 2 + Math.random() * 4, pulses: [], L, min: o.min || 6, max: o.max || 14, k: o.k || 6 };
  room.flash = 0;
  room.tick.push((t, dt) => {
    if (t > st.next && !room.noLightning) { st.next = t + lerp(st.min, st.max, Math.random()); const n = 2 + Math.floor(Math.random() * 2); st.pulses = [];
      for (let i = 0; i < n; i++) st.pulses.push([t + i * (0.08 + Math.random() * 0.12), 0.06 + Math.random() * 0.08, 0.6 + Math.random() * 0.4]);
      AUDIO.sfx('thunder', { delay: 0.4 + Math.random() * 1.6, gain: (0.6 + Math.random() * 0.4) * (o.thunder || 1) }); }
    let f = 0; for (const [t0, d, a] of st.pulses) if (t >= t0 && t < t0 + d) f = Math.max(f, a * (1 - (t - t0) / d));
    room.flash = f; L.intensity = f * st.k;
    if (room.skyMat) room.skyMat.color.setScalar(room.skyK * (1 + f * 2.2));
    for (const c of room.clouds || []) c.m.color.copy(c.col).multiplyScalar(c.k * (1 + f * 2.8));
    if (room.rainU) room.rainU.uFlash.value = f;
    if (o.onFlash) o.onFlash(f);
  });
  return st;
};
/* a flock: small flapping sprites on looping paths. paths: [[cx, cy, cz, rx, ry, speed], …] */
BUILD.flock = function (tex, paths, o) {
  o = o || {}; const room = BUILD.room, birds = [];
  for (const [cx, cy, cz, rx, ry, spd] of paths) {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.x = 1 / tex.userData.n; t.userData = Object.assign({}, tex.userData);
    const m = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, color: new THREE.Color(o.col || 0xffffff).multiplyScalar(o.k || 1) });
    const w = (tex.userData.w / tex.userData.n) / PX.D * (o.s || 1), h = tex.userData.h / PX.D * (o.s || 1), g = new THREE.PlaneGeometry(w, h);
    const me = BUILD.add(new THREE.Mesh(g, m), { cast: false, dyn: true }); birds.push({ me, t, cx, cy, cz, rx, ry, spd, ph: Math.random() * 6.28, n: tex.userData.n });
  }
  room.tick.push((T) => { for (const b of birds) { const a = T * b.spd + b.ph; b.me.position.set(b.cx + Math.cos(a) * b.rx, b.cy + Math.sin(a * 2.0) * b.ry, b.cz + Math.sin(a) * b.rx * 0.25);
    b.me.scale.x = Math.sin(a) * b.spd > 0 ? -1 : 1; b.t.offset.x = (Math.floor(T * 8 + b.ph * 3) % b.n) / b.n; } });
  return birds;
};
/* water that moves: a pixel strip cycled like the flames (fountain sheets, a basin surface) */
BUILD.water = function (tex, x, y, z, o) {
  o = o || {}; const t = tex.clone(); t.needsUpdate = true; t.repeat.x = 1 / tex.userData.n; t.userData = Object.assign({}, tex.userData);
  const m = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.4, side: THREE.DoubleSide, color: new THREE.Color(o.col || 0xffffff).multiplyScalar(o.k || 1.1) });
  const me = BUILD.card(t, x, y, z, Object.assign({}, o, { mat: m, cast: false, dyn: true }));
  if (o.flat) { me.rotation.x = -Math.PI / 2; me.position.y += 0.001; }
  BUILD.room.flames.push({ t, n: tex.userData.n, ph: Math.random() * 4, rate: o.rate || 7 });
  return me;
};
