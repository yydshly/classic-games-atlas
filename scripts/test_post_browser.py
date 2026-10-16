"""Eight production courses through actual keyboard edges; no gate/time/position writes."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.post.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=8):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(20)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/post_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert 'steer' in r and 'error' not in r,r;return r
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 assert (await snap(p))['state']=='countdown'
async def complete(p,pilot,out=None,stage=1,stop=None,timeout=200):
 held=set();actions=[];resets=-1;saved=set();captures=[];end=time.monotonic()+timeout
 try:
  while time.monotonic()<end:
   s=await snap(p)
   if s['state'] not in ['playing','countdown'] or (stop and stop(s)):return s,actions
   if s['stats']['resets']!=resets:
    resets=s['stats']['resets']
    for key in list(held):await p.keyboard.up(key)
    held.clear()
   a=await pilot.decide(s);wanted=set()
   if a['steer']>0:wanted.add('ArrowRight')
   if a['steer']<0:wanted.add('ArrowLeft')
   if a['gas']:wanted.add('ArrowUp')
   if a['brake']:wanted.add('ArrowDown')
   for key in sorted(held-wanted):await p.keyboard.up(key);actions.append({'timeObserved':s['time'],'key':key,'edge':'up'})
   for key in sorted(wanted-held):await p.keyboard.down(key);actions.append({'timeObserved':s['time'],'key':key,'edge':'down'})
   held=wanted
   if out and stage in [1,4,8] and s['lap']>1 and s['lap'] not in saved:captures.append(asyncio.create_task(p.screenshot(path=str(out/f'stage-{stage:02}-lap-{s["lap"]}.png'),full_page=True)));saved.add(s['lap'])
   await p.wait_for_timeout(15)
  return await snap(p),actions
 finally:
  for key in list(held):await p.keyboard.up(key)
  await asyncio.gather(*captures)
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Real keyboard down/up to steer, gas and brake with copied telemetry policy; authored production vehicle/time limits; no coordinates, speed, gates, laps, clock or result writes','fixture':'Later-stage menu unlock/tutorial/sound preferences only','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1050})
    if stage>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['time']==0 and initial['lap']==1 and initial['stats']['gates']==0
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);r={'stage':stage,'end':end,'normalKeyEdges':actions};report['results'].append(r);save();tracks=await p.evaluate('async()=> (await import("./tracks.mjs")).TRACKS.map(t=>({laps:t.laps,limit:t.limit,gateCount:t.gateCount}))');t=tracks[stage-1];assert end['state']=='won' and end['time']<t['limit'] and len(end['lapTimes'])==t['laps'] and end['stats']['gates']==t['laps']*t['gateCount'] and end['stats']['settlements']==1 and end['unlocked']>=min(8,stage+1),r;assert end['best'][str(stage)]['lap']==min(end['lapTimes']) and end['best'][str(stage)]['total']==end['time']
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    await p.reload();fresh=await snap(p);await p.wait_for_load_state('networkidle');assert fresh['state']=='ready' and fresh['level']==stage and fresh['time']==0 and fresh['lap']==1 and fresh['stats']['gates']==0 and fresh['best']==end['best'] and fresh['unlocked']==end['unlocked'];r['bestUnlockAndFreshReplayVerified']=True;await ctx.close();save();print(json.dumps({'stage':stage,'state':end['state'],'time':round(end['time'],2),'laps':len(end['lapTimes']),'gates':end['stats']['gates'],'resets':end['stats']['resets']}),flush=True)
   assert not(errors or bad or failed),(errors,bad,failed);await b.close()
 finally:save();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/post/');a.add_argument('--out',default='docs/post-qa/local-browser');a.add_argument('--stages',type=lambda x:[int(v) for v in x.split(',')],default=list(range(1,9)));asyncio.run(main(a.parse_args()))
