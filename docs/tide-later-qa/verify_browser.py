import argparse,json,time,os,subprocess,math
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();KEY='classic-atlas.tide.supply.v2'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/finite-gap-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'kind':'normal pause, native one-degree slider keys, resume, HTML swap/fire buttons; separate read-only planning; production flight/clock; no state/time/save injection','plans':[],'progress':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(Path(__file__).with_name('policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def choose(d):v={**d,'state':'playing'};w.stdin.write(json.dumps(v,separators=(',',':'))+'\n');w.stdin.flush();x=json.loads(w.stdout.readline());assert x is None or 'error' not in x,x;return x
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate("async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.diagnostics();}")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/tide/',wait_until='domcontentloaded',timeout=20000)
   if p.locator('#sound').get_attribute('aria-pressed')=='true':p.locator('#sound').click()
   p.locator('#levels').click();p.locator('[data-level="2"]').click();assert diag()['level']==2;p.locator('#primary-action').click()
   if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
   started=time.monotonic();mark=-5;closed=False;count=0
   while time.monotonic()-started<600 and count<300:
    d=diag()
    if d['state'] in ['won','lost']:break
    assert d['state']=='playing',d['state']
    if d['time']>=mark+5:
     mark=d['time'];row={'activity':d['time'],'wall':time.monotonic()-started,'tide':d['tide'],'beads':len(d['beads']),'shots':d['stats']['shots'],'closed':d['supplyStopped']};r['progress'].append(row);(out/'progress.json').write_text(json.dumps(row,indent=2),encoding='utf-8');print(json.dumps(row),flush=True)
    if d['supplyStopped'] and not closed:shot('supply-closed-running.png');closed=True
    if d['shot'] or d['resolving'] or d['time']+1e-9<d['nextFire'] or not d['beads']:p.wait_for_timeout(45);continue
    p.locator('#pause').click();frozen=diag();assert frozen['state']=='paused';plan=choose(frozen);count+=1
    if not plan:p.locator('#pause').click();p.wait_for_timeout(250);continue
    item={'tick':frozen['ticks'],'activity':frozen['time'],'plan':plan,'focusBefore':p.evaluate('document.activeElement.id')}
    if plan.get('swap'):
     p.locator('#pause').click();p.locator('#swap').click(timeout=1500);item['executed']='swap then replan';r['plans'].append(item);continue
    if plan['kind']!='fire':raise AssertionError('unexpected helper action')
    deg=round(math.atan2(math.sin(plan['angle']+math.pi/2),math.cos(plan['angle']+math.pi/2))*180/math.pi);aim=p.locator('#aim');cur=int(aim.input_value());best=min([(abs(deg-cur),'current'),(deg+180,'Home'),(180-deg,'End')])[1]
    if best!='current':aim.press(best);cur=int(aim.input_value())
    for _ in range(abs(deg-cur)):aim.press('ArrowRight' if deg>cur else 'ArrowLeft')
    assert int(aim.input_value())==deg;ready=diag();expected=math.atan2(math.sin(-math.pi/2+deg*math.pi/180),math.cos(-math.pi/2+deg*math.pi/180));assert abs(math.atan2(math.sin(ready['aim']-expected),math.cos(ready['aim']-expected)))<1e-8 and ready['ticks']==frozen['ticks'];item.update(degrees=deg,focusOnSlider=p.evaluate('document.activeElement.id'),frozenTicksKept=True)
    p.locator('#pause').click();p.locator('#fire').click(timeout=1500);fired=diag();cmd=fired['log'][-1];assert cmd['kind']=='fire' and abs(cmd['angle']-expected)<1e-8 and fired['stats']['shots']==frozen['stats']['shots']+1;item.update(executed='fire',actualTick=cmd['tick'],actualAngle=cmd['angle']);r['plans'].append(item)
   p.wait_for_timeout(150);d=diag();r['outcome']=d;r['wallSeconds']=time.monotonic()-started;shot('natural-result.png');assert d['state']=='won','natural attempt ended '+d['state'];assert d['supplyStopped'] and d['supplyStopCount']==1 and not d['beads'] and d['stats']['settlements']==1 and d['tide']>=42;r['savedBest']=json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))['best'];assert r['savedBest']['2']['score']==d['score'];p.reload(wait_until='domcontentloaded');n=diag();assert n['state']=='ready' and n['level']==2 and n['best']==r['savedBest'] and n['stats']['shots']==0;r['refreshRecordKept']=True;shot('best-kept-refresh-ready.png');r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:r['lastSnapshot']=diag();shot('failure-debug.png')
   except:pass
   raise
  finally:
   (out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
   try:w.stdin.close();w.wait(timeout=5)
   except:w.terminate()
 print(json.dumps({'status':r['status'],'time':d['time'],'wallSeconds':r['wallSeconds'],'tide':d['tide'],'score':d['score'],'stats':d['stats'],'plans':len(r['plans'])},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
