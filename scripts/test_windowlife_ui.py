from pathlib import Path
import json,time,base64,os,argparse
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--base',default='http://127.0.0.1:58257/');ap.add_argument('--short',action='store_true');ap.add_argument('--controls-only',action='store_true');args=ap.parse_args()
R=Path('.local/windowlife-round');R.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True);O=R/('online'if args.short else'controls'if args.controls_only else'local');O.mkdir(exist_ok=True);os.environ['TMP']=os.environ['TEMP']=str((R/'tmp').resolve())
report={'method':'Ordinary page buttons, normal real-time engine. Read-only telemetry used to time known legal arrangements; no save/time/win injection. Touch is trusted Chromium CDP simulation, not hardware. Storage fault injection is separately labelled.','base':args.base,'days':[],'errors':[],'httpErrors':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1100},has_touch=True);p=c.new_page();d=c.new_cdp_session(p)
 p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('console',lambda m:report['errors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None)
 def ready():p.evaluate('async()=>{window.__observe=(await import(document.querySelector("script[type=module]").src)).diagnostics}')
 def diag():return p.evaluate('window.__observe.snapshot()')
 def progress():return p.evaluate('window.__observe.progress()')
 def shot(name,selector=None):
  if selector:p.locator(selector).scroll_into_view_if_needed()
  (O/(name+'.png')).write_bytes(base64.b64decode(d.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
 def enqueue(actor,kind):
  p.locator('[data-actor="'+actor+'"]').click();target={'cook':'stove','eat':'bench','work':'desk','wash':'basin','sleep':'bed','relax':'bench','chat':'bench','dinner':'bench'}[kind];p.locator('[data-object="'+target+'"]').click();p.locator('[data-action="'+kind+'"]').click();assert '最多'not in p.locator('#feedback').inner_text(),p.locator('#feedback').inner_text()
 def at(seconds):p.wait_for_function('(t)=>window.__observe.snapshot().time>=t||["won","lost"].includes(window.__observe.snapshot().state)',arg=seconds,timeout=(seconds+15)*1000)
 def win(day):
  p.wait_for_function('window.__observe.snapshot().state==="won"',timeout=120000);g=diag();assert g['level']==day and all(v['done']for v in g['goals']);report['days'].append({'level':day,'time':g['time'],'needs':[a['needs']for a in g['actors']],'completed':[a['completed']for a in g['actors']],'visible':p.locator('#result').inner_text()});shot('day'+str(day)+'-complete','#result');flush();print(json.dumps({'day':day,'won':g['time']}),flush=True)
 try:
  p.goto(args.base+'preview/windowlife/',wait_until='domcontentloaded');ready();assert diag()['state']=='ready';shot('ready-desktop');assert p.locator('[data-action=cook]').count()==1
  p.locator('#toggle').focus();p.keyboard.press('Enter');assert diag()['state']=='playing';p.locator('#toggle').press('Enter');assert diag()['state']=='paused';p.locator('#toggle').press('Enter');p.wait_for_timeout(500);p.evaluate('window.open("about:blank","_blank")');q=c.pages[-1];q.bring_to_front();p.wait_for_timeout(300);q.close();p.bring_to_front()
  # Real tab focus switch: headless browser may not emit visibility change; record actual behaviour.
  report['tabSwitchObservedState']=diag()['state']
  if diag()['state']=='playing':p.locator('#toggle').click()
  before=diag();p.reload(wait_until='domcontentloaded');ready();after=diag();assert after['state']=='paused';assert before['ticks']==after['ticks'];report['activeRefreshPausedExact']=True
  p.on('dialog',lambda x:x.accept());p.locator('#retry').click();assert diag()['state']=='ready'
  if not args.short and not args.controls_only:
   for kind in['cook','eat','wash']:enqueue('a',kind)
   p.locator('#toggle').click();at(20);enqueue('a','work');win(1)
   first=progress()['completed'];p.reload(wait_until='domcontentloaded');ready();assert diag()['state']=='won'and progress()['completed']==first;report['wonRefresh']=True
   p.locator('#next').click();assert diag()['level']==2 and diag()['state']=='ready';p.locator('#toggle').click();p.wait_for_function('window.__observe.snapshot().state==="lost"',timeout=120000);assert progress()['completed']==first;shot('day2-natural-failure','#result');report['naturalFailure']={'time':diag()['time'],'reason':diag()['reason'],'priorResultsPreserved':True};flush();print('day2 natural failure -> retry',flush=True)
   p.reload(wait_until='domcontentloaded');ready();assert diag()['state']=='lost'and progress()['completed']==first;p.locator('#result-retry').click();assert diag()['state']=='ready'and diag()['time']==0 and progress()['completed']==first
   for actor,kinds in [('a',['cook','eat','wash']),('b',['cook','wash','work'])]:
    for kind in kinds:enqueue(actor,kind)
   p.locator('#toggle').click();at(10);p.locator('#toggle').click();before=diag();p.reload(wait_until='domcontentloaded');ready();after=diag();assert after['state']=='paused'
   for k in['actors','objects','time','ticks','meals']:assert before[k]==after[k],k
   report['activeJobsRefreshExact']=True;shot('day2-active-desktop');p.locator('#toggle').click();at(22);enqueue('a','work');at(32);enqueue('b','eat');at(44);enqueue('a','chat');win(2)
   p.locator('#next').click();assert diag()['level']==3; p.set_viewport_size({'width':390,'height':844});shot('day3-ready-390');assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
   for actor,kind in [('a','cook'),('a','work'),('b','cook'),('b','work')]:enqueue(actor,kind)
   p.locator('#toggle').click();at(30);enqueue('a','dinner');at(35);shot('day3-waiting-390','#actors');win(3)
   final=progress();assert len(final['completed'])==3 and p.locator('#next').is_hidden();p.reload(wait_until='domcontentloaded');ready();assert diag()['state']=='won'and progress()==final;report['finalRefreshExactNoFourthDay']=True;shot('three-days-review-390','#result');p.set_viewport_size({'width':1440,'height':1100});shot('three-days-review-desktop','#result')
   p.locator('[data-day="0"]').click();assert diag()['state']=='ready'and len(progress()['completed'])==3;report['replayKeepsPreviousResults']=True
  # Trusted touch simulation: tap actor/furniture, enqueue, cancel, start/pause; no required drag or continuous hold.
  p.set_viewport_size({'width':390,'height':844});d.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});p.evaluate('window.__touch=[];document.addEventListener("pointerdown",e=>window.__touch.push({type:e.pointerType,trusted:e.isTrusted}))')
  def tap(sel):
   e=p.locator(sel);e.scroll_into_view_if_needed();bb=e.bounding_box();point={'id':1,'x':bb['x']+bb['width']/2,'y':bb['y']+bb['height']/2,'radiusX':4,'radiusY':4,'force':1};d.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});d.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[point]});p.wait_for_timeout(70)
  tap('[data-actor=a]');tap('[data-object=stove]');tap('[data-action=cook]');assert len(diag()['actors'][0]['queue'])==1;tap('[data-cancel]');assert len(diag()['actors'][0]['queue'])==0;tap('[data-action=cook]');tap('#toggle');p.wait_for_timeout(500);tap('#toggle');assert diag()['state']=='paused';frozen=diag();p.wait_for_timeout(250);assert diag()==frozen;shot('touch-paused-390','#room');events=p.evaluate('window.__touch');assert len(events)>=7 and all(e['trusted']and e['type']=='touch'for e in events);report['touchSimulation']={'trustedEvents':len(events),'tapEnqueueCancelStartPause':True,'hardware':False};assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
  # Test no shortcut interception on a native link.
  p.locator('.mast .back').focus();assert p.evaluate('document.activeElement.tagName')=='A';report['keyboardNativeButtons']=True
  if args.short:
   p.keyboard.press('Enter');p.wait_for_url(args.base+'#play-library',wait_until='domcontentloaded');p.wait_for_function('document.querySelector("#play-result-count")?.textContent.includes("/ 41")');report['directoryText']=p.locator('#play-result-count').inner_text();p.locator('#play-search').fill('栖窗');p.locator('#play-grid [data-play=windowlife] .play-launch').press('Enter');p.wait_for_url('**/preview/windowlife/',wait_until='domcontentloaded');ready();report['reenteredState']=diag()['state'];assert diag()['state']=='paused','reentry state';p.locator('.back').press('Enter');p.wait_for_function('document.activeElement?.matches("#play-grid [data-play=windowlife] .play-launch")');assert p.locator('#play-search').input_value()=='栖窗','return query';report['onlineDirectory41AndReturn']=True
  assert not report['errors']and not report['httpErrors'],(report['errors'],report['httpErrors']);report['passed']=True
 except Exception as e:
  report['failure']=repr(e)
  try:report['last']=diag();shot('failure')
  except:pass
  raise
 finally:flush();c.close();b.close()
print(json.dumps({'passed':report['passed'],'days':len(report['days'])}),flush=True)
