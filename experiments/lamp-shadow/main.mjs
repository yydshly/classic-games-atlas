import {SAVE_KEY,STAGES,newRecord,validateRecord,createRun,tile,guardPosition,guardFacing,sightCells,seen,move,chime,tick,finish,snapshot} from './engine.mjs';

const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
let record;try{record=validateRecord(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{record=newRecord();}
let run=record.run||createRun(1), selected=run.stage, last=performance.now(),savedAt=0;
let stageListSignature='';
let startBlockUntil=0;
const held=new Set();let moveTimer=0;
function persist(){record.run=run;try{localStorage.setItem(SAVE_KEY,JSON.stringify({...record,run:snapshot(run)}));}catch{run.notice='浏览器无法写入存档；本次操作仍可继续。';}}
function stopInput(){held.clear();clearInterval(moveTimer);moveTimer=0;}
function pickDir(){return [...held].at(-1);}
function step(){const dir=pickDir();if(!dir)return;const before=run.phase;if(move(run,dir)){
  if(['won','complete'].includes(run.phase)&&before==='running'){stopInput();finish(record,run);}
  persist();render();
}}
function startHold(dir){held.delete(dir);held.add(dir);step();if(!moveTimer)moveTimer=setInterval(step,180);}
function endHold(dir){held.delete(dir);if(!held.size){clearInterval(moveTimer);moveTimer=0;}}
function start(){if(run.phase==='ready'&&performance.now()>=startBlockUntil){run.phase='running';run.notice='取档案，躲开灯束，再去北门。';persist();render();if(matchMedia('(max-width:800px)').matches)canvas.scrollIntoView({block:'start',behavior:'auto'});}}
function pause(){if(run.phase==='running'){stopInput();run.phase='paused';run.notice='已暂停；刷新仍保留本段位置。';persist();render();}}
function resume(){if(run.phase==='paused'){run.phase='running';run.notice='继续潜行。';last=performance.now();persist();render();}}
function retryDialog(){stopInput();if(!$('confirm').open)$('confirm').showModal();}
function stageSelect(n){if(n>record.unlocked||['running','paused'].includes(run.phase))return;stopInput();selected=n;run=createRun(n);persist();render();}
function next(){if(run.phase!=='won'||run.stage>=5)return;stageSelect(run.stage+1);startBlockUntil=performance.now()+420;render();setTimeout(render,430);}
function sound(){if(chime(run)){persist();render();}}
function draw(){
  const cw=60,ch=60;ctx.clearRect(0,0,660,540);
  ctx.fillStyle='#09232b';ctx.fillRect(0,0,660,540);
  for(let y=0;y<9;y++)for(let x=0;x<11;x++){
    const t=tile(run,x,y),px=x*cw,py=y*ch;
    ctx.fillStyle=(x+y)%2?'#183740':'#1b3d45';ctx.fillRect(px,py,60,60);
    ctx.strokeStyle='#35606866';ctx.strokeRect(px+.5,py+.5,59,59);
    if(t==='#'){
      ctx.fillStyle='#284349';ctx.fillRect(px+3,py+3,54,54);ctx.fillStyle='#486166';ctx.fillRect(px+3,py+3,54,7);
      ctx.strokeStyle='#5f7978';ctx.strokeRect(px+3.5,py+3.5,53,53);
    }else if(t==='D'&&!run.collected.includes(`${x},${y}`)){
      ctx.fillStyle='#5dbfc7';ctx.shadowColor='#7ee4ea';ctx.shadowBlur=18;ctx.fillRect(px+19,py+17,22,27);ctx.shadowBlur=0;
      ctx.fillStyle='#dcfafa';ctx.fillRect(px+23,py+22,14,2);ctx.fillRect(px+23,py+28,11,2);
    }else if(t==='X'){
      ctx.fillStyle='#50755c';ctx.fillRect(px+7,py+5,46,51);ctx.fillStyle='#b5df9b';ctx.fillRect(px+15,py+9,30,6);
      ctx.fillStyle='#ecf6d5';ctx.font='bold 12px sans-serif';ctx.fillText('出口',px+18,py+37);
    }
  }
  for(const g of run.guards){
    ctx.fillStyle='#f2cd6388';for(const [x,y] of sightCells(run,g))ctx.fillRect(x*60+3,y*60+3,54,54);
  }
  for(const g of run.guards){
    const [x,y]=guardPosition(g),px=x*60+30,py=y*60+30;
    ctx.fillStyle='#d8ad61';ctx.beginPath();ctx.arc(px,py,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#513b30';ctx.fillRect(px-12,py-6,24,10);
    const face=guardFacing(g);ctx.fillStyle='#fff1bb';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText(({up:'↑',down:'↓',left:'←',right:'→'})[face],px,py+7);ctx.textAlign='left';
  }
  const px=run.x*60+30,py=run.y*60+30;
  ctx.fillStyle=seen(run)?'#f09a7b':'#d2e6c5';ctx.beginPath();ctx.arc(px,py,17,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1d4651';ctx.fillRect(px-9,py-8,18,12);ctx.fillStyle='#bbdce0';ctx.fillRect(px+4,py-6,6,3);
  if(run.suspicion>0){ctx.strokeStyle='#ff8e6f';ctx.lineWidth=4;ctx.beginPath();ctx.arc(px,py,23,-Math.PI/2,-Math.PI/2+Math.PI*2*run.suspicion/.7);ctx.stroke();ctx.lineWidth=1;}
  if(['paused','failed','won','complete'].includes(run.phase)){
    ctx.fillStyle='#07171dc4';ctx.fillRect(0,0,660,540);ctx.fillStyle='#f1f2da';ctx.font='bold 31px sans-serif';ctx.textAlign='center';
    ctx.fillText(({paused:'已暂停',failed:'被发现 · 本段可重试',won:'档案已交接',complete:'五段任务完成'})[run.phase],330,260);ctx.textAlign='left';
  }
}
function render(){
  $('stage-title').textContent=run.plan.name;$('stage-lesson').textContent=run.plan.lesson;
  $('docs').textContent=`${run.collected.length}/${run.plan.documents}`;$('chimes').textContent=String(run.chimes);$('steps').textContent=String(run.steps);$('seen').textContent=`${Math.round(run.suspicion/.7*100)}%`;
  $('phase').textContent=({ready:'准备进入 · 可选已解锁段落',running:'潜行中 · 观察巡卫灯束',paused:'已暂停 · P 继续',failed:'被发现 · 重试本段',won:'已通过 · 进入下一段',complete:'五段完成 · 可重玩已解锁段落'})[run.phase];
  $('notice').textContent=run.notice;$('start').hidden=run.phase!=='ready';$('start').disabled=run.phase==='ready'&&performance.now()<startBlockUntil;$('next').hidden=run.phase!=='won';$('pause').disabled=run.phase!=='running';$('resume').hidden=run.phase!=='paused';$('chime').disabled=run.phase!=='running'||run.chimes<=0;
  $('flow').hidden=!['ready','won'].includes(run.phase);$('flow').disabled=run.phase==='ready'&&performance.now()<startBlockUntil;$('flow').textContent=run.phase==='won'?'进入下一段':'开始本段';
  $('record').textContent=`已完成 ${record.completed.length}/5 段。${record.best[run.stage]?`本段最佳 ${record.best[run.stage].time} 秒，${record.best[run.stage].steps} 步。`:''}本版独立存档。`;
  const signature=`${selected}:${record.unlocked}:${run.phase}`;
  if(stageListSignature!==signature){stageListSignature=signature;$('stage-list').replaceChildren(...STAGES.map(p=>{const b=document.createElement('button');b.textContent=String(p.id);b.title=p.name;b.className=p.id===selected?'current':'';b.disabled=p.id>record.unlocked||['running','paused'].includes(run.phase);b.addEventListener('click',()=>stageSelect(p.id));return b;}));}
  draw();
}
$('start').addEventListener('click',start);$('next').addEventListener('click',next);$('flow').addEventListener('click',()=>{run.phase==='ready'?start():next();});$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);$('chime').addEventListener('click',sound);$('retry').addEventListener('click',retryDialog);
$('cancel').addEventListener('click',()=>$('confirm').close());$('accept').addEventListener('click',()=>{run=createRun(run.stage);$('confirm').close();persist();render();});
$('confirm').addEventListener('cancel',()=>stopInput());
const keyDirs={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
window.addEventListener('keydown',e=>{
  if($('confirm').open)return;
  if(keyDirs[e.code]){e.preventDefault();if(!held.has(keyDirs[e.code]))startHold(keyDirs[e.code]);return;}
  if(e.repeat)return;
  if(e.code==='KeyP'){e.preventDefault();run.phase==='running'?pause():resume();}
  else if(e.code==='KeyR'){e.preventDefault();retryDialog();}
  else if(e.code==='KeyQ'){e.preventDefault();sound();}
  else if((e.code==='Enter'||e.code==='Space')&&document.activeElement===document.body){e.preventDefault();start();}
});
window.addEventListener('keyup',e=>{if(keyDirs[e.code])endHold(keyDirs[e.code]);});
for(const b of document.querySelectorAll('[data-dir]')){
  const dir=b.dataset.dir;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);startHold(dir);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>endHold(dir));
}
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function frame(now){const dt=Math.min(.08,(now-last)/1000);last=now;if(run.phase==='running'){const prior=run.phase;tick(run,dt);if(run.phase!==prior){stopInput();persist();}if(now-savedAt>500){persist();savedAt=now;}render();}requestAnimationFrame(frame);}
render();requestAnimationFrame(frame);
