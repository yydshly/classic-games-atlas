"""Normal UI purchases and wave starts; stage-menu fixture only for later maps."""
import argparse,asyncio,datetime,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
SNAP='async()=> (await import("./game.mjs")).diagnostics()'
async def snap(p):return await p.evaluate(SNAP)
async def wait_state(p,pred,timeout=4):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  s=await snap(p)
  if pred(s):return s
  await p.wait_for_timeout(30)
 raise AssertionError('State timeout: '+json.dumps(await snap(p)))
async def purchase(p,a):
 s=await snap(p);site=next(x for x in s['sites'] if x['id']==a['site']);await p.locator('#battlefield').scroll_into_view_if_needed();r=await p.locator('#battlefield').bounding_box();await p.mouse.click(r['x']+site['x']*r['width']/600,r['y']+site['y']*r['height']/520)
 await wait_state(p,lambda v:v['selected']==a['site']);await p.locator(f'[data-build="{a["type"]}"]' if a['kind']=='build' else '#upgrade').click()
 await wait_state(p,lambda v:any(t['site']==a['site'] and (a['kind']=='build' or t['level']==2) for t in v['towers']))
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);plans=json.loads((ROOT/'docs/pass-qa/simulations.json').read_text(encoding='utf8'))['simulations'];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'kind':'real mouse selection/build/upgrade/wave buttons and normal earned budget','fixture':'stage 1 fresh; later maps only unlock stage selection, no combat/gold/base/time/win state changes','results':[]};errors=[];bad=[];failed=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  for stage in args.stages:
   ctx=await b.new_context(viewport={'width':1280,'height':1100})
   if stage>1:await ctx.add_init_script('localStorage.setItem("classic-atlas.pass.v1",JSON.stringify({unlocked:'+str(stage)+',last:1,sound:false}))')
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append(r.url));await p.goto(args.url)
   if stage>1:await p.locator('#levels').click();await p.locator(f'[data-level="{stage}"]').click()
   await p.locator('#primary-action').click();await p.locator('#help-confirm').click();await p.locator('#speed').click();plan=plans[stage-1]['plan'];purchases=[];waves=[];deadline=time.monotonic()+args.limit;last_wave=0
   while time.monotonic()<deadline:
    s=await snap(p)
    if s['state']!='playing':break
    if s['phase']=='build':
     for a in plan:
      t=next((t for t in s['towers'] if t['site']==a['site']),None)
      if (a['kind']=='build' and t) or (a['kind']=='upgrade' and t and t['level']==2):continue
      cost={'bolt':65,'stone':90,'frost':75}[a['type']] if a['kind']=='build' else {'bolt':70,'stone':90,'frost':80}[t['type']]
      if s['gold']<cost:break
      before=s['gold'];await purchase(p,a);s=await snap(p);assert s['gold']==before-cost;purchases.append({**a,'wave':s['wave']+1,'cost':cost,'before':before,'after':s['gold']})
     await p.locator('#start-wave').click();last_wave+=1;assert (await snap(p))['wave']==last_wave;waves.append({'wave':last_wave,'gold':s['gold'],'hp':s['hp']})
     if last_wave in [1,4,6]:await p.screenshot(path=str(out/f'stage-{stage:02}-wave-{last_wave}.png'),full_page=True)
    await p.wait_for_timeout(75)
   end=await snap(p);result={'stage':stage,'end':end,'purchases':purchases,'waves':waves};report['results'].append(result);await p.screenshot(path=str(out/f'stage-{stage:02}-result.png'),full_page=True);report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');assert end['state']=='won' and end['wave']==6 and end['hp']>0,result;assert end['gold']==230+end['earned']+end['sold']-end['spent'];assert end['unlocked']>=min(8,stage+1)
   # Remove the menu fixture before reload, preserving the actual earned save.
   await ctx.clear_permissions();saved=await p.evaluate('localStorage.getItem("classic-atlas.pass.v1")');await ctx.close();check=await b.new_context();cp=await check.new_page();await cp.goto(args.url);await cp.evaluate('(v)=>localStorage.setItem("classic-atlas.pass.v1",v)',saved);await cp.reload();fresh=await snap(cp);assert fresh['state']=='ready' and fresh['level']==stage and fresh['gold']==230 and fresh['wave']==0;assert fresh['best'][str(stage)]['hp']==end['hp'];result['savedUnlockBestAndFreshRetry']=True;await check.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'stage':stage,'state':end['state'],'hp':end['hp'],'kills':end['kills'],'time':round(end['time'],2),'purchases':len(purchases)}),flush=True)
  await b.close()
 assert not(errors or bad or failed),(errors,bad,failed)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/pass/');a.add_argument('--out',default='docs/pass-qa/local-campaign');a.add_argument('--stages',type=lambda s:[int(v) for v in s.split(',')],default=[1,4,8]);a.add_argument('--limit',type=int,default=180);asyncio.run(main(a.parse_args()))
