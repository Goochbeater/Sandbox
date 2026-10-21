/* SPACE MISSIONS — the four flights of the campaign (docs/MASTER_BUILD_ADDENDUM.md §C/§F), as data for the p60 core.
   sp_zx34_escape   Act II  · THE HARBINGER   — a junker off Zx34 with a Padawan who did not listen to her master; the hyperdrive stalls.
   sp_wreck_field   Act III · THE SEIZURE     — the lorebook's interceptor scene: stillness in a wreck field, cripple, then DOMINATE.
   sp_iziz_approach Act IV  · PICKET LINE     — the Shroud slips between Republic pickets; sensor cones, the alert meter, no shots.
   sp_dxun_orbit    Act V   · ORBITAL DEFENSE — Kyros's hunt cell drops on Dxun; Bosskarr's freighter answers the life debt.
   In-flight lines are comms on the subtitle bar (HUD.sub); story scenes with choices play after the flight (campaign `post`). */
const SPM = {};
SPM.say = (who, line, dur, cls) => HUD.sub(who, line, dur || Math.max(2.4, line.length * 0.06), cls);
SPM.seq = function (list, t0) { let t = t0 || 0; for (const x of list) { MG.after(t, () => SPM.say(x[0], x[1], x[3], x[2])); t += Math.max(2.4, x[1].length * 0.06) + 0.35; } return t; };
SPM.line = function (scene, i) { const L = typeof CINE !== 'undefined' ? CINE.lines(scene) : []; const s = L[i]; return s ? [s.who, s.line, CINE.SPK[s.who]] : null; };
SPM.lines = (scene, idx) => idx.map((i) => SPM.line(scene, i)).filter(Boolean);
/* a pack of fighters around a point, all aimed at the player */
SPM.wing = function (S, kind, n, at, o) { o = o || {}; const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, p = [at[0] + Math.cos(a) * 60, at[1] + (i % 2 ? 20 : -20), at[2] + Math.sin(a) * 60]; out.push(S.spawn(kind, Object.assign({ team: 'foe', at: p, yaw: Math.atan2(S.P.pos.x - p[0], S.P.pos.z - p[2]) }, o))); } return out; };
SPM.behind = (S, d, up) => { const P = S.P; return [P.pos.x - Math.sin(P.yaw) * d, P.pos.y + (up || 0), P.pos.z - Math.cos(P.yaw) * d]; };
SPM.ahead = (S, d, up) => { const P = S.P; return [P.pos.x + Math.sin(P.yaw) * d, P.pos.y + (up || 0), P.pos.z + Math.cos(P.yaw) * d]; };

