import {mountGameAudio} from '../../../../play-audio.mjs?v=featured-audio-r1';
import * as C from './campaign.mjs';
import {CampaignStore,KEY} from './storage.mjs';
import {openingBrief} from '../../../v2/games/brook/opening-brief.mjs';
import {laneFeedback} from './lane-feedback.mjs';
import{LEVELS,UNITS,ENEMIES,GRID,cellPoint}from'./levels.mjs';import{createGame,start,pause,command,canPlace,occupied,update,score,snapshot,checkpoint,restore}from'./engine.mjs';import{Renderer}from'./renderer.mjs';
const $=s=>document.querySelector(s);let storage;try{storage=localStorage;}catch{}
const store=new CampaignStore(storage);const types=['dew','bolt','wall','mist','root'];let progress=store.data;
const resumed=progress.resume?restore(progress.resume):null;
let game=resumed||createGame(progress.stage),selection='bolt',row=0,col=2,remove=false,primaryAction,secondaryAction,lastState='',helpStarts=false,resumeAfter=false,previous=performance.now(),lastHud=0,lastSave=0,drag=null,newOpener=null;
const canvas=$('#battle'),renderer=new Renderer(canvas);
const audio=mountGameAudio({theme:'brook',host:$('#audio-settings'),onOpen:()=>setPause()});
audio.pause();
function announce(text){if($('#battle-status').textContent!==text)$('#battle-status').textContent=text;}
function clearInputs(){drag=null;}
function saveNote(){
 const bad=store.blocked||store.reason==='write';$('#save-note').dataset.warning=String(bad);
 $('#save-note').textContent=store.reason==='corrupt'?'原战役记录无法读取，已保留原字节。当前临时游玩不会覆盖，刷新会丢失本次进度。':store.reason==='read'?'无法读取浏览器记录；未写入旧数据。当前临时游玩，刷新可能无法恢复。':store.reason==='write'?'保存失败，仍可继续游玩。刷新可能回到上次成功保存的位置；旧有效记录未删除。':'战役独立保存：战斗按操作记录恢复并先暂停；关间、失利和总结可重读。v1/v2旧档不改。';
}
function persist(){store.save(progress);saveNote();}
function recordOutcome(){
 if(progress.phase==='active'&&['won','lost'].includes(game.state)){
  progress=C.settle(progress,game,score(game));persist();audio.cue(game.state==='won'?'win':'lose');lastState='';
 }
}
function remember(){
 recordOutcome();
 if(C.inBattle(progress)){progress.phase=game.state==='ready'?'ready':'active';progress.resume=checkpoint(game);}
 persist();
}
// One sound per event batch. Actual terminal settlement owns win/lose so a final
// kill/break cannot stack over it. No projectile or per-frame ambience sounds.
function playAudioEvents(events){
 if(['won','lost'].includes(game.state))return;
 const cue=events.some(e=>e.type==='broken')?'hurt':events.some(e=>['trigger','kill'].includes(e.type))?'hit':
  events.some(e=>e.type==='collect')?'collect':events.some(e=>['place','remove'].includes(e.type))?'action':null;
 if(cue)audio.cue(cue);
}
function setup(){const l=LEVELS[game.level-1];$('.scene').dataset.theme=l.theme;$('#row').replaceChildren(...Array.from({length:l.rows},(_,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=String(i+1);return o;}));$('#col').replaceChildren(...Array.from({length:8},(_,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=String(i+1);return o;}));$('#unit-cards').replaceChildren(...types.map((type,i)=>{const u=UNITS[type],b=document.createElement('button');b.type='button';b.className='unit-card';b.dataset.type=type;b.disabled=!l.allowed.includes(type);b.innerHTML=`<span class="card-title">${i+1} ${u.name}<b>${u.cost}露</b></span><small>${u.role} · 冷却${u.cooldown}s</small><span class="card-status"></span><span class="coolbar"></span>`;b.addEventListener('click',()=>select(type));return b;}));$('#all-waves').replaceChildren(...l.waves.map((w,i)=>{const p=document.createElement('p');p.textContent=`第 ${i+1} 阵 · ${w.at} 秒起：`+w.entries.map(e=>`${e.row+1}行 ${ENEMIES[e.type].name}${e.delay?` +${e.delay}s`:''}`).join(' / ');return p;}));}
function preview(){return remove?{valid:game.state==='playing'&&!!occupied(game,row,col),reason:occupied(game,row,col)?'撤收这一格，不返还露珠':'这一格没有装置可撤收'}:canPlace(game,selection,row,col);}function select(type){if(!LEVELS[game.level-1].allowed.includes(type))return;selection=type;remove=false;hud();announce(`已选择${UNITS[type].name}，选择空格后部署。`);}
function hud(){const l=LEVELS[game.level-1],q=preview();const lane=laneFeedback(game);if($('#lane-note').textContent!==lane.text)$('#lane-note').textContent=lane.text;if($('#lane-note').dataset.warning!==String(lane.warning))$('#lane-note').dataset.warning=String(lane.warning);$('#chapter').textContent=`${({creek:'森溪',stone:'岩谷',dusk:'晚照'})[l.theme]} / ${String(game.level).padStart(2,'0')}`;$('#level-name').textContent=l.name;$('#resource').textContent=String(game.resource);$('#cleared').textContent=`${game.stats.kills} / ${l.spawns.length}`;$('#clock').textContent=game.time.toFixed(1)+'s';$('#level-tip').textContent=l.tip;$('#row').value=String(row);$('#col').value=String(col);for(const b of $('#unit-cards').children){const type=b.dataset.type,u=UNITS[type],cd=Math.max(0,game.cooldown[type]-game.time);b.classList.toggle('selected',selection===type&&!remove);b.setAttribute('aria-pressed',String(selection===type&&!remove));b.querySelector('.card-status').textContent=!l.allowed.includes(type)?`第${u.unlock}关开放`:cd>0?`冷却 ${cd.toFixed(1)}s`:game.resource<u.cost?`还缺 ${u.cost-game.resource}露`:'已就绪';b.querySelector('.coolbar').style.width=Math.max(0,1-cd/u.cooldown)*100+'%';}$('#deploy').textContent=remove?'确认撤收':`部署到 ${row+1}行${col+1}格`;$('#deploy').disabled=!q.valid;$('#placement-note').textContent=`${remove?'撤收':UNITS[selection].name} · ${row+1}行${col+1}格 · ${q.reason}`;$('#remove').setAttribute('aria-pressed',String(remove));$('#collect').disabled=game.state!=='playing'||!game.tokens.length;$('#token-count').textContent=String(game.tokens.length);$('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').innerHTML=game.state==='paused'?'继续 <kbd>P</kbd>':'暂停 <kbd>P</kbd>';$('#speed').textContent=`速度 ${progress.speed}×`;const future=l.spawns.slice(game.nextSpawn);$('#wave').textContent=`${game.nextSpawn?l.spawns[game.nextSpawn-1].wave:0} / ${l.waves.length} 阵`;
$('#forecast-list').replaceChildren(...future.slice(0,4).map(s=>{const d=document.createElement('div'),t=document.createElement('time'),b=document.createElement('span');t.textContent=`${Math.max(0,s.at-game.time).toFixed(0)}s 后`;b.textContent=`${s.row+1}行 · ${ENEMIES[s.type].name}`;d.append(t,b);return d;}));if(!future.length)$('#forecast-list').textContent=game.enemies.length?'预告已全部出现，清除剩余来敌。':'本次预告已结束。';const best=progress.completed[game.level-1];$('#best').textContent=best?`本关最好：${best.score} 分 · ${best.time.toFixed(1)}s · 损失 ${best.losses} 座`:'本关暂无纪录。守住后记录成绩。';}
function overlay(title,copy,summary,label,action,second='选择溪谷',fn=openLevels){$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#overlay-summary').textContent=summary;$('#primary-action').textContent=label;$('#secondary-action').textContent=second;primaryAction=action;secondaryAction=fn;$('#overlay').hidden=false;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function resultCard(r){
 return '<article class="journey-card"><p class="eyebrow">行动 '+(r.stage+1)+' / '+(r.kind==='won'?'已守住':'失利记录')+'</p><h3>'+esc(LEVELS[r.stage].name)+'</h3><dl><dt>清除来敌</dt><dd>'+r.stats.kills+' / '+LEVELS[r.stage].spawns.length+'</dd><dt>活动用时</dt><dd>'+r.time.toFixed(1)+'秒</dd><dt>本场得分</dt><dd>'+r.score+'</dd><dt>装置损失</dt><dd>'+r.stats.losses+'</dd><dt>伏根 / 减速命中</dt><dd>'+r.stats.triggers+' / '+r.stats.slowHits+'</dd></dl></article>';
}
function sync(){
 recordOutcome();const live=C.inBattle(progress),key=progress.phase+':'+game.state;
 $('.layout').hidden=!live;$('#campaign-result').hidden=live;
 for(let i=0;i<3;i++){const el=$('#journey-'+i);el.classList.toggle('done',progress.completed.length>i);if(i===progress.stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
 if(key===lastState)return;lastState=key;clearInputs();
 if(!live){
  const done=progress.phase==='complete',lost=progress.phase==='lost',total=C.summary(progress);
  $('#journey-title').textContent=done?'三溪相接，守护到此有了回信。':lost?'第'+(progress.stage+1)+'场，重新布防。':'这一岸守住了，整备下一岸。';
  $('#journey-copy').textContent=done?'三场行动的真实结果留在这里。可以刷新重读，也可以确认重开一段新旅程。':lost?progress.lastLoss.reason+'；只重试本场，之前已完成的行动保留。':'每场按原预算空场出发，不继承露珠、装置或临时冷却。下一场由你明确开始，不会自动开战。';
  $('#journey-cards').innerHTML=(lost?[...progress.completed,progress.lastLoss]:progress.completed).map(resultCard).join('');
  $('#journey-total').textContent='已完成 '+total.completed+' / 3 · 成功场合计 '+total.score+'分 / '+total.time.toFixed(1)+'活动秒（不含暂停与失败尝试） · 已记录自然失利 '+total.failures+'次';
  $('#campaign-next').textContent=done?'重新开始三场战役':lost?'重试第'+(progress.stage+1)+'场':'整备第'+(progress.stage+2)+'场 →';
  $('#journey-title').focus();window.scrollTo({top:0,behavior:'instant'});return;
 }
 $('#overlay').classList.toggle('ready',game.state==='ready');$('#overlay-kicker').textContent=game.state==='paused'?'暂歇片刻':'先看一眼阵线';
 if(game.state==='ready')overlay(lname(),openingBrief(LEVELS[game.level-1],ENEMIES),'本场独立初始 '+game.resource+'露','开始第'+game.level+'场 →',begin,'查看三场目标',openLevels);
 else if(game.state==='playing'){$('#overlay').hidden=true;announce('守护开始。');}
 else if(game.state==='paused'){overlay('让风停一会儿','预算、冷却、弹体和波次都已暂停。','','继续守护 →',togglePause,'查看三场目标',openLevels);announce('已暂停。');}
 hud();
}
const lname=()=>LEVELS[game.level-1].name;
function prepareStage(){
 audio.stop();audio.pause();game=createGame(progress.stage);row=0;col=2;selection='bolt';remove=false;lastState='';clearInputs();$('#restore-note').hidden=true;previous=performance.now();setup();remember();sync();renderer.draw(game,{row,col,type:selection,remove});$('#primary-action').focus();
}
function load(){const next=C.retry(progress);if(next===progress)return;progress=next;prepareStage();}
function openNew(){
 newOpener=document.activeElement;setPause();$('#new-copy').textContent=store.blocked?'开始新的临时战役；原不可读字节仍保留，不会覆盖。v1/v2不变。':'这会重开这份三场战役。v1/v2选择、成绩和存档不变。';$('#new-dialog').showModal();$('#new-cancel').focus();
}
$('#campaign-next').onclick=()=>{if(progress.phase==='intermission'){progress=C.advance(progress);prepareStage();}else if(progress.phase==='lost')load();else if(progress.phase==='complete')openNew();};
$('#new-campaign').onclick=openNew;$('#new-cancel').onclick=()=>{$('#new-dialog').close();newOpener?.focus({preventScroll:true});};
$('#new-confirm').onclick=()=>{$('#new-dialog').close();progress=C.fresh();prepareStage();};
function begin(){if(!progress.tutorialSeen){helpStarts=true;openHelp();return;}start(game);audio.resume();previous=performance.now();sync();remember();canvas.focus({preventScroll:true});}
function send(c){if($('#help-dialog').open||$('#levels-dialog').open)return false;if(!command(game,c))return false;playAudioEvents(game.events.splice(0));hud();remember();announce(c.kind==='collect'?`已收集${c.ids.length}颗露珠`:c.kind==='place'?`已在${c.row+1}行${c.col+1}格部署${UNITS[c.type].name}`:'已撤收，不退款');return true;}
function deploy(){return send(remove?{kind:'remove',row,col}:{kind:'place',type:selection,row,col});}function collect(){const ids=game.tokens.map(t=>t.id);if(ids.length)send({kind:'collect',ids});}function setPause(){audio.pause();if(game.state==='playing'){pause(game);clearInputs();sync();remember();}}function togglePause(){if(!['playing','paused'].includes(game.state))return;pause(game);if(game.state==='playing')audio.resume();else audio.pause();clearInputs();previous=performance.now();sync();remember();}
function openLevels(){
 resumeAfter=game.state==='playing';setPause();
 $('#level-list').replaceChildren(...LEVELS.map((l,i)=>{const e=document.createElement('article');e.className='progress-stage'+(i===progress.stage?' current':'');const h=document.createElement('b'),p=document.createElement('p');h.textContent='0'+(i+1)+' / '+l.name;p.textContent=progress.completed[i]?'已完成 '+progress.completed[i].score+'分':i===progress.stage?'当前行动 · '+l.spawns.length+'来敌':l.spawns.length+'来敌 · 前场完成后进入';e.append(h,p);return e;}));$('#levels-dialog').showModal();
}

function openHelp(){resumeAfter=game.state==='playing';setPause();$('#help-dialog').showModal();}function closeDialog(d){d.close();if(helpStarts){helpStarts=false;progress.tutorialSeen=true;start(game);audio.resume();previous=performance.now();sync();remember();canvas.focus({preventScroll:true});}else if(resumeAfter&&game.state==='paused'){resumeAfter=false;togglePause();}}
$('#primary-action').addEventListener('click',()=>primaryAction?.());$('#secondary-action').addEventListener('click',()=>secondaryAction?.());$('#pause').addEventListener('click',togglePause);$('#reset').addEventListener('click',()=>load(game.level-1));$('#levels').addEventListener('click',openLevels);$('#help').addEventListener('click',openHelp);$('#help-confirm').addEventListener('click',()=>closeDialog($('#help-dialog')));$('#help-close').addEventListener('click',()=>{helpStarts=false;closeDialog($('#help-dialog'));});$('#levels-close').addEventListener('click',()=>closeDialog($('#levels-dialog')));for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',e=>{e.preventDefault();helpStarts=false;closeDialog(d);});$('#speed').addEventListener('click',()=>{progress.speed=progress.speed===1?2:1;persist();hud();});$('#remove').addEventListener('click',()=>{remove=!remove;hud();});$('#deploy').addEventListener('click',deploy);$('#collect').addEventListener('click',collect);$('#row').addEventListener('change',()=>{row=Number($('#row').value);hud();});$('#col').addEventListener('change',()=>{col=Number($('#col').value);hud();});
canvas.addEventListener('click',e=>{if($('#help-dialog').open||$('#levels-dialog').open)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*850/r.width,y=(e.clientY-r.top)*390/r.height;const t=game.tokens.filter(t=>Math.hypot(t.x-x,t.y-y)<=24).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(t&&game.state==='playing'){send({kind:'collect',ids:[t.id]});return;}const nr=Math.floor((y-GRID.y)/GRID.ch),nc=Math.floor((x-GRID.x)/GRID.cw);if(nr>=0&&nr<LEVELS[game.level-1].rows&&nc>=0&&nc<8){row=nr;col=nc;hud();canvas.focus({preventScroll:true});}});
window.addEventListener('keydown',e=>{
 if(e.defaultPrevented||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('a[href],select,input,textarea,summary,[contenteditable]:not([contenteditable="false"])'))return;
 const k=e.key.toLowerCase();
 if(e.repeat&&['1','2','3','4','5','enter',' ','c','x','r','p','escape'].includes(k))return;
 if(k==='p'||k==='escape'){e.preventDefault();togglePause();return;}
 if(e.target.closest('button')||!C.inBattle(progress))return;
 if(k==='r'){e.preventDefault();load();}else if(k==='c'){e.preventDefault();collect();}else if(k==='x'){e.preventDefault();remove=!remove;hud();}
 else if(/^[1-5]$/.test(k)){e.preventDefault();select(types[Number(k)-1]);}
 else if(document.activeElement===canvas){if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();if(k==='arrowup')row=Math.max(0,row-1);if(k==='arrowdown')row=Math.min(LEVELS[game.level-1].rows-1,row+1);if(k==='arrowleft')col=Math.max(0,col-1);if(k==='arrowright')col=Math.min(7,col+1);hud();}else if(k==='enter'||k===' '){e.preventDefault();deploy();}}
});window.addEventListener('blur',setPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause();});window.addEventListener('pagehide',()=>{setPause();remember();});
function frame(now){const dt=Math.min(.08,Math.max(0,(now-previous)/1000));previous=now;update(game,dt*progress.speed);playAudioEvents(game.events.splice(0));sync();if(now-lastHud>100){hud();lastHud=now;}if(now-lastSave>1000&&game.state==='playing'){remember();lastSave=now;}renderer.draw(game,{row,col,type:selection,remove});requestAnimationFrame(frame);}
setup();if(resumed&&game.state==='paused'){$('#restore-note').hidden=false;$('#restore-note').textContent='已按普通操作记录恢复，并暂停在原来的预算、冷却与波次。';}
if(store.wasEmpty)remember();else saveNote();
sync();renderer.draw(game,{row,col,type:selection,remove});requestAnimationFrame(frame);
export function diagnostics(){return{campaign:JSON.parse(JSON.stringify(progress)),battle:C.inBattle(progress)?snapshot(game):null,row,col,selection,remove,speed:progress.speed,audio:audio.diagnostics(),storage:{blocked:store.blocked,reason:store.reason,key:KEY}};}
window.__brookCampaign={snapshot:diagnostics};
