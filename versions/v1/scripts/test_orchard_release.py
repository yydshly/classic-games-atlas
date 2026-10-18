"""Fresh25-entry release, previous ruins, exact orchard restore and native/keyboard1x wins."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_orchard_browser import ROOT,snap,Pilot,begin,complete,touch_button
from test_orchard_ui import FIELDS
from orchard_keyboard import complete_keyboard
import test_ruins_browser as ruins
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start();oldplans=await ruins.plans()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==25 and sum(e['levels'] for e in data['experiments'])==310 and data['version']=='2026.10.16.25';assert await p.locator('.lab-card .primary-link').count()==25;report['atlas']={'entries':72,'groups':10,'originals':25,'levels':310,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await p.goto(base+'games/ruins/');await ruins.snap(p);await p.wait_for_load_state('networkidle');await p.locator('#help-confirm').click();old=await ruins.execute(p,oldplans[0]);assert old['state']=='won' and old['beat']==48 and old['hero']['hp']==6;report['previousGame']={'id':'ruins','state':old['state'],'beat':old['beat'],'hp':old['hero']['hp'],'stats':old['stats'],'actualLog':old['log']};save()
   await p.goto(base+'games/orchard/');await snap(p);await p.wait_for_load_state('networkidle');await begin(p);await complete(p,pilot,stop=lambda s:s['stats']['cuts']>=1);await p.keyboard.press('p');before=await snap(p);await p.reload();after=await snap(p);await p.wait_for_load_state('networkidle');assert after['state']=='paused' and not after['stroke'] and all(before[k]==after[k] for k in FIELDS);await p.wait_for_timeout(800);assert (await snap(p))['ticks']==after['ticks'];await p.locator('#resume').click();end,_,_=await complete(p,pilot);assert end['state']=='won' and end['stats']['cuts']==3 and end['errors']==0;report['restoreAndWin']={'state':end['state'],'score':end['score'],'cuts':end['stats']['cuts'],'errors':end['errors'],'exactFields':FIELDS,'restoredTick':after['ticks'],'stats':end['stats'],'actualLog':end['log']};save()
   await p.keyboard.press('r');await p.locator('#battle').focus();await p.keyboard.press('Space');end,actions,elapsed=await complete_keyboard(p);assert end['state']=='won' and end['stats']['cuts']==3 and end['errors']==0;report['keyboardWin']={'state':end['state'],'score':end['score'],'cuts':end['stats']['cuts'],'errors':end['errors'],'time':end['time'],'wallSeconds':elapsed,'stats':end['stats'],'actualLog':end['log'],'actions':actions};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p);await p.goto(base+'games/orchard/');await snap(p);await p.wait_for_load_state('networkidle');await begin(p,touch=True);end,actions,elapsed=await complete(p,pilot,touch=True);assert end['state']=='won' and end['stats']['cuts']==3 and end['errors']==0;report['nativeTouch']={'state':end['state'],'score':end['score'],'cuts':end['stats']['cuts'],'errors':end['errors'],'time':end['time'],'wallSeconds':elapsed,'stats':end['stats'],'actualLog':end['log'],'actions':actions,'method':'Native start/tutorial taps then actual touchStart/interpolated touchMove/touchEnd at1x, scroll positioning helper only.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousHP':report['previousGame']['hp'],'restoreCuts':report['restoreAndWin']['cuts'],'keyboardCuts':report['keyboardWin']['cuts'],'nativeCuts':report['nativeTouch']['cuts']}))
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/orchard-final-smoke.json');asyncio.run(main(a.parse_args()))
