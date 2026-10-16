"""Real mouse aim/fire at production fixed-step physics and authored budgets."""
import argparse,asyncio,datetime,json,time,math
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.pinfall.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=30):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(25)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/pinfall_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert r and 'angle' in r and 'error' not in r,r;return r
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 assert (await snap(p))['state']=='playing'
async def aim_point(p,angle):
 c=p.locator('#court');await c.scroll_into_view_if_needed();r=await c.bounding_box();a=angle*math.pi/180;return {'x':r['x']+(320+math.sin(a)*180)/640*r['width'],'y':r['y']+(58+math.cos(a)*180)/760*r['height']}
async def fire_angle(p,angle):
 before=await snap(p);point=await aim_point(p,angle);await p.mouse.move(point['x'],point['y']);await p.mouse.click(point['x'],point['y']);flying=await snap(p);assert flying['ball'] and flying['aim']==angle and flying['stats']['shots']==before['stats']['shots']+1,(angle,flying);return flying
async def complete(p,pilot,out=None,stage=1):
 actions=[]
 for n in range(80):
  s=await snap(p)
  if s['state']!='playing':return s,actions
  assert not s['ball'];choice=await pilot.decide(s);flying=await fire_angle(p,choice['angle'])
  if out and stage in [1,6,12] and n==0:await wait_state(p,lambda s:s['shot'] and s['shot']['ticks']>=20 or not s['ball']);await p.screenshot(path=str(out/f'stage-{stage:02}-flying.png'),full_page=True)
  end=await wait_state(p,lambda s:not s['ball']);actual=sum(q['kind']=='target' for q in end['pegs']);assert actual==choice['predictedRemaining'];actions.append({**choice,'shotsBefore':s['shots'],'shotsAfter':end['shots'],'targetsAfter':actual,'scoreAfter':end['stats']['score'],'tickAfter':end['tick']})
 raise AssertionError('Too many shots')
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Actual mouse angle point and click, real-time production fixed-step physics; normal strategy predicts copies only','fixture':'Later-stage menu unlock/tutorial/sound only; no ball increase, peg removal, physics/speed/clock/result write','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1100})
    if stage>1:await ctx.add_init_script('localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['stats']['shots']==0 and initial['shots']==initial['initialShots']
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);result={'stage':stage,'end':end,'normalShots':actions};report['results'].append(result);save();assert end['state']=='won' and not any(q['kind']=='target' for q in end['pegs']) and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1)
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("'+KEY+'")');assert json.loads(saved)['best'][str(stage)]['score']==end['stats']['score']
    mirror=await b.new_context();await mirror.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(saved)+')');mp=await mirror.new_page();watch(mp);await mp.goto(args.url);rest=await snap(mp);await mp.wait_for_load_state('networkidle');assert rest['state']=='ready' and rest['level']==stage and rest['pegs']==initial['pegs'] and rest['shots']==initial['initialShots'] and rest['best'][str(stage)]['score']==end['stats']['score'];result['savedBestAndFreshReplayVerified']=True;await mirror.close();await ctx.close();save();print(json.dumps({'stage':stage,'state':end['state'],'shots':len(actions),'score':end['stats']['score']}),flush=True)
   assert not(errors or bad or failed),(errors,bad,failed);await b.close()
 finally:save();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/pinfall/');a.add_argument('--out',default='docs/pinfall-qa/local-browser');a.add_argument('--stages',type=lambda x:[int(v) for v in x.split(',')],default=list(range(1,13)));asyncio.run(main(a.parse_args()))
