"""Real build confirmations, route text, purchases, Next buttons and discrete turns."""
import argparse,asyncio,datetime,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.harbor.v1'
async def snap(p):return await p.evaluate('async()=> (await import("./game.mjs")).diagnostics()')
async def plans():
 proc=await asyncio.create_subprocess_exec('node','--input-type=module','-e',"import{commands}from'./scripts/harbor_plans.mjs';console.log(JSON.stringify(Array.from({length:12},(_,i)=>commands(i))))",cwd=str(ROOT),stdout=asyncio.subprocess.PIPE);out,_=await proc.communicate();assert proc.returncode==0;return json.loads(out)
def invariant(s):
 c=s['invariants'];assert all(c[k] for k in ['cashMatches','nonnegative','allAccounted','uniqueCargo','capacity','edgeCapacity','nodeSlots','uniqueDelivery']),s
async def touch_button(p,selector):
 el=p.locator(selector);assert await el.is_enabled(),selector;await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
async def confirm(p,touch=False):
 assert await p.locator('#confirm-dialog').is_visible()
 if touch:await touch_button(p,'#confirm-action')
 else:await p.locator('#confirm-action').click()
async def apply(p,c,touch=False):
 if c['kind']=='build':
  if not await p.locator('details').evaluate('(e)=>e.open'):
   if touch:await touch_button(p,'summary')
   else:await p.locator('summary').click()
  if touch:await touch_button(p,'#edge-'+c['edge'])
  else:await p.locator('#edge-'+c['edge']).click()
  await confirm(p,touch)
 elif c['kind']=='buy':
  if not touch:await p.locator('#ship-type').select_option(value=c['type'])
  else:assert await p.locator('#ship-type').input_value()==c['type'],'Native touch helper uses the already-selected ship type'
  if touch:
   await touch_button(p,'#clear-route')
   for n in c['route']:await touch_button(p,f'[data-route-node="{n}"]')
   await touch_button(p,'#buy-preview')
  else:await p.locator('#route').fill(' '.join(c['route']));await p.locator('#buy-preview').click()
  await confirm(p,touch)
 elif c['kind']=='start':
  if touch:await touch_button(p,'#start')
  else:await p.locator('#start').click()
 elif c['kind']=='step':
  if touch:await touch_button(p,'#step')
  else:await p.locator('#step').click()
 else:raise AssertionError(c)
async def setup(p,plan,touch=False):
 for c in plan:
  before=await snap(p);await apply(p,c,touch);after=await snap(p);assert after['revision']==before['revision']+1 and after['log'][-1]==c,(c,after);invariant(after)
async def complete(p,touch=False,stop=None):
 actions=[]
 for _ in range(40):
  s=await snap(p)
  if s['state']!='playing' or (stop and stop(s)):return s,actions
  await apply(p,{'kind':'step'},touch);after=await snap(p);assert after['turn']==s['turn']+1;invariant(after);actions.append({'turn':after['turn'],'cash':after['cash'],'ledger':after['ledger'],'delivered':after['stats']['deliveries'],'invariants':after['invariants']})
 raise AssertionError('Exceeded formal level turn budget')
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);allplans=await plans();errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'One public navigation then actual Next buttons and naturally earned unlocks. Actual edge preview/confirm clicks, ship-type select, route text and purchase confirmation, start and one-step buttons. No inventory, cash, cargo, clock or delivery-state writes.','fixture':'Only initial starting-level unlock/tutorial/sound preferences if start>1.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1200})
   if args.start>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(args.start)+',last:'+str(args.start)+',tutorialSeen:true,sound:false}))')
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);await snap(p);await p.wait_for_load_state('networkidle')
   if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
   for stage in range(args.start,args.end+1):
    if stage>args.start:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['level']==stage and initial['turn']==0 and not initial['built'] and not initial['ships']
    if stage in [1,7,12]:await p.screenshot(path=str(out/f'level-{stage:02}-ready.png'),full_page=True)
    await setup(p,allplans[stage-1]);prepared=await snap(p);assert prepared['state']=='ready' and not prepared['turn'];await apply(p,{'kind':'start'});s,_=await complete(p,stop=lambda s:s['turn']>=3)
    if stage in [1,7,12]:await p.screenshot(path=str(out/f'level-{stage:02}-field.png'),full_page=True)
    end,actions=await complete(p);r={'stage':stage,'state':end['state'],'turn':end['turn'],'cash':end['cash'],'score':end['score'],'stats':end['stats'],'ledger':end['ledger'],'units':end['units'],'ships':end['ships'],'actualLog':end['log'],'best':end['best'].get(str(stage)),'unlocked':end['unlocked'],'invariants':end['invariants'],'actions':actions};report['results'].append(r);save();assert end['state']=='won' and end['remaining']==0 and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1),r;assert r['best']['score']==end['score'] and r['best']['cash']==end['cash'] and r['best']['turn']==end['turn'];invariant(end)
    if stage in [1,7,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'delivered':sum(r['stats']['deliveries'] for r in report['results']),'turns':sum(r['turn'] for r in report['results']),'errors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/harbor/');a.add_argument('--out',default='.local/harbor-browser');a.add_argument('--start',type=int,default=1);a.add_argument('--end',type=int,default=12);asyncio.run(main(a.parse_args()))
