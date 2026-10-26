import {ROOMS,ITEMS,NOTES,CAPACITY} from './world.mjs?v=echoes-slice-1';
import {createGame,tick,interact,inspect,combine,useItem,transfer,objective,snapshot,near} from './engine.mjs?v=echoes-slice-1';
import {load,persist} from './storage.mjs?v=echoes-slice-1';
import {bindInput} from './input.mjs?v=echoes-slice-1';
import {draw} from './renderer.mjs?v=echoes-slice-1';
const $=id=>document.getElementById(id),canvas=$('world'),panel=$('panel');let storage;try{storage=window.localStorage;}catch{}
const saved=load(storage);let s=saved.save||createGame(),checkpoint=saved.checkpoint||snapshot(createGame()),started=false,screen='',selected=null,saveAllowed=saved.ok,lastMessage='',lastHud='',sound=false,audio;
const clone=v=>structuredClone(v),itemName=id=>ITEMS[id].name;
function save(){if(!started)return;if(!saveAllowed){$('save-status').textContent=saved.reason;return;}$('save-status').textContent=persist(storage,s,checkpoint)?'现场已保存在本机 · 已上线试玩／七室首段，线上体验验收中':'保存失败 · 当前可继续玩，请重试保存';}
function tone(type){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(type==='shot'?150:type==='hurt'?82:330,audio.currentTime);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.14);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.15);}catch{sound=false;}}
function events(){for(const e of s.events.splice(0)){if(e==='checkpoint'){checkpoint=snapshot(s);save();}else if(e==='door'||e==='won')save();tone(e);}}
function update(){
 const hud=JSON.stringify([s.room,s.player.hp,s.loaded,s.reserve,s.inventory.length,objective(s)]);
 if(hud!==lastHud){$('room-name').textContent=ROOMS[s.room].name;$('condition').textContent='体力 '+s.player.hp;$('condition').classList.toggle('danger',s.player.hp<=50);$('ammo').textContent='弹仓 '+s.loaded+' / 4 · 余弹 '+s.reserve;$('slots').textContent='携带 '+s.inventory.length+' / '+CAPACITY;$('objective').textContent=objective(s);lastHud=hud;}
 const nearby=near(s);$('nearby').textContent=s.room==='corridor'&&s.enemy.hp>0&&s.enemy.windup>0?'推击将至 · 立即移动离开！':nearby?'E 调查 · '+nearby.label:'走近门或物品，按 E 调查';
 if(s.message!==lastMessage){$('message').textContent=s.message;$('panel-message').textContent=s.message;lastMessage=s.message;}
 // Read-only serialized observation for local input replay. No state mutation API.
 canvas.dataset.snapshot=JSON.stringify({room:s.room,x:s.player.x,y:s.player.y,angle:s.player.angle,hp:s.player.hp,mode:s.mode,inventory:s.inventory,box:s.box,loaded:s.loaded,reserve:s.reserve,flags:s.flags,enemy:{hp:s.enemy.hp,x:s.enemy.x,y:s.enemy.y,windup:s.enemy.windup},rescued:s.rescued,stats:s.stats});
 draw(canvas,s);
}
const input=bindInput({target:document,canvas,controls:$('controls'),active:()=>started&&s.mode==='playing'&&!panel.open&&!$('welcome').open,onAction:action,onBlur:()=>{if(started&&s.mode==='playing')open('pause');else save();}});
function show(){if(!panel.open)panel.showModal();$('panel-message').textContent=s.message;}
function open(kind){if(!started)return;input.clear();s.aim=false;selected=null;screen=kind;if(kind!=='result'&&!['won','lost'].includes(s.mode))s.mode=kind==='box'?'box':'paused';renderPanel();show();save();}
function close(){if(s.mode==='lost'||s.mode==='won'){if(screen==='retry'||screen==='restart')cancelReset();return;}panel.close();screen='';selected=null;s.mode='playing';input.clear();canvas.focus();update();}
function cancelReset(){const cancelled=screen;screen=['won','lost'].includes(s.mode)?'result':'pause';renderPanel();if(screen==='result')$('panel-content').querySelector(`[data-result-action="${cancelled}"]`)?.focus();}
function requestReset(kind){screen=kind;renderPanel();$('panel-content').querySelector('[data-cancel-reset]')?.focus();}
function button(label,fn,attributes={}){const b=document.createElement('button');b.textContent=label;for(const [k,v] of Object.entries(attributes))b.setAttribute(k,v);b.onclick=fn;return b;}
function renderInventory(content,isBox=false){
 const intro=document.createElement('p');intro.className='small';intro.textContent='六格携带 '+s.inventory.length+'/6。选择“组合”后再选第二件。用过的馆钥仍占格；弹盒清空才收起。';content.append(intro);
 const list=document.createElement('ul');list.className='pack-list';
 for(const id of s.inventory){const li=document.createElement('li');li.dataset.item=id;li.classList.toggle('selected',selected===id);const name=document.createElement('div');name.className='item-name';name.textContent=itemName(id)+(id==='pistol'?' · 弹仓 '+s.loaded:id==='rounds'?' · '+s.reserve+'发':'');li.append(name);const actions=document.createElement('div');actions.className='item-actions';
  actions.append(button('检查',()=>{inspect(s,id);update();},{'data-inspect':id}),button('使用',()=>{useItem(s,id);events();if(s.mode==='won'){screen='result';renderPanel();save();}else renderPanel();update();},{'data-use':id}),button(selected&&selected!==id?'与'+itemName(selected)+'组合':'组合',()=>{if(selected&&selected!==id){combine(s,selected,id);selected=null;}else selected=id;renderPanel();update();},{'data-combine':id}));
  if(isBox)actions.append(button('寄存',()=>{transfer(s,id,'store');selected=null;renderPanel();update();},{'data-store':id}));li.append(actions);list.append(li);
 }
 if(!s.inventory.length){const p=document.createElement('p');p.textContent='背包是空的。';list.append(p);}content.append(list);
 if(isBox){const h=document.createElement('h3');h.textContent='铁柜内 · '+s.box.length+'件';content.append(h);for(const id of s.box){content.append(button('取出 · '+itemName(id),()=>{transfer(s,id,'take');renderPanel();update();},{'data-take':id}));}}
}
function renderPanel(){
 const content=$('panel-content');content.replaceChildren();$('close-panel').hidden=screen==='result';$('panel-title').textContent=({pack:'六格背包',box:'值班室 · 寄存铁柜',map:'旧馆地图与线索',pause:'在这里停一会儿',retry:'重试本次救援',restart:'重新开始救援',result:s.mode==='won'?'雨檐之外，有人接应。':'救援暂时中断。'})[screen];
 if(screen==='pack'||screen==='box')renderInventory(content,screen==='box');
 else if(screen==='map'){
  const map=document.createElement('div');map.className='map-links';map.textContent='门厅 ⇄ 回廊 ⇄ 阅览室 ⇄ 档案室 ⇄ 前室';content.append(map);const links=document.createElement('p');links.className='map-links';links.textContent='门厅 ⇄ 温室 ⇄ 阅览室（绕行）\n门厅 ⇄ 值班室 '+(s.flags.loop?'⇄ 温室（内闩已开）':'↛ 温室（内闩在温室侧）');links.style.whiteSpace='pre-line';content.append(links);
  const rooms=document.createElement('ul');rooms.className='map-rooms';for(const [id,r] of Object.entries(ROOMS)){const li=document.createElement('li');li.className=s.room===id?'here':s.visited.includes(id)?'':'unknown';li.textContent=(s.room===id?'你在这里 · ':s.visited.includes(id)?'到过 · ':'未到 · ')+r.name;rooms.append(li);}content.append(rooms);
  const locks=document.createElement('p');locks.textContent='档案门：'+(s.flags.archive?'已开':'需检查并使用馆钥')+' · 前室：'+(s.flags.power?'通电':'需修复熔芯');content.append(locks);for(const id of s.notes){const p=document.createElement('p');p.className='note';p.textContent=NOTES[id];content.append(p);}
 }else if(screen==='pause'){
  const p=document.createElement('p');p.textContent='时间与敌人已暂停。继续后需要重新按方向。可以刷新，现场恢复时仍会先停在这里。';content.append(p);const actions=document.createElement('div');actions.className='pause-actions';actions.append(button('继续救援',close,{class:'primary'}),button('重试保存',save),button('原创合成提示音：'+(sound?'开':'关'),()=>{sound=!sound;if(sound)tone('door');renderPanel();}),button('重新开始本段',()=>{screen='restart';renderPanel();}));content.append(actions);
 }else if(screen==='retry'||screen==='restart'){
  const p=document.createElement('p');p.textContent=screen==='retry'?'将回到最近一次值班室记录的资源与位置。若还没记录，则回到进馆时。当前现场将由该记录替换。':'重新开始七室救援，只替换本作的现场与记录点。其他游戏与存档不受影响。';content.append(p);const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('保留当前现场',cancelReset,{'data-cancel-reset':'yes'}),button(screen==='retry'?'确认从记录点重试':'确认重新开始',()=>reset(screen==='retry'),{class:'primary','data-confirm-reset':'yes'}));content.append(actions);
 }else if(screen==='result'){
  const p=document.createElement('p');p.textContent=s.message;content.append(p);const recap=document.createElement('div');recap.className='recap';for(const [name,value] of [['发射弹数',s.stats.shots],['受击损失',s.stats.damage],['行走距离',s.stats.distance.toFixed(1)+'米'],['经过门次',s.stats.doors]]){const d=document.createElement('div'),b=document.createElement('b');b.textContent=String(value);d.append(b,document.createTextNode(name));recap.append(d);}content.append(recap);const note=document.createElement('p');note.className='small';note.textContent=s.mode==='won'?'七室首段完成；庭院与档案翼六室续段已上线试玩，线上体验验收中。本作仍非完整原作复刻。':'可回到记录点，重新安排弹药、敷包与回程。';content.append(note);const actions=document.createElement('div');actions.className='result-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','结算操作');if(s.mode==='won'){const next=document.createElement('a');next.href='./courtyard/?v=echoes-courtyard-1';next.className='result-return';next.textContent='继续第二段 · 庭院与档案翼';actions.append(next);}const link=document.createElement('a');link.href='../../#play';link.className='result-return';link.dataset.resultReturn='yes';link.textContent='返回游戏大厅';actions.append(link);const retryActions=document.createElement('div');retryActions.className='result-retry-actions';retryActions.setAttribute('role','group');retryActions.setAttribute('aria-label','重试与重新开始，均需确认');retryActions.append(button('从记录点重试',()=>requestReset('retry'),{'data-result-action':'retry'}),button('重新开始本段',()=>requestReset('restart'),{'data-result-action':'restart'}));actions.append(retryActions);content.append(actions);
 }
 $('panel-message').textContent=s.message;
}
function reset(fromCheckpoint){s=fromCheckpoint?clone(checkpoint):createGame();if(!fromCheckpoint)checkpoint=snapshot(createGame());s.mode='playing';s.events=[];s.aim=false;panel.close();screen='';input.clear();lastHud='';lastMessage='';save();update();canvas.focus();}
function action(a){
 if(!started)return;
 if(a==='escape'){if(panel.open){if(screen==='result')return;close();}else open('pause');return;}
 if(a==='pause'){if(panel.open&&screen==='pause')close();else if(s.mode==='playing')open('pause');return;}
 if(a==='pack'||a==='map'){if(s.mode==='lost'||s.mode==='won')return;if(panel.open&&screen===a)close();else open(a);return;}
 if(a==='interact'&&s.mode==='playing'){input.clear();interact(s);events();if(s.mode==='box'){screen='box';renderPanel();show();}else canvas.focus();update();}
}
$('pack').onclick=()=>action('pack');$('map').onclick=()=>action('map');$('pause').onclick=()=>action('pause');$('touch-interact').onclick=()=>action('interact');$('retry').onclick=()=>open('retry');$('close-panel').onclick=close;
panel.addEventListener('cancel',e=>{e.preventDefault();close();});$('welcome').addEventListener('cancel',e=>e.preventDefault());
if(saved.save){$('start').textContent=['won','lost'].includes(s.mode)?'查看上次救援结果':'继续本机救援';$('resume-info').textContent='找到本作续档：'+ROOMS[s.room].name+'，体力 '+s.player.hp+'，携带 '+s.inventory.length+'/6。继续前仍可查看地图。';}
if(!saved.ok){$('save-status').textContent=saved.reason;$('resume-info').textContent=saved.reason+' 新旅程可临时游玩。';}
$('start').onclick=()=>{started=true;$('welcome').close();if(['won','lost'].includes(s.mode)){screen='result';renderPanel();show();}else if(saved.save){open('pause');}else{s.mode='playing';canvas.focus();save();}update();};
window.addEventListener('pagehide',()=>{input.clear();save();});
let last=0,acc=0,autosave=0;function frame(ms){const dt=last?Math.min((ms-last)/1000,.1):0;last=ms;if(s.mode==='playing'){acc+=dt;while(acc>=1/60){tick(s,input.read());acc-=1/60;}events();autosave+=dt;if(autosave>=4){autosave=0;save();}if(s.mode==='lost'){input.clear();screen='result';renderPanel();show();save();}}else acc=0;update();requestAnimationFrame(frame);}
update();$('welcome').showModal();requestAnimationFrame(frame);
