"""Isolated Chromium physics copies; not a substitute for real-time UI wins."""
import asyncio,argparse,datetime,json
from playwright.async_api import async_playwright
from test_pinfall_browser import ROOT
async def main(args):
 async with async_playwright() as pw:
  b=await pw.chromium.launch();p=await b.new_page();await p.goto(args.url)
  result=await p.evaluate('''async()=>{const e=await import('./engine.mjs'),runs=[];const project=g=>({state:g.state,pegs:g.pegs,shots:g.shots,tick:g.tick,stats:g.stats,angles:g.angles});for(let level=0;level<12;level++)for(const angle of [-55,17.5,48]){const samples=[];for(const dt of [e.STEP,1/60,1/30]){const g=e.createGame(level);e.start(g);e.setAim(g,angle);e.launch(g);for(let n=0;n<3000&&g.ball;n++)e.update(g,dt);if(g.ball)throw Error('Nonterminating copy');samples.push(project(g));}runs.push({stage:level+1,angle,equal:samples.every(v=>JSON.stringify(v)===JSON.stringify(samples[0])),tick:samples[0].tick});}return{runtime:navigator.userAgent,cosNegative55:Math.cos(-55*Math.PI/180),runs};}''')
  await p.wait_for_load_state('networkidle');await b.close()
 report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Isolated authored-board copies at 1/180, 1/60 and 1/30 second update chunks; no changes to active player world; not actual UI win evidence',**result};out=ROOT/args.out;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');assert len(result['runs'])==36 and all(r['equal'] for r in result['runs']);print(json.dumps({'cases':36,'frameChunkVariants':3,'allIdentical':True,'cosNegative55':result['cosNegative55']}))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/pinfall/');a.add_argument('--out',default='docs/pinfall-qa/browser-determinism.json');asyncio.run(main(a.parse_args()))
