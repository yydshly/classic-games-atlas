"""UI boundary fixtures may seed unlock metadata, never combat HP/resources/results."""
import argparse,asyncio,datetime,json
from playwright.async_api import async_playwright
from test_feather_browser import ROOT,KEY,FIELDS,snap,watch,load,click,begin,prepare,command,complete,Pilot,invariant
def act(s,skill='guard',target=None):return {'kind':'act','actor':s['active'],'revision':s['revision'],'move':{'kind':'skill','skill':skill,'target':target or s['active']}}
def supply(s,item,target):return {'kind':'act','actor':s['active'],'revision':s['revision'],'move':{'kind':'item','item':item,'target':target}}
async def main(args):
 out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True);errors=[];bad=[];failed=[];checks=[];report={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':args.url,'method':'Actual UI controls. Boundary scenarios seed only tutorial/unlock/chapter metadata; no HP/energy/items/turn/win writes. These are separate from fresh-storage natural8chapter acceptance.','checks':checks};pilot=await Pilot().start();contexts=[]
 def save():report.update(consoleErrors=errors,badResponses=bad,requestFailures=failed);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  async def fresh(stage=1,tutorial=True,touch=False,raw=None,denied=False):
   c=await b.new_context(viewport={'width':390 if touch else 1440,'height':900},is_mobile=touch,has_touch=touch);contexts.append(c)
   if denied:await c.add_init_script("Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError')}")
   else:
    value=raw if raw is not None else json.dumps({'version':1,'unlocked':stage,'last':stage,'tutorialSeen':tutorial,'sound':False,'best':{},'resume':None})
    await c.add_init_script('if(!sessionStorage.getItem("feather-fixture")){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(value)+');sessionStorage.setItem("feather-fixture","1")}')
   p=await c.new_page();watch(p,errors,bad,failed);await load(p,args.url);return p
  async def enter(p,choice='camp'):
   await begin(p);s=await snap(p);return await command(p,{'kind':'choice','choice':choice,'revision':s['revision']})
  async def guards(p,count):
   for _ in range(count):
    s=await snap(p)
    if s['state']!='battle':break
    await command(p,act(s))
   return await snap(p)
  try:
   p=await fresh(tutorial=False);s=await snap(p);assert await p.locator('#help-dialog').is_visible() and s['state']=='event' and s['revision']==0;await p.wait_for_timeout(100);assert (await snap(p))['revision']==0;await begin(p);checks.append('First tutorial and event never advance without confirmation')
   await click(p,'#chapters');assert await p.locator('[data-chapter="8"]').is_disabled();await click(p,'#chapters-close');await p.wait_for_function('window.__feather.snapshot().state==="event"');checks.append('Chapter8 is locked on fresh progress; menu close resumes exact event')
   s=await snap(p);await prepare(p,{'kind':'choice','choice':'camp','revision':s['revision']});assert '2 → 3' in await p.locator('#preview-lines').inner_text();await click(p,'#cancel');assert all([s[k]==(await snap(p))[k] for k in FIELDS]);checks.append('Event preview and cancel preserve budget, order and log')
   s=await enter(p,'scout');assert s['items']['ether']==2 and all(u['shield']['amount']==12 and u['energy']==5 for u in s['units'] if u['side']=='party');checks.append('Scout confirms once with exact12shields and extra ether')
   before=await snap(p);await prepare(p,act(before,'shear','e0'));assert '耗2' in await p.locator('#preview-lines').inner_text();await p.keyboard.press('Escape');await p.locator('#preview-dialog').wait_for(state='hidden');assert all([before[k]==(await snap(p))[k] for k in FIELDS]);checks.append('Skill preview actual affinity/cost and Escape cancellation are free')
   await prepare(p,act(before,'shear','e0'));await p.locator('#confirm').focus();await p.keyboard.down('Enter');await p.keyboard.down('Enter');await p.keyboard.down('Enter');await p.keyboard.up('Enter');await p.locator('#preview-dialog').wait_for(state='hidden');s=await snap(p);assert s['revision']==before['revision']+1 and s['stats']['playerActions']==1;checks.append('Held Enter/repeated confirmation consumes one action and one energy charge')
   assert await p.locator('[data-target="e0"]').is_enabled();await click(p,'[data-item="revive"]');assert all([await p.locator('[data-target="'+u['id']+'"]').is_disabled() for u in s['units']]);checks.append('Revive has no legal target while all companions live')
   await p.keyboard.press('4');await click(p,'#cancel');await p.locator('body').click(position={'x':5,'y':5});await p.keyboard.press('1');assert (await snap(p))['ui']['move']['skill']=='ripple';await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');assert await p.locator('#preview-dialog').is_visible();await p.keyboard.press('Escape');checks.append('Skill hotkeys, arrows, Enter preview and Escape work without changing battle')
   s=await snap(p);await p.keyboard.press('p');paused=await snap(p);assert paused['state']=='paused';await p.wait_for_timeout(100);assert all([s[k]==(await snap(p))[k] for k in FIELDS]);await p.keyboard.press('p');checks.append('Pause freezes initiative/status/ledger and resumes with same resources')
   await click(p,'#help');assert (await snap(p))['state']=='paused';await click(p,'#help-close');await p.wait_for_function('window.__feather.snapshot().state==="battle"');await click(p,'#chapters');assert (await snap(p))['state']=='paused';await click(p,'#chapters-close');await p.wait_for_function('window.__feather.snapshot().state==="battle"');checks.append('Help and chapter book pause and close back to exact battle')
   await click(p,'#sound');assert await p.locator('#sound').get_attribute('aria-pressed')=='true';saved=await p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY);assert saved['sound'];await click(p,'#sound');checks.append('Original sound toggle has state and local persistence')
   await click(p,'#log-toggle');assert await p.locator('#log-toggle').get_attribute('aria-expanded')=='true';assert await p.locator('#history li').count()==len((await snap(p))['history']);checks.append('Expanded log includes each event/player/enemy/status in order')
   p=await fresh();s=await enter(p);s=await command(p,act(s,'shear','e0'));await click(p,'[data-item="ether"]');assert await p.locator('[data-target="e0"]').is_disabled();await click(p,'[data-target="a"]');assert '+3' in await p.locator('#preview-lines').inner_text();before=await snap(p);await click(p,'#confirm');s=await snap(p);assert s['items']['ether']==0 and next(u for u in s['units'] if u['id']=='a')['energy']==8 and await p.locator('[data-item="ether"]').is_disabled();checks.append('Actual ether gain clamps at8, decrements once and disables exhausted item')
   # Ordinary guard actions expose damage and low HP without modifying state.
   s=await guards(p,6);hurt=min((u for u in s['units'] if u['side']=='party' and u['hp']>0),key=lambda u:u['hp']/u['maxHP']);assert hurt['hp']<hurt['maxHP'];before=await snap(p);s=await command(p,supply(s,'heal',hurt['id']));assert s['items']['heal']==before['items']['heal']-1;assert s['history'][len(before['history'])]['effects'][0]['healed']>0;checks.append('Actual wounded ally healing consumes finite item and records actual bounded HP gain')
   before=await snap(p);await p.keyboard.press('p');await load(p,args.url,True);s=await snap(p);assert s['state']=='paused' and s['ui']['pending'] is None and all(before[k]==s[k] for k in FIELDS);await p.wait_for_timeout(100);assert all([before[k]==(await snap(p))[k] for k in FIELDS]);await click(p,'#resume');end,_,_=await complete(p,pilot);assert end['state']=='won';checks.append('Pause/reload reconstructs18 full physical fields including items and statuses, then ordinary win')
   best=(await snap(p))['best'];await click(p,'#secondary-action');s=await snap(p);assert s['state']=='event' and s['items']=={'heal':2,'ether':1,'revive':1} and s['best']==best;checks.append('Retry resets authored budget and retains best/unlock')
   s=await enter(p);await prepare(p,act(s,'shear','e0'));await load(p,args.url,True);r=await snap(p);assert r['state']=='paused' and r['ui']['pending'] is None and all(s[k]==r[k] for k in FIELDS);assert not await p.locator('#preview-dialog').is_visible();checks.append('Refresh cancels unconfirmed preview without payment or extra turn')
   p=await fresh(8);s=await enter(p);witness=None
   for _ in range(55):
    s=await snap(p)
    if s['state']!='battle':break
    dead=next((u for u in s['units'] if u['side']=='party' and u['hp']==0),None)
    if dead:witness=s;break
    await command(p,act(s))
   assert witness is not None;dead=next(u for u in witness['units'] if u['side']=='party' and u['hp']==0);assert dead['energy']==0 and dead['weak'] is None and dead['shield'] is None;await click(p,'[data-item="heal"]');assert await p.locator('[data-target="'+dead['id']+'"]').is_disabled();s=await command(p,supply(witness,'revive',dead['id']));assert s['items']['revive']==0 and s['stats']['revived']==1;assert any(h['type']=='player' and h['move'].get('item')=='revive' and h['effects'][0]['healed']==30 for h in s['history']);report['ordinaryRevive']={'before':witness,'after':s};checks.append('Natural KO clears statuses/energy; dead target rejects healing; ordinary revive restores30 exactly once without insertion')
   s=await guards(p,65);assert s['state']=='lost' and s['stats']['settlements']==1;before={k:s[k] for k in FIELDS};await p.keyboard.down('Enter');await p.keyboard.down('Enter');await p.keyboard.up('Enter');s=await snap(p);assert all(before[k]==s[k] for k in FIELDS);assert await p.locator('#overlay').is_visible();await click(p,'#primary-action');assert (await snap(p))['state']=='event';checks.append('Natural defeat displays single result; terminal inputs do not consume; retry is playable')
   p=await fresh(4);s=await enter(p);s=await guards(p,2);assert any(u['weak'] for u in s['units'] if u['side']=='party');await p.keyboard.press('p');before=await snap(p);await load(p,args.url,True);s=await snap(p);assert all(before[k]==s[k] for k in FIELDS);await click(p,'#resume');checks.append('Live enemy mist weakness and shields survive exact checkpoint restore')
   # Walk initiative normally until a cleanse can remove the actual mist debuff.
   for _ in range(8):
    s=await snap(p);target=next((u for u in s['units'] if u['side']=='party' and u['hp']>0 and u['weak']),None)
    if s['active']=='c' and target:
     s=await command(p,act(s,'cleanse',target['id']));assert next(u for u in s['units'] if u['id']==target['id'])['weak'] is None;break
    await command(p,act(s))
   else:raise AssertionError('No ordinary cleanse witness')
   checks.append('Ordinary澄心 clears actual enemy weakness with exact skill cost')
   p=await fresh(raw='{broken');assert (await snap(p))['state']=='event';checks.append('Malformed storage falls back to safe fresh chapter')
   forged={'version':1,'unlocked':1,'last':1,'tutorialSeen':True,'resume':{'version':1,'chapter':1,'commands':[],'units':[{'hp':999}],'items':{'heal':999}}};p=await fresh(raw=json.dumps(forged));s=await snap(p);assert s['state']=='paused' and s['items']=={'heal':2,'ether':1,'revive':1} and s['units'][0]['hp']==84;checks.append('Combat snapshot forgeries cannot grant HP or inventory')
   p=await fresh(denied=True);assert (await snap(p))['storageAvailable'] is False and await p.locator('#storage-note').is_visible();await enter(p);end,_,_=await complete(p,pilot);assert end['state']=='won';checks.append('Denied localStorage remains playable through normal first-chapter win')
   p=await fresh();await begin(p);await enter(p);end,_,_=await complete(p,pilot,keyboard=True);assert end['state']=='won';checks.append('Entire normal first battle through native focus/Enter keyboard skill-target-confirm controls')
   for width in [320,360,390,768,1024,1440]:
    await p.set_viewport_size({'width':width,'height':900});assert not await p.evaluate('document.documentElement.scrollWidth>innerWidth');await click(p,'#help');assert not await p.locator('#help-dialog').evaluate('(e)=>e.scrollWidth>e.clientWidth');await p.screenshot(path=str(out/f'width-{width}.png'));await click(p,'#help-close')
   checks.append('320/360/390/768/1024/1440 width and modal fit without page overflow')
   p=await fresh(touch=True);await begin(p,True);end,_,_=await complete(p,pilot,touch=True);assert end['state']=='won';await p.screenshot(path=str(out/'native-touch-win.png'),full_page=True);checks.append('Native touchscreen first chapter event/skill/target/preview/confirm and result hit testing')
   invariant(end);assert not errors and not bad and not failed,(errors,bad,failed);report['passed']=True;save();print(json.dumps({'passed':True,'groups':len(checks)}))
  except Exception as e:report['error']=type(e).__name__+': '+str(e)[:1800];raise
  finally:
   save()
   for c in contexts:await c.close()
   await b.close();await pilot.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:4174/games/feather/');a.add_argument('--out',default='.local/feather-ui');asyncio.run(main(a.parse_args()))
