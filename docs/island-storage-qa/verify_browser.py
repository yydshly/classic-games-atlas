import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.island.v2'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base',required=True);ap.add_argument('--out',required=True);args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.local/save-followups/tmp');r={'url':args.base,'normalUI':{},'fixtures':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch()
  def page(init=None,mobile=False):
   c=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1050})
   if init:c.add_init_script(init)
   p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append(x.url) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}));p.goto(args.base,wait_until='networkidle',timeout=20000)
   if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
   return c,p
  def raw(p):return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
  def build(p):p.locator('#start').click();p.locator('[data-cell="1,3"]').click();p.locator('#place').click();p.locator('#confirm-action').click();assert p.locator('#cash').inner_text()=='57'
  # Normal UI, no fixtures: confirmed building, restored pause, real round, refresh.
  c,p=page();build(p);old=raw(p);p.reload(wait_until='networkidle');assert raw(p)==old and p.locator('#pause-panel').is_visible();assert p.locator('#cash').inner_text()=='57';p.locator('#resume').click();p.locator('#end-turn').click();p.locator('#confirm-action').click();old=raw(p);p.reload(wait_until='networkidle');assert raw(p)==old and p.locator('#pause-panel').is_visible();assert not p.locator('#storage-note').is_visible();p.screenshot(path=str(out/'normal-refresh.png'),full_page=True);r['normalUI']={'cash':57,'commands':json.loads(old)['resume']['commands'],'confirmedRoadAndRound':True,'refreshExactRaw':True,'restoredPaused':True};c.close()
  old=(ROOT/'docs/island-storage-qa/before-old-valid.json').read_text(encoding='utf-8');c,p=page(init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(old)});');assert raw(p)==old;r['fixtures'].append({'case':'genuine old UI format','rawPreserved':True});c.close()
  for i,bad in enumerate(['KEEP ORIGINAL ISLAND',json.dumps({'version':9}),json.dumps({'version':2,'tutorialSeen':True,'sound':False,'best':None,'resume':{'version':2,'commands':[{'kind':'unknown'}]}})]):
   init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(bad)});window.__writes=0;const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k==={json.dumps(KEY)})window.__writes++;return native.call(this,k,v)}};'
   c,p=page(init=init);build(p);p.locator('#reset').click();p.locator('#new-city').click();p.locator('#new-city-confirm').click();assert raw(p)==bad and p.evaluate('window.__writes')==0 and p.locator('#storage-note').is_visible()
   if i==0:p.screenshot(path=str(out/'bad-protected.png'),full_page=True)
   r['fixtures'].append({'case':['bad JSON','unknown version','invalid replay'][i],'writes':0,'rawPreserved':True,'temporaryBuildAndRetryAndNewCity':True});c.close()
  for error in ['QuotaExceededError','SecurityError']:
   c,p=page(mobile=error=='QuotaExceededError');old=raw(p);p.evaluate('(a)=>{window.__native=Storage.prototype.setItem;window.__fails=0;Storage.prototype.setItem=function(k,v){if(k===a.key){window.__fails++;throw new DOMException("fixture",a.error)}return window.__native.call(this,k,v)}}',{'key':KEY,'error':error});build(p);assert raw(p)==old and p.locator('#storage-note').is_visible()
   if error=='QuotaExceededError':p.locator('#storage-note').scroll_into_view_if_needed();box=p.locator('#storage-note').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390.1;p.screenshot(path=str(out/'write-failed-mobile.png'),full_page=True)
   p.evaluate('()=>{Storage.prototype.setItem=window.__native;}');p.locator('#pause').click();assert raw(p)!=old and not p.locator('#storage-note').is_visible();new=raw(p);p.reload(wait_until='networkidle');assert raw(p)==new and p.locator('#cash').inner_text()=='57';r['fixtures'].append({'case':error,'oldBytesKeptDuringFailure':True,'laterPauseSaveRecovered':True,'refreshCash':57});c.close()
  c,p=page(init='Object.defineProperty(window,"localStorage",{get(){throw new DOMException("fixture","SecurityError")}});');build(p);assert p.locator('#storage-note').is_visible();r['fixtures'].append({'case':'read getter denied','temporaryBuildWorks':True});c.close();b.close()
 assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
 (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(r,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
