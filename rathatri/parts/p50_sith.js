/* RATHATRI — the hero. Three visual stages on the Quaternius `rmale` body (CC0): I Slave 426 (pit rags, scarred, a shiv), III Apprentice (black ranger leathers, bone-hilt
   crimson saber), V Hidden Lord (leathers + long coat panels + one pauldron). The moveset is MOV.maul's one-handed sword-mocap set (a1–a3 / lunge are mocap, a4 spin and a5 slam
   keyed); only the prop differs. A level picks the stage with `hero: 1|3|5` in its LEVEL.def, else it follows the act (HERO.stageFor). */
const HERO = { NAMES: { 1: 'rath1', 3: 'rath3', 5: 'rath5' }, stage: 3 };
HERO.stageFor = function (def) {
  if (MG.flags.hero) return +MG.flags.hero;
  if (def && def.hero) return def.hero;
  const act = (SAVE.d && SAVE.d.act) || 1; return act >= 4 ? 5 : 3;
};
HERO.name = (def) => HERO.NAMES[HERO.stageFor(def)];
HERO.boot = async function (progress) {   // the three stages are built on demand per level; boot loads the Quaternius pack and the default stage
  await QB.load();
  await CAST.need([HERO.name(null)], progress);
};
/* ---- cast entries: SPECS (fallback body + skin), QC (gate), QO (modelled outfit + grades) */
(function () {
  const base = CAST.SPECS.quigon, g = (rules, sat, val, tint) => ({ rules, sat, val, tint }), R = (p, gr, o) => ['ranger', p, gr, o], Pz = (p, gr, o) => ['peasant', p, gr, o];
  const mk = (name, over) => { CAST.SPECS[name] = Object.assign({}, base, { name, eyes: 'brown', cloth: undefined, beard: false, grey: false, braid: false }, over); };
  mk('rath1', { height: 0.95, shoulders: 0.88, skin: { tone: 0x93664b, brow: 0x140d09, stubble: 0 }, hair: 'short', hairCol: 0x140d09 });   // underfed: narrow, a little shorter, grime-dark skin
  mk('rath3', { height: 1.01, shoulders: 1.0, skin: { tone: 0x9a6b4f, brow: 0x140d09, stubble: 0 }, hair: 'short', hairCol: 0x140d09 });
  mk('rath5', { height: 1.03, shoulders: 1.03, skin: { tone: 0x946548, brow: 0x140d09, stubble: 0 }, hair: 'short', hairCol: 0x140d09,
    cloth: (J) => CAST.skirt(J, { len: 0.74, flare: 0.36, mat: 'cape' }) });   // the dark flowing outer coat: verlet tails over black leathers
  for (const n of ['rath1', 'rath3', 'rath5']) CAST.QC[n] = Object.assign({}, CAST.QC.quigon, { female: false, cullHead: false, hair: ['Hair_Buzzed'], hairCol: 0x140d09, browCol: 0x140d09 });
  CAST.QC.rath3.hair = ['Hair_SimpleParted']; CAST.QC.rath5.hair = ['Hair_SimpleParted'];
  const blk = g([], 0.1, 0.27, 0xe8e8ff), lea = g([], 0.06, 0.17, 0xf0f0ff), MM = { metal: 0.12, ns: 0.55, env: 0.35 }, BK = { sheenCol: 0x505060, ns: 0.7, env: 0.5, metal: 0.2 };
  /* I — Slave 426: ash-grey rag tunic and trousers (peasant set), bare scarred arms, barefoot */
  CAST.QO.rath1 = { parts: [Pz('Body', g([{ h: 38, w: 50, s: 0.42, v: 0.82 }, { h: 20, w: 40, s: 0.5, v: 0.62 }], 0.5, 0.86, 0xc8b49a), { ns: 1.5, sheen: 0.2, env: 0.45 }),
    Pz('Arms', g([{ h: 38, w: 50, s: 0.42, v: 0.8 }], 0.5, 0.84, 0xc8b49a), { ns: 1.5, sheen: 0.2, env: 0.45 }),
    Pz('Legs', g([{ h: 30, w: 50, s: 0.45, v: 0.7 }], 0.48, 0.74, 0xb8a488), { ns: 1.4, sheen: 0.2, env: 0.45 }),
    Pz('Feet', g([], 0.35, 0.55, 0xa89478), { ns: 1.2, sheen: 0.1, env: 0.4 })], hair: ['Hair_Buzzed'], hairCol: 0x0d0907, browCol: 0x0d0907 };   // ash grey-brown sackcloth, foot-wraps; sweat and pit-dust
  /* III — Apprentice: Maul-black ranger leathers, bracer, belt; the saber is the only colour */
  CAST.QO.rath3 = { glove: 0x0e0e10, parts: [R('Body', blk, BK), R('Body_Belt_1', lea, MM), R('Legs', blk, BK), R('Feet_Boots', lea, MM), R('Arms', blk, BK), R('Arms_Bracer', lea, { metal: 0.3, ns: 0.5, env: 0.3 })], hair: ['Hair_SimpleParted'], hairCol: 0x140d09, browCol: 0x140d09 };
  /* V — Hidden Lord: the same leathers + a single pauldron on the saber shoulder; the coat is cloth (SPECS.cloth) */
  CAST.QO.rath5 = { glove: 0x0e0e10, parts: CAST.QO.rath3.parts.concat([R('Acc_Pauldron', g([], 0.08, 0.2, 0xf0f0ff), { metal: 0.5, ns: 0.6, env: 0.4 })]), hair: ['Hair_SimpleParted'], hairCol: 0x140d09, browCol: 0x140d09 };
})();
/* ---- the pit years: NO weapon. Slave 426 fights with his hands. The engine's player code expects a Saber object, so stage I carries an
   invisible, blade-less one that is never held (no prop IK, the hands stay free for the punch mocap) and hits resolve as fist cones (HERO.fistHits). */
