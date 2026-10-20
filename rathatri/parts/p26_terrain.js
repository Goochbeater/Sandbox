/* TERRAIN — heightfield worlds (Tatooine): a displaced grid mesh with slope-blended sand / rock (triplanar rock
   on steep faces), procedural rock formations, and PHY.hf so the ground, walls, rays and LOS all see it. */
const TERRAIN = {};
TERRAIN.mat = function (key, o) {
  o = o || {};
  const sand = TEX.sets.sand, rock = TEX.sets.rock;
  const m = new THREE.MeshStandardMaterial({ map: sand.map, normalMap: sand.normalMap, roughness: 0.95, metalness: 0, envMapIntensity: 0.5, color: o.color || 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = '#define NMB ' + (MG.flags.nmb !== undefined ? (+MG.flags.nmb).toFixed(2) : '0.0') + '\n' + sh.fragmentShader;
    sh.uniforms.tRock = { value: rock.map }; sh.uniforms.tRockN = { value: rock.normalMap };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying float vRk;' + (o.rk ? '\nattribute float aRk;' : ''))
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vRk = ' + (o.rk ? 'aRk' : '1.0') + ';');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRock, tRockN; varying vec3 vWP; varying vec3 vWN; varying float vRk;')
      .replace('#include <map_fragment>', `
        // ripple direction wanders with a slow angle field: identical parallel crests tiling a flat plain read as a lattice
        float rAng = 0.9 * sin(vWP.x * 0.013 + 1.3 * sin(vWP.z * 0.009)) + 0.7 * sin(vWP.z * 0.017 - vWP.x * 0.005); vec2 rcs = vec2(cos(rAng), sin(rAng));
        vec2 suv = mat2(rcs.x, -rcs.y, rcs.y, rcs.x) * vWP.xz / 5.0;
        vec3 an = abs(vWN); vec3 bw = pow(an, vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        // sand is only ever mapped from above: its ripple lines projected onto a slope read as fence stripes
        float steep = 1.0 - smoothstep(0.7, 0.88, vWN.y);
        // tiling breakup: a second, rotated, differently-scaled sample swapped in by a very low-frequency mask
        vec2 suv2 = mat2(0.8, -0.6, 0.6, 0.8) * vWP.xz / 7.3; float bmk = smoothstep(0.38, 0.62, texture2D(map, vWP.xz / 83.0 + 0.31).g);
        vec3 sandT = mix(texture2D(map, suv).rgb, texture2D(map, suv2).rgb, bmk);
        float dSand = smoothstep(55.0, 190.0, length(vViewPosition));   // far sand: ripples alias into regular contour stripes
        vec3 sandC = mix(sandT, texture2D(map, suv, 7.0).rgb, max(steep * 0.9, dSand * 0.5)) * mix(0.92, 1.05, texture2D(map, suv * 0.13).r * (1.0 - steep) + steep * 0.5);   // steep sand: the blurred mip (ripples would stretch into streaks)   // ripples fade on steep sand (top-down mapping stretches them)
        sandC *= vec3(0.9, 0.76, 0.58);   // warm Tatooine sand (the bare map reads near-white under the desert sun)
        vec3 rockC = texture2D(tRock, vWP.zy / 6.0).rgb * bw.x + texture2D(tRock, vWP.xz / 6.0).rgb * bw.y + texture2D(tRock, vWP.xy / 6.0).rgb * bw.z;
        // sandstone strata: irregular horizontal bands of tint running along the cliff faces
        float band = texture2D(tRock, vec2((vWP.x + vWP.z) * 0.012, vWP.y * 0.32)).r, band2 = texture2D(tRock, vec2((vWP.x - vWP.z) * 0.02 + 0.37, vWP.y * 1.1)).r;
        float dFar0 = smoothstep(90.0, 300.0, length(vViewPosition));
        rockC *= mix(mix(vec3(0.8, 0.7, 0.6), vec3(1.1, 1.0, 0.9), smoothstep(0.25, 0.75, band)) * (0.9 + 0.2 * band2), vec3(0.95, 0.85, 0.75), dFar0 * 0.75);   // strata alias into layer-cake stripes far off
        // fine grain + vertical erosion runnels so a 40 m wall reads as rock, not a smooth sand bank
        float fine = texture2D(tRock, (bw.x > bw.z ? vWP.zy : vWP.xy) / 1.6).r;
        float runs = texture2D(tRock, vec2((vWP.x + vWP.z) * 0.33, vWP.y * 0.022)).r;
        float dFar = smoothstep(70.0, 220.0, length(vViewPosition));   // far cliffs: fine grain + runnels alias into 'window' grids
        rockC *= mix((0.8 + 0.4 * fine) * (0.78 + 0.36 * smoothstep(0.2, 0.8, runs)), 0.92, dFar);
        rockC *= vec3(0.94, 0.8, 0.68);   // cliff sandstone sits darker and redder than the sand at its foot
        float slope = (1.0 - smoothstep(0.7, 0.86, vWN.y)) * vRk;   // vRk: 0 on dunes (sand whatever the slope), 1 on rock country
        ${o.rockH ? `slope = max(slope, 1.0 - smoothstep(${o.rockH.toFixed(1)}, ${(o.rockH + 3).toFixed(1)}, vWP.y));` : ''}   // (was max(slope, 1 - s*0) = 1: every Tatooine surface rendered as rock)
        diffuseColor.rgb *= mix(sandC, rockC, slope);
        float gRock = slope;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // sand normal map in WORLD space along the same rotated top-down projection as the colour: three's derivative tangent
        // frame changes per triangle on the curvilinear grid, which drew the mesh lattice across flat ground at grazing sun
        { vec3 tS = texture2D(normalMap, suv, NMB).xyz * 2.0 - 1.0; tS.xy *= normalScale; vec3 w0 = normalize(vWN);
          vec2 pxz = tS.x * vec2(rcs.x, -rcs.y) + tS.y * vec2(rcs.y, rcs.x);
          vec3 wS = normalize(vec3(w0.x + pxz.x, w0.y * max(tS.z, 0.2), w0.z + pxz.y));
          normal = normalize((viewMatrix * vec4(wS, 0.0)).xyz); }
        normal = normalize(mix(normal, nonPerturbedNormal, max(gRock, steep) * 0.85));   // the sand normal map is planar-mapped: it smears into streaks on cliffs
        if (gRock > 0.01) {   // rock gets its own TRIPLANAR normal map (whiteout blend) in world space -> real relief on the cliffs
          vec3 wn = normalize(vWN), tX = texture2D(tRockN, vWP.zy / 6.0).xyz * 2.0 - 1.0, tY = texture2D(tRockN, vWP.xz / 6.0).xyz * 2.0 - 1.0, tZ = texture2D(tRockN, vWP.xy / 6.0).xyz * 2.0 - 1.0;
          vec3 fX = texture2D(tRockN, vWP.zy / 1.6).xyz * 2.0 - 1.0, fZ = texture2D(tRockN, vWP.xy / 1.6).xyz * 2.0 - 1.0; float nk = 1.0 - 0.7 * dFar; tX.xy = tX.xy * 1.6 * nk + fX.xy * 0.6 * (1.0 - dFar); tZ.xy = tZ.xy * 1.6 * nk + fZ.xy * 0.6 * (1.0 - dFar); tY.xy *= 1.2 * nk;
          tX = vec3(tX.xy + wn.zy, abs(tX.z) * wn.x); tY = vec3(tY.xy + wn.xz, abs(tY.z) * wn.y); tZ = vec3(tZ.xy + wn.xy, abs(tZ.z) * wn.z);
          vec3 wN = normalize(tX.zyx * bw.x + tY.xzy * bw.y + tZ.xyz * bw.z);
          normal = normalize(mix(normal, normalize((viewMatrix * vec4(wN, 0.0)).xyz), gRock));
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.95, 0.85, gRock);');
    if (MG.flags.tdbg === 'flatn') sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_fragment>', 'normal = nonPerturbedNormal;\n#include <lights_physical_fragment>');
    if (MG.flags.tdbg === 'nolight') sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor = vec4(diffuseColor.rgb * 0.8, 1.0);');
    if (MG.flags.tdbg) sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + ({ sand: 'gl_FragColor = vec4(sandC, 1.0);', t: 'gl_FragColor = vec4(sandT, 1.0);', n: 'gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);', wn: 'gl_FragColor = vec4(normalize(vWN) * 0.5 + 0.5, 1.0);' }[MG.flags.tdbg] || ''));
  };
  m.customProgramCacheKey = () => 'terrain_' + key + (o.rk ? '_rk' : '');
  return m;
};
/* build the terrain grid over [x0,x1]×[z0,z1] at step res; f(x,z) -> height */
TERRAIN.build = function (f, x0, z0, x1, z1, res, mat) {
  const nx = Math.ceil((x1 - x0) / res), nz = Math.ceil((z1 - z0) / res);
  const P = new Float32Array((nx + 1) * (nz + 1) * 3), UV = new Float32Array((nx + 1) * (nz + 1) * 2), I = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * res, z = z0 + j * res, k = j * (nx + 1) + i; P[k * 3] = x; P[k * 3 + 1] = f(x, z); P[k * 3 + 2] = z; UV[k * 2] = x / 5; UV[k * 2 + 1] = z / 5; }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 2, d = a + nx + 1; I.push(a, d, b, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
  const me = new THREE.Mesh(g, mat); me.receiveShadow = true; me.castShadow = true;
  LEVEL.add(me);
  PHY.hf = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1) ? null : f(x, z);
  return me;
};
/* a rock formation: displaced icosphere with strata, collider cylinder */
TERRAIN.rockGeo = function (seed, r, hs, stretch, detail) {
  const g = new THREE.IcosahedronGeometry(1, detail || (r > 3 ? 5 : 4)), p = g.attributes.position, rs = mulberry(seed);
  const o = [rs() * 50, rs() * 50, rs() * 50], nStr = 4 + Math.floor(rs() * 4);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let d = 1 + (fbm3(x * 1.3 + o[0], y * 1.3 + o[1], z * 1.3 + o[2], 4) - 0.5) * 0.8;
    // sandstone: stepped strata (each band undercut a little), vertical erosion grooves, a flattened caprock
    const sy = (y * 0.5 + 0.5) * nStr, fr = sy - Math.floor(sy);
    d *= 1 - 0.07 * smooth(0.75, 1.0, fr) + 0.03 * smooth(0.0, 0.2, fr);
    const ang = Math.atan2(z, x); d *= 1 - 0.05 * Math.pow(Math.abs(Math.sin(ang * (5 + (seed % 4)) + fbm3(x * 2, y * 0.5, z * 2, 2) * 4)), 6);
    let yy = y > 0 ? y * (hs || 1) : y * 0.6;
    if (y > 0.55) yy = lerp(yy, 0.55 * (hs || 1) + (y - 0.55) * 0.35 * (hs || 1), 0.7);   // caprock
    p.setXYZ(i, x * d * r * (stretch || 1), Math.max(-0.4, yy) * d * r, z * d * r);
  }
  g.computeVertexNormals(); return g;
};
TERRAIN.rock = function (x, z, r, h, seed, mat, o) {
  o = o || {};
  const g = TERRAIN.rockGeo(seed, r, h / r, o.stretch, o.detail);
  const y = o.y !== undefined ? o.y : ((PHY.hf ? PHY.hf(x, z) : 0) || 0);
  const m = new THREE.Matrix4().compose(V3(x, y - r * 0.2, z), new THREE.Quaternion().setFromAxisAngle(YUP, (seed % 100) / 100 * TAU), V3(1, 1, 1));
  KIT.geo(g, mat, m, { worldUV: true });
  if (o.col !== false) PHY.cyl(x, z, r * 0.78 * (o.stretch || 1), y - 5, y + h * 0.9);
};
TERRAIN.rockMat = function () {
  const s = TEX.sets.rock;
  const m = new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughness: 0.9, envMapIntensity: 0.5 });
  m.userData.tscale = 6; return m;
};
/* ------------------------------------------------------------------ Tatooine sky (twin suns) */
TERRAIN.tatooineSky = function (L, o) {
  o = o || {}; const S1 = (o.sun || new THREE.Vector3(-0.45, 0.42, 0.55)).clone().normalize(), S2 = S1.clone().applyAxisAngle(YUP, -0.12); S2.y -= 0.035; S2.normalize();
  const U = { uT: { value: 0 }, uS1: { value: S1 }, uS2: { value: S2 } };
  const dome = SKY.dome(U, `uniform vec3 uS1, uS2;
    void main(){ vec3 d = normalize(vD); float el = d.y;
      vec3 zen = vec3(0.22, 0.42, 0.78), hor = vec3(0.92, 0.84, 0.72), low = vec3(0.85, 0.72, 0.56);
      vec3 c = mix(hor, zen, pow(smoothstep(-0.02, 0.7, el), 0.7)); c = mix(low, c, smoothstep(-0.15, 0.02, el));
      vec3 s1 = uS1, s2 = uS2;
      float a = max(dot(d, s1), 0.0), b = max(dot(d, s2), 0.0);
      c += vec3(1.2, 0.95, 0.6) * pow(a, 12.0) + vec3(40.0, 34.0, 26.0) * smoothstep(0.99955, 0.9998, a) + vec3(30.0, 22.0, 12.0) * smoothstep(0.99975, 0.99988, b);
      gl_FragColor = vec4(c, 1.0); }`);
  LEVEL.add(dome); L.updates.push(() => dome.position.copy(R.camera.position));   // a 1 km dome must travel with a 3 km run
  const env = new THREE.Scene(); env.add(new THREE.Mesh(dome.geometry, dome.material));
  const g = new THREE.Mesh(new THREE.CircleGeometry(300, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.68, 0.48) })); g.rotation.x = -HALF; g.position.y = -3; env.add(g);
  L.env = env;
  R.setSun(S1.clone(), 0xfff0d8, o.sunI || 3.4, 0xa8c4ee, 0xc8a078, 0.75);
  R.G.exposure = 1.0; R.G.bloom = 0.14; R.G.sat = 1.08; CM.fillU.value.setRGB(0.6, 0.55, 0.5); R.G.haze = 0.35;
  R.setShadowBox(30, 180); R.G.vol = 0.9; R.G.volDen = 0.006; R.G.volFall = 0.05; R.G.volH = 0; R.G.volOut = 1.0; R.G.volG = 0.75; R.G.volMax = 90; R.G.volAmb.setRGB(0.004, 0.0035, 0.003);
  R.G.gShadow.setRGB(0.9, 0.95, 1.1); R.G.gHigh.setRGB(1.06, 1.0, 0.92);
  R.scene.fog = new THREE.FogExp2(new THREE.Color(0.86, 0.78, 0.66), 0.0028);
};
