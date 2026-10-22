from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
R=Path('.local/featured-touch-round');R.mkdir(parents=True,exist_ok=True);(R/'tmp').mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str((R/'tmp').resolve())
results=[]
with sync_playwright() as pw:
    for method in ['move-remaining','end-lifted']:
        c=pw.chromium.launch_persistent_context(str((R/('profile-probe-'+method)).resolve()),viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        p=c.pages[0];p.goto('about:blank')
        p.set_content('<meta name="viewport" content="width=device-width,initial-scale=1"><style>button{position:absolute;top:20px;height:100px;width:100px;touch-action:none}</style><button id="a" style="left:10px">A</button><button id="b" style="left:130px">B</button>')
        p.evaluate("""window.ev=[];for(const n of ['pointerdown','pointerup','pointercancel'])document.addEventListener(n,e=>window.ev.push({type:n,id:e.pointerId,target:e.target.id,ptr:e.pointerType,trusted:e.isTrusted}));""")
        d=c.new_cdp_session(p);d.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
        a={'id':1,'x':50,'y':50};b={'id':2,'x':170,'y':50}
        d.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[a]})
        d.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[a,b]})
        d.send('Input.dispatchTouchEvent',{'type':'touchMove'if method=='move-remaining'else'touchEnd','touchPoints':[b]if method=='move-remaining'else[a]})
        p.wait_for_timeout(70)
        results.append({'method':method,'events':p.evaluate('ev')})
        d.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
        c.close()
with (R/'native-probe.json').open('w',encoding='utf-8') as f:json.dump(results,f,indent=2)
print(json.dumps(results),flush=True)
