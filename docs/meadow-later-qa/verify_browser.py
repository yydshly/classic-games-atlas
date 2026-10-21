import argparse,json,os,time,subprocess,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();PROGRESS='atlas-v2-meadow-20261018-progress-v1';CURRENT='atlas-v2-meadow-20261018-current-v1';MAP={'w':'w','a':'a','s':'s','d':'d','Space':' '}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/final-four-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/meadow/','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Fresh native profile; first match necessary unlock prerequisite. Authored read-only copied-state strategy in separate process, real W/A/S/D/Space/J/K input, natural production match clock and scores. No live engine or save/score/time/position/difficulty writes. Max2 natural attempts per match.','matches':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def choose(d):w.stdin.write(json.dumps(d,separators=(',',':'))+'\n');w.stdin.flush();v=json.loads(w.stdout.readline());assert 'error'not in v,v;return v
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright()as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def snap():return p.evaluate('window.meadowSnapshot()')
  def stored(k):return p.evaluate('(k)=>localStorage.getItem(k)',k)
  def release():
   for k in[*MAP,'j','k']:p.keyboard.up(k)
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def fresh(d,i):assert d['levelIndex']==i and d['score']==[0,0]and d['elapsed']<.25 and d['time']>0 and not d['charging']and d['charge']==0 and all(v==[0,0]for v in d['stats'].values())
  try:
   p.goto(r['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#primary-action').wait_for();fresh(snap(),0);p.locator('#primary-action').click()
   for i in range(8):
    fresh(snap(),i);row={'level':i+1,'start':snap(),'attempts':[]};r['matches'].append(row);won=False
    for attempt in range(1,3):
     if attempt>1:p.locator('#primary-action').click();fresh(snap(),i)
     entry={'attempt':attempt,'decisions':[],'scores':[]};row['attempts'].append(entry);began=time.monotonic();mark=-20;lastScore=[0,0];goalShot=False
     while time.monotonic()-began<180:
      deadline=time.monotonic()+.1;d=snap()
      if d['state']in['won','lost']:break
      assert d['state']in['kickoff','playing','goal'];v=choose(d);want=set()
      if v['x']:want.add('d'if v['x']>0 else'a')
      if v['y']:want.add('s'if v['y']>0 else'w')
      if v['shoot']:want.add('Space')
      for k,value in MAP.items():
       if k not in want:p.keyboard.up(k)
       elif value in d['input']['blockedKeys']:p.keyboard.up(k);p.keyboard.down(k)
       elif value not in d['input']['keys']:p.keyboard.down(k)
      if v['pass']:p.keyboard.press('j')
      if v['switch']:p.keyboard.press('k')
      entry['decisions'].append({'tick':d['tick'],'elapsed':d['elapsed'],'score':d['score'],'controls':v})
      if d['score']!=lastScore:
       lastScore=d['score'];entry['scores'].append({'elapsed':d['elapsed'],'score':d['score']})
       if not goalShot:shot(f'match-{i+1}-attempt-{attempt}-first-goal.png');goalShot=True
      if d['elapsed']>=mark+20:mark=d['elapsed'];flush();print(json.dumps({'match':i+1,'attempt':attempt,'elapsed':d['elapsed'],'remaining':d['time'],'score':d['score'],'stats':d['stats']}),flush=True)
      p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
     release();p.wait_for_timeout(150);d=snap();entry['outcome']=d;shot(f'match-{i+1}-attempt-{attempt}-{d["state"]}.png');flush();print(json.dumps({'match':i+1,'attempt':attempt,'state':d['state'],'elapsed':d['elapsed'],'score':d['score'],'stats':d['stats']}),flush=True)
     if d['state']=='won':won=True;row['outcome']=d;break
    if not won:r['status']='bounded_uncovered';r['blockedUnits']=list(range(i+1,9));r['blocker']='Two normal-input strategy attempts did not win current match; later matches remain locked. Not a confirmed rules defect.';break
    assert d['time']==0 and d['score'][0]>d['score'][1]and d['stats']['shots'][0]>0;best=json.loads(stored(PROGRESS));assert best['unlocked']==min(7,i+1)and len(best['best'])==i+1 and best['best'][str(i)]['score']==d['score']and stored(CURRENT)is None;row['progressRecord']=best;row['visible']={k:p.locator('#'+k).inner_text()for k in['state-title','state-copy','primary-action','progress-summary']};flush()
    if i<7:p.locator('#primary-action').click();n=snap();fresh(n,i+1);assert n['state']=='kickoff'and not n['input']['shoot']and n['input']['x']==n['input']['y']==0;row['nextClean']=n;flush()
   if r.get('status')!='bounded_uncovered':
    assert '八场终哨' in p.locator('#state-title').inner_text()and p.locator('#matches button').count()==8 and p.locator('#matches button:disabled').count()==0;r['finalNoNinth']=True;best=json.loads(stored(PROGRESS));p.locator('#primary-action').click();fresh(snap(),7);p.locator('#pause').click();before=snap();assert before['state']=='paused';p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();after=snap();fields=['levelIndex','score','time','elapsed','tick','players','ball','stats'];assert after['state']=='paused'and all(before[k]==after[k]for k in fields)and json.loads(stored(PROGRESS))==best and not after['input']['shoot']and after['input']['x']==after['input']['y']==0;r['finalRetryRefresh']={'snapshot':after,'sameFields':fields,'best':best};shot('all-eight-records-final-replay-paused.png');r['status']='passed'
   assert not any(r[k]for k in['consoleErrors','httpErrors','requestFailures'])
  except Exception as e:
   r['status']='failed';r['error']=repr(e)
   try:r['lastSnapshot']=snap();shot('failure-debug.png')
   except:pass
   raise
  finally:
   release();flush();c.close()
   try:w.stdin.close();w.wait(timeout=5)
   except:w.terminate()
 print(json.dumps({'status':r['status'],'matches':len(r['matches'])}),flush=True)
if __name__=='__main__':main()
