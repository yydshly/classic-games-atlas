import argparse,json,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='trail-v2-r1'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/coverage-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'kind':'independent fresh normal UI; no input while production energy naturally drains; no injection','observations':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append(x.url) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append(x.url))
  def saved():return json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))['game']
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/trail/',wait_until='networkidle',timeout=20000);p.locator('#primary').click();t=time.monotonic()
   while time.monotonic()-t<65:
    p.wait_for_timeout(500);g=saved()
    if not r['observations'] or g['lives']!=r['observations'][-1]['lives'] or g['state']=='lost':r['observations'].append({'time':g['time'],'energy':g['energy'],'lives':g['lives'],'state':g['state']});print(json.dumps(r['observations'][-1]),flush=True)
    if g['state']=='lost':break
   assert g['state']=='lost' and g['lives']==0 and g['reason']=='体力耗尽';r['outcome']=g;p.screenshot(path=str(out/'natural-energy-total-loss.png'),full_page=True);r['explanation']=p.locator('#description').inner_text();p.locator('#primary').click();n=saved();assert n['state']=='playing' and n['level']==1 and n['lives']==3 and n['stats']['collected']==0 and n['deaths']==0 and not n['checkpoint'];p.locator('#pause').click();before=saved();p.reload(wait_until='networkidle');after=saved();assert after['state']=='paused' and after['level']==1 and after['lives']==3 and after['stats']['collected']==0 and after['energy']==before['energy'];r['retryRefresh']=after;p.screenshot(path=str(out/'loss-retry-refresh-paused.png'),full_page=True);r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:r['status']='failed';r['error']=str(e);raise
  finally:(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'lossTime':g['time'],'reason':g['reason'],'retryLives':after['lives'],'retryState':after['state']},ensure_ascii=False))
if __name__=='__main__':main()
