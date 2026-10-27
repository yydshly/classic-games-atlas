"""Local Chromium QA of chapters 4-6 using real keyboard/touch events.

Start a static server at the repository root, then run this script. A legal
three/four/five-chapter save is inserted only to skip already-tested chapters;
new chapters are played through the page's actual controls, without changing
player, enemy, crate, goal, physics or result state.
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SAVE_KEY='classic-games-atlas:crate-courier:journey:v1'
KEYS={'left':'ArrowLeft','right':'ArrowRight','jump':'Space','action':'j','down':'ArrowDown'}
FIXTURES="""
import {campaignLower,chapterFourRoute,chapterFiveLower,chapterFiveBypass,chapterFiveUpper,chapterSixLower} from './experiments/crate-courier/routes.mjs';
import {encodeSave} from './experiments/crate-courier/storage.mjs';
const cases=[['four',campaignLower,chapterFourRoute],['five-lower',chapterFourRoute,chapterFiveLower],['five-bypass',chapterFourRoute,chapterFiveBypass],['five-upper',chapterFourRoute,chapterFiveUpper],['six',chapterFiveLower,chapterSixLower]];
console.log(JSON.stringify(cases.map(([name,initial,route])=>{const r=route(),last=r.runs.findLastIndex(s=>s.command==='next');return {name,save:encodeSave(initial().game),runs:r.runs.slice(last),expected:{stageIndex:r.game.stageIndex,hp:r.game.player.hp,phase:r.game.phase,ticks:r.game.tick}};})));
"""
CLOCK="""window.__frames=[];window.__clock=1;window.requestAnimationFrame=fn=>(__frames.push(fn),__frames.length);window.__pump=n=>{for(let i=0;i<n;i++){const f=__frames.shift();if(!f)throw Error('missing frame');__clock+=1000/120+.00001;f(__clock);}};if(!sessionStorage.getItem('__crateQaSeeded')){localStorage.setItem('%s',%s);sessionStorage.setItem('__crateQaSeeded','1');}"""

def boot(context,url):
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(url,wait_until='load')
    page.wait_for_function('window.__frames?.length>0',polling=50,timeout=10000)
    page.evaluate('__pump(1)')
    return page,errors

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8765/experiments/crate-courier/');parser.add_argument('--out',default='.local/crate-courier/extension-browser');args=parser.parse_args()
    output=ROOT/args.out;output.mkdir(parents=True,exist_ok=True)
    rows=json.loads(subprocess.run(['node','--input-type=module','-e',FIXTURES],cwd=ROOT,capture_output=True,text=True,check=True).stdout)
    report=[]
    with sync_playwright() as playwright:
        launch={'headless':True,'args':['--no-sandbox']}
        if chromium:=shutil.which('chromium'):launch['executable_path']=chromium
        browser=playwright.chromium.launch(**launch)
        for row in rows:
            context=browser.new_context(viewport={'width':390 if row['name']=='four' else 1200,'height':844},device_scale_factor=1)
            context.add_init_script(CLOCK%(SAVE_KEY,json.dumps(row['save'])))
            page,errors=boot(context,args.url)
            assert page.locator('#next').is_visible(),row['name']
            page.locator('#next').click();page.evaluate('__pump(1)')
            if row['name']=='four':page.screenshot(path=str(output/'level4-ready-390.png'),full_page=True)
            page.locator('#start').click();page.evaluate('__pump(1)')
            held=set()
            for segment in row['runs']:
                if 'command' in segment:continue
                wanted={key for key,value in json.loads(segment['keys']).items() if value}
                for key in held-wanted:page.keyboard.up(KEYS[key])
                for key in wanted-held:page.keyboard.down(KEYS[key])
                held=wanted;page.evaluate('(n)=>__pump(n)',segment['frames'])
            for key in held:page.keyboard.up(KEYS[key])
            saved=json.loads(page.evaluate('(key)=>localStorage.getItem(key)',SAVE_KEY))['game']
            actual={'stageIndex':saved['stageIndex'],'hp':saved['player']['hp'],'phase':saved['phase'],'ticks':saved['tick']}
            assert actual==row['expected'],(row['name'],actual,row['expected'])
            assert page.locator('#fatal').is_hidden() and not errors,(row['name'],errors)
            overflow=page.evaluate('document.documentElement.scrollWidth-innerWidth');assert overflow<=0,(row['name'],overflow)
            page.screenshot(path=str(output/(row['name']+'-result.png')),full_page=True)
            report.append({'route':row['name'],'normalInput':True,'expected':row['expected'],'actual':actual,'overflow':overflow,'pageErrors':errors})
            if row['name']=='six':
                page.locator('header a').click();assert page.url.rstrip('/')==args.url.split('/experiments/crate-courier/')[0]
                page.locator('a.entry-index-nav').click();assert page.url.rstrip('/').endswith('/play')
                page.locator('[data-quick-entry="crate-courier"]').click();assert '/experiments/crate-courier/' in page.url
                report[-1]['returnAndPlayEntry']=True
            context.close()
        touch=rows[0];context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
        context.add_init_script(CLOCK%(SAVE_KEY,json.dumps(touch['save'])))
        page,errors=boot(context,args.url);page.locator('#next').tap();page.evaluate('__pump(1)');page.locator('#start').tap();page.evaluate('__pump(1)')
        cdp=context.new_cdp_session(page)
        def center(selector):
            box=page.locator(selector).bounding_box();return {'x':round(box['x']+box['width']/2),'y':round(box['y']+box['height']/2)}
        right=center('[data-control=right]');jump=center('[data-control=jump]')
        def touch_event(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[dict(id=identifier,**position) for identifier,position in points]})
        touch_event('touchStart',[(1,right)]);page.evaluate('__pump(20)')
        touch_event('touchStart',[(1,right),(2,jump)]);page.evaluate('__pump(22)')
        touch_event('touchEnd',[(1,right)]);page.evaluate('__pump(12)')
        touch_event('touchEnd',[]);page.evaluate('__pump(5)')
        page.locator('#pause').tap()
        paused=json.loads(page.evaluate('(key)=>localStorage.getItem(key)',SAVE_KEY))['game']
        assert paused['phase']=='paused' and paused['player']['x']>110 and paused['run']['jumps']==1
        page.evaluate('__pump(30)');page.locator('#pause').tap();page.evaluate('__pump(20)');page.locator('#pause').tap()
        after=json.loads(page.evaluate('(key)=>localStorage.getItem(key)',SAVE_KEY))['game']
        assert after['player']['x']==paused['player']['x'] and after['tick']>paused['tick']
        page.screenshot(path=str(output/'touch-390-paused.png'),full_page=True)
        page.reload();page.wait_for_function('window.__frames?.length>0',polling=50,timeout=10000)
        assert page.locator('#pause').inner_text()=='继续' and not errors
        overflow=page.evaluate('document.documentElement.scrollWidth-innerWidth');assert overflow<=0
        report.append({'route':'390-native-touch-multitouch','normalInput':True,'xAfterWalk':paused['player']['x'],'jumps':paused['run']['jumps'],'pausedTick':paused['tick'],'resumedTick':after['tick'],'releasedDirectionStable':True,'reloadPaused':True,'overflow':overflow,'pageErrors':errors})
        context.close();browser.close()
    (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
