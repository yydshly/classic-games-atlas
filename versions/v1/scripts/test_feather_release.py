"""32 entries, previous RTS first map, current exact restore and native party adventure."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_feather_browser import ROOT,FIELDS,snap,Pilot,begin,complete,load,watch
from test_feather_refresh import partial
import test_expedition_browser as previous
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]};pilot=await Pilot().start();oldpilot=await previous.Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1100});p=await ctx.new_page();watch(p,errors,bad,failed);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==32 and sum(e['levels'] for e in data['experiments'])==382 and data['version']=='2026.10.16.32';assert await p.locator('.lab-card .primary-link').count()==32;report['atlas']={'entries':72,'groups':10,'originals':32,'levels':382,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await previous.load(p,base+'games/expedition/');await previous.begin(p);old,_,_=await previous.complete(p,oldpilot);assert old['state']=='won' and old['home']['hp']>0;report['previousGame']={'id':'expedition','state':old['state'],'homeHP':old['home']['hp'],'stock':old['stock'],'stats':old['stats'],'actualLog':old['log']};save()
   await load(p,base+'games/feather/');await begin(p);await p.locator('#reset').click();before=await partial(p);await p.keyboard.press('p');await load(p,base+'games/feather/',True);after=await snap(p);assert after['state']=='paused' and after['ui']['pending'] is None and all(before[k]==after[k] for k in FIELDS);await p.locator('#resume').click();end,_,_=await complete(p,pilot);assert end['state']=='won';report['restoreAndWin']={'state':end['state'],'score':end['score'],'exactFields':FIELDS,'restoredItems':after['items'],'restoredUnits':after['units'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,base+'games/feather/');await begin(p,True);end,_,_=await complete(p,pilot,True);assert end['state']=='won';report['nativeTouch']={'state':end['state'],'score':end['score'],'items':end['items'],'stats':end['stats'],'actualLog':end['log'],'method':'Native taps and real scrolling, full authored budget, ordinary event/skill/target/preview/confirm.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousHomeHP':old['home']['hp'],'restoreScore':report['restoreAndWin']['score'],'nativeScore':end['score']}))
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:save();await b.close();await pilot.close();await oldpilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/feather-final-smoke.json');asyncio.run(main(a.parse_args()))
