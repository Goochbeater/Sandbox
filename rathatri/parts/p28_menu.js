/* MENUS — title (live 3D backdrop), chapter select, controls, pause, death, chapter results. Keyboard, mouse, pad. */
const MENU = { cur: null, sel: 0, items: [], titleT: 0 };
MENU.el = () => MG.$('menus');
MENU.close = function () { MENU.el().innerHTML = ''; MENU.cur = null; MG.onKey = null; };
MENU.bindList = function (root) {
  MENU.items = [...root.querySelectorAll('.mi:not(.dis), .card:not(.lock), .lvlb')]; MENU.sel = Math.min(MENU.sel, Math.max(0, MENU.items.length - 1));
  const hl = () => MENU.items.forEach((e, i) => e.classList.toggle('sel', i === MENU.sel)); hl();
  MENU.items.forEach((e, i) => { e.addEventListener('mouseenter', () => { MENU.sel = i; hl(); }); e.addEventListener('click', (ev) => { ev.stopPropagation(); MENU.activate(i); }); });
  MG.onKey = (code) => {
    if (!MENU.cur) return;
    const horiz = root.querySelector('#chapList');
    if (code === 'ArrowDown' || code === 'KeyS' || (horiz && (code === 'ArrowRight' || code === 'KeyD'))) { MENU.sel = (MENU.sel + 1) % MENU.items.length; hl(); }
    else if (code === 'ArrowUp' || code === 'KeyW' || (horiz && (code === 'ArrowLeft' || code === 'KeyA'))) { MENU.sel = (MENU.sel - 1 + MENU.items.length) % MENU.items.length; hl(); }
    else if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') MENU.activate(MENU.sel);
    else if (code === 'Escape' || code === 'Backspace') { if (MENU.cur === 'pause') MENU.resume(); else if (MENU.cur !== 'title' && MENU.cur !== 'dead') MENU.open('title'); }
  };
};
MENU.activate = function (i) { const e = MENU.items[i]; if (e && e._fn) e._fn(); };
MENU.mk = function (html, id, cls) { const d = document.createElement('div'); d.className = 'menu on ' + (cls || ''); d.id = id; d.innerHTML = html; MENU.el().innerHTML = ''; MENU.el().appendChild(d); return d; };
MENU.item = function (root, sel, fn) { const e = root.querySelector(sel); if (e) e._fn = fn; };
MENU.open = function (name, o) {
  o = o || {}; MENU.cur = name; MENU.sel = 0;
  if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* */ }
  if (name === 'title') {
    MG.state = 'title'; HUD.show(false);
    const cont = GAME.save.unlocked > 1 || GAME.save.resume;
    const d = MENU.mk(`<div class="logo"><h1>DARTH<br><span>MAUL</span></h1><h2>SITH APPRENTICE</h2><div class="blade"></div></div>
      <div class="mlist"><div class="mi" id="mPlay">${cont ? 'NEW GAME' : 'BEGIN THE HUNT'}<small>Chapter I · Coruscant</small></div>
      <div class="mi" id="mChap">LEVEL SELECT<small>Jump to any of the ${GAME.seq.length} levels</small></div>
      <div class="mi" id="mDiff">DIFFICULTY · <span id="dv">${MG.difficulty.toUpperCase()}</span></div>
      <div class="mi" id="mCtl">CONTROLS</div></div>
      <div class="mchap"><div class="mh">CHAPTERS</div>${GAME.chapters.map((c, i) => `<div class="mi" id="mCh${i}"><b>${c.n.replace('CHAPTER ', '')}</b>${c.t}<small>${c.p} · ${GAME.levels[i].length} LEVELS · ALL OPEN</small></div>`).join('')}</div>
      <div class="foot">Mouse + keyboard or gamepad</div>
      <div class="quote">“At last we will reveal ourselves to the Jedi.<br>At last we will have revenge.”</div>`, 'title');
    MENU.item(d, '#mPlay', () => GAME.start('works'));
    MENU.item(d, '#mChap', () => MENU.open('chapters'));
    GAME.chapters.forEach((c, i) => MENU.item(d, '#mCh' + i, () => GAME.start(c.first)));
    MENU.item(d, '#mDiff', () => { const L = ['easy', 'normal', 'hard']; MG.difficulty = L[(L.indexOf(MG.difficulty) + 1) % 3]; d.querySelector('#dv').textContent = MG.difficulty.toUpperCase(); });
    MENU.item(d, '#mCtl', () => MENU.open('controls', { back: 'title' }));
    MENU.bindList(d);
    return;
  }
  if (name === 'chapters') {
    const lv = GAME.levels;
    const cards = GAME.chapters.map((c, i) => `<div class="card" id="ch${i}"><div class="n">${c.n}</div><div class="t">${c.t}</div><div class="p">${c.p}</div><div class="d">${c.d}</div><div class="lore">${c.lore}</div>
      <div class="s">${lv[i].map((l) => `<span class="lvlb" data-l="${l}">${LEVEL.defs[l].name}</span>`).join(' · ')}</div></div>`).join('');
    const d = MENU.mk(`<div class="hd">SELECT CHAPTER OR LEVEL · <span style="color:#a88">◆ ${HOLOCRON.count()}/24 HOLOCRONS</span></div><div id="chapList">${cards}</div><div class="back mi" id="mBack">‹ BACK</div>`, 'chap');
    GAME.chapters.forEach((c, i) => MENU.item(d, '#ch' + i, () => GAME.start(c.first)));
    d.querySelectorAll('.lvlb').forEach((e) => { e._fn = () => GAME.start(e.dataset.l); });
    MENU.item(d, '#mBack', () => MENU.open('title'));
    MENU.bindList(d); return;
  }
  if (name === 'controls') {
    const K = (a, b) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
    const d = MENU.mk(`<div class="hd">CONTROLS</div><div class="cols"><div>
      <div class="sect">MOVEMENT</div>${K('Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>')}${K('Camera', 'Mouse (click to capture) · arrow keys')}${K('Jump · Force flip', '<kbd>SPACE</kbd> ×2')}${K('Dodge / backflip', '<kbd>SHIFT</kbd>')}${K('Lock on', '<kbd>TAB</kbd> / middle mouse')}
      <div class="sect">SABERSTAFF</div>${K('Combo (5 hits)', '<kbd>LMB</kbd> repeatedly')}${K('Dark Whirlwind', '<kbd>RMB</kbd>')}${K('Lunge', '<kbd>LMB</kbd> while sprinting')}${K('Plunge', '<kbd>LMB</kbd> in the air')}${K('Block · deflect · parry', 'hold <kbd>Q</kbd> · tap on impact')}
      </div><div>
      <div class="sect">THE FORCE</div>${K('Force push', '<kbd>E</kbd>')}${K('Force grip (hold) · throw', '<kbd>F</kbd>')}${K('Saber throw', '<kbd>R</kbd>')}${K('Dark Side rage (bar full)', '<kbd>X</kbd>')}${K('Execute a stunned / broken foe', '<kbd>F</kbd>')}
      <div class="sect">GAMEPAD</div>${K('Attack · heavy', 'X · Y')}${K('Jump · dodge', 'A · B')}${K('Block · push', 'LB · RB')}${K('Grip · throw', 'LT · RT')}${K('Lock · rage', 'R3 · L3')}
      <div class="sect">TIPS</div><div class="row"><span>Kills feed Maul the dark side: health + Force. Perfect deflects send bolts home.</span></div>
      </div></div><div class="back mi" id="mBack">‹ BACK</div>`, 'ctl', 'panel');
    MENU.item(d, '#mBack', () => MENU.open(o.back || 'title', o));
    MENU.bindList(d); return;
  }
  if (name === 'pause') {
    MG.state = 'pause'; HUD.show(false);
    const d = MENU.mk(`<div class="hd">PAUSED</div><div class="mlist"><div class="mi" id="mRes">RESUME</div><div class="mi" id="mRetry">RESTART CHECKPOINT</div><div class="mi" id="mCtl">CONTROLS</div><div class="mi" id="mQuit">QUIT TO TITLE</div></div>`, 'pause');
    MENU.item(d, '#mRes', () => MENU.resume()); MENU.item(d, '#mRetry', () => GAME.retry()); MENU.item(d, '#mCtl', () => MENU.open('controls', { back: 'pause' })); MENU.item(d, '#mQuit', () => MENU.toTitle());
    MENU.bindList(d); return;
  }
  if (name === 'dead') {
    HUD.show(false);
    const q = pick(['“Fear is my ally.”', '“The Force will not save you.”', '“I have waited a long time for this.”', '“You will die, Jedi.”']);
    const d = MENU.mk(`<div class="big">DEFEATED</div><div class="q">${q}</div><div class="mlist"><div class="mi" id="mRetry">RISE AGAIN</div><div class="mi" id="mQuit">QUIT TO TITLE</div></div>`, 'dead');
    MENU.item(d, '#mRetry', () => GAME.retry()); MENU.item(d, '#mQuit', () => MENU.toTitle());
    MENU.bindList(d); return;
  }
  if (name === 'result') {
    const st = GAME.levelStart || { t: MG.rt, kills: 0 };
    const tm = MG.rt - st.t, mm = Math.floor(tm / 60), ss = Math.floor(tm % 60);
    const K = (a, b) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
    const d = MENU.mk(`<div class="hd">${o.final ? 'THE SITH HAVE REVEALED THEMSELVES' : o.ch.n + ' COMPLETE'}</div><div class="big">${o.final ? 'VICTORY' : o.ch.t}</div>
      <div id="resStats">${K('Enemies destroyed', COMBAT.kills)}${K('Best combo', COMBAT.style.best)}${K('Bolts deflected', COMBAT.deflects)}${K('Time', mm + ':' + String(ss).padStart(2, '0'))}${K('Difficulty', MG.difficulty.toUpperCase())}</div>
      <div class="mlist">${o.next ? '<div class="mi" id="mNext">CONTINUE ›<small>' + GAME.chapters[GAME.chapterOf(o.next)].n + ' · ' + GAME.chapters[GAME.chapterOf(o.next)].t + '</small></div>' : ''}<div class="mi" id="mQuit">TITLE</div></div>`, 'result');
    if (o.next) MENU.item(d, '#mNext', () => GAME.start(o.next));
    MENU.item(d, '#mQuit', () => MENU.toTitle());
    MENU.bindList(d); return;
  }
};
MENU.resume = function () { MENU.close(); MG.state = 'play'; HUD.show(true); };
MENU.toTitle = async function () { MENU.close(); await MENU.titleScene(); MENU.open('title'); };
/* title backdrop: the Works hall, Maul in guard with the staff lit, slow orbit */
MENU.titleScene = async function () {
  MG.skipIntro = true;
  await LEVEL.load('works', { progress: (p) => MG.loadUI(0.2 + p * 0.7, 'Building the Works') });
  MG.skipIntro = false;
  // remove the tutorial scripting side effects
  ENEMY.clear(); LEVEL.cur.waves.length = 0; LEVEL.cur.triggers.length = 0; MG.timers = MG.timers.filter((t) => t.real);
  const a = PLAYER.a; a.x = 0; a.z = -8; a.y = 0.3; a.yaw = PI * 0.85;
  MG.state = 'title'; HUD.show(false); HUD.hideHint(); HUD.el.sub.classList.remove('on');
  CM.rimU.value.setRGB(0.5, 0.1, 0.05); CM.fillU.value.setRGB(0.2, 0.19, 0.2);   // moody title: red Sith edge light, low fill
  MENU.titleT = 0;
};
MENU.titleUpdate = function (dt) {
  MENU.titleT += dt; const t = MENU.titleT, a = PLAYER.a; if (!a) return;
  a.speed = 0; a.vx = a.vz = 0; a.setBase('guard'); a.physics(dt); a.animate(dt); a.pose3D(dt);
  PLAYER.saber.lightK = 0.4;   // title: the blade lights his face, it must not paint the black robes red
  PLAYER.saber.update(dt, MG.t); PLAYER.saber.sampleTrails(MG.t, 0);
  LEVEL.update(dt);
  const ang = a.yaw + Math.sin(t * 0.12) * 0.45 - 0.15;
  const cam = R.camera, r = 3.1 - Math.sin(t * 0.1) * 0.35;
  const cp = V3(a.x + Math.sin(ang) * r, 1.38 + Math.sin(t * 0.17) * 0.1, a.z + Math.cos(ang) * r);
  cam.position.copy(cp);
  const fwd = V3(a.x - cp.x, 0, a.z - cp.z).normalize(), right = V3(-fwd.z, 0, fwd.x);
  cam.lookAt(a.x - right.x * 0.95, 1.3, a.z - right.z * 0.95); if (cam.fov !== 40) { cam.fov = 40; cam.updateProjectionMatrix(); }
};
