/* =====================================================================
   BOSS ART — the jötnar, huge and cel-shaded, after the old hand-drawn style
   (light from the upper left, a bold ink line, two tones and a glow)
   ===================================================================== */
function bcel(path, lit, shade, k, lw = 3.2, ink = '#0c0705') { cel(path, lit, shade, k, ink, lw); }
function grad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
const FL = c => (G.boss && G.boss.flash > 0 ? '#ffffff' : c);

/* ---------------- Þrymr: the frost giant, as tall as a hall ---------------- */
/* ---------------- Níðhöggr: the wyrm under the ice ---------------- */
