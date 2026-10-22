import {createGame,start,pause,update,snapshot} from '../../../v2/games/fortress/engine.mjs';
import {LEVELS} from '../../../v2/games/fortress/levels.mjs';
import {Renderer} from '../../../v2/games/fortress/renderer.mjs';
import {BaseFeedback} from '../../../v2/games/fortress/base-feedback.mjs?base-feedback-r1';
import {Controls,PLAY_KEYS} from '../../../v2/games/fortress/input.mjs?touch-sources-r1';
import {fresh,selectMode,begin,prepareCurrent,advance,settle,summary} from './campaign.mjs';
import {CampaignStore,KEY} from './storage.mjs';
const $=s=>document.querySelector(s),controls=new Controls(),renderer=new Renderer($('#battlefield'));
let storage;try{storage=localStorage;}catch{storage=null;}
const store=new CampaignStore(storage);
let journey=store.data,game=null,feedback=null,inputTicks=[0,0],enterHeld=false,previous=performance.now(),accumulator=0,lastView='';
const seconds=n=>n.toFixed(1)+'秒';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function text(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value;}
function clear(){enterHeld=false;controls.clear();document.querySelectorAll('[data-key]').forEach(e=>e.classList.remove('pressed'));}
function persist(){
 const ok=store.save(journey);$('#save-note').dataset.warning=String(!ok);
 text('#save-note',ok?'短战役阶段已保存 · 战斗刷新回当前行动整备 · v1/v2记录独立':
  store.reason==='corrupt'?'原短战役记录无法读取，已保留且不会覆盖。本次可临时游玩，刷新会丢失本次进度。':
  store.reason==='read'?'无法读取本地记录，未覆盖任何旧内容。本次可临时游玩，刷新可能无法恢复。':
  '阶段保存失败，仍可继续游玩。刷新会回到上次成功保存的阶段，当前进度可能丢失；旧有效记录未删除。');
}
function prepareBattle(){
 clear();game=createGame(journey.stage,{players:journey.mode});feedback=new BaseFeedback(game);inputTicks=[0,0];
 accumulator=0;previous=performance.now();renderer.terrainKey='';renderer.particles=[];renderer.rings=[];renderer.shake=0;
}
function replace(next,{prepare=false,focus=false}={}){
 journey=next;if(prepare){prepareBattle();$('#restore-note').hidden=true;}clear();lastView='';persist();sync();
 if(focus)$('#primary').focus();
}
function beginBattle(){
 if(journey.phase!=='briefing')return;
 journey=begin(journey);clear();$('#restore-note').hidden=true;start(game);previous=performance.now();persist();lastView='';sync();$('#battlefield').focus({preventScroll:true});
}
function stop(){
 clear();if(journey.phase==='battle'&&game?.state==='playing'){pause(game);lastView='';sync();}
}
function resume(){
 if(journey.phase==='battle'&&game?.state==='paused'){clear();start(game);previous=performance.now();lastView='';sync();$('#battlefield').focus({preventScroll:true});}
}
function primary(){
 if(journey.phase==='briefing')beginBattle();
 else if(journey.phase==='battle'&&game.state==='paused')resume();
}
function prepareAgain(){
 if(journey.phase==='battle'&&game.state==='paused'||journey.phase==='defeat')replace(prepareCurrent(journey),{prepare:true,focus:true});
}
function resultCard(r){
 const title=escape(LEVELS[r.stage].name),participants=r.players.map(p=>'<p>'+p.number+'P · 有操作输入 '+seconds(p.inputTicks/60)+' · 剩余出击 '+p.lives+'</p>').join('');
 return '<article class="result-card"><p class="eyebrow">行动 '+String(r.stage+1).padStart(2,'0')+' / '+(r.kind==='won'?'已守住':'失利记录')+'</p><h2>'+title+'</h2><dl><dt>已清除</dt><dd>'+r.kills+' / 6</dd><dt>活动用时</dt><dd>'+seconds(r.time)+'</dd><dt>本行动得分</dt><dd>'+r.score+'</dd><dt>结束时基地耐久</dt><dd>'+r.base+' / 3</dd></dl><div class="participation">'+participants+'</div></article>';
}
function sync(){
 const inBattle=['briefing','battle'].includes(journey.phase),view=journey.phase+':'+(game?.state||'');
 $('#battle-view').hidden=!inBattle;$('#phase-view').hidden=inBattle;
 $('#pause').disabled=journey.phase!=='battle';text('#pause',game?.state==='paused'?'继续 P':'暂停 P');
 $('#mode').value=journey.mode;$('#mode').disabled=journey.started;
 text('#mode-note',journey.started?'本次编组已确定；重开短战役可重新选择。':'没有 AI 队友；触控仅操作1P，双车需要键盘。');
 for(let i=0;i<2;i++){const el=$('#step-'+i);el.classList.toggle('done',journey.wins.length>i);if(journey.stage===i)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
 if(inBattle){
  document.body.dataset.state=game.state;$('#overlay').hidden=game.state==='playing';$('#retry').hidden=game.state!=='paused';
  text('#mission-goal',(journey.stage+1)+' / 2 · '+LEVELS[journey.stage].name+'：守住基地，清除六台来敌。');
  text('#stage-label','行动 '+String(journey.stage+1).padStart(2,'0')+' / 02');
  text('#state-label',game.state==='paused'?'PAUSED / 当前行动暂停':journey.stage===0?'DEPARTURE / 第一行动':'HANDOVER / 第二行动');
  text('#result-title',game.state==='paused'?'火线已暂停':LEVELS[journey.stage].name);
  text('#result-copy',game.state==='paused'?'继续当前战斗，或重新整备本行动。刷新会回到本行动整备，已完成的首图仍保留。':
   LEVELS[journey.stage].description+' '+(journey.mode===2?'双车独立操作，共享基地。':'仅部署1P，没有AI队友。')+(journey.stage===1?'首图成果已保留；本图重新配发出击与基地耐久。':''));
  text('#primary',game.state==='paused'?'继续战斗':'开始第'+(journey.stage===0?'一':'二')+'行动');
  text('#base',Array.from({length:3},(_,i)=>i<game.base.hp?'◆':'◇').join(' '));
  const notice=feedback.update(game);$('#base-card').dataset.notice=notice.kind;text('#base-label',notice.label);
  $('#base').setAttribute('aria-label','基地耐久'+game.base.hp+'，共3');
  for(let i=0;i<2;i++){
   const p=game.players[i];text('#p'+(i+1),p?(p.dead?'已退出':Array.from({length:3},(_,n)=>n<p.lives?'●':'○').join(' ')):'未加入');
   text('#power'+(i+1),!p?'本次为单车编组':p.dead?'队友仍可继续':p.rapid>0?'速射 '+Math.ceil(p.rapid)+'秒':p.shield>0?'护盾 '+Math.ceil(p.shield)+'秒':'标准装甲');
  }
  text('#clock',String(Math.floor(game.time/60)).padStart(2,'0')+':'+String(Math.floor(game.time%60)).padStart(2,'0'));
  text('#wave',game.kills+' / 6');text('#score','本行动得分 '+game.score);text('#tip',LEVELS[journey.stage].tip);
  text('#status',game.state==='playing'?(notice.message||'保护信标；清除本图六台来敌后进入下一阶段。'):game.state==='paused'?'行动暂停':'本行动整备中，不计时。');
 }else if(view!==lastView){
  document.body.dataset.state=journey.phase;
  const total=summary(journey),complete=journey.phase==='complete',defeat=journey.phase==='defeat';
  text('#phase-label',complete?'JOURNEY KEPT / 两段完成':defeat?'REGROUP / 重新整备':'BETWEEN SIGNALS / 关间交接');
  text('#phase-title',complete?'两段信标，都守住了。':defeat?'第'+(journey.stage===0?'一':'二')+'行动失守':'第一行动守住了，去交汇处接防。');
  text('#phase-copy',complete?'双翼哨口安静下来，交汇路口也重新亮起信标。这是本次两段行动的真实记录；可以保留总结，或重新选择编组出发。':
   defeat?journey.lastLoss.reason+' '+(journey.stage===1?'首图成果仍保留，只需重试第二行动。':'可以按同一地图和原数值重新出击。'):
   '接下来前往交汇换防。第二行动按原初态重新整备：每车三次出击、基地三点耐久，不继承临时补给或场内位置。');
  $('#results').innerHTML=(defeat?[...journey.wins,journey.lastLoss]:journey.wins).map(resultCard).join('');
  text('#journey-total','本次'+(journey.mode===2?'同键双车':'单车')+' · 已完成 '+total.completed+' / 2 · 成功行动合计 '+total.score+'分、'+seconds(total.time)+'（不含暂停或失败重试）。已记录失利 '+total.failures+'次。操作输入时间不是击杀占比，也不代表真人数量。');
  text('#phase-primary',complete?'重新开始短战役':defeat?'重试第'+(journey.stage===0?'一':'二')+'行动':'整备第二行动 →');
  $('#phase-title').focus();window.scrollTo({top:0,behavior:'instant'});
 }
 lastView=view;
}
$('#mode').onchange=e=>replace(selectMode(journey,Number(e.target.value)),{prepare:true});
$('#primary').onclick=primary;$('#retry').onclick=prepareAgain;
$('#pause').onclick=()=>{if(game?.state==='playing')stop();else resume();};
$('#phase-primary').onclick=()=>{if(journey.phase==='intermission')replace(advance(journey),{prepare:true,focus:true});else if(journey.phase==='defeat')prepareAgain();else if(journey.phase==='complete')openRestart();};
function openRestart(){
 stop();text('#restart-copy',store.blocked?'开始新的临时战役；无法读取的原记录仍保留，不会覆盖。自由选图v2与更早记录不变。':'这会重开这一份短战役。自由选图v2与更早版本的记录不会改变。');
 $('#restart-dialog').showModal();$('#restart-cancel').focus();
}
$('#new-campaign').onclick=openRestart;$('#restart-cancel').onclick=()=>$('#restart-dialog').close();
$('#restart-confirm').onclick=()=>{$('#restart-dialog').close();$('#restore-note').hidden=true;replace(fresh(),{prepare:true,focus:true});};
window.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||$('#restart-dialog').open||event.target.closest('a[href],select,input,textarea,summary,[contenteditable]:not([contenteditable="false"])'))return;
 if(['KeyP','Escape'].includes(event.code)){event.preventDefault();if(!event.repeat)$('#pause').click();return;}
 if(event.target.closest('button'))return;
 if(!['briefing','battle'].includes(journey.phase))return;
 if(PLAY_KEYS.includes(event.code))event.preventDefault();
 if(event.code==='Enter'&&enterHeld)return;
 if(event.code==='Enter'&&game.state!=='playing'){if(!event.repeat){primary();enterHeld=true;}return;}
 if(game.state==='playing'&&PLAY_KEYS.includes(event.code))controls.press(event.code);
});
window.addEventListener('keyup',event=>{if(event.code==='Enter')enterHeld=false;controls.release(event.code);});
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',event=>{event.preventDefault();if(journey.phase!=='battle'||game.state!=='playing')return;button.setPointerCapture(event.pointerId);controls.press(button.dataset.key,event.pointerId);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,event=>controls.release(button.dataset.key,event.pointerId));
}
function frame(now){
 const dt=Math.min((now-previous)/1000,.1);previous=now;
 if(journey.phase==='battle'&&game?.state==='playing'){
  accumulator+=dt;
  while(accumulator>=1/60&&game.state==='playing'){
   const input=controls.read();
   game.players.forEach((p,i)=>{const v=input.players[i];if(!p.dead&&(v.dir!==null||v.fire))inputTicks[i]++;});
   update(game,input,1/60);accumulator-=1/60;
  }
  if(['won','lost'].includes(game.state)){journey=settle(journey,game,inputTicks);clear();persist();lastView='';}
 }else accumulator=0;
 if(game&&['briefing','battle'].includes(journey.phase)){renderer.effects(game.events.splice(0));renderer.draw(game,dt);}
 sync();requestAnimationFrame(frame);
}
if(journey.phase==='briefing')prepareBattle();
if(store.wasEmpty||store.restartedBattle||store.blocked)persist();
else text('#save-note','已读取独立短战役阶段记录 · 战斗刷新回当前行动整备 · v1/v2记录独立');
$('#restore-note').hidden=!store.restartedBattle;
sync();requestAnimationFrame(frame);
window.__fortressCampaign={snapshot:()=>({journey:JSON.parse(JSON.stringify(journey)),battle:['briefing','battle'].includes(journey.phase)&&game?snapshot(game):null,inputTicks:[...inputTicks],storage:{blocked:store.blocked,reason:store.reason,key:KEY}})};
