from pathlib import Path
import os,json,base64,argparse,datetime
from playwright.sync_api import sync_playwright
R=Path('.local/feather-objective-recheck');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
ap=argparse.ArgumentParser();ap.add_argument('--before',action='store_true');ap.add_argument('--online',action='store_true');ap.add_argument('--root');args=ap.parse_args();O=R/('before'if args.before else'online'if args.online else'local');O.mkdir(exist_ok=True)
base='https://yydshly.github.io/classic-games-atlas/'if args.before or args.online else'http://127.0.0.1:58221/'
if args.root:base=args.root.rstrip('/')+'/'
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline':'fed4e45f10a7bd3e46be5c8862e7d2cf3aaabf4c','url':base+'versions/v3/games/feather/','method':'Fresh contexts, normal UI with known route/strategy. Read-only snapshots/storage; no state/time/save/result injection. No ending replay; completed branch covered by separately labelled offline model commands.','cases':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch()
 try:
  for width in [1440,390]:
   c=b.new_context(viewport={'width':width,'height':1000 if width==1440 else 844});p=c.new_page();cdp=c.new_cdp_session(p);row={'width':width,'stages':[],'actions':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row)
   p.on('pageerror',lambda e:row['errors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def snap():return p.evaluate('window.featherJourneySnapshot()')
   def act(kind,arg=None):
    old=snap();p.wait_for_timeout(175);sel=f'button[data-action="{kind}"]'+(f'[data-arg="{arg}"]'if arg else ':not([data-arg])');btn=p.locator(sel+':visible');assert btn.count()==1 and btn.is_enabled(),(kind,arg);btn.click();p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=old['revision']+1);s=snap();assert all(s['invariants'].values());row['actions'].append({'kind':kind,'arg':arg,'revision':s['revision']});return s
   def stage(label,expected=None,shot=True):
    section=p.locator('.journey-progress');section.scroll_into_view_if_needed();p.wait_for_timeout(50);s=snap();hint=p.locator('#progress-hint').inner_text();geometry=section.evaluate('(e)=>{const r=e.getBoundingClientRect();return{inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}}');assert geometry['inside']and not geometry['overflow']
    if expected:assert expected in hint,(label,hint)
    rec={'label':label,'hint':hint,'snapshot':s,'milestones':p.locator('#progress-list li').evaluate_all('(es)=>es.map(e=>({text:e.innerText,done:e.dataset.done}))'),'geometry':geometry};row['stages'].append(rec)
    if shot:(O/f'{width}-{label}.png').write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
    flush();return s
   def refresh(label):
    old=snap();raw=p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")');hint=p.locator('#progress-hint').inner_text();p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');assert p.locator('#overlay').is_visible();p.locator('#resume').click();assert snap()==old and p.locator('#progress-hint').inner_text()==hint and p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")')==raw;stage(label,shot=False)
   def walk():
    for d in ['up','up','right','right','right']:act('move',d)
   try:
    p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');assert snap()['revision']==0;stage('01-search-camp','结识')
    act('depart');stage('02-search-explore','先回营'if args.before else'晶芽草间');walk();stage('03-search-encounter','先回营'if args.before else'羽结')
    act('skill');act('soothe');act('soothe');act('capture')
    if snap()['phase']=='encounter':act('capture')
    s=stage('04-pending-explore','先回营'if args.before else'回营入册');assert s['base']['pending']and not s['progress']['discovered'];refresh('04-pending-refreshed');act('home');s=stage('05-adjust-camp','换入');assert s['progress']['discovered']and not s['progress']['grown'];act('team','b');act('team','bud');s=stage('06-growth-camp','两次');assert s['progress']['adjusted']and not s['progress']['grown'];act('depart');stage('07-growth-explore','先回营'if args.before else'两次');refresh('07-growth-refreshed');walk();stage('08-growth-encounter','先回营'if args.before else'两次');act('attack');act('attack');s=stage('09-grown-explore','先回营'if args.before else'准备就绪');assert s['progress']['grown'];act('home');stage('10-ready-camp','准备就绪');refresh('10-ready-refreshed');act('trialStart');stage('11-trial','每次行动都占一拍');act('trialRetreat');stage('12-return-camp','准备就绪');assert p.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")')is None
    assert not any(row[k]for k in ['errors','consoleErrors','httpErrors','requestFailures']);row['passed']=True;flush();print(json.dumps({'mode':O.name,'width':width,'passed':True,'stages':len(row['stages']),'actions':len(row['actions']),'refreshes':3},ensure_ascii=False),flush=True)
   except Exception as e:row['failure']=repr(e);flush();raise
   finally:c.close()
 finally:b.close();flush()
