import {QuietWorld,ROOM} from './physics.mjs?v=gentle-home-d9246fd-r3';
import {createView} from './view.mjs?v=gentle-home-d9246fd-r3';
import {feedback} from './feedback.mjs?v=gentle-home-d9246fd-r3';

const $=s=>document.querySelector(s),keys=new Set(),touch=new Map();
let world=new QuietWorld(),view,last=0,mode='ready',failed=false,terminalShown=false;
const clear=()=>{keys.clear();touch.clear();};
function input(){const has=(...ks)=>ks.some(k=>keys.has(k)||[...touch.values()].includes(k));return{x:Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),z:Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp')),brake:has('ShiftLeft','ShiftRight')};}
function sync(){
  const s=world.snapshot(),f=feedback(s),terminal=s.state!=='playing';
  document.body.dataset.mode=failed?'failed':terminal?s.state:mode;
  $('#objective').textContent=f.title;$('#status').textContent=f.message;$('#sleep').value=Math.min(1,s.noise);
  $('#sleep-text').textContent=s.state==='woke'?'醒了':s.noise>.55?'睡得浅了':s.noise>.15?'动了一下':'呼吸平稳';
  $('#pause').disabled=mode==='ready'||terminal||failed;$('#pause').textContent=mode==='paused'?'继续':'暂停';
  $('#result').hidden=!terminal;$('#touch-controls').hidden=terminal||mode!=='playing'||failed;
  if(terminal){
    $('#overlay').hidden=true;$('#result-title').textContent=f.title;$('#result-copy').textContent=f.message;
    $('#result-retry').textContent=s.state==='charged'?'再走一遍':'回入口再试';
    if(!terminalShown){terminalShown=true;$('#result-retry').focus({preventScroll:true});}
  }
}
function begin(){
  if(failed)return;if(world.state!=='playing')world.retry();clear();terminalShown=false;mode='playing';
  $('#overlay').hidden=true;last=performance.now();$('#stage').focus();sync();
}
function pause(){
  if(mode!=='playing'||world.state!=='playing')return;mode='paused';clear();$('#overlay').hidden=false;
  $('#overlay-title').textContent='先歇一会儿。';$('#overlay-copy').textContent='一切停在这里，继续时仍由你掌舵。';$('#start').textContent='继续回窝';sync();
}
function crash(){
  if(failed)return;failed=true;$('#result').hidden=true;$('#pause').disabled=true;$('#retry').disabled=true;mode='paused';clear();
  document.body.dataset.mode='failed';$('#touch-controls').hidden=true;$('#overlay').hidden=false;
  $('#overlay-title').textContent='三维画面没有准备好。';$('#overlay-copy').textContent='请重新加载。本实验需要可用的 WebGL2，当前设备图形兼容性可能受限。';
  $('#start').hidden=true;$('#reload').hidden=false;
}
$('#start').onclick=begin;$('#pause').onclick=()=>mode==='paused'?begin():pause();
$('#retry').onclick=$('#result-retry').onclick=()=>{world.retry();begin();};$('#reload').onclick=()=>location.reload();
$('#help').onclick=()=>{pause();$('#help-dialog').showModal();$('#close-help').focus();};
$('#close-help').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('close',()=>$('#help').focus());
// Native button activation, browser chords and the open manual retain their keys.
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;
  if(e.target.closest('button,a')&&['Enter','Space'].includes(e.code))return;
  if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)(mode==='paused'?begin():pause());return;}
  if(mode!=='playing')return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const b of document.querySelectorAll('[data-key]')){
  b.onpointerdown=e=>{if(mode!=='playing')return;e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,b.dataset.key);};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>touch.delete(e.pointerId));
}
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
$('#stage').addEventListener('webglcontextlost',e=>{e.preventDefault();crash();});
function frame(now){
  if(failed)return;const dt=Math.max(0,Math.min(.1,(now-last)/1000||0));last=now;const controls=input();
  if(mode==='playing'&&world.state==='playing'){world.step(controls,dt);if(world.state!=='playing')clear();}
  try{view.draw(world.snapshot(),{dt,paused:mode==='paused',brake:controls.brake});sync();}catch{crash();return;}
  requestAnimationFrame(frame);
}
try{view=createView($('#stage'),ROOM);view.draw(world.snapshot());window.quietBootReady?.();$('#start').disabled=false;sync();requestAnimationFrame(frame);}catch{crash();}
export function diagnostics(){return{mode,failed,...world.snapshot()};}
