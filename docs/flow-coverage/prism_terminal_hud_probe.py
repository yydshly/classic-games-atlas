"""Targeted native first-stage terminal HUD timing check, not a second stage-12 clear."""
import json,time,os,math,argparse,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
def aim(g):
 pw=g['paddleWidth'];balls=[b for b in g['balls'] if b['alive'] and not b['attached']];down=sorted([b for b in balls if b['dy']>0 and b['y']<=636],key=lambda b:(636-b['y'])/b['dy']);ball=(down or balls or [None])[0]
 if not ball:return 300
 x=ball['x']
 if ball['dy']>0:x+=ball['dx']*(636-ball['y'])/ball['dy'];n=(x-31)%1076;x=31+(n if n<=538 else 1076-n)
 targets=sorted([q for q in g['bricks'] if not q['steel'] and q['hp']>0],key=lambda q:(-q['y'],abs(q['x']+23-x)));angle=math.atan2(targets[0]['x']+23-x,636-targets[0]['y']-22) if targets else .3;offset=max(-.78,min(.78,angle/1.08))*pw/2;return max(24+pw/2,min(576-pw/2,x-offset))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/later-stages-round/tmp';tmp.mkdir(exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'kind':'targeted normal first-stage UI terminal HUD timing probe; not another stage12 win','codeBaseline':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append(x.status) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append(x.url))
  def diag():return p.evaluate("async()=> (await import(document.querySelector('script[type=module]').src)).diagnostics()")
  def hud():return {k:p.locator('#'+k).inner_text() for k in ['score','remaining','destroyed','best-score','overlay-summary']}
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/prism/',wait_until='networkidle',timeout=20000);assert diag()['unlocked']==1;p.locator('#sound').click();p.locator('#primary-action').click();p.locator('#help-confirm').click();deadline=time.monotonic()+180
   while time.monotonic()<deadline:
    g=diag()
    if g['state'] in ['won','lost']:break
    if g['serving']:p.locator('#launch').click()
    else:
     rect=p.locator('#battlefield').bounding_box();p.mouse.move(rect['x']+aim(g)/600*rect['width'],rect['y']+.9*rect['height'])
    p.wait_for_timeout(25)
   assert g['state']=='won';r['nativeOutcome']=g;r['immediateHud']=hud();p.wait_for_timeout(150);r['after150msHud']=hud();h=r['after150msHud'];assert int(h['score'])==g['stats']['score'] and h['remaining'].startswith('0 ') and h['destroyed']=='20 / 20' and int(h['best-score'])==g['stats']['score'];p.screenshot(path=str(out/'first-stage-terminal-hud-after-150ms.png'),full_page=True);assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'];r['status']='passed'
  except Exception as e:r.update(status='failed',error=str(e));raise
  finally:(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'immediate':r['immediateHud'],'after150ms':r['after150msHud']}),flush=True)
if __name__=='__main__':main()
