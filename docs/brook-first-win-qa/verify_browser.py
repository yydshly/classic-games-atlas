"""Production page normal controls; fixed reference plan, HUD decisions, audit-only diagnostics."""
import argparse,json,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
PLAN=[[0,'dew',0,0],[0,'bolt',1,1],[0,'wall',1,6],[3.6,'bolt',1,2],[6.1,'wall',1,5],[10,'bolt',0,2],[14,'bolt',2,2],[17.5,'dew',2,0],[22,'bolt',1,3],[26,'bolt',0,3],[30,'bolt',2,3]]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/versions/v2/games/brook/');ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/playability-three/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':a.url,'kind':'script-assisted normal UI with preselected legal strategy; no game/storage/time injection; diagnostic reads only after result','actions':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate('async()=>{const m=await import(document.querySelector("script[type=module]").src);return m.diagnostics()}')
  def snap(name):p.screenshot(path=str(out/name),full_page=True)
  try:
   p.goto(a.url,wait_until='networkidle',timeout=20000);assert p.locator('#resource').inner_text()=='260';assert '1×' in p.locator('#speed').inner_text();p.locator('#sound').click();assert '关' in p.locator('#sound').inner_text();p.locator('#primary-action').click();p.locator('#help-confirm').click();i=0;captured=set();began=time.monotonic();mark=0
   while time.monotonic()-began<190:
    if p.locator('#overlay').is_visible():break
    clock=float(p.locator('#clock').inner_text().rstrip('s'))
    if not p.locator('#collect').is_disabled():p.locator('#collect').click();r['actions'].append({'hudTime':clock,'kind':'collect'})
    if i<len(PLAN) and clock>=PLAN[i][0]:
     at,unit,row,col=PLAN[i];p.locator(f'[data-type="{unit}"]').click();p.locator('#row').select_option(index=row);p.locator('#col').select_option(index=col);assert p.locator('#row').input_value()==str(row) and p.locator('#col').input_value()==str(col)
     if not p.locator('#deploy').is_disabled():p.locator('#deploy').click();r['actions'].append({'hudTime':clock,'kind':'place','type':unit,'row':row,'col':col});i+=1
    for threshold in [18,42]:
     if clock>=threshold and threshold not in captured:snap(f'running-{threshold}s.png');captured.add(threshold)
    if clock>=mark+20:mark=clock;print(json.dumps({'phase':'running','clock':clock,'placedPlanSteps':i,'cleared':p.locator('#cleared').inner_text()},ensure_ascii=False),flush=True)
    p.wait_for_timeout(120)
   title=p.locator('#overlay-title').inner_text();r['resultTitle']=title;r['resultSummary']=p.locator('#overlay-summary').inner_text();r['outcome']=diag();snap('result.png');assert r['outcome']['state']=='won',title
   s=r['outcome'];assert s['stats']['kills']==9 and s['stats']['settlements']==1 and s['stats']['jumps']==3;assert s['resource']==260+s['stats']['collected']-s['stats']['spent'];assert len(s['log'])>10
   raw=json.loads(p.evaluate('localStorage.getItem("classic-atlas.brook.v2")'));assert raw['best']['1']['score']==s['score'] and raw['resume'] is None;r['savedBest']=raw['best']['1']
   p.locator('#primary-action').click();n=diag();assert n['level']==2 and n['state']=='ready' and n['resource']==230 and n['time']==0 and n['plants']==[] and n['enemies']==[];snap('next-ready.png');old=p.evaluate('localStorage.getItem("classic-atlas.brook.v2")');p.reload(wait_until='networkidle');after=diag();assert after['level']==2 and after['state']=='ready' and after['resource']==230 and after['best']['1']==r['savedBest'];assert p.evaluate('localStorage.getItem("classic-atlas.brook.v2")')==old;snap('next-ready-refresh.png')
   p.locator('#primary-action').click();p.wait_for_timeout(350);p.locator('#pause').click();n=diag();assert n['level']==2 and n['state']=='paused' and n['stats']['kills']==0 and n['resource']==230 and n['plants']==[];r['nextStage']={'readyAndRefresh':True,'bestPreserved':True,'normalStartPausedTime':n['time'],'budget':230,'plants':0,'kills':0};snap('next-start-paused.png');r['outcome']['best']=r['outcome']['best'];r['status']='passed'
   assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
  except Exception as e:r['status']='failed';r['error']=str(e);snap('failure-debug.png');raise
  finally:(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'summary':r['resultSummary'],'stats':r['outcome']['stats'],'time':r['outcome']['time'],'score':r['outcome']['score'],'next':r['nextStage'],'errors':[r['consoleErrors'],r['httpErrors'],r['requestFailures']]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
