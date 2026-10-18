"""Real-input UI boundaries; storage fixtures do not alter combat state."""
import argparse,asyncio,datetime,json,math
from playwright.async_api import async_playwright
from test_escort_browser import ROOT,KEY,FIELDS,snap,watch,load,begin,complete,Pilot,Driver,click,invariant
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];checks=[];contexts=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Real keys, held buttons and native multi-touch. Only malformed/denied/forged storage boundary fixtures; combat HP/position/meter/supplies/time/results are never written.','checks':checks};pilot=await Pilot().start()
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 def check(name):checks.append(name);save()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  async def fresh(tutorial=True,touch=False,raw=None,denied=False):
   for old in contexts:await old.close()
   contexts.clear();ctx=await b.new_context(viewport={'width':390 if touch else 1440,'height':900},is_mobile=touch,has_touch=touch);contexts.append(ctx)
   if denied:await ctx.add_init_script("Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError')}")
   else:
    value=raw if raw is not None else json.dumps({'version':1,'unlocked':1,'last':1,'tutorialSeen':tutorial,'sound':False,'best':{},'resume':None});await ctx.add_init_script('if(!sessionStorage.getItem("escort-fixture")){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(value)+');sessionStorage.setItem("escort-fixture","1")}')
   p=await ctx.new_page();watch(p,errors,bad,failed);await load(p,args.url);return p,await Driver(p,touch).start()
  async def wait(p,predicate,timeout=25):
   until=asyncio.get_event_loop().time()+timeout
   while asyncio.get_event_loop().time()<until:
    s=await snap(p)
    if predicate(s):return s
    await p.wait_for_timeout(30)
   raise AssertionError('UI condition timed out '+str((await snap(p))['stats']))
  try:
   p,d=await fresh(tutorial=False);s=await snap(p);assert await p.locator('#help-dialog').is_visible() and s['state']=='ready' and s['ticks']==0 and s['player']['hp']==120 and s['cart']['hp']==100 and s['heals']==2;await p.wait_for_timeout(100);assert (await snap(p))['ticks']==0;await click(p,'#help-confirm');check('Tutorial/ready freeze and original120/100HP/2supplies are visible')
   await click(p,'#levels');assert await p.locator('[data-level="8"]').is_disabled();await click(p,'#levels-close');check('Fresh eighth street locked; closing book preserves ready state')
   colors=await p.locator('#view').evaluate('(c)=>{const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data,s=new Set();for(let i=0;i<d.length;i+=400)s.add(`${d[i]},${d[i+1]},${d[i+2]}`);return s.size}');assert colors>10;check('Original street, actors, path and gate canvas actually render')
   await begin(p,d);before=await snap(p);await p.keyboard.down('d');await p.keyboard.down('w');await p.wait_for_timeout(150);await p.keyboard.up('d');await p.keyboard.up('w');s=await snap(p);assert s['player']['x']>before['player']['x'] and s['player']['y']<before['player']['y'];invariant(s);check('Real horizontal and depth movement changes both axes within road bounds')
   await click(p,'#reset');await begin(p,d);assert await p.locator('#heal').is_disabled();await p.keyboard.press('h');assert (await snap(p))['heals']==2;check('Full-health recovery is unavailable and cannot waste a supply')
   partial,_,_=await complete(p,pilot,d,stop=lambda s:any(a['owner']=='player' and a['combo']==3 for a in s['attacks']));await d.release();assert partial['state']=='playing';combos={a['combo'] for a in partial['attacks'] if a['owner']=='player'};assert {1,2,3}<=combos;assert all(len(a['hitIds'])==len(set(a['hitIds'])) for a in partial['attacks']);report['ordinaryCombo']={k:partial[k] for k in ['attacks','events','stats']};check('Ordinary live combat reaches connected1/2/3 combos with unique per-target contacts')
   await p.keyboard.press('p');s=await snap(p);assert s['state']=='paused' and s['controls']=={'x':0,'y':0,'attack':False};await p.wait_for_timeout(250);after=await snap(p);assert all(s[k]==after[k] for k in FIELDS);await p.keyboard.press('p');check('Pause releases held input and freezes all24 physical/combo/cart/resource fields')
   await click(p,'#help');assert (await snap(p))['state']=='paused';await click(p,'#help-close');await p.wait_for_function('window.__escort.snapshot().state==="playing"');await click(p,'#levels');assert (await snap(p))['state']=='paused';await click(p,'#levels-close');await p.wait_for_function('window.__escort.snapshot().state==="playing"');check('Help and street book pause and resume without extra attack commands')
   await click(p,'#sound');assert await p.locator('#sound').get_attribute('aria-pressed')=='true';saved=await p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY);assert saved['sound'];await click(p,'#sound');check('Synthesized sound preference toggles with persisted state')
   await click(p,'#log-toggle');await p.wait_for_timeout(130);assert await p.locator('#log-toggle').get_attribute('aria-expanded')=='true';s=await snap(p);assert abs(await p.locator('#history li').count()-len(s['events']))<=2;check('Expanded log exposes stage, windup, actual hit, heal and escort events')
   p,d=await fresh();await begin(p,d);await p.keyboard.down('j');await p.keyboard.press('k');await p.keyboard.down('k');await p.keyboard.down('k');await p.keyboard.up('k');await p.keyboard.up('j');s=await snap(p);assert s['stats']['dodges']==1 and s['player']['spent']==20 and s['attacks'][0]['canceled'];await p.wait_for_timeout(500);s=await snap(p);assert not s['attacks'][0]['hitIds'];check('Actual dodge cancels a pending own attack; held/repeat K pays exactly once')
   report['dodgeExhaustion']=[]
   for _ in range(14):
    s=await snap(p)
    if s['player']['energy']<20:break
    await wait(p,lambda s:s['player']['action'] is None);await p.wait_for_function('!document.querySelector("#dodge").disabled');before=await snap(p);await p.keyboard.press('k');s=await snap(p);report['dodgeExhaustion'].append({'before':before,'after':s});save();assert s['state']=='playing' and s['player']['spent']==before['player']['spent']+20
   s=await snap(p);assert s['player']['energy']<20;spent=s['player']['spent'];await p.keyboard.press('k');assert (await snap(p))['player']['spent']==spent;invariant(s);check('Ordinary repeated dodges exhaust bounded meter; no overspending or free repeat')
   p,d=await fresh();await begin(p,d);await d.action('escort');s=await snap(p);assert not s['cart']['following'];x=s['cart']['x'];await d.set({'x':1});await p.wait_for_timeout(1100);await d.release();s=await snap(p);assert s['cart']['x']==x;await d.action('escort');await p.wait_for_timeout(150);s=await snap(p);assert s['cart']['following'] and math.hypot(s['player']['x']-s['cart']['x'],s['player']['y']-s['cart']['y'])>240 and s['cart']['x']==x;partial,_,_=await complete(p,pilot,d,stop=lambda s:s['cart']['x']>135);await d.release();assert partial['state']=='playing';check('Real E parks cart; distance stops it; ordinary return and cleared road resume actual path movement')
   hurt,_,_=await complete(p,pilot,d,stop=lambda s:s['cart']['hp']<100);await d.release();assert hurt['state']=='playing' and hurt['cart']['hp']<100
   if hurt['cart']['following']:await d.action('escort')
   for _ in range(160):
    s=await snap(p);dx=s['cart']['x']-s['player']['x'];dy=s['cart']['y']-s['player']['y']
    if math.hypot(dx,dy)<125:break
    await d.set({'x':1 if dx>30 else -1 if dx< -30 else 0,'y':1 if dy>10 else -1 if dy< -10 else 0,'attack':True});await p.wait_for_timeout(30)
   await d.release();await p.wait_for_timeout(130);before=await snap(p);assert before['heals']>0 and await p.locator('#heal').is_enabled();await d.action('heal');s=await snap(p);assert s['heals']==before['heals']-1 and s['stats']['healedCart']>before['stats']['healedCart'];end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won';report['ordinaryRepair']={k:end[k] for k in ['player','cart','heals','ledger','events','stats','log']};check('Actual damaged cart receives bounded nearby repair using a finite charge, then normal escort victory')
   best=end['best'];await click(p,'#secondary-action');s=await snap(p);assert s['state']=='ready' and s['player']['hp']==120 and s['cart']['hp']==100 and s['heals']==2 and s['best']==best;await load(p,args.url,True);s=await snap(p);assert s['unlocked']>=2 and s['best']==best;check('Retry restores original budget; best and earned unlock survive reload')
   p,d=await fresh();await begin(p,d);await d.action('escort');await d.set({'y':-1});await p.wait_for_timeout(650);await d.release();await wait(p,lambda s:s['player']['hp']<=85,40);await p.wait_for_timeout(120);before=await snap(p);await d.action('heal');s=await snap(p);assert s['heals']==1 and s['stats']['healedPlayer']>0 and s['player']['hp']<=120;await wait(p,lambda s:s['player']['hp']<=85,40);await p.wait_for_timeout(120);await d.action('heal');s=await snap(p);assert s['heals']==0 and s['stats']['healsUsed']==2;spent=s['stats']['healedPlayer'];await p.keyboard.press('h');assert (await snap(p))['stats']['healedPlayer']==spent;report['ordinaryFiniteHealing']={k:s[k] for k in ['player','cart','heals','stats','ledger','events']};check('Normal enemy damage and two actual H recoveries deplete inventory; empty recovery never adds HP')
   await p.wait_for_function('window.__escort.snapshot().state==="lost"',timeout=100000);s=await snap(p);assert s['player']['hp']==0 and s['stats']['settlements']==1;before=s['stats'];await p.keyboard.press('j');await p.keyboard.press('h');await p.keyboard.press('k');assert (await snap(p))['stats']==before;await click(p,'#primary-action');s=await snap(p);assert s['state']=='ready' and s['heals']==2 and s['player']['hp']==120 and s['cart']['hp']==100;check('Undefended real melee causes one player death; terminal actions reject and retry is authored')
   await begin(p,d);await p.keyboard.down('d');await p.wait_for_timeout(100);await p.evaluate('window.dispatchEvent(new Event("blur"))');await p.keyboard.up('d');s=await snap(p);assert s['state']=='paused' and not any(s['controls'].values());await p.wait_for_timeout(250);after=await snap(p);assert all(s[k]==after[k] for k in FIELDS);check('Blur handler releases held movement and freezes battle without backlog')
   p,d=await fresh(raw='{broken');assert (await snap(p))['state']=='ready';check('Malformed storage safely falls back to original setup')
   forged={'version':1,'unlocked':1,'last':1,'tutorialSeen':True,'resume':{'version':1,'level':1,'ticks':0,'commands':[],'player':{'x':999,'hp':999},'cart':{'hp':999},'heals':999}};p,d=await fresh(raw=json.dumps(forged));s=await snap(p);assert s['state']=='paused' and s['player']['x']==220 and s['player']['hp']==120 and s['cart']['hp']==100 and s['heals']==2;check('Forged combat snapshot fields cannot grant position/health/cart/supplies')
   p,d=await fresh(denied=True);assert not (await snap(p))['storageAvailable'] and await p.locator('#storage-note').is_visible();await begin(p,d);end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won';check('Denied storage still supports complete ordinary first street')
   p,d=await fresh();await begin(p,d);end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won' and end['cart']['hp']>0;check('Full normal first street through keyboard depth/horizontal movement and combo controls')
   for width in [320,360,390,768,1024,1440]:
    await p.set_viewport_size({'width':width,'height':900});assert not await p.evaluate('document.documentElement.scrollWidth>innerWidth');await click(p,'#help');assert not await p.locator('#help-dialog').evaluate('(e)=>e.scrollWidth>e.clientWidth');await p.screenshot(path=str(out/f'width-{width}.png'));await click(p,'#help-close')
   check('320/360/390/768/1024/1440 widths and help/result controls fit without overflow')
   p,d=await fresh(touch=True);await begin(p,d);await d.set({'y':1});await d.action('dodge');s=await snap(p);assert s['stats']['dodges']==1 and s['player']['spent']==20;await p.wait_for_timeout(100);await d.release();end,_,_=await complete(p,pilot,d);await d.release();assert end['state']=='won' and end['player']['hp']>0 and end['cart']['hp']>0;report['nativeMultiTouch']={k:end[k] for k in ['player','cart','stats','log','score']};await p.screenshot(path=str(out/'native-touch-win.png'),full_page=True);check('Native simultaneous move/action touch points trigger directional dodge and full normal first-street victory')
   assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'groups':len(checks)}))
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:
   save()
   for c in contexts:await c.close()
   await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/escort/');a.add_argument('--out',default='.local/escort-ui');asyncio.run(main(a.parse_args()))
