"""Natural legal low-efficiency swaps; prior success established normally, no save/state injection."""
import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.garden.v2.prism';BAD=[[16,17],[17,25],[21,29],[3,4],[15,23],[4,5]]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/versions/v2/games/garden/');ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/complementary-flow/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp);r={'url':a.url,'kind':'normal click swaps; fixed legal low-efficiency route, no victory/failure/storage/time injection; copied diagnostics audit only','moves':[],'consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 with sync_playwright() as pw:
  b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def diag():return p.evaluate('async()=>{const m=await import(document.querySelector("script[type=module]").src);return m.diagnostics()}')
  def snap(n):p.screenshot(path=str(out/n),full_page=True)
  def swap(a,b):
   p.locator(f'#board [data-index="{a}"]').click();p.locator(f'#board [data-index="{b}"]').click();p.wait_for_function("['won','lost'].includes(document.body.dataset.state)||(document.body.dataset.state==='playing'&&document.querySelector('#phase-label').textContent==='选择下一束光')",timeout=15000)
  try:
   p.goto(a.url,wait_until='networkidle',timeout=20000);initial=diag();assert initial['moves']==6 and initial['score']==0 and initial['best']=={};r['initial']=initial;p.locator('#sound').click();p.locator('#primary-action').click();p.locator('#help-confirm').click()
   # Existing success route is a necessary clean precondition for testing genuine record retention.
   swap(18,26);swap(26,27);s=diag();assert s['state']=='won' and s['score']==460 and s['stats']['validSwaps']==2;r['priorBest']=s['best'];snap('prior-success-precondition.png');p.locator('#secondary-action').click();assert diag()['state']=='playing'
   for i,(a1,b1) in enumerate(BAD):
    swap(a1,b1);s=diag();assert s['moves']==5-i and s['stats']['validSwaps']==i+1 and s['stats']['invalidSwaps']==0;r['moves'].append({'swap':[a1,b1],'moves':s['moves'],'score':s['score'],'phase':s['phase'],'state':s['state']})
    if i==4:snap('one-move-left.png')
   s=diag();assert s['state']=='lost' and s['phase']=='stable' and s['moves']==0 and s['score']==180 and s['stats']['prismsCreated']==0 and s['stats']['prismsActivated']==0;assert s['best']==r['priorBest'];r['loss']=s;r['lossExplanation']=p.locator('#overlay-copy').inner_text();assert '步数已用尽' in r['lossExplanation'];snap('natural-budget-loss.png');p.locator('#primary-action').click();n=diag();fields=['level','moves','seed','rng','nextId','board','soil','score','collected','stats','clearedLayers','phase','phaseTime','pending','swap','selection','hint']
   for k in fields:assert n[k]==initial[k],k
   assert n['state']=='playing' and n['best']==r['priorBest'] and not n['faulted'];p.wait_for_timeout(600);later=diag()
   for k in fields:assert later[k]==initial[k],k
   r['retry']={'fields':fields,'bestKept':True,'noLateCallbackAfter600ms':True,'moves':n['moves'],'score':n['score'],'phase':n['phase']};snap('retry-reset-best-kept.png');p.locator('#pause').click();before=diag();p.reload(wait_until='networkidle');after=diag();assert after['state']=='paused' and after['moves']==6 and after['score']==0 and after['best']==r['priorBest'] and after['board']==initial['board'];r['retryRefresh']={'paused':True,'initialBoard':True,'bestKept':True};snap('retry-refresh-best-kept.png');r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures'],r
  except Exception as e:r['status']='failed';r['error']=str(e);snap('failure-debug.png');raise
  finally:(out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
 print(json.dumps({'status':r['status'],'priorBest':r['priorBest'],'moves':r['moves'],'lossExplanation':r['lossExplanation'],'retry':r['retry'],'retryRefresh':r['retryRefresh'],'errors':[r['consoleErrors'],r['httpErrors'],r['requestFailures']]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
