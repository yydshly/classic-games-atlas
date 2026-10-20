"""Bounded real-browser layout regression; not a full-game or human-play test."""
import argparse,asyncio,datetime,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[3]
CASES=[('review-size',1173,751),('desktop',1440,900),('laptop',1366,768),('short',1280,600),('short-narrow',1024,600)]
MEASURE='''()=>{const r=s=>{const e=document.querySelector(s),q=e.getBoundingClientRect();return {x:q.x,y:q.y,width:q.width,height:q.height,bottom:q.bottom,right:q.right,fontSize:parseFloat(getComputedStyle(e).fontSize),visible:q.x>=-.5&&q.y>=-.5&&q.right<=innerWidth+.5&&q.bottom<=innerHeight+.5}};return {viewport:[innerWidth,innerHeight],scrollY,scrollWidth:document.documentElement.scrollWidth,field:r('#game'),objective:r('#objective'),stats:r('#stats'),pause:r('#pause'),retry:r('#retry'),up:r('[data-hold="up"]'),down:r('[data-hold="down"]'),left:r('[data-hold="left"]'),right:r('[data-hold="right"]'),attack:r('[data-action="attack"]'),dodge:r('[data-action="dodge"]'),echo:r('[data-action="echo"]'),interact:r('[data-action="interact"]')}}'''
async def state(p):return await p.evaluate('JSON.parse(localStorage.getItem("atlas-ruins-v2-snapshot-1"))')
async def click_visible(p,sel):
 r=await p.locator(sel).bounding_box();w,h=await p.evaluate('[innerWidth,innerHeight]');assert r and r['x']>=-.5 and r['y']>=-.5 and r['x']+r['width']<=w+.5 and r['y']+r['height']<=h+.5,(sel,r,[w,h]);x,y=r['x']+r['width']/2,r['y']+r['height']/2
 assert await p.evaluate('([s,x,y])=>{const e=document.querySelector(s),h=document.elementFromPoint(x,y);return e===h||e.contains(h)}',[sel,x,y]),'covered '+sel
 scroll=await p.evaluate('scrollY');await p.mouse.click(x,y);assert abs(await p.evaluate('scrollY')-scroll)<.5,'click scrolled page '+sel
async def hold_key(p,key,ms):
 await p.keyboard.down(key);await p.wait_for_timeout(ms);await p.keyboard.up(key)
async def held_button(p,sel,ms):
 r=await p.locator(sel).bounding_box();await p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);scroll=await p.evaluate('scrollY');await p.mouse.down();await p.wait_for_timeout(ms);await p.mouse.up();assert abs(await p.evaluate('scrollY')-scroll)<.5
def fit(m):
 assert all(m[k]['visible'] for k in ['field','objective','stats','pause','retry','up','down','left','right','attack','dodge','echo','interact']),m
 assert m['scrollWidth']==m['viewport'][0];assert abs((m['field']['width']-2)/(m['field']['height']-2)-5/3)<.01
 assert (m['field']['width']-2)/960>=.7,'room shrunk below bounded desktop scale'
 for k in ['pause','retry','up','down','left','right','attack','dodge','echo','interact']:assert m[k]['width']>=44 and m[k]['height']>=44,(k,m[k])
 for k in ['objective','stats','pause','attack','dodge','echo','interact']:assert m[k]['fontSize']>=13,(k,m[k])
