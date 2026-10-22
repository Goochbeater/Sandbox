/* =====================================================================
   BOSSES — the jarls of Jötunheim, the Outer King, and a Valkyrie
   Every attack is a generator that yields seconds; telegraphs are hazards.
   ===================================================================== */
function bossHitboxes() { const b = G.boss; if (!b || b.dead || b.intro) return []; return b.hitboxes(b); }
function tgt() { return G.decoy || P; }
function hitBoss(dmg, hx, hy, heavy, hb) {
  const b = G.boss; if (!b || b.dead || b.intro) return;
  if (hb && hb.copy !== undefined) { b.dispel(b, hb.copy); return; }
  if (b.invuln) { SFX.clang(); burst(hx, hy - 20, 8, { type: 'spark', color: '#ffe0a0', add: 1, smin: 80, smax: 220 }); return; }
  dmg *= (b.armor || 1);
  b.hp -= dmg; b.flash = .12;
  G.hitstop = Math.max(G.hitstop, heavy ? .09 : .05); shake(heavy ? 6 : 3);
  SFX.hit(heavy ? 1 : 0);
  ink(hx, hy - 24, heavy ? 14 : 8, b.blood, heavy ? 1.4 : 1);
  burst(hx, hy - 24, heavy ? 12 : 7, { type: 'spark', color: '#fff0d0', add: 1, smin: 120, smax: 380, lmin: .1, lmax: .28, szmin: 1, szmax: 2.4 });
  if (b.phase === 1 && b.hp <= b.maxhp * .5) { b.phase = 2; b.gen = null; b.cd = 0; G.haz = G.haz.filter(h => h.owner !== 'e'); if (b.onPhase2) b.onPhase2(b); }
  if (b.hp <= 0) bossDie();
  hudBoss();
}
function bossDie() {
  const b = G.boss; if (b.dead) return;
  b.dead = true; b.deadT = 0; b.hp = 0; b.gen = null;
  G.haz = []; G.proj = G.proj.filter(p => p.owner === 'p');
  for (const e of G.enemies) if (!e.dead) killEnemy(e, 0);
  G.slowT = 2.2; G.flash = .9; G.flashCol = '#ffffff';
  SFX.roar(b.roarP || .8, 2.6); SFX.boom(); shake(18);
  hudBoss();
  onBossDefeated(b);
}
function updBoss(dt) {
  const b = G.boss; if (!b) return;
  b.t += dt; b.flash = Math.max(0, b.flash - dt);
  for (const k in b.an) { const a = b.an[k]; if (a && a.to !== undefined) { a.v = lerp(a.v, a.to, Math.min(1, dt * (a.sp || 8))); } }
  if (b.dead) { b.deadT += dt; if (b.deadT < 2.5 && Math.random() < .5) { const hb = b.lastHB || { x: b.x, y: b.y }; burst(hb.x + rand(-80, 80), hb.y - rand(0, 220), 3, { type: 'ink', color: b.blood, smin: 30, smax: 120, vzmin: 30, vzmax: 120, g: 400, z: 40 }); } return; }
  if (b.update) b.update(b, dt);
  if (b.intro) return;
  if (b.gen) {
    b.wait -= dt;
    while (b.wait <= 0 && b.gen) { const r = b.gen.next(); if (r.done) { b.gen = null; b.cd = b.rest(b); } else b.wait += r.value || 0; }
  } else {
    b.cd -= dt;
    if (b.cd <= 0 && P.state !== 'dead') { b.gen = b.choose(b); b.wait = 0; }
  }
  const hbs = b.hitboxes(b); if (hbs.length) b.lastHB = hbs[0];
  // touching a jötunn hurts
  if (!b.noTouch) for (const hb of hbs) if (!hb.copy && Math.hypot(P.x - hb.x, P.y - hb.y) < hb.r + P.r - 6) { hurtPlayer(10, hb.x, hb.y, 320); break; }
}
function anim(o) { const r = {}; for (const k in o) r[k] = { v: o[k], to: o[k], sp: 8 }; return r; }
function setA(b, k, to, sp = 8) { b.an[k].to = to; b.an[k].sp = sp; }
function wrand(list) { let s = 0; for (const l of list) s += l[1]; let r = Math.random() * s; for (const l of list) { r -= l[1]; if (r <= 0) return l[0]; } return list[0][0]; }
function arenaPt(minR = 0, maxR = .85) { const a = G.world.arena, an = rand(0, TAU), r = Math.sqrt(rand(minR * minR, maxR * maxR)) * a.R; return [a.x + Math.cos(an) * r, a.y + Math.sin(an) * r]; }
function inArena(x, y, m = 40) { const a = G.world.arena, d = Math.hypot(x - a.x, y - a.y); if (d > a.R - m) { const k = (a.R - m) / d; return [a.x + (x - a.x) * k, a.y + (y - a.y) * k]; } return [x, y]; }

const BOSS_DEFS = {};

/* ---------------------------------------------------------------
   I. ANGRBOÐA — the Hag of the Iron Wood, rooted, wolf-mother
   --------------------------------------------------------------- */
