"""Fresh release: all23 entries, previous logistics game, exact farm restore and native touch."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_farm_browser import ROOT,snap,plans,execute,touch_button
from test_farm_ui import FIELDS
import test_harbor_browser as harbor
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 allplans=await plans();oldplans=await harbor.plans()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==23 and sum(e['levels'] for e in data['experiments'])==290 and data['version']=='2026.10.16.23';assert await p.locator('.lab-card .primary-link').count()==23;report['atlas']={'entries':72,'groups':10,'originals':23,'levels':290,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await p.goto(base+'games/harbor/');await harbor.snap(p);await p.wait_for_load_state('networkidle');await p.locator('#help-confirm').click();await harbor.setup(p,oldplans[0]);await harbor.apply(p,{'kind':'start'});old,_=await harbor.complete(p);assert old['state']=='won' and old['cash']==4 and old['stats']['deliveries']==3;report['previousGame']={'id':'harbor','state':old['state'],'turn':old['turn'],'cash':old['cash'],'stats':old['stats'],'actualLog':old['log']};save()
   await p.goto(base+'games/farm/');await snap(p);await p.wait_for_load_state('networkidle');await p.locator('#help-confirm').click();await execute(p,allplans[0][:4]);await p.locator('#field').focus();await p.keyboard.press('p');before=await snap(p);assert before['state']=='paused' and before['day']==2;await p.reload();after=await snap(p);await p.wait_for_load_state('networkidle');assert after['state']=='paused' and all(before[k]==after[k] for k in FIELDS);await p.wait_for_timeout(800);assert (await snap(p))['day']==2;await p.locator('#field').focus();await p.keyboard.press('p');end=await execute(p,allplans[0][4:]);assert end['state']=='won' and end['day']==3 and end['cash']==11 and end['stats']['delivered']==2;report['restoreAndWin']={'state':end['state'],'day':end['day'],'cash':end['cash'],'exactFields':FIELDS,'restoredDay':after['day'],'stats':end['stats'],'ledger':end['ledger'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p);await p.goto(base+'games/farm/');await snap(p);await p.wait_for_load_state('networkidle');await touch_button(p,'#help-confirm');end=await execute(p,allplans[0],touch=True);assert end['state']=='won' and end['day']==3 and end['cash']==11 and end['stats']['delivered']==2;report['nativeTouch']={'state':end['state'],'day':end['day'],'cash':end['cash'],'stats':end['stats'],'ledger':end['ledger'],'actualLog':end['log'],'method':'Native tutorial/start/plot/action/confirmation/day-end/harvest/order taps; default first crop and scroll positioning helper only.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousHarborCash':report['previousGame']['cash'],'restoreCash':report['restoreAndWin']['cash'],'touchCash':report['nativeTouch']['cash']}))
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/farm-final-smoke.json');asyncio.run(main(a.parse_args()))
