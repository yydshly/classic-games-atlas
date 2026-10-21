import pathlib,os,json,argparse,re
from playwright.sync_api import sync_playwright
a=argparse.ArgumentParser();a.add_argument('--base',required=True);a.add_argument('--out',required=True);a=a.parse_args();O=pathlib.Path(a.out);O.mkdir(parents=True,exist_ok=True);R=pathlib.Path('.local/new-player-journey');(R/'tmp').mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve());views=[]
with sync_playwright()as pw:
 b=pw.chromium.launch(timeout=20000)
 for view,w,h in [('desktop',1440,1050),('narrow',390,844)]:
  c=b.new_context(viewport={'width':w,'height':h},is_mobile=view=='narrow',has_touch=view=='narrow');p=c.new_page();p.set_default_timeout(12000);steps=[];errors=[];http=[];failed=[];cancelled=[]
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text)if m.type=='error'else None);p.on('response',lambda r:http.append({'url':r.url,'status':r.status})if r.status>=400 else None);p.on('requestfailed',lambda r:(cancelled if r.failure=='net::ERR_ABORTED' else failed).append({'url':r.url,'error':r.failure}))
  def shot(n,name,note):
   if name in ['entry','filtered','returned','expanded-return']:p.wait_for_function('Array.from(document.querySelectorAll("#play-grid [data-play=fortress] img")).every(i=>i.complete&&i.naturalWidth>0)',timeout=10000)
   if name=='comparison':p.locator('.comparison-version').scroll_into_view_if_needed()
   p.screenshot(path=str(O/(view+'-'+str(n).zfill(2)+'-'+name+'.png')));steps.append({'step':n,'name':name,'description':note,'health':'passed','url':p.url,'scrollY':p.evaluate('scrollY'),'active':p.evaluate('({id:document.activeElement.id,href:document.activeElement.getAttribute("href"),text:document.activeElement.innerText.slice(0,100)})')});print(view+' step'+str(n)+' '+name,flush=True)
  def tap(locator):
   assert locator.count()==1
   if view=='narrow':locator.tap(no_wait_after=True)
   else:locator.click(no_wait_after=True)
  def home_ready():p.locator('#play-grid article').first.wait_for()
  def launch():
   target=p.locator('#play-grid [data-play="fortress"] .play-launch');target.scroll_into_view_if_needed();y=p.evaluate('scrollY')
   if view=='desktop':target.focus();p.keyboard.press('Enter')
   else:tap(target)
   p.wait_for_url('**/versions/v2/games/fortress/',wait_until='domcontentloaded',timeout=20000);p.wait_for_function('!!window.__fortress',timeout=12000);return y
  def return_home():
   tap(p.get_by_role('link',name='← 游戏大厅'));p.wait_for_url(re.compile(r'/index.html#play$'),wait_until='domcontentloaded',timeout=20000);home_ready()
  try:
   p.goto(a.base,wait_until='domcontentloaded',timeout=25000);home_ready();assert p.locator('#play-grid article').count()==12;assert p.locator('#play-search').input_value()==''
   p.keyboard.press('Tab');assert p.locator(':focus').inner_text()=='跳到游戏大厅';p.keyboard.press('Enter');p.keyboard.press('Tab');assert p.locator(':focus').get_attribute('id')=='play-search';shot(1,'entry','首页原创范围与候选状态可见；键盘跳到大厅后可到搜索')
   p.locator('#play-search').fill('堡垒');p.locator('#play-version').select_option('v2');assert p.locator('#play-grid article').count()==1;p.locator('#play-version').focus();shot(2,'filtered','名称与版本筛选指向一款；主入口明确为v2候选')
   for _ in range(9):
    p.keyboard.press('Tab')
    if p.locator(':focus').get_attribute('href')=='#compare=fortress':break
   assert p.locator(':focus').get_attribute('href')=='#compare=fortress';p.keyboard.press('Enter');p.locator('#game-dialog[open]').wait_for();assert '首页入口为 v2' in p.locator('.comparison-version').inner_text();assert p.locator(':focus').get_attribute('class')=='dialog-close';p.keyboard.press('Shift+Tab');assert p.locator('#game-dialog').evaluate('(d)=>d.contains(document.activeElement)');p.keyboard.press('Tab');assert p.locator(':focus').get_attribute('class')=='dialog-close';shot(3,'comparison','键盘打开对照，当前入口与v2一致；原作范围明确，焦点留在弹窗')
   p.keyboard.press('Escape');assert not p.locator('#game-dialog').is_visible();assert p.locator(':focus').get_attribute('href')=='#compare=fortress';launch_y=launch();assert p.locator('#state-label').inner_text()=='READY / 待命';assert p.locator('#clock').inner_text()=='00:00';assert p.get_by_role('link',name='原版十关').count()==1;shot(4,'recommended','推荐版待命目标与操作提示可见；直接回大厅和旧版入口同时保留')
   summary=p.locator('summary').filter(has_text='战场手册');tap(summary);p.locator('details p').last.scroll_into_view_if_needed();assert p.locator('details').get_attribute('open') is not None;assert 'P / Esc 暂停' in p.locator('details').inner_text();shot(5,'instructions','正常展开并滚动阅读操作手册；Battle City参考、原创两图及刷新规则明确')
   return_home();p.wait_for_function('document.querySelector("#play-search").value==="堡垒"&&document.querySelector("#play-version").value==="v2"');p.wait_for_function('(y)=>Math.abs(scrollY-y)<48',arg=launch_y,timeout=4000);assert p.locator('#play-grid article').count()==1;p.wait_for_function('document.activeElement.matches(".play-launch")',timeout=4000);assert p.locator(':focus').get_attribute('class')=='play-launch';assert p.locator(':focus').is_visible();shot(6,'returned','直接返回保留堡垒/v2筛选、原位置与启动链接焦点；无需进入旧版')
   if view=='desktop':
    p.locator('#play-search').fill('');p.locator('#play-version').select_option('all');tap(p.locator('#play-more'));assert p.locator('#play-grid article').count()==40;y=launch();return_home();p.wait_for_function('document.querySelectorAll("#play-grid article").length===40');p.wait_for_function('(y)=>Math.abs(scrollY-y)<48',arg=y,timeout=4000);shot(7,'expanded-return','展开全部40款后试玩并返回，展开数量和位置仍保留')
    launch();p.go_back(wait_until='domcontentloaded',timeout=20000);home_ready();assert p.locator('#play-grid article').count()==40;steps.append({'step':8,'name':'browser-back','description':'浏览器后退保留40款展开；普通导航，不改存档','health':'passed'})
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors and not http and not failed,(errors,http,failed)
   views.append({'view':view,'steps':steps,'consoleErrors':errors,'httpErrors':http,'requestFailures':failed,'navigationOrRerenderCancellations':cancelled,'method':'normal native pointer/keyboard/scroll/navigation only; no state/save/time injection','notRealDevice':view=='narrow'});c.close()
  except Exception as e:
   p.screenshot(path=str(O/(view+'-failure.png')));steps.append({'diagnostic':p.evaluate('({url:location.href,referrer:document.referrer,y:scrollY,active:document.activeElement.outerHTML.slice(0,500),count:document.querySelectorAll("#play-grid article").length})')});
   (O/'failure.json').write_text(json.dumps({'view':view,'error':str(e),'steps':steps,'consoleErrors':errors,'httpErrors':http,'requestFailures':failed},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close();raise
 b.close()
d={'status':'passed','base':a.base,'views':views,'scope':'home -> filter -> reference/implementation -> recommended ready -> instructions -> directory; no repeated game walkthrough'};(O/'report.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':'passed','steps':[len(v['steps'])for v in views]}),flush=True)
