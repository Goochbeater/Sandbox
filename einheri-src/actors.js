/* =====================================================================
   ACTORS — particles, hazards, projectiles, Einar, the foes, pickups,
   god-powers, landmarks
   ===================================================================== */

/* ---------------- particles ---------------- */
function part(o) {
  const p = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: 1, t: 0, size: 3, color: '#ffffff', type: 'dot', add: 0, rot: 0, vr: 0, grow: 0 };
  for (const k in o) p[k] = o[k];
  if (G.parts.length > 700) G.parts.splice(0, 60);
  G.parts.push(p); return p;
}
function burst(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    const a = o.ang !== undefined ? o.ang + rand(-(o.spread || .5), o.spread || .5) : rand(0, TAU);
    const s = rand(o.smin || 40, o.smax || 160);
    const p = {};
    for (const k in o) p[k] = o[k];
    p.x = x + rand(-(o.jit || 0), o.jit || 0); p.y = y + rand(-(o.jit || 0), o.jit || 0) * .6;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * (o.flat || 1);
    p.life = rand(o.lmin || .3, o.lmax || .75); p.size = rand(o.szmin || 1.5, o.szmax || 3.5);
    if (o.vzmin !== undefined) p.vz = rand(o.vzmin, o.vzmax);
    p.rot = rand(0, TAU); p.vr = rand(-8, 8);
    part(p);
  }
}
function ink(x, y, n, col, power = 1) { // ink-blood: arcs up, lands, leaves a stain
  burst(x, y, n, { type: 'ink', color: col, smin: 40 * power, smax: 190 * power, vzmin: 40, vzmax: 160 * power, g: 520, lmin: .5, lmax: 1.1, szmin: 1.6, szmax: 4.2, z: 10 });
}
function updParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.t += dt;
    if (p.t >= p.life) { G.parts.splice(i, 1); continue; }
    if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.g) { p.vz -= p.g * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; if (p.type === 'ink') { decal(p.x, p.y, p.size * rand(1.4, 2.6), p.color); G.parts.splice(i, 1); continue; } p.vz *= -.3; p.vx *= .6; p.vy *= .6; } }
    if (p.type === 'smoke') p.size += p.grow * dt;
  }
}
function drawParts(addPass) {
  for (const p of G.parts) {
    if (!!p.add !== addPass) continue;
    const k = 1 - p.t / p.life, y = p.y - p.z;
    switch (p.type) {
      case 'spark': {
        const l = Math.hypot(p.vx, p.vy) * .035 + 2;
        const a = Math.atan2(p.vy, p.vx);
        ctx.strokeStyle = hexA(p.color, k); ctx.lineWidth = p.size * k + .4;
        ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x - Math.cos(a) * l, y - Math.sin(a) * l); ctx.stroke();
        break;
      }
      case 'ember': glow(p.x, y, p.size * 4, p.color, k * .7); ctx.fillStyle = hexA('#fff1c0', k); ctx.fillRect(p.x - .7, y - .7, 1.4, 1.4); break;
      case 'smoke': ctx.fillStyle = hexA(p.color, k * (p.alpha || .25)); ctx.beginPath(); ctx.arc(p.x, y, p.size, 0, TAU); ctx.fill(); break;
      case 'ring': ctx.strokeStyle = hexA(p.color, k * (p.alpha || .8)); ctx.lineWidth = (p.lw || 3) * k + .5; ctx.beginPath(); ctx.ellipse(p.x, y, p.size + (1 - k) * p.grow, (p.size + (1 - k) * p.grow) * (p.flat || .55), 0, 0, TAU); ctx.stroke(); break;
      case 'shard':
        ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot); ctx.fillStyle = hexA(p.color, Math.min(1, k * 1.5));
        ctx.beginPath(); ctx.moveTo(-p.size, -p.size * .4); ctx.lineTo(p.size, 0); ctx.lineTo(-p.size, p.size * .4); ctx.closePath(); ctx.fill(); ctx.restore(); break;
      case 'feather':
        ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot * .3 + Math.sin(p.t * 3) * .6); ctx.fillStyle = hexA(p.color, k);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 2.2, p.size * .7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = hexA('#9a8f80', k * .7); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-p.size * 2.2, 0); ctx.lineTo(p.size * 2.2, 0); ctx.stroke(); ctx.restore(); break;
      case 'rune':
        ctx.fillStyle = hexA(p.color, k); ctx.font = `${p.size}px serif`; ctx.textAlign = 'center'; ctx.fillText(p.ch, p.x, y); break;
      case 'ink': ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, y, p.size, 0, TAU); ctx.fill(); break;
      default: ctx.fillStyle = hexA(p.color, k); ctx.beginPath(); ctx.arc(p.x, y, Math.max(.3, p.size * (p.shrink === 0 ? 1 : k)), 0, TAU); ctx.fill();
    }
  }
}
function decal(x, y, r, col) {
  if (G.decals.length > 220) G.decals.shift();
  G.decals.push({ x, y, r, col, rot: rand(0, TAU), sx: rand(.7, 1.3), t: 0 });
}
function drawDecals() {
  for (const d of G.decals) {
    if (!inView(d.x, d.y, 40)) continue;
    ctx.fillStyle = hexA(d.col, .55); ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * d.sx, d.r * .55, d.rot, 0, TAU); ctx.fill();
  }
}
function ftext(x, y, txt, col = '#ffe2a0', size = 13) { G.texts.push({ x, y, txt, col, size, t: 0, life: 1.1 }); }

