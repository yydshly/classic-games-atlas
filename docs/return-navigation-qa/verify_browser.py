import asyncio,pathlib,json,os,argparse,urllib.parse,hashlib,subprocess,re
from playwright.async_api import async_playwright,TimeoutError
arg=argparse.ArgumentParser();arg.add_argument('--base',required=True);arg.add_argument('--out',required=True);arg.add_argument('--slugs');a=arg.parse_args();R=pathlib.Path('.local/return-navigation-round');O=pathlib.Path(a.out);O.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());inventory_path=R/'inventory-before.json';inventory_path=inventory_path if inventory_path.exists() else pathlib.Path(__file__).with_name('inventory-before.json');inventory=json.loads(inventory_path.read_text(encoding='utf-8'))['items'];selected=set(a.slugs.split(','))if a.slugs else None
saved=O/'report.json';prior=json.loads(saved.read_text(encoding='utf-8'))if saved.exists()else{'base':a.base,'items':[]};assert prior['base']==a.base;results={(r['slug'],r['view']):r for r in prior['items']};baseurl=urllib.parse.urlparse(a.base);root=baseurl.path
def home(url):
 u=urllib.parse.urlparse(str(url));return u.netloc==baseurl.netloc and u.path in [root,root+'index.html']
def persist():
 rows=list(results.values());saved.write_text(json.dumps({'base':a.base,'status':'passed'if len(rows)==70 and all(r['status']=='passed'for r in rows)else'in_progress','items':rows,'ordinaryUi':True,'notGameCompletion':True},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def fingerprint(item):
 p=pathlib.Path(item['file']);source=p.read_bytes()if p.exists()else subprocess.check_output(['git','show','HEAD:'+item['file']]);return hashlib.sha256(source).hexdigest()
async def dismiss(page,record):
 await page.wait_for_timeout(160)
 for _ in range(3):
  dialogs=page.locator('dialog[open]')
  if not await dialogs.count():return
  dialog=dialogs.last;ident=await dialog.get_attribute('id')or''
  if not re.search('help|tutorial|intro|guide',ident,re.I):
   await page.keyboard.press('Escape');record.append({'dialog':ident,'action':'normal Escape'});continue
  buttons=dialog.locator('button');choices=[]
  for i in range(await buttons.count()):
   button=buttons.nth(i);label=await button.inner_text();bid=await button.get_attribute('id')or''
   if await button.is_visible()and(re.search('关闭|明白|知道|去经营|继续|进入|合上|记住|读完|收起|开始|好的|返回',label)or re.search('close|dismiss',bid,re.I)):choices.append((button,label))
  if not choices:await page.keyboard.press('Escape');record.append({'dialog':ident,'action':'normal Escape'});continue
  button,label=choices[-1];await button.click(no_wait_after=True);record.append({'dialog':ident,'action':'normal button','label':label});await page.wait_for_timeout(80)
async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(timeout=20000);sem=asyncio.Semaphore(3)
  async def run(item,view):
   key=(item['slug'],view);digest=fingerprint(item)
   if key in results and results[key]['status']=='passed'and results[key]['htmlFingerprint']==digest:return
   async with sem:
    context=await browser.new_context(viewport={'width':1440 if view=='desktop'else 390,'height':1050 if view=='desktop'else 844},is_mobile=view=='narrow',has_touch=view=='narrow');page=await context.new_page();page.set_default_timeout(14000);errors=[];http=[];failed=[];cancelled=[];docrequests=[];dialogs=[];r={'slug':item['slug'],'title':item['title'],'view':view,'route':item['route'],'htmlFingerprint':digest,'status':'running','guideDismissals':dialogs}
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text)if m.type=='error'else None);page.on('response',lambda x:http.append({'url':x.url,'status':x.status})if x.status>=400 else None);page.on('requestfailed',lambda x:(cancelled if x.failure=='net::ERR_ABORTED'else failed).append({'url':x.url,'error':x.failure}));page.on('request',lambda x:docrequests.append(x.url)if x.resource_type=='document'else None)
    try:
     await page.goto(a.base,wait_until='domcontentloaded',timeout=25000);await page.locator('#play-grid article').first.wait_for(state='attached');await page.locator('#play-search').fill(item['slug']);version='v3'if '/v3/'in item['route']else'v2'if '/v2/'in item['route']else'v1';await page.locator('#play-version').select_option(version);card=page.locator('#play-grid [data-play="'+item['slug']+'"]');await card.wait_for();target=card.locator('.play-launch');await target.scroll_into_view_if_needed();y=await page.evaluate('scrollY');count=await page.locator('#play-grid article').count();href=await target.get_attribute('href');await target.click(no_wait_after=True);await page.wait_for_url(lambda u:urllib.parse.urlparse(str(u)).path.rstrip('/').removesuffix('/index.html')==urllib.parse.urlparse(urllib.parse.urljoin(a.base,href)).path.rstrip('/').removesuffix('/index.html'),wait_until='domcontentloaded',timeout=20000)
     await dismiss(page,dialogs)
     links=await page.locator('a[href]').evaluate_all('(es)=>es.map(a=>({href:a.getAttribute("href"),url:a.href,text:a.innerText,visible:!!a.getClientRects().length}))');choices=[l for l in links if l['visible']and home(l['url'])and urllib.parse.urlparse(l['url']).fragment not in ['collection']and not re.match('^(?:game|compare)=',urllib.parse.urlparse(l['url']).fragment)];assert choices,'No ordinary visible homepage link';choices.sort(key=lambda l:('#play'not in l['url'],not bool(re.search('返回|回到|游戏集|游戏图鉴',l['text']))));choice=choices[0];nav=page.locator('a[href="'+choice['href']+'"]').first;await nav.scroll_into_view_if_needed();r['returnControl']=choice;r['beforeExitPageOverflow']=await page.evaluate('document.documentElement.scrollWidth>innerWidth')
     if item['slug']in ['echo','maze','petal','harbor','feather']:await page.screenshot(path=str(O/(item['slug']+'-'+view+'-game.png')))
     if view=='desktop':
      await nav.focus();docrequests.clear();await page.keyboard.press('Enter')
      try:await page.wait_for_url(home,wait_until='domcontentloaded',timeout=5000);r['keyboardExit']='passed'
      except TimeoutError:
       if any(home(u)for u in docrequests):await page.wait_for_url(home,wait_until='domcontentloaded',timeout=15000);r['keyboardExit']='passed_after_transport_wait'
       else:
        r['keyboardExit']='blocked';await dismiss(page,dialogs);await nav.click(no_wait_after=True);await page.wait_for_url(home,wait_until='domcontentloaded',timeout=20000)
     else:await nav.tap(no_wait_after=True);await page.wait_for_url(home,wait_until='domcontentloaded',timeout=20000);r['touchEmulationExit']='passed'
     await page.wait_for_function('(s)=>document.querySelector("#play-search")?.value===s.slug&&document.querySelector("#play-version")?.value===s.version&&document.querySelectorAll("#play-grid article").length===s.count',arg={'slug':item['slug'],'version':version,'count':count},timeout=18000);await page.wait_for_function('(s)=>document.activeElement.matches(".play-launch")&&Math.abs(scrollY-s.y)<60',arg={'y':y},timeout=5000)
     r['returned']={'url':page.url,'query':await page.locator('#play-search').input_value(),'version':await page.locator('#play-version').input_value(),'count':await page.locator('#play-grid article').count(),'expectedCount':count,'launchY':y,'returnedY':await page.evaluate('scrollY'),'focusHref':await page.locator(':focus').get_attribute('href'),'pageOverflow':await page.evaluate('document.documentElement.scrollWidth>innerWidth')};assert not r['returned']['pageOverflow'];assert not r['beforeExitPageOverflow'];assert not errors and not http and not failed,(errors,http,failed)
     if item['slug']in ['echo','maze','petal','harbor','feather']:
      await page.wait_for_function('(slug)=>Array.from(document.querySelectorAll("#play-grid [data-play="+slug+"] img")).every(i=>i.complete&&i.naturalWidth>0)',arg=item['slug'],timeout=15000);await page.screenshot(path=str(O/(item['slug']+'-'+view+'-returned.png')))
     assert r.get('keyboardExit')!='blocked','Keyboard Enter prevented navigation; pointer fallback passed';r['status']='passed'
    except Exception as e:
     r['status']='failed';r['errorType']=type(e).__name__;r['error']=str(e);r['diagnostic']=await page.evaluate('({url:location.href,y:scrollY,active:document.activeElement.outerHTML.slice(0,300),text:document.body.innerText.slice(0,600)})');await page.screenshot(path=str(O/(item['slug']+'-'+view+'-failure.png')))
    finally:
     r.update({'consoleErrors':errors,'httpErrors':http,'unexpectedRequestFailures':failed,'navigationOrRerenderCancellations':cancelled});results[key]=r;persist();print(json.dumps({'slug':item['slug'],'view':view,'status':r['status'],'keyboard':r.get('keyboardExit'),'error':r.get('error','')[:220]},ensure_ascii=False),flush=True);await context.close()
  await asyncio.gather(*(run(item,view)for item in inventory if selected is None or item['slug']in selected for view in ['desktop','narrow']));await browser.close()
 rows=list(results.values());print(json.dumps({'tested':len(rows),'passed':sum(r['status']=='passed'for r in rows),'failed':[(r['slug'],r['view'],r.get('errorType'))for r in rows if r['status']!='passed']},ensure_ascii=False));assert len(rows)==70 and all(r['status']=='passed'for r in rows)
asyncio.run(main())
