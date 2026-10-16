"""Actual keyboard/pointer acceptance. Telemetry is copied observation only.

--stage selects via an isolated localStorage menu-unlock fixture, never via battle
mutation. No injected win, removed enemies, altered health, or synthetic clock.
"""
import argparse, asyncio, datetime, json, time
from collections import deque
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
SNAP='async()=> (await import("./game.mjs")).diagnostics()'
DIRS=[(0,-1),(1,0),(0,1),(-1,0)]
KEYS=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']
def pos(a):return (a['x'],a['y'])
def blast(s,b):
 out={pos(b)}
 for dx,dy in DIRS:
  for i in range(1,b['range']+1):
   x,y=b['x']+dx*i,b['y']+dy*i
   if s['grid'][y][x]=='#':break
   out.add((x,y))
   if s['grid'][y][x]=='+':break
 return out
def paths(s,origin=None,extra=None,avoid=True):
 origin=origin or pos(s['player']); blocked={pos(b) for b in s['bombs']}|{pos(f) for f in s['flames']}
 for b in s['bombs']:
  if b['fuse']<.8:blocked|=blast(s,b)
 if extra:blocked.add(extra)
 if avoid and s['player']['invulnerable']<=0:
  for e in s['enemies']:
   blocked.add(pos(e))
   for dx,dy in DIRS:blocked.add((e['x']+dx,e['y']+dy))
 q=deque([origin]);out={origin:[]}
 while q:
  x,y=q.popleft()
  for d,(dx,dy) in enumerate(DIRS):
   n=(x+dx,y+dy)
   if n not in out and n not in blocked and s['grid'][n[1]][n[0]]=='.':out[n]=out[(x,y)]+[d];q.append(n)
 return out
def escape(s,at):
 fake={'x':at[0],'y':at[1],'range':s['player']['range']};danger=blast(s,fake)
 for b in s['bombs']:danger|=blast(s,b)
 routes=paths(s,at,at)
 candidates=[]
 for cell,path in routes.items():
  if not path or cell in danger or len(path)>8:continue
  distance=min((abs(cell[0]-e['x'])+abs(cell[1]-e['y']) for e in s['enemies']),default=20)
  if distance<=2:continue
  candidates.append((len(path)*1.3-max(0,min(distance,5)-2)*.4,cell,path))
 if not candidates and (s['player']['hp']>1 or s['player']['invulnerable']>0):
  for cell,path in paths(s,at,at,avoid=False).items():
   if path and cell not in danger and len(path)<=7:candidates.append((len(path)*1.3,cell,path))
 return min(candidates,default=None,key=lambda x:x[0])
async def snap(p):return await p.evaluate(SNAP)
async def step(p,d):
 s=await snap(p);a=pos(s['player']);dx,dy=DIRS[d];target=(a[0]+dx,a[1]+dy)
 if s['state']!='playing' or s['grid'][target[1]][target[0]]!='.':return False
 if s['player']['invulnerable']<=0 and any(abs(target[0]-e['x'])+abs(target[1]-e['y'])<=1 for e in s['enemies']):return False
 await p.keyboard.down(KEYS[d]);deadline=time.monotonic()+.8
 while time.monotonic()<deadline:
  await p.wait_for_timeout(18);s=await snap(p)
  if pos(s['player'])!=a or s['state']!='playing':break
 await p.keyboard.up(KEYS[d]);return pos(s['player'])==target
async def walk(p,path):
 for d in path:
  if not await step(p,d):return False
 return True
async def wait_safe(p,seconds):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  s=await snap(p)
  if s['state']!='playing':return
  near=min((abs(e['x']-s['player']['x'])+abs(e['y']-s['player']['y']) for e in s['enemies']),default=20)
  danger=set().union(*(blast(s,b) for b in s['bombs'])) if s['bombs'] else set()
  if near<=3 or pos(s['player']) in danger:
   options=[]
   for cell,path in paths(s).items():
    if not path or len(path)>4 or cell in danger:continue
    distance=min((abs(cell[0]-e['x'])+abs(cell[1]-e['y']) for e in s['enemies']),default=20)
    options.append((distance-len(path)*.45,path))
   if options:
    path=max(options,key=lambda z:z[0])[1]
    await walk(p,path[:1])
  await p.wait_for_timeout(80)

