"""Normal browser UI play. Snapshots/storage are read only; no model inputs or save injection."""
import argparse,asyncio,datetime,json,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[4]
FIXTURE=json.loads((Path(__file__).with_name('fixtures.json')).read_text('utf-8'))

async def run(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True)
 root=a.root.rstrip('/')+'/'
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'root':root,
  'method':'Actual rendered Chromium, normal buttons/keyboard and responsive-width checks. Read-only snapshot/storage observations. No state writes, save injection, model input() calls, time acceleration, touch-device or human-play claim.',
  'scenarios':[],'consoleErrors':[],'badResponses':[],'requestFailures':[]}
 def save():(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 def watch(page):
  page.on('pageerror',lambda e:report['consoleErrors'].append(str(e)))
  page.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
  page.on('response',lambda r:report['badResponses'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'failure':r.failure}))
 async def snapshot(page,legacy=False):
  return await page.evaluate('window.'+('featherV2Snapshot' if legacy else 'featherJourneySnapshot')+'()')
 async def ready(page,legacy=False):
  await page.wait_for_function('typeof window.'+('featherV2Snapshot' if legacy else 'featherJourneySnapshot')+'==="function"')
  if not legacy:await page.wait_for_function('window.featherJourneySnapshot().assetsReady',timeout=60000)
 async def action(page,kind,arg=None,legacy=False,keyboard=False):
  before=await snapshot(page,legacy);await page.wait_for_timeout(175)
  sel='button[data-action="'+kind+'"]'+('[data-arg="'+arg+'"]' if arg else ':not([data-arg])')
  target=page.locator(sel+':visible').first
  assert await target.count() and await target.is_enabled(),(kind,arg,before)
  if keyboard and kind=='move':
   await page.keyboard.press({'up':'ArrowUp','down':'ArrowDown','left':'ArrowLeft','right':'ArrowRight'}[arg])
  elif keyboard:
   await target.focus();await page.keyboard.press('Enter')
  else:await target.click()
  await page.wait_for_function('([name,n])=>window[name]().revision===n',arg=[('featherV2Snapshot' if legacy else 'featherJourneySnapshot'),before['revision']+1])
  after=await snapshot(page,legacy);assert all(after['invariants'].values()),after['invariants']
  return {'kind':kind,'arg':arg,'revision':after['revision'],'phase':after['phase'],'keyboard':keyboard}
 async def prepare(page,legacy=False,label='fresh'):
  steps=[];previous=3
  for i,c in enumerate(FIXTURE['preparedOrigin']['commands']):
   steps.append(await action(page,c['kind'],c.get('arg'),legacy,keyboard=(i%7==0)))
   s=await snapshot(page,legacy);base=s if legacy else s['base']
   if len(base['roster'])>previous:
    await page.screenshot(path=str(out/(label+'-recruited-'+str(len(base['roster']))+'.png')),full_page=True);previous=len(base['roster'])
  s=await snapshot(page,legacy);base=s if legacy else s['base']
  assert len(base['roster'])==5 and all(p['rank']==1 for p in base['roster'])
  await page.screenshot(path=str(out/(label+'-prepared.png')),full_page=True)
  return steps
 async def team(page,ids):
  for wanted in ids:
   s=await snapshot(page);current=s['base']['team']
   if wanted not in current:
    if len(current)==2:await action(page,'team',next(x for x in current if x not in ids))
    await action(page,'team',wanted)
  await action(page,'lead',ids[0])
 async def victory(page,policy,label):
  await team(page,policy['team']);await action(page,'trialStart')
  await page.screenshot(path=str(out/(label+'-trial.png')),full_page=True)
  trace=[]
  for i,c in enumerate(policy['path']):
   before=await snapshot(page);assert before['base']['active']==c['actor']
   event=await action(page,c['kind'],c.get('arg'),keyboard=(i==0 or c['kind']=='trialGuard'))
   after=await snapshot(page);event.update(actor=c['actor'],beforeTrial=before['trial'],afterTrial=after['trial'],team=after['base']['roster'],notice=after['base']['notice']);trace.append(event)
   if i==4:await page.screenshot(path=str(out/(label+'-skills.png')),full_page=True)
  won=await snapshot(page);assert won['phase']=='ending' and won['journey']['completed']
  assert won['ending']['turns']==len(policy['path'])
  await page.screenshot(path=str(out/(label+'-ending.png')),full_page=True)
  await page.reload(wait_until='networkidle');await ready(page)
  assert await page.locator('#overlay').is_visible();await page.locator('#resume').click()
  restored=await snapshot(page);assert restored==won,'ending refresh differs'
  await page.screenshot(path=str(out/(label+'-ending-refreshed.png')),full_page=True)
  return {'team':policy['team'],'trace':trace,'ending':won['ending'],'endingRefreshExact':True,'checkpoint':await page.evaluate('JSON.parse(localStorage.getItem("classic-atlas.feather.journey.v3"))')}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch();report['browser']=browser.version
  try:
   ctx=await browser.new_context(viewport={'width':1440,'height':1000});page=await ctx.new_page();watch(page)
   await page.goto(root+'versions/v3/games/feather/',wait_until='networkidle');await ready(page)
   assert (await snapshot(page))['revision']==0
   await page.screenshot(path=str(out/'fresh-start.png'),full_page=True)
   fresh={'name':'fresh normal UI to ending, with failure and free retry','preparation':await prepare(page)}
   await team(page,['a','bud']);before=await snapshot(page);roster=[(p['id'],p['xp'],p['rank']) for p in before['base']['roster']]
   await action(page,'trialStart');failure=[]
   while (await snapshot(page))['trial']:failure.append(await action(page,'trialAttack'))
   failed=await snapshot(page);assert failed['journey']['lastAttempt']['outcome']=='defeated'
   assert roster==[(p['id'],p['xp'],p['rank']) for p in failed['base']['roster']]
   assert failed['base']['stats']['captures']==before['base']['stats']['captures']
   await page.screenshot(path=str(out/'fresh-failure-return.png'),full_page=True)
   fresh.update(failure=failure,failureRetainsRosterAndGrowth=True,noRecaptureRequired=True)
   fresh['victory']=await victory(page,FIXTURE['strategies'][0],'fresh')
   fresh['responsive']=[]
   for w,h in [(390,844),(320,568)]:
    await page.set_viewport_size({'width':w,'height':h});await page.wait_for_timeout(100)
    geometry=await page.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canvas:document.querySelector("canvas").getBoundingClientRect().toJSON()})')
    assert geometry['scrollWidth']==w,geometry
    await page.screenshot(path=str(out/('ending-width-'+str(w)+'.png')),full_page=True);fresh['responsive'].append(geometry)
   await page.set_viewport_size({'width':1440,'height':1000});await action(page,'continue',keyboard=True);await action(page,'depart')
   free=await snapshot(page);assert free['phase']=='explore' and free['journey']['completed'];fresh['freeExplorationAfterEnding']=True
   assert await page.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")') is None
   report['scenarios'].append(fresh);save();await ctx.close()
   ctx=await browser.new_context(viewport={'width':1440,'height':1000});page=await ctx.new_page();watch(page)
   await page.goto(root+'versions/v2/games/feather/',wait_until='networkidle');await ready(page,True)
   older={'name':'existing v2 save built by normal UI, explicit import, second team to ending','preparation':await prepare(page,True,'legacy')}
   old_snapshot=await snapshot(page,True);old_snapshot.pop('invariants')
   old_raw=await page.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")')
   await page.goto(root+'versions/v3/games/feather/',wait_until='networkidle');await ready(page)
   await page.locator('#import-v2').click();await page.locator('#resume').click()
   imported=await snapshot(page);assert imported['base']==old_snapshot
   assert await page.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")')==old_raw
   await page.screenshot(path=str(out/'legacy-imported.png'),full_page=True)
   older.update(importExact=True,origin=json.loads(old_raw))
   older['victory']=await victory(page,FIXTURE['strategies'][1],'imported')
   assert await page.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")')==old_raw
   older['oldV2RawSaveUnchanged']=True
   report['scenarios'].append(older);save();await ctx.close()
   if a.site:
    ctx=await browser.new_context(viewport={'width':1440,'height':1000});page=await ctx.new_page();watch(page)
    await page.goto(root,wait_until='networkidle');await page.locator('#play-search').fill('32')
    card=page.locator('[data-play="feather"]');assert await card.count()==1
    assert 'v3' in (await card.inner_text()).lower()
    assert '/versions/v3/games/feather/' in await card.locator('.play-launch').get_attribute('href')
    await page.screenshot(path=str(out/'homepage-32.png'),full_page=True)
    await card.locator('.play-launch').click(no_wait_after=True)
    await page.wait_for_url('**/versions/v3/games/feather/',wait_until='domcontentloaded',timeout=60000)
    await ready(page);assert '/versions/v3/games/feather/' in page.url
    await page.goto(root+'#compare=feather',wait_until='networkidle');await page.wait_for_selector('#game-dialog[open]')
    dialog=page.locator('#game-dialog');assert '浅滩冒险' in await dialog.inner_text()
    links=await dialog.locator('a').evaluate_all('(a)=>a.map(x=>x.getAttribute("href"))')
    assert any('versions/v3/games/feather/' in x for x in links if x) and any('versions/v2/games/feather/' in x for x in links if x)
    count_text=await page.locator('#play-result-count').inner_text()
    count=int(re.search(r'/\s*(\d+)',count_text).group(1));assert count==40
    report['site']={'entry32':'v3','libraryCount':count,'comparisonKeepsV2':True};await ctx.close()
   assert not report['consoleErrors'] and not report['badResponses'] and not report['requestFailures'],report
   report['passed']=True;save();print(json.dumps({'passed':True,'scenarios':len(report['scenarios']),'freshFailureRetry':True,'twoTeams':[x['victory']['team'] for x in report['scenarios']],'legacySaveUnchanged':True,'endingRefreshes':2,'site':report.get('site')},ensure_ascii=False))
  except Exception as e:
   report['error']=type(e).__name__+': '+str(e);save();raise
  finally:await browser.close()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--root',default='http://127.0.0.1:4182/');parser.add_argument('--out',default='.local/feather-journey-qa/local');parser.add_argument('--site',action='store_true');asyncio.run(run(parser.parse_args()))
