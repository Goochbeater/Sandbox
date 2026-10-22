#!/usr/bin/env python3
"""Cut the character kit's baked Quaternius bundle (q.json + q.bin, CC0) down to what the demo's cast needs, and
shrink the textures. The king is drawn into an ~80 px tall sprite, so 2048 px textures and normal maps buy nothing.

  python3 -I tools/trim_assets.py <kit engine/assets dir>   ->  assets/king.json, assets/king.bin, assets/*.jpg
"""
import json, os, sys
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
MESHES = ['male', 'rmale', 'rm_peasant', 'rm_ranger', 'female', 'rfemale', 'rf_peasant', 'rf_ranger', 'Hair_Long', 'Hair_Beard', 'Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Buns']
PRIMS = {'rf_ranger': ['Female_Ranger_Head_Hood']}   # only these pieces of an outfit (the witch's hood)
CLIPS = ['Idle_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Idle_Talking_Loop', 'Interact', 'Idle_FoldArms_Loop', 'Sitting_Idle_Loop', 'Idle_Shield_Loop',
         'Sword_Idle', 'Sword_Regular_Combo', 'Sword_Block', 'Sword_Attack', 'Fixing_Kneeling', 'Jog_Fwd_Loop', 'Spell_Simple_Idle_Loop']
TEX = {'male_col': 512, 'female_col': 512, 'rmale_col': 256, 'rfemale_col': 256, 'hair1_col': 256, 'hair2_col': 256, 'eye_col': 128,
       'peasant_col': 512, 'ranger_col': 512}
SIZE = {'Float32Array': 4, 'Int16Array': 2, 'Uint8Array': 1, 'Uint16Array': 2, 'Uint32Array': 4}

M = json.load(open(os.path.join(SRC, 'q.json')))
BIN = open(os.path.join(SRC, 'q.bin'), 'rb').read()
out = bytearray()


def move(node):
    """copy every {o, n, t} array reference into the new buffer (4-byte aligned) and rewrite its offset"""
    if isinstance(node, dict):
        if set(node.keys()) >= {'o', 'n', 't'} and node['t'] in SIZE:
            ln = node['n'] * SIZE[node['t']]
            while len(out) % 4:
                out.append(0)
            o = len(out)
            out.extend(BIN[node['o']:node['o'] + ln])
            return dict(node, o=o)
        return {k: move(v) for k, v in node.items()}
    if isinstance(node, list):
        return [move(v) for v in node]
    return node


# the male body is only used for its head, eyes and brows: drop nothing here, the page cuts the head out at load
res = {'skel': M['skel'], 'srcPelvisH': M['srcPelvisH'],
       'meshes': {k: move(dict(M['meshes'][k], prims=[p for p in M['meshes'][k]['prims'] if k not in PRIMS or p.get('name') in PRIMS[k]])) for k in MESHES},
       'clips': {k: move(M['clips'][k]) for k in CLIPS}}
os.makedirs(OUT, exist_ok=True)
json.dump(res, open(os.path.join(OUT, 'king.json'), 'w'), separators=(',', ':'))
open(os.path.join(OUT, 'king.bin'), 'wb').write(out)
for name, px in TEX.items():
    im = Image.open(os.path.join(SRC, name + '.jpg')).convert('RGB')
    im = im.resize((px, px), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.jpg'), quality=88)
print('king.bin', len(out), 'bytes;', len(res['meshes']), 'meshes;', len(res['clips']), 'clips')
