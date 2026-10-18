"""Normal1x RTS campaign through public selection, map orders and paid production receipts."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.expedition.v1';FIELDS=['level','ticks','stock','home','core','nodes','units','unitSerial','shotSerial','shots','ledger','queue','tickets','nextToken','revision','waves','log','capture','score','reason','stats','invariants']
async def snap(p):
 await p.wait_for_function('window.__expedition?.snapshot');return await p.evaluate('window.__expedition.snapshot()')
def invariant(s):assert all(s['invariants'].values()),s['invariants']
def watch(p,errors,bad,failed):
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
async def click(p,selector,touch=False):
 e=p.locator(selector);await e.wait_for(state='visible');assert await e.is_enabled(),selector
 if touch:
  await e.scroll_into_view_if_needed();r=await e.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
 else:await e.click()
async def load(p,url,reload=False):
 if reload:await p.reload()
 else:await p.goto(url)
 await snap(p);await p.wait_for_load_state('networkidle')
async def until(p,predicate,timeout=15):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(25)
 raise AssertionError('Condition timeout '+str(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/expedition_pilot.mjs'),'--stdio',cwd=str(ROOT),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE);return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
async def select(p,ids,touch=False):
 s=await snap(p);fighters=[u['id'] for u in s['units'] if u['side']=='player' and u['hp']>0 and u['type'] in ['guard','ranger']];workers=[u['id'] for u in s['units'] if u['side']=='player' and u['hp']>0 and u['type']=='worker'];cart=[u['id'] for u in s['units'] if u['side']=='player' and u['hp']>0 and u['type']=='cart']
 for group,selector in [(fighters,'#select-fighters'),(workers,'#select-workers'),(cart,'#select-cart')]:
  if set(ids)==set(group):await click(p,selector,touch);return
 if (await snap(p))['ui']['multi']:await click(p,'#multi',touch)
 await click(p,'#unit-list [data-unit="'+ids[0]+'"]',touch)
 if len(ids)>1:
  if touch:await click(p,'#multi',True)
  else:await p.keyboard.down('Shift')
  for id in ids[1:]:await click(p,'#unit-list [data-unit="'+id+'"]',touch)
  if touch:await click(p,'#multi',True)
  else:await p.keyboard.up('Shift')
 assert set((await snap(p))['ui']['selected'])==set(ids)
async def command(p,c,touch=False):
 before=(await snap(p))['revision']
 if c['kind']=='buy':
  await click(p,'[data-buy="'+c['type']+'"]',touch);await p.locator('#buy-dialog').wait_for(state='visible');assert (await snap(p))['state']=='paused';await click(p,'#buy-confirm',touch);await p.locator('#buy-dialog').wait_for(state='hidden');await until(p,lambda s:s['state'] in ['playing','won','lost'])
 else:
  await select(p,c['ids'],touch);o=c['order']
  if o['kind']=='stop':await click(p,'#stop',touch)
  elif o['kind']=='escort':await click(p,'#escort-cart',touch)
  else:
   await click(p,'[data-mode="'+o['kind']+'"]',touch);s=await snap(p)
   if o['kind']=='gather':target=next(n for n in s['nodes'] if n['id']==o['target'])
   elif o['kind']=='attack':target=s['core'] if o['target']=='core' else next(u for u in s['units'] if u['id']==o['target'])
   else:target=o
   await click(p,'#board [data-x="'+str(target['x'])+'"][data-y="'+str(target['y'])+'"]',touch)
 after=await snap(p);return after['revision']>before
async def begin(p,touch=False):
 if await p.locator('#help-dialog').is_visible():await click(p,'#help-confirm',touch)
 await click(p,'#start',touch)
async def complete(p,pilot,touch=False,stop=None,timeout=145):
 wall=time.monotonic();actions=[]
 while time.monotonic()-wall<timeout:
  s=await snap(p);invariant(s)
  if s['state']!='playing' or stop and stop(s):return s,actions,time.monotonic()-wall
  c=await pilot.decide(s)
  if c:ok=await command(p,c,touch);actions.append({'observedTick':s['ticks'],'intended':c,'accepted':ok})
  await p.wait_for_timeout(55)
 raise AssertionError('Live normal-resource campaign timed out '+str(await snap(p)))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh storage, original24stock/96finite deposits/normalHP/waves and1x RAF. Real unit/group selection, map buttons, cost previews and confirmations. Only production receipt auto-pauses as documented gameplay. No resource/HP/coordinates/AI/clock/result writes, no manual pause-to-plan. Natural Next/unlocks.','results':[]};pilot=await Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1100});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await p.locator('#help-confirm').click()
   for stage in range(1,9):
    if stage>1:await p.locator('#primary-action').click()
    s=await snap(p);assert s['state']=='ready' and s['level']==stage and s['stock']==24 and s['home']['hp']==130 and s['ticks']==0;wall=time.monotonic();await begin(p);end,actions,_=await complete(p,pilot);elapsed=time.monotonic()-wall;r={k:end[k] for k in FIELDS};r.update(state=end['state'],time=end['time'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log'],actions=actions,wallSeconds=elapsed,simulationToWallRatio=end['time']/elapsed);report['results'].append(r);save();assert end['state']=='won' and end['home']['hp']>0 and end['stats']['settlements']==1 and end['unlocked']>=min(8,stage+1);assert .6<r['simulationToWallRatio']<1.1;invariant(end)
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   await load(p,args.url,True);s=await snap(p);assert s['unlocked']==8 and len(s['best'])==8;assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':8,'delivered':sum(r['stats']['delivered'] for r in report['results']),'produced':sum(r['stats']['produced'] for r in report['results']),'commands':sum(len(r['actualLog']) for r in report['results']),'minimumSpeedRatio':min(r['simulationToWallRatio'] for r in report['results'])}));await ctx.close()
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/expedition/');a.add_argument('--out',default='.local/expedition-browser');asyncio.run(main(a.parse_args()))
