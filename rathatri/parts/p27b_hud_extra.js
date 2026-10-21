/* HUD extras — EXPOSURE (heat) meter, ESSENCE gain float, status CHIP, and the phone layout sync (touch unit + thumb-side mirror).
   Loaded after p27_hud.js; HUD.update calls HUD.syncLayout every frame. */
HUD.heatTier = -1;
/* EXPOSURE meter, v = 0..100 (HEAT). Tiers: 0 = 0-24, 1 = 25-49, 2 = 50-74, 3 = 75-89 (pulses red), 4 = 90+ (Kyros cell).
   HUD.heat(null) hides the meter. */
HUD.heat = function (v) {
  const el = HUD.el; if (!el.heat) return;
  if (v == null) { el.heat.classList.remove('on'); return; }
  const x = clamp(+v || 0, 0, 100), t = x >= 90 ? 4 : x >= 75 ? 3 : x >= 50 ? 2 : x >= 25 ? 1 : 0;
  el.heatF.style.width = x.toFixed(1) + '%';
  if (t !== HUD.heatTier) { HUD.heatTier = t; el.heat.setAttribute('data-t', t); el.heatT.textContent = 'T' + t; }
  el.heat.classList.add('on');
};
/* "+N ESSENCE" float beside the health bar (CSS animation, 1.6 s) */
HUD.essence = function (n) {
  const el = HUD.el.essence; if (!el) return;
  el.textContent = '+' + Math.round(+n || 0) + ' ESSENCE';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
};
/* small status chip under the bars: HUD.chip('RAGE', 4000); cls is '', 'rage', 'force' or 'gold'. Empty text hides it. ms is game time. */
HUD.chip = function (text, ms, cls) {
  const el = HUD.el.chip; if (!el) return;
  if (!text) { el.classList.remove('on'); HUD.chipT = 0; return; }
  el.textContent = text; el.className = 'on' + (cls ? ' ' + cls : ''); HUD.chipT = (ms || 2000) / 1000;
};
/* touch unit (so the HUD keeps the same keep-out zones as the thumb layer) and the thumb side (lefty mirrors the HUD) */
HUD.syncLayout = function () {
  if (typeof TOUCH === 'undefined' || !TOUCH.u) return;
  if (HUD.u !== TOUCH.u) { HUD.u = TOUCH.u; document.documentElement.style.setProperty('--tu', TOUCH.u + 'px'); }
  const L = !!(TOUCH.cfg && TOUCH.cfg.lefty);
  if (HUD.lefty !== L) { HUD.lefty = L; document.body.classList.toggle('lefty', L); }
};
