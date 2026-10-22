import asyncio, pathlib, os, json, base64, time, argparse
from playwright.async_api import async_playwright
A=argparse.ArgumentParser();A.add_argument('--base',default='http://127.0.0.1:58151/');A.add_argument('--out',default='.local/brook-feedback-round/local');a=A.parse_args()
R=pathlib.Path('.local/brook-feedback-round');O=pathlib.Path(a.out);O.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
baseline=json.loads(pathlib.Path('docs/brook-feedback-qa/before-verification.json').read_text(encoding='utf-8'))['cases']
async def main():
 reports=[]
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(timeout=20000)
  for width in [1440,390]:
   context=await browser.new_context(viewport={'width':width,'height':844 if width==390 else 1050},is_mobile=width==390,has_touch=width==390);page=await context.new_page();page.set_default_timeout(10000);errors=[];http=[];console=[]
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda e:http.append({'url':e.url,'status':e.status})if e.status>=400 else None);page.on('console',lambda m:console.append(m.text)if m.type=='error'else None);cdp=await context.new_cdp_session(page)
   await page.goto(a.base+'versions/v2/games/brook/',wait_until='domcontentloaded',timeout=25000);await page.wait_for_function('document.querySelector("#unit-cards").children.length===5')
   async def diag():return await page.evaluate('(async()=>{const s=[...document.scripts].find(s=>s.type==="module"&&s.src.includes("/game.mjs"));return(await import(s.src)).diagnostics()})()')
   async def cell(row,col):
    box=await page.locator('#battle').bounding_box();await page.locator('#battle').click(position={'x':(100+(col+.5)*80)*box['width']/850,'y':(115+(row+.5)*72)*box['height']/390});current=await diag();assert (current['row'],current['col'])==(row,col)
   states=[]
   async def shot(label):
    frame=await cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(O/f'{width}-{label}.png').write_bytes(base64.b64decode(frame['data']));states.append({'label':label,'game':await diag(),'lane':await page.locator('#lane-note').inner_text(),'warning':await page.locator('#lane-note').get_attribute('data-warning')})
   initial=await diag();assert initial==next(c for c in baseline if c['width']==width)['states'][0]['game'];assert await page.locator('#lane-note').get_attribute('data-warning')=='false'
   await page.locator('#primary-action').click()
   if await page.locator('#help-dialog').is_visible():await page.locator('#help-confirm').click()
   await page.locator('.scene').scroll_into_view_if_needed();await page.evaluate('window.laneChanges=0;new MutationObserver(()=>laneChanges++).observe(document.querySelector("#lane-note"),{childList:true,subtree:true,characterData:true})')
   start=time.monotonic();found=False
   while time.monotonic()-start<45:
    state=await diag()
    if any(e['hp']>0 and e['x']<=260 for e in state['enemies']):found=True;break
    assert state['state']=='playing';await asyncio.sleep(.12)
   assert found;await page.wait_for_function('document.querySelector("#lane-note").dataset.warning==="true"');assert await page.locator('#lane-note').inner_text()=='左岸附近：第 2 行有来敌。';assert (await diag())['row']==0
   await shot('03-left-enemy');changes=await page.evaluate('laneChanges');await asyncio.sleep(.35);assert await page.evaluate('laneChanges')==changes,'same lane repeated live announcements'
   lane=await page.locator('#lane-note').bounding_box();field=await page.locator('#battle').bounding_box();height=844 if width==390 else 1050
   assert lane and field and lane['y']>=-1 and lane['y']+lane['height']<=field['y']+1 and field['y']+field['height']<=height+1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   await page.locator('#pause').click();frozen=await diag();assert frozen['state']=='paused';await asyncio.sleep(.4);assert await diag()==frozen
   await page.reload(wait_until='domcontentloaded');await page.wait_for_function('document.querySelector("#lane-note").dataset.warning==="true"');restored=await diag();assert restored['state']=='paused'
   for key in ['ticks','time','resource','enemies']:assert restored[key]==frozen[key],key
   assert await page.locator('#lane-note').inner_text()=='左岸附近：第 2 行有来敌。'
   await page.locator('#primary-action').click();start=time.monotonic()
   while time.monotonic()-start<15 and (await diag())['state']=='playing':await asyncio.sleep(.15)
   terminal=await diag();assert terminal['state']=='lost';assert await page.locator('#lane-note').get_attribute('data-warning')=='false';assert '已结束'in await page.locator('#lane-note').inner_text()
   await page.locator('#primary-action').click()
   for _ in range(2):await page.locator('#reset').click()
   assert (await diag())['state']=='ready';assert await page.locator('#lane-note').get_attribute('data-warning')=='false';assert await page.locator('#lane-note').count()==1
   (O/f'{width}-lane-phase.json').write_text(json.dumps({'phase':'lane_checks_complete_before_resource_regression','states':states,'frozen':frozen,'restored':restored,'terminal':terminal},ensure_ascii=False,indent=2),encoding='utf-8')
   await page.locator('#primary-action').click();await cell(0,0);await page.locator('[data-type="wall"]').click();await page.locator('#deploy').click();await cell(0,1);assert await page.locator('#deploy').is_disabled();assert '冷却'in await page.locator('#placement-note').inner_text()
   await page.locator('[data-type="mist"]').click();await page.locator('#deploy').click();await cell(0,2);await page.locator('[data-type="bolt"]').click();await page.locator('#deploy').click();await cell(0,3);await page.locator('[data-type="mist"]').click()
   await page.wait_for_function('document.querySelector("[data-type=mist] .card-status").textContent.includes("还缺 25露")',timeout=10000);assert (await diag())['resource']==70;assert await page.locator('#deploy').is_disabled();assert '还缺 25 露'in await page.locator('#placement-note').inner_text()
   await page.keyboard.press('c');assert (await diag())['resource']>=95;assert await page.locator('#deploy').is_enabled();assert await page.locator('#lane-note').get_attribute('data-warning')=='false';assert (await diag())['speed']==1
   assert not errors and not http and not console,(errors,http,console)
   reports.append({'width':width,'base':a.base,'passed':True,'normalUi':True,'initialMatchesBaseline':True,'states':states,'frozen':frozen,'restored':restored,'terminal':terminal,'final':await diag(),'pageErrors':errors,'httpErrors':http,'consoleErrors':console,'checks':['actual row2 near-left','same row no repeated text','cue and field visible','pause frozen','old-format reload derives same cue','resume and natural loss clear cue','repeat reset clears cue','single cue element','normal deployment','original cooldown reason','original resource shortage','normal collection restores placement','1x unchanged']})
   (O/'report.json').write_text(json.dumps({'cases':reports},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(width,'passed',len(reports[-1]['checks']),'checks; terminal',terminal['time'],flush=True);await context.close()
  await browser.close()
asyncio.run(main())
