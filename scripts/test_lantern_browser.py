"""Real direction inputs through a read-only pilot; later-map menu fixture only."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()';KEYS=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,pred,timeout=4):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if pred(s):return s
  await p.wait_for_timeout(15)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 def __init__(self):self.proc=None
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/lantern_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();reply=json.loads(await self.proc.stdout.readline());assert 'error' not in reply,reply;return reply['dir']
 async def close(self):
  if self.proc and self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def complete(p,pilot,limit=150,out=None,stage=None):
 end=time.monotonic()+limit;log=[];power_saved=False;capture_saved=False
 while time.monotonic()<end:
  s=await snap(p)
  if s['state']!='playing':return s,log
  d=await pilot.decide(s)
  if d is not None:await p.keyboard.press(KEYS[d]);log.append({'timeObserved':s['time'],'xObserved':s['player']['x'],'yObserved':s['player']['y'],'direction':d})
  if out and stage in [1,5,10]:
   if not power_saved and s['power']>0:await p.screenshot(path=str(out/f'stage-{stage:02}-power.png'),full_page=True);power_saved=True
   if not capture_saved and s['stats']['captures']>0:await p.screenshot(path=str(out/f'stage-{stage:02}-capture.png'),full_page=True);capture_saved=True
  await p.wait_for_timeout(15)
 return await snap(p),log
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'ordinary Arrow key presses, live moving enemies and earned time-limited powers; read-only pilot','fixture':'map 1 fresh; later maps only unlock the selection menu; no position/life/dot/enemy/power/clock/win mutation','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1050})
    if stage>1:await ctx.add_init_script('localStorage.setItem("classic-atlas.lantern.v1",JSON.stringify({unlocked:'+str(stage)+',last:1,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    if stage in [1,5,10]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await p.locator('#primary-action').click();await p.locator('#help-confirm').click();end,log=await complete(p,pilot,args.limit,out,stage);result={'stage':stage,'end':end,'normalKeyRequests':log};report['results'].append(result);report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');assert end['state']=='won' and end['remaining']==0 and end['lives']>0,result;assert end['stats']['collected']==len(end['dots']);assert end['unlocked']>=min(10,stage+1)
    if stage in [1,5,10]:await p.wait_for_timeout(120);await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("classic-atlas.lantern.v1")');await ctx.close();check=await b.new_context();cp=await check.new_page();watch(cp);await cp.goto(args.url);await cp.evaluate('(v)=>localStorage.setItem("classic-atlas.lantern.v1",v)',saved);await cp.reload();fresh=await snap(cp);assert fresh['state']=='ready' and fresh['level']==stage and fresh['lives']==3 and fresh['stats']['collected']==0;assert abs(fresh['best'][str(stage)]['time']-end['time'])<.01;assert fresh['unlocked']==end['unlocked'];result['actualSaveUnlockAndFreshRetryVerified']=True;await cp.wait_for_load_state('networkidle');await check.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'stage':stage,'state':end['state'],'time':round(end['time'],2),'lives':end['lives'],'deaths':end['stats']['deaths'],'captures':end['stats']['captures'],'remaining':end['remaining']}),flush=True)
   await b.close()
  assert not(errors or bad or failed),(errors,bad,failed)
 finally:await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/lantern/');a.add_argument('--out',default='docs/lantern-qa/local-1-5-10');a.add_argument('--stages',type=lambda s:[int(v) for v in s.split(',')],default=[1,5,10]);a.add_argument('--limit',type=int,default=150);asyncio.run(main(a.parse_args()))
