from pathlib import Path
import argparse,os,json,base64,datetime
from playwright.sync_api import sync_playwright
R=Path('.local/feather-feedback-recheck');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');ap.add_argument('--root');args=ap.parse_args()
O=R/('online'if args.online else'local');O.mkdir(exist_ok=True)
base='https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58211/'
if args.root:base=args.root.rstrip('/')+'/'
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base+'versions/v3/games/feather/','method':'Fresh browser contexts; ordinary clicks and native Tab/Enter/2. Read-only snapshots and storage reads. Known short route/strategy, no game/time/save/energy/result injection. First encounter and prepared trial skill feedback only; no new ending/full campaign claim.','cases':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch()
 try:
  for width in [1440,390]:
   c=b.new_context(viewport={'width':width,'height':1000 if width==1440 else 844});p=c.new_page();cdp=c.new_cdp_session(p)
   row={'width':width,'steps':[],'states':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row)
   p.on('pageerror',lambda e:row['errors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def snap():return p.evaluate('window.featherJourneySnapshot()')
   def act(kind,arg=None,key=False):
    old=snap();p.wait_for_timeout(175);sel=f'button[data-action="{kind}"]'+(f'[data-arg="{arg}"]'if arg else ':not([data-arg])');btn=p.locator(sel+':visible');assert btn.count()==1 and btn.is_enabled(),(kind,arg)
    if key:btn.press('Enter')
    else:btn.click()
    p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=old['revision']+1)
    after=snap();assert all(after['invariants'].values());row['steps'].append({'kind':kind,'arg':arg,'revision':after['revision'],'keyboard':key});return after
   def shot(name):
    skill=p.locator('.skill-action');skill.scroll_into_view_if_needed();p.wait_for_timeout(80)
    (O/f'{width}-{name}.png').write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
    geometry=skill.evaluate('(e)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),t=e.querySelector("small");return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,opacity:s.opacity,background:s.backgroundColor,smallColor:getComputedStyle(t).color,overflow:document.documentElement.scrollWidth>innerWidth}}')
    assert geometry['inside']and not geometry['overflow'];row['states'].append({'name':name,'snapshot':snap(),'text':skill.inner_text(),'disabled':skill.is_disabled(),'geometry':geometry});flush();return skill
   def route():
    act('depart')
    for d in ['up','up','right','right','right']:act('move',d)
    assert snap()['phase']=='encounter'
   try:
    p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');assert snap()['revision']==0
    route();assert '造成15伤害'in p.locator('.skill-action').inner_text();act('skill');skill=shot('01-blocked');assert skill.is_disabled()and '当前1/3'in skill.inner_text()and '暂不可用：需要2能量'in skill.inner_text()and '守息'in skill.inner_text()
    before=snap();box=skill.bounding_box();p.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2);p.wait_for_timeout(175);assert snap()==before,'disabled native click must not consume action'
    guard=p.locator('[data-action="guard"]');guard.press('Enter');p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=before['revision']+1);assert '当前2/3'in skill.inner_text()and skill.is_enabled()and '暂不可用'not in skill.inner_text();shot('02-recovered');act('skill');assert '当前0/3'in skill.inner_text();act('guard');assert skill.is_disabled();act('guard');assert skill.is_enabled();assert '造成12伤害'in skill.inner_text();shot('03-capped-target')
    for i in range(2):act('soothe')
    act('capture')
    if snap()['phase']=='encounter':act('capture')
    assert snap()['phase']=='explore'and len(snap()['base']['pending'])==1
    act('home');route();act('attack');act('attack');assert snap()['phase']=='explore';act('home')
    s=snap();assert s['base']['roster'][0]['rank']==1 and any(x['id']=='bud'for x in s['base']['roster']);act('team','b');act('team','bud');assert snap()['progress']['adjusted'];act('trialStart');assert snap()['phase']=='trial'
    trial=shot('04-trial-ready');assert '余势−15'in trial.inner_text()and '当前3/3'in trial.inner_text();act('trialSkill');assert trial.is_disabled()and '需要2能量'in trial.inner_text();before=snap();p.keyboard.press('2');p.wait_for_timeout(175);assert snap()==before,'blocked shortcut cannot advance a beat'
    act('trialGuard',key=True);assert trial.is_enabled()and '当前2/3'in trial.inner_text();shot('05-trial-recovered');act('trialSwitch','bud',True);assert '合奏安心+22'in trial.inner_text()and '当前3/3'in trial.inner_text();shot('06-switched-skill');act('trialSkill');assert snap()['trial']['calm']==22 and trial.is_disabled();act('trialRetreat');assert p.locator('.skill-action').count()==0
    saved=p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")');state=snap();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');assert p.locator('#overlay').is_visible();p.locator('#resume').click();assert snap()==state and p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")')==saved;assert p.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")')is None
    row['refreshExact']=True;row['oldV2Untouched']=True;row['finalState']=snap();assert not any(row[k]for k in ['errors','consoleErrors','httpErrors','requestFailures']);row['passed']=True;flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'passed':True,'actions':len(row['steps']),'trial':'two skills / guard / switch / retreat / refresh; no ending rerun'},ensure_ascii=False),flush=True)
   except Exception as e:
    row['failure']=repr(e);flush();raise
   finally:c.close()
 finally:b.close();flush()
