/* INTRO — the HD cinematic (2576×1080, 2.39:1) plays on boot with its soundtrack, full-frame and letterboxed, while the game
   builds underneath. When the picture fades out (~9 s) the music carries on and the MAUL title card rises over it; when the
   track ends it dissolves into the main menu. Browsers only allow sound after a gesture, so if autoplay with audio is refused
   a one-key start gate appears. Skip: first key jumps to the title, second goes to the menu (music fades out).
   Only shipped builds embed the video (#introB64). */
const INTRO = { on: false, done: false, TITLE_T: 9.0, titleOn: false, phase: 'off' };
INTRO.available = () => !!document.getElementById('introB64');
INTRO.start = function () {
  if (!INTRO.available() || MG.flags.nointro || MG.flags.play || MG.flags.view || MG.test || (MG.headless && !MG.flags.forceintro)) { INTRO.done = true; return false; }
  try {
    const b64 = document.getElementById('introB64').textContent.trim();
    const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: 'video/mp4' }));
    const el = MG.$('intro'), v = MG.$('introV');
    v.src = url; v.volume = 1; el.style.display = 'block'; el.style.opacity = 1; INTRO.on = true; INTRO.phase = 'video';
    v.onended = () => INTRO.finish();
    v.ontimeupdate = () => { MG.$('introBarF').style.width = (100 * Math.min(1, v.currentTime / INTRO.TITLE_T)).toFixed(1) + '%'; if (v.currentTime >= INTRO.TITLE_T - 0.25) INTRO.showTitle(); };
    const tick = () => { if (!INTRO.on) return; if (INTRO.phase !== 'gate' && v.currentTime >= INTRO.TITLE_T - 0.25) INTRO.showTitle(); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    const input = (e) => {
      if (!INTRO.on || (e && e.type === 'keydown' && e.repeat)) return;
      if (INTRO.phase === 'gate') { INTRO.play(false); return; }
      if (!INTRO.titleOn) { try { v.currentTime = INTRO.TITLE_T; } catch (er) { /* */ } INTRO.showTitle(); return; }   // jump to the title card
      INTRO.finish();
    };
    INTRO._input = input; window.addEventListener('keydown', input); el.addEventListener('mousedown', input);
    INTRO.play(true);
    return true;
  } catch (e) { console.warn('intro failed', e); INTRO.done = true; return false; }
};
/* try to play with sound; if the browser refuses (no gesture yet), show the gate — or, headless, fall back to muted */
INTRO.play = function (auto) {
  const v = MG.$('introV'), gate = MG.$('introGate');
  gate.classList.remove('on'); INTRO.phase = 'video'; v.muted = false;
  if (!auto) { try { v.currentTime = 0; } catch (e) { /* */ } }
  const p = auto && MG.flags.gate ? Promise.reject(new Error('gate test')) : v.play();   // ?gate forces the no-autoplay path
  if (p && p.catch) p.catch(() => {
    if (MG.headless && !MG.flags.gate) { v.muted = true; v.play().catch(() => INTRO.finish()); return; }
    INTRO.phase = 'gate'; gate.classList.add('on'); v.pause();
  });
};
INTRO.showTitle = function () {
  if (INTRO.titleOn || !INTRO.on) return; INTRO.titleOn = true; INTRO.phase = 'title';
  MG.$('introTitle').classList.add('on'); MG.$('introSkip').style.opacity = 0; MG.$('introBar').style.opacity = 0;
  const v = MG.$('introV'); INTRO._titleAt = performance.now();
  // if the file ends early (or never reports 'ended'), still hand over to the menu
  clearTimeout(INTRO._safety); INTRO._safety = setTimeout(() => INTRO.finish(), Math.max(4500, ((v.duration || 15.2) - v.currentTime) * 1000 + 400));
};
INTRO.finish = function () {
  if (!INTRO.on) return; INTRO.on = false; INTRO.skipAt = performance.now(); INTRO.phase = 'off'; clearTimeout(INTRO._safety);
  window.removeEventListener('keydown', INTRO._input);
  const el = MG.$('intro'), v = MG.$('introV'); el.style.opacity = 0;
  // fade whatever music is left rather than cutting it
  const v0 = v.volume, t0 = performance.now(); const fade = () => { const k = Math.min(1, (performance.now() - t0) / 1300); try { v.volume = v0 * (1 - k); } catch (e) { /* */ } if (k < 1) requestAnimationFrame(fade); }; fade();
  setTimeout(() => { el.style.display = 'none'; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* */ } INTRO.done = true; }, 1450);
  IN.pressed = {}; IN.buf = {};   // swallow the skip key so it does not also press a menu item
};
