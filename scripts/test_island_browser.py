"""Actual tools, grid selection, rotation, paid confirmation and manual production rounds."""
import argparse,asyncio,datetime,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.island.v1';FIELDS=['level','turn','cash','stock','buildings','nextId','transactions','rounds','stable','strain','lastReport','revision','log','reason','stats','network','score','invariants']
async def snap(p):
 await p.wait_for_function('window.__island?.snapshot')
 return await p.evaluate('window.__island.snapshot()')
def invariant(s):assert all(s['invariants'].values()),s['invariants']
async def plans():
 proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/island_plans.mjs'),cwd=str(ROOT),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE);raw,err=await proc.communicate();assert proc.returncode==0,err.decode();r=json.loads(raw);assert r['passed'];return r['results']
async def click(p,selector,touch=False):
 el=p.locator(selector);assert await el.is_enabled(),selector
 if touch:
  await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
 else:await el.click()
async def apply(p,c,touch=False,keyboard=False):
 before=await snap(p)
 if c['kind']=='place':
  if keyboard:
   await p.keyboard.press(str(['road','home','pump','farm','work','park'].index(c['type'])+1));s=await snap(p)
   if c['type']=='work' and s['ui']['rot']!=c['rot']:await p.keyboard.press('x')
   for axis,positive,negative in [('x','ArrowRight','ArrowLeft'),('y','ArrowDown','ArrowUp')]:
    current=(await snap(p))['ui'][axis]
    for _ in range(abs(c[axis]-current)):await p.keyboard.press(positive if c[axis]>current else negative)
   await p.locator(f'[data-cell="{c["x"]},{c["y"]}"]').focus();await p.keyboard.press('Enter')
  else:
   await click(p,f'[data-tool="{c["type"]}"]',touch);s=await snap(p)
   if c['type']=='work' and s['ui']['rot']!=c['rot']:await click(p,'#rotate',touch)
   await click(p,f'[data-cell="{c["x"]},{c["y"]}"]',touch);await click(p,'#place',touch)
 elif c['kind']=='remove':
  await click(p,f'[data-cell="{c["x"]},{c["y"]}"]',touch)
  if keyboard:await p.keyboard.press('Delete')
  else:await click(p,'#remove',touch)
 else:
  if keyboard and c['kind']=='end':await p.keyboard.press('n')
  elif keyboard:await p.locator('#start').focus();await p.keyboard.press('Enter')
  else:await click(p,'#start' if c['kind']=='start' else '#end-turn',touch)
 if c['kind']!='start':
  assert await p.locator('#confirm-dialog').is_visible();mid=await snap(p);assert mid['ui']['pending']['command']==c and all(mid[k]==before[k] for k in FIELDS)
  if keyboard:await p.keyboard.press('Enter')
  else:await click(p,'#confirm-action',touch)
 after=await snap(p);assert after['revision']==before['revision']+1 and after['log'][-1]==c,(c,after);invariant(after);return after
async def execute(p,commands,touch=False,keyboard=False):
 for c in commands:await apply(p,c,touch,keyboard)
 return await snap(p)
async def load(p,url,reload=False):
 if reload:await p.reload()
 else:await p.goto(url)
 await snap(p);await p.wait_for_load_state('networkidle')
def watch(p,errors,bad,failed):
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);allplans=await plans();errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh normal budgets/stocks; actual tool/grid/rotation/preview/confirm/manual-round buttons, then natural Next/unlocks. No resource, geometry, network, population or result writes.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1200});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await p.locator('#help-confirm').click()
   for stage in range(1,13):
    if stage>1:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['level']==stage and initial['state']=='ready' and not initial['buildings'] and initial['stock']=={'water':4,'food':4,'goods':0};captured=False
    for c in allplans[stage-1]['commands']:
     s=await apply(p,c)
     if stage in [1,6,12] and c['kind']=='end' and not captured:await p.screenshot(path=str(out/f'level-{stage:02}-island.png'),full_page=True);captured=True
    end=await snap(p);r={k:end[k] for k in FIELDS};r.update(state=end['state'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log']);report['results'].append(r);save();assert end['state']=='won' and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1);assert end['cash']==allplans[stage-1]['cash'] and end['stock']==allplans[stage-1]['stock'] and r['best']['score']==end['score'];invariant(end)
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   await load(p,args.url,True);s=await snap(p);assert s['unlocked']==12 and len(s['best'])==12;assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':12,'placements':sum(r['stats']['placed'] for r in report['results']),'rounds':sum(r['stats']['rounds'] for r in report['results']),'commands':sum(len(r['actualLog']) for r in report['results']),'consoleErrors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:2000];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/island/');a.add_argument('--out',default='.local/island-browser');asyncio.run(main(a.parse_args()))
