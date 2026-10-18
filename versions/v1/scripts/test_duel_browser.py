"""Authored normalHP/1x complete campaign through real key press/release or native touch."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.duel.v1';FIELDS=['level','ticks','player','enemy','serial','swings','events','log','reason','score','stats','invariants','playerPhase','enemyPhase']
async def snap(p):
 await p.wait_for_function('window.__duel?.snapshot');return await p.evaluate('window.__duel.snapshot()')
def invariant(s):assert all(s['invariants'].values()),s['invariants']
def watch(p,errors,bad,failed):
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
async def click(p,selector,touch=False):
 e=p.locator(selector);assert await e.is_enabled()
 if touch:
  await e.scroll_into_view_if_needed();r=await e.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
 else:await e.click()
async def load(p,url,reload=False):
 if reload:await p.reload()
 else:await p.goto(url)
 await snap(p);await p.wait_for_load_state('networkidle')
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/duel_pilot.mjs'),'--stdio',cwd=str(ROOT),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE);return self
 async def decide(self,s):
  # Opponent position and visible active animation only. No AI cycle, nextThink or future inputs.
  d={k:s[k] for k in ['state','ticks','player']};d['enemy']={k:s['enemy'][k] for k in ['x','face','action']};self.proc.stdin.write((json.dumps(d)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert isinstance(r,list),r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
class Driver:
 def __init__(self,p,touch=False):self.p=p;self.touch=touch;self.held=set();self.finger=None;self.cd=None
 async def start(self):
  if self.touch:self.cd=await self.p.context.new_cdp_session(self.p)
  return self
 async def release(self):
  if self.touch:
   if self.finger:await self.cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});self.finger=None
  else:
   for k in list(self.held):await self.p.keyboard.up(k)
   self.held.clear()
 async def hold(self,key,on):
  if self.touch:
   if not on:
    if self.finger==key:await self.release()
   elif self.finger!=key:
    await self.release();e=self.p.locator('#'+key);await e.scroll_into_view_if_needed();r=await e.bounding_box();await self.cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}]});self.finger=key
  else:
   k={'left':'ArrowLeft','right':'ArrowRight','guard':'k'}[key]
   if on and k not in self.held:await self.p.keyboard.down(k);self.held.add(k)
   elif not on and k in self.held:await self.p.keyboard.up(k);self.held.remove(k)
 async def command(self,c):
  if c['kind']=='move':
   await self.hold('left',c['value']==-1);await self.hold('right',c['value']==1)
  elif c['kind']=='guard':await self.hold('guard',c['value'])
  elif self.touch:await self.release();await click(self.p,'#'+c['kind'],True)
  else:await self.p.keyboard.press({'light':'j','heavy':'u','dash':'l'}[c['kind']])
 async def close(self):await self.release();
async def begin(p,d):
 await d.release()
 if await p.locator('#help-dialog').is_visible():await click(p,'#help-confirm',d.touch)
 await click(p,'#start',d.touch)
 if not d.touch:await p.locator('#field').focus()
async def complete(p,pilot,d,stop=None,timeout=80):
 start=time.monotonic();actions=[]
 if not d.touch:await p.locator('#field').focus()
 while time.monotonic()-start<timeout:
  s=await snap(p);invariant(s)
  if s['state']!='playing' or stop and stop(s):return s,actions,time.monotonic()-start
  cs=await pilot.decide(s)
  for c in cs:await d.command(c)
  if cs:actions.append({'observedTick':s['ticks'],'commands':cs})
  await p.wait_for_timeout(18)
 raise AssertionError('Normal real-time duel timed out '+str(await snap(p)))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh storage, authored100HP/80–115HP, normal1x RAF, visible current distance/telegraph/recovery policy, actual keyboard press/release, natural Next/unlocks. No health/stamina/position/AI/clock/result writes or pause-to-aim.','results':[]};pilot=await Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1100});p=await ctx.new_page();watch(p,errors,bad,failed);d=await Driver(p).start();await load(p,args.url);await p.locator('#help-confirm').click()
   for stage in range(1,9):
    if stage>1:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['level']==stage and initial['player']['hp']==100 and initial['ticks']==0;wall=time.monotonic();await begin(p,d);end,actions,_=await complete(p,pilot,d);elapsed=time.monotonic()-wall;r={k:end[k] for k in FIELDS};r.update(state=end['state'],time=end['time'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log'],actions=actions,wallSeconds=elapsed,simulationToWallRatio=end['time']/elapsed);report['results'].append(r);save();assert end['state']=='won' and end['player']['hp']>0 and end['enemy']['hp']==0 and end['unlocked']>=min(8,stage+1) and end['stats']['settlements']==1;assert .6<r['simulationToWallRatio']<1.1;assert r['best']['score']==end['score'];invariant(end)
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'fight-{stage:02}-won.png'),full_page=True)
   await d.close();await load(p,args.url,True);s=await snap(p);assert s['unlocked']==8 and len(s['best'])==8;assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':8,'attacks':sum(r['stats']['attacks'] for r in report['results']),'blocks':sum(r['stats']['blocks'] for r in report['results']),'commands':sum(len(r['actualLog']) for r in report['results']),'minimumSpeedRatio':min(r['simulationToWallRatio'] for r in report['results'])}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1800];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/duel/');a.add_argument('--out',default='.local/duel-browser');asyncio.run(main(a.parse_args()))
