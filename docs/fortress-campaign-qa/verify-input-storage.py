from pathlib import Path
import os,json,uuid,ast,base64
from playwright.sync_api import sync_playwright
R=Path('.local/fortress-campaign-round');O=R/'input-storage';O.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
tree=ast.parse(Path('docs/featured-touch-qa/verify_browser.py').read_text(encoding='utf-8'))
touch=next(n for n in tree.body if isinstance(n,ast.ClassDef)and n.name=='Touch')
scope={};exec(compile(ast.Module(body=[touch],type_ignores=[]),'existing-touch-helper','exec'),scope);Touch=scope['Touch']
logger=next(ast.literal_eval(n.value)for n in tree.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='LOGGER'for t in n.targets))
base='http://127.0.0.1:58251/versions/v3/games/fortress/';KEY='classic-atlas.fortress.campaign.v3'
report={'method':'Ordinary short keyboard/touch checks; quota override and corrupt record are explicit isolated storage-fault fixtures, not a natural game journey. No terminal/completed state injected.','cases':[],'errors':[],'httpErrors':[]}
with sync_playwright()as pw:
 def context(label,width=390,touch=False):
  c=pw.chromium.launch_persistent_context(str((R/('profile-'+label+'-'+uuid.uuid4().hex[:6])).resolve()),viewport={'width':width,'height':1000 if width==1440 else 844},has_touch=touch,is_mobile=touch)
  p=c.pages[0];p.on('pageerror',lambda e:report['errors'].append(str(e)));p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None)
  return c,p
 def ready(p):
  p.goto(base,wait_until='domcontentloaded');p.wait_for_function('window.__fortressCampaign')
 def diag(p):return p.evaluate('window.__fortressCampaign.snapshot()')
 def raw(p):return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
 def shot(c,p,name):
  (O/(name+'.png')).write_bytes(base64.b64decode(c.new_cdp_session(p).send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
  assert not p.evaluate('document.documentElement.scrollWidth>innerWidth')
 c,p=context('two-player',1440);ready(p);p.locator('#mode').select_option('2');p.locator('#primary').focus();p.keyboard.press('Enter')
 before=diag(p);assert before['battle']['mode']==2 and before['battle']['shots']==0
 for k in ['w','j','ArrowUp','Enter']:p.keyboard.down(k)
 p.wait_for_timeout(170);during=diag(p)
 for k in ['w','j','ArrowUp','Enter']:p.keyboard.up(k)
 assert all(during['battle']['players'][i]['y']<before['battle']['players'][i]['y']for i in [0,1])
 assert all(n>0 for n in during['inputTicks']);assert {b['owner']for b in during['battle']['bullets']}>= {'player-1','player-2'}
 p.keyboard.press('p');frozen=diag(p);p.wait_for_timeout(100);assert diag(p)['battle']==frozen['battle'];shot(c,p,'two-player-paused-1440')
 p.locator('#pause').focus();p.keyboard.press('p');assert diag(p)['battle']['state']=='playing'
 p.locator('#lobby').focus();p.keyboard.press('Enter');p.wait_for_function('document.querySelector("#selected-play")')
 report['cases'].append({'kind':'ordinaryKeyboardTwoPlayer','mode':2,'independentMovementAndFire':True,'inputTicks':during['inputTicks'],'pauseAndNativeReturn':True,'notHumanCooperation':True});c.close()
 c,p=context('touch',touch=True);p.add_init_script(logger);d=c.new_cdp_session(p);d.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});ready(p);t=Touch(p,d);shot(c,p,'ready-390')
 t.tap('#primary');a=t.point('[data-key="KeyW"]');b=t.point('[data-key="KeyJ"]');start=diag(p)['battle'];t.down(1,*a);t.down(2,*b);p.wait_for_timeout(350);moving=diag(p)['battle'];assert moving['player']['y']<start['player']['y']and moving['shots']>start['shots']
 t.up(1);a=diag(p)['battle'];p.wait_for_timeout(420);assert abs(diag(p)['battle']['player']['y']-a['player']['y'])<.1 and diag(p)['battle']['shots']>a['shots'];t.up(2)
 b=t.point('[data-key="KeyJ"]');t.down(1,b[0]-11,b[1]);t.down(2,b[0]+11,b[1]);t.up(2);shots=diag(p)['battle']['shots'];p.wait_for_timeout(420);assert diag(p)['battle']['shots']>shots;t.up(1)
 a=t.point('[data-key="KeyW"]');b=t.point('[data-key="KeyJ"]');t.down(1,*a);t.down(2,*b);t.cancel();stopped=diag(p)['battle'];p.wait_for_timeout(200);after=diag(p)['battle'];assert all(abs(after['player'][k]-stopped['player'][k])<.1 for k in ['x','y'])and after['shots']==stopped['shots']
 t.tap('#pause');frozen=diag(p);p.wait_for_timeout(120);assert diag(p)['battle']==frozen['battle'];shot(c,p,'touch-paused-390');t.tap('#primary');assert diag(p)['battle']['state']=='playing'
 events=p.evaluate('window.__touchEvents');assert all(e['ptr']=='touch'and e['trusted']for e in events if e['type']=='pointerdown');assert any(e['type']=='pointercancel'for e in events)
 t.tap('#lobby');p.wait_for_function('document.querySelector("#selected-play")');report['cases'].append({'kind':'ordinaryNativeTouchSimulation','viewport':[390,844],'moveFirePartialRelease':True,'sameFireTwoContacts':True,'cancelClears':True,'pauseResumeReturn':True,'events':events,'notHardware':True});c.close()
 c,p=context('quota');ready(p);saved=raw(p)
 p.evaluate("(k)=>{window.__storageFaultEnabled=true;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,v){if(window.__storageFaultEnabled&&key===k)throw new DOMException('test fixture','QuotaExceededError');return original.call(this,key,v);};}",KEY)
 p.locator('#primary').click();assert diag(p)['storage']['reason']=='write'and raw(p)==saved
 b=p.locator('#save-note').bounding_box();assert b['y']>=0 and b['y']+b['height']<=844;assert p.locator('#save-note').get_attribute('data-warning')=='true'
 p.locator('#pause').click();p.locator('#retry').click();assert raw(p)==saved;shot(c,p,'quota-warning-390')
 p.evaluate('window.__storageFaultEnabled=false');p.locator('#primary').click();assert diag(p)['storage']['reason']==''and p.locator('#save-note').get_attribute('data-warning')=='false';assert json.loads(raw(p))['phase']=='battle'
 report['cases'].append({'kind':'isolatedQuotaFaultFixture','priorValidBytesPreserved':True,'warningVisible390':True,'laterOrdinarySaveClearsFailure':True});c.close()
 c,p=context('corrupt');bad='{broken-stage-keep-original'
 p.add_init_script("try{if(localStorage.getItem("+json.dumps(KEY)+")===null)localStorage.setItem("+json.dumps(KEY)+","+json.dumps(bad)+");}catch{}")
 ready(p);assert diag(p)['storage']['blocked']and diag(p)['storage']['reason']=='corrupt';assert raw(p)==bad
 b=p.locator('#save-note').bounding_box();assert b['y']>=0 and b['y']+b['height']<=844;shot(c,p,'corrupt-warning-390')
 p.locator('#primary').click();assert diag(p)['battle']['state']=='playing'and raw(p)==bad
 p.locator('#new-campaign').click();p.locator('#restart-confirm').click();assert diag(p)['journey']['phase']=='briefing'and raw(p)==bad
 report['cases'].append({'kind':'isolatedCorruptSaveFixture','originalBytesPreserved':True,'temporaryPlayAndConfirmedRestartDoNotOverwrite':True,'warningVisible390':True});c.close()
assert not report['errors']and not report['httpErrors'];report['passed']=True
with(O/'report.json').open('w',encoding='utf-8')as f:json.dump(report,f,ensure_ascii=False,indent=2)
print(json.dumps({'passed':True,'cases':len(report['cases']),'ordinaryInputGroups':2,'explicitStorageFaultGroups':2}),flush=True)
