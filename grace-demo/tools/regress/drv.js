// In-page driver for the regression suites: window.DRV.until(cond, ms) waits for a condition, DRV.adv(cond, ms) also
// answers the night gate and the choice prompts while it waits, DRV.use(id) starts an interactable in the current room.
// Not a suite itself: tools/regress.js skips it. Suites inject it with ['eval', DRV + '1'].
module.exports = `window.DRV = {
  use: (id) => { const it = SCENE.room.inter.find(i => i.id === id); if (!it) return 'no ' + id; SCENE.use(it); return it.label || id; },
  until: (cond, ms) => new Promise(r => { const t0 = performance.now(); const f = () => { let ok = false; try { ok = cond(); } catch (e) {} if (ok || performance.now() - t0 > (ms || 30000)) r(ok ? 'ok' : 'timeout'); else setTimeout(f, 40); }; f(); }),
  finish: (ms) => new Promise(r => { const t0 = performance.now(); let picks = 0, meters = 0; const f = () => {
      const ask = document.querySelector('#nAsk .btn'); if (ask && !document.getElementById('night').hidden) { ask.click(); picks++; }
      if (document.querySelector('.meter:not(.done)')) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); meters++; }
      SCENE.advance();
      if (SCENE.lock === 0 && !SCENE.bubble) r(JSON.stringify({ lock: 0, picks, meters, secs: Math.round((performance.now() - t0) / 1000) }));
      else if (performance.now() - t0 > (ms || 120000)) r(JSON.stringify({ lock: SCENE.lock, timeout: true, picks, meters }));
      else setTimeout(f, 250); }; setTimeout(f, 400); }) };
window.DRV.adv = (cond, ms) => new Promise(r => { const t0 = performance.now(); const f = () => { let ok = false; try { ok = cond(); } catch (e) {}
  if (ok) return r('ok ' + Math.round((performance.now() - t0) / 1000) + 's'); if (performance.now() - t0 > (ms || 120000)) return r('timeout');
  const ask = document.querySelector('#nAsk .btn'); if (ask && !document.getElementById('night').hidden) ask.click();
  if (!document.getElementById('ageGate').hidden) document.getElementById('ageYes').click();
  SCENE.advance(); setTimeout(f, 250); }; f(); });`;