/* ---------------------------------------------------------------- Act II · THE HARBINGER */
SPACE.def('sp_zx34_escape', {
  name: 'THE HARBINGER', chapter: 'ACT II · ZX34 ORBIT', brief: 'A junker with bad engines. A Padawan who did not listen to her master.', hull: 'harbinger', par: 260, acc: 0.05,
  env: { sun: [0.55, 0.3, 0.75], sunCol: 0xffe2c8, neb: 0x3a2a60, amb: 0x2a2840, planet: { r: 1100, at: [-900, -500, 3200], col: 0x5e5868, col2: 0x24202c, atmo: 0x8a7aa0, seed: 7.31 }, debris: { n: 150, r0: 260, r1: 1500, h: 320, s0: 3, s1: 34, wreck: 8, col: 0x7a7068 } },
  start: [0, 0, -260], startYaw: 0, bounds: 2300,
  objectives: [
    { type: 'survive', time: 34, text: 'Break away from Zx34', hint: 'Left stick steers · hold FIRE · BOOST to run · tap ROLL to dodge bolts', hintT: 7,
      start(S) { SPM.seq([['SYS', 'HULL 74%. SHIELDS 40%. HYPERDRIVE: COLD.'], ['RATHATRI', 'Fly, you rust-eaten coffin. Fly.'], ['CELENE', 'Unidentified freighter, cut your engines. You are carrying a Sith.', 'jedi'], ['KYROS', 'Padawan. I said let him go.', 'jedi'], ['CELENE', 'With respect, Master. No.', 'jedi']]);
        MG.after(5, () => { if (!S.on) return; SPM.wing(S, 'militiaFighter', 3, SPM.behind(S, 520, 30), { tag: 'escort' }); S.celene = S.spawn('jediStarfighter', { team: 'foe', at: SPM.behind(S, 640, 60), tag: 'celene', name: 'CELENE TRYST', hpK: 3, dominable: false });
          S.celene.onDie = null; }); } },
    { type: 'destroy', tag: 'escort', count: 3, text: 'Shake the escort fighters', start(S) { if (S.ships.filter((s) => s.tag === 'escort' && s.alive).length < 2) SPM.wing(S, 'militiaFighter', 2, SPM.ahead(S, 600, 40), { tag: 'escort' }); },
      update(S, O, dt) { const c = S.celene; if (c && c.alive && c.hp < c.hpMax * 0.4 && !c.left) { c.left = true; c.invuln = true; c.goal = [c.pos.x, c.pos.y + 800, c.pos.z - 2000]; c.ai = 'freighter'; SPM.seq([['KYROS', 'Celene. Disengage. Now.', 'jedi'], ['CELENE', '...Yes, Master. This isn’t over, Sith.', 'jedi']]); MG.after(9, () => { if (c) c.hidden = true; }); } } },
    { type: 'reach', at: [120, 80, 1500], r: 140, text: 'Reach the jump point beyond the ring', start(S) { SPM.say('SYS', 'HYPERDRIVE: SPOOLING. JUMP POINT MARKED.'); } },
    { type: 'survive', time: 24, text: 'Hyperdrive stalled — hold out while it cycles',
      start(S) { SPM.seq([['SYS', 'HYPERDRIVE: STALLED. CYCLING.'], ['RATHATRI', 'Not now. Not now, you worthless—'], ['COMM', 'Republic patrol inbound. Freighter, power down and prepare to be boarded.']]); MG.after(3, () => { if (S.on) SPM.wing(S, 'militiaFighter', 4, SPM.ahead(S, 700, 0), { tag: 'patrol' }); }); },
      done() { SPM.say('SYS', 'HYPERDRIVE: ENGAGED.'); } },
  ],
});

