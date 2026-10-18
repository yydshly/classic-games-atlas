"""Normal1x public pointer drags; strategy reads copies and never sets game resources."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.orchard.v1'
async def snap(p):return await p.evaluate('async()=> (await import("./game.mjs")).diagnostics()')
def invariant(s):assert all(s['invariants'].values()),s
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/orchard_pilot.mjs'),'--stdio',cwd=str(ROOT),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE);return self
 async def decide(self,s):self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
async def touch_button(p,selector):
 el=p.locator(selector);await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
async def drag(p,points,touch=False):
 await p.locator('#battle').scroll_into_view_if_needed();r=await p.locator('#battle').bounding_box();coords=[(r['x']+v['x']/900*r['width'],r['y']+v['y']/620*r['height']) for v in points];cd=None
 if touch:cd=await p.context.new_cdp_session(p);await cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':coords[0][0],'y':coords[0][1]}]})
 else:await p.mouse.move(*coords[0]);await p.mouse.down()
 prev=coords[0]
 for point in coords[1:]:
  for i in [1,2]:
   x=prev[0]+(point[0]-prev[0])*i/2;y=prev[1]+(point[1]-prev[1])*i/2
   if touch:await cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
   else:await p.mouse.move(x,y)
   await p.wait_for_timeout(10)
  prev=point
 if touch:await cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await cd.detach()
 else:await p.mouse.up()
async def begin(p,touch=False):
 if await p.locator('#help-dialog').is_visible():
  if touch:await touch_button(p,'#help-confirm')
  else:await p.locator('#help-confirm').click()
 if touch:await touch_button(p,'#start')
 else:await p.locator('#start').click()
 return await snap(p)
async def complete(p,pilot,touch=False,out=None,stage=1,stop=None,timeout=45):
 wall=time.monotonic();actions=[];captured=False
 while time.monotonic()-wall<timeout:
  s=await snap(p);invariant(s)
  if s['state']!='playing' or (stop and stop(s)):return s,actions,time.monotonic()-wall
  route=await pilot.decide(s)
  if route:
   before=s['stats']['strokes'];await drag(p,route['points'],touch);after=await snap(p);assert after['stats']['strokes']==before+1;actions.append({'observedTick':s['ticks'],'wave':route['wave'],'intendedTargets':route['targets'],'points':route['points'],'resultCuts':after['stats']['cuts'],'resultErrors':after['errors']})
   if out and stage in [1,6,12] and not captured:await p.screenshot(path=str(out/f'level-{stage:02}-stroke.png'),full_page=True);captured=True
  else:await p.wait_for_timeout(20)
 raise AssertionError('Normal1x play timeout '+json.dumps(await snap(p)))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'One initial page load then actual Next buttons/natural unlocks. Real mouse down, interpolated pointer moves with10ms waits, and up at1x real-time RAF physics. Read-only prediction from active targets; no score/resource/target/tick/speed/result writes.','fixture':'Only initial map unlock/tutorial/sound preferences when start>1.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1200})
   if args.start>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(args.start)+',last:'+str(args.start)+',tutorialSeen:true,sound:false}))')
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);await snap(p);await p.wait_for_load_state('networkidle')
   if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
   for stage in range(args.start,args.end+1):
    if stage>args.start:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['level']==stage and not initial['ticks'] and not initial['score'] and not initial['targets']
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-ready.png'),full_page=True)
    wall=time.monotonic();await begin(p);end,actions,_=await complete(p,pilot,out=out,stage=stage);elapsed=time.monotonic()-wall;r={k:end[k] for k in ['state','ticks','time','nextWave','targets','score','errors','cutIds','missIds','bombIds','strokeSerial','stats','invariants']};r.update(stage=stage,actualLog=end['log'],best=end['best'].get(str(stage)),unlocked=end['unlocked'],actions=actions,wallSeconds=elapsed,simulationToWallRatio=end['time']/elapsed);report['results'].append(r);save();assert end['state']=='won' and end['stats']['settlements']==1 and end['speed']==1 and end['unlocked']>=min(12,stage+1),r;assert .65<r['simulationToWallRatio']<1.08,r;assert r['best']['score']==end['score'] and r['best']['cuts']==end['stats']['cuts'];invariant(end)
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'cuts':sum(r['stats']['cuts'] for r in report['results']),'errors':sum(r['errors'] for r in report['results']),'strokes':sum(r['stats']['strokes'] for r in report['results']),'minSpeedRatio':min(r['simulationToWallRatio'] for r in report['results']),'consoleErrors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/orchard/');a.add_argument('--out',default='.local/orchard-browser');a.add_argument('--start',type=int,default=1);a.add_argument('--end',type=int,default=12);asyncio.run(main(a.parse_args()))
