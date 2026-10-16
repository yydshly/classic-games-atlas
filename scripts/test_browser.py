"""Browser acceptance checks. Uses an existing Python Playwright installation."""
import argparse
import datetime
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

def run(base, out):
    out.mkdir(parents=True, exist_ok=True)
    catalogue = json.loads((ROOT/'data/games.json').read_text(encoding='utf-8'))
    checks, errors, failures, bad_responses = [], [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width':1440,'height':1100}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: failures.append(dict(url=request.url,failure=request.failure)))
        page.on('response', lambda response: bad_responses.append(dict(url=response.url,status=response.status)) if response.status >= 400 else None)
        page.goto(base,wait_until='networkidle')
        expect(page.locator('.game-card')).to_have_count(72)
        expect(page.locator('.game-group')).to_have_count(10)
        checks.append('72 entries and 10 groups rendered from data/games.json')
        page.screenshot(path=str(out/'desktop.png'))
        page.locator('.section-heading').scroll_into_view_if_needed()
        page.screenshot(path=str(out/'desktop-catalogue.png'))
        for query, expected_id in [('魂斗罗','contra'),('HALF LIFE','half-life'),('超级玛丽','super-mario-bros'),('CS 1.6','counter-strike'),('帝国时代Ⅱ','age-empires-2'),('Pokemon','pokemon'),('冒险岛Online','maplestory')]:
            page.locator('#search').fill(query)
            expect(page.locator('.game-card')).to_have_count(1)
            expect(page.locator('.game-card')).to_have_attribute('data-game',expected_id)
        page.locator('#search').fill('冒险岛')
        expect(page.locator('.game-card')).to_have_count(2)
        checks.append('Chinese, English, case-insensitive aliases, punctuation and Roman numerals; distinct Adventure Island titles')
        page.locator('#reset').click()
        for group in catalogue['groups']:
            page.locator(f'[data-group="{group["id"]}"]').click()
            expected = sum(game['group']==group['id'] for game in catalogue['games'])
            expect(page.locator('.game-card')).to_have_count(expected)
            expect(page.locator(f'[data-group="{group["id"]}"]')).to_have_attribute('aria-pressed','true')
        page.locator('[data-group="arcade"]').click()
        page.locator('#genre').select_option('格斗')
        expect(page.locator('.game-card')).to_have_count(3)
        page.locator('#search').fill('KOF')
        expect(page.locator('.game-card')).to_have_count(1)
        checks.append('All 10 group counts; genre and search intersection')
        page.locator('#search').fill('没有这款游戏-xyz')
        expect(page.locator('.game-card')).to_have_count(0)
        expect(page.locator('#empty-state')).to_be_visible()
        expect(page.locator('#result-count')).to_have_text('找到 0 / 72 个作品与系列')
        page.screenshot(path=str(out/'empty-state.png'))
        page.locator('#empty-reset').click()
        expect(page.locator('.game-card')).to_have_count(72)
        expect(page.locator('#search')).to_be_focused()
        checks.append('Empty result, live count, reset restores all entries and focus')
        page.locator('#search').blur()
        page.keyboard.press('/')
        expect(page.locator('#search')).to_be_focused()
        button = page.locator('[data-open="super-mario-bros"]')
        button.focus()
        page.keyboard.press('Enter')
        expect(page.locator('#game-dialog')).to_be_visible()
        expect(page.locator('.dialog-close')).to_be_focused()
        page.keyboard.press('Shift+Tab')
        expect(page.locator('#game-dialog')).to_be_visible()
        assert page.evaluate('document.querySelector("#game-dialog").contains(document.activeElement)')
        page.keyboard.press('Escape')
        expect(page.locator('#game-dialog')).not_to_be_visible()
        expect(button).to_be_focused()
        checks.append('Keyboard / search shortcut, Enter open, native modal focus containment, Escape close, return focus')
        for game in catalogue['games']:
            page.locator(f'[data-open="{game["id"]}"]').click()
            expect(page.locator('#detail-title')).to_have_text(game['title'])
            expect(page.locator('.edition-note')).to_have_text(game['edition'])
            expect(page.locator('.source-item a')).to_have_count(len(game['sources']))
            page.locator('.dialog-close').click()
        checks.append('All 72 detail dialogs: title, version boundary, reference link and close')
        page.goto(base.rstrip('/')+'/#game=adventure-island',wait_until='networkidle')
        expect(page.locator('#detail-title')).to_have_text('冒险岛')
        page.screenshot(path=str(out/'desktop-detail.png'))
        page.reload(wait_until='networkidle')
        expect(page.locator('#game-dialog')).to_be_visible()
        page.keyboard.press('Escape')
        checks.append('Detail deep link survives reload')
        hrefs=page.locator('a').evaluate_all('(links)=>links.map(a=>a.getAttribute("href"))')
        assert all(href and (href.startswith(('https://','#','./'))) for href in hrefs)
        assert page.locator('a[target="_blank"]').evaluate_all('(links)=>links.every(a=>a.rel.includes("noopener") && a.rel.includes("noreferrer"))')
        checks.append('All rendered link shapes and external-link protections')
        responsive=[]
        for width in [320,360,390,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':900})
            page.goto(base,wait_until='networkidle')
            overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
            assert not overflow, f'horizontal overflow at {width}'
            assert page.locator('.game-card').count()==72
            responsive.append(dict(width=width,horizontalOverflow=overflow))
            if width==390:
                page.screenshot(path=str(out/'mobile.png'))
                page.locator('.section-heading').scroll_into_view_if_needed()
                page.screenshot(path=str(out/'mobile-catalogue.png'))
                page.locator('[data-open="super-mario-bros"]').click()
                expect(page.locator('#game-dialog')).to_be_visible()
                assert not page.locator('#game-dialog').evaluate('(d)=>d.scrollWidth > d.clientWidth')
                page.screenshot(path=str(out/'mobile-detail.png'))
                page.keyboard.press('Escape')
        checks.append('Responsive viewports 320, 360, 390, 768, 1024, 1440: no horizontal overflow')
        assert not errors, errors
        assert not failures, failures
        assert not bad_responses, bad_responses
        checks.append('No page errors, console errors, request failures or HTTP 4xx/5xx resources')
        report=dict(testedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),baseUrl=base,checks=checks,responsive=responsive,consoleErrors=errors,requestFailures=failures,badResponses=bad_responses,screenshots=[file.name for file in out.glob('*.png')])
        (out/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        browser.close()
        print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:4173/')
    parser.add_argument('--out',default='.local/qa')
    args=parser.parse_args()
    run(args.url,ROOT/args.out)
