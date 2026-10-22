from pathlib import Path
import argparse, os, json, base64, uuid
from playwright.sync_api import sync_playwright

ap=argparse.ArgumentParser()
ap.add_argument('--mode',default='verify')
ap.add_argument('--base',default='https://yydshly.github.io/classic-games-atlas/')
ap.add_argument('--only',choices=['fortress','brook','post'])
args=ap.parse_args()
R=Path('.local/featured-touch-round'); O=R/args.mode; O.mkdir(parents=True,exist_ok=True)
(R/'tmp').mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
base=args.base
report={'mode':args.mode,'base':base,'method':'Chromium mobile/touch emulation390x844, native CDP touch input up to5 contacts. Not hardware. No game/save/time/result injection. Setup scrollIntoView used where needed; gesture scrolling tested separately.','games':[],'errors':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}

def flush():
    with (O/'report.json').open('w',encoding='utf-8') as f:
        json.dump(report,f,ensure_ascii=False,indent=2)

class Touch:
    def __init__(self,page,session):
        self.p=page; self.s=session; self.points={}; self.log=[]
    def send(self,kind):
        self.s.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':list(self.points.values())})
        self.p.wait_for_timeout(35)
    def down(self,i,x,y):
        self.points[i]={'id':i,'x':x,'y':y,'radiusX':4,'radiusY':4,'force':1}
        self.send('touchStart')
    def move(self,i,x,y):
        self.points[i].update(x=x,y=y); self.send('touchMove')
    def up(self,i):
        lifted=self.points.pop(i)
        self.s.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[lifted]})
        self.p.wait_for_timeout(35)
    def cancel(self):
        self.points.clear(); self.send('touchCancel')
    def point(self,selector,offset=0):
        e=self.p.locator(selector); e.scroll_into_view_if_needed(); b=e.bounding_box()
        assert b and b['y']>=0 and b['y']+b['height']<=self.p.viewport_size['height'],(selector,b)
        x=b['x']+b['width']/2+offset; y=b['y']+b['height']/2
        assert e.evaluate('(e,p)=>e===document.elementFromPoint(p.x,p.y)||e.contains(document.elementFromPoint(p.x,p.y))',{'x':x,'y':y}),selector
        return x,y
    def tap(self,selector):
        x,y=self.point(selector); self.down(0,x,y); self.up(0); self.p.wait_for_timeout(70)
        self.log.append({'tap':selector,'x':x,'y':y})
    def swipe_margin(self):
        a=self.p.evaluate('scrollY'); self.down(0,388,690)
        for y in [620,540,460,380,300]: self.move(0,388,y)
        self.up(0); self.p.wait_for_timeout(350)
        return {'before':a,'after':self.p.evaluate('scrollY'),'direction':'upward finger swipe on outer page margin'}

