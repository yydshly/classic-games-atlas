"""Local Chromium only. Read-only telemetry guides ordinary keyboard/menu inputs.
Never sets game state, inventory, flags, enemy health, or completion status.
Screenshots and reports remain under ignored .local/old-house-qa/.
"""
import json, math, subprocess, sys, hashlib, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/old-house-qa'
OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('OLD_HOUSE_BASE','http://127.0.0.1:4174/')

def result_actions_only():
    """Isolated completed-save UI fixtures, not new human/gameplay completion evidence."""
    fixture_source="""
import assert from 'node:assert/strict';
import {modelDriver,route} from './scripts/old-house-routes.mjs';
import {createGame,tick,snapshot} from './experiments/old-house-echoes/engine.mjs';
import {persist} from './experiments/old-house-echoes/storage.mjs';
const completed=modelDriver();await route(completed,'bypass');
const failed=modelDriver();await failed.go(10,2.3);await failed.door('corridor');
for(let i=0;i<2400&&failed.state().mode!=='lost';i++)tick(failed.state(),{});
assert.equal(failed.state().mode,'lost');
function bytes(s,checkpoint){let raw;assert(persist({setItem(k,v){raw=v;}},s,checkpoint));return raw;}
console.log(JSON.stringify({won:bytes(completed.state(),completed.recorded),lost:bytes(failed.state(),snapshot(createGame()))}));
"""
    fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',fixture_source],cwd=ROOT,text=True))
    key='classic-games-atlas:old-house-echoes:rescue:v1'
    evidence={'scope':'Local Chromium geometry and actual coordinate/locator clicks plus keyboard. Valid engine-generated completed/lost save fixtures; no new human completion, native-device, combat, capacity or held-touch acceptance claim.','cases':[]}
    def saved(page):return page.evaluate('(key)=>localStorage.getItem(key)',key)
    def state(page):return json.loads(page.locator('canvas').get_attribute('data-snapshot'))
    def digest(raw):return hashlib.sha256(raw.encode()).hexdigest()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        for width,height in [(390,844),(1440,1100)]:
            for terminal in ['won','lost']:
                raw=fixtures[terminal];context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();page.set_default_timeout(10000);errors=[];hits=[];requests=[]
                context.add_init_script("if(localStorage.getItem("+json.dumps(key)+")===null){localStorage.setItem("+json.dumps(key)+","+json.dumps(raw)+");localStorage.setItem('qa-unrelated-save','unchanged');}")
                page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda req:requests.append(req.url))
                def console(msg):
                    if msg.text.startswith('RESULT_POINTER:'):hits.append(json.loads(msg.text[len('RESULT_POINTER:'):]))
                page.on('console',console)
                def open_result():
                    page.goto(BASE+'experiments/old-house-echoes/');page.locator('#start').click();assert state(page)['mode']==terminal;assert saved(page)==raw
                    assert any('/main.mjs?v=echoes-slice-1-result-4' in url for url in requests) and any('/style.css?v=echoes-slice-1-welcome-exit-1' in url for url in requests)
                    page.evaluate("document.addEventListener('pointerdown',e=>{const t=e.target.closest('a,button');console.log('RESULT_POINTER:'+JSON.stringify(t?{tag:t.tagName,text:t.textContent.trim(),action:t.dataset.resultAction||null,returned:t.dataset.resultReturn||null,cancel:t.dataset.cancelReset||null,confirm:t.dataset.confirmReset||null}:null));},true)")
                def coordinate_click(selector,fx=.5,fy=.5):
                    el=page.locator(selector);el.scroll_into_view_if_needed();box=el.bounding_box();x=box['x']+box['width']*fx;y=box['y']+box['height']*fy
                    hit=el.evaluate('(el,p)=>{const t=document.elementFromPoint(p.x,p.y);return t===el||el.contains(t)}',{'x':x,'y':y});assert hit,(selector,box,x,y)
                    with page.expect_console_message(predicate=lambda msg:msg.text.startswith('RESULT_POINTER:'),timeout=3000) as pointer:
                        page.mouse.click(x,y)
                    return json.loads(pointer.value.text[len('RESULT_POINTER:'):])
                def unchanged():
                    assert saved(page)==raw;assert state(page)['mode']==terminal
                    assert page.evaluate("localStorage.getItem('qa-unrelated-save')")=='unchanged'
                open_result();initial=state(page)
                geometry=page.locator('#panel-content').evaluate("""el=>{
const nodes=[...el.querySelectorAll('[data-result-return],.result-retry-actions button')];
return nodes.map(n=>{const b=n.getBoundingClientRect();return {text:n.textContent,rect:{x:b.x,y:b.y,width:b.width,height:b.height},fragments:[...n.getClientRects()].length};});}
""")
                assert len(geometry)==3 and all(g['fragments']==1 and g['rect']['height']>=48 for g in geometry)
                link,retry,restart=[g['rect']for g in geometry]
                assert retry['y']-link['y']-link['height']>=19
                if width==390:assert restart['y']-retry['y']-retry['height']>=11
                else:assert restart['x']-retry['x']-retry['width']>=11
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(OUT/f'result-hit-after-{terminal}-{width}.png'),full_page=True)
                cancellations=[]
                for action in ['retry','restart']:
                    selector='[data-result-action="'+action+'"]'
                    for method in ['cancel-button','Escape','close-button','keyboard-cancel']:
                        actual=coordinate_click(selector);assert actual['action']==action and not actual['returned'];assert state(page)==initial;unchanged()
                        title=page.locator('#panel-title').inner_text();assert title==('重试本次救援'if action=='retry'else'重新开始救援')
                        assert page.locator('[data-confirm-reset]').is_visible();assert page.locator('[data-cancel-reset]').is_visible()
                        cancel_box=page.locator('[data-cancel-reset]').bounding_box();confirm_box=page.locator('[data-confirm-reset]').bounding_box();assert min(cancel_box['height'],confirm_box['height'])>=48
                        if width==390:assert confirm_box['y']-cancel_box['y']-cancel_box['height']>=11
                        else:assert confirm_box['x']-cancel_box['x']-cancel_box['width']>=11
                        if terminal=='won' and method=='cancel-button':page.screenshot(path=str(OUT/f'result-confirm-{action}-{width}.png'),full_page=True)
                        if method=='cancel-button':assert coordinate_click('[data-cancel-reset]')['cancel']=='yes'
                        elif method=='Escape':page.keyboard.press('Escape')
                        elif method=='close-button':coordinate_click('#close-panel')
                        else:
                            assert page.locator('[data-cancel-reset]').evaluate('el=>el===document.activeElement')
                            page.keyboard.press('Tab');assert page.locator('[data-confirm-reset]').evaluate('el=>el===document.activeElement')
                            page.keyboard.press('Shift+Tab');page.keyboard.press('Enter')
                        unchanged();assert state(page)==initial;assert page.locator(selector).evaluate('el=>el===document.activeElement');cancellations.append(action+':'+method)
                returned=[]
                for fx,fy in [(.5,.5),(.5,.08),(.5,.92),(.02,.5),(.98,.5)]:
                    actual=coordinate_click('[data-result-return]',fx,fy);assert actual['returned']=='yes' and actual['tag']=='A'
                    page.wait_for_url(BASE+'#play');assert saved(page)==raw;returned.append({'point':[fx,fy],'actualPointerTarget':actual});open_result()
                page.locator('[data-result-return]').click();page.wait_for_url(BASE+'#play');assert saved(page)==raw;open_result()
                page.locator('[data-result-return]').focus();page.keyboard.press('Enter');page.wait_for_url(BASE+'#play');assert saved(page)==raw;open_result()
                # The focused retry button still supports Enter; Enter on the default cancel is safe.
                page.locator('[data-result-action="retry"]').focus();page.keyboard.press('Enter');assert page.locator('[data-cancel-reset]').evaluate('el=>el===document.activeElement');page.keyboard.press('Enter');unchanged()
                assert not errors,errors
                evidence['cases'].append({'viewport':[width,height],'terminal':terminal,'geometry':geometry,'coordinateReturns':returned,'locatorReturn':True,'keyboardReturnAndCancel':True,'cancellations':cancellations,'saveSha256BeforeAndAfter':digest(raw),'byteIdenticalSaveAndRecord':True,'mainCacheKey':'echoes-slice-1-result-4','styleCacheKey':'echoes-slice-1-welcome-exit-1','scriptErrors':errors})
                context.close()
        # A reset occurs only after the separate explicit confirmation, in isolated contexts.
        for action in ['retry','restart']:
            raw=fixtures['won'];context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script('localStorage.setItem('+json.dumps(key)+','+json.dumps(raw)+');');page=context.new_page();page.goto(BASE+'experiments/old-house-echoes/');page.locator('#start').click()
            page.locator('[data-result-action="'+action+'"]').click();assert saved(page)==raw and state(page)['mode']=='won'
            confirm=page.locator('[data-confirm-reset]');box=confirm.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;assert confirm.evaluate('(el,p)=>document.elementFromPoint(p.x,p.y)===el',{'x':x,'y':y});page.mouse.click(x,y);current=state(page);assert current['mode']=='playing';assert current['room']==('duty'if action=='retry'else'hall');assert saved(page)!=raw
            if action=='retry':
                record=json.loads(raw)['checkpoint'];assert current['inventory']==record['inventory'] and current['stats']==record['stats']
            evidence[action+'RequiresConfirmation']=True;context.close()
        browser.close()
    evidence['passed']=True;(OUT/'result-hit-regression.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':True,'resultCases':len(evidence['cases']),'report':str(OUT/'result-hit-regression.json')},ensure_ascii=False))