/* ---------------- hazards (telegraphed area attacks) ---------------- */
function haz(o) {
  const h = { type: 'circle', x: 0, y: 0, r: 60, ang: 0, len: 200, w: 60, arc: 1, r0: 0, r1: 300, warn: .8, act: .14, t: 0, dmg: 18, kb: 260, col: '#ff8a2b', style: 'dust', hit: false, linger: 0, tick: 0, owner: 'e', hitE: null, fired: false, after: .35 };
  for (const k in o) h[k] = o[k];
  G.haz.push(h); return h;
}
function hazHits(h, x, y, r) {
  switch (h.type) {
    case 'circle': case 'zone': return Math.hypot(x - h.x, y - h.y) < h.r + r * .5;
    case 'line': {
      const c = Math.cos(h.ang), s = Math.sin(h.ang), dx = x - h.x, dy = y - h.y, along = dx * c + dy * s, perp = Math.abs(-dx * s + dy * c);
      return along > -r && along < h.len + r && perp < h.w / 2 + r * .5;
    }
    case 'cone': { const d = Math.hypot(x - h.x, y - h.y); return d < h.r + r && Math.abs(angDiff(h.ang, Math.atan2(y - h.y, x - h.x))) < h.arc / 2; }
    case 'ring': { const k = clamp((h.t - h.warn) / h.act, 0, 1), cr = lerp(h.r0, h.r1, k), d = Math.hypot(x - h.x, y - h.y); return Math.abs(d - cr) < h.w / 2 + r * .4; }
    case 'wall': {
      const c = Math.cos(h.ang), s = Math.sin(h.ang), k = (h.t - h.warn) * h.spd, cx = h.x + c * k, cy = h.y + s * k;
      const dx = x - cx, dy = y - cy, along = dx * c + dy * s, lat = -dx * s + dy * c;
      if (Math.abs(along) > h.w / 2 + r * .4) return false;
      for (const g of h.gaps) if (lat > g[0] - g[1] / 2 + r * .3 && lat < g[0] + g[1] / 2 - r * .3) return false;
      return Math.abs(lat) < h.len / 2;
    }
  }
  return false;
}
function updHaz(dt) {
  for (let i = G.haz.length - 1; i >= 0; i--) {
    const h = G.haz[i]; h.t += dt;
    if (h.follow) { h.x = h.follow.x; h.y = h.follow.y; }
    if (!h.fired && h.t >= h.warn) { h.fired = true; if (h.onFire) h.onFire(h); hazBurstFx(h); }
    const live = h.type === 'zone' ? h.t >= h.warn && h.t < h.warn + h.linger : h.t >= h.warn && h.t < h.warn + h.act;
    if (live) {
      if (h.owner === 'e') {
        if (h.type === 'zone') { h.tick -= dt; if (h.tick <= 0 && hazHits(h, P.x, P.y, P.r)) { h.tick = .45; hurtPlayer(h.dmg, h.x, h.y, 60); if (h.slow) P.slowT = .6; } }
        else if (!h.hit && hazHits(h, P.x, P.y, P.r)) { if (hurtPlayer(h.dmg, h.x, h.y, h.kb)) h.hit = true; else if (P.inv > 0) h.hit = true; }
        if (G.decoy && !h.hitDecoy && hazHits(h, G.decoy.x, G.decoy.y, 12)) { h.hitDecoy = true; G.decoy.hp -= h.dmg; }
      } else {
        h.hitE = h.hitE || new Set();
        for (const e of G.enemies) if (!e.dead && !h.hitE.has(e) && hazHits(h, e.x, e.y, e.r)) { h.hitE.add(e); hitEnemy(e, h.dmg, Math.atan2(e.y - h.y, e.x - h.x), h.kb, true); }
        if (G.boss && !h.hitE.has(G.boss)) for (const hb of bossHitboxes()) if (hazHits(h, hb.x, hb.y, hb.r)) { if (hb.copy === undefined) h.hitE.add(G.boss); hitBoss(h.dmg, hb.x, hb.y, true, hb); break; }
      }
    }
    const end = h.warn + (h.type === 'zone' ? h.linger : h.act) + h.after;
    if (h.t >= end) G.haz.splice(i, 1);
  }
}
function hazBurstFx(h) {
  const c = h.col;
  if (h.type === 'circle') {
    if (h.style === 'roots') { burst(h.x, h.y, 10, { type: 'shard', color: '#2a1d16', smin: 60, smax: 200, lmin: .3, lmax: .6, szmin: 3, szmax: 7 }); burst(h.x, h.y, 8, { type: 'spark', color: '#ff9a3a', add: 1, smin: 80, smax: 220 }); }
    else if (h.style === 'ice') { burst(h.x, h.y, 14, { type: 'shard', color: '#d8f4ff', smin: 80, smax: 260, lmin: .3, lmax: .7, szmin: 2, szmax: 6 }); SFX.shatter(); }
    else if (h.style === 'fire') { burst(h.x, h.y, 16, { type: 'ember', color: '#ff7a1a', add: 1, smin: 40, smax: 200, lmin: .4, lmax: .9 }); }
    else if (h.style === 'bolt') { }
    else if (h.style === 'water') { burst(h.x, h.y, 16, { type: 'dot', color: '#9fc4d8', smin: 60, smax: 220, lmin: .3, lmax: .7 }); SFX.splash(); }
    else if (h.style === 'gold') { burst(h.x, h.y, 22, { type: 'spark', color: '#ffe08a', add: 1, smin: 100, smax: 380 }); }
    else burst(h.x, h.y, 10, { type: 'smoke', color: '#8a7a6a', smin: 30, smax: 90, lmin: .4, lmax: .8, szmin: 8, szmax: 16, grow: 40 });
    part({ x: h.x, y: h.y, type: 'ring', color: c, size: h.r * .6, grow: h.r * .7, life: .4, lw: 4, add: 1 });
  }
}
function drawHaz() {
  ctx.lineCap = 'round';
  for (const h of G.haz) {
    const pre = h.t < h.warn, k = clamp(h.t / h.warn, 0, 1), post = clamp((h.t - h.warn) / Math.max(.01, (h.type === 'zone' ? h.linger : h.act) + h.after), 0, 1);
    if (h.owner === 'p' && pre && !h.showTele) continue;
    const c = h.col;
    ctx.save();
    if (h.type === 'circle' || h.type === 'zone') {
      if (pre) {
        ctx.fillStyle = hexA(c, .1 + .12 * k); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA(c, .5 + .4 * k); ctx.lineWidth = 2; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -G.t * 30; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = hexA(c, .28); ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(.1, h.r * k), 0, TAU); ctx.fill();
      } else if (h.type === 'zone') {
        const a = Math.min(1, (h.warn + h.linger - h.t) * 2);
        const pulse = .8 + .2 * Math.sin(G.t * 6 + h.x);
        ctx.fillStyle = hexA(c, .32 * a * pulse); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA(c, .7 * a); ctx.lineWidth = 2.5; ctx.stroke();
        if (h.glowy) glow(h.x, h.y, h.r * 1.4, c, .35 * a);
      } else {
        const a = 1 - post;
        drawHazActive(h, a);
      }
    } else if (h.type === 'line') {
      ctx.translate(h.x, h.y); ctx.rotate(h.ang);
      if (pre) {
        ctx.fillStyle = hexA(c, .1 + .12 * k); ctx.fillRect(0, -h.w / 2, h.len, h.w);
        ctx.strokeStyle = hexA(c, .55 + .4 * k); ctx.lineWidth = 2; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -G.t * 40; ctx.strokeRect(0, -h.w / 2, h.len, h.w); ctx.setLineDash([]);
        ctx.fillStyle = hexA(c, .3); ctx.fillRect(0, -h.w / 2, h.len * k, h.w);
      } else {
        const a = 1 - post;
        const gr = ctx.createLinearGradient(0, -h.w / 2, 0, h.w / 2); gr.addColorStop(0, hexA(c, 0)); gr.addColorStop(.5, hexA(h.core || '#fff4d0', a)); gr.addColorStop(1, hexA(c, 0));
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, -h.w / 2 * (1 + post), h.len, h.w * (1 + post)); ctx.globalCompositeOperation = 'source-over';
      }
    } else if (h.type === 'cone') {
      ctx.translate(h.x, h.y);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, h.r, h.ang - h.arc / 2, h.ang + h.arc / 2); ctx.closePath();
      if (pre) {
        ctx.fillStyle = hexA(c, .1 + .14 * k); ctx.fill(); ctx.strokeStyle = hexA(c, .55 + .4 * k); ctx.lineWidth = 2.5; ctx.setLineDash([12, 8]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, h.r * k, h.ang - h.arc / 2, h.ang + h.arc / 2); ctx.closePath(); ctx.fillStyle = hexA(c, .3); ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, h.r); gr.addColorStop(0, hexA(h.core || '#ffffff', .8 * (1 - post))); gr.addColorStop(1, hexA(c, .2 * (1 - post)));
        ctx.fillStyle = gr; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      }
    } else if (h.type === 'ring') {
      const kk = clamp((h.t - h.warn) / h.act, 0, 1), cr = lerp(h.r0, h.r1, kk);
      if (pre) {
        ctx.strokeStyle = hexA(c, .25 + .5 * k); ctx.lineWidth = 2; ctx.setLineDash([8, 10]);
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r1, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = hexA(c, .6 * k); ctx.lineWidth = h.w * .4; ctx.beginPath(); ctx.arc(h.x, h.y, h.r0 + 4, 0, TAU); ctx.stroke();
      } else if (h.t < h.warn + h.act) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(c, .55); ctx.lineWidth = h.w; ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(.1, cr), 0, TAU); ctx.stroke();
        ctx.strokeStyle = hexA(h.core || '#fff4d0', .9); ctx.lineWidth = h.w * .3; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < .5) { const a = rand(0, TAU); part({ x: h.x + Math.cos(a) * cr, y: h.y + Math.sin(a) * cr, vy: -rand(20, 60), life: .5, type: h.style === 'ice' ? 'shard' : 'smoke', color: h.style === 'ice' ? '#e8f8ff' : '#8a7a6a', size: rand(4, 9), grow: 20, alpha: .35 }); }
      }
    } else if (h.type === 'wall') {
      const c2 = Math.cos(h.ang), s2 = Math.sin(h.ang), kk = Math.max(0, h.t - h.warn) * h.spd;
      ctx.translate(h.x + c2 * kk, h.y + s2 * kk); ctx.rotate(h.ang);
      const segs = []; let cur = -h.len / 2;
      const gaps = h.gaps.slice().sort((a, b) => a[0] - b[0]);
      for (const g of gaps) { segs.push([cur, g[0] - g[1] / 2]); cur = g[0] + g[1] / 2; }
      segs.push([cur, h.len / 2]);
      if (pre) {
        ctx.fillStyle = hexA(c, .15 + .2 * k);
        for (const s of segs) ctx.fillRect(-h.w / 2, s[0], h.w, s[1] - s[0]);
        ctx.strokeStyle = hexA('#ffffff', .6 * k); ctx.lineWidth = 2; for (const g of gaps) { ctx.strokeRect(-h.w / 2, g[0] - g[1] / 2, h.w, g[1]); }
      } else {
        for (const s of segs) {
          const gr = ctx.createLinearGradient(-h.w / 2, 0, h.w / 2, 0); gr.addColorStop(0, hexA(c, 0)); gr.addColorStop(.6, hexA(c, .85)); gr.addColorStop(1, hexA('#e8f6ff', .95));
          ctx.fillStyle = gr; ctx.fillRect(-h.w / 2, s[0], h.w, s[1] - s[0]);
          ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let y = s[0]; y < s[1]; y += 18) { ctx.beginPath(); ctx.arc(h.w / 2 - 4 + Math.sin(G.t * 9 + y) * 3, y + 9, 5, 0, TAU); ctx.fill(); }
        }
      }
    }
    ctx.restore();
  }
}
function drawHazActive(h, a) {
  const s = h.style;
  if (s === 'roots') {
    for (let i = 0; i < 6; i++) {
      const an = i / 6 * TAU + h.x, r = h.r * .5 * (.4 + (i % 3) * .3), x = h.x + Math.cos(an) * r, y = h.y + Math.sin(an) * r, hh = h.r * (.8 + (i % 2) * .5) * Math.min(1, a * 3);
      ctx.fillStyle = '#1a110c'; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + Math.cos(an) * 10, y - hh); ctx.lineTo(x + 7, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hexA('#ff8a2b', a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + Math.cos(an) * 8, y - hh * .8); ctx.stroke();
    }
    glow(h.x, h.y, h.r * 1.3, '#ff7a1a', a * .5);
  } else if (s === 'ice') {
    for (let i = 0; i < 5; i++) {
      const an = i / 5 * TAU + 1, r = h.r * .35 * (i % 2 ? 1 : .4), x = h.x + Math.cos(an) * r, y = h.y + Math.sin(an) * r, hh = h.r * (1 + (i % 3) * .4) * Math.min(1, a * 2.5);
      ctx.fillStyle = hexA('#bfe8ff', Math.min(1, a * 2)); ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y - hh); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hexA('#1d3f5e', a); ctx.lineWidth = 1.5; ctx.stroke();
    }
    glow(h.x, h.y, h.r * 1.2, '#9fe0ff', a * .5);
  } else if (s === 'fire') {
    glow(h.x, h.y - h.r * .3, h.r * 1.8, '#ff6a1a', a * .9); glow(h.x, h.y - h.r * .5, h.r * .9, '#ffd27a', a * .8);
    for (let i = 0; i < 4; i++) part({ x: h.x + rand(-h.r, h.r) * .7, y: h.y + rand(-h.r, h.r) * .4, vy: -rand(60, 160), life: rand(.3, .6), type: 'ember', color: '#ff8a2b', size: rand(2, 4), add: 1 });
  } else if (s === 'bolt') {
    drawBolt(h.x, h.y - 600, h.x, h.y, a, h.col);
    glow(h.x, h.y, h.r * 2, h.col, a);
  } else if (s === 'gold') {
    glow(h.x, h.y, h.r * 2.2, '#ffd27a', a); glow(h.x, h.y, h.r, '#ffffff', a * .7);
  } else if (s === 'water') {
    ctx.fillStyle = hexA('#cfe6f2', a * .6); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = hexA(h.col, a * .35); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
  }
}
function drawBolt(x0, y0, x1, y1, a, col = '#bfe3ff') {
  const pts = [[x0, y0]], n = 9;
  for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x0, x1, t) + rand(-26, 26), lerp(y0, y1, t)]); }
  pts.push([x1, y1]);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  tracePts(pts); ctx.strokeStyle = hexA(col, .45 * a); ctx.lineWidth = 12; ctx.stroke();
  ctx.strokeStyle = hexA('#ffffff', a); ctx.lineWidth = 3; ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------------- projectiles ---------------- */
