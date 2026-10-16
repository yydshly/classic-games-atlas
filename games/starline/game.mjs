import {LEVELS,PALETTE} from './levels.mjs';
import {createGame,start,pause,fire,swap,update,cells,snapshot,clampAngle,SHOOTER} from './engine.mjs';
import {Renderer} from './renderer.mjs';
const $=s=>document.querySelector(s),KEY='classic-atlas.starline.v1';let storageAvailable=true;
function read(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}'),unlocked=Math.max(1,Math.min(12,Number.isInteger(raw.unlocked)?raw.unlocked:1)),best={};for(let i=1;i<=12;i++){const b=raw.best?.[i];if(b&&Number.isFinite(b.score)&&Number.isInteger(b.shots))best[i]={score:Math.max(0,b.score),shots:Math.max(1,b.shots),stars:Math.max(1,Math.min(3,b.stars||1))};}return {unlocked,last:Math.max(1,Math.min(unlocked,Number.isInteger(raw.last)?raw.last:1)),best,tutorialSeen:!!raw.tutorialSeen,sound:raw.sound!==false};}catch{storageAvailable=false;return {unlocked:1,last:1,best:{},tutorialSeen:false,sound:true};}}
const progress=read();let game=createGame(progress.last-1),primaryAction,secondaryAction,helpStarts=false,resumeAfterDialog=false,lastState='',audio=null;
const renderer=new Renderer($('#battlefield')),keys=new Set(),touch=new Map();let fireQueued=false,previous=performance.now(),accumulator=0,lastHud=0;
const frames=[],renderTimes=[];
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{storageAvailable=false;}$('#save-note').textContent=storageAvailable?'进度仅保存在本浏览器。':'浏览器存储不可用，本次仍可游玩，进度无法持久保存。';}
function unlockAudio(){if(!progress.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{/* Optional sound remains silent when unsupported. */}}
function tone(freq,length=.12,type='sine',delay=0){if(!progress.sound||!audio||audio.state!=='running')return;const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.6),t+length);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.035,t+.007);v.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+length+.02);o.onended=()=>{o.disconnect();v.disconnect();};}
function sound(e){if(e.type==='fire')tone(360,.09,'triangle');if(e.type==='attach')tone(210,.06);if(e.type==='swap')tone(580,.07);if(e.type==='pop'){tone(650+e.popped*15,.14);tone(930,.12,'sine',.05);}if(e.type==='drop'){tone(820,.35,'triangle');tone(500,.3,'triangle',.12);}if(e.type==='win')for(let i=0;i<4;i++)tone([440,554,660,880][i],.23,'triangle',i*.13);if(e.type==='lose'){tone(190,.3,'triangle');tone(100,.4,'sine',.2);}}
function clearInput(){keys.clear();touch.clear();fireQueued=false;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function announce(text){$('#battle-status').textContent=text;}
function overlay(title,copy,summary,label,action,secondary='选择关卡',second=openLevels){$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#overlay-summary').textContent=summary;$('#primary-action').innerHTML=`${label} <span>↗</span>`;$('#secondary-action').textContent=secondary;primaryAction=action;secondaryAction=second;$('#overlay').hidden=false;}
function load(index){clearInput();game=createGame(index);progress.last=game.level;save();lastState='';hud();syncState();renderer.draw(game);}
function begin(){unlockAudio();if(!progress.tutorialSeen){helpStarts=true;openHelp();return;}start(game);clearInput();syncState();$('#battlefield').focus({preventScroll:true});}
function resume(){if(game.state==='paused')pause(game);clearInput();syncState();$('#battlefield').focus({preventScroll:true});}
function togglePause(){if(!['playing','paused'].includes(game.state))return;clearInput();pause(game);syncState();}
function syncState(){
 if(lastState===game.state)return;lastState=game.state;const l=LEVELS[game.level-1];$('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').innerHTML=game.state==='paused'?'继续 <kbd>P</kbd>':'暂停 <kbd>P</kbd>';
 if(game.state==='playing'){$('#overlay').hidden=true;announce('观察虚线与落点，同色至少三连；X 可以交换下一颗，每发限一次。');return;}
 clearInput();$('#overlay-eyebrow').textContent=`SECTOR ${String(game.level).padStart(2,'0')} / 12`;
 if(game.state==='ready')overlay(l.name,l.tip,`${game.initial} 颗泡泡 · ${l.ammo} 次发射 · 清空全部星群`,'开始航行',begin);
 if(game.state==='paused')overlay('航线暂停','飞行与计时都已暂停，可以慢慢考虑下一颗。',`剩余 ${game.ammo} 次发射 · 场上 ${cells(game).length} 颗`,'继续航行',resume,'重新开始',()=>load(game.level-1));
 if(game.state==='lost'){overlay('换一条航线',game.reason,`发射 ${game.stats.shots} 次 · 消除 ${game.stats.popped} 颗 · 掉落 ${game.stats.dropped} 颗`,'重新挑战',()=>{load(game.level-1);begin();});announce(game.reason);}
 if(game.state==='won'){
  const stars=game.stats.shots<=l.par?3:game.stats.shots<=l.par+5?2:1,old=progress.best[game.level];if(!old||game.stats.score>old.score)progress.best[game.level]={score:game.stats.score,shots:game.stats.shots,stars};progress.unlocked=Math.max(progress.unlocked,Math.min(12,game.level+1));save();
  overlay(game.level===12?'群星已归航':'这一段，星光明亮',game.level===12?'十二段航线已完成。回到星图，挑战更少发射与更多悬岛掉落。':'下一段原创航线已解锁。所有泡泡都已回到夜空。',`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · ${game.stats.score} 分 · ${game.stats.shots} 次发射`,game.level===12?'再挑战本关':'前往下一关',()=>{load(game.level===12?11:game.level);begin();});announce('清场成功，航线进度与最佳纪录已保存。');
 }
}
const colorLabel=c=>c===null?'—':`${PALETTE[c].name} ${PALETTE[c].symbol}`;
function hud(){const l=LEVELS[game.level-1],count=cells(game).length;$('#mission-number').textContent=`${String(game.level).padStart(2,'0')} / 12`;$('#mission-name').textContent=l.name;$('#mission-tip').textContent=l.tip;$('#score').textContent=String(game.stats.score).padStart(6,'0');$('#best-score').textContent=progress.best[game.level]?.score??'—';$('#ammo').textContent=`${game.ammo} 次`;$('#remaining').textContent=`${count} 颗`;$('#ammo-mobile').textContent=game.ammo;$('#remaining-mobile').textContent=count;$('#color-mobile').textContent=colorLabel(game.current);$('#current-color').textContent=colorLabel(game.current);$('#next-color').textContent=colorLabel(game.next);$('#popped').textContent=game.stats.popped;$('#dropped').textContent=game.stats.dropped;$('#elapsed').textContent=`航行时间 ${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;$('#swap').disabled=game.state!=='playing'||!!game.flight||game.swapped;$('#shoot').disabled=game.state!=='playing'||!!game.flight;}
function suspendForDialog(){resumeAfterDialog=game.state==='playing';if(resumeAfterDialog){clearInput();pause(game);syncState();}}
function openHelp(){suspendForDialog();$('#help-dialog').showModal();}
function closeHelp(confirmed){$('#help-dialog').close();if(confirmed){progress.tutorialSeen=true;save();}if(helpStarts){helpStarts=false;if(confirmed)begin();}else if(resumeAfterDialog)resume();resumeAfterDialog=false;}
function openLevels(){suspendForDialog();$('#level-list').innerHTML=LEVELS.map(l=>`<button class="level-button ${l.id===game.level?'current':''}" type="button" data-level="${l.id}" ${l.id>progress.unlocked?'disabled':''}><span>${String(l.id).padStart(2,'0')}</span><strong>${l.name}</strong><small>${l.id>progress.unlocked?'未解锁':progress.best[l.id]?'★'.repeat(progress.best[l.id].stars):'可挑战'}</small></button>`).join('');$('#levels-dialog').showModal();}
function closeLevels(){$('#levels-dialog').close();if(resumeAfterDialog)resume();resumeAfterDialog=false;}
$('#primary-action').onclick=()=>primaryAction?.();$('#secondary-action').onclick=()=>secondaryAction?.();$('#pause').onclick=togglePause;$('#restart').onclick=()=>load(game.level-1);$('#levels').onclick=openLevels;$('#help').onclick=openHelp;$('#help-confirm').onclick=()=>closeHelp(true);$('#help-close').onclick=()=>closeHelp(false);$('#help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp(false);});$('#levels-close').onclick=closeLevels;$('#levels-dialog').addEventListener('cancel',e=>{e.preventDefault();closeLevels();});$('#level-list').onclick=e=>{const b=e.target.closest('[data-level]');if(!b||b.disabled)return;$('#levels-dialog').close();resumeAfterDialog=false;load(Number(b.dataset.level)-1);};
$('#sound').onclick=()=>{progress.sound=!progress.sound;$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));if(progress.sound){unlockAudio();tone(520);}save();};
function requestFire(){if(game.state!=='playing'||game.flight)return;unlockAudio();fireQueued=true;}
function requestSwap(){unlockAudio();swap(game);hud();}
$('#shoot').onclick=requestFire;$('#swap').onclick=requestSwap;
const canvas=$('#battlefield');
function aim(e){if(game.state!=='playing'||game.flight)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*600/rect.width,y=(e.clientY-rect.top)*660/rect.height;game.angle=clampAngle(Math.atan2(x-SHOOTER.x,Math.max(20,SHOOTER.y-y)));}
canvas.addEventListener('pointerdown',e=>{if(game.state!=='playing')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);aim(e);});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||canvas.hasPointerCapture(e.pointerId))aim(e);});
canvas.addEventListener('pointerup',e=>{e.preventDefault();aim(e);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(e.pointerType==='mouse')requestFire();});
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||e.target.matches('input,textarea,select'))return;
 if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code);}
 if(!e.repeat&&['Space','Enter'].includes(e.code)&&e.target.tagName!=='BUTTON'){e.preventDefault();requestFire();}
 if(!e.repeat&&e.code==='KeyX'){e.preventDefault();requestSwap();}
 if(!e.repeat&&['KeyP','Escape'].includes(e.code)){e.preventDefault();togglePause();}
 if(!e.repeat&&e.code==='KeyR'){e.preventDefault();load(game.level-1);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const [id,d] of [['aim-left',-1],['aim-right',1]]){const b=$('#'+id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,d);b.classList.add('pressed');if(game.state==='playing'&&!game.flight)game.angle=clampAngle(game.angle+d*.018);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{touch.delete(e.pointerId);b.classList.remove('pressed');});}
function autoPause(){clearInput();if(game.state==='playing'){pause(game);syncState();}}
window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function frame(now){const delta=Math.min(.1,Math.max(0,(now-previous)/1000));previous=now;if(delta>0){frames.push(delta);if(frames.length>120)frames.shift();}accumulator+=delta;
 while(accumulator>=1/60){if(game.state==='playing'&&!game.flight){const left=keys.has('ArrowLeft')||keys.has('KeyA')||[...touch.values()].includes(-1),right=keys.has('ArrowRight')||keys.has('KeyD')||[...touch.values()].includes(1);game.angle=clampAngle(game.angle+(Number(right)-Number(left))*.014);if(fireQueued)fire(game);}fireQueued=false;update(game,1/60);accumulator-=1/60;}
 for(const e of game.events.splice(0)){sound(e);if(e.type==='pop')announce(`同色消除 ${e.popped} 颗${e.dropped?`，悬岛掉落 ${e.dropped} 颗`:''}。剩余 ${game.ammo} 次发射。`);if(e.type==='swap')announce('已交换当前与下一颗。本次发射后可再次交换。');}
 const t=performance.now();renderer.draw(game,now/1000);renderTimes.push(performance.now()-t);if(renderTimes.length>120)renderTimes.shift();syncState();if(now-lastHud>75){hud();lastHud=now;}requestAnimationFrame(frame);
}
// Copied observation only. The controller's game object stays private.
export function diagnostics(){return {...snapshot(game),unlocked:progress.unlocked,storageAvailable,sound:progress.sound,fps:frames.length/(frames.reduce((a,b)=>a+b,0)||1),meanRenderMs:renderTimes.reduce((a,b)=>a+b,0)/(renderTimes.length||1)};}
$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));save();hud();syncState();requestAnimationFrame(frame);
