"""Local Chromium interaction and pixel fixture for the original Border Letters slice."""
from __future__ import annotations
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local' / 'border-letters-qa'
OUT.mkdir(parents=True, exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'

def do(page, action, unit=None, at=None):
    if unit:
        page.locator(f'[data-unit="{unit}"]').click()
    if at:
        page.locator(f'[data-node="{at}"]').click()
    page.locator(f'[data-action="{action}"]').click()
    if action == 'end' and page.locator('#settlement').is_visible():
        page.locator('[data-action="continue"]').click()

def route(page, script):
    for step in script:
        do(page, *step)

E = ('end',)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base + '/')
    page.locator('#border-letters-local a').click()
    assert '/play/' in page.url
    page.locator('a[href*="border-letters"]').first.click()
    assert '/experiments/border-letters/' in page.url
    assert page.locator('#chapter-title').inner_text().startswith('一')
    assert page.evaluate('document.documentElement.scrollWidth') <= 390
    boxes = page.locator('[data-node]').evaluate_all('nodes => nodes.map(n => ({id:n.dataset.node,r:n.getBoundingClientRect().toJSON()}))')
    for i, a in enumerate(boxes):
        assert a['r']['left'] >= 0 and a['r']['right'] <= 390, a
        for b in boxes[i+1:]:
            overlap = min(a['r']['right'], b['r']['right']) - max(a['r']['left'], b['r']['left'])
            vertical = min(a['r']['bottom'], b['r']['bottom']) - max(a['r']['top'], b['r']['top'])
            assert overlap <= 0 or vertical <= 0, (a['id'], b['id'])
    page.screenshot(path=str(OUT / '390-start.png'), full_page=True)
    do(page, 'forage', at='camp')
    do(page, 'pause')
    before = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.reload()
    assert '暂停' in page.locator('#feedback').inner_text()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == before
    do(page, 'pause')
    assert page.locator('[data-action="undo"]').is_enabled()
    do(page, 'undo')
    assert '存粮 8' in page.locator('#supply-badge').inner_text()
    do(page, 'forage', at='camp')
    do(page, 'end')
    do(page, 'fortify', 'courier')
    do(page, 'forage', at='camp')
    assert page.locator('[data-action="undo"]').is_enabled()
    do(page, 'undo')
    do(page, 'forage', at='camp')
    route(page, [E, E])
    assert '来信送达' in page.locator('#result').inner_text()
    saved = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.locator('[data-result="retry"]').click()
    assert page.locator('#restart-dialog').evaluate('e => e.open')
    page.locator('#restart-dialog button[value="cancel"]').click()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == saved
    page.locator('[data-result="next"]').click()
    assert page.locator('#chapter-title').inner_text().startswith('二')

    routes = [
      [('march','guard','pass'),('forage',None,'camp'),E,('march','guard','relay'),E,E,E,E],
      [('march','courier','granary'),('march','guard','pass'),E,('march','courier','ford'),('forage',None,'camp'),E,('march','courier','granary'),('forage',None,'camp'),E,('march','courier','pass'),E,('forage',None,'camp'),E],
      [('march','guard','pass'),('march','courier','granary'),('forage',None,'camp'),E,('march','guard','beacon'),('march','courier','ford'),('forage',None,'camp'),E,('march','courier','relay'),('forage',None,'camp'),E,('march','courier','outpost'),('forage',None,'camp'),E,('fortify','courier'),('forage',None,'camp'),E,('fortify','courier'),E],
      [('march','courier','granary'),('forage',None,'camp'),E,('march','courier','ford'),('forage',None,'camp'),E,('march','guard','pass'),('march','courier','relay'),('forage',None,'camp'),E,('march','guard','relay'),('march','courier','outpost'),('forage',None,'camp'),E,('march','guard','pass'),('march','courier','relay'),('forage',None,'camp'),E,('march','guard','granary'),('march','guard','camp'),('forage',None,'camp'),E],
    ]
    for i, script in enumerate(routes, 2):
        if i == 4:
            assert page.locator('#intel').inner_text().count('第 6 回合末') == 2
        route(page, script)
        assert '来信送达' in page.locator('#result').inner_text(), (i, page.locator('#result').inner_text())
        if i == 2:
            guard_result = page.locator('#result').inner_text()
            assert '行军 2 次' in guard_result and '额外行军耗粮 4' in guard_result
        if i < 5: page.locator('[data-result="next"]').click()
    page.screenshot(path=str(OUT / '390-finish.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    page.wait_for_function('document.querySelector("#turn-badge").textContent.includes("第 1 / 6 回合")')
    assert page.locator('#chapter-title').inner_text().startswith('五')
    assert '第 1 / 6 回合' in page.locator('#turn-badge').inner_text()
    assert len(page.locator('#chapter-pick button:enabled').all()) == 5
    stage_before = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.once('dialog', lambda dialog: dialog.dismiss())
    page.locator('[data-stage="1"]').click()
    assert page.locator('#chapter-title').inner_text().startswith('五')
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == stage_before
    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('[data-stage="1"]').click()
    assert page.locator('#chapter-title').inner_text().startswith('二')
    route(page, [('march','courier','granary'),('forage',None,'camp'),E,('march','courier','ford'),E,('march','courier','relay'),('fortify','courier'),E,E,E])
    courier_result = page.locator('#result').inner_text()
    assert '来信送达' in courier_result and '行军 3 次' in courier_result and '额外行军耗粮 3' in courier_result
    page.locator('header nav a[href="../../"]').click()
    assert page.url.rstrip('/') == base

    wide = browser.new_page(viewport={'width': 1280, 'height': 800}, device_scale_factor=1)
    wide.on('pageerror', lambda error: errors.append(str(error)))
    wide.goto(base + '/experiments/border-letters/')
    wide.screenshot(path=str(OUT / '1280-start.png'), full_page=True)
    assert wide.evaluate('document.documentElement.scrollWidth') <= 1280
    wide.locator('[data-node="granary"]').focus()
    wide.keyboard.press('Enter')
    assert wide.locator('[data-node="granary"]').get_attribute('aria-pressed') == 'true'
    wide.keyboard.press('2')
    assert wide.locator('[data-unit="courier"]').get_attribute('aria-pressed') == 'true'
    wide.keyboard.press('Escape')
    assert '暂停' in wide.locator('#feedback').inner_text()
    wide.keyboard.press('Escape')
    wide.keyboard.press('f'); wide.keyboard.press('e'); wide.keyboard.press('c')
    wide.keyboard.press('g'); wide.keyboard.press('f'); wide.keyboard.press('e'); wide.keyboard.press('c')
    wide.keyboard.press('e')
    assert '来信送达' in wide.locator('#result').inner_text()
    wide.close()
    touch = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
    touch.goto(base + '/experiments/border-letters/')
    touch.locator('[data-node="camp"]').tap()
    touch.locator('[data-action="forage"]').tap()
    touch.locator('[data-action="end"]').tap()
    touch.locator('[data-action="continue"]').tap()
    touch.locator('[data-unit="courier"]').tap()
    touch.locator('[data-action="fortify"]').tap()
    touch.locator('[data-node="camp"]').tap()
    touch.locator('[data-action="forage"]').tap()
    touch.locator('[data-action="end"]').tap()
    touch.locator('[data-action="continue"]').tap()
    touch.locator('[data-action="end"]').tap()
    assert '来信送达' in touch.locator('#result').inner_text()
    assert touch.evaluate('document.documentElement.scrollWidth') <= 390
    touch.close()
    failed = browser.new_page(viewport={'width': 390, 'height': 844})
    failed.goto(base + '/experiments/border-letters/')
    for _ in range(3): do(failed, 'end')
    assert '军情未竟' in failed.locator('#result').inner_text()
    assert failed.locator('[data-action="end"]').is_disabled()
    failed.locator('[data-result="retry"]').click()
    failed.locator('#restart-dialog button[value="restart"]').click()
    failed.wait_for_function('document.querySelector("#turn-badge").textContent.includes("第 1 / 3 回合")')
    assert failed.locator('#result').is_hidden()
    failed.close()
    # The online P1: a physical double click must settle exactly one turn.
    rapid = browser.new_page(viewport={'width': 390, 'height': 844})
    rapid.goto(base + '/experiments/border-letters/')
    rapid.locator('[data-action="end"]').scroll_into_view_if_needed()
    end_box = rapid.locator('[data-action="end"]').bounding_box()
    x, y = end_box['x'] + end_box['width']/2, end_box['y'] + end_box['height']/2
    rapid.mouse.dblclick(x, y, delay=45)
    state = rapid.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state')
    assert state['turn'] == 2 and state['settlementPending'] is True
    assert sum('第 1 回合补给' in line for line in state['logs']) == 1
    assert not any('第 2 回合补给' in line for line in state['logs'])
    assert rapid.locator('[data-action="end"]').is_disabled()
    assert rapid.locator('#settlement').is_visible()
    rapid.screenshot(path=str(OUT / '390-settlement.png'), full_page=True)
    rapid.wait_for_timeout(700)
    rapid.mouse.click(x, y)
    assert rapid.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 2
    rapid.locator('[data-action="pause"]').click()
    saved_pending = rapid.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    rapid.reload()
    assert rapid.evaluate('localStorage.getItem("atlas.border-letters.v1")') == saved_pending
    assert rapid.locator('#settlement').is_visible()
    assert rapid.locator('[data-action="continue"]').is_disabled()
    rapid.locator('[data-action="pause"]').click()
    end_box_now = rapid.locator('[data-action="end"]').bounding_box()
    continue_box = rapid.locator('[data-action="continue"]').bounding_box()
    assert continue_box['y'] >= end_box_now['y'] + end_box_now['height'], (end_box_now, continue_box)
    rapid.locator('[data-action="continue"]').click()
    assert rapid.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 2
    assert rapid.locator('#settlement').is_hidden()
    rapid.locator('[data-action="end"]').click()
    assert rapid.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 3
    rapid.close()
    # Rapid touch taps and held-key repeats are independent input routes.
    rapid_touch = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    rapid_touch.goto(base + '/experiments/border-letters/')
    rapid_touch.locator('[data-action="end"]').scroll_into_view_if_needed()
    box = rapid_touch.locator('[data-action="end"]').bounding_box()
    tx, ty = box['x'] + box['width']/2, box['y'] + box['height']/2
    rapid_touch.touchscreen.tap(tx, ty); rapid_touch.touchscreen.tap(tx, ty)
    assert rapid_touch.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 2
    rapid_touch.wait_for_timeout(700)
    rapid_touch.touchscreen.tap(tx, ty)
    assert rapid_touch.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 2
    rapid_touch.locator('[data-action="continue"]').tap()
    assert rapid_touch.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.settlementPending') is False
    rapid_touch.touchscreen.tap(tx, ty)
    assert rapid_touch.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 3
    rapid_touch.close()
    held = browser.new_page(viewport={'width': 1280, 'height': 800})
    held.goto(base + '/experiments/border-letters/')
    held.keyboard.down('e'); held.keyboard.down('e')
    assert held.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 2
    held.locator('[data-action="continue"]').click()
    held.keyboard.down('e')
    assert held.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 2
    held.keyboard.up('e'); held.keyboard.press('e')
    assert held.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 3
    held.close()
    legacy = browser.new_page(viewport={'width': 390, 'height': 844})
    legacy.goto(base + '/experiments/border-letters/')
    do(legacy, 'forage', at='camp')
    legacy.evaluate('''() => { const key = 'atlas.border-letters.v1'; const r = JSON.parse(localStorage.getItem(key)); delete r.state.settlementPending; for (const s of r.state.undo) delete s.settlementPending; localStorage.setItem(key, JSON.stringify(r)); }''')
    legacy.reload()
    assert '暂停' in legacy.locator('#feedback').inner_text()
    assert '存粮 12' in legacy.locator('#supply-badge').inner_text()
    legacy.locator('[data-action="pause"]').click()
    legacy.locator('[data-action="undo"]').click()
    assert '存粮 8' in legacy.locator('#supply-badge').inner_text()
    legacy.close()
    assert not errors, errors
    print(json.dumps({'passed': True, 'scope': 'local Chromium full pointer campaign and alternate route; physical mouse double click, rapid emulated touch taps, held-key repeat across Continue; paused pending reload, legacy save, retry cancel/confirm, 390 and wide pixels', 'screenshots': [str(x) for x in sorted(OUT.glob('*.png'))]}, ensure_ascii=False))
    browser.close()
server.shutdown()