function shoot(o) {
  const p = { x: 0, y: 0, vx: 0, vy: 0, r: 7, dmg: 10, life: 3, t: 0, kind: 'thorn', owner: 'e', home: 0, pierce: 0, kb: 160, hitS: null };
  for (const k in o) p[k] = o[k];
  G.proj.push(p); return p;
}
function updProj(dt) {
  for (let i = G.proj.length - 1; i >= 0; i--) {
    const p = G.proj[i]; p.t += dt;
    if (p.home && p.owner === 'e') {
      const tgt = G.decoy || P, a = Math.atan2(tgt.y - p.y, tgt.x - p.x), cur = Math.atan2(p.vy, p.vx), sp = Math.hypot(p.vx, p.vy);
      const na = cur + clamp(angDiff(cur, a), -p.home * dt, p.home * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
    }
    if (p.accel) { p.vx *= 1 + p.accel * dt; p.vy *= 1 + p.accel * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    let dead = p.t > p.life;
    if (!dead && G.world && G.world.kind === 'realm') { obstNear(G.world, p.x, p.y, p.r, _near); for (const o of _near) if (!o.noCol && !o.rect && Math.hypot(o.x - p.x, o.y - p.y) < o.r + p.r * .5) { dead = true; break; } }
    if (!dead && p.owner === 'e') {
      if (G.decoy && Math.hypot(G.decoy.x - p.x, G.decoy.y - p.y) < 14 + p.r) { G.decoy.hp -= p.dmg; dead = true; }
      else if (Math.hypot(P.x - p.x, P.y - p.y) < P.r + p.r) { const h = hurtPlayer(p.dmg, p.x - p.vx * .05, p.y - p.vy * .05, p.kb); if (h || P.inv <= 0 || P.state !== 'dodge') dead = !p.pierce; }
    } else if (!dead && p.owner === 'p') {
      p.hitS = p.hitS || new Set();
      for (const e of G.enemies) if (!e.dead && !p.hitS.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { p.hitS.add(e); hitEnemy(e, p.dmg, Math.atan2(p.vy, p.vx), p.kb, true); if (!p.pierce) dead = true; }
      if (G.boss && !p.hitS.has(G.boss)) for (const hb of bossHitboxes()) if (Math.hypot(hb.x - p.x, hb.y - p.y) < hb.r + p.r) { if (hb.copy === undefined) p.hitS.add(G.boss); hitBoss(p.dmg, p.x, p.y, true, hb); if (!p.pierce) dead = true; break; }
    }
    if (p.kind === 'fire' && Math.random() < .5) part({ x: p.x, y: p.y, vx: rand(-20, 20), vy: rand(-20, 20), life: .4, type: 'ember', color: '#ff7a1a', size: 2, add: 1 });
    if (p.kind === 'spear' && Math.random() < .8) part({ x: p.x, y: p.y, life: .5, type: 'rune', ch: pick('ᚨᚱᚾᛟᛞ'), color: '#ffe08a', size: 10, vy: -20 });
    if (dead) {
      if (p.onDie) p.onDie(p);
      const col = { thorn: '#ff9a3a', hex: '#a6ff5a', ice: '#d8f4ff', fire: '#ff8a2b', bile: '#c8ff9a', spark: '#ffd27a', feather: '#ffffff', rock: '#9fb3c2', sword: '#ffd27a', spear: '#ffe08a', illusion: '#9cff6a' }[p.kind] || '#ffffff';
      burst(p.x, p.y, 6, { type: 'spark', color: col, add: 1, smin: 40, smax: 140, lmin: .15, lmax: .35 });
      G.proj.splice(i, 1);
    }
  }
}
function drawProj() {
  for (const p of G.proj) {
    const a = Math.atan2(p.vy, p.vx);
    ctx.save(); ctx.translate(p.x, p.y - (p.zh || 14)); ctx.rotate(a);
    switch (p.kind) {
      case 'thorn': ctx.fillStyle = '#1a110c'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -4); ctx.lineTo(-6, 0); ctx.lineTo(-8, 4); ctx.closePath(); ctx.fill(); ctx.restore(); glow(p.x, p.y - 14, 14, '#ff7a1a', .6); continue;
      case 'hex': ctx.restore(); glow(p.x, p.y - 14, 20, '#7aff3a', .8); ctx.fillStyle = '#eaffd0'; ctx.beginPath(); ctx.arc(p.x, p.y - 14, 4, 0, TAU); ctx.fill(); continue;
      case 'ice': ctx.fillStyle = '#d8f4ff'; ctx.strokeStyle = '#2a5a80'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -5); ctx.lineTo(-10, 0); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); glow(p.x, p.y - 14, 12, '#9fe0ff', .5); continue;
      case 'fire': ctx.restore(); glow(p.x, p.y - 14, 26, '#ff5a1a', .9); glow(p.x, p.y - 14, 10, '#ffe7a0', .9); continue;
      case 'bile': ctx.restore(); ctx.fillStyle = '#6a8a2a'; ctx.beginPath(); ctx.arc(p.x, p.y - 14, p.r, 0, TAU); ctx.fill(); glow(p.x, p.y - 14, 16, '#b8ff6a', .4); continue;
      case 'spark': ctx.restore(); glow(p.x, p.y - 10, 12, '#ffb347', .9); ctx.fillStyle = '#fff3c0'; ctx.fillRect(p.x - 1.5, p.y - 11.5, 3, 3); continue;
      case 'feather': ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c9b78a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 13, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); glow(p.x, p.y - 14, 12, '#ffe6a0', .45); continue;
      case 'rock': ctx.rotate(p.t * 6); ctx.fillStyle = '#9fb3c2'; ctx.strokeStyle = '#1b2836'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 7; i++) { const aa = i / 7 * TAU, rr = p.r * (.8 + (i % 2) * .25); ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); continue;
      case 'sword':
        ctx.fillStyle = '#c9c0b4'; ctx.strokeStyle = '#140c0a'; ctx.lineWidth = 1.4; ctx.fillRect(-20, -3, 36, 6); ctx.strokeRect(-20, -3, 36, 6);
        ctx.fillStyle = '#2c1a14'; ctx.fillRect(-24, -9, 4, 18); ctx.fillStyle = '#6b2a1a'; ctx.fillRect(-34, -2.5, 10, 5);
        ctx.restore(); glow(p.x, p.y - 14, 24, '#ff7a1a', .5); continue;
      case 'spear':
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,200,90,.5)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(20, 0); ctx.stroke();
        ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(16, -6); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill();
        ctx.restore(); glow(p.x, p.y - 14, 40, '#ffcc55', .7); continue;
      case 'illusion': ctx.restore(); glow(p.x, p.y - 14, 22, '#6aff4a', .8); glow(p.x, p.y - 14, 8, '#eaffd0', .9); continue;
      default: ctx.restore();
    }
  }
}

/* =====================================================================
   EINAR — the player
   ===================================================================== */
