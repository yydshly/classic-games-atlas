"""Sequential native hint clicks; 1-9 unlock prerequisite, 10-20 finite target."""
import argparse,json,time,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/later-stages-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'kind':'public normal native hint and tile clicks; fresh-profile 1-9 unlock prerequisite then 10-20; no board/save/unlock/time/victory injection, not blind solving','codeBaseline':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'results':[],'transitions':[],'pairs':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate("async()=> (await import(document.querySelector('script[type=module]').src)).diagnostics()")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def write():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
  def stable():
   end=time.monotonic()+12
   while time.monotonic()<end:
    g=diag()
    if g['state'] in ['won','lost'] or g['phase']=='stable':return g
    p.wait_for_timeout(50)
   raise AssertionError('Native transition did not become stable within 12 seconds')
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/games/petal/',wait_until='networkidle',timeout=20000);assert diag()['unlocked']==1;p.locator('#sound').click();p.locator('#primary-action').click();p.locator('#help-confirm').click();overall=time.monotonic();refreshed=False
   for level in range(1,21):
    g=diag();assert g['level']==level and g['state']=='playing' and g['pairs']==g['score']==g['stats']['hints']==0 and g['mistakes']==4 and g['shuffles']==2
    assert g['mode']==('still' if level<9 else 'down' if level<15 else 'left')
    r['transitions'].append({'level':level,'mode':g['mode'],'pairs':g['pairs'],'totalPairs':g['totalPairs'],'mistakes':g['mistakes'],'shuffles':g['shuffles'],'visibleTip':p.locator('#mission-tip').inner_text(),'visibleMode':p.locator('#mode-label').inner_text(),'board':g['board']})
    if level in [10,15,20]:shot('level-'+str(level)+'-normal-entry.png')
    for attempt in range(1,3):
     began=time.monotonic();turns=0
     while time.monotonic()-began<150 and time.monotonic()-overall<1800:
      g=stable()
      if g['state'] in ['won','lost']:break
      assert g['state']=='playing';before=g;p.locator('#hint').click();g=diag()
      if not g['hint']:continue
      pair=g['hint'];assert len(pair)==2
      for index in pair:p.locator('#board [data-index="'+str(index)+'"]').click()
      g=stable();turns+=1;r['pairs'].append({'level':level,'attempt':attempt,'hintPair':pair,'state':g['state'],'pairs':g['pairs'],'score':g['score'],'mistakes':g['mistakes'],'phase':g['phase']})
      if level>=15 and 'leftShiftObservation' not in r:
       old={t['id']:i for i,t in enumerate(before['board']) if t};new={t['id']:i for i,t in enumerate(g['board']) if t};moves=[{'id':k,'from':v,'to':new[k]} for k,v in old.items() if k in new and new[k]<v and new[k]//before['w']==v//before['w']]
       if moves:r['leftShiftObservation']={'level':level,'pair':pair,'rowWidth':before['w'],'before':before['board'],'after':g['board'],'leftMoves':moves};shot('native-left-shift-stable-board.png')
      if level==10 and g['pairs']==1 and g['state']=='playing' and not refreshed:
       p.locator('#pause').click();before=diag();p.reload(wait_until='networkidle');after=diag();assert after['state']=='paused'
       for key in ['level','board','pairs','score','mistakes','shuffles','unlocked','best','stats']:assert after[key]==before[key],key
       r['tenthStableRefresh']={'before':before,'after':after};shot('level-10-stable-refresh-kept.png');p.locator('#primary-action').click();refreshed=True
      if turns>50:raise AssertionError('More than 50 native pairs in one page')
     g=diag();record={'level':level,'attempt':attempt,'outcome':g,'visibleEnding':p.locator('#overlay').inner_text()};r['results'].append(record);write()
     if level>=10 or g['state']!='won':shot('level-'+str(level)+'-attempt-'+str(attempt)+'-'+g['state']+'.png')
     if g['state']=='won':break
     if g['state']=='lost' and attempt==1:p.locator('#primary-action').click();continue
     raise AssertionError('Finite native-hint input limit at page '+str(level)+'; not proof of a game defect')
    assert g['state']=='won' and g['pairs']==g['totalPairs'] and not any(g['board']) and g['unlocked']==min(20,level+1) and g['best'][str(level)]['score']==g['score']
    print(__import__('json').dumps({'level':level,'state':g['state'],'mode':g['mode'],'score':g['score'],'pairs':g['pairs'],'hints':g['stats']['hints'],'manualShuffles':g['stats']['manualShuffles'],'autoShuffles':g['stats']['autoShuffles'],'mistakes':g['mistakes']}),flush=True)
    if level in [10,14,19,20]:
     p.locator('#levels').click();assert p.locator('#level-list [data-level]').count()==20
     if level<20:
      assert not p.locator('[data-level="'+str(level+1)+'"]').is_disabled()
      if level<19:assert p.locator('[data-level="'+str(level+2)+'"]').is_disabled()
     else:assert p.locator('[data-level="21"]').count()==0
     p.locator('#levels-close').click()
    if level<20:p.locator('#primary-action').click()
   g=diag();assert '二十页花笺' in p.locator('#overlay-title').inner_text() and '重读本页' in p.locator('#primary-action').inner_text();r['finalEnding']=p.locator('#overlay').inner_text();r['nativeFinalBest']=g['best'];assert len(g['best'])==20
   p.locator('#primary-action').click();p.locator('#pause').click();g=diag();assert g['level']==20 and g['state']=='paused' and g['pairs']==g['score']==g['stats']['hints']==0 and g['mistakes']==4 and g['shuffles']==2;r['freshFinalReplay']=g;r['replayStatusText']=p.locator('#battle-status').inner_text()
   p.reload(wait_until='networkidle');g=diag();assert g['level']==20 and g['state']=='paused' and g['board']==r['freshFinalReplay']['board'] and g['best']==r['nativeFinalBest'] and g['unlocked']==20;r['finalRefresh']=g;shot('twenty-records-refresh-last-page-clean.png');p.locator('#primary-action').click();p.wait_for_timeout(200);p.locator('#pause').click();g=diag();assert g['state']=='paused' and g['time']>r['finalRefresh']['time'] and g['pairs']==0;r['normalReplayResume']=g
   assert refreshed and not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'];r['status']='passed'
  except Exception as e:r.update(status='failed',error=str(e));r['stoppedSnapshot']=diag();shot('bounded-stop.png');raise
  finally:write();b.close()
 print(json.dumps({'status':r['status'],'completed':len([x for x in r['results'] if x['outcome']['state']=='won']),'laterPages':list(range(10,21)),'leftShiftObserved':'leftShiftObservation' in r}),flush=True)
if __name__=='__main__':main()
