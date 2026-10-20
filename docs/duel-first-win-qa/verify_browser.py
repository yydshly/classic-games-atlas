"""One ordinary first-court win; DOM-guided keys only. No save/health/clock/engine writes."""
import argparse,asyncio,datetime,hashlib,json,re,subprocess,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
KEY='classic-atlas.duel.v2'
async def main(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True)
 r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':a.url,'baseline':'84a625cfb5f0bbffed853a9d98745b6362336731','method':'One ordinary-resource public UI fight. Strategy observes only visible DOM distance, phases and energy. All combat input is keyboard events; read-only existing __duel.snapshot is captured for audit only. No injected saves, unlocks, health, time, engine calls, live state changes or artificial speed. Known-rule guided automation, not blind human play.','files':[],'actions':[],'observations':[],'captures':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 def save():(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 async def snapshot(p):return await p.evaluate('window.__duel.snapshot()')
 async def raw(p):return await p.evaluate('localStorage.getItem("classic-atlas.duel.v2")')
 async def dom(p):return await p.evaluate('''()=>({state:document.body.dataset.state,distance:Number(document.getElementById('distance').textContent),enemyHP:document.getElementById('enemy-health').value,playerHP:document.getElementById('player-health').value,energy:Number(document.getElementById('player-energy').textContent.match(/\d+/)[0]),player:document.getElementById('player-status').textContent,enemy:document.getElementById('enemy-status').textContent,timer:document.getElementById('timer').textContent,message:document.getElementById('message').textContent})''')
 async def capture(p,label):
  before=await snapshot(p);d=await dom(p);await p.screenshot(path=str(out/(label+'.png')),full_page=True)
  r['captures'].append({'label':label,'dom':d,'before':before,'after':await snapshot(p)});save();return before
 async def assert_fresh(s,level):
  assert s['level']==level and s['state']=='ready' and s['ticks']==0
  assert s['player']['hp']==100 and s['enemy']['hp']==(80 if level==1 else 85)
  assert s['player']['energy']==100 and s['enemy']['energy']==100
  assert s['player']['x']==270 and s['enemy']['x']==630
  assert s['player']['action'] is None and s['enemy']['action'] is None
  assert s['player']['cooldown']==0 and s['player']['move']==0 and not s['player']['guard']
  assert s['log']==[] and s['swings']==[] and s['events']==[] and s['stats']['attacks']==0 and s['stats']['hits']==0
  assert s['held']==[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();p=await b.new_page(viewport={'width':1440,'height':1050});r['browser']=b.version
  p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)))
  p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None)
  p.on('response',lambda q:r['httpErrors'].append({'url':q.url,'status':q.status}) if q.status>=400 else None)
  p.on('requestfailed',lambda q:r['requestFailures'].append({'url':q.url,'failure':q.failure}))
  held=set()
  async def key(code,on):
   if on and code not in held:await p.keyboard.down(code);held.add(code);r['actions'].append({'key':code,'event':'down','wall':time.monotonic()-began})
   if not on and code in held:await p.keyboard.up(code);held.remove(code);r['actions'].append({'key':code,'event':'up','wall':time.monotonic()-began})
  try:
   files=subprocess.check_output(['git','ls-tree','-r','--name-only','HEAD','--','versions/v2/games/duel'],cwd=ROOT,text=True).splitlines()
   base=a.url.rstrip('/')+'/'
   for path in files:
    expected=subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT);q=await p.request.get(base+path.split('versions/v2/games/duel/',1)[1]+'?verify=duel-first-84a625c',timeout=15000);data=await q.body();assert q.status==200 and data==expected,path
    r['files'].append({'path':path,'status':q.status,'sha256':hashlib.sha256(data).hexdigest(),'matchesBaseline':True})
   await p.goto(a.url,wait_until='networkidle',timeout=20000)
   assert await raw(p) is None,'context must begin without progress'
   await p.locator('#help-confirm').click();initial=await capture(p,'first-ready');await assert_fresh(initial,1);assert initial['unlocked']==1 and initial['best']=={}
   r['initial']=initial;await p.locator('#start').click();began=time.monotonic();last_signature=None;first_hit=False
   while True:
    d=await dom(p)
    if d['state'] in ['won','lost']:break
    assert d['state']=='playing',('unexpected pause/dialog; not a game impossibility',d)
    assert time.monotonic()-began<100,'bounded one-fight observation exceeded wall allowance'
    signature=(d['enemyHP'],d['playerHP'],d['player'],d['enemy'],round(d['distance']/8))
    if signature!=last_signature:
     r['observations'].append({'wall':time.monotonic()-began,**d});last_signature=signature
    if d['enemyHP']<80 and not first_hit:
     assert '命中' in d['message'] or '命中' in await p.locator('#run-status').inner_text()
     await capture(p,'first-visible-hit');first_hit=True;print('Visible enemy HP reduction captured',flush=True)
    busy=bool(re.search('前摇|出招|收招|受击硬直|闪避|腾空',d['player']))
    threat=bool(re.search('前摇|出招',d['enemy'])) and d['distance']<=168
    recovery='收招' in d['enemy']
    if busy:
     await key('KeyD',False);await key('KeyK',False)
    elif threat:
     await key('KeyD',False);await key('KeyK',True)
    else:
     await key('KeyK',False)
     if recovery and d['distance']<=146 and d['energy']>=20:
      await key('KeyD',False);await p.keyboard.press('KeyU');r['actions'].append({'key':'KeyU','event':'press','wall':time.monotonic()-began,'visible':d})
     else:await key('KeyD',d['distance']>123)
    await p.wait_for_timeout(20)
   for code in list(held):await key(code,False)
   terminal=await capture(p,'first-result');r['terminal']=terminal;r['fightWallSeconds']=time.monotonic()-began;save()
   assert terminal['state']=='won',('ordinary attempt ended without a win; not automatically a bug',terminal['state'],terminal['player']['hp'],terminal['enemy']['hp'])
   assert first_hit and terminal['stats']['hits']>0 and terminal['enemy']['hp']==0 and terminal['player']['hp']>0
   original=await raw(p);progress=json.loads(original);assert progress['unlocked']==2 and progress['resume'] is None
   best=progress['best']['1'];assert best['score']==terminal['score'] and best['time']==terminal['ticks']/120
   r['winningProgress']=progress;print(json.dumps({'won':True,'hp':terminal['player']['hp'],'score':terminal['score'],'seconds':best['time'],'hits':terminal['stats']['hits'],'unlocked':progress['unlocked']}),flush=True)
   await p.reload(wait_until='networkidle',timeout=20000);refreshed=await capture(p,'first-best-refreshed');await assert_fresh(refreshed,1)
   assert refreshed['best']['1']==best and refreshed['unlocked']==2
   await p.locator('#levels').click();buttons=p.locator('#level-list button')
   assert not await buttons.nth(0).is_disabled() and not await buttons.nth(1).is_disabled() and await buttons.nth(2).is_disabled()
   r['unlockDialog']={'firstEnabled':True,'secondEnabled':True,'thirdLocked':True,'labels':await buttons.all_text_contents()}
   await p.screenshot(path=str(out/'unlocked-second-third-locked.png'),full_page=True);await p.locator('#levels-close').click()
   # A brief partial rematch spends energy and leaves an attack/physical held key, then normal reset clears it.
   await p.locator('#start').click();await p.keyboard.down('KeyD');await p.wait_for_timeout(250);await p.keyboard.press('KeyU');await p.wait_for_timeout(40)
   used=await capture(p,'rematch-before-reset');assert used['stats']['attacks']==1 and used['player']['energy']<100 and used['ticks']>0
   await p.locator('#reset').click();reset=await capture(p,'rematch-reset');await assert_fresh(reset,1)
   assert reset['best']['1']==best and reset['unlocked']==2
   await p.keyboard.up('KeyD');await p.locator('#levels').click();await p.locator('#level-list button').nth(1).click()
   second=await capture(p,'second-ready');await assert_fresh(second,2);assert second['blocked']==[] and second['best']['1']==best and second['unlocked']==2
   await p.locator('#start').click();await p.wait_for_timeout(350);started=await snapshot(p)
   assert started['level']==2 and started['state']=='playing' and 0<started['ticks']<120
   assert started['player']['x']==270 and started['player']['move']==0 and started['player']['action'] is None and started['player']['cooldown']==0
   assert started['stats']['attacks']==0 and started['log']==[] and started['held']==[] and started['blocked']==[]
   await capture(p,'second-running-no-old-input');await p.locator('#pause').click()
   r['rematch']={'before':used,'afterReset':reset,'recordAndUnlockRetained':True};r['secondEntry']={'ready':second,'started':started,'noOldAttackKeysOrClock':True};r['bestRefresh']=refreshed
   assert not r['consoleErrors'] and not r['httpErrors'];r['passed']=True;save()
  except Exception as e:r['error']=type(e).__name__+': '+str(e);save();raise
  finally:await b.close()
 print(json.dumps({'passed':True,'normalWin':True,'unlockAndRefresh':True,'rematchReset':True,'secondEntryClean':True,'requestFailures':r['requestFailures']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/versions/v2/games/duel/');p.add_argument('--out',default='.local/duel-first-win/public');asyncio.run(main(p.parse_args()))
