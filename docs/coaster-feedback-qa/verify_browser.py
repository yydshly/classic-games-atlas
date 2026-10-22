import pathlib,os,json,time,base64,datetime,argparse
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/coaster-feedback-round');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');ap.add_argument('--out');args=ap.parse_args();O=R/(args.out or('online'if args.online else'local'));O.mkdir(exist_ok=True);base='https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58201/';report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base+'versions/v2/games/coaster/','method':'Fresh isolated contexts. Ordinary first-park empty test failure, visible diagnostic click, Tab/Enter install lift, second natural test station failure, diagnostic Enter, install brake, natural safe test and one completed passenger run. Copied diagnostics only, no state/time/plan/save injection. Known two-module plan uses existing public reference; not unaided discovery or all-park completion.','cases':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch(timeout=20000)
 try:
  for width in[1440,390]:
   c=b.new_context(viewport={'width':width,'height':1050 if width==1440 else 844},is_mobile=width==390,has_touch=width==390);p=c.new_page();cdp=c.new_cdp_session(p);row={'width':width,'states':[],'stages':[],'pageErrors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row);p.on('pageerror',lambda e:row['pageErrors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def diag():return p.evaluate('(async()=>{const s=[...document.scripts].find(s=>s.type==="module"&&s.src.includes("/game.mjs"));return(await import(s.src)).diagnostics()})()')
   def scene():return p.evaluate('''()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}};const w=document.querySelector('#track-workshop'),a=document.activeElement,s=getComputedStyle(a);return{focus:a.id,focusRect:rect(a),focusVisible:a.matches(':focus-visible'),outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,workshop:rect(w),workshopName:w.getAttribute('aria-labelledby'),editor:rect(document.querySelector('#selected-title')),lift:rect(document.querySelector('#module-lift')),brake:rect(document.querySelector('#module-brake')),selectedCode:document.querySelector('#selected-code').textContent,selectedTitle:document.querySelector('#selected-title').textContent,reportStatus:document.querySelector('#report-status').textContent,openDisabled:document.querySelector('#open-park').disabled,scrollY,overflow:document.documentElement.scrollWidth>innerWidth}}''')
   def shot(name):
    image=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(O/f'{width}-{name}.png').write_bytes(base64.b64decode(image['data']));v={'label':name,'game':diag(),'scene':scene()};row['states'].append(v);flush();return v
   def wait(pred,label,limit=60):
    start=time.monotonic();mark=-10
    while time.monotonic()-start<limit:
     s=diag()
     if pred(s):row['stages'].append({'label':label,'state':s['state'],'tick':s['tick'],'runs':s['runs'],'revenue':s['revenue'],'safe':s['report']['safe']if s.get('report')else None});flush();return s
     if time.monotonic()-start>=mark+10:mark=time.monotonic()-start;print(json.dumps({'mode':'online'if args.online else'local','width':width,'stage':label,'wallSeconds':round(mark,1),'state':s['state'],'runs':s['runs']}),flush=True)
     p.wait_for_timeout(100)
    raise AssertionError('Bounded ordinary wait failed: '+label)
   def navigate(segment,label,keyboard=False):
    before=diag();button=p.locator(f'#diagnosis-list button[data-segment="{segment}"]:visible').first;button.scroll_into_view_if_needed();assert '定位'in button.inner_text()
    if keyboard:button.press('Enter')
    else:button.click()
    p.wait_for_timeout(150);s=diag();assert s['selectedSegment']==segment
    for key in['modules','heightOffsets','cost','cash','report','runs','revenue','reputation','best','unlocked']:assert s[key]==before[key],key
    v=shot(label);assert v['scene']['focus']=='track-workshop'and v['scene']['workshop']['inside']and v['scene']['editor']['inside']and not v['scene']['overflow'];assert v['scene']['selectedCode']==f'{segment+1:02d} / 12';assert v['scene']['workshopName']=='selected-code selected-title';assert v['scene']['lift']['inside']and v['scene']['brake']['inside']
    if keyboard:assert v['scene']['focusVisible']and v['scene']['outlineWidth']=='3px'and v['scene']['outlineStyle']=='solid'
    return s
   try:
    p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.locator('#test-ride').wait_for();s=diag();assert s['state']=='design'and s['levelIndex']==0 and s['cost']==0 and s['modules']==['rail']*12;row['initial']=s;p.locator('#test-ride').click();s=wait(lambda g:g['state']=='design'and g.get('report')is not None,'missing-lift');assert not s['report']['safe']and s['report']['testedSegments']==1 and p.locator('#open-park').is_disabled();row['initialFailure']=s;navigate(0,'01-first-diagnosis');p.keyboard.press('Tab');assert p.evaluate('document.activeElement.id')=='module-rail';p.keyboard.press('Tab');assert p.evaluate('document.activeElement.id')=='module-lift';p.keyboard.press('Enter');s=diag();assert s['modules'][0]=='lift'and s['report']is None and s['cost']==160 and p.locator('#open-park').is_disabled();row['liftInstalledNormally']=s
    p.locator('#test-ride').click();s=wait(lambda g:g['state']=='design'and g.get('report')is not None,'station-needs-brake');assert not s['report']['safe']and any(x['segment']==11 for x in s['report']['diagnosis']);row['stationFailure']=s;navigate(11,'02-station-diagnosis',True);p.locator('#module-brake').click();s=diag();assert s['modules'][0]=='lift'and s['modules'][11]=='brake'and s['cost']==220 and s['cash']==160 and s['report']is None and p.locator('#open-park').is_disabled();row['brakeInstalledNormally']=s
    p.locator('#test-ride').click();s=wait(lambda g:g['state']=='design'and g.get('report')is not None,'certified-test');assert s['report']['safe']and s['report']['approved']and s['report']['testedSegments']==12 and p.locator('#open-park').is_enabled();assert s['runs']==s['revenue']==s['reputation']==0;row['certifiedReport']=s;shot('03-certified');p.locator('#open-park').click();s=wait(lambda g:g['runs']>=1,'first-paid-return');assert s['state']=='operating'and s['runs']==1 and s['revenue']==128 and s['reputation']==74;row['oneCompletedBusinessRun']=s;p.locator('#redesign').click();s=diag();assert s['state']=='design'and s['runs']==1 and s['revenue']==128 and s['reputation']==74 and s['cost']==220;row['returnedDesign']=s;shot('04-business-return');p.reload(wait_until='domcontentloaded');p.locator('#test-ride').wait_for();n=diag();assert n['state']=='design'and n['modules']==s['modules']and n['heightOffsets']==s['heightOffsets']and n['runs']==1 and n['revenue']==128 and n['reputation']==74 and n['report']['safe'];row['refreshRetainedDesign']=n;assert not any(row[k]for k in['pageErrors','consoleErrors','httpErrors','requestFailures']);row['passed']=True;flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'passed':True,'testFailures':2,'certified':True,'businessRuns':1}),flush=True)
   except Exception as e:
    row['failure']=repr(e)
    try:shot('failure-debug')
    except Exception:pass
    flush();raise
   finally:c.close()
 finally:b.close();flush()
