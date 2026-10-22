from pathlib import Path
import os,json,base64,argparse,datetime
from playwright.sync_api import sync_playwright
R=Path('.local/feather-team-recheck');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
ap=argparse.ArgumentParser();ap.add_argument('--before',action='store_true');ap.add_argument('--online',action='store_true');ap.add_argument('--root');args=ap.parse_args();O=R/('before'if args.before else'online'if args.online else'local');O.mkdir(exist_ok=True)
base='https://yydshly.github.io/classic-games-atlas/'if args.before or args.online else'http://127.0.0.1:58231/'
if args.root:base=args.root.rstrip('/')+'/'
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline':'5d644d6e26523cbe3ee792a9f3dabfdaa2729336','url':base+'versions/v3/games/feather/','method':'Fresh contexts; ordinary buttons and native Tab/Enter, known route/strategy. Snapshots/storage reads only, no state/time/save/result injection. No full ending replay.','cases':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch()
 try:
  for width in [1440,390]:
   c=b.new_context(viewport={'width':width,'height':1000 if width==1440 else 844});p=c.new_page();cdp=c.new_cdp_session(p);row={'width':width,'stages':[],'actions':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row)
   p.on('pageerror',lambda e:row['errors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def snap():return p.evaluate('window.featherJourneySnapshot()')
   def focus():return p.evaluate('()=>{const e=document.activeElement,r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,action:e.dataset.action,arg:e.dataset.arg,text:e.innerText,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,visibleFocus:e.matches(":focus-visible")}}')
   def act(kind,arg=None,key=False):
    old=snap();p.wait_for_timeout(175);sel=f'button[data-action="{kind}"]'+(f'[data-arg="{arg}"]'if arg else ':not([data-arg])');btn=p.locator(sel+':visible');assert btn.count()==1 and btn.is_enabled(),(kind,arg)
    if key:btn.press('Enter')
    else:btn.click()
    p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=old['revision']+1,timeout=5000);s=snap();assert all(s['invariants'].values());row['actions'].append({'kind':kind,'arg':arg,'revision':s['revision'],'keyboard':key});return s
   def stage(label,cardArg=None):
    target=p.locator(f'[data-action="team"][data-arg="{cardArg}"]').locator('..')if cardArg else p.locator('#panel h2');target.scroll_into_view_if_needed();p.wait_for_timeout(70)
    (O/f'{width}-{label}.png').write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
    cards=p.locator('#panel .partner-card').evaluate_all('(es)=>es.map(e=>{const r=e.getBoundingClientRect(),b=e.querySelector("button"),s=e.querySelector(".camp-skill");return{arg:b?.dataset.arg,text:e.innerText,skill:s?.innerText||null,x:r.x,right:r.right,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}})');overflow=p.evaluate('document.documentElement.scrollWidth>innerWidth');assert not overflow and all(x['x']>=0 and x['right']<=width and x['scrollWidth']<=x['clientWidth']+1 for x in cards)
    if not args.before:assert len(cards)==len(snap()['base']['roster'])and all(x['skill']and '耗2能量'in x['skill']for x in cards)
    row['stages'].append({'label':label,'snapshot':snap(),'cards':cards,'focus':focus(),'overflow':overflow});flush()
   def refresh(label):
    s=snap();raw=p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")');p.reload(wait_until='domcontentloaded');p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');p.locator('#resume').click();assert snap()==s and p.evaluate('localStorage.getItem("classic-atlas.feather.journey.v3")')==raw;stage(label)
   def route():
    act('depart');assert p.locator('.camp-skill').count()==0
    for d in ['up','up','right','right','right']:act('move',d)
   try:
    p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.wait_for_function('window.featherJourneySnapshot?.().assetsReady');assert snap()['revision']==0;stage('01-before-selection')
    p.locator('[data-action="team"][data-arg="a"]').focus();row['tabOrder']=[]
    for _ in range(5):p.keyboard.press('Tab');row['tabOrder'].append(focus())
    act('team','a',True);assert snap()['base']['team']==['b'];p.keyboard.press('Tab');assert focus().get('arg')=='c'and focus()['inside'];p.wait_for_timeout(175);old=snap();p.keyboard.press('Enter');p.wait_for_function('(n)=>window.featherJourneySnapshot().revision===n',arg=old['revision']+1,timeout=5000);row['actions'].append({'kind':'team','arg':'c','revision':snap()['revision'],'keyboard':True});assert snap()['base']['team']==['b','c'];stage('02-keyboard-selected','c');assert focus().get('arg')=='c'and focus()['inside']and focus()['visibleFocus'];refresh('03-selected-refreshed')
    act('team','c');act('team','a');act('lead','a');assert snap()['base']['team']==['b','a'];route();assert '造成15伤害'in p.locator('.skill-action').inner_text();act('skill');act('soothe');act('soothe');act('capture')
    if snap()['phase']=='encounter':act('capture')
    act('home');stage('04-new-partner','bud');assert any(q['id']=='bud'for q in snap()['base']['roster']);act('team','b',True);act('team','bud',True);assert snap()['base']['team']==['a','bud'];stage('05-new-team','bud');assert focus().get('arg')=='bud'and focus()['inside']
    route();act('attack');act('attack');act('home');assert snap()['base']['roster'][0]['rank']==1;stage('06-grown','a')
    if not args.before:
     info=p.locator('[data-action="team"][data-arg="a"]').locator('..').locator('.camp-skill').inner_text();assert '基础威力10'in info and '造成'not in info and '12威力'not in info
    refresh('07-grown-refreshed');assert snap()['base']['team']==['a','bud'];assert p.evaluate('localStorage.getItem("classic-atlas.feather.expedition.v2")')is None;assert not any(row[k]for k in ['errors','consoleErrors','httpErrors','requestFailures']);row['passed']=True;flush();print(json.dumps({'mode':O.name,'width':width,'passed':True,'stages':len(row['stages']),'actions':len(row['actions']),'refreshes':2},ensure_ascii=False),flush=True)
   except Exception as e:row['failure']=repr(e);flush();raise
   finally:c.close()
 finally:b.close();flush()