BOSS_DEFS.angr = {
  name: 'Angrboða', title: 'Hag of the Iron Wood · Mother of Wolves', hp: 900, blood: '#2a1206', roarP: .9, music: 'boss',
  norse: 'Hon fœddi þar Fenris kindir.', tr: 'There she bred the brood of Fenrir.',
  setup(b) { b.an = anim({ armL: 0, armR: 0, sweep: 0, mouth: 0, sink: 0, lean: 0, rage: 0 }); },
  hitboxes: b => b.an.sink.v > .5 ? [] : [{ x: b.x, y: b.y - 10, r: 112 }],
  rest: b => b.phase > 1 ? rand(.6, 1) : rand(1.1, 1.6),
  onPhase2(b) { setA(b, 'rage', 1, 2); SFX.roar(.9, 2); shake(12); b.gen = angrScream(b); b.wait = 0; },
  choose(b) {
    const d = Math.hypot(P.x - b.x, P.y - b.y);
    const L = [[angrRoots, 3], [angrThorns, 2.5], [angrSap, 1.6]];
    if (d < 280) L.push([angrClaw, 4]);
    if (b.phase > 1) { L.push([angrWolves, G.enemies.filter(e => !e.dead).length < 3 ? 1.6 : 0]); L.push([angrSink, 1.5]); }
    return wrand(L)(b);
  },
  draw: drawAngr,
};
function* angrScream(b) {
  setA(b, 'mouth', 1, 6); setA(b, 'armL', 1); setA(b, 'armR', 1);
  for (let i = 0; i < 3; i++) { haz({ type: 'ring', x: b.x, y: b.y, r0: 90, r1: 640, w: 36, warn: .5, act: 1.1, dmg: 16, col: '#ff8a2b', style: 'dust' }); yield .9; }
  setA(b, 'mouth', 0); setA(b, 'armL', 0); setA(b, 'armR', 0);
  yield .6;
}
function* angrRoots(b) {
  setA(b, 'armR', 1); setA(b, 'mouth', .5); yield .4;
  const T = tgt(), a = Math.atan2(T.y - b.y, T.x - b.x);
  const lines = b.phase > 1 ? [a - .34, a, a + .34] : [a];
  for (let i = 0; i < 11; i++) {
    for (const la of lines) {
      const d = 80 + i * 56, [x, y] = inArena(b.x + Math.cos(la) * d, b.y + Math.sin(la) * d, 20);
      haz({ x, y, r: 44, warn: .55, dmg: 16, col: '#ff8a2b', style: 'roots', onFire: () => { SFX.hit(1); shake(2); } });
    }
    yield .075;
  }
  setA(b, 'armR', 0); setA(b, 'mouth', 0); yield .7;
}
function* angrClaw(b) {
  const T = tgt(), a = Math.atan2(T.y - b.y, T.x - b.x);
  setA(b, 'armL', 1, 5); setA(b, 'sweep', -1, 4); setA(b, 'lean', Math.cos(a) * .5);
  haz({ type: 'cone', x: b.x, y: b.y, r: 300, ang: a, arc: 2.4, warn: .75, act: .15, dmg: 22, kb: 420, col: '#ffb347', onFire: () => { SFX.swing(.5); shake(6); } });
  yield .7; setA(b, 'sweep', 1, 14); yield .5;
  if (b.phase > 1) {
    const a2 = Math.atan2(tgt().y - b.y, tgt().x - b.x);
    haz({ type: 'cone', x: b.x, y: b.y, r: 300, ang: a2, arc: 2.4, warn: .5, act: .15, dmg: 22, kb: 420, col: '#ffb347', onFire: () => { SFX.swing(.5); shake(6); } });
    setA(b, 'sweep', -1, 14); yield .7;
  }
  setA(b, 'armL', 0); setA(b, 'sweep', 0); setA(b, 'lean', 0); yield .6;
}
function* angrThorns(b) {
  setA(b, 'armL', .7); setA(b, 'armR', .7); setA(b, 'mouth', 1); yield .55;
  const waves = b.phase > 1 ? 3 : 2;
  for (let w = 0; w < waves; w++) {
    const T = tgt(), a = Math.atan2(T.y - b.y, T.x - b.x), n = b.phase > 1 ? 13 : 9, spread = 1.5;
    for (let i = 0; i < n; i++) { const aa = a - spread / 2 + spread * i / (n - 1) + (w % 2 ? spread / (n - 1) / 2 : 0); shoot({ x: b.x + Math.cos(aa) * 70, y: b.y + Math.sin(aa) * 40, vx: Math.cos(aa) * 250, vy: Math.sin(aa) * 250, kind: 'thorn', dmg: 13, life: 3.2, r: 8 }); }
    SFX.swing(.6); yield .55;
  }
  setA(b, 'armL', 0); setA(b, 'armR', 0); setA(b, 'mouth', 0); yield .6;
}
function* angrSap(b) {
  setA(b, 'armR', 1); yield .4;
  const n = b.phase > 1 ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const T = tgt(), [x, y] = i < 2 ? [T.x + rand(-30, 30), T.y + rand(-30, 30)] : inArena(T.x + rand(-220, 220), T.y + rand(-200, 200));
    haz({ type: 'zone', x, y, r: 58, warn: 1, linger: 4.2, dmg: 7, col: '#ff6a1a', glowy: 1, onFire: h => { SFX.fire(); burst(h.x, h.y, 14, { type: 'ember', color: '#ff8a2b', add: 1, smin: 40, smax: 160 }); } });
    shoot({ x: b.x, y: b.y - 120, vx: (x - b.x) / 1, vy: (y - b.y) / 1, kind: 'fire', dmg: 0, life: .98, r: 6, zh: 60 });
    yield .14;
  }
  setA(b, 'armR', 0); yield .8;
}
function* angrWolves(b) {
  setA(b, 'mouth', 1, 6); SFX.roar(1.2, 1.2); yield .5;
  const n = 2 + (Math.random() < .5 ? 1 : 0);
  for (let i = 0; i < n; i++) { const [x, y] = arenaPt(.3, .7); spawnFoe('varg', x, y, { rise: 1, trial: 1 }); burst(x, y, 12, { type: 'ember', color: '#ff7a1a', add: 1, smin: 40, smax: 140 }); }
  yield .6; setA(b, 'mouth', 0); yield .8;
}
function* angrSink(b) {
  setA(b, 'sink', 1, 3); setA(b, 'mouth', 1); SFX.slam(.6); shake(8);
  yield .8;
  for (let i = 0; i < 7; i++) { const T = tgt(); haz({ x: T.x, y: T.y, r: 50, warn: .6, dmg: 14, col: '#ff8a2b', style: 'roots', onFire: () => SFX.hit(1) }); yield .32; }
  const T = tgt(); const [x, y] = inArena(T.x, T.y, 150);
  haz({ x, y, r: 125, warn: 1, dmg: 26, kb: 520, col: '#ffb347', style: 'roots', onFire: () => { SFX.boom(); shake(14); } });
  yield 1; b.x = x; b.y = y; setA(b, 'sink', 0, 6); setA(b, 'mouth', 0);
  haz({ type: 'ring', x, y, r0: 100, r1: 420, w: 32, warn: 0, act: .6, dmg: 12, col: '#ff8a2b' });
  yield 1;
}
/* ---------------------------------------------------------------
   II. ÞRYMR — Lord of the Thursar, frost-bound, roaring
   --------------------------------------------------------------- */
