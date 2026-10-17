/* ============================================================================
   SPOREHEART — src/game.js : orchestrator / encounter state machine
   Boot: _boot.js imports three -> G.game.boot(THREE).
   States: title -> hub (free roam) -> bossIntro -> boss (3 forms) -> victory   (+ dead -> phase checkpoint)
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.CONF) throw new Error("game.js requires core.js");
  const clamp = G.util.clamp;

  let renderer = null, scene = null, camera = null;
  let raf = 0, last = 0, tSec = 0, running = false;
  let paused = false, started = false;
  let state = "boot";
  let boss = null;
  let timers = [];
  let fpsAcc = 0, fpsN = 0;
  let lockVec = null;
  let ctx = null;
  const START_POS = { x: 0, z: 36, facing: Math.PI };

  function after(sec, fn) { timers.push({ t: sec, fn }); }
  const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };

  /* ======================================================================
     BOOT
     ====================================================================== */
  function boot(THREE, opts) {
    opts = opts || {};
    G.THREE = THREE;
    lockVec = new THREE.Vector3();
    const vw = window.innerWidth || 1280, vh = window.innerHeight || 720;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(58, vw / vh, 0.1, 500);
    G.game.scene = scene; G.game.camera = camera;

    renderer = opts.renderer || new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false });
    renderer.autoClear = true;
    renderer.setPixelRatio(1);
    renderer.setSize(vw, vh, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.id = "gl";
    document.body.appendChild(renderer.domElement);

    G.assets.ensureShared();
    G.vfx.init(scene);
    G.debris.init(scene);
    G.combat.init(scene);
    G.world.init(scene);
    G.player.init(scene, camera);
    G.villains.init(scene);
    G.boss.init(scene);
    G.sfx.init();
    G.ui.init(document.body);
    G.render.init(renderer, scene, camera);

    ctx = { scene: scene, camera: camera, player: G.player, combat: G.combat, bus: G.bus, vfx: G.vfx, sfx: G.sfx, world: G.world, game: G.game };
    bindEvents();

    const wake = function () {
      window.removeEventListener("pointerdown", wake);
      try { G.sfx.ensure && G.sfx.ensure(); } catch (e) { /* ignore */ }
      if (state === "title") G.sfx.music("title");
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", function () { setTimeout(onResize, 150); });
    onResize();

    /* title screen: place Mira at the start and slowly orbit the village */
    G.player.reset(START_POS);
    G.input.setEnabled(false);
    state = "title";

    if (!opts.manual) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    console.log("[game] boot ok — SPOREHEART " + G.CONF.VERSION);
    return G.game;
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = (window.innerWidth || 1280) / (window.innerHeight || 720);
    camera.updateProjectionMatrix();
    G.render.resize();
  }

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dtRaw = clamp(((ts || 0) - last) / 1000, 0, 0.05);
    last = ts;
    tick(dtRaw);
  }

  /* ======================================================================
     EVENTS
     ====================================================================== */
  function bindEvents() {
    const bus = G.bus;
    bus.on("ui:start", startGame);
    bus.on("ui:restart", function () { try { location.reload(); } catch (e) { /* headless */ } });
    bus.on("ui:pause", function (d) { paused = !!(d && d.paused); });
    bus.on("ui:quality", function (d) { G.render.setQuality((d && d.q) || "auto"); });
    bus.on("ui:mute", function () { try { G.sfx.toggleMuted(); } catch (e) { /* ignore */ } });

    bus.on("boss:phase", onBossPhase);
    bus.on("boss:phaseStart", onBossPhaseStart);
    bus.on("boss:beast", function () { G.player.cam.distGoal = 11.5; G.player.cam.baseFov = 66; G.player.cam.pitchGoal = 0.36; });
    bus.on("boss:stagger", function () {
      G.ui.prompt("STRIKE — it's open!", 1.6);
      if (boss) { const p = boss.pos(); G.pickups.spawn(p.x, p.y + 1, p.z, "heal", 2); G.pickups.spawn(p.x, p.y + 1, p.z, "mana", 1); }
    });
    bus.on("boss:down", onBossDown);
    bus.on("assassin:adds", function () { G.ui.prompt("Spore imps skitter out of the poppies!", 2.5); });
    bus.on("player:dead", onPlayerDead);
    bus.on("shake", function (d) { G.vfx.shake((d && (d.amt != null ? d.amt : d.amount)) || 0.3); });
    bus.on("parry", function () { try { G.sfx.play("parry", { vol: 0.9 }); G.combat.hitstop(0.09); } catch (e) { /* ignore */ } });
    bus.on("breakable:burst", function () { G.stats.breaks++; });
    bus.on("companion:cast", function () { try { G.sfx.play("portal", { vol: 0.7 }); } catch (e) { /* ignore */ } });
    bus.on("kill", function () { G.input.haptic(30); });
    bus.on("imp:death", function (d) { if (d && d.pos) G.pickups.spawn(d.pos.x, d.pos.y, d.pos.z, Math.random() < 0.55 ? "heal" : "mana", 1); });
  }

  /* ======================================================================
     FLOW
     ====================================================================== */
  function startGame() {
    if (started) return;
    started = true;
    state = "hub";
    G.player.reset(START_POS);
    G.input.setEnabled(true);
    try { G.sfx.ensure && G.sfx.ensure(); } catch (e) { /* ignore */ }
    G.sfx.music("hub");
    G.ui.show("hud");
    G.ui.banner("MOREL HOLLOW", "the witch, the veil & the poppy beast", 3.2);
    after(1.2, function () { G.ui.hint("MOVE", "Left thumb runs. Drag the right side to look. JUMP twice, hold to glide.", 5.5); });
    after(7.4, function () { G.ui.hint("FIGHT", "STRIKE chains four hits — hold it to charge a slam. SPELL fires a bolt; hold it for a Nova.", 5.5); });
    after(13.6, function () { G.ui.hint("MOVEMENT TECH", "DASH has i-frames (and works in the air). JUMP off walls. WARP zips to targets and spore-pods. Bounce-caps launch you.", 6.5); });
    after(20.5, function () { G.ui.hint("ALLIES", "Tap the portraits mid-chain for link strikes. Call both within 3s for TRIPLE BLOOM.", 5.5); });
    after(3.8, function () { G.ui.prompt("Smash things, climb the caps — then head for the light in the town square", 4.5); });
    spawnVillageImps();
  }

  /* a few spore imps along the streets so the verbs get exercised before the duel */
  function spawnVillageImps() {
    const spots = [[4, 25], [-5, 20], [2, 14.5], [-3, 29.5], [21, 3], [27, -2], [-3.5, -20], [3.5, -26], [-2, -30]];
    for (let i = 0; i < spots.length; i++) {
      try { const r = G.villains.spawnImp({ x: spots[i][0], z: spots[i][1] }); r.ai.leash = 13; } catch (e) { console.warn("[game] imp spawn", e); }
    }
  }

  function flow() {
    if (state === "hub") {
      const pc = G.world.plazaCenter;
      if (dist2(G.player.x, G.player.z, pc.x, pc.z) < 9 * 9) triggerBoss();
    }
  }

  function triggerBoss() {
    state = "bossIntro";
    despawnVillains();
    if (G.world.setBeacon) G.world.setBeacon(false);
    G.input.setEnabled(false);
    G.player.hasInput = false;
    G.ui.letterbox(true);
    G.ui.banner("THE POPPIED VEIL", "an assassin smiles behind the petals", 3.0);
    G.sfx.music("boss");
    try { G.sfx.play("petal", { vol: 0.7 }); } catch (e) { /* ignore */ }
    boss = G.boss.spawn(ctx);
    boss.enter("spawn");
    const p = boss.pos();
    try { G.vfx.petals({ x: p.x, y: 1.4, z: p.z }); G.vfx.burst({ x: p.x, y: 1.2, z: p.z }, { count: 40, color: 0xe8333a, speed: 6, size: 0.45, life: 1.2, gravity: -1, spread: 1, tex: "petal" }); } catch (e) { /* ignore */ }
    boss.faceSnap();
    if (G.world.setArena) G.world.setArena("boss");
    G.player.cam.distGoal = 5.8; G.player.cam.baseFov = 58;
    after(3.1, function () {
      if (state !== "bossIntro") return;
      G.ui.letterbox(false);
      G.input.setEnabled(true);
      G.ui.showBoss(true);
      G.ui.setBoss(1, 1, "THE POPPIED VEIL");
      G.player.setLockTarget(boss.ent);
      state = "boss";
    });
  }

  function onBossPhaseStart(d) {
    /* player is briefly untouchable while the boss transforms */
    if (G.player.ent) G.combat.iframe(G.player.ent, d.n === 3 ? 4.5 : 2.5);
    G.ui.letterbox(true);
    G.input.setEnabled(false);
    if (d.n === 2) G.ui.banner("UNVEILED", "the coat falls — two blades now", 2.4);
    else G.ui.banner("THE POPPIED BEAST", "she becomes the field", 3.2);
  }

  function onBossPhase(d) {
    const n = d && (d.n || d.phase);
    G.ui.letterbox(false);
    G.input.setEnabled(true);
    G.ui.setBoss(boss ? boss.ent.hp / G.boss.total : 1, n, n === 3 ? "THE POPPIED BEAST" : "THE POPPIED VEIL");
    if (n === 2) { G.sfx.music("boss2"); G.player.cam.distGoal = 6.2; }
    if (n === 3) G.sfx.music("boss3");
    if (boss && boss.ent) G.player.setLockTarget(boss.ent);
  }

  function onBossDown() {
    if (state !== "boss") return;
    state = "victory";
    G.input.haptic([60, 40, 120]);
    after(3.4, function () {
      G.ui.showBoss(false); G.ui.setLock(0, 0, false);
      G.sfx.music("victory");
      G.ui.banner("SPOREHEART", "the hollow breathes again", 3.4);
      if (G.world.beastArena) G.world.beastArena(false);
      G.render.fx.boss = 0;
    });
    after(7.2, function () {
      G.input.setEnabled(false);
      G.ui.setEnd("The hollow breathes", "the Veil is cut down, the poppies bow, and Morel Hollow keeps its heart.");
      G.ui.show("victory");
    });
  }

  function onPlayerDead() {
    if (state === "dead" || state === "victory" || state === "title") return;
    const was = state;
    state = "dead";
    G.ui.showBoss(false); G.ui.setLock(0, 0, false);
    G.input.setEnabled(false);
    G.ui.fade(function () { resetToCheckpoint(was); }, 1.6);
  }

  function resetToCheckpoint(was) {
    try { G.vfx.reset(); G.debris.reset(); } catch (e) { /* ignore */ }
    despawnVillains();
    G.render.fx.hurt = 0;
    if ((was === "boss" || was === "bossIntro") && boss) {
      /* phase checkpoint: boss heals to the start of its current form, the plaza stays as it was */
      G.player.reset({ x: 0, z: 13, facing: Math.PI });
      boss.reset();
      G.ui.showBoss(true);
      G.ui.setBoss(boss.ent.hp / G.boss.total, boss.form, boss.form === 3 ? "THE POPPIED BEAST" : "THE POPPIED VEIL");
      G.player.setLockTarget(boss.ent);
      G.player.cam.distGoal = boss.form === 3 ? 11.5 : 5.8;
      G.ui.letterbox(false);
      state = "boss";
      after(0.8, function () { G.ui.prompt("Again — read the red telegraphs.", 3); });
    } else {
      G.player.reset(START_POS);
      state = "hub";
      after(0.8, function () { G.ui.prompt("Try again.", 2); });
    }
    G.input.setEnabled(true);
    G.ui.show("hud");
  }

  function despawnVillains() {
    const list = G.villains.active;
    for (let i = list.length - 1; i >= 0; i--) {
      const a = list[i];
      try { G.combat.unregister(a.entity); } catch (e) { /* ignore */ }
      try { if (a.ai) a.ai.gone = true; } catch (e) { /* ignore */ }
      if (a.root && a.root.parent) a.root.parent.remove(a.root);
    }
    list.length = 0;
  }

  /* ======================================================================
     PER-FRAME
     ====================================================================== */
  function updateBossBar() {
    if (boss && boss.ent && boss.ent.alive && state === "boss") G.ui.setBoss(clamp(boss.ent.hp / G.boss.total, 0, 1), boss.form, null);
  }

  function updateLockUI() {
    const t = G.player.lockTarget;
    if (t && t.object3D && lockVec && state !== "title") {
      lockVec.copy(t.object3D.position);
      lockVec.y += (t.height || 1.6) * 0.6;
      lockVec.project(camera);
      const vis = lockVec.z < 1 && lockVec.x > -1.1 && lockVec.x < 1.1 && lockVec.y > -1.1 && lockVec.y < 1.1 && t.object3D.visible !== false;
      G.ui.setLock((lockVec.x * 0.5 + 0.5) * window.innerWidth, (-lockVec.y * 0.5 + 0.5) * window.innerHeight, vis);
    } else G.ui.setLock(0, 0, false);
  }

  /* title: a slow cinematic orbit around the village while the menu is up */
  function titleCam() {
    const t = tSec * 0.12;
    camera.position.set(Math.sin(t) * 9, 3.2 + Math.sin(t * 1.7) * 0.4, 30 + Math.cos(t) * 4);
    camera.lookAt(0, 1.8, 20);
  }

  function tick(dtRaw) {
    if (!renderer) return;
    let scale = clamp(G.timeScale == null ? 1 : G.timeScale, 0.05, 1.2);
    if (G.hitstopTimer > 0) { G.hitstopTimer = Math.max(0, G.hitstopTimer - dtRaw); scale *= 0.04; }
    const dt = paused ? 0 : dtRaw * scale;
    tSec += dt;
    if (started && state !== "victory") G.stats.playTime += dt;

    for (let i = timers.length - 1; i >= 0; i--) {
      timers[i].t -= dtRaw;
      if (timers[i].t <= 0) { const fn = timers[i].fn; timers.splice(i, 1); try { fn(); } catch (e) { console.error("[game] timer", e); } }
    }

    if (dt > 0) {
      G.world.update(dt, tSec);
      G.debris.update(dt);
      G.player.update(dt);
      G.combat.update(dt);
      G.villains.update(dt, ctx);
      G.boss.update(dt);
      G.vfx.update(dtRaw, camera);
      try { flow(); } catch (e) { console.error("[game] flow", e); }
      if (state === "title") titleCam();
    }
    G.ui.update(dtRaw, camera);
    updateBossBar();
    updateLockUI();
    if (dt > 0) G.input.postUpdate();

    G.render.frame(dtRaw);

    fpsAcc += dtRaw; fpsN++;
    if (fpsAcc >= 0.5) { G.stats.fps = Math.round(fpsN / fpsAcc); G.stats.ms = +(dtRaw * 1000).toFixed(1); fpsAcc = 0; fpsN = 0; }
    if (renderer.info && renderer.info.render) { G.stats.drawCalls = renderer.info.render.calls; G.stats.tris = renderer.info.render.triangles; }
  }

  G.game = {
    boot: boot, tick: tick, scene: null, camera: null,
    get state() { return state; },
    get paused() { return paused; },
    get boss() { return boss; },
    /* debug / test hook */
    debugStartBoss: function () { if (!started) startGame(); triggerBoss(); }
  };
})();
