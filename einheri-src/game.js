/* =====================================================================
   GAME — scenes, interaction, trials, HUD, menus, title, the loop
   ===================================================================== */

/* ---------------- toasts & notes ---------------- */
let toastT = 0;
function toast(t, s, dur = 3.4) { $('toastT').textContent = t; $('toastS').textContent = s || ''; $('toast').classList.add('on'); toastT = dur; }
function note(s, dur = 2.2) { $('note').textContent = s; $('note').classList.add('on'); G.noteT = dur; }

/* ---------------- HUD ---------------- */
let HUDD = true;
function hudDirty() { HUDD = true; }
function hudUpdate() {
  const vis = G.playing && !G.lock && !G.menu && !G.vig && !DLG.open && G.scene && G.scene.kind !== 'title';
  $('hud').classList.toggle('hide', !(G.playing && !G.vig && G.scene && G.scene.kind !== 'title'));
  $('ctrl').classList.toggle('hide', !vis);
  if (!P) return;
  const hp = clamp(P.hp / S.maxhp, 0, 1);
  $('hpFill').style.transform = `scaleX(${hp})`; $('hpLag').style.transform = `scaleX(${hp})`;
  $('silver').textContent = S.silver;
  const it = G.interact, act = $('bAct');
  if (it && vis) { if (act.textContent !== it.label) act.textContent = it.label; act.classList.add('on'); } else act.classList.remove('on');
  const cr = $('chgRing'); cr.style.strokeDashoffset = P.state === 'charge' ? 283 * (1 - P.charge) : 283; cr.style.stroke = P.chargeReady ? '#ffffff' : '#ffb14a';
  if (!HUDD) return; HUDD = false;
  const mx = stat.maxCharge();
  ['bP1', 'bP2'].forEach((id, i) => {
    const el = $(id), k = S.slots[i], c = k ? (S.charge[k] || 0) : 0;
    el.querySelector('.g').textContent = k ? POWERS[k].rune : '·';
    el.classList.toggle('empty', !k); el.classList.toggle('dry', !!k && c < 1);
    const pips = el.querySelector('.pips'); let h = ''; if (k) for (let j = 0; j < mx; j++) h += `<i class="${j < Math.floor(c + 1e-6) ? 'on' : ''}"></i>`; pips.innerHTML = h;
    const frac = c >= mx ? 0 : c - Math.floor(c);
    el.querySelector('.ring circle').style.strokeDashoffset = 176 * (1 - frac);
    el.setAttribute('aria-label', k ? POWERS[k].name : 'Empty rune');
  });
  const inRealm = G.scene && G.scene.kind === 'realm';
  $('runeUI').style.display = inRealm ? '' : 'none';
  if (inRealm) { const r = RS(G.scene.id).runes; [...$('runeUI').children].forEach((s, i) => s.classList.toggle('on', !!r[i])); }
}
function hudBoss() {
  const b = G.boss, bar = $('bossbar');
  if (!b || b.intro || b.dead) { bar.classList.remove('on'); return; }
  bar.classList.add('on');
  const k = Math.max(0, b.hp / b.maxhp);
  $('bossFill').style.transform = `scaleX(${k})`; $('bossLag').style.transform = `scaleX(${k})`;
}
function hudBossName(n) { $('bossName').textContent = n; }

/* ---------------- scenes ---------------- */
const WORLDS = {};
function clearActors() {
  if (G.menu) closeMenu();
  G.lock = !!G.cs;
  G.enemies = []; G.proj = []; G.haz = []; G.picks = []; G.parts = []; G.decals = []; G.texts = []; G.fx = [];
  G.boss = null; G.decoy = null; G.trial = null; G.npcs = []; G.camLock = null; G.hearthLow = 0; G.lightning = 0;
  hudBoss();
}
/* ground textures are the big memory cost on a phone: keep only what the next step needs */
const ARENAW = {};
function freeArenas(keep) { for (const k in ARENAW) if (k !== keep) freeGround(ARENAW[k]); }
function enterHub(spawn) {
  clearActors(); G.valhalla = false; freeArenas();
  G.world = genHub(); G.scene = { kind: 'hub' };
  G.npcs = npcList();
  const sp = spawn === 'gate' ? { x: 1000, y: 470 } : spawn === 'swan' ? { x: 1560, y: 640 } : HUB.spawn;
  P = newPlayer(sp.x, sp.y); P.face = PI / 2; P.hp = S.maxhp; refillPowers();
  cam.x = P.x; cam.y = P.y; cam.span = 360; cam.z = zoomForSpan(cam.span);
  playMusic('hub'); ambience('hearth'); setWeather('hub');
  S.loc = 'hub'; store(); hudDirty();
  G.playing = true;
}
function enterRealm(id, at) {
  clearActors(); G.valhalla = false;
  for (const k in WORLDS) if (k !== id && WORLDS[k].chunks) freeGround(WORLDS[k]);
  freeArenas();
  const w = WORLDS[id] || (WORLDS[id] = genRealm(id));
  prepFoes(REALMS[id]);
  if (!w.chunks && !w.ground) buildGround(w);
  G.world = w; G.scene = { kind: 'realm', id };
  const rs = RS(id), st = w.nodes[0];
  let sx = st.x, sy = st.y + 64;
  if (at === 'cp' && rs.cp) { sx = rs.cp.x; sy = rs.cp.y + 44; }
  P = newPlayer(sx, sy); P.hp = S.maxhp; P.face = -PI / 2;
  for (const g of w.spawns) {
    if (Math.hypot(g.x - sx, g.y - sy) < 420) continue;
    g.list.forEach((k, i) => { const a = i / g.list.length * TAU, r = g.list.length > 1 ? 54 : 0; spawnFoe(k, g.x + Math.cos(a) * r, g.y + Math.sin(a) * r); });
  }
  cam.x = P.x; cam.y = P.y; cam.span = 470; cam.z = zoomForSpan(cam.span);
  const D = w.def; playMusic(D.music); ambience(D.amb); setWeather(D.motes);
  S.loc = id; store(); hudDirty();
  G.playing = true;
}
function* realmIntro(id) {
  const D = REALMS[id];
  yield card({ k: 'Jötunheim', h: D.name, e: D.en, n: D.norse, t: D.tr, s: D.src });
  toast(D.name, 'Claim two runes to unseal the jarl’s gate. Mímir’s springs restore you.');
}
function makeBoss(bid, valhalla) {
  const D = BOSS_DEFS[bid], a = G.world.arena;
  const b = { id: bid, x: a.x, y: a.y - a.R * (D.startY ?? .35), t: 0, flash: 0, phase: 1, cd: 1.4, gen: null, wait: 0, dead: false, intro: true, world: G.world, an: {} };
  for (const k in D) b[k] = D[k];
  b.maxhp = b.hp = D.hp * (valhalla ? 1.5 : 1);
  D.setup(b);
  return b;
}
function enterArena(bid, valhalla, quick) {
  clearActors(); G.valhalla = !!valhalla;
  freeArenas(bid);
  const ar = ARENAS[bid].realm; for (const k in WORLDS) if (k !== ar && WORLDS[k].chunks) freeGround(WORLDS[k]);
  const w = ARENAW[bid] || (ARENAW[bid] = genArena(bid)); if (!w.chunks && !w.ground) buildGround(w);
  const rig = RIGPREP[bid]; if (rig) rig(); prepFoes(REALMS[ARENAS[bid].realm]);
  G.world = w; G.scene = { kind: 'arena', id: bid };
  const a = w.arena;
  P = newPlayer(a.x, a.y + a.R * (BOSS_DEFS[bid].playerY ?? .68)); P.face = -PI / 2; P.hp = S.maxhp;
  if (valhalla) refillPowers(); else { const mx = stat.maxCharge(); for (const k of S.slots) if (k) S.charge[k] = Math.max(S.charge[k] || 0, Math.min(mx, 1)); }
  G.boss = makeBoss(bid, valhalla);
  cam.span = 900; cam.x = a.x; cam.y = a.y - 120; cam.z = zoomForSpan(cam.span);
  const rid = ARENAS[bid].realm;
  setWeather({ iron: 'ember', ice: 'snow', sea: 'rain', fire: 'ash', utgard: 'utgard', sky: 'gold' }[rid]);
  ambience({ iron: 'embers', ice: 'wind', sea: 'storm', fire: 'fire', utgard: 'void', sky: 'wind' }[rid]);
  hudBossName(G.boss.name);
  S.loc = 'hub'; hudDirty();
  G.playing = true;
  if (quick) { G.boss.intro = false; G.boss.cd = 2; playMusic(G.boss.music); hudBoss(); }
  else playMusic('silence');
}
function* arenaIntro() {
  const b = G.boss;
  { const bb = bossBox(b); G.camLock = { x: (bb[0] + bb[2]) / 2, y: (bb[1] + bb[3]) / 2, span: Math.max(520, spanFor(bb[2] - bb[0], bb[3] - bb[1]) * .9) }; }
  yield wait(1.3);
  SFX.roar(b.roarP, 1.8); shake(10);
  yield card({ k: G.valhalla ? 'Valhalla Trial' : b.id === 'skogul' ? 'The Hidden Trial' : b.id === 'utgard' ? 'The Outer King' : 'Jarl of Jötunheim', h: b.name, e: b.title, n: b.norse, t: b.tr }, 4.2);
  if (!G.valhalla) { if (b.id === 'utgard') yield* utgardPre(); else if (BOSS_LINES[b.id].pre) yield* talk(BOSS_LINES[b.id].pre); }
  G.camLock = null;
  b.intro = false; playMusic(b.music); hudBoss();
}
function onBossDefeated(b) { runCS(bossOutro(b)); }
function* bossOutro(b) {
  yield wait(2.8);
  hudBoss();
  if (G.valhalla) {
    const r = 250 + (S.trials[b.id] ? 0 : 150); S.silver += r; S.trials[b.id] = 1; store();
    toast('Valhalla Trial won', `${b.name} falls again. +${r} silfr`); SFX.chime(60);
    yield wait(2.6); yield fadeTo(1, 1.2); enterHub('gate'); yield fadeTo(0, 1.2); return;
  }
  const L = BOSS_LINES[b.id].post; if (L) yield* talk(L);
  if (b.id === 'skogul') { S.cloak = 1; toast('The Swan-Cloak', 'Hildr’s wings, returned to you'); }
  else { S.boss[b.id] = 1; S.stage = Math.max(S.stage, 1 + Object.keys(S.boss).length); toast(b.id === 'utgard' ? 'The Outer King Falls' : 'Jarl Broken', b.name); }
  SFX.chime(55); store();
  yield wait(2.6);
  if (b.id === 'utgard') {
    yield* csEnding(false);
    yield* creditsCS();
    enterHub('fire'); yield fadeTo(0, 1.4);
    toast('Ókólnir', 'The saga is sung. The gate-stones still open, for those who want the Valhalla Trials.');
    return;
  }
  yield fadeTo(1, 1.4); enterHub(b.id === 'skogul' ? 'swan' : 'gate'); yield fadeTo(0, 1.4);
  for (let e; (e = hubEvent());) { yield* e[1](); S.f[e[0]] = 1; store(); } // the hearth remembers what you did
}
function hubEvent() {
  if (S.boss.angr && !S.f.ev1) return ['ev1', afterBoss1];
  if (S.boss.thrym && !S.f.ev2) return ['ev2', afterBoss2];
  if (S.boss.nidhogg && !S.f.ev3) return ['ev3', afterBoss3];
  if (S.boss.surtr && !S.f.ev4) return ['ev4', afterBoss4];
  if (S.cloak && !S.f.evC) return ['evC', afterSkogul];
  return null;
}
function runHubEvents() {
  if (G.scene.kind !== 'hub' || G.cs) return;
  const e = hubEvent(); if (!e) return;
  runCS((function* () { yield* e[1](); S.f[e[0]] = 1; store(); })(), () => runHubEvents());
}

