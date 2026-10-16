"""Real keyboard, mouse and touch acceptance, including natural failure."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
from test_prism_browser import snap
ROOT=Path(__file__).resolve().parents[1]
def landing(b):
 q=(b['x']+b['dx']/b['dy']*(636-b['y'])-31)%1076
 return 31+(1076-q if q>538 else q)
async def fail_normally(p,limit=45):
 deadline=time.monotonic()+limit
 while time.monotonic()<deadline:
  s=await snap(p)
  if s['state']!='playing':return s
  threats=[landing(b) for b in s['balls'] if not b['attached'] and b['dy']>0 and b['y']>350]
  target=max([83,190,300,410,517],key=lambda x:min([abs(x-v) for v in threats] or [abs(x-300)]))
  rect=await p.locator('#battlefield').bounding_box();await p.mouse.move(rect['x']+target*rect['width']/600,rect['y']+610*rect['height']/720)
  if s['serving']:await p.keyboard.press('Space')
  await p.wait_for_timeout(45)
 return await snap(p)
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);checks={};errors=[];bad=[];failed=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':1000});p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append(r.url) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url))
  await p.goto(args.url);await p.screenshot(path=str(out/'desktop-ready.png'),full_page=True);await p.locator('#primary-action').click();assert await p.locator('#help-dialog').is_visible();await p.locator('#help-confirm').click();checks['firstVisitTeaching']=True
  x=(await snap(p))['paddle']['x'];await p.keyboard.down('ArrowLeft');await p.wait_for_timeout(200);await p.keyboard.up('ArrowLeft');assert (await snap(p))['paddle']['x']<x-60;x=(await snap(p))['paddle']['x'];await p.keyboard.down('d');await p.wait_for_timeout(200);await p.keyboard.up('d');assert (await snap(p))['paddle']['x']>x+60;checks['keyboardPaddle']=True
  await p.keyboard.press('Space');await p.wait_for_timeout(70);s=await snap(p);assert not s['serving'];ball_id=s['balls'][0]['id'];rect=await p.locator('#battlefield').bounding_box()
  for _ in range(5):await p.mouse.click(rect['x']+rect['width']/2,rect['y']+rect['height']*.8)
  s=await snap(p);assert len(s['balls'])==1 and s['balls'][0]['id']==ball_id;checks['repeatedLaunchDoesNotDuplicate']=True
  await p.keyboard.press('p');frozen=await snap(p);await p.wait_for_timeout(350);s=await snap(p);assert s['balls']==frozen['balls'] and s['time']==frozen['time'] and s['buffs']==frozen['buffs'];await p.keyboard.press('p');checks['pauseFreezesPhysicsAndTimers']=True
  await p.locator('#help').click();assert (await snap(p))['state']=='paused';await p.keyboard.press('Escape');assert (await snap(p))['state']=='playing';checks['helpEscResumes']=True
  await p.locator('#levels').click();assert await p.locator('[data-level]').count()==12;assert await p.locator('[data-level="2"]').is_disabled();await p.keyboard.press('Escape');checks['twelveStageMenuAndLocks']=True
  await p.keyboard.press('r');s=await snap(p);assert s['state']=='ready' and s['lives']==3 and s['stats']['score']==0 and len(s['balls'])==1 and s['serving'];checks['restartResets']=True
  await p.locator('#primary-action').click();assert not await p.locator('#help-dialog').is_visible();checks['teachingPersists']=True
  s=await fail_normally(p);assert s['state']=='lost' and s['lives']==0 and s['stats']['livesLost']==3,s;checks['normalInputThreeLifeFailure']={'time':s['time'],'livesLost':s['stats']['livesLost'],'reason':s['reason']};await p.screenshot(path=str(out/'failure.png'),full_page=True)
  await p.locator('#primary-action').click();s=await snap(p);assert s['state']=='playing' and s['lives']==3 and s['serving'];checks['failureRetry']=True
  await p.locator('#sound').click();sound=(await snap(p))['sound'];await p.reload();assert (await snap(p))['sound']==sound;checks['soundPersists']=True
  mobile=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);m=await mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));await m.goto(args.url);await m.locator('#primary-action').tap();await m.locator('#help-confirm').tap();await m.locator('#battlefield').scroll_into_view_if_needed();rect=await m.locator('#battlefield').bounding_box();scroll=await m.evaluate('scrollY');cdp=await mobile.new_cdp_session(m)
  def point(x):return {'x':rect['x']+x*rect['width']/600,'y':rect['y']+550*rect['height']/720,'id':1}
  await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(100)]});await m.wait_for_timeout(150);await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point(480)]});await m.wait_for_timeout(350);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert (await snap(m))['paddle']['x']>400;assert abs(await m.evaluate('scrollY')-scroll)<2;checks['touchDragWithoutPageScroll']=True
  before=(await snap(m))['paddle']['x'];await m.locator('#move-left').tap();await m.wait_for_timeout(60);assert (await snap(m))['paddle']['x']<before;checks['shortTouchNudge']=True
  await m.locator('#launch').tap();await m.wait_for_timeout(100);assert not (await snap(m))['serving'];await m.locator('#pause').tap();await m.screenshot(path=str(out/'mobile-390.png'),full_page=True);checks['touchLaunchAndPause']=True
  widths=[]
  for width in [320,360,390,768,1280]:await m.set_viewport_size({'width':width,'height':900});assert not await m.evaluate('document.documentElement.scrollWidth>innerWidth'),width;widths.append(width)
  checks['responsiveWidths']=widths
  blocked=await b.new_context();await blocked.add_init_script('Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Disabled","SecurityError")}})');bp=await blocked.new_page();bp.on('pageerror',lambda e:errors.append(str(e)));await bp.goto(args.url);assert not (await snap(bp))['storageAvailable'];await bp.locator('#primary-action').click();await bp.locator('#help-confirm').click();assert (await snap(bp))['state']=='playing';checks['storageUnavailableStillPlayable']=True;await blocked.close()
  base=args.url.replace('games/prism/','');await p.goto(base);await p.wait_for_selector('.game-card');assert await p.locator('.game-card').count()==72;assert await p.locator('.lab-card').count()==len(json.loads((ROOT/'data/experiments.json').read_text(encoding='utf-8')))
  for game in ['fortress','maze','starline','prism']:assert await p.locator(f'a[href="./games/{game}/"]').count()==2
  await p.locator('[data-open="arkanoid"]').click();assert '12' in await p.locator('.lab-detail').inner_text();await p.locator('.lab-detail a').click();assert '/games/prism/' in p.url;checks['atlasAssociationAndFourEntries']=True
  for game in ['fortress','maze','starline']:await p.goto(base+f'games/{game}/');assert (await snap(p))['state']=='ready'
  checks['previousThreeEntrances']=True;await p.goto(args.url);await p.locator('.back-link').click();await p.wait_for_selector('.game-card');checks['atlasReturn']=True
  assert not errors and not bad and not failed,(errors,bad,failed)
  report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'real keyboard/mouse/touch inputs; failure uses ordinary paddle movement','checks':checks,'consoleErrors':errors,'badResponses':bad,'requestFailures':failed};(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=True));await mobile.close();await ctx.close();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/prism/');a.add_argument('--out',default='docs/prism-qa/ui');asyncio.run(main(a.parse_args()))
