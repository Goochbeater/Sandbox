/* MOVES — keyframed prop paths for Maul's saberstaff and the other fighters.
   h = hilt centre (body space), a = direction the hilt's +Y blade points, g = which hands hold it.
   ev: hit windows [t0, t1, blade mask (1 = +Y blade, 2 = -Y blade, 3 both), damage, kind]. */
const MOV = {};
const K = (t, h, a, x) => Object.assign({ t, h, a }, x || {});
MOV.spin = function (t0, t1, n, fn, x) {   // n keys from t0..t1, fn(u) -> {h,a,...}
  const out = []; for (let i = 0; i <= n; i++) { const u = i / n; out.push(Object.assign({ t: lerp(t0, t1, u), ease: 'lin' }, fn(u), i === 0 ? (x || {}) : {})); } return out;
};
MOV.GUARD = K(0, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', st: 'guard', tw: -0.3, headYaw: 0.28, cr: 0.09, pi: 0.06, le: 0, flip: 0, yaw: 0, off: [0, 0, 0], liftL: 0, liftR: 0, air: 0, toeL: 0, toeR: 0 });
MOV.maul = {
  guard: { loop: true, keys: [MOV.GUARD, K(1.2, [0.03, 1.1, 0.34], [0.44, 0.8, -0.2], { cr: 0.075 }), K(2.4, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { cr: 0.09 })] },
  idleCalm: { loop: true, keys: [K(0, [-0.3, 0.98, 0.02], [0.08, 0.98, 0.1], { g: 'R', oR: 0.0, st: 'neutral', tw: 0, headYaw: 0, cr: 0.03, pi: 0.02, fl: [0.28, 0.9, 0.02] }), K(2, [-0.3, 0.99, 0.02], [0.08, 0.98, 0.1], { cr: 0.035 })] },
  run: { loop: true, keys: [K(0, [-0.3, 1.0, -0.02], [0.05, 0.25, 1], { g: 'R', oR: 0.0, st: 'neutral', tw: 0.05, headYaw: 0, cr: 0.05, pi: 0.05, fl: [0.26, 0.98, 0.05] })] },
  block: { keys: [K(0, [0.0, 1.22, 0.36], [0.28, 0.95, 0.1], { g: 'both', st: 'guard', tw: -0.15, headYaw: 0.15, cr: 0.12, pi: 0.05 })] },
  blockHi: { keys: [K(0, [0.0, 1.55, 0.3], [1, 0.12, 0.05], { g: 'both', st: 'wide', tw: 0, headYaw: 0, cr: 0.16, pi: -0.05 })] },
  deflectL: { dur: 0.22, keys: [K(0, [0.0, 1.22, 0.36], [0.28, 0.95, 0.1], { g: 'both', st: 'guard', cr: 0.12 }), K(0.07, [0.14, 1.28, 0.42], [0.85, 0.5, 0.3], { tw: 0.25 }), K(0.22, [0.0, 1.22, 0.36], [0.28, 0.95, 0.1], { tw: -0.1 })] },
  deflectR: { dur: 0.22, keys: [K(0, [0.0, 1.22, 0.36], [0.28, 0.95, 0.1], { g: 'both', st: 'guard', cr: 0.12 }), K(0.07, [-0.14, 1.28, 0.42], [-0.7, 0.65, 0.3], { tw: -0.45 }), K(0.22, [0.0, 1.22, 0.36], [0.28, 0.95, 0.1], { tw: -0.1 })] },
  // ---------------- light combo
  a1: { dur: 0.5, next: 'a2', cancel: 0.27, ev: [[0.09, 0.24, 1, 18, 'slash']], move: [[0.1, 0], [0.22, 0.55]],
    keys: [MOV.GUARD, K(0.09, [-0.06, 0.98, 0.28], [-0.72, -0.45, 0.52], { tw: -0.55, cr: 0.13, headYaw: 0.1 }), K(0.16, [0.0, 1.12, 0.44], [-0.06, 0.06, 1], { tw: -0.05, st: 'lungeL', pi: 0.18 }),
      K(0.24, [0.1, 1.32, 0.38], [0.6, 0.72, 0.35], { tw: 0.45, pi: 0.08 }), K(0.5, [0.05, 1.14, 0.34], [0.45, 0.76, -0.2], { tw: 0.05, cr: 0.1, headYaw: 0.1 })] },
  a2: { dur: 0.48, next: 'a3', cancel: 0.26, ev: [[0.08, 0.24, 2, 18, 'slash']], move: [[0.06, 0], [0.2, 0.45]],
    keys: [K(0, [0.05, 1.14, 0.34], [0.45, 0.76, -0.2], { g: 'both', st: 'lungeL' }), K(0.08, [0.12, 1.22, 0.3], [-0.88, 0.15, -0.35], { tw: 0.55, cr: 0.12 }), K(0.16, [0.0, 1.2, 0.44], [0.06, 0.08, -1], { tw: 0.0, st: 'lungeR', pi: 0.15 }),
      K(0.24, [-0.13, 1.16, 0.34], [0.88, 0.14, -0.25], { tw: -0.6 }), K(0.48, [-0.06, 1.12, 0.33], [0.55, 0.6, -0.5], { tw: -0.2, st: 'guard', pi: 0.05 })] },
  a3: { dur: 0.66, next: 'a4', cancel: 0.46, ev: [[0.08, 0.5, 3, 11, 'twirl']], move: [[0.05, 0], [0.45, 0.6]],
    keys: [K(0, [-0.06, 1.12, 0.33], [0.55, 0.6, -0.5], { g: 'both', st: 'guard' }), K(0.07, [-0.14, 1.2, 0.42], [0, 1, 0.05], { g: 'R', oR: 0.0, fl: [0.3, 1.1, 0.15], tw: -0.35, cr: 0.12 })]
      .concat(MOV.spin(0.08, 0.5, 12, (u) => { const th = u * 4 * PI; return { h: [-0.14, 1.2, 0.46], a: [0.0, Math.cos(th), Math.sin(th) + 0.001] }; }))
      .concat([K(0.66, [-0.05, 1.12, 0.34], [0.45, 0.76, -0.22], { g: 'both', tw: -0.25, st: 'guard' })]) },
  a4: { dur: 0.64, next: 'a5', cancel: 0.4, ev: [[0.06, 0.48, 3, 16, 'spin']], move: [[0.04, 0], [0.45, 0.9]],
    keys: [K(0, [-0.05, 1.12, 0.34], [0.45, 0.76, -0.22], { g: 'both', st: 'guard', yaw: 0 }), K(0.06, [0.0, 1.12, 0.38], [1, 0.06, 0.1], { st: 'spin', cr: 0.16, tw: 0.3 })]
      .concat(MOV.spin(0.08, 0.46, 8, (u) => ({ yaw: -u * TAU, h: [0.0, 1.12 + 0.05 * Math.sin(u * PI), 0.4], a: [1, 0.05, 0.1], tw: 0.1 })))
      .concat([K(0.64, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { yaw: -TAU, tw: -0.3, st: 'guard', cr: 0.09 })]) },
  a5: { dur: 0.82, next: null, cancel: 0.5, ev: [[0.2, 0.34, 1, 34, 'slam']], impact: 0.32, move: [[0.08, 0], [0.3, 0.8]],
    keys: [K(0, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', st: 'guard', yaw: 0 }), K(0.13, [0.0, 1.62, 0.12], [0, 0.35, -1], { cr: 0.02, pi: -0.25, off: [0, 0.18, 0], st: 'neutral', liftL: 0.3, liftR: 0.3, air: 1 }),
      K(0.26, [0.0, 1.35, 0.55], [0, 0.35, 1], { pi: 0.3, off: [0, 0.08, 0.1], cr: 0.1 }), K(0.33, [0.0, 0.98, 0.58], [0, -0.72, 0.7], { pi: 0.55, cr: 0.3, off: [0, 0, 0.15], st: 'lungeL', liftL: 0, liftR: 0, air: 0 }),
      K(0.6, [0.0, 0.98, 0.56], [0, -0.7, 0.72], { pi: 0.5, cr: 0.28 }), K(0.82, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { pi: 0.06, cr: 0.09, off: [0, 0, 0], st: 'guard' })] },
  // ---------------- heavy: dark whirlwind (overhead helicopter) + downward sweep
  heavy: { dur: 1.05, cancel: 0.9, ev: [[0.12, 0.66, 3, 14, 'whirl'], [0.72, 0.84, 3, 24, 'sweep']], aoe: 2.6, move: [[0.1, 0], [0.7, 0.4]],
    keys: [K(0, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', st: 'guard' }), K(0.1, [-0.1, 1.82, 0.08], [1, 0.02, 0.0], { g: 'R', oR: 0.0, fl: [0.35, 1.25, 0.2], st: 'wide', cr: 0.18, tw: 0.0, pi: -0.05 })]
      .concat(MOV.spin(0.12, 0.66, 12, (u) => { const th = u * 5 * PI; return { h: [-0.1, 1.84, 0.08], a: [Math.cos(th), 0.03, Math.sin(th)] }; }))
      .concat([K(0.72, [0.0, 1.3, 0.45], [1, 0.3, 0.2], { g: 'both', tw: 0.5, cr: 0.12 }), K(0.84, [0.0, 0.95, 0.5], [-0.95, -0.2, 0.2], { tw: -0.6, cr: 0.3, pi: 0.35, st: 'lungeL' }),
        K(1.05, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { tw: -0.3, cr: 0.09, pi: 0.06, st: 'guard' })]) },
  // ---------------- dash lunge
  lunge: { dur: 0.55, cancel: 0.38, ev: [[0.1, 0.32, 1, 26, 'thrust']], move: [[0.05, 0], [0.3, 3.2]],
    keys: [K(0, [-0.05, 1.08, 0.12], [0.02, 0.05, 1], { g: 'both', oL: -0.05, oR: -0.2, st: 'guard', tw: -0.4, cr: 0.14 }), K(0.14, [0.0, 1.22, 0.62], [0, 0.03, 1], { st: 'lungeL', pi: 0.35, tw: 0.1, cr: 0.2 }),
      K(0.32, [0.02, 1.24, 0.64], [0.05, 0.05, 1], { pi: 0.3 }), K(0.55, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { oL: 0.132, oR: -0.132, tw: -0.3, pi: 0.06, cr: 0.09, st: 'guard' })] },
  // ---------------- air
  jump: { keys: [K(0, [0.02, 1.2, 0.3], [0.9, 0.3, -0.2], { g: 'both', st: 'neutral', liftL: 0.55, liftR: 0.35, air: 1, cr: 0.08, tw: 0, pi: 0.1 })] },
  flip: { dur: 0.52, keys: [K(0, [0.02, 1.2, 0.3], [0.9, 0.3, -0.2], { g: 'both', st: 'neutral', liftL: 0.7, liftR: 0.7, air: 1, cr: 0.2, flip: 0 })]
    .concat(MOV.spin(0.04, 0.46, 6, (u) => ({ flip: u * TAU, h: [0.0, 1.15, 0.25], a: [1, 0.1, 0] }))).concat([K(0.52, [0.02, 1.2, 0.3], [0.9, 0.3, -0.2], { flip: TAU, liftL: 0.5, liftR: 0.3, cr: 0.1 })]) },
  plunge: { dur: 0.45, ev: [[0.05, 0.45, 3, 30, 'plunge']], keys: [K(0, [0.0, 1.55, 0.25], [0, 1, -0.2], { g: 'both', st: 'neutral', liftL: 0.5, liftR: 0.5, air: 1, pi: -0.2 }), K(0.12, [0.0, 1.0, 0.45], [0, -0.85, 0.5], { pi: 0.45, cr: 0.2, liftL: 0.2, liftR: 0.2 }), K(0.45, [0.0, 0.95, 0.45], [0, -0.85, 0.5], { pi: 0.45 })] },
  land: { dur: 0.32, keys: [K(0, [0.0, 0.98, 0.5], [0, -0.75, 0.66], { g: 'both', st: 'wide', cr: 0.34, pi: 0.45, air: 0, liftL: 0, liftR: 0, flip: 0 }), K(0.32, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { st: 'guard', cr: 0.09, pi: 0.06 })] },
  // ---------------- evasion
  dodge: { dur: 0.42, iframes: [0.02, 0.3], keys: [K(0, [0.02, 1.1, 0.3], [0.9, 0.3, -0.2], { g: 'both', st: 'spin', cr: 0.22, pi: 0.25, yaw: 0 })]
    .concat(MOV.spin(0.03, 0.34, 4, (u) => ({ yaw: u * TAU, cr: 0.25 - 0.1 * Math.sin(u * PI), h: [0, 1.1, 0.25], a: [1, 0.2, 0] }))).concat([K(0.42, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { yaw: TAU, st: 'guard', cr: 0.09, pi: 0.06 })]) },
  backflip: { dur: 0.6, iframes: [0.02, 0.45], keys: [K(0, [0.02, 1.2, 0.3], [0.9, 0.3, -0.2], { g: 'both', st: 'neutral', cr: 0.18, flip: 0, air: 1, liftL: 0.3, liftR: 0.3 })]
    .concat(MOV.spin(0.05, 0.5, 6, (u) => ({ flip: -u * TAU, off: [0, Math.sin(u * PI) * 0.5, 0], liftL: 0.6, liftR: 0.6 }))).concat([K(0.6, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { flip: -TAU, off: [0, 0, 0], st: 'guard', liftL: 0, liftR: 0, air: 0, cr: 0.12 })]) },
  // ---------------- force
  push: { dur: 0.62, ev: [], force: 0.2, keys: [K(0, [-0.3, 1.05, 0.0], [0.05, 0.3, 1], { g: 'R', oR: 0.0, st: 'guard', fl: [0.25, 1.1, 0.0], tw: 0.35, cr: 0.1 }), K(0.14, [-0.32, 1.05, -0.08], [0.05, 0.3, 1], { fl: [0.28, 1.3, -0.08], tw: 0.5, cr: 0.14 }),
    K(0.22, [-0.3, 1.02, -0.05], [0.05, 0.3, 1], { fl: [0.08, 1.38, 0.62], tw: -0.25, st: 'lungeL', pi: 0.2, cr: 0.16 }), K(0.45, [-0.3, 1.02, -0.05], [0.05, 0.3, 1], { fl: [0.08, 1.38, 0.6] }), K(0.62, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', tw: -0.3, st: 'guard', pi: 0.06, cr: 0.09 })] },
  grip: { dur: 0.5, keys: [K(0, [-0.3, 1.0, 0.0], [0.05, 0.3, 1], { g: 'R', oR: 0.0, st: 'guard', fl: [0.2, 1.3, 0.3], tw: 0.1, cr: 0.08 }), K(0.25, [-0.3, 1.0, 0.0], [0.05, 0.3, 1], { fl: [0.1, 1.62, 0.55], tw: -0.1, pi: -0.05 })] },
  throwWind: { dur: 0.3, release: 0.24, keys: [K(0, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', st: 'guard' }), K(0.16, [-0.38, 1.38, -0.18], [0.1, 0.1, 1], { g: 'R', oR: 0.0, fl: [0.3, 1.2, 0.3], tw: 0.55, cr: 0.12 }),
    K(0.26, [-0.1, 1.35, 0.55], [1, 0.1, 0.1], { tw: -0.4, st: 'lungeL', pi: 0.15 }), K(0.3, [-0.1, 1.35, 0.6], [1, 0.1, 0.1], {})] },
  throwWait: { loop: true, keys: [K(0, [-0.1, 1.3, 0.6], [1, 0.1, 0.1], { g: 'L', oL: 0, gL: 0, gR: 0, fr: [-0.12, 1.38, 0.55], fl: [0.3, 1.1, 0.25], st: 'guard', tw: -0.2, cr: 0.12 })] },
  // ---------------- reactions
  hit: { dur: 0.36, keys: [K(0, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', st: 'guard' }), K(0.08, [0.0, 1.12, 0.22], [0.5, 0.75, -0.3], { pi: -0.3, tw: 0.3, cr: 0.14, headPitch: -0.3, st: 'back' }), K(0.36, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { pi: 0.06, tw: -0.3, cr: 0.09, headPitch: 0, st: 'guard' })] },
  knock: { dur: 1.3, keys: [K(0, [0.0, 1.2, 0.2], [0.8, 0.5, -0.2], { g: 'both', st: 'neutral', flip: 0, air: 1 }), K(0.25, [0.1, 1.1, 0.25], [0.9, 0.3, 0], { flip: -1.4, off: [0, -0.3, 0], liftL: 0.5, liftR: 0.3 }),
    K(0.5, [0.1, 1.05, 0.25], [0.9, 0.3, 0], { flip: -1.5, off: [0, -0.62, -0.2] }), K(0.9, [0.1, 1.05, 0.25], [0.9, 0.3, 0], { flip: -1.5, off: [0, -0.62, -0.2] }),
    K(1.3, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { flip: 0, off: [0, 0, 0], air: 0, liftL: 0, liftR: 0, st: 'guard', cr: 0.2 })] },
  death: { dur: 1.6, keys: [K(0, [0.0, 1.1, 0.3], [0.8, 0.5, -0.2], { g: 'both', st: 'guard' }), K(0.5, [0.1, 0.7, 0.35], [0.9, -0.2, 0.3], { g: 'R', oR: 0, cr: 0.5, pi: 0.6, st: 'wide', fl: [0.3, 0.6, 0.3] }),
    K(1.2, [0.1, 0.4, 0.5], [1, 0, 0.2], { flip: 1.45, off: [0, -0.7, 0.3], cr: 0.3, pi: 0.2 }), K(1.6, [0.1, 0.35, 0.5], [1, 0, 0.2], { flip: 1.55, off: [0, -0.78, 0.35] })] },
  // ---------------- execution (finisher): impale, lift, spin out
  exec: { dur: 1.35, ev: [[0.18, 0.3, 1, 999, 'exec'], [0.86, 1.02, 3, 999, 'exec']], move: [[0.1, 0], [0.3, 0.5]],
    keys: [K(0, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', st: 'guard' }), K(0.14, [-0.05, 1.1, 0.05], [0, 0.05, 1], { oL: -0.05, oR: -0.2, tw: -0.5, cr: 0.15 }),
      K(0.26, [0.0, 1.25, 0.62], [0, 0.1, 1], { st: 'lungeL', pi: 0.3, tw: 0.1 }), K(0.6, [0.0, 1.45, 0.55], [0, 0.45, 0.9], { pi: 0.05, cr: 0.05, headPitch: -0.2 }),
      K(0.8, [0.0, 1.3, 0.45], [0.2, 0.7, 0.6], { oL: 0.132, oR: -0.132, tw: 0.5, cr: 0.15 })]
      .concat(MOV.spin(0.84, 1.1, 5, (u) => ({ yaw: -u * TAU, h: [0.0, 1.15, 0.4], a: [1, 0.05, 0.1], cr: 0.2 })))
      .concat([K(1.35, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { yaw: -TAU, st: 'guard', cr: 0.09, tw: -0.3, pi: 0.06 })]) },
  kick: { dur: 0.5, ev: [[0.14, 0.26, 0, 12, 'kick']], keys: [K(0, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { g: 'both', st: 'guard' }), K(0.12, [0.1, 1.15, 0.15], [0.9, 0.4, -0.1], { st: 'kick', liftR: 1.4, fR: [-0.1, 0.6, 0.55], pi: -0.25, tw: 0.3 }),
    K(0.26, [0.1, 1.15, 0.15], [0.9, 0.4, -0.1], { liftR: 1.2, fR: [-0.08, 0.55, 0.62] }), K(0.5, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { st: 'guard', liftR: 0, pi: 0.06, tw: -0.3 })] },
  kneel: { loop: true, keys: [K(0, [-0.02, 0.62, 0.42], [0.02, 0.98, 0.15], { g: 'R', oR: 0.0, fL: [0.13, 0, 0.3], fR: [-0.13, 0, -0.32], toeR: 0.9, cr: 0.5, pi: 0.12, tw: 0, headPitch: 0.25, fl: [0.2, 0.9, 0.25], lean: 0 }), K(3, [-0.02, 0.63, 0.42], [0.02, 0.98, 0.15], { cr: 0.49 })] },
  ignite: { dur: 1.2, keys: [K(0, [-0.25, 1.0, 0.15], [0.1, 0.1, 1], { g: 'R', oR: 0, st: 'neutral', fl: [0.25, 0.95, 0.05], cr: 0.03, tw: 0, pi: 0 }), K(0.5, [0.0, 1.35, 0.35], [1, 0.05, 0], { g: 'both', cr: 0.1 }),
    K(0.9, [0.03, 1.1, 0.33], [0.45, 0.78, -0.22], { st: 'guard', tw: -0.3, cr: 0.1, pi: 0.06 }), K(1.2, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { cr: 0.09 })] },
};
/* a struck-down body: head whips back, arms fling up, then the limbs go slack while the body topples (Actor.topple) */
MOV.DEATH_FALL = { dur: 1.3, keys: [
  K(0, [0.0, 1.0, 0.3], [0, 1, 0], { g: 'none', fl: [0.3, 1.05, 0.3], fr: [-0.3, 1.05, 0.3], st: 'guard', cr: 0.03, pi: -0.05, headPitch: 0, air: 1, liftL: 0, liftR: 0 }),
  K(0.12, [0.0, 1.0, 0.3], [0, 1, 0], { fl: [0.42, 1.58, 0.28], fr: [-0.46, 1.5, 0.2], pi: -0.4, headPitch: 0.55, cr: 0.0, liftL: 0.2 }),
  K(0.5, [0.0, 1.0, 0.3], [0, 1, 0], { fl: [0.58, 1.3, -0.05], fr: [-0.56, 1.22, -0.1], pi: -0.22, headPitch: 0.35, liftL: 0.4, liftR: 0.12 }),
  K(1.3, [0.0, 1.0, 0.3], [0, 1, 0], { fl: [0.62, 1.02, -0.18], fr: [-0.6, 0.98, -0.12], pi: -0.05, headPitch: 0.2, liftL: 0.25, liftR: 0.06, cr: 0.02 })] };
/* enemy reactions (shared by every non-Jedi fighter). Weapon stays in the right hand; the left arm flails free. */
MOV.REACT = (function () {
  const base = { g: 'R', oR: -0.1, fl: [0.3, 1.0, 0.15], st: 'guard', cr: 0.05, tw: 0, pi: 0, le: 0, headYaw: 0, headPitch: 0, liftL: 0, liftR: 0 };
  const H0 = [-0.12, 1.2, 0.25], A0 = [0.3, 0.5, 0.8];
  const side = (s) => ({ dur: 0.5, keys: [K(0, H0, A0, base),
    K(0.06, [-0.2 + s * 0.05, 1.28, 0.08], [0.6, 0.6, -0.2], { tw: 0.75 * s, le: 0.28 * s, pi: -0.18, headYaw: 0.55 * s, headPitch: -0.25, fl: [0.42 + 0.1 * s, 1.35, -0.1], st: 'back', cr: 0.1, ease: 'out' }),
    K(0.2, [-0.18, 1.24, 0.12], [0.5, 0.6, 0.1], { tw: 0.55 * s, le: 0.16 * s, pi: -0.1, headYaw: 0.35 * s, fl: [0.4, 1.2, 0.0], cr: 0.12 }),
    K(0.5, H0, A0, Object.assign({}, base, { ease: 'io' }))] });
  return {
    hitL: side(1), hitR: side(-1),
    hitSpin: { dur: 0.42, keys: [K(0, H0, A0, base), K(0.05, [-0.15, 1.22, 0.15], [0.7, 0.4, 0.3], { tw: -0.5, pi: 0.25, cr: 0.16, headPitch: 0.3, fl: [0.25, 1.05, 0.35], ease: 'out' }),
      K(0.15, [-0.12, 1.18, 0.2], [0.5, 0.5, 0.5], { tw: 0.4, pi: 0.3, cr: 0.18, headPitch: 0.25 }), K(0.42, H0, A0, base)] },
    hitHeavy: { dur: 0.85, keys: [K(0, H0, A0, base),
      K(0.07, [-0.1, 1.4, -0.05], [0.4, 0.8, -0.3], { pi: -0.55, headPitch: -0.55, cr: 0.05, fl: [0.55, 1.55, -0.15], st: 'back', le: 0.1, ease: 'out' }),
      K(0.3, [-0.2, 1.2, 0.05], [0.5, 0.6, 0.1], { pi: -0.3, headPitch: -0.2, cr: 0.2, fl: [0.5, 1.2, 0.0], st: 'wide', le: -0.08 }),
      K(0.55, [-0.15, 1.1, 0.2], [0.4, 0.5, 0.6], { pi: 0.15, cr: 0.16, fl: [0.35, 1.0, 0.2], st: 'guard' }), K(0.85, H0, A0, base)] },
    // knocked flat on the back, lies a beat, rolls up onto a knee and stands
    knock: { dur: 2.25, keys: [K(0, [-0.05, 1.2, 0.2], [0.5, 0.6, 0.5], { g: 'R', oR: -0.1, st: 'neutral', fl: [0.3, 1.3, 0.1], air: 1, flip: 0 }),
      K(0.28, [-0.2, 1.3, 0.1], [1, 0.4, 0], { flip: -1.15, fl: [0.45, 1.45, 0.25], liftL: 0.6, liftR: 0.4, headPitch: 0.4 }),
      K(0.62, [-0.3, 1.0, 0.1], [1, 0.1, 0], { flip: -1.52, off: [0, -0.62, -0.25], air: 0, liftL: 0.25, liftR: 0.1, headPitch: 0.2, ease: 'out' }),
      K(0.72, [-0.3, 1.0, 0.1], [1, 0.1, 0], { flip: -1.46, off: [0, -0.6, -0.25], liftL: 0.15, liftR: 0.05 }),
      K(1.2, [-0.3, 1.0, 0.1], [1, 0.1, 0], { flip: -1.5, off: [0, -0.62, -0.25], headPitch: 0.35 }),
      K(1.5, [-0.3, 0.8, 0.3], [0.9, 0.3, 0.2], { flip: -0.85, off: [0, -0.45, -0.1], cr: 0.35, fl: [0.35, 0.55, -0.25], headPitch: 0.1, liftL: 0.3, liftR: 0.0 }),
      K(1.85, [-0.25, 0.95, 0.3], [0.6, 0.5, 0.5], { flip: -0.1, off: [0, -0.05, 0], cr: 0.42, pi: 0.35, st: 'lungeL', fl: [0.3, 0.85, 0.35], liftL: 0, liftR: 0 }),
      K(2.25, [-0.1, 1.05, 0.2], [0.35, 0.5, 0.8], { g: 'both', flip: 0, off: [0, 0, 0], st: 'guard', cr: 0.06, pi: 0 })] },
  };
})();
/* idle flourish: a one-handed twirl at his side, a pass behind the back, and back into guard */
MOV.maul.flourish = { dur: 2.1, keys: [MOV.GUARD, K(0.25, [-0.28, 1.12, 0.2], [0, 1, 0.1], { g: 'R', oR: 0.0, fl: [0.28, 0.98, 0.1], st: 'neutral', tw: 0.1, headYaw: -0.25, cr: 0.05 })]
  .concat(MOV.spin(0.3, 1.25, 16, (u) => { const th = u * 6 * PI; return { h: [-0.3, 1.14 + 0.04 * Math.sin(u * PI), 0.22], a: [0.12, Math.cos(th), Math.sin(th) + 0.001], headYaw: -0.25 + u * 0.3 }; }))
  .concat([K(1.45, [-0.25, 1.1, 0.25], [0.2, 0.95, -0.2], { tw: -0.2, headYaw: 0.1 }), K(1.7, [0.0, 1.12, 0.33], [0.45, 0.8, -0.2], { g: 'both', st: 'guard', tw: -0.3, cr: 0.09 }), K(2.1, [0.03, 1.08, 0.33], [0.45, 0.78, -0.22], { headYaw: 0.28 })]) };
MOV.init = function () {
  for (const set of [MOV.trooper, MOV.melee, MOV.brawler]) if (set) Object.assign(set, MOV.REACT);
  for (const set of [MOV.trooper, MOV.melee, MOV.brawler]) if (set) set.deathFall = MOV.DEATH_FALL;
  const base = ANIM.keyPose(MOV.GUARD, new Pose(), new Pose());
  ANIM.basePose = base;
  for (const set of [MOV.maul, MOV.jedi, MOV.trooper, MOV.melee, MOV.brawler]) if (set) for (const k in set) ANIM.compile(set[k], base);
};
