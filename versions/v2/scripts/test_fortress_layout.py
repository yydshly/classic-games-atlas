"""Browser layout/input regression. Automation, not human/co-op play or a win test."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[3]
CASES=[('desktop',1440,900,False),('laptop',1366,768,False),('review-size',1165,747,False),('short',1280,600,False),('phone',390,844,True),('phone-short',390,640,True),('landscape',844,390,True)]
MEASURE='''()=>{const rect=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right,visible:r.top>=-.5&&r.left>=-.5&&r.bottom<=innerHeight+.5&&r.right<=innerWidth+.5}};return {viewport:[innerWidth,innerHeight],scrollY,scrollWidth:document.documentElement.scrollWidth,canvas:rect('#battlefield'),pause:rect('#pause'),base:rect('#base'),p1:rect('#p1'),p2:rect('#p2'),wave:rect('#wave'),clock:rect('#clock')}}'''
async def snap(p):return await p.evaluate('window.__fortress.snapshot()')
async def click_visible(p,selector,touch=False):
 r=await p.locator(selector).bounding_box();assert r,selector
 w,h=await p.evaluate('[innerWidth,innerHeight]');assert r['x']>=0 and r['y']>=0 and r['x']+r['width']<=w+.5 and r['y']+r['height']<=h+.5,(selector,r,[w,h])
 x,y=r['x']+r['width']/2,r['y']+r['height']/2
 assert await p.evaluate('([s,x,y])=>{const e=document.querySelector(s),hit=document.elementFromPoint(x,y);return hit===e||e.contains(hit)}',[selector,x,y]),'covered '+selector
 if touch:await p.touchscreen.tap(x,y)
 else:await p.mouse.click(x,y)
async def load(p,url):
 await p.goto(url,wait_until='domcontentloaded');await p.wait_for_function('window.__fortress?.snapshot')
async def touch_controls(p,keys,ms=400):
 cdp=await p.context.new_cdp_session(p);points=[]
 for i,key in enumerate(keys):
  r=await p.locator('[data-key="'+key+'"]').bounding_box();assert r and r['height']>=44
  points.append({'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':i+1})
 await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points});await p.wait_for_timeout(ms);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await cdp.detach()
async def main(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);url=a.root.rstrip('/')+'/versions/v2/games/fortress/'
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'method':'Actual Chromium page and rendered viewport screenshots; browser mouse/keyboard and CDP touch automation. No engine update calls, state/health/clock writes or battle snapshots seeded. Not human play, physical-device testing, co-op validation or campaign/win evidence.','cases':[],'checks':[]};errors=[];bad=[];failed=[]
 def save():
  report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 if a.flow_only:
  previous=json.loads((out/'matrix-and-flow-harness-first.json').read_text(encoding='utf8'));assert previous['url']==url and len(previous['cases'])==len(CASES) and not previous['consoleErrors'] and not previous['badResponses'] and not previous['requestFailures'];report['cases']=previous['cases'];report['continuation']='Seven viewport cases passed before a test-harness async-generator TypeError; preserve that report and run only remaining flow checks. Runtime files unchanged between runs.'
 async with async_playwright() as pw:
  b=await pw.chromium.launch();report['browser']=b.version
  try:
   for name,w,h,touch in ([] if a.flow_only else CASES):
    ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch);p=await ctx.new_page();watch(p);await load(p,url);assert await p.evaluate('CSS.supports("width:1cqh")&&CSS.supports("height:100svh")');await click_visible(p,'#primary',touch);assert (await snap(p))['state']=='playing'
    before=await snap(p)
    if touch:await touch_controls(p,['KeyW','KeyJ'])
    else:
     await p.keyboard.down('KeyW');await p.keyboard.down('KeyJ');await p.wait_for_timeout(400);await p.keyboard.up('KeyJ');await p.keyboard.up('KeyW')
    active=await snap(p);assert active['player']['y']<before['player']['y'] and active['shots']>before['shots'];measure=await p.evaluate(MEASURE);assert all(measure[k]['visible'] for k in ['canvas','pause','base','p1','p2','wave','clock']),measure;assert measure['scrollWidth']==w and abs(measure['canvas']['width']-measure['canvas']['height'])<.1
    await p.screenshot(path=str(out/(name+'-playing.png')));await click_visible(p,'#pause',touch);paused=await snap(p);assert paused['state']=='paused';await p.wait_for_timeout(250);assert await snap(p)==paused;await p.screenshot(path=str(out/(name+'-paused.png')))
    await click_visible(p,'#pause',touch);await p.wait_for_timeout(150);assert (await snap(p))['time']>paused['time'];assert (await p.evaluate(MEASURE))['scrollY']==measure['scrollY'];await click_visible(p,'#pause',touch);await click_visible(p,'#retry',touch);ready=await snap(p);assert ready['state']=='ready' and ready['time']==0 and ready['shots']==0 and ready['base']['hp']==3 and ready['players'][0]['lives']==3;await click_visible(p,'#primary',touch);assert (await snap(p))['state']=='playing'
    report['cases'].append({'name':name,'viewport':[w,h],'touchAutomation':touch,'measure':measure,'movementAndFire':{'startY':before['player']['y'],'endY':active['player']['y'],'shots':active['shots']},'pauseFrozenExactSnapshot':True,'clickPauseResumeWithoutScroll':True,'retryReadyAndRestart':True});save();await ctx.close()
   # Storage contract is selection/high score only: refresh returns to READY.
   ctx=await b.new_context(viewport={'width':1165,'height':747});p=await ctx.new_page();watch(p);await load(p,url);oldKey=await p.evaluate('localStorage.getItem("classic-atlas.fortress.v1")');await p.locator('#level').select_option('1');await p.locator('#mode').select_option('2');await click_visible(p,'#prepare');await click_visible(p,'#primary');start=await snap(p)
   for k in ['KeyW','KeyJ','ArrowUp','Enter']:await p.keyboard.down(k)
   await p.wait_for_timeout(650)
   for k in ['KeyW','KeyJ','ArrowUp','Enter']:await p.keyboard.up(k)
   running=await snap(p);assert running['mode']==2 and all(running['players'][i]['y']<start['players'][i]['y'] for i in range(2)) and running['shots']>=2;await p.screenshot(path=str(out/'dual-controls.png'));await click_visible(p,'#pause');frozen=await snap(p);await p.set_viewport_size({'width':390,'height':640});await p.wait_for_timeout(100);assert await snap(p)==frozen;resized=await p.evaluate(MEASURE);assert all(resized[k]['visible'] for k in ['canvas','pause','base','p1','p2','wave','clock']);await p.set_viewport_size({'width':1165,'height':747});await click_visible(p,'#pause');await p.reload(wait_until='domcontentloaded');await p.wait_for_function('window.__fortress?.snapshot');refreshed=await snap(p);assert refreshed['state']=='ready' and refreshed['level']==2 and refreshed['mode']==2 and refreshed['time']==0 and refreshed['score']==0 and refreshed['shots']==0 and refreshed['base']['hp']==3 and all(v['lives']==3 for v in refreshed['players']);assert await p.locator('#level').input_value()=='1' and await p.locator('#mode').input_value()=='2';assert await p.evaluate('localStorage.getItem("classic-atlas.fortress.v1")')==oldKey
   report['checks']+=['two keyboard-controlled vehicles moved/fired; not two-person co-op','paused resize keeps exact snapshot and visible field/HUD/pause','refresh restores map2/dual selection and READY budget, not mid-battle','v2 did not write v1 storage'];await p.screenshot(path=str(out/'refresh-ready.png'))
   # Follow the preserved actual legacy link and smoke its start/pause UI.
   await p.locator('header a').click();await p.wait_for_selector('#mission-number');assert '/games/fortress/' in p.url and '/versions/v2/' not in p.url;assert (await p.locator('#mission-number').inner_text()).strip()=='01 / 10';await p.screenshot(path=str(out/'legacy-ready.png'));await p.locator('#primary-action').click()
   if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
   await p.wait_for_timeout(200);await p.locator('#pause').click();assert await p.locator('#overlay').is_visible();report['checks'].append('legacy ten-level entry opened, start/help and clickable pause smoke passed');await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'viewports':len(report['cases']),'checks':report['checks']},ensure_ascii=False))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);save();raise
  finally:await b.close()
async def terminal(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':a.root.rstrip('/')+'/versions/v2/games/fortress/','method':'Automated idle wait for natural loss, without state/clock writes; only terminal Retry layout smoke, not a human gameplay/difficulty attempt.'};errors=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':640},is_mobile=True,has_touch=True);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  try:
   await load(p,report['url']);await click_visible(p,'#primary',True);started=time.monotonic()
   while time.monotonic()-started<120:
    s=await snap(p);report.update(state=s['state'],gameSeconds=s['time'],wallSeconds=time.monotonic()-started);(out/'terminal-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    if s['state']=='lost':break
    await p.wait_for_timeout(500)
   assert s['state']=='lost',s['state'];report['loss']={'baseHP':s['base']['hp'],'lives':s['lives'],'score':s['score']};await p.screenshot(path=str(out/'terminal-lost.png'));await click_visible(p,'#retry',True);ready=await snap(p);assert ready['state']=='ready' and ready['time']==0 and ready['base']['hp']==3 and ready['players'][0]['lives']==3;await click_visible(p,'#primary',True);assert (await snap(p))['state']=='playing';assert not errors;report.update(passed=True,retryReadyAndRestart=True,pageErrors=errors);print(json.dumps({'passed':True,'gameSeconds':s['time'],'terminalRetry':True}))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);raise
  finally:(out/'terminal-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');await b.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',default='http://127.0.0.1:4175');p.add_argument('--out',default='.local/fortress-layout-qa/after');p.add_argument('--flow-only',action='store_true');p.add_argument('--terminal-only',action='store_true');a=p.parse_args();asyncio.run(terminal(a) if a.terminal_only else main(a))
