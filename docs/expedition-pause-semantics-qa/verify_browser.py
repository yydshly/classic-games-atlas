import json,pathlib,os,argparse,time,traceback
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('game',choices=['expedition','island','lantern']);ap.add_argument('--base',default='https://yydshly.github.io/classic-games-atlas');ap.add_argument('--out',required=True);ap.add_argument('--terminal',action='store_true');a=ap.parse_args();g=a.game;R=pathlib.Path('.local/pause-semantics-round');O=pathlib.Path(a.out);O.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TMP']=os.environ['TEMP']=str((R/'tmp').resolve());r={'game':g,'base':a.base,'method':'Native UI click/tap/keyboard/scroll only; read-only DOM/copied diagnostics. No injected game/save/time/terminal state. Desktop terminal requested only when --terminal;390CSS simulation is not physical-device evidence.','views':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
def save(): (O/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
try:
 with sync_playwright()as pw:
  b=pw.chromium.launch(timeout=20000)
  for label,size in [('desktop',{'width':1440,'height':1050}),('narrow',{'width':390,'height':844})]:
   print(g+'-'+label+' opening',flush=True);c=b.new_context(viewport=size,is_mobile=label=='narrow',has_touch=label=='narrow');p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}));p.goto(a.base.rstrip('/')+'/versions/v2/games/'+g+'/',wait_until='networkidle',timeout=25000);v={'view':label,'steps':[]};r['views'].append(v)
   def snap():
    if g=='expedition':
     layer=p.locator('#pause-layer').is_visible();title=p.locator('#pause-title').inner_text();return {'state':'terminal'if p.locator('#result').is_visible()else'ready'if layer and '等待' in title else'paused'if layer else'running','title':title,'hud':p.locator('#hud').inner_text(),'pauseText':p.locator('#pause').inner_text(),'pauseDisabled':p.locator('#pause').is_disabled()}
    if g=='island':return {'state':p.evaluate('document.body.dataset.state'),'turn':p.locator('#turn').inner_text(),'cash':p.locator('#cash').inner_text(),'pauseText':p.locator('#pause').inner_text(),'pauseDisabled':p.locator('#pause').is_disabled()}
    d=p.evaluate("async()=> (await import(document.querySelector('script[type=module][src]').src)).diagnostics()");return {'state':d['state'],'time':d['time'],'lives':d['lives'],'collected':d['stats']['collected'],'pauseText':p.locator('#pause').inner_text(),'pauseDisabled':p.locator('#pause').is_disabled(),'touchText':p.locator('#touch-pause').inner_text(),'touchDisabled':p.locator('#touch-pause').is_disabled()}
   def inspect(sel,enabled=True):
    x=p.locator(sel);assert x.count()==1;x.scroll_into_view_if_needed();q=x.bounding_box();assert q and q['x']>=0 and q['y']>=0 and q['x']+q['width']<=size['width']+.5 and q['y']+q['height']<=size['height']+.5
    if enabled:assert x.is_enabled()
    return x,q
   def click(sel):
    x,q=inspect(sel)
    if label=='narrow':x.tap()
    else:x.click()
   def raw(sel):
    x,q=inspect(sel,False)
    if label=='narrow':p.touchscreen.tap(q['x']+q['width']/2,q['y']+q['height']/2)
    else:p.mouse.click(q['x']+q['width']/2,q['y']+q['height']/2)
   def record(n,desc):
    name=label+'-'+str(n)+'.png';p.screenshot(path=str(O/name));v['steps'].append({'step':n,'description':desc,'health':'passed','state':snap(),'screenshot':name});save();print(g+'-'+label+' step'+str(n)+' '+snap()['state'],flush=True)
   if g=='island'and p.locator('#help-dialog').is_visible():click('#help-confirm')
   s=snap();assert s['state']=='ready'and s['pauseDisabled'];pauseSel='#touch-pause'if g=='lantern'and label=='narrow'else'#pause'
   if g=='lantern':assert s['touchDisabled'];inspect(pauseSel,False)
   else:inspect('#pause',False)
   record(1,'待命暂停禁用，开始入口明确保留');raw(pauseSel);p.keyboard.press('p');p.wait_for_timeout(700);assert snap()==s;record(2,'普通点禁用暂停及P均不误启动')
   click('#resume'if g=='expedition'else'#start'if g=='island'else'#primary-action')
   if g=='lantern'and p.locator('#help-dialog').is_visible():click('#help-confirm')
   p.wait_for_timeout(1200 if g=='expedition'else 220);assert snap()['state']in['running','playing'];click(pauseSel);s=snap();assert s['state']=='paused'and s['pauseText'].startswith('继续')and not s['pauseDisabled'];p.wait_for_timeout(700);assert snap()==s;record(3,'明确开始后可暂停，计时/回合冻结且显示继续')
   click(pauseSel);p.wait_for_timeout(220);assert snap()['state']in['running','playing'];click(pauseSel);assert snap()['state']=='paused';record(4,'同一按钮继续及再次暂停，保留当前局')
   if g in ['expedition','island']:
    s=snap();p.reload(wait_until='networkidle');assert snap()['state']=='paused';assert snap().get('hud',snap().get('turn'))==s.get('hud',s.get('turn'));record(5,'真实当前局刷新先暂停，资源/回合保留')
   if a.terminal and label=='desktop':
    if g=='island':
     click('#pause')
     for turn in range(12):
      if snap()['state']in['won','lost','chapter']:break
      click('#end-turn');assert p.locator('#confirm-dialog').is_visible();click('#confirm-action')
     assert snap()['state']in['won','lost','chapter'];v['terminalKind']='native confirmed empty-city turns'
    else:
     click(pauseSel);deadline=time.monotonic()+(135 if g=='expedition'else 100);nextPrint=time.monotonic()
     while snap()['state']not in['terminal','won','lost']and time.monotonic()<deadline:
      if time.monotonic()>=nextPrint:print(g+' native wait '+json.dumps(snap(),ensure_ascii=False),flush=True);nextPrint=time.monotonic()+20
      p.wait_for_timeout(5000)
     assert snap()['state']in['terminal','won','lost'],'bounded ordinary terminal not reached';v['terminalKind']='native idle elapsed time and original enemies/round rules'
    terminal=snap();assert terminal['pauseDisabled'];raw(pauseSel);p.keyboard.press('p');p.wait_for_timeout(350);assert snap()==terminal
    if g=='lantern':assert snap()['touchDisabled']
    record(6,'自然终态暂停禁用，P及普通点按不重开、不恢复计时')
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close()
  b.close()
 assert not any(r[k]for k in['consoleErrors','httpErrors','requestFailures']);r['status']='passed';save();print(json.dumps({'game':g,'status':'passed','views':[{'view':x['view'],'steps':len(x['steps'])}for x in r['views']]},ensure_ascii=False),flush=True)
except Exception:
 r['status']='failed';r['failure']=traceback.format_exc();save();raise
