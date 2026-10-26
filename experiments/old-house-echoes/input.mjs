const KEYS={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ShiftLeft:'aim',ShiftRight:'aim',Space:'fire'};
export function bindInput({target,canvas,controls,active,onAction,onBlur}){
 const keys=new Map(),pointers=new Map();
 const clear=()=>{keys.clear();pointers.clear();controls.querySelectorAll('[data-hold]').forEach(b=>b.classList.remove('held'));};
 const editing=e=>/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)||e.target?.isContentEditable;
 const down=e=>{
  if(editing(e)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(['KeyP','Escape','KeyB','KeyM','KeyE'].includes(e.code)){
   if(e.repeat)return;if(e.code==='KeyE'&&!active())return;e.preventDefault();clear();onAction({KeyP:'pause',Escape:'escape',KeyB:'pack',KeyM:'map',KeyE:'interact'}[e.code]);return;
  }
  if(!KEYS[e.code]||!active())return;
  if(e.target!==canvas&&e.target!==target.body)return;
  e.preventDefault();if(!e.repeat)keys.set(e.code,KEYS[e.code]);
 };
 const up=e=>{if(KEYS[e.code]){keys.delete(e.code);if(e.target===canvas)e.preventDefault();}};
 const pdown=e=>{const b=e.target.closest('[data-hold]');if(!b||!active())return;e.preventDefault();try{b.setPointerCapture?.(e.pointerId);}catch{/* Capture can fail after cancellation; release handlers still apply. */}pointers.set(e.pointerId,b.dataset.hold);b.classList.add('held');};
 const pup=e=>{pointers.delete(e.pointerId);controls.querySelectorAll('[data-hold]').forEach(b=>b.classList.toggle('held',[...pointers.values()].includes(b.dataset.hold)));};
 const blur=()=>{clear();onBlur();};
 target.addEventListener('keydown',down);target.addEventListener('keyup',up);controls.addEventListener('pointerdown',pdown);target.addEventListener('pointerup',pup);target.addEventListener('pointercancel',pup);controls.addEventListener('lostpointercapture',pup);target.defaultView.addEventListener('blur',blur);const visibility=()=>{if(target.hidden)blur();};target.addEventListener('visibilitychange',visibility);
 return {read:()=>Object.fromEntries([...keys.values(),...pointers.values()].map(k=>[k,true])),clear,destroy(){clear();target.removeEventListener('keydown',down);target.removeEventListener('keyup',up);controls.removeEventListener('pointerdown',pdown);target.removeEventListener('pointerup',pup);target.removeEventListener('pointercancel',pup);controls.removeEventListener('lostpointercapture',pup);target.defaultView.removeEventListener('blur',blur);target.removeEventListener('visibilitychange',visibility);}};
}
