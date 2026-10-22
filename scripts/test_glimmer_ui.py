from pathlib import Path
import json,time,subprocess,os,base64,argparse
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--base',default='http://127.0.0.1:58258/');ap.add_argument('--short',action='store_true');a=ap.parse_args()
R=Path('.local/glimmer-round');O=R/('online'if a.short else'local');O.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True);os.environ['TMP']=os.environ['TEMP']=str((R/'tmp').resolve())
out={'method':'Normal native keyboard/buttons. A read-only full-visible-state policy suggests input at roughly100ms; wall-clock game time runs normally. No game/time/health/loot/win injection. Touch via Chromium CDP, not hardware.','base':a.base,'stages':[],'errors':[],'httpErrors':[]}
def flush():(O/'report.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
w=subprocess.Popen(['node',str(Path('scripts/glimmer-policy-bridge.mjs').resolve())],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
def policy(g):w.stdin.write(json.dumps({'game':g,'options':{'weapon':'blade','charm':'ward'}})+'\n');w.stdin.flush();r=json.loads(w.stdout.readline());assert 'error'not in r,r;return r
with sync_playwright()as pw:
 b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1100},has_touch=True);p=c.new_page();d=c.new_cdp_session(p)
 p.on('pageerror',lambda e:out['errors'].append(str(e)));p.on('console',lambda m:out['errors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:out['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None)
 def ready():p.evaluate('async()=>{window.__observe=(await import(document.querySelector("script[type=module]").src)).diagnostics}')
 def g():return p.evaluate('window.__observe.snapshot()')
 def progress():return p.evaluate('window.__observe.progress()')
 def inp():return p.evaluate('window.__observe.input()')
 def shot(n,sel='#battle'):
  p.locator(sel).scroll_into_view_if_needed();(O/(n+'.png')).write_bytes(base64.b64decode(d.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
 keys={'w':'KeyW','a':'KeyA','s':'KeyS','d':'KeyD','j':'KeyJ','k':'KeyK','Space':'Space'}
 def release():
  for k in keys:p.keyboard.up(k)
 try:
  p.goto(a.base+'preview/glimmer/',wait_until='domcontentloaded');ready();assert g()['state']=='ready';shot('ready-desktop');p.on('dialog',lambda x:x.accept());p.locator('#toggle').press('Enter');assert g()['state']=='playing'
  if a.short:
   p.locator('#battle').focus();p.keyboard.down('d');p.wait_for_timeout(300);p.keyboard.up('d');p.locator('#toggle').click();before=g();p.reload(wait_until='domcontentloaded');ready();after=g();assert after['state']=='paused'
   for k in['player','enemies','time','chests','stats']:assert before[k]==after[k],k
   out['onlineActiveRefreshExact']=True
  else:
   for stage in range(1,4):
    if stage>1:
     p.locator('#next').press('Enter');assert g()['state']=='ready'and g()['level']==stage
     if stage==2:
      first=progress()['completed'];p.locator('#toggle').press('Enter');p.wait_for_function('window.__observe.snapshot().state==="lost"',timeout=100000);lost=g();assert progress()['completed']==first;shot('stage2-natural-failure','#result');out['naturalFailure']={'time':lost['time'],'reason':lost['reason'],'priorResultsPreserved':True};p.reload(wait_until='domcontentloaded');ready();assert g()['state']=='lost';p.locator('#result-retry').press('Enter');assert g()['state']=='ready'and progress()['completed']==first and g()['player']['gear']==g()['entryGear'];out['retryKeepsEntryGearAndPriorResults']=True
     if stage==3:p.set_viewport_size({'width':390,'height':844})
     p.locator('#toggle').press('Enter')
    deadline=time.monotonic()+90;paused=False;choice_seen=False;phase_seen=False;samples=[]
    while time.monotonic()<deadline:
     stamp=time.monotonic();s=g();assert not out['errors'],out['errors']
     if s['state']in['won','lost']:break
     if stage==2 and not paused and s['time']>2 and s['state']=='playing':
      release();p.locator('#toggle').click();before=g();p.reload(wait_until='domcontentloaded');ready();after=g();assert after['state']=='paused'
      for k in['player','enemies','time','chests','stats','projectiles']:assert before[k]==after[k],k
      assert not inp()['keys']and inp()['touches']==0;out['activeRefreshExactInputClear']=True;shot('stage2-restored-desktop');p.locator('#toggle').press('Enter');paused=True;continue
     if any(e['type']=='warden'and e['phase']==2 for e in s['enemies'])and not phase_seen:phase_seen=True;shot('warden-phase2-390');out['actualBossPhase2Seen']=True
     value=policy(s);cmd=value.get('command')
     if cmd:
      release();kind=cmd['type']
      if kind=='start':p.locator('#toggle').press('Enter')
      elif kind=='choose':
       if not choice_seen:
        shot('stage'+str(stage)+'-loot-choice','#loot-dialog');frozen=g();p.wait_for_timeout(250);assert g()['time']==frozen['time'];p.reload(wait_until='domcontentloaded');ready();assert g()['state']=='choosing'and g()['choice']==frozen['choice'];choice_seen=True;out['choiceRefreshStoppedExact']=True
       p.locator('[data-choose="'+cmd['gearId']+'"]').press('Enter');assert g()['player']['gear'][('weapon'if stage==1 else'charm')]==cmd['gearId']
      elif kind=='heal':p.locator('#battle').focus();p.keyboard.press('h')
      else:p.locator('#battle').focus();p.keyboard.press('e')
     else:
      v=value['input'];want=set();
      if v['x']:want.add('d'if v['x']>0 else'a')
      if v['y']:want.add('s'if v['y']>0 else'w')
      if v.get('attack'):want.add('j')
      if v.get('skill'):want.add('k')
      if v.get('dodge'):want.add('Space')
      current=inp()['keys']
      for key,code in keys.items():
       if key not in want:p.keyboard.up(key)
       elif code not in current:p.keyboard.down(key)
     p.wait_for_timeout(max(10,(.1-(time.monotonic()-stamp))*1000))
    release();s=g();assert s['state']=='won',{'stage':stage,'game':s};assert all(x['done']for x in s['goals']if not x.get('optional'));out['stages'].append({'stage':stage,'time':s['time'],'hp':s['player']['hp'],'gear':s['player']['gear'],'stats':s['stats'],'kills':s['kills'],'sideChest':s['chests'],'visible':p.locator('#result').inner_text()});shot('stage'+str(stage)+'-won','#result');flush();print(json.dumps({'stage':stage,'time':s['time'],'hp':s['player']['hp']}),flush=True)
    before=progress();p.reload(wait_until='domcontentloaded');ready();assert g()['state']=='won'and progress()==before;out['terminalRefreshExact']=True
   assert len(progress()['completed'])==3 and p.locator('#next').is_hidden();out['threeStageReviewNoFourth']=True;shot('final-review-390','#result');p.set_viewport_size({'width':1440,'height':1100});shot('final-review-desktop','#result');p.locator('#result-retry').press('Enter');assert g()['state']=='ready'and len(progress()['completed'])==3;p.locator('#toggle').press('Enter');p.locator('#toggle').click();out['replayKeepsResults']=True
  # Touch uses an active map but does not fake successful combat. Test2contacts and partial/cancel/outside release.
  p.set_viewport_size({'width':390,'height':844});d.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});p.evaluate('window.__touch=[];document.addEventListener("pointerdown",e=>window.__touch.push({type:e.pointerType,trusted:e.isTrusted}))');p.locator('#toggle').press('Enter');assert g()['state']=='playing';p.locator('.control-deck').scroll_into_view_if_needed();points={}
  def pt(sel):bb=p.locator(sel).bounding_box();return {'x':bb['x']+bb['width']/2,'y':bb['y']+bb['height']/2,'radiusX':4,'radiusY':4,'force':1}
  def send(t):d.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':list(points.values())});p.wait_for_timeout(60)
  def down(i,sel):points[i]={'id':i,**pt(sel)};send('touchStart')
  def up(i):d.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[points.pop(i)]});p.wait_for_timeout(60)
  y=p.evaluate('scrollY');beforeTouch=g();down(1,'[data-hold=right]');down(2,'[data-hold=attack]');p.wait_for_timeout(160);assert inp()['touches']==2 and inp()['attack'] and g()['player']['x']>beforeTouch['player']['x'] and g()['stats']['attacks']>beforeTouch['stats']['attacks'];up(2);assert inp()['touches']==1 and not inp()['attack'];points[1]['x']-=70;points[1]['y']-=70;send('touchMove');up(1);assert inp()['touches']==0 and p.evaluate('scrollY')==y;down(1,'[data-hold=left]');down(2,'[data-hold=attack]');points.clear();send('touchCancel');assert inp()['touches']==0;out['touchSimulation']={'twoContacts':True,'partialRelease':True,'outsideRelease':True,'cancel':True,'scrollStable':True,'hardware':False,'trustedTouchEvents':p.evaluate('window.__touch.filter(e=>e.type==="touch"&&e.trusted).length')};p.locator('#toggle').click();assert g()['state']=='paused'and not inp()['keys']and not inp()['touches'];shot('touch-paused-390');assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
  if a.short:
   p.locator('.back').focus();p.keyboard.press('Enter');p.wait_for_url(a.base+'#play-library',wait_until='domcontentloaded');p.wait_for_function('document.querySelector("#play-result-count")?.textContent.includes("/ 42")');p.locator('#play-search').fill('砾光');p.locator('#play-grid [data-play=glimmer] .play-launch').press('Enter');p.wait_for_url('**/preview/glimmer/',wait_until='domcontentloaded');ready();assert g()['state']=='paused';p.locator('.back').press('Enter');p.wait_for_function('document.activeElement?.matches("#play-grid [data-play=glimmer] .play-launch")');assert p.locator('#play-search').input_value()=='砾光';out['catalogue42NativeReturn']=True
  assert not out['errors']and not out['httpErrors'],out;out['passed']=True
 except Exception as e:
  out['failure']=repr(e)
  try:out['last']=g();shot('failure')
  except:pass
  raise
 finally:flush();c.close();b.close();w.stdin.close();w.wait(timeout=5)
print(json.dumps({'passed':out['passed'],'stages':len(out['stages'])}),flush=True)
