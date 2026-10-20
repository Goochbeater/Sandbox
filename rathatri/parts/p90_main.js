/* MAIN — boot, loop, debug handle. */
MG.studioEnv = function (tint) {
  const sc = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(tint ? tint[0] : 0x20242c) }, bot: { value: new THREE.Color(tint ? tint[1] : 0x0a0808) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, bot; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.3, 0.8, vP.y)), 1.0); }' }));
  sc.add(sky);
  const box = (c, i, p, s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s[0], s[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 1.5, 0); sc.add(m); };
  box(0xffe8d8, 6, [6, 8, 6], [6, 3]); box(0xff3020, 3, [-8, 3, -6], [2, 8]); box(0xb0c8ff, 2.5, [7, 4, -8], [3, 6]);
  return sc;
};
MG.view = async function () {
  MG.state = 'view';
  const T = await CHAR.buildMaul(MG.loadUI);
  const M = new CharInst(T);
  R.scene.add(M.root); if (M.cloth) M.cloth.addTo(R.scene);
  MG.viewChar = M;
  const S = new Saber('staff', 'red'); S.addTo(R.scene); MG.viewSaber = S; S.ignite(undefined, true); S.ign = [1, 1];
  R.setEnvFromScene(MG.studioEnv());
  R.scene.background = new THREE.Color(0x050404);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.4, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; R.scene.add(floor);
  R.setSun(new THREE.Vector3(0.5, 0.9, 0.7), 0xfff0e6, 2.4, 0x445066, 0x100808, 0.5);
  R.updateShadow(V3(0, 1, 0));
  MG.cast = [];
  if (MG.flags.cast) {
    const names = String(MG.flags.cast).split(',');
    await CAST.need(names, (p) => MG.loadUI(0.5 + p * 0.45, 'Casting'));
    names.forEach((n, i) => {
      const I = new CharInst(CHAR.T[n]); R.scene.add(I.root); if (I.cloth) I.cloth.addTo(R.scene);
      I.root.position.set((i + 1) * 0.95 * (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2) / ((i + 1) || 1), 0, -0.4);
      const jedi = n === 'quigon' || n === 'obiwan' || n === 'darsha';
      let prop;
      if (jedi) { const sb = new Saber(n, n === 'quigon' ? 'green' : 'blue'); sb.addTo(R.scene); sb.ignite(undefined, true); sb.ign = [1]; prop = sb.group; I.saber = sb; }
      else if (n === 'enforcer' || n === 'tusken' || n === 'gungan' || n === 'senate') prop = CAST.staff(n === 'senate' ? 'pike' : n === 'tusken' ? 'gaffi' : 'electro');
      else if (n !== 'garyn') prop = CAST.rifle();
      I.prop = prop || null; I.symProp = n === 'enforcer' || n === 'tusken' || n === 'gungan' || n === 'senate';
      MG.cast.push({ I, n, jedi, pose: new Pose() });
    });
  }
  MG.viewYaw = 0; MG.viewDist = 3.4; MG.viewY = 1.1; MG.viewT = 0; MG.viewClip = MG.flags.clip || 'guard'; MG.viewPose = new Pose(); MG.viewPose2 = new Pose(); M.prop = S.group; M.symProp = true; MOV.init();
  MG.viewUpdate = (dt) => {
    MG.viewYaw += IN.A.lx * 1.2 + (IN.keys.KeyA ? -dt : 0) + (IN.keys.KeyD ? dt : 0);
    if (IN.keys.KeyW) MG.viewDist = Math.max(0.3, MG.viewDist - dt * 1.5); if (IN.keys.KeyS) MG.viewDist += dt * 1.5;
    if (IN.keys.KeyQ) MG.viewY += dt * 0.6; if (IN.keys.KeyE) MG.viewY -= dt * 0.6;
    const c = R.camera; c.position.set(Math.sin(MG.viewYaw) * MG.viewDist, MG.viewY + 0.1, Math.cos(MG.viewYaw) * MG.viewDist); c.lookAt(0, MG.viewY, 0);
    MG.viewT += dt;
    const clip = MOV.maul[MG.viewClip] || MOV.maul.guard;
    const tt = clip.loop ? MG.viewT % clip.dur : Math.min(MG.viewT, clip.dur);
    ANIM.sample(clip, tt, MG.viewPose);
    if (MG.viewLoco) ANIM.loco(MG.viewPose, MG.viewLoco, 0, 1, (MG.viewT * MG.viewLoco / 1.4) % 1, MG.viewPose2); else MG.viewPose2.copy(MG.viewPose);
    ANIM.apply(M, MG.viewPose2, { groundY: () => 0 });
    for (const c of MG.cast) {
      const cl = c.jedi ? MOV.jedi.guard : (c.n === 'enforcer' || c.n === 'tusken' || c.n === 'gungan' || c.n === 'senate') ? MOV.melee.idle : c.n === 'garyn' ? MOV.maul.idleCalm : MOV.trooper.idle;
      ANIM.sample(cl, MG.viewT % cl.dur, c.pose);

      if (c.n === 'garyn') { c.pose.gL = c.pose.gR = 0; }
      ANIM.apply(c.I, c.pose, { groundY: () => 0 }); if (c.I.saber) c.I.saber.update(dt, MG.rt); if (c.I.cloth) c.I.cloth.step(dt);
    }
    S.update(dt, MG.rt); S.sampleTrails(MG.rt, 1);
    if (M.cloth) M.cloth.step(dt);
  };
};
MG.frameUpdate = function (dt) {
  if (MG.state === 'view' && MG.viewUpdate) MG.viewUpdate(dt);
  else if (MG.gameUpdate) MG.gameUpdate(dt);
};
MG.loop = function (now) {
  requestAnimationFrame(MG.loop);
  if (!MG.ready || MG.manual) return;
  const t = now / 1000; let dt = MG._last ? t - MG._last : 1 / 60; MG._last = t; dt = Math.min(dt, 0.1);
  MG.tick(dt);
};
MG.tick = function (dt) {
  MG.rdt = dt; MG.rt += dt;
  IN.poll();
  MG.frameUpdate(dt);
  MG.runTimers();
  IN.endFrame();
  if (!MG.flags.norender) R.render(dt);   // ?norender: logic-only (headless tests on software GL)
  MG.frame++;
  if (MG.dbg && MG.frame % 10 === 0) MG.$('dbg').textContent = `fps ${R.fpsEMA.toFixed(0)}  scale ${R.dynScale.toFixed(2)}  calls ${R.calls}  tris ${(R.tris / 1000).toFixed(0)}k`;
};
MG.boot = async function () {
  try {
    INTRO.start();
    R.init(); IN.init();
    await MG.loadUI(0.02, 'Awakening');
    if (MG.dbg) MG.$('dbg').style.display = 'block';
    HUD.init(); GAME.load(); FX.init();
    if (MG.flags.view) await MG.view();
    else {
      await HERO.boot((p) => MG.loadUI(0.05 + p * 0.5, 'Awakening'));
      MOV.init();
      if (MG.flags.diff) MG.difficulty = MG.flags.diff;
      if (MG.flags.play) { MG.skipIntro = !!MG.flags.nointro; await LEVEL.load(MG.flags.play, { cp: MG.flags.cp || 0, progress: (p) => MG.loadUI(0.55 + p * 0.4, 'Building the world') }); MG.skipIntro = false; GAME.levelStart = { t: 0, kills: 0 }; if (PLAYER.state !== 'cine') HUD.show(true); MG.state = MG.state === 'loading' ? 'play' : MG.state; }
      else { await MENU.titleScene(); MENU.open('title'); }
    }
    MG.$('boot').style.opacity = 0; setTimeout(() => { MG.$('boot').style.display = 'none'; }, 1300);
    // menu keys stay inert while the intro plays
    if (INTRO.on) { const onKey = MG.onKey; MG.onKey = (c) => { if (!INTRO.on && performance.now() - (INTRO.skipAt || 0) > 450 && onKey) onKey(c); }; const chk = setInterval(() => { if (!INTRO.on && performance.now() - (INTRO.skipAt || 0) > 500) { if (MG.onKey && MENU.cur) MG.onKey = MENU.cur ? MG.onKey : onKey; clearInterval(chk); } }, 100); }
    MG.ready = true;
    requestAnimationFrame(MG.loop);
    if (MG.test) setTimeout(() => TEST.run(), 200);
  } catch (e) { MG.fail(e); }
};
window.__mg = {
  shot: (q) => R.shot(q),
  step: (n, dt) => { MG.manual = true; for (let i = 0; i < (n || 1); i++) MG.tick(dt || 1 / 60); return MG.frame; },
  info: () => ({ state: MG.state, frame: MG.frame, errors: MG.errors.slice(0, 20), calls: R.calls, tris: R.tris, fps: R.fpsEMA, stats: CHAR.T.rath3 && CHAR.T.rath3.stats }),
  get R() { return R; }, get MG() { return MG; }, get CHAR() { return CHAR; },
};
window.addEventListener('load', () => MG.boot());
