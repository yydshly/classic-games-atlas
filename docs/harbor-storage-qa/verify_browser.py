import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.harbor.growth.v2'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base',required=True);ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.local/save-followups/tmp');r={'url':a.base,'normalUI':{},'fixtures':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch()
  def page(init=None,mobile=False):
   c=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1050})
   if init:c.add_init_script(init)
   p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append(x.url) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}));p.goto(a.base,wait_until='networkidle',timeout=20000)
   if p.locator('#help-dialog').is_visible():p.locator('#help-close').click()
   return c,p
  def raw(p):return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
  def build(p,e):p.locator(f'[data-build="{e}"]').click();p.locator('#confirm-action').click()
  c,p=page();build(p,'AB');p.locator('#tab-fleet').click();p.locator('#route').fill('A B');p.locator('#ship-type').select_option('skiff');p.locator('#buy-preview').click();p.locator('#confirm-action').click();p.locator('#start').click();p.locator('#step').click();p.locator('#pause').click();assert p.locator('#cash').inner_text()=='3' and p.locator('#turn-count').inner_text()=='1/28',{'cash':p.locator('#cash').inner_text(),'turn':p.locator('#turn-count').inner_text()};fleet=p.locator('#fleet').inner_text();assert '舱 1/1' in fleet;old=raw(p);p.reload(wait_until='networkidle');print(json.dumps({'rawSame':raw(p)==old,'cash':p.locator('#cash').inner_text(),'visibleFleetBefore':fleet,'hiddenFleetAfter':p.locator('#fleet').inner_text()},ensure_ascii=False),flush=True);p.locator('#tab-fleet').click();assert raw(p)==old and p.locator('#cash').inner_text()=='3' and p.locator('#fleet').inner_text()==fleet;assert p.locator('#pause').inner_text()=='继续';p.screenshot(path=str(out/'normal-loaded-cargo-refresh.png'),full_page=True);r['normalUI']={'cash':3,'turn':'1/28','cargo':'1/1','explicitPause':True,'refreshExactRaw':True,'fleetText':fleet,'commands':json.loads(old)['resume']['commands']};c.close()
  old=(ROOT/'docs/harbor-storage-qa/before-old-valid.json').read_text(encoding='utf-8');c,p=page(init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(old)});');assert raw(p)==old and p.locator('#cash').inner_text()=='9';r['fixtures'].append({'case':'genuine old UI channel checkpoint','rawPreserved':True,'cash':9});c.close()
  for i,bad in enumerate(['KEEP ORIGINAL HARBOR',json.dumps({'version':9}),json.dumps({'version':2,'unlocked':1,'last':1,'seen':True,'best':{},'resume':{'version':2,'level':1,'state':'ready','commands':[None]}})]):
   init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(bad)});window.__writes=0;const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k==={json.dumps(KEY)})window.__writes++;return native.call(this,k,v)}};'
   c,p=page(init=init);build(p,'AB');p.locator('#reset').click();build(p,'AB');assert raw(p)==bad and p.evaluate('window.__writes')==0 and '停止覆盖' in p.locator('#save-note').inner_text()
   if i==0:p.screenshot(path=str(out/'bad-protected.png'),full_page=True)
   r['fixtures'].append({'case':['bad JSON','unknown version','unsafe replay'][i],'writes':0,'rawPreserved':True,'temporaryBuildAndRetry':True});c.close()
  for error in ['QuotaExceededError','SecurityError']:
   c,p=page(mobile=error=='QuotaExceededError');old=raw(p);p.evaluate('(a)=>{window.__native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===a.key)throw new DOMException("fixture",a.error);return window.__native.call(this,k,v)}}',{'key':KEY,'error':error});build(p,'AB');assert raw(p)==old and '未能保存' in p.locator('#save-note').inner_text()
   if error=='QuotaExceededError':p.locator('#save-note').scroll_into_view_if_needed();box=p.locator('#save-note').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390.1;p.screenshot(path=str(out/'write-failed-mobile.png'),full_page=True)
   p.evaluate('()=>{Storage.prototype.setItem=window.__native;}');build(p,'BC');assert '自动保存' in p.locator('#save-note').inner_text() and p.locator('#cash').inner_text()=='5';new=raw(p);p.reload(wait_until='networkidle');assert raw(p)==new and p.locator('[data-build="AB"]').is_disabled() and p.locator('[data-build="BC"]').is_disabled();r['fixtures'].append({'case':error,'oldBytesKeptDuringFailure':True,'laterBuildSavedBothChannels':True,'refreshCash':5});c.close()
  init=f'window.__native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k==={json.dumps(KEY)})throw new DOMException("fixture","QuotaExceededError");return window.__native.call(this,k,v)}};'
  c,p=page(init=init);assert '未能保存' in p.locator('#save-note').inner_text();p.evaluate('()=>{Storage.prototype.setItem=window.__native;}');p.locator('#help').click();p.locator('#help-close').click();assert '自动保存' in p.locator('#save-note').inner_text();r['fixtures'].append({'case':'startup write denied then handbook close save','immediateWarningAndRecovery':True});c.close()
  c,p=page(init='Object.defineProperty(window,"localStorage",{get(){throw new DOMException("fixture","SecurityError")}});');build(p,'AB');assert '无法读取' in p.locator('#save-note').inner_text();r['fixtures'].append({'case':'read getter denied','temporaryBuildWorks':True});c.close();b.close()
 assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
 (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(r,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
