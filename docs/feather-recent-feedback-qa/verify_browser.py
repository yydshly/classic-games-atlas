from pathlib import Path
import os,json,base64,datetime,argparse
from playwright.sync_api import sync_playwright
R=Path('.local/feather-feedback-recheck');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
ap=argparse.ArgumentParser();ap.add_argument('--before',action='store_true');ap.add_argument('--online',action='store_true');ap.add_argument('--root');ap.add_argument('--resume-refresh',action='store_true');args=ap.parse_args();mode='before'if args.before else'online'if args.online else'local';O=R/mode;O.mkdir(exist_ok=True);base='https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58251/';plan=json.loads(Path(__file__).with_name('plan.json').read_text(encoding='utf-8'))
if args.root:base=args.root.rstrip('/')+'/'
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base+'versions/v3/games/feather/','method':'Persistent isolated native profile; ordinary visible controls and keyboard, known preparation route; copied snapshots/storage only. No state/save/time/outcome injection and no ending replay.','actions':[],'states':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
if args.resume_refresh:
 report=json.loads((R/'local-first-attempt.json').read_text(encoding='utf-8'));report['continuation']={'reason':'Collapsed details innerText was empty; game state and textContent were intact. Resume only refresh/retreat/retry checks.','firstFailure':report.pop('failure',None)}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright()as pw:
 if args.before and Path('.local/feather-summary-round/profile-online').exists():
  old=pw.chromium.launch_persistent_context(str(Path('.local/feather-summary-round/profile-online').resolve()),viewport={'width':1440,'height':1000});q=old.pages[0];q.goto('https://yydshly.github.io/classic-games-atlas/versions/v3/games/feather/',wait_until='domcontentloaded',timeout=25000);q.wait_for_function('window.featherJourneySnapshot?.().assetsReady')
  if q.locator('#overlay').is_visible():q.locator('#resume').click()
  s=q.evaluate('window.featherJourneySnapshot()');assert s['journey']['completed'];report['existingRealCompletedSession']={'revision':s['revision'],'trialActions':s['journey']['lastAttempt']['actions'],'journal':q.locator('#journal').inner_text(),'phase':s['phase']};assert '浅滩回响'not in report['existingRealCompletedSession']['journal'];old.close();flush()
 profile=R/('profile-online'if args.online else'profile-local');c=pw.chromium.launch_persistent_context(str(profile.resolve()),viewport={'width':1440,'height':1000});p=c.pages[0];cdp=c.new_cdp_session(p)
 p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}))
 def snap():return p.evaluate('window.featherJourneySnapshot()')
 def raw():return p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")')
 def act(kind,arg=None):
  before=snap();p.wait_for_timeout(175);sel=f'button[data-action="{kind}"]'+(f'[data-arg="{arg}"]'if arg else ':not([data-arg])');btn=p.locator(sel+':visible');assert btn.count()==1 and btn.is_enabled(),(kind,arg);btn.click();p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=before['revision']+1,timeout=5000);after=snap();assert all(after['invariants'].values());report['actions'].append({'kind':kind,'arg':arg,'before':before,'after':after,'noticeText':p.locator('#notice').inner_text()});flush();return after
 def shot(label,target='#notice'):
  p.locator(target).scroll_into_view_if_needed();p.wait_for_timeout(100);(O/(label+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']));report['states'].append({'label':label,'snapshot':snap(),'notice':p.locator('#notice').inner_text(),'recent':p.locator('#trial-recent-list').inner_text()if p.locator('#trial-recent-list').count()else None,'overflow':p.evaluate('document.documentElement.scrollWidth>innerWidth')});assert not report['states'][-1]['overflow'];flush()
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.wait_for_function('window.featherJourneySnapshot?.().assetsReady')
  if p.locator('#overlay').is_visible():p.locator('#resume').click()
  if snap()['revision']==0:
   for step in plan['steps']:act(step['kind'],step.get('arg'))
   assert snap()['phase']=='trial'and snap()['trial']['turn']==0
   act('trialGuard');s=snap();assert next(x for x in s['base']['roster']if x['id']=='a')['energy']==3;shot('01-full-energy-guard');assert ('能量+1'if args.before else'能量+0（已达上限）')in p.locator('#notice').inner_text()
   act('trialSkill');shot('02-skill');act('trialSwitch','bud');shot('03-switch');report['initialThreeActions']=report['actions'][-3:]
  if args.before:
   assert '能量+1'in report['actions'][-3]['noticeText'];assert '缠风消去'not in p.locator('#notice').inner_text();assert p.locator('#trial-recent').count()==0;p.locator('.journal summary').click();p.locator('.journal').scroll_into_view_if_needed();shot('04-journal','.journal');report['journalText']=p.locator('.journal').inner_text();assert '回涌'not in report['journalText'];cp=raw();s=snap();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');p.locator('#resume').click();assert snap()==s and raw()==cp;report['refreshExact']=True;p.set_viewport_size({'width':390,'height':844});shot('05-narrow-latest-only');report['confirmed']='Immediate effects exist, but prior trial action result is replaced and absent from journal; full-energy guard says+1 while energy3 stays3.'
  else:
   report['readOnlyChecks']=[]
   def open_recent(label):
    old=snap();cp=raw();summary=p.locator('#trial-recent-title');summary.scroll_into_view_if_needed()
    if not p.locator('#trial-recent').evaluate('(e)=>e.open'):summary.press('Enter')
    assert p.locator('#trial-recent').evaluate('(e)=>e.open');assert snap()==old and raw()==cp;assert 1<=p.locator('#trial-recent-list li').count()<=3;shot(label,'#trial-recent');report['readOnlyChecks'].append({'label':label,'stateExact':True,'saveBytesExact':True});flush()
   if not args.resume_refresh:
    assert snap()['phase']=='trial'and snap()['trial']['turn']==3;open_recent('06-restored-three');rows=p.locator('#trial-recent-list li').all_text_contents();assert '能量 3→3'in rows[2]and '护盾吸收15'in rows[2];assert '能量 3→1'in rows[1]and '余势 190→175'in rows[1];assert '晶雾芽'in rows[0]and '体力净值 78→54'in rows[0]
    act('trialGuard');assert '能量+0（已达上限）'in p.locator('#notice').inner_text();assert '能量已满'in p.locator('[data-action="trialGuard"]').inner_text();assert p.locator('#trial-recent').evaluate('(e)=>e.open');shot('07-actual-full-energy-guard');assert p.locator('#trial-recent-list li').count()==3
    act('trialHeal');assert '露莓 2→1'in p.locator('#trial-recent-list li').first.inner_text();act('trialSkill');assert '安心 0→22'in p.locator('#trial-recent-list li').first.inner_text();old=snap();cp=raw();text=p.locator('#trial-recent-list').inner_text();p.keyboard.press('2');p.wait_for_timeout(175);assert snap()==old and raw()==cp and p.locator('#trial-recent-list').inner_text()==text;report['blockedSkillNoPhantomRow']=True
    for width in [1440,390]:
     p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});open_recent(f'08-recent-{width}');old=snap();cp=raw();summary=p.locator('#trial-recent-title');summary.press('Enter');assert not p.locator('#trial-recent').evaluate('(e)=>e.open');summary.press('Space');assert p.locator('#trial-recent').evaluate('(e)=>e.open');assert snap()==old and raw()==cp
   else:
    assert snap()['phase']=='trial'and snap()['trial']['turn']==6;p.set_viewport_size({'width':390,'height':844})
   old=snap();cp=raw();text=p.locator('#trial-recent-list li').all_text_contents();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');p.locator('#resume').click();assert snap()==old and raw()==cp and p.locator('#trial-recent-list li').all_text_contents()==text;open_recent('09-refreshed');report['refreshHistoryExact']=True
   act('trialRetreat');assert '上次回响'in p.locator('#trial-recent-title').inner_text();open_recent('10-retreated');old=snap();cp=raw();act('trialStart');assert p.locator('#trial-recent').is_hidden();act('trialGuard');assert p.locator('#trial-recent-list li').count()==1 and '回响 2'in p.locator('#trial-recent-title').inner_text();open_recent('11-retry-one-row');assert not snap()['journey']['completed'];assert snap()['trial']['turn']==1;report['retryNoOldRows']=True
  assert not any(report[k]for k in ['errors','consoleErrors','httpErrors','requestFailures']);report['passed']=True;flush();print(json.dumps({'mode':mode,'passed':True,'actions':len(report['actions']),'trialTurn':snap()['trial']['turn']if snap()['trial']else None,'completed':snap()['journey']['completed']},ensure_ascii=False),flush=True)
 except Exception as e:report['failure']=repr(e);flush();raise
 finally:c.close();flush()
