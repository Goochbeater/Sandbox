/* MAUL HEAD — the sculpted SDF head from the MAUL cinematic (maul-src), baked on the GPU into a dense distance grid,
   meshed with surface nets, projected back onto the field and shaded with the procedural make-up in the fragment shader.
   Head space: 1 unit = 10 cm, +y up, +z the way the face looks, +x = Maul's left, eye centres at y = 0. */
const MH = {};
MH.COMMON = `
#define PI 3.14159265359
float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3  sat(vec3 x)  { return clamp(x, 0.0, 1.0); }
float sq(float x)  { return x * x; }
mat2  rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float smax(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return max(a, b) + h * h * k * 0.25; }
float sdEllipsoid(vec3 p, vec3 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-6); }
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h) - r; }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr * rr; float il2 = 1.0 / l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2;
  vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv); float y2 = y * y * l2; float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash13(i), b = hash13(i + vec3(1, 0, 0)), c = hash13(i + vec3(0, 1, 0)), d = hash13(i + vec3(1, 1, 0));
  float e = hash13(i + vec3(0, 0, 1)), g = hash13(i + vec3(1, 0, 1)), h = hash13(i + vec3(0, 1, 1)), k = hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}
`;
MH.UNI = `
uniform vec4 uFace;
uniform vec4 uHorn[10];
uniform vec4 uHornD[10];
`;
MH.SDF = `const vec3  HP    = vec3(0.0, -0.78, -0.32);   // head pivot (atlas joint) in head space
const vec3  EYE_C = vec3(0.315, 0.0, 0.675);   // the +x eye centre
const float EYE_R = 0.12;

// material side-channel (filled when gWant is true)
bool  gWant = false;
float gMat = 0.0;
float gHornIdx = -1.0;
float gMouth = 0.0;       // 1 near the mouth-interior walls
float gLidEdge = 0.0;     // proximity to the lid margins (wet)


// ---------------------------------------------------------------- face rig helpers
float snarlLift(float ax) {      // upper-lip lift profile over |x|  (canine region lifts most)
  return uFace.z * (0.008 + 0.046 * exp(-sq((ax - 0.10) / 0.065)));
}
vec3 jawSpace(vec3 p) {          // rotate the query into the closed-jaw frame
  vec3 o = vec3(0.0, -0.27, -0.06);
  vec3 q = p - o;
  q.yz = rot(-uFace.w * 0.20) * q.yz;
  return q + o;
}

// ---------------------------------------------------------------- eyelids (thin shell with an almond opening)
float sdLids(vec3 q) {
  vec3 v = q - EYE_C;
  v.xz = rot(0.14) * v.xz;                       // socket axis turned slightly outward
  float r = length(v);
  float h = atan(v.x, v.z);                      // + toward the temple
  float w = asin(clamp(v.y / max(r, 1e-4), -1.0, 1.0));
  float s = clamp(h / 1.12, -1.0, 1.0);
  float prof = pow(max(1.0 - s * s, 0.0), 0.62);
  float tilt = 0.06 * s;
  float upPeak = 1.0 - 0.22 * sq(s + 0.3);       // upper margin peaks toward the nose
  float up = tilt + prof * upPeak * mix(-0.40, 0.2 - uFace.y * 0.06, uFace.x);
  float lo = tilt + prof * (-0.3 + uFace.y * 0.03 + (1.0 - uFace.x) * 0.03) + 0.03 * s;
  float dOpen = min(w - lo, up - w) * r;         // > 0 inside the opening
  float shell = abs(r - (EYE_R + 0.0115)) - 0.0092;
  float lid = smax(shell, dOpen, 0.0085);
  lid = smax(lid, -(v.z + 0.03), 0.03);           // front half only
  if (gWant) gLidEdge = max(gLidEdge, exp(-sq(dOpen / 0.01)) * step(-0.02, v.z));
  return lid;
}

// ---------------------------------------------------------------- mouth opening + oral cavity
float mouthCarve(vec3 p, float lift, float drop) {
  float ax = abs(p.x);
  float cx = sat(ax / 0.232);
  float lens = sqrt(max(1.0 - cx * cx, 0.0));
  float y0 = -0.722;
  float zc = 1.0 - 1.6 * p.x * p.x;              // lip-line depth follows the dental arch
  float yUp = y0 + (0.0005 + lift) * lens;
  float yLo = y0 - (0.0005 + drop) * lens;
  float dy = max(p.y - yUp, yLo - p.y);
  float slot = max(max(ax - 0.232, dy), max(p.z - zc - 0.15, zc - 0.20 - p.z)) * 0.72;
  float cav = sdEllipsoid(p - vec3(0.0, -0.735 - drop * 0.5, 0.74), vec3(0.19, 0.07 + drop * 0.7 + lift * 0.5, 0.2));
  return min(slot, cav);
}

// ---------------------------------------------------------------- ear (disc + helix rim + concha + lobe)
float sdEar(vec3 q) {
  vec3 e = q - vec3(0.70, -0.2, -0.17);
  e.xz = rot(-0.42) * e.xz;
  e.yz = rot(0.22) * e.yz;
  vec2 yz = e.yz;
  float outline = sdEllipsoid(vec3(0.0, yz), vec3(1.0, 0.3, 0.185));            // 2-D ellipse (approx)
  outline = max(outline, -(yz.y + 0.2) * 0.6 - 0.1);                               // keep the lobe
  float disc = max(outline, abs(e.x - 0.004) - 0.016);
  float rim = length(vec2(outline + 0.022, e.x - 0.02)) - 0.02;                    // helix rolled forward
  float ear = smin(disc, max(rim, yz.x * 0.0 - 0.3), 0.012);
  // antihelix ridge
  float ah = length(vec2(sdEllipsoid(vec3(0.0, yz - vec2(0.02, -0.01)), vec3(1.0, 0.19, 0.11)), e.x - 0.024)) - 0.012;
  ear = smin(ear, ah, 0.012);
  // concha bowl
  ear = smax(ear, -sdEllipsoid(e - vec3(0.032, -0.05, 0.035), vec3(0.022, 0.085, 0.06)), 0.014);
  // lobe
  ear = smin(ear, sdEllipsoid(e - vec3(0.006, -0.25, 0.0), vec3(0.028, 0.06, 0.055)), 0.03);
  // root: joins the head at the front edge
  ear = smin(ear, sdEllipsoid(e - vec3(-0.03, -0.03, 0.12), vec3(0.05, 0.16, 0.06)), 0.03);
  return ear;
}

// ---------------------------------------------------------------- nose: a bridge wedge + lobule + alae
float sdNose(vec3 p, vec3 q, float snarl) {
  vec3 N0 = vec3(0.0, 0.07, 0.878), N1 = vec3(0.0, -0.325, 1.085);
  vec3 ax = normalize(N1 - N0);
  vec3 nr = normalize(cross(vec3(1.0, 0.0, 0.0), ax));      // points out of the face (forward-up)
  if (nr.z < 0.0) nr = -nr;
  vec3 v = p - N0;
  float al = dot(v, ax), ou = dot(v, nr);
  float L = length(N1 - N0);
  float s = sat(al / L);
  float w = mix(0.016, 0.036, s * s) + 0.006 * sin(s * 3.1416);   // slight dorsal hump
  float roof = abs(v.x) * 0.80 + ou * 0.60 - w;
  roof = smax(roof, -al - 0.02, 0.04);
  roof = smax(roof, al - L - 0.03, 0.05);
  roof = smax(roof, -ou - 0.11, 0.04);                                // no deeper than the face
  float nose = roof * 0.9;
  // lobule (tip) and its two domes
  nose = smin(nose, sdEllipsoid(p - vec3(0.0, -0.36, 1.09), vec3(0.062, 0.056, 0.06)), 0.05);
  // alae (wings), flared by the snarl
  vec3 a2 = q - vec3(0.088 + snarl * 0.01, -0.418 + snarl * 0.012, 1.0);
  a2.xz = rot(-0.55) * a2.xz;
  a2.xy = rot(0.25) * a2.xy;
  nose = smin(nose, sdEllipsoid(a2, vec3(0.036, 0.044, 0.07)), 0.04);
  // columella + base
  nose = smin(nose, sdCapsule(p, vec3(0.0, -0.41, 1.07), vec3(0.0, -0.47, 1.025), 0.016), 0.03);
  // nostrils
  vec3 ns = q - vec3(0.045 + snarl * 0.006, -0.455, 1.05);
  ns.yz = rot(0.6) * ns.yz;
  ns.xz = rot(-0.4) * ns.xz;
  nose = smax(nose, -sdEllipsoid(ns, vec3(0.022 + snarl * 0.005, 0.012, 0.034)), 0.01);
  return nose;
}

// ---------------------------------------------------------------- STATIC head (baked into a 3-D texture at boot)
// rest pose; everything that never moves: skull, face masses, jaw, cheeks, nose, ears, horns.
// the brow, orbits, lids, lips and mouth are layered on live by applyEye() / applyMouth().
float sdHorns(vec3 p);
float sdHeadStatic(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  // ---- cranium: vault + frontal bone + occiput
  float d = sdEllipsoid(p - vec3(0.0, 0.31, -0.10), vec3(0.735, 0.855, 0.93));
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.43, 0.24), vec3(0.64, 0.56, 0.635)), 0.24);
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.10, -0.60), vec3(0.62, 0.58, 0.46)), 0.2);
  // ---- face mass: mid face + lower face, cut underneath into a V
  float face = sdEllipsoid(p - vec3(0.0, -0.3, 0.3), vec3(0.6, 0.72, 0.6));
  float lower = sdEllipsoid(p - vec3(0.0, -0.66, 0.3), vec3(0.54, 0.5, 0.56));
  face = smin(face, lower, 0.12);
  vec3 JN = normalize(vec3(0.5, -0.86, -0.06));
  face = smax(face, dot(q - vec3(0.53, -0.925, 0.0), JN), 0.08);
  face = smax(face, dot(p - vec3(0.0, -1.16, 0.72), normalize(vec3(0.0, -1.0, -0.3))), 0.07);
  d = smin(d, face, 0.16);
  // temples + the hollow under the cheekbones
  d = smax(d, -sdEllipsoid(q - vec3(0.86, 0.08, 0.38), vec3(0.17, 0.30, 0.30)), 0.14);
  d = smax(d, -sdEllipsoid(q - vec3(0.66, -0.52, 0.42), vec3(0.14, 0.2, 0.2)), 0.16);
  // ---- cheekbones, infra-orbital fill, maxilla
  vec3 c = q - vec3(0.47, -0.17, 0.55);
  c.xz = rot(-0.6) * c.xz;
  c.xy = rot(-0.25) * c.xy;
  d = smin(d, sdEllipsoid(c, vec3(0.2, 0.085, 0.22)), 0.1);
  d = smin(d, sdEllipsoid(q - vec3(0.25, -0.2, 0.64), vec3(0.19, 0.11, 0.13)), 0.1);
  vec3 mx = p - vec3(0.0, -0.53, 0.72);
  mx.z += 0.9 * mx.x * mx.x;
  d = smin(d, sdEllipsoid(mx, vec3(0.3, 0.2, 0.2)) * 0.85, 0.12);
  // ---- mandible edge + chin
  float mand = sdRoundCone(q, vec3(0.57, -0.32, -0.07), vec3(0.535, -0.84, -0.02), 0.07, 0.075);
  mand = smin(mand, sdRoundCone(q, vec3(0.535, -0.84, -0.02), vec3(0.16, -1.08, 0.72), 0.075, 0.07), 0.06);
  d = smin(d, mand, 0.08);
  d = smin(d, sdEllipsoid(p - vec3(0.0, -1.02, 0.79), vec3(0.17, 0.125, 0.12)), 0.08);
  // ---- nose, ears, horns
  d = smin(d, sdNose(p, q, 0.0), 0.04);
  d = smin(d, sdEar(q), 0.035);
  if (p.y > 0.1) d = smin(d, sdHorns(p), 0.045);
  return d;
}

// ---------------------------------------------------------------- LIVE layers
const vec3 EYEBOX_C = vec3(0.29, 0.05, 0.77), EYEBOX_H = vec3(0.34, 0.25, 0.25);
const vec3 MOUTHBOX_C = vec3(0.0, -0.77, 0.86), MOUTHBOX_H = vec3(0.37, 0.31, 0.3);

// brow (furrows), orbit carve, eyelids
float applyEye(vec3 p, vec3 q, float d) {
  float furrow = uFace.y;
  float dm = max(d, 0.0);
  if (sdBox(q - vec3(0.27, 0.15, 0.8), vec3(0.33, 0.12, 0.16)) < dm + 0.09) {
    vec3 b = q - vec3(0.285, 0.172 - furrow * 0.016, 0.795);
    b.xz = rot(0.36) * b.xz;
    b.xy = rot(0.10 - furrow * 0.16) * b.xy;
    d = smin(d, sdEllipsoid(b, vec3(0.235, 0.066, 0.11)), 0.08);
    d = smin(d, sdEllipsoid(p - vec3(0.0, 0.13 - furrow * 0.014, 0.858), vec3(0.12, 0.09, 0.085)), 0.07);
    d = smin(d, sdEllipsoid(p - vec3(0.0, 0.07, 0.895), vec3(0.06, 0.05, 0.03 + furrow * 0.012)), 0.04);
  }
  float de = length(q - EYE_C);
  if (de < 0.26) {
    d = smax(d, -sdEllipsoid(q - vec3(0.315, 0.004, 0.8), vec3(0.176, 0.124, 0.108)), 0.05);
    d = smin(d, sdLids(q), 0.032);
  }
  return d;
}

// lips, philtrum, nasolabial folds, mouth opening (upper lip rides the snarl, lower the jaw)
float applyMouth(vec3 p, vec3 q, vec3 pj, float d) {
  float snarl = uFace.z;
  float lift = snarlLift(q.x);
  vec3 m = p - vec3(0.0, -0.61 + lift * 0.45, 0.9);
  m.z += 1.3 * m.x * m.x;
  d = smin(d, sdEllipsoid(m, vec3(0.24, 0.11, 0.062)) * 0.8, 0.05);
  d = smax(d, -sdCapsule(p, vec3(0.0, -0.515, 1.02), vec3(0.0, -0.648 + lift, 1.03), 0.01), 0.018);
  vec3 ul = p - vec3(0.0, -0.688 + lift, 0.972);
  ul.z += 1.8 * ul.x * ul.x;
  ul.y += 0.008 * exp(-ul.x * ul.x * 420.0);
  float tu = 1.0 - 0.55 * sq(ul.x / 0.222);
  d = smin(d, sdEllipsoid(ul, vec3(0.222, 0.03 * tu, 0.04 * tu + 0.004)) * 0.75, 0.012);
  vec3 ll = pj - vec3(0.0, -0.763, 0.962);
  ll.z += 2.0 * ll.x * ll.x;
  float tl = 1.0 - 0.6 * sq(ll.x / 0.195);
  d = smin(d, sdEllipsoid(ll, vec3(0.195, 0.041 * tl + 0.004, 0.046 * tl + 0.004)) * 0.75, 0.014);
  d = smax(d, -sdCapsule(pj, vec3(-0.12, -0.862, 0.95), vec3(0.12, -0.862, 0.95), 0.018), 0.04);
  vec3 nl = q - vec3(0.2, -0.56, 0.905);
  nl.xy = rot(1.05) * nl.xy;
  d = smax(d, -sdEllipsoid(nl, vec3(0.12, 0.01 + snarl * 0.01, 0.016 + snarl * 0.012)) * 0.6, 0.03);
  float drop = uFace.w * 0.21;
  float mo = mouthCarve(p, lift, drop);
  d = smax(d, -mo, 0.01);
  if (gWant) gMouth = (1.0 - smoothstep(-0.005, 0.02, mo));
  return d;
}

// ---------------------------------------------------------------- horns (ten, bone)
float sdHorn(vec3 p, int i) {
  vec4 H = uHorn[i], D = uHornD[i];
  vec3 v = p - H.xyz;
  vec3 up = D.xyz;
  vec3 side = normalize(cross(up, vec3(0.0, 0.0, -1.0) + vec3(0.0001, 0.0, 0.0)));
  vec3 bend = cross(side, up);                   // curves back
  float ly = dot(v, up), lx = dot(v, bend), lz = dot(v, side);
  float L = H.w, rb = D.w;
  float s = sat(ly / L);
  lx -= 0.42 * L * s * s;                        // backward sweep
  float d = sdRoundCone(vec3(lx, ly, lz), vec3(0.0, -0.05, 0.0), vec3(0.0, L, 0.0), rb, 0.021);
  d += 0.004 * sin(ly * 85.0 + float(i) * 2.1) * sat(1.0 - s * 1.6);    // growth rings near the base
  d += 0.003 * sin(atan(lz, lx) * 7.0 + ly * 20.0) * sat(1.0 - s);       // longitudinal grooves
  return d;
}
float sdHorns(vec3 p) {
  float d = 1e3;
  for (int i = 0; i < 10; i++) {
    vec4 H = uHorn[i];
    float bd = length(p - H.xyz - uHornD[i].xyz * H.w * 0.45) - (H.w * 0.62 + uHornD[i].w + 0.02);
    if (bd > d) continue;
    float h = sdHorn(p, i);
    if (h < d) { d = h; if (gWant) gHornIdx = float(i); }
  }
  return d;
}

`;
MH.PAINT = `
// =====================================================================================
//  THE MAKE-UP.  2-D designs in head space: a front projection (x, y) for the face and a
//  top projection (x, z) for the scalp, blended by position.  Each returns a signed value:
//  > 0 red paint, < 0 black paint (roughly metric, units of head space).
// =====================================================================================
float sdSeg2(vec2 p, vec2 a, vec2 b, float wa, float wb) {
  vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(wa, wb, h);
}
float sdEll2(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
float dot2(vec2 v) { return dot(v, v); }
// quadratic bezier stroke (IQ), width w0 -> w1 along the curve
float sdBez(vec2 pos, vec2 A, vec2 B, vec2 C, float w0, float w1) {
  vec2 a = B - A, b = A - 2.0 * B + C, c = a * 2.0, d = A - pos;
  float kk = 1.0 / dot(b, b);
  float kx = kk * dot(a, b), ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0, kz = kk * dot(d, a);
  float p = ky - kx * kx, p3 = p * p * p, q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float h = q * q + 4.0 * p3, res, tt;
  if (h >= 0.0) {
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    tt = clamp(uv.x + uv.y - kx, 0.0, 1.0);
    res = dot2(d + (c + b * tt) * tt);
  } else {
    float z = sqrt(-p), v = acos(q / (p * z * 2.0)) / 3.0, m = cos(v), n = sin(v) * 1.732050808;
    vec3 t = clamp(vec3(m + m, -n - m, n - m) * z - kx, 0.0, 1.0);
    float r1 = dot2(d + (c + b * t.x) * t.x), r2 = dot2(d + (c + b * t.y) * t.y);
    res = min(r1, r2); tt = r1 < r2 ? t.x : t.y;
  }
  return sqrt(res) - mix(w0, w1, tt);
}

// ---------------------------------------------------------------- the face (front view)
float paintFace(vec2 f) {
  // ---- where the red is allowed at all
  float oval = sdEll2(f, vec2(0.0, 0.16), vec2(0.70, 1.16));
  float cheekFloor = (-0.655 + 0.55 * max(f.x - 0.34, 0.0)) - f.y;           // > 0 below the cheek line
  float upper = max(oval, max(cheekFloor, f.x - 0.64));
  float chin = max(sdEll2(f, vec2(0.0, -0.95), vec2(0.19, 0.205)), -0.8 - f.y);
  float llip = max(abs(f.y + 0.765) - 0.03, f.x - 0.185 + 0.6 * max(-0.765 - f.y, 0.0));
  float red = min(upper, min(chin, llip));                                   // < 0 inside a red zone

  // ---- black shapes laid over it (min = union)
  float b = 1e3;
  // eye mask, pushed out to the temple, covering the outer brow with two flames
  b = min(b, sdEll2(f, vec2(0.338, 0.006), vec2(0.238, 0.148)));
  b = min(b, sdSeg2(f, vec2(0.46, 0.03), vec2(0.69, 0.13), 0.09, 0.03));
  b = min(b, sdBez(f, vec2(0.33, 0.1), vec2(0.34, 0.24), vec2(0.385, 0.35), 0.075, 0.004));
  b = min(b, sdBez(f, vec2(0.49, 0.08), vec2(0.52, 0.22), vec2(0.585, 0.32), 0.07, 0.004));
  // tear-drop fang below each eye
  b = min(b, sdBez(f, vec2(0.29, -0.05), vec2(0.285, -0.22), vec2(0.315, -0.4), 0.085, 0.004));
  // centre stripe: scalp -> glabella -> thin line down the nose
  float wC = f.y > 0.24 ? mix(0.03, 0.06, sat((f.y - 0.24) / 0.8)) : mix(0.014, 0.03, sat((f.y + 0.28) / 0.52));
  b = min(b, max(f.x - wC, -0.36 - f.y));
  b = min(b, sdEll2(f, vec2(0.0, 0.135), vec2(0.055, 0.1)));                   // glabella diamond
  // the "S" from the inner brow up to the front horn
  b = min(b, sdBez(f, vec2(0.16, 0.15), vec2(0.12, 0.47), vec2(0.27, 0.5), 0.026, 0.033));
  b = min(b, sdBez(f, vec2(0.27, 0.5), vec2(0.45, 0.52), vec2(0.455, 0.68), 0.033, 0.036));
  b = min(b, sdBez(f, vec2(0.455, 0.68), vec2(0.47, 0.8), vec2(0.43, 0.93), 0.036, 0.065));
  b = min(b, sdBez(f, vec2(0.40, 0.515), vec2(0.51, 0.5), vec2(0.55, 0.39), 0.026, 0.004));   // hook toward the temple
  b = min(b, sdBez(f, vec2(0.25, 0.5), vec2(0.25, 0.57), vec2(0.29, 0.63), 0.02, 0.003));    // small spur up
  // nose tip, nostrils, alar wings
  b = min(b, sdEll2(f, vec2(0.0, -0.435), vec2(0.165, 0.082)));
  // upper lip / moustache field widening down to the mouth corners
  b = min(b, max(f.x - (0.14 + (-0.46 - f.y) * 0.62), max(f.y + 0.46, -0.738 - f.y)));
  // mouth corners run down beside the chin
  b = min(b, sdSeg2(f, vec2(0.235, -0.73), vec2(0.2, -0.98), 0.045, 0.025));
  // cheek chevrons (two nested V's pointing down toward the mouth)
  b = min(b, sdSeg2(f, vec2(0.57, -0.22), vec2(0.38, -0.47), 0.026, 0.032));
  b = min(b, sdSeg2(f, vec2(0.38, -0.47), vec2(0.21, -0.33), 0.032, 0.012));
  b = min(b, sdSeg2(f, vec2(0.57, -0.44), vec2(0.37, -0.66), 0.024, 0.03));
  b = min(b, sdSeg2(f, vec2(0.37, -0.66), vec2(0.27, -0.58), 0.03, 0.01));
  // lower lip accents + chin stripes
  b = min(b, sdSeg2(f, vec2(0.0, -0.735), vec2(0.0, -1.13), 0.009, 0.016));
  b = min(b, sdSeg2(f, vec2(0.08, -0.74), vec2(0.1, -1.07), 0.008, 0.014));
  // a dot at the temple like the reference
  b = min(b, sdEll2(f, vec2(0.6, 0.32), vec2(0.03, 0.025)));
  return min(-red, b);                           // > 0 only inside red and outside every black shape
}

// ---------------------------------------------------------------- the scalp (top view: x, z)
float paintTop(vec2 t) {
  float panel = max(abs(t.x - 0.34) - 0.29, max(t.y - 0.72, -0.72 - t.y + 0.35 * sq(t.x)));
  float red = panel;
  float b = 1e3;
  b = min(b, t.x - (0.055 + 0.012 * sin(t.y * 7.0)));                             // centre stripe
  b = min(b, sdSeg2(t, vec2(0.20, 0.45), vec2(0.30, 0.05), 0.03, 0.035));        // flames over the crown
  b = min(b, sdSeg2(t, vec2(0.30, 0.05), vec2(0.22, -0.35), 0.035, 0.02));
  b = min(b, sdSeg2(t, vec2(0.52, 0.35), vec2(0.45, -0.05), 0.03, 0.04));
  b = min(b, sdSeg2(t, vec2(0.45, -0.05), vec2(0.55, -0.45), 0.04, 0.01));
  b = min(b, sdSeg2(t, vec2(0.10, -0.55), vec2(0.32, -0.7), 0.03, 0.01));
  return min(-red, b);
}

// returns redness 0..1 at a head-space surface point
float makeup(vec3 p0, vec3 n) {
  // paint rides with the rig: lower lip / chin with the jaw, upper lip with the snarl
  vec3 p = p0;
  if (p0.y < -0.728 && p0.z > 0.2) p = jawSpace(p0);
  else if (p0.y < -0.45 && p0.z > 0.8) p.y -= snarlLift(abs(p0.x)) * (1.0 - smoothstep(-0.68, -0.45, p0.y));
  float side = p.x >= 0.0 ? 1.0 : -1.0;
  vec3 w3 = vec3(vnoise(p * 6.0 + side * 3.1), vnoise(p * 6.0 + 17.0 + side * 1.3), 0.0) - 0.5;
  vec2 f = vec2(abs(p.x), p.y) + w3.xy * 0.018;
  vec2 t = vec2(abs(p.x), p.z) + w3.yx * 0.02;
  float wF = smoothstep(-0.12, 0.2, p.z) * (1.0 - smoothstep(0.7, 0.95, p.y));
  float wT = smoothstep(0.55, 0.85, p.y);
  float dF = paintFace(f);
  float dT = paintTop(t);
  float dd = -0.05;                                             // default: black
  float wsum = wF + wT;
  if (wsum > 0.001) dd = mix(-0.05, (dF * wF + dT * wT) / wsum, sat(wsum));
  // black collars around every horn base
  for (int i = 0; i < 10; i++) dd = min(dd, length(p - uHorn[i].xyz) - (uHornD[i].w + 0.045 + 0.02 * float(i % 3)));
  // painted edges: brush tremble + fine bristle noise
  dd += (vnoise(p * 42.0) - 0.5) * 0.009 + (vnoise(p * 140.0) - 0.5) * 0.004;
  return smoothstep(-0.0035, 0.0035, dd);
}
`;
