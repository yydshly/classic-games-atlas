"""Read-only planning on copied state, followed by real browser mouse/key input.
No injected victories, board mutation, ammo changes, or synthetic gameplay clock.
"""
import argparse,asyncio,datetime,json,math,subprocess,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_idle(p,shots=1,timeout=9):
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  s=await snap(p)
  if s['stats']['shots']>=shots and not s['flight']:return s
  await p.wait_for_timeout(25)
 raise AssertionError('Real projectile did not settle within the bounded wait')
def plan(state,bank=False,fail=False):
 r=subprocess.run(['node','scripts/plan_starline.mjs'],cwd=ROOT,input=json.dumps(dict(state=state,bank=bank,fail=fail)),capture_output=True,text=True,check=True)
 return json.loads(r.stdout)
async def shoot(p,action,keyboard=False):
 s=await snap(p);number=s['stats']['shots']+1
 if action['exchange']:await p.keyboard.press('x')
 rect=await p.locator('#battlefield').bounding_box();x=300+math.sin(action['angle'])*100;y=610-math.cos(action['angle'])*100
 cx=rect['x']+x*rect['width']/600;cy=rect['y']+y*rect['height']/660
 await p.mouse.move(cx,cy)
 if keyboard:await p.keyboard.press('Space')
 else:await p.mouse.click(cx,cy)
 end=await wait_idle(p,number);assert end['stats']['shots']==number
 if action['cell'] is not None:assert (end['lastShot']['r'],end['lastShot']['c'])==(action['cell']['r'],action['cell']['c']),(action,end['lastShot'])
 assert end['stats']['popped']-s['stats']['popped']==(action['popped'] or 0)
 assert end['stats']['dropped']-s['stats']['dropped']==(action['dropped'] or 0)
 return end
async def play(p,bank_first=False):
 shots=[]
 for i in range(40):
  s=await snap(p)
  if s['state']!='playing':break
  action=await asyncio.to_thread(plan,s,bank_first and i==0)
  assert action is not None
  end=await shoot(p,action,keyboard=i%2==1);shots.append({'input':'mouse aim + Space' if i%2 else 'mouse aim + click','plan':action,'actual':end['lastShot'],'ammo':end['ammo'],'state':end['state']})
 return {'end':await snap(p),'shots':shots}
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[]
 report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'real browser mouse/key input; read-only planner uses copied telemetry','fixture':'stage 1 fresh natural campaign; later stages use menu-unlock-only storage fixture','results':[]}
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  for stage in [int(x) for x in args.stages.split(',')]:
   ctx=await b.new_context(viewport={'width':1280,'height':1000},record_video_dir=str(out/f'video-{stage:02}') if args.video else None,record_video_size={'width':960,'height':750} if args.video else None)
   if stage>1:await ctx.add_init_script('if(!localStorage.getItem("classic-atlas.starline.v1"))localStorage.setItem("classic-atlas.starline.v1",JSON.stringify({unlocked:12,last:1,tutorialSeen:true,sound:false,best:{}}))')
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'status':r.status,'url':r.url}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
   await p.goto(args.url);await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click();await p.locator('#primary-action').click()
   if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
   result=await play(p,bank_first=stage==6);result['stage']=stage;report['results'].append(result)
   await p.wait_for_timeout(900);assert not (await snap(p))['effects'];await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
   assert result['end']['state']=='won',result['end']
   if stage==6:assert any(s['actual']['bounces']>0 for s in result['shots'])
   saved=await p.evaluate('JSON.parse(localStorage.getItem("classic-atlas.starline.v1"))');await p.reload();fresh=await snap(p);assert fresh['state']=='ready' and fresh['unlocked']==saved['unlocked'];result['progressReload']={'unlocked':fresh['unlocked'],'best':saved['best']}
   if stage==1:assert fresh['unlocked']==2
   report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   print(json.dumps({'stage':stage,'state':result['end']['state'],'shots':result['end']['stats']['shots'],'remainingAmmo':result['end']['ammo'],'bounces':result['end']['stats']['bounces'],'dropped':result['end']['stats']['dropped']}),flush=True)
   await ctx.close()
  await b.close()
 assert not errors and not bad and not failed,(errors,bad,failed)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/starline/');a.add_argument('--stages',default='1,6,12');a.add_argument('--out',default='docs/starline-qa/local-play');a.add_argument('--video',action='store_true');asyncio.run(main(a.parse_args()))
