"""Local Chromium interaction and pixel fixture for the eight-mission candidate."""
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
    page.wait_for_function('document.querySelector("#chapter-title").textContent.startsWith("一")')
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
        assert '本役已结束；已发生的突袭见行军日志' in page.locator('#intel').inner_text()
        if i == 2:
            guard_result = page.locator('#result').inner_text()
            assert '行军 2 次' in guard_result and '额外行军耗粮 4' in guard_result
        if i < 5: page.locator('[data-result="next"]').click()
    # The published five-mission record capped unlocked at 4 even after winning stage 5.
    legacy_five = page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1"))')
    assert legacy_five['state']['stage'] == 4 and legacy_five['state']['phase'] == 'won'
    legacy_five['unlocked'] = 4
    legacy_raw = json.dumps(legacy_five, ensure_ascii=False)
    legacy_context = browser.new_context(viewport={'width': 390, 'height': 844})
    legacy_context.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(legacy_raw) + ');')
    legacy_page = legacy_context.new_page()
    legacy_page.goto(base + '/experiments/border-letters/')
    assert legacy_page.locator('[data-stage="5"]').is_enabled()
    assert legacy_page.locator('[data-stage="6"]').is_disabled()
    assert legacy_page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == legacy_raw
    legacy_page.locator('[data-result="next"]').click()
    assert legacy_page.locator('#chapter-title').inner_text().startswith('六')
    assert legacy_page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.stage') == 5
    legacy_context.close()
    # A real sixth-mission north-road win from the previous eight-mission release.
    old_sixth_raw = (ROOT / 'tests/fixtures/border-stage6-old-north-save.json').read_text().strip()
    old_sixth_context = browser.new_context(viewport={'width': 390, 'height': 844})
    old_sixth_context.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(old_sixth_raw) + ');')
    old_sixth_page = old_sixth_context.new_page()
    old_sixth_page.goto(base + '/experiments/border-letters/')
    assert '来信送达' in old_sixth_page.locator('#result').inner_text()
    assert '旧版第六役完赛记录按当时目标保留' in old_sixth_page.locator('#status').inner_text()
    assert old_sixth_page.locator('[data-stage="6"]').is_enabled()
    assert old_sixth_page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == old_sixth_raw
    old_sixth_page.locator('[data-result="next"]').click()
    assert old_sixth_page.locator('#chapter-title').inner_text().startswith('七')
    old_sixth_context.close()
    old_active_raw = (ROOT / 'tests/fixtures/border-stage6-old-active.json').read_text().strip()
    old_active_context = browser.new_context(viewport={'width': 390, 'height': 844})
    old_active_context.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(old_active_raw) + ');')
    old_active_page = old_active_context.new_page()
    old_active_page.goto(base + '/experiments/border-letters/')
    assert '旧版存档沿用原目标' in old_active_page.locator('#chapter-intro').inner_text()
    assert '驿骑到过 远哨 ✓、北望 ✓' in old_active_page.locator('#status').inner_text()
    assert old_active_page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == old_active_raw
    assert old_active_page.evaluate('document.documentElement.scrollWidth') <= 390
    old_active_page.screenshot(path=str(OUT / '390-sixth-legacy-active.png'), full_page=True)
    old_active_page.locator('[data-action="pause"]').click()
    do(old_active_page, 'forage', at='camp')
    do(old_active_page, 'end')
    assert '来信送达' in old_active_page.locator('#result').inner_text()
    old_active_page.locator('[data-result="retry"]').click()
    old_active_page.locator('#restart-dialog button[value="restart"]').click()
    old_active_page.wait_for_function('document.querySelector("#status").textContent.includes("驿骑到过 烽台、远哨、北望")')
    assert '烽台传令' in old_active_page.locator('#chapter-intro').inner_text()
    assert '驿骑到过 烽台、远哨、北望' in old_active_page.locator('#status').inner_text()
    assert old_active_page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.goalVersion') == 2
    old_active_context.close()
    corrupt_five = json.loads(legacy_raw)
    corrupt_five['state']['food'] = -1
    corrupt_context = browser.new_context(viewport={'width': 390, 'height': 844})
    corrupt_context.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(json.dumps(corrupt_five, ensure_ascii=False)) + ');')
    corrupt_page = corrupt_context.new_page()
    corrupt_page.goto(base + '/experiments/border-letters/')
    assert corrupt_page.locator('[data-stage="5"]').is_disabled()
    assert corrupt_page.locator('#chapter-title').inner_text().startswith('一')
    corrupt_context.close()
    impossible_five = json.loads(legacy_raw)
    impossible_five['state']['turn'] = 1
    impossible_five['state']['ownership']['relay'] = 'neutral'
    impossible_context = browser.new_context(viewport={'width': 390, 'height': 844})
    impossible_context.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(json.dumps(impossible_five, ensure_ascii=False)) + ');')
    impossible_page = impossible_context.new_page()
    impossible_page.goto(base + '/experiments/border-letters/')
    assert impossible_page.locator('#chapter-title').inner_text().startswith('五')
    assert impossible_page.locator('[data-stage="5"]').is_disabled()
    impossible_context.close()
    page.screenshot(path=str(OUT / '390-finish.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    page.wait_for_function('document.querySelector("#turn-badge").textContent.includes("第 1 / 6 回合")')
    assert page.locator('#chapter-title').inner_text().startswith('五')
    assert '第 1 / 6 回合' in page.locator('#turn-badge').inner_text()
    assert len(page.locator('#chapter-pick button:enabled').all()) == 6
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

    # Sixth mission is reached through the five completed UI missions above.
    page.goto(base + '/experiments/border-letters/')
    assert page.locator('[data-stage="5"]').is_enabled()
    page.locator('[data-stage="5"]').click()
    assert page.locator('#chapter-title').inner_text().startswith('六')
    assert '谷仓' in page.locator('#intel').inner_text() and '第 1 回合末' in page.locator('#intel').inner_text()
    keep = [('march','guard','granary'),('march','courier','ford'),E,
            ('march','courier','relay'),('forage',None,'camp'),E,
            ('march','courier','outpost'),('forage',None,'camp'),E,
            ('march','courier','beacon'),E]
    route(page, keep)
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 5 次' in page.locator('#result').inner_text() and '额外行军耗粮 6' in page.locator('#result').inner_text()
    page.screenshot(path=str(OUT / '390-sixth-keep.png'), full_page=True)
    keep_save = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="cancel"]').click()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == keep_save
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','courier','ford'),('march','courier','relay'),E])
    page.locator('[data-unit="courier"]').click()
    page.locator('[data-node="outpost"]').click()
    assert '地形 1 + 断线 1' in page.locator('#selection').inner_text()
    page.screenshot(path=str(OUT / '390-sixth-disconnected.png'), full_page=True)
    route(page, [('march','courier','outpost'),('forage',None,'camp'),E,
                 ('march','courier','beacon'),('forage',None,'camp'),E,E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 4 次' in page.locator('#result').inner_text() and '额外行军耗粮 7' in page.locator('#result').inner_text()
    page.screenshot(path=str(OUT / '390-sixth-rush.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','courier','pass'),('march','courier','beacon'),E,
                 ('march','courier','outpost'),('forage',None,'camp'),E,
                 ('forage',None,'camp'),E,E])
    assert '军情未竟' in page.locator('#result').inner_text()
    assert '驿骑到过 烽台、远哨 ✓、北望 ✓' in page.locator('#status').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth') <= 390
    page.screenshot(path=str(OUT / '390-sixth-north-missed-relay.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','courier','pass'),('march','courier','relay'),E,
                 ('march','courier','outpost'),('forage',None,'camp'),E,
                 ('march','courier','beacon'),('forage',None,'camp'),E,E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 4 次' in page.locator('#result').inner_text() and '额外行军耗粮 8' in page.locator('#result').inner_text()
    page.locator('[data-result="next"]').click()
    assert page.locator('#chapter-title').inner_text().startswith('七')
    assert '第 2 回合末' in page.locator('#intel').inner_text()
    route(page, [('march','courier','granary'),('march','courier','ford'),E,
                 ('march','courier','relay'),('march','courier','outpost'),E])
    assert '敌方' in page.locator('[data-node="relay"]').get_attribute('aria-label')
    route(page, [('march','guard','pass'),('fortify','courier'),E,
                 ('march','guard','relay'),('forage',None,'camp'),E,E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 6 次' in page.locator('#result').inner_text() and '驻防 1 次' in page.locator('#result').inner_text()
    page.screenshot(path=str(OUT / '390-seventh-rush.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','guard','pass'),('march','courier','granary'),E,
                 ('march','guard','relay'),('march','courier','ford'),E,
                 ('march','guard','outpost'),('march','courier','relay'),E,
                 ('forage',None,'camp'),('march','courier','outpost'),E,
                 ('forage',None,'camp'),E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 7 次' in page.locator('#result').inner_text() and '驻防 0 次' in page.locator('#result').inner_text()
    page.locator('[data-result="next"]').click()
    assert page.locator('#chapter-title').inner_text().startswith('八')
    assert page.locator('#intel').inner_text().count('第 3 回合末') == 2
    page.screenshot(path=str(OUT / '390-eighth-start.png'), full_page=True)
    route(page, [('march','courier','granary'),('march','courier','ford'),('march','courier','relay'),E,
                 ('march','courier','outpost'),('march','courier','beacon'),('march','guard','granary'),E,
                 ('march','guard','camp'),('fortify','courier'),('forage',None,'camp'),E,
                 ('fortify','courier'),('forage',None,'camp'),E,('fortify','courier'),E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '驻防 3 次' in page.locator('#result').inner_text() and '额外行军耗粮 9' in page.locator('#result').inner_text()
    assert '本役已结束；已发生的突袭见行军日志' in page.locator('#intel').inner_text()
    page.screenshot(path=str(OUT / '390-eighth-courier.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','guard','beacon'),('march','courier','granary'),('march','courier','pass'),E,
                 ('march','courier','relay'),('march','courier','pass'),('forage',None,'camp'),E,
                 ('march','courier','granary'),('march','courier','camp'),('fortify','courier'),E,
                 ('forage',None,'camp'),E,('forage',None,'camp'),E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '驻防 1 次' in page.locator('#result').inner_text() and '额外行军耗粮 12' in page.locator('#result').inner_text()
    assert '本役已结束；已发生的突袭见行军日志' in page.locator('#intel').inner_text()
    assert len(page.locator('#chapter-pick button:enabled').all()) == 9
    assert page.evaluate('document.documentElement.scrollWidth') <= 390
    page.screenshot(path=str(OUT / '390-eighth-guard.png'), full_page=True)
    eighth_record = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    old_eighth = json.loads(eighth_record)
    old_eighth['unlocked'] = 7
    old_eighth_raw = json.dumps(old_eighth, ensure_ascii=False)
    old_eighth_context = browser.new_context(viewport={'width': 390, 'height': 844})
    old_eighth_context.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(old_eighth_raw) + ');')
    old_eighth_page = old_eighth_context.new_page()
    old_eighth_page.goto(base + '/experiments/border-letters/')
    assert old_eighth_page.locator('[data-stage="8"]').is_enabled()
    assert old_eighth_page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == old_eighth_raw
    old_eighth_page.locator('[data-result="next"]').click()
    assert old_eighth_page.locator('#chapter-title').inner_text().startswith('九')
    old_eighth_context.close()
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="cancel"]').click()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == eighth_record
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    do(page, 'march', 'guard', 'beacon')
    do(page, 'pause')
    eighth_pending = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.reload()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == eighth_pending
    do(page, 'pause')
    do(page, 'undo')
    assert '存粮 14' in page.locator('#supply-badge').inner_text()
    do(page, 'march', 'guard', 'beacon')
    page.locator('[data-action="end"]').click()
    pending_turn = page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn')
    assert pending_turn == 2 and page.locator('#settlement').is_visible()
    do(page, 'pause')
    page.reload()
    assert page.locator('#settlement').is_visible() and page.locator('[data-action="continue"]').is_disabled()
    do(page, 'pause')
    page.locator('[data-action="continue"]').click()
    assert page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == pending_turn
    do(page, 'end')
    do(page, 'end')
    assert '军情未竟' in page.locator('#result').inner_text()
    assert '本役已结束；已发生的突袭见行军日志' in page.locator('#intel').inner_text()
    assert '第 4 回合末' not in page.locator('#history').inner_text()

    # Ninth mission: guarded mountain route waits out the publicly announced closure.
    page.locator('[data-stage="8"]').click()
    assert page.locator('#chapter-title').inner_text().startswith('九')
    assert '第 3 回合浅渡—烽台封闭' in page.locator('#intel').inner_text()
    assert page.locator('#map .road.closed').count() == 0
    page.screenshot(path=str(OUT / '390-ninth-start.png'), full_page=True)
    route(page, [('march','guard','granary'),('march','guard','pass'),E,
                 ('march','guard','relay'),('march','courier','ford')])
    page.locator('[data-action="end"]').click()
    assert page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 3
    assert page.locator('#settlement').is_visible()
    assert page.locator('#map .road.closed').count() == 1
    assert page.locator('#road-legend').is_visible()
    assert '下一部署回合封闭' in page.locator('#intel').inner_text()
    page.keyboard.press('e')
    assert page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 3
    page.locator('[data-action="continue"]').click()
    assert '当前封闭' in page.locator('#intel').inner_text()
    page.locator('[data-unit="courier"]').click()
    page.locator('[data-node="relay"]').click()
    assert '未耗命令与军粮' in page.locator('#selection').inner_text()
    closed_save = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.locator('[data-action="march"]').click()
    assert '本次未耗命令或军粮' in page.locator('#feedback').inner_text()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == closed_save
    page.screenshot(path=str(OUT / '390-ninth-closed.png'), full_page=True)
    closed_touch = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    closed_touch.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(closed_save) + ');')
    closed_touch_page = closed_touch.new_page()
    closed_touch_page.goto(base + '/experiments/border-letters/')
    closed_touch_page.locator('[data-action="pause"]').tap()
    closed_touch_page.locator('[data-unit="courier"]').tap()
    closed_touch_page.locator('[data-node="relay"]').tap()
    touch_before = closed_touch_page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    closed_touch_page.locator('[data-action="march"]').tap()
    assert '本次未耗命令或军粮' in closed_touch_page.locator('#feedback').inner_text()
    assert closed_touch_page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == touch_before
    closed_touch.close()
    closed_keyboard = browser.new_context(viewport={'width': 1280, 'height': 800})
    closed_keyboard.add_init_script('localStorage.setItem(' + json.dumps('atlas.border-letters.v1') + ',' + json.dumps(closed_save) + ');')
    closed_keyboard_page = closed_keyboard.new_page()
    closed_keyboard_page.goto(base + '/experiments/border-letters/')
    closed_keyboard_page.keyboard.press('Escape')
    closed_keyboard_page.keyboard.press('2')
    closed_keyboard_page.locator('[data-node="relay"]').focus()
    closed_keyboard_page.keyboard.press('Enter')
    key_before = closed_keyboard_page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    closed_keyboard_page.keyboard.press('m')
    assert '本次未耗命令或军粮' in closed_keyboard_page.locator('#feedback').inner_text()
    assert closed_keyboard_page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == key_before
    closed_keyboard.close()
    do(page, 'pause')
    paused_closed = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.reload()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == paused_closed
    assert page.locator('#map .road.closed').count() == 1
    do(page, 'pause')
    do(page, 'forage', at='camp')
    do(page, 'undo')
    assert page.locator('#map .road.closed').count() == 1
    route(page, [('forage',None,'camp'),('forage',None,'camp')])
    page.locator('[data-action="end"]').click()
    assert page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 4
    assert page.locator('#settlement').is_visible()
    assert page.locator('#map .road.closed').count() == 0
    assert '下一部署回合重开' in page.locator('#intel').inner_text()
    page.keyboard.press('e')
    assert page.evaluate('JSON.parse(localStorage.getItem("atlas.border-letters.v1")).state.turn') == 4
    page.locator('[data-action="continue"]').click()
    assert '现已重开' in page.locator('#intel').inner_text()
    route(page, [('march','courier','relay'),('march','courier','outpost'),E,E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 6 次' in page.locator('#result').inner_text() and '额外行军耗粮 8' in page.locator('#result').inner_text()
    assert '驻防 0 次' in page.locator('#result').inner_text()
    page.screenshot(path=str(OUT / '390-ninth-guard.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','guard','granary'),('march','courier','ford'),E,
                 ('march','guard','pass'),('forage',None,'camp'),E,
                 ('forage',None,'camp'),E])
    assert '敌方' in page.locator('[data-node="relay"]').get_attribute('aria-label')
    route(page, [('march','guard','relay'),('march','courier','relay'),E,
                 ('march','courier','outpost'),E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 6 次' in page.locator('#result').inner_text() and '额外行军耗粮 8' in page.locator('#result').inner_text()
    assert '驱散敌兵' in page.locator('#history').inner_text()
    page.screenshot(path=str(OUT / '390-ninth-recover.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','courier','ford'),('march','courier','relay'),E,('forage',None,'camp'),E])
    page.locator('[data-unit="courier"]').click()
    page.locator('[data-node="outpost"]').click()
    assert '地形 1 + 断线 1' in page.locator('#selection').inner_text()
    page.screenshot(path=str(OUT / '390-ninth-supply-break.png'), full_page=True)
    route(page, [('fortify','courier'),E,('march','courier','outpost'),E,
                 ('march','courier','relay'),('fortify','courier'),E])
    assert '来信送达' in page.locator('#result').inner_text()
    assert '行军 4 次' in page.locator('#result').inner_text() and '额外行军耗粮 4' in page.locator('#result').inner_text()
    assert '驻防 2 次' in page.locator('#result').inner_text()
    page.screenshot(path=str(OUT / '390-ninth-courier.png'), full_page=True)
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    route(page, [('march','courier','ford'),('march','courier','relay'),E,
                 ('forage',None,'camp'),E,E,E,E])
    assert '军情未竟' in page.locator('#result').inner_text()
    lost_ninth = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="cancel"]').click()
    assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == lost_ninth
    page.locator('[data-result="retry"]').click()
    page.locator('#restart-dialog button[value="restart"]').click()
    page.wait_for_function('document.querySelector("#turn-badge").textContent.includes("第 1 / 5 回合")')
    assert page.locator('#chapter-title').inner_text().startswith('九')
    assert page.evaluate('document.documentElement.scrollWidth') <= 390

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
    wide.evaluate('''async () => { const { newGame } = await import('./engine.mjs'); localStorage.setItem('atlas.border-letters.v1', JSON.stringify({ unlocked: 8, state: newGame(8) })); }''')
    wide.reload()
    assert wide.locator('#chapter-title').inner_text().startswith('九')
    wide.locator('[data-action="pause"]').click()
    assert wide.evaluate('document.documentElement.scrollWidth') <= 1280
    wide.screenshot(path=str(OUT / '1280-ninth-start.png'), full_page=True)
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
    print(json.dumps({'passed': True, 'scope': 'local Chromium nine-mission pointer campaign; ninth guarded, delayed-recovery and courier routes, closed-road failure/retry, turn 2→3 and 3→4 pending boundaries, 390 touch and keyboard rejection; first-eight regressions, old fifth/sixth/eighth saves, double click and held-key settlement checks, 390/wide pixels', 'screenshots': [str(x) for x in sorted(OUT.glob('*.png'))]}, ensure_ascii=False))
    browser.close()
server.shutdown()
