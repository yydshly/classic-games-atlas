"""Normal mouse/touch, economy, speed/pause and natural failure acceptance."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
from test_pass_browser import snap,wait_state
ROOT=Path(__file__).resolve().parents[1]
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);checks={};errors=[];bad=[];failed=[]
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url))
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':1100});p=await ctx.new_page();watch(p);await p.goto(args.url);await p.screenshot(path=str(out/'desktop-ready.png'),full_page=True);await p.locator('#primary-action').click();assert await p.locator('#help-dialog').is_visible();await p.locator('#help-confirm').click();checks['teaching']=True
  await p.locator('[data-site="1"]').click();assert '132' in await p.locator('#selected-meta').inner_text();await p.locator('[data-build="bolt"]').click();s=await snap(p);assert s['gold']==165 and s['towers'][0]['level']==1;assert '射程 132' in await p.locator('#selected-meta').inner_text();await p.locator('#upgrade').click();s=await snap(p);assert s['gold']==95 and s['towers'][0]['level']==2 and await p.locator('#upgrade').is_disabled();assert '151' in await p.locator('#selected-meta').inner_text();await p.locator('#sell').click();assert (await snap(p))['gold']==189;assert await p.locator('#tower-actions').is_hidden();checks['buildUpgradeSaleAndVisibleRangeCosts']=True
  await p.locator('[data-site="2"]').click();await p.locator('[data-build="stone"]').click();await p.locator('[data-site="3"]').click();await p.locator('[data-build="frost"]').click();assert (await snap(p))['gold']==24;await p.locator('[data-site="4"]').click();assert await p.locator('[data-build="bolt"]').is_disabled();checks['threeDifferentTowersAndAffordability']=True;await p.screenshot(path=str(out/'desktop-built.png'),full_page=True)
  t=(await snap(p))['time'];await p.wait_for_timeout(300);normal=(await snap(p))['time']-t;await p.locator('#speed').click();t=(await snap(p))['time'];await p.wait_for_timeout(300);fast=(await snap(p))['time']-t;assert 1.65<fast/normal<2.4,(normal,fast);checks['realTime2xRatio']=fast/normal
  await p.locator('#start-wave').dblclick();assert (await snap(p))['wave']==1;assert await p.locator('#start-wave').is_disabled();await p.keyboard.press('p');frozen=await snap(p);await p.wait_for_timeout(240);s=await snap(p);assert s['time']==frozen['time'] and s['enemies']==frozen['enemies'] and s['gold']==frozen['gold'];await p.keyboard.press('p');checks['waveDoubleStartAndPauseFreezes']=True
  await p.locator('#manual').click();assert (await snap(p))['state']=='paused';await p.keyboard.press('Escape');assert (await snap(p))['state']=='playing';await p.locator('#levels').click();assert await p.locator('[data-level]').count()==8 and await p.locator('[data-level="2"]').is_disabled();await p.keyboard.press('Escape');checks['helpResumeAndEightMapLocks']=True
  await p.keyboard.press('r');s=await snap(p);assert s['state']=='ready' and s['gold']==230 and s['hp']==20 and not s['towers'];await begin(p);await p.locator('#speed').click();deadline=time.monotonic()+100
  while time.monotonic()<deadline:
   s=await snap(p)
   if s['state']!='playing':break
   if s['phase']=='build':await p.locator('#start-wave').click()
   await p.wait_for_timeout(100)
  s=await snap(p);assert s['state']=='lost' and s['hp']==0 and not s['towers'] and s['spent']==0;checks['naturalNoBuildFailure']={'wave':s['wave'],'leaks':s['leaks'],'time':s['time']};await p.screenshot(path=str(out/'natural-failure.png'),full_page=True);await p.locator('#primary-action').click();s=await snap(p);assert s['state']=='playing' and s['wave']==0 and s['gold']==230 and s['hp']==20;checks['failureRetryRestoresBudget']=True
  await p.locator('#sound').click();sound=(await snap(p))['sound'];await p.reload();s=await snap(p);assert s['state']=='ready' and s['sound']==sound and s['gold']==230 and s['wave']==0;checks['reloadRestartsMapAndSoundPersists']=True
  mobile=await b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=1);m=await mobile.new_page();watch(m);await m.goto(args.url);await m.locator('#primary-action').tap();await m.locator('#help-confirm').tap();s=await snap(m);site=s['sites'][0];await m.locator('#battlefield').scroll_into_view_if_needed();r=await m.locator('#battlefield').bounding_box();await m.touchscreen.tap(r['x']+site['x']*r['width']/600,r['y']+site['y']*r['height']/520);assert (await snap(m))['selected']==1;await m.locator('[data-build="bolt"]').tap();await m.locator('#upgrade').tap();assert (await snap(m))['gold']==95;await m.locator('#sell').tap();assert (await snap(m))['gold']==189;await m.locator('[data-site="2"]').tap();await m.locator('[data-build="stone"]').tap();await m.locator('#start-wave').tap();await m.locator('#pause').tap();assert (await snap(m))['state']=='paused';checks['touchCanvasBuildUpgradeSellWavePause']=True;await m.screenshot(path=str(out/'mobile-390.png'),full_page=True)
  widths=[]
  for width in [320,360,390,768,1280]:
   await m.set_viewport_size({'width':width,'height':900});assert not await m.evaluate('document.documentElement.scrollWidth>innerWidth'),width;widths.append(width)
  checks['responsiveWidths']=widths
  blocked=await b.new_context();await blocked.add_init_script('Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Disabled","SecurityError")}})');bp=await blocked.new_page();watch(bp);await bp.goto(args.url);await begin(bp);assert not (await snap(bp))['storageAvailable'];await bp.locator('[data-site="1"]').click();await bp.locator('[data-build="bolt"]').click();assert (await snap(bp))['gold']==165;checks['storageUnavailableStillPlayable']=True;await blocked.close()
  base=args.url.replace('games/pass/','');await p.goto(base);await p.wait_for_selector('.game-card');assert await p.locator('.game-card').count()==72;assert await p.locator('.lab-card').count()==len(json.loads((ROOT/'data/experiments.json').read_text(encoding='utf8')))
  for game in ['fortress','maze','starline','prism','crate','pass']:assert await p.locator(f'a[href="./games/{game}/"]').count()==2
  await p.locator('[data-open="kingdom-rush"]').click();assert '8' in await p.locator('.lab-detail').inner_text();await p.locator('.lab-detail a').click();assert '/games/pass/' in p.url;checks['atlasAssociationAndSixEntrances']=True
  for game in ['fortress','maze','starline','prism','crate']:
   await p.goto(base+f'games/{game}/');assert (await snap(p))['state']=='ready';await p.set_viewport_size({'width':390,'height':844});assert not await p.evaluate('document.documentElement.scrollWidth>innerWidth'),game;await p.screenshot(path=str(out/f'previous-{game}-mobile.png'),full_page=True);await p.set_viewport_size({'width':1280,'height':1100})
  checks['previousFiveEntrancesAndMobile']=True;await p.goto(args.url);await p.locator('.back-link').click();await p.wait_for_selector('.game-card');checks['atlasReturn']=True
  report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'normal mouse/touch and keyboard; natural no-build failure; isolated blocked storage','checks':checks,'consoleErrors':errors,'badResponses':bad,'requestFailures':failed};(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(report,ensure_ascii=True));assert not(errors or bad or failed),(errors,bad,failed);await mobile.close();await ctx.close();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/pass/');a.add_argument('--out',default='docs/pass-qa/ui');asyncio.run(main(a.parse_args()))
