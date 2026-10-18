"""Normal1x gravity and actual ordinary key/touch inputs, using read-only geometry planning."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.orbit.v1';FIELDS=['level','ticks','fall','soft','score','lines','clearedIds','locks','combo','stats','board','active','nextIndex','log','reason','remainingDust','preview','ghost','gravity','invariants'];KEYS={'left':'ArrowLeft','right':'ArrowRight','cw':'x','ccw':'z','hard':'Space'}
async def snap(p):
 await p.wait_for_function('window.__orbit?.snapshot')
 return await p.evaluate('window.__orbit.snapshot()')
def invariant(s):assert all(s['invariants'].values()),s['invariants']
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/orbit_pilot.mjs'),'--stdio',cwd=str(ROOT),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE);return self
 async def decide(self,s):
  payload={k:s[k] for k in ['state','active','board','preview']};self.proc.stdin.write((json.dumps(payload)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
async def click(p,selector,touch=False):
 el=p.locator(selector);assert await el.is_enabled(),selector
 if touch:
  await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
 else:await el.click()
async def begin(p,touch=False):
 if await p.locator('#help-dialog').is_visible():await click(p,'#help-confirm',touch)
 await click(p,'#start',touch)
 if not touch:await p.locator('#field').focus()
async def action(p,kind,touch=False):
 if touch:await click(p,'#'+kind,True)
 else:await p.keyboard.press(KEYS[kind])
async def path(p,route,touch=False):
 applied=[]
 for k in route['path']:
  s=await snap(p)
  if s['state']!='playing' or s['active']['id']!=route['piece']:return applied,False
  await action(p,k,touch);applied.append(k);await p.wait_for_timeout(12)
 s=await snap(p);ok=s['state']=='playing' and s['active']['id']==route['piece'] and s['active']['x']==route['x'] and s['active']['rot']==route['rot'];return applied,ok
async def complete(p,pilot,touch=False,stop=None,timeout=80):
 wall=time.monotonic();actions=[]
 if not touch:await p.locator('#field').focus()
 while time.monotonic()-wall<timeout:
  s=await snap(p);invariant(s)
  if s['state']!='playing' or stop and stop(s):return s,actions,time.monotonic()-wall
  route=await pilot.decide(s)
  if not route:await p.wait_for_timeout(15);continue
  applied,ok=await path(p,route,touch)
  if ok:await action(p,'hard',touch);applied.append('hard')
  after=await snap(p);invariant(after);actions.append({'observedTick':s['ticks'],'piece':route['piece'],'intendedX':route['x'],'intendedRotation':route['rot'],'inputs':applied,'lockedAfter':after['stats']['locked'],'linesAfter':after['lines']})
 raise AssertionError('Normal1x live play timeout '+str(await snap(p)))
async def load(p,url,reload=False):
 if reload:await p.reload()
 else:await p.goto(url)
 await snap(p);await p.wait_for_load_state('networkidle')
def watch(p,errors,bad,failed):
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh storage and natural Next/unlocks. Normal1x RAF gravity runs continuously while geometry planner reads board/active/one visible next. Actual key press/release,12ms between movements and real Space hard drops; no board/line/score/time/result writes or pause-to-aim.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1200});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await p.locator('#help-confirm').click()
   for stage in range(1,13):
    if stage>1:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['level']==stage and initial['ticks']==0 and initial['stats']['locked']==0 and initial['lines']==0
    wall=time.monotonic();await begin(p);end,actions,_=await complete(p,pilot);elapsed=time.monotonic()-wall;r={k:end[k] for k in FIELDS};r.update(state=end['state'],time=end['time'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log'],actions=actions,wallSeconds=elapsed,simulationToWallRatio=end['time']/elapsed);report['results'].append(r);save();assert end['state']=='won' and end['remainingDust']==0 and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1),r;assert .6<r['simulationToWallRatio']<1.1;assert r['best']['score']==end['score'];invariant(end)
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   await load(p,args.url,True);s=await snap(p);assert s['unlocked']==12 and len(s['best'])==12;assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':12,'pieces':sum(r['stats']['locked'] for r in report['results']),'lines':sum(r['lines'] for r in report['results']),'commands':sum(len(r['actualLog']) for r in report['results']),'minimumSpeedRatio':min(r['simulationToWallRatio'] for r in report['results']),'consoleErrors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1800];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/orbit/');a.add_argument('--out',default='.local/orbit-browser');asyncio.run(main(a.parse_args()))