let P = null;
function newPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, r: 11, hp: S.maxhp, face: -PI / 2, state: 'idle', st: 0, t: 0, walk: 0,
    combo: 0, comboT: 0, queued: false, charge: 0, chargeReady: false, inv: 0, dodgeCD: 0, ddx: 0, ddy: 1, perfectUsed: false,
    hitSet: new Set(), swing: null, trail: [], crit: 0, freyja: 0, shield: 0, stealth: 0, slowT: 0, burnT: 0, flash: 0, rollAtk: false,
    kbx: 0, kby: 0, trialBound: true, pose: null, ghost: [], hold: 0,
  };
}
const LIGHT_ATK = [
  { dur: .34, a: .07, b: .17, dmg: 11, rng: 54, arc: 2.0, lunge: 150, from: -1.25, to: 1.25 },
  { dur: .34, a: .07, b: .17, dmg: 12, rng: 54, arc: 2.0, lunge: 150, from: 1.25, to: -1.25 },
  { dur: .52, a: .15, b: .26, dmg: 20, rng: 64, arc: 2.7, lunge: 230, from: -1.7, to: 1.7, big: 1 },
];
const ROLL_ATK = { dur: .42, a: .08, b: .28, dmg: 16, rng: 60, arc: TAU, lunge: 120, from: 0, to: TAU, spin: 1 };
const stat = {
  dmg: () => 1 + .2 * S.up.edge,
  armor: () => 1 - .11 * S.up.mail,
  chargeT: () => .82 * (1 - .2 * S.up.haft),
  aspd: () => (1 + .1 * S.up.haft) * (P && P.freyja > 0 ? 1.3 : 1),
  maxCharge: () => 2 + S.up.focus,
};
function nearestTarget(x, y, maxD, prefAng) {
  let best = null, bd = 1e9;
  const cand = [];
  for (const e of G.enemies) if (!e.dead && e.state !== 'rise') cand.push({ x: e.x, y: e.y, r: e.r });
  if (G.boss && !G.boss.dead) for (const hb of bossHitboxes()) cand.push(hb);
  for (const c of cand) {
    let d = Math.hypot(c.x - x, c.y - y) - c.r;
    if (d > maxD) continue;
    if (prefAng !== undefined) d += Math.abs(angDiff(prefAng, Math.atan2(c.y - y, c.x - x))) * 40;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function aimAssist(range) {
  const hasIn = IN.mag > .2, inA = Math.atan2(IN.my, IN.mx);
  const t = nearestTarget(P.x, P.y, range, hasIn ? inA : undefined);
  if (t) { const a = Math.atan2(t.y - P.y, t.x - P.x); if (!hasIn || Math.abs(angDiff(inA, a)) < 1.2) { P.face = a; return; } }
  if (hasIn) P.face = inA;
}
function startLight(spec) {
  const p = P;
  if (!spec) { if (p.comboT <= 0) p.combo = 0; spec = LIGHT_ATK[p.combo]; p.combo = (p.combo + 1) % 3; }
  aimAssist(150);
  p.state = 'atk'; p.st = 0; p.swing = spec; p.queued = false; p.hitSet.clear(); p.trail = [];
  const sp = spec.lunge; p.vx = Math.cos(p.face) * sp; p.vy = Math.sin(p.face) * sp;
  SFX.swing(spec.big ? .8 : 1 + Math.random() * .15);
}
function startHeavy() {
  const p = P, c = p.charge;
  aimAssist(170);
  p.state = 'heavy'; p.st = 0; p.heavyC = c; p.hitSet.clear(); p.trail = [];
  p.vx = Math.cos(p.face) * 120; p.vy = Math.sin(p.face) * 120;
  SFX.heavy();
}
function startDodge() {
  const p = P;
  let dx = IN.mx * (IN.mag > .1 ? 1 : 0), dy = IN.my * (IN.mag > .1 ? 1 : 0);
  if (!dx && !dy) { dx = Math.cos(p.face); dy = Math.sin(p.face); }
  const l = Math.hypot(dx, dy) || 1; p.ddx = dx / l; p.ddy = dy / l; p.face = Math.atan2(p.ddy, p.ddx);
  p.state = 'dodge'; p.st = 0; p.inv = .3; p.perfectUsed = false; p.rollAtk = false; p.charge = 0;
  SFX.dodge();
  burst(p.x, p.y, 6, { type: 'smoke', color: '#9a8a7a', smin: 20, smax: 60, lmin: .3, lmax: .6, szmin: 4, szmax: 8, grow: 20 });
}
function perfectDodge() {
  P.perfectUsed = true; P.crit = 2.6; G.slowT = .55; G.flash = .35; G.flashCol = '#ffe6a0';
  SFX.perfect(); ftext(P.x, P.y - 40, 'Óðinn sees', '#ffe2a0', 14);
  burst(P.x, P.y - 16, 16, { type: 'spark', color: '#ffe08a', add: 1, smin: 120, smax: 300 });
}
function hurtPlayer(dmg, sx, sy, kb = 220) {
  const p = P;
  if (!p || p.state === 'dead' || G.lock || G.boss && G.boss.dead) return false;
  if (p.inv > 0) { if (p.state === 'dodge' && p.st < .22 && !p.perfectUsed) perfectDodge(); return false; }
  if (p.shield > 0) {
    p.shield = Math.max(0, p.shield - .6); SFX.clang(); burst(p.x, p.y - 16, 10, { type: 'spark', color: '#ffe08a', add: 1, smin: 80, smax: 220 });
    p.inv = .25; return false;
  }
  dmg = Math.max(1, Math.round(dmg * stat.armor() * (G.valhalla ? 1.35 : 1)));
  p.hp -= dmg; p.flash = .2; p.inv = .7; G.hurtV = 1;
  const a = Math.atan2(p.y - sy, p.x - sx);
  p.kbx = Math.cos(a) * kb; p.kby = Math.sin(a) * kb;
  if (p.state !== 'dead') { p.state = 'hurt'; p.st = 0; p.charge = 0; }
  SFX.hurt(); shake(dmg > 18 ? 9 : 6); G.hitstop = .06;
  ink(p.x, p.y - 16, 8, '#5a0c08', .8);
  if (p.hp <= 0) { p.hp = 0; p.state = 'dead'; p.st = 0; G.slowT = 1.2; SFX.death(); }
  return true;
}
function updPlayer(dt) {
  const p = P; if (!p) return;
  p.t += dt; p.st += dt;
  p.inv = Math.max(0, p.inv - dt); p.flash = Math.max(0, p.flash - dt); p.dodgeCD = Math.max(0, p.dodgeCD - dt); p.comboT = Math.max(0, p.comboT - dt);
  p.crit = Math.max(0, p.crit - dt); p.freyja = Math.max(0, p.freyja - dt); p.shield = Math.max(0, p.shield - dt); p.stealth = Math.max(0, p.stealth - dt); p.slowT = Math.max(0, p.slowT - dt);
  if (IN.atk) IN.atkHeld += dt;
  if (p.state === 'dead') { p.vx *= .9; p.vy *= .9; p.x += p.vx * dt; p.y += p.vy * dt; return; }
  const locked = G.lock || G.menu;
  let ix = locked ? 0 : IN.mx * IN.mag, iy = locked ? 0 : IN.my * IN.mag;
  if (p.auto) { const dx = p.auto.x - p.x, dy = p.auto.y - p.y, d = Math.hypot(dx, dy); if (d > 6) { ix = dx / d * (p.auto.spd || .6); iy = dy / d * (p.auto.spd || .6); } else { ix = iy = 0; p.auto = null; } }
  const icy = onIce(p.x, p.y), wet = inWater(p.x, p.y);
  let spd = 168 * (p.freyja > 0 ? 1.42 : 1) * (p.slowT > 0 ? .55 : 1) * (wet ? .62 : 1);
  const acc = icy ? 2.6 : 16;
  const moveTo = (mul) => { p.vx = lerp(p.vx, ix * spd * mul, Math.min(1, acc * dt)); p.vy = lerp(p.vy, iy * spd * mul, Math.min(1, acc * dt)); };
  const wantP = !locked;
  if (p.freyja > 0 && Math.random() < dt * 20) p.ghost.push({ x: p.x, y: p.y, face: p.face, walk: p.walk, t: 0 });
  for (let i = p.ghost.length - 1; i >= 0; i--) { p.ghost[i].t += dt; if (p.ghost[i].t > .35) p.ghost.splice(i, 1); }

  switch (p.state) {
    case 'idle': case 'move': {
      moveTo(1);
      if (ix * ix + iy * iy > .01) { p.face = Math.atan2(iy, ix); p.state = 'move'; p.walk += dt * Math.hypot(p.vx, p.vy) * .065; } else p.state = 'idle';
      if (wantP) {
        if (IN.dodge && p.dodgeCD <= 0) { startDodge(); break; }
        if (IN.atkJ) { startLight(); break; }
        if (IN.atk && IN.atkHeld > .2) { p.state = 'charge'; p.st = 0; p.charge = 0; p.chargeReady = false; SFX.charge(); break; }
        if (IN.p[0]) usePower(0); if (IN.p[1]) usePower(1);
      }
      break;
    }
    case 'atk': {
      const s = p.swing, k = p.st * stat.aspd();
      const dec = Math.max(0, 1 - 9 * dt); p.vx *= dec; p.vy *= dec;
      if (s.spin) p.face += dt * 16;
      if (k >= s.a && k <= s.b) swingHits(s.rng, s.arc, s.dmg, s.big ? 300 : 190, false, s);
      if (wantP && IN.atkJ && k > s.dur * .35) p.queued = true;
      if (wantP && IN.dodge && k > s.b && p.dodgeCD <= 0) { startDodge(); break; }
      if (k >= s.dur) {
        if (p.queued && !s.spin) { startLight(); }
        else if (IN.atk && IN.atkHeld > .2 && wantP) { p.state = 'charge'; p.st = 0; p.charge = 0; p.chargeReady = false; SFX.charge(); }
        else { p.state = 'idle'; p.comboT = .42; }
      }
      break;
    }
    case 'charge': {
      moveTo(.32);
      if (ix * ix + iy * iy > .01) p.face = Math.atan2(iy, ix);
      p.charge = Math.min(1, p.charge + dt / stat.chargeT());
      if (p.charge >= 1 && !p.chargeReady) { p.chargeReady = true; SFX.ready(); burst(p.x, p.y - 40, 10, { type: 'spark', color: '#ffd27a', add: 1, smin: 60, smax: 140 }); }
      if (Math.random() < p.charge * .6) part({ x: p.x + rand(-14, 14), y: p.y - rand(30, 46), vy: -rand(20, 60), life: .4, type: 'ember', color: '#ffb347', size: 2, add: 1 });
      if (wantP && IN.dodge && p.dodgeCD <= 0) { startDodge(); break; }
      if (!IN.atk || locked) { if (p.charge > .22) startHeavy(); else { p.state = 'idle'; p.charge = 0; } }
      break;
    }
    case 'heavy': {
      const k = p.st * stat.aspd();
      const dec = Math.max(0, 1 - 7 * dt); p.vx *= dec; p.vy *= dec;
      if (k >= .17 && !p.heavyDone) {
        p.heavyDone = true;
        const c = p.heavyC, rng = 80 + c * 22;
        swingHits(rng, 3.7, 26 + 50 * c, 380 + c * 220, true, null);
        const fx = p.x + Math.cos(p.face) * 40, fy = p.y + Math.sin(p.face) * 40;
        shake(4 + c * 9); SFX.slam(.4 + c * .5);
        burst(fx, fy, 14 + c * 16, { type: 'smoke', color: '#8a7a6a', smin: 40, smax: 160, lmin: .4, lmax: .9, szmin: 6, szmax: 14, grow: 30, flat: .6 });
        burst(fx, fy, 10, { type: 'shard', color: '#4a3e34', smin: 80, smax: 220, lmin: .3, lmax: .6, szmin: 3, szmax: 6 });
        part({ x: fx, y: fy, type: 'ring', color: '#ffd8a0', size: 10, grow: 90 + c * 60, life: .45, lw: 5, add: 1 });
        decal(fx, fy, 20 + c * 14, '#120c08');
        if (c >= .95) haz({ owner: 'p', type: 'ring', x: fx, y: fy, r0: 20, r1: 150, w: 40, warn: 0, act: .25, dmg: 18 * stat.dmg(), kb: 300, col: '#ffcf7a' });
      }
      if (k >= .58) { p.state = 'idle'; p.heavyDone = false; p.charge = 0; }
      break;
    }
    case 'dodge': {
      const k = p.st / .34, sp = 470 * Math.pow(Math.max(0, 1 - k), .55) * (p.freyja > 0 ? 1.15 : 1);
      p.vx = p.ddx * sp; p.vy = p.ddy * sp;
      if (wantP && IN.atkJ && p.st > .12) p.rollAtk = true;
      if (k >= 1) {
        p.dodgeCD = p.freyja > 0 ? .12 : .28;
        if (p.rollAtk) { p.face = Math.atan2(p.ddy, p.ddx); startLight(ROLL_ATK); }
        else p.state = 'idle';
      }
      break;
    }
    case 'hurt': {
      p.vx = p.kbx; p.vy = p.kby; p.kbx *= Math.max(0, 1 - 10 * dt); p.kby *= Math.max(0, 1 - 10 * dt);
      if (p.st > .28) p.state = 'idle';
      break;
    }
    case 'pose': { p.vx *= .8; p.vy *= .8; break; }
  }
  if (p.state !== 'atk' && p.state !== 'heavy') p.trail.length = 0;
  p.x += p.vx * dt; p.y += p.vy * dt;
  collide(p);
  // ground hazards
  if (inLava(p.x, p.y) && p.state !== 'dodge') { p.burnT -= dt; if (p.burnT <= 0) { p.burnT = .45; const was = p.inv; p.inv = 0; hurtPlayer(9, p.x - p.vx, p.y - p.vy, 60); p.inv = Math.min(p.inv, .2); SFX.fire(); } }
  if (wet && Math.random() < .2 && Math.hypot(p.vx, p.vy) > 40) part({ x: p.x + rand(-8, 8), y: p.y, type: 'ring', color: '#c8dcea', size: 3, grow: 14, life: .5, lw: 1 });
  if (icy && Math.hypot(p.vx, p.vy) > 60 && Math.random() < .3) part({ x: p.x, y: p.y, type: 'dot', color: '#ffffff', size: 1.5, life: .4, vx: -p.vx * .1, vy: -p.vy * .1 });
}
function swingHits(rng, arc, base, kb, heavy, spec) {
  const p = P, dmul = stat.dmg() * (p.crit > 0 ? 2 : 1);
  const test = (x, y, r) => {
    const d = Math.hypot(x - p.x, y - p.y); if (d - r > rng) return false;
    if (arc >= TAU - .01) return true;
    return Math.abs(angDiff(p.face, Math.atan2(y - p.y, x - p.x))) <= arc / 2 + Math.asin(Math.min(1, r / Math.max(d, 1)));
  };
  let any = false;
  for (const e of G.enemies) {
    if (e.dead || p.hitSet.has(e) || e.state === 'rise') continue;
    if (test(e.x, e.y, e.r)) { p.hitSet.add(e); hitEnemy(e, base * dmul, Math.atan2(e.y - p.y, e.x - p.x), kb, heavy); any = true; }
  }
  if (G.boss && !G.boss.dead && !p.hitSet.has(G.boss)) {
    for (const hb of bossHitboxes()) if (test(hb.x, hb.y, hb.r)) { p.hitSet.add(G.boss); const a = Math.atan2(hb.y - p.y, hb.x - p.x), hx = p.x + Math.cos(a) * Math.min(rng, Math.hypot(hb.x - p.x, hb.y - p.y)), hy = p.y + Math.sin(a) * Math.min(rng, Math.hypot(hb.x - p.x, hb.y - p.y)); hitBoss(base * dmul, hx, hy, heavy, hb); any = true; break; }
  }
  if (any && p.crit > 0) { p.crit = 0; ftext(p.x, p.y - 44, 'CRUSHING', '#ffd27a', 13); }
}

/* ------- drawing Einar ------- */
function axePose(p) {
  const fx = Math.cos(p.face), side = fx < -.15 ? -1 : 1;
  let a, hx, hy, behind = false, swingFrac = -1;
  if (p.state === 'atk' && p.swing) {
    const s = p.swing, k = clamp(p.st * stat.aspd() / s.dur, 0, 1);
    const e = k < .2 ? 0 : k > .6 ? 1 : easeOut((k - .2) / .4);
    const rel = lerp(s.from, s.to, s.spin ? k : e);
    const wa = s.spin ? p.face + rel : p.face + rel;
    a = Math.atan2(Math.sin(wa) * .62, Math.cos(wa)); hx = Math.cos(wa) * 6; hy = -18 + Math.sin(wa) * 4;
    behind = Math.sin(wa) < -.2; swingFrac = k;
  } else if (p.state === 'heavy') {
    const k = clamp(p.st * stat.aspd() / .58, 0, 1), e = k < .28 ? easeIn(k / .28) : 1;
    const wa = p.face + lerp(-PI * .9, .2, e) * side;
    const lift = lerp(-30, -14, e);
    a = lerp(-PI / 2, Math.atan2(Math.sin(p.face) * .62, Math.cos(p.face)), e); hx = Math.cos(p.face) * 6 * e; hy = lift;
    behind = false; swingFrac = k;
  } else if (p.state === 'charge') {
    const wob = Math.sin(G.t * 30) * p.charge * .05;
    a = -PI / 2 - side * .5 + wob; hx = side * 2; hy = -34;
  } else if (p.state === 'dodge') {
    a = -PI / 2 + side * 1.2; hx = side * 4; hy = -20;
  } else {
    a = side > 0 ? -PI * .64 : -PI * .36; hx = side * 7.5; hy = -19 + Math.sin(G.t * 2) * .4; behind = Math.sin(p.face) > -.55;
  }
  if (p.state === 'atk' && swingFrac >= .2 && swingFrac <= .7) {
    const L1 = 14, L2 = 36, ox = p.x, oy = p.y;
    p.trail.push([ox + hx + Math.cos(a) * L1, oy + hy + Math.sin(a) * L1, ox + hx + Math.cos(a) * L2, oy + hy + Math.sin(a) * L2]);
    if (p.trail.length > 9) p.trail.shift();
  } else if (p.state === 'heavy' && swingFrac < .45) {
    const L1 = 10, L2 = 40;
    p.trail.push([p.x + hx + Math.cos(a) * L1, p.y + hy + Math.sin(a) * L1, p.x + hx + Math.cos(a) * L2, p.y + hy + Math.sin(a) * L2]);
    if (p.trail.length > 8) p.trail.shift();
  }
  return { a, hx, hy, behind, side };
}
function drawFalconWings(x, y, t, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const ang = -PI / 2 + s * (.5 + i * .22) + Math.sin(t * 6) * .08 * s, L = 26 - i * 2;
      ctx.strokeStyle = hexA('#ffcf6a', a * (.55 - i * .06)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + s * 4, y); ctx.quadraticCurveTo(x + s * 12 + Math.cos(ang) * L * .4, y + Math.sin(ang) * L * .4, x + Math.cos(ang) * L + s * 6, y + Math.sin(ang) * L); ctx.stroke();
    }
  }
  ctx.restore();
}

