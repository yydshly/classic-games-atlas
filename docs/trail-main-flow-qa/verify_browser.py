import argparse,json,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='trail-v2-r1'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/coverage-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'kind':'normal keys on public page; fixed time schedule informed by existing terrain; no live engine/state/time/save mutation','consoleErrors':[],'httpErrors':[],'requestFailures':[],'events':[],'observations':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def saved():return json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))['game']
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/trail/',wait_until='networkidle',timeout=20000);assert saved()['state']=='ready';p.locator('#primary').click();p.keyboard.down('d');started=time.monotonic();j=0;down=False;nextAttack=0;mark=0;jumps=[2.43,6.27,10.49,14.15]
   while time.monotonic()-started<40:
    t=time.monotonic()-started
    if j<len(jumps) and t>=jumps[j]:p.keyboard.down('w');r['events'].append({'wall':t,'key':'w','down':True});down=True;j+=1
    if down and t>=jumps[j-1]+.82:p.keyboard.up('w');down=False
    if t>=nextAttack:p.keyboard.press('j');nextAttack=t+.35
    if t>=mark+2:
     mark=t;g=saved();r['observations'].append({'wall':t,'time':g['time'],'state':g['state'],'x':g['player']['x'],'lives':g['lives'],'food':g['stats']['collected'],'enemyAlive':sum(e['alive'] for e in g['enemies']),'checkpoint':g['checkpoint']});print(json.dumps(r['observations'][-1]),flush=True)
     if g['state'] in ['won','lost']:break
    p.wait_for_timeout(15)
   p.keyboard.up('d');p.keyboard.up('w');p.wait_for_timeout(80);g=saved();r['outcome']=g;shot('first-stage-result.png');assert g['state']=='won','actual attempt did not complete first stage';assert g['checkpoint'] and sum(e['alive'] for e in g['enemies'])<3;raw=p.evaluate('(k)=>localStorage.getItem(k)',KEY);p.reload(wait_until='networkidle');after=saved();assert after['state']=='won' and after['level']==1 and after['stats']['collected']==g['stats']['collected'] and after['energy']==g['energy'] and after['lives']==g['lives'];r['resultRefresh']=after;shot('result-refresh-kept.png');p.locator('#primary').click();n=saved();assert n['level']==2 and n['state']=='playing' and n['stats']['collected']==0 and n['lives']==3 and not n['checkpoint'] and all(e['alive'] for e in n['enemies']);p.locator('#pause').click();r['nextStage']=saved();assert r['nextStage']['state']=='paused';shot('second-stage-clean-paused.png');r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:r['lastSave']=saved();shot('failure-debug.png')
   except:pass
   raise
  finally:(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'outcome':{k:g[k] for k in ['time','energy','lives','stats','checkpoint']},'refreshWon':True,'nextStageClean':True},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
