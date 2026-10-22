/* =====================================================================
   STORY — speakers, portraits, dialogue, cutscenes, the hall, the saga
   ===================================================================== */
const SPK = {
  narr: { name: '', col: '#a89a86', cls: 'narr' },
  stone: { name: 'Rune-stone', col: '#ff9a3a', cls: 'stone' },
  einar: { name: 'Einar', col: '#e5b45a', p: 'einar' },
  hildr: { name: 'Hildr', col: '#cfc2ff', p: 'hildr' },
  bjarki: { name: 'Bjarki Half-Hand', col: '#ff9a5a', p: 'bjarki' },
  asta: { name: 'Ásta the Völva', col: '#9fe0c8', p: 'asta' },
  kolr: { name: 'Kolr the Skald', col: '#f0c87a', p: 'kolr' },
  muninn: { name: 'Muninn', col: '#a8b8d8', p: 'muninn' },
  odin: { name: 'The Wanderer', col: '#d8d0b8', p: 'odin' },
  allfather: { name: 'Óðinn All-Father', col: '#ffe2a0', p: 'odin' },
  angr: { name: 'Angrboða', col: '#ff8a2b', p: 'angr' },
  thrym: { name: 'Þrymr', col: '#9fe0ff', p: 'thrym' },
  nidhogg: { name: 'Níðhöggr', col: '#d8c8a8', p: 'nid' },
  surtr: { name: 'Surtr', col: '#ff6a1a', p: 'surtr' },
  utgard: { name: 'Útgarða-Loki', col: '#9cff6a', p: 'utgard' },
  skogul: { name: 'Skögul', col: '#ffe6a0', p: 'skogul' },
};

