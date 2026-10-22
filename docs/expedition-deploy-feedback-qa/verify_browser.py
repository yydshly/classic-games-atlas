from pathlib import Path
import os,json,argparse,base64,datetime,re
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--before',action='store_true');ap.add_argument('--online',action='store_true');args=ap.parse_args();mode='before'if args.before else'online'if args.online else'local'
R=Path('.local/expedition-deploy-round');(R/'tmp').mkdir(exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());O=R/mode;O.mkdir(exist_ok=True);profile=R/('profile-'+mode);base='https://yydshly.github.io/classic-games-atlas/'if args.before or args.online else'http://127.0.0.1:58251/'
report={'mode':mode,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base+'versions/v2/games/expedition/','method':'Fresh isolated persistent browser profile, visible ordinary controls, Enter and real natural waiting. Only read DOM and native checkpoint; no state/time/save injection.','actions':[],'cases':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
def flush():(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str(profile.resolve()),viewport={'width':1440,'height':1000});p=c.pages[0];cdp=c.new_cdp_session(p)
 p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('console',lambda m:report['consoleErrors'].append(m.text)if m.type=='error'else None);p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}))
 def raw():return p.evaluate('localStorage.getItem("atlas-expedition-v2-valley-20261018")')
 def cp():return json.loads(raw())if raw()else None
 def button(front):return p.locator('#deployment button').filter(has_text='调 1 盾卫至'+{'north':'北口','south':'南口','reserve':'营地'}[front])
 def snap(label):
  return {'label':label,'checkpoint':cp(),'army':p.locator('#army').inner_text(),'deployment':p.locator('#deployment').inner_text(),'fronts':p.locator('#north-front').inner_text()+' / '+p.locator('#south-front').inner_text(),'hud':p.locator('#hud').inner_text()}
 def shot(label):
  p.locator('#defense-panel').scroll_into_view_if_needed();p.wait_for_timeout(80);(O/(label+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']));assert not p.evaluate('document.documentElement.scrollWidth>innerWidth');report['cases'].append(snap(label));flush()
 def act(front):
  old=cp();b=button(front);assert b.count()==1 and b.is_enabled();b.focus();b.press('Enter');p.wait_for_function('(n)=>JSON.parse(localStorage.getItem("atlas-expedition-v2-valley-20261018")).log.length===n',arg=len(old['log'])+1,timeout=4000);report['actions'].append({'front':front,'before':old,'after':cp(),'army':p.locator('#army').inner_text()});flush()
 def wait_counts(reserve,north,south):
  p.wait_for_function('(n)=>{let s=document.querySelector("#army").innerText;return s.includes("营地："+n[0]+" 盾卫")&&s.includes("北口："+n[1]+" 盾卫")&&s.includes("南口："+n[2]+" 盾卫")&&s.includes("行军中 0 人")}',arg=[reserve,north,south],timeout=12000)
 try:
  p.goto(report['url'],wait_until='domcontentloaded',timeout=25000);assert p.locator('#resume').inner_text()=='开始本段挑战';p.locator('#resume').click();p.locator('#tab-defense').click();wait_counts(2,0,0)
  shot('01-reserve-enough');act('north');act('north');assert all(not x.is_enabled()for x in p.locator('#deployment button').all());shot('02-all-marching-no-source');wait_counts(0,2,0)
  for width in [1440,390]:
   p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});shot('03-cross-source-'+str(width))
  if args.before:
   assert button('south').inner_text()=='调 1 盾卫至南口';assert '北口'in p.locator('#army').inner_text()
  else:
   assert '从北口调1卫'in button('south').inner_text();assert '北口：2→1卫'in button('south').inner_text();assert '7秒'in button('south').inner_text()
  act('south');assert '北口：1 盾卫'in p.locator('#army').inner_text();shot('04-source-reduced');wait_counts(0,1,1)
  shot('05-equal-lines-before');
  if not args.before:assert '从南口调1卫'in button('north').inner_text()and '南口：1→0卫'in button('north').inner_text()
  act('north');shot('06-last-guard-leaves');wait_counts(0,2,0)
  if not args.before:
   act('reserve');wait_counts(1,1,0);assert '从营地调1卫'in button('south').inner_text();assert '营地：1→0卫'in button('south').inner_text();act('south');assert '北口：1 盾卫'in p.locator('#army').inner_text();wait_counts(0,1,1);shot('07-reserve-priority')
   p.keyboard.press('p');assert p.locator('#pause').inner_text()=='继续';old=raw();army=p.locator('#army').inner_text();preview=p.locator('#deployment').inner_text();p.reload(wait_until='domcontentloaded');assert p.locator('#pause').inner_text()=='继续';p.locator('#tab-defense').click();assert raw()==old and p.locator('#army').inner_text()==army and p.locator('#deployment').inner_text()==preview;report['refreshExact']=True;report['pausedButtonsDisabled']=all(not x.is_enabled()for x in p.locator('#deployment button').all());assert report['pausedButtonsDisabled'];p.locator('#resume').click()
   for width in [1440,390]:
    p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});button('north').focus();assert button('north').evaluate('(e)=>e===document.activeElement');shot('08-focused-'+str(width))
  p.keyboard.press('p');report['final']=snap('paused-final');assert p.locator('#result').is_hidden();assert not any(report[k]for k in ['errors','consoleErrors','httpErrors','requestFailures']);report['passed']=True;flush();print(json.dumps({'mode':mode,'passed':True,'deploys':len(report['actions']),'tick':cp()['tick'],'cases':len(report['cases'])}),flush=True)
 except Exception as error:report['failure']=repr(error);flush();raise
 finally:c.close();flush()
