"""Fresh26-entry release, previous orchard real drags, courier exact restore/native wins."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_courier_browser import ROOT,KEY,FIELDS,snap,begin,complete,load,watch
import test_orchard_browser as orchard
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await orchard.Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p,errors,bad,failed);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==26 and sum(e['levels'] for e in data['experiments'])==322 and data['version']=='2026.10.16.26';assert await p.locator('.lab-card .primary-link').count()==26;report['atlas']={'entries':72,'groups':10,'originals':26,'levels':322,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await p.goto(base+'games/orchard/');await orchard.snap(p);await p.wait_for_load_state('networkidle');await orchard.begin(p);old,actions,elapsed=await orchard.complete(p,pilot);assert old['state']=='won' and old['stats']['cuts']==3 and old['errors']==0 and old['score']==30;report['previousGame']={'id':'orchard','state':old['state'],'cuts':old['stats']['cuts'],'errors':old['errors'],'score':old['score'],'stats':old['stats'],'actualLog':old['log'],'actions':actions,'wallSeconds':elapsed};save()
   await load(p,base+'games/courier/');await begin(p);await complete(p,stop=lambda s:s['cargo']>=1);await p.keyboard.press('p');before=await snap(p);await load(p,base+'games/courier/',True);after=await snap(p);assert after['state']=='paused' and after['gesture'] is None and all(before[k]==after[k] for k in FIELDS);await p.wait_for_timeout(700);assert (await snap(p))['ticks']==after['ticks'];await p.locator('#resume').click();end,_,_=await complete(p);assert end['state']=='won' and end['cargo']==9 and end['hp']==3;report['restoreAndWin']={'state':end['state'],'cargo':end['cargo'],'hp':end['hp'],'score':end['score'],'exactFields':FIELDS,'restoredTick':after['ticks'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,base+'games/courier/');await begin(p,True);end,actions,elapsed=await complete(p,True);assert end['state']=='won' and end['cargo']==9 and end['hp']==3;report['nativeTouch']={'state':end['state'],'cargo':end['cargo'],'hp':end['hp'],'score':end['score'],'time':end['time'],'wallSeconds':elapsed,'stats':end['stats'],'actualLog':end['log'],'actions':actions,'method':'Native tutorial/start/action-button taps at1x, scroll positioning helper only.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousCuts':report['previousGame']['cuts'],'restoreCargo':report['restoreAndWin']['cargo'],'nativeCargo':report['nativeTouch']['cargo']}))
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/courier-final-smoke.json');asyncio.run(main(a.parse_args()))
