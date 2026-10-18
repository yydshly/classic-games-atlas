import math,sys,json
from pathlib import Path
root=Path(__file__).resolve().parents[2];source=root/'docs/repair-v2-facing-r3/source';sys.path.insert(0,str(source))
from gait import leg_pose,DIRECTION_ANGLES
# Camera's screen-right and camera-facing ground vectors; local forward is -Y.
right=(10/math.sqrt(125),5/math.sqrt(125));down=(5/math.sqrt(125),-10/math.sqrt(125))
expected={'right':(1,0),'left':(-1,0),'down':(0,1),'up':(0,-1)}
for direction,deg in DIRECTION_ANGLES.items():
 a=math.radians(deg);forward=(math.sin(a),-math.cos(a));screen=(sum(x*y for x,y in zip(forward,right)),sum(x*y for x,y in zip(forward,down)))
 assert sum(x*y for x,y in zip(screen,expected[direction]))>.999999
 assert abs(screen[1] if direction in ('right','left') else screen[0])<1e-6
print('PASS four true model headings project to the matching screen direction')
for side in [-1,1]:
 for stride in [.325,.38]:
  for frame in [i/100 for i in range(400)]:
   dy,lift=leg_pose(frame,side,stride);eps=1e-5;derivative=(leg_pose(frame+eps,side,stride)[0]-leg_pose(frame-eps,side,stride)[0])/(2*eps)
   if derivative<-.001:assert lift>0,'The forward-returning foot must lift'
   if derivative>.001:assert lift<1e-7,'The backward stance foot must stay grounded'
  assert all(abs(a-b)<1e-9 for a,b in zip(leg_pose(0,side,stride),leg_pose(4,side,stride)))
print('PASS robot and technician gait: stance backward, airborne return forward, continuous loop')
for p in source.glob('render_directional_*.py'):
 s=p.read_text();assert 'from gait import leg_pose, DIRECTION_ANGLES' in s and 'stride,lift=leg_pose(frame,side,' in s and 'for direction,degrees in DIRECTION_ANGLES.items()' in s
print('PASS rendering scripts use the exact tested heading/gait recipe')
