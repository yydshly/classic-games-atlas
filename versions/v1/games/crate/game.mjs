import {LEVELS} from './levels.mjs';
import {createGame,start,pause,move,undo,update,actions,restoreActions,snapshot,satisfied,cornerBoxes} from './engine.mjs';
import {Renderer,layout} from './renderer.mjs';
const $=s=>document.querySelector(s),KEY='classic-atlas.crate.v1';let storageAvailable=true,restoreNotice='';
const defaults=()=>({unlocked:1,last:1,best:{},current:null,tutorialSeen:false,sound:true});
function read(){let raw;try{raw=localStorage.getItem(KEY);}catch{storageAvailable=false;return defaults();}try{raw=JSON.parse(raw||'{}');}catch{restoreNotice='存档格式无法读取，已开始新局。';return defaults();}
 const unlocked=Math.max(1,Math.min(20,Number.isInteger(raw.unlocked)?raw.unlocked:1)),best={};for(let i=1;i<=20;i++){const b=raw.best?.[i];if(b&&Number.isInteger(b.moves)&&b.moves>=0&&Number.isInteger(b.pushes)&&b.pushes>=0)best[i]={moves:b.moves,pushes:b.pushes};}
 return {unlocked,last:Math.max(1,Math.min(unlocked,Number.isInteger(raw.last)?raw.last:1)),best,current:raw.current||null,tutorialSeen:!!raw.tutorialSeen,sound:raw.sound!==false};
}
const progress=read();let game=createGame(progress.last-1),restored=false;
if(progress.current&&progress.current.level===progress.last){const saved=restoreActions(progress.last-1,progress.current.actions,progress.current.time);if(saved){game=saved;restored=game.history.length>0;}else restoreNotice='当前局动作记录无法恢复，已保留个人纪录并重新开始。';}
const renderer=new Renderer($('#battlefield')),heldKeys=new Map(),heldTouch=new Map();let queue=[],order=0,inputAfter=performance.now()+160,nextAction=0,primaryAction,secondaryAction,helpStarts=false,resumeAfterDialog=false,lastState='',lastHud=0,audio=null,previous=performance.now();
const frames=[],renderTimes=[];
function save(){progress.current={level:game.level,actions:actions(game),time:game.time};try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{storageAvailable=false;}$('#save-note').textContent=storageAvailable?'当前局、撤销历史与纪录仅保存在本浏览器。':'浏览器存储不可用，本次仍可游玩和撤销，新进度暂无法保存。';}
function unlockAudio(){if(!progress.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{/* Sound is optional. */}}
function tone(freq,length=.08,type='triangle',delay=0){if(!progress.sound||!audio||audio.state!=='running')return;const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.65),t+length);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.022,t+.005);v.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+length+.015);o.onended=()=>{o.disconnect();v.disconnect();};}
function sound(e){if(e.type==='step')tone(260,.035,'sine');if(e.type==='push')tone(160,.09);if(e.type==='goal'){tone(640,.13,'sine');tone(820,.12,'sine',.06);}if(e.type==='undo')tone(320,.07);if(e.type==='win')for(let i=0;i<4;i++)tone([440,554,660,880][i],.22,'triangle',i*.13);}
function clearInput(){queue=[];heldKeys.clear();heldTouch.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
const unlockedInput=()=>performance.now()>=inputAfter;
function announce(text){$('#battle-status').textContent=text;}
function enqueueMove(dir){if(game.state!=='playing'||!unlockedInput()||queue.length>=128)return;unlockAudio();queue.push({kind:'move',dir});}
function enqueueUndo(){if(!['playing','won'].includes(game.state)||!unlockedInput()||!game.history.length)return;unlockAudio();heldKeys.clear();heldTouch.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));queue=queue.filter(a=>a.kind==='undo');queue.push({kind:'undo'});}
function overlay(title,copy,summary,label,action,secondary='选择关卡',second=openLevels){$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#overlay-summary').textContent=summary;$('#primary-action').innerHTML=`${label} <span>↗</span>`;$('#secondary-action').textContent=secondary;primaryAction=action;secondaryAction=second;$('#overlay').hidden=false;}
function load(index){clearInput();game=createGame(index);restored=false;progress.last=game.level;inputAfter=performance.now()+180;lastState='';save();hud();syncState();renderer.draw(game,performance.now()/1000);}
function begin(){unlockAudio();if(!progress.tutorialSeen){helpStarts=true;openHelp();return;}start(game);clearInput();inputAfter=performance.now()+160;syncState();$('#battlefield').focus({preventScroll:true});}
function resume(){if(game.state==='paused')pause(game);clearInput();inputAfter=performance.now()+120;syncState();$('#battlefield').focus({preventScroll:true});}
function togglePause(){if(!['playing','paused'].includes(game.state))return;clearInput();pause(game);save();syncState();if(game.state==='playing'){inputAfter=performance.now()+120;$('#battlefield').focus({preventScroll:true});}}
function syncState(){
 if(lastState===game.state)return;lastState=game.state;const l=LEVELS[game.level-1];$('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').innerHTML=game.state==='paused'?'继续 <kbd>P</kbd>':'暂停 <kbd>P</kbd>';
 if(game.state==='playing'){$('#overlay').hidden=true;announce('先留出站位，只推不拉。Z / 退格可随时撤销。');return;}
 clearInput();$('#overlay-eyebrow').textContent=`WAREHOUSE ${String(game.level).padStart(2,'0')} / 20`;
 if(game.state==='ready')overlay(l.name,l.tip,`${l.band} · ${game.boxes.length} 箱 / ${game.goals.length} 目标 · 不限次撤销`,'开始规划',begin);
 if(game.state==='paused')overlay(restored?'继续当前局':'规划暂停',restored?'已从合法动作记录恢复棋盘和撤销历史，准备好后继续。':'棋盘与输入已暂停，可以慢慢想。',`${game.moves} 步 · ${game.pushes} 次推箱 · 归位 ${satisfied(game)}/${game.boxes.length}`,'继续规划',resume,'重新开始',()=>load(game.level-1));
 if(game.state==='won'){
  const old=progress.best[game.level];progress.best[game.level]={moves:Math.min(old?.moves??Infinity,game.moves),pushes:Math.min(old?.pushes??Infinity,game.pushes)};progress.unlocked=Math.max(progress.unlocked,Math.min(20,game.level+1));save();inputAfter=performance.now()+150;
  overlay(game.level===20?'二十仓，全部归位':'这一仓，整齐了','个人纪录已保存。你也可以撤销最后一步，继续尝试。',`${game.moves} 步 · ${game.pushes} 次推箱 · 仅个人纪录`,game.level===20?'重玩本关':'继续下一仓',()=>{load(game.level===20?19:game.level);begin();},'撤销上一步',enqueueUndo);announce('全部箱子归位，已保存个人纪录并解锁下一关。');
 }
}
function hud(){const l=LEVELS[game.level-1],filled=satisfied(game),best=progress.best[game.level];$('#mission-number').textContent=`${String(game.level).padStart(2,'0')} / 20`;$('#mission-name').textContent=l.name;$('#mission-tip').textContent=l.tip;$('#mission-band').textContent=l.band;$('#moves').textContent=game.moves;$('#pushes').textContent=game.pushes;$('#moves-mobile').textContent=game.moves;$('#pushes-mobile').textContent=game.pushes;$('#goals-mobile').textContent=`${filled}/${game.boxes.length}`;$('#satisfied').textContent=`${filled} / ${game.boxes.length}`;$('#goal-dots').innerHTML=game.boxes.map((_,i)=>`<i class="${i<filled?'done':''}"></i>`).join('');$('#goal-dots').setAttribute('aria-label',`${filled}个箱子已归位，共${game.boxes.length}个`);$('#best-moves').textContent=best?.moves??'—';$('#best-pushes').textContent=best?.pushes??'—';$('#corner-notice').hidden=cornerBoxes(game).length===0;const canUndo=['playing','won'].includes(game.state)&&game.history.length>0&&unlockedInput();$('#undo').disabled=!canUndo;$('#touch-undo').disabled=!canUndo;$('#primary-action').disabled=game.state==='won'&&!unlockedInput();$('#secondary-action').disabled=game.state==='won'&&!canUndo;}
function suspendForDialog(){resumeAfterDialog=game.state==='playing';if(resumeAfterDialog){clearInput();pause(game);syncState();}}
function openHelp(){suspendForDialog();$('#help-dialog').showModal();}
function closeHelp(confirmed){$('#help-dialog').close();if(confirmed){progress.tutorialSeen=true;save();}if(helpStarts){helpStarts=false;if(confirmed)begin();}else if(resumeAfterDialog)resume();resumeAfterDialog=false;}
function openLevels(){suspendForDialog();$('#level-list').innerHTML=LEVELS.map(l=>`<button class="level-button ${l.id===game.level?'current':''}" type="button" data-level="${l.id}" ${l.id>progress.unlocked?'disabled':''}><span>${String(l.id).padStart(2,'0')}</span><strong>${l.name}</strong><small>${l.id>progress.unlocked?'未解锁':progress.best[l.id]?`${progress.best[l.id].moves}步 · ${progress.best[l.id].pushes}推`:`${l.boxes.length}箱`}</small></button>`).join('');$('#levels-dialog').showModal();}
function closeLevels(){$('#levels-dialog').close();if(resumeAfterDialog)resume();resumeAfterDialog=false;}
$('#primary-action').onclick=()=>primaryAction?.();$('#secondary-action').onclick=()=>secondaryAction?.();$('#pause').onclick=togglePause;$('#restart').onclick=()=>load(game.level-1);$('#touch-restart').onclick=()=>load(game.level-1);$('#undo').onclick=enqueueUndo;$('#touch-undo').onclick=enqueueUndo;$('#levels').onclick=openLevels;$('#help').onclick=openHelp;$('#help-confirm').onclick=()=>closeHelp(true);$('#help-close').onclick=()=>closeHelp(false);$('#help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp(false);});$('#levels-close').onclick=closeLevels;$('#levels-dialog').addEventListener('cancel',e=>{e.preventDefault();closeLevels();});$('#level-list').onclick=e=>{const b=e.target.closest('[data-level]');if(!b||b.disabled)return;$('#levels-dialog').close();resumeAfterDialog=false;load(Number(b.dataset.level)-1);};
$('#sound').onclick=()=>{progress.sound=!progress.sound;$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));if(progress.sound){unlockAudio();tone(520);}save();};
const keyDirs={ArrowUp:'U',KeyW:'U',ArrowRight:'R',KeyD:'R',ArrowDown:'D',KeyS:'D',ArrowLeft:'L',KeyA:'L'};
document.addEventListener('keydown',e=>{
 if(e.metaKey||e.altKey||(e.ctrlKey&&e.code!=='KeyZ')||document.querySelector('dialog[open]')||e.target.matches('input,textarea,select'))return;
 if(!e.repeat&&['KeyP','Escape'].includes(e.code)){e.preventDefault();togglePause();return;}
 if(keyDirs[e.code]){e.preventDefault();if(e.repeat||!unlockedInput()||game.state!=='playing')return;heldKeys.set(e.code,{dir:keyDirs[e.code],order:++order,repeatAt:performance.now()+250});enqueueMove(keyDirs[e.code]);}
 if(!e.repeat&&['KeyZ','Backspace'].includes(e.code)){e.preventDefault();enqueueUndo();}
 if(!e.repeat&&e.code==='KeyR'&&unlockedInput()){e.preventDefault();load(game.level-1);}
});document.addEventListener('keyup',e=>heldKeys.delete(e.code));
for(const b of document.querySelectorAll('[data-direction]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(game.state!=='playing'||!unlockedInput())return;heldTouch.set(e.pointerId,{dir:b.dataset.direction,order:++order,repeatAt:performance.now()+250});b.classList.add('pressed');enqueueMove(b.dataset.direction);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{heldTouch.delete(e.pointerId);b.classList.remove('pressed');});}
const canvas=$('#battlefield');canvas.addEventListener('pointerup',e=>{canvas.focus({preventScroll:true});if(game.state!=='playing'||!unlockedInput())return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*600/rect.width,y=(e.clientY-rect.top)*600/rect.height,l=layout(game),cx=Math.floor((x-l.left)/l.size),cy=Math.floor((y-l.top)/l.size),dx=cx-game.player.x,dy=cy-game.player.y;if(Math.abs(dx)+Math.abs(dy)===1)enqueueMove(dx===1?'R':dx===-1?'L':dy===1?'D':'U');});
function autoPause(){clearInput();if(game.state==='playing'){pause(game);save();syncState();}}window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function frame(now){const dt=Math.min(.1,Math.max(0,(now-previous)/1000));previous=now;if(dt){frames.push(dt);if(frames.length>120)frames.shift();}update(game,dt);
 if(now>=nextAction&&now>=inputAfter){let action=queue.shift();if(!action&&game.state==='playing'){const held=[...heldKeys.values(),...heldTouch.values()].sort((a,b)=>b.order-a.order)[0];if(held&&now>=held.repeatAt){action={kind:'move',dir:held.dir};held.repeatAt=now+115;}}
  if(action){const success=action.kind==='undo'?undo(game):move(game,action.dir);nextAction=now+75;if(success){save();if(action.kind==='undo')announce('已撤销一步，棋盘与计数已恢复。');else if(cornerBoxes(game).length)announce('箱子位于非目标静态墙角，可撤销检查。');}}
 }
 for(const e of game.events.splice(0))sound(e);
 const t=performance.now();renderer.draw(game,now/1000);renderTimes.push(performance.now()-t);if(renderTimes.length>120)renderTimes.shift();syncState();if(now-lastHud>55){hud();lastHud=now;}requestAnimationFrame(frame);
}
// A copied observation surface; live board/history remain controller-private.
export function diagnostics(){return {...snapshot(game),unlocked:progress.unlocked,best:JSON.parse(JSON.stringify(progress.best)),storageAvailable,restored,inputLocked:!unlockedInput(),queuedInputs:queue.length,heldInputs:heldKeys.size+heldTouch.size,sound:progress.sound,fps:frames.length/(frames.reduce((a,b)=>a+b,0)||1),meanRenderMs:renderTimes.reduce((a,b)=>a+b,0)/(renderTimes.length||1)};}
$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));save();hud();syncState();if(restoreNotice)announce(restoreNotice);requestAnimationFrame(frame);