class Fists extends Saber {
  constructor() { super('single', 'red', { prio: 1, len: 0.01 }); this.group.visible = false; for (const L of this.lights) L.on = false; this.fists = true; }
  update(dt, now) { this.ign[0] = 0; super.update(dt, now); for (const L of this.lights) L.i = 0; }
  ignite() {} sampleTrails() {} setVisible() { this.group.visible = false; }
}
/* the unarmed moveset: Maul's table for everything defensive / locomotion, mocap punches for the string, the shield-dash clip as a desperate shoulder rush */
HERO.buildFists = function () {
  if (MOV.fists) return MOV.fists;
  const F = MOV.fists = Object.assign({}, MOV.maul), base = ANIM.basePose, N = K(0, [0.0, 1.0, 0.3], [0, 1, 0], { g: 'none', st: 'guard', fl: [0.2, 1.25, 0.25], fr: [-0.2, 1.3, 0.28], cr: 0.08, pi: 0.12 });
  const mv = (clip, t0, t1, rate, ev, o) => { const c = QB.clips[clip]; if (!c) return null; t1 = Math.min(t1, c.dur); const tc = (t) => (t - t0) / rate;
    const m = { dur: (t1 - t0) / rate, keys: [N], mo: { seq: [[clip, t0, t1, t1 - t0]], mode: 'full', rate }, ev: ev.map((e) => [tc(e[0]), tc(e[1]), 0, e[2], e[3]]), cancel: tc(o.cancel), next: o.next || null, fadeOut: 0.18 };
    if (o.move) m.move = o.move.map((q) => [tc(q[0]), q[1]]); ANIM.compile(m, base); return m; };
  F.guard = { loop: true, keys: [N] }; F.run = { loop: true, keys: [N] }; F.idleCalm = { loop: true, keys: [N] }; for (const k of ['guard', 'run', 'idleCalm']) ANIM.compile(F[k], base);
  F.a1 = mv('Punch_Jab', 0, 0.62, 1.25, [[0.14, 0.3, 6, 'punch']], { cancel: 0.36, next: 'a2', move: [[0.05, 0], [0.2, 0.25]] });
  F.a2 = mv('Punch_Cross', 0, 0.72, 1.2, [[0.18, 0.34, 8, 'punch']], { cancel: 0.42, next: 'a3', move: [[0.08, 0], [0.26, 0.3]] });
  F.a3 = mv('Melee_Hook', 0, 0.85, 1.15, [[0.24, 0.44, 11, 'hook']], { cancel: 0.55, next: 'a4', move: [[0.1, 0], [0.34, 0.35]] });
  F.a4 = mv('Punch_Cross', 0, 0.72, 1.0, [[0.2, 0.38, 9, 'punch']], { cancel: 0.46, next: 'a5', move: [[0.08, 0], [0.28, 0.3]] });
  F.a5 = mv('Melee_Hook', 0, 0.85, 0.9, [[0.28, 0.5, 15, 'slam']], { cancel: 0.7, next: null, move: [[0.1, 0], [0.4, 0.5]] });
  F.heavy = mv('Shield_Dash', 0, 0.9, 1.05, [[0.15, 0.5, 12, 'thrust']], { cancel: 0.72, move: [[0.08, 0], [0.5, 2.6]] });
  F.lunge = mv('Shield_Dash', 0, 0.9, 1.15, [[0.12, 0.45, 10, 'thrust']], { cancel: 0.66, move: [[0.05, 0], [0.45, 3.0]] });
  for (const k of ['a1', 'a2', 'a3', 'a4', 'a5', 'heavy', 'lunge']) if (!F[k]) F[k] = MOV.maul[k];
  return F;
};
MOCAP.SETS.fists = { base: { guard: 'Idle_Loop', run: 'Idle_Loop', idleCalm: 'Idle_Loop' }, arms: true, stance: 0.8, upright: 0.35 };
{ const _ms = MOCAP.state; MOCAP.state = function (a) { if (MOV.fists && a.moves === MOV.fists) { const st = _ms({ moves: MOV.maul, T: a.T }); st.set = MOCAP.SETS.fists; return st; } return _ms(a); }; }
/* fist hits: during an active window, anyone in a short frontal cone takes the blow once per swing */
HERO.fistHits = function (dt) {
  const a = PLAYER.a, c = a.actClip; if (!c || !c.ev || (PLAYER.state !== 'attack' && PLAYER.state !== 'exec')) return;
  for (const e of c.ev) { if (a.actT < e[0] || a.actT > e[1] + dt) continue;
    for (const t of COMBAT.foes()) { if (a.actHit.has(t)) continue; const d = a.dist(t); if (d > 1.25 + t.r || Math.abs(t.y - a.y) > 1.4) continue; const ang = Math.abs(wrapA(a.angTo(t) - a.yaw)); if (ang > 1.05) continue;
      a.actHit.add(t); const dir = V3(t.x - a.x, 0, t.z - a.z).normalize(), p = t.chest(V3()), dmg = e[3] * (PLAYER.rageOn ? 1.5 : 1);
      if (t.tryBlock && t.tryBlock(a, dmg, e[4], p)) { FX.spark(p, dir.clone().negate(), 6, 3, [2, 1.6, 1.2]); continue; }
      COMBAT.damage(t, dmg, { src: a, kind: e[4], dir, p, heavy: e[4] === 'slam' || e[4] === 'thrust', knock: e[4] === 'thrust', force: e[4] === 'thrust' ? 4.5 : undefined });
      FX.puff(p, 3, { size: 0.12, grow: 4, col: [0.55, 0.42, 0.34], a: 0.4, life: 0.4, spread: 0.3 }); FX.spark(p, dir.clone().negate(), 5, 3.5, [1.8, 0.4, 0.25]);
      MG.hitStop = Math.max(MG.hitStop, e[4] === 'slam' ? 0.09 : 0.045); FX.addShake(e[4] === 'slam' ? 0.18 : 0.07); TOUCH.buzz(e[4] === 'slam' ? 22 : 10); }
  }
};
{ const _hw = PLAYER.hitWindows; PLAYER.hitWindows = function (dt) { if (PLAYER.saber && PLAYER.saber.fists) { HERO.fistHits(dt); return; } _hw(dt); }; }
/* the saber for a stage */
HERO.makeSaber = function (stage) {
  if (stage === 1) return new Fists();
  const S = new Saber('bone', 'crimson', { prio: 5, len: 1.0 });
  return S;
};
/* Force powers available this level: story ranks (POWERS), plus level overrides (def.force: ['push'...] for tutorial surges) */
HERO.skills = function (def, stage) {
  const k = (id) => POWERS.has(id) || !!(def && def.force && def.force.includes(id));
  if (stage === 1) return { push: !!(def && def.force && def.force.includes('push')), grip: false, throw: false, rage: !!(def && def.force && def.force.includes('rage')), heavy: true };   // the pit: only what the scene unlocks (the first surge)
  return { push: k('push'), grip: k('grip'), throw: k('throw'), rage: k('rage'), heavy: stage >= 3 };
};
