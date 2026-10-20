"""Real 180 activity seconds via normal keys. Offline planner reads copied visible board; never writes live state/time."""
import argparse,json,os,time,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.orbit.score180.v2';KEYS={'left':'ArrowLeft','right':'ArrowRight','cw':'x','ccw':'z','hard':'Space'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/versions/v2/games/orbit/');ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/complementary-flow/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':a.url,'kind':'normal keyboard, script-assisted placement decisions in separate offline process; native production RAF/time; no game/time/storage injection','decisions':[],'progress':[],'interruptions':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 flags=getattr(subprocess,'CREATE_NO_WINDOW',0);planner=subprocess.Popen(['node',str(ROOT/'docs/orbit-natural-end-qa/model_reference.mjs'),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=flags)
 with sync_playwright() as pw:
  b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate('window.__orbitV2.snapshot()')
  def snap(n):p.screenshot(path=str(out/n),full_page=True)
  def fresh(d,state):
   assert d['state']==state and d['ticks']<120 and d['score']==0 and d['lines']==0 and d['stats']['locked']==0 and d['stats']['settlements']==0 and all(x is None for row in d['board'] for x in row)
   assert d['active'] is None if state=='ready' else d['active']['id']==1
  try:
   p.goto(a.url,wait_until='networkidle',timeout=20000);fresh(diag(),'ready');p.locator('#primary').click();started=time.monotonic();nextDecision=0;mark=0;captured=set()
   while time.monotonic()-started<360:
    d=diag()
    if d['state'] in ['won','lost']:break
    if d['state']=='paused':r['interruptions'].append({'ticks':d['ticks'],'feedback':p.locator('#feedback').inner_text()});p.locator('#primary').click();continue
    assert d['state']=='playing' and all(d['invariants'].values());t=d['time']
    if t>=mark+15:
     mark=t;row={'activitySeconds':t,'wallSeconds':time.monotonic()-started,'score':d['score'],'lines':d['lines'],'locked':d['stats']['locked'],'speed':d['speedLevel']};r['progress'].append(row);(out/'progress.json').write_text(json.dumps(row,indent=2),encoding='utf-8');print(json.dumps(row),flush=True)
    for at in [60,120,175]:
     if t>=at and at not in captured:snap(f'running-{at}s.png');captured.add(at)
    if t>=nextDecision:
     planner.stdin.write(json.dumps(d,separators=(',',':'))+'\n');planner.stdin.flush();line=planner.stdout.readline();assert line,'planner exited';plan=json.loads(line);assert plan and not plan.get('error'),plan;piece=d['active']['id'];sent=[]
     for kind in plan['actions']:
      current=diag()
      if current['state']!='playing' or current['active']['id']!=piece:break
      p.keyboard.press(KEYS[kind],delay=35);sent.append(kind)
     n=diag();r['decisions'].append({'time':t,'piece':piece,'sent':sent,'resultLocks':n['stats']['locked'],'lines':n['lines'],'score':n['score']});nextDecision=n['time']+2
    p.wait_for_timeout(60)
   d=diag();r['wallSeconds']=time.monotonic()-started;r['outcome']=d;assert d['state']=='won' and d['reasonCode']=='time' and d['ticks']==21600 and d['stats']['settlements']==1,d['state'];assert r['wallSeconds']>=175 and all(d['invariants'].values());p.wait_for_function("document.querySelector('#panel-title').textContent.includes('180秒')");r['summary']=p.locator('#summary').inner_text();assert p.locator('#time').inner_text()=='0:00';snap('natural-time-result.png');raw=json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY));best=raw['best'];assert best=={'score':d['score'],'lines':d['lines'],'combo':d['stats']['maxCombo']} and raw['resume'] is None;r['best']=best
   p.reload(wait_until='networkidle');n=diag();fresh(n,'ready');assert n['best']==best;snap('result-refresh-ready-best.png');r['resultRefresh']={'ready':True,'ticks':n['ticks'],'score':n['score'],'lines':n['lines'],'bestKept':True}
   p.locator('#primary').click();p.keyboard.press('ArrowRight',delay=35);p.keyboard.press('Space',delay=35);n=diag();assert n['stats']['locked']==1 and n['score']>0 and n['active']['id']==2 and n['stats']['settlements']==0;r['newRoundOneLock']={'score':n['score'],'locked':1,'activeId':2};p.locator('#retry').click();n=diag();fresh(n,'playing');assert n['best']==best and n['held']==[] and n['blocked']==[];p.wait_for_timeout(250);p.locator('#pause').click();new=diag();assert new['state']=='paused' and new['ticks']>0 and new['ticks']<120 and new['stats']['locked']==0 and new['score']==0 and new['best']==best;raw=p.evaluate('(k)=>localStorage.getItem(k)',KEY);p.reload(wait_until='networkidle');after=diag();assert after['state']=='paused' and after['ticks']==new['ticks'] and after['score']==0 and after['lines']==0 and after['stats']['locked']==0 and after['stats']['settlements']==0 and after['active']['id']==1 and after['held']==[] and after['blocked']==[] and after['best']==best and all(after['invariants'].values());assert p.evaluate('(k)=>localStorage.getItem(k)',KEY)==raw;snap('retry-refresh-clean-session.png');r['restart']={'cleanActiveFirstPiece':True,'ticks':after['ticks'],'emptyBoard':all(x is None for row in after['board'] for x in row),'score':0,'lines':0,'settlements':0,'bestKept':True,'refreshSameNewCheckpoint':True};r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:snap('failure-debug.png')
   except:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
   try:planner.stdin.close();planner.wait(timeout=5)
   except:planner.terminate()
 print(json.dumps({'status':r['status'],'wallSeconds':r['wallSeconds'],'ticks':r['outcome']['ticks'],'score':r['outcome']['score'],'lines':r['outcome']['lines'],'locked':r['outcome']['stats']['locked'],'summary':r['summary'],'resultRefresh':r['resultRefresh'],'restart':r['restart'],'interruptions':r['interruptions'],'errors':[r['consoleErrors'],r['httpErrors'],r['requestFailures']]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
