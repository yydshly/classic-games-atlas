from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,base64,argparse
ap=argparse.ArgumentParser();ap.add_argument('--base',default='http://127.0.0.1:58258/');ap.add_argument('--short',action='store_true');a=ap.parse_args()
R=Path('.local/glimmer-restart-round');O=R/('online'if a.short else'local');O.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True);os.environ['TMP']=os.environ['TEMP']=str((R/'tmp').resolve())
out={'method':'Fresh ordinaryUI verifies active play/reset. Completed-state UI uses explicitly model-derived valid old-format fixture because prior temporary browser left no persistent completed session. No new natural three-stage run.','base':a.base,'errors':[],'httpErrors':[]}
fixture=json.loads((R/'completed-model-fixture.json').read_text(encoding='utf-8'));KEY='classic-atlas.glimmer.v1';foreign='classic-atlas.windowlife.v1'
with sync_playwright()as pw:
 b=pw.chromium.launch()
 def context(complete=False,small=False):
  c=b.new_context(viewport={'width':390 if small else 1440,'height':844 if small else 1000});p=c.new_page();p.on('pageerror',lambda e:out['errors'].append(str(e)));p.on('console',lambda m:out['errors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:out['httpErrors'].append(x.url)if x.status>=400 else None)
  c.add_init_script('if(localStorage.getItem('+json.dumps(foreign)+')===null)localStorage.setItem('+json.dumps(foreign)+',"other-game-sentinel");'+('if(localStorage.getItem('+json.dumps(KEY)+')===null)localStorage.setItem('+json.dumps(KEY)+',JSON.stringify('+json.dumps(fixture,ensure_ascii=False)+'));'if complete else''));p.goto(a.base+'preview/glimmer/',wait_until='domcontentloaded');ready(p);return c,p
 def ready(p):p.evaluate('async()=>{window.__observe=(await import(document.querySelector("script[type=module]").src)).diagnostics}')
 def g(p):return p.evaluate('window.__observe.snapshot()')
 def progress(p):return p.evaluate('window.__observe.progress()')
 def raw(p):return p.evaluate('localStorage.getItem("classic-atlas.glimmer.v1")')
 def shot(p,name,sel='#journey-dialog'):
  p.locator(sel).scroll_into_view_if_needed();d=p.context.new_cdp_session(p);(O/(name+'.png')).write_bytes(base64.b64decode(d.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']));d.detach()
 def initial(p):
  s=g(p);v=progress(p);assert s['state']=='ready'and s['level']==1 and s['time']==0 and s['player']['gear']=={'weapon':'worn','charm':None};assert s['stats']['loot']==0 and s['kills']==0 and s['heals']==1;assert v['unlocked']==1 and v['completed']=={}and list(v['entries'])==['1'];assert p.evaluate('localStorage.getItem("classic-atlas.windowlife.v1")')=='other-game-sentinel';assert p.evaluate('document.activeElement.id')=='toggle'
 c=None
 try:
  # OrdinaryUI active case, no completion fixture.
  c,p=context(small=True);assert g(p)['state']=='ready';p.locator('#toggle').press('Enter');p.locator('#interact').click();p.locator('[data-choose=hammer]').press('Enter');p.locator('#battle').focus();p.keyboard.down('d');p.keyboard.down('j');p.wait_for_timeout(180);p.keyboard.up('d');p.keyboard.up('j');assert g(p)['player']['gear']['weapon']=='hammer'
  p.locator('#new-journey').press('Enter');p.wait_for_function('document.querySelector("#journey-dialog").open');assert p.evaluate('document.activeElement.id')=='journey-cancel';assert g(p)['state']=='paused';before=g(p);beforeProgress=progress(p);assert before['stats']['loot']==1;assert not p.evaluate('window.__observe.input().keys.length');shot(p,'active-confirm-390');p.keyboard.press('Enter');assert not p.locator('#journey-dialog').evaluate('e=>e.open');assert g(p)==before and progress(p)==beforeProgress;assert p.evaluate('document.activeElement.id')=='new-journey';out['ordinaryActiveCancelKeepsGearProgressPaused']=True
  p.locator('#new-journey').press('Enter');p.keyboard.press('Escape');assert g(p)==before;out['escapeKeepsProgress']=True;p.locator('#new-journey').click();assert g(p)==before;p.locator('#journey-confirm').press('Enter');initial(p);shot(p,'new-journey-ready-390','#battle');p.wait_for_timeout(200);assert g(p)['time']==0 and not progress(p)['completed'];p.reload(wait_until='domcontentloaded');ready(p);assert g(p)['state']=='ready'and progress(p)['unlocked']==1 and progress(p)['completed']=={};out['ordinaryConfirmInitialAndRefresh']=True;assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
  # Original stage-retry behaviour still restores only current entry and gives no reward.
  p.on('dialog',lambda d:d.accept());p.locator('#toggle').press('Enter');p.locator('#interact').click();p.locator('[data-choose=blade]').press('Enter');assert g(p)['stats']['loot']==1;p.locator('#retry').click();assert g(p)['state']=='ready'and g(p)['player']['gear']['weapon']=='worn'and progress(p)['completed']=={};out['stageRetryUnchangedNoDuplicateLoot']=True;c.close();c=None
  if not a.short:
   # Explicit completed old-format fixture: not claimed as natural UI victory.
   c,p=context(complete=True);assert g(p)['state']=='won'and len(progress(p)['completed'])==3;before=progress(p);oldraw=raw(p);p.locator('#result-new-journey').press('Enter');assert p.evaluate('document.activeElement.id')=='journey-cancel';shot(p,'completed-confirm-desktop');p.locator('#journey-cancel').press('Enter');assert progress(p)==before and raw(p)==oldraw;assert p.evaluate('document.activeElement.id')=='result-new-journey';out['completedFixtureCancelExactOldBytes']=True
   p.set_viewport_size({'width':390,'height':844});p.locator('#result-new-journey').press('Enter');shot(p,'completed-confirm-390');p.locator('#journey-confirm').press('Enter');initial(p);p.reload(wait_until='domcontentloaded');ready(p);assert g(p)['state']=='ready'and progress(p)['completed']=={};out['completedFixtureConfirmedAndRefresh']=True;c.close();c=None
   # Failure to persist reset must retain original completed bytes and say so.
   c,p=context(complete=True,small=True);oldraw=raw(p);p.locator('#result-new-journey').click();p.evaluate('()=>{Storage.prototype.setItem=function(){throw new DOMException("quota fixture","QuotaExceededError")}}');p.locator('#journey-confirm').press('Enter');assert g(p)['state']=='ready'and raw(p)==oldraw and p.locator('#storage-warning').is_visible();assert '未能保存'in p.locator('#storage-warning').inner_text();out['quotaFixtureResetTemporaryOldBytesPreserved']=True;c.close();c=None
  assert not out['errors']and not out['httpErrors'],out;out['passed']=True
 except Exception as e:
  out['failure']=repr(e)
  try:out['last']=g(p);shot(p,'failure','#battle')
  except:pass
  raise
 finally:
  (O/'report.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
  if c:c.close()
  b.close()
print(json.dumps(out,ensure_ascii=False))