/* ---------------- death & the fire that calls you back ---------------- */
const RISE = ["Rise, Einar. Not yet.", "Up. The fire’s still lit.", "Again. I’m here.", "You fell forward. Good. Now get up.", "Breathe. I have you.", "Not like this. Up."];
const RISE2 = ["That’s another feather. Don’t look at me like that. Get up.", "I’m still here. So are you. Up.", "Again, Einar. As many times as it takes."];
function* deathCS() {
  S.deaths++; store();
  yield fadeTo(1, 1.2);
  playMusic('silence');
  yield say('hildr', S.f.twist ? pick(RISE2) : pick(RISE));
  respawn();
  yield fadeTo(0, 1);
}
function respawn() {
  const sc = G.scene;
  if (sc.kind === 'arena') { enterArena(sc.id, G.valhalla, true); return; }
  if (sc.kind === 'realm') {
    if (G.trial) { for (const e of G.enemies) if (e.trial) e.dead = true, e.deadT = 1; G.trial = null; }
    const w = G.world, rs = RS(sc.id), st = w.nodes[0];
    const p = rs.cp ? { x: rs.cp.x, y: rs.cp.y + 44 } : { x: st.x, y: st.y + 64 };
    P = newPlayer(p.x, p.y); P.hp = S.maxhp;
    G.haz = []; G.proj = []; G.decoy = null;
    const mx = stat.maxCharge(); for (const k of S.slots) if (k) S.charge[k] = Math.max(S.charge[k] || 0, Math.min(mx, 1));
    for (const e of G.enemies) { e.aggro = false; e.state = 'idle'; e.hp = e.maxhp; e.x = e.hx; e.y = e.hy; }
    playMusic(w.def.music); hudDirty();
  } else { P.hp = S.maxhp; P.state = 'idle'; }
}

