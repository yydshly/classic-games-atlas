"""Fresh27-entry release, previous courier normal1x, venture exact resume/native wins."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_venture_browser import ROOT,FIELDS,snap,plans,execute,load,watch,click
import test_courier_browser as courier
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);allplans=await plans();errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p,errors,bad,failed);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==27 and sum(e['levels'] for e in data['experiments'])==334 and data['version']=='2026.10.16.27';assert await p.locator('.lab-card .primary-link').count()==27;report['atlas']={'entries':72,'groups':10,'originals':27,'levels':334,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await courier.load(p,base+'games/courier/');await courier.begin(p);old,actions,elapsed=await courier.complete(p);assert old['state']=='won' and old['cargo']==9 and old['hp']==3 and old['score']==105;report['previousGame']={'id':'courier','state':old['state'],'cargo':old['cargo'],'hp':old['hp'],'score':old['score'],'stats':old['stats'],'actualLog':old['log'],'actions':actions,'wallSeconds':elapsed};save()
   await load(p,base+'games/venture/');await p.locator('#help-confirm').click();commands=allplans[0]['commands'];await execute(p,commands[:6]);await p.keyboard.press('p');before=await snap(p);await load(p,base+'games/venture/',True);after=await snap(p);assert after['state']=='paused' and after['pending'] is None and all(before[k]==after[k] for k in FIELDS);await p.wait_for_timeout(500)
   waited=await snap(p);assert all(waited[k]==after[k] for k in FIELDS);await p.locator('#resume').click();end=await execute(p,commands[6:]);assert end['state']=='won' and end['cash']==allplans[0]['cash'] and end['worth']==allplans[0]['worth'];report['restoreAndWin']={'state':end['state'],'cash':end['cash'],'worth':end['worth'],'turn':end['turn'],'exactFields':FIELDS,'restoredRevision':after['revision'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,base+'games/venture/')
   await click(p,'#help-confirm',True);end=await execute(p,commands,touch=True);assert end['state']=='won' and end['cash']==allplans[0]['cash'] and end['worth']==allplans[0]['worth'];report['nativeTouch']={'state':end['state'],'cash':end['cash'],'worth':end['worth'],'turn':end['turn'],'stats':end['stats'],'actualLog':end['log'],'method':'Native tutorial/card/business/receipt/end-turn touchscreen taps; scroll positioning helper only.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousCargo':report['previousGame']['cargo'],'restoreCash':report['restoreAndWin']['cash'],'nativeCash':report['nativeTouch']['cash']}))
  except Exception as e:report['error']=str(e)[:1800];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/venture-final-smoke.json');asyncio.run(main(a.parse_args()))
