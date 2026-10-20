"""One public UI loss loop. Read-only storage/DOM observations; no live model calls or injection."""
import argparse,asyncio,datetime,hashlib,json,re,subprocess
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
KEY='beacon-expedition-v2'
def classify_requests(failures):
 cancelled=[r for r in failures if r['failure']=='net::ERR_ABORTED' and r['url'].endswith(('/beacon/assets/guard.webp','/beacon/assets/bow.webp'))]
 return cancelled,[r for r in failures if r not in cancelled]
async def main(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);url=a.root.rstrip('/')+'/versions/v2/games/beacon/'
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'baseline':'4e78b7ed2247598008179d7fa1ac8ab01f08791f',
  'method':'One actual public Chromium UI route. Only normal map, action, confirmation and reload controls. localStorage is read only in this verifier; live hidden game state is never read or changed, and no model commands/save fixtures are injected. Saved event logs are audited separately offline.',
  'actions':[],'milestones':[],'refreshChecks':[],'consoleErrors':[],'badResponses':[],'requestFailures':[],'files':[]}
 def save():(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 async def raw(page):return await page.evaluate('localStorage.getItem("beacon-expedition-v2")')
 async def observed(page):
  return {'rawSave':await raw(page),'hud':await page.locator('#hud').inner_text(),'army':await page.locator('#army').inner_text(),'latest':await page.locator('#latest').inner_text(),'location':await page.locator('#location').inner_text()}
 async def capture(page,name):
  await page.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)',timeout=60000)
  state=await observed(page);state['name']=name;state['screenshot']=name+'.png';report['milestones'].append(state)
  await page.screenshot(path=str(out/(name+'.png')),full_page=True);save();return state
 async def commit_click(page,locator,label):
  old=await raw(page);count=len(json.loads(old)['events']) if old else 0
  await locator.click()
  await page.wait_for_function('n=>{const r=localStorage.getItem("beacon-expedition-v2");return r&&JSON.parse(r).events.length===n}',arg=count+1)
  now=json.loads(await raw(page));report['actions'].append({'label':label,'event':now['events'][-1]});save()
 async def action(page,prefix):await commit_click(page,page.locator('#actions').get_by_role('button',name=re.compile('^'+prefix)),prefix)
 async def travel(page,name):
  old=await raw(page);await page.locator('#markers button').filter(has_text=name).click();assert await raw(page)==old,'map selection consumed a command'
  await action(page,'前往'+name)
 async def confirm_action(page,prefix,warning):
  old=await raw(page);await page.locator('#actions').get_by_role('button',name=re.compile('^'+prefix)).click()
  await page.locator('#modal[open]').wait_for();assert warning in await page.locator('#modal-body').inner_text()
  assert await raw(page)==old,'preview changed saved state before confirmation'
  await commit_click(page,page.locator('#modal-confirm'),prefix+' / confirm')
 async def refresh(page,name):
  before=await observed(page);await page.reload(wait_until='domcontentloaded');await page.locator('#resume').wait_for(state='visible')
  assert await raw(page)==before['rawSave'];assert await page.locator('#pause-layer').is_visible()
  await page.locator('#resume').click();after=await observed(page);assert after==before,(name,before,after)
  report['refreshChecks'].append({'name':name,'rawSaveAndVisibleStateExact':True,'restoredPaused':True});save()
 async with async_playwright() as pw:
  browser=await pw.chromium.launch();page=await browser.new_page(viewport={'width':1440,'height':1000});report['browser']=browser.version
  page.on('pageerror',lambda e:report['consoleErrors'].append(str(e)))
  page.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
  page.on('response',lambda r:report['badResponses'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'failure':r.failure}))
  try:
   paths=subprocess.check_output(['git','ls-tree','-r','--name-only','HEAD','--','versions/v2/games/beacon'],cwd=ROOT,text=True).splitlines()
   for path in paths:
    expected=subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT)
    response=await page.request.get(a.root.rstrip('/')+'/'+path+'?verify=beacon-loss-4e78b7e')
    data=await response.body();assert response.status==200 and data==expected,path
    report['files'].append({'path':path,'status':response.status,'sha256':hashlib.sha256(data).hexdigest(),'matchesBaseline':True})
   await page.goto(url,wait_until='domcontentloaded');await page.locator('#hud strong').first.wait_for()
   assert await raw(page) is None
   start=await capture(page,'01-fresh-port');assert '100 金' in start['hud'] and '总耐久 30' in start['army']
   await travel(page,'落潮船湾');await action(page,'收集资源')
   loot=await capture(page,'02-ordinary-cargo');assert '65金 · 2木 · 0透镜' in loot['army']
   await travel(page,'旧航标遗迹');await action(page,'选择迎战')
   await confirm_action(page,'撤退归港','全部随身资源')
   retreat=await capture(page,'03-costly-retreat');assert '100 金' in retreat['hud'] and '总耐久 26' in retreat['army'] and '0金 · 0木 · 0透镜' in retreat['army'];assert '行囊全部遗失' in retreat['latest']
   await refresh(page,'costly-retreat')
   # Two ordinary bow recruits shorten the necessary lens acquisition to two rounds.
   await action(page,'招募弩手');await action(page,'招募弩手')
   await travel(page,'落潮船湾');assert await page.locator('#actions').get_by_role('button',name='资源已带走').is_disabled()
   await travel(page,'旧航标遗迹');await action(page,'选择迎战')
   await confirm_action(page,'齐射','剩余耐久 14')
   await confirm_action(page,'齐射','剩余耐久 0')
   lens=await capture(page,'04-lens-in-cargo');assert '70金 · 2木 · 1透镜' in lens['army'] and '20 金' in lens['hud']
   await confirm_action(page,'紧急归港','全部随身战利品丢失')
   lost=await capture(page,'05-critical-lens-loss');assert '关键修复物资在撤退中遗失' in lost['latest'] and '这次航程结束' in lost['location'];assert await page.locator('#actions button').count()==0
   await refresh(page,'critical-loss')
   before=await observed(page);await page.locator('#restart').click();await page.locator('#modal[open]').wait_for();assert await raw(page)==before['rawSave']
   await page.locator('#modal-cancel').click();assert await observed(page)==before
   report['restartCancelPreservedLostRun']=True
   await page.locator('#restart').click();assert '只清除这次独立 v2' in await page.locator('#modal-body').inner_text()
   assert await raw(page)==before['rawSave'];assert await page.locator('#modal-confirm').inner_text()=='确认重新开始'
   await page.locator('#modal-confirm').click()
   await page.wait_for_function('JSON.parse(localStorage.getItem("beacon-expedition-v2")).events.length===0')
   restarted=await capture(page,'06-confirmed-fresh-start');assert '第 1 / 32 天' in restarted['hud'] and '100 金' in restarted['hud'] and '总耐久 30' in restarted['army'] and '总耐久 12' in restarted['army']
   await refresh(page,'confirmed-fresh-start')
   await travel(page,'落潮船湾');await action(page,'收集资源')
   again=await capture(page,'07-normal-action-after-restart');assert '65金 · 2木 · 0透镜' in again['army']
   report['confirmedRestartAndNormalActions']=True
   report['cancelledPortraitRequests'],report['unexpectedRequestFailures']=classify_requests(report['requestFailures'])
   report['flowChecksPassed']=True
   assert not report['consoleErrors'] and not report['badResponses'] and not report['unexpectedRequestFailures']
   report['passed']=True;save()
   print(json.dumps({'passed':True,'acceptedUICommands':len(report['actions']),'milestones':len(report['milestones']),'refreshes':len(report['refreshChecks']),'runtimeFilesMatched':len(report['files']),'restartAndNormalActions':True},ensure_ascii=False))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);save();raise
  finally:await browser.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',default='https://yydshly.github.io/classic-games-atlas');p.add_argument('--out',default='.local/beacon-loss-qa/public');asyncio.run(main(p.parse_args()))