/* ---------------- portraits (ink on a disc) ---------------- */
function drawPortrait(id) {
  const c = $('portrait'), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 152, 152);
  const bg = { einar: '#3a1a14', hildr: '#24223a', bjarki: '#1a2a3a', asta: '#14302a', kolr: '#3a2a14', muninn: '#1a1e2a', odin: '#2a2620', angr: '#2a1408', thrym: '#14283a', nid: '#1e1810', surtr: '#3a1008', utgard: '#142a14', skogul: '#3a3020' }[id] || '#1a1a1a';
  const gr = g.createRadialGradient(76, 60, 10, 76, 76, 80); gr.addColorStop(0, mix(bg, '#ffffff', .12)); gr.addColorStop(1, bg);
  g.fillStyle = gr; g.fillRect(0, 0, 152, 152);
  g.translate(76, 84); g.lineJoin = 'round'; g.lineCap = 'round';
  // a giant whose painted rig is already built is shown as itself
  const PR = { angr: () => RIGS.angr && [[RIGS.angr.crown, AG.crown], [RIGS.angr.head, AG.neck], [RIGS.angr.jaw, AG.jaw], [0, -850], .62],
    surtr: () => RIGS.surtr && [[RIGS.surtr.head, SU.neck], [RIGS.surtr.beard, SU.neck], [0, -822], .62],
    utgard: () => RIGS.utgard && [[RIGS.utgard.utHead, [0, -400]], [0, -452], 1.25],
    skogul: () => RIGS.valk && [[RIGS.valk.head, [6, -300]], [10, -326], 1.8] };
  const pr = PR[id] && PR[id]();
  if (pr) { const k = pr.pop(), c = pr.pop(); for (const [spr, pv] of pr) g.drawImage(spr.c, (pv[0] + spr.ox - c[0]) * k - 0, (pv[1] + spr.oy - c[1]) * k - 8, spr.wu * k, spr.hu * k); return; }
  const ink = '#0a0706';
  const head = (col, rx = 26, ry = 31) => { g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -6, rx, ry, 0, 0, TAU); g.fill(); g.stroke(); };
  const shoulders = (col) => { g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-64, 80); g.quadraticCurveTo(-60, 26, 0, 22); g.quadraticCurveTo(60, 26, 64, 80); g.closePath(); g.fill(); g.stroke(); };
  const eyes = (col, y = -8, gap = 11, glowy) => { for (const s of [-1, 1]) { g.fillStyle = col; g.beginPath(); g.ellipse(s * gap, y, 4, 2.6, 0, 0, TAU); g.fill(); if (glowy) { g.globalCompositeOperation = 'lighter'; const r = g.createRadialGradient(s * gap, y, 0, s * gap, y, 14); r.addColorStop(0, hexA(col, .8)); r.addColorStop(1, hexA(col, 0)); g.fillStyle = r; g.fillRect(s * gap - 14, y - 14, 28, 28); g.globalCompositeOperation = 'source-over'; } } };
  switch (id) {
    case 'einar':
      g.fillStyle = '#6e1f18'; g.beginPath(); g.moveTo(-70, 80); g.quadraticCurveTo(-66, 20, 0, 18); g.quadraticCurveTo(66, 20, 70, 80); g.fill();
      g.fillStyle = '#6b5440'; for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(-50 + i * 9, 26 + (i % 2) * 4, 9, 7, 0, 0, TAU); g.fill(); }
      head('#d6ab86');
      g.fillStyle = '#b48a52'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-24, 4); g.quadraticCurveTo(-22, 46, 0, 54); g.quadraticCurveTo(22, 46, 24, 4); g.quadraticCurveTo(0, 18, -24, 4); g.fill(); g.stroke();
      g.strokeStyle = '#8a6a3c'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 6, 16); g.lineTo(i * 5, 46); g.stroke(); }
      g.fillStyle = '#7d828a'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(0, -10, 29, PI * 1.02, PI * 1.98); g.quadraticCurveTo(0, -16, -29, -8); g.closePath(); g.fill(); g.stroke();
      g.fillRect(-3, -20, 6, 22); g.strokeRect(-3, -20, 6, 22);
      eyes('#2a3a4a', -2, 11); break;
    case 'hildr': {
      const hood = !S.f.twist;
      g.fillStyle = '#5a5866'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 30, 20); g.quadraticCurveTo(s * 80, -10, s * 74, -60); g.quadraticCurveTo(s * 60, -10, s * 30, 6); g.fill(); g.strokeStyle = '#2a2830'; g.lineWidth = 2; g.stroke(); }
      shoulders('#4a4854');
      if (!hood) { g.fillStyle = '#e4e0ea'; g.beginPath(); g.moveTo(-30, -20); g.quadraticCurveTo(-40, 30, -26, 60); g.lineTo(26, 60); g.quadraticCurveTo(40, 30, 30, -20); g.fill(); }
      head('#e6d8d0', 24, 30);
      if (hood) { g.fillStyle = '#3c3a46'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-40, 40); g.quadraticCurveTo(-46, -50, 0, -44); g.quadraticCurveTo(46, -50, 40, 40); g.quadraticCurveTo(28, -10, 0, -34); g.quadraticCurveTo(-28, -10, -40, 40); g.fill(); g.stroke(); }
      else { g.fillStyle = '#f2eef6'; g.beginPath(); g.moveTo(-26, -6); g.quadraticCurveTo(-24, -42, 0, -40); g.quadraticCurveTo(24, -42, 26, -6); g.quadraticCurveTo(10, -30, -26, -6); g.fill(); g.strokeStyle = '#b8b2c4'; g.lineWidth = 1.5; g.stroke(); }
      eyes('#ffcf6a', -6, 10, true);
      g.strokeStyle = '#a07a70'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, 14); g.quadraticCurveTo(0, 17, 6, 14); g.stroke();
      g.strokeStyle = 'rgba(120,60,60,.5)'; g.beginPath(); g.moveTo(14, -18); g.lineTo(18, 4); g.stroke();
      break;
    }
    case 'bjarki':
      shoulders('#4a3424'); g.fillStyle = '#6a4a2a'; g.fillRect(-30, 30, 60, 50);
      head('#c9a88a', 30, 30);
      g.fillStyle = '#b8542a'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-30, -4); g.quadraticCurveTo(-40, 60, 0, 70); g.quadraticCurveTo(40, 60, 30, -4); g.quadraticCurveTo(0, 14, -30, -4); g.fill(); g.stroke();
      g.strokeStyle = '#7a3418'; g.lineWidth = 2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 7, 12); g.lineTo(i * 8, 60); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(-12, -18, 8, 4, .3, 0, TAU); g.fill();
      eyes('#2a2018', -10, 12);
      g.fillStyle = 'rgba(140,200,255,.12)'; g.fillRect(-76, -84, 152, 152); break;
    case 'asta':
      shoulders('#2a3a34');
      head('#c8b8a0', 22, 28);
      g.fillStyle = '#1e2a26'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-38, 50); g.quadraticCurveTo(-46, -46, 0, -42); g.quadraticCurveTo(46, -46, 38, 50); g.quadraticCurveTo(26, -6, 0, -30); g.quadraticCurveTo(-26, -6, -38, 50); g.fill(); g.stroke();
      g.strokeStyle = '#3a2a20'; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 15, -8); g.lineTo(s * 5, -8); g.stroke(); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(s * (6 + i * 2.6), -11); g.lineTo(s * (6 + i * 2.6), -5); g.stroke(); } }
      g.fillStyle = '#9fe0c8'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-32 + i * 8, 34 + Math.sin(i) * 3, 2.6, 0, TAU); g.fill(); }
      g.strokeStyle = '#a07a70'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, 10); g.lineTo(6, 10); g.stroke(); break;
    case 'kolr':
      shoulders('#5a3a1a');
      head('#d8b08c', 22, 30);
      g.fillStyle = '#a8302a'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-24, -20); g.quadraticCurveTo(-10, -66, 30, -50); g.quadraticCurveTo(10, -40, 24, -20); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#7a5a3a'; g.beginPath(); g.moveTo(-14, 12); g.quadraticCurveTo(0, 34, 14, 12); g.fill();
      eyes('#2a2018', -6, 10);
      g.strokeStyle = '#6a3a20'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-8, 8); g.quadraticCurveTo(0, 14, 8, 8); g.stroke();
      g.strokeStyle = '#c9a548'; g.lineWidth = 3; g.beginPath(); g.moveTo(34, 76); g.lineTo(40, 20); g.lineTo(62, 26); g.lineTo(56, 80); g.stroke(); g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(42 + i * 4, 24); g.lineTo(38 + i * 4, 74); g.stroke(); } break;
    case 'muninn':
      g.fillStyle = '#121418'; g.strokeStyle = '#000'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-50, 70); g.quadraticCurveTo(-46, 0, 0, -30); g.quadraticCurveTo(40, -40, 30, 10); g.quadraticCurveTo(60, 40, 50, 70); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#1a1c22'; g.beginPath(); g.moveTo(24, -24); g.lineTo(70, -10); g.lineTo(26, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(120,140,190,.4)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-40 + i * 8, 60); g.quadraticCurveTo(-20 + i * 8, 20, i * 6, -10); g.stroke(); }
      eyes('#cfe0ff', -16, 0, true); break;
    case 'odin':
      shoulders('#4a4640');
      head('#b8a890', 24, 28);
      g.fillStyle = '#d8d4cc'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-24, 0); g.quadraticCurveTo(-30, 60, 0, 72); g.quadraticCurveTo(30, 60, 24, 0); g.quadraticCurveTo(0, 16, -24, 0); g.fill(); g.stroke();
      g.fillStyle = '#2a2622'; g.beginPath(); g.ellipse(0, -30, 66, 14, -.08, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-24, -30); g.lineTo(-18, -70); g.quadraticCurveTo(0, -80, 18, -70); g.lineTo(24, -30); g.fill(); g.stroke();
      g.fillStyle = '#1a1612'; g.beginPath(); g.ellipse(-10, -8, 7, 4, 0, 0, TAU); g.fill();
      eyes('#ffe2a0', -8, 10, true); g.fillStyle = '#1a1612'; g.beginPath(); g.ellipse(-10, -8, 6, 4, 0, 0, TAU); g.fill(); break;
    case 'angr':
      head('#3a2c24', 26, 34); eyes('#ffb347', -6, 11, true);
      g.strokeStyle = '#1a110c'; g.lineWidth = 5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 14, -36); g.quadraticCurveTo(s * 34, -60, s * 30, -84); g.moveTo(s * 26, -56); g.lineTo(s * 50, -70); g.stroke(); }
      g.strokeStyle = '#5d5752'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-22 + i * 9, -30); g.quadraticCurveTo(-40 + i * 16, 20, -36 + i * 15, 76); g.stroke(); } break;
    case 'thrym':
      head('#8fb2d2', 30, 32); eyes('#ffffff', -6, 12, true);
      g.fillStyle = '#e8f8ff'; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-24 + i * 8, 10); g.lineTo(-22 + i * 8, 60 + (i % 2) * 12); g.lineTo(-18 + i * 8, 10); g.fill(); }
      g.fillStyle = '#5a6070'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(0, -12, 32, PI, TAU); g.fill(); g.stroke();
      for (const s of [-1, 1]) { g.fillStyle = '#9a9aa4'; g.beginPath(); g.moveTo(s * 24, -32); g.quadraticCurveTo(s * 66, -40, s * 60, -84); g.quadraticCurveTo(s * 50, -50, s * 18, -40); g.fill(); g.stroke(); } break;
    case 'nid':
      g.fillStyle = '#8e6e52'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-50, -20); g.quadraticCurveTo(10, -40, 70, 0); g.lineTo(60, 14); g.quadraticCurveTo(0, 10, -50, 20); g.closePath(); g.fill(); g.stroke();
      for (let i = 0; i < 5; i++) { g.fillStyle = '#a08468'; g.beginPath(); g.moveTo(-40, -14 + i * 7); g.lineTo(-74, -40 + i * 18); g.lineTo(-36, -6 + i * 7); g.fill(); g.stroke(); }
      eyes('#ffffff', -10, 0, true); break;
    case 'surtr':
      head('#5e2b20', 28, 32);
      for (const s of [-1, 1]) { g.fillStyle = '#120a08'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(s * 18, -30); g.quadraticCurveTo(s * 60, -50, s * 66, -10); g.quadraticCurveTo(s * 46, -30, s * 22, -18); g.fill(); g.stroke(); }
      for (const [col, k] of [['#b8300c', 1], ['#ff7a1e', .75], ['#ffd27a', .45]]) { g.fillStyle = col; g.beginPath(); g.moveTo(-24 * k, 6); g.quadraticCurveTo(-30 * k, 50 * k + 10, 0, 80 * k); g.quadraticCurveTo(30 * k, 50 * k + 10, 24 * k, 6); g.fill(); }
      eyes('#ffe07a', -8, 11, true); break;
    case 'utgard':
      shoulders('#17261a'); head('#c9cbb4', 20, 32); eyes('#d6ff7a', -6, 9, true);
      g.strokeStyle = '#c9a548'; g.lineWidth = 3.4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 10, -36); g.quadraticCurveTo(s * 30, -60, s * 26, -86); g.moveTo(s * 22, -56); g.lineTo(s * 44, -66); g.stroke(); }
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, 12); g.quadraticCurveTo(0, 20, 12, 8); g.stroke(); break;
    case 'skogul':
      shoulders('#b9c2cc'); head('#e8cdb0', 22, 28);
      g.fillStyle = '#e3b86a'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 18, -10); g.quadraticCurveTo(s * 30, 30, s * 22, 70); g.lineTo(s * 14, 70); g.quadraticCurveTo(s * 20, 30, s * 12, -4); g.fill(); }
      g.fillStyle = '#c9ccd2'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(0, -14, 26, PI, TAU); g.fill(); g.stroke();
      for (const s of [-1, 1]) { g.fillStyle = '#f4f1ea'; g.beginPath(); g.moveTo(s * 20, -24); g.quadraticCurveTo(s * 64, -62, s * 70, -30); g.quadraticCurveTo(s * 50, -34, s * 22, -16); g.fill(); g.stroke(); }
      eyes('#2a4a8a', -4, 10); break;
  }
}

