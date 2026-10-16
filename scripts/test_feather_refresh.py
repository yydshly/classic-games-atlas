"""Direct live refresh after ordinary paid action/item/shield, independently replayed."""
import argparse,asyncio,datetime,json,subprocess
from playwright.async_api import async_playwright
from test_feather_browser import ROOT,KEY,FIELDS,snap,load,watch,begin,command,complete,Pilot
async def partial(p):
 s=await snap(p);await command(p,{'kind':'choice','choice':'camp','revision':s['revision']})
 for kind,key,target in [('skill','shear','e0'),('item','ether','a'),('skill','veil','a')]:
  s=await snap(p);await command(p,{'kind':'act','actor':s['active'],'revision':s['revision'],'move':{'kind':kind,kind:key,'target':target}})
 return await snap(p)
async def main(args):
 out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Fresh first chapter; actual camp/shear/ether/veil controls, then direct live reload without manual pause. No combat writes. Saved legal command log independently replayed by production Node engine.'};pilot=await Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  try:
   ctx=await b.new_context(viewport={'width':1360,'height':1050});p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);await begin(p);before=await partial(p);assert before['state']=='battle' and before['items']['ether']==0 and any(u['shield'] for u in before['units']);await load(p,args.url,True);after=await snap(p);saved=await p.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).resume',KEY);assert after['state']=='paused' and after['ui']['pending'] is None and all(before[k]==after[k] for k in FIELDS)
   js="import{restore,snapshot}from'./games/feather/engine.mjs';let s='';for await(const x of process.stdin)s+=x;console.log(JSON.stringify(snapshot(restore(JSON.parse(s)))));"
   expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],input=json.dumps(saved),text=True,encoding='utf8',cwd=ROOT));assert all(after[k]==expected[k] for k in FIELDS);await p.wait_for_timeout(200);frozen=await snap(p);assert all(after[k]==frozen[k] for k in FIELDS);await p.locator('#resume').click();end,_,_=await complete(p,pilot);assert end['state']=='won';report.update(passed=True,exactFields=FIELDS,commands=len(saved['commands']),savedCheckpoint=saved,before=before,restored=after,independentRestored=expected,continuedWin={k:end[k] for k in ['state','score','round','items','stats','log']});assert not errors and not bad and not failed,(errors,bad,failed);save();print(json.dumps({'passed':True,'commands':len(saved['commands']),'exactFields':len(FIELDS),'continuedWin':end['state'],'items':end['items']}));await ctx.close()
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:save();await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/games/feather/');a.add_argument('--out',default='.local/feather-live-refresh.json');asyncio.run(main(a.parse_args()))