BOSS_DEFS.thrym = {
  name: 'Þrymr', title: 'Lord of the Thursar · Thief of the Hammer', hp: 1150, startY: .05, playerY: .5, blood: '#2a4a6a', roarP: 1, music: 'boss',
  norse: 'Þrymr sat á haugi, þursa dróttinn.', tr: 'Thrym sat on his mound, the lord of the thursar.',
  setup(b) { b.an = anim({ armL: 0, armR: 0, mouth: 0, crouch: 0, lean: 0 }); b.walk = 0; b.moving = false; b.side = 1; },
  hitboxes: b => [{ x: b.x - 70, y: b.y - 30, r: 110 }, { x: b.x + 70, y: b.y - 30, r: 110 }],
  rest: b => b.phase > 1 ? rand(.5, .9) : rand(.9, 1.4),
  onPhase2(b) { b.blizzard = true; SFX.roar(.95, 2.2); shake(14); G.flash = .4; G.flashCol = '#dff6ff'; b.gen = thrymBellow(b); b.wait = 0; ambience('storm'); },
  update(b, dt) {
    const T = tgt(); b.side = T.x < b.x ? -1 : 1;
    if (b.moving) {
      const d = Math.hypot(T.x - b.x, T.y - b.y), sp = b.phase > 1 ? 82 : 62;
      if (d > 170) { b.x += (T.x - b.x) / d * sp * dt; b.y += (T.y - b.y) / d * sp * dt; b.walk += dt * 3.4; if ((b.walk % PI) < dt * 3.4) { SFX.slam(.25); shake(2.5); } }
      [b.x, b.y] = inArena(b.x, b.y, 110);
    }
    if (b.blizzard && P.state !== 'dodge' && !G.lock) { P.x += 34 * dt; collide(P); }
    if (b.moving) { [b.x, b.y] = inArena(b.x, b.y, 150); }
  },
  choose(b) {
    const d = Math.hypot(P.x - b.x, P.y - b.y);
    const L = [[thrymFist, d < 360 ? 3.5 : 1], [thrymPound, 2], [thrymBreath, 2.4], [thrymIcicles, 1.8], [thrymCharge, d > 300 ? 2.6 : 1]];
    if (b.phase > 1) L.push([thrymBoulders, 2]);
    return wrand(L)(b);
  },
  draw: drawThrym,
};
function* thrymBellow(b) { setA(b, 'mouth', 1, 5); setA(b, 'armL', .6); setA(b, 'armR', .6); yield 1.2; haz({ type: 'ring', x: b.x, y: b.y, r0: 80, r1: 700, w: 40, warn: .2, act: 1.3, dmg: 16, col: '#bfe8ff', style: 'ice' }); yield 1; setA(b, 'mouth', 0); setA(b, 'armL', 0); setA(b, 'armR', 0); yield .4; }
function* thrymFist(b) {
  b.moving = true; let t = 0;
  while (Math.hypot(tgt().x - b.x, tgt().y - b.y) > 240 && t < 2.2) { t += .1; yield .1; }
  b.moving = false;
  const s = b.side, k = s > 0 ? 'armR' : 'armL';
  setA(b, k, 1, 6); setA(b, 'crouch', -.3);
  const T = tgt(), px = T.x + (T.vx || 0) * .35, py = T.y + (T.vy || 0) * .35, [x, y] = inArena(px, py, 60);
  haz({ x, y, r: 130, warn: .8, dmg: 22, kb: 460, col: '#9fe0ff', style: 'ice', onFire: () => { SFX.slam(.9); shake(12); } });
  haz({ type: 'ring', x, y, r0: 70, r1: 300, w: 30, warn: .8, act: .5, dmg: 12, col: '#bfe8ff', style: 'ice' });
  b.fistAt = { x, y, s };
  yield .78; setA(b, k, -.4, 16); setA(b, 'crouch', .6, 12); yield .6;
  if (b.phase > 1) {
    const k2 = k === 'armR' ? 'armL' : 'armR'; setA(b, k2, 1, 7); setA(b, k, 0);
    const T2 = tgt(), [x2, y2] = inArena(T2.x, T2.y, 60);
    haz({ x: x2, y: y2, r: 96, warn: .6, dmg: 22, kb: 460, col: '#9fe0ff', style: 'ice', onFire: () => { SFX.slam(.9); shake(12); } });
    yield .6; setA(b, k2, -.4, 16); yield .5; setA(b, k2, 0);
  }
  setA(b, k, 0, 4); setA(b, 'crouch', 0, 4); b.fistAt = null; yield .7;
}
function* thrymPound(b) {
  b.moving = false; setA(b, 'armL', 1, 4); setA(b, 'armR', 1, 4); setA(b, 'mouth', .6); yield 1;
  const n = b.phase > 1 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    haz({ type: 'ring', x: b.x, y: b.y, r0: 90, r1: 760, w: 38, warn: .25, act: 1.5, dmg: 18, kb: 380, col: '#bfe8ff', style: 'ice', onFire: () => { SFX.boom(); shake(16); } });
    haz({ x: b.x, y: b.y, r: 150, warn: .25, dmg: 24, kb: 520, col: '#9fe0ff', style: 'ice' });
    setA(b, 'armL', -.3, 18); setA(b, 'armR', -.3, 18); setA(b, 'crouch', .8, 14);
    yield .75; if (i < n - 1) { setA(b, 'armL', 1, 8); setA(b, 'armR', 1, 8); setA(b, 'crouch', 0, 8); yield .5; }
  }
  setA(b, 'armL', 0, 4); setA(b, 'armR', 0, 4); setA(b, 'crouch', 0, 4); setA(b, 'mouth', 0); yield 1;
}
function* thrymBreath(b) {
  b.moving = false; setA(b, 'mouth', 1, 4); setA(b, 'crouch', -.2); SFX.hiss(); yield .7;
  const T = tgt(), a0 = Math.atan2(T.y - b.y, T.x - b.x), n = b.phase > 1 ? 7 : 5, dir = Math.random() < .5 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const a = a0 + dir * (i - (n - 1) / 2) * .34;
    haz({ type: 'cone', x: b.x, y: b.y - 6, r: 440, ang: a, arc: .55, warn: .45, act: .2, dmg: 15, kb: 200, col: '#bfe8ff', core: '#ffffff' });
    yield .22;
    for (let k = 0; k < 6; k++) part({ x: b.x + Math.cos(a) * 60, y: b.y - 200, vx: Math.cos(a + rand(-.25, .25)) * rand(200, 420), vy: Math.sin(a + rand(-.25, .25)) * rand(200, 420) + 120, life: rand(.6, 1), type: 'smoke', color: '#e8f8ff', size: rand(8, 16), grow: 60, alpha: .45 });
  }
  setA(b, 'mouth', 0); setA(b, 'crouch', 0); yield .9;
}
function* thrymIcicles(b) {
  b.moving = false; setA(b, 'mouth', 1, 6); SFX.roar(1.1, 1); shake(8); yield .5;
  const n = b.phase > 1 ? 18 : 12;
  for (let i = 0; i < n; i++) {
    const T = tgt(), [x, y] = i % 4 === 0 ? [T.x, T.y] : arenaPt(0, .92);
    haz({ x, y, r: 42, warn: 1.1, dmg: 16, col: '#9fe0ff', style: 'ice', onFire: () => SFX.shatter() });
    yield .09;
  }
  setA(b, 'mouth', 0); yield 1;
}
function* thrymCharge(b) {
  b.moving = false; setA(b, 'crouch', .8, 5); setA(b, 'armL', .4); setA(b, 'armR', .4);
  const T = tgt(), a = Math.atan2(T.y - b.y, T.x - b.x), len = 720;
  haz({ type: 'line', x: b.x, y: b.y, ang: a, len, w: 230, warn: .95, act: .55, dmg: 22, kb: 520, col: '#9fe0ff' });
  yield .95; SFX.roar(1.2, .8);
  const sx = b.x, sy = b.y;
  for (let i = 1; i <= 12; i++) { const [nx, ny] = inArena(sx + Math.cos(a) * len * i / 12, sy + Math.sin(a) * len * i / 12, 110); b.x = nx; b.y = ny; b.walk += .4; shake(4); if (i % 3 === 0) burst(b.x, b.y, 6, { type: 'shard', color: '#e8f8ff', smin: 60, smax: 200 }); yield .045; }
  setA(b, 'crouch', 0); setA(b, 'armL', 0); setA(b, 'armR', 0); yield .9;
}
function* thrymBoulders(b) {
  b.moving = false; setA(b, 'armR', 1, 5); yield .6;
  for (let i = 0; i < 3; i++) {
    const T = tgt(), [x, y] = inArena(T.x + rand(-60, 60), T.y + rand(-60, 60), 40);
    haz({ x, y, r: 70, warn: .9, dmg: 20, col: '#9fe0ff', style: 'ice', onFire: h => { SFX.shatter(); shake(6); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; shoot({ x: h.x, y: h.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, kind: 'ice', dmg: 11, life: 1.4 }); } } });
    shoot({ x: b.x, y: b.y - 260, vx: (x - b.x) / .9, vy: (y - b.y + 260) / .9, kind: 'rock', dmg: 0, life: .88, r: 22, zh: 0 });
    setA(b, 'armR', -.3, 16); yield .45; setA(b, 'armR', 1, 8); yield .3;
  }
  setA(b, 'armR', 0); yield .8;
}
/* ---------------------------------------------------------------
   III. NÍÐHÖGGR — the Malice-Striker under the ice
   --------------------------------------------------------------- */