/* ---------------- dialogue ---------------- */
const DLG = { open: false, who: null, text: '', shown: 0, choices: null, passive: false, onClose: null, t: 0 };
function dlgOpen(who, text, choices, passive) {
  const sp = SPK[who] || SPK.narr;
  DLG.open = true; DLG.who = who; DLG.text = typeof text === 'function' ? text() : text; DLG.shown = 0; DLG.choices = choices || null; DLG.passive = !!passive; DLG.t = 0;
  const el = $('dlg');
  el.className = 'on' + (sp.p ? '' : ' np') + (sp.cls ? ' ' + sp.cls : '');
  el.style.pointerEvents = passive ? 'none' : '';
  $('dlgWho').textContent = sp.name; $('dlgWho').style.color = sp.col;
  $('dlgSay').textContent = ''; $('choices').innerHTML = ''; $('dlgMore').style.display = 'none';
  if (sp.p) drawPortrait(sp.p);
  SFX.page();
}
function dlgClose() { DLG.open = false; $('dlg').className = ''; $('choices').innerHTML = ''; if (DLG.onClose) { const f = DLG.onClose; DLG.onClose = null; f(); } }
function dlgUpdate(rdt) {
  if (!DLG.open) return;
  DLG.t += rdt;
  if (DLG.shown < DLG.text.length) {
    const prev = DLG.shown | 0;
    DLG.shown = Math.min(DLG.text.length, DLG.shown + rdt * 58);
    if ((DLG.shown | 0) !== prev) { $('dlgSay').textContent = DLG.text.slice(0, DLG.shown | 0); if (prev % 3 === 0) SFX.tick(); }
    if (DLG.shown >= DLG.text.length) dlgFinish();
  }
}
function dlgFinish() {
  DLG.shown = DLG.text.length; $('dlgSay').textContent = DLG.text;
  if (DLG.choices && !$('choices').children.length) {
    DLG.choices.forEach((c, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = ''; b.textContent = c.t; if (c.nw) { const s = document.createElement('span'); s.className = 'nw'; s.textContent = 'new'; b.appendChild(s); }
      if (c.bye) b.className = 'bye';
      b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); SFX.ui(); const cb = DLG.choices; dlgClose(); G.csRet = i; if (cb[i].fn) cb[i].fn(); });
      $('choices').appendChild(b);
    });
  } else if (!DLG.passive && !DLG.choices) $('dlgMore').style.display = '';
}
function dlgTap() {
  if (!DLG.open || DLG.passive) return;
  if (DLG.shown < DLG.text.length) { dlgFinish(); return; }
  if (DLG.choices) return;
  if (DLG.t < .2) return;
  dlgClose();
}
function showLine(who, text) { dlgOpen(who, text, null, true); }
function hideLine() { if (DLG.open && DLG.passive) dlgClose(); }

/* ---------------- cutscene runner (generators yield waiters) ---------------- */
function runCS(gen, onDone) {
  G.cs = gen; G.csDone = onDone || null; G.csWait = null; G.lock = true; G.csRet = undefined;
  csStep();
}
function csStep() {
  while (G.cs) {
    const r = G.cs.next(G.csRet); G.csRet = undefined;
    if (r.done) { G.cs = null; G.lock = false; const f = G.csDone; G.csDone = null; if (f) f(); return; }
    const w = r.value;
    if (typeof w === 'function') { G.csWait = w; return; }
  }
}
function csUpdate(rdt) {
  if (!G.cs) return;
  if (G.csWait) { if (!G.csWait(rdt)) return; G.csWait = null; }
  csStep();
}
const wait = s => { let t = 0; return dt => (t += dt) >= s; };
const say = (who, text) => { dlgOpen(who, text); return () => !DLG.open; };
const ask = (who, text, opts) => { dlgOpen(who, text, opts.map(o => typeof o === 'string' ? { t: o } : o)); return () => !DLG.open; };
const fadeTo = (a, dur = .8) => { G.fadeTo = a; G.fadeSp = 1 / Math.max(.01, dur); return () => Math.abs(G.fade - a) < .01; };
function* talk(arr) { for (const l of arr) { if (!l) continue; if (typeof l === 'function') { const r = l(); if (r) yield* talk(r); continue; } yield say(l[0], l[1]); } }
function cardShow(o, auto) {
  $('cardK').textContent = o.k || ''; $('cardH').textContent = o.h || ''; $('cardE').textContent = o.e || '';
  $('cardN').textContent = o.n || ''; $('cardT').textContent = o.t || ''; $('cardS').textContent = o.s || '';
  $('cardH').style.display = o.h ? '' : 'none'; $('cardTap').style.display = auto ? 'none' : '';
  $('card').classList.add('on'); G.cardOpen = true; G.cardT = 0; SFX.page();
}
function cardHide() { $('card').classList.remove('on'); G.cardOpen = false; }
const card = (o, auto) => { cardShow(o, auto); let t = 0; return dt => { t += dt; if (auto && t > auto) { cardHide(); return true; } if (!G.cardOpen) return t > .3; return false; }; };
function setVig(name) { G.vig = name; G.vigT = 0; G.vigFlag = 0; }

/* =====================================================================
   VIGNETTES — painted memory-scenes, full screen
   ===================================================================== */
function drawVignette(rdt) {
  G.vigT += rdt;
  const t = G.vigT, g = ctx;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const w = W, h = H, k = Math.min(w, h) / 600;
  const V = VIGS[G.vig]; if (V) V(g, t, w, h, k);
  // breathing letterbox + grain
  g.fillStyle = '#000'; const lb = h * .06; g.fillRect(0, 0, w, lb); g.fillRect(0, h - lb, w, lb);
  g.drawImage(VIG, 0, 0, w, h);
}
function vsky(g, w, h, stops) { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
function vglow(g, x, y, r, col, a) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a); g.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); g.restore(); }
function vfig(g, x, y, s, col, opts = {}) { // a standing cloaked figure
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col;
  g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(-14, -30, -8, -46); g.quadraticCurveTo(0, -52, 8, -46); g.quadraticCurveTo(14, -30, 10, 0); g.closePath(); g.fill();
  g.beginPath(); g.arc(0, -54, 7, 0, TAU); g.fill();
  if (opts.axe) { g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.moveTo(8, -40); g.lineTo(20, -70); g.stroke(); g.beginPath(); g.moveTo(16, -66); g.quadraticCurveTo(28, -72, 26, -60); g.lineTo(18, -62); g.fill(); }
  if (opts.cloak) { g.fillStyle = opts.cloak; g.beginPath(); g.moveTo(-8, -46); g.quadraticCurveTo(-18 - Math.sin(G.vigT * 2) * 4, -20, -16 - Math.sin(G.vigT * 2.4) * 6, 0); g.lineTo(-6, -2); g.closePath(); g.fill(); }
  g.restore();
}
function vfog(g, w, h, col, a, sp, y0, sc = 1) { const f = fogTinted(col), S = 520 * sc * Math.min(w, h) / 600; g.globalAlpha = a; for (let x = -((G.vigT * sp) % S) - S; x < w + S; x += S) g.drawImage(f, x, y0 - S / 2, S, S); g.globalAlpha = 1; }
function stars(g, w, h, n, seed, a = 1) { const R = mulberry(seed); for (let i = 0; i < n; i++) { const x = R() * w, y = R() * h * .7, tw = .5 + .5 * Math.sin(G.vigT * (1 + R() * 3) + i); g.fillStyle = `rgba(255,250,235,${(.3 + R() * .7) * tw * a})`; g.fillRect(x, y, 1.4, 1.4); } }
function vsnow(g, w, h, n, seed, wind = 30) { const R = mulberry(seed); g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < n; i++) { const sp = 20 + R() * 40, x = (R() * w + G.vigT * wind * (.5 + R())) % w, y = (R() * h + G.vigT * sp) % h; g.beginPath(); g.arc(x, y, .8 + R() * 1.6, 0, TAU); g.fill(); } }
/* VIGS live in vig.js */

/* =====================================================================
   THE HALL: Ókólnir, the Never-Cold
   ===================================================================== */
