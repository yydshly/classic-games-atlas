import argparse,json,pathlib,os,time,datetime,base64
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/result-return-review');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());ap=argparse.ArgumentParser();ap.add_argument('--base',default='https://yydshly.github.io/classic-games-atlas/');ap.add_argument('--out',default='before');ap.add_argument('--require-visible-focus',action='store_true');args=ap.parse_args();out=R/args.out;out.mkdir(exist_ok=True);report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.base+'versions/v2/games/pinfall/','method':'Fresh isolated browser contexts; visible UI start/tutorial, slider click+Home (-68 degrees), normal fire button repeatedly until natural shot exhaustion. No record prerequisite or prior success repeated; no state/time/outcome/storage injection. Existing prior success/best retention evidence remains separate.','cases':[]}
def flush():(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch(timeout=20000)
 try:
  for width in [1440,390]:
   c=b.new_context(viewport={'width':width,'height':1050 if width==1440 else 844},is_mobile=width==390,has_touch=width==390);p=c.new_page();cdp=c.new_cdp_session(p);row={'width':width,'shots':[],'states':[],'pageErrors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row);p.on('pageerror',lambda e:row['pageErrors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def diag():return p.evaluate('(async()=>{const s=[...document.scripts].find(s=>s.type==="module"&&s.src.includes("/game.mjs"));return(await import(s.src)).diagnostics()})()')
   def scene():return p.evaluate('''()=>{const e=document.querySelector('#restart'),r=e.getBoundingClientRect();return{focus:document.activeElement?.id,retryVisible:!e.hidden&&!e.disabled,box:{x:r.x,y:r.y,width:r.width,height:r.height},focusInViewport:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,status:document.querySelector('#battle-status').textContent,overlayHidden:document.querySelector('#overlay').hidden,scrollY,overflow:document.documentElement.scrollWidth>innerWidth}}''')
   def shot(name):
    image=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(out/f'{width}-{name}.png').write_bytes(base64.b64decode(image['data']));s={'label':name,'game':diag(),'scene':scene()};row['states'].append(s);flush();return s
   try:
    p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);p.locator('#primary-action').wait_for();p.locator('#sound').click();p.locator('#primary-action').click()
    if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
    for n in range(10):
     assert diag()['state']=='playing';p.locator('#aim').click();p.keyboard.press('Home');assert diag()['aim']==-68;p.locator('#fire').click();deadline=time.monotonic()+17
     while time.monotonic()<deadline:
      s=diag()
      if s['ball']is None:break
      p.wait_for_timeout(100)
     else:raise AssertionError('Natural ball did not settle within17 wall seconds')
     row['shots'].append({'shot':n+1,'state':s['state'],'budget':s['shots'],'score':s['stats']['score'],'catches':s['stats']['catches']});flush();print(json.dumps({'mode':args.out,'width':width,**row['shots'][-1]}),flush=True)
     if s['state']=='lost':break
    s=diag();assert s['state']=='lost'and s['shots']==0 and s['stats']['settlements']==1;row['naturalLoss']=s;p.locator('#secondary-action').scroll_into_view_if_needed();shot('01-result');saved=p.evaluate('JSON.stringify(Object.fromEntries(Object.entries(localStorage)))');p.locator('#secondary-action').click();p.wait_for_timeout(100);view=shot('02-view');assert view['scene']['overlayHidden']and view['scene']['focus']=='restart'and view['scene']['retryVisible'];assert diag()==s and p.evaluate('JSON.stringify(Object.fromEntries(Object.entries(localStorage)))')==saved;assert 'R'in view['scene']['status'];row['focusedRetryInsideViewport']=view['scene']['focusInViewport']
    if args.require_visible_focus:assert view['scene']['focusInViewport'],view['scene']
    p.keyboard.press('Enter');fresh=diag();assert fresh['state']=='ready'and fresh['level']==1 and fresh['shots']==5 and fresh['uses']==2 and fresh['ball']is None and fresh['stats']['settlements']==fresh['stats']['score']==fresh['stats']['shots']==0 and fresh['best']==s['best'];row['keyboardRetry']=fresh;shot('03-keyboard-retry');p.locator('#primary-action').click();p.locator('#pause').click();assert diag()['state']=='paused';paused=diag();p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();restored=diag();assert restored['state']=='paused'and restored['shots']==5 and restored['uses']==2 and restored['best']==s['best']and restored['ball']is None and restored['stats']['shots']==0;row['retryRefreshed']=restored;shot('04-retry-refresh');assert not any(row[k]for k in['pageErrors','consoleErrors','httpErrors','requestFailures']);row['passed']=True;flush();print(json.dumps({'mode':args.out,'width':width,'passed':True,'focusInViewport':view['scene']['focusInViewport']}),flush=True)
   except Exception as e:
    row['failure']=repr(e)
    try:shot('failure-debug')
    except Exception:pass
    flush();raise
   finally:c.close()
 finally:b.close();flush()
