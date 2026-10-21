import argparse,json,os,time,subprocess,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
PLAN=[[0,'dew',0,0],[0,'bolt',2,2],[0,'wall',0,6],[0,'root',1,6],[4,'bolt',0,2],[6.1,'wall',0,5],[10,'bolt',0,3],[14,'dew',2,0],[18,'bolt',2,3],[29,'root',1,6],[35,'bolt',0,1],[54,'root',1,6]]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/later-stages-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'kind':'public normal stage selection, cards, explicit row/column option indices and buttons; fixed legal model-reference plan, 1x native clock, no hidden-state/save/time injection','codeBaseline':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'actions':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate("async()=> (await import(document.querySelector('script[type=module]').src)).diagnostics()")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/brook/',wait_until='networkidle',timeout=20000)
   p.locator('#sound').click();p.locator('#levels').click();assert p.locator('#level-list [data-level]').count()==2;p.locator('[data-level="2"]').click();g=diag();assert g['level']==2 and g['state']=='ready' and g['resource']==230 and g['speed']==1;r['visibleGoal']=p.locator('#overlay').inner_text();r['ready']=g;shot('second-ready-goal.png')
   p.locator('#primary-action').click()
   if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
   i=0;begin=time.monotonic();mark=0;captured=set()
   while time.monotonic()-begin<190:
    if p.locator('#overlay').is_visible():break
    clock=float(p.locator('#clock').inner_text().rstrip('s'))
    assert '1×' in p.locator('#speed').inner_text()
    if not p.locator('#collect').is_disabled():p.locator('#collect').click();r['actions'].append({'hudTime':clock,'kind':'collect'})
    if i<len(PLAN) and clock>=PLAN[i][0]:
     _,unit,row,col=PLAN[i];p.locator('[data-type="'+unit+'"]').click();p.locator('#row').select_option(index=row);p.locator('#col').select_option(index=col);assert p.locator('#row').input_value()==str(row) and p.locator('#col').input_value()==str(col)
     if not p.locator('#deploy').is_disabled():p.locator('#deploy').click();r['actions'].append({'hudTime':clock,'kind':'place','type':unit,'row':row,'col':col});i+=1
    if clock>=mark+20:mark=clock;print(json.dumps({'clock':clock,'planSteps':i,'cleared':p.locator('#cleared').inner_text()}),flush=True)
    for t in [25,55]:
     if clock>=t and t not in captured:shot('normal-running-'+str(t)+'.png');captured.add(t)
    p.wait_for_timeout(100)
   g=diag();r['outcome']=g;r['visibleEnding']=p.locator('#overlay').inner_text();shot('second-natural-victory.png');assert g['state']=='won' and g['level']==2 and g['stats']['kills']==10 and g['stats']['settlements']==1 and g['stats']['triggers']>=1
   assert g['resource']==230+g['stats']['collected']-g['stats']['spent'] and '溪谷安静下来了' in r['visibleEnding'] and '再守这一段' in p.locator('#primary-action').inner_text()
   saved=json.loads(p.evaluate("localStorage.getItem('classic-atlas.brook.v2')"));assert saved['resume'] is None and saved['best']['2']['score']==g['score'];r['savedBest']=saved['best']
   p.locator('#levels').click();assert p.locator('#level-list [data-level]').count()==2 and p.locator('[data-level="3"]').count()==0;shot('two-stages-no-third.png');p.locator('#levels-close').click();p.locator('#primary-action').click();g=diag();assert g['level']==2 and g['state']=='ready' and g['resource']==230 and g['time']==0 and g['plants']==g['enemies']==g['bullets']==[] and g['stats']['kills']==0;r['cleanReplay']=g
   p.reload(wait_until='networkidle');g=diag();assert g['level']==2 and g['state']=='ready' and g['resource']==230 and g['best']==r['savedBest'];r['refresh']=g;shot('final-record-refresh-clean-second.png')
   p.locator('#primary-action').click();p.wait_for_timeout(350);p.locator('#pause').click();g=diag();assert g['level']==2 and g['state']=='paused' and g['resource']==230 and g['plants']==[] and g['stats']['kills']==g['stats']['settlements']==0;r['normalReplayStart']=g
   assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'];r['status']='passed'
  except Exception as e:r.update(status='failed',error=str(e));shot('failed-attempt.png');raise
  finally:(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'time':r['outcome']['time'],'score':r['outcome']['score'],'stats':r['outcome']['stats']}),flush=True)
if __name__=='__main__':main()
