/* MENU — touch-only screens: title (live 3D backdrop), pause, death, result, plus the sub-screens in p28b_menu_extra.js
   (missions, codex, study bench, settings, ending). Everything renders into #menus; the one <style id="menuCss"> is injected here.
   Taps only: every control is a tappable element with a click handler, no keyboard, no hover. Sub-screens push onto MENU.stack
   and BACK pops it; root screens (MENU.ROOT) reset the stack and own MG.state. */
const MENU = { cur: null, curO: null, stack: [], root: null, busyT: 0, titleT: 0, tab: 0, cat: 0, ent: null, flashId: null, S: {} };
MENU.el = () => MG.$('menus');
MENU.ROOT = { title: 1, pause: 1, dead: 1, result: 1, ending: 1 };
MENU.CSS = `
#menus{--ink:#0b0707;--cr:#e0231a;--cr2:#b3120a;--bone:#e9dccb;--dim:#9c8a80;--gold:#d9a441;--vio:#9b3cff;--ln:rgba(233,220,203,.16);
  position:fixed;inset:0;z-index:20;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
#menus .menu{position:absolute;inset:0;display:none;pointer-events:auto;z-index:20;box-sizing:border-box;overflow:hidden;color:var(--bone);background:var(--ink);
  padding:calc(10px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));
  flex-direction:column;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-y}
#menus .menu.on{display:flex}
#menus .menu.veil{background:rgba(11,7,7,.86)}
#menus .menu.dark{background:radial-gradient(ellipse at 50% 35%,rgba(70,8,5,.6),rgba(11,7,7,.98) 72%)}
#menus .mx-hd{display:flex;align-items:center;gap:12px;min-height:44px;flex:0 0 auto;margin-bottom:6px}
#menus .mx-ht{flex:1 1 auto;min-width:0}
#menus .mx-title{font-size:16px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--bone);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#menus .mx-sub{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#menus .mx-k{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--dim);font-weight:600}
#menus .mx-hdr-r{flex:0 0 auto;font-size:12px;letter-spacing:.18em;color:var(--dim);text-transform:uppercase;text-align:right}
#menus .mx-btn{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;min-height:46px;padding:8px 14px;box-sizing:border-box;flex:0 0 auto;
  border:1px solid rgba(233,220,203,.24);border-radius:8px;background:linear-gradient(#22161583,#140c0c);background-color:#170e0e;color:var(--bone);
  font-size:14px;font-weight:700;line-height:1.25;letter-spacing:.16em;text-transform:uppercase;text-align:center;cursor:pointer;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation}
#menus .mx-btn:active{background-color:#2e1818}
#menus .mx-btn.pri{background:linear-gradient(#ee3427,#a50f08);border-color:#ff7058;color:#fff;box-shadow:0 0 18px rgba(224,35,26,.38)}
#menus .mx-btn.gold{border-color:rgba(217,164,65,.7);color:var(--gold)}
#menus .mx-btn.danger{border-color:rgba(224,35,26,.75);color:#ff9a8a}
#menus .mx-btn.ghost{background:transparent;border-color:transparent;color:var(--dim);padding-left:6px;padding-right:10px;letter-spacing:.14em}
#menus .mx-btn.wide{grid-column:1/-1}
#menus .mx-btn.dis{opacity:.42;pointer-events:none;box-shadow:none}
#menus .mx-scroll{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding-bottom:12px}
#menus .mx-flash{animation:mxflash .8s ease-out}
@keyframes mxflash{0%{box-shadow:0 0 0 0 rgba(217,164,65,.95),inset 0 0 0 0 rgba(217,164,65,.4)}100%{box-shadow:0 0 0 16px rgba(217,164,65,0),inset 0 0 0 40px rgba(217,164,65,0)}}
#menus .mx-sheet{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,2,2,.74)}
#menus .mx-sc{width:min(440px,100%);box-sizing:border-box;padding:18px 18px 16px;border-radius:10px;background:#140c0c;border:1px solid rgba(224,35,26,.55);box-shadow:0 0 30px rgba(224,35,26,.2)}
#menus .mx-ct{font-size:18px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--bone);margin-bottom:8px}
#menus .mx-p{font-size:14px;line-height:1.5;color:#cbbcb2;margin:0 0 16px}
#menus .mx-row{display:flex;gap:10px}
#menus .mx-row .mx-btn{flex:1 1 0}
#menus .mx-foot{position:absolute;left:calc(16px + env(safe-area-inset-left));bottom:calc(8px + env(safe-area-inset-bottom));font-size:12px;letter-spacing:.22em;color:var(--dim);text-transform:uppercase}
/* title */
#menus .tt{flex-direction:row;align-items:stretch;background:linear-gradient(90deg,rgba(11,7,7,0) 0%,rgba(11,7,7,0) 30%,rgba(11,7,7,.72) 64%,rgba(11,7,7,.94) 100%)}
#menus .tt .mx-logo{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;padding-right:12px}
#menus .tt .mx-kick{font-size:13px;letter-spacing:.42em;color:var(--gold);text-transform:uppercase;font-weight:700}
#menus .tt .mx-name{font-size:clamp(40px,12vh,66px);font-weight:900;letter-spacing:.07em;line-height:1;color:var(--bone);text-shadow:0 0 24px rgba(255,30,10,.55);margin-top:8px;white-space:nowrap}
#menus .tt .mx-blade{width:min(300px,80%);height:3px;margin-top:14px;border-radius:2px;background:linear-gradient(90deg,rgba(224,35,26,0),#ff3a24 30%,#ff3a24 70%,rgba(224,35,26,0));box-shadow:0 0 14px 2px rgba(255,40,20,.5)}
#menus .tt .mx-tl{flex:0 0 auto;width:min(300px,42%);display:flex;flex-direction:column;justify-content:center;gap:8px}
#menus .tt .mx-cont{justify-content:space-between;text-align:left;min-height:60px;padding:8px 14px;letter-spacing:.14em}
#menus .tt .mx-cl{display:flex;flex-direction:column;gap:4px;min-width:0}
#menus .tt .mx-cl b{font-size:15px;letter-spacing:.18em}
#menus .tt .mx-cl small{font-size:12px;font-weight:600;letter-spacing:.08em;line-height:1.35;color:#f2d9c9;text-transform:uppercase}
#menus .tt .mx-es{font-size:12px;color:#ffe9b8;letter-spacing:.14em;white-space:nowrap;flex:0 0 auto;font-weight:700}
/* in-game overlays */
#menus .mx-obj{border-left:2px solid var(--cr);padding:8px 12px;margin:4px 0 12px;background:rgba(224,35,26,.07);border-radius:0 6px 6px 0}
#menus .mx-ov{font-size:14px;line-height:1.4;color:var(--bone);margin-top:4px}
#menus .mx-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#menus .mx-yf{font-size:clamp(34px,9vh,54px);font-weight:900;letter-spacing:.24em;color:var(--bone);text-align:center;text-shadow:0 0 26px rgba(255,30,10,.6);margin-top:auto}
#menus .mx-quote{font-size:16px;font-style:italic;line-height:1.5;color:#cdbdb3;text-align:center;max-width:560px;margin:14px auto 22px}
#menus .mx-stack{display:flex;flex-direction:column;gap:8px;width:min(300px,100%);margin:0 auto;margin-bottom:auto}
#menus .mx-center{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;padding-bottom:12px}
#menus .mx-res{flex:1 1 auto;min-height:0;display:flex;gap:22px;align-items:center}
#menus .mx-resL{flex:0 0 auto;width:min(260px,36%);display:flex;flex-direction:column;gap:4px}
#menus .mx-rank{font-size:76px;line-height:1;font-weight:900;text-shadow:0 0 24px rgba(255,40,20,.45);margin:4px 0 2px}
#menus .mx-rank.rS{color:var(--gold);text-shadow:0 0 26px rgba(217,164,65,.55)}
#menus .mx-rank.rA{color:var(--bone)}
#menus .mx-rank.rB{color:#b8a79c}
#menus .mx-rank.rC{color:#8d6f68}
#menus .mx-rtitle{font-size:18px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;line-height:1.25}
#menus .mx-resR{flex:1 1 auto;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:0 22px;align-content:center}
#menus .mx-rw{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:9px 0;border-bottom:1px solid var(--ln);min-height:36px}
#menus .mx-rw span{font-size:12px;letter-spacing:.2em;color:var(--dim);text-transform:uppercase;flex:0 0 auto}
#menus .mx-rw b{font-size:14px;font-weight:700;color:var(--bone);text-align:right;min-width:0;overflow-wrap:anywhere}
#menus .mx-resF{flex:0 0 auto;display:flex;justify-content:flex-end;padding-top:8px}
#menus .mx-resF .mx-btn{width:min(260px,100%)}
`;
MENU.ensureCss = function () {
  if (document.getElementById('menuCss')) return;
  const s = document.createElement('style'); s.id = 'menuCss'; s.textContent = MENU.CSS + (MENU.CSS2 || ''); document.head.appendChild(s);
};
/* ---------------------------------------------------------------- DOM helpers */
MENU.mk = function (name, cls, html) {
  MENU.ensureCss();
  const d = document.createElement('div'); d.className = 'menu on' + (cls ? ' ' + cls : ''); d.id = 'mn-' + name; d.innerHTML = html;
  const host = MENU.el(); host.innerHTML = ''; host.appendChild(d); MENU.root = d; return d;
};
MENU.tap = function (root, sel, fn) { root.querySelectorAll(sel).forEach((e) => e.addEventListener('click', (ev) => fn(e, ev))); };
MENU.acts = function (root, map) { for (const k of Object.keys(map)) MENU.tap(root, '[data-k="' + k + '"]', map[k]); };
MENU.std = function (root) { MENU.tap(root, '[data-back]', () => MENU.back()); };
/* launch actions (play a mission, retry, hub) ignore a second tap for a moment: GAME.start has no re-entrancy guard */
MENU.go = function (fn) { const t = performance.now(); if (t < MENU.busyT) return; MENU.busyT = t + 900; fn(); };
MENU.hdr = function (title, sub, right) {
  return `<div class="mx-hd"><div class="mx-btn ghost" data-back>‹ BACK</div><div class="mx-ht"><div class="mx-title">${title}</div>${sub ? `<div class="mx-sub">${sub}</div>` : ''}</div>${right ? `<div class="mx-hdr-r">${right}</div>` : ''}</div>`;
};
MENU.fmtT = (sec) => { const s = Math.max(0, Math.floor(sec || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
MENU.pretty = (s) => String(s || '').split(/[_\s]+/).filter(Boolean).map((w, i) => (i && ['of', 'the', 'and', 'a'].includes(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
MENU.SHIP = { harbinger: 'The Harbinger', interceptor: 'Sith Interceptor', shroud: 'The Shroud' };
MENU.inHub = () => !!((MISSION.cur && MISSION.cur.def && MISSION.cur.def.kind === 'hub') || (LEVEL.cur && LEVEL.cur.id === CAMPAIGN.hub));
/* confirm dialog over the current screen: html = body text, buttons = [{label, fn, cls}] (the first tap closes it, then fn runs) */
MENU.sheet = function (html, buttons) {
  const root = MENU.root; if (!root) return null;
  const wrap = document.createElement('div'); wrap.className = 'mx-sheet';
  wrap.innerHTML = `<div class="mx-sc">${html}<div class="mx-row">${buttons.map((b, i) => `<div class="mx-btn ${b.cls || ''}" data-si="${i}">${b.label}</div>`).join('')}</div></div>`;
  root.appendChild(wrap);
  buttons.forEach((b, i) => wrap.querySelector('[data-si="' + i + '"]').addEventListener('click', () => { wrap.remove(); if (b.fn) b.fn(); }));
  return wrap;
};
/* ---------------------------------------------------------------- screen router */
MENU.open = function (name, o) {
  o = o || {}; MENU.ensureCss();
  if (name === MENU.cur) { MENU.show(name, o); return; }   // re-open of the screen on show: refresh it, never stack it on itself
  if (MENU.ROOT[name]) MENU.stack = [];
  else {
    if (MENU.cur) MENU.stack.push({ name: MENU.cur, o: MENU.curO });
    else if (MG.state === 'play') MENU.stack.push({ name: '__play' });
    if (MG.state === 'play') MG.state = 'pause';   // the world holds still behind a sub-screen opened in play (the hub)
    HUD.show(false);
  }
  MENU.show(name, o);
};
MENU.show = function (name, o) { o = o || {}; const S = MENU.S[name]; MENU.cur = name; MENU.curO = o; if (S) S(o); };
/* re-render the current screen in place; data-keep lists keep their scroll position */
MENU.redraw = function () {
  const keep = {}; if (MENU.root) MENU.root.querySelectorAll('[data-keep]').forEach((e) => { keep[e.dataset.keep] = e.scrollTop; });
  MENU.show(MENU.cur, MENU.curO);
  if (MENU.root) MENU.root.querySelectorAll('[data-keep]').forEach((e) => { if (keep[e.dataset.keep] !== undefined) e.scrollTop = keep[e.dataset.keep]; });
};
MENU.back = function () {
  const p = MENU.stack.pop();
  if (!p) { if (MG.state === 'play' || MG.state === 'pause') MENU.resume(); else MENU.open('title'); return; }
  if (p.name === '__play') { MENU.resume(); return; }
  MENU.show(p.name, p.o);
};
MENU.close = function () { MENU.el().innerHTML = ''; MENU.cur = null; MENU.curO = null; MENU.stack = []; MENU.root = null; };
MENU.resume = function () { MENU.close(); MG.state = 'play'; HUD.show(true); };
MENU.toTitle = async function () { MENU.close(); await MENU.titleScene(); MENU.open('title'); };
/* ---------------------------------------------------------------- title */
MENU.S.title = function () {
  MG.state = 'title'; HUD.show(false);
  const d = SAVE.d, has = SAVE.has(), act = GAME.acts[(d.act || 1) - 1] || GAME.acts[0], m = CAMPAIGN.M[d.mission];
  const cont = has ? `<div class="mx-btn pri mx-cont" data-k="continue"><span class="mx-cl"><b>CONTINUE</b><small>${act.n} · ${m ? m.title : ''}</small></span><span class="mx-es">ESSENCE ${d.essence}</span></div>` : '';
  const root = MENU.mk('title', 'tt', `
    <div class="mx-logo"><div class="mx-kick">DARK LEGACY</div><div class="mx-name">RATHATRI</div><div class="mx-blade"></div></div>
    <div class="mx-tl">${cont}
      <div class="mx-btn" data-k="new">NEW GAME</div>
      <div class="mx-btn" data-k="missions">MISSIONS</div>
      <div class="mx-btn" data-k="codex">CODEX</div>
      <div class="mx-btn" data-k="settings">SETTINGS</div>
    </div>
    <div class="mx-foot">Fan-made · non-commercial</div>`);
  MENU.acts(root, {
    continue: () => MENU.go(() => CAMPAIGN.continue()),
    new: () => {
      if (!SAVE.has()) { MENU.go(() => CAMPAIGN.newGame()); return; }
      MENU.sheet('<div class="mx-ct">ERASE PROGRESS?</div><p class="mx-p">Your Essence, powers, codex and endings will be lost. The warrens will not remember you.</p>',
        [{ label: 'KEEP', fn: null }, { label: 'ERASE', cls: 'danger', fn: () => MENU.go(() => CAMPAIGN.newGame()) }]);
    },
    missions: () => { MENU.tab = SAVE.d.act || 1; MENU.open('missions'); },
    codex: () => MENU.open('codex'),
    settings: () => MENU.open('settings'),
  });
};
/* ---------------------------------------------------------------- in-game */
MENU.S.pause = function () {
  MG.state = 'pause'; HUD.show(false);
  const c = MISSION.cur, hub = MENU.inHub();
  const cells = [
    '<div class="mx-btn" data-k="powers">POWERS</div>',
    '<div class="mx-btn" data-k="codex">CODEX</div>',
    '<div class="mx-btn" data-k="settings">SETTINGS</div>',
    '<div class="mx-btn" data-k="retry">RESTART FROM CHECKPOINT</div>',
  ];
  if (!hub) cells.push('<div class="mx-btn" data-k="hub">RETURN TO HUB</div>');
  cells.push('<div class="mx-btn danger" data-k="quit">QUIT TO TITLE</div>');
  if (cells.length % 2) cells[cells.length - 1] = cells[cells.length - 1].replace('class="mx-btn', 'class="mx-btn wide');
  const obj = c ? (c.obj || (c.def && c.def.brief) || '') : '';
  const root = MENU.mk('pause', 'veil', `
    <div class="mx-hd"><div class="mx-ht"><div class="mx-k">PAUSED</div><div class="mx-title">${c && c.def ? c.def.title : 'The warrens'}</div></div></div>
    <div class="mx-scroll">
      <div class="mx-obj"><div class="mx-k">OBJECTIVE</div><div class="mx-ov">${obj || '—'}</div></div>
      <div class="mx-grid2"><div class="mx-btn pri wide" data-k="resume">RESUME</div>${cells.join('')}</div>
    </div>`);
  MENU.acts(root, {
    resume: () => MENU.resume(),
    powers: () => MENU.open('powers'),
    codex: () => MENU.open('codex'),
    settings: () => MENU.open('settings'),
    retry: () => MENU.go(() => GAME.retry()),
    hub: () => MENU.go(() => CAMPAIGN.toHub()),
    quit: () => MENU.sheet('<div class="mx-ct">QUIT TO TITLE?</div><p class="mx-p">Progress since your last checkpoint is lost.</p>',
      [{ label: 'STAY', fn: null }, { label: 'QUIT', cls: 'danger', fn: () => MENU.toTitle() }]),
  });
};
MENU.S.dead = function () {
  MG.state = 'dead'; HUD.show(false);
  const root = MENU.mk('dead', 'dark', `
    <div class="mx-center">
      <div class="mx-yf">YOU FELL</div>
      <div class="mx-quote">${GAME.quote()}</div>
      <div class="mx-stack">
        <div class="mx-btn pri" data-k="retry">RETRY</div>
        ${MENU.inHub() ? '' : '<div class="mx-btn" data-k="hub">RETURN TO HUB</div>'}
        <div class="mx-btn danger" data-k="quit">QUIT TO TITLE</div>
      </div>
    </div>`);
  MENU.acts(root, {
    retry: () => MENU.go(() => GAME.retry()),
    hub: () => MENU.go(() => CAMPAIGN.toHub()),
    quit: () => MENU.toTitle(),
  });
};
MENU.S.result = function (o) {
  MG.state = 'result'; HUD.show(false);
  const m = o.mission || {}, g = o.got || {}, final = !!o.final, act = GAME.acts[(m.act || 1) - 1] || {};
  const rank = g.rank || 'B';
  const row = (k, v) => `<div class="mx-rw"><span>${k}</span><b>${v}</b></div>`;
  const left = [['TIME', MENU.fmtT(g.time)], ['KILLS', g.kills || 0], ['ESSENCE', '+' + (g.essence || 0)], ['SALVAGE', '+' + (g.salvage || 0)]];
  const right = [
    ['ARTIFACT', g.artifact ? MENU.pretty(g.artifact) : '—'],
    ['POWERS', g.powers && g.powers.length ? g.powers.map((p) => (POWERS.D[p] ? POWERS.D[p].name : MENU.pretty(p))).join(' · ') : '—'],
    ['CODEX', g.codex && g.codex.length ? g.codex.map((id) => (CODEX.data[id] ? CODEX.data[id].title : MENU.pretty(id))).join(' · ') : '—'],
    ['SHIP', g.ship ? (MENU.SHIP[g.ship] || MENU.pretty(g.ship)) : '—'],
  ];
  const root = MENU.mk('result', 'veil', `
    <div class="mx-res">
      <div class="mx-resL">
        <div class="mx-k">${final ? 'The Sith have revealed themselves' : (act.n || '') + ' · mission complete'}</div>
        <div class="mx-rank r${rank}">${rank}</div>
        <div class="mx-rtitle">${m.title || ''}</div>
      </div>
      <div class="mx-scroll mx-resR">${left.map((r) => row(r[0], r[1])).join('')}${right.map((r) => row(r[0], r[1])).join('')}</div>
    </div>
    <div class="mx-resF"><div class="mx-btn pri" data-k="next">CONTINUE ›</div></div>`);
  MENU.acts(root, { next: () => MENU.go(() => CAMPAIGN.advance()) });
};
/* ---------------------------------------------------------------- title backdrop: a ruined hall, the hero in guard, slow orbit */
LEVEL.def('title_scene', {
  chapter: 'DARK LEGACY', name: 'RATHATRI', cast: [], tex: ['sithFloor', 'ribWall', 'rock'],
  start: [0, 0, 0, PI * 0.85], checkpoints: [[0, 0, 0, PI * 0.85]], killY: -40,
  async build(L) {
    const floor = TEX.mat('sithFloor', { color: 0x6e6462, env: 0.6 });
    const wall = TEX.mat('ribWall', { color: 0x5b4b48, env: 0.5 });
    const far = TEX.mat('ribWall', { color: 0x2e2324, env: 0.3 });
    const stone = TEX.mat('sithFloor', { color: 0x575050, env: 0.5 });
    const rock = TEX.mat('rock', { color: 0x4b3f3c, env: 0.4 });
    KIT.box(-20, -1, -18, 20, 0, 24, floor);                                   // courtyard slab, top at y = 0
    KIT.box(-20, 0, 18, -6, 10, 21, far); KIT.box(-6, 0, 18, -2, 5.5, 21, far); KIT.box(2, 0, 18, 20, 7.5, 21, far);   // far wall, broken
    KIT.box(-20, 0, -18, -17, 7, 18, wall); KIT.box(17, 0, -18, 20, 5, 18, wall);                                        // flanks, stepping down
    for (const [x, z, h] of [[-8, -6, 8.2], [8, -6, 4.6], [-8, 9, 6.4], [8, 9, 8.6]]) KIT.cyl(x, 0, z, 1.05, h, stone);  // broken colonnade
    for (const [x, z, s, r] of [[-11, 13, 1.3, 0.4], [-5, 15, 0.9, 1.9], [4, 12, 1.1, 0.9], [11, 15, 1.6, 2.6], [-14, 3, 0.8, 1.2], [15, -3, 1.0, 0.3]])
      KIT.rbox(x, 0.35 * s, z, 0.9 * s, 0.35 * s, 0.6 * s, 0.2, r, 0.1, rock);                                          // fallen masonry
    const torchLights = [KIT.lamp(-8, 8.8, -6, 0xff6a2a, 3.6, 14, { size: 0.13 }), KIT.lamp(8, 5.2, -6, 0xff6a2a, 3.6, 14, { size: 0.13 }),
      KIT.lamp(-16.4, 4.6, 2, 0xff5020, 3.0, 12, { size: 0.12 }), KIT.lamp(11, 3.6, 14, 0xff7a30, 2.6, 10, { size: 0.12 })];
    const base = torchLights.map((t) => t.i);
    R.setSun(new THREE.Vector3(-0.55, 0.85, -0.35), 0xa8b0c0, 0.42, 0x2a2430, 0x0a0606, 0.6);
    R.setShadowBox(14, 50);
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.06, 0.035, 0.04), 0.035);
    const env = new THREE.Scene(); env.background = new THREE.Color(0.05, 0.03, 0.03); L.env = env;
    L.updates.push((dt, t) => { for (let i = 0; i < torchLights.length; i++) torchLights[i].i = base[i] * (0.8 + 0.2 * Math.sin(t * (5.3 + i * 1.7) + i) * Math.sin(t * 2.1 + i * 2.9)); });
  },
  onStart() { },
});
MENU.titleScene = async function () {
  MG.skipIntro = true;
  await LEVEL.load('title_scene', { progress: (p) => MG.loadUI(0.2 + p * 0.7, 'Raising the hall') });
  MG.skipIntro = false;
  const a = PLAYER.a; a.x = 0; a.z = 0; a.y = 0; a.yaw = PI * 0.85;
  MG.state = 'title'; HUD.show(false); HUD.hideHint(); HUD.el.sub.classList.remove('on');
  CM.rimU.value.setRGB(0.5, 0.1, 0.05); CM.fillU.value.setRGB(0.2, 0.19, 0.2);   // red Sith edge light, low fill: the blade lights his face
  MENU.titleT = 0;
};
MENU.titleUpdate = function (dt) {
  MENU.titleT += dt; const t = MENU.titleT, a = PLAYER.a; if (!a) return;
  a.speed = 0; a.vx = a.vz = 0; a.setBase('guard'); a.physics(dt); a.animate(dt); a.pose3D(dt);
  PLAYER.saber.lightK = 0.4;   // title: the blade lights his face, it must not paint the black robes red
  PLAYER.saber.update(dt, MG.t); PLAYER.saber.sampleTrails(MG.t, 0);
  LEVEL.update(dt);
  const ang = a.yaw + Math.sin(t * 0.12) * 0.45 - 0.15, r = 3.1 - Math.sin(t * 0.1) * 0.35;
  const cx = a.x + Math.sin(ang) * r, cz = a.z + Math.cos(ang) * r, cam = R.camera;
  cam.position.set(cx, 1.38 + Math.sin(t * 0.17) * 0.1, cz);
  let fx = a.x - cx, fz = a.z - cz; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  const SHIFT = 0.2;   // look slightly right of the hero: he sits between the wordmark and the button column
  cam.lookAt(a.x - fz * SHIFT, 1.3, a.z + fx * SHIFT);
  if (cam.fov !== 40) { cam.fov = 40; cam.updateProjectionMatrix(); }
};
