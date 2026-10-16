"""Stage-isolated real key input. Selection fixture unlocks menu only; battles stay unmodified."""
import argparse,datetime,json,time,hashlib
from fortress_pilot import plan
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SNAP='async()=> (await import("./game.mjs")).diagnostics()'

def run(url,stages,out,camp=444,attempts=1,smart=False):
 out.mkdir(parents=True,exist_ok=True);reports=[]
 with sync_playwright() as p:
  b=p.chromium.launch()
  for level in stages:
   for attempt in range(1,attempts+1):
    hashes={name:hashlib.sha256((ROOT/'games/fortress'/name).read_bytes()).hexdigest() for name in ['engine.mjs','levels.mjs','renderer.mjs']}
    ctx=b.new_context(viewport={'width':1320,'height':1080});ctx.add_init_script("localStorage.setItem('classic-atlas.fortress.v1',JSON.stringify({unlocked:10,last:1,tutorialSeen:true,sound:false,best:{}}))")
    t=ctx.new_page();errors=[];t.on('pageerror',lambda e:errors.append(str(e)));t.goto(url,wait_until='networkidle');t.locator('#levels').click();t.locator(f'[data-level="{level}"]').click();t.locator('#primary-action').click()
    held=None;t.keyboard.down('Space');wall=time.monotonic();samples=[];stuck=0;previous=None
    while time.monotonic()-wall<110:
     s=t.evaluate(SNAP)
     if s['state']!='playing':break
     q=s['player'];enemies=s['enemies'];direction=None;face=None
     if smart:direction=plan(s)
     elif abs(q['y']-camp)>6:direction='ArrowUp' if q['y']>camp else 'ArrowDown'
     else:
      target=max(enemies,key=lambda e:e['y']*1.7-abs(e['x']-q['x'])*.09) if enemies else {'x':300,'y':100}
      if abs(target['x']-q['x'])>5:direction='ArrowRight' if target['x']>q['x'] else 'ArrowLeft'
      else:
       aim=2 if target['y']>q['y']+12 else 0
       if q['dir']!=aim:face='ArrowDown' if aim==2 else 'ArrowUp'
     if face:
      if held:t.keyboard.up(held);held=None
      t.keyboard.down(face);t.wait_for_timeout(25);t.keyboard.up(face)
     if direction!=held:
      if held:t.keyboard.up(held)
      if direction:t.keyboard.down(direction)
      held=direction
     if not samples or s['time']-samples[-1]['time']>1:samples.append({'time':s['time'],'kills':s['kills'],'baseHP':s['base']['hp'],'lives':s['lives'],'player':{'x':q['x'],'y':q['y']},'enemies':[{'x':e['x'],'y':e['y'],'hp':e['hp']} for e in enemies]})
     t.wait_for_timeout(28)
    if held:t.keyboard.up(held)
    t.keyboard.up('Space');s=t.evaluate(SNAP);t.screenshot(path=str(out/f'stage-{level:02d}-attempt-{attempt}.png'))
    result={'stage':level,'attempt':attempt,'campY':camp,'tacticalPlanner':smart,'localCodeHashes':hashes,'result':s['state'],'kills':s['kills'],'total':s['total'],'time':s['time'],'baseHP':s['base']['hp'],'lives':s['lives'],'score':s['score'],'fps':s['fps'],'consoleErrors':errors,'samples':samples,'end':s}
    assert s['state']!='won' or s['kills']==s['total']
    reports.append(result);ctx.close();print(json.dumps({k:result[k] for k in ['stage','attempt','result','kills','total','time','baseHP','lives']},ensure_ascii=False),flush=True)
    (out/'report.json').write_text(json.dumps({'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'fixture':'isolated localStorage unlocks selection menu only; no battle/win/enemy mutation','kind':'real browser keyboard input, not logic simulation','results':reports},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if s['state']=='won':break
  b.close()

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/games/fortress/');p.add_argument('--stages',default='10,8,6,5,3,9,7,4,2');p.add_argument('--out',default='docs/fortress-qa/campaign');p.add_argument('--camp',type=int,default=492);p.add_argument('--attempts',type=int,default=1);p.add_argument('--smart',action='store_true');a=p.parse_args();run(a.url,[int(i) for i in a.stages.split(',')],ROOT/a.out,a.camp,a.attempts,a.smart)
