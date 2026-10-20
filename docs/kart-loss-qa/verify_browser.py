import argparse,json,os,time,subprocess,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
SLUG='kart'
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
   assert r['initial']['assist']==False
   begin();p.locator('#race').focus();p.keyboard.down('ArrowDown');g=wait(lambda g:g['state']=='lost',108)
   assert g['reason']=='比赛时间耗尽' and g['time']>=92 and g['result']['assisted']==False and g['cars'][0]['finishTime'] is None and g['unlocked']==1 and g['input']['keys']==[];r['naturalLoss']=g;r['visibleLoss']=p.locator('#state-card').inner_text();shot('natural-92-second-brake-held-timeout.png')
   p.locator('#primary-action').click();p.locator('#pause').click();g=diag()
   assert g['state']=='paused' and g['pausedFrom']=='countdown' and g['level']==1 and g['time']==0 and g['remaining']==92 and g['countdown']>2 and g['assist']==False and g['result'] is None and g['input']['keys']==[] and all(c['finishTime'] is None and c['speed']==0 and c['item'] is None for c in g['cars']) and g['best']==r['initial']['best'] and g['assistedBest']==r['initial']['assistedBest'] and g['unlocked']==1;r['retryPaused']=g
   p.keyboard.up('ArrowDown');p.reload(wait_until='networkidle');g=diag();assert g['state']=='paused' and g['pausedFrom']=='countdown' and g['time']==0 and g['remaining']==92 and g['input']['keys']==[] and g['unlocked']==1 and not g['assist'];r['retryRefresh']=g;shot('retry-refresh-countdown-clean.png')
   p.locator('#primary-action').click();p.wait_for_timeout(3500);p.locator('#pause').click();g=diag();assert g['state']=='paused' and 0<g['time']<2 and g['cars'][0]['speed']>0 and g['input']['keys']==[] and g['input']['brake']==False;r['normalNewRaceAfterRetry']=g;shot('new-race-auto-acceleration-no-old-brake.png')
   assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'];r['status']='passed'
  except Exception as e:r.update(status='failed',error=str(e));shot('failed-attempt.png');raise
  finally:(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'game':SLUG,'status':r['status']}),flush=True)
if __name__=='__main__':main()
