/* CINE — declarative cutscenes. A scene = staging data; the DIALOGUE (speaker, line, duration) comes from LORE.scenes[id].shots (docs/lore/script.json).
   Any script scene with no authored staging still plays (captions over the dark `st_void` stage), so the whole story is always playable.

   CINE.def(id, {
     level:  'st_storage' | null,            // stage LEVEL.def to load first (null = play inside the current level)
     cast:   ['milian'],                     // extra CAST names to load
     stage:  [{ id:'milian', cast:'milian', pos:[x,y,z], yaw:rad | 'at:<id>', base:'idle', saber:'blue', lit:true, hilt:'single'|'bone'|'staff' }],
     cam:    [camSpec, ...],                 // one per script shot (index-matched; a shorter list holds the last camera). camSpec = {p0,p1,l0,l1,fov,ease} | CINE.cam.xxx(...)
     act:    { <shotIndex>: [{ who, base, play, goto:[x,z], speed, yaw|face:'<id>', lit:bool, say:'pose' }] },   // actor actions at the START of a shot
     onStart(ctx), onEnd(ctx), fx: { <shotIndex>: 'flash'|'shake'|'fade' }
   });
   CINE.play(id, onDone)   CINE.skip()   CINE.has(id)   CINE.lines(id, {phase:n}) → [{who,line,dur}]   CINE.cur
   Bases (looping): idle talk fold sit crouch kneel spell guard hold walk · One-shots (a.play via act.play): spellEnter spellShoot push interact hit knock rise death roll throw slash block heavy */
