import {createGame,start,pause,update,snapshot} from './engine.mjs';
import {LEVELS} from './levels.mjs';
import {Renderer} from './renderer.mjs';
const $=s=>document.querySelector(s),KEY='classic-atlas.ember.v1';
let storageAvailable=true;
function read(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}'),unlocked=Math.max(1,Math.min(10,Number.isInteger(raw.unlocked)?raw.unlocked:1)),best={};for(let i=1;i<=10;i++){const b=raw.best?.[i];if(b&&Number.isFinite(b.score)&&Number.isFinite(b.time))best[i]={score:Math.max(0,Math.floor(b.score)),time:Math.max(0,b.time),stars:Math.max(1,Math.min(3,Math.floor(b.stars)||1))};}return {unlocked,last:Math.max(1,Math.min(unlocked,Number.isInteger(raw.last)?raw.last:1)),sound:raw.sound!==false,tutorialSeen:!!raw.tutorialSeen,best};}catch{storageAvailable=false;return {unlocked:1,last:1,sound:true,tutorialSeen:false,best:{}};}}
const progress=read();let game=createGame(progress.last-1),primaryAction,secondaryAction,helpStarts=false,resumeAfterDialog=false,audio=null,lastState='',hudTime=0;
const renderer=new Renderer($('#battlefield')),keys=new Map(),touch=new Map();let sequence=0,bombQueued=false,directionQueued=null;
let last=performance.now(),accumulator=0;const frames=[],renderTimes=[];
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{storageAvailable=false;}$('#save-note').textContent=storageAvailable?'进度仅保存在本浏览器。':'浏览器存储不可用，本次仍可游玩，进度无法持久保存。';}
function unlockAudio(){if(!progress.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{/* Audio is optional. */}}
function tone(freq,duration=.12,type='triangle',delay=0){if(!progress.sound||!audio||audio.state!=='running')return;const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.55),t+duration);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.045,t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();v.disconnect();};}
function sound(e){if(e.type==='plant')tone(290,.06,'square');if(e.type==='explode')tone(100,.28,'sawtooth');if(e.type==='chain')tone(180,.16,'square');if(e.type==='power'){tone(520,.12);tone(780,.18,'triangle',.1);}if(e.type==='hurt')tone(145,.22,'sawtooth');if(e.type==='win')for(let i=0;i<4;i++)tone([440,550,660,880][i],.22,'triangle',i*.13);if(e.type==='lose'){tone(180,.3,'sawtooth');tone(85,.4,'triangle',.2);}}
function clearInput(){keys.clear();touch.clear();bombQueued=false;directionQueued=null;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function announce(text){$('#battle-status').textContent=text;}
function overlay(title,copy,summary,label,action,secondaryLabel='选择关卡',second=openLevels){$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#overlay-summary').textContent=summary;$('#primary-action').innerHTML=`${label} <span>↗</span>`;$('#secondary-action').textContent=secondaryLabel;primaryAction=action;secondaryAction=second;$('#overlay').hidden=false;}
function load(index){clearInput();game=createGame(index);progress.last=game.level;save();lastState='';updateHud();syncState();renderer.draw(game);}
function begin(){unlockAudio();if(!progress.tutorialSeen){helpStarts=true;openHelp();return;}start(game);clearInput();syncState();$('#battlefield').focus({preventScroll:true});}
function resume(){if(game.state==='paused')pause(game);clearInput();syncState();$('#battlefield').focus({preventScroll:true});}
function togglePause(){if(!['playing','paused'].includes(game.state))return;clearInput();pause(game);syncState();}
function syncState(){
 if(lastState===game.state)return;lastState=game.state;
 const l=LEVELS[game.level-1];$('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').innerHTML=game.state==='paused'?'继续 <kbd>P</kbd>':'暂停 <kbd>P</kbd>';
 if(game.state==='playing'){$('#overlay').hidden=true;announce('2.4 秒倒计时 · 炸弹挡路 · 转过拐角避开十字爆风。');return;}
 clearInput();$('#overlay-eyebrow').textContent=`SECTOR ${String(game.level).padStart(2,'0')} / 10`;
 if(game.state==='ready')overlay(l.name,l.tip,`${l.enemies.length} 台巡逻机 · 三格护甲 · 清空目标后前往右下角出口`,'开始行动',begin);
 if(game.state==='paused')overlay('引线暂停','场上倒计时与巡逻机都已暂停。准备好后继续。',`已行动 ${Math.floor(game.time)} 秒 · 剩余 ${game.enemies.length} 台`,'继续行动',resume,'重新开始',()=>load(game.level-1));
 if(game.state==='lost'){overlay('再留一条退路',game.reason,`击破 ${game.stats.kills}/${l.enemies.length} · 放置 ${game.stats.planted} 枚 · 得分 ${game.stats.score}`,'重新挑战',()=>{load(game.level-1);begin();});announce(game.reason);}
 if(game.state==='won'){
  const stars=game.stats.hits===0&&game.time<=l.par?3:game.stats.hits<=1?2:1,old=progress.best[game.level];
  if(!old||game.stats.score>old.score)progress.best[game.level]={score:game.stats.score,time:game.time,stars};
  progress.unlocked=Math.max(progress.unlocked,Math.min(10,game.level+1));save();
  overlay(game.level===10?'十道门，都已点亮':'这一道门，已开启',game.level===10?'十关行动完成。你可以回到关卡地图，挑战更少受伤与更高得分。':'下一处迷宫已经解锁。本关强化会归零，新的退路等你发现。',`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · ${game.stats.score} 分 · ${game.time.toFixed(1)} 秒 · 连锁 ${game.stats.chains} 次`,game.level===10?'再挑战本关':'前往下一关',()=>{load(game.level===10?9:game.level);begin();});announce('通关成功，纪录已保存在本浏览器。');
 }
}
function updateHud(){
 const l=LEVELS[game.level-1],p=game.player,n=game.enemies.length;
 $('#mission-number').textContent=`${String(game.level).padStart(2,'0')} / 10`;$('#mission-name').textContent=l.name;$('#mission-tip').textContent=l.tip;
 $('#score').textContent=String(game.stats.score).padStart(6,'0');$('#best-score').textContent=progress.best[game.level]?.score??'—';$('#health').textContent='● '.repeat(p.hp)+'○ '.repeat(3-p.hp);$('#health').setAttribute('aria-label',`护甲剩余${p.hp}格`);$('#remaining').textContent=`${n} 台`;
 $('#capacity').textContent=`${game.bombs.length} / ${p.capacity}`;$('#range').textContent=`${p.range} 格`;$('#speed').textContent=p.step<.16?'高速':p.step<.21?'加速':'标准';$('#exit-state').textContent=n?'锁定':'已开启';$('#elapsed').textContent=`行动时间 ${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;
 $('#hp-mobile').textContent=p.hp;$('#foes-mobile').textContent=n;$('#bomb-mobile').textContent=`${game.bombs.length}/${p.capacity}`;$('#exit-mobile').textContent=n?'锁定':'开启';
}
function suspendForDialog(){resumeAfterDialog=game.state==='playing';if(resumeAfterDialog){clearInput();pause(game);syncState();}}
function openHelp(){suspendForDialog();$('#help-dialog').showModal();}
function closeHelp(confirmed){$('#help-dialog').close();if(confirmed){progress.tutorialSeen=true;save();}if(helpStarts){helpStarts=false;if(confirmed)begin();}else if(resumeAfterDialog)resume();resumeAfterDialog=false;}
function openLevels(){suspendForDialog();$('#level-list').innerHTML=LEVELS.map(l=>`<button class="level-button ${l.id===game.level?'current':''}" data-level="${l.id}" type="button" ${l.id>progress.unlocked?'disabled':''}><span>${String(l.id).padStart(2,'0')}</span><strong>${l.name}</strong><small>${l.id>progress.unlocked?'未解锁':progress.best[l.id]?'★'.repeat(progress.best[l.id].stars):'可挑战'}</small></button>`).join('');$('#levels-dialog').showModal();}
function closeLevels(){ $('#levels-dialog').close();if(resumeAfterDialog)resume();resumeAfterDialog=false;}
$('#primary-action').onclick=()=>primaryAction?.();$('#secondary-action').onclick=()=>secondaryAction?.();$('#pause').onclick=togglePause;$('#restart').onclick=()=>load(game.level-1);$('#levels').onclick=openLevels;$('#help').onclick=openHelp;
$('#help-confirm').onclick=()=>closeHelp(true);$('#help-close').onclick=()=>closeHelp(false);$('#help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp(false);});$('#levels-close').onclick=closeLevels;$('#levels-dialog').addEventListener('cancel',e=>{e.preventDefault();closeLevels();});
$('#level-list').onclick=e=>{const b=e.target.closest('[data-level]');if(!b||b.disabled)return;$('#levels-dialog').close();resumeAfterDialog=false;load(Number(b.dataset.level)-1);};
$('#sound').onclick=()=>{progress.sound=!progress.sound;$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));if(progress.sound){unlockAudio();tone(520);}save();};
const directions={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||e.target.matches('input,textarea,select'))return;
 if(e.code in directions){e.preventDefault();if(!keys.has(e.code)){keys.set(e.code,{direction:directions[e.code],order:++sequence});directionQueued=directions[e.code];}}
 if(['Space','KeyJ'].includes(e.code)&&e.target.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat&&game.state==='playing'){unlockAudio();bombQueued=true;}}
 if(!e.repeat&&['KeyP','Escape'].includes(e.code)){e.preventDefault();togglePause();}
 if(!e.repeat&&e.code==='KeyR'){e.preventDefault();load(game.level-1);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const b of document.querySelectorAll('[data-direction]')){
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,{direction:Number(b.dataset.direction),order:++sequence});directionQueued=Number(b.dataset.direction);b.classList.add('pressed');unlockAudio();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>{touch.delete(e.pointerId);b.classList.remove('pressed');});
}
$('#touch-bomb').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.classList.add('pressed');if(game.state==='playing'){unlockAudio();bombQueued=true;}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('#touch-bomb').addEventListener(name,e=>e.currentTarget.classList.remove('pressed'));
function autoPause(){clearInput();if(game.state==='playing'){pause(game);syncState();}}
window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function frame(now){
 const delta=Math.min(.1,Math.max(0,(now-last)/1000));last=now;if(delta>0){frames.push(delta);if(frames.length>120)frames.shift();}
 accumulator+=delta;while(accumulator>=1/60){const active=[...keys.values(),...touch.values()].sort((a,b)=>b.order-a.order)[0];const consumeDirection=game.player.cooldown<=1/60;update(game,1/60,{direction:active?.direction??directionQueued,bomb:bombQueued});if(consumeDirection)directionQueued=null;bombQueued=false;accumulator-=1/60;}
 for(const e of game.events.splice(0)){sound(e);if(e.type==='power')announce(`获得${{capacity:'容量',range:'范围',speed:'加速'}[e.power]}模块。强化仅在本关生效。`);if(e.type==='chain')announce('连锁引爆！留意第二段火线。');if(e.type==='enemy'&&!game.enemies.length)announce('巡逻机已清空！前往右下角的绿色出口。');}
 const t=performance.now();renderer.draw(game,now/1000);renderTimes.push(performance.now()-t);if(renderTimes.length>120)renderTimes.shift();
 syncState();if(now-hudTime>90){updateHud();hudTime=now;}requestAnimationFrame(frame);
}
// A copied, read-only observation surface for diagnostics. No gameplay mutation API.
export function diagnostics(){return {...snapshot(game),unlocked:progress.unlocked,storageAvailable,sound:progress.sound,fps:frames.length/(frames.reduce((a,b)=>a+b,0)||1),meanRenderMs:renderTimes.reduce((a,b)=>a+b,0)/(renderTimes.length||1)};}
$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));save();updateHud();syncState();requestAnimationFrame(frame);
