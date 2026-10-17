"""Capture actual original-resource play for visual review; no combat snapshot writes."""
import argparse,asyncio,json,datetime,time
from pathlib import Path
from playwright.async_api import async_playwright
from test_escort_browser import ROOT,KEY,snap,watch,load,begin,complete,Pilot,Driver,click
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);report={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Actual fresh storage, normal120/100HP/100meter/2supplies, actual controls and natural next/unlocks; screenshots captured during live play, no combat value or result writes. Mobile reuses only progress actually earned by this campaign.','results':[],'captures':[]};errors=[];bad=[];failed=[];pilot=await Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1440,'height':1100});p=await ctx.new_page();watch(p,errors,bad,failed)
  try:
   await load(p,args.url);report['artResources']=await p.evaluate('performance.getEntriesByType("resource").map(e=>e.name).filter(n=>n.includes("assets/escort/art/"))');assert all(any(n.endswith("/"+name+".webp") for n in report['artResources']) for name in ['guardian','rivals','scenery','cart']);d=await Driver(p).start()
   if await p.locator('#help-dialog').is_visible():await click(p,'#help-confirm')
   await p.screenshot(path=str(out/'opening-desktop.png'),full_page=False);report['captures'].append({'file':'opening-desktop.png','state':(await snap(p))['state']});save()
   for level in range(1,9):
    if level>1:await click(p,'#primary-action')
    ready=await snap(p);assert ready['state']=='ready' and ready['level']==level and ready['ticks']==0 and ready['player']['hp']==120 and ready['cart']['hp']==100 and ready['player']['energy']==100 and ready['heals']==2;report.setdefault('initialBudgets',[]).append({'level':level,'hp':120,'cartHP':100,'energy':100,'heals':2,'ticks':0});wall=time.monotonic();await begin(p,d)
    if level in [1,4,7,8]:
     partial,_,_=await complete(p,pilot,d,stop=lambda s:s['stats']['hits']>=1 and s['player']['action'] is not None and s['player']['action']['kind']=='attack');name={1:'dawn-combat',4:'rain-combat',7:'night-canal',8:'night-gate'}[level];await p.locator('#view').screenshot(path=str(out/(name+'.png')));await p.screenshot(path=str(out/(name+'-page.png')),full_page=False);report['captures'].append({'file':name+'.png','page':name+'-page.png','level':level,'ticks':partial['ticks'],'player':partial['player'],'cart':partial['cart'],'stats':partial['stats']});save()
     if level==1 and args.write_cover:await p.locator('#view').screenshot(path=str(ROOT/'assets/escort-cover.jpg'),type='jpeg',quality=88)
    end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won' and end['player']['hp']>0 and end['cart']['hp']>0 and all(end['invariants'].values());end['actualLog']=end['log'];end['wallSeconds']=time.monotonic()-wall;end['simulationToWallRatio']=end['time']/end['wallSeconds'];assert .6<end['simulationToWallRatio']<1.1;report['results'].append(end);save()
   earned=await p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY);assert earned['unlocked']==8 and len(earned['best'])==8;await ctx.close();ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);await ctx.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(earned))+')');p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await click(p,'#levels');await click(p,'[data-level="1"]');d=await Driver(p,touch=True).start();await begin(p,d);await d.set({'y':1});await d.action('dodge');await p.wait_for_timeout(100);await d.release();partial,_,_=await complete(p,pilot,d,stop=lambda s:s['stats']['hits']>=1);await p.screenshot(path=str(out/'mobile-combat.png'),full_page=False);end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won' and end['stats']['dodges']>=1;report['mobileWin']={k:end[k] for k in ['state','player','cart','stats','score']};assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'normalWins':8,'mobileWin':end['state'],'captures':len(report['captures'])+1}))
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1600];raise
  finally:save();await ctx.close();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/escort/');a.add_argument('--out',default='docs/escort-qa/visual-v3');a.add_argument('--write-cover',action='store_true');asyncio.run(main(a.parse_args()))
