"""Normal keyboard/touch boundary checks; saved-data corruption is isolated."""
import argparse,asyncio,datetime,json
from pathlib import Path
from playwright.async_api import async_playwright
from test_crate_browser import snap,wait_state,ready_input,move_keys
ROOT=Path(__file__).resolve().parents[1]

async def fresh_start(p):
 await ready_input(p);await p.locator('#restart').click();await p.locator('#primary-action').click();await ready_input(p)

async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);checks={};errors=[];bad=[];failed=[]
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url))
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':1000});p=await ctx.new_page();watch(p)
  await p.goto(args.url);await p.screenshot(path=str(out/'desktop-ready.png'),full_page=True);await p.locator('#primary-action').click();assert await p.locator('#help-dialog').is_visible();await p.locator('#help-confirm').click();await ready_input(p);checks['firstVisitTeaching']=True
  initial=await snap(p);await p.keyboard.press('ArrowLeft');await p.wait_for_timeout(180);s=await snap(p);assert s['moves']==0 and s['pushes']==0 and s['historyDepth']==0;checks['blockedWallDoesNotCount']=True
  await move_keys(p,'DRURUL');await p.locator('#corner-notice').wait_for(state='visible');assert len((await snap(p))['cornerBoxIds'])==1;await p.screenshot(path=str(out/'corner-warning.png'),full_page=True)
  await p.keyboard.press('z');await wait_state(p,lambda s:s['moves']==5);await p.locator('#corner-notice').wait_for(state='hidden')
  for _ in range(5):await p.keyboard.press('Backspace')
  await wait_state(p,lambda s:s['moves']==0);s=await snap(p);assert s['boxes']==initial['boxes'] and s['player']==initial['player'];checks['staticCornerAndSixUndos']=True
  await move_keys(p,'R');await p.reload();s=await snap(p);assert s['state']=='paused' and s['restored'] and s['moves']==1 and s['pushes']==1 and s['historyDepth']==1
  await p.locator('#primary-action').click();await ready_input(p);await p.keyboard.press('z');await wait_state(p,lambda s:s['moves']==0);checks['reloadRestoresCurrentBoardAndUndo']=True
  await move_keys(p,'RR');await ready_input(p);await p.keyboard.press('z');s=await wait_state(p,lambda s:s['state']=='playing');assert s['moves']==1 and s['pushes']==1 and s['satisfied']==0 and s['goals']==initial['goals'];await move_keys(p,'R');await ready_input(p);checks['victoryUndoAndRedo']=True
  await fresh_start(p)
  for d in 'DUDUDUDU':await p.keyboard.press({'D':'ArrowDown','U':'ArrowUp'}[d])
  s=await wait_state(p,lambda s:s['moves']==8 and s['queuedInputs']==0);assert s['player']['x']==initial['player']['x'] and s['player']['y']==initial['player']['y'] and s['pushes']==0
  for _ in range(8):await p.keyboard.press('z')
  await wait_state(p,lambda s:s['moves']==0 and s['queuedInputs']==0);checks['rapidEightEdgesAndEightUndos']=True
  await p.keyboard.press('p');frozen=await snap(p);await p.wait_for_timeout(200);await p.keyboard.press('ArrowRight');s=await snap(p);assert s['state']=='paused' and s['time']==frozen['time'] and s['moves']==0
  await p.keyboard.press('p');await ready_input(p);await p.locator('#help').click();assert (await snap(p))['state']=='paused';await p.keyboard.press('Escape');assert (await snap(p))['state']=='playing';await ready_input(p);checks['pauseAndHelpFreezeResume']=True
  await move_keys(p,'RR');await ready_input(p);await p.keyboard.down('ArrowRight');await p.locator('#primary-action').click();await p.keyboard.down('ArrowRight');await p.wait_for_timeout(330);s=await snap(p);assert s['level']==2 and s['moves']==0 and s['queuedInputs']==0 and s['heldInputs']==0;await p.keyboard.up('ArrowRight');await move_keys(p,'R');checks['heldKeyDoesNotCarryAcrossLevel']=True
  await ready_input(p);await p.keyboard.press('r');s=await snap(p);assert s['state']=='ready' and s['level']==2 and s['moves']==0 and s['pushes']==0 and s['historyDepth']==0
  await p.locator('#levels').click();assert await p.locator('[data-level]').count()==20;assert await p.locator('[data-level="2"]').is_enabled() and await p.locator('[data-level="3"]').is_disabled();await p.locator('[data-level="1"]').click();assert (await snap(p))['level']==1;checks['restartAndNaturalUnlockSelection']=True
  await p.locator('#sound').click();sound=(await snap(p))['sound'];await p.reload();s=await snap(p);assert s['sound']==sound and s['best']['1']=={'moves':2,'pushes':2};checks['PersonalMetricsAndSoundPersist']=True
  mobile=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);m=await mobile.new_page();watch(m);await m.goto(args.url);await m.locator('#primary-action').tap();await m.locator('#help-confirm').tap();await ready_input(m);await m.locator('[data-direction="R"]').scroll_into_view_if_needed();await m.locator('[data-direction="R"]').tap();await wait_state(m,lambda s:s['moves']==1);await m.wait_for_timeout(180);assert (await snap(m))['moves']==1
  await m.locator('#touch-undo').tap();await wait_state(m,lambda s:s['moves']==0);checks['shortTouchExactlyOneMoveAndUndo']=True
  cdp=await mobile.new_cdp_session(m);rect=await m.locator('[data-direction="R"]').bounding_box();point={'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2,'id':1};scroll=await m.evaluate('scrollY');await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});await m.wait_for_timeout(650);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});s=await snap(m);assert s['state']=='won' and s['moves']==2 and s['satisfied']==1 and s['heldInputs']==0;assert abs(await m.evaluate('scrollY')-scroll)<2;await m.screenshot(path=str(out/'mobile-won-390.png'),full_page=True);await ready_input(m);await m.locator('#touch-undo').tap();await wait_state(m,lambda s:s['state']=='playing' and s['moves']==1);await m.screenshot(path=str(out/'mobile-playing-390.png'),full_page=True);checks['longTouchRepeatsStopsAtWinNoScroll']=True
  widths=[]
  for width in [320,360,390,768,1280]:
   await m.set_viewport_size({'width':width,'height':900});assert not await m.evaluate('document.documentElement.scrollWidth>innerWidth'),width;widths.append(width)
  checks['responsiveWidths']=widths
  blocked=await b.new_context();await blocked.add_init_script('Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Disabled","SecurityError")}})');bp=await blocked.new_page();watch(bp);await bp.goto(args.url);assert not (await snap(bp))['storageAvailable'];await bp.locator('#primary-action').click();await bp.locator('#help-confirm').click();await ready_input(bp);await move_keys(bp,'R');await bp.keyboard.press('z');await wait_state(bp,lambda s:s['moves']==0);checks['storageUnavailableStillPlayableAndUndo']=True;await blocked.close()
  corrupt=await b.new_context();await corrupt.add_init_script('localStorage.setItem("classic-atlas.crate.v1",JSON.stringify({last:1,unlocked:1,tutorialSeen:true,current:{level:1,actions:"LLLL!",time:5}}))');cp=await corrupt.new_page();watch(cp);await cp.goto(args.url);s=await snap(cp);assert s['state']=='ready' and s['moves']==0 and not s['restored'];checks['invalidSavedActionLogFallsBackToFreshBoard']=True;await corrupt.close()
  base=args.url.replace('games/crate/','');await p.goto(base);await p.wait_for_selector('.game-card');assert await p.locator('.game-card').count()==72;assert await p.locator('.lab-card').count()==len(json.loads((ROOT/'data/experiments.json').read_text(encoding='utf-8')))
  for game in ['fortress','maze','starline','prism','crate']:assert await p.locator(f'a[href="./games/{game}/"]').count()==2
  await p.locator('[data-open="sokoban"]').click();assert '20' in await p.locator('.lab-detail').inner_text();await p.locator('.lab-detail a').click();assert '/games/crate/' in p.url;checks['atlasAssociationAndFiveEntries']=True
  for game in ['fortress','maze','starline','prism']:
   await p.goto(base+f'games/{game}/');assert (await snap(p))['state']=='ready';await p.screenshot(path=str(out/f'previous-{game}.png'))
  checks['previousFourEntrances']=True;await p.goto(args.url);await p.locator('.back-link').click();await p.wait_for_selector('.game-card');checks['atlasReturn']=True
  report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'real keyboard/mouse/touch inputs; fresh gameplay state and natural stage unlock','fixture':'only isolated invalid-storage and blocked-storage contexts, no board/box/goal/win mutation','checks':checks,'consoleErrors':errors,'badResponses':bad,'requestFailures':failed};(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=True));assert not errors and not bad and not failed,(errors,bad,failed);await mobile.close();await ctx.close();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/crate/');a.add_argument('--out',default='docs/crate-qa/ui');asyncio.run(main(a.parse_args()))
