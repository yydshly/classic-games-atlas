"""Normal budgets and production plans applied through visible controls/receipts only."""
import argparse,asyncio,datetime,hashlib,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.venture.v1';FIELDS=['level','turn','phase','pos','travelled','laps','cash','assets','actionUsed','nextAsset','transactions','turns','revision','log','stats','worth','assetValue','goals','score']
async def snap(p):
 await p.wait_for_function('window.__venture?.snapshot')
 return await p.evaluate('window.__venture.snapshot()')
def invariant(s):assert all(s['invariants'].values()),s['invariants']
async def plans():
 fingerprint=hashlib.sha256(b''.join((ROOT/f).read_bytes() for f in ['games/venture/engine.mjs','games/venture/levels.mjs','scripts/venture_plans.mjs'])).hexdigest();cache=ROOT/'.local/venture-plan-cache.json'
 if cache.exists():
  r=json.loads(cache.read_text(encoding='utf8'))
  if r.get('fingerprint')==fingerprint:return r['report']['results']
 proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/venture_plans.mjs'),cwd=str(ROOT),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE);raw,err=await proc.communicate();assert proc.returncode==0,err.decode();r=json.loads(raw);assert r['passed'] and len(r['results'])==12;cache.write_text(json.dumps({'fingerprint':fingerprint,'report':r},ensure_ascii=False)+'\n',encoding='utf8');return r['results']
async def touch_button(p,selector):
 el=p.locator(selector);assert await el.is_enabled(),selector;await el.scroll_into_view_if_needed();r=await el.bounding_box();await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
async def click(p,selector,touch=False):
 if touch:await touch_button(p,selector)
 else:await p.locator(selector).click()
async def apply(p,c,touch=False,keyboard=False):
 before=await snap(p)
 if keyboard:
  if c['kind']=='start':await p.locator('#start').focus();await p.keyboard.press('Enter')
  else:await p.keyboard.press(str(c['card']+1) if c['kind']=='move' else {'buy':'b','operate':'o','upgrade':'u','sell':'s','work':'w','end':'n'}[c['kind']])
 else:await click(p,f'[data-card="{c["card"]}"]' if c['kind']=='move' else '#'+{'end':'end-turn'}.get(c['kind'],c['kind']),touch)
 if c['kind']!='start':
  assert await p.locator('#confirm-dialog').is_visible();mid=await snap(p);assert mid['pending']['command']==c and all(mid[k]==before[k] for k in FIELDS);assert mid['pending']['quote']['after']==int((await p.locator('#confirm-after').inner_text()).removesuffix('币'))
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
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);allplans=await plans();errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh storage, one page load and actual Next buttons/natural unlocks. Visible card/action selection, complete receipt preview and normal confirmation/end-turn input. No money, asset, calendar, position or result writes.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1200});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await p.locator('#help-confirm').click()
   for stage in range(1,13):
    if stage>1:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['level']==stage and not initial['transactions'] and not any(initial['assets']) and initial['turn']==1
    captured=False
    for c in allplans[stage-1]['commands']:
     s=await apply(p,c)
     if stage in [1,6,12] and c['kind']=='end' and not captured:await p.screenshot(path=str(out/f'level-{stage:02}-street.png'),full_page=True);captured=True
    end=await snap(p);r={k:end[k] for k in FIELDS};r.update(state=end['state'],invariants=end['invariants'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log']);report['results'].append(r);save();assert end['state']=='won' and end['goals']['done'] and end['stats']['settlements']==1 and end['unlocked']>=min(12,stage+1);assert r['best']['score']==end['score'];assert end['cash']==allplans[stage-1]['cash'] and end['worth']==allplans[stage-1]['worth'];invariant(end)
    if stage in [1,6,12]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   await load(p,args.url,True);end=await snap(p);assert end['unlocked']==12 and len(end['best'])==12;report['persisted']={'unlocked':12,'bestLevels':12};assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':12,'turns':sum(r['stats']['turnsEnded'] for r in report['results']),'purchases':sum(r['stats']['purchases'] for r in report['results']),'commands':sum(len(r['actualLog']) for r in report['results']),'consoleErrors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1600];raise
  finally:save();await b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/venture/');a.add_argument('--out',default='.local/venture-browser');asyncio.run(main(a.parse_args()))
