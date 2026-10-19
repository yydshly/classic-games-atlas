import{TYPES,STEP,gravity,speedLevel,DURATION_TICKS}from'./levels.mjs';
import{createGame,input,advance,pause,restore,checkpoint,snapshot}from'./engine.mjs';
import{createRenderer}from'./renderer.mjs';
import{createControls}from'./controls.mjs';
import{readProgress,writeProgress,record}from'./storage.mjs';
const $=s=>document.querySelector(s);
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw new DOMException('Unavailable','SecurityError');},setItem(){throw new Error('Unavailable');}};}
const saved=readProgress(storage,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false);
const progress=saved.progress;
let available=saved.available,game=restore(progress.resume),badResume=Boolean(progress.resume&&!game);
game??=createGame();
let last=performance.now(),lastSave=game.ticks,lastHud=0,settled=false,audio=null,feedback='给下一枚留一点空间。',feedbackLocks=game.stats.locked,newRecord=false;
const canvas=$('#field'),renderer=createRenderer(canvas,$('#preview'));
function persist(){available=writeProgress(storage,progress)&&available;}
function remember(){progress.resume=checkpoint(game);lastSave=game.ticks;persist();}
function tone(f=500){
 if(!progress.sound)return;
 try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.frequency.value=f;v.gain.setValueAtTime(.025,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+.1);}catch{}
}
function send(kind){
 const before=game.stats.locked;
 const ok=input(game,{kind,piece:game.active?.id});
 if(!ok)return false;
 if(game.stats.locked!==before)observe();
 return true;
}
const controls=createControls({getGame:()=>game,send});
const pointers=new Map();
function release(){
 controls.clear();
 for(const[id,b]of pointers){pointers.delete(id);try{if(b.hasPointerCapture(id))b.releasePointerCapture(id);}catch{}controls.end(b.id,'pointer:'+id);}
}
function observe(){
 if(game.stats.locked!==feedbackLocks){
  feedbackLocks=game.stats.locked;release();
  const c=game.lastClear,n=c?.rows.length||0;
  feedback=n?`消除 ${n} 行${c.combo>1?' · 连消 '+c.combo+' 次':''}${c.perfect?' · 全空 +150':''}${c.speedUp?' · 提速至 '+c.level+' 档':''}`:'星块已落定，看三枚预览，保留井口。';
  $('#feedback').textContent=feedback;tone(n?700:280);
 }
 if(['won','lost'].includes(game.state)&&!settled){
  settled=true;release();newRecord=record(progress,game);progress.resume=null;persist();tone(game.state==='won'?850:170);
 }
}
function hud(){
 observe();const remaining=Math.max(0,DURATION_TICKS-game.ticks)/120,seconds=Math.ceil(remaining),level=speedLevel(game);
 $('#time').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 $('#time-bar').style.width=remaining/180*100+'%';document.body.classList.toggle('urgent',remaining<=30);
 $('#score').textContent=game.score.toLocaleString('zh-CN');$('#lines').textContent=game.lines;$('#combo').textContent=game.stats.maxCombo;
 $('#speed-label').textContent=`速度 ${level} / 7`;$('#gravity').textContent=gravity(game).toFixed(2)+'秒 / 格';
 $('#next-speed').textContent=level===7?'已达最高速度，保持井口畅通':`再消 ${8-game.lines%8} 行提速`;
 for(const[i,b]of [...$('#speed-track').children].entries())b.classList.toggle('on',i<level);
 $('#best-score').textContent=progress.best?progress.best.score.toLocaleString('zh-CN'):'—';
 $('#best-detail').textContent=progress.best?`${progress.best.lines} 行 · 最大连消 ${progress.best.combo} 次`:'完成一轮即可留下成绩';
 $('#record-gap').textContent=progress.best?(game.score>progress.best.score?'已超过个人最好，保持节奏。':`距个人最好还差 ${Math.max(0,progress.best.score-game.score+1)} 分`):'从一行开始，留下新纪录。';
 $('#preview-text').textContent='接下来：'+game.queue.slice(game.nextIndex,game.nextIndex+3).map(t=>TYPES[t].name).join('、');
 $('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').textContent=game.state==='paused'?'继续 P':'暂停 P';
 for(const kind of['left','right','cw','ccw','soft','hard'])$('#'+kind).disabled=game.state!=='playing';
 $('#sound').textContent='声音：'+(progress.sound?'开':'关');$('#sound').setAttribute('aria-pressed',String(progress.sound));
 $('#motion').textContent='减弱动态：'+(progress.reduced?'开':'关');$('#motion').setAttribute('aria-pressed',String(progress.reduced));document.body.dataset.reduced=String(progress.reduced);
 $('#storage-note').hidden=available;$('#save-note').hidden=!(saved.invalid||badResume);
 const state=game.state;$('#panel').hidden=state==='playing';$('#restore-note').hidden=!(state==='paused'&&progress.resume);
 if(state==='ready'){
  $('#panel-kicker').textContent='THREE MINUTES. MAKE SPACE.';$('#panel-title').innerHTML='留住井口<br>点亮整行';$('#panel-copy').textContent='空板开局，填满横行得分。每消8行略微提速，最高7档。';$('#summary').textContent='';$('#primary').textContent='开始 180 秒 →';
 }else if(state==='paused'){
  $('#panel-kicker').textContent='TAKE YOUR TIME';$('#panel-title').textContent='已暂停';$('#panel-copy').textContent='棋盘与计时都已停住。准备好后继续。';$('#summary').textContent=`当前 ${game.score} 分 · ${game.lines} 行`;$('#primary').textContent='继续这一轮 →';
 }else if(['won','lost'].includes(state)){
  $('#panel-kicker').textContent=newRecord?'A NEW PERSONAL BEST':'ONE MORE ORBIT';
  $('#panel-title').textContent=state==='won'?'180秒，收下星光':'井口满了，再来一轮';
  $('#panel-copy').textContent=(newRecord?'新个人纪录！':'')+game.reason;
  $('#summary').textContent=`${game.score} 分 · ${game.lines} 行\n最大连消 ${game.stats.maxCombo} 次 · 最好 ${progress.best?.score||0} 分`;$('#primary').textContent='再来 180 秒 →';
 }
}
function start(){
 release();if(input(game,{kind:'start'})){last=performance.now();remember();feedback='重力已开始。看落点，给下一枚留空间。';$('#feedback').textContent=feedback;canvas.focus({preventScroll:true});}hud();
}
function restart(){
 release();game=createGame();settled=false;newRecord=false;feedbackLocks=0;lastSave=0;badResume=false;
 $('#restore-note').hidden=true;start();
}
function toggle(){
 if(!['playing','paused'].includes(game.state))return;
 release();pause(game);last=performance.now();remember();hud();if(game.state==='playing')canvas.focus({preventScroll:true});
}
function stop(){
 release();if(game.state==='playing')pause(game);last=performance.now();remember();hud();
}
$('#primary').addEventListener('click',()=>game.state==='ready'?start():game.state==='paused'?toggle():restart());
$('#pause').addEventListener('click',toggle);$('#retry').addEventListener('click',restart);
$('#sound').addEventListener('click',()=>{progress.sound=!progress.sound;persist();tone();hud();});
$('#motion').addEventListener('click',()=>{progress.reduced=!progress.reduced;persist();hud();});
$('#help').addEventListener('click',()=>{stop();$('#help-dialog').showModal();});
$('#help-close').addEventListener('click',()=>{$('#help-dialog').close();canvas.focus({preventScroll:true});});
$('#help-dialog').addEventListener('cancel',e=>{e.preventDefault();$('#help-dialog').close();canvas.focus({preventScroll:true});});
for(const kind of['left','right','soft']){
 const b=$('#'+kind);
 b.addEventListener('pointerdown',e=>{
  if(e.button!==0||game.state!=='playing')return;e.preventDefault();
  pointers.set(e.pointerId,b);try{b.setPointerCapture(e.pointerId);}catch{}
  controls.begin(kind,'pointer:'+e.pointerId);
 });
 const end=e=>{if(pointers.get(e.pointerId)!==b)return;pointers.delete(e.pointerId);controls.end(kind,'pointer:'+e.pointerId);try{if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);}catch{}};
 b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);
 b.addEventListener('click',e=>{if(e.detail===0){controls.begin(kind,'accessible:'+kind);controls.end(kind,'accessible:'+kind);}});
}
for(const kind of['cw','ccw','hard'])$('#'+kind).addEventListener('click',()=>{send(kind);hud();if(kind==='hard')remember();});
const actions={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowdown:'soft',s:'soft',arrowup:'cw',x:'cw',z:'ccw',' ':'hard'};
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,select,textarea')||$('#help-dialog').open)return;
 const key=e.key.toLowerCase();if(!actions[key]&&!['p','escape','r'].includes(key))return;
 if(e.target.closest('button')&&key===' ')return;e.preventDefault();if(e.repeat)return;
 if(key==='r'){restart();return;}if(key==='p'||key==='escape'){toggle();return;}
 controls.begin(actions[key],'key:'+key);hud();
});
document.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(actions[key])controls.end(actions[key],'key:'+key);});
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
for(let i=0;i<7;i++)$('#speed-track').append(document.createElement('i'));
function frame(now){
 const dt=(now-last)/1000;last=now;
 // A long foreground interruption explicitly pauses instead of silently granting extra time.
 if(dt>1&&game.state==='playing'){stop();$('#feedback').textContent='检测到较长中断，已暂停。准备好后继续。';}
 else advance(game,dt,controls.repeat);
 observe();if(now-lastHud>=80){hud();lastHud=now;}
 if(game.state==='playing'&&game.ticks-lastSave>=240)remember();
 renderer.draw(game,progress.reduced);requestAnimationFrame(frame);
}
export const diagnostics=()=>({...snapshot(game),best:progress.best?{...progress.best}:null,storageAvailable:available,held:[...controls.held.keys()],blocked:[...controls.blocked],reduced:progress.reduced,settled});
Object.defineProperty(window,'__orbitV2',{value:Object.freeze({snapshot:diagnostics}),writable:false});
hud();renderer.draw(game,progress.reduced);requestAnimationFrame(frame);
