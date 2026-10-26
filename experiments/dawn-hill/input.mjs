import {command} from './engine.mjs?v=dawn-slice-2';
export function attachInput({document:d,window:w,game,render,onChange=()=>{},confirm=w.confirm.bind(w)}){
  const keys=new Map(),pointers=new Map(),$=s=>d.querySelector(s),bindings={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'run',ShiftRight:'run',Space:'jump',KeyZ:'jump'};
  const input=()=>{const state={};for(const action of [...keys.values(),...pointers.values()])state[action]=true;return state;};
  function clear(){keys.clear();pointers.clear();for(const b of d.querySelectorAll('[data-hold]'))b.setAttribute('aria-pressed','false');}
  function release(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);for(const b of d.querySelectorAll('[data-hold]'))b.setAttribute('aria-pressed',[...pointers.values()].includes(b.dataset.hold)?'true':'false');}
  function change(name){clear();command(game,name);render();onChange();}
  function pause(){if(game.phase==='playing')change('pause');else if(game.phase==='paused'){change('resume');$('#world').focus({preventScroll:true});}}
  function retry(){if(game.phase==='ready')return;if(game.phase==='won'&&!confirm('再走一次晨露坡？这将替换本作已完成的现场存档。'))return;change('retry');$('#world').focus({preventScroll:true});}
  $('#start').addEventListener('click',()=>{change('start');$('#world').focus({preventScroll:true});});$('#pause').addEventListener('click',pause);$('#retry').addEventListener('click',retry);$('#result-retry').addEventListener('click',retry);
  d.addEventListener('keydown',e=>{if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;if(e.code==='KeyP'&&!e.repeat){e.preventDefault();pause();return;}if(e.code==='KeyR'&&!e.repeat){e.preventDefault();retry();return;}const action=bindings[e.code];if(!action||/^(BUTTON|SUMMARY|A)$/.test(e.target.tagName))return;if(game.phase==='playing'||game.phase==='paused'){e.preventDefault();if(game.phase==='playing'&&!e.repeat)keys.set(e.code,action);}});
  d.addEventListener('keyup',e=>{keys.delete(e.code);});
  for(const b of d.querySelectorAll('[data-hold]')){b.setAttribute('aria-pressed','false');b.addEventListener('pointerdown',e=>{if(game.phase!=='playing'||e.button>0)return;e.preventDefault();pointers.set(e.pointerId,b.dataset.hold);b.setAttribute('aria-pressed','true');try{b.setPointerCapture(e.pointerId);}catch{}});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,release);b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)release(e);});}
  // Capture may be unsupported or rejected. Releases elsewhere must still end a hold.
  w.addEventListener('pointerup',release);w.addEventListener('pointercancel',release);
  const suspend=()=>{clear();if(game.phase==='playing')change('pause');};w.addEventListener('blur',suspend);w.addEventListener('pagehide',suspend);d.addEventListener('visibilitychange',()=>{if(d.hidden)suspend();});
  return {input,clear,pause,retry,suspend};
}
