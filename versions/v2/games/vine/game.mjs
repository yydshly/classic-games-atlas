import {LEVELS,DIRS} from './levels.mjs';
import {createGame,start,pause,enqueue,update,checkpoint,restore} from './engine.mjs';
import {Renderer} from './renderer.mjs';
const $=s=>document.querySelector(s),KEY='classic-atlas.vine.open-gardens.v2';
let stored=null,storageOK=true;
let raw=null;try{raw=localStorage.getItem(KEY);}catch{storageOK=false;}
try{stored=JSON.parse(raw||'null');}catch{stored=null;}
let g=restore(stored)||createGame(),previous=performance.now(),gesture=null;
const renderer=new Renderer($('#field'));
function save(){try{const cp=checkpoint(g);if(cp)localStorage.setItem(KEY,JSON.stringify(cp));else localStorage.removeItem(KEY);}catch{storageOK=false;}$('#save-note').textContent=storageOK?'本机自动存档 · 恢复后先暂停，再主动继续。':'存储不可用：仍可游玩，刷新将无法恢复进度。';}
function hud(){const l=LEVELS[g.level-1];$('#map-name').textContent=l.name;$('#harvest').textContent=g.collected+' / '+l.target;$('#length').textContent=g.body.length;$('#ticks').textContent=g.ticks;$('#subtitle').textContent=l.subtitle;$('#tip').textContent=l.tip;$('#goal').textContent='收集 '+l.target+' 枚青芽 → 归门';$('#pause').disabled=!['playing','paused'].includes(g.state);$('#pause').textContent=g.state==='paused'?'继续 P':'暂停 P';document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===g.level-1)));$('#route-status').textContent=(g.collected>=l.target?'出口已亮 · 进入右上角拱门':g.waitingFood?'暂时没有可达空位，先移动释放空间':'花芽在空地萌发 · 为尾巴留条退路')+'　'+(g.queue.length?'缓冲 '+g.queue.map(d=>['→','↓','←','↑'][d]).join(' '):'');
$('#result').hidden=g.state==='playing';const messages={ready:[l.name+' · 准备出发','收集 '+l.target+' 枚青芽，再进入右上方出口。','开始生长'],paused:['已暂停 · 路还在这里','身体、青芽和方向保留。继续后等待完整一拍。','继续生长'],lost:[g.lossReason==='wall'?'碰到石壁了':'碰到自己的身体了','已收集 '+g.collected+' / '+l.target+' 枚。重试保留同一种子。','再试一次'],won:['这片花园，已经向光。',l.target+' 枚青芽收齐 · '+g.ticks+' 步归门','重游本图']};if(messages[g.state]){const[t,c,b]=messages[g.state];$('#result-title').textContent=t;$('#result-copy').textContent=c;$('#primary').textContent=b;}renderer.draw(g);}
function reset(index){g=index===undefined?createGame(g.level-1,g.seed):createGame(index);gesture=null;save();hud();}
function focus(){$('#field').focus({preventScroll:true});}
function primary(){if(g.state==='ready')start(g);else if(g.state==='paused')pause(g);else{reset();start(g);}previous=performance.now();save();hud();focus();}
function toggle(){if(pause(g)){gesture=null;previous=performance.now();save();hud();}}
function direction(d){if(enqueue(g,d))hud();}
function autoPause(){gesture=null;if(g.state==='playing'){pause(g);save();hud();}}
$('#primary').onclick=primary;$('#pause').onclick=toggle;$('#retry').onclick=()=>reset();document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>reset(Number(b.dataset.level)));
const keys={ArrowRight:0,KeyD:0,ArrowDown:1,KeyS:1,ArrowLeft:2,KeyA:2,ArrowUp:3,KeyW:3};
document.addEventListener('keydown',e=>{if(e.metaKey||e.altKey||e.ctrlKey||e.repeat||e.target.matches('input,select,textarea'))return;if(e.code in keys){e.preventDefault();direction(keys[e.code]);}else if(['KeyP','Escape'].includes(e.code)){e.preventDefault();toggle();}else if(e.code==='KeyR'){e.preventDefault();reset();}});
for(const b of document.querySelectorAll('[data-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();direction(Number(b.dataset.dir));});b.onclick=e=>{if(e.detail===0)direction(Number(b.dataset.dir));};}
const canvas=$('#field');canvas.addEventListener('pointerdown',e=>{if(g.state!=='playing'||gesture)return;e.preventDefault();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,sent:false};canvas.setPointerCapture(e.pointerId);});function swipe(e){if(gesture?.id!==e.pointerId||gesture.sent)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.hypot(dx,dy)<14)return;gesture.sent=true;direction(Math.abs(dx)>Math.abs(dy)?dx>0?0:2:dy>0?1:3);}canvas.addEventListener('pointermove',swipe);canvas.addEventListener('pointerup',e=>{swipe(e);gesture=null;});for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>gesture=null);
window.addEventListener('blur',autoPause);window.addEventListener('pagehide',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function frame(now){const ticks=g.ticks,state=g.state;update(g,Math.max(0,(now-previous)/1000));previous=now;if(ticks!==g.ticks||state!==g.state){save();hud();}requestAnimationFrame(frame);}
save();hud();requestAnimationFrame(frame);
// Read-only snapshot for reproducible controller tests; no state mutation hook.
export const diagnostics=()=>JSON.parse(JSON.stringify(g));
