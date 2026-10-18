"""Production-budget plans executed only through ordinary controls and confirmations."""
import argparse,asyncio,datetime,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.farm.v1'
async def snap(p):return await p.evaluate('async()=> (await import("./game.mjs")).diagnostics()')
async def plans():
 proc=await asyncio.create_subprocess_exec('node','--input-type=module','-e',"import{plan}from'./scripts/farm_plans.mjs';console.log(JSON.stringify(Array.from({length:12},(_,i)=>plan(i).game.log)))",cwd=str(ROOT),stdout=asyncio.subprocess.PIPE);out,_=await proc.communicate();assert proc.returncode==0;return json.loads(out)
def invariant(s):assert all(s['invariants'].values()),s
async def touch_button(p,selector):
 el=p.locator(selector);assert await el.is_enabled(),selector;await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
async def click(p,selector,touch=False):
 if touch:await touch_button(p,selector)
 else:await p.locator(selector).click()
async def confirm(p,touch=False):assert await p.locator('#confirm-dialog').is_visible();await click(p,'#confirm-action',touch)
async def apply(p,c,touch=False):
 before=await snap(p)
 if 'plot' in c:await click(p,f'[data-plot="{c["plot"]}"]',touch)
 if c['kind']=='plant':
  if touch:assert await p.locator('#crop').input_value()==c['crop'],'Touch helper uses the already selected first-stage crop'
  else:await p.locator('#crop').select_option(value=c['crop'])
 selector={'start':'#start','end':'#end-day','plant':'#plant','water':'#water','harvest':'#harvest'}.get(c['kind'])
 if c['kind']=='deliver':selector=f'[data-deliver="{c["order"]}"]'
 assert selector,c;await click(p,selector,touch)
 if c['kind']!='start':await confirm(p,touch)
 after=await snap(p);assert after['revision']==before['revision']+1 and after['log'][-1]==c,(c,after);invariant(after);return after
async def execute(p,commands,touch=False):
 for c in commands:await apply(p,c,touch)
 return await snap(p)
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);allplans=await plans();errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'One initial page load, actual Next buttons and naturally earned unlocks. Real plot selection, crop select, action preview/confirmation and end-day confirmation. No resource, age, inventory, weather, deadline or result writes.','fixture':'Only initial unlock/tutorial preferences when start>1.','results':[]}
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
    initial=await snap(p);assert initial['level']==stage and initial['state']=='ready' and not initial['units'] and not initial['plantings'] and not initial['completed']
    if stage in [1,7,12]:await p.screenshot(path=str(out/f'level-{stage:02}-ready.png'),full_page=True)
    captured=False
    for c in allplans[stage-1]:
     s=await apply(p,c)
     if stage in [1,7,12] and c['kind']=='end' and not captured:await p.screenshot(path=str(out/f'level-{stage:02}-field.png'),full_page=True);captured=True
    end=await snap(p);r={k:end[k] for k in ['state','day','actions','cash','score','stats','ledger','plots','units','plantings','batches','completed','invariants']};r.update(stage=stage,actualLog=end['log'],unlocked=end['unlocked'],best=end['best'].get(str(stage)));report['results'].append(r);save();assert end['state']=='won' and not end['remaining'] and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1),r;assert r['best']['score']==end['score'] and r['best']['cash']==end['cash'] and r['best']['day']==end['day'];invariant(end)
    if stage in [1,7,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'delivered':sum(r['stats']['delivered'] for r in report['results']),'actions':sum(r['stats']['actions'] for r in report['results']),'daysEnded':sum(r['stats']['daysEnded'] for r in report['results']),'commands':sum(len(r['actualLog']) for r in report['results']),'errors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/farm/');a.add_argument('--out',default='.local/farm-browser');a.add_argument('--start',type=int,default=1);a.add_argument('--end',type=int,default=12);asyncio.run(main(a.parse_args()))
