"""Twelve real-input campaigns with production shot motion and read-only prediction."""
import argparse,asyncio,datetime,json,time,math
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.tide.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,fn,timeout=10):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if fn(s):return s
  await p.wait_for_timeout(20)
 raise AssertionError('Timeout: '+json.dumps(await snap(p)))
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 return await wait_state(p,lambda s:s['state']=='playing')
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/tide_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
async def perform(p,c,shooter,touch=False,keyboard=False):
 if c['kind'] in ['slow','back']:
  el=p.locator('#'+c['kind'])
  if not await el.is_enabled():return False
  if touch:
   await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
  else:await el.click()
  return True
 if c.get('swap'):
  if touch:
   el=p.locator('#swap')
   if not await el.is_enabled():return False
   await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
  else:await p.keyboard.press('x')
  s=await snap(p)
  if s['shot'] or s['resolving']:return False
 await p.locator('#battle').scroll_into_view_if_needed();r=await p.locator('#battle').bounding_box();x=r['x']+(shooter['x']+math.cos(c['angle'])*100)/720*r['width'];y=r['y']+(shooter['y']+math.sin(c['angle'])*100)/560*r['height']
 if touch:await p.touchscreen.tap(x,y)
 else:
  await p.mouse.move(x,y)
  if keyboard:await p.locator('#battle').focus();await p.keyboard.press('Space')
  else:await p.mouse.click(x,y)
 return True
async def complete(p,pilot,out=None,stage=1,touch=False,keyboard=False,stop=None,timeout=180):
 shooter=await p.evaluate('async()=> (await import("./levels.mjs")).LEVELS['+str(stage-1)+'].shooter');end=time.monotonic()+timeout;actions=[];captured=False
 while time.monotonic()<end:
  s=await snap(p)
  if s['state']!='playing' or (stop and stop(s)):return s,actions
  if not s['shot'] and not s['resolving'] and s['time']+1e-8>=s['nextFire']:
   c=await pilot.decide(s)
   if c:
    ok=await perform(p,c,shooter,touch,keyboard);after=await snap(p);actions.append({'observedTime':s['time'],'intended':c,'uiAttempted':ok,'actualCommands':after['log'][len(s['log']):]})
  if out and stage in [1,6,12] and s['stats']['shots']>=2 and not captured:await p.screenshot(path=str(out/f'level-{stage:02}-field.png'),full_page=True);captured=True
  await p.wait_for_timeout(35)
 raise AssertionError('Normal aiming timeout: '+json.dumps(await snap(p)))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Real mouse movement and click to aim/fire, keyboard X swaps and normal slow/back buttons. Predictor uses copied production states and visible geometry; no chain position/speed/color/removal/clock/result writes. Normal 1x game speed.','fixture':'Only later-level menu unlock/tutorial/sound preferences.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1360,'height':1200})
    if stage>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:'+str(stage)+',tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);initial=await snap(p);await p.wait_for_load_state('networkidle');assert initial['state']=='ready' and initial['time']==0 and initial['stats']['originalCleared']==0 and all(x['original'] for x in initial['beads']);
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);r={'stage':stage,'state':end['state'],'time':end['time'],'ticks':end['ticks'],'score':end['score'],'stats':end['stats'],'remaining':len(end['beads']),'slowLeft':end['slowLeft'],'backLeft':end['backLeft'],'actualLog':end['log'],'best':end['best'].get(str(stage)),'unlocked':end['unlocked'],'actions':actions};report['results'].append(r);save();assert end['state']=='won' and not end['beads'] and end['stats']['originalCleared']==initial['stats']['initial'] and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1),r;assert r['best']['score']==end['score'] and r['best']['shots']==end['stats']['shots'];assert len(end['clearedIds'])==len(set(end['clearedIds']))==end['stats']['popped'];
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
    await ctx.close()
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'originals':sum(r['stats']['originalCleared'] for r in report['results']),'shots':sum(r['stats']['shots'] for r in report['results']),'errors':errors}))
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/tide/');a.add_argument('--out',default='.local/tide-browser');a.add_argument('--stages',nargs='+',type=int,default=list(range(1,13)));asyncio.run(main(a.parse_args()))
