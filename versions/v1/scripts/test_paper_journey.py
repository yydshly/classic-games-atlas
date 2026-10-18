"""Continue a contiguous set of levels through the real Next button in one browser session."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_paper_browser import ROOT,KEY,snap,begin,complete,Pilot
async def main(args):
 assert 1<=args.start<=args.end<=16
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'One initial public navigation, then ordinary Next buttons and naturally earned subsequent unlocks. Real five-move sling drags and A abilities; normal budget/physics, no world/result assignments.','fixture':'Only the initial starting-level menu unlock/tutorial/sound preferences.','results':[]}
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 pilot=await Pilot().start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1200})
   if args.start>1:await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:'+str(args.start)+',last:'+str(args.start)+',tutorialSeen:true,sound:false}))')
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}));await p.goto(args.url);await snap(p);await p.wait_for_load_state('networkidle')
   for stage in range(args.start,args.end+1):
    if stage>args.start:await p.locator('#primary-action').click()
    initial=await snap(p);assert initial['state']=='ready' and initial['level']==stage and initial['stats']['shots']==0 and initial['time']==0 and initial['unlocked']>=stage
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'level-{stage:02}-ready.png'),full_page=True)
    await begin(p);end,actions=await complete(p,pilot,out,stage);r={'stage':stage,'state':end['state'],'ticks':end['ticks'],'time':end['time'],'stars':end['stars'],'score':end['score'],'stats':end['stats'],'remaining':end['remaining'],'ammo':end['ammo'],'actualLog':end['log'],'best':end['best'].get(str(stage)),'unlocked':end['unlocked'],'actions':actions};report['results'].append(r);save();assert end['state']=='won' and not end['remaining'] and end['stats']['settlements']==1 and end['unlocked']>=min(16,stage+1),r;assert end['ammo']==initial['ammo']-end['stats']['shots'] and end['stats']['shots']<=initial['ammo'];assert r['best']['stars']==end['stars'] and r['best']['score']==end['score'];assert len(end['deliveredIds'])==len(set(end['deliveredIds']))==initial['remaining'];assert not end['stats']['collisionCaps'];
    if stage in [1,8,16]:await p.screenshot(path=str(out/f'level-{stage:02}-won.png'),full_page=True)
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'wins':len(report['results']),'levels':[r['stage'] for r in report['results']],'shots':sum(r['stats']['shots'] for r in report['results']),'errors':errors}));await ctx.close()
  except Exception as e:report['error']=str(e)[:1500];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/games/paper/');a.add_argument('--out',default='.local/paper-journey');a.add_argument('--start',type=int,default=1);a.add_argument('--end',type=int,default=16);asyncio.run(main(a.parse_args()))
