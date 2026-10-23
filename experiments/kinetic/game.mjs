import {KineticWorld,COURSE} from './physics.mjs';
import {createView} from './view.mjs';
import {checkpointStore} from './storage.mjs';
import {dockFeedback,ferryDeparture} from './feedback.mjs';
const $=s=>document.querySelector(s),keys=new Set(),touch=new Map(),frames=[];
let sim,view,store,state='loading',yaw=0,pitch=.48,distance=8,jumpQueued=false,cameraDrag=null,last=0,lastHud=0,started=false,graphicsFailed=false,overlayVisible=true,lastAttempt=null,plateTried=false,statusHoldUntil=0,statusContext='any';
function announce(t,hold=0,context='any'){$('#status').textContent=t;statusHoldUntil=performance.now()+hold;statusContext=context;}
function clearInput(){keys.clear();touch.clear();jumpQueued=false;cameraDrag=null;document.querySelectorAll('.pressed').forEach(e=>e.classList.remove('pressed'));}
function save(force=false){if(!sim||!store)return;const v=sim.checkpointRecord(),serial=JSON.stringify(v);if(force||serial!==lastAttempt){store.write(v);lastAttempt=serial;}$('#save-note').textContent=store.message();}
function showOverlay(title,copy,button,kicker='临港 · 一次短短的离岸'){$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#start').textContent=button;$('#overlay-kicker').textContent=kicker;$('#overlay').hidden=false;overlayVisible=true;}
function sync(){
 const s=sim.snapshot(),by=s.plateBy;$('#boat-state').textContent=ferryDeparture(s.ferry).label;
 if(by==='player'||by==='both')plateTried=true;
 const feedback=dockFeedback(s,COURSE,{plateTried});
 $('#pressure-state').textContent=feedback.detail;$('#objective').textContent=feedback.objective;
 $('#pause').disabled=state==='loading'||state==='ready';$('#pause').textContent=state==='paused'?'继续 P':state==='complete'?'到岸回顾':'暂停 P';
 $('#respawn').disabled=['loading','ready','complete'].includes(state);$('#reset-crate').disabled=['loading','complete'].includes(state);
 if((statusContext!=='any'&&statusContext!==feedback.context)||performance.now()>=statusHoldUntil){if($('#status').textContent!==feedback.message)$('#status').textContent=feedback.message;statusContext=feedback.context;statusHoldUntil=0;}
}
function begin(){if(graphicsFailed)return;if(state==='complete'){$('#overlay').hidden=true;overlayVisible=false;$('#stage').focus({preventScroll:true});return;}clearInput();state='running';$('#overlay').hidden=true;overlayVisible=false;last=performance.now();save(true);sync();$('#stage').focus({preventScroll:true});}
function pause(){if(state!=='running')return;clearInput();state='paused';save(true);showOverlay('在岸风里歇一会儿。','场景停在这里。继续后再动；刷新会回安全岸边，保留已稳定的安排。','继续这趟离岸');sync();}
function summary(){clearInput();showOverlay('这趟船，终于带上了你。','你把重量留在岸上，自己搭着渡台到了新岸。泊位灯亮起，接应已经开始。','再看看对岸','到岸 · 临港配重机 07');}
function togglePause(){if(state==='running')pause();else if(state==='paused')begin();else if(state==='complete'){if(overlayVisible){$('#overlay').hidden=true;overlayVisible=false;$('#stage').focus({preventScroll:true});}else summary();}}
function complete(){clearInput();state='complete';$('#overlay').hidden=true;overlayVisible=false;save(true);statusHoldUntil=0;sync();}
function respawn(){if(!['running','paused'].includes(state))return;clearInput();sim.respawn();save(true);sync();const f=dockFeedback(sim.snapshot(),COURSE,{plateTried});announce(f.context==='arrival'?'回到对岸的安全泊位。接应灯就在前面。':'回到安全岸边。货箱仍留在原处，可以等下一趟再试。',3000,f.context);}
function resetCrate(){if(!sim||state==='complete'||state==='loading')return;clearInput();const result=sim.resetCrate();if(result?.ok===false){announce(result.reason,5000);return;}save(true);sync();announce('只把货箱送回了可推动的位置。踏板与登船口仍按现在的重量开关。',3000);}
function openHelp(){pause();clearInput();$('#help-dialog').showModal();}
function closeHelp(){$('#help-dialog').close();$('#help').focus({preventScroll:true});}
function newJourney(){pause();clearInput();$('#restart-dialog').showModal();$('#restart-cancel').focus();}
function closeRestart(confirmed){$('#restart-dialog').close();if(confirmed){sim=new KineticWorld();state='ready';yaw=0;pitch=.48;distance=8;plateTried=false;statusHoldUntil=0;statusContext='any';save(true);showOverlay('再去赶一趟渡台。','货箱回到了岸边。换一种登船节奏，或者再看看码头的变化。','去码头看看');sync();}$('#restart').focus({preventScroll:true});}
function graphicsError(){if(graphicsFailed)return;graphicsFailed=true;clearInput();if(state==='running')state='paused';if(!['loading','ready'].includes(state))save(true);$('#error-copy').textContent='三维画面中断了。可重新加载回安全岸边；此实验需要可用的WebGL2，当前设备的图形兼容性可能受限。';window.kineticBootError();}
function collectInput(dt){
 const held=c=>keys.has(c),moves=new Set(touch.values());
 const x=Number(held('KeyD')||held('ArrowRight')||moves.has('right'))-Number(held('KeyA')||held('ArrowLeft')||moves.has('left'));
 const f=Number(held('KeyW')||held('ArrowUp')||moves.has('up'))-Number(held('KeyS')||held('ArrowDown')||moves.has('down'));
 if(held('KeyQ'))yaw+=dt*1.35;if(held('KeyE'))yaw-=dt*1.35;
 const input={x:x*Math.cos(yaw)-f*Math.sin(yaw),z:-f*Math.cos(yaw)-x*Math.sin(yaw),jump:jumpQueued,brake:held('ShiftLeft')||held('ShiftRight')||moves.has('brake')};jumpQueued=false;return input;
}
function attachControls(){
 $('#start').onclick=begin;$('#pause').onclick=togglePause;$('#respawn').onclick=respawn;$('#reset-crate').onclick=resetCrate;$('#help').onclick=openHelp;$('#help-close').onclick=closeHelp;$('#help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});$('#restart').onclick=newJourney;$('#restart-cancel').onclick=()=>closeRestart(false);$('#restart-confirm').onclick=()=>closeRestart(true);$('#restart-dialog').addEventListener('cancel',e=>{e.preventDefault();closeRestart(false);});
 const resetCamera=()=>{yaw=0;pitch=.48;distance=8;announce('镜头回到码头与航线。');};$('#reset-camera').onclick=resetCamera;
 document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
  if(e.target.closest('a,button')&&['Space','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;
  if(['KeyP','Escape'].includes(e.code)&&!e.repeat){e.preventDefault();togglePause();return;}
  if(e.code==='KeyC'&&!e.repeat){e.preventDefault();resetCamera();return;}
  if(e.code==='KeyR'&&!e.repeat){e.preventDefault();respawn();return;}
  if(e.code==='KeyB'&&!e.repeat){e.preventDefault();resetCrate();return;}
  if(state!=='running')return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight','KeyQ','KeyE','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpQueued=true;}
 });
 document.addEventListener('keyup',e=>keys.delete(e.code));
 for(const b of document.querySelectorAll('[data-move],#brake')){
  b.addEventListener('pointerdown',e=>{if(state!=='running')return;e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,b.dataset.move||'brake');b.classList.add('pressed');});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{touch.delete(e.pointerId);b.classList.remove('pressed');});
 }
 $('#jump').addEventListener('pointerdown',e=>{if(state!=='running')return;e.preventDefault();jumpQueued=true;});$('#jump').addEventListener('click',e=>{if(e.detail===0&&state==='running')jumpQueued=true;});
 const canvas=$('#stage');canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&![0,2].includes(e.button))return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointermove',e=>{if(cameraDrag?.id!==e.pointerId)return;const dx=e.clientX-cameraDrag.x,dy=e.clientY-cameraDrag.y;cameraDrag.x=e.clientX;cameraDrag.y=e.clientY;yaw-=dx*.006;pitch=Math.max(.2,Math.min(1.03,pitch+dy*.004));});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(cameraDrag?.id===e.pointerId)cameraDrag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(5,Math.min(11,distance+e.deltaY*.005));},{passive:false});
 window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});window.addEventListener('pagehide',()=>{clearInput();if(!['loading','ready'].includes(state))save(true);});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsError();});window.addEventListener('resize',()=>view.resize());
}
function frame(now){
 if(graphicsFailed)return;const realDelta=last?Math.max(0,(now-last)/1000):1/60;last=now;frames.push(realDelta);if(frames.length>180)frames.shift();const dt=Math.min(.1,realDelta);
 if(state==='running'){
  sim.step(collectInput(dt),dt);
  for(const e of sim.drainEvents()){
   if(e.type==='fall'){clearInput();const f=dockFeedback(sim.snapshot(),COURSE,{plateTried});announce(f.context==='arrival'?'落水后已回对岸泊位。留出制动距离，再向接应灯走去。':e.fellFromBoat?'从甲板边缘滑落了。回岸边再试，靠岸前可先制动。':e.reason==='no-deck-at-departure'?'渡台已离开，前方没有甲板托住你。回岸边等它靠稳再试。':'落水后已回岸边。留出制动距离，货箱安排会保留。',5000,f.context);}
   if(e.type==='crateLost'||e.type==='crate-lost')announce('货箱落进水里了。点“货箱归位”可把它单独送回岸边。',5000);
   if(e.type==='complete')complete();
  }
 }
 try{view.draw(sim.snapshot(),{yaw,pitch,distance,dt,active:state==='running'});}catch(error){console.warn('Dock renderer stopped',error);graphicsError();return;}
 if(now-lastHud>150){sync();if(state!=='ready')save();lastHud=now;}requestAnimationFrame(frame);
}
export async function init(){
 if(started)return;store=checkpointStore({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)});sim=new KineticWorld(store.record);view=createView($('#stage'),COURSE);attachControls();
 // Show an actual rendered dock before the entry button becomes actionable.
 view.draw(sim.snapshot(),{yaw,pitch,distance,dt:0,active:false});if($('#stage').getContext('webgl2').isContextLost())throw Error('WebGL context lost during first dock frame');
 started=true;$('#start').disabled=false;$('#save-note').textContent=store.message();
 if(sim.snapshot().completed){state='complete';summary();}else if(store.record){state='paused';showOverlay('岸边的安排，还在。','从安全岸边再出发。已留在踏板上的货箱会保留；渡台继续按自己的节奏往返。','回到码头');}else state='ready';sync();requestAnimationFrame(frame);
}
export function diagnostics(){return{state,physics:sim?.snapshot(),camera:{yaw,pitch,distance},input:{keys:[...keys],touch:[...touch],jumpQueued,cameraDrag:!!cameraDrag},storage:store?.status(),metrics:{...view?.metrics(),fps:frames.length/(frames.reduce((s,n)=>s+n,0)||1),frameSamples:frames.length}};}