/* ---------------- interaction ---------------- */
function nodeLabel(n) {
  const r = RS(G.world.id), done = !!r.got[n.i];
  switch (n.t) {
    case 'well': return 'Drink';
    case 'altar': return r.runes[n.rune] || G.trial ? null : 'Claim rune';
    case 'shrine': return done ? null : 'Pray';
    case 'apple': return done ? null : 'Eat';
    case 'lore': return 'Read';
    case 'chest': return done ? null : 'Open';
    case 'feather': return done ? null : 'Take';
    case 'gate': return r.runes[0] && r.runes[1] ? 'Enter' : 'Sealed';
    case 'start': return 'Return';
  }
  return null;
}
function findInteract() {
  if (G.lock || G.menu || !P || P.state === 'dead' || G.trial) return null;
  let best = null, bd = 1e9;
  const consider = (x, y, r, label, fn) => { if (!label) return; const d = Math.hypot(P.x - x, P.y - y); if (d < r && d < bd) { bd = d; best = { label, fn }; } };
  const sc = G.scene;
  if (sc.kind === 'hub') {
    for (const n of G.npcs) consider(n.x, n.y, n.perch ? 100 : 66, n.wolf ? 'Pet' : 'Talk', () => talkTo(n));
    const fx = clamp(P.x, 880, 1120), fy = clamp(P.y, 790, 812);
    consider(P.x + (fx - P.x), P.y + (fy - P.y), 46, 'Rest', restAtFire);
    for (const gt of GATES) consider(gt.x, gt.y, 92, gateOpen(gt.id) ? 'Enter' : 'Sealed', () => useGate(gt));
    if (S.feathers >= 4 && !S.cloak) consider(SWAN.x, SWAN.y, 140, 'Lay feathers', useSwan);
  } else if (sc.kind === 'realm') {
    for (const n of G.world.nodes) { const r = ACT_R[n.t]; if (r) consider(n.x, n.y, r, nodeLabel(n), () => useNode(n)); }
  }
  return best;
}
function talkTo(n) {
  if (n.wolf) { SFX.heart(); for (let i = 0; i < 5; i++) part({ x: n.x + rand(-8, 8), y: n.y - 16, vy: -rand(30, 60), vx: rand(-20, 20), life: 1.2, type: 'rune', ch: '♥', color: '#ffb0b8', size: 11 }); note(pick(['Ylfa leans against your leg.', 'Ylfa’s tail thumps the floor.', 'Ylfa sneezes, delighted.', 'A cold nose finds your palm.'])); return; }
  runCS(topicMenu(n.id));
}
const GREET = {
  hildr: () => S.ending ? "There you are." : S.f.night ? "Come and sit." : S.f.twist ? "Einar." : "The fire’s warm. Sit, if you like.",
  bjarki: () => "Ho! The axe-man! Come here, let me see that edge.",
  asta: () => !S.powers.frigg ? "Come closer, straw-man." : "The far things are loud today.",
  kolr: () => "Einar! I was just rhyming something with your name. Nothing rhymes with your name.",
  muninn: () => "Kraa. What.",
};
const AGAIN = { hildr: ["Something else?", "Mm?"], bjarki: ["What else?", "Speak up, I’m half-deaf from the hammer."], asta: ["Ask.", "Well?"], kolr: ["Another question? Excellent. Ask.", "Go on."], muninn: ["Hurry up.", "And?"] };
function* topicMenu(id) {
  let first = true;
  while (true) {
    const list = TOPICS[id].filter(t => !t.if || t.if());
    if (id === 'asta' && !S.powers.frigg) { const g = list.find(t => t.id === 'gift'); S.seen['asta.gift'] = 1; yield* g.run(); }
    const opts = list.filter(t => !(id === 'asta' && t.id === 'gift')).map(t => ({ t: t.t, nw: !S.seen[id + '.' + t.id] && !t.always, tp: t }));
    opts.push({ t: 'Farewell.', bye: 1 });
    const c = yield ask(id, first ? GREET[id]() : pick(AGAIN[id]), opts);
    first = false;
    if (c >= opts.length - 1) break;
    const tp = opts[c].tp; S.seen[id + '.' + tp.id] = 1;
    yield* tp.run();
    if (tp.id === 'shop') break;
  }
  store();
}
function restAtFire() {
  P.hp = S.maxhp; refillPowers(); store(); SFX.heal();
  burst(P.x, P.y - 16, 14, { type: 'ember', color: '#ffb347', add: 1, smin: 20, smax: 80, lmin: .6, lmax: 1.2 });
  note(S.f.night ? 'The fire is warm. So is the memory of her hand.' : 'The Never-Cold warms you. The saga is remembered.');
}
function useGate(gt) {
  if (!gateOpen(gt.id)) { note(gt.id === 'iron' ? 'Ásta wants a word before you go.' : 'The stone is cold. Not yet.'); return; }
  runCS(gateMenu(gt));
}
function* gateMenu(gt) {
  if (gt.id === 'utgard') {
    if (S.boss.utgard) {
      const c = yield ask('narr', "The stone opens on the place where the Outer Yard fell. Valhalla’s door is still standing there.", ["Stand at Valhalla’s door.", "Valhalla Trial: Útgarða-Loki.", "Not now."]);
      if (c === 0) { yield* csEnding(true); yield* creditsCS(); enterHub('fire'); yield fadeTo(0, 1.2); }
      else if (c === 1) { yield fadeTo(1, 1); enterArena('utgard', true); yield fadeTo(0, 1); yield* arenaIntro(); }
      return;
    }
    const c = yield ask('narr', "Útgarðr. The Outer Yard. Beyond it there is nothing but the end of the saga.", ["Go through.", "Not yet."]);
    if (c === 0) { yield fadeTo(1, 1.4); enterArena('utgard'); yield fadeTo(0, 1.2); yield* arenaIntro(); }
    return;
  }
  const D = REALMS[gt.id], bossDone = S.boss[D.boss];
  const opts = ["Walk the realm."]; if (RS(gt.id).cp) opts.push("Return to the last spring."); if (bossDone) opts.push(`Valhalla Trial: ${BOSS_DEFS[D.boss].name}.`); opts.push("Not yet.");
  const c = yield ask('narr', `${D.name}. ${D.en}.` + (bossDone ? " Its jarl is broken." : ""), opts);
  const pickd = opts[c];
  if (pickd === "Not yet.") return;
  yield fadeTo(1, 1.2);
  if (pickd.startsWith('Valhalla')) { enterArena(D.boss, true); yield fadeTo(0, 1); yield* arenaIntro(); return; }
  const first = !RS(gt.id).seen; RS(gt.id).seen = 1;
  enterRealm(gt.id, pickd.startsWith('Return') ? 'cp' : 'start');
  yield fadeTo(0, 1.2);
  if (first) yield* realmIntro(gt.id);
}
function useSwan() {
  runCS((function* () {
    const c = yield ask('narr', "The four swan-feathers stir in your hand, as if they remember the wind.", ["Lay them on the water.", "Not yet."]);
    if (c !== 0) return;
    yield fadeTo(1, 1.6); enterArena('skogul'); yield fadeTo(0, 1.4); yield* arenaIntro();
  })());
}
function useNode(n) {
  const id = G.world.id, rs = RS(id);
  switch (n.t) {
    case 'well': {
      P.hp = S.maxhp; refillPowers(); rs.cp = { x: n.x, y: n.y }; store(); SFX.heal(); SFX.splash();
      burst(n.x, n.y, 20, { type: 'ember', color: '#9fe0ff', add: 1, smin: 30, smax: 120, lmin: .6, lmax: 1.2 });
      if (!rs.got[n.i]) { rs.got[n.i] = 1; toast('Mímir’s Spring', 'Wounds closed. The gods’ gifts return. The fire will call you back here.'); }
      else note('You drink. The cold goes in, and the strength with it.');
      break;
    }
    case 'altar': startTrial(n); break;
    case 'shrine': runCS(prayCS(n)); break;
    case 'apple': {
      rs.got[n.i] = 1; S.maxhp += 20; P.hp = S.maxhp; store(); SFX.chime(64); hudDirty();
      burst(n.x, n.y - 40, 24, { type: 'ember', color: '#ffcf4a', add: 1, smin: 40, smax: 180 });
      toast('Iðunn’s Apple', 'The apple of the gods’ youth. Your strength grows. (+20)');
      break;
    }
    case 'lore': {
      rs.got[n.i] = 1; store();
      runCS((function* () { yield say('stone', LORE[id][n.lore]); })());
      break;
    }
    case 'chest': {
      rs.got[n.i] = 1; store(); SFX.clang();
      dropSilver(n.x, n.y - 10, n.big ? 120 : randi(45, 80));
      burst(n.x, n.y - 16, 12, { type: 'spark', color: '#ffe08a', add: 1 });
      break;
    }
    case 'feather': {
      rs.got[n.i] = 1; S.feathers++; store(); SFX.chime(72);
      burst(n.x, n.y - 40, 16, { type: 'feather', color: '#ffffff', smin: 20, smax: 90, lmin: 1, lmax: 2, szmin: 2, szmax: 3.4 });
      toast(`Swan Feather · ${S.feathers} of 4`, S.feathers < 4 ? 'White as new snow, and warm, as if it fell a moment ago.' : 'All four. Hildr should see these.');
      break;
    }
    case 'gate': {
      if (!(rs.runes[0] && rs.runes[1])) { note(`Two runes seal this door. (${rs.runes[0] + rs.runes[1]} of 2)`); SFX.clang(); return; }
      runCS((function* () {
        SFX.boom(); shake(10);
        const c = yield ask('narr', "Beyond the door the air is heavier, the way it is before a storm breaks.", ["Go through.", "Not yet."]);
        if (c !== 0) return;
        yield fadeTo(1, 1.4); enterArena(REALMS[id].boss); yield fadeTo(0, 1.2); yield* arenaIntro();
      })());
      break;
    }
    case 'start': {
      runCS((function* () {
        const c = yield ask('narr', "The gate-stone hums. Through it, faintly, a fire.", ["Return to Ókólnir.", "Stay."]);
        if (c !== 0) return;
        yield fadeTo(1, 1); enterHub('gate'); yield fadeTo(0, 1); runHubEvents();
      })());
      break;
    }
  }
}
function grantPower(k) {
  S.powers[k] = 1; S.charge[k] = stat.maxCharge();
  if (!S.slots.includes(k)) { if (!S.slots[0]) S.slots[0] = k; else if (!S.slots[1]) S.slots[1] = k; }
  store(); hudDirty();
}
function* prayCS(n) {
  const k = n.god, Pw = POWERS[k];
  P.state = 'pose'; P.vx = P.vy = 0;
  SFX.rune();
  G.fx.push({ t: 0, life: 2.2, x: n.x, y: n.y - 20, draw: f => { const a = Math.sin(f.t / f.life * PI); glow(f.x, f.y - 60, 160, '#ffcf6a', a * .8); glow(f.x, f.y - 60, 50, '#ffffff', a * .5); } });
  if (k === 'thor') G.fx.push({ t: 0, life: 2.2, x: n.x + 40, y: n.y + 40, draw: fxThor });
  yield wait(1.2);
  RS(G.world.id).got[n.i] = 1; grantPower(k);
  const bound = S.slots.indexOf(k);
  yield card({ k: `A gift of ${Pw.god}`, h: Pw.name, e: Pw.rune, t: Pw.desc + (bound >= 0 ? ` Bound to rune ${bound ? 'II' : 'I'}.` : ' Bind it from the pause menu.') });
  P.state = 'idle';
}

