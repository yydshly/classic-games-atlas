"""CPU geometry crops and temporal comparisons. Never browser/video capture."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).parent
geometry=root.parent.parent.parent/'.local/quiet-temporal-frames'
plan=json.loads((root/'render-plan.json').read_text())
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)

def raster(data,crop):
    x,y,right,bottom=crop;scale=2;w=(right-x)*scale;h=(bottom-y)*scale
    bg=tuple(int(data['background'][i:i+2],16) for i in (1,3,5))
    pixels=np.zeros((h,w,3),dtype=np.uint8);pixels[:]=bg;depth=np.full((h,w),np.inf,dtype=np.float32)
    for t in data['triangles']:
        p=(np.array(t['p']).reshape(3,2)-[x,y])*scale
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
        target[mask]=z[mask];pixels[y0:y1+1,x0:x1+1][mask]=tuple(int(t['c'][i:i+2],16) for i in (1,3,5))
    return Image.fromarray(pixels)

cache={f['name']:raster(json.loads((geometry/(f['name']+'.geometry.json')).read_text()),f['crop']) for f in plan['frames']}
for set_name in ['brake','dock']:
    frames=[];durations=[];indices=plan['selections'][set_name]['indices']
    for n,index in enumerate(indices):
        a=next(f for f in plan['frames'] if f['name']==f'{set_name}-{n:02d}-before')
        left=cache[a['name']];right=cache[f'{set_name}-{n:02d}-after'];w,h=left.size
        out=Image.new('RGB',(2*w,h+65),'#142d33');out.paste(left,(0,65));out.paste(right,(w,65));d=ImageDraw.Draw(out)
        d.text((12,6),'CPU GEOMETRY REPLAY / NOT A BROWSER VIDEO',font=font,fill='#eeddbd')
        d.text((12,28),f"8d1 BEFORE | world t={a['time']:.3f}s",font=small,fill='#eeddbd');d.text((w+12,28),'FIXED | identical physical sample',font=small,fill='#eeddbd')
        d.text((12,46),a['phase']+' / '+a['snapshot']['state']+f" / visual +{a['presentationAge']:.3f}s",font=small,fill='#bfc8b6');frames.append(out)
        durations.append(max(20,round((indices[n+1]-index)/60*1000)) if n+1<len(indices) else 500)
    frames[0].save(root/(set_name+'-cpu.gif'),save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2)
# Two adjacent recovery samples; same snapshots in both rows, no visual smoothing.
left=cache['recovery-00-before'];w,h=left.size
out=Image.new('RGB',(w*2,h*2+140),'#142d33');d=ImageDraw.Draw(out)
d.text((10,7),'CPU GEOMETRY / 16.7ms BETWEEN COLUMNS / NOT WEBGL',font=small,fill='#eeddbd')
for row,variant in enumerate(['before','after']):
    for n in range(2):
        f=next(x for x in plan['frames'] if x['name']==f'recovery-{n:02d}-{variant}')
        top=45+row*(h+45);out.paste(cache[f['name']],(n*w,top+30))
        d.text((n*w+8,top),f"{variant.upper()} | noise {f['snapshot']['noise']:.3f}",font=small,fill='#eeddbd')
out.save(root/'recovery-pair.png')
print('saved brake-cpu.gif, dock-cpu.gif, recovery-pair.png; no browser used')
