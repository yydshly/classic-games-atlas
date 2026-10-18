"""All sixteen authored puzzles with real public keyboard input at normal speed."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.chime.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,fn,timeout=8):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if fn(s):return s
  await p.wait_for_timeout(15)
 raise AssertionError('Timeout: '+json.dumps(await snap(p)))
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 return await wait_state(p,lambda s:s['state']=='playing')
async def play(p,actions):
 edges=[]
 for action in actions:
  before=await wait_state(p,lambda s:s['time']>=action['time'] or s['state']!='playing')
  assert before['state']=='playing',before
  for ident in action['ids']:await p.keyboard.press(str(ident));edges.append({'observedTime':before['time'],'key':str(ident)})
 return await wait_state(p,lambda s:s['state'] in ['won','lost']),edges
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Native Playwright keyboard press 1–4 at normal requestAnimationFrame speed, copied telemetry read only. No position/velocity/gravity/rope length/clock/result writes. Menu unlock preferences only for isolated later levels.','results':[]}
 plans=json.loads(__import__('subprocess').check_output(['node','--input-type=module','-e',"import{DELIBERATE_PLANS}from'./scripts/chime_plans.mjs';console.log(JSON.stringify(DELIBERATE_PLANS))"],cwd=ROOT))
 def save():
  report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1100})
    if stage>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);await snap(p);await p.wait_for_load_state('networkidle')
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['time']==0 and all(not r['cut'] for r in initial['ropes']) and all(not s['collected'] for s in initial['stars'])
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'level-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,edges=await play(p,plans[stage-1]);r={'stage':stage,'state':end['state'],'stars':sum(s['collected'] for s in end['stars']),'time':end['time'],'cuts':end['stats']['cuts'],'settlements':end['stats']['settlements'],'actions':edges,'best':end['best'].get(str(stage)),'unlocked':end['unlocked']};report['results'].append(r);save();assert end['state']=='won' and end['stats']['settlements']==1 and end['unlocked']>=min(16,stage+1),r;assert r['best']['stars']==r['stars'] and r['best']['cuts']==r['cuts'];assert await p.locator('#overlay').is_visible();hit=await p.locator('#primary-action').evaluate('(b)=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b}');assert hit
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
    await ctx.close()
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'stars':[r['stars'] for r in report['results']],'errors':errors,'badResponses':bad}))
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/chime/');a.add_argument('--out',default='.local/chime-browser');a.add_argument('--stages',nargs='+',type=int,default=list(range(1,17)));asyncio.run(main(a.parse_args()))
