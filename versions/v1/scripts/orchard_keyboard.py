"""Keyboard-only cursor motion and Space-held cutting, never cursor/score writes."""
import time,math
from test_orchard_browser import snap,begin,invariant
async def move_cursor(p,target,timeout=1.5):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p);c=s['cursor'];dx=target['x']-c['x'];dy=target['y']-c['y']
  if max(abs(dx),abs(dy))<9:return
  horizontal=abs(dx)>=abs(dy);delta=dx if horizontal else dy;key=('ArrowRight' if delta>0 else 'ArrowLeft') if horizontal else ('ArrowDown' if delta>0 else 'ArrowUp');ms=max(8,min(80,abs(delta)/680*1000-7));await p.keyboard.down(key);await p.wait_for_timeout(ms);await p.keyboard.up(key)
 raise AssertionError('Keyboard cursor could not reach intended manual path '+str((await snap(p))['cursor']))
async def complete_keyboard(p,timeout=15):
 wall=time.monotonic();handled=set();actions=[];await p.locator('#battle').focus()
 while time.monotonic()-wall<timeout:
  s=await snap(p);invariant(s)
  if s['state']!='playing':return s,actions,time.monotonic()-wall
  candidates=[t for t in s['targets'] if t['kind']!='thorn' and t['state']=='flying' and t['id'] not in handled and t['age']>.12 and t['vy']<0]
  if not candidates:await p.wait_for_timeout(15);continue
  t=candidates[0];flight=-t['vy']/840;aim={'x':t['x']+t['vx']*flight,'y':t['y']-t['vy']*t['vy']/1680};await move_cursor(p,{'x':aim['x']-48,'y':aim['y']});
  for _ in range(100):
   s=await snap(p);live=next(n for n in s['targets'] if n['id']==t['id'])
   if live['vy']>-65:break
   await p.wait_for_timeout(12)
  before=await snap(p);await p.keyboard.down('Space');await p.keyboard.down('ArrowRight');await p.wait_for_timeout(165);await p.keyboard.up('ArrowRight');await p.keyboard.up('Space');after=await snap(p);actions.append({'target':t['id'],'apexAim':aim,'beforeCursor':before['cursor'],'afterCursor':after['cursor'],'cuts':after['stats']['cuts'],'errors':after['errors']});handled.add(t['id'])
 raise AssertionError('Keyboard normal-speed journey timeout '+str(await snap(p)))
