import asyncio,pathlib,os,json,base64,time,argparse
from playwright.async_api import async_playwright
A=argparse.ArgumentParser();A.add_argument('--base',default='http://127.0.0.1:58141/');A.add_argument('--out',default='.local/fortress-feedback-round/local');a=A.parse_args();R=pathlib.Path('.local/fortress-feedback-round');O=pathlib.Path(a.out);O.mkdir(exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
async def main():
 reports=[]
 async with async_playwright()as pw:
  b=await pw.chromium.launch(timeout=20000)
  for width in [1440,390]:
   c=await b.new_context(viewport={'width':width,'height':844 if width==390 else 1050},is_mobile=width==390,has_touch=width==390);p=await c.new_page();errors=[];network=[];console=[];p.on('console',lambda m:console.append(m.text)if m.type=='error'else None);p.on('pageerror',lambda e:errors.append(str(e)));p.on('response',lambda e:network.append({'url':e.url,'status':e.status})if e.status>=400 else None);cdp=await c.new_cdp_session(p)
   await p.goto(a.base+'versions/v2/games/fortress/',wait_until='domcontentloaded',timeout=25000);await p.wait_for_function('!!window.__fortress',timeout=10000);states=[]
   async def shot(label):
    x=await cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(O/f'{width}-{label}.png').write_bytes(base64.b64decode(x['data']));states.append({'label':label,**await p.evaluate('({game:__fortress.snapshot(),status:document.querySelector("#status").textContent,base:document.querySelector(".base-card").innerText})')})
   await shot('01-ready');before=json.loads(pathlib.Path('docs/fortress-feedback-qa/before-verification.json').read_text(encoding='utf-8'))['cases'];expected=next(c for c in before if c['width']==width)['states'][0]['game'];assert states[0]['game']==expected;await p.evaluate('window.statusChanges=0;new MutationObserver(()=>statusChanges++).observe(document.querySelector("#status"),{childList:true,subtree:true,characterData:true})');await p.locator('#primary').click();await asyncio.sleep(2.2);await shot('02-enemy');hit=False;start=time.monotonic()
   while time.monotonic()-start<65:
    s=await p.evaluate('__fortress.snapshot()')
    if s['base']['hp']<3:
     await shot('03-base-hit');hit=True;assert s['base']['hp']==2;assert await p.locator('#base-label').inner_text()=='基地受击';assert '2/3'in await p.locator('#status').inner_text();assert await p.locator('#base-card').get_attribute('data-notice')=='hit';break
    if s['state']!='playing':break
    await asyncio.sleep(.12)
   assert hit
   changes=await p.evaluate('statusChanges');await asyncio.sleep(.3);assert await p.evaluate('statusChanges')==changes,'live status repeated on every frame'
   assert not await p.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   for selector in ['#battlefield','#status','#pause']:
    box=await p.locator(selector).bounding_box();assert box and box['y']>=-1 and box['y']+box['height']<= (844 if width==390 else 1050)+1,(selector,box)
   await p.locator('#pause').click();frozen=await p.evaluate('__fortress.snapshot()');assert frozen['state']=='paused';await asyncio.sleep(.6);assert await p.evaluate('__fortress.snapshot()')==frozen;assert await p.locator('#status').inner_text()=='火线已暂停'
   await p.locator('#primary').click();assert (await p.evaluate('__fortress.snapshot()'))['state']=='playing'
   start=time.monotonic()
   while time.monotonic()-start<20 and (await p.evaluate('__fortress.snapshot()'))['state']=='playing':await asyncio.sleep(.15)
   terminal=await p.evaluate('__fortress.snapshot()');assert terminal['state']=='lost';assert await p.locator('#base-card').get_attribute('data-notice')=='';assert await p.locator('#status').inner_text()=='防线失守'
   await p.locator('#retry').click();assert (await p.evaluate('__fortress.snapshot()'))['state']=='ready';assert await p.locator('#base-label').inner_text()=='共享信标';assert '受击'not in await p.locator('#status').inner_text()
   await p.locator('#primary').click();await p.keyboard.down('KeyJ');await asyncio.sleep(.25);await p.keyboard.up('KeyJ');assert (await p.evaluate('__fortress.snapshot()'))['shots']>0
   await p.reload(wait_until='domcontentloaded');await p.wait_for_function('!!window.__fortress');assert (await p.evaluate('__fortress.snapshot()'))['state']=='ready';assert await p.locator('#base-card').get_attribute('data-notice')==''
   assert not errors and not network and not console,(errors,network,console)
   reports.append({'width':width,'baseUrl':a.base,'passed':True,'normalUi':True,'terminal':terminal,'checks':['unchanged ready snapshot','actual first base hit2/3','visible text and card','no per-frame live announcements','field/status/pause in viewport','pause frozen','resume','natural loss clears notice','retry clears notice','normal fire','reload clears notice'],'hit':hit,'states':states,'pageErrors':errors,'httpErrors':network,'consoleErrors':console});(O/'report.json').write_text(json.dumps({'cases':reports},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(width,'hit',hit,'hp',states[-1]['game']['base']['hp'],'status',states[-1]['status'],flush=True);await c.close()
  await b.close()
asyncio.run(main())
