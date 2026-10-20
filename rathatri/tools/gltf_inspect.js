const { load } = require('./gltf.js');
const f = process.argv[2], G = load(f), J = G.json;
console.log('FILE', f.split('/').slice(-1)[0]);
console.log('nodes', J.nodes.length, 'meshes', (J.meshes || []).length, 'skins', (J.skins || []).length, 'anims', (J.animations || []).length, 'materials', (J.materials || []).length, 'images', (J.images || []).length);
if (J.skins) for (const s of J.skins) console.log('skin joints', s.joints.length, s.joints.slice(0, 80).map((j) => J.nodes[j].name).join(','));
if (J.meshes) for (const m of J.meshes) console.log('mesh', m.name, m.primitives.map((p) => (p.indices !== undefined ? J.accessors[p.indices].count / 3 : 0) + 'tris attrs=' + Object.keys(p.attributes).join('/') + ' mat=' + p.material).join(' | '));
if (J.materials) for (const m of J.materials) console.log('mat', m.name, JSON.stringify(m.pbrMetallicRoughness || {}).slice(0, 160));
if (J.images) console.log('images', J.images.map((i) => i.name || i.uri || i.mimeType).join(','));
if (J.animations) { console.log('ANIMS'); console.log(J.animations.map((a) => { const s = a.samplers[0]; const t = G.json.accessors[s.input]; return a.name + '(' + (t.max ? t.max[0].toFixed(2) : '?') + 's)'; }).join('  ')); }
