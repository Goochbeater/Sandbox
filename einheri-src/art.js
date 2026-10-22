/* =====================================================================
   ART — cel-shaded figures and landmarks, drawn live each frame.
   Light falls from the upper left; every shape gets a shadow crescent.
   ===================================================================== */
const INK = '#100a08';
function P_(fn) { return () => { ctx.beginPath(); fn(); }; }
function blob(x, y, rx, ry, rot = 0) { return P_(() => ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU)); }
function poly(pts) { return P_(() => { ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }); }
function limb(x1, y1, x2, y2, w1, w2) { return P_(() => taper(ctx, x1, y1, x2, y2, w1, w2)); }

/* ---------------- Einar ---------------- */
const EC = {
  cloak: ['#9a2e20', '#561710'], tunic: ['#4c5060', '#2a2c38'], mail: ['#9aa0aa', '#565b64'], fur: ['#8a6a4c', '#4e3a28'],
  skin: ['#e6b88f', '#a8765a'], beard: ['#d2a862', '#8a6634'], helm: ['#a8aeb8', '#5a606a'], horn: ['#efe4cc', '#a69576'],
  leg: ['#3e3832', '#1e1a17'], boot: ['#3a2a1e', '#1a120c'], sash: ['#c2402e', '#7a1e14'],
};
function drawEinar(p, o = {}) {
  const R = rigEinar(), x = p.x, y = p.y, t = G.t;
  const alpha = o.alpha !== undefined ? o.alpha : p.stealth > 0 ? .45 : 1;
  const fx = Math.cos(p.face), fy = Math.sin(p.face), side = fx < -.15 ? -1 : 1, back = fy < -.55;
  const moving = Math.hypot(p.vx, p.vy) > 20 && (p.state === 'move' || p.state === 'idle');
  const walk = p.walk, bob = moving ? Math.abs(Math.sin(walk)) * 1.6 : Math.sin(t * 2) * .4;
  const sit = p.pose === 'sit';
  let roll = 0;
  if (p.state === 'dodge') roll = (p.st / .34) * TAU * (p.ddx < 0 ? -1 : 1);
  const flash = p.flash > 0 && (p.flash * 30 | 0) % 2 === 0;
  ctx.save(); ctx.globalAlpha = alpha;
  dropShadow(ctx, x + 1.5, y + 1, 14, 5.5, .9);
  if (p.shield > 0) { const a = Math.min(1, p.shield) * (.6 + .2 * Math.sin(t * 8)); glowPost(x, y - 20, 50, '#ffd27a', a * .45); ctx.strokeStyle = hexA('#ffe7a8', a * .8); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y - 20, 26, 30, 0, 0, TAU); ctx.stroke(); }
  if (p.freyja > 0) drawFalconWings(x, y - 26, t, Math.min(1, p.freyja));
  const big = G.scene && G.scene.kind === 'arena' && p === P ? 1.2 : 1;
  if (big > 1) { ctx.strokeStyle = 'rgba(255,226,170,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 1, 20, 7, 0, 0, TAU); ctx.stroke(); }
  ctx.translate(x, y - bob + (sit ? 8 : 0)); ctx.scale(1.12 * big, 1.12 * big);
  if (roll) { ctx.translate(0, -14); ctx.rotate(roll); ctx.scale(1, .8); ctx.translate(0, 14); }
  const ax = axePose(p);
  const pp = (spr, px, py, rot = 0, sx = 1, sy = 1) => { ctx.save(); ctx.translate(px, py); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy); ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu); if (flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * .7; ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu); } ctx.restore(); };
  // the weapon arm reaches from the shoulder to wherever the axe-hand is; the axe is posed in world space
  const weapon = () => {
    const shx = side * 6.5, shy = -24.5, dx = ax.hx - shx, dy = ax.hy - shy, d = Math.hypot(dx, dy);
    const an = Math.atan2(dy, dx); pp(R.arm, shx, shy, an, clamp(d / 13, .55, 1.5), Math.cos(an) < 0 ? -1 : 1);
    pp(R.axe, ax.hx, ax.hy, ax.a);
  };
  ctx.save(); ctx.scale(side, 1);
  const drift = clamp(-p.vx * .004 * side, -.2, .2), sw = Math.sin(t * 5 + walk) * .03;
  const st = moving ? Math.sin(walk) * .5 : 0;
  const legs = () => {
    if (sit) { pp(R.leg, -2.5, -13, -1.25, 1, .9); pp(R.leg, 3, -13, -1.35, 1, .9); return; }
    pp(R.leg, -3.2, -13.4, st, 1, 1 - Math.max(0, -Math.sin(walk)) * .12 * (moving ? 1 : 0));
    pp(R.leg, 3.4, -13.4, -st, 1, 1 - Math.max(0, Math.sin(walk)) * .12 * (moving ? 1 : 0));
  };
  const freeArm = () => pp(R.arm, -6.5, -24, PI / 2 + .2 + (moving ? Math.sin(walk) * .35 : Math.sin(t * 2) * .04), .82, -1);
  if (!back) {
    ctx.save(); ctx.translate(0, -27); ctx.rotate(drift + sw); ctx.scale(1 + Math.abs(drift) * .6, 1); ctx.translate(0, 27); pp(R.cloak, 0, 0); ctx.restore();
    freeArm();
    legs();
    ctx.restore(); if (ax.behind) weapon(); ctx.save(); ctx.scale(side, 1);
    pp(R.torso, 0, 0);
    pp(R.head, 0, 0);
    ctx.restore();
    if (!ax.behind) weapon();
  } else {
    legs(); freeArm();
    pp(R.torsoB, 0, 0);
    ctx.restore(); if (ax.behind) weapon(); ctx.save(); ctx.scale(side, 1);
    ctx.save(); ctx.translate(0, -25); ctx.rotate(drift + sw); ctx.scale(1 + Math.abs(drift) * .6, 1); ctx.translate(0, 25); pp(R.cloakB, 0, 0); ctx.restore();
    pp(R.headB, 0, 0);
    ctx.restore();
    if (!ax.behind) weapon();
  }
  ctx.restore();
  // swing trail
  if (p.trail.length > 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < p.trail.length; i++) {
      const a = p.trail[i - 1], b = p.trail[i], k = i / p.trail.length;
      ctx.fillStyle = hexA(p.state === 'heavy' || p.crit > 0 ? '#ffcf7a' : '#f4ead8', .6 * k);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[2], b[3]); ctx.lineTo(a[2], a[3]); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (p.state === 'charge') {
    const c = p.charge, ax2 = x + ax.hx + Math.cos(ax.a) * 28, ay2 = y - bob + ax.hy + Math.sin(ax.a) * 28;
    glowPost(ax2, ay2, 14 + c * 28, '#ff9a3a', .3 + c * .6);
    if (p.chargeReady) glowPost(ax2, ay2, 10, '#ffffff', .7 + .3 * Math.sin(t * 20));
  }
  if (p.crit > 0) glowPost(x, y - 20, 32, '#ffd27a', .25 + .1 * Math.sin(t * 10));
}
function drawAxe(ax, flash, side = 1) {
  const L = 31, c = Math.cos(ax.a), s = Math.sin(ax.a);
  const hx0 = ax.hx, x0 = hx0 - c * 6, y0 = ax.hy - s * 6, x1 = hx0 + c * L, y1 = ax.hy + s * L;
  // the axe is posed in world-space; undo the mirror for it
  ctx.save(); ctx.scale(side, 1); CEL_LX = 1;
  ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = flash ? '#fff' : '#86603c'; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,190,.45)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(x0 - s, y0 + c * .5); ctx.lineTo(x1 - s, y1 + c * .5); ctx.stroke();
  cel(blob(hx0, ax.hy, 2.8, 2.8), flash ? '#fff' : '#e6b88f', '#a8765a', .6, INK, 1);
  ctx.translate(x1 - c * 3, y1 - s * 3); ctx.rotate(ax.a);
  cel(P_(() => { ctx.moveTo(-3, -2.4); ctx.lineTo(2, -2.4); ctx.quadraticCurveTo(6.5, -6.5, 9.5, -13); ctx.quadraticCurveTo(13, -4, 9.5, 9); ctx.quadraticCurveTo(5.5, 4.5, 2, 3); ctx.lineTo(-3, 3); ctx.closePath(); }), flash ? '#fff' : '#e4e8ee', '#8a9098', 1.4, INK, 1.5);
  if (!flash) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(10, -11); ctx.quadraticCurveTo(12.2, -3, 9.6, 7); ctx.stroke(); }
  ctx.restore();
  CEL_LX = side;
}

