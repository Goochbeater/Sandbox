/* MAIN — boot, then the frame loop. ?x=<metres> starts the king elsewhere, ?crown puts it on, ?q=low forces low quality,
   ?nofx turns the post effects off, ?test keeps the drawing buffer for screenshots, ?fps shows the frame rate. */
G.render = function () { KING.render(); R.frame(G.t); };
async function boot() {
  setLoad(0.05); await nextFrame();
  R.init(); setLoad(0.2, 'Painting the walls…'); await nextFrame();
  PX.build(); setLoad(0.45, 'Hanging the tapestries…'); await nextFrame();
  ROOM.build(); setLoad(0.65, 'Waking the king…'); await nextFrame();
  await KING.build(); setLoad(0.85, 'Opening the door…'); await nextFrame();
  GAME.init(); GAME.update(0.016); ROOM.update(0, 0.016);
  R.r.shadowMap.needsUpdate = true;
  R.r.compile(R.scene, R.cam); G.render(); await nextFrame(); G.render();
  setLoad(1);
  $('boot').style.opacity = '0'; setTimeout(() => { $('boot').hidden = true; }, 900);
  $('fade').classList.add('off'); setTimeout(() => $('caption').classList.add('on'), 700); setTimeout(() => $('caption').classList.remove('on'), 4600);
  if (G.flags.fps) { const f = document.createElement('div'); f.id = 'fps'; $('stage').appendChild(f); G.fpsEl = f; }
  let last = performance.now(), acc = 0, n = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const ms = now - last, dt = Math.min(ms / 1000, 0.05); last = now;
    if (G.paused) return;
    G.t += dt; G.frame++;
    GAME.update(dt); ROOM.update(G.t, dt); G.render();
    if (G.frame > 30) GAME.perf(ms);
    if (G.fpsEl) { acc += ms; n++; if (acc > 500) { G.fpsEl.textContent = (1000 * n / acc).toFixed(0) + ' fps · ' + R.bw + '×' + R.bh + ' · ' + R.q; acc = 0; n = 0; } }
  };
  requestAnimationFrame(loop);
  setTimeout(() => { window.__ready = true; }, 300);
}
boot().catch(fail);
