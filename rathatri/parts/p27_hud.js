/* HUD — DOM overlay for phone landscape: name + health / Force / rage bars and status chip (top-left), one-line objective,
   boss bar and EXPOSURE meter (top-centre), hint pill, combo (left-middle), world prompt, toast, subtitles (bottom-centre, in the
   gap between the thumb zones), damage vignette and flash. Every id and HUD.* signature below is stable; heat / essence / chip
   and the layout sync live in p27b_hud_extra.js. Nothing is drawn on the canvas. */
const HUD = { hpLag: 1, popT: 0, hintT: 0, subT: 0, toastT: 0, hurtT: 0, chipT: 0, boss: null };
HUD.ids = ['hud', 'hpFill', 'hpLag', 'fpFill', 'rageFill', 'rageBar', 'objD', 'chapT', 'combo', 'cN', 'cR', 'cRfill', 'boss', 'bossN', 'bossFill', 'bossGuardF', 'bossSub',
  'lock', 'prompt', 'toast', 'toastA', 'toastB', 'sub', 'hint', 'vig', 'flash', 'holo', 'heat', 'heatF', 'heatT', 'chip', 'essence'];
HUD.init = function () {
  HUD.el = {}; for (const id of HUD.ids) HUD.el[id] = MG.$(id);
};
HUD.show = function (on) { HUD.el.hud.classList.toggle('on', !!on); };
HUD.obj = function (t) { HUD.el.objD.textContent = t || ''; if (t) { HUD.el.objD.style.color = '#ffb09c'; setTimeout(() => { HUD.el.objD.style.color = ''; }, 900); } };
HUD.chapter = function (t) { HUD.el.chapT.textContent = t || ''; };
HUD.pop = function (t) { HUD.el.prompt.textContent = t; HUD.el.prompt.style.left = '50%'; HUD.el.prompt.style.top = '40%'; HUD.el.prompt.classList.add('on'); HUD.popT = 1.1; HUD.popFixed = true; };
HUD.toast = function (a, b, dur) { if (!a && !b) { HUD.el.toast.classList.remove('on'); return; } HUD.el.toastA.textContent = a; HUD.el.toastB.textContent = b; HUD.el.toast.classList.add('on'); HUD.toastT = dur || 2.4; };
HUD.hint = function (html, dur) { HUD.el.hint.innerHTML = html; HUD.el.hint.classList.add('on'); HUD.hintT = dur || 5; };
HUD.hideHint = function () { HUD.el.hint.classList.remove('on'); HUD.hintT = 0; };
HUD.sub = function (who, text, dur, cls) { HUD.el.sub.innerHTML = (who ? `<b class="${cls || ''}">${who}</b>` : '') + text; HUD.el.sub.classList.add('on'); HUD.subT = dur || Math.max(2.5, text.length * 0.065); };
HUD.hurt = function () { HUD.hurtT = 0.5; };
HUD.flash = function (a) { HUD.el.flash.style.transition = 'none'; HUD.el.flash.style.opacity = a || 0.6; requestAnimationFrame(() => { HUD.el.flash.style.transition = 'opacity 0.6s'; HUD.el.flash.style.opacity = 0; }); };
/* boss bar: takes the objective's place at the top; the objective collapses while it is up (#hud.bossUp) */
HUD.setBoss = function (a, name, sub, cls) {
  if (a && a !== HUD.boss && name) HUD.toast(sub ? sub.split('·')[0].trim() : '', name, 3);
  HUD.boss = a; HUD.el.bossN.textContent = name || ''; HUD.el.bossSub.textContent = sub || ''; HUD.el.bossFill.className = cls || '';
  HUD.el.boss.classList.toggle('on', !!a); HUD.el.hud.classList.toggle('bossUp', !!a);
};
HUD.update = function (dt) {
  const P = PLAYER.a;
  HUD.syncLayout();
  if (P) {
    const hp = sat(P.hp / P.hpMax); HUD.hpLag = hp < HUD.hpLag ? damp(HUD.hpLag, hp, 2.5, dt) : hp;
    HUD.el.hpFill.style.width = (hp * 100).toFixed(1) + '%'; HUD.el.hpLag.style.width = (HUD.hpLag * 100).toFixed(1) + '%';
    HUD.el.fpFill.style.width = (PLAYER.fp / PLAYER.fpMax * 100).toFixed(1) + '%';
    HUD.el.rageFill.style.width = PLAYER.rage.toFixed(1) + '%';
    HUD.el.rageBar.classList.toggle('full', PLAYER.rage >= 100 && !PLAYER.rageOn);
    // lock reticle / execution prompt
    const lk = PLAYER.lock && PLAYER.lock.alive ? PLAYER.lock : null;
    if (lk) { const s = HUD.project(lk.chest(_v1)); if (s) { HUD.el.lock.style.left = s[0] + 'px'; HUD.el.lock.style.top = s[1] + 'px'; } HUD.el.lock.classList.toggle('on', !!s); } else HUD.el.lock.classList.remove('on');
    if (!HUD.popFixed) {
      const ex = PLAYER.state === 'move' || PLAYER.state === 'attack' ? PLAYER.execTarget() : null;
      if (ex) { const s = HUD.project(ex.head(_v1).add(_v2.set(0, 0.35, 0))); if (s) { HUD.el.prompt.innerHTML = IN.keyLabel('grip') + ' EXECUTE'; HUD.el.prompt.style.left = s[0] + 'px'; HUD.el.prompt.style.top = s[1] + 'px'; HUD.el.prompt.classList.add('on'); } }
      else if (LEVEL.cur && LEVEL.cur.prompt) { const pr = LEVEL.cur.prompt; const s = HUD.project(pr.p); if (s) { HUD.el.prompt.innerHTML = pr.text; HUD.el.prompt.style.left = s[0] + 'px'; HUD.el.prompt.style.top = s[1] + 'px'; HUD.el.prompt.classList.add('on'); } }
      else HUD.el.prompt.classList.remove('on');
    }
  }
  if (HUD.popT > 0) { HUD.popT -= dt; if (HUD.popT <= 0) { HUD.popFixed = false; HUD.el.prompt.classList.remove('on'); } }
  // combo (style rank from COMBAT)
  const S = COMBAT.style;
  if (S.n >= 2) { HUD.el.combo.classList.add('on'); HUD.el.cN.textContent = S.n; HUD.el.cR.textContent = COMBAT.RANKS[S.rank] || ''; HUD.el.cRfill.style.width = (sat(S.t / 3.2) * 100).toFixed(0) + '%'; }
  else HUD.el.combo.classList.remove('on');
  // boss
  if (HUD.boss) { const b = HUD.boss; HUD.el.bossFill.style.width = (sat(b.hp / b.hpMax) * 100).toFixed(1) + '%'; HUD.el.bossGuardF.style.width = (sat((b.guard || 0) / (b.guardMax || 1)) * 100).toFixed(1) + '%'; if (!b.alive && !b.keepBar) HUD.setBoss(null); }
  // timers
  if (HUD.hintT > 0 && !document.body.classList.contains('cine')) { HUD.hintT -= dt; if (HUD.hintT <= 0) HUD.el.hint.classList.remove('on'); }   // a hint set under a cutscene waits for gameplay
  if (HUD.subT > 0) { HUD.subT -= dt; if (HUD.subT <= 0) HUD.el.sub.classList.remove('on'); }
  if (HUD.toastT > 0) { HUD.toastT -= dt; if (HUD.toastT <= 0) HUD.el.toast.classList.remove('on'); }
  if (HUD.chipT > 0) { HUD.chipT -= dt; if (HUD.chipT <= 0) HUD.el.chip.classList.remove('on'); }
  HUD.hurtT = Math.max(0, HUD.hurtT - dt);
  const low = P ? sat(1 - P.hp / (P.hpMax * 0.35)) : 0;
  HUD.el.vig.style.opacity = Math.max(HUD.hurtT * 1.4, low * (0.5 + 0.2 * Math.sin(MG.rt * 5))).toFixed(3);
  R.G.hurt = HUD.hurtT * 0.6; R.G.rage = damp(R.G.rage, PLAYER.rageOn ? 0.85 : 0, 4, dt);
};
HUD.project = function (p) {
  const v = _v5.copy(p).project(R.camera);
  if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return null;
  return [(v.x * 0.5 + 0.5) * R.cw, (-v.y * 0.5 + 0.5) * R.ch];
};
