"""All8 chapters using authored budgets, real previews/confirmations and natural unlocks."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.feather.v1';FIELDS=['chapter','choice','round','order','cursor','revision','serial','units','items','changes','history','log','score','reason','stats','active','intents','invariants']
async def snap(p):
 await p.wait_for_function('window.__feather?.snapshot');return await p.evaluate('window.__feather.snapshot()')
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
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/feather_pilot.mjs'),'--stdio',cwd=str(ROOT),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE);return self
 async def decide(self,s):
  self.proc.stdin.write((json.dumps(s)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert not r or 'error' not in r,r;return r
 async def close(self):self.proc.stdin.close();await self.proc.wait()
async def begin(p,touch=False):
 if await p.locator('#help-dialog').is_visible():await click(p,'#help-confirm',touch)
async def prepare(p,c,touch=False,keyboard=False):
 before=await snap(p)
 selector='[data-choice="'+c['choice']+'"]' if c['kind']=='choice' else '[data-'+('skill' if c['move']['kind']=='skill' else 'item')+'="'+c['move'].get('skill',c['move'].get('item'))+'"]'
 if keyboard:await p.locator(selector).focus();await p.keyboard.press('Enter')
 else:await click(p,selector,touch)
 if c['kind']=='act' and not(c['move']['kind']=='skill' and c['move']['skill']=='guard'):
  selector='[data-target="'+c['move']['target']+'"]'
  if keyboard:await p.locator(selector).focus();await p.keyboard.press('Enter')
  else:await click(p,selector,touch)
 await p.locator('#preview-dialog').wait_for(state='visible');after=await snap(p);assert all(before[k]==after[k] for k in FIELDS),'Preview must not mutate battle';assert len(await p.locator('#preview-lines p').all())>=3
async def command(p,c,touch=False,keyboard=False):
 before=await snap(p);await prepare(p,c,touch,keyboard)
 if keyboard:await p.locator('#confirm').focus();await p.keyboard.press('Enter')
 else:await click(p,'#confirm',touch)
 await p.locator('#preview-dialog').wait_for(state='hidden');await p.wait_for_timeout(10);after=await snap(p);assert after['revision']==before['revision']+1;invariant(after);return after
async def complete(p,pilot,touch=False,keyboard=False,stop=None):
 actions=[];wall=time.monotonic()
 for _ in range(200):
  s=await snap(p);invariant(s)
  if s['state'] not in ['event','battle'] or stop and stop(s):return s,actions,time.monotonic()-wall
  c=await pilot.decide(s);assert c;await command(p,c,touch,keyboard);actions.append(c)
 raise AssertionError('Normal campaign did not terminate')
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh storage; authored fullHP/5energy and2heal/1ether/1revive before event. Real event, skill/target, preview and confirm clicks; natural Next/unlock. No HP/items/energy/AI/turn/result writes. Turn game has no time acceleration.','results':[]};pilot=await Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1440,'height':1100});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await begin(p)
   for stage in range(1,9):
    if stage>1:await click(p,'#primary-action')
    s=await snap(p);assert s['chapter']==stage and s['state']=='event' and s['items']=={'heal':2,'ether':1,'revive':1};assert all(u['hp']==u['maxHP'] and u['energy']==5 for u in s['units'] if u['side']=='party')
    end,actions,wall=await complete(p,pilot);r={k:end[k] for k in FIELDS};r.update(state=end['state'],unlocked=end['unlocked'],best=end['best'].get(str(stage)),actualLog=end['log'],uiActions=actions,wallSeconds=wall);report['results'].append(r);save();assert end['state']=='won' and end['stats']['settlements']==1 and end['unlocked']>=min(8,stage+1)
    if stage in [1,4,8]:await p.screenshot(path=str(out/f'chapter-{stage:02}-won.png'),full_page=True)
   assert any(h.get('mode')=='nova' and len(h['effects'])==3 for h in end['history']);await load(p,args.url,True);s=await snap(p);assert s['unlocked']==8 and len(s['best'])==8;assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'wins':8,'commands':sum(len(r['log']) for r in report['results']),'playerActions':sum(r['stats']['playerActions'] for r in report['results']),'bossPhase':any(h['type']=='phase' for h in end['history']),'bossNova':any(h.get('mode')=='nova' for h in end['history'])}));await ctx.close()
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/feather/');a.add_argument('--out',default='.local/feather-browser');asyncio.run(main(a.parse_args()))
