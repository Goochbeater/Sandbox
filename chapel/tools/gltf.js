// minimal glTF 2.0 / GLB reader (node): returns { json, bin(Buffer for buffer 0), acc(i) -> typed array }
const fs = require('fs'), path = require('path');
function load(file) {
  const buf = fs.readFileSync(file); let json, bins = [];
  if (buf.readUInt32LE(0) === 0x46546c67) {   // 'glTF'
    let o = 12; while (o < buf.length) { const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4); const chunk = buf.subarray(o + 8, o + 8 + len); if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8')); else if (type === 0x004e4942) bins.push(chunk); o += 8 + len; }
  } else { json = JSON.parse(buf.toString('utf8')); for (const b of json.buffers || []) bins.push(b.uri.startsWith('data:') ? Buffer.from(b.uri.split(',')[1], 'base64') : fs.readFileSync(path.join(path.dirname(file), decodeURIComponent(b.uri)))); }
  const C = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const acc = (i) => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView], b = bins[bv.buffer || 0], T = C[a.componentType], n = N[a.type];
    const off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || 0, es = T.BYTES_PER_ELEMENT * n;
    const out = new T(a.count * n);
    if (!stride || stride === es) { const src = new T(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + a.count * es)); out.set(src); }
    else for (let k = 0; k < a.count; k++) { const src = new T(b.buffer.slice(b.byteOffset + off + k * stride, b.byteOffset + off + k * stride + es)); out.set(src, k * n); }
    if (a.normalized && T !== Float32Array) { const f = new Float32Array(out.length), mx = T === Uint8Array ? 255 : T === Uint16Array ? 65535 : T === Int8Array ? 127 : 32767; for (let k = 0; k < out.length; k++) f[k] = Math.max(-1, out[k] / mx); return { data: f, n, a }; }
    return { data: out, n, a };
  };
  return { json, bins, acc };
}
module.exports = { load };
