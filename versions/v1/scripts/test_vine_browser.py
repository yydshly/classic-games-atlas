"""Production-speed corridor play, actual direction keys, no food/body/timing writes."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()';KEYS=['ArrowRight','ArrowDown','ArrowLeft','ArrowUp']
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=5):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(15)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/vine_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert 'error' not in r,r;return r['dir']
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
async def complete(p,pilot,out=None,stage=1,stop=None):
 previous=-1;actions=[];captures=[];food_saved=False;portal_saved=False;end=time.monotonic()+90
 while time.monotonic()<end:
  s=await snap(p)
  if s['state']!='playing' or (stop and stop(s)):
   await asyncio.gather(*captures);return s,actions
  if s['ticks']!=previous and not s['queue']:
   previous=s['ticks'];direction=await pilot.decide(s)
   if direction!=s['dir']:await p.keyboard.press(KEYS[direction]);actions.append({'tickObserved':s['ticks'],'headObserved':s['body'][0],'actualKey':KEYS[direction]})
  if out and stage in [1,8,16]:
   if not food_saved and s['collected']>0:captures.append(asyncio.create_task(p.screenshot(path=str(out/f'stage-{stage:02}-growing.png'),full_page=True)));food_saved=True
   if not portal_saved and s['stats']['portalTrips']>0:captures.append(asyncio.create_task(p.screenshot(path=str(out/f'stage-{stage:02}-portal.png'),full_page=True)));portal_saved=True
  await p.wait_for_timeout(15)
 await asyncio.gather(*captures);return await snap(p),actions
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'ordinary direction keys and production authored speed; visible-state BFS respecting body and portal directions','fixture':'only later-stage menu unlock; no food relocation, body deletion, speed/clock override, score/goal/win write','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1050})
    if stage>1:await ctx.add_init_script('localStorage.setItem("classic-atlas.vine.v1",JSON.stringify({unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);result={'stage':stage,'end':end,'normalDirectionInputs':actions};report['results'].append(result);report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');assert end['state']=='won' and end['collected']==end['target'] and end['body'][0]==end['exit'],result;assert len(end['body'])==end['collected']+3 and end['unlocked']>=min(16,stage+1)
    if stage>=5:assert end['stats']['portalTrips']>0
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("classic-atlas.vine.v1")');await p.wait_for_load_state('networkidle');await ctx.close();check=await b.new_context();cp=await check.new_page();watch(cp);await cp.goto(args.url);await snap(cp);await cp.evaluate('(v)=>localStorage.setItem("classic-atlas.vine.v1",v)',saved);await cp.reload();fresh=await snap(cp);assert fresh['state']=='ready' and fresh['level']==stage and fresh['ticks']==0 and fresh['collected']==0 and len(fresh['body'])==3 and fresh['best'][str(stage)]['score']==end['score'] and fresh['unlocked']==end['unlocked'];result['actualBestUnlockAndFreshRetryVerified']=True;await cp.wait_for_load_state('networkidle');await check.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'stage':stage,'state':end['state'],'ticks':end['ticks'],'seconds':round(end['time'],2),'food':end['collected'],'length':len(end['body']),'portals':end['stats']['portalTrips'],'score':end['score']}),flush=True)
   await b.close()
  assert not(errors or bad or failed),(errors,bad,failed)
 finally:await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/vine/');a.add_argument('--out',default='docs/vine-qa/local-1-8-16');a.add_argument('--stages',type=lambda s:[int(v) for v in s.split(',')],default=[1,8,16]);asyncio.run(main(a.parse_args()))
