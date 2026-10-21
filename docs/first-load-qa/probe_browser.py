import pathlib,json,os,asyncio,time,base64,argparse
from playwright.async_api import async_playwright
a=argparse.ArgumentParser();a.add_argument('--scenario',default='normal');a.add_argument('--base',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out');a=a.parse_args();R=pathlib.Path('.local/first-load-round');(R/'tmp').mkdir(parents=True,exist_ok=True);O=pathlib.Path(a.out)if a.out else R/a.scenario;O.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
cases=[('home','',1440,1050),('feather','versions/v3/games/feather/',1440,1050),('echo','versions/v2/games/echo/',1440,1050),('feather-narrow','versions/v3/games/feather/',390,844)]if a.scenario=='normal'else [('feather'if a.scenario=='font-held'else'home','versions/v3/games/feather/'if a.scenario=='font-held'else'',1440,1050)]
async def main():
 reports=[]
 async with async_playwright()as pw:
  b=await pw.chromium.launch(timeout=20000)
  for name,path,w,h in cases:
   c=await b.new_context(viewport={'width':w,'height':h},is_mobile=w==390,has_touch=w==390);p=await c.new_page();p.set_default_timeout(8000);cdp=await c.new_cdp_session(p);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{'cacheDisabled':True});start=time.monotonic();network=[];errors=[];console=[];timings={};release=asyncio.Event();injected=[]
   p.on('response',lambda r:network.append({'elapsedMs':round((time.monotonic()-start)*1000),'url':r.url,'status':r.status}));p.on('requestfailed',lambda r:network.append({'elapsedMs':round((time.monotonic()-start)*1000),'url':r.url,'error':r.failure}));p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:console.append({'type':m.type,'text':m.text})if m.type in ['error','warning']else None);p.on('domcontentloaded',lambda:timings.update({'domContentLoadedMs':round((time.monotonic()-start)*1000)}))
   async def block(route):
    injected.append(route.request.url)
    if a.scenario=='comparison-fail':await route.abort('failed');return
    await release.wait()
    try:await route.abort('failed')
    except Exception:pass
   if a.scenario=='comparison-fail':await c.route('**/data/comparisons.json*',block)
   elif a.scenario=='media-held':await c.route('**/data/reference-media.json*',block)
   elif a.scenario=='font-held':await c.route('**/fonts.googleapis.com/**',block)
   await p.goto(a.base+path,wait_until='commit',timeout=25000);shots=[]
   async def shot(label):
    frame=await cdp.send('Page.captureScreenshot',{'format':'png','fromSurface':True,'captureBeyondViewport':False});file=name+'-'+label+'.png';(O/file).write_bytes(base64.b64decode(frame['data']));state=await p.evaluate('({readyState:document.readyState,fonts:document.fonts.status,title:document.title,text:document.body?.innerText?.slice(0,2200),playCount:document.querySelectorAll("#play-grid .play-launch").length,launches:Array.from(document.querySelectorAll("#play-grid .play-launch")).slice(0,3).map(a=>({text:a.innerText,href:a.getAttribute("href")})),progressCount:document.querySelectorAll("#progress-list li").length,save:document.querySelector("#save")?.innerText,paint:performance.getEntriesByType("paint").map(p=>({name:p.name,startTime:p.startTime}))})');shots.append({'file':file,'elapsedMs':round((time.monotonic()-start)*1000),'state':state})
   await asyncio.sleep(.7);await shot('early');remaining=6-(time.monotonic()-start)
   if remaining>0:await asyncio.sleep(remaining)
   await shot('6s')
   functional={}
   if a.scenario=='normal':
    try:
     if name=='home':await p.locator('#play-search').fill('echo');await p.wait_for_function('document.querySelectorAll("#play-grid .play-launch").length===1',timeout=3000);functional['search']='works'
     else:await p.locator('#help').click(timeout=3000);functional['openDialogs']=await p.locator('dialog[open]').count()
    except Exception as e:functional['errorType']=type(e).__name__
   report={'name':name,'scenario':a.scenario,'base':a.base,'environment':'fresh isolated Chromium context, cache disabled via CDP; desktop hardware; no CPU/global network throttling; DNS/CDN not reset; narrow is emulation','faultInjected':a.scenario!='normal','injectedRequests':injected,'snapshots':shots,'events':timings,'functional':functional,'network':network,'console':console,'pageErrors':errors};reports.append(report);(O/'report.json').write_text(json.dumps({'cases':reports},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'name':name,'scenario':a.scenario,'snapshots':[{'ms':s['elapsedMs'],'fonts':s['state']['fonts'],'play':s['state']['playCount'],'progress':s['state']['progressCount'],'paint':s['state']['paint']}for s in shots],'functional':functional,'injected':len(injected)},ensure_ascii=False),flush=True);release.set();await asyncio.sleep(.1);await c.close()
  await b.close()
asyncio.run(main())
