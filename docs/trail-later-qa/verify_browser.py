import argparse,json,time,os,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();KEY='trail-v2-r1'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/continuation-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':'https://yydshly.github.io/classic-games-atlas/versions/v2/games/trail/','method':'Fresh isolated persistent profile; ordinary D/W/J keys and native buttons. Fixed jump schedule informed by authored gaps; read only native save to observe. First stage is necessary unlock/progression prerequisite. No game/time/save writes.','stages':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright() as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1000});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def g():return json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))['game']
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  try:
   p.goto(r['url'],wait_until='domcontentloaded',timeout=20000);p.wait_for_selector('#primary');assert g()['state']=='ready' and g()['level']==1
   for level,jumps in [(1,[2.43,6.27,10.49,14.15]),(2,[2.37,5.93,9.82,13.76]),(3,[2.53,6.37,10.70,14.70])]:
    if level==1:p.locator('#primary').click()
    assert g()['state']=='playing' and g()['level']==level
    row={'level':level,'start':g(),'jumpWallSchedule':jumps,'events':[],'observations':[]};r['stages'].append(row);flush();p.keyboard.down('d');started=time.monotonic();j=0;down=False;nextAttack=0;mark=0
    while time.monotonic()-started<40:
     t=time.monotonic()-started
     if j<len(jumps) and t>=jumps[j]:p.keyboard.down('w');row['events'].append({'wall':t,'key':'w','down':True});down=True;j+=1
     if down and t>=jumps[j-1]+.82:p.keyboard.up('w');down=False
     if t>=nextAttack:p.keyboard.press('j');nextAttack=t+.35
     if t>=mark+.4:
      mark=t;s=g();row['observations'].append({'wall':t,'time':s['time'],'state':s['state'],'x':s['player']['x'],'lives':s['lives'],'food':s['stats']['collected']})
      if s['state'] in ['won','lost']:break
     p.wait_for_timeout(15)
    p.keyboard.up('d');p.keyboard.up('w');p.wait_for_timeout(150);row['outcome']=g();shot(f'stage-{level}-result.png');row['visible']={i:p.locator('#'+i).inner_text() for i in ['title','description','primary','stats','energyText']};flush();print(json.dumps({'level':level,'state':g()['state'],'time':g()['time'],'lives':g()['lives'],'food':g()['stats']['collected']}),flush=True);assert g()['state']=='won',f'normal attempt did not win stage {level}'
    before=g();p.reload(wait_until='domcontentloaded');p.wait_for_selector('#primary');after=g();assert after['state']=='won' and after['level']==level and after['time']==before['time'] and after['energy']==before['energy'] and after['lives']==before['lives'];row['terminalRefresh']=after;shot(f'stage-{level}-refresh.png')
    if level<3:
     p.locator('#primary').click();n=g();assert n['level']==level+1 and n['state']=='playing' and n['time']==0 and n['lives']==3 and n['stats']['collected']==0 and not n['checkpoint'] and not n['projectiles'] and all(e['alive'] for e in n['enemies']);row['nextClean']=n
    flush()
   assert '三段短程完成' in p.locator('#description').inner_text() and '重新走一遍' in p.locator('#primary').inner_text();r['finalNoFourthStage']=True
   p.locator('#retry').click();s=g();assert s['level']==3 and s['state']=='playing' and s['time']==0 and s['lives']==3 and not s['checkpoint'];p.locator('#pause').click();r['retryFinalClean']=g();shot('final-retry-paused.png');assert r['retryFinalClean']['state']=='paused'
   assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'];r['status']='passed'
  except Exception as e:
   r['status']='failed';r['error']=repr(e)
   try:r['lastSave']=g();shot('failure-debug.png')
   except:pass
   raise
  finally:flush();c.close()
 print(json.dumps({'status':r['status'],'stages':len(r['stages'])}),flush=True)
if __name__=='__main__':main()
