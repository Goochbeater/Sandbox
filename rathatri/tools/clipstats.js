// clip analysis: FK the male body with each clip -> ground speed (locomotion), hand-speed peaks (attacks), sword axis
const fs = require('fs'), M = JSON.parse(fs.readFileSync(__dirname + '/../assets/q.json')), buf = fs.readFileSync(__dirname + '/../assets/q.bin');
const arr = (r) => { const T = { Float32Array, Int16Array, Uint8Array, Uint16Array, Uint32Array }[r.t]; return new T(buf.buffer.slice(buf.byteOffset + r.o, buf.byteOffset + r.o + r.n * T.BYTES_PER_ELEMENT)); };
const S = M.skel, NB = S.names.length, I = (n) => S.names.indexOf(n), body = M.meshes.male;
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qrot = (q, v) => { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2]; return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
function fk(c, f) {
  const D = c.Dq, P = c.Pp, W = [], p = [], k0 = I('pelvis'), sc = body.wt[k0][1] / c.pelvisH;
  for (let k = 0; k < NB; k++) { const o = (f * NB + k) * 4, d = [D[o] / 32767, D[o + 1] / 32767, D[o + 2] / 32767, D[o + 3] / 32767]; W[k] = qmul(d, body.wr[k]); const par = S.parents[k];
    if (k === k0) p[k] = [body.wt[k][0] + P[f * 3] * sc, body.wt[k][1] + P[f * 3 + 1] * sc, body.wt[k][2] + P[f * 3 + 2] * sc];
    else if (par < 0) p[k] = body.wt[k].slice(); else { const v = qrot(W[par], body.lt[k]); p[k] = [p[par][0] + v[0], p[par][1] + v[1], p[par][2] + v[2]]; } }
  return { W, p, D: (k) => { const o = (f * NB + k) * 4; return [D[o] / 32767, D[o + 1] / 32767, D[o + 2] / 32767, D[o + 3] / 32767]; } };
}
const want = process.argv.slice(2);
for (const name in M.clips) {
  if (want.length && !want.includes(name)) continue;
  const c = M.clips[name]; c.Dq = arr(c.D); c.Pp = arr(c.P);
  const nf = c.nf, fr = []; for (let f = 0; f < nf; f++) fr.push(fk(c, f));
  // ground speed: foot (ball) velocity relative to pelvis while it is the lowest foot
  const bl = I('ball_l'), br = I('ball_r'), pel = I('pelvis'), vs = [];
  for (let f = 1; f < nf; f++) for (const b of [bl, br]) { const o = b === bl ? br : bl; if (fr[f].p[b][1] > fr[f].p[o][1] + 0.005) continue;
    const dz = (fr[f].p[b][2] - fr[f].p[pel][2]) - (fr[f - 1].p[b][2] - fr[f - 1].p[pel][2]); vs.push(-dz * 30); }
  vs.sort((a, b) => a - b); const gs = vs.length ? vs[Math.floor(vs.length / 2)] : 0;
  const pz = fr[nf - 1].p[pel][2] - fr[0].p[pel][2];
  const hs = c.speed.map((s) => s[0]); let pk = 0, pki = 0; hs.forEach((v, i) => { if (v > pk) { pk = v; pki = i; } });
  const win = []; let on = -1; hs.forEach((v, i) => { if (v > 3.0 && on < 0) on = i; if ((v <= 3.0 || i === hs.length - 1) && on >= 0) { win.push([(on / 30).toFixed(2), (i / 30).toFixed(2), Math.max(...hs.slice(on, i + 1)).toFixed(1)]); on = -1; } });
  const hr = I('hand_r'), f0 = fr[Math.min(nf - 1, 6)], ax = (v) => qrot(f0.D(hr), v).map((x) => +x.toFixed(2));
  console.log(name.padEnd(22), 'dur', c.dur.toFixed(2), 'ground', gs.toFixed(2), 'rootZ', pz.toFixed(2), 'peakR', pk.toFixed(1) + '@' + (pki / 30).toFixed(2), 'win', JSON.stringify(win), name.startsWith('Sword') ? 'handZ ' + JSON.stringify(ax([0, 0, 1])) + ' handY ' + JSON.stringify(ax([0, 1, 0])) + ' handX ' + JSON.stringify(ax([1, 0, 0])) : '');
}
if (process.env.RANGE) for (const name of process.env.RANGE.split(',')) { const c = M.clips[name]; c.Dq = arr(c.D); c.Pp = arr(c.P); let mn = 9, mx = -9, lo = 9;
  for (let f = 0; f < c.nf; f++) { const r = fk(c, f), z = r.p[I('ball_l')][2] - r.p[I('pelvis')][2]; mn = Math.min(mn, z); mx = Math.max(mx, z); lo = Math.min(lo, r.p[I('ball_l')][1]); }
  // stance fraction: frames where ball_l within 3 cm of its min height
  let st = 0; for (let f = 0; f < c.nf; f++) { const r = fk(c, f); if (r.p[I('ball_l')][1] < lo + 0.03) st++; }
  console.log(name, 'footZ range', (mx - mn).toFixed(2), 'stance frac', (st / c.nf).toFixed(2), 'speed est', ((mx - mn) * 0.8 / (st / c.nf * c.dur)).toFixed(2)); }
