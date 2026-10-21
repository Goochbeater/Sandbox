// Menu scenario: opens every touch screen with realistic save data, screenshots each, and proves real taps (H.tap) on
// title→SETTINGS, a mission card, POWERS buy, a range-slider drag, a list scroll, the NEW GAME confirm sheet and the ending flow.
//   BUILD=/tmp/uib/game.html MOBILE=1 W=844 H=390 TAG=w844 QUIET=1 node tools/shot.js tools/sc_menus.js /tmp/uib/out "?nointro"
//   (W=667 H=375 for the small phone). Screens land in <out>/<TAG>_<name>.jpg. Exits non-zero if any assertion fails.
module.exports = async (H) => {
  const TAG = process.env.TAG || 'menus';
  const fails = [];
  const ok = (name, cond, info) => {
    console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : ''));
    if (!cond) fails.push(name);
  };
  const at = (sel) => H.eval((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width, r.height]; }, sel);
  const tapSel = async (sel) => {
    const p = await at(sel);
    if (!p) { ok('found ' + sel, false); return false; }
    await H.tap(p[0], p[1]); await H.wait(320); return true;
  };
  const cur = () => H.eval(() => MENU.cur);
  const shot = (name) => H.pshot(TAG + '_' + name);

  await H.wait(3500);   // boot: title backdrop builds, title menu opens
  ok('boot: title menu is open', (await cur()) === 'title', await cur());
  ok('menu css injected once', await H.eval(() => !!document.getElementById('menuCss') && document.querySelectorAll('#menuCss').length === 1));
  await shot('01_title_new');

  // ---- title → SETTINGS (real tap)
  await tapSel('[data-k="settings"]');
  ok('tap title→SETTINGS opens settings', (await cur()) === 'settings', await cur());
  await shot('02_settings');

  // touch-drag the CONTROL SIZE slider from its thumb to the far right; the value must follow
  const sl = await at('input[data-cfg="size"]');
  if (sl) {
    const y = sl[1], x0 = sl[0] - sl[2] / 2 + sl[2] * 0.4;   // value 1.0 sits 40% along a 0.8–1.3 range
    await H.touch.down(1, x0, y); await H.touch.move(1, x0 + 60, y); await H.touch.move(1, sl[0] + sl[2] / 2 - 4, y); await H.touch.up(1);
    await H.wait(200);
    const v = await H.eval(() => TOUCH.cfg.size);
    ok('range slider drag sets TOUCH.cfg.size', v > 1.2, v);
  } else ok('found size slider', false);
  // toggles and quality (real taps)
  await tapSel('[data-tog="lefty"]');
  ok('tap LEFT-HANDED toggles cfg', (await H.eval(() => TOUCH.cfg.lefty)) === true);
  await tapSel('[data-tog="lefty"]');
  ok('tap LEFT-HANDED again restores cfg', (await H.eval(() => TOUCH.cfg.lefty)) === false);
  await tapSel('[data-q="3"]');   // segments are AUTO, LOW, MED, HIGH = 0..3; HIGH stores quality 2
  ok('tap QUALITY HIGH stores cfg', (await H.eval(() => TOUCH.cfg.quality)) === 2, await H.eval(() => TOUCH.cfg.quality));
  await tapSel('[data-q="0"]');
  ok('tap QUALITY AUTO restores cfg', (await H.eval(() => TOUCH.cfg.quality)) === 'auto');
  ok('style shows only BEAST before Celene', (await H.eval(() => document.querySelectorAll('[data-style]').length)) === 1);
  await H.eval(() => { SAVE.d.done.a3_celene = { rank: 'A', t: 200 }; SAVE.store(); MENU.open('settings'); });
  await H.wait(200);
  ok('style shows DUELIST and PREDATOR after Celene', (await H.eval(() => document.querySelectorAll('[data-style]').length)) === 3);
  await shot('03_settings_styles');
  await H.eval(() => { delete SAVE.d.done.a3_celene; SAVE.store(); });
  // BACK goes to the title (the screen that opened settings)
  await tapSel('[data-back]');
  ok('BACK from settings returns to title', (await cur()) === 'title', await cur());

  // ---- title → MISSIONS (fresh save: act I, a1_pit is the next story mission)
  await tapSel('[data-k="missions"]');
  ok('tap title→MISSIONS opens missions', (await cur()) === 'missions', await cur());
  await shot('04_missions_act1');
  ok('a1_pit is an available card, a1_offer (cine) is locked', (await H.eval(() => !!document.querySelector('[data-m="a1_pit"]') && !document.querySelector('[data-m="a1_offer"]'))));
  await H.eval(() => { window.__started = []; CAMPAIGN.start = (id) => { window.__started.push(id); }; });   // record the launch; the flow itself is CAMPAIGN's
  await tapSel('[data-m="a1_pit"]');
  const started = await H.eval(() => window.__started);
  ok('tap mission card calls CAMPAIGN.start(a1_pit)', started.length === 1 && started[0] === 'a1_pit', started);

  // ---- POWERS buy (real tap on BUY): essence and rank must change in SAVE.d
  const pre = await H.eval(() => { SAVE.d.essence = 500; SAVE.d.powers.grip = 1; SAVE.store(); MENU.open('powers'); return { e: SAVE.d.essence, g: SAVE.d.powers.grip }; });
  await H.wait(200);
  await shot('05_powers');
  const buyEl = await at('[data-buy="grip"]');
  ok('BUY button exists for grip (rank 1)', !!buyEl);
  await tapSel('[data-buy="grip"]');
  const post = await H.eval(() => ({ e: SAVE.d.essence, g: SAVE.d.powers.grip }));
  ok('POWERS buy changes SAVE.d (grip 1→2, essence −180)', post.g === pre.g + 1 && post.e === pre.e - 180, { pre, post });
  await H.wait(1000);   // let the gold flash finish before the shot
  await shot('06_powers_bought');
  // the pwgrid scrolls with a real touch drag (9 powers do not fit at 390px)
  const grid = await at('.mx-pwgrid');
  const sTop0 = await H.eval(() => document.querySelector('.mx-pwgrid').scrollTop), overflow = await H.eval(() => { const g = document.querySelector('.mx-pwgrid'); return g.scrollHeight - g.clientHeight; });
  if (grid && overflow > 0) {
    await H.touch.down(2, grid[0], grid[1] + 60); await H.touch.move(2, grid[0], grid[1] - 10); await H.touch.move(2, grid[0], grid[1] - 80); await H.touch.up(2);
    await H.wait(300);
    const sTop1 = await H.eval(() => document.querySelector('.mx-pwgrid').scrollTop);
    ok('powers list scrolls with a touch drag', sTop1 > sTop0, { overflow, sTop0, sTop1 });
  } else ok('powers list overflows (scroll test runs)', false, overflow);
  await tapSel('[data-back]');
  ok('BACK from powers returns to missions', (await cur()) === 'missions', await cur());
  await tapSel('[data-back]');
  ok('BACK from missions returns to title', (await cur()) === 'title', await cur());

  // ---- title with a save: CONTINUE, NEW GAME confirm
  await H.eval(() => {
    SAVE.d.act = 2; SAVE.d.mission = 'a2_landing'; SAVE.d.essence = 420;
    SAVE.d.done = { a1_pit: { rank: 'A', t: 300 }, a1_offer: { rank: 'B', t: 20 }, a1_zx34: { rank: 'S', t: 200 }, a2_flight: { rank: 'A', t: 250 } };
    SAVE.d.powers.push = 2; SAVE.d.powers.grip = 1; SAVE.store(); MENU.open('title');
  });
  await H.wait(300);
  ok('title shows CONTINUE once a save exists', !!(await at('[data-k="continue"]')));
  await shot('07_title_continue');
  await tapSel('[data-k="new"]');
  ok('NEW GAME with a save opens the ERASE PROGRESS? sheet', !!(await at('.mx-sheet')) && (await H.eval(() => document.querySelector('.mx-sheet').textContent.includes('ERASE PROGRESS'))));
  await shot('08_sheet_erase');
  await tapSel('.mx-sheet [data-si="0"]');
  ok('KEEP closes the sheet without touching the save', !(await at('.mx-sheet')) && (await H.eval(() => SAVE.d.essence)) === 420);

  // ---- missions with progress, act II (cards: cleared, next, locked)
  await H.eval(() => { MENU.tab = 2; MENU.open('missions'); });
  await H.wait(200);
  await shot('09_missions_act2');
  ok('act II: next mission card is a2_landing', !!(await at('[data-m="a2_landing"]')));

  // ---- codex: unlock every 4th entry, open the codex
  await H.eval(() => { const ids = Object.keys(CODEX.data); ids.forEach((id, i) => { if (i % 4 === 0) SAVE.d.codex[id] = 1; }); SAVE.store(); MENU.open('codex'); });
  await H.wait(200);
  ok('codex shows unseen gold dots', (await H.eval(() => document.querySelectorAll('.mx-dot').length)) > 0);
  await shot('10_codex');
  const lockedEnt = await at('.mx-ent.lk');
  if (lockedEnt) { await H.tap(lockedEnt[0], lockedEnt[1]); await H.wait(250); }
  ok('a locked codex entry shows ??? · LOCKED in the detail pane', await H.eval(() => document.querySelector('.mx-det2').textContent.includes('LOCKED')));
  await tapSel('[data-back]');
  ok('BACK from codex returns to the screen under it (missions)', (await cur()) === 'missions', await cur());
  await tapSel('[data-back]');
  ok('BACK from missions returns to title', (await cur()) === 'title', await cur());

  // ---- in-game screens
  await H.eval(() => {
    MISSION.cur = { id: 'a2_landing', def: CAMPAIGN.M.a2_landing, t0: MG.rt, kills0: 0, done: false, obj: 'Hold the lesser tombs until the warren is claimed.' };
    MENU.open('pause');
  });
  await H.wait(200);
  ok('pause shows the mission objective and RETURN TO HUB (not in hub)', await H.eval(() => document.querySelector('#mn-pause').textContent.includes('Hold the lesser tombs') && !!document.querySelector('[data-k="hub"]')));
  await shot('11_pause');
  await H.eval(() => {
    const ids = Object.keys(CODEX.data);
    MENU.open('result', { mission: CAMPAIGN.M.a2_landing, final: false, got: { rank: 'A', essence: 120, salvage: 6, artifact: 'corrupted_holocron', powers: ['grip'], codex: [ids[1]], ship: null, time: 213, kills: 27 } });
  });
  await H.wait(200);
  await shot('12_result');
  await H.eval(() => { window.__adv = 0; CAMPAIGN.advance = () => { window.__adv++; }; });
  await tapSel('[data-k="next"]');
  ok('CONTINUE on result calls CAMPAIGN.advance', (await H.eval(() => window.__adv)) === 1);
  await H.eval(() => MENU.open('dead'));
  await H.wait(200);
  ok('dead screen offers RETRY and RETURN TO HUB', await H.eval(() => !!document.querySelector('[data-k="retry"]') && !!document.querySelector('[data-k="hub"]')));
  await shot('13_dead');
  await H.eval(() => { window.__retries = 0; GAME.retry = () => { window.__retries++; }; });
  await tapSel('[data-k="retry"]');
  ok('RETRY calls GAME.retry', (await H.eval(() => window.__retries)) === 1);

  // ---- ending: three slides, THE END, credits, then back to the title
  await H.eval(() => MENU.open('ending', { id: 'end_a_reaper' }));
  await H.wait(300);
  await H.wait(1200);
  await shot('14_ending_1');
  const eroot = await at('#mn-ending');
  for (let i = 0; i < 3; i++) { await H.tap(eroot[0], eroot[1]); await H.wait(160); }
  await H.wait(1200);
  await shot('15_ending_end');
  await H.tap(eroot[0], eroot[1]); await H.wait(1500);   // the cross-fade is 1.1 s
  await shot('16_credits');
  ok('ending records the ending id', await H.eval(() => SAVE.d.endings.includes('end_a_reaper')));
  await tapSel('[data-k="title"]');
  await H.wait(4500);
  ok('RETURN TO TITLE gets back to the title menu', (await cur()) === 'title', await cur());
  await shot('17_title_back');

  console.log('SUMMARY ' + (fails.length ? 'FAILED: ' + fails.join(' | ') : 'all checks passed'));
  if (fails.length) throw new Error('menu checks failed: ' + fails.length);
};
