import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.escort.v2'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base',required=True);ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.local/save-followups/tmp');r={'url':a.base,'normalUI':{},'fixtures':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch()
  def page(init=None,mobile=False):
   c=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1050})
   if init:c.add_init_script(init)
   p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append(x.url) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}));p.goto(a.base,wait_until='networkidle',timeout=20000)
   if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
   p.wait_for_function("!document.body.dataset.assets",timeout=15000);return c,p
  def raw(p):return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
  # Existing immutable diagnostic snapshot is read only; all decisions/actions use normal UI.
  def snap(p):return p.evaluate('window.__escort.snapshot()')
  def observe(p):
   s=snap(p);return {k:s[k] for k in ['state','ticks','player','cart','stats','heals','stage','controls','log','ledger']}
  def play(p,combat=False):
   p.locator('#start').click();p.keyboard.down('d');p.wait_for_timeout(180);p.keyboard.up('d')
   if combat:p.keyboard.press('j');p.wait_for_timeout(200);p.keyboard.press('k');p.wait_for_timeout(180)
   p.locator('#pause').click();assert p.locator('#pause-panel').is_visible()
  c,p=page();play(p,True);s=observe(p);assert s['ticks']>0 and s['stats']['attacks']>0 and s['stats']['dodges']>0;old=raw(p);p.reload(wait_until='networkidle');assert raw(p)==old and observe(p)==s and p.locator('#pause-panel').is_visible();assert s['controls']=={'x':0,'y':0,'attack':False};p.screenshot(path=str(out/'normal-action-refresh.png'),full_page=True);r['normalUI']={'ticks':s['ticks'],'attacks':s['stats']['attacks'],'dodges':s['stats']['dodges'],'player':s['player'],'cart':s['cart'],'rawAndObservedReplayEqual':True,'heldControlsReleased':True,'kind':'normal keyboard/buttons; diagnostic snapshot read only'};c.close()
  old=(ROOT/'docs/escort-storage-qa/before-old-valid.json').read_text(encoding='utf-8');c,p=page(init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(old)});');assert raw(p)==old and snap(p)['ticks']==json.loads(old)['resume']['ticks'] and p.locator('#pause-panel').is_visible();r['fixtures'].append({'case':'genuine old UI movement checkpoint','rawPreserved':True,'restoredPaused':True});c.close()
  for i,bad in enumerate(['KEEP ORIGINAL ESCORT',json.dumps({'version':9}),json.dumps({'version':2,'unlocked':1,'last':1,'tutorialSeen':True,'sound':False,'best':{},'resume':{'version':2,'level':1,'ticks':1,'commands':[None]}})]):
   init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(bad)});window.__writes=0;const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k==={json.dumps(KEY)})window.__writes++;return native.call(this,k,v)}};'
   c,p=page(init=init);play(p);p.locator('#reset').click();p.locator('#levels').click();p.locator('[data-level="1"]').click();assert raw(p)==bad and p.evaluate('window.__writes')==0 and p.locator('#storage-note').is_visible()
   if i==0:p.screenshot(path=str(out/'bad-protected.png'),full_page=True)
   r['fixtures'].append({'case':['bad JSON','unknown version','invalid replay'][i],'writes':0,'rawPreserved':True,'temporaryPlayResetAndSelect':True});c.close()
  for error in ['QuotaExceededError','SecurityError']:
   c,p=page(mobile=error=='QuotaExceededError');old=raw(p);p.evaluate('(a)=>{window.__native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===a.key)throw new DOMException("fixture",a.error);return window.__native.call(this,k,v)}}',{'key':KEY,'error':error});play(p);assert raw(p)==old and p.locator('#storage-note').is_visible()
   if error=='QuotaExceededError':
    box=p.locator('#storage-note').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390.1 and box['y']>=0 and box['y']+box['height']<=844;p.screenshot(path=str(out/'write-failed-mobile.png'),full_page=True)
   p.evaluate('()=>{Storage.prototype.setItem=window.__native;}');p.locator('#resume').click();p.locator('#pause').click();assert not p.locator('#storage-note').is_visible();new=raw(p);s=observe(p);p.reload(wait_until='networkidle');assert raw(p)==new and observe(p)==s;r['fixtures'].append({'case':error,'oldBytesKept':True,'laterResumeSaveRecovered':True,'restoredSamePausedActionState':True});c.close()
  c,p=page(init='Object.defineProperty(window,"localStorage",{get(){throw new DOMException("fixture","SecurityError")}});');play(p);assert p.locator('#storage-note').is_visible();r['fixtures'].append({'case':'read getter denied','temporaryPlayWorks':True});c.close();b.close()
 assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
 (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(r,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
