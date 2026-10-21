/* MENU (extra screens) — missions, codex, study bench (powers), settings, ending. Loads after p28_menu.js and shares its helpers
   (MENU.mk / tap / hdr / open / back). The CSS for these lives in MENU.CSS2, appended to the one injected <style id="menuCss">. */
MENU.CSS2 = `
#menus .mx-tabs{flex:0 0 auto;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:2px 0 8px;touch-action:pan-x}
#menus .mx-tab{flex:0 0 auto;min-width:118px;min-height:44px;box-sizing:border-box;padding:5px 12px;border:1px solid rgba(233,220,203,.2);border-radius:8px;background:#150d0d;display:flex;flex-direction:column;justify-content:center;text-align:left;cursor:pointer;touch-action:manipulation}
#menus .mx-tab b{font-size:13px;letter-spacing:.14em;color:var(--bone);text-transform:uppercase}
#menus .mx-tab small{font-size:12px;color:var(--dim);letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#menus .mx-tab.on{border-color:var(--gold);background:#22160c}
#menus .mx-tab.on b{color:var(--gold)}
#menus .mx-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start}
#menus .mx-card{display:flex;gap:10px;align-items:stretch;min-height:76px;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(233,220,203,.14);border-radius:8px;background:#120b0b;touch-action:manipulation}
#menus .mx-card.av{border-color:rgba(233,220,203,.34);cursor:pointer;background:linear-gradient(90deg,#1e1212,#120b0b)}
#menus .mx-card.av:active{background:#2c1616}
#menus .mx-card.nx{border-color:var(--cr);box-shadow:0 0 16px rgba(224,35,26,.28)}
#menus .mx-card.lk{opacity:.45}
#menus .mx-cic{flex:0 0 auto;width:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:var(--dim)}
#menus .mx-cic svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6}
#menus .mx-cic span{font-size:12px;letter-spacing:.06em;white-space:nowrap}
#menus .mx-card.av .mx-cic{color:var(--bone)}
#menus .mx-cb{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}
#menus .mx-ct2{font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--bone);line-height:1.25}
#menus .mx-cd{font-size:12px;line-height:1.4;color:#b7a79d;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#menus .mx-cs{flex:0 0 auto;align-self:flex-start;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);white-space:nowrap}
#menus .mx-cs.rk{color:var(--gold)}
#menus .mx-card.nx .mx-cs{color:#ff6a50}
#menus .mx-cx{flex:1 1 auto;min-height:0;display:flex;gap:10px}
#menus .mx-rail{flex:0 0 128px;display:flex;flex-direction:column;gap:4px;padding-bottom:0}
#menus .mx-list2{flex:0 0 40%;min-width:0;display:flex;flex-direction:column;gap:2px;border-left:1px solid var(--ln);padding-left:10px;padding-bottom:0}
#menus .mx-det2{flex:1 1 auto;min-width:0;padding-right:4px;border-left:1px solid var(--ln);padding-left:12px}
#menus .mx-cat{position:relative;min-height:44px;box-sizing:border-box;padding:5px 24px 5px 10px;border-radius:6px;border:1px solid transparent;display:flex;flex-direction:column;justify-content:center;cursor:pointer;touch-action:manipulation}
#menus .mx-cat span{font-size:12px;font-weight:700;letter-spacing:.12em;color:var(--bone)}
#menus .mx-cat small{font-size:12px;color:var(--dim)}
#menus .mx-cat.on{border-color:var(--gold);background:#1d130b}
#menus .mx-ent{position:relative;min-height:44px;box-sizing:border-box;padding:8px 22px 8px 10px;font-size:13px;line-height:1.3;letter-spacing:.04em;color:var(--bone);border-radius:6px;cursor:pointer;display:flex;align-items:center;touch-action:manipulation}
#menus .mx-ent.lk{color:#6f5f58;letter-spacing:.14em}
#menus .mx-ent.on{background:#1d1210;box-shadow:inset 2px 0 0 var(--cr)}
#menus .mx-dt{font-size:19px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--bone);margin:6px 0 10px;line-height:1.25}
#menus .mx-dx{font-size:14px;line-height:1.55;color:#d8c9bd}
#menus .mx-dx.dim{color:var(--dim);font-style:italic}
#menus .mx-dot{position:absolute;right:8px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px rgba(217,164,65,.8)}
#menus .mx-pwgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start}
#menus .mx-pw{display:flex;flex-direction:column;gap:6px;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(155,60,255,.4);border-radius:8px;background:linear-gradient(160deg,#1b1024,#120a0a 62%)}
#menus .mx-pw.lk{border-color:rgba(233,220,203,.14);background:#120b0b}
#menus .mx-pwh{display:flex;align-items:center;justify-content:space-between;gap:8px}
#menus .mx-pwn{font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#d7b9ff;line-height:1.2}
#menus .mx-pw.lk .mx-pwn{color:#8d7f78}
#menus .mx-pips{display:flex;gap:7px;flex:0 0 auto;padding-right:4px}
#menus .mx-pip{display:block;width:10px;height:10px;border:1px solid rgba(155,60,255,.75);transform:rotate(45deg)}
#menus .mx-pip.on{background:var(--vio);box-shadow:0 0 8px rgba(155,60,255,.85)}
#menus .mx-pwd{font-size:13px;line-height:1.45;color:#d8c9bd}
#menus .mx-pw.lk .mx-pwd{color:var(--dim)}
#menus .mx-pn{font-size:12px;line-height:1.4;color:var(--dim)}
#menus .mx-pws{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#a58bc9;line-height:1.35}
#menus .mx-pw.lk .mx-pws{color:var(--dim)}
#menus .mx-pw .mx-btn{margin-top:auto}
#menus .mx-cols2{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:18px}
#menus .mx-cols2 .mx-scroll{padding-right:4px}
#menus .mx-sect{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);font-weight:700;margin:8px 0 6px}
#menus .mx-set{padding:2px 0 6px;border-bottom:1px solid var(--ln);margin-bottom:4px}
#menus .mx-sl{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--bone)}
#menus .mx-sl b{color:var(--gold);font-weight:700;letter-spacing:.06em}
#menus .mx-range{-webkit-appearance:none;appearance:none;display:block;width:100%;height:44px;margin:0;padding:0;background:transparent;touch-action:none;cursor:pointer}
#menus .mx-range::-webkit-slider-runnable-track{height:10px;border-radius:5px;background:#2a1a18;box-shadow:inset 0 0 0 1px rgba(233,220,203,.16)}
#menus .mx-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:28px;height:28px;margin-top:-9px;border-radius:50%;background:var(--bone);border:3px solid var(--cr);box-shadow:0 0 10px rgba(224,35,26,.6)}
#menus .mx-range::-moz-range-track{height:10px;border-radius:5px;background:#2a1a18;box-shadow:inset 0 0 0 1px rgba(233,220,203,.16)}
#menus .mx-range::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:var(--bone);border:3px solid var(--cr);box-sizing:border-box}
#menus .mx-tog{display:flex;align-items:center;justify-content:space-between;min-height:48px;padding:6px 0;border-bottom:1px solid var(--ln);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--bone);cursor:pointer;touch-action:manipulation}
#menus .mx-tog i{position:relative;flex:0 0 auto;width:52px;height:30px;border-radius:15px;background:#2a1c1a;border:1px solid rgba(233,220,203,.25);box-sizing:border-box}
#menus .mx-tog i:after{content:'';position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:var(--dim);transition:left .18s,background .18s}
#menus .mx-tog.on i{background:#6e1510;border-color:#ff6a50}
#menus .mx-tog.on i:after{left:25px;background:var(--bone)}
#menus .mx-segs{display:flex;gap:6px;margin:2px 0 6px}
#menus .mx-segb{flex:1 1 0;min-width:0;min-height:44px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(233,220,203,.22);border-radius:8px;background:#150d0d;font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--dim);text-transform:uppercase;cursor:pointer;touch-action:manipulation}
#menus .mx-segb.on{color:var(--gold);border-color:var(--gold);background:#2a1a0e}
#menus .endr{padding:0}
#menus .mx-ec{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:calc(24px + env(safe-area-inset-top)) calc(24px + env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left));text-align:center;opacity:0;transition:opacity 1.1s ease;pointer-events:none}
#menus .mx-ec.on{opacity:1;pointer-events:auto}
#menus .mx-et{font-size:clamp(18px,5vh,26px);line-height:1.5;letter-spacing:.03em;color:var(--bone);max-width:640px;font-style:italic}
#menus .mx-tapn{position:absolute;left:0;right:0;bottom:calc(12px + env(safe-area-inset-bottom));text-align:center;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--dim)}
#menus .mx-the{font-size:clamp(44px,13vh,76px);font-weight:900;letter-spacing:.18em;color:var(--bone);text-shadow:0 0 28px rgba(255,30,10,.6)}
#menus .mx-cr{display:flex;flex-direction:column;align-items:center;gap:0}
#menus .mx-crt{font-size:clamp(18px,5vh,24px);font-weight:900;letter-spacing:.18em;color:var(--bone)}
#menus .mx-crs{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin:8px 0 18px}
#menus .mx-crl{font-size:13px;letter-spacing:.06em;color:#cbbcb2;margin:3px 0}
`;
MENU.KIND = { level: 'GROUND', space: 'FLIGHT', cine: 'SCENE', hub: 'BASE' };
MENU.kindIcon = function (k) {
  const ic = {
    level: '<path d="M12 4 20 19H4Z"/>',
    space: '<circle cx="12" cy="12" r="6.5"/><path d="M2.5 14.5c4 3 15 3 19-1"/>',
    cine: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M7 6v12M17 6v12"/>',
  };
  return `<svg viewBox="0 0 24 24">${ic[k] || '<circle cx="12" cy="12" r="5"/>'}</svg>`;
};
MENU.FMT = { size: (v) => Math.round(v * 100) + '%', opacity: (v) => Math.round(v * 100) + '%', sens: (v) => v.toFixed(1) + '×' };
/* combat styles: Beast is always there; the Celene aftermath (a3_celene) opens Duelist and Predator */
MENU.styleOpen = (k) => k === 'beast' || !!(SAVE.d.done && SAVE.d.done.a3_celene);
/* ---------------------------------------------------------------- missions: act tabs, then mission cards */
MENU.S.missions = function () {
  const d = SAVE.d, avs = CAMPAIGN.available(), nxt = CAMPAIGN.nextStory(), story = CAMPAIGN.story();
  if (!MENU.tab) MENU.tab = d.act || 1;
  const act = MENU.tab, cleared = story.filter((id) => d.done[id]).length;
  const tabs = GAME.acts.map((a, i) => `<div class="mx-tab${i + 1 === act ? ' on' : ''}" data-tab="${i + 1}"><b>${a.n}</b><small>${a.t}</small></div>`).join('');
  const ids = CAMPAIGN.ORDER.filter((id) => { const m = CAMPAIGN.M[id]; return m.act === act && m.kind !== 'hub'; });
  const cards = ids.map((id) => {
    const m = CAMPAIGN.M[id], dn = d.done[id], ok = avs.includes(id), nx = id === nxt;
    let st, cls = '';
    if (dn) { st = m.kind === 'cine' ? 'SEEN' : 'RANK ' + dn.rank; cls = ' rk'; }
    else if (ok) st = nx ? 'NEXT' : (m.optional ? 'OPTIONAL' : 'OPEN');
    else st = 'LOCKED';
    return `<div class="mx-card${ok ? ' av' : ' lk'}${nx ? ' nx' : ''}"${ok ? ` data-m="${id}"` : ''}>
      <div class="mx-cic">${MENU.kindIcon(m.kind)}<span>${MENU.KIND[m.kind] || ''}</span></div>
      <div class="mx-cb"><div class="mx-ct2">${m.title}</div><div class="mx-cd">${m.brief}</div></div>
      <div class="mx-cs${cls}">${st}</div></div>`;
  }).join('');
  const root = MENU.mk('missions', '', `${MENU.hdr('Missions', cleared + ' of ' + story.length + ' cleared')}
    <div class="mx-tabs">${tabs}</div>
    <div class="mx-scroll mx-grid" data-keep="grid">${cards || '<div class="mx-k">No missions in this act</div>'}</div>`);
  MENU.std(root);
  MENU.tap(root, '[data-tab]', (e) => { MENU.tab = +e.dataset.tab; MENU.redraw(); });
  MENU.tap(root, '[data-m]', (e) => { const id = e.dataset.m; MENU.go(() => CAMPAIGN.start(id)); });
};
/* ---------------------------------------------------------------- codex: category rail, entry list, detail */
MENU.S.codex = function () {
  const cats = CODEX.CATS, ci = Math.min(MENU.cat, cats.length - 1), cat = cats[ci];
  const seen = SAVE.d.codexSeen = SAVE.d.codexSeen || {};   // which unlocks the player has opened: unseen ones get a gold dot
  const list = CODEX.listAll(cat);
  if (!MENU.ent || !CODEX.data[MENU.ent] || CODEX.data[MENU.ent].cat !== cat) { const pick = list.find((e) => CODEX.has(e.id)) || list[0]; MENU.ent = pick ? pick.id : null; }
  const sel = MENU.ent ? CODEX.data[MENU.ent] : null;
  if (sel && CODEX.has(sel.id) && !seen[sel.id]) { seen[sel.id] = 1; SAVE.store(); }
  const rail = cats.map((c, i) => {
    const all = CODEX.listAll(c), n = all.filter((e) => CODEX.has(e.id)).length, fresh = all.some((e) => CODEX.has(e.id) && !seen[e.id]);
    return `<div class="mx-cat${i === ci ? ' on' : ''}" data-cat="${i}"><span>${c}</span><small>${n} / ${all.length}</small>${fresh ? '<i class="mx-dot"></i>' : ''}</div>`;
  }).join('');
  const rows = list.map((e) => {
    const ok = CODEX.has(e.id), fresh = ok && !seen[e.id];
    return `<div class="mx-ent${ok ? '' : ' lk'}${e.id === MENU.ent ? ' on' : ''}" data-ent="${e.id}">${ok ? e.title : '??? · LOCKED'}${fresh ? '<i class="mx-dot"></i>' : ''}</div>`;
  }).join('');
  let det = '<div class="mx-dx dim">No records in this category.</div>';
  if (sel) det = CODEX.has(sel.id)
    ? `<div class="mx-k">${sel.cat}</div><div class="mx-dt">${sel.title}</div><div class="mx-dx">${sel.text}</div>`
    : `<div class="mx-k">${sel.cat}</div><div class="mx-dt">??? · LOCKED</div><div class="mx-dx dim">This record is still buried. Walk further into the warrens and it will surface.</div>`;
  const root = MENU.mk('codex', '', `${MENU.hdr('Codex', CODEX.count() + ' / ' + CODEX.total() + ' recorded')}
    <div class="mx-cx"><div class="mx-scroll mx-rail" data-keep="rail">${rail}</div><div class="mx-scroll mx-list2" data-keep="list">${rows}</div><div class="mx-scroll mx-det2">${det}</div></div>`);
  MENU.std(root);
  MENU.tap(root, '[data-cat]', (e) => { MENU.cat = +e.dataset.cat; MENU.ent = null; MENU.redraw(); });
  MENU.tap(root, '[data-ent]', (e) => { MENU.ent = e.dataset.ent; MENU.redraw(); });
};
/* ---------------------------------------------------------------- study bench: Force powers bought with Essence */
MENU.S.powers = function () {
  const fl = MENU.flashId; MENU.flashId = null;
  const cards = POWERS.ORDER.map((id) => {
    const P = POWERS.D[id], r = POWERS.rank(id), nc = POWERS.nextCost(id), can = POWERS.canBuy(id);
    const pips = [1, 2, 3].map((k) => `<i class="mx-pip${k <= r ? ' on' : ''}"></i>`).join('');
    let btn;
    if (r === 0) btn = '<div class="mx-btn dis">LOCKED</div>';
    else if (r >= 3) btn = '<div class="mx-btn gold dis">MAX</div>';
    else btn = `<div class="mx-btn gold${can ? '' : ' dis'}" data-buy="${id}">BUY · ${nc} ESSENCE</div>`;
    return `<div class="mx-pw${r ? '' : ' lk'}${fl === id ? ' mx-flash' : ''}">
      <div class="mx-pwh"><div class="mx-pwn">${P.name}</div><div class="mx-pips">${pips}</div></div>
      <div class="mx-pwd">${r ? P.desc[r - 1] : P.desc[0]}</div>
      ${r && r < 3 ? `<div class="mx-pn">Next · ${P.desc[r]}</div>` : ''}
      <div class="mx-pws">${r ? 'Source · ' + P.src : 'Unlocked by story · ' + P.src}</div>
      ${btn}</div>`;
  }).join('');
  const root = MENU.mk('powers', '', `${MENU.hdr('The Study Bench', 'Force instruction', 'Essence<br><b style="color:var(--gold);font-size:16px;letter-spacing:.06em">' + SAVE.d.essence + '</b>')}
    <div class="mx-scroll mx-pwgrid" data-keep="pw">${cards}</div>`);
  MENU.std(root);
  MENU.tap(root, '[data-buy]', (e) => { const id = e.dataset.buy; if (POWERS.buy(id)) { MENU.flashId = id; MENU.redraw(); } });
};
/* ---------------------------------------------------------------- settings: touch, graphics, style, save */
MENU.S.settings = function (o) {
  const C = TOUCH.cfg, d = SAVE.d, QV = ['auto', 0, 1, 2], QN = ['AUTO', 'LOW', 'MED', 'HIGH'];
  const qi = Math.max(0, QV.indexOf(C.quality));
  const styles = [['beast', 'BEAST'], ['duelist', 'DUELIST'], ['predator', 'PREDATOR']].filter((s) => MENU.styleOpen(s[0]));
  const sl = (k, lab, min, max, step) => `<div class="mx-set"><div class="mx-sl"><span>${lab}</span><b data-v="${k}">${MENU.FMT[k](C[k])}</b></div><input class="mx-range" type="range" min="${min}" max="${max}" step="${step}" value="${C[k]}" data-cfg="${k}"></div>`;
  const tg = (k, lab) => `<div class="mx-tog${C[k] ? ' on' : ''}" data-tog="${k}"><span>${lab}</span><i></i></div>`;
  const root = MENU.mk('settings', '', `${MENU.hdr('Settings', o.note || 'Touch · graphics · style')}
    <div class="mx-cols2">
      <div class="mx-scroll" data-keep="c1">
        <div class="mx-sect">Controls</div>
        ${sl('size', 'CONTROL SIZE', 0.8, 1.3, 0.05)}
        ${sl('opacity', 'BUTTON OPACITY', 0.3, 1, 0.05)}
        ${sl('sens', 'LOOK SENSITIVITY', 0.5, 2, 0.1)}
        ${tg('lefty', 'LEFT-HANDED')}${tg('invertY', 'INVERT Y')}${tg('haptics', 'HAPTICS')}
      </div>
      <div class="mx-scroll" data-keep="c2">
        <div class="mx-sect">Graphics</div>
        <div class="mx-segs">${QN.map((n, i) => `<div class="mx-segb${i === qi ? ' on' : ''}" data-q="${i}">${n}</div>`).join('')}</div>
        <div class="mx-sect">Combat style</div>
        <div class="mx-segs">${styles.map(([k, n]) => `<div class="mx-segb${d.style === k ? ' on' : ''}" data-style="${k}">${n}</div>`).join('')}</div>
        <div class="mx-sect">Save</div>
        <div class="mx-btn danger" data-k="reset">RESET SAVE</div>
      </div>
    </div>`);
  MENU.std(root);
  root.querySelectorAll('input[data-cfg]').forEach((inp) => inp.addEventListener('input', () => {
    const k = inp.dataset.cfg, v = parseFloat(inp.value); TOUCH.setCfg(k, v);
    const out = root.querySelector('[data-v="' + k + '"]'); if (out) out.textContent = MENU.FMT[k](v);
  }));
  MENU.tap(root, '[data-tog]', (e) => { const k = e.dataset.tog; TOUCH.setCfg(k, !TOUCH.cfg[k]); e.classList.toggle('on', !!TOUCH.cfg[k]); });
  MENU.tap(root, '[data-q]', (e) => {
    const v = QV[+e.dataset.q]; TOUCH.setCfg('quality', v);
    if (typeof QUAL !== 'undefined' && QUAL.set) QUAL.set(v);
    root.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('on', b === e));
  });
  MENU.tap(root, '[data-style]', (e) => {
    SAVE.d.style = e.dataset.style; SAVE.store();
    root.querySelectorAll('[data-style]').forEach((b) => b.classList.toggle('on', b === e));
  });
  MENU.tap(root, '[data-k="reset"]', () => MENU.sheet('<div class="mx-ct">ERASE PROGRESS?</div><p class="mx-p">Your Essence, powers, codex and endings will be lost.</p>',
    [{ label: 'KEEP', fn: null }, { label: 'ERASE', cls: 'danger', fn: () => { SAVE.reset(); MENU.curO = { note: 'Save erased' }; MENU.redraw(); } }]));
};
/* ---------------------------------------------------------------- ending: three slides from the scene, THE END, credits */
MENU.S.ending = function (o) {
  MG.state = 'result'; HUD.show(false);
  const id = o.id || 'end_a_reaper', sc = (typeof LORE !== 'undefined' && LORE.scenes && LORE.scenes[id]) || { shots: [] };
  if (!SAVE.d.endings.includes(id)) { SAVE.d.endings.push(id); SAVE.store(); }
  const lines = (sc.shots || []).filter((s) => s.line).map((s) => s.line).slice(0, 3);
  const cards = lines.map((t) => `<div class="mx-ec"><div class="mx-et">${t}</div><div class="mx-tapn">Tap to continue</div></div>`);
  cards.push('<div class="mx-ec"><div class="mx-the">THE END</div><div class="mx-tapn">Tap to continue</div></div>');
  cards.push('<div class="mx-ec"><div class="mx-cr"><div class="mx-crt">DARK LEGACY: RATHATRI</div><div class="mx-crs">A fan-made game</div>'
    + '<div class="mx-crl">Characters &amp; animation: Quaternius (CC0)</div><div class="mx-crl">three.js</div>'
    + '<div class="mx-btn pri" data-k="title" style="margin-top:22px">RETURN TO TITLE</div></div></div>');
  const root = MENU.mk('ending', 'dark endr', cards.join(''));
  const els = [...root.querySelectorAll('.mx-ec')]; let i = 0;
  const show = () => els.forEach((e, k) => e.classList.toggle('on', k === i));
  show();
  root.addEventListener('click', (ev) => { if (ev.target.closest('[data-k]')) return; if (i < els.length - 1) { i++; show(); } });
  MENU.acts(root, { title: () => MENU.toTitle() });
};
