import json,pathlib,subprocess,os,time,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/independent-success-round');out=R/'fortress-public';out.mkdir(parents=True,exist_ok=True);tmp=R/'tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp.resolve());KEY='classic-atlas.fortress.v2';report={'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/fortress/','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Normal first-operation SOLO selection and W/A/S/D/J keys only. Separate process reads copied diagnostics for aim/grid routing every100ms. No second player or AI teammate, no live engine/state/time/HP/lives/position/save/result writes. Max2 natural attempts; each <=150 game seconds or200 wall seconds.','attempts':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs').resolve()),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
def choose(s):w.stdin.write(json.dumps(s)+'\n');w.stdin.flush();d=json.loads(w.stdout.readline());assert'error'not in d,d;return d
def flush():(out/'public-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:report['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:report['requestFailures'].append({'url':x.url,'error':x.failure}));held=set();keys=['w','d','s','a']
 def snap():return p.evaluate('window.__fortress.snapshot()')
 def stored():return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
 def shot(n):p.screenshot(path=str(out/n),full_page=True)
 def key(k,on):
  if on and k not in held:p.keyboard.down(k);held.add(k)
  if not on and k in held:p.keyboard.up(k);held.remove(k)
 def release():
  for k in list(held):key(k,False)
 def fresh(s):assert s['state']=='ready'and s['level']==1 and s['mode']==1 and len(s['players'])==1 and s['kills']==s['score']==s['time']==0 and s['base']['hp']==3 and s['lives']==3
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#primary').wait_for();p.locator('#level').select_option('0');p.locator('#mode').select_option('1');fresh(snap());report['nativeStart']=snap();shot('native-first-map-solo-ready.png')
  for attempt in range(1,3):
   fresh(snap());p.locator('#primary').click();a={'attempt':attempt,'decisions':[]};report['attempts'].append(a);began=time.monotonic();mark=-10
   while time.monotonic()-began<200:
    deadline=time.monotonic()+.1;s=snap()
    if s['state']in['won','lost']or s['time']>=150:break
    assert s['state']=='playing'and s['mode']==1 and len(s['players'])==1;v=choose(s)
    for i,k in enumerate(keys):key(k,v['dir']==i)
    key('j',v['fire']);a['decisions'].append({'time':s['time'],'player':s['player'],'base':s['base'],'kills':s['kills'],'enemies':s['enemies'],'choice':v})
    if s['time']>=mark+10:mark=s['time'];flush();print(json.dumps({'attempt':attempt,'time':s['time'],'kills':s['kills'],'base':s['base']['hp'],'lives':s['lives']}),flush=True)
    p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
   release();p.wait_for_timeout(150);s=snap();a['outcome']=s;a['visible']={k:p.locator('#'+k).inner_text()for k in['result-title','result-copy','state-label','base','wave','score']};shot(f'attempt-{attempt}-{s["state"]}.png');flush()
   if s['state']=='won':assert s['kills']==6 and s['base']['hp']>0 and s['lives']>0;report['status']='passed';break
   if attempt<2:p.locator('#prepare').click()
  if report.get('status')!='passed':report['status']='bounded_uncompleted';report['reason']='Two bounded normal solo strategy attempts did not produce victory, not a confirmed game defect.'
  best=json.loads(stored());p.reload(wait_until='domcontentloaded');p.locator('#primary').wait_for();fresh(snap());assert json.loads(stored())==best;report['readyRefresh']={'snapshot':snap(),'nativeProgress':best};shot('solo-record-refreshed-ready.png');p.locator('#primary').click();assert snap()['state']=='playing';p.wait_for_timeout(250);release();p.locator('#pause').click();assert snap()['state']=='paused';report['shortRetry']=snap();shot('solo-short-retry-paused.png');assert not any(report[k]for k in['consoleErrors','httpErrors','requestFailures'])
 except Exception as e:
  report['status']='harness_failed';report['error']=repr(e)
  try:report['lastSnapshot']=snap();shot('failure-debug.png')
  except:pass
  raise
 finally:
  release();flush();c.close();w.stdin.close()
  try:w.wait(timeout=5)
  except:w.terminate()
print(json.dumps({'status':report['status'],'attempts':len(report['attempts'])}),flush=True)
