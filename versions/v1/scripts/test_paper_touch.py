"""Bounded completion of the two native-touch groups after a transport-only interruption."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_paper_browser import ROOT,snap,wait_state,launch,xy
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'checks':[],'method':'Native start/tutorial taps, tap cancellation, native touchCancel, five-move touch drag/release. Scroll positioning helper only; no gameplay state or budget fixtures.'}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);await snap(p);await p.wait_for_load_state('networkidle');await p.screenshot(path=str(out/'mobile-ready.png'),full_page=True)
   async def tap(sel):
    await p.locator(sel).scroll_into_view_if_needed();r=await p.locator(sel).bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
   await tap('#ready-start');await tap('#help-confirm');await p.locator('#battle').scroll_into_view_if_needed();x,y=await xy(p,112,430);await p.touchscreen.tap(x,y);assert not (await snap(p))['stats']['shots'];cd=await ctx.new_cdp_session(p);await cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});await cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-10,'y':y+15}]});await cd.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});assert not (await snap(p))['gestureActive'] and not (await snap(p))['stats']['shots'];await cd.detach();report['checks'].append('Native touchscreen tap and native touchCancel both preserve ammunition')
   await launch(p,{'angle':62,'power':.46},touch=True);end=await wait_state(p,lambda s:s['state']=='won');assert end['stars']==3 and end['stats']['shots']==1 and end['stats']['stamps']==2;report['nativeTouch']={'state':end['state'],'stars':end['stars'],'stats':end['stats'],'actualLog':end['log']};await p.screenshot(path=str(out/'mobile-won.png'),full_page=True);report['checks'].append('A full native touch drag/release run earns genuine three stars');assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'checks':2,'stars':3,'passed':True}));await ctx.close()
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/games/paper/');a.add_argument('--out',default='.local/paper-touch');asyncio.run(main(a.parse_args()))
