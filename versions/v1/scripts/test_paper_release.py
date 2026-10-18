"""Fresh final-release smoke: 21 public entries, previous game and exact flight restore."""
import argparse,asyncio,datetime,json
from pathlib import Path
from playwright.async_api import async_playwright
from test_paper_browser import ROOT,snap,wait_state,begin,launch
import test_tide_browser as tide
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 oldpilot=await tide.Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==21 and sum(e['levels'] for e in data['experiments'])==266;assert await p.locator('.lab-card .primary-link').count()==21;report['atlas']={'entries':72,'groups':10,'originals':21,'levels':266,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await p.goto(base+'games/tide/');await tide.snap(p);await p.wait_for_load_state('networkidle');await tide.begin(p);old,actions=await tide.complete(p,oldpilot,stage=1);assert old['state']=='won' and old['stats']['originalCleared']==12;report['previousGame']={'id':'tide','state':old['state'],'stats':old['stats'],'actualLog':old['log']};save()
   await p.goto(base+'games/paper/');await snap(p);await p.wait_for_load_state('networkidle');assert await p.locator('.skip').evaluate('(e)=>getComputedStyle(e).clipPath')=='inset(50%)';await p.keyboard.press('Tab');assert await p.locator('.skip').evaluate('(e)=>document.activeElement===e&&getComputedStyle(e).top==="10px"');await begin(p);await launch(p,{'angle':62,'power':.46});await p.keyboard.press('p');before=await snap(p);assert before['state']=='paused' and before['ball'];await p.reload();after=await snap(p);await p.wait_for_load_state('networkidle');fields=['ticks','time','accumulator','blocks','ball','fragments','targets','stamps','quiet','phase','revision','log','deliveredIds','brokenIds','stats','aim'];assert after['state']=='paused' and all(before[k]==after[k] for k in fields);await p.keyboard.press('p');end=await wait_state(p,lambda s:s['state']=='won');assert end['stars']==3 and '已落定' in await p.locator('#action-note').inner_text();report['restoreAndWin']={'state':end['state'],'stars':end['stars'],'exactFields':fields,'restoredTicks':after['ticks'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p);await p.goto(base+'games/paper/');await snap(p);await p.wait_for_load_state('networkidle')
   async def tap(sel):
    await p.locator(sel).scroll_into_view_if_needed();r=await p.locator(sel).bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
   await tap('#ready-start');await tap('#help-confirm');await launch(p,{'angle':62,'power':.46},touch=True);end=await wait_state(p,lambda s:s['state']=='won');assert end['stars']==3 and end['stats']['shots']==1 and end['stats']['stamps']==2;report['nativeTouch']={'state':end['state'],'stars':end['stars'],'stats':end['stats'],'actualLog':end['log'],'method':'Native start/tutorial taps and five-move touchscreen sling drag/release; scroll positioning helper only.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previous':report['previousGame']['state'],'restoreStars':report['restoreAndWin']['stars'],'touchStars':report['nativeTouch']['stars']}))
  finally:save();await b.close();await oldpilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/paper-final-smoke.json');asyncio.run(main(a.parse_args()))
