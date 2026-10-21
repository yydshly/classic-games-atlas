import argparse,json,pathlib,subprocess,os,time,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/independent-success-round');out=R/'post-public';out.mkdir(parents=True,exist_ok=True);tmp=R/'tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp.resolve());KEYS={'a':'KeyA','d':'KeyD','w':'KeyW','s':'KeyS'};ap=argparse.ArgumentParser();ap.add_argument('--profile',required=True);args=ap.parse_args();reference=json.loads(Path(__file__).with_name('post-selected-reference.json').read_text(encoding='utf-8-sig'));report={'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/post/','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Reuse actual native profile unlocked by earlier documented legal finishes; no JSON import/unlock writes. Each race selected normally. Copied telemetry/track geometry chooses digital W/A/S/D about50ms; dynamic traffic-aware lane choice. 96 fixed-lane and8 traffic-aware configs only OFFLINE strategy search, not UI outcomes. Max2 natural UI attempts per race. Live physics/AI/time/result unchanged. First place strictly rank1 plus legal finish.','races':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs').resolve()),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
def choose(s,p):w.stdin.write(json.dumps({'s':s,'p':p})+'\n');w.stdin.flush();d=json.loads(w.stdout.readline());assert'error'not in d,d;return d
def flush():(out/'public-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(args.profile,viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:report['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:report['requestFailures'].append({'url':x.url,'error':x.failure}))
 def snap():return p.evaluate("async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.diagnostics()}")
 def shot(n):p.screenshot(path=str(out/n),full_page=True)
 def release():
  for k in KEYS:p.keyboard.up(k)
 def fresh(d,i):assert d['state']=='ready'and d['stage']==i and d['time']==0 and d['stats']['settlements']==0 and not d['input']['keys']and all(x['finishedAt']is None and x['stats']['gates']==0 for x in d['cars'])
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#primary-action').wait_for();report['nativePriorProgress']=snap();assert snap()['unlocked']==3
  for stage in range(3):
   p.locator('#stage-select').select_option(str(stage));fresh(snap(),stage);row={'stage':stage+1,'start':snap(),'attempts':[]};report['races'].append(row);configs=sorted([r for r in reference['rows']if r['stage']==stage+1],key=lambda x:(x.get('rank')!=1,x['time']))
   for attempt,ref in enumerate(configs[:2],1):
    if attempt>1:p.locator('#restart').click();fresh(snap(),stage)
    params=ref['params'];p.locator('#primary-action').click();a={'attempt':attempt,'params':params,'decisions':[]};row['attempts'].append(a);began=time.monotonic();mark=-10
    while time.monotonic()-began<115:
     deadline=time.monotonic()+.05;s=snap()
     if s['state']=='finished':break
     assert s['state']in['countdown','playing'];v=choose(s,params);want=set()
     if v['gas']:want.add('w')
     if v['brake']:want.add('s')
     if v['steer']:want.add('d'if v['steer']>0 else'a')
     for k,code in KEYS.items():
      if k not in want:p.keyboard.up(k)
      elif code not in s['input']['keys']:p.keyboard.down(k)
     a['decisions'].append({'time':s['time'],'player':s['cars'][0],'controls':v})
     if s['time']>=mark+10:mark=s['time'];flush();print(json.dumps({'race':stage+1,'attempt':attempt,'time':s['time'],'gates':s['cars'][0]['stats']['gates'],'resets':s['cars'][0]['stats']['resets']}),flush=True)
     p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
    release();p.wait_for_timeout(150);s=snap();a['outcome']=s;a['visible']={k:p.locator('#'+k).inner_text()for k in['overlay-title','overlay-copy','summary','last-result','best']};shot(f'race-{stage+1}-attempt-{attempt}-rank-{s.get("result",{}).get("rank")}.png');flush();assert s['state']=='finished'and s['stats']['settlements']==1;print(json.dumps({'race':stage+1,'attempt':attempt,'rank':s['result']['rank'],'outcome':s['result']['outcome'],'time':s['time'],'gates':s['cars'][0]['stats']['gates']}),flush=True)
    if s['result']['rank']==1 and s['result']['outcome']=='won'and s['cars'][0]['finishedAt']is not None:assert s['cars'][0]['stats']['gates']==16;row['outcome']=s;row['won']=True;break
   if not row.get('won'):row['won']=False;row['outcome']=s
   flush()
  wins=[r['stage']for r in report['races']if r['won']];report['verifiedUnits']=wins;report['uncompletedUnits']=[i for i in[1,2,3]if i not in wins];report['status']='passed'if len(wins)==3 else'bounded_uncompleted';before=snap();assert p.locator('#stage-select option').count()==3;best=before['best'];last=before['lastResult'];p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();fresh(snap(),2);assert snap()['best']==best and snap()['lastResult']==last and snap()['unlocked']==3;report['finalRefresh']=snap();shot('three-race-native-records-refreshed.png');assert not any(report[k]for k in['consoleErrors','httpErrors','requestFailures'])
 except Exception as e:
  report['status']='harness_failed';report['error']=repr(e)
  try:report['lastSnapshot']=snap();shot('failure-debug.png')
  except:pass
  raise
 finally:
  release();flush();c.close();w.stdin.close()
  try:w.wait(timeout=5)
  except:w.terminate()
print(json.dumps({'status':report['status'],'verifiedUnits':report.get('verifiedUnits'),'uncompletedUnits':report.get('uncompletedUnits')}),flush=True)
