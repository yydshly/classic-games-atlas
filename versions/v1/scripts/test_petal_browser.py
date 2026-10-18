"""Actual DOM pair clicks at production animation speed; observation-only solver."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.petal.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=8):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(15)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/petal_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert r and 'error' not in r,r;return r
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 assert (await snap(p))['state']=='playing'
async def play_pair(p,pair,touch=False):
 for i in [pair['a'],pair['b']]:
  c=p.locator(f'#board [data-index="{i}"]')
  if touch:await c.tap()
  else:await c.click()
 linked=await snap(p);assert linked['phase']=='link',linked
 end=await wait_state(p,lambda s:s['phase']=='stable' or s['state'] in ['won','lost'])
 return linked,end
async def complete(p,pilot,out=None,stage=1):
 actions=[]
 while True:
  s=await snap(p)
  if s['state']!='playing':return s,actions
  assert s['phase']=='stable',s
  pair=await pilot.decide(s);linked,end=await play_pair(p,pair)
  actions.append({'pairBefore':s['pairs'],'a':pair['a'],'b':pair['b'],'motif':s['board'][pair['a']]['kind'],'path':linked['path'],'solverCertificate':pair['certificate'],'pairAfter':end['pairs']})
  if out and stage in [1,10,20] and len(actions)==1:await p.screenshot(path=str(out/f'stage-{stage:02}-playing.png'),full_page=True)
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[]
 report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'actual DOM clicks, observation-only visible-board solver, unmodified production animations and rules','fixture':'only later-stage menu unlock/tutorial/sound preference; no board removal, resource increase, clock/score/win writes','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1050})
    if stage>1:await ctx.add_init_script('localStorage.setItem("'+KEY+'",JSON.stringify({unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['pairs']==0 and initial['shuffles']==2 and initial['mistakes']==4
    if stage in [1,10,20]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);result={'stage':stage,'end':end,'normalPairInputs':actions};report['results'].append(result);save()
    assert end['state']=='won' and end['pairs']==end['totalPairs'] and not any(end['board']) and len(actions)==end['totalPairs'],result
    assert end['unlocked']>=min(20,stage+1) and end['mistakes']==4 and end['shuffles']==2 and end['stats']['invalid']==0
    if stage in [1,10,20]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("'+KEY+'")');assert json.loads(saved)['best'][str(stage)]['score']==end['score']
    mirror=await b.new_context();await mirror.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(saved)+')');mp=await mirror.new_page();watch(mp);await mp.goto(args.url);rest=await snap(mp);await mp.wait_for_load_state('networkidle');assert rest['state']=='ready' and rest['level']==stage and rest['pairs']==0 and rest['board']==initial['board'] and rest['best'][str(stage)]['score']==end['score'];result['savedBestAndFreshReplayVerified']=True;await mirror.close();await ctx.close();save();print(json.dumps({'stage':stage,'state':end['state'],'pairs':end['pairs'],'score':end['score']}),flush=True)
   assert not(errors or bad or failed),(errors,bad,failed);await b.close()
 finally:save();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/petal/');a.add_argument('--out',default='docs/petal-qa/local-browser');a.add_argument('--stages',type=lambda x:[int(v) for v in x.split(',')],default=list(range(1,21)));asyncio.run(main(a.parse_args()))