BOSS_DEFS.nidhogg = {
  name: 'Níðhöggr', title: 'The Malice-Striker · Gnawer of Corpses', hp: 1300, playerY: .3, blood: '#1a120c', roarP: .7, music: 'boss',
  norse: 'Þar kømr inn dimmi dreki fljúgandi, naðr fránn, neðan frá Niðafjöllum.', tr: 'There comes the dark dragon flying, the shining serpent, up from the Dark Fells.',
  setup(b) { b.an = anim({ em: 0, bite: 0, mouth: 0, sway: 0, claw: 0 }); b.hole = b.world.holes[0]; b.x = b.hole.x; b.y = b.hole.y; b.tail = null; b.noTouch = true; },
  hitboxes: b => b.an.em.v > .6 ? [{ x: b.hole.x, y: b.hole.y - 20, r: 170 }] : [],
  rest: b => b.phase > 1 ? rand(.3, .6) : rand(.6, 1),
  onPhase2(b) { SFX.roar(.6, 2.4); SFX.thunder(); G.flash = .6; G.flashCol = '#cfe8ff'; shake(12); G.lightning = 1; },
  update(b) { b.x = b.hole.x; b.y = b.hole.y; if (b.phase > 1 && Math.random() < .002) { G.lightning = 1; SFX.thunder(); } },
  choose(b) { b.cycle = (b.cycle || 0) + 1; if (b.an.em.v < .5) return nidEmerge(b); const L = [[nidBite, 3], [nidBile, 2], [nidTail, 2], [nidDive, b.cycle > 3 ? 4 : .5]]; if (b.phase > 1) L.push([nidStorm, 2]); return wrand(L)(b); },
  draw: drawNid,
};
function* nidEmerge(b) {
  b.cycle = 0;
  const holes = b.world.holes.slice().sort((h1, h2) => Math.hypot(h1.x - P.x, h1.y - P.y) - Math.hypot(h2.x - P.x, h2.y - P.y));
  b.hole = Math.random() < .6 ? holes[0] : pick(holes);
  haz({ x: b.hole.x, y: b.hole.y, r: 190, warn: 1.05, dmg: 24, kb: 520, col: '#9fc4d8', style: 'water', onFire: () => { SFX.roar(.7, 1.2); SFX.splash(); shake(12); setA(b, 'em', 1, 7); } });
  for (let i = 0; i < 10; i++) { part({ x: b.hole.x, y: b.hole.y, type: 'ring', color: '#cfe6f2', size: 10, grow: 90, life: .7, lw: 2 }); yield .1; }
  yield .7;
}
function* nidBite(b) {
  const n = b.phase > 1 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const T = tgt(), a = Math.atan2(T.y - b.hole.y, T.x - b.hole.x);
    b.biteA = a; setA(b, 'mouth', 1, 6); setA(b, 'bite', -.3, 5);
    haz({ type: 'line', x: b.hole.x, y: b.hole.y, ang: a, len: 560, w: 130, warn: .65, act: .16, dmg: 25, kb: 480, col: '#e8d8b8', onFire: () => { setA(b, 'bite', 1, 22); SFX.roar(1.4, .5); shake(8); } });
    yield .9; setA(b, 'bite', 0, 5); setA(b, 'mouth', 0); yield .4;
  }
  yield .3;
}
function* nidBile(b) {
  setA(b, 'mouth', 1, 5); yield .5;
  for (let i = 0; i < (b.phase > 1 ? 7 : 5); i++) {
    const T = tgt(), [x, y] = i === 0 ? [T.x, T.y] : inArena(T.x + rand(-200, 200), T.y + rand(-200, 200));
    haz({ type: 'zone', x, y, r: 60, warn: .9, linger: 4.5, dmg: 7, col: '#9adf4a', slow: 1, onFire: h => { SFX.splash(); burst(h.x, h.y, 10, { type: 'dot', color: '#b8ff6a', smin: 40, smax: 120 }); } });
    shoot({ x: b.hole.x, y: b.hole.y - 260, vx: (x - b.hole.x) / .9, vy: (y - b.hole.y + 260) / .9, kind: 'bile', dmg: 0, life: .88, r: 8, zh: 0 });
    yield .15;
  }
  setA(b, 'mouth', 0); yield .8;
}
function* nidTail(b) {
  const holes = b.world.holes.filter(h => h !== b.hole).sort((h1, h2) => Math.hypot(h1.x - P.x, h1.y - P.y) - Math.hypot(h2.x - P.x, h2.y - P.y));
  const h = holes[0];
  b.tail = { x: h.x, y: h.y, t: 0, up: 0 };
  haz({ x: h.x, y: h.y, r: 200, warn: .9, dmg: 20, kb: 520, col: '#e8d8b8', style: 'water', onFire: () => { b.tail.up = 1; SFX.swing(.4); shake(8); } });
  yield 1.6; b.tail = null; yield .3;
}
function* nidDive(b) {
  setA(b, 'em', 0, 4); SFX.splash(); yield .9;
  for (let i = 0; i < (b.phase > 1 ? 9 : 6); i++) {
    const T = tgt();
    haz({ x: T.x, y: T.y, r: 54, warn: .6, dmg: 15, col: '#9fc4d8', style: 'ice', onFire: () => SFX.shatter() });
    yield .3;
  }
  b.cd = 0; yield .3;
}
function* nidStorm(b) {
  SFX.thunder(); G.lightning = 1;
  for (let i = 0; i < 12; i++) {
    const T = tgt(), [x, y] = i % 3 === 0 ? [T.x, T.y] : arenaPt(0, .9);
    haz({ x, y, r: 52, warn: 1, dmg: 18, col: '#bfe3ff', style: 'bolt', onFire: () => { SFX.zap(); G.lightning = Math.max(G.lightning, .6); } });
    yield .12;
  }
  yield 1;
}
/* ---------------------------------------------------------------
   IV. SURTR — the Black One, at the forge of the end
   --------------------------------------------------------------- */
