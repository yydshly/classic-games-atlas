import argparse,json,time,os,math,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();BASE='https://yydshly.github.io/classic-games-atlas/versions/v2/games/echo/';KEY='echo-v2-progress-r2'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/continuation-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':BASE,'method':'Normal free level select to stage2, then native next to stage3. Strong pause-and-plan assistance: pause button saves, read-only engine replay of its native checkpoint observes position/enemies; ordinary mouse drags, W/Space/2/E and buttons implement route. No live controller/engine calls, storage writes, time changes or terminal fixtures.','stages':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright() as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1000});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def record():return json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))
  def observe():return p.evaluate('''async()=>{const base=new URL('.',document.querySelector('script[type=module]').src),e=await import(new URL('engine.mjs?v=echo2r1',base)),s=await import(new URL('progress.mjs?v=echo-continuity-r2',base));const v=s.readProgress(localStorage);return {game:e.snapshot(v.game),result:v.result};}''')
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def turn(delta):
   delta=math.atan2(math.sin(delta),math.cos(delta));box=p.locator('#scene').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;p.mouse.move(x,y);p.mouse.down()
   while abs(delta)>.001:
    d=max(-.19,min(.19,delta));x+=d/.005;p.mouse.move(x,y);delta-=d
   p.mouse.up()
  try:
   p.goto(BASE,wait_until='domcontentloaded',timeout=20000);p.wait_for_selector('#continue');p.locator('#level').select_option('1');assert record()=={'version':1,'kind':'ready','level':2};p.locator('#continue').click();p.locator('#burst').click();p.locator('#pause').click()
   for level in [2,3]:
    row={'level':level,'steps':[],'start':observe()};r['stages'].append(row);flush();assert row['start']['game']['level']==level and row['start']['game']['state']=='paused'
    route=[(1.5,7.5),(1.5,5.5),(6.5,5.5),(6.5,6.5),(8.5,6.5),(9.5,6.5),(9.5,7.5)] if level==2 else [(1.5,7.5),(1.5,6.5),(7.5,6.5),(8.5,6.5),(9.5,6.5),(9.5,7.5)]
    waypoint=0;started=time.monotonic()
    for n in range(250):
     obs=observe();s=obs['game'];rec=record()
     if rec['kind']=='result':row['result']=rec;break
     assert s['state']=='paused';v=s['player'];target=route[waypoint];dist=math.hypot(target[0]-v['x'],target[1]-v['y'])
     if dist<.17 and waypoint<len(route)-1:waypoint+=1;target=route[waypoint];dist=math.hypot(target[0]-v['x'],target[1]-v['y'])
     desired=math.atan2(target[1]-v['y'],target[0]-v['x']);enemy=min((e for e in s['enemies'] if e['hp']>0),key=lambda e:math.hypot(e['x']-v['x'],e['y']-v['y']),default=None)
     attack=bool(enemy and math.hypot(enemy['x']-v['x'],enemy['y']-v['y'])<1.55 and v['ammo']>=3 and v['cooldown']==0)
     if attack:desired=math.atan2(enemy['y']-v['y'],enemy['x']-v['x'])
     p.locator('#pause').click();turn(desired-v['yaw'])
     # Native E opens the gate when within range; a later E at the exit ends naturally.
     if waypoint>=len(route)-3:p.keyboard.press('e')
     key='Space' if attack else 'w';duration=.13 if attack else min(.21,max(.045,(dist-.06)/2.6));p.keyboard.down(key);p.wait_for_timeout(duration*1000);p.keyboard.up(key)
     if record()['kind']!='result':p.locator('#pause').click()
     row['steps'].append({'n':n,'waypoint':waypoint,'before':{'ticks':s['ticks'],'player':v,'keys':s['keys'],'doors':s['doors']},'input':{'turnDelta':math.atan2(math.sin(desired-v['yaw']),math.cos(desired-v['yaw'])),'heldKey':key,'wallSeconds':duration,'interact':waypoint>=len(route)-3}})
     if n%8==0:flush();print(json.dumps({'level':level,'n':n,'time':s['time'],'hp':v['hp'],'ammo':v['ammo'],'waypoint':waypoint,'pos':[v['x'],v['y']]}),flush=True)
     if record()['kind']=='result':row['result']=record();break
     if time.monotonic()-started>210:raise RuntimeError('bounded route did not complete within210 wall seconds')
    assert row.get('result',{}).get('result',{}).get('state')=='won',row.get('result',record());p.wait_for_timeout(150);row['visible']={i:p.locator('#'+i).inner_text() for i in ['title','message','hp','ammo','time','key','event']};shot(f'stage-{level}-won.png');before=record();p.reload(wait_until='domcontentloaded');p.wait_for_selector('#continue',state='attached');assert record()==before;row['terminalRefresh']=record();shot(f'stage-{level}-refresh.png');flush();print(json.dumps({'level':level,'result':row['result']}),flush=True)
    if level==2:
     p.locator('#continue').click();p.locator('#pause').click();o=observe();assert o['game']['level']==3 and o['game']['ticks']<12 and o['game']['player']['hp']==100 and o['game']['player']['ammo']==8 and not o['game']['keys'] and not o['game']['shots'] and o['game']['stats']['settlements']==0 and not any(o['game']['controls'].values());row['nextClean']=o;p.locator('#pause').click();p.locator('#burst').click();p.locator('#pause').click();flush()
   assert p.locator('#continue').is_hidden() and p.locator('#start').is_disabled() and p.locator('#level option').count()==3 and '三段行动结束' in p.locator('#message').inner_text();r['finalNoFourthStage']=True
   p.locator('#retry').click();assert record()=={'version':1,'kind':'ready','level':3};p.reload(wait_until='domcontentloaded');p.wait_for_selector('#continue');assert record()=={'version':1,'kind':'ready','level':3};r['finalRetryReady']=record();shot('final-retry-ready.png');p.locator('#continue').click();p.keyboard.down('w');p.wait_for_timeout(180);p.keyboard.up('w');p.locator('#pause').click();o=observe();assert o['game']['level']==3 and o['game']['ticks']>0 and not any(o['game']['controls'].values());r['newAction']=o;flush();r['status']='passed';assert not any(r[k] for k in ['consoleErrors','httpErrors','requestFailures'])
  except Exception as e:
   r['status']='failed';r['error']=repr(e)
   try:r['lastRecord']=record();r['lastObserved']=observe();shot('failure-debug.png')
   except:pass
   raise
  finally:flush();c.close()
 print(json.dumps({'status':r['status']}),flush=True)
if __name__=='__main__':main()
