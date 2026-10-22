// full flow regression: title → prologue → hub → realm → death → trial → boss → hub event → menus → ending
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html') + '');
  await pg.waitForTimeout(4000);
  const S = n => pg.screenshot({ path: __dirname + `/shots/f_${n}.png` });
  const step = (ci) => pg.evaluate(ci => {
    if (G.cardOpen) { if (G.cardT > .5) cardHide(); return 'card'; }
    if (DLG.open) {
      if (DLG.shown < DLG.text.length) { dlgFinish(); return 'fin'; }
      if (DLG.choices) { const bs = document.querySelectorAll('#choices button'); const bt = bs[Math.min(ci, bs.length - 1)]; if (bt) bt.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'choice'; }
      DLG.t = 1; dlgTap(); return 'tap';
    }
    return 'none';
  }, ci);
  const adv = async (until, max = 400, ci = 0, shots = {}, arg = null) => {
    for (let i = 0; i < max; i++) {
      if (await pg.evaluate(until, arg)) return true;
      const v = await pg.evaluate(() => G.vig);
      if (v && shots[v] === undefined) { shots[v] = 1; await pg.waitForTimeout(1200); await S('vig_' + v); }
      await step(ci); await pg.waitForTimeout(140);
    }
    return false;
  };
  const log = async l => console.log(l, JSON.stringify(await pg.evaluate(() => ({ scene: G.scene && G.scene.kind, id: G.scene && G.scene.id, cs: !!G.cs, vig: G.vig, stage: EIN.S.stage, deaths: EIN.S.deaths, hp: EIN.P && EIN.P.hp, lock: G.lock }))));
  await S('title');
  await pg.click('#tNew');
  const sh = {};
  let ok = await adv(() => G.scene.kind === 'hub' && !G.cs && EIN.S.stage >= 1, 600, 0, sh);
  await log('prologue→hub ' + ok); await S('hub_wake');
  // Ásta gives Frigg's blessing
  await pg.evaluate(() => { const a = G.npcs.find(n => n.id === 'asta'); EIN.P.x = a.x; EIN.P.y = a.y + 40; });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { EIN.IN.act = true; });
  ok = await adv(() => !G.cs && !DLG.open && EIN.S.powers.frigg, 120, 0);
  await pg.evaluate(() => closeMenu());
  await log('asta frigg ' + ok);
  // the Iron Wood: walk and fight
  await pg.evaluate(() => { EIN.grantPower('thor'); EIN.enterRealm('iron', 'start'); });
  await pg.waitForTimeout(1500);
  ok = await adv(() => !G.cs, 80, 0); await log('iron intro ' + ok);
  for (let i = 0; i < 50; i++) { await pg.evaluate(i => { const I = EIN.IN; I.mx = 0; I.my = -1; I.mag = 1; if (i % 3 === 0) I.atkJ = true; if (i === 30) I.p[0] = true; }, i); await pg.waitForTimeout(90); }
  await pg.evaluate(() => { const I = EIN.IN; I.mag = 0; I.mx = 0; I.my = 0; });
  await S('iron_fight');
  // death and the fire
  await pg.evaluate(() => { EIN.P.hp = 1; EIN.hurtPlayer(999, EIN.P.x + 10, EIN.P.y); });
  ok = await adv(() => G.scene.kind === 'realm' && !G.cs && EIN.P.state !== 'dead' && G.fade < .05, 120, 0);
  await log('death→respawn ' + ok);
  // a rune trial
  await pg.evaluate(() => { const n = G.world.nodes.find(n => n.t === 'altar'); EIN.P.x = n.x; EIN.P.y = n.y + 60; startTrial(n); });
  for (let i = 0; i < 40; i++) { await pg.evaluate(() => { for (const e of G.enemies) if (e.trial && !e.dead) { e.hp = 0; killEnemy(e, 0); } EIN.P.hp = 999; }); await pg.waitForTimeout(150); }
  await S('trial'); await log('trial ' + (await pg.evaluate(() => JSON.stringify(G.trial && { w: G.trial.wave, a: G.trial.active }))));
  ok = await adv(() => !G.cs && !G.trial, 80, 0); await log('trial done ' + ok);
  // first jarl
  await pg.evaluate(() => { EIN.enterArena('angr', false, false); runCS(EIN.arenaIntro()); });
  ok = await adv(() => !G.cs, 120, 0); await log('angr intro ' + ok);
  await pg.waitForTimeout(3000); await S('angr_fight');
  await pg.evaluate(() => bossDie());
  ok = await adv(() => G.scene.kind === 'hub' && !G.cs && EIN.S.f.ev1, 700, 0, sh);
  await log('angr→hub ev1 ' + ok); await S('hub_after1');
  // menus and shop
  await pg.evaluate(() => openMenu()); await pg.waitForTimeout(500); await S('menu');
  await pg.evaluate(() => { closeMenu(); EIN.S.silver = 500; openShop('bjarki'); }); await pg.waitForTimeout(400); await S('shop');
  await pg.evaluate(() => closeMenu());
  // the rest of the jarls, quickly, and their hearth scenes
  for (const [bid, ev] of [['thrym', 'ev2'], ['nidhogg', 'ev3'], ['surtr', 'ev4']]) {
    await pg.evaluate(bid => { EIN.enterArena(bid, false, true); }, bid);
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => bossDie());
    ok = await adv(ev => G.scene.kind === 'hub' && !G.cs && EIN.S.f[ev], 900, 2, sh, ev);
    await log(bid + ' → ' + ev + ' ' + ok);
  }
  // Skögul and the cloak
  await pg.evaluate(() => { EIN.enterArena('skogul', false, false); runCS(EIN.arenaIntro()); });
  ok = await adv(() => !G.cs, 120, 0); await pg.waitForTimeout(2500); await S('skogul');
  await pg.evaluate(() => bossDie());
  ok = await adv(() => G.scene.kind === 'hub' && !G.cs && EIN.S.cloak, 400, 0, sh);
  await log('skogul ' + ok + ' cloak ' + (await pg.evaluate(() => EIN.S.cloak)));
  // the Outer King, and the ending with the swan-cloak
  await pg.evaluate(() => { EIN.enterArena('utgard', false, false); runCS(EIN.arenaIntro()); });
  ok = await adv(() => !G.cs, 160, 0); await log('utgard intro ' + ok);
  await pg.waitForTimeout(2500); await S('utgard');
  await pg.evaluate(() => { const b = G.boss; b.hp = b.maxhp * .5 - 1; b.phase = 2; b.gen = null; if (b.onPhase2) b.onPhase2(b); });
  await pg.waitForTimeout(6000); await S('skrymir');
  await pg.evaluate(() => bossDie());
  ok = await adv(() => !!document.querySelector('#credits.on') || (G.scene.kind === 'hub' && !G.cs && EIN.S.ending), 900, 2, sh);
  await log('ending ' + ok + ' ' + (await pg.evaluate(() => EIN.S.ending)));
  await pg.waitForTimeout(4000); await S('credits');
  ok = await adv(() => G.scene.kind === 'hub' && !G.cs, 600, 0);
  await log('post-credits hub ' + ok); await S('hub_end');
  console.log('vigs seen', Object.keys(sh).join(','));
  console.log('ERRORS:\n' + errs.slice(0, 30).join('\n'));
  await b.close();
})();