LOGGER="""window.__touchEvents=[];for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','click'])document.addEventListener(type,e=>{const n=e.target.closest?.('[data-key],[data-hold],button,a,canvas')||e.target;window.__touchEvents.push({type,ptr:e.pointerType||null,id:e.pointerId||null,trusted:e.isTrusted,target:n.tagName,key:n.dataset?.key||n.dataset?.hold||n.id||n.textContent?.slice(0,24),x:e.clientX,y:e.clientY});},{capture:true});"""
with sync_playwright() as pw:
    for slug in ([args.only] if args.only else ['fortress','brook','post']):
        ctx=pw.chromium.launch_persistent_context(str((R/('profile-'+args.mode+'-'+slug+'-'+uuid.uuid4().hex[:7])).resolve()),viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        p=ctx.pages[0]; cdp=ctx.new_cdp_session(p)
        cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
        report['browser']=cdp.send('Browser.getVersion')['product']
        p.on('pageerror',lambda e:report['errors'].append(str(e)))
        p.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
        p.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
        p.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'error':r.failure}))
        p.add_init_script(LOGGER); t=Touch(p,cdp)
        result={'slug':slug,'checks':[],'issues':[]}
        def diag():
            if slug=='fortress': return p.evaluate('window.__fortress.snapshot()')
            return p.evaluate('async()=>{const s=document.querySelector("script[type=module][src]");return(await import(s.src)).diagnostics()}')
        def shot(label):
            (O/(slug+'-'+label+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']))
        def check(name,**data):
            result['checks'].append({'name':name,**data})
        try:
            p.goto(base+'versions/v2/games/'+slug+'/',wait_until='domcontentloaded',timeout=25000)
            p.wait_for_function('document.body.dataset.state||document.querySelector("#overlay-copy")?.textContent')
            p.wait_for_timeout(250)
            result['emulation']=p.evaluate('({maxTouchPoints:navigator.maxTouchPoints,coarse:matchMedia("(pointer:coarse)").matches,width:innerWidth,height:innerHeight})')
            assert result['emulation']['maxTouchPoints']==5 and result['emulation']['coarse']
            shot('ready'); t.tap('#primary' if slug=='fortress' else '#primary-action')
            if slug=='brook' and p.locator('#help-dialog').evaluate('(e)=>e.open'): t.tap('#help-confirm')
            if slug=='post': p.wait_for_timeout(3100)
            assert diag()['state']=='playing'; check('touchStart',state='playing')
            if slug=='fortress':
                before=diag(); a=t.point('[data-key="KeyW"]'); b=t.point('[data-key="KeyJ"]'); scroll=p.evaluate('scrollY')
                t.down(1,*a); t.down(2,*b); p.wait_for_timeout(360); during=diag()
                assert during['player']['y']<before['player']['y'] and during['shots']>before['shots']
                t.up(1); released=diag(); p.wait_for_timeout(430); held=diag()
                assert held['shots']>released['shots'] and abs(held['player']['y']-released['player']['y'])<.1
                check('moveAndFireTwoContacts',moved=before['player']['y']-during['player']['y'],shotsWhileOnlyFireHeld=held['shots']-released['shots'])
                t.move(2,b[0]-80,b[1]-90); p.wait_for_timeout(380); outside=diag(); assert outside['shots']>held['shots']
                t.up(2); stopped=diag(); p.wait_for_timeout(420); assert diag()['shots']==stopped['shots']
                assert p.evaluate('scrollY')==scroll
                check('captureOutsideAndRelease',scrollUnchanged=True,noResidualFire=True)
                a=t.point('[data-key="KeyW"]'); b=t.point('[data-key="KeyJ"]')
                t.down(1,*a); t.down(2,*b); p.wait_for_timeout(100); t.cancel(); cancelled=diag(); p.wait_for_timeout(420); after=diag()
                assert abs(after['player']['y']-cancelled['player']['y'])<.1 and after['shots']==cancelled['shots']
                check('twoContactCancel',noMovementOrFireResidual=True)
                sharedStart=p.evaluate('window.__touchEvents.length')
                b=t.point('[data-key="KeyJ"]'); t.down(1,b[0]-11,b[1]); p.wait_for_timeout(100)
                t.down(2,b[0]+11,b[1]); p.wait_for_timeout(150); t.up(2); partial=diag(); p.wait_for_timeout(520); remaining=diag()
                continued=remaining['shots']>partial['shots']
                check('twoContactsSameFire',remainingContactStillHeld=True,shotsAfterPartialRelease=remaining['shots']-partial['shots'],passed=continued)
                result['sharedControlEvidence']={'events':p.evaluate('(i)=>window.__touchEvents.slice(i)',sharedStart),'activeContactCDPIds':list(t.points),'shotsBefore':partial['shots'],'shotsAfter520ms':remaining['shots']}
                if not continued:
                    result['issues'].append({'id':'shared-control-contact-release','expected':'One held fire contact keeps firing after second contact lifts.','actual':'Shooting stopped while first touch remained down.','shotsBefore':partial['shots'],'shotsAfter520ms':remaining['shots']})
                t.up(1); t.tap('#pause'); assert diag()['state']=='paused'
                frozen=diag(); p.wait_for_timeout(150); assert diag()==frozen
                t.tap('#primary'); assert diag()['state']=='playing'; x=diag(); p.wait_for_timeout(420); assert diag()['shots']==x['shots']
                check('pauseResumeNoOldTouches',pausedFrozen=True,noAutomaticFire=True); t.tap('#pause')
            elif slug=='brook':
                t.tap('[data-type="bolt"]'); b=p.locator('#battle'); b.scroll_into_view_if_needed(); box=b.bounding_box()
                cx=box['x']+(100+1.5*80)*box['width']/850; cy=box['y']+(115+1.5*72)*box['height']/390
                t.down(0,cx,cy); t.up(0); selected=diag(); assert (selected['row'],selected['col'])==(1,1)
                before=diag(); t.tap('#deploy'); after=diag()
                assert after['stats']['placed']==before['stats']['placed']+1 and after['resource']==before['resource']-60
                check('touchSelectAndDeploy',row=2,col=2,actualCost=before['resource']-after['resource'])
                b.scroll_into_view_if_needed(); box=b.bounding_box(); before=diag(); scroll=p.evaluate('scrollY')
                t.down(1,box['x']+box['width']*.2,box['y']+box['height']*.5)
                t.move(1,box['x']+box['width']*.5,box['y']+box['height']*.2); t.cancel(); after=diag()
                assert (before['row'],before['col'],len(before['log']))==(after['row'],after['col'],len(after['log']))
                assert p.evaluate('scrollY')==scroll; check('canvasDragCancel',noAccidentalSelectionOrCommand=True,scrollUnchanged=True)
                t.tap('#pause'); assert diag()['state']=='paused'; frozen=diag(); p.wait_for_timeout(150); assert diag()==frozen
                check('pageMarginScroll',**t.swipe_margin()); t.tap('#primary-action'); assert diag()['state']=='playing'
                check('pauseResume',pausedFrozen=True); t.tap('#pause')
            else:
                a=t.point('[data-hold="gas"]'); b=t.point('[data-hold="left"]'); before=diag(); scroll=p.evaluate('scrollY')
                t.down(1,*a); t.down(2,*b); p.wait_for_timeout(380); during=diag()
                assert during['input']['touches']==2 and during['cars'][0]['speed']>before['cars'][0]['speed']
                t.up(2); assert diag()['input']['touches']==1; p.wait_for_timeout(120)
                t.move(1,a[0]-80,a[1]-90); p.wait_for_timeout(120); assert diag()['input']['touches']==1
                t.up(1); assert diag()['input']['touches']==0; assert p.evaluate('scrollY')==scroll
                check('gasAndSteerCaptureRelease',twoContactsRegistered=True,oneRemainsAfterPartialRelease=True,noneAfterRelease=True,scrollUnchanged=True,actualSpeed=during['cars'][0]['speed'])
                a=t.point('[data-hold="gas"]'); b=t.point('[data-hold="right"]')
                t.down(1,*a); t.down(2,*b); p.wait_for_timeout(100); t.cancel(); assert diag()['input']['touches']==0
                check('twoContactCancel',noTouchResidual=True)
                t.tap('#pause'); assert diag()['state']=='paused'; frozen=diag(); p.wait_for_timeout(180); assert diag()==frozen
                check('pageMarginScroll',**t.swipe_margin()); t.tap('#primary-action')
                assert diag()['state']=='playing' and diag()['input']['touches']==0
                check('pauseResume',pausedFrozen=True,noTouchResidual=True); t.tap('#pause')
            if slug=='fortress' and not args.mode.startswith('before'):
                t.tap('#retry'); assert diag()['state']=='ready'
                p.locator('#mode').focus(); p.keyboard.press('ArrowDown')
                assert p.locator('#mode').input_value()=='2'
                p.locator('#prepare').focus(); p.keyboard.press('Enter')
                assert diag()['mode']==2 and diag()['state']=='ready'
                t.tap('#primary'); a=diag()
                p.keyboard.down('w'); p.keyboard.down('j'); p.wait_for_timeout(140)
                b=diag(); assert b['player']['y']<a['player']['y'] and b['shots']>a['shots']
                p.keyboard.up('w'); p.keyboard.up('j')
                p.keyboard.down('Enter'); p.wait_for_timeout(110); p.keyboard.up('Enter')
                assert any(x['owner']=='player-2' for x in diag()['bullets'])
                a=t.point('[data-key="KeyW"]'); t.down(1,*a); p.keyboard.down('w')
                p.wait_for_timeout(80); t.up(1); partial=diag(); p.wait_for_timeout(150)
                assert diag()['player']['y']<partial['player']['y']
                p.keyboard.up('w'); stopped=diag(); p.wait_for_timeout(120)
                assert abs(diag()['player']['y']-stopped['player']['y'])<.1
                p.keyboard.press('p'); assert diag()['state']=='paused'
                check('keyboardAndP2Preserved',wasdAndJ=True,p2Enter=True,keyboardSurvivesTouchRelease=True)
            shot('paused'); result['events']=p.evaluate('window.__touchEvents')
            downs=[e for e in result['events'] if e['type']=='pointerdown']
            assert downs and all(e['ptr']=='touch' and e['trusted'] for e in downs)
            result['pointerDowns']=len(downs); result['nativePointerCancels']=sum(e['type']=='pointercancel' for e in result['events'])
            assert result['nativePointerCancels']>0
            t.tap('header a:last-child' if slug=='brook' else 'header a:first-child')
            p.wait_for_function('document.querySelector("#selected-play [data-play]")')
            check('touchReturnLobby',returned=True)
            result['passed']=not result['issues']; result['actions']=t.log
            report['games'].append(result); flush(); ctx.close()
            print(json.dumps({'game':slug,'checks':len(result['checks']),'issues':result['issues']},ensure_ascii=False),flush=True)
        except Exception as e:
            result['failure']=repr(e); result['url']=p.url
            result['diagnostic']=diag() if '/games/' in p.url else p.locator('body').inner_text()[:1500]
            result['events']=p.evaluate('window.__touchEvents||[]'); shot('failure')
            report['games'].append(result); flush(); ctx.close(); raise
    report['navigationCancellations']=[x for x in report['requestFailures'] if x['error']=='net::ERR_ABORTED']
    report['requestFailures']=[x for x in report['requestFailures'] if x['error']!='net::ERR_ABORTED']
    report['completed']=True
    report['passed']=all(x.get('passed') for x in report['games']) and not any(report[k] for k in ['errors','consoleErrors','httpErrors','requestFailures'])
    flush(); print(json.dumps({'completed':True,'passed':report['passed'],'games':len(report['games'])}),flush=True)
