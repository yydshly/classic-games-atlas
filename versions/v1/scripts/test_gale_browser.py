"""Actual held key edges; policy only emits normal controls from copied telemetry."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.gale.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=8):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(20)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/gale_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert 'axis' in r and 'error' not in r,r;return r
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 assert (await snap(p))['state']=='playing'
async def complete(p,pilot,out=None,stage=1,stop=None,timeout=100):
 held=set();actions=[];deaths=-1;captures=[];saved=set();end=time.monotonic()+timeout
 try:
  while time.monotonic()<end:
   s=await snap(p)
   if s['state']!='playing' or (stop and stop(s)):return s,actions
   if s['stats']['deaths']!=deaths:
    deaths=s['stats']['deaths']
    for key in list(held):await p.keyboard.up(key)
    held.clear()
   a=await pilot.decide(s);wanted=set()
   if a['axis']>0:wanted.add('ArrowRight')
   if a['axis']<0:wanted.add('ArrowLeft')
   if a['fire']:wanted.add('KeyJ')
   if a['jumpHeld']:wanted.add('Space')
   if a['aimUp']:wanted.add('ArrowUp')
   for key in sorted(held-wanted):await p.keyboard.up(key);actions.append({'timeObserved':s['time'],'xObserved':s['player']['x'],'key':key,'edge':'up'})
   for key in sorted(wanted-held):await p.keyboard.down(key);actions.append({'timeObserved':s['time'],'xObserved':s['player']['x'],'key':key,'edge':'down'})
   held=wanted
   if a['specialPressed']:await p.keyboard.press('k');actions.append({'timeObserved':s['time'],'key':'KeyK','edge':'press'})
   if out and stage in [1,4,8]:
    label='boss-phase-'+str(s['stats']['bossPhases']) if stage==8 and s['player']['x']>2250 else 'checkpoint' if s['checkpointIndex'] else None
    if label and label not in saved:captures.append(asyncio.create_task(p.screenshot(path=str(out/f'stage-{stage:02}-{label}.png'),full_page=True)));saved.add(label)
   await p.wait_for_timeout(15)
  return await snap(p),actions
 finally:
  for key in list(held):await p.keyboard.up(key)
  await asyncio.gather(*captures)
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Ordinary keyboard edges for move, jump, fire, upper aim and limited pulse; production physics, normal armor/lives/ammo rules','fixture':'Later-stage menu unlock/tutorial/sound only; no player or enemy health, position, speed, result writes','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1050})
    if stage>1:await ctx.add_init_script('localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['lives']==3 and initial['player']['hp']==5
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);result={'stage':stage,'end':end,'normalKeyEdges':actions};report['results'].append(result);save();assert end['state']=='won' and end['lives']>0 and end['player']['hp']>0 and all(e['hp']==0 for e in end['enemies']) and end['stats']['kills']==len(end['enemies']) and end['stats']['settlements']==1 and end['unlocked']>=min(8,stage+1),result
    assert end['checkpointIndex']==(2 if stage==8 else 1)
    if stage==8:assert end['stats']['bossPhases']==3
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("'+KEY+'")');mirror=await b.new_context();await mirror.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(saved)+')');mp=await mirror.new_page();watch(mp);await mp.goto(args.url);r=await snap(mp);await mp.wait_for_load_state('networkidle');assert r['state']=='ready' and r['level']==stage and r['lives']==3 and r['player']['hp']==5 and r['stats']['kills']==0 and r['best'][str(stage)]['score']==end['stats']['score'];result['bestUnlockAndFreshReplayVerified']=True;await mirror.close();await ctx.close();save();print(json.dumps({'stage':stage,'state':end['state'],'hp':end['player']['hp'],'lives':end['lives'],'deaths':end['stats']['deaths'],'time':round(end['time'],2),'kills':end['stats']['kills'],'bossPhases':end['stats']['bossPhases']}),flush=True)
   assert not(errors or bad or failed),(errors,bad,failed);await b.close()
 finally:save();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/gale/');a.add_argument('--out',default='docs/gale-qa/local-browser');a.add_argument('--stages',type=lambda x:[int(v) for v in x.split(',')],default=list(range(1,9)));asyncio.run(main(a.parse_args()))
