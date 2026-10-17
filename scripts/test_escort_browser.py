"""Real held movement/combos/dodge/heal/cart commands, authored resources and1x time."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.escort.v1';FIELDS=['level','ticks','player','cart','controls','stage','cleared','spawned','enemies','unitSerial','serial','attacks','ledger','events','log','combo','heals','healCooldown','escortCooldown','score','reason','stats','cartStatus','invariants']
async def snap(p):
 await p.wait_for_function('window.__escort?.snapshot');return await p.evaluate('window.__escort.snapshot()')
def invariant(s):assert all(s['invariants'].values()),s['invariants']
def watch(p,errors,bad,failed):
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
async def click(p,selector,touch=False):
 e=p.locator(selector);await e.wait_for(state='visible');assert await e.is_enabled(),selector
 if touch:
  await e.scroll_into_view_if_needed();r=await e.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
 else:await e.click()
async def load(p,url,reload=False):
 if reload:await p.reload()
 else:await p.goto(url)
 await snap(p);await p.wait_for_load_state('networkidle')
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/escort_pilot.mjs'),'--stdio',cwd=str(ROOT),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE);return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
class Driver:
 def __init__(self,p,touch=False):self.p=p;self.touch=touch;self.keys=set();self.points=[];self.cdp=None
 async def start(self):
  if self.touch:self.cdp=await self.p.context.new_cdp_session(self.p)
  return self
 async def set(self,c):
  wanted=set(['KeyD'] if c.get('x')==1 else ['KeyA'] if c.get('x')==-1 else []);wanted.update(['KeyS'] if c.get('y')==1 else ['KeyW'] if c.get('y')==-1 else []);wanted.update(['KeyJ'] if c.get('attack') else [])
  if wanted==self.keys:return
  if self.touch:
   if self.points:await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   self.points=[]
   for i,k in enumerate(sorted(wanted)):
    e=self.p.locator('[data-hold="'+k+'"]');await e.scroll_into_view_if_needed();r=await e.bounding_box();self.points.append({'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':i+1})
   if self.points:await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':self.points})
  else:
   for k in self.keys-wanted:await self.p.keyboard.up(k)
   for k in wanted-self.keys:await self.p.keyboard.down(k)
  self.keys=wanted
 async def release(self):await self.set({})
 async def action(self,name):
  e=self.p.locator('#'+name)
  if not await e.is_enabled():return
  if self.touch:
   await e.scroll_into_view_if_needed();r=await e.bounding_box();extra={'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':99};await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':self.points+[extra]});await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});self.keys=set();self.points=[]
  else:await self.p.keyboard.press({'dodge':'k','heal':'h','escort':'e'}[name])
 async def command(self,c):
  await self.set(c['controls'])
  if c.get('action'):await self.action(c['action'])
async def begin(p,d):
 if await p.locator('#help-dialog').is_visible():await click(p,'#help-confirm',d.touch)
 await click(p,'#start',d.touch)
async def complete(p,pilot,d,stop=None,timeout=135):
 start=time.monotonic();actions=[]
 while time.monotonic()-start<timeout:
  s=await snap(p);invariant(s)
  if s['state']!='playing' or stop and stop(s):return s,actions,time.monotonic()-start
  c=await pilot.decide(s);assert c;await d.command(c);actions.append({'observedTick':s['ticks'],'controls':c});await p.wait_for_timeout(25)
 raise AssertionError('Normal street campaign timed out '+str({k:(await snap(p))[k] for k in ['level','state','ticks','player','cart']}))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh storage; authored120player/100cartHP,100bounded dodge meter,2finite healing,60Hz RAF1x. Actual held movement/J combos and K/H/E actions. Natural Next/unlocks. No HP/position/energy/supply/AI/clock/result writes; no manual pause-to-plan.','results':[]};pilot=await Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1100});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);d=await Driver(p).start()
   for stage in range(1,9):
    if stage>1:await click(p,'#primary-action')
    s=await snap(p);assert s['state']=='ready' and s['level']==stage and s['player']['hp']==120 and s['cart']['hp']==100 and s['heals']==2 and s['ticks']==0;wall=time.monotonic();await begin(p,d);end,actions,_=await complete(p,pilot,d);elapsed=time.monotonic()-wall;await d.release();r={k:end[k] for k in FIELDS};r.update(state=end['state'],time=end['time'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log'],uiActions=actions,wallSeconds=elapsed,simulationToWallRatio=end['time']/elapsed);report['results'].append(r);save();assert end['state']=='won' and end['player']['hp']>0 and end['cart']['hp']>0 and end['cleared']==[True,True,True] and end['stats']['settlements']==1;assert end['unlocked']>=min(8,stage+1) and .6<r['simulationToWallRatio']<1.1
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   await load(p,args.url,True);s=await snap(p);assert s['unlocked']==8 and len(s['best'])==8;assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':8,'attacks':sum(r['stats']['attacks'] for r in report['results']),'hits':sum(r['stats']['hits'] for r in report['results']),'dodges':sum(r['stats']['dodges'] for r in report['results']),'commands':sum(len(r['log']) for r in report['results']),'minimumSpeedRatio':min(r['simulationToWallRatio'] for r in report['results'])}));await ctx.close()
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/escort/');a.add_argument('--out',default='.local/escort-browser');asyncio.run(main(a.parse_args()))
