import argparse,json,time,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.post.v2';KEYS={'a':'KeyA','d':'KeyD','w':'KeyW','s':'KeyS'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/coverage-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'kind':'ordinary keys; separate copied-telemetry digital pursuit helper at about100ms; no live engine/state/time/storage writes','decisions':[],'observations':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 worker=subprocess.Popen(['node',str(ROOT/'docs/post-main-flow-qa/policy.mjs'),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def decide(d):worker.stdin.write(json.dumps(d,separators=(',',':'))+'\n');worker.stdin.flush();x=json.loads(worker.stdout.readline());assert 'error' not in x,x;return x
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate("async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.diagnostics();}")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def fresh(d,stage):assert d['stage']==stage and d['time']==0 and d['stats']['settlements']==0 and all(c['lap']==1 and c['stats']['gates']==0 and c['stats']['resets']==0 and c['finishedAt'] is None for c in d['cars']) and not d['input']['keys'] and d['input']['touches']==0
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/post/',wait_until='networkidle',timeout=20000);fresh(diag(),0);p.locator('#primary-action').click();t=time.monotonic();mark=-5;lapShot=False
   while time.monotonic()-t<115:
    deadline=time.monotonic()+.1;d=diag()
    if d['state']=='finished':break
    assert d['state'] in ['countdown','playing'],d['state'];x=decide(d);want=set()
    if x['gas']:want.add('w')
    if x['brake']:want.add('s')
    if x['steer']:want.add('d' if x['steer']>0 else 'a')
    for key,code in KEYS.items():
     if key not in want:p.keyboard.up(key)
     elif code not in d['input']['keys']:p.keyboard.down(key)
    r['decisions'].append({'wall':time.monotonic()-t,'time':d['time'],'controls':x,'player':{'x':d['cars'][0]['x'],'y':d['cars'][0]['y'],'angle':d['cars'][0]['angle'],'speed':d['cars'][0]['speed'],'gates':d['cars'][0]['stats']['gates']}})
    if d['time']>=mark+5:mark=d['time'];row={'time':d['time'],'gates':d['cars'][0]['stats']['gates'],'resets':d['cars'][0]['stats']['resets'],'lap':d['cars'][0]['lap']};r['observations'].append(row);print(json.dumps(row),flush=True)
    if d['cars'][0]['lap']==2 and not lapShot:shot('second-lap-running.png');lapShot=True
    p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
   for key in KEYS:p.keyboard.up(key)
   p.wait_for_timeout(100);d=diag();r['outcome']=d;assert d['state']=='finished' and d['cars'][0]['finishedAt'] is not None and d['cars'][0]['stats']['gates']==16 and len(d['cars'][0]['lapTimes'])==2 and d['stats']['settlements']==1,'ordinary attempt did not complete both laps';assert d['unlocked']==2 and d['best']['0']==d['cars'][0]['finishedAt'];r['ui']={k:p.locator('#'+k).inner_text() for k in ['overlay-title','overlay-copy','summary','last-result','best']};shot('two-lap-finish-result.png');best=d['best'];result=d['lastResult'];p.reload(wait_until='networkidle');n=diag();fresh(n,0);assert n['state']=='ready' and n['best']==best and n['lastResult']==result and n['unlocked']==2;r['refresh']=n;shot('finish-refresh-records-kept.png');p.locator('#primary-action').click();p.wait_for_timeout(250);p.locator('#restart').click();n=diag();fresh(n,0);assert n['best']==best and n['lastResult']==result;r['restartClean']=True;p.locator('#stage-select').select_option(index=1);n=diag();fresh(n,1);assert p.locator('#stage-select option').nth(2).is_disabled() and n['best']==best;r['nextReady']=n;shot('second-stage-clean-ready.png');r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:r['lastSnapshot']=diag();shot('failure-debug.png')
   except:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
   try:worker.stdin.close();worker.wait(timeout=5)
   except:worker.terminate()
 print(json.dumps({'status':r['status'],'time':d['time'],'rank':d['result']['rank'],'outcome':d['result']['outcome'],'resets':d['cars'][0]['stats']['resets'],'gates':16,'unlocked':d['unlocked'],'settlements':1,'decisions':len(r['decisions'])},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