async def main(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);url=a.root.rstrip('/')+'/versions/v2/games/ruins/';report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'method':'One normal Chromium encounter through page keyboard/mouse events: Start, walk/E into guard room, short movement/attacks, pause/resume, one checkpoint Retry. Resize while paused. Existing localStorage is read only by the test; writes are performed solely by the original app. No engine calls, injected snapshots, clock/HP/AI edits, level clears or human-play claim.','cases':[],'checks':[]};errors=[];bad=[];failed=[]
 def save():
  report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch();p=await b.new_page(viewport={'width':1173,'height':751});report['browser']=b.version;p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
  try:
   await p.goto(url,wait_until='networkidle');await click_visible(p,'#pause');await hold_key(p,'d',4000);await p.keyboard.press('e');await p.wait_for_timeout(80);await hold_key(p,'w',520);await hold_key(p,'d',1650);await click_visible(p,'#pause');encounter=await state(p);assert encounter['room']==1 and encounter['status']=='playing';report['encounter']={'room':1,'hp':encounter['p']['hp'],'time':encounter['time'],'enemyCount':len(encounter['rooms'][1]['enemies'])};save()
   for index,(name,w,h) in enumerate(CASES):
    frozen=await state(p);await p.set_viewport_size({'width':w,'height':h});await p.wait_for_timeout(60);assert await state(p)==frozen;measure=await p.evaluate(MEASURE);fit(measure);assert measure['scrollY']==0;assert await p.locator('#game').get_attribute('width')=='960' and await p.locator('#game').get_attribute('height')=='576'
    await click_visible(p,'#pause');await p.wait_for_timeout(450);await held_button(p,'[data-hold="right"]',80);await click_visible(p,'[data-action="attack"]');await p.wait_for_timeout(30);await click_visible(p,'#pause');attacked=await state(p);assert attacked['status']=='playing' and attacked['time']>frozen['time'] and attacked['p']['attackCd']>0,('attack not observed promptly',attacked['status'],attacked['p']);await click_visible(p,'#pause');await p.screenshot(path=str(out/(name+'-combat.png')));fit(await p.evaluate(MEASURE));await click_visible(p,'#pause');raw=await p.evaluate('localStorage.getItem("atlas-ruins-v2-snapshot-1")');hud=await p.locator('#stats').inner_text();await p.wait_for_timeout(200);assert await p.evaluate('localStorage.getItem("atlas-ruins-v2-snapshot-1")')==raw and await p.locator('#stats').inner_text()==hud;await p.screenshot(path=str(out/(name+'-paused.png')))
    await click_visible(p,'#pause')
    for action in ['dodge','echo','interact']:
     await click_visible(p,'[data-action="'+action+'"]');fit(await p.evaluate(MEASURE));assert await p.evaluate('scrollY')==0
    await p.wait_for_timeout(40);await click_visible(p,'#pause');ending=await state(p);assert ending['status']=='playing' and ending['p']['hp']>0 and ending['time']>attacked['time'];row={'name':name,'viewport':[w,h],'measure':measure,'displayScale':(measure['field']['width']-2)/960,'startTime':frozen['time'],'endTime':ending['time'],'hp':ending['p']['hp'],'attackCooldownObserved':attacked['p']['attackCd'],'fourActionButtonsClickedWithoutScrolling':True,'pauseSnapshotAndHUDFrozen':True,'nativeCanvasUnchanged':True};report['cases'].append(row)
    if index==0:
     await click_visible(p,'#retry');retried=await state(p);assert retried['room']==ending['room']==1 and retried['p']['hp']==retried['p']['maxHp'] and retried['p']['x']==retried['checkpoint']['p']['x'] and retried['p']['y']==retried['checkpoint']['p']['y'];fit(await p.evaluate(MEASURE));await p.screenshot(path=str(out/'review-size-retried.png'));await click_visible(p,'#pause');await held_button(p,'[data-hold="right"]',100);await click_visible(p,'[data-action="attack"]');await p.wait_for_timeout(80);await click_visible(p,'#pause');post=await state(p);assert post['time']>retried['time'] and post['p']['attackCd']>0;fit(await p.evaluate(MEASURE));report['checks'].append('one Retry restores current-room checkpoint and full HP; Resume/move/attack stays on screen')
    save()
   report['checks']+=['five desktop/short windows keep full room, objective/HP, pause, movement and four actions visible','pointer action clicks never auto-scroll the room','pause freezes saved snapshot and displayed clock/HP','echo button reachable; ability was not unlocked or fabricated during this short test'];await p.locator('nav a').filter(has_text='v1').click();await p.wait_for_selector('#battle');await p.wait_for_load_state('networkidle');assert '/games/ruins/' in p.url and '/versions/v2/' not in p.url;await p.screenshot(path=str(out/'legacy-v1-entry.png'));report['checks'].append('existing v1 link opens; no legacy playthrough');assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'viewports':len(report['cases']),'checkpointRetries':1,'checks':report['checks']},ensure_ascii=False))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);report['lastSavedSnapshot']=await state(p);save();raise
  finally:await b.close()
async def legacy(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Only remaining v1 link check after five v2 window cases passed; no legacy playthrough.'};errors=[];bad=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();p=await b.new_page(viewport={'width':1173,'height':751});p.on('pageerror',lambda e:errors.append(str(e)));p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  try:
   await p.goto(a.root.rstrip('/')+'/versions/v2/games/ruins/',wait_until='networkidle');await p.locator('nav a').filter(has_text='v1').click();await p.wait_for_selector('#battle');await p.wait_for_load_state('networkidle');assert '/games/ruins/' in p.url and '/versions/v2/' not in p.url;assert '遗迹灯火' in await p.title();await p.screenshot(path=str(out/'legacy-v1-entry.png'));assert not errors and not bad;report.update(passed=True,url=p.url,canvasId='battle',pageErrors=errors,badResponses=bad);print(json.dumps(report,ensure_ascii=False))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);raise
  finally:(out/'legacy-followup.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');await b.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',default='http://127.0.0.1:4177');p.add_argument('--out',default='.local/ruins-layout-qa/after');p.add_argument('--legacy-only',action='store_true');a=p.parse_args();asyncio.run(legacy(a) if a.legacy_only else main(a))
