"""Normal browser mouse/Space control; a persistent planner only reads snapshots."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
class Planner:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node','scripts/prism_pilot.mjs','--stdio',cwd=ROOT,stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
 async def input(self,state):
  self.proc.stdin.write((json.dumps(state)+'\n').encode());await self.proc.stdin.drain();line=await self.proc.stdout.readline();assert line,'Read-only planner stopped';r=json.loads(line);assert 'error' not in r,r;return r
 async def close(self):
  self.proc.stdin.close();await self.proc.wait()
async def pilot(p,out,stage,limit=260):
 planner=Planner();await planner.start();samples=[];last_sample=-1;deadline=time.monotonic()+limit;resumes=0
 try:
  while time.monotonic()<deadline:
   s=await snap(p)
   if s['state']=='paused':await p.keyboard.press('p');resumes+=1;continue
   if s['state']!='playing':break
   if int(s['time'])//4!=last_sample:
    last_sample=int(s['time'])//4;samples.append({k:s[k] for k in ['time','lives','serving','remaining','balls','paddle','stats','buffs','paddleWidth']});(out/f'checkpoint-{stage:02}.json').write_text(json.dumps({'kind':'read-only in-progress observation','snapshot':s},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   action=await planner.input(s);rect=await p.locator('#battlefield').bounding_box();await p.mouse.move(rect['x']+action['pointerX']*rect['width']/600,rect['y']+610*rect['height']/720)
   if action.get('launch'):await p.keyboard.press('Space')
   await p.wait_for_timeout(35)
 finally:await planner.close()
 end=await snap(p);return {'stage':stage,'end':end,'samples':samples,'keyboardPauseResumes':resumes}
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'real browser mouse movement and Space launch; read-only predictor on copied telemetry','fixture':'stage 1 fresh; later stages only unlock the selection menu; no ball/brick/life/clock/win mutation','results':[]}
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  for stage in [int(n) for n in args.stages.split(',')]:
   ctx=await b.new_context(viewport={'width':1280,'height':1000},record_video_dir=str(out/f'video-{stage:02}') if args.video else None,record_video_size={'width':960,'height':750} if args.video else None)
   if stage>1:await ctx.add_init_script('if(!localStorage.getItem("classic-atlas.prism.v1"))localStorage.setItem("classic-atlas.prism.v1",JSON.stringify({unlocked:12,last:1,tutorialSeen:true,sound:false,best:{}}))')
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url))
   await p.goto(args.url);await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click();await p.locator('#primary-action').click()
   if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
   result=await pilot(p,out,stage,args.limit);report['results'].append(result);await p.wait_for_timeout(600);await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
   report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');s=result['end'];print(json.dumps({'stage':stage,'state':s['state'],'time':round(s['time'],2),'lives':s['lives'],'destroyed':s['stats']['destroyed'],'initial':s['initial'],'powers':s['stats']['powers']}),flush=True)
   assert s['state']=='won',s
   saved=await p.evaluate('JSON.parse(localStorage.getItem("classic-atlas.prism.v1"))');await p.reload();fresh=await snap(p);assert fresh['state']=='ready' and fresh['unlocked']==saved['unlocked'];assert str(stage) in saved['best'];result['progressReload']={'unlocked':fresh['unlocked'],'best':saved['best']}
   if stage==1:assert fresh['unlocked']==2
   (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');await ctx.close()
  await b.close()
 assert not errors and not bad and not failed,(errors,bad,failed)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/prism/');a.add_argument('--stages',default='1,6,12');a.add_argument('--out',default='docs/prism-qa/local-play');a.add_argument('--limit',type=int,default=260);a.add_argument('--video',action='store_true');asyncio.run(main(a.parse_args()))
