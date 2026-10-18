from PIL import Image
from pathlib import Path
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else './repair-direction-frames')
keys=[f'robot-{t}-{d}-{f}' for t in ['courier','gardener','lantern','musician'] for d in ['down','right','up','left'] for f in range(4)]+[f'tech-{t}-{d}-{f}' for t in range(3) for d in ['down','right','up','left'] for f in range(4)]
atlas=Image.new('RGBA',(3584,2560))
for i,key in enumerate(keys): atlas.alpha_composite(Image.open(root/(key+'.png')),(i%14*256,i//14*320))
atlas.save(root/'workshop-walking-r3.png',optimize=True)
