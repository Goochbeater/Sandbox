// beast close-ups under neutral light. env: TYPES (JSON list) or TYPE; VIEWS=[[yaw,distK,heightK,lookYK,fov],...] distances scaled by the species size
module.exports = async (H) => {
  await H.step(20); const types = JSON.parse(process.env.TYPES || JSON.stringify([process.env.TYPE || 'zakkeg']));
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; e.root.visible = false; } PLAYER.state = 'cine'; PLAYER.a.x = 60; PLAYER.a.z = 60; R.setSun(new THREE.Vector3(-0.6, 0.75, 0.5), 0xfff0e0, 3.0, 0x8899aa, 0x403830, 1.0); R.scene.fog = null; });
  const V = JSON.parse(process.env.VIEWS || '[[0.75,2.7,1.0,0.6,40],[1.57,2.9,0.75,0.55,40]]');
  for (const t of types) {
    await H.eval((t) => { if (MG.look) { MG.look.root.visible = false; MG.look.hidden = true; } const e = ENEMY.spawn(t, 0, 4, { y: 0 }); e.passive = true; e.yaw = 0; MG.look = e; }, t);
    await H.step(20);
    console.log('BAKE', t, JSON.stringify(await H.eval((t) => { const K = BEAST.cache[ENEMY.TYPES[t].beast.model]; return K ? { nt: K.nt, bones: K.B.length } : null; }, t)));
    let i = 0;
    for (const v of V) { await H.eval((v) => { const e = MG.look, s = e.S.size; CAM.cine = { t: 0, dur: 99, hold: true, fov: v[4], fn: () => ({ pos: V3(e.x + Math.sin(v[0]) * v[1] * s, v[2] * s, e.z + Math.cos(v[0]) * v[1] * s), look: V3(e.x, v[3] * s, e.z) }) }; }, v); await H.step(2); await H.shot(t + '_' + (i++)); }
  }
};
