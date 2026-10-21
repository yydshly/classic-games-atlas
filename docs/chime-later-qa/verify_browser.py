import argparse,json,os,time,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();URL='https://yydshly.github.io/classic-games-atlas/versions/v2/games/chime/'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/finite-gap-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':URL,'method':'Normal free selection of second puzzle, then native next to third. Fixed published legal timing reference; ordinary number keys/B and buttons. Read-only diagnostic copy observes actual game time, no live engine/state/save/time/result writes.','results':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright()as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1000});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def snap():return p.evaluate("async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.diagnostics()}")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  try:
   p.goto(URL,wait_until='domcontentloaded',timeout=20000);p.locator('#levels').click();p.locator('[data-level="2"]').click();assert snap()['level']==2 and snap()['state']=='ready'
   for level,plan in [(2,[(3,'1'),(6,'b')]),(3,[(0,'1'),(3,'2'),(4.5,'b')])]:
    s=snap();assert s['level']==level and s['state']=='ready';row={'level':level,'start':s,'referenceSchedule':plan,'inputs':[]};r['results'].append(row);p.locator('#primary-action').click()
    if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
    j=0;captured=False;start=time.monotonic()
    while time.monotonic()-start<55:
     s=snap()
     if s['state']in['won','lost']:break
     if j<len(plan)and s['time']>=plan[j][0]:
      when,key=plan[j];p.keyboard.press(key);row['inputs'].append({'observedBefore':s,'plannedAt':when,'key':key,'observedAfter':snap()});j+=1;flush()
     if s['bubble']['state']=='captured'and not captured:shot(f'puzzle-{level}-captured.png');captured=True
     p.wait_for_timeout(20)
    p.wait_for_timeout(150);s=snap();row['outcome']=s;row['visible']={k:p.locator(k).inner_text()for k in['#overlay','#battle-status']};shot(f'puzzle-{level}-won.png');flush();print(json.dumps({'level':level,'state':s['state'],'time':s['time'],'stars':sum(x['collected']for x in s['stars']),'cuts':s['stats']['cuts'],'actions':s['actionLog']},ensure_ascii=False),flush=True);assert s['state']=='won' and s['stats']['settlements']==1 and s['bubble']['state']=='popped'
    if level==2:
     p.locator('#primary-action').click();n=snap();assert n['level']==3 and n['state']=='ready' and n['time']==0 and n['stats']['cuts']==0 and n['bubble']['state']=='waiting'and all(not x['cut']for x in n['ropes'])and n['best']==s['best'];row['nextClean']=n;p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();n=snap();assert n['level']==3 and n['state']=='ready'and n['best']==s['best'];row['nextRefresh']=n
   assert p.locator('#level-list [data-level="4"]').count()==0 and '长风归来' in p.locator('#overlay').inner_text();r['finalNoFourth']=True;best=snap()['best'];p.locator('#primary-action').click();n=snap();assert n['level']==3 and n['state']=='ready'and n['time']==0 and n['bubble']['state']=='waiting'and n['best']==best;r['finalRevisit']=n;p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();n=snap();assert n['level']==3 and n['state']=='ready'and n['best']==best and set(best)=={'2','3'};r['finalRefresh']=n;p.locator('#levels').click();assert p.locator('[data-level]').count()==3;r['onlyThreeSelectable']=True;shot('both-earned-records.png');r['status']='passed';assert not any(r[k]for k in['consoleErrors','httpErrors','requestFailures'])
  except Exception as e:
   r['status']='failed';r['error']=repr(e)
   try:r['lastSnapshot']=snap();shot('failure-debug.png')
   except:pass
   raise
  finally:flush();c.close()
if __name__=='__main__':main()