const HUB = { fire: { x: 1000, y: 800 }, spawn: { x: 1000, y: 880 } };
const GATES = [
  { id: 'iron', x: 640, y: 380 }, { id: 'ice', x: 820, y: 300 }, { id: 'sea', x: 1000, y: 268 }, { id: 'fire', x: 1180, y: 300 }, { id: 'utgard', x: 1360, y: 380 },
];
const SWAN = { x: 1640, y: 560 };
let HUBW = null;
function genHub() {
  if (HUBW) { if (!HUBW.chunks && !HUBW.ground) buildGround(HUBW); return HUBW; }
  const w = mkWorld('hub', 'hub', 2000, 1500);
  w.seed = 777; w.voidY = 1238; w.hall = [620, 640, 1380, 960]; w.emis = false; w.gs = .9;
  w.bounds = { x0: 220, y0: 130, x1: 1780, y1: 1300 };
  const R = mulberry(4242), sp = realmSprites('hub');
  const rect = (x0, y0, x1, y1, kind) => addObst(w, { rect: 1, x0, y0, x1, y1, x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: Math.hypot(x1 - x0, y1 - y0) / 2, kind });
  rect(598, 618, 960, 640, 'wallN'); rect(1040, 618, 1402, 640, 'wallN');
  rect(598, 960, 960, 982, 'wallS'); rect(1040, 960, 1402, 982, 'wallS');
  rect(598, 618, 620, 982, 'wallW'); rect(1380, 618, 1402, 982, 'wallE');
  rect(880, 790, 1120, 812, 'hearth');
  rect(660, 650, 940, 672, 'bench'); rect(1060, 650, 1340, 672, 'bench'); rect(660, 928, 940, 950, 'bench'); rect(1060, 928, 1340, 950, 'bench');
  for (const px of [740, 880, 1120, 1260]) for (const py of [700, 900]) addObst(w, { x: px, y: py, r: 12, kind: 'pillar' });
  addObst(w, { x: 690, y: 790, r: 16, kind: 'anvil' }); addObst(w, { x: 640, y: 740, r: 26, kind: 'forge' });
  addObst(w, { x: 1350, y: 790, r: 20, kind: 'seat' });
  for (const gt of GATES) { addObst(w, { x: gt.x - 50, y: gt.y, r: 18, kind: 'gatestone', gate: gt, s: -1 }); addObst(w, { x: gt.x + 50, y: gt.y, r: 18, kind: 'gatestone', gate: gt, s: 1 }); }
  addObst(w, { x: SWAN.x, y: SWAN.y, r: 64, kind: 'swanpool' });
  for (let i = 0; i < 260; i++) {
    const x = 240 + R() * 1520, y = 150 + R() * 1060;
    if (x > 540 && x < 1460 && y > 560 && y < 1040) continue;
    if (Math.abs(x - 1000) < 150 && y > 300 && y < 640) continue;
    if (y > 180 && y < 480 && x > 520 && x < 1480) continue;
    if (Math.hypot(x - SWAN.x, y - SWAN.y) < 210) continue;
    if (Math.hypot(x - 1300, y - 540) < 200 && x > 1100) continue;
    if (y > 1040 && x > 740 && x < 1260) continue;
    let ok = true; for (const o of w.obst) if (!o.rect && Math.hypot(o.x - x, o.y - y) < 110) { ok = false; break; }
    if (!ok) continue;
    const r = R();
    if (r < .5) addObst(w, { x, y, r: 10, spr: pick2(R, sp.big), fade: 1, big: 1 });
    else if (r < .75) addObst(w, { x, y, r: 22, spr: pick2(R, sp.mid), fade: 1 });
    else addObst(w, { x, y, r: 14, spr: pick2(R, sp.small), fade: 1 });
  }
  w.paths = [[[1000, 620], [1000, 480], [1000, 330]], [[1000, 470], [800, 430], [640, 420]], [[1000, 470], [1200, 430], [1360, 420]], [[1040, 630], [1300, 560], [1560, 560]], [[1000, 980], [1000, 1100], [1000, 1200]]].map(bbox);
  w.pathW = 110;
  w.maskExtra = (rg, gg, soft, disc) => { disc(rg, 1000, 330, 300, .95); disc(rg, SWAN.x, SWAN.y, 150, .8); };
  buildGround(w);
  HUBW = w; return w;
}
/* hall structures, drawn in y-order with everything else */
function gateOpen(id) {
  if (id === 'iron') return !!S.powers.frigg;
  if (id === 'ice') return !!S.boss.angr; if (id === 'sea') return !!S.boss.thrym; if (id === 'fire') return !!S.boss.nidhogg; if (id === 'utgard') return !!S.boss.surtr;
  return false;
}
const GATE_COL = { iron: '#ff8a2b', ice: '#9fe0ff', sea: '#bfd6e8', fire: '#ff5a1a', utgard: '#9cff6a' };
/* ---------------- the companions ---------------- */
function npcList() {
  const L = [
    { id: 'hildr', name: 'Hildr', x: 1000, y: 846, r: 12, face: -PI / 2, draw: drawHildr },
    { id: 'bjarki', name: 'Bjarki', x: 712, y: 826, r: 14, draw: drawBjarki },
    { id: 'asta', name: 'Ásta', x: 1350, y: 806, r: 12, draw: drawAsta },
    { id: 'kolr', name: 'Kolr', x: 820, y: 688, r: 12, draw: drawKolr },
    { id: 'muninn', name: 'Muninn', x: 1120, y: 712, r: 10, draw: drawMuninn, perch: 1 },
  ];
  if (S.boss.angr) L.push({ id: 'ylfa', name: 'Ylfa', x: 1060, y: 880, r: 8, draw: drawYlfa, wolf: 1, tx: 1060, ty: 880, t: 0 });
  return L;
}
function updNpcs(dt) {
  for (const n of G.npcs) {
    if (n.wolf) {
      n.t -= dt;
      const d = Math.hypot(P.x - n.x, P.y - n.y);
      if (d > 90 && d < 420) { n.tx = P.x + Math.cos(G.t) * 40; n.ty = P.y + 24; }
      else if (n.t <= 0) { n.t = rand(2, 4); n.tx = clamp(n.x + rand(-120, 120), 700, 1300); n.ty = clamp(n.y + rand(-60, 60), 840, 900); }
      const dx = n.tx - n.x, dy = n.ty - n.y, dd = Math.hypot(dx, dy);
      if (dd > 6) { const sp = d > 140 ? 150 : 60; n.x += dx / dd * sp * dt; n.y += dy / dd * sp * dt; n.face = Math.atan2(dy, dx); n.walk = (n.walk || 0) + dt * 10; }
      collide(n);
    } else if (!n.sit) { n.face = Math.atan2(P.y - n.y, P.x - n.x); }
  }
}
/* =====================================================================
   THE SAGA — scripted scenes
   ===================================================================== */
function* csPrologue() {
  G.fade = 1; setVig('deathbed'); playMusic('memory'); ambience(null);
  yield fadeTo(0, 2.2);
  yield* talk([
    ['narr', "Hordaland. The dark of the year, nine winters after the battle at Hrafnsey."],
    ['narr', "Einar Hallvarðsson won his word-fame young. Nineteen summers in the shield-wall, and the skalds knew his name from Stord to the Vík."],
    ['narr', "Then a spear at Hrafnsey. A Valkyrie came down through the smoke. She looked at him a long while, and passed him by."],
    ['narr', "He lived. Lame, he lived seven more winters, mending nets for men who had once followed him."],
    ['narr', "And when death came at last, it found him in his bed. In the straw."],
  ]);
  G.vigFlag = 1; G.vigFlagT = G.vigT; SFX.hiss();
  yield wait(2.2);
  yield fadeTo(1, 1.6);
  yield card({ k: 'Strá-dauði · the straw-death', n: 'Deyr fé, deyja frændr, deyr sjalfr it sama; en orðstírr deyr aldregi, hveim er sér góðan getr.', t: 'Cattle die, kinsmen die, and so one dies oneself. But word-fame never dies, for the one who earns it well.', s: 'Hávamál · 76' });
  yield fadeTo(1, .1); cardHide();
  setVig('void'); playMusic('void'); ambience('void');
  yield fadeTo(0, 2.5);
  yield wait(1.2);
  yield* talk([
    ['odin', "Einar. Hallvard’s son. You died badly."],
    ['einar', "I know how I died."],
    ['odin', "Hel’s road is long, and her hall is cold, and no one down there remembers anything worth singing."],
    ['odin', "But I have work for a man with nothing left to lose."],
    ['odin', "The jötnar stir before their hour. Four jarls of Jötunheim have broken their oaths, and their kin are marching on the walls of the world."],
    ['odin', "Break them. Break the four, and the one who sits behind them in the Outer Yard, and I will open the doors of Valhalla to you myself."],
  ]);
  const c = yield ask('einar', "…", ["Why me?", "Point me at them."]);
  if (c === 0) yield* talk([['odin', "Because no one else would come."], ['odin', "And because someone asked it of me. Someone who should have known better."]]);
  else yield* talk([['odin', "Ha. They always say that. Good."]]);
  yield* talk([
    ['odin', "There is a hall at the edge of Ginnungagap. Ókólnir, the Never-Cold. Its fire will call you back when you fall."],
    ['odin', "And you will fall, Einar. Many times. Try to fall forward."],
  ]);
  SFX.caw();
  yield fadeTo(1, 2);
  G.vig = null;
}
function* csWake() {
  G.fade = 1; P.pose = 'sit'; P.state = 'pose'; P.x = 960; P.y = 846; P.face = 0;
  const h = G.npcs.find(n => n.id === 'hildr'); h.sit = 1; h.x = 1036; h.y = 846;
  cam.x = 1000; cam.y = 820; G.camLock = { x: 1000, y: 820, span: 300 };
  yield fadeTo(0, 2.4);
  yield* talk([
    ['hildr', "There you are. The fire likes it when they wake."],
    ['einar', "Where am I?"],
    ['hildr', "Ókólnir. The hall at the edge of the world. The roof burned off before your grandfather was born, so the stars make do."],
    ['hildr', "I am Hildr. I keep the hearth."],
  ]);
  const c = yield ask('einar', "…", ["Are you dead too?", "What happens when I fall?"]);
  if (c === 0) yield* talk([['hildr', "Something like it. The old women would say fallen."], ['narr', "She doesn’t look up from the flames."]]);
  else yield* talk([['hildr', "Then I call you back. That is what the fire is for."], ['hildr', "Try not to make a habit of it."]]);
  yield* talk([
    ['hildr', "Bjarki at the forge will mend that axe, if you bring him silver. Ásta sees further than she’d like. Kolr will sing at you whether you ask or not."],
    ['hildr', "And the raven on the rafter is Muninn. Don’t tell the raven anything you don’t want Odin to know."],
    ['hildr', "The stones beyond the north door open on Jötunheim. The Iron Wood first. Angrboða’s wood."],
    ['hildr', "Go and see Ásta at the high seat before you go. She has something for you."],
  ]);
  yield fadeTo(1, .6);
  P.pose = null; P.state = 'idle'; P.x = 1000; P.y = 880; h.sit = 0; h.x = 1000; h.y = 846; G.camLock = null;
  yield fadeTo(0, .8);
  S.stage = 1; store();
  toast('Ókólnir', 'The Never-Cold Hall. Speak with Ásta at the high seat.');
}