BOSS_DEFS.surtr = {
  name: 'Surtr', title: 'The Black One · Warden of Múspell', hp: 1500, blood: '#ff6a1a', roarP: .7, music: 'boss',
  norse: 'Surtr ferr sunnan með sviga lævi.', tr: 'Surtr comes from the south with the bane of branches.',
  setup(b) {
    b.an = anim({ ham: 0, sword: 0, crouch: 0, air: 0 });
    const a = b.world.arena; b.anvil = { x: a.x, y: a.y - 150 }; b.x = a.x; b.y = a.y - 250;
    b.swords = []; for (let i = 0; i < 14; i++) { const an = i / 14 * TAU + .1; b.swords.push({ x: a.x + Math.cos(an) * (a.R - 50), y: a.y + Math.sin(an) * (a.R - 50), live: 1, lift: 0 }); }
    b.lavaR = a.R; b.side = 1;
  },
  hitboxes: b => b.an.air.v > .3 ? [] : [{ x: b.x, y: b.y - 8, r: 108 }],
  rest: b => b.phase > 1 ? rand(.5, .8) : rand(.9, 1.3),
  onPhase2(b) { SFX.roar(.6, 2.5); shake(14); G.flash = .5; G.flashCol = '#ffb070'; b.gen = surtrRise(b); b.wait = 0; },
  update(b, dt) {
    const a = b.world.arena;
    b.side = P.x < b.x ? -1 : 1;
    if (b.phase > 1) {
      b.lavaR = Math.max(a.R * .68, b.lavaR - dt * 9);
      const d = Math.hypot(P.x - a.x, P.y - a.y);
      if (d > b.lavaR - 10 && P.state !== 'dodge') { P.burnT -= dt; if (P.burnT <= 0) { P.burnT = .4; hurtPlayer(10, a.x, a.y, -260); SFX.fire(); } }
      if (b.chase) { const T = tgt(), dd = Math.hypot(T.x - b.x, T.y - b.y); if (dd > 200) { b.x += (T.x - b.x) / dd * 70 * dt; b.y += (T.y - b.y) / dd * 70 * dt; [b.x, b.y] = inArena(b.x, b.y, 140); } }
    }
    for (const s of b.swords) if (s.lift > 0) s.lift = Math.max(0, s.lift - dt);
  },
  choose(b) {
    const L = [[surtrSweep, 3], [surtrLines, 2.5], [surtrRain, 1.8], [surtrSwords, b.swords.some(s => s.live) ? 2 : 0]];
    if (b.phase === 1) L.push([surtrAnvil, 2.6]); else { L.push([surtrLeap, 2.4]); b.chase = true; }
    return wrand(L)(b);
  },
  draw: drawSurtr,
};
function* surtrRise(b) {
  setA(b, 'ham', 1, 4); yield .8;
  haz({ type: 'ring', x: b.anvil.x, y: b.anvil.y, r0: 60, r1: 760, w: 40, warn: .2, act: 1.4, dmg: 18, col: '#ff8a2b', style: 'fire', onFire: () => { SFX.boom(); shake(18); } });
  setA(b, 'ham', -.3, 18); yield .5; b.anvilBroken = true; burst(b.anvil.x, b.anvil.y - 30, 40, { type: 'spark', color: '#ffd27a', add: 1, smin: 100, smax: 500 });
  setA(b, 'ham', 0, 4); yield 1;
}
function* surtrAnvil(b) {
  setA(b, 'ham', 1, 4); yield .85;
  setA(b, 'ham', -.3, 20); SFX.clang(); SFX.slam(1); shake(14);
  haz({ type: 'ring', x: b.anvil.x, y: b.anvil.y, r0: 60, r1: 760, w: 36, warn: 0, act: 1.3, dmg: 16, col: '#ff8a2b', style: 'fire' });
  for (let i = 0; i < 22; i++) { const a = rand(0, TAU), s = rand(160, 340); shoot({ x: b.anvil.x, y: b.anvil.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: 'spark', dmg: 10, life: rand(1.4, 2.4), r: 6 }); }
  burst(b.anvil.x, b.anvil.y - 30, 40, { type: 'spark', color: '#ffd27a', add: 1, smin: 100, smax: 500 });
  yield .7; setA(b, 'ham', 0, 4); yield .6;
}
function* surtrSweep(b) {
  const T = tgt(), a = Math.atan2(T.y - b.y, T.x - b.x);
  setA(b, 'sword', -1, 3); setA(b, 'crouch', .3);
  haz({ type: 'cone', x: b.x, y: b.y, r: 560, ang: a, arc: 2.1, warn: 1.05, act: .2, dmg: 26, kb: 520, col: '#ff7a1a', core: '#ffe7a0', onFire: () => { SFX.swing(.4); SFX.fire(); shake(10); setA(b, 'sword', 1, 22); } });
  yield 1.5;
  if (b.phase > 1) {
    const a2 = Math.atan2(tgt().y - b.y, tgt().x - b.x);
    haz({ type: 'cone', x: b.x, y: b.y, r: 560, ang: a2, arc: 2.1, warn: .7, act: .2, dmg: 26, kb: 520, col: '#ff7a1a', core: '#ffe7a0', onFire: () => { SFX.swing(.4); shake(10); setA(b, 'sword', -1, 22); } });
    yield 1.1;
  }
  setA(b, 'sword', 0, 4); setA(b, 'crouch', 0); yield .6;
}
function* surtrLines(b) {
  setA(b, 'sword', 1.4, 5); setA(b, 'crouch', .7, 5); yield .6;
  SFX.slam(.7); shake(8);
  const T = tgt(), a0 = Math.atan2(T.y - b.y, T.x - b.x), n = b.phase > 1 ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i - (n - 1) / 2) * (b.phase > 1 ? .3 : .38);
    haz({ type: 'line', x: b.x, y: b.y, ang: a, len: 900, w: 56, warn: .85 + i * .04, act: .35, dmg: 20, kb: 300, col: '#ff6a1a', core: '#fff0b0', onFire: () => SFX.fire() });
  }
  yield 1.4; setA(b, 'sword', 0, 4); setA(b, 'crouch', 0); yield .6;
}
function* surtrRain(b) {
  setA(b, 'ham', .8, 4); yield .4;
  for (let i = 0; i < (b.phase > 1 ? 16 : 11); i++) {
    const T = tgt(), [x, y] = i % 3 === 0 ? [T.x, T.y] : arenaPt(0, b.lavaR / b.world.arena.R * .9);
    haz({ x, y, r: 50, warn: 1.2, dmg: 16, col: '#ff7a1a', style: 'fire', onFire: h => { SFX.fire(); haz({ type: 'zone', x: h.x, y: h.y, r: 44, warn: 0, linger: 2.6, dmg: 6, col: '#ff5a1a', glowy: 1 }); } });
    yield .1;
  }
  setA(b, 'ham', 0); yield 1;
}
function* surtrSwords(b) {
  const live = b.swords.filter(s => s.live).sort(() => Math.random() - .5).slice(0, b.phase > 1 ? 6 : 4);
  setA(b, 'ham', .5); SFX.roar(.8, .8);
  for (const s of live) {
    s.lift = .7;
    yield .28;
    s.live = 0; const T = tgt(), a = Math.atan2(T.y - s.y, T.x - s.x);
    shoot({ x: s.x, y: s.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, kind: 'sword', dmg: 17, life: 3, r: 12, home: .9 });
    SFX.swing(.7);
  }
  setA(b, 'ham', 0); yield .9;
}
function* surtrLeap(b) {
  setA(b, 'crouch', .8, 6); yield .4;
  setA(b, 'air', 1, 5); SFX.roar(.7, .8); yield .7;
  const sh = { t: 0 };
  for (let i = 0; i < 10; i++) { const T = tgt(); b.x = lerp(b.x, T.x, .35); b.y = lerp(b.y, T.y, .35); yield .1; }
  [b.x, b.y] = inArena(b.x, b.y, 140);
  haz({ x: b.x, y: b.y, r: 150, warn: .65, dmg: 30, kb: 560, col: '#ff7a1a', style: 'fire', onFire: () => { SFX.boom(); shake(18); setA(b, 'air', 0, 30); setA(b, 'crouch', 1, 20); } });
  haz({ type: 'ring', x: b.x, y: b.y, r0: 120, r1: 520, w: 34, warn: .65, act: .7, dmg: 14, col: '#ff8a2b', style: 'fire' });
  yield 1.2; setA(b, 'crouch', 0, 4); yield .6;
}
/* ---------------------------------------------------------------
   V. ÚTGARÐA-LOKI — the Outer King; and beneath him, Skrýmir
   --------------------------------------------------------------- */
