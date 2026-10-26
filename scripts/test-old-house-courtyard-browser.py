"""Local Chromium only: real keyboard/buttons, observation-only canvas telemetry, no state mutation."""
import json, math, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/old-house-qa/courtyard'
OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:4174/'
FIRST='classic-games-atlas:old-house-echoes:rescue:v1'
SECOND='classic-games-atlas:old-house-echoes:courtyard:v1'
SOURCE="""
import {modelDriver,route} from './scripts/old-house-routes.mjs';
import {persist} from './experiments/old-house-echoes/storage.mjs';
const s=await route(modelDriver(),'bypass');let raw;persist({setItem(k,v){raw=v;}},s,null);console.log(raw);
"""
first_raw=subprocess.check_output(['node','--input-type=module','-e',SOURCE],cwd=ROOT,text=True).strip()
TRACE="""
import {modelDriver,route,packedRecoveryRoute} from './scripts/old-house-courtyard-routes.mjs';
const all={};for(const style of ['clear','bypass','packed']){const d=modelDriver(),trace=[];for(const key of ['go','door','interact','inspect','use','combine','take','store','close','shoot','checkpoint','mark']){const fn=d[key];d[key]=async(...args)=>{trace.push([key,...args]);return fn.apply(d,args);};}await (style==='packed'?packedRecoveryRoute(d):route(d,style));all[style]=trace;}console.log(JSON.stringify(all));
"""
traces=json.loads(subprocess.check_output(['node','--input-type=module','-e',TRACE],cwd=ROOT,text=True))

def observe(page):return json.loads(page.locator('canvas').get_attribute('data-snapshot'))
class Driver:
    def __init__(self,page,prefix):self.page=page;self.prefix=prefix;self.keys=set();self.marks=[]
    def hold(self,keys,ms):
        for key in self.keys-keys:self.page.keyboard.up(key)
        for key in keys-self.keys:self.page.keyboard.down(key)
        self.keys=set(keys);self.page.clock.run_for(ms)
    def release(self):self.hold(set(),20)
    def go(self,x,y):
        self.page.locator('canvas').focus()
        for _ in range(500):
            s=observe(self.page);dx=x-s['x'];dy=y-s['y']
            if math.hypot(dx,dy)<.15:self.release();return
            assert s['mode']=='playing',s
            keys=set()
            if dx<-.09:keys.add('ArrowLeft')
            if dx>.09:keys.add('ArrowRight')
            if dy<-.09:keys.add('ArrowUp')
            if dy>.09:keys.add('ArrowDown')
            self.hold(keys,160 if math.hypot(dx,dy)>1 else 32)
        raise AssertionError(('blocked waypoint',x,y,observe(self.page)))
    def door(self,room):self.release();self.page.keyboard.press('e');self.page.clock.run_for(500);assert observe(self.page)['room']==room,(room,observe(self.page))
    def interact(self):self.release();self.page.keyboard.press('e');self.page.clock.run_for(20)
    def pack(self,action,item):
        self.release();was_open=self.page.locator('#panel').is_visible()
        if not was_open:self.page.keyboard.press('b')
        self.page.locator(f'[data-{action}="{item}"]').first.click();self.page.clock.run_for(20)
        if not was_open and observe(self.page)['mode'] not in ['won','lost']:self.close()
    def inspect(self,item):self.pack('inspect',item)
    def use(self,item):self.pack('use',item)
    def combine(self,a,b):
        self.release();was_open=self.page.locator('#panel').is_visible()
        if not was_open:self.page.keyboard.press('b')
        self.page.locator(f'[data-combine="{a}"]').first.click();self.page.locator(f'[data-combine="{b}"]').first.click();self.page.clock.run_for(20)
        if not was_open:self.close()
    def store(self,item):self.page.locator(f'[data-store="{item}"]').first.click();self.page.clock.run_for(20)
    def take(self,item):self.page.locator(f'[data-take="{item}"]').first.click();self.page.clock.run_for(20)
    def close(self):self.release();self.page.locator('#close-panel').click();self.page.clock.run_for(20)
    def shoot(self):self.page.locator('canvas').focus();self.hold({'Shift','ArrowUp','Space'},2350);self.release()
    def checkpoint(self):self.interact();assert '记录' in self.page.locator('#message').inner_text()
    def mark(self,label):
        if label in ['loadout','archive-marked','ledger-refused','loop-open','won']:
            self.page.screenshot(path=str(OUT/f'{self.prefix}-{label}.png'),full_page=True)
        self.marks.append({'mark':label,'state':observe(self.page)})

