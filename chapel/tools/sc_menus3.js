module.exports = async (H) => {
  const mode = process.env.MODE;
  await H.step(30); await H.wait(1200);
  await H.eval(() => { window.__starts = []; const f = GAME.start; GAME.start = function (l, cp) { window.__starts.push(l); return f.call(this, l, cp); }; });
  if (mode === 'titleKey') { for (let i = 0; i < 6; i++) { await H.page.keyboard.press('ArrowDown'); await H.wait(60); } await H.page.keyboard.press('Enter'); }
  if (mode === 'titleClick') { const r = await H.eval(() => { const b = document.querySelector('#mCh2').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }); await H.page.mouse.click(r[0], r[1]); }
  if (mode === 'levelKey') { await H.page.keyboard.press('ArrowDown'); await H.wait(60); await H.page.keyboard.press('Enter'); await H.wait(300); for (let i = 0; i < 9; i++) { await H.page.keyboard.press('ArrowRight'); await H.wait(60); } await H.page.keyboard.press('Enter'); }
  if (mode === 'levelClick') { await H.eval(() => MENU.open('chapters')); await H.wait(200); const r = await H.eval(() => { const b = document.querySelector('.lvlb[data-l="rooftops"]').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }); await H.page.mouse.click(r[0], r[1]); }
  for (let i = 0; i < 60; i++) { await H.wait(500); const st = await H.eval(() => MG.state); if (st === 'play') break; }
  console.log(mode, JSON.stringify(await H.eval(() => ({ starts: window.__starts, lvl: LEVEL.cur && LEVEL.cur.id, st: MG.state, err: MG.errors.slice(0, 3) }))));
};
