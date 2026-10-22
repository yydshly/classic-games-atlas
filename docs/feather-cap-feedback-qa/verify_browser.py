from pathlib import Path
import os,json,base64,argparse,datetime
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--before',action='store_true');ap.add_argument('--online',action='store_true');args=ap.parse_args()
R=Path('.local/feather-cap-round');(R/'tmp').mkdir(exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());mode='before'if args.before else'online'if args.online else'local';O=R/mode;O.mkdir(exist_ok=True)
base='https://yydshly.github.io/classic-games-atlas/'if args.before or args.online else'http://127.0.0.1:58251/';profile=Path('.local/feather-feedback-history-round')/('profile-online'if args.before or args.online else'profile-local');assert profile.exists()
report={'mode':mode,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Existing previously earned native profile; ordinary controls and read-only snapshots. Offline strategy guide never injected. No new ending.','url':base+'versions/v3/games/feather/','actions':[],'shots':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str(profile.resolve()),viewport={'width':1440,'height':1000});p=c.pages[0];cdp=c.new_cdp_session(p)
 p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}))
 def state():return p.evaluate('window.featherJourneySnapshot()')
 def raw():return p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")')
 def act(kind):
  old=state();p.wait_for_timeout(180);btn=p.locator('button[data-action="'+kind+'"]:visible');assert btn.count()==1 and btn.is_enabled();btn.click();p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=old['revision']+1,timeout=5000);s=state();assert all(s['invariants'].values());report['actions'].append({'kind':kind,'before':old,'after':s,'notice':p.locator('#notice').inner_text()});flush();return s
 def shot(label):
  p.locator('#notice').scroll_into_view_if_needed();p.wait_for_timeout(100);(O/(label+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']));assert not p.evaluate('document.documentElement.scrollWidth>innerWidth');report['shots'].append({'label':label,'snapshot':state(),'notice':p.locator('#notice').inner_text(),'skillPreview':p.locator('[data-action="trialSkill"]').inner_text()});flush()
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.wait_for_function('window.featherJourneySnapshot?.().assetsReady')
  if p.locator('#overlay').is_visible():p.locator('#resume').click()
  report['initialRevision']=state()['revision'];report['initialRecord']=json.loads(raw());flush()
  assert state()['base']['active']=='bud' and state()['phase']=='trial'
  if state()['revision']==50:
   for i,step in enumerate(json.loads((R/'plan.json').read_text(encoding='utf-8'))['steps'][:7]):
    if i==6:assert '合奏安心+16' in p.locator('[data-action="trialSkill"]').inner_text();shot('01-before-cap-action')
    s=act(step['kind']);assert s['trial']['calm']==step['calm']
  assert state()['revision']==57 and state()['trial']['calm']==60
  expected='合奏安心+22'if args.before else'合奏安心+16'
  assert expected in p.locator('#notice').inner_text();assert '合奏安心+22' in state()['base']['notice']
  for width in [1440,390]:
   p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});shot('02-capped-'+str(width));old=state();cp=raw();summary=p.locator('#trial-recent-title');summary.scroll_into_view_if_needed();summary.press('Enter');assert p.locator('#trial-recent').evaluate('(e)=>e.open');assert '安心 44→60'in p.locator('#trial-recent-list li').first.inner_text();summary.press('Space');assert not p.locator('#trial-recent').evaluate('(e)=>e.open');assert state()==old and raw()==cp
  report['capActual']=16
  if not args.before:
   act('trialGuard');act('trialSkill');assert state()['trial']['calm']==60;assert '合奏安心+0（已达上限）' in p.locator('#notice').inner_text();assert '下一次来招减半'in p.locator('#notice').inner_text();assert '合奏安心+0'in p.locator('[data-action="trialSkill"]').inner_text()
   old=state();cp=raw();notice=p.locator('#notice').inner_text();p.keyboard.press('2');p.wait_for_timeout(200);assert state()==old and raw()==cp and p.locator('#notice').inner_text()==notice;report['invalidSkillUnchanged']=True
   for width in [1440,390]:
    p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});shot('03-zero-'+str(width))
   p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');p.locator('#resume').click();assert state()==old and raw()==cp and p.locator('#notice').inner_text()==notice;report['refreshExact']=True;shot('04-refreshed-zero')
  assert not state()['journey']['completed'];assert not any(report[k]for k in ['errors','consoleErrors','httpErrors','requestFailures']);report['finalRevision']=state()['revision'];report['passed']=True;flush();print(json.dumps({'mode':mode,'passed':True,'actions':len(report['actions']),'revision':state()['revision'],'capActual':16,'zeroVerified':not args.before},ensure_ascii=False),flush=True)
 except Exception as error:report['failure']=repr(error);flush();raise
 finally:c.close();flush()
