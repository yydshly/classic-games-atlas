"""Normal first-win/second-loss UI chain, with separately labelled storage/result fixtures."""
import argparse,asyncio,json,datetime
from pathlib import Path
from playwright.async_api import async_playwright
SAVE='echo-v2-progress-r2';OLD='echo-v2-session-r1'
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':a.url,'normalUI':[],'fixtures':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 def save():(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 async def raw(p,key=SAVE):return await p.evaluate('(k)=>localStorage.getItem(k)',key)
 async def record(p):return json.loads(await raw(p))
 async def state(p):return {'level':await p.locator('#level').input_value(),'title':await p.locator('#title').inner_text(),'message':await p.locator('#message').inner_text(),'hud':await p.locator('.hud').inner_text(),'status':await p.locator('#save').inner_text(),'continueHidden':await p.locator('#continue').is_hidden(),'startDisabled':await p.locator('#start').is_disabled(),'record':await record(p)}
 async def capture(p,name):
  s=await state(p);await p.screenshot(path=str(out/(name+'.png')),full_page=True);return s
 async def hold(p,key,ms):
  await p.keyboard.down(key);await p.wait_for_timeout(ms);await p.keyboard.up(key)
 async with async_playwright() as pw:
  b=await pw.chromium.launch();r['browser']=b.version
  async def page(c):
   p=await c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)))
   p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None)
   p.on('response',lambda q:r['httpErrors'].append({'url':q.url,'status':q.status}) if q.status>=400 else None)
   p.on('requestfailed',lambda q:r['requestFailures'].append({'url':q.url,'failure':q.failure}))
   await p.goto(a.url,wait_until='networkidle',timeout=20000);return p
  async def context(records=None):
   c=await b.new_context(viewport={'width':1440,'height':1050})
   if records:await c.add_init_script(''.join('localStorage.setItem('+json.dumps(k)+','+json.dumps(v)+');' for k,v in records.items()))
   return c
  try:
   c=await context();p=await page(c);await p.locator('#continue').click()
   await hold(p,'KeyD',3000);assert '已取' in await p.locator('#key').inner_text();await hold(p,'KeyA',900)
   await p.keyboard.down('KeyW');await hold(p,'KeyJ',1250);await p.wait_for_timeout(2600);await p.keyboard.up('KeyW');await p.keyboard.press('KeyE');await hold(p,'KeyD',1300);await p.keyboard.press('KeyE')
   await p.wait_for_function('document.getElementById("title").textContent==="撤离成功"',timeout=2500)
   first=await capture(p,'normal-first-won');assert first['record']['kind']=='result' and first['record']['level']==1
   before=await raw(p);await p.reload(wait_until='networkidle',timeout=20000);after=await capture(p,'normal-first-won-refreshed')
   assert await raw(p)==before;assert after['title']=='撤离成功' and after['hud']==first['hud'] and after['message']==first['message'] and not after['continueHidden']
   r['normalUI'].append({'case':'first normal-key victory and exact result refresh','before':first,'after':after,'passed':True});save();print('Normal first victory and refresh passed',flush=True)
   await p.locator('#continue').click();assert await p.locator('#level').input_value()=='1';await p.locator('#retry').click();assert (await record(p))=={'version':1,'kind':'ready','level':2}
   await p.reload(wait_until='networkidle',timeout=20000);ready=await capture(p,'normal-second-ready-refreshed');assert ready['level']=='1' and ready['title']=='分流仓库'
   await p.locator('#continue').click();await p.keyboard.down('KeyW');await p.wait_for_timeout(220);await p.locator('#pause').click()
   active=await record(p);assert active['kind']=='active' and active['level']==2
   await p.reload(wait_until='networkidle',timeout=20000);assert await p.locator('#title').inner_text()=='行动暂停';await p.keyboard.up('KeyW');await p.locator('#continue').click();await p.wait_for_timeout(400);await p.locator('#pause').click();released=await record(p)
   assert released['session']['commands']==active['session']['commands'],'held movement revived after refresh'
   r['normalUI'].append({'case':'second ready refresh and active paused refresh/old-key clearing','ready':ready,'beforeActiveRefresh':active,'afterResumeWithoutKeys':released,'passed':True});save();print('Second ready/active refresh passed',flush=True)
   await p.locator('#continue').click();await p.wait_for_function('document.getElementById("title").textContent==="行动失败"',timeout=35000)
   lost=await capture(p,'normal-second-natural-loss');assert lost['record']['kind']=='result' and lost['record']['level']==2 and lost['record']['result']['state']=='lost'
   before=await raw(p);await p.reload(wait_until='networkidle',timeout=20000);lostReload=await capture(p,'normal-second-loss-refreshed');assert await raw(p)==before and lostReload['title']=='行动失败' and lostReload['level']=='1'
   await p.locator('#retry').click();assert await record(p)=={'version':1,'kind':'ready','level':2}
   r['normalUI'].append({'case':'second natural combat loss, exact loss refresh, current-stage retry','loss':lost,'afterReload':lostReload,'retry':await record(p),'passed':True});save();print('Second natural loss/refresh/retry passed',flush=True)
   # Storage fault injection is explicitly separate from the ordinary journey.
   prior=await raw(p);await p.evaluate('''()=>{window.__nativeSet=Storage.prototype.setItem;window.__writeFailures=0;Storage.prototype.setItem=function(k,v){if(k==='echo-v2-progress-r2'){window.__writeFailures++;throw new DOMException('QA fault','QuotaExceededError')}return window.__nativeSet.call(this,k,v)};window.__statusChanges=0;window.__statusObserver=new MutationObserver(rs=>window.__statusChanges+=rs.length);window.__statusObserver.observe(document.getElementById('save'),{subtree:true,childList:true,attributes:true});}''')
   await p.locator('#continue').click();await p.locator('#pause').click();assert await raw(p)==prior;assert await p.locator('#save').get_attribute('data-state')=='failed'
   n=await p.evaluate('window.__statusChanges');await p.wait_for_timeout(1700);assert await p.evaluate('window.__statusChanges')==n
   failure=await capture(p,'fixture-write-failure');await p.set_viewport_size({'width':390,'height':844});assert await p.locator('#save').is_visible();assert await p.evaluate('document.documentElement.scrollWidth<=innerWidth');await p.screenshot(path=str(out/'fixture-write-failure-390.png'),full_page=True);await p.set_viewport_size({'width':1440,'height':1050})
   await p.locator('#retry').click();assert await raw(p)==prior and await p.locator('#save').get_attribute('data-state')=='failed'
   await p.evaluate('()=>{Storage.prototype.setItem=window.__nativeSet;}');await p.wait_for_timeout(1700);assert await p.locator('#save').get_attribute('data-state')=='saved';recovery=await capture(p,'fixture-write-recovered')
   r['fixtures'].append({'case':'explicit quota write failure and later successful periodic retry','oldRawKept':True,'warningStable':True,'failure':failure,'recovery':recovery,'passed':True});save()
   # Valid legacy format comes from the real active UI checkpoint above; seeded only in a new isolated context.
   legacyRaw=json.dumps(active['session'],separators=(',',':'));legacyContext=await context({OLD:legacyRaw});q=await page(legacyContext)
   assert await q.locator('#title').inner_text()=='行动暂停';assert (await record(q))['level']==2 and await raw(q,OLD)==legacyRaw
   migrated=await capture(q,'fixture-legacy-migrated');await q.locator('#retry').click();assert (await record(q))['kind']=='ready' and (await record(q))['level']==2 and await raw(q,OLD)==legacyRaw
   r['fixtures'].append({'case':'legacy active checkpoint migration fixture, old exact raw preserved','capture':migrated,'passed':True})
   badContext=await context({SAVE:'KEEP MALFORMED NEW RECORD',OLD:legacyRaw});z=await page(badContext)
   assert await z.locator('#save').get_attribute('data-state')=='blocked';await z.locator('#continue').click();await z.locator('#retry').click();await z.wait_for_timeout(1700)
   assert await raw(z)=='KEEP MALFORMED NEW RECORD' and await raw(z,OLD)==legacyRaw
   await z.screenshot(path=str(out/'fixture-bad-record-protected.png'),full_page=True);r['fixtures'].append({'case':'malformed new record with valid legacy fixture; neither overwritten','passed':True})
   terminal={'version':1,'kind':'result','level':3,'result':{'state':'won','ticks':540,'hp':100,'ammo':8,'weapon':'pulse','keyCount':1,'spent':0,'kills':0,'reason':'Explicit final-result fixture, not natural play'}}
   finalContext=await context({SAVE:json.dumps(terminal,separators=(',',':'))});f=await page(finalContext);final=await capture(f,'fixture-final-no-fourth')
   assert final['continueHidden'] and final['startDisabled'];assert await f.locator('#level option').count()==3;await f.locator('#help').click();await f.keyboard.press('Escape');assert await f.locator('#title').inner_text()=='撤离成功';await f.locator('#retry').click();assert await record(f)=={'version':1,'kind':'ready','level':3}
   r['fixtures'].append({'case':'explicit third-win fixture, no fourth-stage action and retry stays third','capture':final,'passed':True})
   assert not r['consoleErrors'] and not r['httpErrors'];r['passed']=True;save()
  except Exception as e:r['error']=type(e).__name__+': '+str(e);save();raise
  finally:await b.close()
 print(json.dumps({'passed':True,'normalCases':len(r['normalUI']),'fixtureCases':len(r['fixtures']),'consoleErrors':r['consoleErrors'],'httpErrors':r['httpErrors'],'requestFailures':r['requestFailures']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--out',required=True);asyncio.run(main(p.parse_args()))
