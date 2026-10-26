"""Local Chromium only. Read-only telemetry guides ordinary keyboard/menu inputs.
Never sets game state, inventory, flags, enemy health, or completion status.
Screenshots and reports remain under ignored .local/old-house-qa/.
"""
import json, math, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/old-house-qa'
OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:4174/'
TRACE="""
import {modelDriver,route} from './scripts/old-house-routes.mjs';
const all={};for(const style of ['clear','bypass']){const d=modelDriver(),trace=[];for(const key of ['go','door','interact','pack','combine','store','take','close','shoot','mark','checkpoint']){const fn=d[key];d[key]=async(...args)=>{trace.push([key,...args]);return fn.apply(d,args);};}await route(d,style);all[style]=trace;}console.log(JSON.stringify(all));
"""
traces=json.loads(subprocess.check_output(['node','--input-type=module','-e',TRACE],cwd=ROOT,text=True))

def observe(page):
    return json.loads(page.locator('canvas').get_attribute('data-snapshot'))

class Driver:
    def __init__(self,page,prefix): self.page=page; self.prefix=prefix; self.keys=set(); self.checkpoints=[]
    def hold(self,keys,ms):
        for key in self.keys-keys: self.page.keyboard.up(key)
        for key in keys-self.keys: self.page.keyboard.down(key)
        self.keys=set(keys); self.page.clock.run_for(ms)
    def release(self): self.hold(set(),20)
    def go(self,x,y):
        self.page.locator('canvas').focus()
        for _ in range(500):
            s=observe(self.page); dx=x-s['x'];dy=y-s['y']
            if math.hypot(dx,dy)<.15: self.release(); return
            assert s['mode']=='playing',s
            keys=set()
            if dx<-.09: keys.add('ArrowLeft')
            if dx>.09: keys.add('ArrowRight')
            if dy<-.09: keys.add('ArrowUp')
            if dy>.09: keys.add('ArrowDown')
            self.hold(keys,160 if math.hypot(dx,dy)>1 else 32)
        raise AssertionError(('blocked waypoint',x,y,observe(self.page)))
    def door(self,room):
        self.release();self.page.keyboard.press('e');self.page.clock.run_for(500);assert observe(self.page)['room']==room,(room,observe(self.page))
    def interact(self): self.release();self.page.keyboard.press('e');self.page.clock.run_for(20)
    def pack(self,action,item):
        self.release();was_open=self.page.locator('#panel').is_visible()
        if not was_open:self.page.keyboard.press('b')
        self.page.locator(f'[data-{action}="{item}"]').first.click();self.page.clock.run_for(20)
        if not was_open and observe(self.page)['mode'] not in ['won','lost']:self.close()
    def combine(self,a,b):
        self.release();was_open=self.page.locator('#panel').is_visible()
        if not was_open:self.page.keyboard.press('b')
        self.page.locator(f'[data-combine="{a}"]').first.click();self.page.locator(f'[data-combine="{b}"]').first.click();self.page.clock.run_for(20)
        if not was_open:self.close()
    def store(self,item):self.page.locator(f'[data-store="{item}"]').first.click();self.page.clock.run_for(20)
    def take(self,item):self.page.locator(f'[data-take="{item}"]').first.click();self.page.clock.run_for(20)
    def close(self):self.release();self.page.locator('#close-panel').click();self.page.clock.run_for(20)
    def shoot(self):self.page.locator('canvas').focus();self.hold({'Shift','ArrowUp','Space'},2350);self.release()
    def mark(self,label):
        self.page.screenshot(path=str(OUT/f'{self.prefix}-{label}.png'),full_page=True)
        self.checkpoints.append({'mark':label,'state':observe(self.page),'visibleMessage':self.page.locator('#message').inner_text()})
    def checkpoint(self):self.interact();assert '记录' in self.page.locator('#message').inner_text()

def start(page):
    page.clock.install();page.goto(BASE+'experiments/old-house-echoes/');page.locator('#start').click();page.clock.run_for(40)

