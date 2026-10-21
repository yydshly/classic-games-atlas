"""Normal mouse input, copied geometry; natural sequential campaign, no runtime mutation."""
import argparse,json,os,time,math,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.prism.v2.viewport.20261018'
def aim(g):
 pw=g['paddleWidth'];balls=[b for b in g['balls'] if b['alive'] and not b['attached']];down=sorted([b for b in balls if b['dy']>0 and b['y']<=636],key=lambda b:(636-b['y'])/b['dy']);ball=(down or balls or [None])[0]
 if not ball:return 300
 x=ball['x']
 if ball['dy']>0:
  x+=ball['dx']*(636-ball['y'])/ball['dy'];n=(x-31)%1076;x=31+(n if n<=538 else 1076-n)
 if g['level']==1:
  targets=sorted([q for q in g['bricks'] if not q['steel'] and q['hp']>0],key=lambda q:(-q['y'],abs(q['x']+23-x)));angle=math.atan2(targets[0]['x']+23-x,636-targets[0]['y']-22) if targets else .3;offset=max(-.78,min(.78,angle/1.08))*pw/2
 else:offset=[-.7,.4,-.25,.7,-.45,.18][g['stats']['paddleHits']%6]*pw/2
 return max(24+pw/2,min(576-pw/2,x-offset))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/later-stages-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'kind':'public normal mouse/launch/next controls with copied geometry and alternating reflection offsets; first stage is necessary fresh-profile unlock prerequisite; strong input assistance, not human timing acceptance','codeBaseline':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'results':[],'transitions':[],'observations':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate("async()=> (await import(document.querySelector('script[type=module]').src)).diagnostics()")
  def saved():return json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def checkpoint(): (out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/prism/',wait_until='networkidle',timeout=20000);g=diag();assert g['level']==1 and g['unlocked']==1;p.locator('#sound').click();p.locator('#primary-action').click();p.locator('#help-confirm').click();overall=time.monotonic();multi=False
   for level in range(1,13):
    g=diag();assert g['level']==level and g['state']=='playing' and g['stats']['score']==g['stats']['destroyed']==0 and g['lives']==3 and g['serving'];entry={'level':level,'state':g['state'],'remaining':g['remaining'],'initial':g['initial'],'lives':g['lives'],'score':g['stats']['score'],'attachedBalls':len([x for x in g['balls'] if x['attached']]),'visibleTip':p.locator('#mission-tip').inner_text()};r['transitions'].append(entry);assert entry['attachedBalls']==1
    for attempt in range(1,3):
     began=time.monotonic();inputs=0;mark=-15
     while time.monotonic()-began<360 and time.monotonic()-overall<2700:
      g=diag()
      if g['state'] in ['won','lost']:break
      assert g['state']=='playing',g['state']
      if g['serving']:p.locator('#launch').click()
      else:
       x=aim(g);rect=p.locator('#battlefield').bounding_box();p.mouse.move(rect['x']+x/600*rect['width'],rect['y']+.90*rect['height']);inputs+=1
      if g['time']>=mark+15:
       mark=g['time'];row={'level':level,'attempt':attempt,'time':g['time'],'remaining':g['remaining'],'lives':g['lives'],'balls':len(g['balls']),'stats':g['stats']};r['observations'].append(row);checkpoint();print(json.dumps(row),flush=True)
      if len(g['balls'])>1 and not multi:multi=True;shot('native-multiball-during-campaign.png')
      p.wait_for_timeout(25)
     g=diag();record={'level':level,'attempt':attempt,'wallSeconds':time.monotonic()-began,'inputs':inputs,'outcome':g,'visibleEnding':p.locator('#overlay').inner_text(),'save':saved()};r['results'].append(record);shot('level-'+str(level)+'-attempt-'+str(attempt)+'-'+g['state']+'.png');checkpoint()
     if g['state']=='won':break
     if g['state']=='lost' and attempt==1:p.locator('#primary-action').click();continue
     raise AssertionError('Finite input limit reached at level '+str(level)+'; not proof of a game defect')
    assert g['state']=='won' and g['remaining']==0 and g['stats']['destroyed']==g['initial']
    data=saved();assert data['unlocked']==min(12,level+1) and data['best'][str(level)]['score']==g['stats']['score'] and data['best'][str(level)]['stars']==g['lives']
    if level in [2,6,11,12]:
     p.locator('#levels').click();assert p.locator('#level-list [data-level]').count()==12
     if level<12:
      assert not p.locator('[data-level="'+str(level+1)+'"]').is_disabled()
      if level<11:assert p.locator('[data-level="'+str(level+2)+'"]').is_disabled()
     else:assert p.locator('[data-level="13"]').count()==0
     p.locator('#levels-close').click()
    if level<12:p.locator('#primary-action').click()
   assert '光轨已归途' in p.locator('#overlay-title').inner_text() and '十二座原创砖阵已完成' in p.locator('#overlay-copy').inner_text() and '再挑战本关' in p.locator('#primary-action').inner_text();r['finalEnding']=p.locator('#overlay').inner_text();r['nativeFinalSave']=saved();assert len(r['nativeFinalSave']['best'])==12
   p.locator('#primary-action').click();p.locator('#pause').click();g=diag();assert g['level']==12 and g['state']=='paused' and g['lives']==3 and g['stats']['score']==g['stats']['destroyed']==0 and g['serving'] and len(g['balls'])==1;r['cleanFinalRetry']=g
   p.reload(wait_until='networkidle');g=diag();assert g['level']==12 and g['state']=='ready' and g['unlocked']==12 and g['lives']==3 and g['stats']['score']==0 and saved()['best']==r['nativeFinalSave']['best'];r['finalRefresh']=g;shot('final-records-refresh-last-stage-ready.png');assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'];r['status']='passed'
  except Exception as e:r.update(status='failed',error=str(e));r['stoppedSnapshot']=diag();shot('bounded-stop.png');raise
  finally:checkpoint();b.close()
 print(json.dumps({'status':r['status'],'wins':[{'level':x['level'],'time':x['outcome']['time'],'lives':x['outcome']['lives'],'score':x['outcome']['stats']['score']} for x in r['results'] if x['outcome']['state']=='won']}),flush=True)
if __name__=='__main__':main()
