import argparse,json,time,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();KEY='classic-atlas.ember-duel.v2';DIR=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);ap.add_argument('--map',type=int,default=0);ap.add_argument('--cadence',type=float,default=.05);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/finite-gap-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'kind':'ordinary keyboard pulses on public v2; separate visible-state policy, no live engine/time/save/state writes','map':a.map,'cadence':a.cadence,'decisions':[],'progress':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def choose(d):w.stdin.write(json.dumps(d,separators=(',',':'))+'\n');w.stdin.flush();v=json.loads(w.stdout.readline());assert 'error' not in v,v;return v
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate("async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.diagnostics();}")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/maze/',wait_until='domcontentloaded',timeout=20000)
   if diag()['soundOn']:p.locator('#sound').click()
   if a.map:p.locator('[data-map="'+str(a.map)+'"]').click()
   p.locator('#primary').click();t=time.monotonic();mark=-5;captured=False
   while time.monotonic()-t<120:
    deadline=time.monotonic()+a.cadence;d=diag()
    if d['state'] in ['won','lost','draw']:break
    assert d['state']=='playing';v=choose(d)
    if v.get('bomb'):p.keyboard.press('j')
    if v.get('direction') is not None:p.keyboard.press(DIR[v['direction']])
    r['decisions'].append({'time':d['time'],'player':d['player'],'rival':d['rival'],'command':v})
    if d['time']>=mark+5:mark=d['time'];row={'time':d['time'],'state':d['state'],'stats':d['stats'],'player':[d['player']['x'],d['player']['y']],'rival':[d['rival']['x'],d['rival']['y']]};r['progress'].append(row);(out/'progress.json').write_text(json.dumps(row,indent=2),encoding='utf-8');print(json.dumps(row),flush=True)
    if d['time']>7 and not captured:shot('normal-bomb-pressure-running.png');captured=True
    p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
   p.wait_for_timeout(150);d=diag();r['outcome']=d;r['wallSeconds']=time.monotonic()-t;shot('natural-result.png');assert d['state']=='won','natural attempt ended '+d['state'];assert d['player']['alive'] and not d['rival']['alive'] and d['stats']['playerBombs']>0 and d['record']['won']==1;r['playerFlameAtRival']=any(f['owner']=='player' and [f['x'],f['y']]==[d['rival']['x'],d['rival']['y']] for f in d['flames']);record=d['record'];p.reload(wait_until='domcontentloaded');n=diag();assert n['state']=='ready' and n['record']==record and n['bombs']==[] and n['flames']==[];r['refreshRecordKept']=True;shot('win-record-refresh.png');p.locator('#primary').click();p.locator('#pause').click();n=diag();assert n['state']=='paused' and n['time']<.25 and n['player']['alive'] and n['rival']['alive'] and n['bombs']==[] and n['flames']==[] and n['stats']['playerBombs']==0 and n['record']==record;r['retryClean']=n;shot('new-duel-clean-paused.png');r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:r['lastSnapshot']=diag();shot('failure-debug.png')
   except:pass
   raise
  finally:
   (out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
   try:w.stdin.close();w.wait(timeout=5)
   except:w.terminate()
 print(json.dumps({'status':r['status'],'time':d['time'],'stats':d['stats'],'record':d['record'],'playerFlameAtRival':r['playerFlameAtRival'],'decisions':len(r['decisions'])},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
