from pathlib import Path
import os,json,base64,datetime,argparse
from playwright.sync_api import sync_playwright
R=Path('.local/feather-summary-recheck');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
ap=argparse.ArgumentParser();ap.add_argument('--before',action='store_true');ap.add_argument('--online',action='store_true');ap.add_argument('--root');args=ap.parse_args();mode='before'if args.before else'online'if args.online else'local';O=R/mode;O.mkdir(exist_ok=True)
base='https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58241/'
if args.root:base=args.root.rstrip('/')+'/'
profile=R/('profile-online'if args.online else'profile-local');plan=json.loads(Path(__file__).with_name('plan.json').read_text(encoding='utf-8'))
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base+'versions/v3/games/feather/','mode':mode,'method':'Native persistent isolated browser profile. Ending earned by ordinary visible UI using known legal strategy; later local verification reopens the same real profile. No save/state/time/result injection. Offline plan is only strategy reference.','actions':[],'states':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str(profile.resolve()),viewport={'width':1440,'height':1000});p=c.pages[0]if c.pages else c.new_page();cdp=c.new_cdp_session(p)
 p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}))
 def snap():return p.evaluate('window.featherJourneySnapshot()')
 def raw():return p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")')
 def act(kind,arg=None):
  old=snap();p.wait_for_timeout(175);sel=f'button[data-action="{kind}"]'+(f'[data-arg="{arg}"]'if arg else ':not([data-arg])');btn=p.locator(sel+':visible');assert btn.count()==1 and btn.is_enabled(),(kind,arg);btn.click();p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=old['revision']+1,timeout=5000);s=snap();assert all(s['invariants'].values());report['actions'].append({'kind':kind,'arg':arg,'revision':s['revision']});flush()
 def shot(label):
  (O/(label+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']));report['states'].append({'label':label,'snapshot':snap(),'campText':p.locator('#panel').inner_text(),'journalText':p.locator('#journal').inner_text(),'focus':p.evaluate('document.activeElement.id'),'overflow':p.evaluate('document.documentElement.scrollWidth>innerWidth')});flush()
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.wait_for_function('window.featherJourneySnapshot?.().assetsReady')
  if p.locator('#overlay').is_visible():p.locator('#resume').click()
  if not snap()['journey']['completed']:
   assert snap()['revision']==0,'Existing unfinished real session; inspect rather than overwrite.'
   assert p.locator('#review-summary').count()==0
   for step in plan['steps']:act(step['kind'],step.get('arg'))
   assert snap()['phase']=='ending';assert snap()['ending']==plan['expectedEnding'];report['naturalEnding']=snap()['ending'];(R/('earned-online.json'if args.online else'earned-local.json')).write_text(json.dumps({'ending':snap()['ending'],'story':p.locator('.ending-story').inner_text(),'lines':p.locator('.summary-list').inner_text(),'earnedByNormalUi':True,'actions':len(plan['steps'])},ensure_ascii=False,indent=2),encoding='utf-8');p.locator('#ending-title').scroll_into_view_if_needed();shot('01-natural-ending');act('continue')
  if args.before:
   act('depart');act('move','up');act('home');p.locator('#panel h2').scroll_into_view_if_needed();shot('02-free-return');assert snap()['journey']['completed']and snap()['ending']is None
   p.locator('.journal summary').click();p.locator('.journal').scroll_into_view_if_needed();shot('03-journal');report['journalVisibleText']=p.locator('.journal').inner_text();p.locator('#help').click();report['helpText']=p.locator('#dialog-body').inner_text();shot('04-help');p.locator('#resume').click();before=snap();cp=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');p.locator('#resume').click();assert snap()==before and raw()==cp;report['refreshExact']=True
   for width in [1440,390]:
    p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});p.locator('.trial-card').scroll_into_view_if_needed();shot(f'05-no-reread-{width}');assert not p.locator('#panel button').filter(has_text='总结').count()
   report['observedGap']='Natural ending then free outing/return: summary noted in camp but no reread control; journal and help lack original ending story/statistics; refresh retains completion but no summary.'
  else:
   earned=json.loads((R/('earned-online.json'if args.online else'earned-local.json')).read_text(encoding='utf-8'));assert earned['earnedByNormalUi'];report['earnedEndingReference']=earned
   assert snap()['phase']=='camp'and snap()['journey']['completed']and snap()['ending']is None
   for wanted in ['b','c']:
    if wanted not in snap()['base']['team']:
     if len(snap()['base']['team'])==2:act('team',next(x for x in snap()['base']['team']if x not in ['b','c']))
     act('team',wanted)
   assert snap()['base']['team']==['b','c'];report['reviewChecks']=[]
   def review(label,keyboard=False):
    before=snap();cp=raw();button=p.locator('#review-summary');button.scroll_into_view_if_needed()
    if keyboard:button.press('Enter')
    else:button.click()
    assert p.locator('#overlay').is_visible();assert p.locator('#dialog-body .ending-story').inner_text()==earned['story'];assert p.locator('#dialog-body .summary-list').inner_text()==earned['lines'];assert snap()==before and raw()==cp
    geom=p.locator('#resume').evaluate('(e)=>{const r=e.getBoundingClientRect();return{inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,focus:document.activeElement.id}}');assert geom['inside']and geom['focus']=='resume';assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
    if keyboard:
     p.keyboard.press('Tab');assert p.evaluate('document.activeElement.id')=='resume';p.keyboard.press('Shift+Tab');assert p.evaluate('document.activeElement.id')=='resume'
    shot(label)
    if keyboard:p.keyboard.press('Escape')
    else:p.locator('#resume').click()
    assert p.locator('#overlay').is_hidden();assert p.evaluate('document.activeElement.id')=='review-summary';rect=button.bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=p.evaluate('innerHeight');assert snap()==before and raw()==cp;report['reviewChecks'].append({'label':label,'keyboard':keyboard,'stateExact':True,'saveBytesExact':True,'originalStoryAndFactsExact':True,'focusReturnedVisible':True});flush()
   for width in [1440,390]:
    p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});p.locator('#review-summary').scroll_into_view_if_needed();shot(f'02-entry-{width}')
    for i in range(3):review(f'03-review-{width}-{i+1}',keyboard=i==0)
    shot(f'04-focus-return-{width}')
   act('depart');assert p.locator('#review-summary').count()==0;act('move','up');act('home');assert snap()['base']['outing']>earned['ending']['outings'];before=snap();cp=raw();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');p.locator('#resume').click();assert snap()==before and raw()==cp;report['refreshExact']=True;review('05-after-free-travel-refresh',keyboard=True)
   assert snap()['base']['team']==['b','c'];assert p.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")')is None
  assert not any(report[k]for k in ['errors','consoleErrors','httpErrors','requestFailures']);report['passed']=True;flush();print(json.dumps({'mode':mode,'passed':True,'recordedUiActions':len(report['actions']),'phase':snap()['phase'],'completed':snap()['journey']['completed'],'profileRetained':True},ensure_ascii=False),flush=True)
 except Exception as e:report['failure']=repr(e);flush();raise
 finally:c.close();flush()
