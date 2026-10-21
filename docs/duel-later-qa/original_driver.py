import argparse,json,os,time,subprocess,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();ATTACK={'heavy':'u','anti':'i','throw':'o','light':'j'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/final-four-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/duel/','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Fresh native profile; first court necessary unlock prerequisite. Read-only full copied snapshots feed separate reactive policy; real D/A/K/U/I/O keys only. No live engine/state/save/time/HP/unlock writes. Script assistance, not human reaction. Max2 natural attempts per court, no difficulty change.','courts':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def choose(d):w.stdin.write(json.dumps(d,separators=(',',':'))+'\n');w.stdin.flush();v=json.loads(w.stdout.readline());assert 'error'not in v,v;return v
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright()as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}));held=set()
  def snap():return p.evaluate('window.__duel.snapshot()')
  def key(k,on):
   if on and k not in held:p.keyboard.down(k);held.add(k)
   if not on and k in held:p.keyboard.up(k);held.remove(k)
  def release():
   for k in list(held):key(k,False)
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def fresh(s,level):assert s['level']==level and s['state']=='ready'and s['ticks']==0 and s['player']['hp']==100 and s['enemy']['hp']==s['enemy']['maxHP']and s['player']['energy']==s['enemy']['energy']==100 and s['player']['action']is None and s['enemy']['action']is None and not s['swings']and not s['log']and not s['held']and not s['blocked']
  try:
   p.goto(r['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#start').wait_for()
   if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
   fresh(snap(),1)
   for level in range(1,9):
    row={'level':level,'start':snap(),'attempts':[]};r['courts'].append(row);fresh(snap(),level);won=False
    for attempt in range(1,3):
     p.locator('#start').click();entry={'attempt':attempt,'decisions':[]};row['attempts'].append(entry);began=time.monotonic();mark=-5
     while time.monotonic()-began<100:
      deadline=time.monotonic()+.05;d=snap()
      if d['state']in['won','lost']:break
      assert d['state']=='playing';v=choose(d);key('a',v['move']<0);key('d',v['move']>0)
      if v.get('face')and d['player']['face']<0:key('a',False);key('d',False);p.keyboard.press('d')
      key('k',v['guard'])
      if v.get('attack'):key('k',False);p.keyboard.press(ATTACK[v['attack']])
      entry['decisions'].append({'ticks':d['ticks'],'hp':[d['player']['hp'],d['enemy']['hp']],'distance':d['enemy']['x']-d['player']['x'],'playerPhase':d['playerPhase'],'enemyPhase':d['enemyPhase'],'keys':v})
      if d['time']>=mark+5:mark=d['time'];print(json.dumps({'court':level,'attempt':attempt,'time':d['time'],'hp':[d['player']['hp'],d['enemy']['hp']]}),flush=True);flush()
      p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
     release();p.wait_for_timeout(150);d=snap();entry['outcome']=d;shot(f'court-{level}-attempt-{attempt}-{d["state"]}.png');flush();print(json.dumps({'court':level,'attempt':attempt,'state':d['state'],'time':d['time'],'hp':d['player']['hp'],'enemyHP':d['enemy']['hp'],'stats':d['stats']}),flush=True)
     if d['state']=='won':won=True;row['outcome']=d;break
     if attempt<2:p.locator('#reset').click();fresh(snap(),level)
    if not won:r['status']='bounded_uncovered';r['blockedUnits']=list(range(level,9));r['blocker']='Reactive ordinary-key strategy failed2 natural attempts at current court; later courts remain locked. No confirmed engine impossibility.';break
    assert d['enemy']['hp']==0 and d['player']['hp']>0 and d['stats']['hits']>0 and d['stats']['settlements']==1 and d['unlocked']==min(8,level+1)and len(d['best'])==level;row['visible']={k:p.locator('#'+k).inner_text()for k in['overlay-title','overlay-copy','overlay-summary','primary-action']};flush()
    if level<8:p.locator('#primary-action').click();n=snap();fresh(n,level+1);assert n['best']==d['best'];row['nextClean']=n;flush()
   if r.get('status')!='bounded_uncovered':
    assert '八座风庭' in p.locator('#overlay-title').inner_text()and'再战终庭' in p.locator('#primary-action').inner_text();r['finalNoNinth']=True;best=snap()['best'];p.locator('#primary-action').click();fresh(snap(),8);p.reload(wait_until='domcontentloaded');p.locator('#start').wait_for();fresh(snap(),8);assert snap()['best']==best and len(best)==8;r['finalRefresh']=snap();p.locator('#levels').click();assert p.locator('#level-list button').count()==8 and p.locator('#level-list button:disabled').count()==0;r['allEightSelectable']=True;shot('all-eight-native-records.png');r['status']='passed'
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
 print(json.dumps({'status':r['status'],'courts':len(r['courts'])}),flush=True)
if __name__=='__main__':main()
