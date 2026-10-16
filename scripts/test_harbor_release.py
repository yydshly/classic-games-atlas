"""Fresh-release smoke: all entries, previous game, exact logistics restore and touch win."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_harbor_browser import ROOT,snap,plans,setup,apply,complete,touch_button
from test_harbor_ui import FIELDS
import test_paper_browser as paper
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 allplans=await plans()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==22 and sum(e['levels'] for e in data['experiments'])==278;assert await p.locator('.lab-card .primary-link').count()==22;report['atlas']={'entries':72,'groups':10,'originals':22,'levels':278,'version':data['version']};assert data['version']=='2026.10.16.22';save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await p.goto(base+'games/paper/');await paper.snap(p);await p.wait_for_load_state('networkidle');await paper.begin(p);await paper.launch(p,{'angle':62,'power':.46});old=await paper.wait_state(p,lambda s:s['state']=='won');assert old['stars']==3 and old['stats']['shots']==1;report['previousGame']={'id':'paper','state':old['state'],'stars':old['stars'],'stats':old['stats'],'actualLog':old['log']};save()
   await p.goto(base+'games/harbor/');await snap(p);await p.wait_for_load_state('networkidle');await p.locator('#help-confirm').click();await setup(p,allplans[0]);await apply(p,{'kind':'start'})
   for _ in range(2):await apply(p,{'kind':'step'})
   await p.keyboard.press('p');before=await snap(p);assert before['state']=='paused';await p.reload();after=await snap(p);await p.wait_for_load_state('networkidle');assert after['state']=='paused' and not after['autoRunning'] and all(before[k]==after[k] for k in FIELDS);await p.wait_for_timeout(800);assert (await snap(p))['turn']==before['turn'];await p.keyboard.press('p');end,_=await complete(p);assert end['state']=='won' and end['cash']==4 and end['stats']['deliveries']==3;report['restoreAndWin']={'state':end['state'],'turn':end['turn'],'cash':end['cash'],'exactFields':FIELDS,'restoredTurn':after['turn'],'ledger':end['ledger'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p);await p.goto(base+'games/harbor/');await snap(p);await p.wait_for_load_state('networkidle');await touch_button(p,'#help-confirm');await setup(p,allplans[0],touch=True);await apply(p,{'kind':'start'},touch=True);end,_=await complete(p,touch=True);assert end['state']=='won' and end['cash']==4 and end['stats']['deliveries']==3;report['nativeTouch']={'state':end['state'],'turn':end['turn'],'cash':end['cash'],'ledger':end['ledger'],'stats':end['stats'],'actualLog':end['log'],'method':'Native tutorial/edge preview/confirmation/route-node chip/purchase/start/turn taps; scroll positioning helper only.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousStars':report['previousGame']['stars'],'restoreCash':report['restoreAndWin']['cash'],'touchCash':report['nativeTouch']['cash']}))
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/harbor-final-smoke.json');asyncio.run(main(a.parse_args()))
