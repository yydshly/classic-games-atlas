import argparse,json,os,time,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();BASE='https://yydshly.github.io/classic-games-atlas/versions/v2/games/coaster/'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/continuation-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);plans=json.loads((Path(__file__).with_name('reference-plans.json')).read_text(encoding='utf-8'))['answers'];assert all(plans)
 r={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':BASE,'method':'Fresh isolated persistent profile. Offline authored engine legal recipe search is strategy reference only. All height/module selections, empty train tests, finite passenger runs and next-park unlocks are real public-page buttons. Read-only frozen coasterSnapshot observes results. First park is necessary prerequisite. No game/save/time/result writes.','parks':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright() as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1100});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def snap():return p.evaluate('window.coasterSnapshot()')
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def waitfinish(active,bound):
   start=time.monotonic()
   while time.monotonic()-start<bound:
    s=snap()
    if s['state'] not in active:return s
    p.wait_for_timeout(450)
   raise RuntimeError('bounded natural run did not finish: '+str(snap()['state']))
  try:
   p.goto(BASE,wait_until='domcontentloaded',timeout=20000);p.wait_for_function('typeof window.coasterSnapshot==="function"')
   if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
   assert snap()['levelIndex']==0 and snap()['state']=='design'
   for plan in plans:
    i=plan['level']-1;s=snap();assert s['levelIndex']==i and s['state']=='design' and s['tick']==0 and not s['report'];row={'level':i+1,'name':s['level']['name'],'start':s,'plan':plan,'inputs':[]};r['parks'].append(row);flush()
    for node in [1,4,7]:
     off=plan['offsets'][node]
     if not off:continue
     p.locator('#height-pick-'+str(node-1)).click()
     for k in range(abs(off)//4):p.locator('#height-raise' if off>0 else '#height-lower').click();row['inputs'].append({'heightNode':node,'delta':4 if off>0 else -4})
    for j,module in enumerate(plan['modules']):
     if module=='rail':continue
     p.locator('#segment-list button').nth(j).click();p.locator('#module-'+module).click();row['inputs'].append({'segment':j,'module':module})
    s=snap();assert s['modules']==plan['modules'] and s['heightOffsets']==plan['offsets'] and s['cost']==plan['cost'];row['built']=s;shot(f'park-{i+1}-design.png');p.locator('#test-ride').click();s=waitfinish(['testing'],plan['report']['duration']*1.8+15);assert s['state']=='design' and s['report']['safe'] and s['report']['approved'];row['tested']=s;shot(f'park-{i+1}-test-passed.png');flush();p.locator('#open-park').click();s=waitfinish(['operating'],plan['metric']*1.8+15);assert s['state']=='won' and s['revenue']>=s['level']['targetRevenue'] and s['reputation']>=s['level']['targetReputation'];assert s['runs']==plan['runs'] and len(s['best'])==i+1;p.wait_for_timeout(150);row['outcome']=snap();row['visible']={k:p.locator('#'+k).inner_text() for k in ['state-title','state-copy','primary-action','state-summary']};shot(f'park-{i+1}-won.png');flush();print(json.dumps({'park':i+1,'state':s['state'],'runs':s['runs'],'visitors':s['visitors'],'revenue':s['revenue'],'reputation':s['reputation'],'seconds':s['elapsed'],'records':len(s['best'])}),flush=True)
    if i<7:
     p.locator('#primary-action').click();n=snap();assert n['levelIndex']==i+1 and n['state']=='design' and n['tick']==0 and n['runs']==0 and n['revenue']==0 and n['reputation']==0 and n['cost']==0 and n['modules']==['rail']*12 and not n['report'] and n['heightOffsets']==[0]*12;row['nextClean']=n
     p.reload(wait_until='domcontentloaded');p.wait_for_function('typeof window.coasterSnapshot==="function"');n=snap();assert n['state']=='design' and n['levelIndex']==i+1 and n['best']==s['best'];row['nextRefresh']=n;flush()
   assert '八份委托全部完成' in p.locator('#state-copy').inner_text() and '重访' in p.locator('#primary-action').inner_text();r['finalNoNinthPark']=True;best=snap()['best'];p.locator('#primary-action').click();s=snap();assert s['state']=='design' and s['levelIndex']==7 and s['tick']==0 and s['cost']==0 and s['runs']==0 and s['best']==best;r['finalRevisit']=s;shot('final-revisit-design.png');p.reload(wait_until='domcontentloaded');p.wait_for_function('typeof window.coasterSnapshot==="function"');s=snap();assert s['state']=='design' and s['levelIndex']==7 and s['best']==best and len(best)==8;r['finalRefresh']=s;p.locator('#chapters').click();assert p.locator('#chapter-list button').count()==8 and p.locator('#chapter-list button:disabled').count()==0;r['allEightSelectable']=True;shot('all-eight-records.png');r['status']='passed';assert not any(r[k] for k in ['consoleErrors','httpErrors','requestFailures'])
  except Exception as e:
   r['status']='failed';r['error']=repr(e)
   try:r['lastSnapshot']=snap();shot('failure-debug.png')
   except:pass
   raise
  finally:flush();c.close()
 print(json.dumps({'status':r['status'],'parks':len(r['parks'])}),flush=True)
if __name__=='__main__':main()
