import argparse,json,pathlib,subprocess,os,time,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/independent-success-round');out=R/'kart-public';out.mkdir(parents=True,exist_ok=True);tmp=R/'tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp.resolve());KEY={'left':'ArrowLeft','right':'ArrowRight','brake':'ArrowDown','drift':'Space'};ap=argparse.ArgumentParser();ap.add_argument('--profile',required=True);args=ap.parse_args();reference=json.loads(Path(__file__).with_name('kart-reference.json').read_text(encoding='utf-8-sig'));report={'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/kart/','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Reuse original native eight-course profile legitimately unlocked by previously documented assisted finishes; no save/unlock imports. Uncheck existing curve assist in ready UI, assert assist false every sample/result. Select each course normally; not a new-profile manual unlock campaign. Full copied telemetry/geometry selects digital arrows/brake/Space/E about50ms; external scripted steering aid remains, NOT human unassisted driving. Max2 natural attempts per course. No hidden state/time/physics/AI/result writes.','courses':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs').resolve()),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
def choose(s,p):w.stdin.write(json.dumps({'s':s,'p':p})+'\n');w.stdin.flush();d=json.loads(w.stdout.readline());assert'error'not in d,d;return d
def flush():(out/'public-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(args.profile,viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:report['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:report['requestFailures'].append({'url':x.url,'error':x.failure}));held=set()
 def snap():return p.evaluate('window.kartSnapshot()')
 def shot(n):p.screenshot(path=str(out/n),full_page=True)
 def key(k,on):
  if on and k not in held:p.keyboard.down(k);held.add(k)
  if not on and k in held:p.keyboard.up(k);held.remove(k)
 def release():
  for k in list(held):key(k,False)
 def fresh(s,level):assert s['level']==level and s['state']=='ready'and s['time']==s['ticks']==0 and not s['assist']and s['result']is None and not s['input']['keys']
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#primary-action').wait_for();prior=snap();assert prior['state']=='ready'and prior['unlocked']==8 and len(prior['assistedBest'])==8;report['nativePriorProgress']=prior;assistBest=prior['assistedBest'];p.locator('#assist-mode').uncheck();assert not snap()['assist'];shot('native-assist-unchecked.png')
  for level in range(1,9):
   p.locator('#chapters').click();p.locator(f'#chapter-list button[data-level="{level}"]').click();fresh(snap(),level);row={'level':level,'start':snap(),'attempts':[]};report['courses'].append(row)
   for attempt,ref in enumerate(reference['choices'][level-1][:2],1):
    if attempt>1:p.locator('#retry').click();fresh(snap(),level)
    params=ref['params'];p.locator('#primary-action').click()
    if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
    a={'attempt':attempt,'params':params,'decisions':[]};row['attempts'].append(a);began=time.monotonic();mark=-10
    while time.monotonic()-began<160:
     deadline=time.monotonic()+.05;s=snap()
     if s['state']in['won','lost']:break
     assert s['state']in['countdown','playing']and not s['assist'];v=choose(s,params)
     for k,on in [('left',v['steer']<0),('right',v['steer']>0),('brake',v['brake']),('drift',v['drift'])]:key(KEY[k],on)
     if v['item']:p.keyboard.press('e')
     a['decisions'].append({'time':s['time'],'assist':s['assist'],'player':{'s':s['cars'][0]['s'],'lateral':s['cars'][0]['lateral'],'speed':s['cars'][0]['speed'],'headingError':s['cars'][0]['headingError']},'input':v})
     if s['time']>=mark+10:mark=s['time'];flush();print(json.dumps({'course':level,'attempt':attempt,'time':s['time'],'assist':s['assist'],'rank':s['rank'],'stats':s['stats']}),flush=True)
     p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
    release();p.wait_for_timeout(150);s=snap();assert s['state']in['won','lost']and not s['assist']and s['result']['assisted']is False;a['outcome']=s;a['visible']={k:p.locator('#'+k).inner_text()for k in['state-title','state-description','state-summary','primary-action','drive-mode']};shot(f'course-{level}-attempt-{attempt}-{s["state"]}-assist-OFF.png');flush();print(json.dumps({'course':level,'attempt':attempt,'state':s['state'],'result':s['result']}),flush=True)
    assert s['assistedBest']==assistBest
    if s['state']=='won':assert s['result']['won']and s['result']['place']<=s['result']['goal']and str(level)in s['best'];row['won']=True;row['outcome']=s;break
   if not row.get('won'):row['won']=False;row['outcome']=s
   flush()
  wins=[r['level']for r in report['courses']if r['won']];report['verifiedUnits']=wins;report['uncompletedUnits']=[i for i in range(1,9)if i not in wins];report['status']='passed'if len(wins)==8 else'bounded_uncompleted';report['lastVisible']={k:p.locator('#'+k).inner_text()for k in['state-title','state-description','state-summary']};manual=snap()['best'];p.locator('#retry').click();fresh(snap(),8);p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();fresh(snap(),8);s=snap();assert s['best']==manual and s['assistedBest']==assistBest and s['unlocked']==8;report['finalRefresh']=s;shot('all-native-records-assist-OFF-refreshed.png');p.locator('#chapters').click();report['courseMenuText']=p.locator('#chapters-dialog').inner_text();assert p.locator('#chapter-list button').count()==8;shot('manual-channel-eight-course-menu.png');assert not any(report[k]for k in['consoleErrors','httpErrors','requestFailures'])
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