async def pilot(p,limit=260,checkpoint=None):
 begin=time.monotonic();samples=[];last_sample=-1
 while time.monotonic()-begin<limit:
  s=await snap(p)
  if int(s['time'])//3!=last_sample:
   last_sample=int(s['time'])//3;samples.append({k:s[k] for k in ['time','state','player','stats','enemies']})
   if checkpoint:checkpoint.write_text(json.dumps({'kind':'read-only in-progress checkpoint','snapshot':s},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  if s['state']!='playing':break
  if s['bombs'] or s['flames']:await wait_safe(p,.25);continue
  routes=paths(s);player=pos(s['player'])
  open_routes=paths(s,avoid=False)
  nearest_enemy=min((len(open_routes[pos(e)]) for e in s['enemies'] if pos(e) in open_routes),default=99)
  # Lure nearby trackers into a bomb rather than walking toward their current cell.
  if nearest_enemy<=4:
   safe=escape(s,player)
   if safe:
    await p.keyboard.press('Space');await p.wait_for_timeout(40)
    fresh=await snap(p);safe=escape(fresh,player)
    if safe:await walk(p,safe[2])
    await wait_safe(p,2.9);continue
  if not s['enemies']:
   path=routes.get(pos(s['exit']))
   if path is not None:await walk(p,path);continue
  # Pick up safe fixed upgrades before planning the next blast.
  pickups=[(len(routes[pos(i)]),routes[pos(i)]) for i in s['items'] if pos(i) in routes and len(routes[pos(i)])<=7]
  if pickups:await walk(p,min(pickups,key=lambda z:z[0])[1]);continue
  candidates=[]
  for cell,path in routes.items():
   if len(path)>13:continue
   safe=escape(s,cell)
   if not safe:continue
   area=blast(s,{'x':cell[0],'y':cell[1],'range':s['player']['range']})
   crates=sum(s['grid'][y][x]=='+' for x,y in area)
   hits=sum(pos(e) in area for e in s['enemies'])
   nearest=min((abs(cell[0]-e['x'])+abs(cell[1]-e['y']) for e in s['enemies']),default=0)
   if not hits and not crates:continue
   # Avoid walking into adjacent enemies; moving to a crate front is still useful.
   close=min((abs(cell[0]-e['x'])+abs(cell[1]-e['y']) for e in s['enemies']),default=20)
   if close<2 and path:continue
   score=hits*12+crates*3.5-len(path)*.65-nearest*.2
   candidates.append((score,path,cell))
  if not candidates:await wait_safe(p,.3);continue
  _,path,cell=max(candidates,key=lambda z:z[0])
  if path:
   # Replan often because patrols continue to move during actual input.
   await walk(p,path[:1]);continue
  safe=escape(s,player)
  if safe:
   await p.keyboard.press('Space');await p.wait_for_timeout(40)
   fresh=await snap(p);safe=escape(fresh,player)
   if safe:await walk(p,safe[2])
   await wait_safe(p,2.9)
 end=await snap(p)
 return {'stage':end['level'],'result':end['state'],'elapsedWall':round(time.monotonic()-begin,2),'end':end,'samples':samples}

async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True)
 errors=[];bad=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'actual browser keyboard/pointer input, not logic simulation','fixture':'isolated localStorage unlocks menu selection only; no battle mutation','results':[]}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch();context=await browser.new_context(viewport={'width':1280,'height':900},record_video_dir=str(out/'video') if args.video else None,record_video_size={'width':960,'height':720} if args.video else None)
  if args.stage>1:
   await context.add_init_script('if(!localStorage.getItem("classic-atlas.ember.v1"))localStorage.setItem("classic-atlas.ember.v1", JSON.stringify({unlocked:10,last:1,tutorialSeen:true,sound:false,best:{}}))')
  else:report['fixture']='fresh first-stage context; no menu-unlock or battle fixture'
  p=await context.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'status':r.status,'url':r.url}) if r.status>=400 else None)
  for attempt in range(1,args.attempts+1):
   await p.goto(args.url);await p.wait_for_selector('#primary-action');await p.locator('#levels').click();await p.locator(f'[data-level="{args.stage}"]').click();await p.locator('#primary-action').click()
   if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
   await p.wait_for_timeout(80)
   result=await pilot(p,args.limit,out/f'checkpoint-attempt-{attempt}.json');result['attempt']=attempt;report['results'].append(result)
   await p.screenshot(path=str(out/f'stage-{args.stage:02}-attempt-{attempt}.png'),full_page=True)
   print(json.dumps({k:result[k] for k in ['stage','result','elapsedWall','attempt']}),flush=True)
   report['consoleErrors']=errors;report['badResponses']=bad;(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   if result['result']=='won':
    saved=await p.evaluate('JSON.parse(localStorage.getItem("classic-atlas.ember.v1"))');await p.reload();reloaded=await snap(p)
    assert reloaded['unlocked']==saved['unlocked']
    assert reloaded['state']=='ready'
    report['progressReload']={'unlocked':reloaded['unlocked'],'best':saved['best'],'last':saved['last']}
    if args.stage==1:assert reloaded['unlocked']==2 and saved['best']['1']['score']>0
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    break
  await context.close();await browser.close()
 assert not errors and not bad,(errors,bad)
 assert any(r['result']=='won' for r in report['results']),'No real-input clear achieved'
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4174/games/maze/');parser.add_argument('--out',default='docs/maze-qa/first-clear');parser.add_argument('--stage',type=int,default=1);parser.add_argument('--limit',type=int,default=260);parser.add_argument('--attempts',type=int,default=2);parser.add_argument('--video',action='store_true');asyncio.run(main(parser.parse_args()))