BOSS_DEFS.utgard = {
  name: 'Útgarða-Loki', title: 'King of the Outer Yard · Weaver of Lies', hp: 1800, blood: '#2a5a1a', roarP: .9, music: 'final',
  norse: 'Nú skal segja þér it sanna.', tr: 'Now I shall tell you the truth.',
  setup(b) { b.an = anim({ cast: 0, laugh: 0, fade: 1, rise: 0, hL: 0, hR: 0, mouth: 0 }); b.copies = []; b.hands = []; b.skry = false; b.noTouch = false; },
  hitboxes(b) {
    if (b.skry) return b.hands.filter(h => h.rest > 0).map(h => ({ x: h.x, y: h.y, r: 96 }));
    const L = b.an.fade.v > .5 ? [{ x: b.x, y: b.y - 6, r: 46 }] : [];
    b.copies.forEach((c, i) => { if (c.live) L.push({ x: c.x, y: c.y - 6, r: 46, copy: i }); });
    return L;
  },
  dispel(b, i) { const c = b.copies[i]; if (!c || !c.live) return; c.live = 0; SFX.trick(); burst(c.x, c.y - 40, 18, { type: 'smoke', color: '#5aff6a', smin: 30, smax: 120, lmin: .4, lmax: .9, szmin: 6, szmax: 12, grow: 20, alpha: .4 }); G.hitstop = .04; },
  rest: b => b.skry ? rand(.6, 1) : b.phase > 1 ? rand(.5, .8) : rand(.8, 1.2),
  onPhase2(b) { b.gen = utgardTransform(b); b.wait = 0; },
  update(b, dt) { for (const h of b.hands) { h.rest = Math.max(0, h.rest - dt); h.t += dt; } },
  choose(b) {
    if (b.skry) return wrand([[skryFist, 3], [skrySweep, 2], [skryFlood, 2], [skryCoil, 1.6]])(b);
    const L = [[utMirror, b.copies.filter(c => c.live).length ? .6 : 3], [utLogi, 2.4], [utHugi, 2.2], [utElli, 1.6], [utFan, 2]];
    return wrand(L)(b);
  },
  draw: drawUtgard,
};
function utTeleport(b, x, y) {
  burst(b.x, b.y - 50, 16, { type: 'smoke', color: '#3aff5a', smin: 30, smax: 120, lmin: .4, lmax: .8, szmin: 6, szmax: 12, grow: 20, alpha: .35 });
  b.x = x; b.y = y; SFX.trick();
  burst(b.x, b.y - 50, 16, { type: 'smoke', color: '#3aff5a', smin: 30, smax: 120, lmin: .4, lmax: .8, szmin: 6, szmax: 12, grow: 20, alpha: .35 });
}
function* utMirror(b) {
  setA(b, 'cast', 1, 6); setA(b, 'laugh', 1); yield .5;
  const a = G.world.arena, base = rand(0, TAU), n = b.phase > 1 ? 4 : 3, spots = [];
  for (let i = 0; i <= n; i++) { const an = base + i / (n + 1) * TAU; spots.push([a.x + Math.cos(an) * 320, a.y + Math.sin(an) * 280]); }
  const ri = randi(0, n);
  utTeleport(b, spots[ri][0], spots[ri][1]);
  b.copies = spots.filter((_, i) => i !== ri).map(s => ({ x: s[0], y: s[1], live: 1, ph: rand(0, TAU) }));
  yield .6; setA(b, 'laugh', 0);
  for (let w = 0; w < 3; w++) {
    const shooters = [{ x: b.x, y: b.y }].concat(b.copies.filter(c => c.live));
    for (const s of shooters) { const T = tgt(), an = Math.atan2(T.y - s.y, T.x - s.x); shoot({ x: s.x, y: s.y - 30, vx: Math.cos(an) * 200, vy: Math.sin(an) * 200, kind: 'illusion', dmg: 12, life: 3.4, r: 9, home: .5 }); }
    SFX.fire(); yield .9;
  }
  setA(b, 'cast', 0); yield .4;
}
function* utLogi(b) {
  setA(b, 'cast', 1, 6); yield .5;
  let x = b.x, y = b.y;
  for (let i = 0; i < (b.phase > 1 ? 22 : 16); i++) {
    const T = tgt(), a = Math.atan2(T.y - y, T.x - x) + Math.sin(i * .7) * .5;
    x += Math.cos(a) * 56; y += Math.sin(a) * 56; [x, y] = inArena(x, y, 30);
    haz({ x, y, r: 42, warn: .5, dmg: 15, col: '#9cff4a', style: 'fire', onFire: h => { SFX.fire(); haz({ type: 'zone', x: h.x, y: h.y, r: 36, warn: 0, linger: 1.8, dmg: 6, col: '#7aff3a', glowy: 1 }); } });
    yield .11;
  }
  setA(b, 'cast', 0); yield .7;
}
function* utHugi(b) {
  setA(b, 'laugh', 1); yield .4;
  const a = G.world.arena;
  for (let i = 0; i < (b.phase > 1 ? 6 : 4); i++) {
    const T = tgt(), an = rand(0, TAU), ox = T.x - Math.cos(an) * 700, oy = T.y - Math.sin(an) * 700;
    haz({ type: 'line', x: ox, y: oy, ang: an, len: 1400, w: 70, warn: .6, act: .12, dmg: 18, kb: 400, col: '#e6f0ff', core: '#ffffff', onFire: h => { SFX.spear(); G.fx.push({ t: 0, life: .35, x: h.x, y: h.y, a: h.ang, draw: fxHugi }); } });
    yield .5;
  }
  setA(b, 'laugh', 0); yield .8;
}
function fxHugi(f) {
  const k = f.t / f.life, d = k * 1400, x = f.x + Math.cos(f.a) * d, y = f.y + Math.sin(f.a) * d;
  for (let i = 0; i < 6; i++) { const dd = d - i * 30, xx = f.x + Math.cos(f.a) * dd, yy = f.y + Math.sin(f.a) * dd; ctx.fillStyle = `rgba(220,240,255,${.5 - i * .08})`; ctx.beginPath(); ctx.ellipse(xx, yy - 26, 10, 26, 0, 0, TAU); ctx.fill(); }
  glow(x, y - 26, 40, '#e6f0ff', .8);
}
function* utElli(b) {
  setA(b, 'cast', 1, 5); yield .6;
  for (let i = 0; i < 5; i++) {
    const T = tgt(), [x, y] = inArena(T.x + rand(-160, 160), T.y + rand(-140, 140));
    haz({ type: 'zone', x, y, r: 80, warn: .9, linger: 4.5, dmg: 5, col: '#a8a49a', slow: 1 });
    yield .2;
  }
  setA(b, 'cast', 0); yield .6;
}
function* utFan(b) {
  const a = G.world.arena; const [nx, ny] = arenaPt(.2, .6); utTeleport(b, nx, ny);
  setA(b, 'cast', 1, 8); yield .45;
  for (let w = 0; w < 2; w++) {
    const T = tgt(), an = Math.atan2(T.y - b.y, T.x - b.x);
    for (let i = -3; i <= 3; i++) shoot({ x: b.x, y: b.y - 30, vx: Math.cos(an + i * .2) * 260, vy: Math.sin(an + i * .2) * 260, kind: 'illusion', dmg: 13, life: 2.6, r: 9 });
    SFX.fire(); yield .55;
  }
  setA(b, 'cast', 0); yield .5;
}
function* utgardTransform(b) {
  b.invuln = true; b.copies = [];
  G.haz = []; G.proj = G.proj.filter(p => p.owner === 'p');
  G.lock = true;
  setA(b, 'laugh', 1, 4);
  yield .4;
  showLine('utgard', 'Still swinging? Little man. Look down.');
  yield 2.6;
  showLine('utgard', 'You have been standing in my hand since you came through the gate.');
  yield 3;
  hideLine();
  SFX.roar(.45, 3.2); SFX.boom(); shake(26); G.flash = 1; G.flashCol = '#d8ffb0';
  setA(b, 'fade', 0, 3);
  yield 1.2;
  b.skry = true; b.noTouch = true; setA(b, 'rise', 1, 1.2); cam.span = 1250;
  b.hp = b.maxhp * .5; b.armor = .9;
  yield 2.2;
  G.lock = false; b.invuln = false;
  hudBossName('Skrýmir · The Outer King Unmasked');
}
function skryFace(b) { const a = G.world.arena; return { x: a.x, y: a.y - a.R - 340 }; }
function* skryFist(b) {
  const T = tgt(), side = T.x < G.world.arena.x ? -1 : 1, [x, y] = inArena(T.x, T.y, 80);
  const h = { x, y, side, t: 0, rest: 0, down: 0 };
  b.hands = b.hands.filter(q => q.side !== side); b.hands.push(h);
  setA(b, side < 0 ? 'hL' : 'hR', 1, 3); setA(b, 'mouth', .4);
  haz({ x, y, r: 155, warn: 1.25, dmg: 30, kb: 600, col: '#c8ff8a', style: 'dust', onFire: () => { SFX.boom(); shake(22); h.down = 1; h.rest = 2.8; burst(x, y, 30, { type: 'smoke', color: '#8a9a7a', smin: 60, smax: 260, lmin: .5, lmax: 1.2, szmin: 10, szmax: 24, grow: 40, flat: .6 }); } });
  haz({ type: 'ring', x, y, r0: 130, r1: 520, w: 34, warn: 1.25, act: .7, dmg: 14, col: '#c8ff8a' });
  yield 1.3; setA(b, 'mouth', 0); yield 2.6; h.down = 0; setA(b, side < 0 ? 'hL' : 'hR', 0, 3); yield .6;
}
function* skrySweep(b) {
  const a = G.world.arena, fromLeft = Math.random() < .5, gapY = rand(-.5, .5) * a.R;
  setA(b, fromLeft ? 'hL' : 'hR', .6, 3);
  haz({ type: 'wall', x: a.x + (fromLeft ? -a.R - 60 : a.R + 60), y: a.y, ang: fromLeft ? 0 : PI, spd: 560, len: a.R * 2.2, w: 90, gaps: [[fromLeft ? gapY : -gapY, 150]], warn: 1.2, act: 3, dmg: 24, kb: 400, col: '#a8c890', onFire: () => { SFX.swing(.3); shake(8); } });
  yield 3.6; setA(b, fromLeft ? 'hL' : 'hR', 0); yield .4;
}
function* skryFlood(b) {
  const a = G.world.arena; setA(b, 'mouth', 1, 3);
  showLine('utgard', 'Drink, then. The horn’s other end is in the sea.');
  yield 1;
  for (let i = 0; i < 3; i++) {
    const g1 = rand(-.6, .6) * a.R;
    haz({ type: 'wall', x: a.x, y: a.y - a.R - 60, ang: PI / 2, spd: 420, len: a.R * 2.2, w: 70, gaps: [[-g1, 170]], warn: .9, act: 3.6, dmg: 20, kb: 360, col: '#6fb0d8', onFire: () => SFX.splash() });
    yield 1.4;
  }
  hideLine(); setA(b, 'mouth', 0); yield 2.4;
}
function* skryCoil(b) {
  const a = G.world.arena;
  showLine('utgard', 'And my cat. You remember my cat.');
  yield .8;
  const a0 = rand(0, TAU), dir = Math.random() < .5 ? 1 : -1, n = 14;
  for (let i = 0; i < n; i++) {
    const an = a0 + dir * i * .42;
    haz({ type: 'line', x: a.x, y: a.y, ang: an, len: a.R, w: 80, warn: .75, act: .2, dmg: 20, kb: 400, col: '#9adf6a', core: '#e8ffd0', onFire: () => SFX.swing(.4) });
    yield .2;
  }
  hideLine(); yield 1;
}
/* ---------------------------------------------------------------
   VI. SKÖGUL — Queen of the Choosers (hidden)
   --------------------------------------------------------------- */
