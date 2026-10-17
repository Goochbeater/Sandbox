/* SPOREHEART — ui.js : mobile-first DOM HUD, touch controls, title, codex, pause, victory
   Built for a Galaxy Z Fold 4 (inner ~1.2:1 screen, narrow cover screen) but fluid for any phone.
   Pure DOM + CSS + inline SVG. Every size is a multiple of --u (= 1% of the short screen edge).

   API (unchanged for the rest of the game)
     G.ui.init(container)  G.ui.show('title'|'hud'|'victory'|'defeat'|'pause'|'codex'|'settings'|'none')
     G.ui.update(dt)       G.ui.setBoss(frac, phase, name)   G.ui.showBoss(bool)
     G.ui.setLock(x, y, visible)   G.ui.prompt(text, dur)    G.ui.banner(title, sub, dur)
     G.ui.letterbox(on)    G.ui.hint(title, body, dur)       G.ui.fade(cb, dur)
     G.ui.pause()/resume() G.ui.setCombo(n)                  G.ui.toast(text)
   Emits: ui:start · ui:quality · ui:pause {paused} · ui:restart · ui:mute {muted}
   Listens: player:damaged · vfx:flash · player:perfectDodge */
(function () {
  "use strict";
  const G = (window.G = window.G || {});
  const U = (G.ui = G.ui || {});

  const C = { cream: "#f2e9d8", ink: "#171a22", orange: "#ff7a33", teal: "#5fb5a0", red: "#e8433a", cyan: "#59d8e8", gold: "#ffd166" };

  const CODEX = [
    { src: "@@IMG:small0@@", name: "Mira", role: "The Spore Witch · You",
      blurb: "Hat too big, scarf too warm, staff watching everything. Mira walks into Morel Hollow with one rule: whatever blocks the road gets broken first." },
    { src: "@@IMG:small3@@", name: "Brood-Crane", role: "Ally · Heavy Barrage",
      blurb: "A heron-skull crown strung with red lanterns. Calls down a volley of spore-fire and never explains where the lanterns came from." },
    { src: "@@IMG:small2@@", name: "Thistle & Hob", role: "Ally · Mend & Strafe",
      blurb: "Braids, ram-horn bobbles and a grumbling cap-ghost on her back. Thistle brews; Hob bites. Together they mend and strafe." },
    { src: "@@IMG:small1@@", name: "The Poppied Veil", role: "Rival Assassin · Three Faces",
      blurb: "Hammerhead helm, red katana, a field of poppies that follows her. She cuts the village in three acts — and the last one has teeth." }
  ];

  /* ---------------- state ---------------- */
  let inited = false, root = null, refs = {}, screen = "none", prevScreen = "title";
  let t = 0, chipHp = -1, vignette = 0, flash = 0, flashPeak = 0.35;
  let bannerT = 0, bannerOn = false, hintT = 0, hintOn = false;
  let bossFrac = 1, bossPhase = 1, bossShown = false;
  let promptQueue = [], promptCur = null;
  let fadeState = null;
  let comboN = 0, comboT = 0, lastBtnLayout = "";
  const btn = Object.create(null);     // action -> {el, sweep, ...}

  /* ---------------- tiny helpers ---------------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
  const pct = (v) => (clamp01(v) * 100).toFixed(2) + "%";
  function mk(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined && html !== null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  const emit = (ev, d) => { try { G.bus.emit(ev, d); } catch (e) { /* ignore */ } };
  const sfx = (n, o) => { try { G.sfx.play(n, o || {}); } catch (e) { /* ignore */ } };
  const colorOf = (c) => (typeof c === "number" ? "#" + ("000000" + (c >>> 0).toString(16)).slice(-6) : c || "#fff");
  const later = (ms, fn) => setTimeout(fn, ms);

  /* ---------------- icons (inline svg, stroke style) ---------------- */
  const IC = {
    attack: '<svg viewBox="0 0 48 48"><path d="M14 40 L34 8" /><path d="M30 6 l6 2 -2 6" /><circle cx="14" cy="40" r="3"/><path d="M22 28 l8 6"/></svg>',
    jump: '<svg viewBox="0 0 48 48"><path d="M12 28 L24 14 L36 28"/><path d="M12 38 L24 24 L36 38"/></svg>',
    dash: '<svg viewBox="0 0 48 48"><path d="M8 16 L20 24 L8 32"/><path d="M22 14 L36 24 L22 34"/><path d="M40 18 v12"/></svg>',
    magic: '<svg viewBox="0 0 48 48"><path d="M24 6 L28 20 L42 24 L28 28 L24 42 L20 28 L6 24 L20 20 Z"/></svg>',
    hook: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9"/><path d="M24 4 v9 M24 35 v9 M4 24 h9 M35 24 h9"/><circle cx="24" cy="24" r="2.5"/></svg>',
    lock: '<svg viewBox="0 0 48 48"><path d="M10 18 v-8 h8 M30 10 h8 v8 M38 30 v8 h-8 M18 38 h-8 v-8"/><circle cx="24" cy="24" r="4"/></svg>',
    pause: '<svg viewBox="0 0 48 48"><path d="M17 12 v24 M31 12 v24"/></svg>'
  };

  /* ================================================================
     STYLES
     ================================================================ */
  const CSS = `
  .sh-root,.sh-root *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
  .sh-root{--u:6px;--cream:#f2e9d8;--ink:#171a22;--orange:#ff7a33;--teal:#5fb5a0;--red:#e8433a;--cyan:#59d8e8;--gold:#ffd166;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;
    --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --sl:env(safe-area-inset-left,0px);--sr:env(safe-area-inset-right,0px);--st:env(safe-area-inset-top,0px);--sb:env(safe-area-inset-bottom,0px);
    position:fixed;inset:0;z-index:50;pointer-events:none;color:var(--cream);font-family:var(--serif);
    -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}
  .sh-root button{font-family:inherit}
  .sh-screen{position:absolute;inset:0;display:none}
  .sh-pad{position:absolute;inset:0;pointer-events:auto;touch-action:none}

  /* ---------- buttons (menus) ---------- */
  .sh-btn{position:relative;pointer-events:auto;cursor:pointer;padding:calc(var(--u)*2.1) calc(var(--u)*5);min-width:calc(var(--u)*26);
    font-size:calc(var(--u)*2.5);letter-spacing:.2em;text-transform:uppercase;color:var(--cream);text-shadow:0 1px 0 rgba(0,0,0,.5);
    background:linear-gradient(180deg,rgba(242,233,216,.12),rgba(23,26,34,.5)),radial-gradient(120% 180% at 50% 0%,rgba(95,181,160,.2),transparent 70%);
    border:1.5px solid rgba(242,233,216,.5);border-radius:15px 5px 17px 6px/6px 16px 5px 15px;
    box-shadow:inset 0 0 22px rgba(0,0,0,.32),0 6px 18px rgba(0,0,0,.28);appearance:none;-webkit-appearance:none;touch-action:manipulation;
    transition:transform .15s,box-shadow .2s,border-color .2s}
  .sh-btn:active{transform:scale(.97);border-color:rgba(255,122,51,.95);box-shadow:inset 0 0 26px rgba(255,122,51,.2),0 0 26px rgba(255,122,51,.35)}
  .sh-btn.primary{border-color:rgba(255,179,71,.9);color:#fff6e6;background:linear-gradient(180deg,rgba(255,150,60,.34),rgba(60,25,10,.55))}
  .sh-btn.small{min-width:0;padding:calc(var(--u)*1.5) calc(var(--u)*3);font-size:calc(var(--u)*2.1)}

  /* ---------- TITLE ---------- */
  .sh-title{flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:auto;
    background:radial-gradient(110% 90% at 50% 8%,rgba(95,181,160,.16),transparent 58%),radial-gradient(90% 80% at 50% 112%,rgba(255,122,51,.24),transparent 62%),
    linear-gradient(180deg,rgba(10,15,13,.55),rgba(10,15,13,.82) 70%,rgba(8,11,10,.94))}
  .sh-title .kick{font-family:var(--sans);font-size:calc(var(--u)*1.6);letter-spacing:.5em;text-transform:uppercase;color:rgba(242,233,216,.5)}
  .sh-logo{font-size:calc(var(--u)*17);line-height:.95;letter-spacing:.06em;font-weight:400;margin:calc(var(--u)*1.2) 0;
    background:linear-gradient(180deg,#fffaf0 0%,#f2e9d8 34%,#ffcf87 62%,#ff7a33 96%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;
    filter:drop-shadow(0 3px 0 rgba(12,15,14,.45)) drop-shadow(0 10px 34px rgba(255,122,51,.32))}
  .sh-sub{font-style:italic;font-size:calc(var(--u)*2.6);letter-spacing:.26em;color:rgba(242,233,216,.8)}
  .sh-menu{display:flex;gap:calc(var(--u)*2.4);flex-wrap:wrap;justify-content:center;margin-top:calc(var(--u)*5)}
  .sh-cast{display:flex;gap:calc(var(--u)*2.4);margin-top:calc(var(--u)*5);justify-content:center}
  .sh-cast figure{margin:0;text-align:center;font-size:calc(var(--u)*1.5);letter-spacing:.18em;text-transform:uppercase;color:rgba(242,233,216,.55);font-family:var(--sans)}
  .sh-cast img{display:block;width:calc(var(--u)*10);height:calc(var(--u)*10);border-radius:50%;object-fit:cover;border:1.5px solid rgba(242,233,216,.45);box-shadow:0 4px 14px rgba(0,0,0,.5);margin:0 auto calc(var(--u)*.8)}
  .sh-credit{position:absolute;bottom:calc(var(--u)*2 + var(--sb));left:0;right:0;font-family:var(--sans);font-size:calc(var(--u)*1.4);letter-spacing:.34em;text-transform:uppercase;color:rgba(242,233,216,.34)}

  /* ---------- generic panel screens ---------- */
  .sh-panelscr{align-items:center;justify-content:center;flex-direction:column;pointer-events:auto;background:rgba(7,11,10,.74);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px)}
  .sh-card{width:min(calc(var(--u)*78),92vw);max-height:92vh;overflow:auto;padding:calc(var(--u)*3.4);
    background:linear-gradient(180deg,rgba(18,26,23,.92),rgba(10,15,13,.96));border:1.5px solid rgba(242,233,216,.3);
    border-radius:18px 6px 20px 7px/7px 19px 6px 18px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .sh-card h2{margin:0 0 calc(var(--u)*2);font-weight:400;font-size:calc(var(--u)*4);letter-spacing:.18em;text-transform:uppercase;text-align:center}
  .sh-col{display:flex;flex-direction:column;gap:calc(var(--u)*1.8);align-items:stretch}
  .sh-col .sh-btn{text-align:center}
  .sh-row{display:flex;align-items:center;justify-content:space-between;gap:calc(var(--u)*2);padding:calc(var(--u)*1.1) 0;font-size:calc(var(--u)*2.2);letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid rgba(242,233,216,.1)}
  .sh-row input[type=range]{width:calc(var(--u)*26);accent-color:var(--orange);height:calc(var(--u)*3)}
  .sh-tog{min-width:calc(var(--u)*13);padding:calc(var(--u)*1.1) calc(var(--u)*2)!important;font-size:calc(var(--u)*2)!important}
  .sh-stat{display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--u)*1.2) calc(var(--u)*3);margin:calc(var(--u)*2) 0;font-family:var(--sans);font-size:calc(var(--u)*2);letter-spacing:.18em;text-transform:uppercase;color:rgba(242,233,216,.6)}
  .sh-stat b{color:var(--cream);font-weight:600;float:right}

  /* codex */
  .sh-codex{align-items:stretch;padding:calc(var(--u)*3);overflow:auto;pointer-events:auto;background:linear-gradient(180deg,rgba(8,12,11,.95),rgba(14,22,19,.98))}
  .sh-codex h2{margin:0;text-align:left}
  .sh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(calc(var(--u)*30),1fr));gap:calc(var(--u)*2.4);margin:calc(var(--u)*2.4) 0;max-width:calc(var(--u)*170);align-self:center;width:100%}
  .sh-cx{background:linear-gradient(180deg,rgba(242,233,216,.07),rgba(23,26,34,.55));border:1px solid rgba(242,233,216,.26);border-radius:7px 18px 9px 15px/15px 8px 18px 7px;padding:calc(var(--u)*1) calc(var(--u)*1) calc(var(--u)*2);margin:0}
  .sh-cx img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:4px 13px 6px 11px;background:#0c110f}
  .sh-cx .nm{margin:calc(var(--u)*1.4) calc(var(--u)*1) 0;font-size:calc(var(--u)*2.6);letter-spacing:.06em}
  .sh-cx .rl{margin:calc(var(--u)*.7) calc(var(--u)*1) 0;font-family:var(--sans);font-size:calc(var(--u)*1.4);letter-spacing:.22em;text-transform:uppercase;color:var(--orange)}
  .sh-cx .bl{margin:calc(var(--u)*1) calc(var(--u)*1) 0;font-size:calc(var(--u)*1.9);line-height:1.45;font-style:italic;color:rgba(242,233,216,.6)}

  /* ---------- HUD ---------- */
  .sh-hud .sh-ctl{transition:opacity .35s,transform .35s}
  .sh-hud.cine .sh-ctl,.sh-hud.cine .sh-pad{opacity:0;pointer-events:none}
  .sh-hud.dim{filter:brightness(.5)}
  .sh-vitals{position:absolute;left:calc(var(--u)*2 + var(--sl));top:calc(var(--u)*2 + var(--st));display:flex;align-items:center;gap:calc(var(--u)*1.4)}
  .sh-face{position:relative;width:calc(var(--u)*11);height:calc(var(--u)*11);border-radius:50%;flex:none;
    background:#10201c center/cover no-repeat;border:calc(var(--u)*.45) solid var(--cream);box-shadow:0 0 0 calc(var(--u)*.45) rgba(10,14,13,.8),0 6px 16px rgba(0,0,0,.5)}
  .sh-face::after{content:"";position:absolute;inset:-6%;border-radius:50%;background:conic-gradient(from 0deg,var(--gold) calc(var(--surge,0)*1%),transparent 0);
    -webkit-mask:radial-gradient(circle,transparent 62%,#000 64%);mask:radial-gradient(circle,transparent 62%,#000 64%);opacity:.9}
  .sh-bars{display:flex;flex-direction:column;gap:calc(var(--u)*.9)}
  .sh-bar{position:relative;height:calc(var(--u)*2.3);width:calc(var(--u)*34);background:rgba(10,14,13,.7);border:1px solid rgba(242,233,216,.4);overflow:hidden;
    transform:skewX(-14deg);border-radius:4px;box-shadow:0 3px 10px rgba(0,0,0,.4)}
  .sh-bar i{position:absolute;left:0;top:0;bottom:0;display:block}
  .sh-bar .ghost{background:linear-gradient(90deg,#e8433a,#ff7a33);width:100%}
  .sh-bar .fill{background:linear-gradient(180deg,#fffaf0,#f2e9d8 45%,#d9c9a8);width:100%;transition:width .08s linear}
  .sh-bar.mana{height:calc(var(--u)*1.3);width:calc(var(--u)*26)}
  .sh-bar.mana .fill{background:linear-gradient(180deg,#d7f8ff,#59d8e8 55%,#3aa5bb)}
  .sh-bar.low .fill{background:linear-gradient(180deg,#ffd9c9,#e8433a 70%,#a92a24)}
  .sh-pips{display:flex;gap:calc(var(--u)*.9);padding-left:calc(var(--u)*1)}
  .sh-pip{width:calc(var(--u)*3.4);height:calc(var(--u)*1);transform:skewX(-14deg);background:rgba(242,233,216,.14);border:1px solid rgba(242,233,216,.35);overflow:hidden}
  .sh-pip i{display:block;height:100%;width:0;background:linear-gradient(90deg,#bff3ff,#59d8e8)}
  .sh-combo{position:absolute;left:calc(var(--u)*2 + var(--sl));top:calc(var(--u)*17 + var(--st));font-size:calc(var(--u)*3.4);font-style:italic;color:var(--gold);opacity:0;text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 16px rgba(255,170,60,.6);transition:opacity .2s;letter-spacing:.08em}
  .sh-combo small{display:block;font-family:var(--sans);font-style:normal;font-size:calc(var(--u)*1.3);letter-spacing:.4em;color:rgba(242,233,216,.7)}

  .sh-boss{position:absolute;left:50%;top:calc(var(--u)*2.2 + var(--st));width:min(calc(var(--u)*64),56vw);transform:translateX(-50%);opacity:0;transition:opacity .5s;text-align:center}
  .sh-boss.on{opacity:1}
  .sh-boss .nm{font-size:calc(var(--u)*2.5);letter-spacing:.3em;text-transform:uppercase;text-shadow:0 2px 6px rgba(0,0,0,.7)}
  .sh-boss .ph{font-family:var(--sans);font-size:calc(var(--u)*1.4);letter-spacing:.4em;color:var(--orange);margin-bottom:calc(var(--u)*.6)}
  .sh-boss .bar{position:relative;height:calc(var(--u)*1.7);border:1px solid rgba(242,233,216,.55);background:rgba(10,14,13,.75);border-radius:3px;overflow:hidden;margin-top:calc(var(--u)*.7);box-shadow:0 4px 14px rgba(0,0,0,.5)}
  .sh-boss .bar i{position:absolute;left:0;top:0;bottom:0;display:block}
  .sh-boss .ghost{background:#ff7a33;width:100%;transition:width .5s .25s}
  .sh-boss .fill{background:linear-gradient(180deg,#ff9a8c,#e8433a 60%,#8d1d27);width:100%;transition:width .12s}
  .sh-boss .notch{position:absolute;top:0;bottom:0;width:2px;background:rgba(10,14,13,.9)}

  .sh-lock{position:absolute;width:calc(var(--u)*8);height:calc(var(--u)*8);margin:calc(var(--u)*-4) 0 0 calc(var(--u)*-4);display:none;pointer-events:none}
  .sh-lock svg{width:100%;height:100%;fill:none;stroke:var(--orange);stroke-width:2.5;stroke-linecap:round;filter:drop-shadow(0 0 6px rgba(255,122,51,.8));animation:shSpin 6s linear infinite}
  @keyframes shSpin{to{transform:rotate(360deg)}}

  /* touch controls */
  .sh-stickbase{position:absolute;left:0;top:0;width:calc(var(--u)*24);height:calc(var(--u)*24);margin:calc(var(--u)*-12) 0 0 calc(var(--u)*-12);border-radius:50%;
    border:2px solid rgba(242,233,216,.35);background:radial-gradient(circle,rgba(242,233,216,.06),rgba(242,233,216,.16));opacity:0;transition:opacity .15s;pointer-events:none}
  .sh-stickknob{position:absolute;left:0;top:0;width:calc(var(--u)*10);height:calc(var(--u)*10);margin:calc(var(--u)*-5) 0 0 calc(var(--u)*-5);border-radius:50%;
    background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.55),rgba(242,233,216,.28));border:2px solid rgba(255,255,255,.55);opacity:0;pointer-events:none}
  .sh-stickhint{position:absolute;left:calc(var(--u)*17 + var(--sl));bottom:calc(var(--u)*17 + var(--sb));width:calc(var(--u)*22);height:calc(var(--u)*22);margin:calc(var(--u)*-11) 0 0 calc(var(--u)*-11);
    border-radius:50%;border:2px dashed rgba(242,233,216,.22);pointer-events:none;transition:opacity .3s}
  .sh-cluster{position:absolute;right:calc(var(--u)*16 + var(--sr));bottom:calc(var(--u)*19.5 + var(--sb));width:0;height:0;pointer-events:none}
  .sh-b{position:absolute;pointer-events:auto;border-radius:50%;touch-action:none;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 38% 30%,rgba(255,255,255,.2),rgba(14,22,20,.72) 68%);border:calc(var(--u)*.4) solid var(--c,#f2e9d8);
    box-shadow:0 5px 16px rgba(0,0,0,.5),inset 0 0 calc(var(--u)*2) rgba(0,0,0,.5),0 0 calc(var(--u)*1.2) color-mix(in srgb,var(--c) 40%,transparent);
    transition:transform .07s,filter .12s}
  .sh-b svg{width:56%;height:56%;fill:none;stroke:var(--c,#f2e9d8);stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;filter:drop-shadow(0 1px 0 rgba(0,0,0,.6))}
  .sh-b.down{transform:scale(.9);filter:brightness(1.5)}
  .sh-b .lbl{position:absolute;bottom:calc(var(--u)*-2.1);left:50%;transform:translateX(-50%);font-family:var(--sans);font-size:calc(var(--u)*1.3);letter-spacing:.16em;text-transform:uppercase;color:rgba(242,233,216,.75);text-shadow:0 1px 3px #000;pointer-events:none;white-space:nowrap}
  .sh-b .sweep{position:absolute;inset:0;border-radius:50%;pointer-events:none;background:conic-gradient(rgba(6,10,9,.82) var(--cd,0deg),transparent 0)}
  .sh-b.ally{background:#0e1614 var(--face) center/cover no-repeat}
  .sh-b.ally .sweep{background:conic-gradient(rgba(6,10,9,.85) var(--cd,0deg),rgba(0,0,0,0) 0)}
  .sh-b.ready.ally{animation:shReady 1.6s ease-in-out infinite}
  @keyframes shReady{0%,100%{box-shadow:0 5px 16px rgba(0,0,0,.5),0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 5px 16px rgba(0,0,0,.5),0 0 calc(var(--u)*3) var(--c)}}
  .sh-b.dead{filter:grayscale(1) brightness(.6)}
  .sh-b.pulse{animation:shPulse .35s ease-out}
  @keyframes shPulse{0%{transform:scale(1.2)}100%{transform:scale(1)}}
  .sh-b.hot{--c:#ffd166;filter:brightness(1.4)}

  .sh-pause{position:absolute;right:calc(var(--u)*2 + var(--sr));top:calc(var(--u)*2 + var(--st));width:calc(var(--u)*7);height:calc(var(--u)*7);pointer-events:auto}

  /* overlays */
  .sh-vig{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 38%,rgba(210,40,40,.55) 100%)}
  .sh-low{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 42%,rgba(160,20,30,.7) 100%)}
  .sh-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:#fff}
  .sh-fade{position:absolute;inset:0;pointer-events:none;opacity:0;background:#05080a}
  .sh-lb{position:absolute;left:0;right:0;height:0;background:#000;transition:height .5s cubic-bezier(.2,.8,.2,1)}
  .sh-lb.on{height:11vh}
  .sh-banner{position:absolute;left:0;right:0;top:36%;text-align:center;opacity:0;pointer-events:none;transition:opacity .5s,transform .8s cubic-bezier(.2,.8,.2,1);transform:translateY(10px) scale(.98)}
  .sh-banner.on{opacity:1;transform:none}
  .sh-banner .tt{font-size:calc(var(--u)*8);letter-spacing:.22em;text-transform:uppercase;text-shadow:0 4px 0 rgba(0,0,0,.4),0 0 40px rgba(255,122,51,.35)}
  .sh-banner .ss{margin-top:calc(var(--u)*1.2);font-size:calc(var(--u)*2.3);font-style:italic;letter-spacing:.3em;color:var(--orange);text-transform:uppercase}
  .sh-prompt{position:absolute;left:0;right:0;bottom:calc(var(--u)*30);text-align:center;font-size:calc(var(--u)*2.7);font-style:italic;letter-spacing:.08em;text-shadow:0 2px 8px #000,0 0 3px #000;opacity:0;transition:opacity .4s;padding:0 12vw}
  .sh-prompt.on{opacity:1}
  .sh-hint{position:absolute;left:50%;top:calc(var(--u)*20);transform:translateX(-50%) translateY(-8px);width:min(calc(var(--u)*60),80vw);padding:calc(var(--u)*1.8) calc(var(--u)*2.6);text-align:center;opacity:0;transition:opacity .4s,transform .4s;
    background:linear-gradient(180deg,rgba(14,22,20,.88),rgba(8,12,11,.92));border:1px solid rgba(242,233,216,.35);border-radius:12px 4px 14px 5px/5px 12px 4px 12px}
  .sh-hint.on{opacity:1;transform:translateX(-50%)}
  .sh-hint .h1{font-family:var(--sans);font-size:calc(var(--u)*1.5);letter-spacing:.4em;text-transform:uppercase;color:var(--orange)}
  .sh-hint .h2{margin-top:calc(var(--u)*.8);font-size:calc(var(--u)*2.2);line-height:1.4}
  .sh-toast{position:absolute;left:50%;top:calc(var(--u)*13 + var(--st));transform:translateX(-50%);font-family:var(--sans);font-size:calc(var(--u)*1.9);letter-spacing:.3em;text-transform:uppercase;color:var(--gold);text-shadow:0 2px 6px #000;opacity:0;transition:opacity .25s}
  .sh-toast.on{opacity:1}
  .sh-rot{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(5,8,7,.9);font-size:calc(var(--u)*3);letter-spacing:.2em;text-align:center;pointer-events:none}
  @media (max-aspect-ratio: 3/4){ .sh-hud-note{display:block} }
  `;

  /* ================================================================
     BUILDERS
     ================================================================ */
  function screenEl(name, cls) {
    const el = mk("div", "sh-screen sh-" + name + (cls ? " " + cls : ""), root);
    refs[name] = el;
    return el;
  }
  function button(label, cls, parent, fn) {
    const b = mk("button", "sh-btn " + (cls || ""), parent, label);
    b.addEventListener("click", (e) => { e.stopPropagation(); sfx("uiClick"); fn(e); });
    return b;
  }

  function buildTitle() {
    const el = screenEl("title");
    mk("div", "kick", el, "a spore-puppet tale");
    mk("div", "sh-logo", el, "SPOREHEART");
    mk("div", "sh-sub", el, "Witch of Morel Hollow");
    const menu = mk("div", "sh-menu", el);
    button("Begin", "primary", menu, startGame);
    button("Codex", "", menu, () => { prevScreen = "title"; U.show("codex"); });
    button("Settings", "", menu, () => { prevScreen = "title"; U.show("settings"); });
    const cast = mk("div", "sh-cast", el);
    [["mage", "Mira"], ["skull", "Brood-Crane"], ["poncho", "Thistle"], ["katana", "The Veil"]].forEach((c) => {
      const f = mk("figure", "", cast);
      const im = mk("img", "", f); im.src = FACES[c[0]]; im.alt = c[1];
      mk("div", "", f, c[1]);
    });
    mk("div", "sh-credit", el, "touch only · best played landscape");
  }

  function buildCodex() {
    const el = screenEl("codex", "sh-codex");
    const head = mk("div", "", el);
    mk("h2", "", head, "Codex");
    const grid = mk("div", "sh-grid", el);
    CODEX.forEach((c) => {
      const f = mk("figure", "sh-cx", grid);
      const im = mk("img", "", f); im.src = c.src; im.alt = c.name;
      mk("div", "nm", f, c.name); mk("div", "rl", f, c.role); mk("div", "bl", f, c.blurb);
    });
    button("Back", "small", el, () => U.show(prevScreen)).style.alignSelf = "center";
  }

  function toggleRow(parent, label, get, set) {
    const row = mk("div", "sh-row", parent, "<span>" + label + "</span>");
    const b = button("", "small sh-tog", row, () => { set(!get()); refresh(); });
    const refresh = () => { b.textContent = get() ? "On" : "Off"; };
    refresh();
    return row;
  }
  function buildSettings() {
    const el = screenEl("settings", "sh-panelscr");
    const card = mk("div", "sh-card", el);
    mk("h2", "", card, "Settings");
    const col = mk("div", "", card);
    toggleRow(col, "Haptics", () => G.settings.haptics, (v) => { G.settings.haptics = v; G.saveSettings(); if (v) G.input.haptic(30); });
    toggleRow(col, "Invert camera Y", () => G.settings.invertY, (v) => { G.settings.invertY = v; G.saveSettings(); });
    toggleRow(col, "Sound", () => !(G.sfx && G.sfx.isMuted && G.sfx.isMuted()), () => { emit("ui:mute", {}); });
    const q = mk("div", "sh-row", col, "<span>Graphics</span>");
    const qb = button("", "small sh-tog", q, () => {
      const order = ["auto", "high", "low"];
      G.settings.quality = order[(order.indexOf(G.settings.quality) + 1) % 3];
      G.saveSettings(); emit("ui:quality", { q: G.settings.quality }); qb.textContent = G.settings.quality;
    });
    qb.textContent = G.settings.quality;
    const s = mk("div", "sh-row", col, "<span>Camera speed</span>");
    const rg = mk("input", "", s); rg.type = "range"; rg.min = "0.5"; rg.max = "2"; rg.step = "0.05"; rg.value = String(G.settings.lookSens);
    rg.addEventListener("input", () => { G.settings.lookSens = +rg.value; G.saveSettings(); });
    rg.style.touchAction = "pan-x"; rg.style.pointerEvents = "auto";
    const back = mk("div", "sh-col", card); back.style.marginTop = "calc(var(--u)*2.4)";
    button("Back", "", back, () => U.show(prevScreen));
  }

  function buildPause() {
    const el = screenEl("pause", "sh-panelscr");
    const card = mk("div", "sh-card", el);
    mk("h2", "", card, "Paused");
    const col = mk("div", "sh-col", card);
    button("Resume", "primary", col, () => U.resume());
    button("Codex", "", col, () => { prevScreen = "pause"; U.show("codex"); });
    button("Settings", "", col, () => { prevScreen = "pause"; U.show("settings"); });
    button("Restart", "", col, () => emit("ui:restart", {}));
  }

  function buildEnd() {
    const el = screenEl("victory", "sh-panelscr");
    const card = mk("div", "sh-card", el);
    refs.endTitle = mk("h2", "", card, "The hollow breathes");
    refs.endSub = mk("div", "", card, "");
    refs.endSub.style.cssText = "text-align:center;font-style:italic;color:rgba(242,233,216,.7);font-size:calc(var(--u)*2.3)";
    const st = mk("div", "sh-stat", card);
    refs.vTime = mk("div", "", st, "Time <b>0:00</b>");
    refs.vKills = mk("div", "", st, "Foes <b>0</b>");
    refs.vBreaks = mk("div", "", st, "Smashed <b>0</b>");
    refs.vCombo = mk("div", "", st, "Best chain <b>0</b>");
    const col = mk("div", "sh-col", card);
    button("Play again", "primary", col, () => emit("ui:restart", {}));
  }

  function buildHud() {
    const el = screenEl("hud", "sh-hud");
    /* camera + stick pad (behind buttons) */
    const pad = mk("div", "sh-pad", el); refs.pad = pad;
    G.core.attachPad(pad);
    refs.stickHint = mk("div", "sh-stickhint", el);
    refs.stickBase = mk("div", "sh-stickbase", el);
    refs.stickKnob = mk("div", "sh-stickknob", el);

    /* vitals */
    const v = mk("div", "sh-vitals sh-ctl", el);
    refs.face = mk("div", "sh-face", v);
    refs.face.style.backgroundImage = "url(" + FACES.mage + ")";
    const bars = mk("div", "sh-bars", v);
    const hp = mk("div", "sh-bar", bars); refs.hpBar = hp;
    refs.hpGhost = mk("i", "ghost", hp); refs.hpFill = mk("i", "fill", hp);
    const mp = mk("div", "sh-bar mana", bars);
    refs.manaFill = mk("i", "fill", mp);
    refs.pipsBox = mk("div", "sh-pips", bars); refs.pips = [];
    refs.combo = mk("div", "sh-combo", el, '0<small>CHAIN</small>');

    /* boss bar */
    const boss = mk("div", "sh-boss", el); refs.boss = boss;
    refs.bossName = mk("div", "nm", boss, "");
    refs.bossPh = mk("div", "ph", boss, "");
    const bb = mk("div", "bar", boss);
    refs.bossGhost = mk("i", "ghost", bb); refs.bossFill = mk("i", "fill", bb);
    /* phase boundaries (remaining-HP fractions): form I ends at 74%, form II at 41% */
    mk("div", "notch", bb).style.left = "40.7%"; mk("div", "notch", bb).style.left = "74.1%";

    /* lock reticle */
    refs.lock = mk("div", "sh-lock", el,
      '<svg viewBox="0 0 48 48"><path d="M6 16 V6 H16 M32 6 H42 V16 M42 32 V42 H32 M16 42 H6 V32"/><circle cx="24" cy="24" r="3" fill="#ff7a33"/></svg>');

    /* action buttons */
    const cl = mk("div", "sh-cluster sh-ctl", el); refs.cluster = cl;
    const defs = [
      // act, label, icon, color, x, y, r  (units from anchor = attack centre; +x right, +y down)
      ["attack", "Strike", "attack", "#ff9a52", 0, 0, 8.4],
      ["dash", "Dash", "dash", "#5fe0d0", -15.2, 2.2, 5.8],
      ["jump", "Jump", "jump", "#f2e9d8", -12.9, -10.8, 6.2],
      ["magic", "Spell", "magic", "#7fe3ff", -2.8, -16.2, 6.0],
      ["hook", "Warp", "hook", "#ffd166", 10.4, -14.0, 5.2]
    ];
    defs.forEach((d) => makeBtn(cl, d));
    /* ally call-ins */
    makeBtn(cl, ["allyA", "", "", "#ff7a8c", -11.5, -26.0, 5.0], FACES.skull);
    makeBtn(cl, ["allyB", "", "", "#8effc0", 2.5, -29.5, 5.0], FACES.poncho);
    /* lock button: top-right under pause (rarely needed, so it can live out of the thumb's way) */
    const lk = makeBtn(el, ["lock", "Lock", "lock", "#ff7a33", 0, 0, 4.2]);
    lk.style.cssText = "--c:#ff7a33;width:calc(var(--u)*8.4);height:calc(var(--u)*8.4);right:calc(var(--u)*2.4 + var(--sr));top:calc(var(--u)*11 + var(--st));left:auto;position:absolute";
    /* pause */
    const pb = mk("div", "sh-b sh-pause sh-ctl", el, IC.pause);
    pb.style.setProperty("--c", "#f2e9d8");
    bindBtn(pb, "pause");
    btn.pause = { el: pb };
    refs.pauseBtn = pb;

    refs.toast = mk("div", "sh-toast", el, "");
  }

  function makeBtn(parent, d, face) {
    const [act, label, icon, col, x, y, r] = d;
    const b = mk("div", "sh-b" + (face ? " ally" : ""), parent, face ? "" : IC[icon]);
    b.dataset.act = act;
    b.style.cssText = "--c:" + col + ";width:calc(var(--u)*" + (r * 2) + ");height:calc(var(--u)*" + (r * 2) + ");left:calc(var(--u)*" + (x - r) + ");top:calc(var(--u)*" + (y - r) + ")";
    if (face) b.style.setProperty("--face", "url(" + face + ")");
    if (label) mk("div", "lbl", b, label);
    const sweep = mk("div", "sweep", b);
    bindBtn(b, act);
    btn[act] = { el: b, sweep: sweep, ready: true };
    return b;
  }

  function bindBtn(el, act) {
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      el.classList.add("down");
      if (act === "pause") { U.pause(); G.input.haptic(8); return; }
      G.input.press(act);
      G.input.haptic(act === "attack" ? 6 : 10);
    });
    const up = (e) => {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove("down");
      if (act !== "pause") G.input.release(act);
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", () => { el.classList.remove("down"); if (act !== "pause") G.input.release(act); });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function buildOverlays() {
    refs.vig = mk("div", "sh-vig", root);
    refs.lowhp = mk("div", "sh-low", root);
    refs.flash = mk("div", "sh-flash", root);
    refs.lbTop = mk("div", "sh-lb", root); refs.lbTop.style.top = "0";
    refs.lbBot = mk("div", "sh-lb", root); refs.lbBot.style.bottom = "0";
    refs.banner = mk("div", "sh-banner", root);
    refs.bannerT = mk("div", "tt", refs.banner); refs.bannerS = mk("div", "ss", refs.banner);
    refs.prompt = mk("div", "sh-prompt", root);
    refs.hint = mk("div", "sh-hint", root);
    refs.hintT = mk("div", "h1", refs.hint); refs.hintB = mk("div", "h2", refs.hint);
    refs.fade = mk("div", "sh-fade", root);
  }

  /* ================================================================
     FACES (portrait data-URIs, inlined by tools/build.mjs)
     ================================================================ */
  const FACES = {
    mage: "@@IMG:face_mage@@", katana: "@@IMG:face_katana@@", poncho: "@@IMG:face_poncho@@", skull: "@@IMG:face_skull@@"
  };

  /* ================================================================
     SCREENS
     ================================================================ */
  const SCREENS = ["title", "hud", "victory", "pause", "codex", "settings"];
  U.show = function (name) {
    if (name === "defeat") name = "victory";
    screen = SCREENS.indexOf(name) >= 0 ? name : "none";
    U.screen = screen;
    for (const s of SCREENS) if (refs[s]) refs[s].style.display = s === screen ? "flex" : "none";
    /* the HUD stays mounted (dimmed) behind the pause card */
    if (refs.hud) {
      const showHud = screen === "hud" || screen === "pause";
      refs.hud.style.display = showHud ? "flex" : "none";
      refs.hud.classList.toggle("dim", screen === "pause");
    }
    if (screen === "victory") refreshEnd();
  };
  function startGame() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    } catch (e) { /* ignore */ }
    emit("ui:start", {});
  }
  U.pause = function () {
    if (screen !== "hud") return;
    U.show("pause"); G.input.setEnabled(false);
    emit("ui:pause", { paused: true });
  };
  U.resume = function () {
    U.show("hud"); G.input.setEnabled(true);
    emit("ui:pause", { paused: false });
  };
  U.togglePause = function () { if (screen === "pause") U.resume(); else U.pause(); };
  U.openCodex = function () { prevScreen = "title"; U.show("codex"); };

  function refreshEnd() {
    const st = G.stats || {};
    const set = (el, label, v) => { if (el) el.innerHTML = label + " <b>" + v + "</b>"; };
    set(refs.vTime, "Time", G.util.fmtTime(num(st.playTime, 0)));
    set(refs.vKills, "Foes", Math.round(num(st.kills, 0)));
    set(refs.vBreaks, "Smashed", Math.round(num(st.breaks, 0)));
    set(refs.vCombo, "Best chain", Math.round(num(st.bestCombo, 0)));
  }
  U.setEnd = function (title, sub) { if (refs.endTitle) refs.endTitle.textContent = title; if (refs.endSub) refs.endSub.textContent = sub || ""; };

  /* ================================================================
     BOSS / LOCK / PROMPTS
     ================================================================ */
  U.setBoss = function (frac, phase, name) {
    bossFrac = clamp01(num(frac, 1)); bossPhase = clamp(Math.round(num(phase, 1)), 1, 3);
    refs.bossFill.style.width = pct(bossFrac); refs.bossGhost.style.width = pct(bossFrac);
    if (name) refs.bossName.textContent = name;
    refs.bossPh.textContent = ["I", "II", "III"].map((r, i) => (i + 1 === bossPhase ? "◆ " + r : "◇ " + r)).join("   ");
  };
  U.showBoss = function (v) { bossShown = !!v; refs.boss.classList.toggle("on", bossShown); };
  U.setLock = function (x, y, v) {
    const l = refs.lock; if (!l) return;
    if (!v) { l.style.display = "none"; return; }
    l.style.display = "block"; l.style.left = x.toFixed(1) + "px"; l.style.top = y.toFixed(1) + "px";
  };
  U.prompt = function (text, dur) { promptQueue.push({ text, dur: dur || 3 }); if (!promptCur) nextPrompt(); };
  function nextPrompt() {
    promptCur = promptQueue.shift() || null;
    if (!promptCur) { refs.prompt.classList.remove("on"); return; }
    refs.prompt.textContent = promptCur.text; refs.prompt.classList.add("on"); promptCur.t = promptCur.dur;
  }
  U.clearPrompts = function () { promptQueue.length = 0; promptCur = null; refs.prompt.classList.remove("on"); };
  U.banner = function (title, sub, dur) {
    refs.bannerT.textContent = title; refs.bannerS.textContent = sub || "";
    refs.banner.classList.add("on"); bannerOn = true; bannerT = dur || 3;
  };
  U.hideBanner = function () { refs.banner.classList.remove("on"); bannerOn = false; };
  U.letterbox = function (v) {
    refs.lbTop.classList.toggle("on", !!v); refs.lbBot.classList.toggle("on", !!v);
    if (refs.hud) refs.hud.classList.toggle("cine", !!v);
  };
  U.hint = function (title, body, dur) {
    refs.hintT.textContent = title; refs.hintB.textContent = body;
    refs.hint.classList.add("on"); hintOn = true; hintT = dur || 5;
  };
  U.hintHide = function () { refs.hint.classList.remove("on"); hintOn = false; };
  U.toast = function (text) {
    refs.toast.textContent = text; refs.toast.classList.add("on");
    clearTimeout(U._toastT); U._toastT = later(1100, () => refs.toast.classList.remove("on"));
  };
  U.fade = function (cb, dur) { fadeState = { phase: 0, t: 0, dur: Math.max(0.2, dur || 1), cb: cb }; };
  U.setCombo = function (n) {
    comboN = n; comboT = 2.4;
    if (G.stats && n > (G.stats.bestCombo || 0)) G.stats.bestCombo = n;
    refs.combo.innerHTML = n + "<small>CHAIN</small>";
    refs.combo.style.opacity = n >= 2 ? "1" : "0";
  };

  /* ================================================================
     PER-FRAME
     ================================================================ */
  U.update = function (dt) {
    dt = clamp(num(dt, 0.016), 0, 0.1); t += dt;
    if (screen === "hud" || screen === "pause") updateHud(dt);
    if (promptCur) { promptCur.t -= dt; if (promptCur.t <= 0) nextPrompt(); }
    if (bannerOn) { bannerT -= dt; if (bannerT <= 0) U.hideBanner(); }
    if (hintOn) { hintT -= dt; if (hintT <= 0) U.hintHide(); }
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) { refs.combo.style.opacity = "0"; comboN = 0; } }
    if (fadeState) {
      const f = fadeState; f.t += dt;
      const half = f.dur / 2;
      if (f.phase === 0) { refs.fade.style.opacity = String(clamp01(f.t / half)); if (f.t >= half) { f.phase = 1; f.t = 0; try { f.cb && f.cb(); } catch (e) { console.error(e); } } }
      else { refs.fade.style.opacity = String(1 - clamp01(f.t / half)); if (f.t >= half) { fadeState = null; refs.fade.style.opacity = "0"; } }
    }
    if (vignette > 0) { vignette = Math.max(0, vignette - dt * 1.9); refs.vig.style.opacity = String(vignette * 0.9); }
    if (flash > 0) { flash = Math.max(0, flash - dt * 3.4); refs.flash.style.opacity = String(flash * flashPeak); }
  };

  function updateHud(dt) {
    const P = G.player || {};
    const maxHp = Math.max(1, num(P.maxHp, 100)), hp = clamp(num(P.hp, maxHp), 0, maxHp);
    if (chipHp < 0 || hp >= chipHp) chipHp = hp; else chipHp = Math.max(hp, chipHp + (hp - chipHp) * (1 - Math.exp(-5 * dt)));
    refs.hpFill.style.width = pct(hp / maxHp); refs.hpGhost.style.width = pct(chipHp / maxHp);
    const ratio = hp / maxHp;
    refs.hpBar.classList.toggle("low", ratio < 0.3);
    refs.lowhp.style.opacity = String(clamp01(1 - ratio / 0.3) * (0.1 + 0.2 * (0.5 + 0.5 * Math.sin(t * 6.4))));
    const maxMana = Math.max(1, num(P.maxMana, 100));
    refs.manaFill.style.width = pct(num(P.mana, maxMana) / maxMana);
    refs.face.style.setProperty("--surge", String(clamp(num(P.surge, 0), 0, 100)));

    const maxDash = Math.max(1, Math.min(4, Math.round(num(P.maxDashCharges, 2))));
    if (refs.pips.length !== maxDash) {
      refs.pipsBox.innerHTML = ""; refs.pips = [];
      for (let i = 0; i < maxDash; i++) { const p = mk("div", "sh-pip", refs.pipsBox); refs.pips.push({ box: p, fill: mk("i", "", p) }); }
    }
    const charges = clamp(num(P.dashCharges, maxDash), 0, maxDash), cT = clamp(num(P.dashCdT, 0) / 1.4, 0, 1);
    for (let i = 0; i < refs.pips.length; i++) {
      const full = i < Math.floor(charges); const part = !full && i < Math.ceil(charges) ? cT : 0;
      refs.pips[i].fill.style.width = pct(full ? 1 : part);
    }

    /* cooldown sweeps / readiness */
    const cds = P.cooldowns || {};
    sweep("allyA", cds.a); sweep("allyB", cds.b); sweep("magic", cds.magic); sweep("hook", cds.hook);
    if (btn.dash) btn.dash.el.classList.toggle("dead", charges < 1);
    if (btn.magic) btn.magic.el.classList.toggle("dead", num(P.mana, 100) < 10);
    if (btn.hook) btn.hook.el.classList.toggle("hot", !!P.hookReady);
    if (btn.lock) btn.lock.el.classList.toggle("hot", !!P.lockTarget);
    if (btn.attack) btn.attack.el.classList.toggle("hot", num(P.dmgBuff, 0) > 0);

    /* stick visuals */
    const s = G.input.stick;
    refs.stickBase.style.opacity = s.active ? "1" : "0"; refs.stickKnob.style.opacity = s.active ? "1" : "0";
    refs.stickHint.style.opacity = s.active ? "0" : (comboN || G.stats.playTime > 25 ? "0.0" : "0.8");
    if (s.active) {
      refs.stickBase.style.transform = "translate(" + s.ox.toFixed(1) + "px," + s.oy.toFixed(1) + "px)";
      refs.stickKnob.style.transform = "translate(" + s.px.toFixed(1) + "px," + s.py.toFixed(1) + "px)";
    }
  }
  function sweep(act, cd) {
    const b = btn[act]; if (!b || !cd) return;
    const frac = clamp01(num(cd.cur, 0) / Math.max(0.001, num(cd.max, 1)));
    b.sweep.style.setProperty("--cd", (frac * 360).toFixed(1) + "deg");
    const ready = frac <= 0.0005;
    if (ready !== b.ready) {
      b.ready = ready; b.el.classList.toggle("ready", ready);
      if (ready) { b.el.classList.remove("pulse"); void b.el.offsetWidth; b.el.classList.add("pulse"); sfx("uiClick", { vol: 0.12, rate: 1.9 }); }
    }
  }

  function bindBus() {
    G.bus.on("player:damaged", () => { vignette = 1; G.input.haptic(40); });
    G.bus.on("vfx:flash", (d) => { flash = 1; flashPeak = clamp(num(d && d.opacity, 0.35), 0.02, 1); refs.flash.style.background = colorOf(d && d.color); });
    G.bus.on("player:perfectDodge", () => U.toast("Perfect dodge"));
    G.bus.on("player:combo", (d) => U.setCombo(d.n));
  }

  /* ================================================================
     INIT
     ================================================================ */
  function fit() {
    const w = window.innerWidth, h = window.innerHeight;
    const u = clamp(Math.min(w, h) / 100, 3.9, 9.5);
    root.style.setProperty("--u", u.toFixed(3) + "px");
  }

  U.init = function (container) {
    if (inited) return U; inited = true;
    root = mk("div", "sh-root", container || document.body);
    U.root = root;
    const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    fit(); window.addEventListener("resize", fit); window.addEventListener("orientationchange", () => later(120, fit));
    buildTitle(); buildCodex(); buildSettings(); buildHud(); buildPause(); buildEnd(); buildOverlays();
    /* never let the browser scroll / zoom / long-press the page */
    ["gesturestart", "gesturechange", "dblclick", "contextmenu"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
    document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener("visibilitychange", () => { if (document.hidden && screen === "hud") U.pause(); });
    bindBus();
    U.show("title");
    return U;
  };
  U.getScreen = () => screen;
  U.isOpen = () => screen !== "hud" && screen !== "none";
  U.screen = "none";
})();