/* ---------------- rune trials ---------------- */
function startTrial(n) {
  const F = G.world.def.foes;
  G.trial = { x: n.x, y: n.y, R: 280, node: n, active: true, wave: 0, gap: 0, t: 0, waves: [[F.grunt, F.grunt, F.beast, F.caster], [F.brute, F.beast, F.beast, F.caster, F.grunt]] };
  const T = G.trial; const d = Math.hypot(P.x - T.x, P.y - T.y); if (d > T.R - 30) { P.x = T.x + (P.x - T.x) / d * (T.R - 40); P.y = T.y + (P.y - T.y) / d * (T.R - 40); }
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - T.x, e.y - T.y) < T.R + 60) { e.x = T.x + (e.x - T.x) * 2; e.y = T.y + (e.y - T.y) * 2; }
  spawnWave(0); playMusic('boss'); SFX.roar(1.3, 1); shake(6);
  toast('Trial of the Rune', 'The circle closes. Break what rises.');
}
function spawnWave(i) {
  const T = G.trial, L = T.waves[i];
  L.forEach((k, j) => { const a = j / L.length * TAU + rand(0, .6); spawnFoe(k, T.x + Math.cos(a) * 170, T.y + Math.sin(a) * 150, { rise: 1, trial: 1, elite: i === 1 && j === 0 }); burst(T.x + Math.cos(a) * 170, T.y + Math.sin(a) * 150, 10, { type: 'smoke', color: '#120c0a', smin: 20, smax: 80, lmin: .5, lmax: 1, szmin: 6, szmax: 12, grow: 20, alpha: .6 }); });
}
function updTrial(dt) {
  const T = G.trial; if (!T || !T.active) return;
  T.t += dt;
  if (!G.enemies.some(e => e.trial && !e.dead)) {
    T.gap += dt;
    if (T.gap > 1.1) { T.gap = 0; T.wave++; if (T.wave < T.waves.length) { spawnWave(T.wave); SFX.roar(1.4, .7); } else completeTrial(); }
  }
}
function completeTrial() {
  const T = G.trial, n = T.node, rs = RS(G.world.id);
  rs.runes[n.rune] = 1; store(); G.trial = null; hudDirty();
  SFX.rune(); shake(6); G.flash = .4; G.flashCol = '#ffd27a';
  P.hp = Math.min(S.maxhp, P.hp + S.maxhp * .3);
  burst(n.x, n.y - 60, 30, { type: 'spark', color: '#ffd27a', add: 1, smin: 80, smax: 300 });
  for (let i = 0; i < 12; i++) part({ x: n.x + rand(-20, 20), y: n.y - 60, vx: (P.x - n.x) * 1.4, vy: (P.y - n.y) * 1.4 - 40, life: .7, type: 'ember', color: '#ffcf6a', size: 3, add: 1 });
  const c = rs.runes[0] + rs.runes[1];
  toast(`Rune ${['ᛟ', 'ᛞ'][n.rune]} claimed`, c >= 2 ? 'Both runes are yours. The jarl’s gate will open.' : 'One of two. Somewhere, a great door shifts in its frame.');
  playMusic(G.world.def.music);
}
function drawTrialRing() {
  const T = G.trial; if (!T) return;
  const n = 36, t = G.t;
  ctx.strokeStyle = 'rgba(255,140,50,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(T.x, T.y, T.R, 0, TAU); ctx.stroke();
  ctx.font = '600 18px Cinzel, serif'; ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + t * .25, x = T.x + Math.cos(a) * T.R, y = T.y + Math.sin(a) * T.R;
    ctx.fillStyle = `rgba(255,${180 + (i % 3) * 20},90,${.6 + .3 * Math.sin(t * 3 + i)})`; ctx.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i % 12], x, y + 6);
    if (i % 4 === 0) G.lights.push({ x, y, r: 90, i: .5 });
  }
  glow(T.x, T.y, T.R * .9, '#ff7a1a', .08);
}

/* ---------------- realm ambience: vents in Múspell ---------------- */
function updVents(dt) {
  const w = G.world; if (!w || !w.vents || !w.vents.length || G.scene.kind !== 'realm') return;
  for (const v of w.vents) {
    v.t += dt;
    if (Math.abs(v.x - P.x) > 700 || Math.abs(v.y - P.y) > 600) continue;
    if (Math.random() < dt * 2) part({ x: v.x + rand(-6, 6), y: v.y, vy: -rand(20, 50), life: 1.2, type: 'smoke', color: '#5a4a44', size: 6, grow: 14, alpha: .3 });
    if (v.t > v.per) { v.t = 0; haz({ x: v.x, y: v.y, r: 62, warn: 1.1, dmg: 15, col: '#ff6a1a', style: 'fire', onFire: () => SFX.fire() }); }
  }
}
function drawVents() {
  const w = G.world; if (!w.vents) return;
  for (const v of w.vents) { if (!inView(v.x, v.y, 60)) continue; ctx.fillStyle = '#0a0302'; ctx.beginPath(); ctx.ellipse(v.x, v.y, 16, 9, 0, 0, TAU); ctx.fill(); const k = v.t / v.per; glow(v.x, v.y, 18 + k * 20, '#ff5a1a', .3 + k * .5); }
}

/* ---------------- exploration fog for the map ---------------- */
let expT = 0;
function explore(dt) {
  if (G.scene.kind !== 'realm') return;
  expT -= dt; if (expT > 0) return; expT = .2;
  const id = G.scene.id, N = 48, g = G.explored[id] || (G.explored[id] = new Uint8Array(N * N)), cs = G.world.w / N, r = Math.ceil(560 / cs);
  const cx = P.x / cs | 0, cy = P.y / cs | 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = 1; }
}

