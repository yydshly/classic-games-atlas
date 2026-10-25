import {command,step,hint,heldBox,getLevel,LEVELS} from './engine.mjs?v=crate-slice-3';
export function attachController(root,g,{onChange=()=>{},confirmRestart}={}){
  const $=s=>root.querySelector(s),doc=root.ownerDocument,win=doc.defaultView,stage=$('#stage');
  const keyboard={},pointers=new Map(),pulses=new Map();let disposed=false,placeQueued=false;
  const queue=(key,source)=>{if(!pulses.has(key))pulses.set(key,new Set());pulses.get(key).add(source);};
  const cancelSource=source=>{for(const [key,sources]of pulses){sources.delete(source);if(!sources.size)pulses.delete(key);}};
  const mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',KeyK:'jump',KeyJ:'action',KeyE:'action',ArrowDown:'down',KeyS:'down'};
  const keys=()=>{const out={};for(const [code,value]of Object.entries(keyboard))if(value&&mapping[code])out[mapping[code]]=true;for(const v of pointers.values())out[v]=true;return out;};
  function clear(){for(const k of Object.keys(keyboard))delete keyboard[k];pointers.clear();pulses.clear();placeQueued=false;for(const b of root.querySelectorAll('.pressed'))b.classList.remove('pressed');}
  function change(name,focus=true){clear();if(!command(g,name))return;render();onChange(name);if(focus)stage.focus({preventScroll:true});}
  function render(){
    const level=getLevel(g),number=g.stageIndex+1,final=g.phase==='won'&&number===LEVELS.length;
    $('#intro').hidden=g.phase!=='ready';$('#result').hidden=!['failed','won'].includes(g.phase);
    $('#intro-chapter').textContent=`第${number}关 · ${level.title}`;$('#intro-title').textContent=number===1?'抱起木箱，开出一条路。':level.destination+'在前方';$('#intro-goal').textContent='你是递送员阿禾。'+level.introduction;$('#start').textContent=`开始第${number}关`;
    $('#pause').disabled=!['playing','paused'].includes(g.phase);$('#pause').textContent=g.phase==='paused'?'继续':'暂停';$('#retry').disabled=g.phase==='ready';
    $('#health').textContent='体力 '+Array.from({length:3},(_,i)=>i<g.player.hp?'●':'○').join(' ');
    const held=!!heldBox(g);$('#cargo').textContent=`${number}/3 · `+(held?'持箱 · J 投掷':'空手 · J 举箱');$('#action').textContent=held?'投掷':'举箱';$('#place').hidden=!held;
    for(const b of root.querySelectorAll('[data-control],#place'))b.disabled=g.phase!=='playing';
    const text=hint(g);if($('#hint').textContent!==text)$('#hint').textContent=text;
    $('#next').hidden=g.phase!=='won'||final;$('#restart').hidden=!final;$('#recap').hidden=!final;
    $('#result').classList.toggle('upper-arrival',g.stageIndex===1&&g.player.y<360);
    if(g.phase==='won'){$('#result-title').textContent=final?'三站平安走完':'第'+number+'关到站';$('#result-text').textContent=level.next;$('#result-retry').textContent='再试本关';$('#next').textContent=final?'':'下一关 · '+LEVELS[g.stageIndex+1].title;}
    if(g.phase==='failed'){$('#result-title').textContent='这次没能到站';$('#result-text').textContent=g.result.cause+'。重试只重开本关，前面已完成的章节保留。';$('#result-retry').textContent='重试第'+number+'关';}
    if(final){const signature=JSON.stringify(g.journey.completed);if($('#recap').dataset.signature!==signature){$('#recap').replaceChildren(...g.journey.completed.map(c=>{const li=doc.createElement('li');li.textContent=`${c.title}：投中${c.hits}次 · 跳${c.jumps}次 · 轻放${c.places}次 · 重试${c.retries}次`;return li;}));$('#recap').dataset.signature=signature;}}
    $('#canvas').setAttribute('aria-label',`第${number}关${level.title}：递送员位于本关 ${Math.min(100,Math.round(g.player.x/level.goal*100))}%；体力 ${g.player.hp}；${held?'持箱':'空手'}。${text}`);
  }
  const listen=(o,type,f)=>{o.addEventListener(type,f);unlisten.push(()=>o.removeEventListener(type,f));},unlisten=[];
  listen($('#start'),'click',()=>change('start'));listen($('#pause'),'click',()=>change(g.phase==='paused'?'resume':'pause'));listen($('#retry'),'click',()=>change('retry'));listen($('#result-retry'),'click',()=>change('retry'));
  listen($('#next'),'click',()=>change('next'));listen($('#restart'),'click',()=>{const yes=(confirmRestart||(()=>win.confirm('重新开始三关会替换本次旅程记录，是否继续？其他作品存档不受影响。')))();if(yes)change('restart');});
  listen(stage,'pointerdown',e=>{if(e.target===$('#canvas'))stage.focus({preventScroll:true});});
  listen(stage,'focusout',e=>{if(e.relatedTarget!==stage)clear();});
  listen(doc,'keydown',e=>{
    if(!stage.contains(doc.activeElement)||doc.activeElement?.tagName==='BUTTON')return;
    if(e.code==='KeyP'&&!e.repeat){e.preventDefault();if(['playing','paused'].includes(g.phase))change(g.phase==='paused'?'resume':'pause');return;}
    if(e.code==='KeyR'&&!e.repeat){e.preventDefault();if(g.phase!=='ready')change('retry');return;}
    if(mapping[e.code]&&g.phase==='playing'){e.preventDefault();keyboard[e.code]=true;if(!e.repeat&&['jump','action'].includes(mapping[e.code]))queue(mapping[e.code],'key:'+e.code);}
  });
  listen(doc,'keyup',e=>{delete keyboard[e.code];});
  for(const b of root.querySelectorAll('[data-control]')){
    listen(b,'pointerdown',e=>{if(g.phase!=='playing'||(e.button!==undefined&&e.button!==0))return;e.preventDefault();pointers.set(e.pointerId,b.dataset.control);if(['jump','action'].includes(b.dataset.control))queue(b.dataset.control,'pointer:'+e.pointerId);b.classList.add('pressed');b.setPointerCapture?.(e.pointerId);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(b,type,e=>{const held=pointers.has(e.pointerId);pointers.delete(e.pointerId);if(type==='pointercancel'||(type==='lostpointercapture'&&held))cancelSource('pointer:'+e.pointerId);if(![...pointers.values()].includes(b.dataset.control))b.classList.remove('pressed');});
    // Native keyboard activation of a focused button must also work.
    listen(b,'click',e=>{if(e.detail===0&&g.phase==='playing')queue(b.dataset.control,'click');});
  }
  listen($('#place'),'click',()=>{if(g.phase==='playing'&&heldBox(g))placeQueued=true;});
  listen(win,'blur',()=>{clear();if(g.phase==='playing')change('pause',false);});
  listen(doc,'visibilitychange',()=>{if(doc.hidden){clear();if(g.phase==='playing')change('pause',false);}});
  render();
  return {advance(n=1){if(disposed)return;const phase=g.phase,focusedPlace=doc.activeElement===$('#place');for(let i=0;i<n;i++){const input=keys();for(const k of pulses.keys()){if(g.previous[k]&&['jump','action'].includes(k))input[k]=false;else{input[k]=true;pulses.delete(k);}}if(placeQueued){if(g.previous.action)input.action=false;else{input.down=true;input.action=true;placeQueued=false;}}step(g,input);}if(g.phase!==phase)clear();render();if(g.phase!==phase)onChange('terminal');if(focusedPlace)stage.focus({preventScroll:true});},clear,render,keys,destroy(){clear();disposed=true;for(const f of unlisten)f();}};
}
