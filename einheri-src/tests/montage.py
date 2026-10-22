import sys, json
from PIL import Image, ImageDraw
d, name, labels = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
ims = [Image.open(d + '_p%d.png' % i) for i in range(len(labels))]
w, h = ims[0].size; cw = int(w * .62); x0 = (w - cw) // 2
cols = min(3, len(ims)); rows = (len(ims) + cols - 1) // cols
out = Image.new('RGB', (cw * cols, h * rows))
for i, im in enumerate(ims):
    c = im.crop((x0, 0, x0 + cw, h)); dr = ImageDraw.Draw(c); dr.text((8, 8), labels[i], fill=(255, 255, 255)); out.paste(c, ((i % cols) * cw, (i // cols) * h))
out.save(d + name + '.png')
