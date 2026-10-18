"""Pending real-browser smoke/visual checks. Not yet passed in cloud sandbox."""
import argparse, asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 report={'browserVerified':False,'checks':[],'errors':[]}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(**({'executable_path':args.chromium} if args.chromium else {}))
  try:
   context=await browser.new_context(viewport={'width':1440,'height':1100})
   page=await context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
   await page.goto(args.url);await page.wait_for_function('typeof window.courtSnapshot === "function"')
   assert (await page.evaluate('courtSnapshot()'))['state']=='ready'
   await page.screenshot(path=str(out/'desktop-ready.png'),full_page=True)
   await page.locator('#primary').click();await page.keyboard.down('d');await page.wait_for_timeout(500);await page.keyboard.up('d')
   moving=await page.evaluate('courtSnapshot()');assert moving['players'][0]['x']>290
   await page.keyboard.down('j');await page.wait_for_timeout(530);await page.keyboard.up('j');await page.wait_for_timeout(80)
   assert (await page.evaluate('courtSnapshot()'))['stats']['shots'][0]>=1
   await page.keyboard.press('p');before=await page.evaluate('courtSnapshot()');await page.wait_for_timeout(300);after=await page.evaluate('courtSnapshot()');assert before==after and after['state']=='paused'
   await page.locator('#primary').click();assert (await page.evaluate('courtSnapshot()'))['state']=='playing'
   await page.locator('#help').click();assert (await page.evaluate('courtSnapshot()'))['state']=='paused';await page.locator('#help-done').click();assert (await page.evaluate('courtSnapshot()'))['state']=='playing'
   await page.locator('#restart').click();assert (await page.evaluate('courtSnapshot()'))['state']=='ready'
   report['checks']+=['start','keyboard movement','charge release shot','pause freeze','resume','help pause/resume','retry']
   for width in [320,390,768,1024,1280,1440]:
    await page.set_viewport_size({'width':width,'height':1000});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');await page.screenshot(path=str(out/f'width-{width}.png'),full_page=True)
   report['checks'].append('six-width no horizontal overflow')
   await context.close()
   mobile=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   page=await mobile.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
   await page.goto(args.url);await page.locator('#primary').click()
   cdp=await mobile.new_cdp_session(page)
   right=await page.locator('[data-dir="right"]').bounding_box();shot=await page.locator('#touch-shoot').bounding_box()
   points=[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':i+1} for i,r in enumerate([right,shot])]
   await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points});await page.wait_for_timeout(530);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await page.wait_for_timeout(80)
   state=await page.evaluate('courtSnapshot()');assert state['players'][0]['x']>290 and state['stats']['shots'][0]>=1
   await page.screenshot(path=str(out/'mobile-action.png'),full_page=True);report['checks'].append('native simultaneous touch movement and charge release')
   await mobile.close();assert not report['errors'];report['browserVerified']=True
  finally:
   (out/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));await browser.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4185/games/court/');a.add_argument('--out',default='.local/court-browser');a.add_argument('--chromium',default=None);asyncio.run(main(a.parse_args()))
