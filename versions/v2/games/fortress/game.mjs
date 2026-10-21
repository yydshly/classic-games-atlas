import {createGame,start,pause,update,snapshot} from './engine.mjs';
import {Renderer} from './renderer.mjs';
import {Controls,PLAY_KEYS} from './input.mjs';
import {readProgress,saveProgress} from './progress.mjs';
const $=s=>document.querySelector(s),controls=new Controls();
let storage;try{storage=localStorage;}catch{storage=null;}
const loaded=readProgress(storage),progress=loaded.data;let storageOK=loaded.ok;
$('#level').value=progress.last;$('#mode').value=progress.mode;
let startEnterHeld=false;
let game=createGame(progress.last,{players:progress.mode}),lastState='',previous=performance.now(),accumulator=0;
const renderer=new Renderer($('#battlefield'));
function save(){storageOK=storageOK&&saveProgress(storage,progress);$('#save-note').textContent=storageOK?'仅保存选择与最高分 · 不保存战斗中途':'存储不可用或记录损坏 · 本次仍可游玩';}
function clear(){startEnterHeld=false;controls.clear();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('pressed'));}
function prepare(){clear();game=createGame(Number($('#level').value),{players:Number($('#mode').value)});progress.last=game.index;progress.mode=game.mode;save();renderer.terrainKey='';renderer.particles=[];renderer.rings=[];renderer.shake=0;accumulator=0;lastState='';sync();}
function begin(){clear();start(game);lastState='';sync();$('#battlefield').focus({preventScroll:true});}
function stop(){clear();pause(game);lastState='';sync();}
function sync(){
 const state=game.state;$('#pause').disabled=!['playing','paused'].includes(state);$('#overlay').hidden=state==='playing';$('#pause').textContent=state==='paused'?'继续 P':'暂停 P';
 if(state!==lastState){
  document.body.dataset.state=state;
  if(state==='won'){const key=`${game.index}-${game.mode}`;progress.best[key]=Math.max(progress.best[key]||0,game.score);save();}
  const title={ready:game.level.name,paused:'火线已暂停',won:'信标守住了',lost:'防线失守'};
  $('#result-title').textContent=title[state]||'';$('#state-label').textContent=({ready:'READY / 待命',paused:'PAUSED / 暂停',won:'SECURED / 行动完成',lost:'SIGNAL LOST / 行动失败'})[state]||'';
  $('#result-copy').textContent=state==='lost'?game.resultReason:state==='won'?`${game.kills} 台来敌已清除 · ${Math.round(game.time)} 秒 · ${game.score} 分。可重试本关或选择另一行动。`:state==='paused'?'恢复后继续当前战斗。刷新页面会回到整备。':`${game.level.description} ${game.mode===2?'双车独立操作，共享基地。':'仅部署 1P，没有 AI 队友。'}`;
  $('#primary').textContent=state==='ready'?'开始行动':state==='paused'?'继续战斗':'再次出击';
  $('#status').textContent=state==='playing'?`${game.level.name} · 保护信标，清除六台来敌。`:$('#result-title').textContent;
  lastState=state;
 }
 $('#base').textContent=Array.from({length:3},(_,i)=>i<game.base.hp?'◆':'◇').join(' ');
 game.players.forEach((p,i)=>{$(`#p${i+1}`).textContent=p.dead?'已退出':Array.from({length:3},(_,n)=>n<p.lives?'●':'○').join(' ');$(`#power${i+1}`).textContent=p.dead?'队友仍可继续':p.rapid>0?`速射 ${Math.ceil(p.rapid)}s`:p.shield>0?`护盾 ${Math.ceil(p.shield)}s`:'标准装甲';});
 if(game.mode===1){$('#p2').textContent='未加入';$('#power2').textContent='选择同键双人加入';}
 $('#wave').textContent=`${game.kills} / ${game.level.queue.length}`;$('#score').textContent=`得分 ${game.score} · 本编组最佳 ${progress.best[`${game.index}-${game.mode}`]||0}`;
 $('#clock').textContent=`${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;$('#tip').textContent=game.level.tip;
}
$('#primary').onclick=()=>{if(['won','lost'].includes(game.state))prepare();begin();};$('#retry').onclick=prepare;$('#prepare').onclick=prepare;$('#pause').onclick=()=>{if(game.state==='paused')begin();else if(game.state==='playing')stop();};
window.addEventListener('keydown',event=>{if(event.target.matches('select,input,textarea'))return;if(['KeyP','Escape'].includes(event.code)){event.preventDefault();if(!event.repeat)$('#pause').click();return;}if(event.target.matches('button'))return;if(PLAY_KEYS.includes(event.code))event.preventDefault();if(event.code==='Enter'&&startEnterHeld)return;if(event.code==='Enter'&&game.state!=='playing'){if(!event.repeat){if(['won','lost'].includes(game.state))prepare();begin();startEnterHeld=true;}return;}if(game.state==='playing'&&PLAY_KEYS.includes(event.code))controls.press(event.code);});
window.addEventListener('keyup',event=>{if(event.code==='Enter')startEnterHeld=false;controls.release(event.code);});window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',event=>{event.preventDefault();if(game.state!=='playing')return;button.setPointerCapture(event.pointerId);controls.press(button.dataset.key);});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>controls.release(button.dataset.key));}
function frame(now){const dt=Math.min((now-previous)/1000,.1);previous=now;if(game.state==='playing'){accumulator+=dt;while(accumulator>=1/60){update(game,controls.read(),1/60);accumulator-=1/60;}}else accumulator=0;renderer.effects(game.events.splice(0));renderer.draw(game,dt);sync();requestAnimationFrame(frame);}
window.__fortress={snapshot:()=>snapshot(game)};save();sync();requestAnimationFrame(frame);
