"""CPU depth-buffer raster of exported triangles; not browser/WebGL output."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).parent
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
for path in (root.parent.parent.parent/'.local/quiet-composition-static').glob('*.geometry.json'):
    s=json.loads(path.read_text());scale=2;w=s['width']*scale;h=s['height']*scale
    bg=tuple(int(s['background'][i:i+2],16) for i in (1,3,5))
    pixels=np.zeros((h,w,3),dtype=np.uint8);pixels[:]=bg;depth=np.full((h,w),np.inf,dtype=np.float32)
    for t in s['triangles']:
        p=np.array(t['p']).reshape(3,2)*scale
        x0=max(0,int(np.floor(p[:,0].min())));x1=min(w-1,int(np.ceil(p[:,0].max())))
        y0=max(0,int(np.floor(p[:,1].min())));y1=min(h-1,int(np.ceil(p[:,1].max())))
        if x0>x1 or y0>y1:continue
        a,b,c=p;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-8:continue
        yy,xx=np.mgrid[y0:y1+1,x0:x1+1];xx=xx+.5;yy=yy+.5
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;q=1-u-v
        z=u*t['d'][0]+v*t['d'][1]+q*t['d'][2]
        target=depth[y0:y1+1,x0:x1+1];mask=(u>=-1e-6)&(v>=-1e-6)&(q>=-1e-6)&(z>=-1)&(z<=1)&(z<target)
        target[mask]=z[mask]
        pixels[y0:y1+1,x0:x1+1][mask]=tuple(int(t['c'][i:i+2],16) for i in (1,3,5))
    image=Image.fromarray(pixels).resize((s['width'],s['height']),Image.Resampling.LANCZOS)
    draw=ImageDraw.Draw(image);draw.rectangle((0,0,s['width'],36),fill='#132930')
    draw.text((16,8),f'OFFLINE GEOMETRY STUDY / {path.name.split(".")[0]} / NOT A BROWSER SCREENSHOT',font=font,fill='#e7ddc5')
    image.save(root/(path.name.split('.')[0]+'.png'))
print('offline PNGs generated')