const CINE = { scenes: {}, cur: null, n: { played: 0, skipped: 0 } };
CINE.def = function (id, s) { s.id = id; CINE.scenes[id] = s; return s; };
CINE.has = (id) => !!(CINE.scenes[id] || (typeof LORE !== 'undefined' && LORE.scenes[id]));
CINE.script = (id) => (typeof LORE !== 'undefined' && LORE.scenes[id]) || null;
/* ---------------------------------------------------------------- stage move table (mocap-backed; no keyed weapon paths)  */
const _CN = K(0, [0.0, 1.0, 0.3], [0, 1, 0], { g: 'none', st: 'neutral', fl: [0.28, 0.9, 0.04], fr: [-0.28, 0.9, 0.04], cr: 0.03, pi: 0.02 });
MOV.cine = {};
CINE.BASES = { idle: 'Idle_Loop', talk: 'Idle_Talking_Loop', fold: 'Idle_FoldArms_Loop', sit: 'Sitting_Idle_Loop', crouch: 'Crouch_Idle_Loop', kneel: 'Fixing_Kneeling', spell: 'Spell_Simple_Idle_Loop', guard: 'Sword_Idle', hold: 'Idle_Loop', walk: 'Walk_Formal_Loop' };
CINE.SHOTS = { spellEnter: ['Spell_Simple_Enter'], spellShoot: ['Spell_Simple_Shoot'], push: ['Push_Loop', true], interact: ['Interact'], hit: ['Hit_Chest'], knock: ['Hit_Knockback'], rise: ['LayToIdle'], death: ['Death01'], roll: ['Roll'], throw: ['OverhandThrow'], slash: ['Sword_Regular_A'], block: ['Sword_Block'], heavy: ['Sword_Heavy_Combo'], punch: ['Punch_Cross'], lunge: ['Sword_Dash'], jump: ['NinjaJump_Start'] };
CINE.compileMoves = function () {
  const base = ANIM.basePose;
  for (const b of Object.keys(CINE.BASES)) { const armed = b === 'guard' || b === 'hold'; MOV.cine[b] = { loop: true, keys: [armed ? K(0, [-0.3, 0.98, 0.02], [0.08, 0.98, 0.1], { g: b === 'guard' ? 'both' : 'R', oR: 0, st: b === 'guard' ? 'guard' : 'neutral', fl: [0.28, 0.9, 0.04], cr: 0.03 }) : _CN] }; ANIM.compile(MOV.cine[b], base); }
  for (const k of Object.keys(CINE.SHOTS)) {
    const [clip, loop] = CINE.SHOTS[k], c = QB.clips[clip]; if (!c) continue;
    const m = { loop: !!loop, dur: c.dur, fadeOut: 0.18, keys: [_CN], mo: { seq: [[clip, 0, c.dur, c.dur]], mode: 'full' } };
    ANIM.compile(m, base); MOV.cine[k] = m;
  }
};
{ const _mi = MOV.init; MOV.init = function () { _mi(); CINE.compileMoves(); }; }
MOCAP.SETS.cine = { base: CINE.BASES, arms: true, stance: 1, upright: 0.3 };
{ const _ms = MOCAP.state; MOCAP.state = function (a) { if (a.moves === MOV.cine) { const st = _ms({ moves: MOV.maul, T: a.T }); st.set = MOCAP.SETS.cine; return st; } return _ms(a); }; }
/* ---------------------------------------------------------------- camera spec helpers (resolved when the shot starts, so they can follow actors) */
CINE.pt = function (w) { if (!w) return V3(0, 1.4, 0); if (Array.isArray(w)) return V3(w[0], w[1], w[2]); const a = CINE.actor(w); return a ? V3(a.x, a.y + 1.5, a.z) : V3(0, 1.4, 0); };
CINE.cam = {
  /* orbit a subject: r metres out at height h, angle a0→a1 (rad, 0 = in front of its facing), looking at height lh */
  orbit: (who, r, h, a0, a1, fov, lh) => () => { const a = CINE.actor(who), c = Array.isArray(who) ? V3(who[0], who[1], who[2]) : a ? V3(a.x, a.y, a.z) : V3(); const y0 = a ? a.yaw : 0, L = c.clone(); L.y += (lh === undefined ? 1.45 : lh);
    const P = (t) => V3(c.x + Math.sin(y0 + t) * r, c.y + h, c.z + Math.cos(y0 + t) * r); return { p0: P(a0), p1: P(a1), l0: L, l1: L, fov: fov || 40 }; },
  /* a close/medium shot of one actor from in front, slightly to a side; dolly = metres pushed in over the shot */
  close: (who, d, h, side, fov, dolly) => () => { const a = CINE.actor(who); if (!a) return {}; const s = Math.sin(a.yaw + (side || 0)), c = Math.cos(a.yaw + (side || 0)), L = V3(a.x, a.y + (h === undefined ? 1.55 : h), a.z);
    return { p0: V3(a.x + s * d, L.y, a.z + c * d), p1: V3(a.x + s * (d - (dolly || 0.4)), L.y, a.z + c * (d - (dolly || 0.4))), l0: L, l1: L, fov: fov || 34 }; },
  /* over the shoulder of `from`, looking at `to` */
  over: (from, to, fov) => () => { const a = CINE.actor(from), b = CINE.actor(to); if (!a || !b) return {}; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d;
    const p = V3(a.x - nx * 1.2 - nz * 0.55, a.y + 1.75, a.z - nz * 1.2 + nx * 0.55), l = V3(b.x, b.y + 1.5, b.z); return { p0: p, p1: p.clone().addScaledVector(V3(nx, 0, nz), 0.25), l0: l, l1: l, fov: fov || 36 }; },
  /* fixed camera: position a, look b, optional drift to a2/b2 */
  fix: (a, b, a2, b2, fov) => () => ({ p0: CINE.pt(a), p1: CINE.pt(a2 || a), l0: CINE.pt(b), l1: CINE.pt(b2 || b), fov: fov || 42 }),
};
/* ---------------------------------------------------------------- playback */
CINE.actor = function (id) { const c = CINE.cur; return c ? c.actors[id] || null : null; };
CINE.lines = function (id, filt) { const s = CINE.script(id); if (!s) return []; return s.shots.filter((sh) => (!filt || filt.phase === undefined ? sh.phase === undefined : sh.phase === filt.phase) && CINE.cond(sh.cond)); };
CINE.cond = function (c) {
  if (!c) return true; const [k, v] = String(c).split(':');
  if (k === 'loyalty') { const A = SAVE.d.assassins, l = [A.vaara.loyalty, A.eren.loyalty].concat(A.e5.map((e) => e.loyalty)), avg = l.reduce((s, x) => s + x, 0) / l.length; return v === 'high' ? avg >= 60 : avg < 60; }
  return SAVE.choice(k) === v;
};
CINE.hideSub = () => { if (typeof HUD !== 'undefined' && HUD.el && HUD.el.sub) { HUD.el.sub.classList.remove('on'); HUD.subT = 0; } };
CINE.SPK = { TRAYA: 'sid', HOLOCRON: 'sid', MILIAN: 'sid', KYROS: 'jedi', CELENE: 'jedi', MIRROR: 'sid' };
/* consequences of choices (the script text lists them; this applies them) */
CINE.EFFECT = {
  '2_2_bosskarr_ambush:A': () => { SAVE.choice('bosskarr', 'oath'); }, '2_2_bosskarr_ambush:B': () => { SAVE.choice('bosskarr', 'dead'); HEAT.add(5, 'bosskarr'); },
  '2_3_starving_beast:A': () => { SAVE.choice('beast', 'left'); }, '2_3_starving_beast:B': () => { SAVE.choice('beast', 'culled'); },
  '2_6_first_hunters:A': () => { HEAT.add(2, 'ambush'); SAVE.choice('hunters', 'ambush'); }, '2_6_first_hunters:B': () => { SAVE.choice('hunters', 'beasts'); },
  '3_2_the_seizure:A': () => { HEAT.sub(2); SAVE.choice('donn', 'alive'); }, '3_2_the_seizure:B': () => { HEAT.add(4, 'donn'); SAVE.choice('donn', 'dead'); },
};
CINE.play = async function (id, onDone) {
  if (CINE.cur) { console.warn('CINE busy'); return; }
  const def = CINE.scenes[id] || { id, level: 'st_void', fallback: true }, scr = CINE.script(id);
  if (!scr && !def.shots) { console.warn('no scene', id); if (onDone) onDone(); return; }
  const c = CINE.cur = { id, def, scr, shots: (scr ? scr.shots : def.shots).filter((sh) => sh.phase === undefined && CINE.cond(sh.cond)), actors: {}, i: -1, t: 0, dur: 0, onDone, hidePlayer: false, loaded: false, choiceOpen: false };
  TOUCH.want = 'none'; MG.cineBusy = true;
  try {
    const needLevel = def.level && (!LEVEL.cur || LEVEL.cur.id !== def.level);
    if (needLevel) { c.stageLevel = true; await GAME.start(def.level, 0, { quote: scr ? scr.loc : '' }); TOUCH.want = 'none'; }
    else if (!LEVEL.cur) { c.stageLevel = true; await GAME.start('st_void', 0, { quote: scr ? scr.loc : '' }); TOUCH.want = 'none'; }
    else c.stageLevel = !!LEVEL.cur.def.stage;
    await CAST.need(def.cast || []);
    for (const s of def.stage || []) await CINE.spawn(s);
  } catch (e) { console.error(e); MG.errors.push(String(e.stack || e)); }
  HUD.show(false); document.body.classList.add('cine');
  if (PLAYER.a) { c.hidePlayer = true; PLAYER.a.root.visible = false; if (PLAYER.saber) PLAYER.saber.setVisible(false); if (PLAYER.a.inst.cloth) PLAYER.a.inst.cloth.setVisible(false); }
  c.prevState = PLAYER.state; PLAYER.state = 'cine'; MG.state = 'play'; c.loaded = true;
  if (def.onStart) def.onStart(c);
  CINE.nextShot();
};
CINE.spawn = async function (s) {
  await CAST.need([s.cast]);
  const p = s.pos || [0, 0, 0], a = new Actor(CHAR.T[s.cast], { x: p[0], y: p[1], z: p[2], yaw: typeof s.yaw === 'number' ? s.yaw : 0, hp: 100, team: 'neutral', moves: MOV.cine });
  a.cineId = s.id; a.gravK = 0; a.grounded = true; a.floorY = p[1]; CINE.cur.actors[s.id] = a;
  if (s.saber) { const S = new Saber(s.hilt || 'single', s.saber, { prio: 2 }); S.addTo(R.scene); a.saber = S; a.setProp(S, s.hilt === 'staff'); S.ignite(undefined, !!s.lit); S.ign = S.ends.map(() => (s.lit ? 1 : 0)); }
  a.setBase(s.base || 'idle', 0); a.animate(0.016); a.pose3D(0.016);
  return a;
};
CINE.nextShot = function () {
  const c = CINE.cur; if (!c) return;
  c.i++;
  if (c.i >= c.shots.length) { CINE.finish(); return; }
  const sh = c.shots[c.i]; c.t = 0; c.dur = Math.max(0.6, sh.dur || 3);
  // stage actions
  const acts = c.def.act && c.def.act[c.i]; if (acts) for (const x of acts) CINE.doAct(x);
  // yaw 'at:<id>' for staged actors on first shot
  if (c.i === 0) for (const s of c.def.stage || []) if (typeof s.yaw === 'string' && s.yaw.startsWith('at:')) { const a = c.actors[s.id], b = c.actors[s.yaw.slice(3)]; if (a && b) a.yaw = Math.atan2(b.x - a.x, b.z - a.z); }
  // camera
  let cs = c.def.cam && c.def.cam[Math.min(c.i, c.def.cam.length - 1)]; if (typeof cs === 'function') cs = cs(); cs = cs || c.lastCam || CINE.defaultCam();
  c.lastCam = cs;
  const fov = cs.fov || 40;
  if (cs.p0) CAM.play({ p0: cs.p0, p1: cs.p1 || cs.p0, l0: cs.l0, l1: cs.l1 || cs.l0, dur: c.dur, fov, ease: cs.ease, hold: true }); else CAM.play({ p0: V3(0, 2, 6), p1: V3(0, 2, 5), l0: V3(0, 1.4, 0), l1: V3(0, 1.4, 0), dur: c.dur, fov, hold: true });
  const fx = c.def.fx && c.def.fx[c.i]; if (fx === 'flash') HUD.flash(0.9); else if (fx === 'shake') FX.addShake && FX.addShake(0.6);
  // subtitle
  const who = sh.who; if (who === 'CAPTION' || who === 'SYS') HUD.sub('', sh.line, c.dur, 'cap'); else HUD.sub(who, sh.line, c.dur, CINE.SPK[who] || '');
  // talking pose for the speaker
  const sp = c.actors[String(who).toLowerCase()]; for (const k in c.actors) { const a = c.actors[k]; if (!a.keepBase && CINE.BASES[a.base] !== undefined && (a.base === 'talk' || a.base === 'idle')) a.setBase(a === sp ? 'talk' : 'idle'); }
};
CINE.defaultCam = () => ({ p0: V3(0, 2.2, 7), p1: V3(0, 2.0, 6.4), l0: V3(0, 1.5, 0), l1: V3(0, 1.5, 0), fov: 40 });
CINE.doAct = function (x) {
  const a = CINE.actor(x.who); if (!a) return;
  if (x.base) { a.keepBase = true; a.setBase(x.base, 0.2); }
  if (x.play) a.play(x.play, { fade: 0.12 });
  if (x.yaw !== undefined) a.yaw = x.yaw; if (x.face) { const b = CINE.actor(x.face); if (b) a.yaw = Math.atan2(b.x - a.x, b.z - a.z); }
  if (x.goto) a.walk = { x: x.goto[0], z: x.goto[1], speed: x.speed || 1.25 };
  if (x.lit !== undefined && a.saber) { a.saber.ignite(undefined, !!x.lit); }
  if (x.pos) { a.x = x.pos[0]; a.y = x.pos[1]; a.z = x.pos[2]; }
  if (x.hide !== undefined) { a.root.visible = !x.hide; if (a.inst.cloth) a.inst.cloth.setVisible(!x.hide); if (a.saber) a.saber.setVisible(!x.hide); }
};
CINE.update = function (dt) {
  const c = CINE.cur; if (!c || !c.loaded) return;
  for (const k in c.actors) {
    const a = c.actors[k];
    if (a.walk) { const dx = a.walk.x - a.x, dz = a.walk.z - a.z, d = Math.hypot(dx, dz); if (d < 0.08) { a.walk = null; a.speed = 0; } else { a.yaw = dampA(a.yaw, Math.atan2(dx, dz), 8, dt); a.speed = a.walk.speed; a.mvx = 0; a.mvz = 1; const s = Math.min(d, a.walk.speed * dt); a.x += dx / d * s; a.z += dz / d * s; } } else a.speed = 0;
    a.animate(dt); a.pose3D(dt); if (a.saber) { a.saber.update(dt, MG.t); a.saber.sampleTrails(MG.t, 0); }
  }
  if (c.choiceOpen) return;
  c.t += dt;
  if (c.t >= c.dur) CINE.nextShot();
};
/* the decision card after the last shot */
CINE.choose = function (scene, done) {
  const ch = scene.choice, c = CINE.cur; if (!ch) { done(null); return; }
  c.choiceOpen = true; CINE.hideSub();
  if (!CINE._css) { CINE._css = 1; const st = document.createElement('style'); st.textContent = `#cineChoice{position:fixed;left:50%;bottom:calc(12vh + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;width:min(86vw,720px);text-align:center;color:#e9dccb;font-family:var(--f,sans-serif)}
#cineChoice .cp{font-size:14px;letter-spacing:.22em;color:#e8a898;margin-bottom:12px;text-shadow:0 0 8px #000;text-transform:uppercase}
#cineChoice .cb{display:block;margin:8px auto;padding:13px 18px;min-height:44px;width:100%;box-sizing:border-box;border:1px solid rgba(255,96,72,.55);border-radius:6px;background:linear-gradient(180deg,rgba(60,8,6,.82),rgba(14,3,3,.88));color:#fff;font-size:15px;letter-spacing:.06em;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent}
#cineChoice .cb:active{background:rgba(160,24,16,.85);border-color:#ff8f78}
#cineChoice .cb small{display:block;margin-top:4px;font-size:11px;letter-spacing:.08em;color:#c9a89e;opacity:.85}`; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'cineChoice'; el.innerHTML = '<div class="cp">' + String(ch.prompt || '').replace(/</g, '&lt;') + '</div>';
  const pick = (k) => { if (!el.parentNode) return; el.remove(); c.choiceOpen = false; done(k); };
  for (const k of ['A', 'B']) { if (!ch[k]) continue; const b = document.createElement('button'); b.className = 'cb'; b.innerHTML = String(ch[k].text).replace(/</g, '&lt;') + (ch[k].hint ? '<small>' + ch[k].hint + '</small>' : ''); b.addEventListener('click', () => pick(k)); el.appendChild(b); }
  document.body.appendChild(el); c.pickA = () => pick('A');
};
CINE.finish = function () {
  const c = CINE.cur; if (!c) return; const scr = c.scr;
  const wrap = (next) => {
    CINE.hideSub(); const cb = c.onDone;
    for (const k in c.actors) c.actors[k].dispose(); c.actors = {};
    document.body.classList.remove('cine'); CAM.cine = null; CAM.snap = true; MG.cineBusy = false;
    if (PLAYER.a && c.hidePlayer) { PLAYER.a.root.visible = true; if (PLAYER.saber) PLAYER.saber.setVisible(true); if (PLAYER.a.inst.cloth) PLAYER.a.inst.cloth.setVisible(true); }
    if (c.def.onEnd) c.def.onEnd(c);
    CINE.cur = null; CINE.n.played++;
    PLAYER.state = c.prevState && c.prevState !== 'cine' ? c.prevState : 'move';
    if (!c.stageLevel) { HUD.show(true); TOUCH.want = 'ground'; CAM.reset(PLAYER.a ? PLAYER.a.yaw : 0); }
    if (next && CINE.has(next)) CINE.play(next, cb); else if (cb) cb();
  };
  if (scr && scr.choice) CINE.choose(scr, (k) => {
    const ch = scr.choice[k]; let next = ch.next; if (ch.set) for (const key of Object.keys(ch.set)) SAVE.choice(key, ch.set[key]);
    const fx = CINE.EFFECT[scr.id + ':' + k]; if (fx) fx(); SAVE.choice(scr.id, k);
    if (next && typeof next === 'object') { const vals = Object.values(SAVE.d.choices); const key = Object.keys(next).find((x) => vals.includes(x)); next = key ? next[key] : null; }
    wrap(next);
  }); else wrap(null);
};
/* skip: end the current shot list now (auto-picks choice A) */
CINE.skip = function () {
  const c = CINE.cur; if (!c) return; const t = performance.now(); if (t - (CINE._skipT || 0) < 500) return; CINE._skipT = t; CINE.n.skipped++;
  if (c.choiceOpen) { if (c.pickA) c.pickA(); return; }
  c.i = c.shots.length; CINE.finish();
};
/* ---------------------------------------------------------------- the dark void stage (fallback for unstaged scenes) */
LEVEL.def('st_void', {
  chapter: '', name: 'THE VOID', stage: true, hero: 3, cast: [], tex: ['sithFloor'], start: [0, 0, 0, 0], killY: -60,
  async build(L) {
    KIT.ring(0, 0, 0, 7, -0.5, 0, TEX.mat('sithFloor', { color: 0x2a2020, env: 0.6 }), { sides: 40 });
    KIT.lamp(0, 4.5, 0, 0xff3a22, 2.2, 14); KIT.lamp(4, 2.2, -3, 0x6a2cff, 1.0, 9);
    R.setSun(new THREE.Vector3(0.2, 0.8, 0.3), 0x806060, 0.4, 0x201018, 0x080404, 0.3);
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.02, 0.012, 0.014), 0.05);
    const env = new THREE.Scene(); env.background = new THREE.Color(0.02, 0.012, 0.014); L.env = env;
  },
  onStart() { HUD.show(false); },
});
