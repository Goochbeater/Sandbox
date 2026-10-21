/* ASSETS: embedded mobile texture files (assets/extra/* -> build.sh -> <script id="ast_<name>" data-mime="..."> in base64).
   ASSET.url() decodes a tag once into a blob: URL. ASSET.tex()/mat() return THREE objects that fill in when the image decodes.
   A missing name gives a 1x1 stand-in and one console.warn, so a dropped file never breaks a level. Names: docs/ASSETS.md.
   Load-time work is zero: nothing runs until a level asks for a texture, so ?norender boots are unaffected. */
const ASSET = { _url: {}, _tex: {}, _mat: {}, _ready: {}, _cbs: {}, _warned: {}, _grey: null, _flat: null };
ASSET._warn = function (name, why) {          // once per name, never per frame
  if (ASSET._warned[name]) return; ASSET._warned[name] = 1; console.warn('ASSET ' + name + ': ' + why);
};
ASSET._el = function (name) { try { return document.getElementById('ast_' + name); } catch (e) { return null; } };
ASSET.has = function (name) { return !!ASSET._el(name); };
ASSET.names = function () {                   // every embedded name, sorted (preload-all, contact sheet)
  const out = []; try { document.querySelectorAll('script[id^="ast_"]').forEach((s) => out.push(s.id.slice(4))); } catch (e) { /* no DOM */ }
  return out.sort();
};
ASSET.url = function (name) {                 // blob: URL of the embedded file; decoded once, cached
  if (ASSET._url[name]) return ASSET._url[name];
  const el = ASSET._el(name);
  if (!el) { ASSET._warn(name, 'not embedded (missing from assets/extra?)'); return null; }
  const mime = el.getAttribute('data-mime') || 'image/jpeg', b64 = el.textContent.replace(/\s+/g, '');
  try {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    ASSET._url[name] = URL.createObjectURL(new Blob([u8], { type: mime }));
  } catch (e) { ASSET._url[name] = 'data:' + mime + ';base64,' + b64; }   // no blob support: slower, still loads
  return ASSET._url[name];
};
ASSET._solid = function (flatNormal) {        // shared 1x1 stand-in: mid-grey colour, or the flat normal (0.5, 0.5, 1)
  const k = flatNormal ? '_flat' : '_grey';
  if (!ASSET[k]) {
    const t = new THREE.DataTexture(new Uint8Array(flatNormal ? [128, 128, 255, 255] : [128, 128, 128, 255]), 1, 1);
    t.colorSpace = flatNormal ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.needsUpdate = true; ASSET[k] = t;
  }
  return ASSET[k];
};
ASSET._fire = function (key, tx) {            // decode finished (or failed): run the queued callbacks once
  ASSET._ready[key] = 1; const q = ASSET._cbs[key] || []; ASSET._cbs[key] = [];
  for (const f of q) { try { f(tx); } catch (e) { console.warn(e); } }
};
ASSET._greyImage = function () {              // decode failed: a grey canvas keeps the material sane (black would look broken)
  const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 1, 1); return c;
};
/* ASSET.tex(name, { repeat:[x,y], srgb, aniso, cb }) -> THREE.Texture. Colour maps default to sRGB; *_nrm defaults to linear.
   cb(tex) runs when the image decodes (immediately, next microtask, if it already has). One texture per name+options. */
ASSET.tex = function (name, o) {
  o = o || {};
  const normal = /_nrm$/.test(name);
  const srgb = o.srgb === undefined ? !normal : !!o.srgb;
  const rep = o.repeat || [1, 1], an = o.aniso || 4;
  const key = name + '|' + (srgb ? 's' : 'l') + '|' + rep[0] + 'x' + rep[1] + '|' + an;
  let t = ASSET._tex[key];
  if (!t) {
    const url = ASSET.url(name);
    if (!url) { t = ASSET._solid(normal); ASSET._ready[key] = 1; }
    else {
      t = new THREE.TextureLoader().load(url, (tx) => ASSET._fire(key, tx), undefined, () => {
        ASSET._warn(name, 'could not decode'); const c = ASSET._greyImage(); t.image = c; t.needsUpdate = true; ASSET._fire(key, t);
      });
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
      t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = an;   // three clamps to the GPU max
    }
    ASSET._tex[key] = t;
  }
  if (o.cb) {
    if (ASSET._ready[key]) Promise.resolve().then(() => o.cb(t));
    else (ASSET._cbs[key] = ASSET._cbs[key] || []).push((tx) => o.cb(tx || t));
  }
  return t;
};
/* ASSET.mat(name, o) -> MeshStandardMaterial. Albedo = name, normal = name + '_nrm' when embedded.
   o: color, rough (1), metal (0), env (0.7), ns (normal scale), repeat [x,y], aniso, side. Cached per name+options. */
ASSET.mat = function (name, o) {
  o = o || {};
  const key = name + JSON.stringify(o);
  if (ASSET._mat[key]) return ASSET._mat[key];
  const rep = o.repeat || [1, 1];
  const m = new THREE.MeshStandardMaterial({ map: ASSET.tex(name, { repeat: rep, aniso: o.aniso }),
    color: o.color !== undefined ? o.color : 0xffffff, roughness: o.rough !== undefined ? o.rough : 1, metalness: o.metal || 0,
    envMapIntensity: o.env !== undefined ? o.env : 0.7, side: o.side || THREE.FrontSide });
  if (ASSET.has(name + '_nrm')) { m.normalMap = ASSET.tex(name + '_nrm', { repeat: rep, aniso: o.aniso }); m.normalScale.set(o.ns || 1, o.ns || 1); }
  m.userData.asset = name; ASSET._mat[key] = m; return m;
};
/* ASSET.preload(names?, onProgress(0..1)) -> Promise<{ loaded, missing }>. No names = every embedded file. */
ASSET.preload = function (names, onProgress) {
  const list = (names && names.length ? names : ASSET.names()).slice(), n = list.length, missing = [];
  if (!n) return Promise.resolve({ loaded: 0, missing });
  return new Promise((resolve) => {
    let done = 0;
    const step = () => {
      done++; if (onProgress) { try { onProgress(done / n); } catch (e) { console.warn(e); } }
      if (done === n) resolve({ loaded: n - missing.length, missing });
    };
    for (const name of list) {
      if (!ASSET.has(name)) { missing.push(name); ASSET._warn(name, 'not embedded'); step(); continue; }
      ASSET.tex(name, { cb: step });
    }
  });
};
