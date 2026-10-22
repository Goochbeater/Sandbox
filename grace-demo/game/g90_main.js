/* MAIN — boot, then the frame loop. URL options: ?room=throne starts in the throne room, ?x=<metres> moves the king,
   ?crown puts it on, ?q=low forces low quality, ?nofx turns the post effects off, ?fps shows the frame rate,
   ?test keeps the drawing buffer for screenshots. */
async function boot() {
  setLoad(0.05); await nextFrame();
  R.init(); setLoad(0.15, 'Painting the walls…'); await nextFrame();
  BEDROOM.build(); setLoad(0.35, 'Hanging the tapestries…'); await nextFrame();
  THRONE.build(); setLoad(0.55, 'Lighting the hall…'); await nextFrame();
  setLoad(0.6, 'Waking the court…'); await CAST.build();
  SCENE.initInput();
  const K = SCENE.player; if (G.flags.crown) K.crownMesh.visible = true;
  const start = G.flags.room === 'throne' ? 'throne' : 'bedroom';
  if (start === 'throne') { K.crownMesh.visible = true; BEDROOM.crownCard.visible = BEDROOM.crownGlow.visible = false; }
  SCENE.enter(start, { x: G.flags.x !== undefined ? +G.flags.x : start === 'throne' ? THRONE.ENTRY : -1.6, face: 1 });
  SCENE.update(0.016); SCENE.room.update(0, 0.016);
  R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame(); SCENE.render();
  setLoad(1);
  $('boot').style.opacity = '0'; setTimeout(() => { $('boot').hidden = true; }, 900);
  $('fade').classList.add('off');
  if (G.flags.fps) { const f = document.createElement('div'); f.id = 'fps'; $('stage').appendChild(f); G.fpsEl = f; }
  let last = performance.now(), acc = 0, n = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const ms = now - last, dt = Math.min(ms / 1000, 0.05); last = now;
    if (G.paused) return;
    G.frame++;
    if (G.flags.test) { G.acc = Math.min((G.acc || 0) + ms / 1000, 0.5); while (G.acc >= 1 / 60) { G.acc -= 1 / 60; G.t += 1 / 60; SCENE.update(1 / 60); SCENE.room.update(G.t, 1 / 60); } }   // headless: keep game time = real time
    else { G.t += dt; SCENE.update(dt); SCENE.room.update(G.t, dt); }
    SCENE.render();
    if (G.frame > 30) SCENE.perf(ms);
    if (G.fpsEl) { acc += ms; n++; if (acc > 500) { G.fpsEl.textContent = (1000 * n / acc).toFixed(0) + ' fps · ' + R.bw + '×' + R.bh + ' · ' + R.q; acc = 0; n = 0; } }
  };
  requestAnimationFrame(loop);
  setTimeout(() => { window.__ready = true; }, 300);
}
boot().catch(fail);
