import {createGame,start,pause,command,update,snapshot,checkpoint,LEVELS,ACTIONS} from './engine.mjs';
import {Renderer,hitTest} from './renderer.mjs';
import {readSave,writeSave,warning} from './storage.mjs';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={hunger:'饱腹',energy:'精力',hygiene:'整洁',mood:'心情'}, phases={ready:'准备中',playing:'日常进行中',paused:'已暂停',won:'今日完成',lost:'重新安排'};
let loaded;try{loaded=readSave(localStorage);}catch{loaded=readSave({getItem(){throw Error('unavailable');}});}
let {progress,game:g,protection}=loaded,selectedActor='a',selectedObject='stove',writeFailed=false,saved=false,previousState=g.state,lastStamp=0,lastSave=0,acc=0;
const renderer=new Renderer($('#room')),cache=new Map();
function html(id,value){if(cache.get(id)!==value){const root=$(id),active=document.activeElement,inside=root.contains(active),keys=inside?[...active.attributes].filter(a=>a.name.startsWith('data-')):[];root.innerHTML=value;cache.set(id,value);if(inside){const selector=keys.map(a=>'['+a.name+'="'+CSS.escape(a.value)+'"]').join('');const replacement=selector?root.querySelector(selector):null;(replacement||root.querySelector('[data-actor]')||root.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});}}}
function text(id,value){if($(id).textContent!==String(value))$(id).textContent=value;}
function speak(value){text('#feedback',value);}
function layoutOf(){return Object.fromEntries(g.objects.filter(o=>['desk','bench'].includes(o.id)).map(o=>[o.id,{x:o.x,y:o.y}]));}
function recordWin(){
 if(g.state!=='won')return;
 if(!progress.completed[g.level])progress.completed[g.level]={level:g.level,title:g.title,time:g.time,people:g.actors.map(a=>({name:a.name,needs:{...a.needs}}))};
 progress.unlocked=Math.max(progress.unlocked,Math.min(3,g.level+1));
}
function save(){recordWin();progress.last=g.level;progress.current=checkpoint(g);progress.layouts[g.level]=layoutOf();let ok=false;try{ok=writeSave(localStorage,progress,protection);}catch{}
 saved=ok;writeFailed=!ok;$('#storage-warning').hidden=ok;if(!ok)text('#storage-warning',warning(protection));text('#save-status',ok?'已保存到此浏览器 · 刷新后暂停恢复':'本次为临时进度 · 请留意保存提示');return ok;
}
function selected(){return g.actors.find(a=>a.id===selectedActor)||g.actors[0];}
function setActor(id){if(!g.actors.some(a=>a.id===id))return;selectedActor=id;render();}
function setObject(id){if(!g.objects.some(o=>o.id===id))return;selectedObject=id;render();}
function act(c){const result=command(g,c);speak(result.reason);if(result.ok)save();render();return result;}
function loadDay(index){g=createGame(index,progress.layouts[index+1]||{});selectedActor='a';selectedObject='stove';previousState='ready';acc=0;save();render();speak('准备新的一天；先看目标，再安排队列。');$('#toggle').focus();}
function retry(){if(!confirm('重新安排今天？今日行动与需求会重置，前日完成回顾和陈设位置保留。'))return;loadDay(g.level-1);}
function toggle(){if(g.state==='playing'){pause(g);speak('已暂停。可以查看和调整行动队列。');}else if(['ready','paused'].includes(g.state)){start(g);speak('日常开始。随时可暂停安排，等待原因会显示在队列中。');}save();render();}
function drawActors(){
 const structure=g.actors.map(a=>({id:a.id,name:a.name,selected:a.id===selected().id,current:a.current&&{id:a.current.id,kind:a.current.kind,phase:a.current.phase,reason:a.current.reason},queue:a.queue.map(j=>({id:j.id,kind:j.kind,joint:j.joint})),terminal:['won','lost'].includes(g.state)}));
 const markup=structure.map(a=>`<article class="actor${a.selected?' selected':''}" data-actor-card="${a.id}"><div class="actor-head"><button class="actor-select" data-actor="${a.id}" aria-pressed="${a.selected}">${esc(a.name)} <small>${a.id==='a'?'1':'2'}</small></button><small>${a.current?'正在安排中':'有空，等你安排'}</small></div><div class="needs">${Object.entries(names).map(([k,label])=>`<div class="need" data-need="${a.id}-${k}"><span>${label}</span><span data-value></span><progress max="100" value="0" aria-label="${esc(a.name)}的${label}"></progress></div>`).join('')}</div><ol class="queue">${[a.current,...a.queue].filter(Boolean).map((j,i)=>`<li><span>${i===0&&a.current?'●':'·'} ${esc(ACTIONS[j.kind].label)}${j.joint?' · 两人':''}<small>${esc(j.reason||'排队中')}</small>${i===0&&a.current?`<small data-remaining="${a.id}"></small>`:''}</span>${a.terminal?'':`<button data-cancel="${j.id}" data-owner="${a.id}" aria-label="取消${esc(a.name)}的${esc(ACTIONS[j.kind].label)}">取消</button>`}</li>`).join('')||'<li class="empty">尚未安排 · 每人最多三项</li>'}</ol></article>`).join('');
 html('#actors',markup);
 for(const a of g.actors){for(const [k,n]of Object.entries(a.needs)){const node=$(`[data-need="${a.id}-${k}"]`);node.querySelector('[data-value]').textContent=Math.floor(n);node.querySelector('progress').value=n;node.classList.toggle('low',n<g.thresholds[k]);}const rem=$(`[data-remaining="${a.id}"]`);if(rem)rem.textContent=a.current?.phase==='working'?`还需 ${a.current.remaining.toFixed(1)} 秒`:'';}
}
function render(){
 recordWin();const a=selected(),o=g.objects.find(o=>o.id===selectedObject)||g.objects[0],terminal=['won','lost'].includes(g.state);
 text('#day-number',`DAY 0${g.level} / 03`);text('#day-name',g.title);text('#day-note',g.brief);text('#phase',phases[g.state]);text('#time',`${String(Math.floor(g.time/60)).padStart(2,'0')}:${String(Math.floor(g.time%60)).padStart(2,'0')}`);text('#time-note',`当日上限 ${g.limit} 秒`);text('#room-state',g.reason);text('#meal-count',`餐食 ${g.meals} / 2`);
 html('#days',LEVELS.map((l,i)=>`<button data-day="${i}" aria-pressed="${g.level===i+1}" ${i+1>progress.unlocked?'disabled':''}>${progress.completed[i+1]?'✓ ':''}第${['一','二','三'][i]}日${i+1>progress.unlocked?' · 待开启':''}</button>`).join(''));
 html('#goals',g.goals.map(goal=>`<li class="${goal.done?'done':''}">${esc(goal.label)}</li>`).join(''));
 text('#toggle',g.state==='playing'?'暂停安排':g.state==='paused'?'继续这一天':'开始这一天');$('#toggle').disabled=terminal;
 drawActors();html('#objects',g.objects.map(obj=>`<button data-object="${obj.id}" aria-pressed="${obj.id===o.id}">${esc(obj.name)}</button>`).join(''));
 text('#object-title',o.name);const special=o.id==='stove'&&g.closure?g.closure.label:o.id==='bench'&&g.gatheringWindow?g.gatheringWindow.label:'';
 text('#object-note',`${o.busyBy?'当前有人使用，后续行动会等候。':'当前空闲。'}${special}`);
 html('#actions',Object.entries(ACTIONS).filter(([,v])=>v.target===o.id&&(!v.joint||g.actors.length===2)).map(([kind,v])=>`<button data-action="${kind}" ${terminal?'disabled':''}>${esc(v.label)}${v.joint?' · 两人':''}<small>${esc(v.description)} / ${v.duration}秒</small></button>`).join(''));
 html('#placement',['desk','bench'].includes(o.id)?`<span>${g.state==='ready'?'开始前可选位置（不消耗时间）':'陈设已固定，重试时可重新调整'}</span><div>${o.placements.map((p,i)=>`<button data-place="${i}" aria-pressed="${p.x===o.x&&p.y===o.y}" ${g.state!=='ready'?'disabled':''}>位置 ${String.fromCharCode(65+i)}</button>`).join('')}</div>`:'');
 html('#events',g.events.slice().reverse().map(e=>`<li><time>${e.time.toFixed(1)}s</time> · ${esc(e.text)}</li>`).join('')||'<li>开始行动后，这里会记录近期完成和等待安排。</li>');text('#event-count',`最近 ${g.events.length} 条 · 随进度保存`);
 $('#result').hidden=!terminal;
 if(terminal){const final=g.state==='won'&&g.level===3;text('#result-label',final?'THREE DAYS, ONE LITTLE HOME':g.state==='won'?'A DAY WELL ARRANGED':'TRY A DIFFERENT RHYTHM');text('#result-title',final?'三日小屋，留一盏窗灯。':g.state==='won'?'今日的小事，都安顿好了。':'今天还没安排好，再试一次。');text('#result-copy',g.state==='won'?`${g.time.toFixed(1)}秒完成今日目标。${final?'三天回顾保留在此；可选择已开启的一天重新安排。':'前日成果已保留，下一天开始全新的需求与目标。'}`:g.reason);$('#next').hidden=g.state!=='won'||final;
  html('#review',Object.values(progress.completed).map(d=>`<article><strong>${esc(d.title)}</strong>${d.time.toFixed(1)}秒 · ${d.people.map(p=>esc(p.name)).join('、')}完成目标</article>`).join(''));
 }
 renderer.draw(g,performance.now()/1000,{selectedActor:a.id,selectedObject:o.id});
}
$('#toggle').addEventListener('click',toggle);$('#retry').addEventListener('click',retry);$('#result-retry').addEventListener('click',retry);$('#next').addEventListener('click',()=>{if(g.state==='won'&&g.level<3)loadDay(g.level);});
$('#days').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;const index=Number(b.dataset.day);if(index+1===g.level||index+1>progress.unlocked)return;if(!['ready','won','lost'].includes(g.state)&&!confirm('离开当前日并重新准备所选日？已完成日的回顾保留。'))return;loadDay(index);});
$('#actors').addEventListener('click',e=>{const c=e.target.closest('[data-cancel]'),a=e.target.closest('[data-actor]');if(c)act({type:'cancel',actor:c.dataset.owner,jobId:c.dataset.cancel});else if(a)setActor(a.dataset.actor);});
$('#objects').addEventListener('click',e=>{const b=e.target.closest('[data-object]');if(b)setObject(b.dataset.object);});
$('#actions').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)act({type:'enqueue',actor:selected().id,kind:b.dataset.action,target:selectedObject});});
$('#placement').addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(!b)return;const o=g.objects.find(o=>o.id===selectedObject),p=o.placements[Number(b.dataset.place)];act({type:'place',object:o.id,x:p.x,y:p.y});});
$('#room').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect(),hit=hitTest(g,(e.clientX-r.left)*900/r.width,(e.clientY-r.top)*650/r.height);if(hit?.type==='actor')setActor(hit.id);if(hit?.type==='object')setObject(hit.id);});
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('a,button,input,select,textarea,summary,[contenteditable]'))return;if(e.key==='1'||e.key==='2'){setActor(e.key==='1'?'a':'b');e.preventDefault();}else if(e.key.toLowerCase()==='p'){if(!['won','lost'].includes(g.state))toggle();e.preventDefault();}});
function interrupt(){if(pause(g)){save();render();speak('已自动暂停。返回后点“继续这一天”，不会自动扣时。');}lastStamp=0;}
window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});window.addEventListener('pagehide',()=>{pause(g);save();});
export const diagnostics={snapshot:()=>snapshot(g),progress:()=>JSON.parse(JSON.stringify(progress)),storage:()=>({protection,writeFailed,saved}),selection:()=>({selectedActor,selectedObject})};
function frame(stamp){const dt=lastStamp?Math.min(.1,(stamp-lastStamp)/1000):0;lastStamp=stamp;update(g,dt);acc+=dt;if(g.state!==previousState){previousState=g.state;recordWin();save();render();if(['won','lost'].includes(g.state)){$('#result').focus();speak(g.reason);}}else if(acc>=.1){acc=0;render();}if(g.state==='playing'&&stamp-lastSave>1000){lastSave=stamp;save();}renderer.draw(g,stamp/1000,{selectedActor:selected().id,selectedObject});requestAnimationFrame(frame);}
$('#load-status').hidden=true;$('#app').hidden=false;render();if(g.state==='paused')speak('已恢复今日安排；当前暂停，点继续后原队列与计时接续。');else if(['won','lost'].includes(g.state)){$('#result').focus();speak(g.reason);}if(protection){writeFailed=true;$('#storage-warning').hidden=false;text('#storage-warning',warning(protection));text('#save-status','原存档已保护 · 本次临时游玩');}else text('#save-status',g.time>0?'已恢复进度 · 继续前时间不会前进':'准备安排 · 操作后自动保存');requestAnimationFrame(frame);
