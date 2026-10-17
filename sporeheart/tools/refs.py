# Builds downscaled reference art + square HUD portraits from refs/codex*.jpg
from PIL import Image
import os
R=os.path.join(os.path.dirname(__file__),'..','refs')
# crop boxes in original 1148x2048 pixel space (x0,y0,x1,y1)
CROPS={
 'mage':   (200,250,830,880),
 'katana': (400,330,840,770),
 'poncho': (270,330,730,790),
 'skull':  (200,430,720,950),
}
IDX={'mage':0,'katana':1,'poncho':2,'skull':3}
for i in range(4):
    im=Image.open(f'{R}/codex{i}.jpg').convert('RGB')
    im.resize((574,1024),Image.LANCZOS).save(f'{R}/small{i}.jpg',quality=82)
for k,box in CROPS.items():
    im=Image.open(f'{R}/codex{IDX[k]}.jpg').convert('RGB').crop(box)
    s=max(im.size); sq=Image.new('RGB',(s,s),(40,70,60)); sq.paste(im,((s-im.width)//2,(s-im.height)//2))
    sq.resize((160,160),Image.LANCZOS).save(f'{R}/face_{k}.jpg',quality=88)
