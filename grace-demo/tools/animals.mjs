/* Bakes the CC0 animals into assets/animals/<id>.glb: plain glTF binary (no compression, float attributes), only the
   clips the game plays, redundant keys resampled away. The runtime reader (engine/e15_beast.js) reads exactly this.
   Sources (all Quaternius, CC0 1.0; see ENGINE.md §13j): the Ultimate Animated Animal Pack (Horse, WhiteHorse, Husky,
   Wolf, Bull, Deer, Stag, Shiba) and the cat from the Animated Animal pack, the last two from @netforge/asset-library-files
   (meshopt-compressed copies, decoded here).
   Usage: npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer@0.21
          node tools/animals.mjs <folder with the source .glb files>   */
import { NodeIO, VertexLayout } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, prune, dedup, resample, quantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs'; import path from 'node:path';
const SRC = process.argv[2], OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'animals');
const LIST = {
  horse: ['Horse.glb', ['Idle', 'Idle_Headlow', 'Eating', 'Walk', 'Gallop']],
  grey: ['WhiteHorse.glb', ['Idle', 'Idle_Headlow', 'Eating', 'Walk', 'Gallop']],
  hound: ['Husky.glb', ['Idle', 'Idle_2', 'Idle_2_HeadLow', 'Walk', 'Gallop']],
  stag: ['stag.glb', ['Idle', 'Idle_Headlow', 'Eating', 'Walk', 'Gallop']],
  cat: ['cat.glb', ['Idle', 'Idle_Eating', 'Walk', 'Headbutt']],
};
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  .setVertexLayout(VertexLayout.SEPARATE);   // one attribute per buffer view: the runtime reader never de-interleaves
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(3);
for (const [id, [file, keep]] of Object.entries(LIST)) {
  if (only.length && !only.includes(id)) continue;
  const doc = await io.read(path.join(SRC, file)), root = doc.getRoot();
  // clip names: 'AnimalArmature|AnimalArmature|Idle' -> 'Idle'; the packs carry each clip twice, keep the first
  const seen = new Set();
  for (const a of root.listAnimations()) { const n = a.getName().split('|').pop();
    if (!keep.includes(n) || seen.has(n)) { a.dispose(); continue; } seen.add(n); a.setName(n); }
  const missing = keep.filter((k) => !seen.has(k)); if (missing.length) console.warn(id, 'missing clips', missing);
  await doc.transform(dequantize(), resample({ tolerance: 2e-4 }));
  for (const e of root.listExtensionsUsed()) e.dispose();   // meshopt / quantization: decoded above
  // a disposed animation's samplers keep their accessors alive in memory, so prune can't see them: write, read back, prune
  const doc2 = await io.readBinary(await io.writeBinary(doc));
  await doc2.transform(prune(), dedup(),
    // normals to 8 bits, weights to 8 bits, uvs to 16 (normalized integers, as KHR_mesh_quantization has them); positions stay float
    quantize({ pattern: /^(NORMAL|WEIGHTS_0|TEXCOORD_0)$/, quantizeNormal: 8, quantizeWeight: 8, quantizeTexcoord: 16 }));
  const bin = await io.writeBinary(doc2); fs.writeFileSync(path.join(OUT, id + '.glb'), bin);
  console.log(id.padEnd(6), (bin.length / 1024).toFixed(0).padStart(5), 'KB', [...seen].join(' '));
}
