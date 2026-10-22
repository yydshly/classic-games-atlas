from pathlib import Path
import json,os,time,uuid,base64,argparse
from playwright.sync_api import sync_playwright
R=Path('.local/brook-campaign-round');(R/'tmp').mkdir(parents=True,exist_ok=True)
ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');ap.add_argument('--resume-profile');args=ap.parse_args()
O=R/('online-ui'if args.online else'local-ui');O.mkdir(exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
plans=json.loads(Path(__file__).with_name('plans.json').read_text());base='https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58252/'
KEY='classic-atlas.brook.campaign.v3';OLD='classic-atlas.brook.v2'
report={'mode':'online'if args.online else'local','method':'Normal UI button/card/select/keyboard input, known offline legal plans at native1x; no time/state/save/terminal injection. Local includes natural idle loss and current-stage retry. Not human difficulty/fun or real-phone acceptance.','phases':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
if args.resume_profile:
 report['phases']=json.loads((O/'attempt3-option-selection.json').read_text(encoding='utf-8'))['phases']
 report['executionNotes']=['First live attempt naturally lost because string select_option matched visible labels instead of zero-based values. Corrected test to explicit option indices. Reused that genuine profile, retried only current first stage; no progress injected.']
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright()as pw:
 profile=Path(args.resume_profile)if args.resume_profile else R/('profile-'+report['mode']+'-'+uuid.uuid4().hex[:6])
 c=pw.chromium.launch_persistent_context(str(profile.resolve()),viewport={'width':1440,'height':1000})
 p=c.pages[0];p.on('pageerror',lambda e:report['consoleErrors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}));cdp=c.new_cdp_session(p)
 def diag():return p.evaluate('window.__brookCampaign.snapshot()')
 def raw(k=KEY):return p.evaluate('(k)=>localStorage.getItem(k)',k)
 def shot(n):
  (O/(n+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
  assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
 def phase(n,**kw):report['phases'].append({'name':n,'snapshot':diag(),**kw});flush();print(json.dumps({'phase':n,**kw}),flush=True)
 def ready(stage):
  d=diag();assert d['campaign']['stage']==stage and d['campaign']['phase']=='ready'and d['battle']['state']=='ready'and d['battle']['time']==0 and not d['battle']['plants']
 def run(plan,expect):
  p.locator('#primary-action').focus();p.keyboard.press('Enter')
  if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').press('Enter')
  assert diag()['battle']['state']=='playing';i=0;mark=0;began=time.monotonic();actions=[]
  while time.monotonic()-began<190:
   d=diag()
   if not d['battle']or d['battle']['state']!='playing':break
   g=d['battle'];t=g['time']
   if not p.locator('#collect').is_disabled():p.locator('#collect').click();actions.append({'kind':'collect','time':t})
   if i<len(plan)and t>=plan[i][0]:
    _,unit,r,col=plan[i];p.locator('[data-type="'+unit+'"]').click(timeout=2000);p.locator('#row').select_option(index=r);p.locator('#col').select_option(index=col)
    q=diag();assert q['row']==r and q['col']==col
    if not p.locator('#deploy').is_disabled():p.locator('#deploy').click();actions.append({'kind':'place','time':t,'type':unit,'row':r,'col':col});i+=1
   if t>=mark+20:mark=t;print(json.dumps({'stage':g['level'],'time':t,'kills':g['stats']['kills'],'steps':i}),flush=True)
   p.wait_for_timeout(100)
  d=diag();assert d['campaign']['phase']==expect,d
  report.setdefault('runs',[]).append({'stage':d['campaign']['stage'],'expect':expect,'planSteps':i,'actions':actions,'outcome':d['campaign']});flush()
 try:
  # Establish old state through its normal UI, not a seeded valid save.
  if not args.resume_profile:
   p.goto(base+'versions/v2/games/brook/index.html',wait_until='domcontentloaded');p.wait_for_selector('#sound');p.locator('#sound').click();old=raw(OLD);assert old
  p.goto(base,wait_until='domcontentloaded');old=raw(OLD);assert old;p.wait_for_function('document.querySelector("#play-result-count")?.textContent.includes(" / 40")')
  p.locator('#play-search').fill('邮差');e=p.locator('#selected-play [data-play="brook"] .featured-campaign');e.scroll_into_view_if_needed();e.focus();p.wait_for_timeout(500);p.keyboard.press('Enter');p.wait_for_url('**/versions/v3/games/brook/',wait_until='domcontentloaded');p.wait_for_function('window.__brookCampaign')
  if args.resume_profile:
   assert diag()['campaign']['phase']=='lost'and diag()['campaign']['stage']==0
   p.locator('#campaign-next').press('Enter');ready(0);phase('resumedActualFirstLossRetry')
  else:
   ready(0);assert raw(OLD)==old;phase('newCampaign');shot('01-ready-1440');p.locator('#sound').click()
  # Short genuine keyboard deployment / active refresh. Reset current stage through its normal button afterward.
  if not args.resume_profile:
   p.locator('#primary-action').click();p.locator('#help-confirm').click();p.locator('#battle').focus();p.keyboard.press('2');p.keyboard.press('ArrowRight');p.keyboard.press('Enter');assert len(diag()['battle']['plants'])==1
   p.keyboard.press('p');saved=diag()['battle'];p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__brookCampaign');rest=diag()['battle'];assert rest['state']=='paused'
   for k in ['ticks','time','resource','plants','enemies','cooldown','nextSpawn']:assert rest[k]==saved[k],k
   phase('activeRefreshPausedExact');p.locator('#reset').click();ready(0)
  run(plans['firstPlan'],'intermission');phase('firstWon');shot('02-first-won')
  saved=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__brookCampaign');assert raw()==saved and diag()['campaign']['phase']=='intermission'
  p.locator('#campaign-next').press('Enter');ready(1);phase('secondReady');run(plans['secondPlan'],'intermission');phase('secondWon');shot('03-second-won')
  p.locator('#campaign-next').press('Enter');ready(2);phase('thirdReady');shot('04-final-goal')
  if not args.online:
   run([],'lost');assert len(diag()['campaign']['completed'])==2;phase('thirdNaturalIdleLoss');shot('05-third-loss')
   saved=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__brookCampaign');assert raw()==saved and diag()['campaign']['phase']=='lost'
   p.locator('#campaign-next').press('Enter');ready(2);phase('retryOnlyThird')
  run(plans['finalePlans']['roots'],'complete');assert len(diag()['campaign']['completed'])==3;phase('complete');shot('06-complete-1440')
  done=diag()['campaign'];saved=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__brookCampaign');assert diag()['campaign']==done and raw()==saved
  p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(150);shot('07-complete-390');p.locator('#campaign-next').click();p.locator('#new-cancel').press('Enter');assert diag()['campaign']==done
  p.locator('#lobby').focus();p.keyboard.press('Enter');p.wait_for_function('document.activeElement?.matches("#selected-play [data-play=brook] .featured-campaign")');assert p.locator('#play-search').input_value()=='邮差'
  p.keyboard.press('Enter');p.wait_for_function('window.__brookCampaign');assert diag()['campaign']['phase']=='complete'
  p.locator('#campaign-next').click();p.locator('#new-confirm').click();ready(0);assert diag()['campaign']['completed']==[]and raw(OLD)==old;phase('confirmedNewJourneyOldV2Preserved');shot('08-new-390')
  report['completedOutcome']=done;report['oldV2BytesPreserved']=True;report['navigationCancellations']=[x for x in report['requestFailures']if x['error']=='net::ERR_ABORTED'];report['requestFailures']=[x for x in report['requestFailures']if x['error']!='net::ERR_ABORTED']
  assert not any(report[k]for k in ['consoleErrors','httpErrors','requestFailures']);report['passed']=True;flush()
 except Exception as err:
  report['failure']=repr(err);report['lastUrl']=p.url
  try:report['last']=diag();shot('failure')
  except:pass
  flush();raise
 finally:c.close()
print(json.dumps({'passed':True,'mode':report['mode'],'wins':3,'phases':len(report['phases'])}),flush=True)