/* ---------------- menus ---------------- */
let menuSel = null;
function openMenu() {
  if (!G.playing || G.cs || G.menu || G.vig || G.scene.kind === 'title' || (P && P.state === 'dead')) return;
  G.menu = true; menuSel = null; $('menu').classList.add('on'); renderMenu();
}
function closeMenu() { G.menu = false; $('menu').classList.remove('on'); $('shop').classList.remove('on'); hudDirty(); }
function renderMenu() {
  const sc = G.scene;
  const where = sc.kind === 'hub' ? 'Ókólnir' : sc.kind === 'realm' ? REALMS[sc.id].name : G.boss ? G.boss.name : '';
  const sub = sc.kind === 'hub' ? 'The Never-Cold Hall, at the edge of Ginnungagap' : sc.kind === 'realm' ? REALMS[sc.id].en : (G.boss && G.boss.title) || '';
  const jarls = REALM_ORDER.map(r => { const b = REALMS[r].boss; return `<div class="stat"><span>${BOSS_DEFS[b].name} <span style="color:var(--bone-dim)">· ${REALMS[r].name}</span></span><b>${S.boss[b] ? 'Broken' : gateOpen(r) ? 'Waiting' : '—'}</b></div>`; }).join('')
    + `<div class="stat"><span>${BOSS_DEFS.utgard.name} <span style="color:var(--bone-dim)">· Útgarðr</span></span><b>${S.boss.utgard ? 'Broken' : gateOpen('utgard') ? 'Waiting' : '—'}</b></div>`;
  const left = sc.kind === 'realm'
    ? `<canvas id="mapc" width="480" height="480"></canvas><p class="lead" style="margin-top:6px">Springs in blue, runes in gold, the jarl’s gate at the crown.</p>`
    : `<h3>The Saga</h3>${jarls}<div class="stat"><span>Swan feathers</span><b>${S.feathers} / 4</b></div><div class="stat"><span>Times the fire called you back</span><b>${S.deaths}</b></div>${S.ending ? `<div class="stat"><span>Endings sung</span><b>${Object.keys(S.endings).join(' · ')}</b></div>` : ''}`;
  const pcards = POWER_ORDER.map(k => { const has = S.powers[k], sl = S.slots.indexOf(k); return `<div class="pcard ${has ? '' : 'lock'} ${menuSel === k ? 'sel' : ''}" data-p="${k}"><div class="g">${POWERS[k].rune}</div><div class="n">${has ? POWERS[k].name : 'Unknown'}</div><div class="d">${has ? POWERS[k].desc : 'A shrine somewhere in Jötunheim.'}</div>${sl >= 0 ? `<div class="sl">Rune ${sl ? 'II' : 'I'}</div>` : ''}</div>`; }).join('');
  $('menuSheet').innerHTML = `
    <h2>${where}</h2><p class="lead">${sub}</p>
    <div class="cols"><div>${left}</div><div>
      <h3>Gifts of the gods</h3><div class="pgrid">${pcards}</div>
      <div class="row" style="margin-top:8px"><button class="mbtn" data-bind="0" ${menuSel ? '' : 'disabled'}>Bind to rune I</button><button class="mbtn" data-bind="1" ${menuSel ? '' : 'disabled'}>Bind to rune II</button></div>
      <h3>Einar Hallvarðsson</h3>
      <div class="stat"><span>Strength</span><b>${Math.ceil(P.hp)} / ${S.maxhp}</b></div>
      <div class="stat"><span>Edge · Mail · Haft</span><b>${S.up.edge} · ${S.up.mail} · ${S.up.haft}</b></div>
      <div class="stat"><span>Charges per gift</span><b>${stat.maxCharge()}</b></div>
      <div class="stat"><span>Silfr</span><b>${S.silver}</b></div>
      <h3>Settings</h3>
      <label class="set" for="sMus">Music<input type="range" id="sMus" min="0" max="1" step=".05" value="${SET.music}"></label>
      <label class="set" for="sSfx">Sound<input type="range" id="sSfx" min="0" max="1" step=".05" value="${SET.sfx}"></label>
      <label class="set" for="sShk">Screen shake<input type="checkbox" id="sShk" ${SET.shake ? 'checked' : ''} style="justify-self:start;width:22px;height:22px;accent-color:#e5b45a"></label>
      <h3>Credits &amp; disclaimer</h3>
      <p class="fine">Einheri is an unofficial, non-commercial fan tribute made for private play. Its art direction is inspired by <i>Jotun: Valhalla Edition</i> by Thunder Lotus Games, who own <i>Jotun</i> and all of its characters, art and trademarks. This project is not affiliated with or endorsed by Thunder Lotus. All art here is drawn in code; no assets from the original game are included. Please play and support the original.</p>
      <p class="fine">Myth and verse from the Poetic and Prose Eddas (Völuspá, Hávamál, Þrymskviða, Grímnismál; Snorri's Gylfaginning).</p>
    </div></div>
    <div class="row" style="margin-top:16px"><button class="mbtn" id="mResume">Resume</button>${sc.kind !== 'hub' ? '<button class="mbtn" id="mHome">Return to Ókólnir</button>' : ''}<button class="mbtn warn" id="mTitle">Save &amp; quit to title</button></div>`;
  if (sc.kind === 'realm') drawMap($('mapc'));
  $('menuSheet').querySelectorAll('.pcard').forEach(el => el.addEventListener('click', () => { const k = el.dataset.p; if (!S.powers[k]) return; SFX.ui(); menuSel = menuSel === k ? null : k; renderMenu(); }));
  $('menuSheet').querySelectorAll('[data-bind]').forEach(el => el.addEventListener('click', () => { if (!menuSel) return; const i = +el.dataset.bind, o = S.slots.indexOf(menuSel); if (o >= 0) S.slots[o] = S.slots[i]; S.slots[i] = menuSel; if (S.charge[menuSel] === undefined) S.charge[menuSel] = stat.maxCharge(); menuSel = null; SFX.ui(); store(); hudDirty(); renderMenu(); }));
  $('sMus').addEventListener('input', e => { SET.music = +e.target.value; applyVolumes(); storeSet(); });
  $('sSfx').addEventListener('input', e => { SET.sfx = +e.target.value; applyVolumes(); storeSet(); });
  $('sShk').addEventListener('change', e => { SET.shake = e.target.checked; storeSet(); });
  $('mResume').addEventListener('click', () => { SFX.ui(); closeMenu(); });
  if ($('mHome')) $('mHome').addEventListener('click', () => { SFX.ui(); closeMenu(); runCS((function* () { yield fadeTo(1, .9); enterHub('gate'); yield fadeTo(0, .9); runHubEvents(); })()); });
  $('mTitle').addEventListener('click', () => { SFX.ui(); store(); closeMenu(); toTitle(); });
}
function drawMap(c) {
  const g = c.getContext('2d'), w = G.world, s = c.width / w.w, id = G.scene.id;
  g.fillStyle = '#060504'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(w.ground, 0, 0, c.width, c.height);
  const N = 48, ex = G.explored[id], cs = c.width / N;
  g.fillStyle = 'rgba(6,5,4,.92)';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!ex || !ex[y * N + x]) g.fillRect(x * cs - .5, y * cs - .5, cs + 1, cs + 1);
  const rs = RS(id), seen = (x, y) => ex && ex[(clamp(y / w.h * N | 0, 0, N - 1)) * N + clamp(x / w.w * N | 0, 0, N - 1)];
  g.textAlign = 'center'; g.font = '600 14px Cinzel, serif';
  for (const n of w.nodes) {
    if (!seen(n.x, n.y) && n.t !== 'gate' && n.t !== 'start') continue;
    const x = n.x * s, y = n.y * s, done = n.t === 'altar' ? rs.runes[n.rune] : rs.got[n.i];
    const ic = { well: ['●', '#7fd0ff'], altar: [['ᛟ', 'ᛞ'][n.rune], '#ffcf6a'], shrine: ['ᚨ', '#ffe2a0'], apple: ['●', '#f2b52e'], lore: ['ᚱ', '#ff9a3a'], chest: ['■', '#c9a55a'], feather: ['✦', '#ffffff'], gate: ['⛬', '#ff7a5a'], start: ['ᛉ', '#9fdcff'] }[n.t];
    if (!ic) continue;
    g.globalAlpha = done && n.t !== 'well' ? .35 : 1; g.fillStyle = ic[1]; g.fillText(ic[0], x, y + 5);
  }
  g.globalAlpha = 1;
  const px = P.x * s, py = P.y * s;
  g.save(); g.translate(px, py); g.rotate(P.face); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -5); g.lineTo(-5, 5); g.closePath(); g.fill(); g.restore();
}
/* ---------------- shops ---------------- */
const SHOPS = {
  bjarki: { title: 'Bjarki’s Forge', lead: 'Silver for steel. The dead get paid too.', items: [
    { k: 'edge', n: 'The edge of Skjaldbrjótr', d: 'Every blow bites deeper. +20% damage per level.', c: [60, 140, 260, 420] },
    { k: 'mail', n: 'Rings of mail', d: 'Bjarki riveted every ring himself. 11% less harm per level.', c: [80, 180, 320] },
    { k: 'haft', n: 'An ash-wood haft', d: 'Wind up the great blow faster, and swing quicker.', c: [100, 240] },
  ] },
  asta: { title: 'The Völva’s Seat', lead: 'The gods give. Ásta knows how to ask for more.', items: [
    { k: 'focus', n: 'A deeper well', d: 'Each gift of the gods holds one more charge.', c: [150, 320] },
    { k: 'drink', n: 'Önd-drinker', d: 'The spirits of the slain refill your gifts much faster.', c: [120] },
  ] },
};
function openShop(kind) {
  G.menu = true; G.shop = kind; $('shop').classList.add('on'); renderShop();
}
function renderShop() {
  const sh = SHOPS[G.shop];
  $('shopSheet').innerHTML = `<h2>${sh.title}</h2><p class="lead">${sh.lead}</p><p class="purse">Silfr · ${S.silver}</p>` +
    sh.items.map(it => { const lv = S.up[it.k], max = it.c.length, cost = it.c[lv]; return `<div class="item"><div class="n">${it.n}</div><div class="d">${it.d}</div><div class="lv">${it.c.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div><button class="mbtn" data-k="${it.k}" ${lv >= max || S.silver < cost ? 'disabled' : ''}>${lv >= max ? 'Mastered' : cost + ' silfr'}</button></div>`; }).join('') +
    `<div class="row" style="margin-top:14px"><button class="mbtn" id="shopClose">Done</button></div>`;
  $('shopSheet').querySelectorAll('[data-k]').forEach(el => el.addEventListener('click', () => {
    const it = sh.items.find(i => i.k === el.dataset.k), lv = S.up[it.k], cost = it.c[lv];
    if (cost === undefined || S.silver < cost) return;
    S.silver -= cost; S.up[it.k]++; if (it.k === 'focus') refillPowers();
    SFX.chime(60); store(); hudDirty(); renderShop();
    note(G.shop === 'bjarki' ? pick(['Bjarki grins: “Now THAT will hurt someone.”', 'Sparks, swearing, and a very sharp edge.']) : pick(['Ásta hums something old. You feel heavier with gods.', '“Frigg says thank you. She doesn’t, but I do.”']));
  }));
  $('shopClose').addEventListener('click', () => { SFX.ui(); closeMenu(); G.shop = null; });
}

/* ---------------- credits ---------------- */
function* creditsCS() {
  yield fadeTo(1, 1);
  const el = $('credits'), roll = $('roll');
  roll.innerHTML = `
    <h2 style="font-size:34px;letter-spacing:.3em">EINHERI</h2><p class="q">A Saga of Jötunheim</p>
    <h2>${{ A: 'The Hall of the Slain', B: 'The Never-Cold', C: 'The Chooser' }[S.ending] || ''}</h2>
    <p>Einar Hallvarðsson, the straw-dead, the lone warrior</p><p>Hildr, who kept the fire</p><p>Bjarki Half-Hand · Ásta the Völva · Kolr the Skald · Muninn · Ylfa</p>
    <h2>The Jötnar</h2><p>Angrboða of the Iron Wood · Þrymr of the Thursar · Níðhöggr of Nástrǫnd</p><p>Surtr of Múspell · Útgarða-Loki, who was Skrýmir · Skögul, Queen of the Choosers</p>
    <h2>Sources</h2><p>Verses from the Poetic Edda: Völuspá, Hávamál, Grímnismál, Vafþrúðnismál, Þrymskviða</p><p>Tales from Snorri Sturluson’s Prose Edda: Gylfaginning and Skáldskaparmál</p>
    <h2>Inspired by</h2><p>Jotun: Valhalla Edition, by Thunder Lotus Games</p>
    <h2>&nbsp;</h2><p class="q">Deyr fé, deyja frændr, deyr sjalfr it sama;</p><p class="q">ek veit einn, at aldri deyr: dómr um dauðan hvern.</p><p>I know one thing that never dies: the judgment on each of the dead.</p>
    <h2>&nbsp;</h2><p class="q">${Object.keys(S.endings).length < 3 ? 'Other endings wait at Valhalla’s door. The gate-stone of Útgarðr still opens.' : 'Every ending sung. Kolr is insufferable about it.'}</p>`;
  el.classList.add('on'); playMusic('ending');
  const H = roll.offsetHeight + innerHeight; let y = 0, t = 0, skip = false;
  const onTap = () => { if (t > 2) skip = true; };
  el.addEventListener('pointerdown', onTap);
  roll.style.transform = `translateY(${innerHeight}px)`;
  yield fadeTo(0, 1);
  yield dt => { t += dt; y += dt * 42; roll.style.transform = `translateY(${innerHeight - y}px)`; return skip || y > H; };
  yield fadeTo(1, 1.2);
  el.removeEventListener('pointerdown', onTap); el.classList.remove('on');
}

