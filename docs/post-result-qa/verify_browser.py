import argparse,json,pathlib,subprocess,os,time,datetime,base64
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/post-result-round');R.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True);ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');args=ap.parse_args();out=R/('online'if args.online else'local');out.mkdir(exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());url=('https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58171/')+'versions/v2/games/post/';params=json.loads(pathlib.Path('docs/post-feedback-qa/policy-params.json').read_text(encoding='utf-8'));keys={'a':'KeyA','d':'KeyD','w':'KeyW','s':'KeyS'}
report={'url':url,'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Fresh isolated contexts. One first-stage natural legal two-lap finish per viewport using ordinary W/A/S/D selected by existing read-only copied-diagnostics policy (~50ms). Five visible-button/Tab/Space/Enter close-open cycles. Desktop then uses reopened next-race CTA; 390CSS restarts from terminal. No state/time/result/save injection. Not real mobile hardware or unaided driving.','cases':[]}
worker=subprocess.Popen(['node','docs/post-independent-qa/policy.mjs','--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
def choose(s):
 worker.stdin.write(json.dumps({'s':s,'p':params})+'\n');worker.stdin.flush();v=json.loads(worker.stdout.readline());assert'error'not in v,v;return v
def flush():(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch(timeout=20000)
 try:
  for width in [1440,390]:
   c=b.new_context(viewport={'width':width,'height':844 if width==390 else 1050},is_mobile=width==390,has_touch=width==390);p=c.new_page();cdp=c.new_cdp_session(p);row={'width':width,'states':[],'cycles':[],'pageErrors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row)
   p.on('pageerror',lambda e:row['pageErrors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def diag():return p.evaluate('(async()=>{const s=[...document.scripts].find(s=>s.type==="module"&&s.src.includes("/game.mjs"));return(await import(s.src)).diagnostics()})()')
   def active():return p.evaluate('document.activeElement?.id')
   def storage():return p.evaluate('localStorage.getItem("classic-atlas.post.v2")')
   def shot(label):
    image=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(out/f'{width}-{label}.png').write_bytes(base64.b64decode(image['data']));s={'label':label,'game':diag(),'focus':active(),'returnHidden':p.locator('#return-result').is_hidden(),'overlayHidden':p.locator('#overlay').is_hidden(),'buttons':p.locator('button:visible').all_text_contents()};row['states'].append(s);flush();return s
   def hidden():assert p.locator('#return-result').is_hidden()
   def fresh(s,stage):assert s['stage']==stage and s['state']=='ready'and s['time']==0 and s['stats']['settlements']==0 and not s['input']['keys']and all(car['stats']['gates']==0 and car['finishedAt']is None and car['speed']==0 for car in s['cars'])
   try:
    p.goto(url,wait_until='domcontentloaded',timeout=25000);p.locator('#primary-action').wait_for();fresh(diag(),0);hidden();shot('01-ready');p.locator('#primary-action').click();hidden();p.keyboard.press('p');assert diag()['state']=='paused';hidden();p.locator('#primary-action').click();assert diag()['state']=='countdown';hidden();began=time.monotonic();mark=-10
    while time.monotonic()-began<70:
     deadline=time.monotonic()+.05;s=diag()
     if s['state']=='finished':break
     assert s['state']in['countdown','playing'];hidden();v=choose(s);want=set()
     if v['gas']:want.add('w')
     if v['brake']:want.add('s')
     if v['steer']:want.add('d'if v['steer']>0 else'a')
     for k,code in keys.items():
      if k not in want and code in s['input']['keys']:p.keyboard.up(k)
      elif k in want and code not in s['input']['keys']:p.keyboard.down(k)
     if s['time']>=mark+10:mark=s['time'];flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'time':s['time'],'gates':s['cars'][0]['stats']['gates']}),flush=True)
     p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
    for k in keys:p.keyboard.up(k)
    p.wait_for_timeout(160);terminal=diag();assert terminal['state']=='finished'and terminal['cars'][0]['finishedAt']is not None and terminal['cars'][0]['stats']['gates']==16 and terminal['stats']['settlements']==1;hidden();assert active()=='primary-action';assert p.locator('#primary-action').inner_text()=='下一场 · 同一赛道';saved=storage();summary=p.locator('#summary').inner_text();shot('02-finished')
    for i in range(5):
     if i==0:p.locator('#secondary-action').click()
     else:p.keyboard.press('Tab');assert active()=='secondary-action';p.keyboard.press('Space')
     assert p.locator('#overlay').is_hidden()and p.locator('#return-result').is_visible()and active()=='return-result';assert p.locator('#return-result').inner_text()=='返回结算';assert p.locator('#return-result').get_attribute('aria-controls')=='overlay';box=p.locator('#return-result').bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=p.viewport_size['height'];assert not p.evaluate('document.documentElement.scrollWidth>innerWidth');assert diag()==terminal and storage()==saved
     if i==0:
      shot('03-view-track');p.keyboard.press('Tab');assert active()=='battle';p.keyboard.press('Shift+Tab');assert active()=='return-result';row['tabRoundTrip']=['return-result','battle','return-result']
     p.keyboard.press('Enter');assert p.locator('#overlay').is_visible();hidden();assert active()=='primary-action';assert p.locator('#summary').inner_text()==summary and diag()==terminal and storage()==saved;row['cycles'].append({'cycle':i+1,'closedFocus':'return-result','reopenedFocus':'primary-action','gameAndStorageUnchanged':True})
    shot('04-reopened');old=diag();assert old['unlocked']==2
    if width==1440:
     p.keyboard.press('Enter');s=diag();assert s['state']=='countdown'and s['stage']==1 and s['time']==0 and s['stats']['settlements']==0 and all(car['stats']['gates']==0 and car['finishedAt']is None for car in s['cars']);assert active()=='battle';hidden();assert s['best']==old['best']and s['lastResult']==old['lastResult'];row['nextRaceViaReopenedCard']=s;p.keyboard.press('p');assert diag()['state']=='paused';hidden();p.locator('#restart').click();fresh(diag(),1);hidden();stage=1
    else:
     p.locator('#restart').click();fresh(diag(),0);hidden();stage=0
    s=diag();assert s['best']==old['best']and s['lastResult']==old['lastResult']and s['unlocked']==old['unlocked'];row['cleanRetry']=s;p.locator('#primary-action').click();hidden();p.wait_for_timeout(3300);assert diag()['state']=='playing';hidden();p.keyboard.down('w');p.wait_for_timeout(150);p.keyboard.up('w');p.keyboard.press('p');p.wait_for_timeout(100);paused=diag();assert paused['state']=='paused';hidden();p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();s=diag();assert s['state']=='paused'and s['stage']==stage and s['cars']==paused['cars']and s['time']==paused['time']and not s['input']['keys'];assert s['best']==old['best']and s['lastResult']==old['lastResult'];hidden();shot('05-active-retry-refreshed');row['passed']=True;assert not any(row[k]for k in['pageErrors','consoleErrors','httpErrors','requestFailures']);flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'passed':True,'cycles':len(row['cycles']),'branch':'reopened next-race then restart'if width==1440 else'terminal restart'}),flush=True)
   except Exception as e:
    row['failure']=repr(e)
    try:shot('failure-debug')
    except Exception:pass
    flush();raise
   finally:c.close()
 finally:
  b.close();worker.stdin.close()
  try:worker.wait(timeout=5)
  except subprocess.TimeoutExpired:worker.terminate()
  flush()
