import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.farm.continuity.v2'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base',required=True);ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.local/save-followups/tmp');r={'url':a.base,'normalUI':{},'fixtures':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch()
  def page(init=None,mobile=False):
   c=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1050})
   if init:c.add_init_script(init)
   p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append(x.url) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}));p.goto(a.base,wait_until='networkidle',timeout=20000);return c,p
  def raw(p):return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
  def plant(p):p.locator('#plant').click();p.locator('#confirm-action').click()
  c,p=page();p.locator('#state-action').click();plant(p);assert p.locator('#cash').inner_text()=='6';p.locator('#pause').click();old=raw(p);p.reload(wait_until='networkidle');assert raw(p)==old and p.locator('#state-title').inner_text()=='田地正等着你';p.locator('#state-action').click();p.locator('#end-day').click();p.locator('#confirm-action').click();p.wait_for_function("!document.getElementById('pause').disabled",timeout=5000);p.locator('#pause').click();old=raw(p);p.reload(wait_until='networkidle');assert raw(p)==old and p.locator('#day').inner_text()=='02' and p.locator('#cash').inner_text()=='6';assert '生长1/2' in p.locator('#plot-buttons button').first.get_attribute('aria-label');assert not p.locator('#storage-note').is_visible();p.screenshot(path=str(out/'normal-refresh.png'),full_page=True);r['normalUI']={'cash':6,'day':2,'cropGrowth':'1/2','commands':json.loads(old)['commands'],'explicitPauseBeforeReload':True,'refreshExactRaw':True};c.close()
  old=(ROOT/'docs/farm-storage-qa/before-old-valid.json').read_text(encoding='utf-8');c,p=page(init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(old)});');assert raw(p)==old and p.locator('#state-title').inner_text()=='田地正等着你';r['fixtures'].append({'case':'genuine old UI checkpoint','rawPreserved':True,'restoredPaused':True});c.close()
  for i,bad in enumerate(['KEEP ORIGINAL FARM',json.dumps({'version':9}),json.dumps({'version':2,'game':'continuous-farm-v2','phase':'playing','revision':1,'commands':[{'kind':'unknown'}]})]):
   init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(bad)});window.__writes=0;const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k==={json.dumps(KEY)})window.__writes++;return native.call(this,k,v)}};'
   c,p=page(init=init);p.locator('#state-action').click();plant(p);p.locator('#pause').click();p.locator('#state-action').click();p.locator('#plot-buttons button').nth(1).click();plant(p);assert raw(p)==bad and p.evaluate('window.__writes')==0 and p.locator('#storage-note').is_visible()
   if i==0:p.screenshot(path=str(out/'bad-protected.png'),full_page=True)
   r['fixtures'].append({'case':['bad JSON','unknown version','invalid replay'][i],'writes':0,'rawPreserved':True,'temporaryPlantsAndPauseResume':True});c.close()
  for error in ['QuotaExceededError','SecurityError']:
   c,p=page(mobile=error=='QuotaExceededError');p.locator('#state-action').click();old=raw(p);p.evaluate('(a)=>{window.__native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===a.key)throw new DOMException("fixture",a.error);return window.__native.call(this,k,v)}}',{'key':KEY,'error':error});plant(p);assert raw(p)==old and p.locator('#storage-note').is_visible()
   if error=='QuotaExceededError':p.locator('#storage-note').scroll_into_view_if_needed();box=p.locator('#storage-note').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390.1;p.screenshot(path=str(out/'write-failed-mobile.png'),full_page=True)
   p.evaluate('()=>{Storage.prototype.setItem=window.__native;}');p.locator('#pause').click();assert raw(p)!=old and not p.locator('#storage-note').is_visible();new=raw(p);p.reload(wait_until='networkidle');assert raw(p)==new and p.locator('#cash').inner_text()=='6';r['fixtures'].append({'case':error,'oldValidBytesKept':True,'laterPauseSaveRecovered':True,'refreshCash':6});c.close()
  c,p=page(init='Object.defineProperty(window,"localStorage",{get(){throw new DOMException("fixture","SecurityError")}});');p.locator('#state-action').click();plant(p);assert p.locator('#storage-note').is_visible();r['fixtures'].append({'case':'read getter denied','temporaryPlantWorks':True});c.close();b.close()
 assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
 (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(r,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