report={'evidence':'Real local headless Chromium; normal keyboard, clicks and pointer events. Telemetry is observed only. No cloud browser, deployment, upload or human-quality claim.','routes':{}}
def record(): (OUT/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for style in ['clear','bypass']:
        context=browser.new_context(viewport={'width':1440,'height':1100});page=context.new_page();errors=[];failed=[]
        page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url))
        start(page);driver=Driver(page,style)
        for command,*args in traces[style]:getattr(driver,command)(*args)
        final=observe(page);assert final['mode']=='won';assert final['hp']==100
        assert final['stats']['shots']==(4 if style=='clear' else 0)
        assert final['enemy']['hp']==(0 if style=='clear' else 4)
        assert not errors and not failed,(errors,failed)
        # Terminal retry cancel returns to the result. Reload restores that result.
        page.locator('#panel').get_by_role('button',name='从记录点重试',exact=True).click();page.get_by_role('button',name='保留当前现场',exact=True).click()
        assert '雨檐之外' in page.locator('#panel-title').inner_text()
        page.reload();page.locator('#start').click();page.clock.run_for(40);assert observe(page)['mode']=='won'
        report['routes'][style]={'final':final,'checkpoints':driver.checkpoints,'consoleErrors':errors,'requestFailures':failed,'resultReload':True,'resultRetryCancel':True}
        # A confirmed retry restores the actual earlier resource snapshot, not a refill.
        page.locator('#panel').get_by_role('button',name='从记录点重试',exact=True).click();page.locator('[data-confirm-reset]').click();page.clock.run_for(30)
        retried=observe(page);assert retried['room']=='duty' and retried['mode']=='playing';assert retried['enemy']['hp']==4 and retried['loaded']==4;assert retried['flags']['loop'] and retried['inventory']==['pistol','rounds','herb','cloth','flare','wire']
        report['routes'][style]['recordedRetry']=True;record()
        print(json.dumps({'completed':style,'stats':final['stats']},ensure_ascii=False),flush=True)
        context.close()
    assert report['routes']['bypass']['final']['stats']['distance']>report['routes']['clear']['final']['stats']['distance']+35
    # Entry journey in a fresh context: root -> static index -> game -> root.
    context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();page.goto(BASE)
    page.locator('#old-house-local a').click();assert '/play/' in page.url
    page.locator('[data-independent="old-house-echoes"] h3 a').click();page.locator('#start').click();page.locator('header a').click();assert page.url==BASE+'#play'
    report['entryJourney']=True;context.close()
    # Deliberately carry uncompressed medical supplies: actual pickup failures force a return.
    context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();start(page);d=Driver(page,'pressure')
    d.go(10,2.3);d.door('corridor');d.go(11.2,11.4);d.go(11.2,2.3);d.go(10,2.3);d.door('library')
    assert observe(page)['hp']==100 and observe(page)['enemy']['hp']==4
    d.go(10,3.8);d.interact();d.pack('inspect','key');d.go(10,7);d.go(17.6,7);d.pack('use','key');d.door('archive');d.go(3,2.5);d.go(11.5,2.5);d.go(12,5);d.interact()
    assert observe(page)['stats']['full']==1 and 'fuse' not in observe(page)['inventory'];d.mark('full-before-fuse');d.combine('herb','cloth');d.interact();assert 'fuse' in observe(page)['inventory']
    for x,y in [(11.5,2.5),(3,2.5),(2.4,7)]:d.go(x,y)
    d.door('library')
    for x,y in [(10,7),(10,4.8),(2.5,4.8),(2.5,7)]:d.go(x,y)
    d.door('greenhouse')
    for x,y in [(17.8,3),(17.8,10.8),(4.5,10.5)]:d.go(x,y)
    d.interact();assert observe(page)['stats']['full']==2 and 'wire' not in observe(page)['inventory'];d.mark('full-before-wire')
    d.go(10,11.2);d.door('duty');d.go(10,7);d.go(5,7);d.interact();d.store('rounds');d.close();d.go(10,7);d.go(10,2.5);d.door('greenhouse');d.go(4.5,10.5);d.interact()
    pressure=observe(page);assert 'wire' in pressure['inventory'] and 'rounds' in pressure['box'];assert pressure['stats']['shots']==0 and pressure['hp']==100
    report['pressureAndDodge']={'final':pressure,'blockedPickups':2,'compressionFreedOneSlot':True,'returnToStorageRequiredForSecondPickup':True,'normalDodgeWithoutDamage':True};record();context.close()
    # A real 390 CSS-pixel browser with synthetic touch-pointer events, not a phone.
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);page=context.new_page();start(page)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.screenshot(path=str(OUT/'mobile-intro-play.png'),full_page=True);d=Driver(page,'mobile')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    initial=observe(page);up=page.locator('[data-hold="up"]');aim=page.locator('[data-hold="aim"]');fire=page.locator('[data-hold="fire"]')
    up.dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch','bubbles':True});page.clock.run_for(400)
    up.dispatch_event('pointerup',{'pointerId':1,'pointerType':'touch','bubbles':True});page.clock.run_for(30);moved=observe(page);assert moved['y']<initial['y']-.8
    aim.dispatch_event('pointerdown',{'pointerId':2,'pointerType':'touch','bubbles':True});up.dispatch_event('pointerdown',{'pointerId':3,'pointerType':'touch','bubbles':True});fire.dispatch_event('pointerdown',{'pointerId':4,'pointerType':'touch','bubbles':True});page.clock.run_for(100);aimed=observe(page);assert abs(aimed['y']-moved['y'])<.1;assert aimed['stats']['shots']==1
    for el,pid in [(aim,2),(up,3),(fire,4)]:el.dispatch_event('pointercancel',{'pointerId':pid,'pointerType':'touch','bubbles':True})
    page.clock.run_for(700);released=observe(page);assert abs(released['y']-aimed['y'])<.01;assert released['stats']['shots']==1
    # Losing pointer capture must also release the held direction.
    up.dispatch_event('pointerdown',{'pointerId':5,'pointerType':'touch','bubbles':True});page.clock.run_for(100);up.dispatch_event('lostpointercapture',{'pointerId':5,'pointerType':'touch','bubbles':True});page.clock.run_for(20);a=observe(page);page.clock.run_for(300);assert observe(page)['y']==a['y']
    # Blur is an ordinary browser event and pauses. Resume requires a new press.
    page.evaluate("window.dispatchEvent(new Event('blur'))");page.clock.run_for(20);assert observe(page)['mode']=='paused';a=observe(page);page.clock.run_for(500);assert observe(page)['y']==a['y']
    page.get_by_role('button',name='继续救援',exact=True).click();page.clock.run_for(300);assert observe(page)['y']==a['y']
    # Save/reload opens a paused resume with position/resources intact.
    page.locator('#pause').click();before=observe(page);page.reload();page.locator('#start').click();page.clock.run_for(30);after=observe(page);assert after['mode']=='paused';assert after['x']==before['x'] and after['y']==before['y'];assert after['loaded']==before['loaded']
    page.screenshot(path=str(OUT/'mobile-paused.png'),full_page=True)
    assert not errors,errors
    report['mobile390']={'noHorizontalOverflow':True,'touchMove':True,'multiPointerAimFire':True,'cancelAndCaptureRelease':True,'blurPause':True,'resumeRequiresNewInput':True,'reloadPausedSameResources':True,'consoleErrors':errors,'evidence':'Chromium mobile emulation and synthetic pointer events; no physical touch device.'};record();context.close()
    # Storage fault fixtures are isolated from all completion routes above.
    context=browser.new_context();context.add_init_script("localStorage.setItem('classic-games-atlas:old-house-echoes:rescue:v1','broken-original-bytes');localStorage.setItem('unrelated-game-save','unchanged');")
    page=context.new_page();start(page);page.locator('#pause').click();assert '不覆盖' in page.locator('#save-status').inner_text();assert page.evaluate("localStorage.getItem('classic-games-atlas:old-house-echoes:rescue:v1')")=='broken-original-bytes';assert page.evaluate("localStorage.getItem('unrelated-game-save')")=='unchanged';context.close()
    context=browser.new_context();context.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('QA quota fixture','QuotaExceededError')}");page=context.new_page();start(page);assert '保存失败' in page.locator('#save-status').inner_text();assert observe(page)['mode']=='playing';context.close()
    report['storageFaultFixtures']={'corruptBytesPreserved':True,'unrelatedKeyPreserved':True,'quotaFailureRemainsPlayable':True,'evidence':'Explicit localStorage fault fixtures, separate from normal-input completion evidence.'};report['passed']=True;record()
    browser.close()
(OUT/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':True,'report':str(OUT/'browser-report.json')},ensure_ascii=False))