/* ---------------------------------------------------------------- Act III · THE SEIZURE (lorebook: "Seizing the Interceptor") */
SPACE.def('sp_wreck_field', {
  name: 'THE SEIZURE', chapter: 'ACT III · OUTER RIM WRECK FIELD', brief: 'Tear a Sith Interceptor out of the sky with nothing but will.', hull: 'harbinger', par: 300, teachDominate: true, acc: 0.045,
  env: { sun: [-0.4, 0.25, 0.85], sunCol: 0xffd2b0, neb: 0x6a2030, amb: 0x302024, planet: { r: 1600, at: [1800, -900, 3600], col: 0xb08050, col2: 0x5a3018, atmo: 0xd0905a, seed: 2.2, tex: 'gas_giant' }, debris: { n: 110, r0: 120, r1: 1300, h: 360, s0: 3, s1: 26, wreck: 46, col: 0x6a625a, center: [0, 0, 500] } },
  start: [0, 30, -700], startYaw: 0, bounds: 2400,
  onStart(S) {   // the battle that already happened: dead cruisers drifting, escape pods, fires
    for (const [x, y, z, yaw, pitch] of [[-260, 40, 640, 0.8, 0.3], [340, -60, 900, -2.2, -0.2], [80, 120, 1200, 2.6, 0.5]]) { const h = S.spawn('capital', { team: 'neutral', ai: 'static', at: [x, y, z], yaw, invuln: true, hidden: true, tag: 'hulk' }); h.pitch = pitch; h.bank = 0.6; S.orient(h); h.g.traverse((m) => { if (m.material && m.material.emissive) m.material = m.material.clone(); }); SHIP.thrust(h.g, 0); }
    for (let i = 0; i < 14; i++) { const p = new THREE.Vector3(rnd(-500, 500), rnd(-120, 160), rnd(300, 1300)); const pod = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.5, metalness: 0.6, emissive: 0xff5020, emissiveIntensity: 0.2 })); pod.position.copy(p); S.g.add(pod); }
  },
  objectives: [
    { type: 'reach', at: [0, 20, 380], r: 120, text: 'Enter the wreck field', hint: 'The skirmish is over. Something is still alive in there.',
      start(S) { SPM.seq([['COMM', '(static) ...all ships, fall back to the rendezvous... anyone...'], ['RATHATRI', 'A battle nobody won. Good. The dead don’t report.']]); } },
    { type: 'custom', text: 'Be still. Hold BRAKE inside the field and feel it', hint: 'Hold BRAKE to slow almost to a stop', hintT: 6,
      start(S, O) { O.k = 0; SPM.seq([['TRAYA', 'Do not fight here. Listen. A battlefield is a wound that keeps talking.', 'sid'], ['TRAYA', 'Feel the fear still in the hulls. Fear has a direction.', 'sid']]); },
      check(S, O, dt) { const P = S.P; if (P.braking && P.speed < 32) O.k += dt; else O.k = Math.max(0, O.k - dt * 0.5); MISSION.obj(O.text + '  ' + Math.min(100, Math.round(O.k / 6 * 100)) + '%'); return O.k >= 6; },
      done(S) { const L = SPM.lines('3_2_the_seizure', [0, 1]); SPM.seq(L.length ? L : [['COMM', 'Umbral Wake, port thruster is walking! Somebody answer me!']]); } },
    { type: 'cripple', tag: 'umbral', text: 'Cripple the Sith Interceptor — guns, not a kill', hint: 'Hold FIRE on it. It cannot die until you let it.',
      start(S) {
        const at = SPM.ahead(S, 520, 40), u = S.umbral = S.spawn('interceptor', { team: 'foe', ai: 'fighter', at, yaw: S.P.yaw + Math.PI * 0.6, tag: 'umbral', name: 'UMBRAL WAKE', hpK: 1.5, speedK: 0.85, dominable: true });
        u.H = Object.assign({}, u.H, { turn: 1.4 }); u.r = 8;
        SPM.wing(S, 'militiaFighter', 3, SPM.ahead(S, 760, -30), { tag: 'chasers' });
        SPM.say('DONN', 'Lieutenant Donn, Umbral Wake. Mayday! Stabilizers aren’t holding!', 4, 'jedi');
      } },
    { type: 'destroy', tag: 'chasers', count: 3, text: 'Clear the militia off your prize \u2014 it is limping, it will not get far', start(S) { if (S.ships.filter((s) => s.tag === 'chasers' && s.alive).length < 2) SPM.wing(S, 'militiaFighter', 2, SPM.behind(S, 600, 30), { tag: 'chasers' }); } },
    { type: 'dominate', tag: 'umbral', text: 'Hold DOMINATE — crush the will that holds it', hint: 'Keep the reticle on it and hold DOMINATE. Any hit breaks your focus.', hintT: 7,
      start(S) { const u = S.umbral; u.H = Object.assign({}, u.H, { guns: 0 }); const L = SPM.lines('3_2_the_seizure', [3, 4]); SPM.seq(L.length ? L : [['TRAYA', 'Do not seize the hull. Seize the will that holds it. Find the cracks.', 'sid']]); },
      done(S) { const L = SPM.lines('3_2_the_seizure', [5, 6, 7, 8, 9]); SPM.seq(L); } },
    { type: 'survive', time: 6, text: 'Tractor beam engaged', start(S) { const L = SPM.lines('3_2_the_seizure', [10, 11]); SPM.seq(L); const u = S.umbral; if (u) { u.goal = [S.P.pos.x, S.P.pos.y, S.P.pos.z]; } },
      update(S, O, dt) { const u = S.umbral; if (u) { u.pos.lerp(_sv1.copy(S.P.pos).addScaledVector(S.P.fwd, -40).add(_sv2.set(0, -18, 0)), 1 - Math.exp(-0.6 * dt)); S.orient(u); } } },
  ],
});

