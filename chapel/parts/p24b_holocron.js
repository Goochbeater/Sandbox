/* HOLOCRONS — three hidden Sith holocrons per level. Each one found raises Maul's health and Force for good. */
const HOLOCRON = { geo: null };
HOLOCRON.LORE = {
  works: ['The Rule of Two: one Master to hold the power, one apprentice to crave it. Never more.', 'A thousand years ago Darth Bane let the old Sith Order burn, so that two could survive in secret.', 'Maul was taken from Dathomir as an infant. Of the Nightsisters he remembers nothing — only his Master.'],
  rooftops: ['Anger is a weapon. The Jedi call it weakness because they fear what it can do.', 'The Senate Guard wear blue for the Republic. Their pikes are ceremony; their blasters are not.', 'Sidious trained his apprentice for years in places no Jedi would ever think to look.'],
  blacksun: ['Hath Monchar, a Neimoidian, tried to sell the Naboo plan. Greed is a short road.', 'Darsha Assant was one trial from Knighthood. Her Master sent her into the underlevels alone.', 'Sidious does not forgive those who learn his plans. He sends the one who never fails.'],
  dunes: ['The blockade of Naboo was only ever a pretext. The prize is the Senate.', 'The Scimitar hides behind stolen cloaking technology — a gift from Sidious to his hunter.', 'DRK-1 probe droids hunt in threes: silent eyes that never sleep.'],
  canyon: ['The Jundland Wastes swallow travellers whole. The Tusken Raiders see to what is left.', 'Krayt dragons rule Tatooine. Even their bones warn others away.', 'A Jedi Master and his apprentice fight as one mind. Separate them.'],
  hangar: ['Qui-Gon Jinn defies his own Council. Even the Jedi do not fully trust him.', 'The Jedi have not faced a Sith in a thousand years. They have forgotten how.', 'The Gungan Grand Army fights with electropoles, energy shields and boomas — plasma balls hurled from a cesta.'],
  generator: ['The plasma generators beneath Theed power the palace and every fighter in the hangar.', 'Maul\u2019s markings are a Dathomirian rite — each line a pledge written in pain.', 'Obi-Wan Kenobi: a Padawan, proud and impulsive. The kind who never lets go.'],
  pit: ['The laser gates hold back the plasma in a rhythm. Patience is also a weapon.', 'Dark Side rage is a door. Walk through it and pain becomes fuel.', 'At last we will reveal ourselves to the Jedi. At last we will have revenge.'],
};
HOLOCRON.count = () => Object.keys(GAME.save.holo || {}).length;
HOLOCRON.apply = function () {
  const n = HOLOCRON.count();
  if (PLAYER.a) { const was = PLAYER.a.hpMax; PLAYER.a.hpMax = 100 + n * 3; PLAYER.a.hp += PLAYER.a.hpMax - was; }
  PLAYER.fpMax = 100 + n * 3;
};
HOLOCRON.place = function (L, list) {
  L.holos = [];
  list.forEach((p, i) => {
    const id = L.id + ':' + i, got = GAME.save.holo && GAME.save.holo[id];
    const g = new THREE.Group();
    if (!HOLOCRON.geo) { HOLOCRON.geo = new THREE.OctahedronGeometry(0.18, 0); HOLOCRON.geo.scale(1, 1.25, 1); }
    const core = new THREE.Mesh(HOLOCRON.geo, new THREE.MeshStandardMaterial({ color: 0x100204, emissive: 0xff1a0a, emissiveIntensity: got ? 0.3 : 2.4, metalness: 0.7, roughness: 0.2, transparent: !!got, opacity: got ? 0.35 : 1 }));
    const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.3, 0.2), wireframe: true, transparent: true, opacity: got ? 0.15 : 0.6, toneMapped: false }));
    g.add(core, cage); g.position.set(p[0], p[1] + 1.1, p[2]); LEVEL.add(g);
    const Ls = got ? null : R.addLight({ pos: g.position, col: new THREE.Color(1, 0.15, 0.08), i: 2.2, range: 5, prio: 1, on: true });
    L.holos.push({ id, g, got, Ls, core, cage });
  });
  L.updates.push((dt, t) => {
    const P = PLAYER.a;
    for (const h of L.holos) {
      h.g.rotation.y = t * 1.3; h.cage.rotation.x = t * 0.7; h.g.position.y += Math.sin(t * 2 + h.g.position.x) * 0.002;
      if (!h.got && P && P.alive && h.g.position.distanceTo(V3(P.x, P.y + 1.1, P.z)) < 1.4) {
        h.got = true; GAME.save.holo = GAME.save.holo || {}; GAME.save.holo[h.id] = true; GAME.store(); HOLOCRON.apply();
        if (h.Ls) R.removeLight(h.Ls); h.core.material.emissiveIntensity = 0.3; h.core.material.transparent = true; h.core.material.opacity = 0.3; h.cage.material.opacity = 0.12;
        HUD.toast('SITH HOLOCRON', HOLOCRON.count() + ' / 24', 2.6);
        const lore = HOLOCRON.LORE[L.id]; if (lore) HUD.sub('SITH HOLOCRON', lore[+h.id.split(':')[1]] || '', 6, 'sid'); FX.ring(h.g.position.clone().setY(P.y), [2, 0.3, 0.2], 2, 0.5); FX.spark(h.g.position, V3(0, 1, 0), 20, 3, [4, 1, 0.5]);
        P.hp = P.hpMax; PLAYER.fp = PLAYER.fpMax;
      }
    }
    HUD.el.holo.textContent = '◆ HOLOCRONS  ' + L.holos.filter((h) => h.got).length + '/' + L.holos.length + '   ·   ' + HOLOCRON.count() + '/24';
  });
};