/* =====================================================================
   FOES — four archetypes, sixteen skins
   ===================================================================== */
const FOES = {
  draugr: { arch: 'grunt', name: 'Draugr', hp: 40, dmg: 12, spd: 82, r: 12, wpn: 'sword', C: { skin: '#7f9480', skin2: '#566a58', cloth: '#2c2723', metal: '#8d8478', eye: '#ff9a3a', blood: '#1a2a1c' } },
  varg: { arch: 'beast', name: 'Iron-varg', hp: 28, dmg: 10, spd: 152, r: 12, C: { fur: '#3a3634', fur2: '#5c544e', eye: '#ff7a1a', blood: '#2a0c08' } },
  hag: { arch: 'caster', name: 'Myrkriða', hp: 26, dmg: 10, spd: 70, r: 12, shot: 'hex', C: { robe: '#28271f', robe2: '#45422f', skin: '#9aa080', orb: '#a6ff5a', blood: '#1a2a10' } },
  troll: { arch: 'brute', name: 'Iron-troll', hp: 130, dmg: 22, spd: 52, r: 24, C: { skin: '#5d5a44', skin2: '#3d3b2c', moss: '#4a5a2a', eye: '#ffcc55', blood: '#2a2410' } },
  frostdraugr: { arch: 'grunt', name: 'Hrím-draugr', hp: 48, dmg: 14, spd: 84, r: 12, wpn: 'axe', C: { skin: '#a9c3d6', skin2: '#7b98ae', cloth: '#2c3a4a', metal: '#c8d6e0', eye: '#7fe0ff', blood: '#1a2a3a' } },
  hrimvarg: { arch: 'beast', name: 'Frost-varg', hp: 34, dmg: 12, spd: 158, r: 12, C: { fur: '#d6e2ea', fur2: '#9fb3c2', eye: '#59c8ff', blood: '#2a3a4a' } },
  wight: { arch: 'caster', name: 'Hrím-wight', hp: 30, dmg: 12, spd: 72, r: 12, shot: 'ice', C: { robe: '#7fa8c4', robe2: '#d8eef8', skin: '#e8f6ff', orb: '#bff0ff', blood: '#4a6a8a' } },
  thurs: { arch: 'brute', name: 'Thurs-whelp', hp: 165, dmg: 24, spd: 55, r: 25, C: { skin: '#7ea4c4', skin2: '#4f7392', moss: '#e6f2fa', eye: '#dff6ff', blood: '#2a4a6a' } },
  corpse: { arch: 'grunt', name: 'Nár', hp: 56, dmg: 15, spd: 86, r: 12, wpn: 'spear', C: { skin: '#8a8f86', skin2: '#5d625b', cloth: '#273038', metal: '#6a7078', eye: '#d8f0ff', blood: '#141c22' } },
  garm: { arch: 'beast', name: 'Hel-hound', hp: 40, dmg: 14, spd: 166, r: 13, C: { fur: '#2a2826', fur2: '#4a2a26', eye: '#ff3a2a', blood: '#3a0a08' } },
  drowned: { arch: 'caster', name: 'Drowned Völva', hp: 36, dmg: 13, spd: 72, r: 12, shot: 'bile', C: { robe: '#2c3c40', robe2: '#4a6a60', skin: '#9ab0a8', orb: '#c8ff9a', blood: '#1a2a24' } },
  seatroll: { arch: 'brute', name: 'Sea-troll', hp: 195, dmg: 27, spd: 56, r: 26, C: { skin: '#5a6a6a', skin2: '#3a4848', moss: '#c8c0a8', eye: '#ffe08a', blood: '#1a2424' } },
  emberdraugr: { arch: 'grunt', name: 'Ember-draugr', hp: 62, dmg: 17, spd: 90, r: 12, wpn: 'sword', C: { skin: '#3a2420', skin2: '#22140f', cloth: '#1a0e0c', metal: '#ff8a3a', eye: '#ffd060', blood: '#ff6a1a' } },
  emberhound: { arch: 'beast', name: 'Muspell-hound', hp: 44, dmg: 15, spd: 170, r: 13, C: { fur: '#1c1210', fur2: '#ff5a1a', eye: '#ffe07a', blood: '#ff7a2a' } },
  imp: { arch: 'caster', name: 'Eldr-sprite', hp: 38, dmg: 14, spd: 80, r: 11, shot: 'fire', C: { robe: '#3a1410', robe2: '#ff6a1a', skin: '#ff9a4a', orb: '#ffd27a', blood: '#ff8a3a' } },
  emberthurs: { arch: 'brute', name: 'Ember-thurs', hp: 225, dmg: 30, spd: 58, r: 27, C: { skin: '#2a1814', skin2: '#170c0a', moss: '#ff6a1a', eye: '#ffe07a', blood: '#ff6a1a' } },
};
function spawnFoe(kind, x, y, o = {}) {
  const F = FOES[kind], el = o.elite ? 1 : 0, vh = G.valhalla ? 1.4 : 1;
  const e = {
    kind, F, arch: F.arch, x, y, hx: x, hy: y, vx: 0, vy: 0, r: F.r * (el ? 1.25 : 1), hp: F.hp * (el ? 1.9 : 1) * vh, maxhp: 0, dmg: F.dmg * (el ? 1.2 : 1),
    spd: F.spd, state: o.rise ? 'rise' : 'idle', st: 0, t: rand(0, 10), face: rand(0, TAU), flash: 0, cd: rand(.5, 2), elite: el, aggro: false,
    wx: x, wy: y, wanderT: rand(1, 3), kbx: 0, kby: 0, dead: false, deadT: 0, strafe: rand() < .5 ? 1 : -1, trialBound: !!o.trial, trial: !!o.trial, walk: rand(0, 10), hitDone: false, poise: F.arch === 'brute',
  };
  e.maxhp = e.hp;
  G.enemies.push(e); return e;
}
function hitEnemy(e, dmg, ang, kb, heavy) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = .14; e.aggro = true;
  const k = e.poise && !heavy ? .15 : 1;
  e.kbx = Math.cos(ang) * kb * k; e.kby = Math.sin(ang) * kb * k;
  if (!e.poise || heavy) { if (e.state !== 'pounce' || heavy) { e.state = 'hurt'; e.st = 0; } }
  G.hitstop = Math.max(G.hitstop, heavy ? .085 : .045); shake(heavy ? 5 : 2.5);
  SFX.hit(heavy ? 1 : 0);
  const hx = e.x - Math.cos(ang) * e.r * .5, hy = e.y - 14;
  ink(hx, hy, heavy ? 12 : 7, e.F.C.blood, heavy ? 1.3 : 1);
  burst(hx, hy, heavy ? 10 : 6, { type: 'spark', color: '#fff0d0', add: 1, ang, spread: .9, smin: 120, smax: 360, lmin: .1, lmax: .25, szmin: 1, szmax: 2 });
  if (e.hp <= 0) killEnemy(e, ang);
}
function killEnemy(e, ang) {
  e.dead = true; e.deadT = 0; e.state = 'dead';
  SFX.death(); G.hitstop = Math.max(G.hitstop, .07);
  ink(e.x, e.y - 14, e.arch === 'brute' ? 26 : 16, e.F.C.blood, 1.4);
  burst(e.x, e.y - 14, 12, { type: 'smoke', color: '#1a1412', smin: 20, smax: 90, lmin: .5, lmax: 1, szmin: 6, szmax: 14, grow: 30, alpha: .4 });
  const silver = (e.arch === 'brute' ? 14 : 5) + (e.elite ? 10 : 0) + REALMS_TIER() * 2;
  dropSilver(e.x, e.y, silver);
  const wisps = e.arch === 'brute' ? 4 : 2;
  for (let i = 0; i < wisps; i++) G.picks.push({ kind: 'ond', x: e.x + rand(-10, 10), y: e.y - 14, vx: rand(-60, 60), vy: rand(-80, -20), t: 0 });
  if (P.hp < S.maxhp * .5 && Math.random() < .22) G.picks.push({ kind: 'heal', x: e.x, y: e.y - 10, vx: rand(-40, 40), vy: rand(-60, -20), t: 0 });
}
function REALMS_TIER() { const w = G.world; return w && w.def && w.def.tier !== undefined ? w.def.tier : 0; }
function dropSilver(x, y, n) {
  let left = n;
  while (left > 0) { const v = left >= 10 ? 5 : 1; left -= v; G.picks.push({ kind: 'silver', val: v, x, y, z: 6, vz: rand(90, 200), vx: rand(-90, 90), vy: rand(-60, 60), t: 0 }); }
}
function targetOf(e) { return G.decoy && Math.hypot(G.decoy.x - e.x, G.decoy.y - e.y) < 600 ? G.decoy : P; }
function updEnemies(dt) {
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { e.deadT += dt; if (e.deadT > .6) G.enemies.splice(i, 1); continue; }
    if (Math.abs(e.x - P.x) > 1500 || Math.abs(e.y - P.y) > 1300) continue;
    updEnemy(e, dt);
  }
  // separation
  const E = G.enemies;
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
    const a = E[i], b = E[j]; if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
    if (d < m && d > .01) { const k = (m - d) / d * .5; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
  }
}
function updEnemy(e, dt) {
  e.t += dt; e.st += dt; e.flash = Math.max(0, e.flash - dt); e.cd -= dt;
  const T = targetOf(e), dx = T.x - e.x, dy = T.y - e.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  const playerOK = P.state !== 'dead' && !G.lock;
  if (!e.aggro && playerOK && d < (e.arch === 'caster' ? 330 : 290) && P.stealth <= 0) { e.aggro = true; if (e.state === 'idle') { e.state = 'chase'; e.st = 0; } }
  if (e.aggro && (!playerOK || Math.hypot(e.x - e.hx, e.y - e.hy) > 1100 && d > 500)) { e.aggro = false; e.state = 'idle'; }
  const sp = e.spd * (G.valhalla ? 1.1 : 1);
  let mvx = 0, mvy = 0;
  const A = e.arch;
  switch (e.state) {
    case 'rise': if (e.st > .9) { e.state = 'chase'; e.st = 0; e.aggro = true; } break;
    case 'idle': {
      e.wanderT -= dt;
      if (e.wanderT <= 0) { e.wanderT = rand(1.5, 4); e.wx = e.hx + rand(-90, 90); e.wy = e.hy + rand(-90, 90); }
      const wx = e.wx - e.x, wy = e.wy - e.y, wd = Math.hypot(wx, wy);
      if (wd > 8) { mvx = wx / wd * sp * .3; mvy = wy / wd * sp * .3; e.face = Math.atan2(wy, wx); }
      break;
    }
    case 'chase': {
      e.face = ang;
      if (A === 'grunt') {
        if (d < 50 && e.cd <= 0) { e.state = 'windup'; e.st = 0; break; }
        const s = d < 90 ? .25 : 1; mvx = (dx / d) * sp * s - Math.sin(ang) * e.strafe * sp * .25; mvy = (dy / d) * sp * s + Math.cos(ang) * e.strafe * sp * .25;
      } else if (A === 'beast') {
        if (d < 180 && e.cd <= 0) { e.state = 'crouch'; e.st = 0; e.lock = ang; break; }
        const circle = d < 210 ? 1 : 0;
        mvx = dx / d * sp * (1 - circle * .9) - Math.sin(ang) * e.strafe * sp * circle; mvy = dy / d * sp * (1 - circle * .9) + Math.cos(ang) * e.strafe * sp * circle;
      } else if (A === 'caster') {
        const want = 240;
        if (d < 150 && e.cd < 1.2 && e.blinkCD === undefined || d < 110 && (e.blinkCD || 0) <= 0) { blink(e); break; }
        const k = d < want - 50 ? -1 : d > want + 60 ? 1 : 0;
        mvx = dx / d * sp * k - Math.sin(ang) * e.strafe * sp * .6; mvy = dy / d * sp * k + Math.cos(ang) * e.strafe * sp * .6;
        if (e.cd <= 0 && d < 420) { e.state = 'cast'; e.st = 0; }
      } else if (A === 'brute') {
        if (d < 100 && e.cd <= 0) {
          e.state = 'windup'; e.st = 0;
          const fx = e.x + Math.cos(ang) * 50, fy = e.y + Math.sin(ang) * 50;
          haz({ x: fx, y: fy, r: e.elite ? 100 : 82, warn: .85, dmg: e.dmg, kb: 360, col: e.F.C.eye, style: e.kind === 'thurs' ? 'ice' : e.kind === 'emberthurs' ? 'fire' : 'dust', onFire: () => { SFX.slam(.6); shake(6); } });
          if (e.elite) haz({ type: 'ring', x: fx, y: fy, r0: 40, r1: 230, w: 30, warn: .85, act: .55, dmg: e.dmg * .6, col: e.F.C.eye });
          break;
        }
        mvx = dx / d * sp; mvy = dy / d * sp;
      }
      if (Math.random() < dt * .3) e.strafe *= -1;
      break;
    }
    case 'windup': {
      e.face = A === 'grunt' && e.st < .35 ? ang : e.face;
      const wu = A === 'brute' ? .85 : .5;
      if (e.st >= wu) { e.state = 'strike'; e.st = 0; e.hitDone = false; if (A === 'grunt') { e.vx = Math.cos(e.face) * 240; e.vy = Math.sin(e.face) * 240; SFX.swing(.8); } }
      break;
    }
    case 'strike': {
      if (A === 'grunt') {
        e.vx *= .85; e.vy *= .85; mvx = e.vx; mvy = e.vy;
        if (!e.hitDone && e.st > .06) {
          e.hitDone = true;
          const tg = targetOf(e), td = Math.hypot(tg.x - e.x, tg.y - e.y), ta = Math.atan2(tg.y - e.y, tg.x - e.x);
          if (td < 58 + tg.r && Math.abs(angDiff(e.face, ta)) < 1.1) { if (tg === P) hurtPlayer(e.dmg, e.x, e.y, 240); else tg.hp -= e.dmg; }
        }
      }
      if (e.st > (A === 'brute' ? .9 : .28)) { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': if (e.st > (A === 'brute' ? .7 : .55)) { e.state = 'chase'; e.st = 0; e.cd = rand(.6, 1.6); } break;
    case 'crouch': {
      e.face = e.lock = e.st < .3 ? ang : e.lock;
      if (e.st > .45) { e.state = 'pounce'; e.st = 0; e.hitDone = false; SFX.swing(.6); }
      break;
    }
    case 'pounce': {
      const s = 540 * (1 - e.st / .34); mvx = Math.cos(e.lock) * s; mvy = Math.sin(e.lock) * s;
      if (!e.hitDone) { const tg = targetOf(e); if (Math.hypot(tg.x - e.x, tg.y - e.y) < e.r + tg.r + 6) { e.hitDone = true; if (tg === P) hurtPlayer(e.dmg, e.x, e.y, 260); else tg.hp -= e.dmg; } }
      if (e.st > .34) { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'cast': {
      e.face = ang;
      if (e.st > .6) {
        const sh = e.F.shot, ox = e.x + Math.cos(ang) * 14, oy = e.y + Math.sin(ang) * 10;
        if (sh === 'hex') shoot({ x: ox, y: oy, vx: Math.cos(ang) * 170, vy: Math.sin(ang) * 170, kind: 'hex', dmg: e.dmg, home: 1.6, life: 3.4, r: 8 });
        else if (sh === 'ice') for (let k = -1; k <= 1; k++) shoot({ x: ox, y: oy, vx: Math.cos(ang + k * .22) * 260, vy: Math.sin(ang + k * .22) * 260, kind: 'ice', dmg: e.dmg, life: 2 });
        else if (sh === 'bile') { const tx = T.x + T.vx * .4 || T.x, ty = T.y + (T.vy || 0) * .4; haz({ type: 'zone', x: tx, y: ty, r: 54, warn: .9, linger: 3.5, dmg: e.dmg * .6, col: '#9adf4a', slow: 1, onFire: h => { SFX.splash(); burst(h.x, h.y, 10, { type: 'dot', color: '#b8ff6a', smin: 40, smax: 120 }); } }); shoot({ x: ox, y: oy, vx: (tx - ox) / .9, vy: (ty - oy) / .9, kind: 'bile', dmg: 0, life: .88, r: 6, zh: 40 }); }
        else if (sh === 'fire') { for (let k = 0; k < 2; k++) shoot({ x: ox, y: oy, vx: Math.cos(ang + (k ? .15 : -.15)) * 230, vy: Math.sin(ang + (k ? .15 : -.15)) * 230, kind: 'fire', dmg: e.dmg, life: 2.4, r: 9 }); SFX.fire(); }
        e.state = 'chase'; e.st = 0; e.cd = rand(2, 3);
      }
      break;
    }
    case 'hurt': {
      e.kbx *= Math.max(0, 1 - 9 * dt); e.kby *= Math.max(0, 1 - 9 * dt); mvx = e.kbx; mvy = e.kby;
      if (e.st > .3) { e.state = 'chase'; e.st = 0; e.cd = Math.max(e.cd, .3); }
      break;
    }
  }
  if (e.state !== 'strike' || A !== 'grunt') { e.vx = lerp(e.vx, mvx, Math.min(1, 10 * dt)); e.vy = lerp(e.vy, mvy, Math.min(1, 10 * dt)); }
  if (e.state === 'hurt' || e.state === 'pounce') { e.vx = mvx; e.vy = mvy; }
  e.x += e.vx * dt; e.y += e.vy * dt;
  e.walk += Math.hypot(e.vx, e.vy) * dt * .07;
  collide(e);
}
function blink(e) {
  burst(e.x, e.y - 14, 12, { type: 'smoke', color: '#0c0a08', smin: 30, smax: 90, lmin: .4, lmax: .8, szmin: 6, szmax: 12, grow: 20, alpha: .6 });
  const a = Math.atan2(e.y - P.y, e.x - P.x) + rand(-1, 1);
  e.x += Math.cos(a) * 190; e.y += Math.sin(a) * 190; collide(e);
  e.blinkCD = 3; e.cd = Math.min(e.cd, .8);
  burst(e.x, e.y - 14, 12, { type: 'smoke', color: '#0c0a08', smin: 30, smax: 90, lmin: .4, lmax: .8, szmin: 6, szmax: 12, grow: 20, alpha: .6 });
}

/* ---------------- pickups ---------------- */
function updPicks(dt) {
  for (let i = G.picks.length - 1; i >= 0; i--) {
    const k = G.picks[i]; k.t += dt;
    const dx = P.x - k.x, dy = P.y - 14 - k.y, d = Math.hypot(dx, dy);
    if (k.kind === 'silver') {
      if (k.z > 0 || k.vz > 0) { k.vz -= 600 * dt; k.z += k.vz * dt; if (k.z < 0) { k.z = 0; k.vz = Math.abs(k.vz) > 60 ? -k.vz * .4 : 0; SFX.tick(); } }
      k.vx *= .92; k.vy *= .92;
      if (k.t > .45 && d < 110) { const s = 520 * (1 - d / 140) + 160; k.vx = dx / d * s; k.vy = dy / d * s; }
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (d < 16 && k.t > .3) { S.silver += k.val; SFX.coin(); G.picks.splice(i, 1); hudDirty(); continue; }
      if (k.t > 25) G.picks.splice(i, 1);
    } else {
      if (k.t < .5) { k.vx *= .93; k.vy *= .93; k.vy -= 20 * dt; }
      else { const s = Math.min(560, 200 + k.t * 300); k.vx = lerp(k.vx, dx / d * s, .15); k.vy = lerp(k.vy, dy / d * s, .15); }
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (d < 14) {
        if (k.kind === 'ond') { addCharge(.11 * (1 + .6 * S.up.drink)); SFX.wisp(); }
        if (k.kind === 'heal') { P.hp = Math.min(S.maxhp, P.hp + 9); SFX.heart(); }
        G.picks.splice(i, 1); continue;
      }
    }
  }
}
function drawPicks() {
  for (const k of G.picks) {
    if (k.kind === 'silver') {
      const y = k.y - k.z - 2, w = Math.abs(Math.cos(k.t * 7)) * 3.2 + .6;
      ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.ellipse(k.x, y + .8, w, 3.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8d8a8'; ctx.beginPath(); ctx.ellipse(k.x, y, w, 3.2, 0, 0, TAU); ctx.fill();
      glow(k.x, y, 7, '#ffe6a0', .35);
    } else if (k.kind === 'ond') {
      glow(k.x, k.y, 12, '#8fd6ff', .7); ctx.fillStyle = '#eaf8ff'; ctx.beginPath(); ctx.arc(k.x, k.y, 2, 0, TAU); ctx.fill();
    } else { glow(k.x, k.y, 12, '#ff6a5a', .7); ctx.fillStyle = '#ffe0d0'; ctx.beginPath(); ctx.arc(k.x, k.y, 2.4, 0, TAU); ctx.fill(); }
  }
}

/* =====================================================================
   GOD-POWERS
   ===================================================================== */
const POWERS = {
  frigg: { name: "Frigg's Grace", rune: 'ᛒ', god: 'Frigg', desc: 'Mends wounds. Restores nearly half your strength.' },
  thor: { name: "Thor's Hammer", rune: 'ᚦ', god: 'Thórr', desc: 'The Thunderer strikes where you aim. Lightning leaps to nearby foes.' },
  freyja: { name: "Freyja's Falcon-Cloak", rune: 'ᚠ', god: 'Freyja', desc: 'Swift as the falcon: faster steps, faster blows, quicker rolls.' },
  heimdall: { name: "Heimdall's Horn", rune: 'ᛉ', god: 'Heimdallr', desc: 'Gjallarhorn hurls foes back, shatters missiles, and wards you a while.' },
  loki: { name: "Loki's Mask", rune: 'ᛚ', god: 'Loki', desc: 'Leave a false Einar behind. Foes chase the lie, and it bursts.' },
  odin: { name: 'Gungnir', rune: 'ᚨ', god: 'Óðinn', desc: "The All-Father's spear. It never misses, and nothing stops it." },
};
const POWER_ORDER = ['frigg', 'thor', 'freyja', 'heimdall', 'loki', 'odin'];
function addCharge(v) {
  const mx = stat.maxCharge();
  for (const k of S.slots) if (k && S.powers[k]) S.charge[k] = Math.min(mx, (S.charge[k] || 0) + v);
  hudDirty();
}
function refillPowers() { const mx = stat.maxCharge(); for (const k of POWER_ORDER) if (S.powers[k]) S.charge[k] = mx; hudDirty(); }
function usePower(slot) {
  const k = S.slots[slot];
  if (!k) { note('No god answers that rune yet'); return; }
  if ((S.charge[k] || 0) < 1) { note('The gods are silent. Drink from a well.'); tone('sine', 200, 150, .2, .06); return; }
  S.charge[k] -= 1; hudDirty();
  const p = P;
  if (k === 'frigg') {
    p.hp = Math.min(S.maxhp, p.hp + S.maxhp * .45); SFX.heal();
    G.fx.push({ t: 0, life: 1.6, draw: fxFrigg, x: p.x, y: p.y });
    for (let i = 0; i < 26; i++) part({ x: p.x + Math.cos(i) * 22, y: p.y - 10, vx: -Math.sin(i) * 60, vy: -rand(30, 90), life: 1.2, type: 'ember', color: '#ffd27a', size: 2.4, add: 1 });
  } else if (k === 'thor') {
    const tg = nearestTarget(p.x, p.y, 320, p.face);
    const tx = tg ? tg.x : p.x + Math.cos(p.face) * 150, ty = tg ? tg.y : p.y + Math.sin(p.face) * 150;
    G.fx.push({ t: 0, life: 1.5, draw: fxThor, x: tx, y: ty });
    haz({ owner: 'p', x: tx, y: ty, r: 125, warn: .55, act: .15, dmg: 62 * stat.dmg(), kb: 420, col: '#ffd27a', style: 'bolt', showTele: 1,
      onFire: h => {
        SFX.thunder(); shake(14); G.flash = .55; G.flashCol = '#fff6d0';
        const near = G.enemies.filter(e => !e.dead && Math.hypot(e.x - h.x, e.y - h.y) < 320).slice(0, 4);
        for (const e of near) { G.fx.push({ t: 0, life: .3, draw: fxChain, x: h.x, y: h.y, x2: e.x, y2: e.y }); hitEnemy(e, 22 * stat.dmg(), Math.atan2(e.y - h.y, e.x - h.x), 200, true); }
        burst(h.x, h.y, 30, { type: 'spark', color: '#fff2b0', add: 1, smin: 120, smax: 420 }); decal(h.x, h.y, 40, '#0a0806');
      } });
  } else if (k === 'freyja') {
    p.freyja = 8.5; SFX.speed();
    burst(p.x, p.y - 20, 22, { type: 'feather', color: '#ffe6a0', smin: 30, smax: 120, lmin: .8, lmax: 1.4, szmin: 2, szmax: 3.4 });
  } else if (k === 'heimdall') {
    SFX.horn(); shake(6); G.flash = .3; G.flashCol = '#ffe6a0';
    p.shield = 5.5;
    G.fx.push({ t: 0, life: 1.2, draw: fxHorn, x: p.x, y: p.y });
    haz({ owner: 'p', type: 'ring', x: p.x, y: p.y, r0: 20, r1: 230, w: 46, warn: 0, act: .35, dmg: 12 * stat.dmg(), kb: 640, col: '#ffd27a' });
    for (let i = G.proj.length - 1; i >= 0; i--) { const q = G.proj[i]; if (q.owner === 'e' && Math.hypot(q.x - p.x, q.y - p.y) < 260) { burst(q.x, q.y, 6, { type: 'spark', color: '#ffe08a', add: 1 }); G.proj.splice(i, 1); } }
  } else if (k === 'loki') {
    SFX.trick();
    G.decoy = { x: p.x, y: p.y, r: 11, vx: 0, vy: 0, hp: 70, t: 0, life: 7, face: p.face, walk: 0 };
    p.stealth = 6.5;
    burst(p.x, p.y - 16, 18, { type: 'smoke', color: '#5aff6a', smin: 30, smax: 100, lmin: .4, lmax: .9, szmin: 6, szmax: 12, grow: 20, alpha: .35 });
    for (const e of G.enemies) if (!e.dead) { e.aggro = true; if (e.state === 'idle') e.state = 'chase'; }
  } else if (k === 'odin') {
    SFX.spear(); SFX.caw();
    const tg = nearestTarget(p.x, p.y, 700, p.face), a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : p.face;
    p.face = a;
    G.fx.push({ t: 0, life: .9, draw: fxOdin, x: p.x, y: p.y, a });
    shoot({ owner: 'p', x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, kind: 'spear', dmg: 80 * stat.dmg(), life: 1.1, r: 16, pierce: 1, kb: 420 });
  }
}
function updDecoy(dt) {
  const d = G.decoy; if (!d) return;
  d.t += dt;
  if (d.t > d.life || d.hp <= 0) {
    haz({ owner: 'p', x: d.x, y: d.y, r: 110, warn: 0, act: .15, dmg: 34 * stat.dmg(), kb: 380, col: '#7aff6a', style: 'gold' });
    burst(d.x, d.y - 16, 30, { type: 'smoke', color: '#5aff6a', smin: 40, smax: 160, lmin: .4, lmax: 1, szmin: 6, szmax: 14, grow: 30, alpha: .4 });
    SFX.trick(); shake(5); G.decoy = null; P.stealth = 0;
  }
}
/* the golden spectres, after Valhalla's own ghost-gods */
function goldStroke(fill = .18) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2.4; ctx.fillStyle = `rgba(255,150,40,${fill})`; }
function fxChain(f) { drawBolt(f.x, f.y - 10, f.x2, f.y2 - 14, 1 - f.t / f.life, '#bfe3ff'); }
function fxFrigg(f) {
  const k = f.t / f.life, a = Math.sin(k * PI);
  ctx.save(); ctx.translate(f.x, f.y - 60); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
  goldStroke(.15);
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 30); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -10, 10, 18, 0, 0, TAU); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 26 + i * 8, 8 + i * 3, f.t * 4 + i, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, -56, 9, 0, TAU); ctx.stroke();
  ctx.restore(); glow(f.x, f.y - 30, 80, '#ffcf6a', a * .5);
}
function fxHorn(f) {
  const k = f.t / f.life, a = 1 - k;
  ctx.save(); ctx.translate(f.x, f.y - 70); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; goldStroke(.2);
  ctx.beginPath(); ctx.moveTo(-40, 10); ctx.quadraticCurveTo(-10, -30, 40, -24); ctx.lineTo(44, -6); ctx.quadraticCurveTo(0, -10, -36, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(46, -14, 12 + i * 12 + k * 40, -.8, .8); ctx.stroke(); }
  ctx.restore();
}
function fxOdin(f) {
  const k = f.t / f.life, a = Math.sin(k * PI);
  ctx.save(); ctx.translate(f.x - Math.cos(f.a) * 30, f.y - 20); ctx.globalAlpha = a * .9; ctx.globalCompositeOperation = 'lighter'; goldStroke(.14);
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-20, -80); ctx.lineTo(20, -80); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -100, 38, 7, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, -100); ctx.lineTo(-8, -126); ctx.lineTo(10, -126); ctx.lineTo(14, -100); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -90, 10, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(3, -93, 4, 3);
  ctx.restore();
}
function updFx(dt) { for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.t += dt; if (f.t >= f.life) G.fx.splice(i, 1); } }
function drawFx() { for (const f of G.fx) f.draw(f); }
function drawDecoy() {
  const d = G.decoy; if (!d) return;
  d.face += .02;
  ctx.save(); ctx.globalCompositeOperation = 'source-over';
  drawEinar({ x: d.x, y: d.y, vx: 0, vy: 0, face: d.face, state: 'idle', st: 0, walk: 0, trail: [], flash: 0, shield: 0, freyja: 0, crit: 0, stealth: 0, charge: 0 }, { alpha: .75 });
  ctx.restore();
  glow(d.x, d.y - 18, 34, '#6aff5a', .35 + .15 * Math.sin(G.t * 9));
}

/* =====================================================================
   LANDMARKS
   ===================================================================== */
const ACT_R = { well: 80, altar: 95, shrine: 85, apple: 64, lore: 64, chest: 58, feather: 58, gate: 150, start: 80 };
function nodeDone(n) { const r = RS(G.world.id); return !!r.got[n.i]; }
