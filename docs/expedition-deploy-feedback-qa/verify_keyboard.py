from pathlib import Path
import os,json,argparse,base64
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--online',action='store_true');args=ap.parse_args();R=Path('.local/expedition-deploy-round');mode='online'if args.online else'local';O=R/mode;os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());url=('https://yydshly.github.io/classic-games-atlas/'if args.online else'http://127.0.0.1:58251/')+'versions/v2/games/expedition/';out={'passed':False,'checks':[],'method':'Reopen existing earned paused record. Ordinary resume/Tab/ShiftTab/P only; no new deploy command.'}
with sync_playwright()as pw:
 c=pw.chromium.launch_persistent_context(str((R/('profile-'+mode)).resolve()),viewport={'width':1440,'height':1000});p=c.pages[0];cdp=c.new_cdp_session(p)
 try:
  p.goto(url,wait_until='domcontentloaded');assert p.locator('#pause').inner_text()=='继续';p.locator('#tab-defense').click();old=json.loads(p.evaluate('localStorage.getItem("atlas-expedition-v2-valley-20261018")'));p.locator('#resume').click()
  for width in [1440,390]:
   p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});first=p.locator('#deployment button').first;first.focus();first.press('Tab');second=p.locator('#deployment button').nth(1);assert second.evaluate('(e)=>e===document.activeElement&&e.matches(":focus-visible")');second.press('Shift+Tab');p.wait_for_timeout(550);assert first.evaluate('(e)=>e===document.activeElement&&e.matches(":focus-visible")');first.scroll_into_view_if_needed();box=first.bounding_box();assert box['y']>=0 and box['y']+box['height']<=p.viewport_size['height'];(O/('09-keyboard-'+str(width)+'.png')).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data']));out['checks'].append({'width':width,'tabAndShiftTab':True,'focusVisibleAfterSimulationRender':True,'buttonWithinViewport':True})
  p.keyboard.press('p');new=json.loads(p.evaluate('localStorage.getItem("atlas-expedition-v2-valley-20261018")'));assert old['log']==new['log'];out['newDeployCommands']=0;out['passed']=True
 finally:c.close();(O/'focus.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out),flush=True)
