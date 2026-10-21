import argparse,json,time,os,subprocess,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();KEYS={'a':'KeyA','d':'KeyD','w':'KeyW','s':'KeyS'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/final-four-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/post/','method':'Fresh isolated native persistent profile. First race is necessary normal unlock prerequisite; native next then second/third. Read-only copied-telemetry digital pursuit helper uses authored geometry/driver logic as strategy reference, ordinary W/A/S/D only. No live engine/state/save/time/result writes. Legal finish and first-place win are recorded separately.','races':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def choose(d):w.stdin.write(json.dumps(d,separators=(',',':'))+'\n');w.stdin.flush();v=json.loads(w.stdout.readline());assert 'error'not in v,v;return v
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright()as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def snap():return p.evaluate("async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.diagnostics()}")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def fresh(d,i):assert d['stage']==i and d['time']==0 and d['stats']['settlements']==0 and all(x['lap']==1 and x['stats']['gates']==0 and x['stats']['resets']==0 and x['finishedAt']is None for x in d['cars'])and not d['input']['keys']and d['input']['touches']==0
  try:
   p.goto(r['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#primary-action').wait_for();fresh(snap(),0);p.locator('#primary-action').click()
   for stage in range(3):
    fresh(snap(),stage);row={'stage':stage+1,'start':snap(),'decisions':[],'observations':[]};r['races'].append(row);began=time.monotonic();mark=-5
    while time.monotonic()-began<115:
     deadline=time.monotonic()+.1;d=snap()
     if d['state']=='finished':break
     assert d['state']in['countdown','playing'];v=choose(d);want=set()
     if v['gas']:want.add('w')
     if v['brake']:want.add('s')
     if v['steer']:want.add('d'if v['steer']>0 else 'a')
     for key,code in KEYS.items():
      if key not in want:p.keyboard.up(key)
      elif code not in d['input']['keys']:p.keyboard.down(key)
     row['decisions'].append({'time':d['time'],'controls':v,'player':d['cars'][0]})
     if d['time']>=mark+10:mark=d['time'];v={'stage':stage+1,'time':d['time'],'lap':d['cars'][0]['lap'],'gates':d['cars'][0]['stats']['gates'],'resets':d['cars'][0]['stats']['resets']};row['observations'].append(v);flush();print(json.dumps(v),flush=True)
     p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
    for key in KEYS:p.keyboard.up(key)
    p.wait_for_timeout(150);d=snap();row['outcome']=d;row['visible']={k:p.locator('#'+k).inner_text()for k in['overlay-title','overlay-copy','summary','last-result','best']};shot(f'race-{stage+1}-result.png');flush();assert d['state']=='finished'and d['cars'][0]['finishedAt']is not None and d['cars'][0]['stats']['gates']==16 and len(d['cars'][0]['lapTimes'])==2 and d['stats']['settlements']==1;assert d['unlocked']==min(3,stage+2)and d['best'][str(stage)]==d['cars'][0]['finishedAt'];print(json.dumps({'race':stage+1,'legalFinish':True,'rank':d['result']['rank'],'outcome':d['result']['outcome'],'time':d['time'],'unlocked':d['unlocked']}),flush=True)
    if stage<2:p.locator('#primary-action').click();n=snap();fresh(n,stage+1);assert n['state']=='countdown'and n['best']==d['best'];row['nextClean']=n;flush()
   assert p.locator('#stage-select option').count()==3;r['noFourthRace']=True;best=snap()['best'];last=snap()['lastResult'];p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();n=snap();fresh(n,2);assert n['state']=='ready'and n['best']==best and len(best)==3 and n['lastResult']==last and n['unlocked']==3;r['finalRefresh']=n;shot('all-three-records-refreshed.png');p.locator('#primary-action').click();p.wait_for_timeout(250);p.locator('#restart').click();n=snap();fresh(n,2);assert n['state']=='ready'and n['best']==best and n['lastResult']==last;r['finalRetry']=n;shot('third-race-clean-retry.png');r['status']='passed';assert not any(r[k]for k in['consoleErrors','httpErrors','requestFailures'])
  except Exception as e:
   r['status']='failed';r['error']=repr(e)
   try:r['lastSnapshot']=snap();shot('failure-debug.png')
   except:pass
   raise
  finally:
   flush();c.close()
   try:w.stdin.close();w.wait(timeout=5)
   except:w.terminate()
if __name__=='__main__':main()
