"""Fresh24-entry release, previous farm and exact windup restore/native adventure."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_ruins_browser import ROOT,snap,plans,apply,execute,touch_button
from test_ruins_ui import FIELDS
import test_farm_browser as farm
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 allplans=await plans();oldplans=await farm.plans()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==24 and sum(e['levels'] for e in data['experiments'])==298 and data['version']=='2026.10.16.24';assert await p.locator('.lab-card .primary-link').count()==24;report['atlas']={'entries':72,'groups':10,'originals':24,'levels':298,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await p.goto(base+'games/farm/');await farm.snap(p);await p.wait_for_load_state('networkidle');await p.locator('#help-confirm').click();old=await farm.execute(p,oldplans[0]);assert old['state']=='won' and old['day']==3 and old['cash']==11;report['previousGame']={'id':'farm','state':old['state'],'day':old['day'],'cash':old['cash'],'stats':old['stats'],'actualLog':old['log']};save()
   await p.goto(base+'games/ruins/');await snap(p);await p.wait_for_load_state('networkidle');await p.locator('#help-confirm').click();offset=0
   for i,c in enumerate(allplans[0]):
    s=await apply(p,c)
    if any(e['phase']=='windup' for e in s['rooms'][s['room']]['enemies']):offset=i+1;break
   assert offset;await p.locator('#battle').focus();await p.keyboard.press('p');before=await snap(p);await p.reload();after=await snap(p);await p.wait_for_load_state('networkidle');assert after['state']=='paused' and all(before[k]==after[k] for k in FIELDS);await p.wait_for_timeout(800);assert (await snap(p))['beat']==before['beat'];await p.locator('#resume').click();end=await execute(p,allplans[0][offset:]);assert end['state']=='won' and end['hero']['hp']==6 and end['beat']==48;report['restoreAndWin']={'state':end['state'],'beat':end['beat'],'hp':end['hero']['hp'],'keys':end['keys'],'potions':end['potions'],'exactFields':FIELDS,'restoredBeat':after['beat'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p);await p.goto(base+'games/ruins/');await snap(p);await p.wait_for_load_state('networkidle');await touch_button(p,'#help-confirm');end=await execute(p,allplans[0],touch=True);assert end['state']=='won' and end['hero']['hp']==6 and end['beat']==48 and len(end['visited'])==3;report['nativeTouch']={'state':end['state'],'beat':end['beat'],'hp':end['hero']['hp'],'keys':end['keys'],'potions':end['potions'],'stats':end['stats'],'actualLog':end['log'],'method':'Native tutorial/start/D-pad/dodge-arm/sweep/wait/interaction taps through all3 rooms; scroll positioning helper only.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousFarmCash':report['previousGame']['cash'],'restoreHP':report['restoreAndWin']['hp'],'nativeHP':report['nativeTouch']['hp']}))
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/ruins-final-smoke.json');asyncio.run(main(a.parse_args()))
