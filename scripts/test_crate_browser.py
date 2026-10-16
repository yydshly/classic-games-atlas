"""Natural all-level browser campaign: normal keys, no unlock/battle fixtures."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()';KEYS={'U':'ArrowUp','R':'ArrowRight','D':'ArrowDown','L':'ArrowLeft'}
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=3):
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(12)
 raise AssertionError('Timed out waiting for a normal UI state: '+json.dumps(await snap(p)))
async def ready_input(p):return await wait_state(p,lambda s:not s['inputLocked'])
async def move_keys(p,route):
 for d in route:
  before=await snap(p);await p.keyboard.press(KEYS[d]);await wait_state(p,lambda s:s['moves']==before['moves']+1)
 return await snap(p)
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];solutions=json.loads((ROOT/'docs/crate-qa/solutions.json').read_text(encoding='utf-8'))['solutions'];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'real keyboard replay of independently found normal actions','fixture':'fresh browser context, no unlock/player/box/goal/win mutation','results':[]}
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':1000});p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url))
  await p.goto(args.url);await p.locator('#primary-action').click();assert await p.locator('#help-dialog').is_visible();await p.locator('#help-confirm').click()
  for solution in solutions:
   await ready_input(p);s=await snap(p);assert s['level']==solution['stage'] and s['state']=='playing' and s['moves']==0
   end=await move_keys(p,solution['actions']);assert end['state']=='won' and end['satisfied']==len(end['boxes']);assert end['moves']==solution['moves'] and end['pushes']==solution['pushes'];assert end['unlocked']==min(20,end['level']+1);await p.wait_for_timeout(200)
   await p.locator('#battlefield').screenshot(path=str(out/f'stage-{end["level"]:02}-board.png'))
   if end['level'] in [1,10,20]:await p.screenshot(path=str(out/f'stage-{end["level"]:02}-result.png'),full_page=True)
   result={'stage':end['level'],'result':end['state'],'normalActions':solution['actions'],'moves':end['moves'],'pushes':end['pushes'],'unlocked':end['unlocked'],'end':end};report['results'].append(result)
   await p.reload();fresh=await snap(p);assert fresh['state']=='won' and fresh['moves']==end['moves'] and fresh['pushes']==end['pushes'] and fresh['historyDepth']==end['historyDepth'];assert fresh['best'][str(end['level'])]=={'moves':end['moves'],'pushes':end['pushes']};result['reloadVerified']=True
   report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:result[k] for k in ['stage','result','moves','pushes','unlocked']}),flush=True)
   if end['level']<20:await ready_input(p);await p.locator('#primary-action').click()
  assert len((await snap(p))['best'])==20
  await ctx.close();await b.close()
 assert not errors and not bad and not failed,(errors,bad,failed)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/crate/');a.add_argument('--out',default='docs/crate-qa/local-campaign');asyncio.run(main(a.parse_args()))