/* hearth scenes: Einar and Hildr sit together at the long-fire */
function* sitTogether() {
  yield fadeTo(1, .8);
  P.pose = 'sit'; P.state = 'pose'; P.x = 962; P.y = 846; P.face = 0;
  const h = G.npcs.find(n => n.id === 'hildr'); h.sit = 1; h.x = 1036; h.y = 846;
  G.camLock = { x: 1000, y: 818, span: 290 };
  yield fadeTo(0, 1.2);
  return h;
}
function* standUp() {
  yield fadeTo(1, .8);
  const h = G.npcs.find(n => n.id === 'hildr'); h.sit = 0; h.x = 1000; h.y = 846;
  P.pose = null; P.state = 'idle'; P.x = 1000; P.y = 890; G.camLock = null; G.hearthLow = 0;
  yield fadeTo(0, .8);
}
function* memory(name, lines, music = 'memory') {
  yield fadeTo(1, 1); setVig(name); playMusic(music);
  yield fadeTo(0, 1.6);
  yield* talk(lines);
  yield fadeTo(1, 1.2); G.vig = null; playMusic('hub');
}
const MEM = {
  m1: { name: 'The Wolf-Cub of Hordaland', vig: 'ship', lines: () => [
    ['kolr', "Hear it! Hallvard’s son, fifteen winters, standing at the prow of his father’s ship, too proud to be sick over the side."],
    ['kolr', "His father was a hard man. He died at sea that summer, and they gave him to the waves with his sword across his chest."],
    ['kolr', "His last words were a verse. The only one he ever knew by heart."],
    ['narr', "“Deyr fé, deyja frændr. Earn a good name, son. It’s the only thing that doesn’t rot.”"],
    ['kolr', "And the boy took up his father’s axe before his father was cold, and went looking for a name."],
    ['einar', "I’d forgotten his voice. I’d forgotten I ever had a father."],
    ['kolr', "That’s what I’m for. The dead forget. Skalds don’t."],
  ] },
  m2: { name: 'Hrafnsey', vig: 'hrafnsey', lines: () => [
    ['kolr', "Hrafnsey. Raven Isle. Two kings and a quarrel over a beach nobody wanted."],
    ['kolr', "Einar held the left horn of the shield-wall from morning until the light went red. Then a spear came out of the smoke and found his side."],
    ['kolr', "He lay among the dead with the ravens walking on him, and he was glad. A good death. The best kind."],
    ['kolr', "And she came. Down through the smoke on a horse the colour of ash, in a cloak of swan-feathers, with a spear made of light."],
    ['einar', "She knelt beside me. I remember her hand on my face. Her eyes were gold."],
    ['einar', "She looked at me for a long time, as if she were learning me by heart. And then she stood up."],
    ['einar', "And she rode away. She chose the man beside me. A boy who’d soiled himself in the first charge."],
    ['kolr', "I’m sorry, friend. That’s how the verse goes."],
  ] },
  m3: { name: 'The Straw Years', vig: 'straw', lines: () => [
    ['kolr', "This one is short. I’m sorry for that too."],
    ['kolr', "Einar lived. The spear-wound closed crooked, and his leg never answered him again."],
    ['kolr', "Seven winters. Men stopped asking him to the benches. He mended nets. He told the story of Hrafnsey until they begged him to stop."],
    ['kolr', "Then a fever came in the dark of the year. And there was no battle to die in. Only the straw, and the cold, and a candle."],
    ['einar', "I asked the empty room. Every night. Why did you pass me by?"],
  ] },
  m4: { name: 'The Choosing', vig: 'choosing', lines: () => [
    ['hildr', "When you died in the straw, I went to the All-Father on my knees."],
    ['hildr', "I said: give him the trial. Send him to Jötunheim like the others. Let him earn the door I took from him."],
    ['hildr', "Odin said: and who will keep his fire? Who will call him back each time he falls?"],
    ['hildr', "I said I would. He said that every time I did, it would cost me a feather."],
    () => S.deaths > 0 ? [['hildr', `You have fallen ${S.deaths} ${S.deaths === 1 ? 'time' : 'times'}, Einar. I counted every one.`]] : [['hildr', "You haven’t fallen once. Do you know how hard it is, to keep a fire for a man who won’t die properly?"]],
  ] },
};
function* afterBoss1() {
  yield* talk([['kolr', "Sit, sit! The saga has a new verse, and it’s about you. Mostly."]]);
  yield* memory(MEM.m1.vig, MEM.m1.lines());
  S.f.m1 = 1;
  yield* sitTogether();
  yield* talk([
    ['hildr', "You came back on your own feet. That’s a first."],
    ['einar', "There was a wolf-cub in the roots. It followed me."],
    ['hildr', "I see her. Ylfa, I’ll call her. She-wolf. Not very clever, but she won’t mind."],
    ['hildr', "Give me that arm."],
    ['narr', "Her hands are cold, and very careful."],
  ]);
  const c = yield ask('einar', "…", ["Why keep a fire for strangers?", "You’ve done this before."]);
  if (c === 0) yield* talk([['hildr', "Because somebody should. The dark out there is very large, and a fire is a small, stubborn thing."], ['hildr', "I like small, stubborn things."]]);
  else yield* talk([['hildr', "…Yes."], ['hildr', "There was a man before you. And a man before him."], ['hildr', "Eat something. The dead don’t need to, but it helps."]]);
  yield* talk([['hildr', "Kolr says your father had a verse. Will you say it to me sometime?"], ['einar', "Sometime."]]);
  yield* standUp();
}
function* afterBoss2() {
  yield* talk([['kolr', "The next verse is harder. I’ll sing it anyway. That’s the job."]]);
  yield* memory(MEM.m2.vig, MEM.m2.lines());
  S.f.m2 = 1;
  yield* sitTogether();
  yield* talk([['hildr', "Kolr sang you Hrafnsey."], ['einar', "You heard."], ['hildr', "The whole hall heard. He sings loud when it hurts."]]);
  const c = yield ask('einar', "…", ["Do Valkyries choose wrong?", "I hated her. Every day after."]);
  if (c === 0) yield* talk([['hildr', "The Valkyries don’t choose. The Norns weave, and the Valkyries ride where the thread says."], ['hildr', "Mostly."]]);
  else yield* talk([['hildr', "Good."], ['hildr', "Hate is warm. It kept you alive, didn’t it? Seven winters."]]);
  const d = yield ask('hildr', "Einar. If you met her again, that Valkyrie. What would you say?", ["I’d ask her why.", "Nothing. I’d just look at her."]);
  if (d === 0) yield* talk([['hildr', "And if the answer was worse than not knowing?"], ['einar', "Nothing is worse than not knowing."], ['narr', "She stares into the fire until it has to be fed."]]);
  else yield* talk([['hildr', "That might be the cruellest thing you could do."], ['narr', "She smiles when she says it. It doesn’t reach her eyes."]]);
  yield* standUp();
}
function* afterBoss3() {
  yield* talk([['kolr', "Sit. Please."]]);
  yield* memory(MEM.m3.vig, MEM.m3.lines());
  S.f.m3 = 1;
  yield* sitTogether();
  G.hearthLow = .4;
  yield wait(1);
  S.f.twist = 1; // the hood comes down
  yield* talk([
    ['hildr', "Because I couldn’t bear to take you."],
    ['einar', "…What?"],
    ['hildr', "Hrafnsey. The ash-coloured horse. The swan-cloak. My hand on your face."],
    ['hildr', "It was me, Einar. The Norns’ thread said you. Einar Hallvarðsson, today, on this beach. Bring him to the hall."],
    ['hildr', "I had ridden over your battles for nine years. I knew how you held your shield. I knew you carried a burned thrall out of a hall at Stord when no one was looking."],
    ['hildr', "And I knelt down beside you and I could not do it. So I took the boy instead, and left you breathing."],
    ['hildr', "I thought I was giving you something."],
    ['narr', "The fire cracks. Somewhere above, Muninn shifts on the rafter and says nothing."],
    ['hildr', "The All-Father cast me down for it. My sister Skögul took my swan-cloak and burned the wings off my back. And I have kept this fire ever since."],
  ]);
  const c = yield ask('einar', "…", ["You stole my death.", "Say nothing.", "You gave me seven years."]);
  if (c === 0) { S.f.anger = 1; yield* talk([['hildr', "Yes."], ['hildr', "I won’t ask you to forgive it. I only wanted you to stop asking the empty room."]]); }
  else if (c === 1) { S.f.silent = 1; yield* talk([['narr', "Einar says nothing for a long time. Hildr doesn’t fill the silence. She feeds the fire instead."]]); }
  else { S.f.forgave = 1; yield* talk([['hildr', "Seven years of mending nets. Of being laughed at."], ['einar', "Seven years of sunrises. I didn’t know I had them until now."], ['narr', "Hildr makes a sound that might be a laugh, if laughing hurt."]]); }
  yield* talk([['hildr', "Go, if you need to. The fire will still call you back. It doesn’t care what I deserve."]]);
  yield* standUp();
}
function* afterBoss4() {
  yield* sitTogether();
  G.hearthLow = .5;
  yield* talk([['narr', "This time, Hildr tells it herself."]]);
  yield fadeTo(1, 1); setVig('choosing'); playMusic('memory'); yield fadeTo(0, 1.4);
  yield* talk(MEM.m4.lines());
  yield fadeTo(1, 1); G.vig = null; playMusic('hub'); yield fadeTo(0, 1);
  S.f.m4 = 1;
  yield* talk([['einar', "Why didn’t you tell me?"], ['hildr', "Because you’d have stopped dying for me. And then you’d have stopped."]]);
  if (S.f.forgave) yield* talk([['einar', "Hildr."], ['hildr', "Mm."], ['einar', "Come here."]]);
  else if (S.f.anger) yield* talk([['einar', "I’m still angry."], ['hildr', "I know."], ['einar', "Come here anyway."]]);
  else yield* talk([['einar', "I didn’t know what to say, before."], ['hildr', "And now?"], ['einar', "Now I do. Come here."]]);
  G.hearthLow = .85;
  yield* talk([['narr', "The Never-Cold burns low, and neither of them notices."], ['narr', "Kolr, for once in his long death, does not sing."]]);
  S.f.night = 1;
  yield fadeTo(1, 2.4); yield wait(1);
  yield* standUp();
  yield* talk([['muninn', "Útgarðr is open. The Outer King is expecting you."], ['muninn', "He always is. That’s what makes him tiresome."]]);
}
function* afterSkogul() {
  yield* talk([['narr', "The swan-cloak is light as breath, and warm, as though someone has only just taken it off."]]);
  if (S.ending) yield* talk([['narr', "Valhalla’s door still stands where the Outer Yard fell. There is still a choice to make there."]]);
  else yield* talk([['narr', "Keep it close. When the Outer King falls, you’ll know what it’s for."]]);
}
const BOSS_LINES = {
  angr: { pre: [['angr', "Another of One-Eye’s dogs. I can smell the raven on your hand."], ['angr', "He sends you to bleed my children so his own will live a little longer."], ['angr', "Come, then, straw-man. My wood is hungry."]], post: [['angr', "Fenrir… will remember… your scent…"], ['narr', "Among the roots something small and pale whimpers: a wolf-cub of the old brood, dead, and not afraid of you."]] },
  thrym: { pre: [['thrym', "A DEAD man! Odin sends me a DEAD man! Last time it was the Thunderer in a wedding-veil! HA!"], ['thrym', "Do you know what I asked for the hammer? Freyja. And what did I get? A bride who ate my oxen."], ['thrym', "I will not be laughed at twice."]], post: [['thrym', "The cold… was never mine… it was older than me…"]] },
  nidhogg: { pre: [['nidhogg', "Ssstraw. You smell of ssstraw and sickbed. I have eaten ten thousand like you."], ['nidhogg', "Come to the edge of the ice, little corpse. Come and be forgotten."]], post: [['narr', "The wyrm sinks into the black water. Along the shore, the dead stop moving."]] },
  surtr: { pre: [['surtr', "Ash-man. I have been forging the end of all things since before your gods had names."], ['surtr', "And you come to me with a woodcutter’s axe."], ['surtr', "Look around you. Forty swords. Forty of Odin’s straw-dead. You’ll make a fine forty-first."]], post: [['narr', "Lævateinn cracks across its burning heart."], ['surtr', "Not yet, then. Not yet."], ['surtr', "But soon."]] },
  utgard: { pre: null, post: [['utgard', "Well struck. Well struck."], ['utgard', "Perhaps the old crow wasn’t lying. This once."]] },
  skogul: { pre: [['skogul', "So. My sister’s pet. The one she would not take."], ['skogul', "I burned her wings for you. I scattered her feathers across Jötunheim so she would never fly again."], ['skogul', "And you gathered them up and brought them back to me. Brave. Stupid. The Norns’ favourite kind."], ['skogul', "Come, then. Let a Valkyrie choose you properly."]], post: [['skogul', "So she chose well, after all."], ['skogul', "Take it. The swan-cloak. Take it to her, and tell her the sky is still there."]] },
};
function* utgardPre() {
  yield* talk([
    ['utgard', "Einar Straw-Death. Welcome to Útgarðr. Sit, sit. You are the… let me count… two hundred and twelfth."],
    ['utgard', "Did you think the One-Eyed found you by chance? He gathers the men who die badly. They have nothing left to lose, and they never ask questions."],
    ['utgard', "He sends them here to bleed us before the Wolf-Age. Every draugr you cut down in the Iron Wood came through that same stone, with his mark on its hand."],
    ['utgard', "There is no door, little man. There was never a door."],
  ]);
  if (S.f.twist) yield* talk([['utgard', "And your keeper. Has she told you what each of your deaths costs her? Count her feathers sometime."]]);
  const opts = ["Then I’ll make one.", "You lie. It’s all you are."];
  if (S.f.night) opts.push("Someone is waiting for me. Door or no door.");
  const c = yield ask('einar', "…", opts);
  if (c === 0) yield* talk([['utgard', "Ha! That’s what the first one said. Show me."]]);
  else if (c === 1) yield* talk([['utgard', "Of course I lie. It’s what makes the truth so hard to find in here."]]);
  else yield* talk([['utgard', "…Oh. Oh, that is much worse. For me, I mean."], ['utgard', "Come, then."]]);
}
function* csEnding(fromHub) {
  yield fadeTo(1, 1.5);
  setVig('valhalla'); G.vigOdin = 1; playMusic('ending'); ambience(null);
  yield fadeTo(0, 2);
  if (!fromHub) yield* talk([['narr', "When the Outer King falls, the hall of Útgarðr falls with him, like a dream at waking. Einar stands on nothing, and before him there is a door."]]);
  yield* talk([
    ['allfather', "Einar."],
    () => fromHub ? [['allfather', "Back again. The door hasn’t moved. Neither has the price."]] : [
      ['allfather', "You did what two hundred and eleven could not."],
      ['einar', "Útgarða-Loki said there was no door."],
      ['allfather', "Útgarða-Loki tells the truth exactly as often as it is useful to him. So do I."],
      ['allfather', "The door is real. It opens for the one who finishes. You finished."],
      ['allfather', "But know the price before you step. Your keeper’s fire is ash. She spent the last of herself calling you back from the Outer Yard."],
      ['allfather', "If you go in, she goes out. That was her bargain, not mine."],
    ],
  ]);
  const opts = [{ t: "Enter Valhalla." }, { t: "Turn back to the hearth." }];
  if (S.cloak) opts.push({ t: "Bring Hildr her swan-cloak." });
  const c = yield ask('einar', "…", opts);
  if (c === 0) {
    S.ending = 'A'; G.vigFlag = 1; G.vigFlagT = G.vigT; SFX.chime(60);
    yield wait(3);
    yield fadeTo(1, 2); setVig('endA'); yield fadeTo(0, 2);
    yield* talk([
      ['narr', "Einar Hallvarðsson entered Valhalla, and was given a seat near the fire, and was asked, as every new man is asked, how he died."],
      ['narr', "He told them about a fire at the edge of the world, and a woman who kept it."],
      ['narr', "They thought it a strange answer. He never gave another."],
    ]);
  } else if (c === 1) {
    S.ending = 'B';
    yield fadeTo(1, 2); setVig('endB'); yield fadeTo(0, 2);
    yield* talk([
      ['narr', "Einar turned his back on the golden door. Odin did not stop him. The All-Father has seen stranger things, though not many."],
      ['narr', "He came home to a hearth gone grey, and knelt, and blew on the last coal until it caught."],
      ['hildr', "You stupid, stubborn man."],
      ['einar', "You like small, stubborn things."],
      ['narr', "At the edge of Ginnungagap there is a hall that is never cold. Two keep the fire now. When the lost ones wake there, afraid, they are not alone."],
    ]);
  } else {
    S.ending = 'C';
    yield fadeTo(1, 2); setVig('endB'); yield fadeTo(0, 2);
    yield* talk([
      ['narr', "He came home to a hearth gone grey. Hildr sat beside it, nearly ash herself."],
      ['narr', "The swan-cloak settled on her shoulders light as breath, and the grey fell from her like ash from a blown coal."],
      ['hildr', "Einar. What have you done?"],
      ['einar', "A Valkyrie chooses. So choose."],
      ['hildr', "I chose for you once, on a beach. I was wrong to make it a choice that was only mine."],
      ['hildr', "So this time I’m asking."],
      ['hildr', "Ride with me?"],
      ['einar', "Always."],
    ]);
    yield fadeTo(1, 2); setVig('endC'); playMusic('sky'); yield fadeTo(0, 2);
    yield* talk([
      ['narr', "At Ragnarök, the skalds say, a Valkyrie with wings the colour of new snow and a lame man from Hordaland held the bridge at Bifröst for a whole day."],
      ['narr', "Kolr made the song. It is very long, and only slightly exaggerated."],
    ]);
  }
  S.endings[S.ending] = 1; S.stage = 6; store();
  yield fadeTo(1, 2.4);
  G.vig = null; G.vigOdin = 0;
}

