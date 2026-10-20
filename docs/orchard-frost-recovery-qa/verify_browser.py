"""Ordinary public UI; no live game/time/save injection. Separate offline replay only inspects native checkpoints."""
import argparse,os,json,time,subprocess,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];KEY='classic-atlas.orchard.arcade.v2'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/versions/v2/games/orchard/');ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True);tmp=ROOT/'.local/complementary-flow/tmp';tmp.mkdir(parents=True,exist_ok=True);os.environ['TEMP']=os.environ['TMP']=str(tmp)
 r={'url':a.url,'kind':'normal mouse/keyboard; scripted slice timing from existing public deterministic launch schedule; separate offline checkpoint replay; no live game/time/save mutation','consoleErrors':[],'httpErrors':[],'requestFailures':[]}
 worker=subprocess.Popen(['node',str(ROOT/'docs/orchard-frost-recovery-qa/inspect_checkpoint.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 def ask(x):
  worker.stdin.write(json.dumps(x,separators=(',',':'))+'\n');worker.stdin.flush();d=json.loads(worker.stdout.readline());assert 'error' not in d,d;return d
 with sync_playwright() as pw:
  b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':1050});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('response',lambda x:r['httpErrors'].append({'url':x.url,'status':x.status}) if x.status>=400 else None);p.on('requestfailed',lambda x:r['requestFailures'].append({'url':x.url,'error':x.failure}))
  def raw():return p.evaluate('(k)=>localStorage.getItem(k)',KEY)
  def snap(n):p.screenshot(path=str(out/n),full_page=True)
  def ui():return {k:p.locator('#'+k).inner_text() for k in ['score','time','combo','frost','status','best','curtain-title','curtain-copy']}
  def pixels(expected):
   return p.evaluate("""async g=>{const {createRenderer}=await import(new URL('renderer.mjs',document.querySelector('script[type=module]').src));const canvas=document.querySelector('#battle'),ctx=canvas.getContext('2d'),off=document.createElement('canvas'),renderer=createRenderer(off),oc=off.getContext('2d'),styles={};for(const k of ['lineWidth','lineCap','lineJoin','miterLimit','globalAlpha','globalCompositeOperation','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','imageSmoothingEnabled','font','textAlign','textBaseline','direction','filter']){styles[k]=ctx[k];oc[k]=ctx[k];}renderer.draw(g,{x:450,y:330});const live=canvas.toDataURL();return {sameAsOfflinePausedReplay:live===off.toDataURL(),styles,live};}""",expected)
  try:
   p.goto(a.url,wait_until='networkidle',timeout=20000);assert p.locator('#time').inner_text()=='60.0' and p.locator('#score').inner_text()=='0';box=p.locator('#battle').bounding_box();assert box
   def move(x,y,steps=1):p.mouse.move(box['x']+x*box['width']/900,box['y']+y*box['height']/620,steps=steps)
   p.locator('#start').click();move(350,330)
   p.wait_for_function("Number(document.querySelector('#time').textContent)<=54.3",timeout=10000)
   p.mouse.down();move(485,330,steps=4);p.mouse.up()
   p.wait_for_function("document.querySelector('#frost').textContent.startsWith('霜降') && Number(document.querySelector('#score').textContent)>0",timeout=2000)
   r['liveAfterSlice']=ui();snap('live-frost-nonzero.png')
   p.keyboard.down('Space');p.keyboard.down('ArrowLeft');p.keyboard.press('p');p.wait_for_timeout(60)
   before=raw();d=ask({'raw':before});g=d['snapshot'];assert g['state']=='paused' and g['score']>0 and g['stats']['frostCuts']>=1 and d['frostSeconds']>1.0 and d['flying']>0 and g['stroke'] is None and all(d['conservation'].values());r['before']={'raw':before,'offlineReplay':d,'ui':ui()};x=pixels(g);assert x['sameAsOfflinePausedReplay'];beforePixels=x['live'];r['before']['canvasSha256']=hashlib.sha256(beforePixels.encode()).hexdigest();r['before']['canvasStyles']=x['styles'];snap('paused-frost-before-refresh.png')
   p.wait_for_timeout(650);assert raw()==before and ui()==r['before']['ui'];assert p.locator('#battle').evaluate('(c)=>c.toDataURL()')==beforePixels
   p.reload(wait_until='networkidle');p.wait_for_timeout(80);after=raw();d2=ask({'raw':after});assert after==before and d2==d and ui()==r['before']['ui'];x=pixels(d2['snapshot']);assert x['sameAsOfflinePausedReplay'];r['refresh']={'sameRawCheckpoint':True,'sameOfflineReplayFields':list(g),'sameUi':True,'sameNativeCanvas':x['live']==beforePixels,'afterCanvasSha256':hashlib.sha256(x['live'].encode()).hexdigest(),'afterCanvasStyles':x['styles'],'nativeCanvasMatchesSameReplayedGeometry':True,'startsPaused':True};snap('refresh-same-frost-paused.png')
   p.locator('#resume').click();p.wait_for_timeout(500);p.locator('#pause').click();p.wait_for_timeout(60);mid=raw();dm=ask({'raw':mid});gm=dm['snapshot'];assert gm['ticks']>g['ticks'] and gm['frostUntil']==g['frostUntil'] and gm['ticks']<gm['frostUntil'] and gm['score']==g['score'] and gm['cutIds']==g['cutIds'] and gm['stats']['strokes']==g['stats']['strokes'] and gm['stroke'] is None;r['resumeAudit']=ask({'kind':'advance','before':before,'after':mid});x=pixels(gm);assert x['sameAsOfflinePausedReplay'];r['resumed']={'raw':mid,'offlineReplay':dm,'ui':ui(),'nativeCanvasMatchesReplay':True};snap('resumed-frost-countdown.png')
   p.locator('#resume').click();p.wait_for_function("document.querySelector('#frost').textContent.startsWith('❄')",timeout=4500);p.locator('#pause').click();p.wait_for_timeout(60);final=raw();df=ask({'raw':final});gf=df['snapshot'];assert gf['ticks']>=gf['frostUntil'] and df['frostSeconds']==0 and gf['score']==g['score'] and gf['cutIds']==g['cutIds'] and gf['stats']['strokes']==g['stats']['strokes'] and gf['stroke'] is None;r['expiryAudit']=ask({'kind':'advance','before':mid,'after':final});x=pixels(gf);assert x['sameAsOfflinePausedReplay'];r['expired']={'raw':final,'offlineReplay':df,'ui':ui(),'nativeCanvasMatchesReplay':True};snap('frost-expired-without-old-blade.png');p.keyboard.up('ArrowLeft');p.keyboard.up('Space')
   r['status']='passed';assert not r['consoleErrors'] and not r['httpErrors'] and not r['requestFailures']
  except Exception as e:
   r['status']='failed';r['error']=str(e)
   try:r['lastUi']=ui();r['lastRaw']=raw();snap('failure-debug.png')
   except:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
   try:worker.stdin.close();worker.wait(timeout=5)
   except:worker.terminate()
 print(json.dumps({'status':r['status'],'score':g['score'],'cuts':g['stats']['cuts'],'frostCuts':g['stats']['frostCuts'],'beforeTicks':g['ticks'],'frostUntil':g['frostUntil'],'beforeFrostSeconds':d['frostSeconds'],'resumeTicks':gm['ticks'],'expiredTicks':gf['ticks'],'flying':d['flying'],'refresh':r['refresh'],'errors':[r['consoleErrors'],r['httpErrors'],r['requestFailures']]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
