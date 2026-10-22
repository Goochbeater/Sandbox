/* MAIN — boot, then the frame loop. Rooms are built the first time they're entered, so boot only paints the title.
   URL options: ?room=<id> skips the title and starts there (bedroom, throne, study, garden, yard, exterior),
   ?x=<metres> moves the king, ?crown puts it on, ?intro plays the opening at once, ?q=low forces low quality,
   ?nofx turns the post effects off, ?fps shows the frame rate, ?test keeps time fixed-step for headless screenshots. */
async function boot() {
  setLoad(0.05); await nextFrame();
  R.init(); setLoad(0.2, 'Waking the court…'); await nextFrame();
  await CAST.build();
  SCENE.initInput(); TITLE.init(); WORLD.init(); NIGHT.init();
  setLoad(0.9, 'Raising the storm…'); await nextFrame();
  const K = SCENE.player, f = G.flags;
  if (f.room && SCENE.rooms[f.room]) {   // straight into a room, for testing
    if (f.crown || f.room === 'throne') K.crownMesh.visible = true;
    const entry = { throne: THRONE.ENTRY, bedroom: -1.6 }[f.room];
    SCENE.enter(f.room, { x: f.x !== undefined ? +f.x : entry !== undefined ? entry : 0, face: 1, sound: true });
  } else TITLE.show();
  SCENE.update(0.016); SCENE.room.update(0, 0.016);
  R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame(); SCENE.render();
  setLoad(1);
  $('boot').style.opacity = '0'; setTimeout(() => { $('boot').hidden = true; }, 900);
  $('fade').classList.add('off');
  if (f.intro) { $('title').classList.add('ready'); TITLE.newGame(); }
  if (f.fps) { const el = document.createElement('div'); el.id = 'fps'; $('stage').appendChild(el); G.fpsEl = el; }
  let last = performance.now(), acc = 0, n = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const ms = now - last, dt = Math.min(ms / 1000, 0.05); last = now;
    if (G.paused) return;
    G.frame++;
    if (f.test) { G.acc = Math.min((G.acc || 0) + ms / 1000, 0.5); while (G.acc >= 1 / 60) { G.acc -= 1 / 60; G.t += 1 / 60; SCENE.update(1 / 60); SCENE.room.update(G.t, 1 / 60); } }   // headless: keep game time = real time
    else { G.t += dt; SCENE.update(dt); SCENE.room.update(G.t, dt); }
    SCENE.render();
    if (G.frame > 30) SCENE.perf(ms);
    if (G.fpsEl) { acc += ms; n++; if (acc > 500) { G.fpsEl.textContent = (1000 * n / acc).toFixed(0) + ' fps · ' + R.bw + '×' + R.bh + ' · ' + R.q; acc = 0; n = 0; } }
  };
  requestAnimationFrame(loop);
  setTimeout(() => { window.__ready = true; }, 300);
}
boot().catch(fail);
