"""Real mouse flight and optional normal shield key; no combat state injection."""
import argparse,asyncio,datetime,json,time,math
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,pred,timeout=4):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if pred(s):return s
  await p.wait_for_timeout(15)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/cloud_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();v=json.loads(await self.proc.stdout.readline());assert 'error' not in v,v;return v
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def complete(p,pilot,limit=120,out=None,stage=1):
 await p.locator('#battlefield').scroll_into_view_if_needed();r=await p.locator('#battlefield').bounding_box();end=time.monotonic()+limit;previous=None;log=[];elite_saved=False;powers_saved=False
 while time.monotonic()<end:
  s=await snap(p)
  if s['state']!='playing':return s,log
  command=await pilot.decide(s);target=command['target']
  if previous is None or math.hypot(target['x']-previous['x'],target['y']-previous['y'])>1.5:
   await p.mouse.move(r['x']+target['x']*r['width']/600,r['y']+target['y']*r['height']/720);previous=target;log.append({'timeObserved':s['time'],'normalPointerTarget':target,'kind':'mouse-move'})
  if command['shieldPressed']:await p.keyboard.press('Space');log.append({'timeObserved':s['time'],'kind':'normal-shield-key'})
  if out and stage in [1,4,8]:
   if not powers_saved and s['player']['power']>=2:await p.screenshot(path=str(out/f'stage-{stage:02}-upgrade.png'),full_page=True);powers_saved=True
   if not elite_saved and any(e['type']=='elite' and e['y']>80 and e['age']>1.5 for e in s['enemies']):await p.screenshot(path=str(out/f'stage-{stage:02}-elite.png'),full_page=True);elite_saved=True
  await p.wait_for_timeout(35)
 return await snap(p),log
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'normal mouse movement, automatic fire and finite Space shield requests, read-only predictor','fixture':'map1 fresh, other maps only unlock selection menu; no hp/enemy/shot/item/clock/score/win writes','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1100})
    if stage>1:await ctx.add_init_script('localStorage.setItem("classic-atlas.cloud.v1",JSON.stringify({unlocked:'+str(stage)+',last:1,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await p.locator('#primary-action').click();await p.locator('#help-confirm').click();end,log=await complete(p,pilot,args.limit,out,stage);result={'stage':stage,'end':end,'normalActions':log};report['results'].append(result);report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');assert end['state']=='won' and end['player']['hp']>0 and end['eliteDefeated'],result;assert end['stats']['shields']<=2 and end['player']['power']<=3;assert all(end['stats']['patterns'][k]>0 for k in ['straight','aim','fan']);assert end['unlocked']>=min(8,stage+1)
    if stage in [1,4,8]:await p.wait_for_timeout(120);await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("classic-atlas.cloud.v1")');await ctx.close();check=await b.new_context();cp=await check.new_page();watch(cp);await cp.goto(args.url);await cp.evaluate('(v)=>localStorage.setItem("classic-atlas.cloud.v1",v)',saved);await cp.reload();fresh=await snap(cp);assert fresh['state']=='ready' and fresh['level']==stage and fresh['player']['hp']==3 and fresh['player']['power']==1 and fresh['player']['charges']==2 and fresh['stats']['score']==0;assert fresh['best'][str(stage)]['score']==end['stats']['score'] and fresh['unlocked']==end['unlocked'];result['actualSaveUnlockAndFreshRetryVerified']=True;await cp.wait_for_load_state('networkidle');await check.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'stage':stage,'state':end['state'],'time':round(end['time'],2),'hp':end['player']['hp'],'power':end['player']['power'],'hits':end['stats']['hits'],'repairs':end['stats']['repairs'],'shields':end['stats']['shields'],'score':end['stats']['score']}),flush=True)
   await b.close()
  assert not(errors or bad or failed),(errors,bad,failed)
 finally:await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/cloud/');a.add_argument('--out',default='docs/cloud-qa/local-1-4-8');a.add_argument('--stages',type=lambda s:[int(v) for v in s.split(',')],default=[1,4,8]);a.add_argument('--limit',type=int,default=120);asyncio.run(main(a.parse_args()))
