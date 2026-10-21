import asyncio,base64,json,time,pathlib,os,argparse
from playwright.async_api import async_playwright
A=argparse.ArgumentParser();A.add_argument('--base',default='http://127.0.0.1:58131/');A.add_argument('--out',default='.local/first-load-round/local');a=A.parse_args()
O=pathlib.Path(a.out);O.mkdir(parents=True,exist_ok=True);T=pathlib.Path('.local/first-load-round/tmp').resolve();os.environ['TEMP']=os.environ['TMP']=str(T)
CASES=[('normal',1440),('normal',390),('comparison-fail',1440),('comparison-fail',390),('comparison-partial',1440),('media-held',1440),('media-held',390),('value-fail',1440),('critical-held',1440)]
async def main():
 results=[]
 async with async_playwright()as pw:
  b=await pw.chromium.launch(timeout=20000)
  for kind,width in CASES:
   name=f'{kind}-{width}';file=O/(name+'.json')
   if file.exists() and json.loads(file.read_text(encoding='utf-8')).get('passed'):results.append(json.loads(file.read_text(encoding='utf-8')));continue
   c=await b.new_context(viewport={'width':width,'height':1050 if width>390 else 844},is_mobile=width==390,has_touch=width==390);p=await c.new_page();p.set_default_timeout(12000);cdp=await c.new_cdp_session(p);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
   start=time.monotonic();network=[];errors=[];console=[];injected=[];release=asyncio.Event()
   p.on('response',lambda r:network.append({'ms':round((time.monotonic()-start)*1000),'url':r.url,'status':r.status}));p.on('requestfailed',lambda r:network.append({'ms':round((time.monotonic()-start)*1000),'url':r.url,'error':r.failure}));p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:console.append({'type':m.type,'text':m.text})if m.type in ['error','warning']else None)
   async def fault(route):
    injected.append(route.request.url)
    if kind=='comparison-partial':await route.fulfill(json={'items':[]});return
    if kind.endswith('held'):
     await release.wait()
     try:await route.abort('failed')
     except Exception:pass
    else:await route.abort('failed')
   pattern='**/data/comparisons.json*'if kind.startswith('comparison')else'**/data/reference-media.json*'if kind=='media-held'else'**/data/value-comparisons.json*'if kind=='value-fail'else'**/data/games.json*'if kind=='critical-held'else None
   if pattern:await c.route(pattern,fault)
   result={'name':name,'base':a.base,'faultInjected':bool(pattern),'injected':injected,'passed':False}
   try:
    await p.goto(a.base,wait_until='commit',timeout=25000)
    critical=kind.startswith('comparison')or kind=='critical-held'
    await p.locator('#play-load-error'if critical else'#play-grid .play-launch').first.wait_for(state='visible',timeout=12000)
    result['settledMs']=round((time.monotonic()-start)*1000)
    if critical:
     assert await p.locator('#play-grid .play-launch').count()==0
     assert await p.locator('#play-search').is_disabled()
     assert await p.locator('#comparison-count').inner_text()=='—'
     await p.locator('#play-reload').scroll_into_view_if_needed();await p.locator('#play-reload').focus();assert await p.locator('#play-reload').evaluate('(e)=>e===document.activeElement')
    else:
     assert await p.locator('#play-grid .play-launch').count()==12
     assert await p.locator('#comparison-count').inner_text()=='40'
     assert 'versions/v2/games/fortress/'in await p.locator('#play-grid .play-launch').first.get_attribute('href')
     if pattern:
      assert await p.locator('#supplemental-warning').is_visible()
      if kind=='media-held':
       assert await p.locator('#reference-image-count').inner_text()=='—'
       assert '暂不可用'in await p.locator('#reference-coverage-note').inner_text()
      await p.locator('#supplemental-warning').scroll_into_view_if_needed()
     else:assert not await p.locator('#supplemental-warning').is_visible()
    assert not await p.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    frame=await cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(O/(name+'.png')).write_bytes(base64.b64decode(frame['data']))
    result['state']=await p.evaluate('({text:document.body.innerText.slice(0,2000),fonts:document.fonts.status,playCount:document.querySelectorAll("#play-grid .play-launch").length,warning:document.querySelector("#supplemental-message").textContent})')
    if pattern:
     await c.unroute(pattern);release.set()
     await p.locator('#play-reload'if critical else'#supplemental-warning button').press('Enter')
     await p.locator('#play-grid .play-launch').first.wait_for(state='visible')
     assert not await p.locator('#play-load-error').is_visible();assert not await p.locator('#supplemental-warning').is_visible();assert await p.locator('#comparison-count').inner_text()=='40'
     result['keyboardReloadRecovery']=True
    await p.locator('#play-search').fill('echo');assert await p.locator('#play-grid .play-launch').count()==1
    await p.locator('a[href="#compare=echo"]').first.click();await p.locator('#game-dialog').wait_for(state='visible');await p.keyboard.press('Escape');assert not await p.locator('#game-dialog').is_visible()
    if kind=='normal':
     await p.locator('#play-grid .play-launch').click();await p.wait_for_url('**/versions/v2/games/echo/');await p.get_by_role('link',name='游戏大厅',exact=True).click();await p.wait_for_url('**/index.html#play');await p.locator('#play-grid .play-launch').first.wait_for(state='visible');assert await p.locator('#play-search').input_value()=='echo';assert await p.locator('#play-grid .play-launch').count()==1
     result['launchReturnRetained']=True
    assert not errors,errors
    unexpected=[n for n in network if n.get('status',0)>=400]
    assert not unexpected,unexpected
    result['passed']=True
   except Exception as e:result['error']=str(e);print(name,'FAILED',str(e),flush=True)
   result.update(network=network,pageErrors=errors,console=console);file.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');results.append(result);(O/'report.json').write_text(json.dumps({'cases':results},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(name,result['passed'],result.get('settledMs'),flush=True);release.set();await c.close()
  await b.close()
 (O/'report.json').write_text(json.dumps({'cases':results},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 assert all(r['passed']for r in results), 'One or more scenarios failed; inspect per-case checkpoints.'
asyncio.run(main())
