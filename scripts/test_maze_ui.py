"""Actual first-visit, chain, self-damage, touch and navigation acceptance."""
import argparse,asyncio,datetime,json
from pathlib import Path
from playwright.async_api import async_playwright
from test_maze_browser import snap,step,walk
ROOT=Path(__file__).resolve().parents[1]
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);checks={};errors=[];bad=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':900});p=await ctx.new_page()
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append(r.url) if r.status>=400 else None)
  await p.goto(args.url);await p.locator('#primary-action').click();assert await p.locator('#help-dialog').is_visible();await p.locator('#help-confirm').click();assert (await snap(p))['state']=='playing';checks['firstVisitTutorial']=True
  await p.keyboard.press('p');s=await snap(p);await p.wait_for_timeout(450);assert (await snap(p))['time']==s['time'];await p.keyboard.press('p');checks['pauseResumeClock']=True
  # A real capacity pickup from the authored starting crate, then two actual bombs.
  assert await step(p,1);await p.keyboard.press('Space');await walk(p,[3,2,2]);await p.wait_for_timeout(2900);await walk(p,[0,0,1,1]);assert (await snap(p))['player']['capacity']==2;checks['capacityPickup']=True
  await p.keyboard.press('Space');await p.wait_for_timeout(40);await walk(p,[3,3]);await p.keyboard.press('Space');await p.wait_for_timeout(40);await walk(p,[2,2,1]);await p.wait_for_timeout(1900)
  s=await snap(p);assert s['stats']['chains']>=1,s;checks['realTwoBombChain']={'chains':s['stats']['chains'],'hp':s['player']['hp'],'planted':s['stats']['planted']};await p.screenshot(path=str(out/'chain.png'),full_page=True)
  # Restart through R then deliberately remain on three of our own bombs.
  await p.keyboard.press('r');assert (await snap(p))['state']=='ready';await p.locator('#primary-action').click();checks['restartReset']=((await snap(p))['stats']['planted']==0)
  for _ in range(3):
   await p.keyboard.press('Space');await p.wait_for_timeout(2900)
  s=await snap(p);assert s['state']=='lost';assert s['stats']['hits']==3;assert '爆风' in s['reason'];checks['actualSelfDamageFailure']={'hp':s['player']['hp'],'reason':s['reason']};await p.screenshot(path=str(out/'failure.png'),full_page=True)
  await p.locator('#primary-action').click();assert (await snap(p))['state']=='playing';checks['failureRetry']=True
  await p.locator('#sound').click();sound=(await snap(p))['sound'];await p.reload();assert (await snap(p))['sound']==sound;checks['soundPersists']=True
  await p.locator('#primary-action').click();assert not await p.locator('#help-dialog').is_visible();checks['tutorialPersists']=True
  await p.locator('#help').click();assert (await snap(p))['state']=='paused';await p.keyboard.press('Escape');assert (await snap(p))['state']=='playing';checks['helpEscResumes']=True
  await p.locator('#levels').click();assert await p.locator('[data-level="2"]').is_disabled();await p.keyboard.press('Escape');checks['lockedStages']=True
  await p.goto(args.url);await p.screenshot(path=str(out/'desktop.png'),full_page=True)
  # A fresh mobile context uses real touch events. No gameplay state fixture.
  mobile=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);m=await mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));await m.goto(args.url);await m.locator('#primary-action').tap();await m.locator('#help-confirm').tap();
  await m.locator('[data-direction="1"]').tap();await m.wait_for_timeout(80);assert (await snap(m))['player']['x']==2
  await m.locator('#touch-bomb').tap();await m.wait_for_timeout(80);assert (await snap(m))['stats']['planted']==1;checks['touchMoveAndPlant']=True
  await m.locator('#pause').tap();await m.screenshot(path=str(out/'mobile-390.png'),full_page=True)
  widths=[]
  for width in [360,390,768,1280]:
   await m.set_viewport_size({'width':width,'height':844});await m.wait_for_timeout(100);overflow=await m.evaluate('document.documentElement.scrollWidth > innerWidth');assert not overflow,width
   widths.append({'width':width,'horizontalOverflow':overflow})
  checks['responsiveWidths']=widths
  await p.goto(args.url.replace('games/maze/',''));await p.wait_for_selector('.game-card');assert await p.locator('.game-card').count()==72;assert await p.locator('.lab-card').count()==3;assert await p.locator('.lab-planned a').count()==0;assert await p.locator('a[href="./games/maze/"]').count()==2;checks['atlas72AndHonestReleaseLabels']=True
  await p.locator('.lab-card a[href="./games/maze/"]').click();assert '/games/maze/' in p.url;await p.locator('.back-link').click();await p.wait_for_selector('.game-card');checks['atlasReturn']=True
  assert not errors and not bad,(errors,bad)
  report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'checks':checks,'consoleErrors':errors,'badResponses':bad};(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=True));await mobile.close();await ctx.close();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/maze/');a.add_argument('--out',default='docs/maze-qa/ui');asyncio.run(main(a.parse_args()))
