from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os
R=Path('.local/glimmer-round');R.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True);os.environ['TMP']=os.environ['TEMP']=str((R/'tmp').resolve());out={'method':'Separate native browser storage fault fixtures and synthetic blur. No victory/health/time/save-success injection. Not real device storage or OS-background acceptance.','errors':[]}
with sync_playwright()as w:
 b=w.chromium.launch();c=b.new_context(viewport={'width':390,'height':844});p=c.new_page();p.on('pageerror',lambda e:out['errors'].append(str(e)))
 def ready():p.evaluate('async()=>window.__observe=(await import(document.querySelector("script[type=module]").src)).diagnostics')
 def g():return p.evaluate('window.__observe.snapshot()')
 try:
  p.goto('http://127.0.0.1:58258/preview/glimmer/',wait_until='domcontentloaded');ready();p.locator('#toggle').press('Enter');p.locator('#interact').click();assert g()['state']=='choosing';p.locator('[data-choose=blade]').press('Enter');raw=p.evaluate('localStorage.getItem("classic-atlas.glimmer.v1")');assert raw
  p.evaluate('()=>{window.__originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="classic-atlas.glimmer.v1")throw new DOMException("quota fixture","QuotaExceededError");return window.__originalSet.call(this,k,v)}}');p.locator('#toggle').click();assert g()['state']=='paused';assert p.locator('#storage-warning').is_visible()and '未能保存'in p.locator('#storage-warning').inner_text();assert p.evaluate('localStorage.getItem("classic-atlas.glimmer.v1")')==raw;p.locator('#toggle').press('Enter');assert g()['state']=='playing';out['quotaFailureKeepsOldBytesAndStillPlayable']=True
  p.evaluate('()=>{Storage.prototype.setItem=window.__originalSet}');p.locator('#toggle').click();assert p.locator('#storage-warning').is_hidden()and p.evaluate('window.__observe.storage().saved');out['successfulWriteClearsFailure']=True
  p.locator('#toggle').press('Enter');p.locator('[data-hold=attack]').focus();before=g()['stats']['attacks'];p.keyboard.press('Enter');p.wait_for_timeout(200);assert g()['stats']['attacks']>before;out['nativeActionButtonEnter']=True
  p.locator('#battle').focus();p.keyboard.down('d');assert p.evaluate('window.__observe.input().keys.includes("KeyD")');p.evaluate('window.dispatchEvent(new Event("blur"))');assert g()['state']=='paused'and not p.evaluate('window.__observe.input().keys.length');frozen=g();p.wait_for_timeout(150);assert g()==frozen;out['syntheticBlurClearsHeldInputAndFreezes']=True
 finally:c.close()
 c=b.new_context();c.add_init_script('localStorage.setItem("classic-atlas.glimmer.v1","{bad original bytes")');p=c.new_page();p.on('pageerror',lambda e:out['errors'].append(str(e)))
 try:
  p.goto('http://127.0.0.1:58258/preview/glimmer/',wait_until='domcontentloaded');ready();assert p.locator('#storage-warning').is_visible()and p.evaluate('window.__observe.storage().protection')=='invalid';p.locator('#toggle').press('Enter');assert g()['state']=='playing'and p.evaluate('localStorage.getItem("classic-atlas.glimmer.v1")')=='{bad original bytes';out['badBytesProtectedTemporaryPlay']=True
 finally:c.close();b.close()
out['passed']=not out['errors'];(R/'fault-report.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(out))
