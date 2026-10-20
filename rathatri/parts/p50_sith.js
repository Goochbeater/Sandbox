/* RATHATRI — the hero. Three visual stages on the Quaternius `rmale` body (CC0): I Slave 426 (pit rags, scarred, a shiv), III Apprentice (black ranger leathers, bone-hilt
   crimson saber), V Hidden Lord (leathers + long coat panels + one pauldron). The moveset is MOV.maul's one-handed sword-mocap set (a1–a3 / lunge are mocap, a4 spin and a5 slam
   keyed); only the prop differs. A level picks the stage with `hero: 1|3|5` in its LEVEL.def, else it follows the act (HERO.stageFor). */
const HERO = { NAMES: { 1: 'rath1', 3: 'rath3', 5: 'rath5' }, stage: 3 };
HERO.stageFor = function (def) {
  if (def && def.hero) return def.hero;
  const act = (SAVE.d && SAVE.d.act) || 1; return act >= 4 ? 5 : 3;
};
HERO.name = (def) => HERO.NAMES[HERO.stageFor(def)];
HERO.boot = async function (progress) {   // the three stages are built on demand per level; boot loads the Quaternius pack and the default stage
  await QB.load();
  await CAST.need([HERO.name(null)], progress);
};
/* ---- cast entries: SPECS (fallback body + skin), QC (gate), QO (modelled outfit + grades) */
(function () {
  const base = CAST.SPECS.quigon, g = (rules, sat, val, tint) => ({ rules, sat, val, tint }), R = (p, gr, o) => ['ranger', p, gr, o], Pz = (p, gr, o) => ['peasant', p, gr, o];
  const mk = (name, over) => { CAST.SPECS[name] = Object.assign({}, base, { name, eyes: 'brown', cloth: undefined, beard: false, grey: false, braid: false }, over); };
  mk('rath1', { height: 0.99, shoulders: 0.93, skin: { tone: 0x9a6b4f, brow: 0x140d09, stubble: 0 }, hair: 'short', hairCol: 0x140d09 });
  mk('rath3', { height: 1.01, shoulders: 1.0, skin: { tone: 0x9a6b4f, brow: 0x140d09, stubble: 0 }, hair: 'short', hairCol: 0x140d09 });
  mk('rath5', { height: 1.03, shoulders: 1.03, skin: { tone: 0x946548, brow: 0x140d09, stubble: 0 }, hair: 'short', hairCol: 0x140d09,
    cloth: (J) => CAST.skirt(J, { len: 0.74, flare: 0.36, mat: 'cape' }) });   // the dark flowing outer coat: verlet tails over black leathers
  for (const n of ['rath1', 'rath3', 'rath5']) CAST.QC[n] = Object.assign({}, CAST.QC.quigon, { female: false, cullHead: false, hair: ['Hair_Buzzed'], hairCol: 0x140d09, browCol: 0x140d09 });
  CAST.QC.rath3.hair = ['Hair_SimpleParted']; CAST.QC.rath5.hair = ['Hair_SimpleParted'];
  const blk = g([], 0.1, 0.27, 0xe8e8ff), lea = g([], 0.06, 0.17, 0xf0f0ff), MM = { metal: 0.12, ns: 0.55, env: 0.35 }, BK = { sheenCol: 0x505060, ns: 0.7, env: 0.5, metal: 0.2 };
  /* I — Slave 426: ash-grey rag tunic and trousers (peasant set), bare scarred arms, barefoot */
  CAST.QO.rath1 = { parts: [Pz('Body', g([{ h: 38, w: 30, s: 0.25, v: 0.5 }, { h: 28, w: 45, s: 0.5, v: 0.5 }], 0.35, 0.55)), Pz('Arms', g([{ h: 38, w: 30, s: 0.25, v: 0.5 }], 0.3, 0.5)), Pz('Legs', g([{ h: 28, w: 45, s: 0.4, v: 0.45 }], 0.3, 0.5))], hair: ['Hair_Buzzed'], hairCol: 0x140d09, browCol: 0x140d09 };
  /* III — Apprentice: Maul-black ranger leathers, bracer, belt; the saber is the only colour */
  CAST.QO.rath3 = { glove: 0x0e0e10, parts: [R('Body', blk, BK), R('Body_Belt_1', lea, MM), R('Legs', blk, BK), R('Feet_Boots', lea, MM), R('Arms', blk, BK), R('Arms_Bracer', lea, { metal: 0.3, ns: 0.5, env: 0.3 })], hair: ['Hair_SimpleParted'], hairCol: 0x140d09, browCol: 0x140d09 };
  /* V — Hidden Lord: the same leathers + a single pauldron on the saber shoulder; the coat is cloth (SPECS.cloth) */
  CAST.QO.rath5 = { glove: 0x0e0e10, parts: CAST.QO.rath3.parts.concat([R('Acc_Pauldron', g([], 0.08, 0.2, 0xf0f0ff), { metal: 0.5, ns: 0.6, env: 0.4 })]), hair: ['Hair_SimpleParted'], hairCol: 0x140d09, browCol: 0x140d09 };
})();
/* ---- the pit-years shiv: a Saber whose energy blade is hidden (hit-detection still uses the blade segment); an iron knife on a bone grip is drawn instead */
class Shiv extends Saber {
  constructor() {
    super('single', 'shiv', { prio: 1, len: 0.27 });
    const M = SABER.mats(), g = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0135, 0.115, 10), M.bone); grip.position.y = -0.012; g.add(grip);
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0128, 0.05, 10), M.leather); wrap.position.y = -0.03; g.add(wrap);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.009, 0.012), M.dark); guard.position.y = 0.049; g.add(guard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.25, 0.004), new THREE.MeshStandardMaterial({ color: 0x8a8d90, metalness: 0.9, roughness: 0.42, envMapIntensity: 1.0 }));
    blade.position.y = 0.054 + 0.125; blade.castShadow = true; g.add(blade);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.04, 4), blade.material); tip.position.y = 0.054 + 0.27; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.2; g.add(tip);
    g.userData = { ends: [0.054], grips: [-0.04, 0.0], len: 0.3 };
    this.group.remove(this.hilt); this.hilt = g; this.group.add(g); this.ends = g.userData.ends;
    for (const b of this.blades) b.g.visible = false;
    this.shiv = true;
  }
  update(dt, now) { super.update(dt, now); for (const L of this.lights) L.i = 0; }
}
SABER.COL.shiv = [0.62, 0.62, 0.58];
/* the saber for a stage */
HERO.makeSaber = function (stage) {
  if (stage === 1) return new Shiv();
  const S = new Saber('bone', 'crimson', { prio: 5, len: 1.0 });
  return S;
};
/* Force powers available this level: story ranks (POWERS), plus level overrides (def.force: ['push'...] for tutorial surges) */
HERO.skills = function (def, stage) {
  const k = (id) => POWERS.has(id) || !!(def && def.force && def.force.includes(id));
  return { push: k('push'), grip: k('grip'), throw: k('throw'), rage: k('rage'), heavy: stage >= 3 };
};
