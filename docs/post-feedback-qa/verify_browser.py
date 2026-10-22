import argparse,json,pathlib,subprocess,os,time,datetime,base64
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/post-feedback-round');R.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True);ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');args=ap.parse_args();out=R/('online'if args.online else'local');out.mkdir(exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());url=('https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58161/')+'versions/v2/games/post/';params=json.loads(pathlib.Path(__file__).with_name('policy-params.json').read_text(encoding='utf-8'));keys={'a':'KeyA','d':'KeyD','w':'KeyW','s':'KeyS'}
report={'url':url,'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Fresh isolated contexts; normal visible controls and digital W/A/S/D. One first-stage legal finish per viewport uses existing public read-only copied-diagnostics policy (~50ms decisions), not human driving. No state/time/outcome/save injection, no physics/AI changes. Desktop viewport emulation, not real phone.','cases':[]}
worker=subprocess.Popen(['node','docs/post-independent-qa/policy.mjs','--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
def choose(s):
 worker.stdin.write(json.dumps({'s':s,'p':params})+'\n');worker.stdin.flush();v=json.loads(worker.stdout.readline());assert'error'not in v,v;return v
def flush():(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch(timeout=20000)
 try:
  for width in [1440,390]:
   c=b.new_context(viewport={'width':width,'height':844 if width==390 else 1050},is_mobile=width==390,has_touch=width==390);p=c.new_page();cdp=c.new_cdp_session(p);row={'width':width,'states':[],'raceObservations':[],'pageErrors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row)
   p.on('pageerror',lambda e:row['pageErrors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def diag():return p.evaluate('(async()=>{const s=[...document.scripts].find(s=>s.type==="module"&&s.src.includes("/game.mjs"));return(await import(s.src)).diagnostics()})()')
   def marker():return p.evaluate('''()=>{const m=document.querySelector('#gate-target'),l=m.querySelector('.gate-label'),d=m.querySelector('.gate-dot'),f=document.querySelector('#battle'),rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};return{hidden:m.hidden,gate:Number(m.dataset.gate),label:l.textContent,font:getComputedStyle(l).fontSize,labelBox:rect(l),dotBox:rect(d),field:rect(f),pointerEvents:getComputedStyle(m).pointerEvents,count:document.querySelectorAll('#gate-target').length,overflow:document.documentElement.scrollWidth>innerWidth}}''')
   def shot(label):
    image=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(out/f'{width}-{label}.png').write_bytes(base64.b64decode(image['data']));s={'label':label,'game':diag(),'marker':marker(),'status':p.locator('#status').inner_text()};row['states'].append(s);flush();return s
   def check_marker():
    s=diag();m=marker();assert not m['hidden']and m['count']==1 and m['pointerEvents']=='none'and not m['overflow'];assert m['font']=='12px';assert m['gate']==s['cars'][0]['nextGate'];q=p.evaluate('''async id=>{const t=await import(new URL('./tracks.mjs?v=post-v2-r1',location.href));return t.gates(t.TRACKS[0])[id]}''',m['gate']);f=m['field'];d=m['dotBox'];assert abs(d['x']+d['width']/2-(f['x']+q['x']/900*f['width']))<2;assert abs(d['y']+d['height']/2-(f['y']+q['y']/640*f['height']))<2;l=m['labelBox'];assert l['x']>=f['x']and l['x']+l['width']<=f['x']+f['width']and l['y']>=f['y']and l['y']+l['height']<=f['y']+f['height'];return s,m
   try:
    p.goto(url,wait_until='domcontentloaded',timeout=25000);p.locator('#primary-action').wait_for();p.wait_for_timeout(160);check_marker();shot('01-ready');p.locator('#primary-action').click();p.keyboard.down('w');p.wait_for_timeout(4400);p.keyboard.up('w');check_marker();shot('02-driving');p.locator('#pause').click();p.wait_for_timeout(150);before=diag();check_marker();p.wait_for_timeout(300);assert diag()['cars']==before['cars']and diag()['time']==before['time'];p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();p.wait_for_timeout(160);restored=diag();assert restored['state']=='paused'and restored['time']==before['time']and restored['cars']==before['cars']and not restored['input']['keys'];check_marker();shot('03-restored')
    p.locator('#restart').click();p.wait_for_timeout(120);assert diag()['state']=='ready'and diag()['time']==0;check_marker();p.locator('#primary-action').click();p.keyboard.press('p');p.wait_for_timeout(120);assert diag()['state']=='paused';check_marker();p.locator('#primary-action').click();p.wait_for_timeout(120);assert diag()['state']=='countdown';check_marker()
    began=time.monotonic();seen=set();mark=-10
    while time.monotonic()-began<70:
     deadline=time.monotonic()+.05;s=diag();m=marker()
     if s['state']=='finished':break
     assert s['state']in['countdown','playing'];v=choose(s);want=set()
     if v['gas']:want.add('w')
     if v['brake']:want.add('s')
     if v['steer']:want.add('d'if v['steer']>0 else'a')
     for k,code in keys.items():
      if k not in want and code in s['input']['keys']:p.keyboard.up(k)
      elif k in want and code not in s['input']['keys']:p.keyboard.down(k)
     if not m['hidden']and m['gate']==s['cars'][0]['nextGate']:
      seen.add(m['gate'])
      if not row['raceObservations']or row['raceObservations'][-1]['gates']!=s['cars'][0]['stats']['gates']:row['raceObservations'].append({'time':s['time'],'gates':s['cars'][0]['stats']['gates'],'nextGate':m['gate'],'label':m['label']})
     if s['time']>=mark+10:mark=s['time'];flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'time':s['time'],'gates':s['cars'][0]['stats']['gates']}),flush=True)
     p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
    for k in keys:p.keyboard.up(k)
    p.wait_for_timeout(160);s=diag();assert s['state']=='finished'and s['cars'][0]['finishedAt']is not None and s['cars'][0]['stats']['gates']==16 and s['stats']['settlements']==1,s;assert marker()['hidden'];assert seen==set(range(8)),seen;row['gateIdsSeen']=sorted(seen);row['result']={k:p.locator('#'+k).inner_text()for k in['overlay-title','overlay-copy','summary','last-result','best']};shot('04-finished');p.locator('#secondary-action').click();p.wait_for_timeout(160);assert p.locator('#overlay').is_hidden()and marker()['hidden'];row['afterViewTrack']={'buttons':p.locator('button:visible').all_text_contents(),'overlayHidden':True,'resultStillSidebar':p.locator('#last-result').inner_text(),'game':diag()};shot('05-view-track');best=diag()['best'];last=diag()['lastResult'];p.locator('#restart').click();p.wait_for_timeout(160);s=diag();assert s['state']=='ready'and s['time']==0 and s['best']==best and s['lastResult']==last and not s['input']['keys'];check_marker();shot('06-restart');row['passed']=True;assert not any(row[k]for k in['pageErrors','consoleErrors','httpErrors','requestFailures']);flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'passed':True,'raceRank':row['states'][-3]['game']['result']['rank'],'gateIdsSeen':sorted(seen)}),flush=True)
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
