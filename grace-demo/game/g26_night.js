/* THE NIGHT SCENE — an adult scene between the king and queen (both adults, married), drawn live as pixel art on a
   small canvas and shown over the game. 18+ only: the player confirms their age once (kept in this browser).
   The scene is a candlelit cutaway of the bed; the pair move in a loop whose pace the player sets (slow / steady /
   fast), with a close-up toggle. Drawn with rectangles and ellipses on a 256 × 144 grid, shaded in 5-step skin ramps. */
const NIGHT = { open: false, t: 0, speed: 1, zoom: false, AGE: 'grace.age18' };
NIGHT.aged = () => { try { return localStorage.getItem(NIGHT.AGE) === '1'; } catch (e) { return false; } };
NIGHT.confirm = function (then) {
  if (NIGHT.aged()) { then(); return; }
  const g = $('ageGate'); g.hidden = false; SCENE.modal = true; $('ageYes').focus();
  $('ageYes').onclick = () => { try { localStorage.setItem(NIGHT.AGE, '1'); } catch (e) { /* */ } g.hidden = true; SCENE.modal = false; then(); };
  $('ageNo').onclick = () => { g.hidden = true; SCENE.modal = false; };
};
NIGHT.init = function () {
  const cv = $('nightCv'); cv.width = 256; cv.height = 144; NIGHT.g = cv.getContext('2d');
  $('nightClose').onclick = () => NIGHT.hide();
  for (const [id, k] of [['nSlow', 0.55], ['nMid', 1], ['nFast', 1.7]]) $(id).onclick = () => { NIGHT.speed = k; };
  $('nZoom').onclick = () => { NIGHT.zoom = !NIGHT.zoom; };
  window.addEventListener('keydown', (e) => { if (NIGHT.open && e.code === 'Escape') { NIGHT.hide(); e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  setInterval(() => { if (NIGHT.open) { NIGHT.t += 0.05 * NIGHT.speed; NIGHT.draw(); } }, 50);
};
NIGHT.show = function () { NIGHT.confirm(() => { SCENE.modal = true; NIGHT.open = true; $('night').hidden = false; AUDIO.sfx('page', { gain: 0.4 }); AUDIO.playMusic('castle', 2); NIGHT.draw(); $('nMid').focus(); }); };
NIGHT.hide = function () { NIGHT.open = false; SCENE.modal = false; $('night').hidden = true; $('cv').focus(); };
const SK = { q: [0x6a3e32, 0x8e5a46, 0xb07a60, 0xd09a7c, 0xe8b898], k: [0x5a3428, 0x7c4c3a, 0xa06a50, 0xc08a6c, 0xdcaa88] };
NIGHT.draw = function () {
  const c = NIGHT.g, t = NIGHT.t, z = NIGHT.zoom ? 1.35 : 1;
  const R = (x, y, w, h, col) => { c.fillStyle = '#' + col.toString(16).padStart(6, '0'); c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const E = (x, y, rx, ry, col) => { c.fillStyle = '#' + col.toString(16).padStart(6, '0'); c.beginPath(); c.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, 6.283); c.fill(); };
  const shadeE = (x, y, rx, ry, ramp) => { E(x, y, rx, ry, ramp[1]); E(x - rx * 0.12, y - ry * 0.14, rx * 0.84, ry * 0.8, ramp[2]); E(x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.45, ramp[3]); E(x - rx * 0.35, y - ry * 0.45, rx * 0.2, ry * 0.2, ramp[4]); };
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 256, 144);
  c.translate(128, 84); c.scale(z, z); c.translate(-128, -84);
  // the room: warm dark wall, canopy drapes, candle light pooling on the bed
  const g = c.createLinearGradient(0, 0, 0, 144); g.addColorStop(0, '#1a0e0c'); g.addColorStop(1, '#3a1c14'); c.fillStyle = g; c.fillRect(0, 0, 256, 144);
  for (let x = 0; x < 256; x += 16) for (let y = 0; y < 90; y += 16) if (((x + y) / 16) % 2 === 0) R(x + 6, y + 6, 4, 4, 0x2a1612);
  R(0, 0, 40, 100, 0x4a0e14); R(216, 0, 40, 100, 0x4a0e14); for (let x = 4; x < 40; x += 8) { R(x, 0, 2, 100, 0x6a1a20); R(216 + x, 0, 2, 100, 0x6a1a20); } R(0, 0, 256, 10, 0x6a1a20);
  const f = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
  for (let r = 70; r > 0; r -= 10) { c.globalAlpha = 0.045 * f; E(214, 38, r * 1.2, r, 0xffa840); } c.globalAlpha = 1;
  R(208, 40, 12, 3, 0x4a3a2a); R(212, 24, 4, 16, 0xe8dcc0); R(213, 20, 2, 4, 0xffd060); R(213, 18, 2, 2, 0xfff0a0);
  // bed: frame, mattress, rumpled linen
  R(26, 112, 204, 10, 0x3a1e12); R(26, 108, 204, 4, 0x5a3220); R(22, 104, 6, 28, 0x2a140a); R(228, 104, 6, 28, 0x2a140a);
  R(28, 92, 200, 18, 0xd8ccb0); R(28, 92, 200, 3, 0xf0e6cc); R(28, 106, 200, 4, 0xa89a80);
  for (let i = 0; i < 12; i++) R(40 + i * 15 + Math.sin(i * 2) * 3, 96 + (i % 3) * 3, 8, 1, 0xb8aa90);
  R(30, 78, 34, 18, 0xe8dec4); R(30, 78, 34, 3, 0xf8f0d8); R(30, 92, 34, 3, 0xb8aa90);   // pillow
  R(170, 90, 56, 18, 0x7a1a24); for (let i = 0; i < 5; i++) R(172 + i * 11, 90, 4, 18, 0x92242e);   // coverlet bunched at the foot
  const col = (h) => '#' + h.toString(16).padStart(6, '0');
  // limb: a stroked polyline with round caps, shaded dark → light toward the top-left
  const limb = (pts, w, ramp) => { c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [k, dw, ox, oy] of [[1, 0, 0, 0], [2, 1.5, -0.5, -0.8], [3, 3.2, -1, -1.6]]) { c.strokeStyle = col(ramp[k]); c.lineWidth = Math.max(1, w - dw); c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x + ox, y + oy) : c.moveTo(x + ox, y + oy))); c.stroke(); } };
  const sw = Math.sin(t * 6.283 * 0.9), sw2 = Math.sin(t * 6.283 * 0.9 - 0.6), P = sw * 4, Q = sw2 * 1.2;
  // ---- the queen, on hands and knees, facing left
  const hipX = 150 + P * 0.35, hipY = 76 + Q * 0.4, shX = 92 + P * 0.15, shY = 84 + Q;
  limb([[hipX + 6, hipY + 8], [hipX + 14, 104]], 13, SK.q); limb([[hipX + 14, 104], [hipX + 46, 108]], 8, SK.q); E(hipX + 50, 108, 4, 3, SK.q[2]);   // far thigh and shin
  limb([[shX - 6, shY + 4], [shX - 12, 104]], 7, SK.q); E(shX - 13, 106, 4, 2.5, SK.q[2]);   // far arm
  c.fillStyle = col(0x4a2a18); c.beginPath(); c.moveTo(shX - 26, shY + 2); c.quadraticCurveTo(shX - 20, shY + 34, shX + 20, shY + 20); c.lineTo(shX + 8, shY - 2); c.fill();   // hair falling forward
  limb([[shX, shY], [shX + 22, shY + 4 + Q * 0.3], [hipX - 20, hipY + 5], [hipX, hipY]], 15, SK.q);   // back, dipping, then rising to the hips
  shadeE(hipX + 4, hipY, 14, 12.5, SK.q); shadeE(hipX + 12 + P * 0.2, hipY + 3, 11, 11, SK.q); R(hipX + 2, hipY + 12, 20, 2, SK.q[1]);   // hips and rear
  limb([[hipX + 4, hipY + 8], [hipX + 2, 104]], 14, SK.q); limb([[hipX + 2, 104], [hipX + 38, 109]], 9, SK.q); E(hipX + 42, 109, 4.5, 3, SK.q[2]);   // near thigh and shin
  const bx = shX - 10 + sw2 * 1.5; shadeE(bx, shY + 12, 6.5, 8, SK.q); R(bx - 1, shY + 18, 3, 3, 0x9a5a4a);   // breast, swinging
  limb([[shX, shY + 2], [shX - 4, 96], [shX - 8, 105]], 8, SK.q); E(shX - 9, 107, 4.5, 2.8, SK.q[2]);   // near arm braced
  E(shX - 18, shY + 10, 11, 10, 0x4a2a18); shadeE(shX - 20, shY + 14, 8.5, 9, SK.q); E(shX - 28, shY + 8, 4, 8, 0x4a2a18); R(shX - 26, shY + 16, 3, 1, 0x8a3a3a); R(shX - 25, shY + 11, 2, 1, 0x2a1810);   // head, hair, mouth, closed eye
  // ---- the king, kneeling behind her, hands at her hips
  const kx = 188 - P * 0.9;
  limb([[kx - 4, 70], [kx - 16, 104]], 15, SK.k); limb([[kx - 16, 104], [kx + 26, 108]], 8, SK.k); E(kx + 30, 108, 4, 3, SK.k[2]);   // thigh and shin, kneeling
  limb([[kx + 2, 68], [kx + 6, 48]], 32, SK.k); limb([[kx + 6, 48], [kx + 4, 36]], 30, SK.k);   // hips, belly and chest, leaning a little forward
  for (let i = 0; i < 3; i++) R(kx - 4 + i * 5, 50 + i, 4, 1, SK.k[1]);   // ribs
  R(kx - 5, 42, 4, 3, 0x6a3a2c); R(kx + 5, 42, 4, 3, 0x6a3a2c); limb([[kx + 4, 33], [kx + 4, 26]], 9, SK.k);
  shadeE(kx + 3, 20, 8, 9, SK.k); c.fillStyle = col(0x1e1410); c.beginPath(); c.ellipse(kx + 3, 14, 9, 5, 0, Math.PI, 0); c.fill(); R(kx - 1, 25, 9, 3, 0x1e1410); R(kx - 3, 20, 3, 1, 0x1c1410);   // head bowed: hair, beard, closed eye
  limb([[kx - 8, 38], [kx - 20, 54], [hipX + 18, hipY + 2]], 8, SK.k); E(hipX + 17, hipY + 3, 4.5, 3.5, SK.k[3]);   // arm to her hip
  R(kx - 22, 82, 44, 22, 0xe0d4ba); for (let i = 0; i < 5; i++) R(kx - 20 + i * 9, 82, 3, 22, 0xc8bc9c);   // a sheet draped across his heels
  c.globalAlpha = 0.3; E(150, 110, 62, 3.5, 0x000000); c.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const a = (Math.sin(t * 2 + i * 1.7) + 1) / 2; c.globalAlpha = a * 0.7; R(hipX - 40 + i * 12, hipY - 12 + (i % 2) * 7, 1, 1, 0xffe8d0); } c.globalAlpha = 1;
  c.restore();
};