/* ---------------- title ---------------- */
let TITLEW = null, titleAnimT = 0;
function titleScene() { // a living diorama behind the title: the lone warrior and the frost-king, in a storm
  try {
    rigThrym(); rigEinar();
    if (!TITLEW) TITLEW = genArena('thrym'); else if (!TITLEW.chunks && !TITLEW.ground) buildGround(TITLEW);
    G.world = TITLEW; const a = TITLEW.arena;
    const b = makeBoss('thrym', false); b.x = a.x + 420; b.y = a.y + 60; b.blizzard = true; G.boss = b;
    P = newPlayer(b.x - 300, b.y + 30); P.face = -.15;
    G.lock = true; setWeather('snow'); ambience('wind');
    b.side = -1; titleFrame(); cam.x = G.camLock.x; cam.y = G.camLock.y; cam.z = zoomForSpan(G.camLock.span);
  } catch (e) { console.warn(e); G.world = null; P = null; }
}
function titleFrame() { // the giant stands right of centre, whole; the title sits to his left (landscape)
  const b = G.boss, land = W > H, span = land ? 1120 : 1700, vw = W / zoomForSpan(span);
  const w = G.world, cx = land ? b.x - vw * .22 : b.x - 60;
  G.camLock = { x: w ? clamp(cx, vw / 2, Math.max(vw / 2, w.w - vw / 2)) : cx, y: b.y - 480, span };
}
function titleAnim(dt) {
  const b = G.boss; if (!b) return;
  titleFrame(); b.side = -1;
  titleAnimT += dt;
  if (titleAnimT > 8) { titleAnimT = 0; setA(b, 'mouth', 1, 4); setA(b, 'lean', .3, 3); if (AU.ctx) SFX.roar(1, 1.6); }
  if (titleAnimT > 2.4 && b.an.mouth.to > 0) { setA(b, 'mouth', 0, 3); setA(b, 'lean', 0, 2); }
}
function toTitle() {
  G.playing = false; G.scene = { kind: 'title' }; G.world = null; P = null; G.cs = null; G.lock = false; G.vig = null;
  clearActors(); cardHide(); if (DLG.open) dlgClose();
  titleScene();
  $('title').classList.remove('off');
  const sv = loadSave();
  $('tContinue').hidden = !(sv && sv.stage >= 1);
  $('confirm').classList.remove('on');
  G.fadeTo = 0; playMusic('title'); ambience('wind');
}
function startNew() {
  if (TITLEW) freeGround(TITLEW);
  S = newSave(); store();
  $('title').classList.add('off'); G.scene = { kind: 'cut' };
  runCS((function* () {
    yield* csPrologue();
    enterHub('fire');
    yield* csWake();
  })());
}
function continueGame() {
  const sv = loadSave(); if (!sv) { startNew(); return; }
  S = sv; $('title').classList.add('off'); if (TITLEW) freeGround(TITLEW);
  G.fade = 1; enterHub('fire'); G.fadeTo = 0; G.fadeSp = .8;
  toast('Ókólnir', S.ending ? 'The saga is sung, but the fire still burns.' : 'The fire called you back.');
  setTimeout(runHubEvents, 1200);
}
let titleT = 0;
function drawTitle(rdt) {
  titleT += rdt; G.vigT = titleT;
  const t = titleT, g = ctx; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const w = W, h = H, k = Math.min(w, h) / 600;
  drawBackdrop(g, 'title', w, h, '#070a12', '#2a3650', '#bfe8ff', .8, .005, .62, .3) || vsky(g, w, h, ['#070a12', '#141c2c', '#1e2636', '#0a0c12']);
  const flash = Math.max(0, Math.sin(t * .7) > .985 ? 1 : 0);
  G.tFlash = Math.max((G.tFlash || 0) - rdt * 3, flash);
  if (flash && Math.random() < .2) SFX.thunder && AU.ctx && SFX.thunder();
  // far ridges
  for (const [yy, col, amp] of [[.62, '#121a26', 50], [.7, '#0e141e', 36]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * yy - Math.abs(Math.sin(x * .004 + yy * 9)) * amp * k - Math.sin(x * .013) * 12 * k); g.lineTo(w, h); g.fill(); }
  // the jötunn in the storm
  const gx = w * .62, gy = h * .82, s = k * 2.3, br = Math.sin(t * .6) * 4;
  g.save(); g.translate(gx, gy + br); g.scale(s, s);
  g.fillStyle = '#0a0e15';
  g.beginPath(); g.moveTo(-110, 0); g.quadraticCurveTo(-150, -120, -110, -200); g.quadraticCurveTo(0, -240, 110, -200); g.quadraticCurveTo(150, -120, 110, 0); g.fill();
  g.beginPath(); g.moveTo(-110, -190); g.quadraticCurveTo(-190, -120, -170, -20); g.lineTo(-130, -20); g.quadraticCurveTo(-140, -110, -90, -170); g.fill();
  g.beginPath(); g.moveTo(110, -190); g.quadraticCurveTo(200, -150, 190, -40); g.lineTo(150, -40); g.quadraticCurveTo(150, -120, 90, -170); g.fill();
  g.beginPath(); g.ellipse(0, -232, 40, 44, 0, 0, TAU); g.fill();
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 28, -262); g.quadraticCurveTo(sd * 78, -280, sd * 74, -340); g.quadraticCurveTo(sd * 60, -290, sd * 18, -270); g.fill(); }
  g.fillStyle = 'rgba(160,190,220,.12)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(-26 + i * 7, -214); g.lineTo(-22 + i * 7 + Math.sin(t + i) * 2, -150 - (i % 2) * 20); g.lineTo(-18 + i * 7, -214); g.fill(); }
  g.restore();
  for (const sd of [-1, 1]) { vglow(g, gx + sd * 14 * s, gy + br - 236 * s, 22 * k, '#bfe8ff', .9); vglow(g, gx + sd * 14 * s, gy + br - 236 * s, 6 * k, '#ffffff', 1); }
  if (G.tFlash > 0) { g.fillStyle = `rgba(200,220,255,${G.tFlash * .25})`; g.fillRect(0, 0, w, h); }
  // mist
  for (let i = 0; i < 5; i++) { g.globalAlpha = .1; g.drawImage(fogTint('#9ab0c8'), ((i * 300 + t * 12) % (w + 600)) - 300, h * .6 + i * 20, 600 * k, 300 * k); }
  g.globalAlpha = 1;
  // the cliff and Einar
  g.fillStyle = '#05070a'; g.beginPath(); g.moveTo(0, h * .84); g.quadraticCurveTo(w * .22, h * .8, w * .34, h * .86); g.lineTo(w * .36, h); g.lineTo(0, h); g.fill();
  vfig(g, w * .26, h * .815, 1.1 * k, '#05070a', { axe: 1, cloak: '#6e1f18' });
  vsnow(g, w, h, 160, 11, 60);
  g.drawImage(VIG, 0, 0, w, h);
}