def welcome_exit_only():
    """Check the visible modal exit with fresh, paused, and completed saves."""
    fixture_source="""
import {modelDriver,route} from './scripts/old-house-routes.mjs';
import {persist} from './experiments/old-house-echoes/storage.mjs';
const driver=modelDriver();await route(driver,'bypass');
let raw;persist({setItem(key,value){raw=value;}},driver.state(),driver.recorded);
console.log(JSON.stringify({won:raw}));
"""
    won=json.loads(subprocess.check_output(['node','--input-type=module','-e',fixture_source],cwd=ROOT,text=True))['won']
    key='classic-games-atlas:old-house-echoes:rescue:v1'
    out=ROOT/'.local/old-house-welcome-qa';out.mkdir(parents=True,exist_ok=True)
    evidence={'scope':'Local Chromium modal navigation with ordinary mouse, touch and keyboard. Won save is generated by the game model, not a new player completion.','cases':[]}
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        for width,height in [(390,844),(1200,900)]:
            for kind in ['fresh','ongoing','won']:
                context=browser.new_context(viewport={'width':width,'height':height},is_mobile=width==390,has_touch=width==390)
                if kind=='won':
                    context.add_init_script('if(localStorage.getItem('+json.dumps(key)+')===null)localStorage.setItem('+json.dumps(key)+','+json.dumps(won)+');')
                page=context.new_page();page.set_default_timeout(10000);errors=[];requests=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('request',lambda req:requests.append(req.url))
                page.goto(BASE+'experiments/old-house-echoes/')
                page.evaluate("localStorage.setItem('qa-unrelated-save','untouched')")
                if kind=='ongoing':
                    page.locator('#start').click();page.locator('#pause').click();page.reload()
                assert page.locator('#welcome').evaluate("el=>el.open&&el.matches(':modal')")
                assert page.locator('#start').is_visible()
                if kind=='ongoing':assert '继续' in page.locator('#start').inner_text()
                if kind=='won':assert '上次' in page.locator('#start').inner_text()
                before=page.evaluate('(key)=>localStorage.getItem(key)',key)
                link=page.locator('#welcome .welcome-actions a');link.scroll_into_view_if_needed()
                boxes=[page.locator('#start').bounding_box(),link.bounding_box()]
                assert all(box and box['height']>=48 for box in boxes),boxes
                first,second=boxes
                if width==390:assert second['y']-first['y']-first['height']>=11,boxes
                else:assert second['x']-first['x']-first['width']>=11,boxes
                assert link.evaluate('el=>{const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===el}')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                assert any('/style.css?v=echoes-slice-1-welcome-exit-1' in url for url in requests)
                assert any('/main.mjs?v=echoes-slice-1-result-4' in url for url in requests)
                page.screenshot(path=str(out/f'welcome-{kind}-{width}.png'))
                if kind=='fresh' and width==390:link.tap()
                elif kind=='ongoing':link.focus();page.keyboard.press('Enter')
                else:link.click()
                page.wait_for_url(BASE+'#play')
                assert page.evaluate('(key)=>localStorage.getItem(key)',key)==before
                assert page.evaluate("localStorage.getItem('qa-unrelated-save')")=='untouched'
                page.locator('a.entry-index-nav').click();page.wait_for_url(BASE+'play/')
                page.locator('[data-independent="old-house-echoes"] h3 a').click()
                page.wait_for_url(BASE+'experiments/old-house-echoes/?v=echoes-slice-1-welcome-exit-1')
                assert page.locator('#welcome').is_visible()
                assert page.evaluate('(key)=>localStorage.getItem(key)',key)==before
                if kind=='ongoing':
                    page.locator('#start').click();assert page.locator('#panel').is_visible()
                    assert page.locator('#panel-title').inner_text()=='在这里停一会儿'
                if kind=='won':
                    page.locator('#start').click();assert page.locator('#panel-title').inner_text()=='雨檐之外，有人接应。'
                assert not errors,errors
                evidence['cases'].append({'viewport':[width,height],'save':kind,'returnMethod':'tap' if kind=='fresh' and width==390 else 'Enter' if kind=='ongoing' else 'click','saveSha256BeforeAndAfter':hashlib.sha256(before.encode()).hexdigest() if before else None,'noHorizontalOverflow':True,'scriptErrors':errors})
                context.close()
        browser.close()
    evidence['passed']=True;(out/'report.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'passed':True,'cases':len(evidence['cases']),'report':str(out/'report.json')},ensure_ascii=False))

if '--welcome-exit-only' in sys.argv:
    welcome_exit_only()
    raise SystemExit

if '--result-actions-only' in sys.argv:
    result_actions_only()
    raise SystemExit

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
