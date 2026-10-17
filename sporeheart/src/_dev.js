/* DEV ONLY — gallery/inspection helpers (excluded from release build) */
(function () {
  "use strict";
  const G = window.G;
  let stage = null, cur = null;
  G.dev = {
    ready() { return !!(G.THREE && G.game && G.game.scene); },
    prep() {
      const THREE = G.THREE, scene = G.game.scene;
      G.bus.emit("ui:pause", { paused: true });
      try { G.ui.show("none"); } catch (e) {}
      document.querySelectorAll("body > div").forEach((d) => { if (d.id !== "boot") d.style.display = "none"; });
      if (!stage) {
        stage = new THREE.Group(); stage.position.set(0, 600, 0); scene.add(stage);
        const hemi = new THREE.HemisphereLight(0xdff5e8, 0x2a4a40, 1.1); stage.add(hemi);
        const key = new THREE.DirectionalLight(0xfff2dd, 1.6); key.position.set(3, 6, 4); key.target.position.set(0, 0, 0); stage.add(key); stage.add(key.target);
        const rim = new THREE.DirectionalLight(0x9fe8ff, 0.8); rim.position.set(-4, 3, -4); stage.add(rim);
        const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0x3f7f69 }));
        floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; stage.add(floor);
      }
      scene.background = new THREE.Color(0x4f9a82);
      scene.fog = null;
    },
    show(obj, o) {
      o = o || {};
      this.prep();
      if (cur) { stage.remove(cur); cur = null; }
      const root = obj.root || obj;
      root.position.set(0, 0, 0);
      stage.add(root); cur = root;
      if (obj.anim && o.clip) { obj.anim.play(o.clip, { fade: 0 }); for (let i = 0; i < (o.steps || 6); i++) obj.anim.update(o.t || 0.05); }
      else if (obj.anim) { obj.anim.update(0.016); }
      const cam = G.game.camera;
      const d = o.dist || 4, yaw = o.yaw || 0, pit = o.pitch || 0.05, ly = o.lookY === undefined ? 0.8 : o.lookY;
      cam.fov = o.fov || 30; cam.updateProjectionMatrix();
      cam.position.set(Math.sin(yaw) * Math.cos(pit) * d, 600 + ly + Math.sin(pit) * d, Math.cos(yaw) * Math.cos(pit) * d);
      cam.lookAt(0, 600 + ly, 0);
      G.dev.lock = true;
    }
  };
})();
