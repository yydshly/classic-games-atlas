import json,pathlib,subprocess,os,time,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/independent-success-round');out=R/'venture-public';out.mkdir(parents=True,exist_ok=True);tmp=R/'tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp.resolve());KEY='atlas-venture-rivals-v2.1';report={'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/venture/','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Production native random seed and normal buttons only. Full native save incl RNG read into separate legal-command beam planner: strong perfect-information assistance, NOT unknown-dice human strategy. No activity/state/RNG/cash/property/save/result writes or imports. Max2 full natural attempts.','attempts':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs').resolve()),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
def plan(s):w.stdin.write(json.dumps(s)+'\n');w.stdin.flush();d=json.loads(w.stdout.readline());assert'error'not in d,d;return d
def flush():(out/'public-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:report['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:report['requestFailures'].append({'url':x.url,'error':x.failure}));p.on('dialog',lambda d:d.accept())
 def raw():return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
 def snap():return json.loads(raw())
 def shot(n):p.screenshot(path=str(out/n),full_page=True)
 def ready():p.wait_for_function("document.querySelector('#roll')&&!document.querySelector('#roll').disabled||document.querySelector('#turn')?.textContent==='本局已结算'",timeout=15000)
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#level').select_option('2');ready();assert snap()['scenario']=='lantern'and snap()['round']==1 and snap()['phase']=='ready';report['nativeStart']=snap();shot('native-lantern-start.png')
  for attempt in range(1,3):
   a={'attempt':attempt,'turns':[]};report['attempts'].append(a)
   for turn in range(12):
    ready();s=snap()
    if s['phase']=='finished':break
    assert s['turn']==0 and s['phase']=='ready';decision=plan(s);row={'round':s['round'],'before':s,'prediction':decision,'actions':[]};a['turns'].append(row)
    for action in decision['actions']:
     if action[0]=='move':p.locator('#steps').select_option(str(action[1]));p.locator('#voucher').click()
     else:p.locator('#'+action[0]).click()
     if action[0]in['roll','move']:p.locator('#end').wait_for(state='visible');p.wait_for_function("!document.querySelector('#end').disabled||document.querySelector('#turn').textContent==='本局已结算'",timeout=8000)
     row['actions'].append({'command':action,'after':snap()})
     if snap()['phase']=='finished':break
    ready();row['afterAI']=snap();flush();print(json.dumps({'attempt':attempt,'finishedRound':s['round'],'nextRound':snap()['round'],'phase':snap()['phase'],'cash':[x['cash']for x in snap()['players']],'predictedWinner':decision['winner']}),flush=True)
    if s['round']in[1,6]:shot(f'attempt-{attempt}-round-{s["round"]}.png')
   ready();p.wait_for_timeout(1500);s=snap();assert s['phase']=='finished';a['outcome']=s;a['visible']={k:p.locator('#'+k).inner_text()for k in['notice','round','turn','pCash','aCash','pWorth','aWorth','phase']};shot(f'attempt-{attempt}-finished-{s["winner"]}.png');flush()
   if s['winner']==0:report['status']='passed';break
   if attempt<2:p.locator('#restart').click();ready()
  if report.get('status')!='passed':report['status']='bounded_uncompleted';report['reason']='Two natural native-seed attempts ended without player victory; no game defect inferred.'
  terminal=raw();p.reload(wait_until='domcontentloaded');p.locator('#restart').wait_for();p.wait_for_timeout(200);assert raw()==terminal and snap()['phase']=='finished'and p.locator('#roll').is_disabled()and p.locator('#buy').is_disabled()and p.locator('#upgrade').is_disabled()and p.locator('#end').is_disabled()and p.locator('#next').is_hidden();report['terminalRefresh']={'exactNativeSave':True,'snapshot':snap(),'noFourthScenario':True};shot('finished-refreshed.png');p.locator('#restart').click();ready();s=snap();assert s['scenario']=='lantern'and s['round']==1 and s['winner']is None and all(x['cash']==850 and x['vouchers']==2 for x in s['players'])and all(x['owner']is None for x in s['shops']);report['restartClean']=s;shot('lantern-restart-clean.png');assert not any(report[k]for k in['consoleErrors','httpErrors','requestFailures'])
 except Exception as e:
  report['status']='harness_failed';report['error']=repr(e)
  try:report['lastSnapshot']=snap();shot('failure-debug.png')
  except:pass
  raise
 finally:
  flush();c.close();w.stdin.close()
  try:w.wait(timeout=5)
  except:w.terminate()
print(json.dumps({'status':report['status'],'attempts':len(report['attempts'])}),flush=True)
