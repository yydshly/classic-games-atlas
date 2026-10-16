"""Ordinary reveal/right-click flag/chord inputs, strategy sees public clues only."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];KEY='classic-atlas.sand.v1';SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,predicate,timeout=8):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if predicate(s):return s
  await p.wait_for_timeout(15)
 raise AssertionError('Timed out: '+json.dumps(await snap(p)))
class Pilot:
 async def start(self):self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'scripts/sand_pilot.mjs'),'--stdio',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,cwd=str(ROOT));return self
 async def decide(self,s):
  # Strip game-over information and all UI fields. No mine position is supplied.
  assert s['state']=='playing' and all(not c or 'mine' not in c for c in s['cells'])
  public={k:s[k] for k in ['state','w','h','start','totalMines','started','cells']};self.proc.stdin.write((json.dumps(public)+'\n').encode());await self.proc.stdin.drain();r=json.loads(await self.proc.stdout.readline());assert r and r.get('type') in ['reveal','flag','chord'],r;return r
 async def close(self):
  if self.proc.returncode is None:self.proc.stdin.close();await self.proc.wait()
async def begin(p):
 await p.locator('#primary-action').click()
 if await p.locator('#help-dialog').is_visible():await p.locator('#help-confirm').click()
 assert (await snap(p))['state']=='playing'
async def play_action(p,a):
 before=await snap(p);key={'reveal':'reveals','flag':'flagActions','chord':'chords'}[a['type']]
 # Respect the production same-cell anti-double-tap guard, including an
 # intentional reveal followed by chord. This is ordinary input pacing.
 if before['keyboardCursor']==a['index']:await p.wait_for_timeout(240)
 await p.locator(f'#board [data-index="{a["index"]}"]').click(button='right' if a['type']=='flag' else 'left');return await wait_state(p,lambda s:s['stats'][key]==before['stats'][key]+1)
async def complete(p,pilot,out=None,stage=1):
 actions=[]
 for n in range(1000):
  s=await snap(p)
  if s['state']!='playing':return s,actions
  a=await pilot.decide(s);after=await play_action(p,a);actions.append({**a,'visibleBefore':[None if c is None else c['number'] if c['state']=='open' else 'F' if c['state']=='flagged' else '?' for c in s['cells']],'revealedAfter':after['revealed'],'flagsAfter':after['flags']})
  if out and stage in [1,10,20] and n==0:await p.screenshot(path=str(out/f'stage-{stage:02}-playing.png'),full_page=True)
 raise AssertionError('Too many deductions')
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Actual DOM left/right click and chord; strategy only receives visible cells, public total/geometry/start; no hidden-map/coordinate-answer access','fixture':'Later-stage menu unlock, tutorial/sound preference only; no board, hints, time, victory writes','results':[]}
 def watch(p):
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch()
   for stage in args.stages:
    ctx=await b.new_context(viewport={'width':1280,'height':1050})
    if stage>1:await ctx.add_init_script('localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(stage)+',last:1,tutorialSeen:true,sound:false}))')
    p=await ctx.new_page();watch(p);await p.goto(args.url);await snap(p)
    if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['revealed']==0 and initial['flags']==0
    if stage in [1,10,20]:await p.screenshot(path=str(out/f'stage-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);result={'stage':stage,'end':end,'normalDeductions':actions};report['results'].append(result);save();assert end['state']=='won' and end['revealed']==sum(c is not None for c in end['cells'])-end['totalMines'] and end['stats']['hints']==0 and end['stats']['settlements']==1 and end['unlocked']>=min(20,stage+1)
    if stage in [1,10,20]:await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True)
    saved=await p.evaluate('localStorage.getItem("'+KEY+'")');assert json.loads(saved)['best'][str(stage)]['hints']==0
    mirror=await b.new_context();await mirror.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(saved)+')');mp=await mirror.new_page();watch(mp);await mp.goto(args.url);rest=await snap(mp);await mp.wait_for_load_state('networkidle');assert rest['state']=='ready' and rest['level']==stage and rest['revealed']==0 and rest['cells']==initial['cells'] and rest['best'][str(stage)]['hints']==0;result['savedBestAndFreshReplayVerified']=True;await mirror.close();await ctx.close();save();print(json.dumps({'stage':stage,'state':end['state'],'actions':len(actions),'revealed':end['revealed']}),flush=True)
   assert not(errors or bad or failed),(errors,bad,failed);await b.close()
 finally:save();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/sand/');a.add_argument('--out',default='docs/sand-qa/local-browser');a.add_argument('--stages',type=lambda x:[int(v) for v in x.split(',')],default=list(range(1,21)));asyncio.run(main(a.parse_args()))
