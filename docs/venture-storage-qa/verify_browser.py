"""Normal buttons are separate from labelled localStorage fault/compatibility fixtures."""
import argparse, hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
KEY='atlas-venture-rivals-v2.1'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base',required=True);ap.add_argument('--out',required=True);args=ap.parse_args()
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 tmp=ROOT/'.local/storage-quality/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=str(tmp);os.environ['TMP']=str(tmp)
 report={'url':args.base,'normalUI':{},'faultFixtures':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True)
  def page(mobile=False,init=None):
   c=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1050},device_scale_factor=1)
   if init:c.add_init_script(init)
   p=c.new_page();p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
   p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
   p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}))
   p.on('dialog',lambda d:d.accept());p.goto(args.base,wait_until='networkidle',timeout=20000);p.locator('#loading').wait_for(state='hidden',timeout=15000)
   return c,p
  def raw(p):return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
  def state(p):return json.loads(raw(p))
  def saved(p):assert p.locator('#saveStatus').get_attribute('data-state')=='saved'
  def snap(p,name):p.screenshot(path=str(out/name),full_page=True)
  # Fresh context, no storage/state injection: normal control sequence.
  c,p=page();saved(p);assert p.locator('#pCash').inner_text()=='850'
  p.locator('#steps').select_option('1');p.locator('#voucher').click();p.locator('#buy').click(timeout=10000);p.locator('#upgrade').click()
  s=state(p);assert s['players'][0]['cash']==560 and s['shops'][1]=={'owner':0,'level':2} and s['players'][0]['vouchers']==1
  snap(p,'normal-purchase-upgrade.png');old=raw(p);p.reload(wait_until='networkidle');assert raw(p)==old;saved(p)
  p.locator('#end').click();p.wait_for_function("!document.getElementById('roll').disabled",timeout=10000)
  p.locator('#roll').click();p.wait_for_function("!document.getElementById('end').disabled",timeout=10000)
  rolled=state(p);assert rolled['lastRoll'] in range(1,7) and rolled['round']==2 and rolled['phase']=='landed';old=raw(p)
  p.reload(wait_until='networkidle');assert raw(p)==old and p.locator('#roll').is_disabled();saved(p);snap(p,'normal-roll-refresh.png')
  report['normalUI']={'steps':'fresh -> voucher1 -> buy180 -> upgrade110 -> refresh -> end -> AI normal turn -> roll -> refresh','cashAfterUpgrade':560,'propertyAfterUpgrade':s['shops'][1],'rolledRound':rolled['round'],'roll':rolled['lastRoll'],'position':rolled['players'][0]['position'],'rng':rolled['rng'],'cashAfterRoll':rolled['players'][0]['cash'],'rollRawPreservedOnRefresh':True,'ledgerEntries':len(rolled['log'])};c.close()
  # Exact genuine pre-fix browser save is a compatibility fixture, not a new normal playthrough.
  legacy=(ROOT/'docs/venture-storage-qa/old-valid-ui-save.json').read_text(encoding='utf-8')
  c,p=page(init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(legacy)});');assert raw(p)==legacy;saved(p);assert p.locator('#pCash').inner_text()=='670';snap(p,'old-format-compatible.png')
  report['faultFixtures'].append({'case':'genuine old-format UI save','rawExactlyPreserved':True,'sha256':hashlib.sha256(legacy.encode()).hexdigest(),'cash':670});c.close()
  # Three isolated invalid-record fixtures. Native setItem counter is observation only.
  malformed=['KEEP ORIGINAL MALFORMED VENTURE SAVE',json.dumps({'version':9}),json.dumps({'version':2,'scenario':'morning','players':[None,None],'shops':[None]*12})]
  for i,original in enumerate(malformed):
   init=f'localStorage.setItem({json.dumps(KEY)},{json.dumps(original)});window.__writes=0;const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k==={json.dumps(KEY)})window.__writes++;return native.call(this,k,v)}};'
   c,p=page(init=init);assert p.locator('#saveStatus').get_attribute('data-state')=='protected'
   p.locator('#steps').select_option('1');p.locator('#voucher').click();p.locator('#buy').click(timeout=10000);assert p.locator('#pCash').inner_text()=='670'
   p.locator('#restart').click();assert p.locator('#pCash').inner_text()=='850';p.locator('#level').select_option('1');assert p.locator('#scene').inner_text()=='雨夜商街'
   assert raw(p)==original and p.evaluate('window.__writes')==0
   if i==0:snap(p,'malformed-protected.png')
   report['faultFixtures'].append({'case':['malformed JSON','unsupported version','invalid nested structure'][i],'rawExactlyPreserved':True,'writes':0,'temporaryBuyAndRestartAndSwitchWorked':True,'status':p.locator('#saveStatus').inner_text()});c.close()
  # Native storage failure injected, engine/resources untouched. Separate quota and permission cases.
  for error in ['QuotaExceededError','SecurityError']:
   c,p=page(mobile=error=='QuotaExceededError');old=raw(p)
   p.evaluate('(args)=>{window.__nativeSet=Storage.prototype.setItem;window.__failedWrites=0;Storage.prototype.setItem=function(k,v){if(k===args.key){window.__failedWrites++;throw new DOMException("test write failure",args.error)}return window.__nativeSet.call(this,k,v)}}',{'key':KEY,'error':error})
   p.locator('#steps').select_option('1');p.locator('#voucher').click();p.locator('#buy').click(timeout=10000);assert p.locator('#pCash').inner_text()=='670';assert raw(p)==old
   status=p.locator('#saveStatus');assert status.get_attribute('data-state')=='failed';assert '刷新或关闭' in status.inner_text()
   if error=='QuotaExceededError':
    status.scroll_into_view_if_needed();box=status.bounding_box();assert box['x']>=0 and box['x']+box['width']<=390.1;snap(p,'quota-failure-mobile.png')
   p.locator('#restart').click();assert p.locator('#pCash').inner_text()=='850';assert raw(p)==old and status.get_attribute('data-state')=='failed'
   p.locator('#steps').select_option('1');p.locator('#voucher').click();p.wait_for_function("!document.getElementById('buy').disabled",timeout=10000)
   attempts=p.evaluate('window.__failedWrites');assert attempts>=4
   p.evaluate('()=>{Storage.prototype.setItem=window.__nativeSet;}');p.locator('#buy').click();saved(p);assert state(p)['players'][0]['cash']==670 and state(p)['shops'][1]['owner']==0
   if error=='QuotaExceededError':snap(p,'write-recovered-mobile.png')
   new=raw(p);p.reload(wait_until='networkidle');assert raw(p)==new;saved(p)
   report['faultFixtures'].append({'case':error,'failedAttempts':attempts,'priorValidRawRetained':True,'temporaryPlayAndRetryWorked':True,'laterWriteSucceeded':True,'successRefreshRawPreserved':True});c.close()
  c,p=page(init='Object.defineProperty(window,"localStorage",{get(){throw new DOMException("test denied read","SecurityError")}});')
  assert p.locator('#saveStatus').get_attribute('data-state')=='protected';p.locator('#steps').select_option('1');p.locator('#voucher').click();p.locator('#buy').click(timeout=10000);assert p.locator('#pCash').inner_text()=='670';snap(p,'read-denied-temporary.png')
  report['faultFixtures'].append({'case':'localStorage getter denied','temporaryBuyWorked':True,'status':p.locator('#saveStatus').inner_text()});c.close();browser.close()
 assert not report['consoleErrors'] and not report['httpErrors'] and not report['requestFailures'],report
 (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
