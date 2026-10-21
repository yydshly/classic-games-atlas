import argparse,json,os,time,subprocess,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();DIR=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--game',choices=['lantern','cloud'],required=True);ap.add_argument('--out',required=True);a=ap.parse_args();g=a.game;out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/finite-gap-round/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'game':g,'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':f'https://yydshly.github.io/classic-games-atlas/versions/v2/games/{g}/','method':'Normal free level select to map2. Read-only copied diagnostics guide a separate policy; real queued arrow presses for lantern / real canvas mouse moves and K shield for cloud. No live engine or hidden state/time/save/result mutation. Offline strategy is not UI evidence.','decisions':[],'progress':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 w=subprocess.Popen(['node',str(Path(__file__).with_name(g+'_policy.mjs')),'--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def choose(d):w.stdin.write(json.dumps(d,separators=(',',':'))+'\n');w.stdin.flush();v=json.loads(w.stdout.readline());assert 'error'not in v,v;return v
 def flush():(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
 with sync_playwright()as pw:
  c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status})if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def snap():return p.evaluate("async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.diagnostics()}")
  def shot(n):p.screenshot(path=str(out/n),full_page=True)
  try:
   p.goto(r['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#levels').click();p.locator('[data-level="2"]').click();s=snap();assert s['level']==2 and s['state']=='ready';r['start']=s
   if s['sound']:p.locator('#sound').click()
   p.locator('#primary-action').click()
   if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
   if g=='cloud':p.locator('#battlefield').scroll_into_view_if_needed();box=p.locator('#battlefield').bounding_box()
   began=time.monotonic();mark=-5;captured=False
   while time.monotonic()-began<160:
    deadline=time.monotonic()+.05;d=snap()
    if d['state']in['won','lost','expired']:break
    assert d['state']=='playing';v=choose(d)
    if g=='lantern':
     if v['dir']is not None:p.keyboard.press(DIR[v['dir']])
    else:
     x=v['target']['x'];y=v['target']['y'];p.mouse.move(box['x']+x/600*box['width'],box['y']+y/760*box['height'])
     if v['shieldPressed']:p.keyboard.press('k')
    r['decisions'].append({'time':d['time'],'player':d['player'],'input':v})
    if d['time']>=mark+5:mark=d['time'];row={'time':d['time'],'lives':d.get('lives'),'remaining':d.get('remaining'),'hp':d['player'].get('hp'),'stats':d['stats']};r['progress'].append(row);flush();print(json.dumps(row),flush=True)
    if d['time']>7 and not captured:shot('normal-second-map-running.png');captured=True
    p.wait_for_timeout(max(1,(deadline-time.monotonic())*1000))
   p.wait_for_timeout(150);d=snap();r['outcome']=d;r['wallSeconds']=time.monotonic()-began;shot('natural-second-map-result.png');flush();assert d['state']=='won','bounded natural attempt ended '+d['state'];assert '2'in d['best'];record=d['best'];r['visible']=p.locator('#overlay').inner_text();p.reload(wait_until='domcontentloaded');p.locator('#primary-action').wait_for();n=snap();assert n['state']=='ready'and n['level']==2 and n['time']==0 and n['best']==record;r['refreshRecordKept']=n;p.locator('#primary-action').click();p.locator('#pause').click();n=snap();assert n['state']=='paused'and n['level']==2 and n['time']<.25 and n['best']==record and n['heldKeys']==0
   if g=='lantern':assert n['lives']==3 and n['stats']['collected']<=1 and n['remaining']==46-n['stats']['collected']
   else:assert n['player']['hp']==3 and n['player']['charges']==2 and n['spawnIndex']==0 and not n['enemies']and not n['bullets']and n['stats']['score']==0
   r['retryClean']=n;shot('same-map-clean-paused.png');p.locator('#levels').click();assert p.locator('[data-level]').count()==2;r['onlyTwoMaps']=True;shot('second-map-earned-record.png');r['status']='passed';assert not any(r[k]for k in['consoleErrors','httpErrors','requestFailures'])
  except Exception as e:
   r['status']='failed';r['error']=repr(e)
   try:r['lastSnapshot']=snap();shot('failure-debug.png')
   except:pass
   raise
  finally:
   flush();c.close()
   try:w.stdin.close();w.wait(timeout=5)
   except:w.terminate()
 print(json.dumps({'game':g,'status':r['status'],'time':d['time'],'stats':d['stats']},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
