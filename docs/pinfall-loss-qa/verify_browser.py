import argparse, json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
URL='https://yydshly.github.io/classic-games-atlas/versions/v2/games/pinfall/'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);args=ap.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    tmp=ROOT/'.local/loss-eight-round/tmp';tmp.mkdir(parents=True,exist_ok=True)
    os.environ['TEMP']=os.environ['TMP']=str(tmp)
    r={'kind':'public normal range keys and buttons; known first-court reference to create a nonempty record, then natural shot exhaustion; no state/save/time injection','consoleErrors':[],'httpErrors':[],'requestFailures':[],'shots':[]}
    with sync_playwright() as pw:
        b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1050})
        p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)))
        p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None)
        p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None)
        p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
        def diag():return p.evaluate("async()=> (await import(document.querySelector('script[type=module]').src)).diagnostics()")
        def shot(name):p.screenshot(path=str(out/name),full_page=True)
        def fire(angle,label):
            p.locator('#aim').focus();p.keyboard.press('Home')
            for _ in range(round((angle+68)*2)):p.keyboard.press('ArrowRight')
            assert float(p.locator('#aim').input_value())==angle
            assert diag()['aim']==angle
            p.locator('#fire').click();deadline=time.monotonic()+17
            zero_flight=False
            while time.monotonic()<deadline:
                g=diag()
                if g['ball'] is not None and g['shots']==0:
                    assert g['state']=='playing';zero_flight=True
                if g['ball'] is None:
                    r['shots'].append({'run':label,'angle':angle,'state':g['state'],'remainingShots':g['shots'],'targets':sum(x['kind']=='target' for x in g['pegs']),'score':g['stats']['score'],'catches':g['stats']['catches'],'zeroBudgetFlightStillPlaying':zero_flight})
                    print(json.dumps(r['shots'][-1]),flush=True);return g
                p.wait_for_timeout(100)
            raise AssertionError('Native shot did not settle within 17 wall seconds')
        try:
            p.goto(URL,wait_until='networkidle',timeout=20000)
            p.locator('#sound').click();p.locator('#primary-action').click()
            if p.locator('#help-dialog').is_visible():p.locator('#help-confirm').click()
            for angle in [-30,-30,-10,2,12]:g=fire(angle,'record-prerequisite')
            assert g['state']=='won' and g['best']['1']['score']==1555
            r['nativeBestCreated']=g;shot('native-best-before-loss.png')
            p.locator('#secondary-action').click();p.locator('#primary-action').click()
            for _ in range(10):
                g=fire(-68,'loss')
                if g['state']=='lost':break
            assert g['state']=='lost' and g['shots']==0 and g['stats']['settlements']==1 and g['best']==r['nativeBestCreated']['best']
            r['naturalLoss']=g;r['visibleLoss']=p.locator('#overlay').inner_text();shot('natural-shot-exhaustion.png')
            assert '重试这一庭' in r['visibleLoss'] and '发射次数已用完' in r['visibleLoss']
            p.locator('#primary-action').click();p.locator('#pause').click();g=diag()
            assert g['state']=='paused' and g['level']==1 and g['shots']==5 and g['uses']==2 and g['ball'] is None and g['stats']['shots']==g['stats']['score']==g['stats']['catches']==g['stats']['settlements']==0 and g['angles']==g['powers']==[] and g['best']==r['nativeBestCreated']['best']
            assert sum(x['kind']=='target' for x in g['pegs'])==5
            r['retryPaused']=g;shot('retry-full-resources-best-kept.png')
            p.reload(wait_until='networkidle');g=diag()
            assert g['state']=='paused' and g['shots']==5 and g['uses']==2 and g['stats']['score']==0 and g['best']==r['nativeBestCreated']['best']
            r['retryRefresh']=g;shot('retry-refresh-best-kept.png')
            p.locator('#primary-action').click();p.wait_for_timeout(200);p.locator('#pause').click();g=diag()
            assert g['state']=='paused' and g['ball'] is None and g['stats']['shots']==0 and g['shots']==5
            r['normalResumeAfterRetry']=g
            assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
            r['status']='passed'
        except Exception as e:
            r.update(status='failed',error=str(e));shot('failed-attempt.png');raise
        finally:
            (out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
    print(json.dumps({'status':r['status'],'lossShots':r['naturalLoss']['stats']['shots'],'lossTargets':sum(x['kind']=='target' for x in r['naturalLoss']['pegs']),'best':r['retryRefresh']['best']}),flush=True)
if __name__=='__main__':main()
