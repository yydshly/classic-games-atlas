import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local/fog-harbor-evidence-qa'
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def save(page):
    return page.evaluate("localStorage.getItem('classic-games-atlas:fog-harbor-ledger:v1')")


def select(page, reason):
    page.locator(f'#reasons [data-reason="{reason}"]').click()
    assert page.locator(f'#reasons [data-reason="{reason}"]').get_attribute('aria-pressed') == 'true'


def verdict(page, reason):
    select(page, reason)
    page.locator('#release' if reason == 'none' else '#hold').click()
    page.wait_for_timeout(280)


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f'http://127.0.0.1:{server.server_address[1]}/experiments/fog-harbor-ledger/'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width': 1165, 'height': 747})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(url)
            assert page.locator('meta[name="game-build"]').get_attribute('content') == 'fog-harbor-three-shifts-evidence-1'
            page.locator('#start').click()
            assert page.locator('#release').is_disabled() and page.locator('#hold').is_disabled()
            select(page, 'none')
            page.locator('#pause').click()
            before_cancel = save(page)
            page.locator('#retry').click()
            page.locator('#cancel-retry').click()
            assert save(page) == before_cancel
            page.reload()
            assert page.locator('#phase').inner_text() == '已暂停'
            assert page.locator('[data-reason="none"]').get_attribute('aria-pressed') == 'true'
            page.locator('#resume').click()
            page.locator('#release').click()
            page.wait_for_timeout(280)
            assert page.locator('#case-count').inner_text() == '1/5'
            assert page.locator('#release').is_disabled() and page.locator('#hold').is_disabled()
            for reason in ['expiry', 'seal', 'route', 'none']:
                verdict(page, reason)
            assert page.locator('#phase').inner_text() == '本班完成'
            assert '进入下一班' in page.locator('#case-intro').inner_text()
            page.locator('#next').click()
            page.locator('#start').click()
            verdict(page, 'none')
            select(page, 'seal')
            page.locator('#inspect').click()
            assert page.locator('#release').is_disabled() and page.locator('#hold').is_disabled()
            for reason in ['none', 'cargo', 'none', 'expiry', 'none']:
                verdict(page, reason)
            assert page.locator('#phase').inner_text() == '本班完成'
            page.locator('#next').click()
            page.locator('#start').click()
            page.locator('#inspect').click()
            verdict(page, 'none')
            verdict(page, 'weight')
            verdict(page, 'none')
            page.locator('#copy').click()
            for reason in ['seal', 'route', 'expiry']:
                verdict(page, reason)
            assert page.locator('#phase').inner_text() == '本班完成'
            assert '三班全部完成' in page.locator('#case-intro').inner_text()
            assert '进入下一班' not in page.locator('#case-intro').inner_text()
            assert page.locator('#next').is_hidden()
            page.screenshot(path=str(OUT / 'desktop-final.png'), full_page=True)
            final = json.loads(save(page))
            assert final['records'][0] and final['records'][1] and final['records'][2]
            assert final['evidence'] is None
            assert not errors, errors

            mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
            m = mobile.new_page()
            mobile_errors = []
            m.on('pageerror', lambda e: mobile_errors.append(str(e)))
            m.goto(url)
            assert m.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            m.locator('#start').tap()
            m.locator('[data-reason="expiry"]').tap()
            assert json.loads(save(m))['evidence'] == 'expiry'
            assert '本船已选：航证过期' in m.locator('#evidence-status').inner_text()
            m.screenshot(path=str(OUT / 'mobile-selected.png'), full_page=True)
            m.reload()
            assert m.locator('#phase').inner_text() == '已暂停'
            assert m.locator('[data-reason="expiry"]').get_attribute('aria-pressed') == 'true'
            m.locator('#resume').tap()
            m.locator('#hold').tap()
            assert json.loads(save(m))['evidence'] is None
            m.locator('#retry').tap()
            old = save(m)
            m.locator('#cancel-retry').tap()
            assert save(m) == old
            m.locator('#retry').tap()
            m.locator('#confirm-retry').tap()
            assert json.loads(save(m))['phase'] == 'ready'
            m.locator('#start').tap()
            m.keyboard.press('1')
            assert json.loads(save(m))['evidence'] == 'none'
            m.keyboard.press('r')
            assert json.loads(save(m))['cursor'] == 1
            m.screenshot(path=str(OUT / 'mobile-retry.png'), full_page=True)
            assert not mobile_errors, mobile_errors

            legacy = browser.new_context(viewport={'width': 1165, 'height': 747})
            old = legacy.new_page()
            old.goto(url)
            old.locator('#start').click()
            old.locator('[data-reason="none"]').click()
            legacy_snapshot = json.loads(save(old))
            del legacy_snapshot['evidence']
            old.add_init_script(script=f"localStorage.setItem('classic-games-atlas:fog-harbor-ledger:v1', {json.dumps(json.dumps(legacy_snapshot))});")
            old.reload()
            assert '旧档未保存本船证据' in old.locator('#status').inner_text(), (old.locator('#status').inner_text(), save(old))
            old.locator('#resume').click()
            assert old.locator('#release').is_disabled() and old.locator('#hold').is_disabled()
            old.locator('[data-reason="none"]').click()
            old.locator('#release').click()
            assert old.locator('#case-count').inner_text() == '1/5'
            print(json.dumps({'desktop': 'three shifts complete; selection retained on refresh; next ship clears; final copy accurate', 'mobile': '390 touch selection retained, next ship clears, retry cancel/confirm correct, keyboard evidence/verdict correct, no horizontal overflow', 'legacy': 'old save without evidence safely requires re-selection', 'records': final['records']}, ensure_ascii=False))
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == '__main__':
    run()
