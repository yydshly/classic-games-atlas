import argparse,json,pathlib,os,time,datetime,base64
from playwright.sync_api import sync_playwright
R=pathlib.Path('.local/pinfall-focus-round');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');ap.add_argument('--out');args=ap.parse_args();out=R/(args.out or ('online'if args.online else'local'));out.mkdir(exist_ok=True);url=('https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58191/')+'versions/v2/games/pinfall/';report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'method':'Isolated fresh contexts; each viewport naturally loses first court twice via normal slider click/Home -68 and fire. First view closes by mouse, retry Enter; second view closes by Tab/Space, retry R. No state/time/outcome/save/ball injection. 390CSS mobile/touch emulation is not physical phone.','cases':[]}
def flush():(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 b=pw.chromium.launch(timeout=20000)
 try:
  for width in[1440,390]:
   c=b.new_context(viewport={'width':width,'height':1050 if width==1440 else 844},is_mobile=width==390,has_touch=width==390);p=c.new_page();cdp=c.new_cdp_session(p);row={'width':width,'rounds':[],'states':[],'pageErrors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[],'passed':False};report['cases'].append(row);p.on('pageerror',lambda e:row['pageErrors'].append(str(e)));p.on('console',lambda m:row['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:row['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:row['requestFailures'].append({'url':r.url,'error':r.failure}))
   def diag():return p.evaluate('(async()=>{const s=[...document.scripts].find(s=>s.type==="module"&&s.src.includes("/game.mjs"));return(await import(s.src)).diagnostics()})()')
   def scene():return p.evaluate('''()=>{const a=document.activeElement,button=document.querySelector('#view-retry'),canvas=document.querySelector('#court'),r=a.getBoundingClientRect(),v=button.getBoundingClientRect(),f=canvas.getBoundingClientRect(),style=getComputedStyle(a),rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height});return{focus:a.id,focusBox:rect(r),focusInViewport:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,focusVisible:a.matches(':focus-visible'),outlineWidth:style.outlineWidth,outlineStyle:style.outlineStyle,retryHidden:button.hidden,retryBox:rect(v),phaseHidden:document.querySelector('#phase-label').hidden,canvasBox:rect(f),canvasVisibleRatio:Math.max(0,Math.min(f.bottom,innerHeight)-Math.max(f.top,0))/f.height,status:document.querySelector('#battle-status').textContent,overlayHidden:document.querySelector('#overlay').hidden,scrollY,overflow:document.documentElement.scrollWidth>innerWidth}}''')
   def shot(name):
    image=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(out/f'{width}-{name}.png').write_bytes(base64.b64decode(image['data']));s={'label':name,'game':diag(),'scene':scene()};row['states'].append(s);flush();return s
   def hidden():assert p.locator('#view-retry').is_hidden()
   def fresh(s):assert s['state']=='ready'and s['level']==1 and s['shots']==5 and s['uses']==2 and s['ball']is None and s['stats']['score']==s['stats']['shots']==s['stats']['settlements']==0
   try:
    p.goto(url,wait_until='domcontentloaded',timeout=25000);p.locator('#primary-action').wait_for();fresh(diag());hidden();p.locator('#sound').click();p.locator('#primary-action').click()
    if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
    for cycle in range(2):
     round={'cycle':cycle+1,'shots':[],'closeInput':'mouse'if cycle==0 else'Tab+Space','retryInput':'Enter'if cycle==0 else'R'};row['rounds'].append(round);assert diag()['state']=='playing';hidden()
     for n in range(10):
      p.locator('#aim').click();p.keyboard.press('Home');assert diag()['aim']==-68;p.locator('#fire').click();deadline=time.monotonic()+17
      while time.monotonic()<deadline:
       s=diag()
       if s['ball']is None:break
       p.wait_for_timeout(100)
      else:raise AssertionError('Natural ball did not settle within17 wall seconds')
      round['shots'].append({'shot':n+1,'state':s['state'],'budget':s['shots'],'score':s['stats']['score'],'catches':s['stats']['catches']});flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'cycle':cycle+1,**round['shots'][-1]}),flush=True)
      if s['state']=='lost':break
     s=diag();assert s['state']=='lost'and s['shots']==0 and s['stats']['settlements']==1;hidden();round['naturalLoss']=s;saved=p.evaluate('localStorage.getItem("classic-atlas.pinfall.v2")');assert p.locator('#overlay').is_visible();assert p.evaluate('document.activeElement.id')=='primary-action'
     if cycle==0:p.locator('#secondary-action').click()
     else:p.keyboard.press('Tab');assert p.evaluate('document.activeElement.id')=='secondary-action';p.keyboard.press('Space')
     p.wait_for_timeout(100);view=shot(f'cycle-{cycle+1}-view');assert view['scene']['overlayHidden']and not view['scene']['retryHidden']and view['scene']['focus']=='view-retry'and view['scene']['focusInViewport']and view['scene']['phaseHidden'];assert view['scene']['canvasVisibleRatio']>=.85 and not view['scene']['overflow'];assert diag()==s and p.evaluate('localStorage.getItem("classic-atlas.pinfall.v2")')==saved;assert 'R'in view['scene']['status']
     if cycle==1:assert view['scene']['focusVisible']and view['scene']['outlineWidth']=='3px'and view['scene']['outlineStyle']=='solid'
     p.wait_for_timeout(250);assert diag()==s;round['view']=view['scene'];round['gameAndStorageUnchangedOnView']=True;p.keyboard.press('Enter'if cycle==0 else'r');p.wait_for_timeout(200);n=diag();fresh(n);hidden();assert n['best']==s['best']and n['unlocked']==s['unlocked'];assert p.evaluate('document.activeElement.id')=='primary-action';ready=shot(f'cycle-{cycle+1}-ready');assert ready['scene']['focusInViewport'];round['retryReady']=n;round['readyFocus']=ready['scene'];print(json.dumps({'mode':'online'if args.online else'local','width':width,'cycle':cycle+1,'viewFocusVisible':view['scene']['focusInViewport'],'courtVisibleRatio':view['scene']['canvasVisibleRatio'],'readyFocusVisible':ready['scene']['focusInViewport']}),flush=True);p.keyboard.press('Enter');assert diag()['state']=='playing';hidden()
    p.keyboard.press('p');p.wait_for_timeout(100);assert diag()['state']=='paused';hidden();paused=diag();p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();restored=diag();assert restored['state']=='paused'and restored['shots']==5 and restored['uses']==2 and restored['ball']is None and restored['stats']['shots']==0 and restored['best']==paused['best'];hidden();shot('retry-refresh');p.locator('#primary-action').click();assert diag()['state']=='playing';hidden();p.locator('#pause').click();assert diag()['state']=='paused';hidden();row['passed']=True;assert not any(row[k]for k in['pageErrors','consoleErrors','httpErrors','requestFailures']);flush();print(json.dumps({'mode':'online'if args.online else'local','width':width,'passed':True,'naturalLosses':2}),flush=True)
   except Exception as e:
    row['failure']=repr(e)
    try:shot('failure-debug')
    except Exception:pass
    flush();raise
   finally:c.close()
 finally:b.close();flush()
