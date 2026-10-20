"""Storage fault-injection UI check, separate from ordinary play and model tests."""
import argparse,asyncio,json,datetime
from pathlib import Path
from playwright.async_api import async_playwright
KEY='trail-v2-r1'
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':a.url,'method':'Normal buttons/keyboard for play, explicit Storage.setItem fault injection for quota/permission cases, deliberate malformed-save fixture in isolated context. No engine calls or game-state fixtures. Not level completion or native-device testing.','cases':[],'consoleErrors':[],'badResponses':[],'requestFailures':[]}
 async def raw(p):return await p.evaluate('localStorage.getItem("trail-v2-r1")')
 async def capture(p,name):
  await p.screenshot(path=str(out/(name+'.png')),full_page=True)
  return {'status':await p.locator('#save-status').inner_text(),'state':await p.locator('#save-status').get_attribute('data-state'),'eyebrow':await p.locator('#eyebrow').inner_text(),'description':await p.locator('#description').inner_text(),'raw':await raw(p)}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch();report['browser']=browser.version
  async def page(context):
   p=await context.new_page();p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)))
   p.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
   p.on('response',lambda r:report['badResponses'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
   p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'failure':r.failure}))
   await p.goto(a.url,wait_until='networkidle');return p
  try:
   c=await browser.new_context(viewport={'width':1440,'height':1050});p=await page(c)
   assert await p.locator('#save-status').get_attribute('data-state')=='saved'
   await p.locator('#primary').click();await p.keyboard.down('KeyD');await p.wait_for_timeout(200);await p.keyboard.up('KeyD');await p.locator('#pause').click()
   normal=await capture(p,'normal-paused');old=normal['raw'];assert json.loads(old)['game']['state']=='paused';assert normal['eyebrow']=='JOURNEY SAVED'
   await p.reload(wait_until='networkidle');assert await p.locator('#overlay').is_visible();restored=json.loads(await raw(p))['game'];original=json.loads(old)['game']
   for k in ['energy','lives','time']:assert restored[k]==original[k]
   assert restored['player']['x']==original['player']['x'];report['cases'].append({'name':'normal save and reload','passed':True,'capture':normal,'restored':restored})
   for error in ['QuotaExceededError','SecurityError']:
    prior=await raw(p)
    await p.evaluate('''name=>{window.__storageOriginal=Storage.prototype.setItem;window.__failures=0;Storage.prototype.setItem=function(k,v){if(k==='trail-v2-r1'){window.__failures++;throw new DOMException('deliberate browser QA fault',name)}return window.__storageOriginal.call(this,k,v)};window.__statusMutations=0;window.__observer=new MutationObserver(rs=>window.__statusMutations+=rs.length);window.__observer.observe(document.getElementById('save-status'),{childList:true,subtree:true,attributes:true});}''',error)
    await p.locator('#primary').click();await p.keyboard.down('KeyD');await p.wait_for_timeout(200);await p.keyboard.up('KeyD');await p.locator('#pause').click()
    assert await raw(p)==prior;assert await p.locator('#save-status').get_attribute('data-state')=='failed';assert await p.locator('#eyebrow').inner_text()=='SAVE UNAVAILABLE'
    mutations=await p.evaluate('window.__statusMutations');await p.wait_for_timeout(1300)
    assert await p.evaluate('window.__statusMutations')==mutations,'repeated warning DOM writes'
    failed=await capture(p,error+'-paused');assert '刷新或关闭可能丢失' in failed['description']
    if error=='QuotaExceededError':
     await p.set_viewport_size({'width':390,'height':844});await p.locator('#save-status').scroll_into_view_if_needed();await p.screenshot(path=str(out/'quota-390.png'),full_page=True)
     assert await p.evaluate('document.documentElement.scrollWidth<=innerWidth');await p.set_viewport_size({'width':1440,'height':1050})
    await p.locator('#retry').click();await p.wait_for_timeout(100);assert await p.locator('#overlay').is_hidden();assert await p.locator('#save-status').get_attribute('data-state')=='failed';assert await raw(p)==prior
    await p.locator('#pause').click();assert await p.locator('#eyebrow').inner_text()=='SAVE UNAVAILABLE'
    failures=await p.evaluate('window.__failures');assert failures>=5
    await p.evaluate('()=>{Storage.prototype.setItem=window.__storageOriginal;}');await p.wait_for_timeout(1300)
    assert await p.locator('#save-status').get_attribute('data-state')=='saved';assert await p.locator('#eyebrow').inner_text()=='JOURNEY SAVED';assert await raw(p)!=prior
    assert '丢失' not in await p.locator('#description').inner_text();recovered=await capture(p,error+'-recovered')
    report['cases'].append({'name':error,'passed':True,'faultInjection':True,'oldSaveUnchangedDuringFailure':True,'playAndRetryStillWork':True,'warningDOMStableWhileRepeatedWritesFail':True,'failedWriteAttempts':failures,'failed':failed,'recovered':recovered})
    await p.evaluate('window.__observer.disconnect()')
   bad=await browser.new_context(viewport={'width':1440,'height':1050})
   await bad.add_init_script('''localStorage.setItem('trail-v2-r1','RETAIN MALFORMED ORIGINAL');window.__badWriteAttempts=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='trail-v2-r1')window.__badWriteAttempts++;return set.call(this,k,v)}''')
   q=await page(bad);assert await q.locator('#save-status').get_attribute('data-state')=='blocked';await q.locator('#primary').click();await q.locator('#pause').click();assert await q.locator('#eyebrow').inner_text()=='SAVE PRESERVED';blocked=await capture(q,'bad-save-protected');await q.locator('#retry').click();await q.wait_for_timeout(1300)
   assert await raw(q)=='RETAIN MALFORMED ORIGINAL';assert await q.evaluate('window.__badWriteAttempts')==0
   report['cases'].append({'name':'deliberate bad save fixture','passed':True,'originalRetained':True,'gameWriteAttempts':0,'capture':blocked})
   assert not report['consoleErrors'] and not report['badResponses'];report['passed']=True
  except Exception as e:
   report['error']=type(e).__name__+': '+str(e);raise
  finally:
   await browser.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'passed':True,'cases':len(report['cases']),'consoleErrors':report['consoleErrors'],'httpErrors':report['badResponses'],'requestFailures':report['requestFailures']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--out',required=True);asyncio.run(main(p.parse_args()))
