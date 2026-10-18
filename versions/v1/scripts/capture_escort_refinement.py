"""Actual input captures. Reuses earned unlock metadata, never writes battle values."""
import argparse,asyncio,base64,datetime,json,time,sys
from pathlib import Path
from playwright.async_api import async_playwright
from test_escort_browser import ROOT,KEY,FIELDS,snap,watch,begin,complete,Pilot,Driver,click
OUT=ROOT/'docs/escort-qa/refinement'
PRIVATE=ROOT/'.local/escort-refinement'
async def navigate(p,url):
 await p.goto(url,wait_until='domcontentloaded');await p.wait_for_function('window.__escort?.snapshot',timeout=60000)
async def shot(p,path):
 data=await p.locator('#view').evaluate('(c)=>c.toDataURL("image/png").split(",")[1]');path.write_bytes(base64.b64decode(data))
async def run(args):
 OUT.mkdir(parents=True,exist_ok=True);PRIVATE.mkdir(parents=True,exist_ok=True);out=OUT/args.phase;out.mkdir(exist_ok=True)
 earned=json.loads((ROOT/'docs/escort-qa/visual-v3/report.json').read_text(encoding='utf8'))['results'][-1]
 progress={'version':1,'unlocked':8,'last':1,'tutorialSeen':True,'sound':False,'best':earned['best'],'resume':None}
 report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'phase':args.phase,'url':args.url,'method':'Real keyboard/touch inputs at normal RAF speed; only previously earned unlock/best metadata reused. Native canvas PNGs; paused comparison frames restore the same engine-validated legal input checkpoint. Full viewport video at original viewport resolution.','captures':[],'videos':[],'checks':[]};errors=[];bad=[];failed=[];pilot=await Pilot().start()
 def save():
  report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   for level,name in [(1,'dawn'),(7,'night'),(4,'rain'),(8,'gate')]:
    if args.phase=='before' and level not in [1,7]:continue
    ctx=await b.new_context(viewport={'width':1440,'height':1100});pr={**progress,'last':level};await ctx.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(pr))+')');p=await ctx.new_page();watch(p,errors,bad,failed);await navigate(p,args.url)
    await shot(p,out/(name+'-single.png'))
    if args.phase=='before' or level not in [1,7]:
     for state in ['crowd','strike']:
      if state=='strike':await click(p,'#reset')
      d=await Driver(p).start();await begin(p,d)
      if state=='crowd':
       await d.set({'x':1})
       for _ in range(250):
        s=await snap(p)
        if any(e['hp']>0 and abs(e['x']-s['player']['x'])<62 for e in s['enemies']):break
        await p.wait_for_timeout(20)
      else:await complete(p,pilot,d,stop=lambda s:s['stats']['hits']>=1 and s['player']['action'] is not None)
      await d.release();await p.keyboard.press('p');s=await snap(p);assert s['state']=='paused';await shot(p,out/(name+'-'+state+'.png'));storage=await p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
      (PRIVATE/(name+'-'+state+'.json')).write_text(json.dumps({'progress':storage,'expected':{k:s[k] for k in FIELDS}}),encoding='utf8');report['captures'].append({'file':name+'-'+state+'.png','level':level,'tick':s['ticks'],'stats':s['stats']})
    else:
     for state in ['crowd','strike']:
      cp=json.loads((PRIVATE/(name+'-'+state+'.json')).read_text(encoding='utf8'));await p.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(cp['progress']))+')');await navigate(p,args.url);s=await snap(p);different=[k for k in FIELDS if s[k]!=cp['expected'][k]];assert not different,different;await shot(p,out/(name+'-'+state+'.png'));report['checks'].append(name+' '+state+' exact24 fields');report['captures'].append({'file':name+'-'+state+'.png','level':level,'tick':s['ticks'],'stats':s['stats']})
    await ctx.close();save()
   # Two short live action videos, no pause/frame/state injection.
   for level,name in [(1,'dawn'),(7,'night')]:
    vdir=PRIVATE/(args.phase+'-'+name);vdir.mkdir(exist_ok=True);ctx=await b.new_context(viewport={'width':1440,'height':1000},record_video_dir=str(vdir),record_video_size={'width':1440,'height':1000});await ctx.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps({**progress,'last':level}))+')');p=await ctx.new_page();watch(p,errors,bad,failed);await navigate(p,args.url);d=await Driver(p).start();await begin(p,d);start=time.monotonic();s,_,_=await complete(p,pilot,d,stop=lambda s:time.monotonic()-start>=10);await d.release();video=p.video;await ctx.close();dest=out/(name+'-action.webm');await video.save_as(str(dest));report['videos'].append({'file':dest.name,'viewport':[1440,1000],'simulationTicks':s['ticks'],'stats':s['stats'],'invariants':s['invariants']});save()
   # Native phone layout and actual multitouch action, then orientation change.
   vdir=PRIVATE/(args.phase+'-phone');vdir.mkdir(exist_ok=True);ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,record_video_dir=str(vdir),record_video_size={'width':390,'height':844});await ctx.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(progress))+')');p=await ctx.new_page();watch(p,errors,bad,failed);await navigate(p,args.url);d=await Driver(p,touch=True).start();await begin(p,d);await d.set({'x':1});await d.action('dodge');await d.release();s,_,_=await complete(p,pilot,d,stop=lambda s:s['stats']['hits']>=1);await p.screenshot(path=str(out/'phone-portrait.png'));box=await p.locator('#view').bounding_box();report['portrait']={'viewport':[390,844],'canvas':box,'stats':s['stats'],'scrollWidth':await p.evaluate('document.documentElement.scrollWidth')};await d.release();await p.keyboard.press('p');paused=await snap(p);await p.set_viewport_size({'width':844,'height':390});await p.wait_for_timeout(150);assert (await snap(p))['ticks']==paused['ticks'];await p.screenshot(path=str(out/'phone-landscape.png'));report['landscape']={'viewport':[844,390],'canvas':await p.locator('#view').bounding_box(),'scrollWidth':await p.evaluate('document.documentElement.scrollWidth')};await p.keyboard.press('p');start=time.monotonic();s,_,_=await complete(p,pilot,d,stop=lambda s:time.monotonic()-start>5);await d.release();assert all(s['invariants'].values());report['phoneActions']=s['stats'];video=p.video;await ctx.close();await video.save_as(str(out/'phone-action.webm'));assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'phase':args.phase,'portrait':report['portrait'],'landscape':report['landscape']},ensure_ascii=False))
  except Exception as e:report['error']=type(e).__name__+': '+str(e);raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--phase',choices=['before','after'],required=True);a.add_argument('--url',required=True);asyncio.run(run(a.parse_args()))
