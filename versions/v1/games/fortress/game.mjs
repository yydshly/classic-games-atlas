import { createGame, pause, snapshot, start, update } from './engine.mjs';
import { LEVELS } from './levels.mjs';
import { Renderer } from './renderer.mjs';

const $=selector=>document.querySelector(selector);
const KEY='classic-atlas.fortress.v1';
let storageAvailable=true;
function readProgress(){
  try {
    const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
    const unlocked=Math.max(1,Math.min(10,Number.isInteger(raw.unlocked)?raw.unlocked:1));
    const best={};
    for(let id=1;id<=10;id++){const record=raw.best?.[id];if(record&&Number.isFinite(record.score)&&Number.isInteger(record.stars))best[id]={score:Math.max(0,Math.floor(record.score)),stars:Math.max(1,Math.min(3,record.stars))};}
    return {unlocked,last:Math.max(1,Math.min(unlocked,Number.isInteger(raw.last)?raw.last:1)),best,tutorialSeen:!!raw.tutorialSeen,sound:raw.sound!==false};
  } catch {storageAvailable=false;return {unlocked:1,last:1,best:{},tutorialSeen:false,sound:true};}
}
const progress=readProgress();
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{storageAvailable=false;}$('#save-note').textContent=storageAvailable?'进度仅保存在本浏览器。':'浏览器存储不可用，本次进度无法持久保存。';}
let game=createGame(progress.last-1);
const renderer=new Renderer($('#battlefield'));
const keys=new Map(),touchDirections=new Map(),touchShots=new Set();
let order=0,primaryAction,secondaryAction,lastState='',lastHud=0,audioContext=null;
let previousTime=performance.now(),accumulator=0;
const frameTimes=[],renderTimes=[];

function audioUnlock(){
  if(!progress.sound)return;
  try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{/* Sound remains optional if the browser cannot initialize audio. */}
}
function tone(frequency,duration=.12,kind='triangle',volume=.035,delay=0){
  if(!progress.sound||!audioContext||audioContext.state!=='running')return;
  const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),time=audioContext.currentTime+delay;
  oscillator.type=kind;oscillator.frequency.setValueAtTime(frequency,time);oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*.5),time+duration);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.007);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(time);oscillator.stop(time+duration+.02);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
