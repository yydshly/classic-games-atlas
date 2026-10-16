"""Real mouse slingshot drags and ordinary ability inputs on production levels."""
import argparse,asyncio,datetime,json,math,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.paper.v1'
async def snap(p):return await p.evaluate('async()=> (await import("./game.mjs")).diagnostics()')
async def wait_state(p,fn,timeout=12):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if fn(s):return s
  await p.wait_for_timeout(20)
 raise AssertionError('Timeout '+json.dumps(await snap(p)))
async def begin(p):
 await p.locator('#ready-start').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 return await wait_state(p,lambda s:s['state']=='playing')
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/paper_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
async def xy(p,x,y):
 r=await p.locator('#battle').bounding_box();return r['x']+x/900*r['width'],r['y']+y/560*r['height']
async def launch(p,c,touch=False):
 await p.locator('#battle').scroll_into_view_if_needed();sx,sy=await xy(p,112,430);a=c['angle']*math.pi/180;ex,ey=await xy(p,112-math.cos(a)*96*c['power'],430+math.sin(a)*96*c['power'])
 if touch:
  cd=await p.context.new_cdp_session(p);await cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy}]})
  for i in range(1,6):await cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx+(ex-sx)*i/5,'y':sy+(ey-sy)*i/5}]});await p.wait_for_timeout(35)
  await cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await cd.detach()
 else:
  await p.mouse.move(sx,sy);await p.mouse.down()
  for i in range(1,6):await p.mouse.move(sx+(ex-sx)*i/5,sy+(ey-sy)*i/5);await p.wait_for_timeout(20)
  await p.mouse.up()
async def complete(p,pilot,out=None,stage=1,touch=False,stop=None,timeout=240):
 end=time.monotonic()+timeout;actions=[];pending=None;captured=False
 while time.monotonic()<end:
  s=await snap(p)
  if s['state']!='playing' or (stop and stop(s)):return s,actions
  if s['ball'] and pending is not None and not s['ball']['abilityUsed'] and s['ball']['age']>=pending:
   before=len(s['log'])
   if touch:
    await p.locator('#ability').scroll_into_view_if_needed();r=await p.locator('#ability').bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
   else:await p.keyboard.press('a')
   after=await snap(p);actions.append({'observedAge':s['ball']['age'],'intendedAbilityAt':pending,'actualCommands':after['log'][before:]});pending=None
  elif not s['ball'] and s['phase']=='aiming' and not any(b['alive'] and b['awake'] for b in s['blocks']) and s['ammo']:
   c=await pilot.decide(s)
   if c:
    before=len(s['log']);await launch(p,c,touch);after=await snap(p);actions.append({'observedTime':s['time'],'intended':c,'actualCommands':after['log'][before:]});pending=c['abilityAt'];assert after['stats']['shots']==s['stats']['shots']+1,(s,c,after)
  if out and stage in [1,8,16] and s['ball'] and s['ball']['age']>.25 and not captured:await p.screenshot(path=str(out/f'level-{stage:02}-field.png'),full_page=True);captured=True
  await p.wait_for_timeout(25)
 raise AssertionError('Normal input timeout '+json.dumps(await snap(p)))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Real five-move mouse sling drags/releases and keyboard A abilities, normal 1x; predictive copies use production physics. No ammo/gravity/target/clock/result writes.','fixture':'Later-stage menu unlock and tutorial/sound preferences only.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1360,'height':1200})
    if stage>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:'+str(stage)+',tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);initial=await snap(p);await p.wait_for_load_state('networkidle');assert initial['state']=='ready' and not initial['time'] and not initial['stats']['shots'];
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'level-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);r={'stage':stage,'state':end['state'],'ticks':end['ticks'],'time':end['time'],'stars':end['stars'],'score':end['score'],'stats':end['stats'],'remaining':end['remaining'],'ammo':end['ammo'],'actualLog':end['log'],'best':end['best'].get(str(stage)),'unlocked':end['unlocked'],'actions':actions};report['results'].append(r);save();assert end['state']=='won' and not end['remaining'] and end['stats']['settlements']==1 and end['unlocked']>=min(16,stage+1),r;assert len(end['deliveredIds'])==len(set(end['deliveredIds']))==initial['remaining'];assert r['best']['stars']==end['stars'] and r['best']['score']==end['score'];assert end['stats']['shots']<=initial['ammo'] and end['ammo']==initial['ammo']-end['stats']['shots'];assert not end['stats']['collisionCaps'],r
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
    await ctx.close()
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'delivered':sum(r['stats']['delivered'] for r in report['results']),'shots':sum(r['stats']['shots'] for r in report['results']),'fullStars':sum(r['stars']==3 for r in report['results']),'errors':errors}))
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/paper/');a.add_argument('--out',default='.local/paper-browser');a.add_argument('--stages',nargs='+',type=int,default=list(range(1,17)));asyncio.run(main(a.parse_args()))
