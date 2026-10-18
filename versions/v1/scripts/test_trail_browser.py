"""Natural keyboard campaign: fresh save, normal controls, natural unlocks."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,pred,timeout=4):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if pred(s):return s
  await p.wait_for_timeout(12)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
def need_jump(s):
 p=s['player'];foot=p['y']+p['h'];floor=any(x['kind']=='ground' and x['x']<=p['x']+52<=x['x']+x['w'] for x in s['solids']);block=any(not x['oneWay'] and x['kind']!='ground' and x['x']>=p['x']+p['w']-1 and x['x']-p['x']-p['w']<48 and x['y']<foot-4 and x['y']+x['h']>p['y'] for x in s['solids']+s['movers']);enemy=any(e['x']+e['w']>p['x'] and e['x']-p['x']<77 and e['y']<foot+2 for e in s['enemies']);return not floor or block or enemy
async def traverse(p,limit=50,until_x=None):
 held_until=0;release_until=0;jump=False;right=False;deaths=0;log=[];end=time.monotonic()+limit
 while time.monotonic()<end:
  s=await snap(p);t=s['time'];player=s['player']
  if s['state']!='playing' or (until_x is not None and player['x']>=until_x):break
  if s['deaths']!=deaths:
   deaths=s['deaths'];await p.keyboard.up('ArrowRight');await p.keyboard.up('Space');right=False;jump=False;held_until=0;release_until=t+.3
  if not right and player['lock']==0:await p.keyboard.down('ArrowRight');right=True;log.append({'time':t,'key':'ArrowRight','action':'down'})
  if jump and t>=held_until:await p.keyboard.up('Space');jump=False;log.append({'time':t,'key':'Space','action':'up'})
  if not jump and t>=release_until and player['lock']==0 and (player['grounded'] or player['coyote']>0) and need_jump(s):
   await p.keyboard.down('Space');jump=True;held_until=t+.43;release_until=t+.52;log.append({'time':t,'xObserved':player['x'],'key':'Space','action':'down'})
  await p.wait_for_timeout(10)
 await p.keyboard.up('ArrowRight');await p.keyboard.up('Space');return await snap(p),log
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'normal ArrowRight and held/released Space keyboard controls from copied telemetry','fixture':'fresh browser, natural 1–8 unlocks; no saved unlock/position/life/clock/win injection','results':[]}
 async with async_playwright() as pw:
  b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':1050});p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url));await p.goto(args.url)
  for stage in range(1,9):
   if stage in [1,4,8]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
   await p.locator('#primary-action').click()
   if stage==1:assert await p.locator('#help-dialog').is_visible();await p.locator('#help-confirm').click()
   end,log=await traverse(p);result={'stage':stage,'end':end,'normalKeyEdges':log};report['results'].append(result);report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');assert end['state']=='won' and end['checkpoint'] and end['lives']>0,result;assert end['unlocked']==min(8,stage+1)
   if stage in [1,4,8]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
   await p.reload();s=await snap(p);assert s['state']=='ready' and s['level']==stage and s['player']['x']==54 and s['lives']==3 and not s['checkpoint'];assert s['best'][str(stage)]['bells']==end['stats']['collected'];result['saveReloadAndFreshStartVerified']=True;(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'stage':stage,'state':end['state'],'lives':end['lives'],'deaths':end['deaths'],'bells':end['stats']['collected'],'time':round(end['time'],2),'moverLandings':end['stats']['moverLandings']}),flush=True)
   if stage<8:await p.locator('#levels').click();await p.locator(f'[data-level="{stage+1}"]').click()
  assert len((await snap(p))['best'])==8;assert not(errors or bad or failed),(errors,bad,failed);await ctx.close();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/trail/');a.add_argument('--out',default='docs/trail-qa/local-campaign');asyncio.run(main(a.parse_args()))
