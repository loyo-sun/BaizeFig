from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,shutil
r=Path(__file__).resolve().parent.parent;research=r.parents[2]/'Penpot研究环境'
# The original reference is kept intact; no masks, image shifts or threshold relaxation.
ref=Image.open(research/'evidence/penpot/pixel-rectangle-clean.png').convert('RGB');current=Image.open(r/'evidence/rectangle.png').convert('RGB');previous=Image.open(research/'evidence/baize/pixel-rectangle.png').convert('RGB')
ref.save(r/'evidence/penpot-rectangle-reference.png')
a=np.asarray(current).astype(np.int16);b=np.asarray(ref).astype(np.int16);delta=np.abs(a-b);maxdelta=delta.max(2);noise=np.any(a!=np.asarray(Image.open(r/'evidence/rectangle-repeat.png').convert('RGB')),2).sum()
metrics={}
for label,box in {'full':(0,0,1440,1000),'left':(0,0,340,1000),'right':(1122,0,1440,1000),'common_canvas':(358,100,1122,900),'toolbar':(567,28,873,88),'geometry':(1134,180,1382,284)}.items():
 x0,y0,x1,y1=box;metrics[label]={'box':box,'different_percent':float((maxdelta[y0:y1,x0:x1]>0).mean()*100),'mean_absolute_rgb':float(delta[y0:y1,x0:x1].mean())}
overlay=Image.blend(ref,current,.5);heat=np.zeros_like(a,dtype=np.uint8);heat[:,:,0]=np.minimum(maxdelta*3,255).astype('uint8');heat[:,:,2]=np.minimum(maxdelta*2,255).astype('uint8');heat=Image.fromarray(heat)
for name,im in [('overlay',overlay),('heatmap',heat)]:im.save(r/'evidence'/f'{name}.png')
panel=Image.new('RGB',(1440,1080),'white');d=ImageDraw.Draw(panel);font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20)
for i,(label,im) in enumerate([('Penpot 2.18.3 / reference',ref),('BaizeFig / core experience revision',current),('Before this implementation',previous),('Raw difference / no masks',heat)]):
 x=i%2*720;y=i//2*540;d.text((x+12,y+8),label,font=font,fill='#344b6a');panel.paste(im.resize((720,500)),(x,y+36))
panel.save(r/'evidence/comparison.png');out={'viewport':[1440,1000],'dpr':1,'zoom':1,'masks':[],'different_pixels_between_repeat_captures':int(noise),'metrics':metrics,'limitations':'Core workflows implemented and tested; raw differences remain, so strict pixel parity has not passed. Brand is intentionally different. Remaining labels, icons, property controls and workflow differences are included in raw differences. Do not interpret a raw pixel difference as completion percentage.'};(r/'pixel-results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
