"""Local browser automation, not human play or engine simulation."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[4]
CASES=[('desktop',1440,900,False),('review-size',1165,747,False),('short',1280,600,False),('phone',390,844,True),('phone-short',390,640,True),('tiny',320,568,True),('landscape',844,390,True)]
MEASURE='''()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right,visible:r.y>=-.5&&r.x>=-.5&&r.bottom<=innerHeight+.5&&r.right<=innerWidth+.5}};return {viewport:[innerWidth,innerHeight],scrollY,scrollWidth:document.documentElement.scrollWidth,board:rect('#battlefield'),pause:rect('#pause'),clock:rect('#clock'),bomb:rect('#bomb'),up:rect('[data-dir="0"]'),down:rect('[data-dir="2"]'),left:rect('[data-dir="3"]'),right:rect('[data-dir="1"]'),playerBombs:rect('#player-bombs'),rivalBombs:rect('#rival-bombs')}}'''
async def snap(p):return await p.evaluate('async()=>{const m=await import(new URL("game.mjs",location.href));return m.diagnostics()}')
async def click_visible(p,sel,touch=False):
 r=await p.locator(sel).bounding_box();w,h=await p.evaluate('[innerWidth,innerHeight]');assert r and r['x']>=-.5 and r['y']>=-.5 and r['x']+r['width']<=w+.5 and r['y']+r['height']<=h+.5,(sel,r,[w,h]);x,y=r['x']+r['width']/2,r['y']+r['height']/2
 assert await p.evaluate('([s,x,y])=>{const e=document.querySelector(s),h=document.elementFromPoint(x,y);return e===h||e.contains(h)}',[sel,x,y]),'covered '+sel
 if touch:await p.touchscreen.tap(x,y)
 else:await p.mouse.click(x,y)
async def move_to(p,d,x,y,touch=False):
 before=await snap(p);started=time.monotonic();key=['KeyW','KeyD','KeyS','KeyA'][d];cdp=None
 if touch:
  r=await p.locator('[data-dir="'+str(d)+'"]').bounding_box();cdp=await p.context.new_cdp_session(p);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
 else:await p.keyboard.down(key)
 try:
  while time.monotonic()-started<1.5:
   s=await snap(p)
   if (s['player']['x'],s['player']['y'])==(x,y):return {'direction':d,'from':[before['player']['x'],before['player']['y']],'to':[x,y],'observedGameTime':s['time']}
   assert s['state']=='playing';await p.wait_for_timeout(8)
  raise AssertionError('Movement did not reach '+str([x,y]))
 finally:
  if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await cdp.detach()
  else:await p.keyboard.up(key)
async def main(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);url=a.root.rstrip('/')+'/versions/v2/games/maze/';report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'method':'Real rendered Chromium page with normal UI events: keyboard or CDP touchscreen movement/bomb placement. Read-only diagnostics observe coordinates/fuses. No engine update calls, state/grid/AI/clock writes, seeded results or human-play claim.','cases':[],'checks':[]};errors=[];bad=[];failed=[]
 def save():
  report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 async with async_playwright() as pw:
  b=await pw.chromium.launch();report['browser']=b.version
  try:
   for name,w,h,touch in CASES:
    ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch);p=await ctx.new_page();watch(p);await p.goto(url,wait_until='domcontentloaded');await snap(p);await click_visible(p,'#primary',touch);assert (await snap(p))['state']=='playing';measure=await p.evaluate(MEASURE);assert all(measure[k]['visible'] for k in ['board','pause','clock','bomb','up','down','left','right','playerBombs','rivalBombs']),measure;assert measure['scrollWidth']==w and abs(measure['board']['width']/measure['board']['height']-11/9)<.01;assert measure['board']['width']/11>=24,'board cells too small'
    for key in ['pause','bomb','up','down','left','right']:assert measure[key]['width']>=44 and measure[key]['height']>=44,(name,key,measure[key])
    await click_visible(p,'#pause',touch);frozen=await snap(p);assert frozen['state']=='paused';await p.wait_for_timeout(180);assert await snap(p)==frozen;await click_visible(p,'#pause',touch);assert await p.evaluate('document.activeElement.id')=='battlefield'
    route=[await move_to(p,1,3,3,touch)]
    if touch:await click_visible(p,'#bomb',True)
    else:await p.keyboard.press('KeyJ')
    await p.wait_for_timeout(20);planted=await snap(p);bomb=next(v for v in planted['bombs'] if v['owner']=='player');assert (bomb['x'],bomb['y'])==(3,3);await p.screenshot(path=str(out/(name+'-planted.png')));route.append(await move_to(p,3,1,3,touch));route.append(await move_to(p,0,1,2,touch));await p.screenshot(path=str(out/(name+'-corner.png')))
    deadline=time.monotonic()+4
    while time.monotonic()<deadline:
     s=await snap(p)
     if not any(v['id']==bomb['id'] for v in s['bombs']):break
     await p.wait_for_timeout(25)
    assert not any(v['id']==bomb['id'] for v in s['bombs']) and s['player']['alive'] and s['state']=='playing';assert s['stats']['crates']>=1;await p.screenshot(path=str(out/(name+'-after-blast.png')));await click_visible(p,'#pause',touch);fused=await snap(p);await p.wait_for_timeout(120);assert await snap(p)==fused;await p.screenshot(path=str(out/(name+'-paused.png')));await click_visible(p,'#restart',touch);ready=await snap(p);assert ready['state']=='ready' and ready['time']==0 and not ready['bombs'] and ready['level']==1;await click_visible(p,'#other-map',touch);assert (await snap(p))['level']==2;await click_visible(p,'#primary',touch);assert (await snap(p))['state']=='playing';await click_visible(p,'#pause',touch);await click_visible(p,'#other-map',touch);assert (await snap(p))['level']==1 and (await snap(p))['state']=='ready'
    report['cases'].append({'name':name,'viewport':[w,h],'touchAutomation':touch,'measure':measure,'cellCSSPixels':measure['board']['width']/11,'route':route,'plantedAt':[bomb['x'],bomb['y']],'cornerSafeAt':[s['player']['x'],s['player']['y']],'playerSurvivedOwnBlast':True,'observedGameTime':s['time'],'stats':s['stats'],'pauseExactSnapshot':True,'resumeFocus':'battlefield','retryAndBothMapSwitches':True});save();await ctx.close()
   # Side-note map selector is still reachable and returns focus/scroll to play.
   ctx=await b.new_context(viewport={'width':390,'height':640},is_mobile=True,has_touch=True);p=await ctx.new_page();watch(p);await p.goto(url,wait_until='domcontentloaded');await snap(p);await p.locator('[data-map="1"]').click();assert (await snap(p))['level']==2;assert await p.evaluate('scrollY')==0 and await p.evaluate('document.activeElement.id')=='primary';await click_visible(p,'#primary',True);await p.wait_for_timeout(200);await p.reload(wait_until='domcontentloaded');s=await snap(p);assert s['state']=='ready' and s['level']==1 and s['time']==0 and not s['bombs'];report['checks']+=['sidebar map selector returns to top with Start focus','refresh starts default map READY, not a mid-match restore']
   await p.locator('header a').filter(has_text='v1').click();await p.wait_for_selector('#primary-action');await p.screenshot(path=str(out/'legacy-v1-ready.png'));assert '/versions/v1/games/maze/' in p.url;report['checks'].append('preserved actual v1 ten-level link opens');await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'viewports':len(report['cases']),'normalMoveBombCornerFlows':len(report['cases']),'checks':report['checks']},ensure_ascii=False))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);save();raise
  finally:await b.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',default='http://127.0.0.1:4176');p.add_argument('--out',default='.local/maze-layout-qa/after');asyncio.run(main(p.parse_args()))
