import argparse,json,time,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='atlas-expedition-v2-valley-20261018'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/last-core-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'kind':'public normal buttons/selects; native .25s simulation steps, natural raid loss; read-only checkpoint replay is separate and restore labels active copies paused','progress':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(ROOT/'docs/expedition-loss-qa/inspect_and_reference.mjs'),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def inspect(raw):w.stdin.write(raw+'\n');w.stdin.flush();d=json.loads(w.stdout.readline());assert 'error' not in d,d;return d
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050});p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def raw():return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
  def game():return inspect(raw())
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  def fresh():
   cp=json.loads(raw());g=game();assert cp=={'version':2,'levelIndex':0,'tick':0,'log':[]};assert g['status']=='ready' and g['stock']=={'food':32,'wood':36} and g['base']['hp']==160 and len(g['workers'])==4 and all(x['alive'] and x['task']=='idle' and x['carry']=={'food':0,'wood':0} for x in g['workers']) and len(g['guards'])==2 and all(x['front']=='reserve' and x['hp']==32 for x in g['guards']) and g['construction']==g['queue']==[] and all(v==0 for v in g['buildings'].values()) and all(not x['resolved'] for x in g['raids']);assert [x.inner_text() for x in p.locator('#hud strong').all()]==['32','36','160 / 160','120 秒'];return g
  try:
   p.goto('https://yydshly.github.io/classic-games-atlas/versions/v2/games/expedition/',wait_until='networkidle',timeout=20000);p.locator('#resume').click();p.locator('#actions button').nth(0).click()
   for worker,resource in [(2,'food'),(3,'wood'),(4,'food')]:p.get_by_label('工人 '+str(worker)+' 分工',exact=True).select_option(value=resource)
   t=time.monotonic();tower=False;guard=False;mark=-20
   while time.monotonic()-t<165:
    p.wait_for_timeout(200);g=game()
    if g['time']>=mark+20:mark=g['time'];row={'time':g['time'],'hp':g['base']['hp'],'stock':g['stock'],'aliveWorkers':sum(x['alive'] for x in g['workers']),'uiPauseLayerHidden':not p.locator('#pause-layer').is_visible()};r['progress'].append(row);(out/'progress.json').write_text(json.dumps(row,indent=2),encoding='utf-8');print(json.dumps(row),flush=True)
    if g['status']=='lost':break
    if g['time']>=115 and not tower:p.locator('#actions button').nth(2).click(timeout=1000);tower=True;shot('late-construction-running.png')
    if g['time']>=118 and not guard:p.locator('#actions button').nth(4).click(timeout=1000);guard=True
   assert g['status']=='lost' and g['result']=='营地失守' and g['base']['hp']==0 and tower and guard and g['construction'] and g['queue'];r['naturalLoss']={'raw':raw(),'offlineReplay':g,'visibleResult':p.locator('#result').inner_text()};shot('natural-camp-loss-pending-work.png');before=raw();p.reload(wait_until='networkidle');assert raw()==before and game()==g and p.locator('#result').is_visible();r['terminalRefreshKept']=True;shot('loss-refresh-kept.png');p.get_by_role('button',name='重试本段',exact=True).click();r['directRetry']=fresh();p.reload(wait_until='networkidle');r['directRetryRefresh']=fresh();shot('direct-retry-ready-full-reset.png')
   p.locator('#resume').click();p.locator('#actions button').nth(0).click();p.locator('#restart').click();assert p.locator('#modal').is_visible();pausedRaw=raw();paused=game();assert paused['stock']=={'food':24,'wood':14} and paused['construction'];p.locator('#modal-cancel').click();assert raw()==pausedRaw and game()==paused;r['cancelRestartKept']=True;p.locator('#restart').click();p.locator('#modal-confirm').click();r['confirmedRestart']=fresh();shot('confirmed-restart-clean-ready.png');p.locator('#resume').click();p.wait_for_timeout(5500);p.locator('#pause').click();after=game();assert 5<=after['time']<8 and after['status']=='paused' and after['stock']=={'food':32,'wood':36} and after['construction']==after['queue']==[] and len(after['guards'])==2 and len(after['workers'])==4;r['normalActionAfterRestart']=after;shot('new-action-no-old-queue.png');r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:r['lastRaw']=raw();shot('failure-debug.png')
   except:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
   try:w.stdin.close();w.wait(timeout=5)
   except:w.terminate()
 print(json.dumps({'status':r['status'],'lossTime':g['time'],'terminalQueue':g['queue'],'terminalConstruction':g['construction'],'terminalRefreshKept':True,'directRetryReset':True,'cancelKept':True,'confirmedRestartReset':True,'noOldQueueAfter5Seconds':True},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
