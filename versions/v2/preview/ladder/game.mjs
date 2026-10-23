import {createGame,start,pause,update,dig,snapshot,checkpoint,restore,LEVELS} from './engine.mjs';
import {Renderer} from '../../../../preview/ladder/renderer.mjs';
import {JourneyStore,fresh,finish} from './journey.mjs';
const $=s=>document.querySelector(s),text=(s,v)=>{const e=$(s);if(e&&e.textContent!==String(v))e.textContent=v;};
let local;try{local=localStorage;}catch{}
const store=new JourneyStore(local);let progress=store.data,g=restore(progress.current)||createGame(progress.last-1);
const renderer=new Renderer($('#battlefield')),held=new Set(),pointers=new Map();let last=0,lastHud=0,lastSave=0,lastState='',lastCollected=-1,lastTraps=-1,resultDismissed=false;
const names={ready:'整备 · 先观察梯索与退路',playing:'拾灯进行中',paused:'已暂停 · 明确继续后再行动',won:'本关灯芯已送达',lost:'本关失利 · 可以重新安排路线'};
const input=()=>Object.fromEntries(['left','right','up','down'].map(d=>[d,held.has(d)||[...pointers.values()].includes(d)]));
function clear(){held.clear();pointers.clear();document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('held'));}
function announce(v){text('#action-feedback',v);}
function focusVisible(sel){const e=$(sel);e.focus({preventScroll:true});const r=e.getBoundingClientRect();if(r.top<12||r.bottom>innerHeight-12)e.scrollIntoView({block:'nearest',inline:'nearest'});}
function save(){
 if(g.state==='won')finish(progress,g);progress.current=checkpoint(g);const saved=store.save(progress),s=store.reason;
 $('#save-warning').hidden=!s;text('#save-warning',s==='corrupt'?'旧档无法识别，原始内容已保留并停止覆盖。仍可临时游玩，刷新会丢失本次进度。':s==='read'?'无法读取存储，已停止覆盖。仍可临时游玩，刷新可能丢失本次进度。':s==='write'?'本次保存未成功。仍可游玩；刷新可能丢失当前进度，旧有效存档未删除，后续操作会重试。':'');text('#save-state',saved?'进阶篇进度已保存':'本次进度暂未保存');return saved;
}
function interrupt(){clear();if(g.state==='playing'){pause(g);save();render();announce('已暂停，返回后请明确继续。方向与挖掘不会自动恢复。');}last=0;}
function toggle(){if(progress.phase!=='playing')return;clear();if(g.state==='ready')start(g);else if(['playing','paused'].includes(g.state))pause(g);else return;last=0;save();render();if(g.state==='playing')$('#battlefield').focus({preventScroll:true});}
function excavate(dir){if(g.state!=='playing'){announce(g.state==='paused'?'当前已暂停，请先继续再挖掘。':'开始拾灯后，才能挖开斜下方软砖。');return;}const r=dig(g,dir);announce(r.reason);if(r.ok)save();render();}
function load(i){clear();g=createGame(i);progress.last=g.level;progress.phase='playing';last=0;lastState='';lastCollected=-1;lastTraps=-1;resultDismissed=false;save();render();focusVisible('#start');}
function retry(){if(progress.phase!=='playing')return;interrupt();$('#retry-dialog').showModal();$('#retry-no').focus();}
function render(){
 const l=LEVELS[g.level-1],terminal=['won','lost'].includes(g.state),collected=g.cores.filter(c=>c.collected).length;
 text('#level-title',l.name||l.title||g.title);text('#level-brief',l.brief||g.brief);text('#level-index',`第 ${g.level} / ${LEVELS.length} 关`);text('#collected-count',collected);text('#total-count',g.cores.length);text('#time-left',Math.max(0,g.limit-g.time).toFixed(0)+'s');text('#exit-state',g.exit.open?'归灯门已点亮 · 返回出口':'集齐灯芯后，归灯门才会点亮');text('#phase-label',names[g.state]);
 const trapped=g.enemies.filter(e=>e.state==='trapped').length,active=g.enemies.length-trapped;
 text('#threat-status',terminal?g.reason:trapped?`${trapped} 名巡卫暂困洞中；${active} 名仍在行动。趁现在绕开，别等它脱困。`:`${active} 名巡卫在场。看清位置，利用梯索绕路或挖软砖诱入。`);
 text('#hole-status',g.holes.length?`临时洞 ${g.holes.length} 处 · 最近 ${Math.min(...g.holes.map(h=>h.remaining)).toFixed(1)}s 后复原；不要困在洞中。`:'左挖 Q / 右挖 E：只挖脚边斜下方软砖，不可跳跃。');
 $('#start').disabled=g.state!=='ready';$('#pause').disabled=!['playing','paused'].includes(g.state);text('#pause',g.state==='paused'?'继续拾灯':'暂停观察');$('#retry').disabled=progress.phase!=='playing';$('#dig-left').disabled=g.state!=='playing';$('#dig-right').disabled=g.state!=='playing';document.querySelectorAll('[data-dir]').forEach(b=>b.disabled=g.state!=='playing');
 const list=LEVELS.map((l,i)=>`<li class="${g.level===i+1?'current':''}" ${g.level===i+1?'aria-current="step"':''}><span>${i<progress.results.length?'✓':String(i+1).padStart(2,'0')}</span>${l.name||l.title}</li>`).join('');if($('#journey-list').innerHTML!==list)$('#journey-list').innerHTML=list;
 text('#summary-title',progress.phase==='complete'?'进阶三关，借隙回港。':'本次进阶航记');$('#summary-body').replaceChildren(...progress.results.map(r=>{const p=document.createElement('p');p.textContent=`第${r.level}关 · ${LEVELS[r.level-1].name||LEVELS[r.level-1].title}：灯芯${r.collected}/${r.total} · 挖掘${r.digs}次 / 困卫${r.traps}次 · ${r.steps}步 · ${r.time.toFixed(1)}秒`;return p;}));
 $('#result-card').hidden=!terminal||resultDismissed;$('#show-result').hidden=!terminal||!resultDismissed;
 if(terminal){const won=g.state==='won',complete=progress.phase==='complete';text('#result-title',complete?'把港口的灯，一盏盏带回来。':won?'这一座梯港，已经亮起。':'停下来，重新留一条退路。');text('#result-reason',g.reason);text('#result-details',`灯芯 ${collected}/${g.cores.length} · 挖掘 ${g.stats.digs} / 困卫 ${g.stats.traps} · ${g.time.toFixed(1)}秒`);$('#result-next').hidden=!won;text('#result-next',complete?'查看三关航记 →':'前往下一座梯港 →');$('#result-retry').hidden=won;}
 renderer.draw(g);
}
$('#start').onclick=toggle;$('#pause').onclick=toggle;$('#retry').onclick=retry;$('#dig-left').onclick=()=>excavate(-1);$('#dig-right').onclick=()=>excavate(1);$('#result-retry').onclick=retry;
$('#result-next').onclick=()=>{if(g.state==='won'&&progress.phase==='between')load(g.level);else if(progress.phase==='complete'){$('#summary-title').focus();$('#journey-summary').scrollIntoView({block:'start'});}};
$('#result-view').onclick=()=>{resultDismissed=true;render();focusVisible('#show-result');};$('#show-result').onclick=()=>{resultDismissed=false;render();focusVisible('#result-title');};
$('#help').onclick=()=>{interrupt();$('#help-dialog').showModal();$('#close-help').focus();};$('#close-help').onclick=()=>{$('#help-dialog').close();$('#help').focus({preventScroll:true});};
$('#new-journey').onclick=()=>{interrupt();$('#confirm-new').showModal();$('#confirm-new-no').focus();};$('#confirm-new-no').onclick=()=>{$('#confirm-new').close();$('#new-journey').focus({preventScroll:true});};$('#confirm-new-yes').onclick=()=>{$('#confirm-new').close();progress=fresh();load(0);announce('进阶篇已重新准备，只重置本篇进度；首篇三关存档保留。');};
$('#retry-no').onclick=()=>{$('#retry-dialog').close();$('#retry').focus({preventScroll:true});};$('#retry-yes').onclick=()=>{$('#retry-dialog').close();load(g.level-1);announce('本关已重置，之前梯港的成果保留。');};
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'};
document.addEventListener('keydown',e=>{
 if(e.metaKey||e.ctrlKey||e.altKey||e.target.closest('a,button,input,select,textarea,summary,[contenteditable]')||document.querySelector('dialog[open]'))return;
 if(keys[e.code]){e.preventDefault();if(g.state==='playing')held.add(keys[e.code]);return;}
 if(e.repeat)return;if(['KeyP','Space','Enter'].includes(e.code)){e.preventDefault();toggle();}else if(e.code==='KeyQ'||e.code==='KeyE'){e.preventDefault();excavate(e.code==='KeyQ'?-1:1);}
});
document.addEventListener('keyup',e=>{if(keys[e.code])held.delete(keys[e.code]);});
for(const b of document.querySelectorAll('[data-dir]')){
 b.addEventListener('pointerdown',e=>{if(g.state!=='playing'||e.button>0)return;e.preventDefault();pointers.set(e.pointerId,b.dataset.dir);b.classList.add('held');b.setPointerCapture(e.pointerId);});
 const release=e=>{pointers.delete(e.pointerId);if(![...pointers.values()].includes(b.dataset.dir))b.classList.remove('held');};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,release);
}
window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});window.addEventListener('pagehide',()=>{clear();if(g.state==='playing')pause(g);save();});
export function diagnostics(){return {...snapshot(g),journeyPhase:progress.phase,results:JSON.parse(JSON.stringify(progress.results)),storageReason:store.reason,input:input()};}
function frame(t){
 const dt=last?(t-last)/1000:0;last=t;if(dt>.5&&g.state==='playing'){interrupt();announce('画面更新中断，已暂停保留当前局。请明确继续。');}else update(g,dt,input());
 if(g.stats.collected!==lastCollected){if(lastCollected>=0&&g.stats.collected>lastCollected)announce(g.exit.open?'灯芯已集齐，归灯门点亮。现在沿安全路线回门。':`已拾起灯芯，尚余 ${g.cores.filter(c=>!c.collected).length} 枚。`);lastCollected=g.stats.collected;}
 if(g.stats.traps!==lastTraps){if(lastTraps>=0&&g.stats.traps>lastTraps)announce('巡卫已暂时落入洞中。利用这次窗口绕开，别站在洞底等待回填。');lastTraps=g.stats.traps;}
 if(g.state!==lastState){lastState=g.state;if(g.state==='won')finish(progress,g);if(['won','lost','paused'].includes(g.state))clear();save();render();if(['won','lost'].includes(g.state)){$('#result-title').focus({preventScroll:true});announce(g.reason);}}
 else if(t-lastHud>90){render();lastHud=t;}if(g.state==='playing'&&t-lastSave>1000){save();lastSave=t;}renderer.draw(g);requestAnimationFrame(frame);
}
save();render();requestAnimationFrame(frame);
