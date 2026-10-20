"""Focused homepage follow-up; no game replay or injected state."""
import argparse,asyncio,datetime,json,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[4]
async def main(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);root=a.root.rstrip('/')+'/'
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'root':root,'scope':'Only homepage entry/version filter/comparison after both public UI adventures passed. Normal link/button events; read-only snapshot.','consoleErrors':[],'badResponses':[],'requestFailures':[]}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch();page=await browser.new_page(viewport={'width':1440,'height':1000});page.set_default_navigation_timeout(60000)
  page.on('pageerror',lambda e:report['consoleErrors'].append(str(e)))
  page.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
  page.on('response',lambda r:report['badResponses'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'failure':r.failure}))
  try:
   await page.goto(root,wait_until='domcontentloaded');await page.locator('#play-search').wait_for()
   await page.locator('#play-search').fill('32');await page.locator('#play-version').select_option('v3')
   card=page.locator('[data-play="feather"]');await card.wait_for();assert await page.locator('[data-play]').count()==1
   count=int(re.search(r'/\s*(\d+)',await page.locator('#play-result-count').inner_text()).group(1));assert count==40
   assert 'v3' in (await card.inner_text()).lower();href=await card.locator('.play-launch').get_attribute('href');assert '/versions/v3/games/feather/' in href
   await card.scroll_into_view_if_needed();await page.screenshot(path=str(out/'homepage-32.png'))
   await card.locator('.play-launch').click(no_wait_after=True)
   await page.wait_for_url('**/versions/v3/games/feather/',wait_until='domcontentloaded')
   await page.wait_for_function('typeof window.featherJourneySnapshot==="function"&&window.featherJourneySnapshot().assetsReady',timeout=60000)
   assert (await page.evaluate('window.featherJourneySnapshot()'))['version']==3
   report['entry']={'href':href,'renderedURL':page.url,'versionFilter':'v3','libraryCount':count}
   await page.goto(root,wait_until='domcontentloaded');await page.locator('#play-search').wait_for();await page.locator('#play-search').fill('32')
   await page.locator('[data-play="feather"] a[href="#compare=feather"]').click();await page.locator('#game-dialog[open]').wait_for()
   dialog=page.locator('#game-dialog');assert '浅滩冒险' in await dialog.inner_text()
   links=await dialog.locator('a').evaluate_all('(links)=>links.map(a=>a.getAttribute("href"))')
   for version in ['versions/v3/games/feather/','versions/v2/games/feather/','./games/feather/']:assert any(version in x for x in links if x),version
   await page.screenshot(path=str(out/'comparison-32.png'));report['comparison']={'v1V2V3LinksPresent':True}
   assert not report['consoleErrors'] and not report['badResponses'] and not report['requestFailures']
   report['passed']=True
  except Exception as e:report['error']=type(e).__name__+': '+str(e);raise
  finally:
   (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');await browser.close()
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',default='https://yydshly.github.io/classic-games-atlas');p.add_argument('--out',default='.local/feather-journey-qa/site-followup');asyncio.run(main(p.parse_args()))