/* ---------------------------------------------------------------- Act IV · PICKET LINE (the Shroud, stealth) */
SPACE.def('sp_iziz_approach', {
  name: 'PICKET LINE', chapter: 'ACT IV · ONDERON ORBIT', brief: 'Slip the Shroud past Republic pickets. Do not be seen.', hull: 'shroud', par: 220, acc: 0.035,
  env: { sun: [0.3, 0.4, 0.86], sunCol: 0xfff4e0, neb: 0x203a5a, amb: 0x1a2a3a, planet: { r: 2400, at: [0, -2700, 2400], col: 0x3a7a44, col2: 0x1a3a5a, atmo: 0x7ab0ff, seed: 4.0 }, debris: { n: 50, r0: 300, r1: 1600, h: 260, s0: 3, s1: 18, col: 0x6a6a70 } },
  start: [0, 40, -900], startYaw: 0, bounds: 2400,
  onStart(S) {
    S.alert = 0; S.detected = false;
    for (const [x, y, z, yaw, spin] of [[-220, 20, -250, 0.4, 0.22], [240, 60, 120, -0.8, -0.26], [-120, -20, 520, 2.1, 0.3], [260, 0, 900, 1.0, -0.2], [-300, 40, 1180, -2.0, 0.24]]) { const p = S.spawn('picket', { team: 'foe', ai: 'static', at: [x, y, z], yaw, tag: 'picket' }); p.spin = spin * 0.4; S.addSensor(p, 420, 0.42, spin); }
    const cr = S.spawn('capital', { team: 'foe', ai: 'capital', at: [700, 140, 700], yaw: -1.4, tag: 'cruiser', invuln: true }); cr.path = [[700, 140, 700], [-700, 140, 800], [-700, 160, -400], [700, 140, -300]]; cr.loop = true; cr.onArrive = (s) => { s.path = [[700, 140, 700], [-700, 140, 800], [-700, 160, -400], [700, 140, -300]]; s.pi = 0; };
    SPM.seq([['SYS', 'STEALTH FIELD: ACTIVE. SENSOR CONES ARE BLUE.'], ['TRAYA', 'The pickets see heat, light and hurry. Give them none of the three.', 'sid']]);
  },
  on: { detected(S) { const s = SPACE; HEAT.add(8, 'picket'); HUD.toast('DETECTED', 'PICKETS SCRAMBLING', 2.4); SPM.say('COMM', 'Picket three, unknown contact on the sensor edge! Launch the ready flight!'); SPM.wing(s, 'militiaFighter', 4, SPM.ahead(s, 500, 20), { tag: 'scramble' }); s.lowRank = true; } },
  objectives: [
    { type: 'reach', at: [0, 30, -100], r: 90, text: 'Slip past the first picket', hint: 'Stay out of the blue cones. BOOST is loud; BRAKE is quiet.', hintT: 8 },
    { type: 'reach', at: [40, 20, 640], r: 90, text: 'Thread the gap between the pickets' },
    { type: 'reach', at: [-40, -60, 1400], r: 110, text: 'Reach the descent corridor over Iziz', done(S) { SPM.say('RATHATRI', 'They never saw us. Let them keep their eyes on the dark.'); } },
  ],
});
/* SPACE.rank reads only time and hull; a stealth run that was seen is a B at best */
{ const r0 = SPACE.rank; SPACE.rank = function () { const r = r0(); return SPACE.lowRank && (r === 'S' || r === 'A') ? 'B' : r; }; const s0 = SPACE.start; SPACE.start = function () { SPACE.lowRank = false; return s0.apply(this, arguments); }; }