/* ---------------- camera ---------------- */
function bossBox(b) { // the screen-space footprint of a jötunn, so the camera can hold all of it
  const a = G.world.arena;
  switch (b.id) {
    case 'angr': return [b.x - 440, b.y - 1000 + b.an.sink.v * 900, b.x + 440, b.y + 90];
    case 'thrym': return [b.x - 420, b.y - 1020, b.x + 420, b.y + 40];
    case 'nidhogg': { const h = b.hole, s = P && P.x > h.x ? -1 : 1; return [h.x - (s > 0 ? 520 : 380), h.y - 900 * Math.max(.4, b.an.em.v), h.x + (s > 0 ? 380 : 520), h.y + 120]; }
    case 'surtr': return [b.x - 440, b.y - 960 - b.an.air.v * 600, b.x + 440, b.y + 110];
    case 'utgard': return b.skry ? [a.x - 560, a.y - a.R - 760, a.x + 560, a.y + 140] : [b.x - 180, b.y - 580, b.x + 180, b.y + 40];
    case 'skogul': return [b.x - 300, b.y - 520 - Math.min(200, b.an.z.v), b.x + 300, b.y + 30];
  }
  return [b.x - 100, b.y - 200, b.x + 100, b.y + 40];
}
function spanFor(wd, ht) { const z = Math.min(W / wd, H / ht); return Math.min(W, H) / z; }
function updCam(rdt) {
  if (!P) return;
  let tx = P.x + Math.cos(P.face) * 16, ty = P.y - 24 + Math.sin(P.face) * 10, span = cam.span;
  const b = G.boss;
  if (G.scene.kind === 'arena' && b && !b.dead) {
    const bb = bossBox(b);
    const x0 = Math.min(bb[0], P.x - 80), x1 = Math.max(bb[2], P.x + 80), y0 = Math.min(bb[1], P.y - 80), y1 = Math.max(bb[3], P.y + 60) + 40;
    span = clamp(spanFor((x1 - x0) * 1.06, (y1 - y0) * 1.06), 560, 1560);
    cam.span = lerp(cam.span, span, 1 - Math.exp(-rdt * 1.4)); span = cam.span;
    // hold the giant whole when we can; when we can't, keep the hero in frame and show as much of him as fits
    const z = zoomForSpan(span), vh = H / z / 2, vw = W / z / 2;
    tx = (x0 + x1) / 2; ty = (y0 + y1) / 2;
    ty = Math.max(Math.min(ty, y0 + vh * .96), P.y + 40 - vh * .76); // the hero's feet stay above the boss's name bar
    tx = clamp(tx, P.x + 90 - vw * .96, P.x - 90 + vw * .96);
  }
  if (G.camLock) { tx = G.camLock.x; ty = G.camLock.y; span = G.camLock.span || span; }
  const k = 1 - Math.exp(-rdt * (G.camLock ? 2.4 : 5));
  cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k);
  cam.z = lerp(cam.z, zoomForSpan(span), 1 - Math.exp(-rdt * 2.6));
  const w = G.world, hw = W / 2 / cam.z, hh = H / 2 / cam.z;
  if (w && w.kind !== 'arena') { if (w.w > hw * 2) cam.x = clamp(cam.x, hw - 40, w.w - hw + 40); if (w.h > hh * 2) cam.y = clamp(cam.y, hh - 60, w.h - hh + 40); }
  if (!(isFinite(cam.x) && isFinite(cam.y) && cam.z > 0)) { cam.x = isFinite(tx) ? tx : P.x || 0; cam.y = isFinite(ty) ? ty : P.y || 0; cam.z = zoomForSpan(isFinite(span) && span > 0 ? span : 400); cam.span = 1 / cam.z * Math.min(W, H); }
  cam.shake *= Math.exp(-rdt * 9); if (cam.shake < .05) cam.shake = 0;
  cam.sx = rand(-1, 1) * cam.shake; cam.sy = rand(-1, 1) * cam.shake;
}

/* ---------------- lights ----------------
   a coloured light map multiplied over the scene: ambient tint, plus the glowing
   ground itself, plus every fire, spring and rune. */
