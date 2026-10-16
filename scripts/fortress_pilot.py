"""Read-only tactical planner. Returns a key direction; never writes browser state."""
import heapq,math

V=[(0,-1),(1,0),(0,1),(-1,0)]
KEYS=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']
def center(n):return n*24+12
def clear_line(s,x1,y1,x2,y2):
 if abs(x1-x2)>10 and abs(y1-y2)>10:return None
 dx,dy=x2-x1,y2-y1;length=max(abs(dx),abs(dy));bricks=0;seen=set()
 if not length:return 0
 for step in range(15,int(length)-8,8):
  x=int((x1+dx*step/length)//24);y=int((y1+dy*step/length)//24)
  if not(0<=x<25 and 0<=y<25):return None
  if s['tiles'][y][x]=='S':return None
  if s['tiles'][y][x]=='B' and (x,y)not in seen:bricks+=1;seen.add((x,y))
 return bricks

def plan(s):
 q=s['player'];sx,sy=int(q['x']//24),int(q['y']//24);start=(sx,sy)
 enemies=s['enemies'];occupied={(int(e['x']//24),int(e['y']//24))for e in enemies}
 def danger(x,y):
  value=0
  for b in s['bullets']:
   if not b['enemy']:continue
   vx,vy=V[b['dir']];speed=b['speed'];t=((y-b['y'])/(vy*speed))if vy else((x-b['x'])/(vx*speed))
   if 0<t<.65 and (abs(x-b['x'])<16 if vy else abs(y-b['y'])<16):value+=2
  return value
 costs={start:0};prev={};heap=[(0,start)]
 while heap:
  cost,here=heapq.heappop(heap)
  if cost!=costs[here]:continue
  for dx,dy in V:
   x,y=here[0]+dx,here[1]+dy
   if not(1<=x<=23 and 1<=y<=23)or(x,y)in occupied or(x,y)==(12,23):continue
   tile=s['tiles'][y][x]
   if tile in'SW':continue
   new=cost+.231+(1.0 if tile=='B' else 0)+danger(center(x),center(y))
   if new<costs.get((x,y),1e9):costs[(x,y)]=new;prev[(x,y)]=here;heapq.heappush(heap,(new,(x,y)))
 choices=[]
 for enemy in enemies:
  ex,ey=enemy['x'],enemy['y'];ecx,ecy=int(ex//24),int(ey//24)
  base_line=clear_line(s,ex,ey,s['base']['x'],s['base']['y'])
  urgency=-(4 if base_line==0 else 0)-(1 if enemy['type']=='gunner' else 0)
  for x,y in costs:
   if x!=ecx and y!=ecy:continue
   distance=abs(center(x)-ex)+abs(center(y)-ey)
   if distance<40 or distance>350:continue
   bricks=clear_line(s,center(x),center(y),ex,ey)
   if bricks is None:continue
   vertical=abs(center(x)-ex)<10
   overhead=0 if vertical and center(y)>ey else .7
   score=costs[(x,y)]+bricks*.8+enemy['hp']*(.12 if q['rapid']>0 else .25)+distance/1000+(600-ey)/100+overhead+urgency
   choices.append((score,(x,y),'enemy',enemy))
 for item in s['items']:
  point=(int(item['x']//24),int(item['y']//24));cost=costs.get(point,1e9)
  if item['type']=='repair':priority=5 if s['base']['hp']<2 else 3 if s['base']['hp']<3 or s['lives']<3 else -2
  elif item['type']=='rapid':priority=4 if q['rapid']<2 else -3
  else:priority=4 if q['shield']<2 else -3
  if cost<4 and priority>0:choices.append((cost-priority,point,'item',item))
 if not choices:
  goal=min(costs,key=lambda xy:abs(xy[0]-12)+abs(xy[1]-20));kind='idle';target=None
 else:_,goal,kind,target=min(choices,key=lambda c:c[0])
 if goal!=start:
  next_cell=goal
  while prev.get(next_cell)!=start and next_cell in prev:next_cell=prev[next_cell]
  wx,wy=center(next_cell[0]),center(next_cell[1]);dx,dy=wx-q['x'],wy-q['y']
  if abs(dx)>abs(dy):return KEYS[1 if dx>0 else 3]
  return KEYS[2 if dy>0 else 0]
 if kind=='enemy':
  if goal[0]==int(target['x']//24) and abs(target['x']-q['x'])>6:return 'ArrowRight' if target['x']>q['x'] else 'ArrowLeft'
  if goal[1]==int(target['y']//24) and abs(target['y']-q['y'])>6:return 'ArrowDown' if target['y']>q['y'] else 'ArrowUp'
  dx,dy=target['x']-q['x'],target['y']-q['y'];aim=1 if dx>0 else 3
  if abs(dx)<12:aim=2 if dy>0 else 0
  # A short facing input also advances; next observation corrects the position.
  return KEYS[aim] if q['dir']!=aim else None
 if kind=='item':
  dx,dy=target['x']-q['x'],target['y']-q['y']
  if abs(dx)>8 or abs(dy)>8:return KEYS[(1 if dx>0 else 3)if abs(dx)>abs(dy)else(2 if dy>0 else 0)]
 return None if q['dir']==0 else 'ArrowUp'
