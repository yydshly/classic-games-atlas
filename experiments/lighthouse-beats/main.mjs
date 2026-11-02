import {BUILD,SAVE_KEY,SETS,WINDOW,fresh,createRun,dueOf,durationOf,tick,press,release,cancelHold,pause,resume,finishRecord,snapshot,restore} from './engine.mjs';
const $=id=>document.getElementById(id),canvas=$('track'),ctx=canvas.getContext('2d');
let record;try{record=restore(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{record=fresh();}
let run=record.run||createRun(1),selected=run.stage,last=performance.now(),savedAt=0,lastBeat=-1,stageSignature='',startBlockUntil=0,muted=false,audio=null,retryWasRunning=false;
const held=new Set();
const sounding=new Set();
function store(){record.run=run;try{localStorage.setItem(SAVE_KEY,JSON.stringify({...record,run:snapshot(run)}));}catch{run.feedback='本机存储不可写；离开页面可能丢失本次进度。';}}
function stopTones(){for(const o of sounding){try{o.stop();}catch{}}sounding.clear();}
function tone(freq,length=.09,gain=.06){if(muted||!audio)return;try{const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(freq,t);v.gain.setValueAtTime(gain,t);v.gain.exponentialRampToValueAtTime(.001,t+length);o.connect(v).connect(audio.destination);o.onended=()=>sounding.delete(o);sounding.add(o);o.start(t);o.stop(t+length);}catch{}}
function activateAudio(){if(muted)return;try{audio ||=new (window.AudioContext||window.webkitAudioContext)();audio.resume?.();}catch{audio=null;}}
function start(){if(run.phase!=='ready'||performance.now()<startBlockUntil)return;activateAudio();run.phase='running';run.feedback='听两拍引子，等音符到白线。';lastBeat=-1;last=performance.now();store();render();if(matchMedia('(max-width:810px)').matches)canvas.scrollIntoView({block:'start',behavior:'auto'});}
function pauseNow(){if(pause(run)){stopTones();held.clear();for(const id of ['left','right'])$(id).classList.remove('pressed');store();render();}}
function resumeNow(){if(resume(run)){activateAudio();last=performance.now();lastBeat=Math.floor(run.elapsed/run.set.beat);store();render();}}
function selectStage(n){if(n>record.unlocked||['running','paused'].includes(run.phase))return;held.clear();selected=n;run=createRun(n);store();render();}
function next(){if(run.phase!=='won'||run.stage===SETS.length)return;selectStage(run.stage+1);startBlockUntil=performance.now()+420;render();setTimeout(render,430);}
function requestRetry(){if($('confirm').open)return;retryWasRunning=run.phase==='running';if(retryWasRunning)pauseNow();held.clear();$('confirm').showModal();}
function cancelRetry(){if(!$('confirm').open)return;$('confirm').close();if(retryWasRunning)resumeNow();retryWasRunning=false;}
function inputDown(lane){if(held.has(lane))return;held.add(lane);$(lane).classList.add('pressed');if(press(run,lane))tone(lane==='left'?390:610,.10,.08);else tone(170,.06,.025);store();render();}
function inputUp(lane){if(!held.has(lane))return;held.delete(lane);$(lane).classList.remove('pressed');if(release(run,lane))tone(lane==='left'?520:720,.15,.08);store();render();}
function inputCancel(lane){if(!held.has(lane))return;held.delete(lane);$(lane).classList.remove('pressed');cancelHold(run,lane);store();render();}
function phaseText(){return ({ready:'准备演奏 · 可选已解锁曲段',running:'演奏中 · 对准白线',paused:'已暂停 · P 继续',failed:'本段失误 · 可重试',won:'已送达 · 进入下一段',complete:'五段合奏完成 · 可重玩'})[run.phase];}
function draw(){
  const w=720,h=320;ctx.clearRect(0,0,w,h);const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#102b3b');bg.addColorStop(1,'#233943');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  for(let i=0;i<25;i++){const x=(i*79+run.elapsed*15)%w;ctx.fillStyle='#d4e0cf24';ctx.fillRect(x,(i*53)%h,2,2);}
  const hit=132,space=77;for(const [j,y] of [[0,101],[1,220]]){
    ctx.fillStyle=j?'#614c37':'#275a70';ctx.fillRect(28,y-35,w-55,70);
    ctx.fillStyle=j?'#f3d694':'#a4e1ef';ctx.font='bold 20px sans-serif';ctx.fillText(j?'右铃':'左鼓',43,y+7);
  }
  const base=Math.floor(run.elapsed/run.set.beat);for(let n=Math.max(0,base-2);n<base+9;n++){
    const x=hit+(n*run.set.beat-run.elapsed)/run.set.beat*space;if(x<0||x>w)continue;
    ctx.strokeStyle=n%4===0?'#8fb5bb76':'#7893a64b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,44);ctx.lineTo(x,280);ctx.stroke();
  }
  ctx.strokeStyle='#f7f4d7';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(hit,36);ctx.lineTo(hit,284);ctx.stroke();ctx.fillStyle='#fff3c4';ctx.font='bold 17px sans-serif';ctx.fillText('正拍',hit-18,28);
  run.set.notes.forEach((n,i)=>{const x=hit+(dueOf(n,run.set)-run.elapsed)/run.set.beat*space,y=n.lane==='left'?101:220;if(x<-50||x>w+70)return;
    const state=run.grades[i];if(n.hold){ctx.fillStyle=state==='hit'?'#bfe0b0a0':'#dfdda799';ctx.fillRect(x,y-11,space*n.hold,22);}
    ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.fillStyle=state==='hit'?'#bee4b8':state==='miss'?'#83505b':n.lane==='left'?'#8fd6ed':'#f2cf87';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff8e5';ctx.stroke();ctx.fillStyle='#1a3140';ctx.font='bold 19px sans-serif';ctx.textAlign='center';ctx.fillText(state==='hit'?'✓':state==='miss'?'×':n.lane==='left'?'左':'右',x,y+7);ctx.textAlign='left';
  });
  if(['paused','failed','won','complete'].includes(run.phase)){ctx.fillStyle='#081724bb';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f1efda';ctx.font='bold 32px sans-serif';ctx.textAlign='center';ctx.fillText(({paused:'已暂停',failed:'本段未达标',won:'节拍送达',complete:'五段合奏完成'})[run.phase],w/2,h/2);ctx.textAlign='left';}
}
function render(){
  $('set-name').textContent=run.set.name;$('set-lesson').textContent=run.set.lesson;$('hits').textContent=`${run.hits}/${run.set.quota}`;$('holds').textContent=`${run.holds}/${run.set.holdQuota}`;$('errors').textContent=`${run.errors}/${run.set.maxErrors}`;$('beat').textContent=run.elapsed<2*run.set.beat?'引子':String(Math.floor(run.elapsed/run.set.beat)-1);
  $('phase').textContent=phaseText();$('feedback').textContent=run.feedback;$('start').hidden=run.phase!=='ready';$('start').disabled=run.phase==='ready'&&performance.now()<startBlockUntil;$('next').hidden=run.phase!=='won';$('flow').hidden=!['ready','won'].includes(run.phase);$('flow').disabled=run.phase==='ready'&&performance.now()<startBlockUntil;$('flow').textContent=run.phase==='won'?'进入下一段':'开始本段';$('left').disabled=run.phase!=='running';$('right').disabled=run.phase!=='running';$('pause').disabled=run.phase!=='running';$('resume').hidden=run.phase!=='paused';$('mute').textContent=muted?'开启声音':'静音';$('mute').setAttribute('aria-pressed',String(muted));
  $('record').textContent=`已完成 ${record.completed.length}/5 段。${record.best[run.stage]?`本段最佳 ${record.best[run.stage].hits} 个命中、${record.best[run.stage].errors} 次失误。`:''}独立存档。`;
  const sig=`${selected}:${record.unlocked}:${run.phase}`;if(stageSignature!==sig){stageSignature=sig;$('sets').replaceChildren(...SETS.map(s=>{const b=document.createElement('button');b.textContent=String(s.id);b.title=s.name;b.className=s.id===selected?'active':'';b.disabled=s.id>record.unlocked||['running','paused'].includes(run.phase);b.addEventListener('click',()=>selectStage(s.id));return b;}));}
  draw();
}
$('start').addEventListener('click',start);$('next').addEventListener('click',next);$('flow').addEventListener('click',()=>run.phase==='ready'?start():next());$('pause').addEventListener('click',pauseNow);$('resume').addEventListener('click',resumeNow);$('retry').addEventListener('click',requestRetry);
$('mute').addEventListener('click',()=>{muted=!muted;if(muted)stopTones();else activateAudio();render();});$('cancel').addEventListener('click',cancelRetry);$('confirm').addEventListener('cancel',e=>{e.preventDefault();cancelRetry();});$('accept').addEventListener('click',()=>{stopTones();run=createRun(run.stage);retryWasRunning=false;$('confirm').close();store();render();});
const keys={KeyA:'left',ArrowLeft:'left',KeyL:'right',ArrowRight:'right'};
window.addEventListener('keydown',e=>{if($('confirm').open)return;if(keys[e.code]){e.preventDefault();if(!e.repeat)inputDown(keys[e.code]);return;}if(e.repeat)return;if(e.code==='KeyP'){e.preventDefault();run.phase==='running'?pauseNow():resumeNow();}else if(e.code==='KeyR'){e.preventDefault();requestRetry();}});
window.addEventListener('keyup',e=>{if(keys[e.code]){e.preventDefault();inputUp(keys[e.code]);}});
for(const id of ['left','right']){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);inputDown(id);});b.addEventListener('pointerup',()=>inputUp(id));for(const ev of ['pointercancel','lostpointercapture'])b.addEventListener(ev,()=>inputCancel(id));}
window.addEventListener('blur',pauseNow);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseNow();});
function frame(now){const wall=Math.max(0,(now-last)/1000);last=now;if(run.phase==='running'){
  if(wall>.6){pauseNow();run.feedback='画面一度停顿，已自动暂停；继续后重新对拍。';store();render();requestAnimationFrame(frame);return;}
  const before=run.phase;let remaining=wall;while(remaining>0&&run.phase==='running'){const slice=Math.min(.08,remaining);tick(run,slice);remaining-=slice;}
  const beatNo=Math.floor(run.elapsed/run.set.beat);if(run.phase==='running'&&beatNo!==lastBeat){lastBeat=beatNo;tone(beatNo%4===0?570:440,.055,.035);}
  if(run.phase!==before){held.clear();for(const id of ['left','right'])$(id).classList.remove('pressed');if(['won','complete'].includes(run.phase))finishRecord(record,run);store();}
  if(now-savedAt>420){store();savedAt=now;}render();
}requestAnimationFrame(frame);}
render();requestAnimationFrame(frame);
