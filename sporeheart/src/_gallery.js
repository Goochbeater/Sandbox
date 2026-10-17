/* DEV ONLY — isolated character gallery (no world / ui / game). Used by tools/gallery.mjs.
   Renders through the real toon + outline + bloom pipeline so what you see is what the game shows. */
(function () {
  "use strict";
  const G = window.G;
  const GL = (G.gallery = {});
  let renderer, scene, camera, stage, cur = null, curObj = null, clock = 0, frozen = false;
  GL.boot = function (THREE) {
    G.THREE = THREE; G.util.initTmp();
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.domElement.id = "gl"; document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3f8f7e);
    scene.fog = new THREE.FogExp2(0x3f8f7e, 0.012);
    camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 400);
    G.game = { scene: scene, camera: camera };
    scene.add(new THREE.HemisphereLight(0x7fd3bd, 0x24402f, 1.05));
    const key = new THREE.DirectionalLight(0xffe4bc, 2.6); key.position.set(6, 12, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
    key.shadow.bias = -0.0007; key.shadow.normalBias = 0.035; scene.add(key);
    const back = new THREE.DirectionalLight(0x59d8e8, 0.7); back.position.set(-6, 4, -8); scene.add(back);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshToonMaterial({ color: 0x4f9a7c, gradientMap: G.assets.tex.toonGradient() }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    stage = new THREE.Group(); scene.add(stage);
    G.render.init(renderer, scene, camera);
    G.render.setQuality("high");
    let last = performance.now();
    (function loop(ts) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      if (curObj && curObj.anim && !frozen) curObj.anim.update(dt, { speed: 0 });
      G.render.frame(dt);
    })(last);
    document.getElementById("boot") && document.getElementById("boot").remove();
    GL.ready = true;
  };
  /* show(builtObject, {yaw, pitch, dist, lookY, fov, clip, t, base, scale}) */
  GL.show = function (obj, o) {
    o = o || {};
    if (cur) stage.remove(cur);
    cur = obj.root; curObj = obj; stage.add(cur);
    cur.position.set(o.x || 0, 0, o.z || 0); cur.rotation.y = o.face || 0;
    if (o.scale) cur.scale.setScalar(o.scale);
    frozen = false;
    if (obj.anim) {
      if (o.base) obj.anim.setBase(o.base);
      if (o.clip) { obj.anim.play(o.clip, { fade: 0, loop: o.loop !== false }); }
      let t = o.t === undefined ? 0.02 : o.t;
      const step = 1 / 60; for (let a = 0; a < t; a += step) obj.anim.update(step, { speed: o.speed || 0 });
      if (o.freeze !== false) { frozen = true; obj.anim.update(0.0001, { speed: o.speed || 0 }); }
    }
    const d = o.dist || 4, yaw = o.yaw || 0, pit = o.pitch || 0.05, ly = o.lookY === undefined ? 0.9 : o.lookY;
    camera.fov = o.fov || 30; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    camera.position.set(Math.sin(yaw) * Math.cos(pit) * d, ly + Math.sin(pit) * d, Math.cos(yaw) * Math.cos(pit) * d);
    camera.lookAt(0, ly, 0);
  };
})();
