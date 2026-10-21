import json,pathlib,os,argparse,time,traceback
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('game',choices=['cloud','petal','fortress']);ap.add_argument('--base',default='https://yydshly.github.io/classic-games-atlas');ap.add_argument('--out',required=True);ap.add_argument('--before',action='store_true');ap.add_argument('--terminal',action='store_true');a=ap.parse_args();g=a.game;R=pathlib.Path('.local/pause-followup-round');O=pathlib.Path(a.out);O.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TMP']=os.environ['TEMP']=str((R/'tmp').resolve());entry=next(x for x in json.loads(pathlib.Path('docs/flow-coverage/coverage.json').read_text(encoding='utf-8'))['items']if x['slug']==g);r={'game':g,'base':a.base,'mode':'original public probe'if a.before else'verification','method':'Native UI only; copied diagnostics/DOM observations. No injected state/save/time/result.390CSS is emulation. Petal terminal uses four official-hint pairs as real unlock prerequisite, then four ordinary invalid pairs; not an independent win or20-page run.','views':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
def save(): (O/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
try:
 with sync_playwright()as pw:
  b=pw.chromium.launch(timeout=20000)
  for label,size in [('desktop',{'width':1440,'height':1050}),('narrow',{'width':390,'height':844})]:
   print(g+'-'+label,flush=True);c=b.new_context(viewport=size,is_mobile=label=='narrow',has_touch=label=='narrow');p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append(x.url));p.goto(a.base.rstrip('/')+'/'+entry['playUrl'],wait_until='networkidle',timeout=25000);v={'view':label,'steps':[]};r['views'].append(v)
   def diag():return p.evaluate('()=>window.__fortress.snapshot()')if g=='fortress'else p.evaluate("async()=> (await import(document.querySelector('script[type=module][src]').src)).diagnostics()")
   def wait_stable():
    until=time.monotonic()+5
    while time.monotonic()<until:
     d=diag()
     if d['state'] in ['won','lost'] or d.get('phase')=='stable':return d
     p.wait_for_timeout(50)
    raise AssertionError('Real copied state did not reach stable/terminal within5s')
   def snap():
    d=diag();z={'state':d['state'],'time':d.get('time'),'score':d.get('score',d.get('stats',{}).get('score')),'hp':d.get('player',{}).get('hp',d.get('base',{}).get('hp')),'level':d.get('level',d.get('index')),'pauseDisabled':p.locator('#pause').is_disabled(),'pauseText':p.locator('#pause').inner_text()}
    if g!='fortress':z.update(touchDisabled=p.locator('#touch-pause').is_disabled(),touchText=p.locator('#touch-pause').inner_text())
    if g=='petal':z.update(pairs=d['pairs'],mistakes=d['mistakes'],phase=d['phase'])
    return z
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
    name=label+'-'+str(n)+'.png';p.screenshot(path=str(O/name));v['steps'].append({'step':n,'description':desc,'state':snap(),'screenshot':name,'health':'observed'if a.before else'passed'});save();print(g+'-'+label+' step'+str(n)+' '+snap()['state'],flush=True)
   s=snap();assert s['state']=='ready';sel='#touch-pause'if label=='narrow'and g!='fortress'else'#pause';expectedMain=not(a.before and g=='fortress');expectedTouch=not(a.before and g=='cloud');assert s['pauseDisabled']==expectedMain
   if g!='fortress':assert s['touchDisabled']==expectedTouch
   inspect(sel,False);record(1,'待命按钮真实可用性');raw(sel);p.keyboard.press('p');p.wait_for_timeout(600);assert snap()==s;record(2,'普通点按暂停和P未启动新局')
   click('#primary'if g=='fortress'else'#primary-action')
   if g!='fortress'and p.locator('#help-dialog').is_visible():click('#help-confirm')
   p.wait_for_timeout(220);assert snap()['state']=='playing';click(sel);s=snap();assert s['state']=='paused'and s['pauseText'].startswith('继续');p.wait_for_timeout(650);assert snap()==s;record(3,'明确开始后暂停冻结，文案为继续');click(sel);p.wait_for_timeout(220);click(sel);assert snap()['state']=='paused';record(4,'同一按钮继续及再次暂停，保留当前局')
   if not a.before:
    before=diag();p.reload(wait_until='networkidle');restored=snap();assert restored['state']==('paused'if g=='petal'else'ready');assert restored['pauseDisabled']==(g!='petal')
    if g=='petal':assert diag()['board']==before['board']and diag()['mistakes']==before['mistakes']
    record(5,'刷新遵循原设计：花笺暂停续局，云隙/堡垒回整备并保留记录')
   if a.terminal and label=='desktop':
    if g=='petal':
     click('#pause')
     for _ in range(4):
      r.setdefault('hintPrerequisiteChecks',[]).append(snap());save();p.wait_for_function("()=>!document.querySelector('#hint').disabled",timeout=5000);click('#hint');pair=diag()['hint'];assert pair and len(pair)==2
      for index in pair:click('#board [data-index="'+str(index)+'"]')
      wait_stable()
     d=diag();assert d['state']=='won'and d['unlocked']==2;v['officialHintPrerequisite']={'pairs':4,'state':d['state'],'unlocked':d['unlocked'],'best':d['best']};assert p.locator('#pause').is_disabled()and p.locator('#touch-pause').is_disabled();click('#primary-action');assert diag()['level']==2
     for i in range(4):
      for index in [1,6]:click('#board [data-index="'+str(index)+'"]')
      wait_stable()
     assert diag()['state']=='lost'and diag()['lossReason']=='mistakes';v['terminalMethod']='normal second-letter invalid matching pair1/6 four times after official-hint prerequisite'
    else:
     click('#primary'if g=='fortress'else'#primary-action')
     if g=='cloud'and p.locator('#help-dialog').is_visible():click('#help-confirm')
     deadline=time.monotonic()+135;nextPrint=time.monotonic()
     while snap()['state']not in['won','lost','expired']and time.monotonic()<deadline:
      if time.monotonic()>=nextPrint:print(g+' native wait '+json.dumps(snap(),ensure_ascii=False),flush=True);nextPrint=time.monotonic()+20
      p.wait_for_timeout(5000)
     assert snap()['state']in['won','lost','expired'],'bounded natural terminal not reached';v['terminalMethod']='original idle rules and real elapsed time'
    s=snap();assert s['pauseDisabled'];raw(sel);p.keyboard.press('p');p.wait_for_timeout(300);assert snap()==s
    if g!='fortress':assert snap()['touchDisabled']
    record(6,'真实终态暂停禁用，P及点按不重开/恢复')
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close()
  b.close()
 assert not any(r[k]for k in['consoleErrors','httpErrors','requestFailures']);r['status']='passed';save();print(json.dumps({'game':g,'status':'passed','steps':[len(v['steps'])for v in r['views']]}),flush=True)
except Exception:
 r['status']='failed';r['failure']=traceback.format_exc();save();raise
