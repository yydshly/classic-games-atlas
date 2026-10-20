"""Assisted UI integration run: copied visible geometry guides real mouse events; no live engine mutation."""
import argparse,json,os,time,math
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.prism.v2.viewport.20261018'
def aim(g):
 pw=g['paddleWidth'];balls=[b for b in g['balls'] if b['alive'] and not b['attached']];down=sorted([b for b in balls if b['dy']>0 and b['y']<=636],key=lambda b:(636-b['y'])/b['dy']);ball=(down or balls or [None])[0]
 if not ball:return 300
 x=ball['x']
 if ball['dy']>0:
  x+=ball['dx']*(636-ball['y'])/ball['dy'];n=(x-31)%1076;x=31+(n if n<=538 else 1076-n)
 targets=sorted([q for q in g['bricks'] if not q['steel'] and q['hp']>0],key=lambda q:(-q['y'],abs(q['x']+23-x)));angle=math.atan2(targets[0]['x']+23-x,636-targets[0]['y']-22) if targets else .3;offset=max(-.78,min(.78,angle/1.08))*pw/2;return max(24+pw/2,min(576-pw/2,x-offset))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/versions/v2/games/prism/');ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/playability-three/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':a.url,'kind':'automated normal mouse/DOM input guided by read-only copied current geometry; integration evidence, not human timing/skill acceptance','inputCount':0,'observations':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate('async()=>{const m=await import(document.querySelector("script[type=module]").src);return m.diagnostics()}')
  def snap(name):p.screenshot(path=str(out/name),full_page=True)
  try:
   p.goto(a.url,wait_until='networkidle',timeout=20000);initial=diag();assert initial['level']==1 and initial['remaining']==20 and initial['unlocked']==1;p.locator('#sound').click();p.locator('#primary-action').click();p.locator('#help-confirm').click();began=time.monotonic();last=-1;mark=0;captured=set()
   while time.monotonic()-began<220:
    d=diag()
    if d['state'] in ['won','lost']:break
    assert d['state']=='playing',d['state']
    if d['serving']:p.locator('#launch').click()
    else:
     x=aim(d);rect=p.locator('#battlefield').bounding_box();p.mouse.move(rect['x']+x/600*rect['width'],rect['y']+.90*rect['height']);r['inputCount']+=1
    if d['time']>=last+1:last=d['time'];r['observations'].append({'time':d['time'],'remaining':d['remaining'],'score':d['stats']['score'],'lives':d['lives'],'balls':len(d['balls']),'paddleHits':d['stats']['paddleHits']})
    for threshold in [12,4]:
     if d['remaining']<=threshold and threshold not in captured:snap(f'running-{threshold}-remaining.png');captured.add(threshold)
    if d['time']>=mark+30:mark=d['time'];print(json.dumps({'phase':'playing','time':d['time'],'remaining':d['remaining'],'lives':d['lives'],'score':d['stats']['score']}),flush=True)
    p.wait_for_timeout(25)
   d=diag();r['outcome']=d;snap('result.png');assert d['state']=='won' and d['remaining']==0 and d['stats']['destroyed']==20,d['state'];assert d['lives']>=1;p.wait_for_function("document.querySelector('#overlay-title').textContent.includes('光芒已清')")
   raw=json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY));assert raw['unlocked']==2 and raw['best']['1']['score']==d['stats']['score'] and raw['best']['1']['stars']==d['lives'];r['savedBest']=raw['best']['1'];r['summary']=p.locator('#overlay-summary').inner_text()
   p.locator('#levels').click();assert not p.locator('[data-level="2"]').is_disabled() and p.locator('[data-level="3"]').is_disabled();snap('second-unlocked-third-locked.png');p.locator('#levels-close').click();p.locator('#primary-action').click();n=diag();assert n['level']==2 and n['state']=='playing' and n['lives']==3 and n['remaining']==22 and n['stats']['score']==0 and n['stats']['destroyed']==0 and n['serving'] and len(n['balls'])==1 and n['balls'][0]['attached'];p.locator('#pause').click();snap('next-paused.png');p.reload(wait_until='networkidle');n=diag();assert n['level']==2 and n['state']=='ready' and n['lives']==3 and n['remaining']==22 and n['unlocked']==2;raw=json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY));assert raw['best']['1']==r['savedBest'];snap('next-ready-refresh.png');r['nextStage']={'level':2,'lives':3,'bricks':22,'score':0,'cleanAttachedBall':True,'thirdLocked':True,'refreshReadyAndBestKept':True,'note':'Original design saves progress/preferences, not an active ball session'};r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
  except Exception as e:r['status']='failed';r['error']=str(e);snap('failure-debug.png');raise
  finally:(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'summary':r['summary'],'time':r['outcome']['time'],'stats':r['outcome']['stats'],'next':r['nextStage'],'errors':[r['consoleErrors'],r['httpErrors'],r['requestFailures']]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
