"""Fixed legal reference route via normal keyboard; read-only snapshots audit actual outcomes."""
import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.orbit.score180.v2'
PLAN=[['right','right','right','hard'],['hard'],['left','left','hard'],['cw','right','right','right','hard'],['hard'],['cw','cw','cw','left','left','hard'],['cw','right','right','right','right','right','hard'],['cw','right','right','hard'],['right','right','hard'],['left','left','hard'],['cw','left','hard'],['cw','right','hard'],['cw','cw','left','hard'],['cw','cw','right','right','right','hard'],['right','right','hard'],['cw','left','left','hard'],['right','hard'],['cw','hard'],['cw','cw','cw','right','right','right','right','hard'],['cw','left','left','hard']]
KEYS={'left':'ArrowLeft','right':'ArrowRight','cw':'x','hard':'Space'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/versions/v2/games/orbit/');ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/playability-three/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':a.url,'kind':'normal keyboard, fixed reference route; no state/storage/time mutation; copied snapshots used only to audit','placements':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate('window.__orbitV2.snapshot()')
  def snap(name):p.screenshot(path=str(out/name),full_page=True)
  try:
   p.goto(a.url,wait_until='networkidle',timeout=20000);d=diag();assert d['state']=='ready' and d['score']==0 and d['lines']==0 and d['speedLevel']==1 and d['gravity']==.72;p.locator('#primary').click();captured=False
   for i,actions in enumerate(PLAN):
    for kind in actions:p.keyboard.press(KEYS[kind],delay=35)
    d=diag();assert d['state']=='playing' and d['stats']['locked']==i+1,{'step':i+1,'state':d['state'],'locked':d['stats']['locked']};assert all(d['invariants'].values()),d['invariants'];r['placements'].append({'piece':i+1,'actions':actions,'lines':d['lines'],'score':d['score'],'speed':d['speedLevel'],'ticks':d['ticks']})
    if d['lines']>=6 and d['lines']<8 and not captured:snap('six-lines-running.png');captured=True
    if d['lines']>=8:break
   d=diag();assert 8<=d['lines']<16 and d['speedLevel']==2 and d['gravity']==.64 and '2 / 7' in p.locator('#speed-label').inner_text();assert d['lastClear']['speedUp'];r['threshold']={'lines':d['lines'],'score':d['score'],'locked':d['stats']['locked'],'ticks':d['ticks'],'speedLevel':2,'gravity':.64,'feedback':p.locator('#feedback').inner_text()};snap('first-speed-up-running.png');p.locator('#pause').click();before=diag();raw=p.evaluate('(k)=>localStorage.getItem(k)',KEY);assert before['state']=='paused' and before['held']==[] and before['blocked']==[];snap('threshold-paused.png');p.reload(wait_until='networkidle');after=diag();fields=['board','active','ticks','score','lines','clearedIds','locks','log','combo','lastClear','stats','speedLevel','gravity','preview','remaining']
   for k in fields:assert after[k]==before[k],k
   assert after['state']=='paused' and after['held']==[] and after['blocked']==[] and all(after['invariants'].values());assert p.evaluate('(k)=>localStorage.getItem(k)',KEY)==raw;snap('threshold-refresh-paused.png');r['pausedBefore']=before;r['restoredAfter']=after;r['storedCheckpoint']=json.loads(raw)['resume'];r['refresh']={'fieldsEqual':fields,'exactRaw':True,'heldReleased':True}
   p.locator('#primary').click();p.wait_for_timeout(250);p.locator('#pause').click();n=diag();assert n['ticks']>after['ticks'] and n['lines']==after['lines'] and n['score']==after['score'] and n['stats']['locked']==after['stats']['locked'] and n['held']==[];r['continued']={'ticks':n['ticks'],'score':n['score'],'lines':n['lines'],'speed':n['speedLevel'],'noExtraLock':True};r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
  except Exception as e:r['status']='failed';r['error']=str(e);snap('failure-debug.png');raise
  finally:(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'threshold':r['threshold'],'refresh':r['refresh'],'continued':r['continued'],'errors':[r['consoleErrors'],r['httpErrors'],r['requestFailures']]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