function renderLights() {
  const w = G.world; if (!w) return;
  const amb = (w.look && w.look.amb) || [180, 170, 160];
  const lw = LC.width, lh = LC.height, s = lw / W;
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
  lctx.fillStyle = `rgb(${amb[0]},${amb[1]},${amb[2]})`; lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'lighter';
  const z = cam.z * s;
  lctx.setTransform(z, 0, 0, z, (W / 2 - (cam.x + cam.sx) * cam.z) * s, (H / 2 - (cam.y + cam.sy) * cam.z) * s);
  if (w.emis) drawEmissive(lctx, 1.3);
  const pl = { x: P.x, y: P.y - 16, r: w.id === 'iron' ? 280 : 210, i: G.scene.kind === 'hub' ? .25 : w.id === 'iron' ? .5 : .32, col: '#ffe0c0' };
  for (const L of G.lights) { if (!inView(L.x, L.y, L.r)) continue; lctx.globalAlpha = Math.min(1, L.i); lctx.drawImage(glowSprite(L.col || '#ffb070'), L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
  lctx.globalAlpha = pl.i; lctx.drawImage(glowSprite(pl.col), pl.x - pl.r, pl.y - pl.r, pl.r * 2, pl.r * 2);
  lctx.globalAlpha = 1; lctx.globalCompositeOperation = 'source-over'; lctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(LC, 0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'source-over';
}

/* ---------------- render ---------------- */
const _list = [];
function render(rdt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.vig) { drawVignette(rdt); post(); return; }
  if (!G.scene || !G.world || !P) {
    if (G.scene && G.scene.kind === 'title') drawTitle(rdt); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); }
    post(); return;
  }
  G.lights.length = 0; PGLOW.length = 0;
  updCam(rdt); applyCam();
  const w = G.world;
  drawGround(); drawGroundFx(); if (w.id === 'hub') drawHubVoid(); drawVents(); drawDecals();
  if (G.trial) drawTrialRing();
  drawHaz();
  const L = _list; L.length = 0;
  for (const o of w.obst) { const m = o.spr ? Math.max(o.spr.wu, o.spr.hu) * .6 + 40 : o.rect ? (o.x1 - o.x0) / 2 + 120 : 160; if (inView(o.x, o.y - (o.spr ? o.spr.hu * .35 : 40), m)) L.push({ y: o.kind === 'wallN' || o.kind === 'wallS' || o.kind === 'wallW' || o.kind === 'wallE' ? o.y1 : o.y, k: 0, o }); }
  for (const o of w.deco) if (inView(o.x, o.y - 40, 120)) L.push({ y: o.y, k: 1, o });
  if (w.kind === 'realm') for (const n of w.nodes) if (inView(n.x, n.y - 100, 340)) L.push({ y: n.y, k: 2, o: n });
  for (const n of G.npcs) L.push({ y: n.y + (n.perch ? 20 : 0), k: 3, o: n });
  for (const e of G.enemies) if (inView(e.x, e.y, 120)) L.push({ y: e.y, k: 4, o: e });
  L.push({ y: P.y, k: 5, o: P });
  if (G.decoy) L.push({ y: G.decoy.y, k: 6, o: G.decoy });
  if (G.boss) L.push({ y: G.boss.skry ? -1e9 : G.boss.id === 'nidhogg' ? G.boss.hole.y : G.boss.y, k: 7, o: G.boss });
  L.sort((a, b) => a.y - b.y);
  for (const it of L) {
    const o = it.o;
    switch (it.k) {
      case 0:
        if (o.spr) {
          let ta = 1;
          if (o.spr.tree) { const d = Math.hypot(P.x - o.x, (P.y - 20 - (o.y + o.spr.cy)) * 1.25); if (d < o.spr.canopy * .85) ta = lerp(.22, 1, clamp((d - o.spr.canopy * .45) / (o.spr.canopy * .4), 0, 1)); }
          else { const top = o.y + o.spr.oy; if (P.y < o.y - 2 && P.y > top + 20 && Math.abs(P.x - o.x) < o.spr.wu * .4) ta = o.big ? .3 : .5; }
          if (o.ring) ta = Math.min(ta, .9);
          if (o.spr.warp) {
            const sp = o.spr, occ = P && o.y > P.y - 6 && P.x > o.x + sp.ox - 30 && P.x < o.x + sp.ox + sp.wu + 30 && P.y - 30 > o.y + sp.oy - 30;
            if (occ) ta = 1; else ta = Math.max(ta, .3);
            o.fade = lerp(o.fade || 1, ta, .14); const sway = Math.sin(G.t * .55 + o.x * .013) * 5 + Math.sin(G.t * 1.3 + o.y * .02) * 2;
            if (occ) drawTreeCut(o, o.fade, sway); else drawSprWarp(sp, o.x, o.y, o.fade, sway);
            if (sp.e) EMISQ.push({ s: sp, x: o.x, y: o.y, a: o.fade * (occ ? .35 : 1), sway }); }
          else { o.fade = lerp(o.fade || 1, ta, .14); drawSpr(o.spr, o.x, o.y, o.fade); }
          if (o.spr.glowy) { const ly = o.spr.warp ? o.spr.cy * .5 : -40; G.lights.push({ x: o.x, y: o.y + ly, r: o.spr.warp ? 300 : 190, i: .6, col: '#ff7a2a' }); if (!o.spr.warp) glowPost(o.x, o.y - 40, 46, '#ff6a1a', .25); }
        } else if (o.kind) drawHubObst(o);
        break;
      case 1: drawSpr(o.spr, o.x, o.y); break;
      case 2: drawNode(o); break;
      case 3: o.draw(o); break;
      case 4: drawFoe(o); break;
      case 5: for (const gh of P.ghost) drawEinar({ x: gh.x, y: gh.y, vx: 0, vy: 0, face: gh.face, state: 'idle', st: 0, walk: gh.walk, trail: [], flash: 0, shield: 0, freyja: 0, crit: 0, stealth: 0, charge: 0 }, { alpha: .25 * (1 - gh.t / .35) }); drawEinar(P); break;
      case 6: drawDecoy(); break;
      case 7: o.draw(o); break;
    }
  }
  drawProj(); drawParts(false); drawPicks();
  for (const tx of G.texts) { const k = tx.t / tx.life; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = tx.col; ctx.font = `600 ${tx.size}px Cinzel, serif`; ctx.textAlign = 'center'; ctx.fillText(tx.txt, tx.x, tx.y - k * 26); }
  ctx.globalAlpha = 1;
  renderLights();
  applyCam();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .3; drawHaz(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawParts(true); flushEmis(); flushGlowPost(); drawFx();
  if (G.boss && G.boss.id === 'thrym' && P) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55; ctx.drawImage(beamSpr(), P.x - 60, P.y - 560, 120, 590); ctx.restore(); }
  drawMotes();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fc = w.look && w.look.fog; if (fc) { const f = fc[1] * (w.kind === 'arena' ? .35 : 1) * (G.boss && G.boss.blizzard ? 1.4 : 1); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); drawFogLayer(fc[0], f * .7, 900, G.t * 14, G.t * 4); drawFogLayer(fc[0], f * .5, 560, -G.t * 22 + 300, 180); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.lightning > 0) { ctx.fillStyle = `rgba(210,230,255,${G.lightning * .35})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  post();
}
function drawHubVoid() {
  const t = G.t;
  for (let i = 0; i < 40; i++) { const x = (hash2(i, 7) * 2000), y = 1280 + hash2(i, 8) * 220; if (!inView(x, y, 20)) continue; const tw = .5 + .5 * Math.sin(t * (1 + hash2(i, 9) * 3) + i); glow(x, y, 6, '#cfd8ff', tw * .6); }
  for (let i = 0; i < 4; i++) { const x = ((t * 14 + i * 520) % 2400) - 200, y = 1330 + i * 40; if (!inView(x, y, 400)) continue; ctx.globalAlpha = .18; ctx.drawImage(fogTint('#8090c0'), x - 300, y - 90, 600, 180); ctx.globalAlpha = 1; }
}
function post() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!G.vig) ctx.drawImage(VIG, 0, 0, cv.width, cv.height);
  if (GRAINPAT) { const ox = Math.random() * 160 | 0, oy = Math.random() * 160 | 0; ctx.globalAlpha = .045; ctx.setTransform(DPR, 0, 0, DPR, -ox * DPR, -oy * DPR); ctx.fillStyle = GRAINPAT; ctx.fillRect(ox, oy, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; }
  if (G.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(G.flashCol, Math.min(1, G.flash) * .6); ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'source-over'; }
  $('fade').style.opacity = G.fade.toFixed(3);
  $('hurtv').style.opacity = G.hurtV.toFixed(3);
}

/* ---------------- update ---------------- */
function update(dt, rdt) {
  G.t += dt;
  musUpdate(); dlgUpdate(rdt); csUpdate(rdt);
  if (G.fade !== G.fadeTo) { const d = G.fadeTo - G.fade, s = G.fadeSp * rdt; G.fade = Math.abs(d) <= s ? G.fadeTo : G.fade + Math.sign(d) * s; }
  G.flash = Math.max(0, G.flash - rdt * 2.2); G.hurtV = Math.max(0, G.hurtV - rdt * 1.6); G.lightning = Math.max(0, G.lightning - rdt * 2.5);
  if (toastT > 0) { toastT -= rdt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (G.noteT > 0) { G.noteT -= rdt; if (G.noteT <= 0) $('note').classList.remove('on'); }
  if (G.cardOpen) G.cardT += rdt;
  hudUpdate();
  if (G.scene && G.scene.kind === 'title') { if (G.world && P && !G.vig) { updBoss(dt); updParts(dt); updWeather(dt); titleAnim(dt); } return; }
  if (G.vig || !G.world || !P || G.menu || !G.scene) return;
  updPlayer(dt); updDecoy(dt); updEnemies(dt); updBoss(dt); updHaz(dt); updProj(dt); updPicks(dt); updParts(dt); updFx(dt); updNpcs(dt); updTrial(dt); updVents(dt); updWeather(dt); explore(dt);
  for (let i = G.texts.length - 1; i >= 0; i--) { G.texts[i].t += dt; if (G.texts[i].t > G.texts[i].life) G.texts.splice(i, 1); }
  G.interact = findInteract();
  if (IN.act && G.interact) { SFX.ui(); G.interact.fn(); }
  if (P.state === 'dead' && P.st > 1.5 && !G.cs) runCS(deathCS());
  if (G.boss && G.boss.intro === false && !G.boss.dead) hudBoss();
}

let BEAM = null;
function beamSpr() { // a soft shaft of light falling on the hero
  if (BEAM) return BEAM; const c = mkCanvas(64, 256), g = c.getContext('2d'), id = g.createImageData(64, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) { const u = Math.abs(x - 31.5) / 32, v = y / 255, a = Math.pow(1 - u * u, 2) * v * v * (1 - Math.pow(Math.max(0, v - .92) / .08, 2)); const i = (y * 64 + x) * 4; id.data[i] = 225; id.data[i + 1] = 238; id.data[i + 2] = 255; id.data[i + 3] = Math.max(0, a) * 160; }
  g.putImageData(id, 0, 0); return BEAM = c;
}
/* ---------------- the loop ---------------- */
function resetCtx() { // unwind any save()/clip() a thrown frame left behind
  for (const g of [ctx, lctx]) { if (g.reset) g.reset(); else { for (let i = 0; i < 64; i++) g.restore(); } g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0; g.shadowColor = 'transparent'; g.lineDash && g.setLineDash([]); }
  if (!isFinite(cam.x) || !isFinite(cam.y) || !(cam.z > 0)) { cam.x = P ? P.x : 0; cam.y = P ? P.y : 0; cam.z = zoomForSpan(cam.span || 400); }
}
let lastTs = 0;
function frame(ts) {
  const now = ts / 1000; let rdt = lastTs ? now - lastTs : 1 / 60; lastTs = now; rdt = Math.min(rdt, 1 / 20);
  G.rt += rdt;
  if (G.slowT > 0) { G.slowT -= rdt; G.ts = lerp(G.ts, .28, .25); } else G.ts = lerp(G.ts, 1, .12);
  let dt = rdt * G.ts;
  if (G.hitstop > 0) { G.hitstop -= rdt; dt *= .05; }
  boilT += rdt; if (boilT > .1) { boilT = 0; BOIL++; }
  QUAL.acc += rdt; QUAL.n++;
  if (QUAL.acc > 2.5) { const avg = QUAL.acc / QUAL.n; QUAL.acc = 0; QUAL.n = 0; if (G.playing && !G.cs) { if (avg > 1 / 38 && QUAL.cap > 1) { QUAL.cap = Math.max(1, QUAL.cap - .25); resize(); } else if (avg < 1 / 57 && QUAL.cap < QUAL.max) { QUAL.cap = Math.min(QUAL.max, QUAL.cap + .25); resize(); } } }
  try { update(dt, rdt); render(rdt); }
  catch (err) { console.error(err); resetCtx(); }
  clearPresses();
  requestAnimationFrame(frame);
}

/* ---------------- boot ---------------- */
function boot() {
  resize(); addEventListener('resize', resize);
  bindInput();
  $('dlg').addEventListener('pointerdown', e => { if (e.target.closest('#choices')) return; e.preventDefault(); dlgTap(); });
  window.addEventListener('pointerdown', e => {
    audioInit();
    if (G.cardOpen && G.cardT > .5 && !e.target.closest('.panel')) { cardHide(); return; }
    if (DLG.open && !DLG.passive && !e.target.closest('#dlg') && !e.target.closest('.panel') && !e.target.closest('#ctrl')) dlgTap();
  }, true);
  $('tNew').addEventListener('click', () => { audioInit(); SFX.ui(); if (loadSave()) { $('confirm').classList.add('on'); return; } startNew(); });
  $('cYes').addEventListener('click', () => { SFX.ui(); wipeSave(); for (const k in WORLDS) delete WORLDS[k]; G.explored = {}; startNew(); });
  $('cNo').addEventListener('click', () => { SFX.ui(); $('confirm').classList.remove('on'); });
  $('tContinue').addEventListener('click', () => { audioInit(); SFX.ui(); continueGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && AU.ctx) AU.ctx.suspend(); else if (AU.ctx) AU.ctx.resume(); });
  toTitle();
  requestAnimationFrame(frame);
  // a hot-reload hook for the artifact viewer, when present
  try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ save: S })); } catch (e) { }
}
window.EIN = { G, get S() { return S; }, set S(v) { S = v; }, get P() { return P; }, enterRealm, enterArena, enterHub, arenaIntro, runCS, startNew, continueGame, REALMS, BOSS_DEFS, hurtPlayer, grantPower, IN, toTitle, store };
boot();
