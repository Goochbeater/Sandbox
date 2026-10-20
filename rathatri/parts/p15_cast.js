/* CAST — non-Maul character templates. Droids are rigid parts on the shared rig (so a saber can take them apart);
   organics reuse the clothed SDF sculpt with lower resolution. Props (blasters, staffs) are meshes with +Y = axis. */
const CAST = {};
CAST.pm = (hex, rough, metal, emis) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal || 0, envMapIntensity: 1.0 }); if (emis) { m.emissive = new THREE.Color(emis); m.emissiveIntensity = 3; } return m; };
/* bone-local helpers (rest orientations are identity) */
CAST.limbGeo = function (def, bi, r0, r1, seg) {
  const b = def[bi], L = b.len, g = new THREE.CylinderGeometry(r1, r0, L, seg || 10, 1);
  const d = V.norm(V.sub(b.tail, b.head));
  g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(YUP, V3(d[0], d[1], d[2])); g.applyQuaternion(q);
  return g;
};
CAST.at = (def, bi, p) => V.sub(p, def[bi].head);
/* ------------------------------------------------------------------ B1 battle droid */
CAST.buildB1 = function (variant) {
  const J = RIG.joints({ height: 1.07, shoulders: 0.82 }), def = RIG.def(J);
  const T = { name: 'b1', J, def, parts: [], attach: [], droid: true };
  const tan = CAST.pm(variant === 'cmd' ? 0xc9a24a : 0xc3a57a, 0.55, 0.2), dark = CAST.pm(0x5a4a38, 0.6, 0.3), mid = CAST.pm(0xa8895f, 0.55, 0.25);
  const A = (bone, geo, mat, pos, rot, name) => { if (rot) geo.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]))); if (pos) geo.translate(pos[0], pos[1], pos[2]); T.attach.push({ bone, geo, mat, pos: [0, 0, 0], name: name || 'part', shadow: true }); };
  // limbs (thin struts + joint balls)
  for (const [bi, r0, r1] of [[6, 0.024, 0.02], [7, 0.02, 0.017], [10, 0.024, 0.02], [11, 0.02, 0.017], [13, 0.03, 0.024], [14, 0.024, 0.02], [16, 0.03, 0.024], [17, 0.024, 0.02]]) A(bi, CAST.limbGeo(def, bi, r0, r1), tan, null, null, 'limb');
  for (const bi of [6, 7, 10, 11, 13, 14, 16, 17]) A(bi, new THREE.SphereGeometry(bi >= 13 ? 0.035 : 0.03, 12, 8), mid, null, null, 'joint');
  // thigh armour plates
  for (const bi of [13, 16]) { const b = def[bi]; const g = new THREE.BoxGeometry(0.075, 0.2, 0.05); A(bi, g, tan, V.mul(V.sub(b.tail, b.head), 0.4).map((v, i) => v + (i === 2 ? 0.03 : 0))); }
  // feet
  for (const bi of [15, 18]) { const b = def[bi]; const g = new THREE.BoxGeometry(0.075, 0.035, 0.2); A(bi, g, tan, [0, -0.06, 0.05]); }
  // hands: palm + 3 fingers wrapped around the grip
  for (const bi of [8, 12]) { const b = def[bi], d = V.sub(b.tail, b.head); A(bi, new THREE.BoxGeometry(0.035, 0.05, 0.04), mid, V.mul(d, 0.6)); A(bi, new THREE.TorusGeometry(0.022, 0.009, 6, 10, 4.2), tan, V.mul(d, 1.05), [0, HALF, 0.3]); }
  // pelvis
  A(0, new THREE.BoxGeometry(0.16, 0.08, 0.1), tan, [0, -0.02, 0]);
  A(0, new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), dark, [0, 0.1, -0.01]);   // spine rod
  // torso: thin chest plate + backpack
  const ch = def[2];
  A(2, new THREE.BoxGeometry(0.2, 0.2, 0.09), tan, [0, 0.09, 0.02]);
  A(2, new THREE.BoxGeometry(0.16, 0.14, 0.05), mid, [0, 0.1, 0.075]);
  A(2, new THREE.BoxGeometry(0.17, 0.22, 0.1), tan, [0, 0.07, -0.1]);
  A(2, new THREE.CylinderGeometry(0.014, 0.014, 0.3, 6), dark, [0.06, 0.26, -0.13], [0.2, 0, 0]);   // antenna
  for (const s of [1, -1]) A(2, new THREE.SphereGeometry(0.045, 10, 8), tan, [s * 0.12, 0.17, -0.01]);    // shoulder caps
  void ch;
  // neck: long rod forward + head (elongated, angled forward)
  A(3, new THREE.CylinderGeometry(0.018, 0.022, 0.2, 8), dark, [0, 0.06, 0.03], [0.5, 0, 0]);
  const head = new THREE.CapsuleGeometry(0.05, 0.2, 6, 12); head.rotateX(HALF + 0.35); head.scale(1.05, 0.62, 1.0);
  A(4, head, tan, [0, 0.07, 0.11], null, 'head');
  A(4, new THREE.BoxGeometry(0.1, 0.03, 0.12), mid, [0, 0.1, 0.03]);
  for (const s of [1, -1]) A(4, new THREE.SphereGeometry(0.018, 8, 6), CAST.pm(0x101010, 0.2, 0.5, 0x100000), [s * 0.04, 0.06, 0.2]);
  if (variant === 'cmd') A(4, new THREE.BoxGeometry(0.06, 0.02, 0.18), CAST.pm(0xd8b030, 0.5, 0.2), [0, 0.105, 0.08]);
  return T;
};
/* E-5 blaster rifle (+Y = barrel) */
CAST.rifle = function (kind) {
  const g = new THREE.Group();
  // local frame: +Y = along the barrel, +Z = up (sights), X = across
  const gun = CAST.pm(0x2e2f33, 0.36, 0.75), poly = CAST.pm(0x151517, 0.62, 0.15), steel = CAST.pm(0x8a8d94, 0.22, 1.0);
  const cell = CAST.pm(0x5a4a2a, 0.4, 0.6);
  const M = (geo, m, x, y, z, rx, ry, rz) => { const me = new THREE.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); me.rotation.set(rx || 0, ry || 0, rz || 0); g.add(me); return me; };
  const cb = (hx, hy, hz, c) => KIT.chamferGeo(hx, hy, hz, c || 0.004);
  const cyl = (r0, r1, h, n) => new THREE.CylinderGeometry(r0, r1, h, n || 14);
  M(cb(0.021, 0.13, 0.034, 0.006), gun, 0, 0.02, 0);                                   // receiver
  M(cb(0.017, 0.11, 0.012, 0.003), poly, 0, 0.03, -0.03);                                // lower receiver
  M(cb(0.009, 0.12, 0.004, 0.0015), steel, 0, 0.03, 0.037);                              // top rail
  for (let k = 0; k < 7; k++) M(cb(0.011, 0.004, 0.002, 0.001), steel, 0, -0.05 + k * 0.024, 0.042);
  M(cyl(0.021, 0.021, 0.2, 16), gun, 0, 0.25, 0.006);                                    // barrel shroud
  for (let k = 0; k < 5; k++) M(new THREE.TorusGeometry(0.0205, 0.0035, 6, 16), poly, 0, 0.18 + k * 0.035, 0.006, HALF);
  M(cyl(0.011, 0.012, 0.12, 12), steel, 0, 0.4, 0.006);                                  // barrel
  M(cyl(0.017, 0.016, 0.045, 12), gun, 0, 0.47, 0.006);                                  // muzzle brake
  for (const sx of [-1, 1]) M(cb(0.002, 0.014, 0.008, 0.001), poly, sx * 0.016, 0.47, 0.006);
  M(cyl(0.013, 0.013, 0.13, 14), gun, 0, 0.07, 0.068, 0, 0, 0);                          // scope
  M(cyl(0.016, 0.013, 0.02, 14), gun, 0, 0.14, 0.068); M(cyl(0.015, 0.013, 0.02, 14), gun, 0, 0.0, 0.068);
  { const lens = M(new THREE.CircleGeometry(0.012, 16), new THREE.MeshStandardMaterial({ color: 0x0a2040, metalness: 0.9, roughness: 0.05, emissive: 0x06224a, emissiveIntensity: 1.5 }), 0, 0.151, 0.068, -HALF); lens.userData.noShadow = true; }
  for (const y of [0.03, 0.11]) M(cb(0.006, 0.006, 0.012, 0.002), gun, 0, y, 0.052);
  M(cb(0.014, 0.022, 0.045, 0.004), cell, 0, 0.07, -0.07, -0.25);                       // power cell
  M(new THREE.BoxGeometry(0.029, 0.004, 0.03), KIT.emis(0x40c0ff, 2.5), 0, 0.07, -0.06, -0.25);
  M(cb(0.013, 0.02, 0.042, 0.005), poly, 0, -0.085, -0.062, 0.32);                      // pistol grip
  M(new THREE.TorusGeometry(0.02, 0.0035, 6, 14, PI), gun, 0, -0.045, -0.035, 0, HALF, 0);  // trigger guard
  for (const z of [0.018, -0.02]) M(cb(0.006, 0.1, 0.006, 0.002), gun, 0, -0.2, z);      // skeletal stock
  M(cb(0.016, 0.012, 0.042, 0.004), poly, 0, -0.305, -0.002);                            // butt plate
  M(new THREE.SphereGeometry(0.004, 8, 6), KIT.emis(0xff2a10, 5), 0.022, 0.08, 0.018);   // status LED
  if (kind === 'pistol') { g.scale.set(1, 0.6, 1); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const mz = new THREE.Object3D(); mz.position.y = 0.49; g.add(mz); g.userData.muzzle = mz;
  // charge glow (telegraph)
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.6, 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.position.y = 0.49; g.add(glow); g.userData.glow = glow;
  R.scene.add(g); return g;
};
/* ------------------------------------------------------------------ rifle / melee clips (shared by troopers) */
MOV.trooper = {
  idle: { loop: true, keys: [K(0, [-0.1, 1.05, 0.2], [0.35, 0.5, 0.8], { g: 'both', oR: -0.1, oL: 0.14, st: 'neutral', cr: 0.02, tw: 0, pi: 0, fl: [0.3, 0.95, 0.1] }), K(2, [-0.1, 1.06, 0.2], [0.35, 0.52, 0.8], { cr: 0.025 })] },
  aim: { loop: true, keys: [K(0, [-0.12, 1.36, 0.28], [0, 0, 1], { g: 'both', oR: -0.1, oL: 0.15, st: 'guard', cr: 0.05, tw: -0.25, headYaw: 0.25, pi: 0.02 })] },
  run: { loop: true, keys: [K(0, [-0.08, 1.15, 0.22], [0.5, 0.55, 0.6], { g: 'both', oR: -0.1, oL: 0.14, st: 'neutral', cr: 0.04, tw: 0, pi: 0.08 })] },
  hit: { dur: 0.4, keys: [K(0, [-0.12, 1.3, 0.25], [0.2, 0.4, 0.9], { g: 'both', oR: -0.1, oL: 0.14, st: 'guard' }), K(0.1, [-0.05, 1.3, 0.1], [0.5, 0.7, 0.3], { pi: -0.35, tw: 0.4, headPitch: -0.4, st: 'back', cr: 0.1 }), K(0.4, [-0.12, 1.3, 0.25], [0.2, 0.4, 0.9], { pi: 0, tw: 0, headPitch: 0, st: 'guard', cr: 0.05 })] },
  knock: { dur: 1.6, keys: [K(0, [-0.05, 1.2, 0.2], [0.5, 0.6, 0.5], { g: 'R', oR: -0.1, st: 'neutral', fl: [0.3, 1.3, 0.1], air: 1, flip: 0 }), K(0.3, [-0.2, 1.3, 0.1], [1, 0.4, 0], { flip: -1.2, fl: [0.4, 1.4, 0.2], liftL: 0.6, liftR: 0.4 }),
    K(0.7, [-0.3, 1.0, 0.1], [1, 0.1, 0], { flip: -1.52, off: [0, -0.62, -0.25], air: 0, liftL: 0.2, liftR: 0.1 }), K(1.15, [-0.3, 1.0, 0.1], [1, 0.1, 0], { flip: -1.52, off: [0, -0.62, -0.25] }), K(1.6, [-0.1, 1.05, 0.2], [0.35, 0.5, 0.8], { g: 'both', flip: 0, off: [0, 0, 0], st: 'guard', liftL: 0, liftR: 0, cr: 0.2 })] },
  death: { dur: 1.3, keys: [K(0, [-0.1, 1.2, 0.2], [0.35, 0.5, 0.8], { g: 'both', oR: -0.1, oL: 0.14, st: 'guard' }), K(0.35, [-0.2, 0.9, 0.3], [0.8, 0.1, 0.5], { g: 'R', fl: [0.35, 0.8, 0.3], cr: 0.35, pi: 0.4, headPitch: 0.4, st: 'wide' }),
    K(0.9, [-0.3, 0.5, 0.4], [1, 0, 0.1], { flip: 1.45, off: [0, -0.72, 0.35], cr: 0.2, pi: 0.1 }), K(1.3, [-0.3, 0.45, 0.45], [1, 0, 0.1], { flip: 1.56, off: [0, -0.8, 0.38] })] },
  choke: { loop: true, keys: [K(0, [-0.25, 0.9, 0.1], [0.3, -0.8, 0.3], { g: 'R', oR: -0.1, fl: [0.06, 1.5, 0.12], st: 'neutral', liftL: 0.5, liftR: 0.3, air: 1, pi: -0.25, headPitch: -0.5 }),
    K(0.25, [-0.25, 0.9, 0.1], [0.3, -0.8, 0.3], { fl: [0.05, 1.52, 0.1], liftL: 0.3, liftR: 0.6, lean: 0.15 }), K(0.5, [-0.25, 0.9, 0.1], [0.3, -0.8, 0.3], { fl: [0.06, 1.5, 0.12], liftL: 0.5, liftR: 0.3, lean: -0.1 })] },
  stun: { loop: true, keys: [K(0, [-0.2, 0.95, 0.2], [0.6, -0.3, 0.6], { g: 'R', oR: -0.1, fl: [0.3, 1.0, 0.25], st: 'wide', cr: 0.2, pi: 0.35, headPitch: 0.4 }), K(0.6, [-0.2, 0.95, 0.2], [0.6, -0.3, 0.6], { lean: 0.15, cr: 0.24 }), K(1.2, [-0.2, 0.95, 0.2], [0.6, -0.3, 0.6], { lean: -0.1, cr: 0.2 })] },
  execd: { dur: 1.4, keys: [K(0, [-0.2, 0.95, 0.2], [0.6, -0.3, 0.6], { g: 'R', oR: -0.1, fl: [0.3, 1.0, 0.25], st: 'wide', cr: 0.2, pi: 0.35 }), K(0.3, [-0.2, 1.0, 0.1], [0.6, -0.3, 0.6], { pi: -0.35, headPitch: -0.5, cr: 0.1, fl: [0.25, 1.1, 0.2] }),
    K(0.6, [-0.2, 1.1, 0.1], [0.6, -0.3, 0.6], { pi: -0.4, off: [0, 0.12, 0], liftL: 0.3, liftR: 0.3, air: 1 }), K(0.9, [-0.2, 1.0, 0.1], [0.6, -0.3, 0.6], { pi: -0.3, off: [0, 0, 0], liftL: 0, liftR: 0, air: 0 }), K(1.4, [-0.2, 1.0, 0.1], [0.6, -0.3, 0.6], {})] },
};
MOV.melee = {   // staffs / clubs / electrostaffs held in both hands (prop axis +Y, grips at -0.2 / +0.15)
  idle: { loop: true, keys: [K(0, [-0.05, 1.1, 0.3], [0.4, 0.85, 0.1], { g: 'both', oR: -0.25, oL: 0.2, st: 'guard', cr: 0.08, tw: -0.2, headYaw: 0.2 }), K(1.5, [-0.05, 1.12, 0.3], [0.4, 0.85, 0.1], { cr: 0.1 })] },
  run: { loop: true, keys: [K(0, [-0.1, 1.15, 0.25], [0.6, 0.7, 0.3], { g: 'both', oR: -0.25, oL: 0.2, st: 'neutral', cr: 0.05, pi: 0.1 })] },
  wind: { dur: 0.55, keys: [K(0, [-0.05, 1.1, 0.3], [0.4, 0.85, 0.1], { g: 'both', oR: -0.25, oL: 0.2, st: 'guard' }), K(0.55, [-0.1, 1.55, -0.05], [-0.3, 0.6, -0.75], { tw: -0.6, pi: -0.2, cr: 0.1, st: 'back' })] },
  strike: { dur: 0.5, ev: [[0.05, 0.2, 1, 12, 'melee']], keys: [K(0, [-0.1, 1.55, -0.05], [-0.3, 0.6, -0.75], { g: 'both', oR: -0.25, oL: 0.2, tw: -0.6, pi: -0.2, cr: 0.1, st: 'back' }), K(0.14, [0.0, 1.1, 0.55], [0.2, -0.3, 0.95], { tw: 0.35, pi: 0.35, cr: 0.2, st: 'lungeL' }),
    K(0.5, [-0.05, 1.1, 0.3], [0.4, 0.85, 0.1], { tw: -0.2, pi: 0.05, cr: 0.08, st: 'guard' })] },
  hit: MOV.trooper.hit, knock: MOV.trooper.knock, death: MOV.trooper.death, choke: MOV.trooper.choke, stun: MOV.trooper.stun, execd: MOV.trooper.execd,
  block: { keys: [K(0, [0.0, 1.35, 0.35], [1, 0.25, 0.05], { g: 'both', oR: -0.25, oL: 0.2, st: 'guard', cr: 0.12, tw: 0 })] },
};
