/* INTRO — the boot gate and title. Every normal boot opens on a full-screen TAP TO BEGIN gate: the tap is the gesture that
   enables fullscreen and the landscape lock (TOUCH.goFull) and lets a film play with sound. Then:
   - with the user's film embedded (#introB64, shipped builds only): it plays; a tap skips to the title card, a second tap finishes;
   - otherwise the title card runs for about 5 s; a tap skips it.
   Either way INTRO.finish() hands over to the menu. Bypass (?nointro, ?play, ?view, ?test, headless) is exactly as before.
   The game is silent: the only sound in the build is the user's film. */
const INTRO = { on: false, done: false, TITLE_T: 9.0, TITLE_HOLD: 5.0, titleOn: false, phase: 'off' };
INTRO.available = () => !!document.getElementById('introB64');
INTRO.bypass = () => !!(MG.flags.nointro || MG.flags.play || MG.flags.view || MG.test || (MG.headless && !MG.flags.forceintro));
INTRO.start = function () {
  if (INTRO.bypass()) { INTRO.done = true; return false; }
  try {
    const el = MG.$('intro');
    INTRO.on = true; INTRO.phase = 'gate'; INTRO.titleOn = false;
    el.style.display = 'block'; el.style.opacity = 1; MG.$('introGate').classList.add('on');
    INTRO._input = (e) => { if (!INTRO.on || (e.type === 'keydown' && e.repeat)) return; INTRO.tap(); };
    window.addEventListener('keydown', INTRO._input); el.addEventListener('pointerdown', INTRO._input);
    return true;
  } catch (e) { console.warn('intro failed', e); INTRO.done = true; return false; }
};
/* one tap = one step: gate -> film or title; film -> title (tap again: finish); title -> finish */
INTRO.tap = function () {
  if (!INTRO.on) return;
  if (INTRO.phase === 'gate') { if (typeof TOUCH !== 'undefined' && TOUCH.goFull) TOUCH.goFull(); INTRO.begin(); return; }
  if (INTRO.phase === 'video' && !INTRO.titleOn) { INTRO.skipToTitle(); return; }
  INTRO.finish();
};
INTRO.begin = function () {
  MG.$('introGate').classList.remove('on'); MG.$('introSkip').style.opacity = 1;
  if (!INTRO.available()) { INTRO.showTitle(); return; }
  const v = MG.$('introV'); INTRO.phase = 'video';
  try {
    const bin = atob(MG.$('introB64').textContent.trim()), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    v.src = URL.createObjectURL(new Blob([u8], { type: 'video/mp4' })); v.volume = 1; v.muted = false;
    v.onended = () => INTRO.finish(); v.onerror = () => INTRO.showTitle();
    v.ontimeupdate = () => { MG.$('introBarF').style.width = (100 * Math.min(1, v.currentTime / INTRO.TITLE_T)).toFixed(1) + '%'; if (v.currentTime >= INTRO.TITLE_T - 0.25) INTRO.showTitle(); };
    const p = v.play(); if (p && p.catch) p.catch(() => INTRO.showTitle());   // a refused film drops to the title card
  } catch (e) { INTRO.showTitle(); }
};
INTRO.play = (auto) => INTRO.begin();   // kept for old callers
INTRO.skipToTitle = function () {
  try { MG.$('introV').currentTime = INTRO.TITLE_T; } catch (e) { /* not seekable yet */ }
  INTRO.showTitle();
};
INTRO.showTitle = function () {
  if (INTRO.titleOn || !INTRO.on) return; INTRO.titleOn = true; INTRO.phase = 'title';
  MG.$('introGate').classList.remove('on'); MG.$('introTitle').classList.add('on'); MG.$('introBar').style.opacity = 0;
  // the film hands over at its end; the title-only card holds for TITLE_HOLD seconds
  const v = MG.$('introV'), filmed = INTRO.available() && v.src && isFinite(v.duration) && v.duration > 0;
  clearTimeout(INTRO._safety); INTRO._safety = setTimeout(() => INTRO.finish(), filmed ? Math.max(4500, (v.duration - v.currentTime) * 1000 + 400) : INTRO.TITLE_HOLD * 1000);
};
INTRO.finish = function () {
  if (!INTRO.on) return; INTRO.on = false; INTRO.skipAt = performance.now(); INTRO.phase = 'off'; clearTimeout(INTRO._safety);
  window.removeEventListener('keydown', INTRO._input); MG.$('intro').removeEventListener('pointerdown', INTRO._input);
  const el = MG.$('intro'), v = MG.$('introV'); el.style.opacity = 0;
  // fade whatever film audio is left rather than cutting it
  const v0 = v.volume, t0 = performance.now(); const fade = () => { const k = Math.min(1, (performance.now() - t0) / 1300); try { v.volume = v0 * (1 - k); } catch (e) { /* */ } if (k < 1) requestAnimationFrame(fade); }; fade();
  setTimeout(() => { el.style.display = 'none'; MG.$('introTitle').classList.remove('on'); try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* */ } INTRO.done = true; }, 1450);
  IN.pressed = {}; IN.buf = {};   // swallow the tap so it does not also press a menu item
};
