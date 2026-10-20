"""One ordinary three-stage UI journey. No live engine calls, state writes, fixtures or accelerated time."""
import argparse,asyncio,datetime,hashlib,json,re,subprocess,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
KEY='atlas-expedition-v2-valley-20261018'
CONFIG=[('河谷立营',120,3,'北口',['南口','北口']),('林线争夺',140,3,'南口',['北口','南口']),('双隘寒潮',160,4,'北口',['南口','北口'])]
NAMES={'barracks':'兵营','watchtower':'哨塔','sawmill':'锯场','guard':'盾卫'}
async def main(a):
 out=ROOT/a.out;out.mkdir(parents=True,exist_ok=True);url=a.root.rstrip('/')+'/versions/v2/games/expedition/'
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'baseline':'d67ee536b1a5c8f02d1090eb02c2bf660568b805',
 'method':'One normal-resource public Chromium UI journey. Buttons and worker select controls only; policy observes DOM and read-only saved checkpoint logs. No injected saves, calls to live engine command/step, direct hidden-state access, modified rates or time acceleration. Each stage attempted once. Model feasibility/replay are separate.',
 'stages':[],'actions':[],'files':[],'consoleErrors':[],'badResponses':[],'requestFailures':[]}
 def save():(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 async def cp(page):
  raw=await page.evaluate('localStorage.getItem("atlas-expedition-v2-valley-20261018")')
  return json.loads(raw) if raw else None
 async def act(page,loc,label,expected_type=None):
  before=await cp(page);n=len(before['log']) if before else 0
  await loc.click(timeout=2000)
  if expected_type:
   await page.wait_for_function('n=>{const r=localStorage.getItem("atlas-expedition-v2-valley-20261018");return r&&JSON.parse(r).log.length===n}',arg=n+1)
   after=await cp(page);assert after['log'][-1]['command']['type']==expected_type
   report['actions'].append({'label':label,'level':after['levelIndex']+1,**after['log'][-1]});save()
 async def economy(page):await page.locator('#tab-economy').click()
 async def defense(page):await page.locator('#tab-defense').click()
 async def button(page,name):
  return page.locator('#actions button').filter(has_text=re.compile(r'^(?:✓ )?'+name)).first
 async def info(page):
  h=await page.locator('#hud strong').all_text_contents();army=await page.locator('#army').text_content()
  counts={f:int(re.search(f+r'：(\d+) 盾卫',army).group(1)) for f in ['营地','北口','南口']}
  moving=int(re.search(r'行军中 (\d+) 人',army).group(1));queue=await page.locator('#queue').text_content()
  labels=await page.locator('#actions button').all_text_contents()
  return {'food':int(h[0]),'wood':int(h[1]),'base':h[2],'remaining':int(re.search(r'\d+',h[3]).group()),'counts':counts,'moving':moving,'queued':queue.count('盾卫')+queue.count('工人'),'labels':labels,'goal':await page.locator('#goal-detail').inner_text()}
 async def capture(page,row,label,running=False):
  await page.wait_for_function('Array.from(document.querySelectorAll("#entities img")).every(i=>i.complete&&i.naturalWidth>0)',timeout=30000)
  entities=await page.locator('#entities .entity').evaluate_all('(es)=>es.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),i=e.querySelector("img");return {className:e.className,label:e.innerText,x:r.x,y:r.y,width:r.width,height:r.height,visible:!e.hidden&&s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)>0&&r.width>0&&r.height>0,loaded:i.complete&&i.naturalWidth>0}})')
  if running:assert await page.locator('#pause-layer').is_hidden(),'running screenshot accidentally paused'
  assert entities and all(e['loaded'] for e in entities);assert any('building' in e['className'] and e['visible'] for e in entities);assert sum(e['visible'] and 'person' in e['className'] for e in entities)>=4
  row['captures'].append({'label':label,'checkpointBefore':await cp(page),'ui':await info(page),'running':running,'entities':entities})
  await page.screenshot(path=str(out/(label+'.png')),full_page=True);row['captures'][-1]['checkpointAfter']=await cp(page);save()
 async with async_playwright() as pw:
  browser=await pw.chromium.launch();page=await browser.new_page(viewport={'width':1440,'height':1050});report['browser']=browser.version
  page.on('pageerror',lambda e:report['consoleErrors'].append(str(e)))
  page.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
  page.on('response',lambda r:report['badResponses'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'failure':r.failure}))
  try:
   paths=subprocess.check_output(['git','ls-tree','-r','--name-only','HEAD','--','versions/v2/games/expedition'],cwd=ROOT,text=True).splitlines()
   for path in paths:
    expected=subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT);response=await page.request.get(a.root.rstrip('/')+'/'+path+'?verify=expedition-end-d67ee53');data=await response.body();assert response.status==200 and data==expected,path
    report['files'].append({'path':path,'status':response.status,'sha256':hashlib.sha256(data).hexdigest(),'matchesBaseline':True})
   await page.goto(url,wait_until='domcontentloaded');await page.locator('#resume').wait_for();assert await cp(page) is None
   for index,(name,duration,target,initial,priority) in enumerate(CONFIG):
    assert await page.locator('#mission-title').inner_text()==name
    row={'level':index+1,'attempts':1,'captures':[],'progress':[]};report['stages'].append(row)
    ready=await info(page);assert ready['food']==32 and ready['wood']==36 and ready['remaining']==duration and ready['base']=='160 / 160' and ready['counts']['营地']==2
    row['freshStageResources']=ready;await capture(page,row,'stage-'+str(index+1)+'-ready')
    await act(page,page.locator('#resume'),'start stage','start')
    await economy(page);await act(page,await button(page,'兵营'),'build barracks','build')
    for worker,resource in [(2,'wood'),(3,'food'),(4,'wood')]:
     before=await cp(page);await page.get_by_label('工人 '+str(worker)+' 分工').select_option(resource);after=await cp(page);assert len(after['log'])==len(before['log'])+1
     report['actions'].append({'label':'assign worker '+str(worker),'level':index+1,**after['log'][-1]})
    await defense(page)
    for _ in range(2):await act(page,page.locator('#deployment button').filter(has_text='至'+initial),'initial deploy '+initial,'deploy')
    began=time.monotonic();last_progress=-20;captured=set()
    while await page.locator('#result').is_hidden():
     assert time.monotonic()-began<duration*2+60,'bounded single attempt exceeded wall-clock allowance'
     await economy(page)
     for worker,want in [(1,'food'),(2,'wood'),(3,'food'),(4,'wood')]:
      select=page.get_by_label('工人 '+str(worker)+' 分工')
      if await select.is_visible() and await select.is_enabled() and await select.input_value()=='idle':
       before=await cp(page);await select.select_option(want);after=await cp(page)
       if len(after['log'])==len(before['log'])+1:report['actions'].append({'label':'restore idle worker assignment','level':index+1,**after['log'][-1]})
     state=await info(page)
     done=lambda k:any(t.startswith('✓ '+NAMES[k]) for t in state['labels'])
     under=lambda k:any(t.startswith(NAMES[k]) and '建造中' in t for t in state['labels'])
     if done('barracks') and not done('watchtower') and not under('watchtower'):
      b=await button(page,'哨塔')
      if await b.is_enabled():await act(page,b,'build watchtower','build')
     state=await info(page)
     if index==1 and done('watchtower') and not done('sawmill') and not under('sawmill'):
      b=await button(page,'锯场')
      if await b.is_enabled():await act(page,b,'build goal sawmill','build')
     state=await info(page);reserve=18 if index==1 and not done('sawmill') and not under('sawmill') else 0
     total=sum(state['counts'].values())+state['moving']+state['queued']
     if done('barracks') and total<target*2 and state['queued']<3 and state['wood']-8>=reserve:
      b=await button(page,'盾卫')
      if await b.is_enabled():await act(page,b,'recruit guard','recruit')
     await defense(page);state=await info(page)
     if state['moving']==0 and state['counts']['营地']>0:
      front=next((f for f in priority if state['counts'][f]<target),None)
      if front:await act(page,page.locator('#deployment button').filter(has_text='至'+front),'fill front '+front,'deploy')
     state=await info(page);elapsed=duration-state['remaining']
     if elapsed-last_progress>=20:
      row['progress'].append({'elapsed':elapsed,**state});last_progress=elapsed;save();print(json.dumps({'level':index+1,'elapsed':elapsed,'base':state['base'],'fronts':state['counts'],'goal':state['goal']},ensure_ascii=False),flush=True)
     for marker in [40,87]:
      if elapsed>=marker and marker not in captured and elapsed<duration-2:
       await capture(page,row,'stage-'+str(index+1)+'-running-'+str(marker),True);captured.add(marker)
     if index==2 and 77<=elapsed<82 and 'dual' not in captured:
      enemies=await page.locator('#entities .raider').count();assert enemies==2,('expected both public simultaneous raids',elapsed,enemies)
      await capture(page,row,'stage-3-dual-77',True);captured.add('dual');row['dualRaidsObserved']=True
     await page.wait_for_timeout(1500)
    row['elapsedWallSeconds']=time.monotonic()-began;row['result']=await page.locator('#result').inner_text();row['finalCheckpoint']=await cp(page);row['finalUI']=await info(page)
    await capture(page,row,'stage-'+str(index+1)+'-result')
    assert '营火留到了天明' in row['result'],('ordinary UI attempt ended without a win; not automatically a bug',row)
    row['passed']=True;save();print(json.dumps({'stageFinished':index+1,'result':row['result'],'ui':row['finalUI']},ensure_ascii=False),flush=True)
    if index<2:
     await page.locator('#result button').filter(has_text='进入下一段挑战').click();await page.wait_for_function('document.getElementById("pause-layer").hidden===false')
     nextcp=await cp(page);assert nextcp['levelIndex']==index+1 and nextcp['tick']==0 and nextcp['log']==[]
   before=await cp(page);before_ui=await info(page)
   assert await page.locator('#result button').filter(has_text='进入下一段挑战').count()==0
   await page.reload(wait_until='domcontentloaded');await page.locator('#result').wait_for(state='visible')
   assert await cp(page)==before and await info(page)==before_ui
   await page.screenshot(path=str(out/'final-result-refreshed.png'),full_page=True)
   report['finalCompletionRefreshExact']=True;report['thirdStageDualRaidSeen']=report['stages'][2].get('dualRaidsObserved',False)
   assert report['thirdStageDualRaidSeen'];assert not report['consoleErrors'] and not report['badResponses']
   report['passed']=True;save();print(json.dumps({'passed':True,'stages':3,'eachAttemptedOnce':True,'finalRefreshExact':True,'requestFailures':report['requestFailures']},ensure_ascii=False))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);save();raise
  finally:await browser.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',default='https://yydshly.github.io/classic-games-atlas');p.add_argument('--out',default='.local/expedition-end-qa/public');asyncio.run(main(p.parse_args()))
