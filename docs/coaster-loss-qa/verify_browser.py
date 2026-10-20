import argparse,json,os,time,subprocess,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
SLUG='coaster'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/loss-eight-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 entry=next(x for x in json.loads((ROOT/'docs/flow-coverage/coverage.json').read_text(encoding='utf-8'))['items'] if x['slug']==SLUG);base='https://yydshly.github.io/classic-games-atlas/';url=base+entry['playUrl'];r={'kind':'public normal UI; diagnostic copies only; no state/save/time injection','codeBaseline':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'consoleErrors':[],'httpErrors':[],'requestFailures':[],'progress':[],'runtimeFiles':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate("()=>window.__courierV2.snapshot()") if SLUG=='courier' else p.evaluate("async()=> (await import(document.querySelector('script[type=module]').src)).diagnostics()")
  def shot(name):p.screenshot(path=str(out/name),full_page=True)
  def wait(pred,limit=15):
   end=time.monotonic()+limit;mark=-5
   while time.monotonic()<end:
    g=diag()
    if pred(g):return g
    t=g.get('time',g.get('ticks',0)/120)
    if t>=mark+5:mark=t;row={k:g[k] for k in ['state','time','ticks','lives','hp','distance','stats'] if k in g};r['progress'].append(row);print(json.dumps(row),flush=True)
    p.wait_for_timeout(100)
   raise AssertionError('Bounded normal UI wait expired')
  def begin():
   p.locator('#primary-action').click()
   if p.locator('#help-dialog').count() and p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
  try:
   p.goto(url,wait_until='networkidle',timeout=20000)
   for name in ['game.mjs','engine.mjs']:
    path=entry['playUrl']+name;expected=subprocess.check_output(['git','show',r['codeBaseline']+':'+path]);response=p.request.get(base+path,timeout=20000);assert response.status==200 and response.body()==expected,path;r['runtimeFiles'].append({'path':path,'sha256':hashlib.sha256(expected).hexdigest()})
   if p.locator('#sound').count() and p.locator('#sound').get_attribute('aria-pressed')!='false':p.locator('#sound').click()
   r['initial']=diag()
   for segment,module in [(0,'lift'),(11,'brake'),(1,'trim')]:
    p.locator('#segment-list button').nth(segment).click();p.locator('#module-'+module).click()
   g=diag();assert g['state']=='design' and g['cost']==295;r['normalDesign']=g
   p.locator('#test-ride').click();g=wait(lambda g:g['state']=='design' and g['report'] is not None,35)
   assert g['report']['safe'] and not g['report']['approved'];r['nativeSafetyReport']=g;shot('safe-but-experience-below-target.png')
   p.locator('#open-park').click();g=wait(lambda g:g['state']=='lost',85)
   assert g['runs']==3 and g['revenue']==336 and g['reputation']==60 and g['visitors']==21 and g['active'] is None;r['naturalLoss']=g;r['visibleLoss']=p.locator('#state-card').inner_text();shot('natural-three-runs-reputation-loss.png')
   p.locator('#retry').click();g=diag()
   assert g['state']=='design' and g['levelIndex']==0 and g['cash']==380 and g['cost']==g['runs']==g['revenue']==g['reputation']==g['visitors']==g['tick']==0 and g['report'] is None and g['active'] is None and all(x=='rail' for x in g['modules']) and all(x==0 for x in g['heightOffsets']) and g['best']==r['initial']['best'] and g['unlocked']==r['initial']['unlocked'];r['retryDesign']=g
   p.reload(wait_until='networkidle');g=diag();assert g['state']=='design' and g['runs']==g['revenue']==g['reputation']==0 and g['cost']==0 and g['report'] is None;r['retryRefresh']=g;shot('retry-refresh-fresh-design.png')
   p.locator('#segment-list button').nth(0).click();p.locator('#module-lift').click();p.locator('#test-ride').click();p.wait_for_timeout(300);p.locator('#pause').click();g=diag();assert g['state']=='paused' and g['priorState']=='testing' and g['runs']==0 and g['revenue']==0 and g['tick']>0;r['normalNewTestAfterRetry']=g;shot('new-test-no-old-operating-income.png')
   assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'];r['status']='passed'
  except Exception as e:r.update(status='failed',error=str(e));shot('failed-attempt.png');raise
  finally:(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'game':SLUG,'status':r['status']}),flush=True)
if __name__=='__main__':main()
