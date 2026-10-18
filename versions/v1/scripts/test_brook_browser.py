"""Normal-budget lane defenses through actual card, select and button inputs."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.brook.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,fn,timeout=8):
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
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/brook_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
async def perform(p,c,touch=False):
 async def tap(selector):
  el=p.locator(selector)
  if not await el.is_enabled():return False
  if touch:
   await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
  else:await el.click()
  return True
 if c['kind']=='collect':return await tap('#collect')
 if c['kind']=='place':
  await tap(f'[data-type="{c["type"]}"]')
  if touch:
   await p.locator('#battle').scroll_into_view_if_needed();r=await p.locator('#battle').bounding_box();await p.touchscreen.tap(r['x']+(100+(c['col']+.5)*80)/850*r['width'],r['y']+(115+(c['row']+.5)*72)/530*r['height']);s=await snap(p)
   if (s['row'],s['col'])!=(c['row'],c['col']):return False
  else:await p.locator('#row').select_option(index=c['row']);await p.locator('#col').select_option(index=c['col'])
  return await tap('#deploy')
 return False
async def complete(p,pilot,out=None,stage=1,touch=False,stop=None,timeout=120):
 end=time.monotonic()+timeout;actions=[];captures=set()
 while time.monotonic()<end:
  s=await snap(p)
  if s['state']!='playing' or (stop and stop(s)):return s,actions
  c=await pilot.decide(s)
  if c:
   before=s['revision'];ok=await perform(p,c,touch);after=await snap(p);actions.append({'observedTime':s['time'],'command':c,'uiAttempted':ok,'accepted':after['revision']>before,'revision':after['revision'],'actualCommands':after['log'][len(s['log']):]})
  if out and stage in [1,5,10] and s['time']>=20 and 'field' not in captures:await p.screenshot(path=str(out/f'level-{stage:02}-field.png'),full_page=True);captures.add('field')
  await p.wait_for_timeout(55)
 raise AssertionError('Normal defense timeout: '+json.dumps(await snap(p)))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Native card clicks, select row/col, deploy and collect buttons with read-only visible telemetry policy; offered 2x speed. No resource, health, cooldown, projectile, spawn/wave, clock or result writes.','fixture':'Later-level menu unlock/tutorial/sound preferences only','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1360,'height':1200})
    if stage>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:'+str(stage)+',tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);initial=await snap(p);await p.wait_for_load_state('networkidle');assert initial['state']=='ready' and initial['time']==0 and not initial['plants'] and not initial['enemies'];await begin(p);await p.locator('#speed').click();assert (await snap(p))['speed']==2;end,actions=await complete(p,pilot,out,stage);r={'stage':stage,'state':end['state'],'time':end['time'],'stats':end['stats'],'resource':end['resource'],'best':end['best'].get(str(stage)),'nextSpawn':end['nextSpawn'],'actualLog':end['log'],'actions':actions,'unlocked':end['unlocked']};report['results'].append(r);save();assert end['state']=='won' and not end['enemies'] and end['stats']['settlements']==1 and end['unlocked']>=min(10,stage+1),r;assert r['best']['score']==end['score'] and r['best']['losses']==end['stats']['losses'];assert end['stats']['spent']<=initial['resource']+end['stats']['collected'] and end['resource']==initial['resource']+end['stats']['collected']-end['stats']['spent'];
    if stage in [1,5,10]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
    await ctx.close()
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'kills':sum(r['stats']['kills'] for r in report['results']),'errors':errors}))
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/brook/');a.add_argument('--out',default='.local/brook-browser');a.add_argument('--stages',nargs='+',type=int,default=list(range(1,11)));asyncio.run(main(a.parse_args()))
