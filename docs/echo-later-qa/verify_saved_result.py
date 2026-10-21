import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path.cwd();out=root/'.local/continuation-round/echo-public';r=json.loads((out/'public-report.json').read_text(encoding='utf-8'));r['harnessLimit']['followupAssertion']='Follow-up incorrectly required key-release command tick to equal later pause tick; observed release tick12, pause tick14. Releasing W earlier is expected, not stale controls.';os.environ['TEMP']=os.environ['TMP']=str(root/'.local/continuation-round/tmp')
with sync_playwright() as pw:
 c=pw.chromium.launch_persistent_context(str(out/'native-profile'),viewport={'width':1440,'height':1000});p=c.new_page();p.on('pageerror',lambda e:r['consoleErrors'].append(str(e)));p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None)
 try:
  p.goto(r['url'],wait_until='domcontentloaded',timeout=20000);p.locator('#title').wait_for();s=p.evaluate('''async()=>{const e=await import('./engine.mjs?v=echo2r1'),s=await import('./progress.mjs?v=echo-continuity-r2');return e.snapshot(s.readProgress(localStorage).game)}''');assert s['state']=='paused' and s['level']==3 and s['ticks']==r['newAction']['session']['ticks'] and not any(s['controls'].values()) and s['player']['x']>1.6;p.wait_for_timeout(200);assert '行动暂停' in p.locator('#title').inner_text();r['newActionRestored']=s;p.screenshot(path=str(out/'final-retry-moving-paused.png'),full_page=True);r['status']='passed';r.pop('error',None);assert not any(r[k]for k in ['consoleErrors','httpErrors','requestFailures'])
 finally:(out/'public-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');c.close()
print(json.dumps({'status':r['status'],'second':r['stages'][0]['result'],'third':r['stages'][1]['result'],'newActionRestored':{'level':s['level'],'ticks':s['ticks'],'position':s['player'],'controls':s['controls']}},ensure_ascii=False),flush=True)
