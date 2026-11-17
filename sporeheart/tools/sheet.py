# contact sheet: python3 tools/sheet.py out.jpg <height> img1 img2 ...
import sys
from PIL import Image
out=sys.argv[1]; H=int(sys.argv[2]); names=sys.argv[3:]
ims=[Image.open(n).convert('RGB') for n in names]
ims=[im.resize((int(im.width*H/im.height),H)) for im in ims]
W=sum(i.width for i in ims)
s=Image.new('RGB',(W,H)); x=0
for im in ims: s.paste(im,(x,0)); x+=im.width
s.save(out,quality=88); print(s.size)
