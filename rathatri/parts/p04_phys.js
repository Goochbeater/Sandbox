/* PHYSICS (from HELLBREAKER) — colliders: k0 axis box, k1 yaw-rotated box, k2 axis ramp, k3 vertical cylinder.
   A uniform XZ grid holds statics; flags: lava (hazard floor), climb (climbable face), off (disabled barrier).
   Entities are vertical capsules approximated as cylinders: push-out against walls, ground snap within step height. */
const PHY = (() => {
  const P = { statics: [], grid: new Map(), C: 6, qid: 1, barriers: [], hf: null };
  const key = (i, k) => (i + 4096) * 8192 + (k + 4096);
  function bounds(c) {
    if (c.k === 1) { const ex = Math.abs(c.hx * c.cs) + Math.abs(c.hz * c.sn), ez = Math.abs(c.hx * c.sn) + Math.abs(c.hz * c.cs); c.x0 = c.cx - ex; c.x1 = c.cx + ex; c.z0 = c.cz - ez; c.z1 = c.cz + ez; }
    if (c.k === 3) { c.x0 = c.cx - c.rad; c.x1 = c.cx + c.rad; c.z0 = c.cz - c.rad; c.z1 = c.cz + c.rad; }
    if (c.k === 4) { const R = c.rOut / Math.cos(Math.PI / c.sides); c.x0 = c.cx - R; c.x1 = c.cx + R; c.z0 = c.cz - R; c.z1 = c.cz + R;
      c.nrm = []; for (let i = 0; i < c.sides; i++) { const a = c.rot + (i + 0.5) / c.sides * TAU; c.nrm.push([Math.cos(a), Math.sin(a)]); } }
  }
  function polyR(c, x, z) { const dx = x - c.cx, dz = z - c.cz; let m = -1e9, mi = 0; for (let i = 0; i < c.nrm.length; i++) { const d = dx * c.nrm[i][0] + dz * c.nrm[i][1]; if (d > m) { m = d; mi = i; } } PR.i = mi; return m; }
  const PR = { i: 0 };
  P.polyR = polyR;
  P.add = (c) => {
    c.q = 0; bounds(c);
    P.statics.push(c);
    const i0 = Math.floor(c.x0 / P.C), i1 = Math.floor(c.x1 / P.C), k0 = Math.floor(c.z0 / P.C), k1 = Math.floor(c.z1 / P.C);
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) { const kk = key(i, k); let a = P.grid.get(kk); if (!a) P.grid.set(kk, a = []); a.push(c); }
    return c;
  };
  P.box = (x0, y0, z0, x1, y1, z1, o) => P.add(Object.assign({ k: 0, x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }, o || {}));
  P.obox = (cx, cz, hx, hz, y0, y1, yaw, o) => P.add(Object.assign({ k: 1, cx, cz, hx, hz, y0, y1, cs: Math.cos(yaw), sn: Math.sin(yaw) }, o || {}));
  P.ramp = (x0, z0, x1, z1, axis, ya, yb, o) => P.add(Object.assign({ k: 2, x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), axis, ya, yb, y0: Math.min(ya, yb) - 1.5, y1: Math.max(ya, yb) }, o || {}));
  P.cyl = (cx, cz, rad, y0, y1, o) => P.add(Object.assign({ k: 3, cx, cz, rad, y0, y1 }, o || {}));
  /* ring slab: a regular N-gon annulus (apothem radii), rot = angle of the first vertex */
  P.ring = (cx, cz, rIn, rOut, y0, y1, sides = 8, rot = 0, o) => P.add(Object.assign({ k: 4, cx, cz, rIn, rOut, y0, y1, sides, rot }, o || {}));

  function each(x0, z0, x1, z1, fn) {
    const q = ++P.qid;
    const i0 = Math.floor(x0 / P.C), i1 = Math.floor(x1 / P.C), k0 = Math.floor(z0 / P.C), k1 = Math.floor(z1 / P.C);
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
      const a = P.grid.get(key(i, k)); if (!a) continue;
      for (let j = 0; j < a.length; j++) { const c = a[j]; if (c.q === q || c.off) continue; c.q = q; if (fn(c) === true) return; }
    }
  }
  P.each = each;
  function rampH(c, x, z) {
    const t = c.axis === 'x' ? (x - c.x0) / (c.x1 - c.x0) : (z - c.z0) / (c.z1 - c.z0);
    return c.ya + (c.yb - c.ya) * clamp(t, 0, 1);
  }
  P.rampH = rampH;
  function overlaps(c, x, z, r) {
    if (c.k === 1) {
      const dx = x - c.cx, dz = z - c.cz, lx = dx * c.cs - dz * c.sn, lz = dx * c.sn + dz * c.cs;
      const qx = clamp(lx, -c.hx, c.hx), qz = clamp(lz, -c.hz, c.hz);
      return (lx - qx) ** 2 + (lz - qz) ** 2 < r * r;
    }
    if (c.k === 3) { const dx = x - c.cx, dz = z - c.cz, R = c.rad + r; return dx * dx + dz * dz < R * R; }
    if (c.k === 4) { const pr = polyR(c, x, z); return pr > c.rIn - r && pr < c.rOut + r; }
    const qx = clamp(x, c.x0, c.x1), qz = clamp(z, c.z0, c.z1);
    return (x - qx) ** 2 + (z - qz) ** 2 < r * r;
  }
  P.overlaps = overlaps;
  function topAt(c, x, z) { return c.k === 2 ? rampH(c, clamp(x, c.x0, c.x1), clamp(z, c.z0, c.z1)) : c.y1; }

  /* highest walkable top under the circle, between yBot and yTop */
  P.ground = (x, z, r, yTop, yBot, out) => {
    let best = -1e9, bc = null;
    each(x - r, z - r, x + r, z + r, (c) => {
      if (c.noFloor) return;
      let top;
      if (c.k === 2) { if (x < c.x0 - 0.15 || x > c.x1 + 0.15 || z < c.z0 - 0.15 || z > c.z1 + 0.15) return; top = rampH(c, x, z); }
      else if (c.k === 4) { const pr = polyR(c, x, z); if (pr < c.rIn - r * 0.3 || pr > c.rOut + r * 0.3) return; top = c.y1; }
      else { if (!overlaps(c, x, z, r * 0.75)) return; top = c.y1; }
      if (top <= yTop && top >= yBot && top > best) { best = top; bc = c; }
    });
    if (P.hf) { const h = P.hf(x, z); if (h !== null && h <= yTop && h >= yBot && h > best) { best = h; bc = P.HFC; } }
    if (out) { out.y = best; out.c = bc; }
    return bc ? best : null;
  };
  P.HFC = { k: 9, hf: true };
  P.clear = () => { P.statics.length = 0; P.grid.clear(); P.hf = null; };
  /* top surface directly below a point (for gibs, spawns, nav) */
  P.floorBelow = (x, z, yFrom, r = 0.05) => { const o = {}; const y = P.ground(x, z, r, yFrom, -200, o); return y === null ? null : o; };
  P.ceiling = (x, z, r, yFrom, yTo) => {
    let best = yTo;
    each(x - r, z - r, x + r, z + r, (c) => {
      if (c.k === 2) return;
      if (!overlaps(c, x, z, r * 0.7)) return;
      if (c.y0 >= yFrom && c.y0 < best) best = c.y0;
    });
    return best;
  };
  function pushOut(e, x, z, yLo, yHi) {
    const r = e.r; let px = x, pz = z;
    for (let it = 0; it < 4; it++) {
      let moved = false;
      each(px - r - 0.1, pz - r - 0.1, px + r + 0.1, pz + r + 0.1, (c) => {
        if (c.k === 2 || c.pass) return;
        if (c.y1 <= yLo || c.y0 >= yHi) return;
        let mx, mz;
        if (c.k === 4) {
          const pr = polyR(c, px, pz), n = c.nrm[PR.i];
          if (pr > c.rIn - r && pr < (c.rIn + c.rOut) / 2) { const k = (c.rIn - r) - pr; mx = n[0] * k; mz = n[1] * k; }
          else if (pr < c.rOut + r && pr >= (c.rIn + c.rOut) / 2) { const k = (c.rOut + r) - pr; mx = n[0] * k; mz = n[1] * k; }
          else return;
        } else if (c.k === 3) {
          const dx = px - c.cx, dz = pz - c.cz, d2 = dx * dx + dz * dz, R = c.rad + r;
          if (d2 >= R * R) return; const d = Math.sqrt(d2) || 1e-4; const k = (R - d) / d; mx = dx * k; mz = dz * k;
          if (d2 < 1e-8) { mx = R; mz = 0; }
        } else {
          let lx, lz, hx, hz;
          if (c.k === 1) { const dx = px - c.cx, dz = pz - c.cz; lx = dx * c.cs - dz * c.sn; lz = dx * c.sn + dz * c.cs; hx = c.hx; hz = c.hz; }
          else { lx = px - (c.x0 + c.x1) / 2; lz = pz - (c.z0 + c.z1) / 2; hx = (c.x1 - c.x0) / 2; hz = (c.z1 - c.z0) / 2; }
          const qx = clamp(lx, -hx, hx), qz = clamp(lz, -hz, hz);
          const dx = lx - qx, dz = lz - qz; const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) return;
          if (d2 > 1e-10) { const d = Math.sqrt(d2), k = (r - d) / d; mx = dx * k; mz = dz * k; }
          else {
            const pxp = hx - lx, pxn = lx + hx, pzp = hz - lz, pzn = lz + hz, m = Math.min(pxp, pxn, pzp, pzn);
            mx = 0; mz = 0; if (m === pxp) mx = pxp + r; else if (m === pxn) mx = -(pxn + r); else if (m === pzp) mz = pzp + r; else mz = -(pzn + r);
          }
          if (c.k === 1) { const wx = mx * c.cs + mz * c.sn, wz = -mx * c.sn + mz * c.cs; mx = wx; mz = wz; }
        }
        px += mx; pz += mz; moved = true; e.hitWall = c; e.hitNX = mx; e.hitNZ = mz;
      });
      if (!moved) break;
    }
    return [px, pz];
  }
  function rampBlocks(e, x, z) {
    let bad = false;
    each(x - e.r, z - e.r, x + e.r, z + e.r, (c) => {
      if (c.k !== 2) return;
      const m = e.r * 0.5;
      if (x < c.x0 - m || x > c.x1 + m || z < c.z0 - m || z > c.z1 + m) return;
      const h = rampH(c, clamp(x, c.x0, c.x1), clamp(z, c.z0, c.z1));
      if (h > e.y + e.step + 0.02 && c.y0 < e.y + e.h) { bad = true; return true; }
    });
    return bad;
  }
  /* horizontal move with sliding; e = {x,y,z,r,h,step} */
  P.move = (e, mx, mz) => {
    const L = Math.hypot(mx, mz), n = Math.max(1, Math.ceil(L / (e.r * 0.6)));
    let blocked = false; e.hitWall = null;
    for (let s = 0; s < n; s++) {
      const yLo = e.y + e.step, yHi = e.y + e.h;
      const ox = e.x, oz = e.z;
      let [px, pz] = pushOut(e, e.x + mx / n, e.z + mz / n, yLo, yHi);
      if (rampBlocks(e, px, pz)) {
        blocked = true; let ok = false;
        for (const [tx, tz] of [[ox + mx / n, oz], [ox, oz + mz / n]]) {
          const [qx, qz] = pushOut(e, tx, tz, yLo, yHi);
          if (!rampBlocks(e, qx, qz)) { px = qx; pz = qz; ok = true; break; }
        }
        if (!ok) { px = ox; pz = oz; }
      }
      if (P.hf) {   // steep terrain acts as a wall: slide along it
        const lim = e.y + e.step + 0.05, h = P.hf(px, pz);
        if (h !== null && h > lim) {
          blocked = true; let ok = false;
          for (const [tx, tz] of [[ox + mx / n, oz], [ox, oz + mz / n]]) { const hh = P.hf(tx, tz); if (hh === null || hh <= lim) { px = tx; pz = tz; ok = true; break; } }
          if (!ok) { px = ox; pz = oz; }
        }
      }
      if (Math.abs(px - (ox + mx / n)) + Math.abs(pz - (oz + mz / n)) > 1e-4) blocked = true;
      e.x = px; e.z = pz;
    }
    return blocked;
  };
  P.unstick = (e) => { const [px, pz] = pushOut(e, e.x, e.z, e.y + e.step, e.y + e.h); e.x = px; e.z = pz; };

  /* ---- rays ---- */
  const HIT = { t: 0, nx: 0, ny: 0, nz: 0 };
  function slab(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
    const ix = 1 / (Math.abs(dx) < 1e-9 ? 1e-9 : dx), iy = 1 / (Math.abs(dy) < 1e-9 ? 1e-9 : dy), iz = 1 / (Math.abs(dz) < 1e-9 ? 1e-9 : dz);
    let ta = (x0 - ox) * ix, tb = (x1 - ox) * ix; const txn = Math.min(ta, tb), txf = Math.max(ta, tb);
    ta = (y0 - oy) * iy; tb = (y1 - oy) * iy; const tyn = Math.min(ta, tb), tyf = Math.max(ta, tb);
    ta = (z0 - oz) * iz; tb = (z1 - oz) * iz; const tzn = Math.min(ta, tb), tzf = Math.max(ta, tb);
    const tn = Math.max(txn, tyn, tzn), tf = Math.min(txf, tyf, tzf);
    if (tn > tf || tf < 0) return null;
    const ax = tn === txn ? 0 : tn === tyn ? 1 : 2;
    SLAB.tn = tn; SLAB.tf = tf; SLAB.ax = ax; return SLAB;
  }
  const SLAB = { tn: 0, tf: 0, ax: 0 };
  function rayCol(c, ox, oy, oz, dx, dy, dz, maxT) {
    if (c.k === 0) {
      const s = slab(ox, oy, oz, dx, dy, dz, c.x0, c.y0, c.z0, c.x1, c.y1, c.z1); if (!s) return false;
      const t = Math.max(0, s.tn); if (t > maxT) return false;
      HIT.t = t; HIT.nx = s.ax === 0 ? -Math.sign(dx) : 0; HIT.ny = s.ax === 1 ? -Math.sign(dy) : 0; HIT.nz = s.ax === 2 ? -Math.sign(dz) : 0; return true;
    }
    if (c.k === 1) {
      const rx = ox - c.cx, rz = oz - c.cz;
      const lox = rx * c.cs - rz * c.sn, loz = rx * c.sn + rz * c.cs, ldx = dx * c.cs - dz * c.sn, ldz = dx * c.sn + dz * c.cs;
      const s = slab(lox, oy, loz, ldx, dy, ldz, -c.hx, c.y0, -c.hz, c.hx, c.y1, c.hz); if (!s) return false;
      const t = Math.max(0, s.tn); if (t > maxT) return false;
      const lnx = s.ax === 0 ? -Math.sign(ldx) : 0, lnz = s.ax === 2 ? -Math.sign(ldz) : 0;
      HIT.t = t; HIT.nx = lnx * c.cs + lnz * c.sn; HIT.ny = s.ax === 1 ? -Math.sign(dy) : 0; HIT.nz = -lnx * c.sn + lnz * c.cs; return true;
    }
    if (c.k === 4) {
      let best = -1, bn = [0, 0, 0];
      if (Math.abs(dy) > 1e-6) for (const yy of [c.y1, c.y0]) { const tt = (yy - oy) / dy; if (tt < 0 || tt > maxT) continue; const pr = polyR(c, ox + dx * tt, oz + dz * tt); if (pr >= c.rIn && pr <= c.rOut && (best < 0 || tt < best)) { best = tt; bn = [0, yy === c.y1 ? 1 : -1, 0]; } }
      /* inner walls: step along the ray within the slab's height band */
      const steps = Math.min(64, Math.ceil(maxT / 0.4));
      let prev = polyR(c, ox, oz) < c.rIn;
      for (let s = 1; s <= steps; s++) { const tt = maxT * s / steps; if (best >= 0 && tt > best) break; const y = oy + dy * tt; const ins = polyR(c, ox + dx * tt, oz + dz * tt) < c.rIn;
        if (prev && !ins && y >= c.y0 && y <= c.y1) { best = tt; const n = c.nrm[PR.i]; bn = [-n[0], 0, -n[1]]; break; } prev = ins; }
      if (best < 0) return false;
      HIT.t = best; HIT.nx = bn[0]; HIT.ny = bn[1]; HIT.nz = bn[2]; return true;
    }
    if (c.k === 3) {
      const px = ox - c.cx, pz = oz - c.cz;
      const a = dx * dx + dz * dz, b = px * dx + pz * dz, cc = px * px + pz * pz - c.rad * c.rad;
      let t = -1, nx = 0, ny = 0, nz = 0;
      if (cc <= 0 && oy >= c.y0 && oy <= c.y1) { HIT.t = 0; HIT.nx = -dx; HIT.ny = -dy; HIT.nz = -dz; return true; }
      if (a > 1e-9) { const disc = b * b - a * cc; if (disc >= 0) { const tt = (-b - Math.sqrt(disc)) / a; const y = oy + dy * tt; if (tt >= 0 && y >= c.y0 && y <= c.y1) { t = tt; nx = (px + dx * tt) / c.rad; nz = (pz + dz * tt) / c.rad; } } }
      if (Math.abs(dy) > 1e-6) {
        for (const yy of [c.y1, c.y0]) { const tt = (yy - oy) / dy; if (tt < 0 || (t >= 0 && tt >= t)) continue; const hx = px + dx * tt, hz = pz + dz * tt; if (hx * hx + hz * hz <= c.rad * c.rad) { t = tt; nx = 0; nz = 0; ny = yy === c.y1 ? 1 : -1; } }
      }
      if (t < 0 || t > maxT) return false;
      HIT.t = t; HIT.nx = nx; HIT.ny = ny; HIT.nz = nz; return true;
    }
    const s = slab(ox, oy, oz, dx, dy, dz, c.x0, c.y0, c.z0, c.x1, c.y1, c.z1); if (!s) return false;
    const t0 = Math.max(0, s.tn), t1 = s.tf, ax = s.ax;
    const f = (t) => (oy + dy * t) - rampH(c, ox + dx * t, oz + dz * t);
    const f0 = f(t0), f1 = f(t1);
    let t, nx = 0, ny = 0, nz = 0;
    if (f0 <= 0) { t = t0; if (ax === 0) nx = -Math.sign(dx); else if (ax === 1) ny = -Math.sign(dy); else nz = -Math.sign(dz); }
    else if (f1 < 0) {
      t = t0 + f0 / (f0 - f1) * (t1 - t0);
      const L = c.axis === 'x' ? c.x1 - c.x0 : c.z1 - c.z0, sl = (c.yb - c.ya) / L, k = 1 / Math.hypot(sl, 1);
      ny = k; if (c.axis === 'x') nx = -sl * k; else nz = -sl * k;
    } else return false;
    if (t > maxT) return false;
    HIT.t = t; HIT.nx = nx; HIT.ny = ny; HIT.nz = nz; return true;
  }
  /* first solid hit along a normalised direction */
  P.ray = (ox, oy, oz, dx, dy, dz, maxT, mode) => {
    let best = null;
    if (P.hf) { // march the heightfield coarsely then bisect
      let prev = 0, hit = -1; const stp = 0.5;
      for (let t = 0; t <= maxT; t += stp) { const h = P.hf(ox + dx * t, oz + dz * t); if (h !== null && oy + dy * t < h) { hit = t; break; } prev = t; }
      if (hit >= 0) { let a = prev, b = hit; for (let i = 0; i < 12; i++) { const m = (a + b) / 2, h = P.hf(ox + dx * m, oz + dz * m); if (h !== null && oy + dy * m < h) b = m; else a = m; } best = { t: b, nx: 0, ny: 1, nz: 0, c: P.HFC }; maxT = b; }
    }
    const chunk = 12;
    for (let a = 0; a < maxT; a += chunk) {
      const b = Math.min(maxT, a + chunk);
      const x0 = Math.min(ox + dx * a, ox + dx * b), x1 = Math.max(ox + dx * a, ox + dx * b), z0 = Math.min(oz + dz * a, oz + dz * b), z1 = Math.max(oz + dz * a, oz + dz * b);
      let bt = best ? best.t : b + 1e-3;
      each(x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1, (c) => {
        if (mode === 'shot' && c.noShot) return;
        if (mode === 'los' && c.see) return;
        if (rayCol(c, ox, oy, oz, dx, dy, dz, bt)) { if (HIT.t < bt) { bt = HIT.t; best = { t: HIT.t, nx: HIT.nx, ny: HIT.ny, nz: HIT.nz, c }; } }
      });
      if (best && best.t <= b) return best;
    }
    return best;
  };
  P.los = (ax, ay, az, bx, by, bz) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz); if (L < 1e-4) return true;
    return !P.ray(ax, ay, az, dx / L, dy / L, dz / L, L - 0.05, 'los');
  };
  P.solidAt = (x, y, z) => {
    let hit = false;
    each(x - 0.01, z - 0.01, x + 0.01, z + 0.01, (c) => {
      if (y < c.y0 || y > c.y1) return;
      if (c.k === 2) { if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1 && y <= rampH(c, x, z)) { hit = true; return true; } return; }
      if (overlaps(c, x, z, 0.001)) { hit = true; return true; }
    });
    return hit;
  };
  /* is there a climbable face touching this circle at this height? returns the collider */
  P.climbAt = (x, y, z, r) => {
    let hit = null;
    each(x - r - 0.2, z - r - 0.2, x + r + 0.2, z + r + 0.2, (c) => {
      if (!c.climb || y < c.y0 - 0.5 || y > c.y1 + 0.2) return;
      if (overlaps(c, x, z, r + 0.18)) { hit = c; return true; }
    });
    return hit;
  };
  return P;
})();
