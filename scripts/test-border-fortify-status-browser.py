"""Check fortify wording through normal play in isolated local Chromium contexts."""
from __future__ import annotations

import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local' / 'border-fortify-status'
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/experiments/border-letters/'


def status(page, unit):
    return page.locator(f'[data-unit="{unit}"]').inner_text()


def hit(page, selector):
    target = page.locator(selector)
    if page.evaluate('navigator.maxTouchPoints > 0'):
        target.tap()
    else:
        target.click()


def act(page, name):
    hit(page, f'[data-action="{name}"]')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width, touch in ((390, True), (1280, False)):
        context = browser.new_context(viewport={'width': width, 'height': 844}, has_touch=touch, is_mobile=touch)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        assert '当前守力 3' in status(page, 'guard')
        assert '尚未驻防；可用 1 命令使本回合守力 +2' in status(page, 'guard')
        assert '当前守力 1' in status(page, 'courier')
        act(page, 'pause')
        assert '已暂停；恢复后可下令驻防' in status(page, 'guard')
        act(page, 'pause')
        hit(page, '[data-unit="courier"]')
        if touch:
            act(page, 'fortify')
        else:
            page.keyboard.press('g')
        assert '当前守力 2' in status(page, 'courier')
        assert '本回合已驻防：+1 已计入当前守力' in status(page, 'courier')
        assert '谷仓当前守力 2' in page.locator('#fortify-preview').inner_text()
        assert '结算完后失效' in page.locator('#fortify-preview').inner_text()
        page.screenshot(path=str(OUT / f'{width}-fortified.png'), full_page=True)

        act(page, 'pause')
        assert '已暂停；本回合已驻防' in status(page, 'courier')
        saved = page.evaluate('localStorage.getItem("atlas.border-letters.v1")')
        page.reload()
        assert page.evaluate('localStorage.getItem("atlas.border-letters.v1")') == saved
        assert '已暂停；本回合已驻防' in status(page, 'courier')
        act(page, 'pause')
        act(page, 'end')
        assert '本回合已结算，驻防已失效；待继续部署' in status(page, 'courier')
        assert '当前守力 1' in status(page, 'courier')
        assert page.locator('[data-action="fortify"]').is_disabled()
        act(page, 'continue')
        assert '尚未驻防；可用 1 命令使本回合守力 +1' in status(page, 'courier')
        hit(page, '[data-unit="courier"]')
        act(page, 'fortify')
        hit(page, '[data-node="camp"]')
        act(page, 'forage')
        assert '本回合命令已用尽，无法再驻防' in status(page, 'guard')
        assert '本回合已驻防：+1 已计入当前守力' in status(page, 'courier')
        act(page, 'end')
        act(page, 'continue')
        assert '当前守力 1' in status(page, 'courier')
        assert '尚未驻防；可用 1 命令使本回合守力 +1' in status(page, 'courier')
        act(page, 'end')
        assert '来信送达' in page.locator('#result').inner_text()
        assert '当前守力 3' in status(page, 'guard')
        assert '本役已结束；驻防命令不可用' in status(page, 'guard')
        assert '本役已结束；驻防命令不可用' in status(page, 'courier')
        assert '驻防 +2' not in page.locator('#units').inner_text()
        assert page.locator('#fortify-preview').is_hidden()
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        page.screenshot(path=str(OUT / f'{width}-won.png'), full_page=True)
        assert not errors, errors
        context.close()

    context = browser.new_context(viewport={'width': 390, 'height': 844})
    page = context.new_page()
    page.goto(url)
    page.locator('[data-unit="guard"]').click()
    page.locator('[data-node="granary"]').click()
    act(page, 'march')
    act(page, 'end')
    act(page, 'continue')
    act(page, 'end')
    act(page, 'continue')
    act(page, 'end')
    assert '军情未竟' in page.locator('#result').inner_text()
    assert '本役已结束；驻防命令不可用' in status(page, 'guard')
    context.close()
    browser.close()
server.shutdown()
print('Fortify status: pointer, 390 touch, pause/reload, pending, spent orders, win/loss and narrow layout passed.')
