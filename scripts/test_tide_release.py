"""Fresh published-release smoke: all entry pages, previous game, restore and touch."""
import argparse, asyncio, datetime, json
from pathlib import Path
from playwright.async_api import async_playwright
from test_tide_browser import snap, wait_state, begin, complete, Pilot, KEY
import test_brook_browser as brook

ROOT=Path(__file__).resolve().parents[1]

async def main(args):
    out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True)
    errors=[];bad=[];failed=[]
    report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'entryPages':[]}
    def watch(p):
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
        p.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
    def save():
        report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed)
        out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    pilot=await Pilot().start();oldpilot=await brook.Pilot().start()
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        try:
            ctx=await b.new_context(viewport={'width':1360,'height':1200});p=await ctx.new_page();watch(p)
            base=args.url.rstrip('/')+'/'
            await p.goto(base);await p.locator('.lab-card').last.wait_for();await p.wait_for_load_state('networkidle')
            data=await p.evaluate('async()=>await(await fetch("./data/games.json")).json()')
            assert len(data['games'])==72 and len(data['groups'])==10 and len(data['experiments'])==20
            assert sum(e['levels'] for e in data['experiments'])==250
            assert await p.locator('.lab-card .primary-link').count()==20
            report['atlas']={'entries':72,'groups':10,'originals':20,'levels':250,'version':data['version']};save()
            for e in data['experiments']:
                response=await p.goto(base+e['url'].removeprefix('./'))
                assert response.status==200
                await p.wait_for_load_state('networkidle')
                assert await p.locator('h1').count()==1 and await p.locator('main').count()>=1 and await p.locator('script[type=module]').count()>=1,e['id']
                report['entryPages'].append({'id':e['id'],'status':response.status,'title':await p.title()});save()
            await p.goto(base+'games/brook/');initial=await brook.snap(p);await p.wait_for_load_state('networkidle')
            await brook.begin(p);await p.locator('#speed').click();old,actions=await brook.complete(p,oldpilot,stage=1)
            assert old['state']=='won' and old['stats']['kills']==6
            assert old['resource']==initial['resource']+old['stats']['collected']-old['stats']['spent']
            report['previousGame']={'id':'brook','state':old['state'],'stats':old['stats'],'resource':old['resource'],'method':'Actual card/select/deploy/collect inputs with the offered 2x speed','actualLog':old['log']};save()
            await p.goto(base+'games/tide/');await snap(p);await p.wait_for_load_state('networkidle')
            clip=await p.locator('.skip').evaluate('(e)=>getComputedStyle(e).clipPath');assert clip=='inset(50%)'
            await p.keyboard.press('Tab');assert await p.locator('.skip').evaluate('(e)=>document.activeElement===e && getComputedStyle(e).top==="10px" && getComputedStyle(e).clipPath==="none"')
            await begin(p)
            await complete(p,pilot,stage=1,stop=lambda s:s['shot'] is not None)
            await p.keyboard.press('p');before=await snap(p);assert before['state']=='paused' and before['shot']
            await p.reload();after=await snap(p);await p.wait_for_load_state('networkidle')
            fields=['ticks','time','beads','shot','resolving','settleUntil','nextFire','nextSwap','current','next','bag','rng','slowUntil','slowLeft','backLeft','points','clearedIds','stats','log','accumulator','combo','nextId','revision','lastShot']
            assert after['state']=='paused' and all(after[k]==before[k] for k in fields)
            await p.keyboard.press('p');end,actions=await complete(p,pilot,stage=1)
            assert end['state']=='won' and end['stats']['originalCleared']==12
            assert '已完成' in await p.locator('#action-note').inner_text()
            report['restoreAndWin']={'state':end['state'],'exactFields':fields,'restoredTicks':after['ticks'],'stats':end['stats'],'actualLog':end['log']};save();await ctx.close()
            ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            await ctx.add_init_script('if(!localStorage.getItem("'+KEY+'"))localStorage.setItem("'+KEY+'",JSON.stringify({version:1,unlocked:1,last:1,tutorialSeen:true,sound:false}))')
            p=await ctx.new_page();watch(p);await p.goto(base+'games/tide/');await snap(p);await p.wait_for_load_state('networkidle')
            await p.locator('#primary-action').scroll_into_view_if_needed();r=await p.locator('#primary-action').bounding_box()
            await p.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2);await wait_state(p,lambda s:s['state']=='playing')
            end,actions=await complete(p,pilot,stage=1,touch=True)
            assert end['state']=='won' and end['stats']['originalCleared']==12
            assert '已完成' in await p.locator('#action-note').inner_text()
            report['nativeTouch']={'state':end['state'],'stats':end['stats'],'actualLog':end['log'],'method':'Native touchscreen start, aim/fire and swap taps; scroll positioning helper only'}
            await ctx.close();assert not errors and not bad and not failed,(errors,bad,failed)
            report['passed']=True;save();print(json.dumps({'passed':True,'entryPages':len(report['entryPages']),'previous':report['previousGame']['state'],'restore':report['restoreAndWin']['state'],'touch':report['nativeTouch']['state']}))
        finally:save();await b.close();await pilot.close();await oldpilot.close()

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/');a.add_argument('--out',default='.local/tide-final-smoke.json');asyncio.run(main(a.parse_args()))
