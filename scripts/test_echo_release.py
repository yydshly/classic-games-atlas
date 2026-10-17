"""All33 entries, previous party game, FPS windup checkpoint and native first-floor win."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_echo_browser import ROOT,FIELDS,snap,watch,load,begin,complete,Pilot,Driver,click
import test_feather_browser as previous
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]};pilot=await Pilot().start();oldpilot=await previous.Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1100});p=await ctx.new_page();watch(p,errors,bad,failed);base=args.url.rstrip('/')+'/'
   await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle');data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()');assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==33 and sum(e['levels'] for e in data['experiments'])==390 and data['version']=='2026.10.17.33';assert await p.locator('.lab-card .primary-link').count()==33;report['atlas']={'entries':72,'groups':10,'originals':33,'levels':390,'version':data['version']};save()
   for e in data['experiments']:
    r=await p.goto(base+e['url'].removeprefix('./'));await p.wait_for_load_state('networkidle');assert r.status==200 and await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id'];report['entryPages'].append({'id':e['id'],'status':r.status,'title':await p.title()});save()
   await previous.load(p,base+'games/feather/');await previous.begin(p);await p.locator('#reset').click();old,_,_=await previous.complete(p,oldpilot);assert old['state']=='won';report['previousGame']={'id':'feather','state':old['state'],'score':old['score'],'stats':old['stats'],'actualLog':old['log']};save()
   await load(p,base+'games/echo/');d=await Driver(p).start();
   if await p.locator('#help-dialog').is_visible():await click(p,'#help-confirm')
   await p.locator('#reset').click();await begin(p,d);partial,_,_=await complete(p,pilot,d,stop=lambda s:any(e['action'] for e in s['enemies']));assert partial['state']=='playing' and any(e['action'] for e in partial['enemies']);await d.release();await p.keyboard.press('p');before=await snap(p);await load(p,base+'games/echo/',True);after=await snap(p);assert after['state']=='paused' and all(before[k]==after[k] for k in FIELDS);await p.wait_for_timeout(200);frozen=await snap(p);assert all(after[k]==frozen[k] for k in FIELDS);await click(p,'#resume');end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won';report['restoreAndWin']={'state':end['state'],'score':end['score'],'hp':end['player']['hp'],'ammo':end['player']['ammo'],'exactFields':FIELDS,'restoredPlayer':after['player'],'restoredEnemies':after['enemies'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,base+'games/echo/');d=await Driver(p,touch=True).start();await begin(p,d);end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won';report['nativeTouch']={'state':end['state'],'score':end['score'],'hp':end['player']['hp'],'ammo':end['player']['ammo'],'stats':end['stats'],'actualLog':end['log'],'method':'Native touchStart/Move/End holds and bounded view drags, real door/exit taps, original resources/HP and1x.'};await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previousScore':old['score'],'restoreHP':report['restoreAndWin']['hp'],'nativeHP':end['player']['hp'],'nativeAmmo':end['player']['ammo']}))
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:save();await b.close();await pilot.close();await oldpilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/echo-final-smoke.json');asyncio.run(main(a.parse_args()))
