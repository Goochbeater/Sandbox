/* BODY — the bare body under the clothes (Actor.makeBare / undress). Three pieces, all built once per actor:
     Actor.bareMarks(actor, geo)  anatomical anchor points found on the actual mesh (nipples, mons, crotch), body space
     Actor.bareTex(actor, geo)    the base body's colour map with the painted underwear turned back into skin, areolae,
                                  pubic hair and (women) the vulva painted on — painted in 3D: every triangle is rasterised
                                  in UV space and each texel is coloured by where it lands on the body, so the marks sit
                                  where they belong whatever the UV layout is
     Actor.genitals(actor, marks) the men's penis and scrotum: small procedural meshes riding the pelvis bone; the shaft's
                                  angle and length follow actor.setArousal(0..1)
   At the sprites' 32 px/m these are a handful of pixels each — enough to read, in keeping with the art. */
Actor.bareMarks = function (a, g) {
  const P = g.attributes.position, n = P.count, F = a.sex === 'female';
  const best = (test) => { let b = null, bz = -9; for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); if (test(x, y, z) && z > bz) { bz = z; b = [x, y, z]; } } return b; };
  const nipL = F ? best((x, y) => y > 1.18 && y < 1.38 && x > 0.04 && x < 0.16) : best((x, y) => y > 1.27 && y < 1.40 && x > 0.07 && x < 0.13);
  const nipR = nipL && [-nipL[0], nipL[1], nipL[2]];
  // the midline front profile (both base bodies): the mons at ~0.91 m, the vulva / root of the penis at ~0.85, the
  // perineum at ~0.80 where the thighs part
  const mid = (y0, y1) => best((x, y) => Math.abs(x) < 0.02 && y > y0 && y < y1);
  const mons = mid(0.895, 0.93) || [0, 0.91, 0.05], crotch = mid(0.835, 0.87) || [0, 0.85, 0.01];
  return { nipL, nipR, mons, crotch, perineum: [0, crotch[1] - 0.05, crotch[2] - 0.035] };
};
Actor.bareTex = async function (a, g) {
  const src = await QA.tex(a.sex + '_col'), img = src.image, W = img.width, H = img.height, F = a.sex === 'female';
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const id = cx.getImageData(0, 0, W, H), d = id.data;
  // 1. the skin's own average colour, then the grey underwear repainted with it (a little texel noise keeps it from looking flat)
  let sr = 0, sg = 0, sb = 0, sn = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 120 && d[i] > d[i + 1] && d[i + 1] > d[i + 2]) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; sn++; }
  const skin = [sr / sn, sg / sn, sb / sn];
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    if (mx < 125 && mx - mn < 30) { const k = 0.95 + hash(p, 71) * 0.08; d[i] = skin[0] * k; d[i + 1] = skin[1] * k; d[i + 2] = skin[2] * k; }
  }
  // 2. anatomy, painted in body space. Colours are given as they should look lit, then divided by the material tint.
  const M = Actor.bareMarks(a, g), tint = a.skinT, inv = (c) => [c[0] / tint.r, c[1] / tint.g, c[2] / tint.b].map((v) => clamp(v, 0, 255));
  const hc = new THREE.Color(a.spec.brows || 0x2a1a12), hair = inv([hc.r * 255 * 1.3, hc.g * 255 * 1.3, hc.b * 255 * 1.3]);
  const areola = inv(F ? [168, 96, 84] : [150, 92, 76]), nipple = inv(F ? [140, 70, 62] : [128, 74, 60]), lips = inv([120, 56, 58]), inner = inv([170, 82, 86]);
  const rA = F ? 0.026 : 0.017, rN = F ? 0.009 : 0.006;
  const mark = (x, y, z, px) => {
    for (const q of [M.nipL, M.nipR]) { if (!q) continue; const dd = Math.hypot(x - q[0], y - q[1], z - q[2]);
      if (dd < rN) return [nipple, 1]; if (dd < rA) return [areola, 0.85 * (1 - smooth(rA * 0.75, rA, dd))]; }
    const m = M.mons, c = M.crotch; if (z < -0.075) return null;
    // pubic hair: a soft triangle over the mons (a fuller, higher patch for the men), ragged at the edge
    const top = m[1] + (F ? 0.05 : 0.075), bot = c[1] + (F ? 0.035 : 0.01), t = (top - y) / (top - bot);
    if (t > 0 && t < 1 && z > m[2] - 0.07) { const half = F ? lerp(0.07, 0.012, t) : lerp(0.05, 0.075, Math.min(1, t * 1.6)) * (1 - smooth(0.7, 1, t) * 0.6), e = Math.abs(x) / half;
      if (e < 1 && hash(px, 13) < 0.92 - e * e * 0.55) return [hair, 0.75 + hash(px, 5) * 0.25]; }
    if (F && Math.abs(x) < 0.016 && y < m[1] - 0.012 && y > c[1] - 0.06) {   // the vulva: outer lips and the darker cleft between
      if (Math.abs(x) < 0.0045) return [lips, 1]; return [inner, 0.45 * (1 - Math.abs(x) / 0.016)]; }
    return null;
  };
  const Pp = g.attributes.position, U = g.attributes.uv, Ix = g.index.array, anchors = [M.nipL, M.nipR, M.mons].filter(Boolean);
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
  for (let t = 0; t < Ix.length; t += 3) {
    const i0 = Ix[t], i1 = Ix[t + 1], i2 = Ix[t + 2];
    pa.fromBufferAttribute(Pp, i0); pb.fromBufferAttribute(Pp, i1); pc.fromBufferAttribute(Pp, i2);
    if (!anchors.some((q) => Math.hypot(pa.x - q[0], pa.y - q[1], pa.z - q[2]) < 0.2)) continue;
    const u0 = U.getX(i0) * W, v0 = U.getY(i0) * H, u1 = U.getX(i1) * W, v1 = U.getY(i1) * H, u2 = U.getX(i2) * W, v2 = U.getY(i2) * H;
    const den = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2); if (Math.abs(den) < 1e-9) continue;
    const xa = Math.max(0, Math.floor(Math.min(u0, u1, u2))), xb = Math.min(W - 1, Math.ceil(Math.max(u0, u1, u2)));
    const ya = Math.max(0, Math.floor(Math.min(v0, v1, v2))), yb = Math.min(H - 1, Math.ceil(Math.max(v0, v1, v2)));
    for (let py = ya; py <= yb; py++) for (let px = xa; px <= xb; px++) {
      const X = px + 0.5, Y = py + 0.5, w0 = ((v1 - v2) * (X - u2) + (u2 - u1) * (Y - v2)) / den, w1 = ((v2 - v0) * (X - u2) + (u0 - u2) * (Y - v2)) / den, w2 = 1 - w0 - w1;
      if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
      const r = mark(pa.x * w0 + pb.x * w1 + pc.x * w2, pa.y * w0 + pb.y * w1 + pc.y * w2, pa.z * w0 + pb.z * w1 + pc.z * w2, py * W + px);
      if (!r) continue; const [c, al] = r, o = (py * W + px) * 4;
      for (let k = 0; k < 3; k++) d[o + k] = lerp(d[o + k], c[k], al);
    }
  }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
};
Actor.genitals = function (a, M) {
  const base = [0, lerp(M.crotch[1], M.mons[1], 0.5), lerp(M.crotch[2], M.mons[2], 0.5) - 0.006];   // just above the crotch, on the skin
  const col = new THREE.Color(a.skinT).multiply(new THREE.Color(0xf0c8b8)).multiplyScalar(0.95);
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }), tip = new THREE.MeshStandardMaterial({ color: col.clone().multiply(new THREE.Color(0xe09088)), roughness: 0.45 });
  const g = new THREE.Group(); a.attachBody(g, 'pelvis', base);
  const shaft = new THREE.Group(); g.add(shaft); g.userData.shaft = shaft;          // pivots at the root; +y runs along the shaft
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.019, 0.135, 10, 1), mat); body.position.y = 0.0675; shaft.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), tip); head.scale.set(1, 1.25, 1); head.position.y = 0.137; shaft.add(head);
  const sac = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat); sac.scale.set(1.25, 1.1, 0.85); sac.position.set(0, -0.032, -0.012); g.add(sac);
  g.traverse((o) => { o.layers.mask = a.root.layers.mask; o.castShadow = false; o.receiveShadow = true; });
  return g;
};
