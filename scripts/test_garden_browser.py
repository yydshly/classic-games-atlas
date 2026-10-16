"""Actual adjacent mouse clicks, visible-board strategy, and production animations."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=10):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(20)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self,poor=False):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/garden_pilot.mjs'),'--stdio',*(['--poor'] if poor else []),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert r and 'error' not in r,r;return r
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
async def click_swap(p,a,b):
 await p.locator(f'#board [data-index="{a}"]').click();await p.locator(f'#board [data-index="{b}"]').click();return await wait_state(p,lambda s:s['phase']=='stable' or s['state'] in ['won','lost'],30)
async def complete(p,pilot,out=None,stage=1):
 actions=[];special_saved=False
 for _ in range(40):
  s=await snap(p)
  if s['state']!='playing':return s,actions
  assert s['phase']=='stable';command=await pilot.decide(s);before=s;end=await click_swap(p,command['a'],command['b']);actions.append({'a':command['a'],'b':command['b'],'before':{'moves':before['moves'],'score':before['score'],'collected':before['collected'],'layers':before['clearedLayers']},'after':{'moves':end['moves'],'score':end['score'],'collected':end['collected'],'layers':end['clearedLayers']}});assert end['moves']==before['moves']-1
  if out and stage in [1,10,20] and not special_saved and end['stats']['created']>0:await p.screenshot(path=str(out/f'stage-{stage:02}-special.png'),full_page=True);special_saved=True
 return await snap(p),actions
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'visible-board greedy strategy, actual adjacent mouse clicks and normal production animations; no RNG lookahead','fixture':'only later-stage menu unlock before loading; no board/goal/step/score/RNG/win writes','seedScope':'default authored fixed seed for each map; no claim all arbitrary random seeds are solvable','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1050})
    if stage>1:await ctx.add_init_script('localStorage.setItem("classic-atlas.garden.v1",JSON.stringify({unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    if stage in [1,10,20]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);result={'stage':stage,'end':end,'normalSwaps':actions};report['results'].append(result);report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');assert end['state']=='won',result;assert end['unlocked']>=min(20,stage+1)
    if stage in [1,10,20]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("classic-atlas.garden.v1")');await p.wait_for_load_state('networkidle');await ctx.close();check=await b.new_context();cp=await check.new_page();watch(cp);await cp.goto(args.url);await snap(cp);await cp.evaluate('(v)=>localStorage.setItem("classic-atlas.garden.v1",v)',saved);await cp.reload();fresh=await snap(cp);assert fresh['state']=='ready' and fresh['level']==stage and fresh['stats']['validSwaps']==0 and fresh['score']==0 and fresh['unlocked']==end['unlocked'] and fresh['best'][str(stage)]['score']==end['score'];assert fresh['seed']==end['seed'];result['actualBestUnlockAndFreshSameSeedVerified']=True;await cp.wait_for_load_state('networkidle');await check.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'stage':stage,'state':end['state'],'seed':end['seed'],'swaps':end['stats']['validSwaps'],'score':end['score'],'maxChain':end['stats']['maxChain'],'created':end['stats']['created'],'activated':end['stats']['activated']}),flush=True)
   await b.close()
  assert not(errors or bad or failed),(errors,bad,failed)
 finally:await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/garden/');a.add_argument('--out',default='docs/garden-qa/local-1-10-20');a.add_argument('--stages',type=lambda s:[int(v) for v in s.split(',')],default=[1,10,20]);asyncio.run(main(a.parse_args()))
