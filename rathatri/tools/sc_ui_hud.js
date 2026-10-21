// UI-A check: exercises the phone HUD on the test arena and reports layout facts.
//   BUILD=/tmp/uia/game.html W=844 H=390 MOBILE=1 NAME=s844 node tools/shot.js tools/sc_ui_hud.js /tmp/uia/out "?play=test_arena&nointro"
// Writes <NAME>_a_plain / _b_live / _c_boss / _d_cine / _e_lefty / _f_essence .jpg and prints one UIREP line per state:
// text-box rectangles, overlaps among HUD boxes, touch-disc / joystick hits, off-screen boxes and the smallest font.
// Cinematic state: the game loop re-derives body.cine every tick (p30_game), so the loop is stopped (H.step has been
// called, MG.manual) before the class is set and the shot is taken with H.wait instead of H.step.
module.exports = async (H) => {
  const name = process.env.NAME || 'hud';
  await H.step(20, 1 / 30);
  const report = async (tag) => {
    const rep = await H.eval(() => {
      const W = innerWidth, Hh = innerHeight, out = { tag: '', W, H: Hh, scrollW: document.documentElement.scrollWidth };
      const TEXT = { objD: 1, toastB: 1, hint: 1, sub: 1, bossN: 1, heatT: 1, essence: 1 };   // measure the text, not the block
      const ids = ['hpBox', 'essence', 'chapT', 'holo', 'chip', 'objD', 'boss', 'heat', 'hint', 'combo', 'prompt', 'toastB', 'sub'];
      const rects = {};
      for (const id of ids) {
        const el = document.getElementById(id); if (!el) continue;
        let n = el, vis = true; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.display === 'none' || +cs.opacity < 0.05) { vis = false; break; } n = n.parentElement; }
        if (!vis || !el.textContent.trim() && id !== 'hpBox' && id !== 'heat' && id !== 'combo') continue;
        let r; if (TEXT[id]) { const rg = document.createRange(); rg.selectNodeContents(el); r = rg.getBoundingClientRect(); } else r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        rects[id] = { x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom) };
      }
      out.rects = rects;
      const zones = [];
      if (typeof TOUCH !== 'undefined' && TOUCH.btns && TOUCH.el && TOUCH.el.classList.contains('on')) for (const b of TOUCH.btns) if (b.vis) zones.push({ n: b.d.n, x: b.x, y: b.y, r: b.r });
      const joy = typeof TOUCH !== 'undefined' && TOUCH.joy ? { n: 'joy', x: TOUCH.joy.hx, y: TOUCH.joy.hy, r: TOUCH.joy.R } : null;
      const hit = (rc, z) => { const cx = clamp(z.x, rc.x0, rc.x1), cy = clamp(z.y, rc.y0, rc.y1); return Math.hypot(cx - z.x, cy - z.y) < z.r; };
      out.thumbHits = [];
      for (const k in rects) { for (const z of zones.concat(joy ? [joy] : [])) if (hit(rects[k], z)) out.thumbHits.push(k + ' x ' + z.n); }
      out.overlaps = [];
      const keys = Object.keys(rects);
      const nested = (x, y) => { const ex = document.getElementById(x), ey = document.getElementById(y); return !!ex && !!ey && (ex.contains(ey) || ey.contains(ex)); };
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        if (nested(keys[i], keys[j])) continue;
        const a = rects[keys[i]], b = rects[keys[j]];
        if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) out.overlaps.push(keys[i] + ' x ' + keys[j]);
      }
      out.offscreen = keys.filter((k) => rects[k].x0 < 0 || rects[k].y0 < 0 || rects[k].x1 > W + 0.5 || rects[k].y1 > Hh + 0.5);
      let minFs = 99, minWhere = '';
      for (const el of document.querySelectorAll('#hud *, #sub, #sub *, #hint, #hint *')) {
        const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
        if (!own) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || +cs.opacity < 0.05) continue;
        const fs = parseFloat(cs.fontSize); if (fs < minFs) { minFs = fs; minWhere = el.id || el.className || el.tagName; }
      }
      out.minFont = minFs + ' (' + minWhere + ')';
      out.touchOn = !!(TOUCH.el && TOUCH.el.classList.contains('on'));
      out.tu = getComputedStyle(document.documentElement).getPropertyValue('--tu');
      return out;
    });
    rep.tag = tag; console.log('UIREP ' + JSON.stringify(rep));
  };
  await H.pshot(name + '_a_plain');
  await report('plain');
  // b: everything live at once
  await H.eval(() => {
    HUD.obj('Defeat the test dummies');
    HUD.hint(IN.keyLabel('attack') + ' strike   ' + IN.keyLabel('dodge') + ' dash   ' + IN.keyLabel('jump') + ' jump', 999);
    HUD.heat(62); HUD.chip('RAGE', 60000, 'rage');
    COMBAT.style.n = 7; COMBAT.style.rank = 2; COMBAT.style.t = 3;
    PLAYER.rage = 100; PLAYER.fp = PLAYER.fpMax * 0.6;
    HUD.toast('DARK SIDE', 'RAGE UNLEASHED', 999);
    HUD.sub('KYROS', 'The Heap remembers every name we bury, and so will you.', 999, '');
  });
  await H.step(6, 1 / 30); await H.wait(900);
  await H.pshot(name + '_b_live');
  await report('live');
  // c: boss bar up (objective collapses under it); the boss toast drops below the column
  await H.eval(() => { HUD.toast('', '', 0.01); HUD.setBoss({ hp: 70, hpMax: 100, guard: 40, guardMax: 100, alive: true, keepBar: true }, 'AIDEN KYROS', 'THE BATTLEMASTER · PHASE II', 'foe'); HUD.heat(81); HUD.sub('', '', 0.01); });
  await H.step(40, 1 / 30);
  await H.eval(() => { HUD.sub('KYROS', 'Then bleed for it.', 999, ''); });
  await H.step(4, 1 / 30); await H.wait(1200);
  await H.pshot(name + '_c_boss');
  await report('boss');
  // d: cinematic (loop stopped first, see header): letterbox, HUD hidden, subtitle widened to 80vw
  await H.eval(() => { HUD.setBoss(null); HUD.heat(null); HUD.hint('', 0); HUD.toast('', '', 0.01); HUD.show(false); document.body.classList.add('cine');
    HUD.sub('MILIAN', 'Pain is a door. Walk through it, or stay on the hinges and be carried through by someone else.', 999, 'sid'); });
  await H.wait(1600);
  await H.pshot(name + '_d_cine');
  await report('cine');
  // e: back to play with the thumb layout mirrored (lefty)
  await H.eval(() => { document.body.classList.remove('cine'); HUD.show(true); HUD.sub('', '', 0.01); HUD.heat(62); HUD.chip('MASKED', 60000, 'force'); TOUCH.setCfg('lefty', true); });
  await H.step(8, 1 / 30); await H.wait(900);
  await H.pshot(name + '_e_lefty');
  await report('lefty');
  // f: essence float, shot 0.35 s after the call (the loop is stopped, so the CSS animation runs on real time)
  await H.eval(() => { TOUCH.setCfg('lefty', false); HUD.essence(12); });
  await H.wait(350);
  await H.pshot(name + '_f_essence');
};
