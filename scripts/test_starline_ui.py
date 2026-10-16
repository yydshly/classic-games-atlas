"""Actual UI input with explicitly labelled read-only shot planning."""
import argparse,asyncio,datetime,json,math
from pathlib import Path
from playwright.async_api import async_playwright
from test_starline_browser import snap,plan,shoot,wait_idle
ROOT=Path(__file__).resolve().parents[1]
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);checks={};errors=[];bad=[];failed=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':1000});p=await ctx.new_page()
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append(r.url) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url))
  await p.goto(args.url);await p.screenshot(path=str(out/'desktop-ready.png'),full_page=True);await p.locator('#primary-action').click();assert await p.locator('#help-dialog').is_visible();await p.locator('#help-confirm').click();checks['firstVisitTeaching']=True
  before=(await snap(p))['angle'];await p.keyboard.down('ArrowRight');await p.wait_for_timeout(240);await p.keyboard.up('ArrowRight');assert (await snap(p))['angle']>before+.1;checks['keyboardAim']=True
  await p.keyboard.press('x');s=await snap(p);assert s['swapped'];await p.keyboard.press('x');assert (await snap(p))['current']==s['current'];checks['oneSwapPerShot']=True
  rect=await p.locator('#battlefield').bounding_box();x=rect['x']+(300+math.sin(1.2)*100)*rect['width']/600;y=rect['y']+(610-math.cos(1.2)*100)*rect['height']/660
  await p.mouse.click(x,y);await p.wait_for_timeout(70)
  for _ in range(5):await p.mouse.click(x,y)
  s=await snap(p);assert s['stats']['shots']==1 and s['ammo']==9 and s['flight'];checks['repeatedClickDuringFlightSpendsOnce']=True
  await p.keyboard.press('p');frozen=await snap(p);await p.wait_for_timeout(400);assert (await snap(p))['flight']==frozen['flight'];assert (await snap(p))['time']==frozen['time'];await p.keyboard.press('p');checks['pauseFreezesFlightAndClock']=True
  await wait_idle(p);assert (await snap(p))['stats']['bounces']>0;checks['actualWallBounce']=True;await p.screenshot(path=str(out/'after-bounce.png'),full_page=True)
  await p.keyboard.press('r');s=await snap(p);assert s['state']=='ready' and s['stats']['shots']==0 and s['ammo']==10;await p.locator('#primary-action').click();assert not await p.locator('#help-dialog').is_visible();checks['restartAndTeachingMemory']=True
  for _ in range(16):
   s=await snap(p)
   if s['state']!='playing':break
   action=await asyncio.to_thread(plan,s,False,True);assert action
   await shoot(p,action)
  s=await snap(p);assert s['state']=='lost',s;checks['actualNormalInputFailure']={'reason':s['reason'],'shots':s['stats']['shots'],'ammo':s['ammo']};await p.screenshot(path=str(out/'failure.png'),full_page=True)
  await p.locator('#primary-action').click();assert (await snap(p))['state']=='playing';checks['failureRetry']=True
  await p.locator('#help').click();assert (await snap(p))['state']=='paused';await p.keyboard.press('Escape');assert (await snap(p))['state']=='playing';checks['helpEscResumes']=True
  await p.locator('#levels').click();assert await p.locator('[data-level="2"]').is_disabled();assert await p.locator('[data-level]').count()==12;await p.keyboard.press('Escape');checks['twelveStageMenuAndLocks']=True
  await p.locator('#sound').click();sound=(await snap(p))['sound'];await p.reload();assert (await snap(p))['sound']==sound;checks['soundPersists']=True
  mobile=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);m=await mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));await m.goto(args.url);await m.locator('#primary-action').tap();await m.locator('#help-confirm').tap();await m.locator('#battlefield').scroll_into_view_if_needed()
  rect=await m.locator('#battlefield').bounding_box();cdp=await mobile.new_cdp_session(m)
  def point(angle):return {'x':rect['x']+(300+math.sin(angle)*100)*rect['width']/600,'y':rect['y']+(610-math.cos(angle)*100)*rect['height']/660,'id':1}
  await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(0)]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point(-.55)]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert abs((await snap(m))['angle']+.55)<.03
  await m.locator('#shoot').tap();await wait_idle(m);checks['realTouchDragAndFire']=True
  a=(await snap(m))['angle'];await m.locator('#aim-left').tap();await m.wait_for_timeout(50);assert (await snap(m))['angle']<a;checks['shortTouchAimTap']=True
  await m.locator('#pause').tap();await m.screenshot(path=str(out/'mobile-390.png'),full_page=True)
  widths=[]
  for width in [320,360,390,768,1280]:
   await m.set_viewport_size({'width':width,'height':900});await m.wait_for_timeout(80);assert not await m.evaluate('document.documentElement.scrollWidth>innerWidth'),width;widths.append(width)
  checks['responsiveWidths']=widths
  blocked=await b.new_context();await blocked.add_init_script('Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Disabled","SecurityError")}})');bp=await blocked.new_page();bp.on('pageerror',lambda e:errors.append(str(e)));await bp.goto(args.url);assert not (await snap(bp))['storageAvailable'];await bp.locator('#primary-action').click();await bp.locator('#help-confirm').click();assert (await snap(bp))['state']=='playing';checks['storageUnavailableStillPlayable']=True;await blocked.close()
  base=args.url.replace('games/starline/','');await p.goto(base);await p.wait_for_selector('.game-card');assert await p.locator('.game-card').count()==72;assert await p.locator('.lab-card').count()==3
  for game in ['fortress','maze','starline']:assert await p.locator(f'a[href="./games/{game}/"]').count()==2
  await p.locator('[data-open="puzzle-bobble"]').click();assert '12' in await p.locator('.lab-detail').inner_text();await p.locator('.lab-detail a').click();assert '/games/starline/' in p.url;checks['atlasAssociationAndThreeEntries']=True
  for game in ['fortress','maze']:
   await p.goto(base+f'games/{game}/');s=await p.evaluate('async()=> (await import("./game.mjs")).diagnostics()');assert s['state']=='ready'
  checks['existingTwoGameEntrances']=True
  await p.goto(args.url);await p.locator('.back-link').click();await p.wait_for_selector('.game-card');checks['atlasReturn']=True
  assert not errors and not bad and not failed,(errors,bad,failed)
  report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'actual mouse/key/touch input; failure planner reads copied state only','checks':checks,'consoleErrors':errors,'badResponses':bad,'requestFailures':failed};(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=True));await mobile.close();await ctx.close();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/starline/');a.add_argument('--out',default='docs/starline-qa/ui');asyncio.run(main(a.parse_args()))
