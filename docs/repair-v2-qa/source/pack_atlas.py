from PIL import Image
from pathlib import Path
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else './repair-frame-sources')
keys=[f'robot-{t}-{f}' for t in ['courier','gardener','lantern','musician'] for f in range(4)]+[f'tech-{t}-{f}' for t in range(3) for f in range(6)]
atlas=Image.new('RGBA',(1536,1920))
for i,key in enumerate(keys): atlas.alpha_composite(Image.open(root/(key+'.png')),(i%6*256,i//6*320))
atlas.save(root/'workshop-actors.png',optimize=True)