/* ---------------- lore stones: four per realm ---------------- */
const LORE = {
  iron: [
    "Grímr Kettle-Nose cut these runes. The One-Eyed sent me. Two runes for the gate: I have one. The keeper’s fire called me back three times. It was quieter the third time.",
    "Here the old one sat in the east and nursed the wolf-brood on the marrow of the slain. One of her children will take the moon in its jaws. The trees remember. That is why they turned to iron.",
    "Ásgeir and Bersi and Úlfr came through the gate-stone together. I am Úlfr. They are draugar now. They wear the raven-mark on their hands, the same as mine. Do not let me become what I am cutting down.",
    "The trees here do not grow. They are forged. Something under the roots still works the bellows. Follow the heat south and you will find the smith who is making the end of the world.",
  ],
  ice: [
    "From these rivers dripped the venom that thawed into Ymir, first of all giants. Every thurs in Jötunheim is his frost-blood. The rivers are not frozen. They are waiting.",
    "Sölvi of Fjaler, raven-marked. The cold here goes in through the eyes. If my keeper reads this: I did not want to stop. I only wanted to sit down for a while.",
    "Þrymr stole the Thunderer’s hammer once and asked Freyja as its price. Thor came instead in a bridal veil, ate an ox and eight salmon, and drank three casks of mead. Þrymr has never forgiven anyone for laughing.",
    "Heimdallr hears the grass grow and the wool grow on sheep. He will hear you too. Kneel where his horn is carved and ask him to stand between you and the cold.",
  ],
  sea: [
    "A hall far from the sun, its doors facing north, its walls woven of serpents’ backs. Venom drips through the smoke-hole. Here the oath-breakers and the murderers wade through heavy streams.",
    "Naglfar is building. The ship of dead men’s nails. Pare the nails of the dead before burial, the old women say, so the ship is slower made. Someone has not been paring theirs.",
    "Grímr Kettle-Nose. Third jarl. My keeper begged me to turn back. I told her I would bring her the door. If you are reading this, I did not. Tell her I am sorry. Tell her the fire was never her fault.",
    "Níðhöggr gnaws the root of the World-Tree from below and the corpses of the faithless from above. He has eaten here so long he has forgotten there was ever anything else to eat.",
  ],
  fire: [
    "The sons of Múspell will ride over Bifröst, and it will break beneath them. Surtr rides first, with a sword brighter than the sun. He is forging it still. Listen. You can hear the hammer.",
    "Forty swords stand in the black glass around the forge. I counted. They belonged to men with the raven on their hands. Mine will be forty-one. — Þorbjörn",
    "Lævateinn, the wound-wand. Loki made it beneath the doors of the dead, and Sinmara keeps it in a chest with nine locks. Kept. The chest is open.",
    "Óðinn hung nine nights on the windy tree, wounded with a spear, given to himself. He knows what it is to pay for wisdom. He has never been shy about who else pays.",
  ],
};
const PROPHECY = {
  iron: "A crone rooted in iron. She cannot walk, but she can reach. When her arm draws back, do not stand before her. Her roots come in lines; step aside from a line.",
  ice: "A giant who laughs at himself so no one else can. When both his fists go up, the ground will ring outward. Roll through the ring; do not run from it.",
  sea: "A wyrm beneath the ice. Strike only when he rises from the water. When the hole churns, leave it. When he dives, keep moving.",
  fire: "The smith at the end of the world. The swords around his forge are not his; they will remember whose they were. When he leaves the anvil, the fire leaves the edges and comes for the middle.",
  utgard: "A king smaller than he looks and larger than he is. Only the one who casts a shadow is real. And when the hall breaks, look up, and strike the hand that rests.",
  done: "I see a door, and a fire, and you standing between them. That one is yours to see, not mine.",
};