BOSS_DEFS.skogul = {
  name: 'Skögul', title: 'Chooser of the Slain · Queen of the Valkyries', hp: 1400, blood: '#c8b070', roarP: 1.6, music: 'sky',
  norse: 'Skuld helt skildi, en Skögul önnur.', tr: 'Skuld held a shield, and Skögul another.',
  setup(b) { b.an = anim({ z: 0, wing: 0, spear: 0, shield: 0 }); b.noTouch = true; b.face = PI / 2; b.vx = 0; b.vy = 0; },
  hitboxes: b => b.an.z.v < 60 ? [{ x: b.x, y: b.y - 4, r: 40 }] : [],
  rest: b => b.phase > 1 ? rand(.35, .7) : rand(.7, 1.1),
  onPhase2(b) { SFX.roar(1.8, 1.4); G.flash = .6; G.flashCol = '#fff2d0'; shake(10); showLine('skogul', 'Sisters! To me!'); setTimeout(hideLine, 2400); },
  update(b, dt) {
    const T = tgt(); b.face = Math.atan2(T.y - b.y, T.x - b.x);
    if (b.drift) { const d = Math.hypot(T.x - b.x, T.y - b.y); if (d > 220) { b.x += (T.x - b.x) / d * 120 * dt; b.y += (T.y - b.y) / d * 120 * dt; } else if (d < 140) { b.x -= (T.x - b.x) / d * 90 * dt; b.y -= (T.y - b.y) / d * 90 * dt; } [b.x, b.y] = inArena(b.x, b.y, 60); }
  },
  choose(b) {
    b.drift = true;
    const d = Math.hypot(P.x - b.x, P.y - b.y);
    const L = [[skDash, 3], [skDive, 2.2], [skFeathers, 2.4], [skSpears, 1.8]];
    if (d < 170) L.push([skBash, 3.4]);
    if (b.phase > 1) L.push([skSisters, 1.8]);
    return wrand(L)(b);
  },
  draw: drawSkogul,
};
function* skDash(b) {
  b.drift = false; const n = b.phase > 1 ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const T = tgt(), a = Math.atan2(T.y - b.y, T.x - b.x), len = Math.min(640, Math.hypot(T.x - b.x, T.y - b.y) + 220);
    setA(b, 'spear', 1, 8); setA(b, 'z', 24, 6);
    haz({ type: 'line', x: b.x, y: b.y, ang: a, len, w: 74, warn: .55, act: .22, dmg: 22, kb: 440, col: '#ffe6a0', core: '#ffffff' });
    yield .55; SFX.spear();
    const sx = b.x, sy = b.y;
    for (let k = 1; k <= 8; k++) { [b.x, b.y] = inArena(sx + Math.cos(a) * len * k / 8, sy + Math.sin(a) * len * k / 8, 50); part({ x: b.x, y: b.y - 30, type: 'feather', color: '#ffffff', size: 2.4, life: .8, vx: rand(-40, 40), vy: rand(-40, 40) }); yield .028; }
    setA(b, 'spear', 0, 6); yield .3;
  }
  setA(b, 'z', 0, 4); yield .5;
}
function* skDive(b) {
  b.drift = false; setA(b, 'z', 700, 2.4); setA(b, 'wing', 1, 6); SFX.roar(1.8, .6); yield 1;
  for (let i = 0; i < 12; i++) { const T = tgt(); b.x = lerp(b.x, T.x, .4); b.y = lerp(b.y, T.y, .4); yield .1; }
  haz({ x: b.x, y: b.y, r: 130, warn: .65, dmg: 26, kb: 560, col: '#ffe6a0', style: 'gold', onFire: () => { SFX.boom(); shake(16); setA(b, 'z', 0, 40); burst(b.x, b.y, 24, { type: 'feather', color: '#ffffff', smin: 60, smax: 240, lmin: .8, lmax: 1.4, szmin: 2, szmax: 3.4 }); } });
  haz({ type: 'ring', x: b.x, y: b.y, r0: 110, r1: 420, w: 30, warn: .65, act: .6, dmg: 14, col: '#ffe6a0' });
  yield 1.1; setA(b, 'wing', 0, 3); yield .4;
}
function* skFeathers(b) {
  b.drift = false; setA(b, 'z', 70, 4); setA(b, 'wing', 1, 8); yield .5;
  const rings = b.phase > 1 ? 4 : 3;
  for (let r = 0; r < rings; r++) {
    const n = 18, off = r * .17 + (b.phase > 1 ? b.t * .3 : 0);
    for (let i = 0; i < n; i++) { const a = off + i / n * TAU; shoot({ x: b.x, y: b.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, kind: 'feather', dmg: 11, life: 3, r: 7, zh: 40 }); }
    SFX.swing(1.4); yield .55;
  }
  setA(b, 'z', 0, 4); setA(b, 'wing', 0, 3); yield .5;
}
function* skSpears(b) {
  setA(b, 'spear', 1, 4); yield .4;
  const T = tgt();
  for (let i = 0; i < (b.phase > 1 ? 11 : 8); i++) {
    const [x, y] = i === 0 ? [T.x, T.y] : inArena(T.x + rand(-230, 230), T.y + rand(-200, 200));
    haz({ x, y, r: 46, warn: .95, dmg: 17, col: '#ffe6a0', style: 'gold', onFire: h => { SFX.spear(); G.fx.push({ t: 0, life: .3, x: h.x, y: h.y, draw: fxSpearDrop }); } });
    yield .08;
  }
  setA(b, 'spear', 0, 4); yield 1;
}
function fxSpearDrop(f) { const k = f.t / f.life; ctx.strokeStyle = `rgba(255,240,200,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.x, f.y - 400 * (1 - k) - 80); ctx.lineTo(f.x, f.y); ctx.stroke(); }
function* skBash(b) {
  b.drift = false;
  for (let i = 0; i < 2; i++) {
    const T = tgt(), a = Math.atan2(T.y - b.y, T.x - b.x);
    setA(b, 'shield', 1, 10);
    haz({ type: 'cone', x: b.x, y: b.y, r: 140, ang: a, arc: 1.7, warn: .42, act: .14, dmg: 18, kb: 480, col: '#ffe6a0', onFire: () => { SFX.clang(); b.x += Math.cos(a) * 40; b.y += Math.sin(a) * 40; } });
    yield .62; setA(b, 'shield', 0, 8);
  }
  yield .4;
}
function* skSisters(b) {
  for (let i = 0; i < 5; i++) {
    const T = tgt(), [x, y] = i % 2 ? [T.x, T.y] : inArena(T.x + rand(-160, 160), T.y + rand(-160, 160));
    haz({ x, y, r: 92, warn: .9, dmg: 20, kb: 460, col: '#ffe6a0', style: 'gold', onFire: h => { SFX.boom(); shake(8); G.fx.push({ t: 0, life: .5, x: h.x, y: h.y, draw: fxSister }); } });
    G.fx.push({ t: 0, life: .9, x, y, draw: fxSisterFall });
    yield .35;
  }
  yield .8;
}
function fxSisterFall(f) { const k = f.t / f.life; ctx.save(); ctx.globalAlpha = .6 * k; ctx.globalCompositeOperation = 'lighter'; drawValkyrie(f.x, f.y - (1 - k) * 600 - 40, 1.4, f.t * 10, 1, false, true); ctx.restore(); }
function fxSister(f) { const k = f.t / f.life; glow(f.x, f.y - 20, 120 * (1 - k * .5), '#ffe6a0', 1 - k); }
