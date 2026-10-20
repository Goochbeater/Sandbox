const { load } = require('./gltf.js');
const G = load(process.argv[2]), J = G.json;
const kids = {}; J.nodes.forEach((n, i) => (n.children || []).forEach((c) => (kids[c] = i)));
const roots = J.nodes.map((n, i) => i).filter((i) => kids[i] === undefined);
console.log('scene roots', roots.map((i) => J.nodes[i].name + JSON.stringify({ t: J.nodes[i].translation, r: J.nodes[i].rotation, s: J.nodes[i].scale, mesh: J.nodes[i].mesh, skin: J.nodes[i].skin })).join('\n'));
// world bind positions via inverseBindMatrices
const s = J.skins[0], ibm = G.acc(s.inverseBindMatrices).data;
const inv = (m) => { const a = m, o = new Float64Array(16); /* 4x4 inverse (affine) */
  const r = [[a[0], a[4], a[8]], [a[1], a[5], a[9]], [a[2], a[6], a[10]]]; const t = [a[12], a[13], a[14]];
  const det = r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1]) - r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0]) + r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0]);
  const ri = [[(r[1][1] * r[2][2] - r[1][2] * r[2][1]) / det, (r[0][2] * r[2][1] - r[0][1] * r[2][2]) / det, (r[0][1] * r[1][2] - r[0][2] * r[1][1]) / det], [(r[1][2] * r[2][0] - r[1][0] * r[2][2]) / det, (r[0][0] * r[2][2] - r[0][2] * r[2][0]) / det, (r[0][2] * r[1][0] - r[0][0] * r[1][2]) / det], [(r[1][0] * r[2][1] - r[1][1] * r[2][0]) / det, (r[0][1] * r[2][0] - r[0][0] * r[2][1]) / det, (r[0][0] * r[1][1] - r[0][1] * r[1][0]) / det]];
  const ti = [0, 1, 2].map((i) => -(ri[i][0] * t[0] + ri[i][1] * t[1] + ri[i][2] * t[2])); return { ri, ti }; };
const want = ['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'middle_01_l', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'ball_leaf_l', 'upperarm_r', 'hand_r'];
s.joints.forEach((j, k) => { const n = J.nodes[j].name; if (!want.includes(n)) return; const m = ibm.subarray(k * 16, k * 16 + 16); const { ti } = inv(m); console.log(n.padEnd(12), 'world', ti.map((v) => v.toFixed(3)).join(','), ' local t', JSON.stringify((J.nodes[j].translation || []).map((v) => +v.toFixed(3))), 'r', JSON.stringify((J.nodes[j].rotation || []).map((v) => +v.toFixed(3)))); });
