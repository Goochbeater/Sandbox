# Outfit textures (Quaternius Modular Character Outfits - Fantasy, CC0) -> recolourable maps in assets/:
#   <o>_msk.jpg : R = primary-class weight, G = secondary-class weight, B = detail (luminance / class mean, /2)
#                 (third class = 1 - R - G: metal / neutral)  -> the shader paints any palette over the painted detail
#   <o>_nrm.jpg, <o>_orm.jpg (AO / roughness / metal)
#   rmale_col / rfemale_col (+ _nrm): the regular-body skin used by the outfits' bare arms / hands
import numpy as np
from PIL import Image
import os, sys
A = os.path.expanduser('~/maul-assets/MCOF/Modular Character Outfits - Fantasy[Standard]/Textures/')
OUT = os.path.join(os.path.dirname(__file__), '../assets/')
SZ = int(os.environ.get('SZ', '2048'))

def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def masks(src, kind):
    im = np.asarray(Image.open(src).convert('RGB').resize((SZ, SZ), Image.LANCZOS)).astype(np.float32) / 255.0
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mx, mn = im.max(-1), im.min(-1); s = np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0)
    h = np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) % 360
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    warm = np.clip(1 - np.abs(((h - 30 + 180) % 360) - 180) / 40, 0, 1)
    if kind == 'ranger':       # green cloth / brown leather / neutral (metal, cream, stitches)
        green = np.clip(1 - np.abs(((h - 115 + 180) % 360) - 180) / 55, 0, 1)
        w0 = green * ss(0.08, 0.22, s); w1 = warm * ss(0.12, 0.28, s) * (1 - w0)
    else:                      # peasant: brown (vest, trousers, boots, belts) / cream shirt / neutral grey
        w1 = warm * (1 - ss(0.22, 0.4, s)) * ss(0.3, 0.45, lum)        # cream
        w0 = np.clip(warm * ss(0.15, 0.3, s) + ss(0.12, 0.0, s) * ss(0.3, 0.12, lum), 0, 1) * (1 - w1)
    w2 = np.clip(1 - w0 - w1, 0, 1)
    means = [max(1e-3, float((lum * w).sum() / max(w.sum(), 1))) for w in (w0, w1, w2)]
    mean = (w0 * means[0] + w1 * means[1] + w2 * means[2]) / np.maximum(w0 + w1 + w2, 1e-4)
    det = np.clip(lum / np.maximum(mean, 1e-3) / 2, 0, 1)
    out = np.stack([w0, w1, det], -1)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(OUT + kind + '_msk.jpg', quality=92, subsampling=0)
    print(kind, 'class means', [round(m, 3) for m in means], 'cover', [round(float(w.mean()), 3) for w in (w0, w1, w2)])

def jpg(src, dst, px, q):
    Image.open(src).convert('RGB').resize((px, px), Image.LANCZOS).save(OUT + dst, quality=q)

masks(A + 'Ranger/T_Ranger_BaseColor.png', 'ranger')
masks(A + 'Peasant/T_Peasant_BaseColor.png', 'peasant')
for k in ('Ranger', 'Peasant'):
    jpg(A + k + '/T_' + k + '_Normal.png', k.lower() + '_nrm.jpg', SZ, 90)
    jpg(A + k + '/T_' + k + '_ORM.png', k.lower() + '_orm.jpg', 1024, 88)
for k, f in (('rmale', 'Male'), ('rfemale', 'Female')):
    jpg(A + 'Base/T_Regular_' + f + '_Dark_BaseColor.png', k + '_col.jpg', 1024, 88)
    jpg(A + 'Base/T_Regular_' + f + '_Normal.png', k + '_nrm.jpg', 1024, 88)
    im = np.asarray(Image.open(A + 'Base/T_Regular_' + f + '_Dark_BaseColor.png').convert('RGB').resize((128, 128))).reshape(-1, 3)
    print(k, 'skin median', np.median(im, 0))