/* ---------------- companion topics ---------------- */
function curGoal() { for (const r of REALM_ORDER) if (!S.boss[REALMS[r].boss]) return r; return S.boss.utgard ? 'done' : 'utgard'; }
const TOPICS = {
  hildr: [
    { id: 'who', t: "Who are you?", run: function* () { if (!S.f.twist) yield* talk([['hildr', "Hildr. The hearth-keeper."], ['einar', "That’s what you are. Not who."], ['hildr', "You’re sharper than the last one."]]); else yield* talk([['hildr', "You know who I am now."], ['hildr', "I’d rather you asked who I’m going to be. I haven’t decided."]]); } },
    { id: 'fight', t: "Teach me to fight.", run: function* () { yield* talk([['hildr', "Tap to strike. Strike again before the swing dies and the axe keeps going: three blows, and the last one bites deep."], ['hildr', "Hold, and you wind up the great blow. Let go when the axe-head burns white. Nothing in Jötunheim likes being hit by that."], ['hildr', "Roll through danger, not away from it. For a heartbeat as you roll, nothing can touch you."], ['hildr', "Roll at the last moment before a blow lands and the All-Father’s eye opens. The world slows, and your next strike lands twice as hard."], ['hildr', "Strike as you come out of a roll and you’ll spin. Wolves hate that."], ['hildr', "The gods’ gifts run dry. Mímir’s springs refill them. So do the spirits of what you kill, a little at a time."]]); } },
    { id: 'valk', t: "Tell me about the Valkyries.", if: () => S.boss.angr, run: function* () { yield* talk([['hildr', "The choosers of the slain. Hrist and Mist, Skeggjöld and Skögul, Hildr and Þrúðr, Hlökk and Herfjötur…"], () => S.f.twist ? [['hildr', "You know more about Valkyries than most men now. More than you wanted to."]] : [['hildr', "Yes, I share a name with one. Half the girls in the north do."], ['hildr', "They ride where the Norns’ thread says. They don’t get to choose, whatever the name means."]]]); } },
    { id: 'wings', t: "Your shoulders…", if: () => S.boss.thrym && !S.f.twist, run: function* () { yield* talk([['hildr', "Old burns. They ache when the fire’s low."], ['hildr', "Don’t fuss. I’ve had worse looks from better men."]]); } },
    { id: 'feather', t: "I found a feather in Jötunheim.", if: () => S.feathers > 0 && S.feathers < 4, run: function* () { if (!S.f.twist) yield* talk([['hildr', "Show me."], ['narr', "She holds the feather a long time, the way you’d hold a letter from the dead."], ['hildr', "A swan’s. Keep it. Keep all of them, if you find more."]]); else yield* talk([['hildr', "Skögul scattered them so I’d never fly again. One in each realm."], ['hildr', "You keep finding them. You’re very stubborn."]]); } },
    { id: 'swan', t: "I have all four feathers.", if: () => S.feathers >= 4 && !S.cloak, run: function* () { S.f.swanpool = 1; yield* talk([['hildr', "All four."], ['hildr', "Einar, the pool east of the stones. If you lay them on the water, Skögul will feel it. She’ll come down to see who dares."], ['hildr', "She is the Queen of the Choosers, and she has never lost. Please don’t."], ['narr', "She doesn’t say it as if she means it."]]); } },
    { id: 'price', t: "How many feathers are left?", if: () => S.f.m4 && !S.ending, run: function* () { yield* talk([['hildr', "Enough. Probably."], ['hildr', "Don’t count them. I’ll know if you do."]]); } },
    { id: 'after', t: "Sit with me.", if: () => S.ending, run: function* () { yield* talk([['hildr', S.ending === 'C' ? "Shall we go riding? The sky’s still there. Skögul was right about that much." : S.ending === 'B' ? "Look at you, keeping my fire. You’re terrible at it. Stay anyway." : "You came back to visit. Odin will sulk. Good."]]); } },
  ],
  bjarki: [
    { id: 'shop', t: "Mend my axe.", always: 1, run: function* () { openShop('bjarki'); } },
    { id: 'who', t: "Who were you?", run: function* () { yield* talk([['bjarki', "Bjarki Half-Hand! Best smith in Trøndelag, second-best drinker."], ['bjarki', "Died when my forge-hall burned. Went back in for my hammer. Worth it. Look at this hammer."]]); } },
    { id: 'hand', t: "Your hand?", run: function* () { yield* talk([['bjarki', "Three fingers to a frost-giant’s door, years back. Lost the fingers, won the door."], ['bjarki', "It was my front door for twenty years. Kept the draught out lovely."]]); } },
    { id: 'axe', t: "About my axe.", run: function* () { yield* talk([['bjarki', "Bearded axe, Danish make. Your father’s, by the balance of it."], ['bjarki', "There’s a name scratched under the beard: Skjaldbrjótr. Shield-breaker. You keep it fed, I’ll keep it sharp."]]); } },
    { id: 'silver', t: "Why silver, here?", run: function* () { yield* talk([['bjarki', "Even the dead get paid. The draugar carry what they died with, and Jötunheim is full of draugar."], ['bjarki', "Bring me silfr and I’ll make that edge sing. Or hum, at least. Edges don’t sing. That’s a skald thing."]]); } },
    { id: 'iron', t: "The iron trees.", if: () => S.boss.angr, run: function* () { yield* talk([['bjarki', "Iron trees! Forged, not grown! I’d give my other hand for a branch."], ['bjarki', "Don’t tell me who forged them. I can guess. I don’t want to like him."]]); } },
    { id: 'forge', t: "Surtr’s forge.", if: () => S.boss.surtr, run: function* () { yield* talk([['bjarki', "You broke the sword of the end of the world."], ['bjarki', "As a smith I’m horrified. As a man I’m buying you a drink. We don’t have drinks. Imagine one."]]); } },
  ],
  asta: [
    { id: 'gift', t: "Hildr sent me.", if: () => !S.powers.frigg, run: function* () {
      yield* talk([['asta', "Come closer, straw-man. My eyes are sewn, not my ears."], ['asta', "Vituð ér enn, eða hvat? Do you know enough yet, or what?"], ['asta', "No. Nobody does. Here."], ['asta', "Frigg knows every fate and speaks none of them. She will mend you, a little, when you ask her."]]);
      grantPower('frigg');
      yield card({ k: 'A gift of the gods', h: "Frigg’s Grace", e: 'ᛒ', t: 'Bound to your first rune. Tap it in battle to mend your wounds. The gods’ gifts refill at Mímir’s springs, and from the spirits of the slain.' });
      yield* talk([['asta', "The old shrines still stand in Jötunheim. Kneel at them and other gods may answer."], ['asta', "Mímir’s springs rise there too. Drink, and the gifts come back to you."], ['asta', "Now go. The Iron Wood has been waiting for someone like you. That isn’t a kindness."]]);
    } },
    { id: 'shop', t: "Gifts of the gods.", always: 1, if: () => S.powers.frigg, run: function* () { openShop('asta'); } },
    { id: 'proph', t: "What do you see ahead?", always: 1, if: () => S.powers.frigg, run: function* () { yield* talk([['asta', PROPHECY[curGoal()]]]); } },
    { id: 'who', t: "Who are you?", run: function* () { yield* talk([['asta', "A völva. A seeress. I sewed my eyes shut so I would stop seeing the near things."], ['asta', "It helps with the far ones. You’re a near thing, by the way. I can’t see you at all."]]); } },
    { id: 'vsp', t: "Recite the Völuspá.", run: function* () { yield* talk([['asta', "Hljóðs bið ek allar helgar kindir, meiri ok minni mögu Heimdallar."], ['asta', "Silence I ask of all the holy kin, greater and lesser, the sons of Heimdallr."], ['asta', "Ek man jötna ár um borna. I remember giants born at the dawn of things, who raised me long ago."], ['asta', "Skeggöld, skálmöld, skildir ro klofnir; vindöld, vargöld, áðr veröld steypisk."], ['asta', "Axe-age, sword-age, shields are cloven. Wind-age, wolf-age, before the world falls headlong."], ['asta', "Vituð ér enn, eða hvat?"]]); } },
    { id: 'rag', t: "How does it end?", if: () => S.boss.nidhogg, run: function* () { yield* talk([['asta', "Sól tér sortna, sígr fold í mar. The sun turns black, the earth sinks into the sea, the bright stars fall from heaven."], ['asta', "And then it rises again, green, out of the water. Nobody ever remembers that part."]]); } },
  ],
  kolr: [
    { id: 'sing', t: "Sing my saga.", if: () => S.f.m1, always: 1, run: function* () {
      const list = ['m1', 'm2', 'm3', 'm4'].filter(k => S.f[k]);
      const c = yield ask('kolr', "Which verse?", list.map(k => MEM[k].name).concat(["Never mind."]));
      if (c < list.length) { const m = MEM[list[c]]; yield* memory(m.vig, m.lines()); yield fadeTo(0, .8); }
    } },
    { id: 'who', t: "Who are you?", run: function* () { yield* talk([['kolr', "Kolr! Skald to three kings, two of them briefly."], ['kolr', "I died of a bad poem. I rhymed the king’s daughter’s name with goat."], ['kolr', "In fairness, it does rhyme."]]); } },
    { id: 'fame', t: "What is word-fame worth?", run: function* () { yield* talk([['kolr', "Deyr fé, deyja frændr. Cattle die, kin die, you die. But the word lives on."], ['kolr', "And then the verse after it, which everyone forgets: ek veit einn, at aldri deyr, dómr um dauðan hvern."], ['kolr', "I know one thing that never dies: the judgment on each of the dead."], ['kolr', "The judgment, Einar. Not the fame. Who does the judging is the interesting part."]]); } },
    { id: 'ken', t: "Teach me a kenning.", run: function* () { yield* talk([['kolr', "A sword is a wound-wand. Blood is raven’s ale. A ship is a wave-steed. A warrior is a feeder of ravens."], ['kolr', "You, my friend, are a straw-feeder. I’m still working on it."]]); } },
    { id: 'hildr', t: "About Hildr…", if: () => S.boss.thrym && !S.f.twist, run: function* () { yield* talk([['kolr', "Our hearth-keeper? She asks me for the Hrafnsey verse more than anyone."], ['kolr', "Odd. She weeps at the same line every time. The one about the horse."]]); } },
  ],
  muninn: [
    { id: 'who', t: "Who are you?", run: function* () { yield* talk([['muninn', "Muninn. Memory. Huginn is Thought; he’s off being clever somewhere."], ['muninn', "Huginn ok Muninn fljúga hverjan dag. Every day the two of us fly over the wide earth, and the old man frets that Thought won’t come back."], ['muninn', "He frets more about Memory. Make of that what you like."]]); SFX.caw(); } },
    { id: 'odin', t: "Does Odin lie?", run: function* () { yield* talk([['muninn', "He doesn’t need to. He tells you a door exists. You fill in the rest yourself."]]); } },
    { id: 'others', t: "The rune-stones…", if: () => S.boss.angr, run: function* () { yield* talk([['muninn', "So you noticed. You’re not the first. You noticed the draugar wear your mark, too."], ['muninn', "I remember all of them. That’s rather the problem with being Memory."]]); } },
    { id: 'truth', t: "How many came before me?", if: () => S.boss.utgard, run: function* () { yield* talk([['muninn', "Two hundred and eleven. I flew over every one of them."], ['muninn', "You’re the first who came back laughing. Don’t tell him I said so. I’m supposed to be impartial."]]); SFX.caw(); } },
  ],
};
