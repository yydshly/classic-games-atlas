"""Real normal-speed keyboard/touch input; snapshots are read-only diagnostics."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.courier.v1';KEYS={'left':'ArrowLeft','right':'ArrowRight','jump':'ArrowUp','slide':'ArrowDown'}
FIELDS=['level','ticks','distance','x','lane','action','actionTick','hp','cargo','score','hitRows','resolved','collected','log','stats']
async def snap(p):
 await p.wait_for_function('window.__courier?.snapshot')
 return await p.evaluate('window.__courier.snapshot()')
def decide(s):
 if s['state']!='playing':return
 r=next((r for r in s['upcoming'] if r['eta']>-.03 and r['id'] not in s['resolved']),None)
 if not r or r['eta']>.68:return
 lane=min([p['lane'] for p in r['parcels']],key=lambda n:abs(n-s['lane']))
 if lane!=s['lane']:return 'right' if s['lane']<lane else 'left'
 if .08<r['eta']<=.34 and not s['action'] and r['kind'] in ['jump','slide']:return r['kind']
def invariant(s):
 assert 0<=s['lane']<=2 and 0<=s['x']<=2 and 0<=s['hp']<=3 and len(s['collected'])==len(set(s['collected']))==s['cargo']
 assert s['hp']==3-s['stats']['hits'] and s['stats']['hits']==len(s['hitRows']) and s['stats']['settlements']<=1
async def touch_button(p,selector):
 el=p.locator(selector);await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
async def begin(p,touch=False):
 if await p.locator('#help-dialog').is_visible():
  if touch:await touch_button(p,'#help-confirm')
  else:await p.locator('#help-confirm').click()
 if touch:await touch_button(p,'#start')
 else:await p.locator('#start').click();await p.locator('#road').focus()
async def complete(p,touch=False,stop=None,timeout=35):
 wall=time.monotonic();actions=[]
 if not touch:await p.locator('#road').focus()
 while time.monotonic()-wall<timeout:
  s=await snap(p);invariant(s)
  if s['state']!='playing' or stop and stop(s):return s,actions,time.monotonic()-wall
  c=decide(s)
  if c:
   if touch:await touch_button(p,'#'+c)
   else:await p.keyboard.press(KEYS[c])
   after=await snap(p);actions.append({'observedTick':s['ticks'],'kind':c,'acceptedLogLength':len(after['log'])})
  else:await p.wait_for_timeout(12)
 raise AssertionError('Normal-speed run timeout '+json.dumps(await snap(p)))
def watch(p,errors,bad,failed):
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
async def load(p,url,reload=False):
 if reload:await p.reload()
 else:await p.goto(url)
 await snap(p);await p.wait_for_load_state('networkidle')
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh storage, one page load, natural Next/unlocks. Real Arrow key press/release at normal RAF1x. Only copies of visible road signs and pose are read; no resource/distance/speed/result writes.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1200});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await p.locator('#help-confirm').click()
   for stage in range(1,13):
    if stage>1:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['level']==stage and initial['ticks']==0 and initial['hp']==3 and initial['cargo']==0
    wall=time.monotonic();await begin(p);end,actions,_=await complete(p);elapsed=time.monotonic()-wall
    r={k:end[k] for k in FIELDS};r.update(state=end['state'],time=end['time'],goal=end['goal'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log'],actions=actions,wallSeconds=elapsed,simulationToWallRatio=end['time']/elapsed);report['results'].append(r);save();assert end['state']=='won' and end['hp']==3 and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1),r;assert .65<r['simulationToWallRatio']<1.08;assert r['best']['score']==end['score'];invariant(end)
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   await p.reload();s=await snap(p);assert s['unlocked']==12 and len(s['best'])==12;report['persisted']={'unlocked':s['unlocked'],'bestLevels':len(s['best'])};assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':len(report['results']),'cargo':sum(r['cargo'] for r in report['results']),'hits':sum(r['stats']['hits'] for r in report['results']),'commands':sum(len(r['actualLog']) for r in report['results']),'minSpeedRatio':min(r['simulationToWallRatio'] for r in report['results']),'consoleErrors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/courier/');a.add_argument('--out',default='.local/courier-browser');asyncio.run(main(a.parse_args()))
