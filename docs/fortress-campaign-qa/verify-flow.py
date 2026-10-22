from pathlib import Path
import argparse,os,json,time,subprocess,uuid,base64
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');args=ap.parse_args()
R=Path('.local/fortress-campaign-round');mode='online'if args.online else'local';O=R/(mode+'-flow');O.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
base='https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58251/'
KEY='classic-atlas.fortress.campaign.v3';OLD='classic-atlas.fortress.v2'
report={'mode':mode,'method':'Normal UI with a strong external copied-snapshot routing policy, W/A/S/D/J keys only. Single player, not human co-op. No live state/time/HP/save/win injection. Local includes intentional idle loss; online repeats successful two-map journey only.','phases':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
def flush():
 with(O/'report.json').open('w',encoding='utf-8')as f:json.dump(report,f,ensure_ascii=False,indent=2)
worker=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
held=set();keys=['w','d','s','a']
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str((R/('profile-'+mode+'-flow-'+uuid.uuid4().hex[:7])).resolve()),viewport={'width':1440,'height':1000})
 p=c.pages[0];p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}));cdp=c.new_cdp_session(p)
 def diag():return p.evaluate('window.__fortressCampaign.snapshot()')
 def raw():return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
 def old():return p.evaluate('(k)=>localStorage.getItem(k)',OLD)
 def shot(name):
  (O/(name+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
  assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
 def release():
  for k in list(held):p.keyboard.up(k);held.remove(k)
 def key(k,on):
  if on and k not in held:p.keyboard.down(k);held.add(k)
  if not on and k in held:p.keyboard.up(k);held.remove(k)
 def choose(s):
  worker.stdin.write(json.dumps(s)+'\n');worker.stdin.flush();return json.loads(worker.stdout.readline())
 def phase(name,**extra):
  report['phases'].append({'name':name,'snapshot':diag(),**extra});flush();print(json.dumps({'phase':name,**extra}),flush=True)
 def ready(stage):
  d=diag();g=d['battle'];assert d['journey']['phase']=='briefing'and d['journey']['stage']==stage
  assert g['state']=='ready'and g['time']==0 and g['kills']==0 and g['base']['hp']==3 and all(q['lives']==3 for q in g['players'])
 def run(win=True):
  p.locator('#primary').focus();p.keyboard.press('Enter');assert diag()['journey']['phase']=='battle'
  began=time.monotonic();mark=-10;decisions=[];stage=diag()['journey']['stage']
  while time.monotonic()-began<210:
   deadline=time.monotonic()+.1;s=diag()
   if s['journey']['phase']!='battle':break
   g=s['battle'];assert g['state']=='playing'
   if g['time']>155:break
   v=choose(g)if win else{'dir':None,'fire':False}
   for i,k in enumerate(keys):key(k,v['dir']==i)
   key('j',v['fire']);decisions.append({'time':g['time'],'choice':v})
   if g['time']>=mark+10:
    mark=g['time'];report['live']={'stage':stage+1,'time':g['time'],'kills':g['kills'],'base':g['base']['hp'],'intent':'policy success attempt'if win else'intentional idle failure branch'};flush();print(json.dumps(report['live']),flush=True)
   p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
  release();d=diag();expected=('intermission'if stage==0 else'complete')if win else'defeat'
  assert d['journey']['phase']==expected,{'expected':expected,'actual':d}
  report.setdefault('attempts',[]).append({'stage':stage+1,'strategy':'copied-snapshot policy'if win else'intentional no-input idle loss','wallSeconds':time.monotonic()-began,'decisions':decisions,'outcome':d['journey']});flush()
 try:
  # Real v2 UI creates an old-format selection record; the candidate must not touch it.
  p.goto(base+'versions/v2/games/fortress/',wait_until='domcontentloaded');p.wait_for_function('window.__fortress?.snapshot()')
  p.locator('#mode').select_option('2');p.locator('#prepare').click();oldBytes=old();assert json.loads(oldBytes)['mode']==2
  p.goto(base,wait_until='domcontentloaded');p.wait_for_function('document.querySelector("#play-result-count")?.textContent.includes(" / 40")')
  p.locator('#play-search').fill('溪谷');entry=p.locator('#selected-play .featured-campaign');entry.scroll_into_view_if_needed();entry.focus();p.wait_for_timeout(750);p.keyboard.press('Enter')
  p.wait_for_url('**/versions/v3/games/fortress/');p.wait_for_function('window.__fortressCampaign')
  ready(0);assert old()==oldBytes;phase('newJourney');shot('01-ready-1440')
  # Genuine active refresh returns to the same mission's preparation.
  p.locator('#primary').click();p.keyboard.down('w');p.wait_for_timeout(140);p.keyboard.up('w');p.keyboard.press('p')
  assert diag()['battle']['state']=='paused';p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__fortressCampaign');ready(0)
  assert p.locator('#restore-note').is_visible();assert old()==oldBytes;phase('activeRefreshCurrentMission')
  run();first=diag()['journey']['wins'][0];assert first['kills']==6 and first['base']>0;phase('firstWon',time=first['time'],score=first['score']);shot('02-intermission-1440')
  saved=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__fortressCampaign?.snapshot().journey.phase==="intermission"');assert raw()==saved
  p.locator('#phase-primary').focus();p.keyboard.press('Enter');ready(1);assert diag()['journey']['wins'][0]==first;phase('secondBriefing');shot('03-second-ready-1440')
  saved=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__fortressCampaign');ready(1);assert raw()==saved
  if not args.online:
   run(False);lost=diag()['journey'];assert lost['wins'][0]==first and lost['failures']==[0,1];phase('secondNaturalIdleLoss');shot('04-second-loss-1440')
   saved=raw();p.wait_for_timeout(200);assert raw()==saved;p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__fortressCampaign?.snapshot().journey.phase==="defeat"');assert raw()==saved
   p.locator('#phase-primary').focus();p.keyboard.press('Enter');ready(1);assert diag()['journey']['wins'][0]==first;phase('retryOnlySecond')
  run();done=diag()['journey'];assert len(done['wins'])==2 and done['wins'][0]==first
  assert p.locator('#results .result-card').count()==2 and '重新开始'in p.locator('#phase-primary').inner_text();assert old()==oldBytes
  phase('complete',successActiveSeconds=sum(x['time']for x in done['wins']),score=sum(x['score']for x in done['wins']));shot('05-complete-1440')
  saved=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__fortressCampaign?.snapshot().journey.phase==="complete"');assert raw()==saved;assert diag()['journey']==done
  p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(200);shot('06-complete-390')
  p.locator('#phase-primary').click();assert p.locator('#restart-dialog').evaluate('(e)=>e.open');p.locator('#restart-cancel').press('Enter');assert diag()['journey']==done
  # End by a native keyboard return to the exact optional entry, keeping the library query.
  p.locator('#lobby').focus();p.keyboard.press('Enter');p.wait_for_function('document.activeElement?.matches("#selected-play .featured-campaign")');assert p.locator('#play-search').input_value()=='溪谷';p.wait_for_timeout(750);shot('07-returned-entry-390')
  p.keyboard.press('Enter');p.wait_for_function('window.__fortressCampaign?.snapshot().journey.phase==="complete"')
  p.locator('#phase-primary').click();p.locator('#restart-confirm').click();ready(0);assert diag()['journey']['wins']==[]and diag()['journey']['failures']==[0,0];assert old()==oldBytes
  phase('confirmedNewJourneyOldV2Preserved');shot('08-restarted-390')
  report['oldV2BytesPreserved']=True;report['completedOutcome']=done;report['navigationCancellations']=[x for x in report['requestFailures']if x['error']=='net::ERR_ABORTED'];report['requestFailures']=[x for x in report['requestFailures']if x['error']!='net::ERR_ABORTED'];assert not any(report[k]for k in ['consoleErrors','httpErrors','requestFailures']);report['passed']=True;flush()
 except Exception as e:
  report['failure']=repr(e)
  try:report['last']=diag();shot('failure')
  except:pass
  flush();raise
 finally:
  release();c.close();worker.stdin.close()
  try:worker.wait(timeout=5)
  except:worker.terminate()
print(json.dumps({'passed':True,'mode':mode,'phases':len(report['phases']),'actualWins':2,'idleLoss':not args.online}),flush=True)
