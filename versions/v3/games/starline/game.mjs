import {LEVELS,PALETTE} from './levels.mjs';
import {createGame,start,pause,fire,swap,update,cells,snapshot,restoreSnapshot,clampAngle,SHOOTER} from './engine.mjs';
import {Renderer} from './renderer.mjs';
import {freshJourney,settleJourney,retryJourney,advanceJourney} from './journey.mjs';
import {journeyStorage} from './storage.mjs';
const $=s=>document.querySelector(s);
const store=journeyStorage({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)}),progress=store.state;
let game=restoreSnapshot(progress.board)||createGame(progress.stage),primaryAction,secondaryAction,helpStarts=false,resumeAfterDialog=false,lastState='',audio=null;
const renderer=new Renderer($('#battlefield')),keys=new Set(),touch=new Map();let fireQueued=false,previous=performance.now(),accumulator=0,lastHud=0;
const frames=[],renderTimes=[];let settledSnapshot=snapshot(game);
function persistSession(){if(!game.flight)settledSnapshot=snapshot(game);progress.board=settledSnapshot;settleJourney(progress,game);save();}
function save(){store.write(progress);$('#save-note').textContent=store.message();}
function unlockAudio(){if(!progress.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{/* Optional sound remains silent when unsupported. */}}
function tone(freq,length=.12,type='sine',delay=0){if(!progress.sound||!audio||audio.state!=='running')return;const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.6),t+length);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.035,t+.007);v.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+length+.02);o.onended=()=>{o.disconnect();v.disconnect();};}
function sound(e){if(e.type==='fire')tone(360,.09,'triangle');if(e.type==='attach')tone(210,.06);if(e.type==='swap')tone(580,.07);if(e.type==='pop'){tone(650+e.popped*15,.14);tone(930,.12,'sine',.05);}if(e.type==='drop'){tone(820,.35,'triangle');tone(500,.3,'triangle',.12);}if(e.type==='win')for(let i=0;i<4;i++)tone([440,554,660,880][i],.23,'triangle',i*.13);if(e.type==='lose'){tone(190,.3,'triangle');tone(100,.4,'sine',.2);}}
function clearInput(){keys.clear();touch.clear();fireQueued=false;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function announce(text){$('#battle-status').textContent=text;}
function overlay(title,copy,summary,label,action,secondary='选择关卡',second=openLevels){$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#overlay-summary').textContent=summary;$('#primary-action').innerHTML=`${label} <span>↗</span>`;$('#secondary-action').textContent=secondary;primaryAction=action;secondaryAction=second;$('#overlay').hidden=false;}
function loadCurrent(){clearInput();game=restoreSnapshot(progress.board)||createGame(progress.stage);settledSnapshot=snapshot(game);lastState='';hud();syncState();renderer.draw(game);}
function retry(){if(!retryJourney(progress))return;loadCurrent();persistSession();}
function nextRound(){if(!advanceJourney(progress))return;loadCurrent();persistSession();}
function begin(){unlockAudio();if(!progress.tutorialSeen){helpStarts=true;openHelp();return;}start(game);progress.phase='active';persistSession();clearInput();syncState();$('#battlefield').focus({preventScroll:true});}
function resume(){unlockAudio();if(game.state==='paused')pause(game);clearInput();persistSession();syncState();$('#battlefield').focus({preventScroll:true});}
function togglePause(){if(!['playing','paused'].includes(game.state))return;clearInput();pause(game);persistSession();syncState();}
function summary(){
 $('#journey-summary').hidden=progress.phase!=='complete';
 $('#journey-results').replaceChildren(...progress.results.map(r=>{const article=document.createElement('article'),title=document.createElement('h3'),dl=document.createElement('dl');title.textContent=`${r.stage+1} · ${LEVELS[r.stage].name}`;for(const [name,value] of [['发射',r.shots+' 发'],['消除 / 掉落',r.popped+' / '+r.dropped],['墙面反弹',r.bounces+' 次'],['本图重试前失利',progress.failures[r.stage]+' 次']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;dl.append(dt,dd);}article.append(title,dl);return article;}));
 $('#journey-total').textContent=`三图合计 ${progress.results.reduce((n,r)=>n+r.shots,0)} 发 · ${progress.results.reduce((n,r)=>n+r.score,0)} 分。只记录本篇实际完成结果；不是原作关卡或排名认证。`;
}
function syncState(){
 const state=progress.phase+':'+game.state;if(lastState===state)return;lastState=state;persistSession();
 const l=LEVELS[progress.stage];$('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').innerHTML=game.state==='paused'?'继续 <kbd>P</kbd>':'暂停 <kbd>P</kbd>';$('#restart').disabled=['between','complete'].includes(progress.phase);
 for(let i=0;i<3;i++){const step=$('#journey-step-'+i);step.classList.toggle('done',i<progress.results.length);if(i===progress.stage)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');step.textContent=`${String(i+1).padStart(2,'0')} ${LEVELS[i].name}${i<progress.results.length?' · 已完成':''}`;}
 $('#journey-goal').textContent=progress.phase==='complete'?'三图航行完成。可重读下方战报，或确认开启新旅程。':progress.phase==='between'?`本图已封存；下一图：${LEVELS[progress.stage+1].name}。${LEVELS[progress.stage+1].tip}`:l.tip;
 summary();
 if(game.state==='playing'){$('#overlay').hidden=true;announce('观察预览落点，再决定清理顺序。每发可交换一次；四发结算后下压。');return;}
 clearInput();$('#overlay-eyebrow').textContent=`CHAPTER ${String(game.level).padStart(2,'0')} / 03`;
 if(game.state==='ready')overlay(l.name,l.tip,`${game.initial} 颗星泡 · 每 ${l.dropEvery} 发下压一排 · 清空全部星群`,'开始本图',begin,'本篇三图目标',openLevels);
 if(game.state==='paused')overlay('航行已暂停','继续后从已保存的落点出发。飞行中刷新会回到这一发之前。',`再 ${game.shotsUntilDrop} 发下压 · 还剩 ${cells(game).length} 颗`,'继续航行',resume,'重试当前图',retry);
 if(progress.phase==='lost'){overlay('这一图暂未通过',game.reason,`已发射 ${game.stats.shots} 发 · 前 ${progress.results.length} 图成果保留`,'重试当前图',retry,'本篇三图目标',openLevels);announce(game.reason+'。可重试当前图，已完成图不受影响。');}
 if(progress.phase==='between'){overlay('这一图，星群已清',`下一图：${LEVELS[progress.stage+1].name}。${LEVELS[progress.stage+1].tip}`,`${game.stats.shots} 发 · 消除 ${game.stats.popped} / 掉落 ${game.stats.dropped} · 成绩已封存`,'前往下一图',nextRound,'本篇三图目标',openLevels);announce('本图已完成并封存，准备下一图。');}
 if(progress.phase==='complete'){overlay('三锚归航，旅程完成','三张原创星图已经清空。战报保留在下方，刷新后仍可阅读。',`${progress.results.reduce((n,r)=>n+r.shots,0)} 发合计 · ${progress.results.reduce((n,r)=>n+r.score,0)} 分`,'阅读旅途战报',()=>{$('#journey-summary').scrollIntoView({behavior:'smooth',block:'start'});$('#journey-summary-title').focus({preventScroll:true});},'本篇三图目标',openLevels);announce('旅程完成。下方战报可重读；新旅程须确认后开始。');}
}
const colorLabel=c=>c===null?'—':`${PALETTE[c].name} ${PALETTE[c].symbol}`;
function hud(){const l=LEVELS[game.level-1],count=cells(game).length;$('#mission-number').textContent=`${String(game.level).padStart(2,'0')} / 03`;$('#mission-name').textContent=l.name;$('#mission-tip').textContent=l.tip;$('#score').textContent=String(game.stats.score).padStart(6,'0');$('#best-score').textContent=progress.results.reduce((n,r)=>n+r.score,0);$('#ammo').textContent=`${game.shotsUntilDrop} 发`;$('#remaining').textContent=`${count} 颗`;$('#ammo-mobile').textContent=game.shotsUntilDrop;$('#remaining-mobile').textContent=count;$('#color-mobile').textContent=colorLabel(game.current);$('#current-color').textContent=colorLabel(game.current);$('#next-color').textContent=colorLabel(game.next);$('#shots').textContent=game.stats.shots;$('#descents').textContent=game.descents;$('#pressure-meter').value=4-game.shotsUntilDrop;$('#pressure-label').textContent=`再 ${game.shotsUntilDrop} 发，压板下降一排`;$('#popped').textContent=game.stats.popped;$('#dropped').textContent=game.stats.dropped;$('#elapsed').textContent=`航行时间 ${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;$('#swap').disabled=game.state!=='playing'||!!game.flight||game.swapped;$('#shoot').disabled=game.state!=='playing'||!!game.flight;}
function suspendForDialog(){resumeAfterDialog=game.state==='playing';if(resumeAfterDialog){clearInput();pause(game);persistSession();syncState();}}
function openHelp(){suspendForDialog();$('#help-dialog').showModal();}
function closeHelp(confirmed){$('#help-dialog').close();if(confirmed){progress.tutorialSeen=true;save();}if(helpStarts){helpStarts=false;if(confirmed)begin();}else if(resumeAfterDialog)resume();resumeAfterDialog=false;}
function openLevels(){suspendForDialog();$('#level-list').replaceChildren(...LEVELS.map((l,i)=>{const row=document.createElement('article');row.className='level-button';const name=document.createElement('strong'),goal=document.createElement('p');name.textContent=`${i+1} · ${l.name}${i<progress.results.length?' · 已完成':i===progress.stage?' · 当前图':''}`;goal.textContent=l.tip;row.append(name,goal);return row;}));$('#levels-dialog').showModal();}
function closeLevels(){$('#levels-dialog').close();if(resumeAfterDialog)resume();resumeAfterDialog=false;}
function openRestart(){autoPause();$('#restart-dialog').showModal();$('#restart-cancel').focus();}
function closeRestart(confirm){$('#restart-dialog').close();if(confirm){const preferences={sound:progress.sound,tutorialSeen:progress.tutorialSeen};Object.assign(progress,freshJourney(),preferences);loadCurrent();persistSession();}$('#new-journey').focus({preventScroll:true});}
$('#primary-action').onclick=()=>primaryAction?.();$('#secondary-action').onclick=()=>secondaryAction?.();$('#pause').onclick=togglePause;$('#restart').onclick=retry;$('#levels').onclick=openLevels;$('#help').onclick=openHelp;$('#help-confirm').onclick=()=>closeHelp(true);$('#help-close').onclick=()=>closeHelp(false);$('#help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp(false);});$('#levels-close').onclick=closeLevels;$('#levels-dialog').addEventListener('cancel',e=>{e.preventDefault();closeLevels();});
$('#new-journey').onclick=openRestart;$('#restart-confirm').onclick=()=>closeRestart(true);$('#restart-cancel').onclick=()=>closeRestart(false);$('#restart-dialog').addEventListener('cancel',e=>{e.preventDefault();closeRestart(false);});
$('#sound').onclick=()=>{progress.sound=!progress.sound;$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));if(progress.sound){unlockAudio();tone(520);}save();};
function requestFire(){if(game.state!=='playing'||game.flight)return;unlockAudio();fireQueued=true;}
function requestSwap(){unlockAudio();if(swap(game))persistSession();hud();}
$('#shoot').onclick=requestFire;$('#swap').onclick=requestSwap;
const canvas=$('#battlefield');
function aim(e){if(game.state!=='playing'||game.flight)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const x=(e.clientX-rect.left)*600/rect.width,y=(e.clientY-rect.top)*660/rect.height;game.angle=clampAngle(Math.atan2(x-SHOOTER.x,Math.max(20,SHOOTER.y-y)));}
canvas.addEventListener('pointerdown',e=>{if(game.state!=='playing')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);aim(e);});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||canvas.hasPointerCapture(e.pointerId))aim(e);});
canvas.addEventListener('pointerup',e=>{e.preventDefault();aim(e);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(e.pointerType==='mouse')requestFire();});
document.addEventListener('keydown',e=>{if(e.code==='Enter'&&e.target.closest('a[href]'))return;
 if(e.repeat&&['Space','Enter','KeyX','KeyP','Escape','KeyR'].includes(e.code)){e.preventDefault();return;}
 if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||e.target.closest('a[href],input,textarea,select,button,[contenteditable=true]'))return;
 if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code);}
 if(!e.repeat&&['Space','Enter'].includes(e.code)&&e.target.tagName!=='BUTTON'){e.preventDefault();requestFire();}
 if(!e.repeat&&e.code==='KeyX'){e.preventDefault();requestSwap();}
 if(!e.repeat&&['KeyP','Escape'].includes(e.code)){e.preventDefault();togglePause();}
 if(!e.repeat&&e.code==='KeyR'){e.preventDefault();retry();}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const [id,d] of [['aim-left',-1],['aim-right',1]]){const b=$('#'+id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,d);b.classList.add('pressed');if(game.state==='playing'&&!game.flight)game.angle=clampAngle(game.angle+d*.018);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{touch.delete(e.pointerId);b.classList.remove('pressed');});}
function autoPause(){clearInput();if(game.state==='playing'){pause(game);persistSession();syncState();}}
window.addEventListener('pagehide',persistSession);window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function frame(now){const delta=Math.min(.1,Math.max(0,(now-previous)/1000));previous=now;if(delta>0){frames.push(delta);if(frames.length>120)frames.shift();}accumulator+=delta;
 while(accumulator>=1/60){if(game.state==='playing'&&!game.flight){const left=keys.has('ArrowLeft')||keys.has('KeyA')||[...touch.values()].includes(-1),right=keys.has('ArrowRight')||keys.has('KeyD')||[...touch.values()].includes(1);game.angle=clampAngle(game.angle+(Number(right)-Number(left))*.014);if(fireQueued){persistSession();fire(game);}}fireQueued=false;update(game,1/60);accumulator-=1/60;}
 if(!game.flight&&game.stats.shots!==settledSnapshot.stats.shots)persistSession();
 for(const e of game.events.splice(0,64)){sound(e);if(e.type==='pop')announce(`同色消除 ${e.popped} 颗${e.dropped?`，悬岛掉落 ${e.dropped} 颗`:''}。再 ${game.shotsUntilDrop} 发下压。`);if(e.type==='descent')announce(`压板下降一排。再 ${game.shotsUntilDrop} 发下压。`);if(e.type==='swap')announce('已交换当前与下一颗。本次发射后可再次交换。');}
 const t=performance.now();renderer.draw(game,now/1000);renderTimes.push(performance.now()-t);if(renderTimes.length>120)renderTimes.shift();syncState();if(now-lastHud>75){hud();lastHud=now;}requestAnimationFrame(frame);
}
// Copied observation only. The controller's game object stays private.
export function diagnostics(){return {...snapshot(game),journey:structuredClone(progress),storage:store.status(),input:{keys:[...keys],touch:[...touch]},sound:progress.sound,fps:frames.length/(frames.reduce((a,b)=>a+b,0)||1),meanRenderMs:renderTimes.reduce((a,b)=>a+b,0)/(renderTimes.length||1)};}
$('#sound').textContent=`声音 ${progress.sound?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(progress.sound));persistSession();hud();syncState();requestAnimationFrame(frame);
