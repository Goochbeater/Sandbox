/* CUTSCENE — plays a list of shots in the engine itself: each shot picks a room, arranges it (setup), flies the camera
   from one pose to another, shows a caption under the picture, and fades to the next. Tap or press E to skip.
     await CUT.play([{ room, at: { x }, setup(room), cam: { from: [x, y, z, lookX, lookY, lookZ, fov], to: [...] },
                       dur, caption, music, ambience, sfx: [[name, delay, opts]], cut (no fade into this shot) }, …])
   While a cutscene runs, SCENE hands it the camera (CUT.cam) and hides markers, hint and the pause button. Setting
   CUT.cam = { a: CUT.pose(p0), b: CUT.pose(p1), t: 0, dur, loop: true } outside a cutscene drifts the camera between
   two poses for as long as it's set (the title screen does this). */
const CUT = { cam: null, playing: false, skip: false };
CUT.ease = (u) => u * u * (3 - 2 * u);
CUT.pose = function (p) { return { x: p[0], y: p[1], z: p[2], lx: p[3], ly: p[4], lz: p[5], fov: p[6] || 19 }; };
CUT.play = async function (shots, o) {
  o = o || {}; CUT.playing = true; CUT.skip = false; SCENE.lock++; document.body.classList.add('cine');
  const cap = $('cutCap'), fade = $('fade');
  const wait = (ms) => new Promise((res) => { const t0 = performance.now(); const tick = () => { if (CUT.skip || performance.now() - t0 >= ms) res(); else setTimeout(tick, 50); }; tick(); });
  for (let i = 0; i < shots.length && !CUT.skip; i++) {
    const s = shots[i];
    if (!s.cut) { fade.classList.remove('off'); await wait(i === 0 && o.fromBlack ? 0 : 750); }
    if (s.room && (!SCENE.room || SCENE.room.id !== s.room)) { SCENE.enter(s.room, s.at || {}); R.r.compile(R.scene, R.cam); }
    if (s.setup) s.setup(SCENE.room);
    if (s.music) AUDIO.playMusic(s.music, s.musicFade || 2.5);
    if (s.ambience) AUDIO.ambience(s.ambience);
    if (s.acoustics) AUDIO.acoustics(s.acoustics);
    for (const [n, d, op] of s.sfx || []) setTimeout(() => { if (!CUT.skip) AUDIO.sfx(n, op); }, d * 1000);
    CUT.cam = { a: CUT.pose(s.cam.from), b: CUT.pose(s.cam.to || s.cam.from), t: 0, dur: s.dur, focus: s.focus };
    SCENE.update(0); SCENE.render(); await nextFrame();
    fade.classList.add('off');
    if (s.caption) { cap.textContent = s.caption; setTimeout(() => { if (!CUT.skip && CUT.cam) cap.classList.add('on'); }, 700); }
    await wait(Math.max(0, s.dur * 1000 - 900));
    cap.classList.remove('on'); await wait(500);
    if (s.done) s.done(SCENE.room);
  }
  fade.classList.remove('off'); await new Promise((r) => setTimeout(r, 800));
  cap.classList.remove('on'); CUT.cam = null; CUT.playing = false; document.body.classList.remove('cine'); SCENE.lock--;
  if (o.then) await o.then();
};
/* SCENE.update asks this for the camera while a cutscene runs */
CUT.apply = function (dt) {
  const C = CUT.cam; if (!C) return false;
  C.t = Math.min(C.dur, C.t + dt); if (C.loop && C.t >= C.dur) { const q = C.a; C.a = C.b; C.b = q; C.t = 0; }   // loop: drift there and back (title screens)
  const u = CUT.ease(C.dur ? C.t / C.dur : 1), a = C.a, b = C.b;
  R.cam.position.set(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u)); R.cam.lookAt(lerp(a.lx, b.lx, u), lerp(a.ly, b.ly, u), lerp(a.lz, b.lz, u));
  const fov = lerp(a.fov, b.fov, u) * R.fovK; if (Math.abs(R.cam.fov - fov) > 1e-3) { R.cam.fov = fov; R.cam.updateProjectionMatrix(); }
  R.dofU.uFocus.value = C.focus || R.cam.position.distanceTo(new THREE.Vector3(lerp(a.lx, b.lx, u), lerp(a.ly, b.ly, u), lerp(a.lz, b.lz, u)));
  return true;
};
