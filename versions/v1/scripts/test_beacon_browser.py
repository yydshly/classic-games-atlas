"""Production tactical campaign via native UI selection, previews and confirmation."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.beacon.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=16):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(25)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/beacon_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert r.get('kind') and 'error' not in r,r;return r
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p,touch=False):
 await (p.locator('#primary-action').tap() if touch else p.locator('#primary-action').click())
 if await p.locator('#help-dialog').is_visible():await (p.locator('#help-confirm').tap() if touch else p.locator('#help-confirm').click())
 assert (await snap(p))['state']=='playing'
async def perform(p,c,keyboard=False,touch=False):
 async def press(loc):await (loc.tap() if touch else loc.click())
 before=await snap(p);assert before['state']=='playing' and before['phase']=='player';rev=before['revision']
 if c['kind']=='end-turn':
  await press(p.locator('#end-turn'));assert await p.locator('#end-dialog').is_visible();assert (await snap(p))['revision']==rev;await press(p.locator('#end-confirm'));end=await wait_state(p,lambda s:s['state']!='playing' or s['phase']=='player' and s['round']>before['round']);assert end['enemySteps']<=end['enemyBudget'];return end
 await press(p.locator('[data-unit="'+c['unit']+'"]'))
 if c['kind']=='wait':await press(p.locator('#wait'))
 else:
  await press(p.locator('#mode-'+{'move':'move','attack':'attack','heal':'heal'}[c['kind']]));target=next((u for u in before['units'] if u['id']==c.get('target')),None);x=target['x'] if target else c['x'];y=target['y'] if target else c['y'];cell=p.locator(f'.cell[data-x="{x}"][data-y="{y}"]')
  if keyboard and not touch:await cell.focus();await p.keyboard.press('Enter')
  else:await press(cell)
 planned=await snap(p);assert planned['plan'] and planned['plan']['kind']==c['kind'] and planned['plan']['unit']==c['unit'],(c,planned);assert all(planned[k]==before[k] for k in ['units','round','phase','revision','held','stats']);await press(p.locator('#commit'));end=await wait_state(p,lambda s:s['revision']==rev+1 or s['state']!='playing');actor=next(u for u in end['units'] if u['id']==c['unit']);old=next(u for u in before['units'] if u['id']==c['unit']);assert actor['ap']==old['ap']-planned['plan']['cost'];
 if c['kind']=='move':assert actor['x']==c['x'] and actor['y']==c['y']
 if c['kind'] in ['attack','heal']:assert next(u for u in end['units'] if u['id']==c['target'])['hp']==planned['plan']['targetHP']
 return end
async def complete(p,pilot,out=None,stage=1,stop=None,max_actions=260,touch=False):
 actions=[];captured=False
 for i in range(max_actions):
  s=await snap(p)
  if s['state']!='playing' or (stop and stop(s)):return s,actions
  if s['phase']=='enemy':await wait_state(p,lambda s:s['state']!='playing' or s['phase']=='player');continue
  if out and stage in [1,4,5,8,10] and s['round']>=2 and not captured:await p.screenshot(path=str(out/f'stage-{stage:02}-battle.png'),full_page=True);captured=True
  c=await pilot.decide(s);end=await perform(p,c,keyboard=i%3==0,touch=touch);actions.append({'beforeRound':s['round'],'beforeRevision':s['revision'],'command':c,'afterRevision':end['revision'],'afterPhase':end['phase'],'state':end['state']})
 raise AssertionError('Campaign exceeded normal action budget')
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Native mouse/keyboard unit selection, mode/range preview, target cell and explicit confirmation. Enemy replies run at production UI pace. Strategy forecasts on separate rule copies; live state is never written.','fixture':'Later-stage menu unlock/tutorial/sound preference only; no HP/AP/position/enemy/objective/result fixture for campaign wins','results':[]}
 report['inputMode']='actual native touch' if args.touch else 'mouse and keyboard'
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True) if args.touch else await b.new_context(viewport={'width':1280,'height':1100})
    if stage>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    init=await snap(p);assert init['state']=='ready' and init['round']==1 and init['revision']==0 and init['stats']['kills']==0;maxima={'warden':9,'ranger':7,'medic':7,'courier':8};assert all(u['hp']==maxima[u['type']] and u['ap']==(2 if u['side']=='blue' else 0) and not u['repairUsed'] for u in init['units'])
    if stage in [1,4,5,8,10]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p,touch=args.touch);end,actions=await complete(p,pilot,out,stage,touch=args.touch);r={'stage':stage,'end':end,'normalUIActions':actions,'actualNativeTouch':args.touch};report['results'].append(r);save();assert end['state']=='won' and end['stats']['settlements']==1 and end['stats']['kills']==len([u for u in init['units'] if u['side']=='red']) and any(u['side']=='blue' and u['type']!='courier' and u['hp']>0 for u in end['units']),r
    if stage in [4,7,9]:courier=next(u for u in end['units'] if u['type']=='courier');assert courier['hp']>0 and courier['x']==7 and courier['y']==3
    if stage in [5,8,10]:assert end['held']>=(3 if stage==5 else 4)
    assert end['unlocked']>=min(10,stage+1) and end['best'][str(stage)]['rounds']==end['round']
    for button_id in ['primary-action','secondary-action']:
     await p.locator('#'+button_id).scroll_into_view_if_needed();box=await p.locator('#'+button_id).bounding_box();hit=await p.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.closest("button")?.id',{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2});assert hit==button_id,(button_id,hit)
    r['resultOverlayButtonsUnobstructed']=True
    if stage in [1,4,5,8,10]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    await p.reload();fresh=await snap(p);await p.wait_for_load_state('networkidle');assert fresh['state']=='ready' and fresh['level']==stage and fresh['round']==1 and fresh['revision']==0 and fresh['stats']['kills']==0 and fresh['best']==end['best'] and fresh['unlocked']==end['unlocked'];r['bestUnlockAndFreshReplayVerified']=True;await ctx.close();save();print(json.dumps({'stage':stage,'state':end['state'],'round':end['round'],'held':end['held'],'kills':end['stats']['kills'],'losses':end['stats']['blueLosses'],'actions':len(actions)}),flush=True)
   assert not(errors or bad or failed),(errors,bad,failed);await b.close()
 finally:save();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/beacon/');a.add_argument('--out',default='docs/beacon-qa/local-browser');a.add_argument('--stages',type=lambda x:[int(v) for v in x.split(',')],default=list(range(1,11)));a.add_argument('--touch',action='store_true');asyncio.run(main(a.parse_args()))