function sound(event){
  if(event.type==='fire'&&!event.enemy)tone(240,.06,'square',.018);
  if(event.type==='brick'||event.type==='hit')tone(125,.05,'sawtooth',.018);
  if(['explosion','base-hit','player-hit'].includes(event.type))tone(90,.3,'sawtooth',.055);
  if(event.type==='power'){tone(560,.15,'triangle',.06);tone(840,.2,'triangle',.04,.1);}
  if(event.type==='win')for(let i=0;i<4;i++)tone([440,554,660,880][i],.25,'triangle',.06,i*.15);
  if(event.type==='lose'){tone(180,.4,'sawtooth',.04);tone(90,.5,'triangle',.04,.25);}
}
function clearInput(){keys.clear();touchDirections.clear();touchShots.clear();document.querySelectorAll('.pressed').forEach(button=>button.classList.remove('pressed'));}
function announce(text){$('#battle-status').textContent=text;}
function showOverlay(title,copy,summary,primary,secondary){
  $('#overlay').hidden=false;$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#overlay-summary').textContent=summary;
  $('#overlay-eyebrow').textContent=game.state==='won'?'BEACON SECURED':game.state==='lost'?'SIGNAL LOST':game.state==='paused'?'OPERATIONS PAUSED':`OPERATION ${String(game.level.id).padStart(2,'0')}`;
  $('#primary-action').innerHTML=`${primary.label} <span>↗</span>`;primaryAction=primary.action;
  $('#secondary-action').textContent=secondary.label;secondaryAction=secondary.action;
}
function begin(){audioUnlock();start(game);clearInput();$('#overlay').hidden=true;$('#battlefield').focus({preventScroll:true});lastState='';announce('行动开始。保护底部信标，清除全部来敌。');}
function prepare(index){
  clearInput();game=createGame(index);renderer.particles=[];renderer.rings=[];renderer.shake=0;lastState='';accumulator=0;progress.last=index+1;save();syncState();refreshHud();
}
function requestStart(){if(!progress.tutorialSeen){$('#help-confirm').textContent='开始本关防守 ↗';$('#help-dialog').showModal();}else begin();}
function togglePause(){
  if($('#help-dialog').open||$('#levels-dialog').open)return;
  if(game.state==='playing'){pause(game);clearInput();syncState();$('#primary-action').focus({preventScroll:true});announce('已暂停，战场时间停止。');}
  else if(game.state==='paused')begin();
}
function openLevels(){
  if(game.state==='playing'){pause(game);clearInput();syncState();}
  $('#level-list').innerHTML=LEVELS.map(level=>{
    const record=progress.best[level.id],locked=level.id>progress.unlocked;
    return `<button type="button" data-level="${level.id}" ${locked?'disabled class="locked"':''}><span class="level-number">${String(level.id).padStart(2,'0')}</span><span><b>${level.name}</b><small>${locked?'尚未解锁':record?'★'.repeat(record.stars)+' · '+record.score:'已解锁 · 待守卫'}</small></span></button>`;
  }).join('');$('#levels-dialog').showModal();
}
function syncState(){
  if(lastState===game.state)return;lastState=game.state;
  $('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').innerHTML=game.state==='paused'?'恢复 <kbd>P</kbd>':'暂停 <kbd>P</kbd>';
  if(game.state==='playing'){$('#overlay').hidden=true;return;}
  clearInput();
  if(game.state==='ready')showOverlay(game.level.name,game.level.description,`${game.level.queue.length} 个目标 · 基地耐久 3 · 出击 3 次`,{label:'开始防守',action:requestStart},{label:'选择关卡',action:openLevels});
  if(game.state==='paused')showOverlay('稍作整备。','战场已暂停。恢复后继续保护信标。',game.level.tip,{label:'继续防守',action:begin},{label:'重新开始本关',action:()=>prepare(game.index)});
  if(game.state==='lost'){
    showOverlay('防线失守',game.resultReason,`清除 ${game.kills} / ${game.level.queue.length} · 得分 ${game.score}`,{label:'再次防守',action:()=>{prepare(game.index);begin();}},{label:'查看关卡地图',action:openLevels});
    $('#primary-action').focus({preventScroll:true});announce('防线失守。'+game.resultReason);
  }
  if(game.state==='won'){
    const stars=game.base.hp===3&&game.lives===3?3:game.base.hp>=2&&game.lives>=2?2:1;
    const old=progress.best[game.level.id];progress.best[game.level.id]={score:Math.max(old?.score||0,game.score),stars:Math.max(old?.stars||0,stars)};
    progress.unlocked=Math.max(progress.unlocked,Math.min(10,game.level.id+1));progress.last=Math.min(10,game.level.id+1);save();
    showOverlay(game.level.id===10?'十座信标，全部点亮。':'这一道防线，守住了。',game.level.id===10?'全部十关完成。你可以回到关卡地图，继续挑战更好的防守记录。':'清除全部来敌，下一座哨站已解锁。',`${'★'.repeat(stars)} · 得分 ${game.score} · ${Math.floor(game.time)} 秒`,{label:game.level.id===10?'再战最后一关':'进入下一关',action:()=>{prepare(Math.min(9,game.index+1));requestStart();}},{label:'返回关卡地图',action:openLevels});
    $('#primary-action').focus({preventScroll:true});announce(game.level.id===10?'全部十关完成。':'防守成功，下一关已解锁。');
  }
}
function refreshHud(){
  const left=game.level.queue.length-game.kills;
  $('#mission-number').textContent=`${String(game.level.id).padStart(2,'0')} / 10`;$('#mission-name').textContent=game.level.name;$('#mission-tip').textContent=game.level.tip;
  $('#score').textContent=String(game.score).padStart(6,'0');$('#score-mobile').textContent=game.score;$('#best-score').textContent=progress.best[game.level.id]?.score??'—';
  $('#base-health').textContent='▰ '.repeat(game.base.hp)+'▱ '.repeat(3-game.base.hp);$('#base-health').setAttribute('aria-label',`基地耐久${game.base.hp}`);$('#base-mobile').textContent='▰'.repeat(game.base.hp)+'▱'.repeat(3-game.base.hp);
  $('#lives').innerHTML=`${game.lives} <small>辆</small>`;$('#lives-mobile').textContent=game.lives;$('#remaining-mobile').textContent=left;$('#destroyed').textContent=game.kills;$('#enemy-total').textContent=game.level.queue.length;
  $('#wave-dots').innerHTML=game.level.queue.map((_,index)=>`<i class="${index<game.kills?'cleared':index<game.spawned?'active':''}"></i>`).join('');
  const seconds=Math.floor(game.time);$('#elapsed').textContent=`行动时间 ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const buffs=[];if(game.player.shield>0)buffs.push(`◇ 护盾 ${Math.ceil(game.player.shield)}s`);if(game.player.rapid>0)buffs.push(`ϟ 速射 ${Math.ceil(game.player.rapid)}s`);$('#buffs').innerHTML=buffs.length?buffs.map(text=>`<b>${text}</b>`).join(''):'<span>暂无持续强化</span>';
}
const directionKeys={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};
document.addEventListener('keydown',event=>{
  if($('#help-dialog').open||$('#levels-dialog').open)return;
  if(['KeyP','Escape'].includes(event.code)&&!event.repeat){event.preventDefault();togglePause();return;}
  if(event.code==='KeyR'&&!event.repeat){event.preventDefault();prepare(game.index);return;}
  if(game.state!=='playing')return;
  if(event.code in directionKeys||['Space','KeyJ'].includes(event.code)){event.preventDefault();if(!keys.has(event.code))keys.set(event.code,++order);}
});
document.addEventListener('keyup',event=>{keys.delete(event.code);});
function input(){
  const directions=[...keys].filter(([key])=>key in directionKeys).map(([key,priority])=>({dir:directionKeys[key],priority}));
  for(const value of touchDirections.values())directions.push(value);
  directions.sort((a,b)=>b.priority-a.priority);
  return {dir:directions[0]?.dir??null,fire:keys.has('Space')||keys.has('KeyJ')||touchShots.size>0};
}
for(const button of document.querySelectorAll('[data-direction],#touch-fire')){
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();audioUnlock();button.setPointerCapture(event.pointerId);button.classList.add('pressed');
    if(button.id==='touch-fire')touchShots.add(event.pointerId);else touchDirections.set(event.pointerId,{dir:Number(button.dataset.direction),priority:++order});
  });
  const release=event=>{touchShots.delete(event.pointerId);touchDirections.delete(event.pointerId);button.classList.remove('pressed');};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('contextmenu',event=>event.preventDefault());
}
$('#primary-action').addEventListener('click',()=>primaryAction?.());$('#secondary-action').addEventListener('click',()=>secondaryAction?.());
$('#pause').addEventListener('click',togglePause);$('#restart').addEventListener('click',()=>prepare(game.index));$('#levels').addEventListener('click',openLevels);
$('#sound').addEventListener('click',()=>{progress.sound=!progress.sound;$('#sound').setAttribute('aria-pressed',String(progress.sound));$('#sound').textContent=`声音：${progress.sound?'开':'关'}`;save();audioUnlock();if(progress.sound)tone(660,.1);});
$('#help').addEventListener('click',()=>{if(game.state==='playing'){pause(game);clearInput();syncState();}$('#help-confirm').textContent=game.state==='paused'?'明白了，继续防守 ↗':'我准备好了，开始防守 ↗';$('#help-dialog').showModal();});
$('#help-confirm').addEventListener('click',()=>{progress.tutorialSeen=true;save();$('#help-dialog').close();begin();});$('#help-close').addEventListener('click',()=>$('#help-dialog').close());
$('#levels-close').addEventListener('click',()=>$('#levels-dialog').close());$('#level-list').addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(!button||button.disabled)return;$('#levels-dialog').close();prepare(Number(button.dataset.level)-1);});
function backgroundPause(){clearInput();if(game.state==='playing'){pause(game);syncState();announce('页面已切出，战斗自动暂停。');}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundPause();});window.addEventListener('blur',backgroundPause);
$('#battlefield').addEventListener('pointerdown',()=>$('#battlefield').focus({preventScroll:true}));

function frame(now){
  const raw=now-previousTime,delta=Math.min(.1,Math.max(0,raw/1000));previousTime=now;
  if(game.state==='playing'&&raw<150){frameTimes.push(raw);if(frameTimes.length>240)frameTimes.shift();}
  accumulator+=delta;
  while(accumulator>=1/60){update(game,input(),1/60);accumulator-=1/60;}
  const events=game.events.splice(0);renderer.effects(events);
  for(const event of events){
    sound(event);
    if(event.type==='power')announce(({repair:'维修完成：基地与出击各恢复一格。',rapid:'速射模组启动，持续十秒。',shield:'战车与基地护盾启动，持续八秒。'})[event.powerType]);
    if(event.type==='base-hit')announce(`基地受到攻击，剩余耐久 ${game.base.hp}。`);
    if(event.type==='player-hit')announce(`战车受击，剩余出击 ${game.lives} 次。`);
  }
  syncState();if(now-lastHud>100){refreshHud();lastHud=now;}
  const drawStart=performance.now();renderer.draw(game,delta);renderTimes.push(performance.now()-drawStart);if(renderTimes.length>240)renderTimes.shift();
  requestAnimationFrame(frame);
}
// Read-only diagnostics for repeatable tests; no production state mutation hooks.
export function diagnostics(){return {...snapshot(game),unlocked:progress.unlocked,storageAvailable,fps:frameTimes.length?1000/(frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length):0,meanRenderMs:renderTimes.length?renderTimes.reduce((a,b)=>a+b,0)/renderTimes.length:0};}
$('#sound').setAttribute('aria-pressed',String(progress.sound));$('#sound').textContent=`声音：${progress.sound?'开':'关'}`;save();syncState();refreshHud();requestAnimationFrame(frame);
