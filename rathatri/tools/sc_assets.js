// Scenario: ASSET contact sheet. Boots test_arena, preloads every embedded texture, shows each one as a labelled quad
// (top two rows: raw texture; bottom row: ASSET.mat lit by the arena), prints the preload result and screenshots.
// Run: BUILD=/tmp/assets/game.html W=1280 H=720 NAME=assets_sheet node tools/shot.js tools/sc_assets.js /tmp/assets/out "?play=test_arena&nointro"
module.exports = async (H) => {
  await H.step(30, 1 / 30);
  const res = await H.eval(async () => {
    const prog = [];
    const r = await ASSET.preload(null, (p) => prog.push(p));
    // a name that is not embedded must give a grey 1x1 and one warning, not a throw
    const miss = ASSET.tex('no_such_asset'), miss2 = ASSET.tex('no_such_asset');
    return { names: ASSET.names(), loaded: r.loaded, missing: r.missing, progressSteps: prog.length, progressEnd: prog[prog.length - 1],
      missImg: [miss.image.width, miss.image.height], sameStandIn: miss === miss2 };
  });
  console.log('ASSET preload', JSON.stringify(res));
  const sheet = await H.eval(() => {
    for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; }
    const names = ASSET.names().filter((n) => ASSET.has(n));
    const rawRows = [names.slice(0, 7), names.slice(7)];
    const lit = ['ground_lichen', 'rock_strata', 'hull_plate_rust', 'rock_dark', 'floor_tiles_grey', 'planks_dark', 'leather_brown'].filter((n) => ASSET.has(n));
    const label = (text) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, 512, 64); x.fillStyle = '#e8d8b8'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText(text, 256, 44);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.33), new THREE.MeshBasicMaterial({ map: t }));
    };
    const quad = (mat, x, y, name) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), mat); m.position.set(x, y, 6); LEVEL.add(m);
      const l = label(name); l.position.set(x, y + 1.45, 6); LEVEL.add(l);
    };
    const ys = [8.6, 5.0];
    rawRows.forEach((row, r) => row.forEach((n, i) => {
      const alpha = n === 'foliage_branch';
      quad(new THREE.MeshBasicMaterial({ map: ASSET.tex(n), side: THREE.DoubleSide, transparent: alpha, alphaTest: alpha ? 0.3 : 0 }), -9 + i * 3, ys[r], n);
    }));
    lit.forEach((n, i) => quad(ASSET.mat(n, { repeat: [1, 1] }), -9 + i * 3, 1.5, 'mat ' + n));
    // camera held by the cinematic hook (as sc_look does), so the sheet is framed the same every run
    CAM.cine = { t: 0, dur: 99, hold: true, fov: 60, fn: () => ({ pos: V3(0, 5.1, 19), look: V3(0, 5.1, 6) }) };
    return { raw: rawRows.flat().length, lit: lit.length };
  });
  console.log('sheet', JSON.stringify(sheet));
  await H.step(4, 1 / 30);
  await H.pshot(process.env.NAME || 'assets_sheet');
};
