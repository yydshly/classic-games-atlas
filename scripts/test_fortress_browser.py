"""Real browser input acceptance. The operator reads diagnostics but never mutates game state."""
import argparse
import datetime
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
SNAPSHOT='async()=> (await import("./game.mjs")).diagnostics()'

def run(base,out,record=True,full=True):
    out.mkdir(parents=True,exist_ok=True)
    checks=[];errors=[];failures=[];bad=[]
    with sync_playwright() as p:
        browser=p.chromium.launch()
        options=dict(viewport={'width':1440,'height':1100},device_scale_factor=1)
        if record: options.update(record_video_dir=str(ROOT/'.local/fortress-video'),record_video_size={'width':1152,'height':880})
        context=browser.new_context(**options);page=context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('requestfailed',lambda r:failures.append({'url':r.url,'failure':r.failure}))
        page.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
        page.goto(base,wait_until='networkidle')
        page.screenshot(path=str(out/'desktop-ready.png'))
        page.locator('#levels').click();expect(page.locator('#level-list button:not([disabled])')).to_have_count(1);expect(page.locator('#level-list button[disabled]')).to_have_count(9);page.locator('#levels-close').click()
        page.locator('#primary-action').click();expect(page.locator('#help-dialog')).to_be_visible();page.screenshot(path=str(out/'tutorial.png'));page.locator('#help-confirm').click()
        assert page.evaluate(SNAPSHOT)['state']=='playing'
        page.keyboard.press('p');before=page.evaluate(SNAPSHOT)['time'];page.wait_for_timeout(350);assert page.evaluate(SNAPSHOT)['time']==before;page.keyboard.press('p')
        page.locator('#sound').click();expect(page.locator('#sound')).to_have_attribute('aria-pressed','false');page.locator('#sound').click()
        checks.append('First-run teaching, 1 unlocked / 9 locked stages, pause freezes time, resume, sound toggle')

        # Actual key presses defend the first map. Diagnostics are read-only telemetry.
        held=None;page.keyboard.down('Space');start=time.monotonic();trajectory=[];battle_saved=False
        while time.monotonic()-start<115:
            state=page.evaluate(SNAPSHOT)
            if state['state']!='playing': break
            player=state['player'];enemies=state['enemies'];direction=None
            if abs(player['y']-444)>6: direction='ArrowUp' if player['y']>444 else 'ArrowDown'
            else:
                target=max(enemies,key=lambda e:e['y']*1.6-abs(e['x']-player['x'])*.06) if enemies else {'x':300,'y':100}
                if abs(target['x']-player['x'])>5: direction='ArrowRight' if target['x']>player['x'] else 'ArrowLeft'
                else:
                    aim=2 if target['y']>player['y']+12 else 0
                    if player['dir']!=aim: direction='ArrowDown' if aim==2 else 'ArrowUp'
            if direction!=held:
                if held:page.keyboard.up(held)
                if direction:page.keyboard.down(direction)
                held=direction
            if len(trajectory)==0 or state['time']-trajectory[-1]['time']>1:
                trajectory.append({key:state[key] for key in ['time','kills','lives','score','spawned']})
            if state['kills']>=1 and not battle_saved:page.screenshot(path=str(out/'desktop-combat.png'));battle_saved=True
            page.wait_for_timeout(55)
        if held:page.keyboard.up(held)
        page.keyboard.up('Space');state=page.evaluate(SNAPSHOT)
        page.screenshot(path=str(out/'round-result.png'))
        (out/'round-trajectory.json').write_text(json.dumps({'kind':'real keyboard input; no game-state mutation','samples':trajectory,'endState':state},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        assert state['state']=='won',f'First-round real input ended in {state["state"]}, kills {state["kills"]}, base {state["base"]["hp"]}'
        assert state['kills']==state['total']==6
        assert state['unlocked']==2
        win={key:state[key] for key in ['state','level','time','kills','total','score','lives','fps','meanRenderMs']};win['baseHP']=state['base']['hp']
        checks.append('Real keyboard movement, turning, continuous fire, walls destroyed, enemy combat, full first-stage victory, next stage unlock')
        page.reload(wait_until='networkidle');reload=page.evaluate(SNAPSHOT);assert reload['unlocked']==2 and reload['level']==2
        page.locator('#levels').click();expect(page.locator('#level-list button:not([disabled])')).to_have_count(2);page.locator('[data-level="1"]').click()
        page.locator('#primary-action').click();assert page.evaluate(SNAPSHOT)['state']=='playing'
        page.keyboard.press('r');assert page.evaluate(SNAPSHOT)['state']=='ready';assert page.evaluate(SNAPSHOT)['base']['hp']==3
        page.locator('#primary-action').click()
        checks.append('Win progress survives reload, stage 2 unlocked, stage selection and keyboard restart reset state')
        if full:
            # Park away from the beacon; enemies reach and damage it using ordinary gameplay.
            page.keyboard.down('ArrowLeft');page.wait_for_timeout(2100);page.keyboard.up('ArrowLeft')
            deadline=time.monotonic()+75;saw_base_damage=False;saw_player_damage=False
            while time.monotonic()<deadline:
                state=page.evaluate(SNAPSHOT);saw_base_damage|=state['base']['hp']<3;saw_player_damage|=state['lives']<3
                if state['state']=='lost':break
                page.wait_for_timeout(300)
            assert state['state']=='lost','Undefended battle did not resolve to defeat'
            assert saw_base_damage,'Real browser scenario did not exercise beacon damage'
            page.screenshot(path=str(out/'defeat.png'));page.locator('#primary-action').click();state=page.evaluate(SNAPSHOT);assert state['state']=='playing' and state['base']['hp']==3 and state['lives']==3
            checks.append('Real unattended enemy advance damages beacon and leads to defeat; retry restores full health')
            page.keyboard.press('p')
        page.locator('#sound').click();page.reload(wait_until='networkidle');expect(page.locator('#sound')).to_have_attribute('aria-pressed','false')
        checks.append('Sound preference persists after reload')
        video=page.video
        context.close()
        if record and video: video.save_as(str(out/'first-round-input.webm'))

        mobile=browser.new_context(viewport={'width':390,'height':1000},has_touch=True,is_mobile=True,device_scale_factor=1)
        phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)));phone.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        phone.goto(base,wait_until='networkidle');phone.screenshot(path=str(out/'mobile-ready.png'));phone.locator('#primary-action').tap();phone.locator('#help-confirm').tap()
        cdp=mobile.new_cdp_session(phone)
        def hold_touch(selector,milliseconds):
            target=phone.locator(selector);target.scroll_into_view_if_needed();rect=target.bounding_box();x=rect['x']+rect['width']/2;y=rect['y']+rect['height']/2
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});phone.wait_for_timeout(milliseconds);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        before=phone.evaluate(SNAPSHOT);hold_touch('[data-direction="3"]',350);after=phone.evaluate(SNAPSHOT);assert after['player']['x']<before['player']['x']-20
        before_shots=after['shots'];hold_touch('#touch-fire',650);after=phone.evaluate(SNAPSHOT);assert after['shots']-before_shots>=2
        phone.screenshot(path=str(out/'mobile-combat.png'));assert after['state']=='playing'
        checks.append('Chromium touchStart/touchEnd inputs hold mobile movement and fire controls; game remains playable')
        widths=[]
        for width in [320,360,390,768,1024,1440]:
            phone.set_viewport_size({'width':width,'height':1000});assert not phone.evaluate('document.documentElement.scrollWidth>innerWidth'),width;widths.append(width)
        phone.locator('.back-link').click();phone.wait_for_selector('.game-card');expect(phone.locator('.game-card')).to_have_count(72)
        expect(phone.locator('a[href="./games/fortress/"]')).to_have_count(2)
        phone.locator('[data-open="battle-city"]').click();expect(phone.locator('.lab-detail')).to_be_visible();phone.locator('.lab-detail a').click();phone.wait_for_selector('#battlefield')
        checks.append('Six viewport widths do not overflow; return to atlas keeps 72 entries and original-game association opens playable experiment')
        mobile.close();browser.close()
        assert not errors,errors;assert not failures,failures;assert not bad,bad
        report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base,'kind':'Playwright real keyboard/mouse and Chromium touch input, no game-state mutation','firstRound':win,'checks':checks,'viewportWidths':widths,'consoleErrors':errors,'requestFailures':failures,'badResponses':bad,'video':'first-round-input.webm' if record else None}
        (out/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4174/games/fortress/');parser.add_argument('--out',default='docs/fortress-qa/local');parser.add_argument('--no-video',action='store_true');parser.add_argument('--quick',action='store_true');args=parser.parse_args();run(args.url,ROOT/args.out,not args.no_video,not args.quick)