/* ---------------------------------------------------------------- Act V · ORBITAL DEFENSE (Kyros's hunt cell) */
SPACE.def('sp_dxun_orbit', {
  name: 'ORBITAL DEFENSE', chapter: 'ACT V · DXUN ORBIT', brief: 'Kyros’s hunt cell drops on Dxun. Break the dropships before they land.', par: 320, acc: 0.04,
  env: { sun: [-0.5, 0.35, 0.8], sunCol: 0xffe8c8, neb: 0x2a3a20, amb: 0x1a2418, planet: { r: 2000, at: [0, -2300, 1500], col: 0x2a5a24, col2: 0x0e2a12, atmo: 0x8ad070, seed: 39.51 }, debris: { n: 40, r0: 400, r1: 1600, h: 200, s0: 3, s1: 16, col: 0x5a5a50 } },
  start: [0, 120, -700], startYaw: 0, bounds: 2400,
  onStart(S) {
    S.landed = 0;
    const cr = S.spawn('capital', { team: 'foe', ai: 'capital', at: [0, 420, 1400], yaw: Math.PI, tag: 'cruiser', hpK: 0.8 }); cr.goal = [0, 380, 1100];
    S.ally = S.spawn('trandoFreighter', { team: 'ally', ai: 'fighter', at: [-160, 100, -620], yaw: 0, tag: 'skullrender', name: 'SKULLRENDER', hpK: 2 });
    SPM.seq([['KYROS', 'Surrender the temple, Sith. Or we burn the jungle around it.', 'jedi'], ['BOSSKARR', 'The Scorekeeper counts this debt, Lord. Skullrender flies with you.'], ['RATHATRI', 'Then let her count the dropships.']]);
  },
  objectives: [
    { type: 'destroy', tag: 'drop', count: 4, text: 'Destroy the dropships before they reach the canopy', hint: 'Dropships are slow. Their escorts are not.', hintT: 6,
      start(S) { const mk = (i) => { const a = (i - 1.5) * 0.35, d = S.spawn('hunterDropship', { team: 'foe', at: [Math.sin(a) * 300, 360 + i * 20, 1250], yaw: Math.PI, tag: 'drop', name: 'HUNT-CELL DROPSHIP' }); d.goal = [Math.sin(a) * 260, -380, 700]; d.H = Object.assign({}, d.H, { speed: 22 }); d.speed = 22; return d; };
        for (let i = 0; i < 4; i++) mk(i); SPM.wing(S, 'jediStarfighter', 2, [0, 380, 1150], { tag: 'jedi' }); SPM.wing(S, 'militiaFighter', 3, [200, 300, 1100], { tag: 'escort' }); },
      update(S, O) { for (const s of S.ships) if (s.tag === 'drop' && s.alive && s.arrived && !s.counted) { s.counted = true; s.tag = 'landed'; s.alive = false; s.g.visible = false; S.landed++; HUD.toast('DROPSHIP', 'IN THE CANOPY', 1.8); HEAT.add(4, 'dropship'); } },
      fail(S) { return S.landed >= 2; } },
    { type: 'destroy', tag: 'jedi', count: 2, text: 'Break the Jedi escort', start(S) { if (S.ships.filter((s) => s.tag === 'jedi' && s.alive).length < 1) SPM.wing(S, 'jediStarfighter', 2, SPM.ahead(S, 600, 60), { tag: 'jedi' }); SPM.say('KYROS', 'Then I will come down myself.', 3, 'jedi'); } },
    { type: 'survive', time: 8, text: 'The cruiser withdraws', start(S) { const c = S.ships.find((s) => s.tag === 'cruiser'); if (c) { c.goal = [0, 1600, 3200]; c.invuln = true; } SPM.say('BOSSKARR', 'They run, Lord. The Scorekeeper saw it.'); } },
  ],
});