/* ---------------- the foes ---------------- */
/* ---------------- landmarks ---------------- */
function drawNode(n) {
  const x = n.x, y = n.y, t = G.t, done = n.t === 'altar' ? RS(G.world.id).runes[n.rune] : nodeDone(n);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; CEL_LX = 1;
  const stone = ['#8a857c', '#4a4640'], dstone = ['#6a655e', '#33302b'];
  switch (n.t) {
    case 'well': {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 6, 56, 26, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0a1620'; ctx.beginPath(); ctx.ellipse(x, y, 42, 20, 0, 0, TAU); ctx.fill();
      const gr = ctx.createRadialGradient(x - 6, y - 4, 2, x, y, 36); gr.addColorStop(0, '#e6faff'); gr.addColorStop(.3, '#6ec4ee'); gr.addColorStop(1, '#0d2a40');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, 35, 15.5, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 2; k++) { const r = ((t * .45 + k * .5) % 1); ctx.strokeStyle = `rgba(255,255,255,${.5 * (1 - r)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, 32 * r, 14 * r, 0, 0, TAU); ctx.stroke(); }
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU, sx = x + Math.cos(a) * 44, sy = y + Math.sin(a) * 21, sy2 = sy - (Math.sin(a) > 0 ? 7 : 5);
        cel(blob(sx, sy2, 11, 8, a * .2), stone[0], stone[1], 1.6, INK, 1.5);
      }
      // Mímir's head, carved and wise
      cel(blob(x, y - 34, 13, 16), '#8a857c', '#4a4640', 2, INK, 1.8);
      cel(P_(() => { ctx.moveTo(x - 11, y - 28); ctx.quadraticCurveTo(x, y - 6, x + 11, y - 28); ctx.quadraticCurveTo(x, y - 20, x - 11, y - 28); ctx.closePath(); }), '#6a655e', '#3a3630', 1, INK, 1.4);
      ctx.fillStyle = INK; ctx.fillRect(x - 6.5, y - 39, 4, 1.6); ctx.fillRect(x + 2.5, y - 39, 4, 1.6);
      ctx.fillStyle = '#bff0ff'; ctx.fillRect(x - 6, y - 37.4, 3, 1.4); ctx.fillRect(x + 3, y - 37.4, 3, 1.4);
      glowPost(x, y, 74, '#5fc0ff', .4 + .1 * Math.sin(t * 2)); glowPost(x - 2, y - 37, 10, '#bff0ff', .7);
      G.lights.push({ x, y, r: 240, i: .9, col: '#7fd0ff' });
      break;
    }
    case 'altar': {
      const tr = G.trial && G.trial.node === n;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 4, 30, 10, 0, 0, TAU); ctx.fill();
      cel(poly([x - 22, y, x - 19, y - 32, x + 19, y - 32, x + 22, y]), stone[0], stone[1], 3, INK, 2);
      cel(blob(x, y - 32, 20, 7.5), '#a29c92', '#5a554e', 1.5, INK, 2);
      ctx.strokeStyle = hexA('#ff9a3a', done ? .15 : .8); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x - 6, y - 24); ctx.lineTo(x - 6, y - 6); ctx.moveTo(x - 6, y - 19); ctx.lineTo(x + 5, y - 11); ctx.stroke();
      if (!done) {
        const fy = y - 68 + Math.sin(t * 2) * 5;
        glowPost(x, fy, 52, '#ff8a2b', .7); ctx.fillStyle = '#fff0c0'; ctx.font = '600 32px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillText(['ᛟ', 'ᛞ'][n.rune], x, fy + 11);
        for (let k = 0; k < 3; k++) { const a = t * 1.5 + k * TAU / 3; glowPost(x + Math.cos(a) * 22, fy + Math.sin(a) * 8, 5, '#ffd27a', .8); }
        G.lights.push({ x, y: fy, r: 220, i: .85, col: '#ff9a3a' });
      }
      if (tr) drawTrialRing();
      break;
    }
    case 'shrine': drawShrine(n, x, y, done, t); break;
    case 'apple': {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 20, 7, 0, 0, TAU); ctx.fill();
      cel(poly([x - 11, y, x - 9, y - 22, x + 9, y - 22, x + 11, y]), stone[0], stone[1], 2, INK, 1.8);
      cel(blob(x, y - 22, 13, 5), '#a29c92', '#5a554e', 1, INK, 1.8);
      if (!done) {
        const ay = y - 46 + Math.sin(t * 2.2) * 4;
        glowPost(x, ay, 50, '#ffcf4a', .7);
        const gr = ctx.createRadialGradient(x - 3, ay - 3, 1, x, ay, 10); gr.addColorStop(0, '#fff8cc'); gr.addColorStop(.5, '#f2b52e'); gr.addColorStop(1, '#a86a10');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, ay, 9.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = '#3a2a10'; ctx.beginPath(); ctx.moveTo(x, ay - 8); ctx.lineTo(x + 1, ay - 13); ctx.stroke();
        cel(blob(x + 5, ay - 12, 5.5, 2.5, -.4), '#8ab050', '#4a6a28', .6, INK, .8);
        G.lights.push({ x, y: ay, r: 170, i: .7, col: '#ffd27a' });
      }
      break;
    }
    case 'lore': {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 3, 26, 8, 0, 0, TAU); ctx.fill();
      const path = P_(() => { ctx.moveTo(x - 16, y); ctx.lineTo(x - 18, y - 42); ctx.quadraticCurveTo(x - 16, y - 70, x, y - 72); ctx.quadraticCurveTo(x + 16, y - 70, x + 18, y - 42); ctx.lineTo(x + 16, y); ctx.closePath(); });
      cel(path, '#7a766e', '#3e3a35', 3, INK, 2.2);
      ctx.save(); path(); ctx.clip(); ctx.fillStyle = 'rgba(150,170,110,.35)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x - 12 + hash2(n.i, i) * 24, y - 6 - hash2(i, n.i) * 50, 4, 2.5, 0, 0, TAU); ctx.fill(); } ctx.restore();
      ctx.strokeStyle = done ? 'rgba(20,16,14,.85)' : hexA('#ff9a3a', .8 + .2 * Math.sin(t * 3)); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 10, y - 8); ctx.quadraticCurveTo(x - 14, y - 52, x, y - 61); ctx.quadraticCurveTo(x + 14, y - 52, x + 10, y - 8); ctx.stroke();
      for (let i = 0; i < 5; i++) { const yy = y - 50 + i * 8.5; ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(x - 4, yy + 5); ctx.lineTo(x + 3, yy + 2); ctx.stroke(); }
      if (!done) { glowPost(x, y - 32, 42, '#ff8a2b', .25); G.lights.push({ x, y: y - 30, r: 120, i: .5, col: '#ff9a3a' }); }
      break;
    }
    case 'chest': {
      const open = done, s = n.big ? 1.3 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(3, 2, 22, 7, 0, 0, TAU); ctx.fill();
      cel(poly([-17, 0, -17, -17, 17, -17, 17, 0]), '#7a4e2a', '#3a2412', 2, INK, 1.8);
      ctx.fillStyle = '#4a4c52'; ctx.fillRect(-13, -17, 3.5, 17); ctx.fillRect(9.5, -17, 3.5, 17);
      if (open) { cel(poly([-17, -17, -15, -32, 15, -32, 17, -17]), '#5a3a20', '#2a180a', 1.4, INK, 1.8); glowPost(0, -20, 24, '#ffd27a', .3); }
      else { cel(P_(() => { ctx.moveTo(-17, -17); ctx.quadraticCurveTo(0, -31, 17, -17); ctx.closePath(); }), '#8a5a32', '#4a2e16', 1.6, INK, 1.8); ctx.fillStyle = '#e2bb5a'; ctx.fillRect(-2.8, -21, 5.6, 6.5); glowPost(0, -17, 30, '#ffd27a', .25 + .1 * Math.sin(t * 3)); }
      ctx.restore();
      break;
    }
    case 'feather': {
      for (const [dx, dy, r] of [[-9, 0, 8], [8, 1, 9], [0, -8, 7], [-2, -15, 5]]) cel(blob(x + dx, y + dy, r, r * .72), dstone[0], dstone[1], 1.4, INK, 1.4);
      if (!done) {
        const fy = y - 46 + Math.sin(t * 1.6) * 6;
        glowPost(x, fy, 52, '#ffffff', .5 + .15 * Math.sin(t * 3));
        ctx.save(); ctx.translate(x, fy); ctx.rotate(-.5 + Math.sin(t) * .15);
        cel(P_(() => { ctx.moveTo(0, 18); ctx.quadraticCurveTo(-10, 0, -2, -20); ctx.quadraticCurveTo(8, -4, 0, 18); ctx.closePath(); }), '#ffffff', '#c8c4be', 1.2, '#8a8070', 1);
        ctx.strokeStyle = '#9a9080'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-1.5, -16); ctx.stroke();
        ctx.restore();
        G.lights.push({ x, y: fy, r: 160, i: .7, col: '#ffffff' });
      }
      break;
    }
    case 'gate': drawBossGate(n, x, y, t); break;
    case 'start': {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 4, 38, 11, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = hexA('#7ac8ff', .35 + .2 * Math.sin(t * 2)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 4, 56, 21, 0, 0, TAU); ctx.stroke();
      const path = P_(() => { ctx.moveTo(x - 21, y); ctx.lineTo(x - 25, y - 72); ctx.quadraticCurveTo(x - 19, y - 124, x + 2, y - 128); ctx.quadraticCurveTo(x + 23, y - 116, x + 23, y - 68); ctx.lineTo(x + 21, y); ctx.closePath(); });
      cel(path, '#7a7a82', '#36363e', 4, INK, 2.4);
      ctx.strokeStyle = hexA('#9fdcff', .9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 11, y - 82); ctx.quadraticCurveTo(x, y - 95, x + 11, y - 86); ctx.lineTo(x + 15, y - 88); ctx.moveTo(x - 11, y - 82); ctx.quadraticCurveTo(x - 4, y - 72, x + 7, y - 76); ctx.moveTo(x - 2, y - 78); ctx.lineTo(x - 13, y - 65); ctx.stroke();
      glowPost(x, y - 82, 34, '#7ac8ff', .4);
      G.lights.push({ x, y: y - 40, r: 190, i: .6, col: '#8fd0ff' });
      break;
    }
  }
}
function drawShrine(n, x, y, done, t) {
  const god = n.god, S0 = ['#9a948a', '#55504a'];
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 4, 40, 12, 0, 0, TAU); ctx.fill();
  cel(poly([x - 27, y, x - 27, y - 22, x + 27, y - 22, x + 27, y]), '#6a655e', '#33302b', 2.4, INK, 2);
  cel(poly([x - 31, y - 22, x - 31, y - 29, x + 31, y - 29, x + 31, y - 22]), '#8a857c', '#4a4640', 1.2, INK, 2);
  ctx.fillStyle = done ? 'rgba(60,52,44,.9)' : '#fff0c0'; ctx.font = '600 15px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillText(POWERS[god].rune, x, y - 6);
  if (!done) glowPost(x, y - 10, 24, '#ffb347', .5);
  ctx.save(); ctx.translate(x, y - 29);
  cel(P_(() => { ctx.moveTo(-18, 0); ctx.lineTo(-15, -54); ctx.quadraticCurveTo(0, -62, 15, -54); ctx.lineTo(18, 0); ctx.closePath(); }), S0[0], S0[1], 4, INK, 2);
  ctx.strokeStyle = 'rgba(40,36,30,.5)'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 6, -50); ctx.quadraticCurveTo(-11 + i * 7, -25, -12 + i * 8, -2); ctx.stroke(); }
  cel(blob(0, -66, 10, 11), S0[0], S0[1], 2, INK, 2);
  if (god === 'thor') { cel(poly([14, -50, 19, -50, 19, -20, 14, -20]), S0[0], S0[1], 1, INK, 1.6); cel(poly([7, -58, 27, -58, 27, -46, 7, -46]), '#aaa49a', '#5a554e', 1.4, INK, 1.8); cel(P_(() => { ctx.moveTo(-9, -60); ctx.quadraticCurveTo(0, -46, 9, -60); ctx.quadraticCurveTo(0, -54, -9, -60); ctx.closePath(); }), S0[0], S0[1], .6, INK, 1.2); }
  if (god === 'freyja') for (const s of [-1, 1]) cel(P_(() => { ctx.moveTo(s * 11, -48); ctx.quadraticCurveTo(s * 38, -64, s * 33, -18); ctx.quadraticCurveTo(s * 22, -34, s * 13, -30); ctx.closePath(); }), S0[0], S0[1], 1.6, INK, 1.8);
  if (god === 'heimdall') cel(P_(() => { ctx.moveTo(8, -52); ctx.quadraticCurveTo(28, -68, 34, -88); ctx.lineTo(41, -84); ctx.quadraticCurveTo(30, -60, 12, -45); ctx.closePath(); }), '#aaa49a', '#5a554e', 1.4, INK, 1.8);
  if (god === 'loki') cel(P_(() => { ctx.moveTo(-12, -68); ctx.quadraticCurveTo(0, -90, 12, -68); ctx.lineTo(10, -59); ctx.quadraticCurveTo(0, -67, -10, -59); ctx.closePath(); }), '#aaa49a', '#5a554e', 1.4, INK, 1.8);
  if (god === 'odin') { ctx.strokeStyle = INK; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(19, 0); ctx.lineTo(23, -100); ctx.stroke(); ctx.strokeStyle = S0[0]; ctx.lineWidth = 2.4; ctx.stroke(); cel(blob(0, -75, 20, 4.5), '#aaa49a', '#5a554e', 1, INK, 1.6); cel(poly([-8, -75, -5, -90, 6, -90, 9, -75]), '#aaa49a', '#5a554e', 1, INK, 1.6); }
  ctx.fillStyle = done ? '#2a2622' : '#fff0c0'; ctx.fillRect(1, -68, 3.4, 2);
  ctx.restore();
  if (!done) { glowPost(x, y - 75, 66, '#ffc04a', .3 + .12 * Math.sin(t * 2)); G.lights.push({ x, y: y - 50, r: 210, i: .7, col: '#ffcf7a' }); }
}
function drawBossGate(n, x, y, t) {
  const r = RS(G.world.id), lit = r.runes[0] + r.runes[1], open = lit >= 2;
  const P = G.world.pal, gcol = P.glow;
  const st = [mix(P.rockL, '#ffffff', .05), P.rockD];
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(x + 14, y + 10, 190, 36, 0, 0, TAU); ctx.fill();
  if (open) {
    const gr = ctx.createRadialGradient(x, y - 110, 10, x, y - 110, 130); gr.addColorStop(0, '#fff0d0'); gr.addColorStop(.3, hexA(gcol, .95)); gr.addColorStop(1, 'rgba(0,0,0,.95)');
    ctx.fillStyle = gr; ctx.fillRect(x - 78, y - 218, 156, 218);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 78, y - 218, 156, 218); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 7; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x, y - 110, 20 + i * 26 + (t * 30 % 26), t + i, t + i + 4); ctx.stroke(); }
    ctx.restore();
    G.lights.push({ x, y: y - 100, r: 380, i: 1, col: gcol }); glowPost(x, y - 100, 150, gcol, .4);
  } else {
    for (const s of [-1, 1]) {
      const dx = s < 0 ? x - 78 : x;
      cel(poly([dx, y, dx, y - 218, dx + 78, y - 218, dx + 78, y]), '#3a2a20', '#1a120c', 3, INK, 2.4);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(dx + k * 15.6, y - 216); ctx.lineTo(dx + k * 15.6, y - 2); ctx.stroke(); }
    }
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 8; for (const yy of [-180, -110, -40]) { ctx.beginPath(); ctx.moveTo(x - 76, y + yy); ctx.lineTo(x + 76, y + yy); ctx.stroke(); }
    ctx.strokeStyle = '#6a6a74'; ctx.lineWidth = 2; for (const yy of [-183, -113, -43]) { ctx.beginPath(); ctx.moveTo(x - 76, y + yy); ctx.lineTo(x + 76, y + yy); ctx.stroke(); }
    for (let i = 0; i < 2; i++) {
      const sx = x + (i ? 32 : -32), sy = y - 122, on = r.runes[i];
      cel(blob(sx, sy, 17, 17), '#4a4a52', '#1a1a1e', 2, INK, 2.4); ctx.fillStyle = '#0a0808'; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, TAU); ctx.fill();
      if (on) { glowPost(sx, sy, 44, '#ff8a2b', .8); ctx.fillStyle = '#fff0c0'; ctx.font = '600 18px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillText(['ᛟ', 'ᛞ'][i], sx, sy + 6); G.lights.push({ x: sx, y: sy, r: 130, i: .7, col: '#ff9a3a' }); }
    }
  }
  for (const s of [-1, 1]) {
    const px = x + s * 112;
    cel(poly([px - 38, y, px - 32, y - 234, px + 32, y - 234, px + 38, y]), st[0], st[1], 6, INK, 2.6);
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(px - 36, y - k * 40); ctx.lineTo(px + 36, y - k * 40 + 3); ctx.stroke(); }
    ctx.strokeStyle = hexA(gcol, .6); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(px, y - 205); ctx.lineTo(px, y - 150); ctx.moveTo(px - 9, y - 195); ctx.lineTo(px + 9, y - 172); ctx.moveTo(px, y - 120); ctx.lineTo(px + 9, y - 110); ctx.lineTo(px, y - 100); ctx.stroke();
  }
  cel(poly([x - 165, y - 228, x - 154, y - 272, x + 154, y - 272, x + 165, y - 228]), st[0], st[1], 4, INK, 2.6);
  cel(blob(x, y - 252, 36, 31), mix(st[0], '#ffffff', .08), st[1], 3, INK, 2.4);
  ctx.fillStyle = INK; ctx.fillRect(x - 19, y - 261, 13, 5); ctx.fillRect(x + 6, y - 261, 13, 5);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 17, y - 237); ctx.quadraticCurveTo(x, y - 230, x + 17, y - 237); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 4, y - 254); ctx.lineTo(x - 7, y - 243); ctx.lineTo(x + 4, y - 244); ctx.stroke();
  if (open || lit) { glowPost(x - 12, y - 258, 14, gcol, .9); glowPost(x + 12, y - 258, 14, gcol, .9); }
}