report={'evidence':'Local headless Chromium with normal keyboard, UI clicks and touch-pointer events; state observation only. Not a cloud browser, phone or human acceptance.','routes':{}}
def record():(OUT/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    # Without a completed first chapter, the second chapter cannot start or change either save.
    context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();page.goto(BASE+'experiments/old-house-echoes/courtyard/');page.locator('#welcome').wait_for(state='visible');assert page.locator('#start').is_disabled();assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND) is None;context.close()
    completed_raw=None
    for style in ['clear','bypass','packed']:
        context=browser.new_context(viewport={'width':1440,'height':1100});context.add_init_script('localStorage.setItem('+json.dumps(FIRST)+','+json.dumps(first_raw)+');localStorage.setItem("qa-other-save","unchanged");')
        page=context.new_page();errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url));page.clock.install();page.goto(BASE+'experiments/old-house-echoes/courtyard/');page.locator('#welcome').wait_for(state='visible');assert page.locator('#start').is_enabled();page.locator('#start').click();page.clock.run_for(40)
        driver=Driver(page,style)
        for command,*args in traces[style]:getattr(driver,command)(*args)
        final=observe(page);assert final['mode']=='won' and final['hp']==100;assert final['stats']['shots']==(4 if style=='clear' else 0);assert final['stats']['full']==(2 if style=='packed' else 0)
        assert page.evaluate('(k)=>localStorage.getItem(k)',FIRST)==first_raw;assert page.evaluate("localStorage.getItem('qa-other-save')")=='unchanged';assert not errors and not failed,(errors,failed)
        second_raw=page.evaluate('(k)=>localStorage.getItem(k)',SECOND);assert second_raw
        if style=='clear':completed_raw=second_raw
        page.locator('[data-result-action="retry"]').click();assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)==second_raw;page.locator('[data-cancel-reset]').click();assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)==second_raw
        page.reload();page.locator('#start').click();page.clock.run_for(40);assert observe(page)['mode']=='won';assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)==second_raw
        lobby=page.get_by_role('link',name='返回游戏大厅');box=lobby.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;assert lobby.evaluate('(el,p)=>document.elementFromPoint(p.x,p.y)===el',{'x':x,'y':y});page.mouse.click(x,y);page.wait_for_url(BASE+'#play');assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)==second_raw
        report['routes'][style]={'final':final,'marks':driver.marks,'firstSaveByteIdentical':True,'otherSaveUnchanged':True,'resultReloadAndCancelPreserveBytes':True,'errors':errors,'failedRequests':failed};record();print(json.dumps({'completed':style,'stats':final['stats']},ensure_ascii=False),flush=True)
        context.close()
    assert report['routes']['clear']['final']['stats']['distance']+20<report['routes']['bypass']['final']['stats']['distance']<report['routes']['packed']['final']['stats']['distance']-20
    context=browser.new_context();context.add_init_script('localStorage.setItem('+json.dumps(SECOND)+','+json.dumps(completed_raw)+');');page=context.new_page();page.goto(BASE+'experiments/old-house-echoes/courtyard/');page.locator('#welcome').wait_for(state='visible');assert page.locator('#start').is_enabled();assert '此前已解锁第二段' in page.locator('#resume-info').inner_text();context.close()
    context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script('localStorage.setItem('+json.dumps(FIRST)+','+json.dumps(first_raw)+');localStorage.setItem('+json.dumps(SECOND)+','+json.dumps(completed_raw)+');');page=context.new_page();page.goto(BASE+'experiments/old-house-echoes/courtyard/');page.locator('#welcome').wait_for(state='visible');page.locator('#start').click();page.screenshot(path=str(OUT/'390-result.png'),full_page=True)
    links=page.locator('.result-actions>a');assert links.count()==2;buttons=page.locator('.result-retry-actions button');assert buttons.count()==2;rects=[el.bounding_box() for el in [links.nth(0),links.nth(1),buttons.nth(0),buttons.nth(1)]];assert all(r['height']>=48 for r in rects);assert all(rects[i+1]['y']-rects[i]['y']-rects[i]['height']>=12 for i in range(3));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('[data-result-action="restart"]').click();assert page.locator('[data-confirm-reset]').is_visible();page.locator('[data-cancel-reset]').click();assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)==completed_raw;link=page.get_by_role('link',name='返回游戏大厅');r=link.bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2;assert link.evaluate('(el,p)=>document.elementFromPoint(p.x,p.y)===el',{'x':x,'y':y});page.mouse.click(x,y);page.wait_for_url(BASE+'#play');assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)==completed_raw;report['mobile390ResultPointerAndSave']=True;context.close()
    for action in ['retry','restart']:
        context=browser.new_context();context.add_init_script('localStorage.setItem('+json.dumps(FIRST)+','+json.dumps(first_raw)+');localStorage.setItem('+json.dumps(SECOND)+','+json.dumps(completed_raw)+');');page=context.new_page();page.goto(BASE+'experiments/old-house-echoes/courtyard/');page.locator('#welcome').wait_for(state='visible');page.locator('#start').click();page.locator('[data-result-action="'+action+'"]').click();assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)==completed_raw;page.locator('[data-confirm-reset]').click();state=observe(page);assert state['room']=='yard' and state['mode']=='playing' and state['loaded']==4 and state['reserve']==3
        assert state['inventory']==(['badge','sleeve','pistol','rounds','kit'] if action=='retry' else ['badge','sleeve'])
        assert page.evaluate('(k)=>localStorage.getItem(k)',FIRST)==first_raw;assert page.evaluate('(k)=>localStorage.getItem(k)',SECOND)!=completed_raw;context.close()
    report['confirmedRetryAndRestartIsolated']=True
    context=browser.new_context(viewport={'width':1440,'height':1000});context.add_init_script('localStorage.setItem('+json.dumps(FIRST)+','+json.dumps(first_raw)+');');page=context.new_page();page.goto(BASE);page.locator('#old-house-local a').click();assert '/play/' in page.url;page.locator('[data-independent="old-house-courtyard"] h3 a').click();assert '/courtyard/' in page.url;page.locator('#welcome').wait_for(state='visible');assert page.locator('#start').is_enabled();assert '已上线试玩' in page.locator('footer').inner_text()
    page.goto(BASE+'experiments/old-house-echoes/');page.locator('#welcome').wait_for(state='visible');page.locator('#start').click();assert page.locator('#panel-title').inner_text()=='雨檐之外，有人接应。';page.get_by_role('link',name='继续第二段 · 庭院与档案翼').click();assert '/courtyard/' in page.url;page.locator('#welcome').wait_for(state='visible');assert page.locator('#start').is_enabled();assert page.evaluate('(k)=>localStorage.getItem(k)',FIRST)==first_raw;report['entryAndCompletedContinuation']=True;context.close()
    # Narrow and wide actual layout pixels and touch release. No simulated state edits.
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);context.add_init_script('localStorage.setItem('+json.dumps(FIRST)+','+json.dumps(first_raw)+');')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install();page.goto(BASE+'experiments/old-house-echoes/courtyard/');page.locator('#welcome').wait_for(state='visible');page.screenshot(path=str(OUT/'390-intro.png'),full_page=True);page.locator('#start').click();page.clock.run_for(40);page.screenshot(path=str(OUT/'390-yard.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    touch_driver=Driver(page,'touch');touch_driver.go(7,7);touch_driver.go(5,7);touch_driver.interact();touch_driver.take('pistol');touch_driver.close()
    up=page.locator('[data-hold="up"]');aim=page.locator('[data-hold="aim"]');fire=page.locator('[data-hold="fire"]');initial=observe(page)
    up.dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch','bubbles':True});page.clock.run_for(400);up.dispatch_event('pointerup',{'pointerId':1,'pointerType':'touch','bubbles':True});page.clock.run_for(30);moved=observe(page);assert moved['y']<initial['y']-.8
    aim.dispatch_event('pointerdown',{'pointerId':2,'pointerType':'touch','bubbles':True});up.dispatch_event('pointerdown',{'pointerId':3,'pointerType':'touch','bubbles':True});fire.dispatch_event('pointerdown',{'pointerId':4,'pointerType':'touch','bubbles':True});page.clock.run_for(100);aimed=observe(page);assert abs(aimed['y']-moved['y'])<.1 and aimed['stats']['shots']==1
    for el,pid in [(aim,2),(up,3),(fire,4)]:el.dispatch_event('pointercancel',{'pointerId':pid,'pointerType':'touch','bubbles':True})
    page.clock.run_for(700);released=observe(page);assert abs(released['y']-aimed['y'])<.01 and released['stats']['shots']==1
    up.dispatch_event('pointerdown',{'pointerId':5,'pointerType':'touch','bubbles':True});page.clock.run_for(100);up.dispatch_event('lostpointercapture',{'pointerId':5,'pointerType':'touch','bubbles':True});page.clock.run_for(20);a=observe(page);page.clock.run_for(300);assert observe(page)['y']==a['y']
    page.evaluate("window.dispatchEvent(new Event('blur'))");page.clock.run_for(20);assert observe(page)['mode']=='paused';a=observe(page);page.clock.run_for(300);assert observe(page)['y']==a['y'];page.get_by_role('button',name='继续巡查',exact=True).click();page.clock.run_for(300);assert observe(page)['y']==a['y']
    page.locator('#pause').click();before=observe(page);page.reload();page.locator('#start').click();page.clock.run_for(40);after=observe(page);assert after['mode']=='paused' and after['x']==before['x'] and after['y']==before['y'] and after['loaded']==before['loaded'];page.screenshot(path=str(OUT/'390-paused.png'),full_page=True);assert not errors,errors
    report['mobile390']={'noHorizontalOverflow':True,'touchMove':True,'aimFireAndRelease':True,'captureRelease':True,'blurPauseAndResume':True,'reloadPausedSameResources':True,'errors':errors};context.close()
    report['passed']=True;record();browser.close()
print(json.dumps({'passed':True,'routes':list(report['routes']),'report':str(OUT/'browser-report.json')},ensure_ascii=False))
