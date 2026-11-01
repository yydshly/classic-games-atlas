# Local Chromium UI regression: layout, mixed input, pause/retry and touch release.
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
KEY='classic-games-atlas:tidal-lamp-crossing:v1'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for size in [(1173,751),(390,844),(1024,700)]:
   mobile=size[0]==390
   c=browser.new_context(viewport={'width':size[0],'height':size[1]},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
   page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_address[1]}/experiments/tidal-lamp-crossing/')
   start=page.locator('#start').bounding_box()
   assert start['y']+start['height']<=size[1]
   assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
   page.locator('#start').click()
   if mobile:
    board=page.locator('#board').bounding_box();pad=page.locator('#dpad').bounding_box()
    assert board['y']+board['height']<=size[1]
    assert pad['y']+pad['height']<=size[1]
   page.locator('[data-dir="left"]').click()
   first=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
   assert first['hops']==1
   page.wait_for_timeout(500)
   no_sticky=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
   assert no_sticky['hops']==1
   page.locator('#retry').click()
   before=page.evaluate(f"localStorage.getItem('{KEY}')")
   page.wait_for_timeout(850)
   assert page.evaluate(f"localStorage.getItem('{KEY}')")==before
   page.locator('#cancel-retry').click()
   assert page.evaluate(f"localStorage.getItem('{KEY}')")==before
   page.locator('#pause').click()
   paused=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
   page.reload()
   loaded=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
   assert page.locator('#phase').inner_text()=='已暂停'
   assert loaded['player']==paused['player'] and loaded['hops']==paused['hops']
   page.locator('#resume').click()
   page.keyboard.press('ArrowRight')
   mixed=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
   assert mixed['hops']==2
   page.locator('#retry').click();page.locator('#confirm-retry').click()
   reset=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
   assert reset['phase']=='ready' and reset['hops']==0 and reset['elapsed']==0
   if mobile:
    page.locator('#start').tap()
    session=c.new_cdp_session(page)
    right=page.locator('[data-dir="right"]').bounding_box()
    x,y=right['x']+right['width']/2,right['y']+right['height']/2
    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
    page.wait_for_timeout(470)
    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    held=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))['hops']
    assert held>=2,held
    page.wait_for_timeout(450)
    assert json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))['hops']==held
    left=page.locator('[data-dir="left"]').bounding_box()
    x,y=left['x']+left['width']/2,left['y']+left['height']/2
    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':2}]})
    page.wait_for_timeout(110)
    session.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
    cancelled=json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))['hops']
    page.wait_for_timeout(400)
    assert json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))['hops']==cancelled
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    assert page.locator('#phase').inner_text()=='已暂停'
   assert not errors,errors
   print(size,'start',round(start['y']),round(start['y']+start['height']),'mix/retry/pause okay')
   c.close()
  browser.close()
finally:server.shutdown();server.server_close()
