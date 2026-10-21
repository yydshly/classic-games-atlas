import argparse,json,os,time,subprocess,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();KEY={'left':'ArrowLeft','right':'ArrowRight','brake':'ArrowDown','drift':'Space'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/final-four-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/kart/','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Normal ready-screen optional75% curve assist ON, scores remain assisted. Fresh native profile; first race required normal unlock prerequisite. Read-only copied telemetry/geometry produces digital left/right/brake/drift/E controls; real production race/time/rank. No hidden state or save/position/speed/time/result writes. Max2 attempts per course.','courses':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def choose(d):w.stdin.write(json.dumps(d,separators=(',',':'))+'\n');w.stdin.flush();v=json.loads(w.stdout.readline());assert 'error'not in v,v;return v
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright()as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}));held=set()
  def snap():return p.evaluate('window.kartSnapshot()')
  def key(k,on):
   if on and k not in held:p.keyboard.down(k);held.add(k)
   if not on and k in held:p.keyboard.up(k);held.remove(k)
  def release():
   for k in list(held):key(k,False)
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def fresh(s,level):assert s['level']==level and s['state']=='ready'and s['time']==0 and s['ticks']==0 and not s['result']and not s['input']['keys']and all(x['speed']==0 and x['finishTime']is None and x['item']is None and x['boost']==0 and x['driftCharge']==0 for x in s['cars'])
  try:
   p.goto(r['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#primary-action').wait_for();fresh(snap(),1);assert not snap()['assist'];p.locator('#assist-mode').check();assert snap()['assist']
   for level in range(1,9):
    fresh(snap(),level);row={'level':level,'start':snap(),'attempts':[]};r['courses'].append(row);won=False
    for attempt in range(1,3):
     p.locator('#primary-action').click()
     if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
     entry={'attempt':attempt,'decisions':[]};row['attempts'].append(entry);began=time.monotonic();mark=-10
     while time.monotonic()-began<155:
      deadline=time.monotonic()+.05;d=snap()
      if d['state']in['won','lost']:break
      assert d['state']in['countdown','playing']and d['assist'];v=choose(d)
      for k,on in [('left',v['steer']<0),('right',v['steer']>0),('brake',v['brake']),('drift',v['drift'])]:key(KEY[k],on)
      if v['item']:p.keyboard.press('e')
      entry['decisions'].append({'time':d['time'],'player':{'s':d['cars'][0]['s'],'lateral':d['cars'][0]['lateral'],'speed':d['cars'][0]['speed'],'headingError':d['cars'][0]['headingError']},'input':v})
      if d['time']>=mark+10:mark=d['time'];flush();print(json.dumps({'course':level,'attempt':attempt,'time':d['time'],'rank':d['rank'],'lap':d['cars'][0]['lap'],'stats':d['stats']}),flush=True)
      p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
     release();p.wait_for_timeout(150);d=snap();entry['outcome']=d;shot(f'course-{level}-attempt-{attempt}-{d["state"]}.png');flush();print(json.dumps({'course':level,'attempt':attempt,'state':d['state'],'result':d['result'],'stats':d['stats']}),flush=True)
     if d['state']=='won':won=True;row['outcome']=d;break
    if not won:r['status']='bounded_uncovered';r['blockedUnits']=list(range(level,9));r['blocker']='Two ordinary assisted strategy attempts did not meet target at current course; later courses remain locked, not a confirmed engine defect.';break
    assert d['result']['won']and d['result']['assisted']and d['unlocked']==min(8,level+1)and len(d['assistedBest'])==level and not d['best'];row['visible']={k:p.locator('#'+k).inner_text()for k in['state-title','state-description','state-summary','primary-action']};flush()
    if level<8:p.locator('#primary-action').click();fresh(snap(),level+1);assert snap()['assist']and snap()['assistedBest']==d['assistedBest'];row['nextClean']=snap();flush()
   if r.get('status')!='bounded_uncovered':
    assert '八站风景' in p.locator('#state-title').inner_text()and'重赛冠军环' in p.locator('#primary-action').inner_text();r['finalNoNinth']=True;best=snap()['assistedBest'];p.locator('#primary-action').click();fresh(snap(),8);p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();fresh(snap(),8);assert snap()['assist']and snap()['assistedBest']==best and len(best)==8 and not snap()['best'];r['finalRefresh']=snap();shot('all-eight-assisted-records-refreshed.png');p.locator('#chapters').click();r['courseMenuText']=p.locator('#chapters-dialog').inner_text();shot('all-eight-course-menu.png');r['status']='passed'
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
 print(json.dumps({'status':r['status'],'courses':len(r['courses'])}),flush=True)
if __name__=='__main__':main()
