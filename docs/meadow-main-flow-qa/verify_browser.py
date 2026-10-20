import argparse,json,time,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];PROGRESS='atlas-v2-meadow-20261018-progress-v1';CURRENT='atlas-v2-meadow-20261018-current-v1';MAP={'w':'w','a':'a','s':'s','d':'d','Space':' '}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/coverage-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'kind':'normal public keyboard; author strategy in separate process on read-only public snapshots at about100ms; production natural clock; no score/time/position/save injection','decisions':[],'progress':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 worker=subprocess.Popen(['node',str(ROOT/'docs/meadow-main-flow-qa/policy.mjs'),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def decide(d):worker.stdin.write(json.dumps(d,separators=(',',':'))+'\n');worker.stdin.flush();x=json.loads(worker.stdout.readline());assert 'error' not in x,x;return x
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate('window.meadowSnapshot()')
  def stored(k):return p.evaluate('(k)=>localStorage.getItem(k)',k)
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def release():
   for key in [*MAP,'j','k']:p.keyboard.up(key)
  def fresh(d,i):assert d['levelIndex']==i and d['score']==[0,0] and d['elapsed']<.25 and d['time']>70 and not d['charging'] and d['charge']==0 and all(v==[0,0] for v in d['stats'].values())
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/meadow/',wait_until='networkidle',timeout=20000);fresh(diag(),0);assert p.locator('#matches button').nth(1).is_disabled();p.locator('#primary-action').click();t=time.monotonic();mark=-15;lastScore=[0,0];captured=False
   while time.monotonic()-t<125:
    deadline=time.monotonic()+.1;d=diag()
    if d['state'] in ['won','lost']:break
    assert d['state'] in ['kickoff','playing','goal'],d['state'];x=decide(d);want=set()
    if x['x']:want.add('d' if x['x']>0 else 'a')
    if x['y']:want.add('s' if x['y']>0 else 'w')
    if x['shoot']:want.add('Space')
    for key,value in MAP.items():
     if key not in want:p.keyboard.up(key)
     elif value in d['input']['blockedKeys']:p.keyboard.up(key);p.keyboard.down(key)
     elif value not in d['input']['keys']:p.keyboard.down(key)
    if x['pass']:p.keyboard.press('j')
    if x['switch']:p.keyboard.press('k')
    r['decisions'].append({'wall':time.monotonic()-t,'tick':d['tick'],'elapsed':d['elapsed'],'score':d['score'],'commands':x})
    if d['score']!=lastScore:shot('goal-'+str(sum(d['score']))+'.png');lastScore=d['score']
    if d['elapsed']>=mark+15:
     mark=d['elapsed'];row={'wall':time.monotonic()-t,'elapsed':d['elapsed'],'time':d['time'],'score':d['score'],'stats':d['stats']};r['progress'].append(row);(out/'progress.json').write_text(json.dumps(row,indent=2),encoding='utf-8');print(json.dumps(row),flush=True)
    if d['elapsed']>25 and d['state']=='playing' and not captured:shot('normal-match-running.png');captured=True
    p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
   release();p.wait_for_timeout(100);d=diag();r['outcome']=d;shot('first-match-natural-result.png');assert d['state'] in ['won','lost'] and d['time']==0 and abs(d['elapsed']-72)<.05;assert d['stats']['shots'][0]>0 and d['stats']['passes'][0]>0,'strategy did not exercise pass and shooting';assert d['state']=='won','normal first-match attempt ended in loss, retain result and coverage gap';best=json.loads(stored(PROGRESS));assert best['unlocked']==1 and best['best']['0']['score']==d['score'] and stored(CURRENT) is None;r['firstRecord']=best
   p.locator('#primary-action').click();n=diag();fresh(n,1);assert n['state']=='kickoff';p.locator('#pause').click();before=diag();assert before['state']=='paused';p.reload(wait_until='networkidle');after=diag();assert after['state']=='paused'
   fields=['levelIndex','score','time','elapsed','tick','players','ball','stats'];assert all(before[k]==after[k] for k in fields);assert not after['input']['shoot'] and after['input']['x']==after['input']['y']==0;r['nextRefresh']={'sameFields':fields,'snapshot':after};shot('next-match-paused-refresh.png');p.locator('#retry').click();assert p.locator('#confirm-dialog').is_visible();p.locator('#confirm-cancel').click();cancel=diag();assert all(cancel[k]==after[k] for k in fields);r['restartCancelKept']=True
   p.locator('#primary-action').click();idle=time.monotonic();mark=-15
   while time.monotonic()-idle<115:
    p.wait_for_timeout(100);n=diag()
    if n['elapsed']>=mark+15:mark=n['elapsed'];row={'idleSecondMatch':True,'elapsed':n['elapsed'],'score':n['score']};r['progress'].append(row);print(json.dumps(row),flush=True)
    if n['state'] in ['won','lost']:break
   assert n['state']=='lost' and n['time']==0 and n['levelIndex']==1;r['naturalSecondLoss']=n;assert json.loads(stored(PROGRESS))==best;shot('second-match-natural-loss.png');p.locator('#primary-action').click();n=diag();fresh(n,1);assert n['state']=='kickoff';p.locator('#pause').click();n=diag();assert n['state']=='paused' and n['score']==[0,0] and json.loads(stored(PROGRESS))==best and p.locator('#matches button').nth(2).is_disabled();r['retry']=n;shot('second-match-retry-best-kept.png');r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:r['lastSnapshot']=diag();shot('failure-debug.png')
   except:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
   try:worker.stdin.close();worker.wait(timeout=5)
   except:worker.terminate()
 print(json.dumps({'status':r['status'],'score':d['score'],'stats':d['stats'],'decisions':len(r['decisions']),'secondLoss':r['naturalSecondLoss']['score'],'nextPausedRefresh':True,'bestKept':True},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
