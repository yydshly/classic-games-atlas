// Deterministic movement/throw rules shared by three authored chapters.
import {LEVELS,LEVEL,getLevel} from './levels.mjs?v=crate-slice-3';
export {LEVELS,LEVEL,getLevel};
export const STEP=1/120;
const G=1260,BOX_G=1080,SPEED=216,JUMP=-490,BOX_SIZE=30;
const rect=a=>({x:a.x-a.w/2,y:a.y-a.h,w:a.w,h:a.h});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const boxRect=b=>({x:b.x-15,y:b.y-30,w:30,h:30});
export const heldBox=g=>g.boxes.find(b=>b.id===g.player.holding)||null;
export const pickupBox=g=>g.boxes.filter(b=>b.mode==='rest'&&Math.abs(b.y-g.player.y)<19&&Math.abs(b.x-g.player.x)<55).sort((a,b)=>Math.abs(a.x-g.player.x)-Math.abs(b.x-g.player.x))[0]||null;
const event=(g,type,extra={})=>{g.lastEvent={type,tick:g.tick,...extra};g.events.push(g.lastEvent);if(g.events.length>36)g.events.shift();};
function makeStage(stageIndex){const level=LEVELS[stageIndex];return {stageIndex,phase:'ready',tick:0,player:{x:110,y:440,vx:0,vy:0,w:28,h:46,face:1,grounded:true,support:'start-dock',hp:3,invulnerable:0,holding:null,coyote:.08,buffer:0,pose:0},
  boxes:level.supplies.map((s,i)=>({id:'box-'+i,source:s.id,x:s.x,y:s.y,vx:0,vy:0,mode:'rest',armed:false,age:0,angle:0})),
  enemies:level.enemies.map(e=>({...e,w:38,h:32,alive:true,hitAt:-1})),sources:level.supplies.map(s=>({...s,cooldown:0})),
  previous:{},events:[],lastEvent:null,learned:{lift:false,throw:false,jump:false,hit:false},result:null,run:{shots:0,hits:0,damage:0,jumps:0,places:0}};}
export function createGame(){return {...makeStage(0),journey:{completed:[],retries:[0,0,0]}};}
export function command(g,name){
  if(name==='start'&&g.phase==='ready'){g.phase='playing';event(g,'start');return true;}
  if(name==='pause'&&g.phase==='playing'){g.phase='paused';g.previous={};return true;}
  if(name==='resume'&&g.phase==='paused'){g.phase='playing';g.previous={};return true;}
  if(name==='retry'){const journey=g.journey,index=g.stageIndex;journey.retries[index]++;Object.assign(g,makeStage(index));g.journey=journey;g.phase='playing';return true;}
  if(name==='next'&&g.phase==='won'&&g.stageIndex<LEVELS.length-1){const journey=g.journey;Object.assign(g,makeStage(g.stageIndex+1));g.journey=journey;return true;}
  if(name==='restart'&&g.phase==='won'&&g.stageIndex===LEVELS.length-1){Object.assign(g,createGame());return true;}
  return false;
}
function fail(g,cause){g.phase='failed';g.result={cause,x:g.player.x,y:g.player.y};event(g,'failed',{cause});}
function moveActor(g,p,dt){
  const level=getLevel(g),solids=level.solids.concat(g.boxes.filter(b=>b.mode==='rest').map(b=>({...boxRect(b),id:b.id})));
  p.x+=p.vx*dt;
  for(const s of solids)if(overlap(rect(p),s)){if(p.vx>0)p.x=s.x-p.w/2;else if(p.vx<0)p.x=s.x+s.w+p.w/2;p.vx=0;}
  p.x=Math.max(p.w/2,Math.min(level.width-p.w/2,p.x));
  const oldFeet=p.y;p.y+=p.vy*dt;p.grounded=false;p.support=null;
  for(const s of solids){const r=rect(p);if(!overlap(r,s))continue;
    if(p.vy>=0&&oldFeet<=s.y+.01){p.y=s.y;p.vy=0;p.grounded=true;p.support=s.id;}
    else if(p.vy<0&&oldFeet-p.h>=s.y+s.h-.01){p.y=s.y+s.h+p.h;p.vy=0;}
  }
}
function drop(g,b){const p=g.player,target={x:p.x+p.face*38,y:p.y-2};
  if(getLevel(g).solids.concat(g.boxes.filter(other=>other!==b&&other.mode==='rest').map(boxRect)).some(s=>overlap(boxRect(target),s))){event(g,'place-blocked');return;}
  b.mode='flying';b.armed=false;b.x=target.x;b.y=target.y;b.vx=p.face*36;b.vy=-36;b.age=0;p.holding=null;p.pose=.15;g.run.places++;event(g,'placed');}
function act(g,input){const p=g.player,b=heldBox(g);
  if(b){if(input.down){drop(g,b);return;}b.mode='flying';b.armed=true;b.x=p.x+p.face*23;b.y=p.y-48;b.vx=p.face*435;b.vy=-38;b.age=0;p.holding=null;p.pose=.22;g.learned.throw=true;g.run.shots++;event(g,'throw',{box:b.id});}
  else {const near=pickupBox(g);if(near){near.mode='held';p.holding=near.id;p.pose=.18;g.learned.lift=true;event(g,'lift',{box:near.id});}else event(g,'empty-hands');}
}
function advanceBox(g,b,dt){
  if(b.mode==='held'){b.x=g.player.x;b.y=g.player.y-49;b.angle=0;return;}
  if(b.mode!=='flying')return;
  b.age+=dt;const oldY=b.y,oldX=b.x;b.vy+=BOX_G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.vx*dt*.012;
  // The same small-step collision is used by the live model and trajectory preview.
  for(const e of g.enemies)if(b.armed&&e.alive&&overlap(boxRect(b),rect(e))){e.alive=false;e.hitAt=g.tick;b.mode='spent';g.learned.hit=true;g.run.hits++;event(g,'enemy-hit',{enemy:e.id,box:b.id,x:e.x,y:e.y});return;}
  for(const e of g.enemies)if(!b.armed&&e.alive&&overlap(boxRect(b),rect(e))){b.mode='spent';event(g,'box-broken',{box:b.id,x:b.x,y:b.y});return;}
  for(const s of getLevel(g).solids)if(overlap(boxRect(b),s)){
    if(b.vy>=0&&oldY<=s.y+.01){b.y=s.y;b.vy=0;b.vx=0;b.angle=0;b.mode='rest';b.armed=false;event(g,'box-landed',{box:b.id,x:b.x,y:b.y});}
    else if(oldX+15<=s.x||oldX-15>=s.x+s.w){b.mode='spent';event(g,'box-broken',{box:b.id,x:b.x,y:b.y});}
    else if(b.vy<0){b.y=s.y+s.h+30;b.vy=20;}
    break;
  }
  if(b.y>580){b.mode='spent';event(g,'box-water',{box:b.id});}
}
function hurt(g,e){const p=g.player;if(p.invulnerable>0)return;p.hp--;g.run.damage++;p.invulnerable=1.25;p.vx=(p.x<e.x?-1:1)*150;p.vy=-210;
  const b=heldBox(g);if(b){Object.assign(b,{mode:'flying',armed:false,x:p.x,y:p.y-49,vx:p.vx*.5,vy:-80,age:0});p.holding=null;event(g,'released-on-hurt');}event(g,'hurt',{enemy:e.id,hp:p.hp});if(p.hp===0)fail(g,'巡逻机连续撞到了你');}
export function step(g,input={}){
  if(g.phase!=='playing')return;
  const p=g.player,dt=STEP,level=getLevel(g);g.tick++;p.pose=Math.max(0,p.pose-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  const keys={left:!!input.left,right:!!input.right,jump:!!input.jump,action:!!input.action,down:!!input.down};
  const jump=keys.jump&&!g.previous.jump,action=keys.action&&!g.previous.action;g.previous=keys;
  if(jump)p.buffer=.11;else p.buffer=Math.max(0,p.buffer-dt);
  p.coyote=p.grounded?.08:Math.max(0,p.coyote-dt);
  if(p.invulnerable<1.03){p.vx=(Number(keys.right)-Number(keys.left))*SPEED;if(p.vx)p.face=Math.sign(p.vx);}
  if(p.buffer>0&&p.coyote>0){p.vy=JUMP;p.grounded=false;p.support=null;p.buffer=0;p.coyote=0;g.learned.jump=true;g.run.jumps++;event(g,'jump');}
  if(action)act(g,keys);
  p.vy+=G*dt;moveActor(g,p,dt);
  for(const e of g.enemies)if(e.alive){e.x+=e.dir*47*dt;if(e.x<e.min){e.x=e.min;e.dir=1;}if(e.x>e.max){e.x=e.max;e.dir=-1;}
    for(const b of g.boxes)if(b.mode==='rest'&&overlap(rect(e),boxRect(b))){e.x=e.dir>0?b.x-15-e.w/2:b.x+15+e.w/2;e.dir*=-1;}
  }
  for(const b of g.boxes)advanceBox(g,b,dt);
  for(const e of g.enemies)if(e.alive&&overlap(rect(p),rect(e)))hurt(g,e);
  for(const source of g.sources){const b=g.boxes.find(b=>b.source===source.id);if(b.mode==='spent'){source.cooldown+=dt;if(source.cooldown>=1.8){Object.assign(b,{x:source.x,y:source.y,vx:0,vy:0,angle:0,mode:'rest',armed:false,age:0});source.cooldown=0;event(g,'supply',{box:b.id});}}else source.cooldown=0;}
  if(p.y>575&&g.phase==='playing')fail(g,'落进了货栈之间的水道');
  if(p.x>=level.goal&&p.grounded&&(g.stageIndex===0||Math.abs(p.y-level.goalY)<.01)&&g.phase==='playing'){g.phase='won';g.result={cause:'抵达收货站',ticks:g.tick};g.journey.completed[g.stageIndex]={stageIndex:g.stageIndex,title:level.title,ticks:g.tick,hp:p.hp,retries:g.journey.retries[g.stageIndex],...g.run};event(g,'arrived');}
}
export function forecastThrow(g){if(!heldBox(g)||!['playing','paused'].includes(g.phase))return null;
  // Preview only: advance a private copy so a paused live scene stays untouched.
  const copy=structuredClone(g),id=copy.player.holding;copy.phase='playing';copy.previous.action=false;const points=[];let outcome='air';
  for(let i=0;i<100;i++){step(copy,{action:i===0});const b=copy.boxes.find(b=>b.id===id);if(i%5===0)points.push({x:b.x,y:b.y-15});
    if(b.mode!=='flying'){outcome=b.mode==='rest'?'ground':'impact';points.push({x:b.x,y:b.y-15});break;}}
  return {points,outcome};
}
export function hint(g){const p=g.player;if(g.phase==='failed')return g.result.cause+'。按 R 或“重试第'+(g.stageIndex+1)+'关”，从本关起点再试。';
  if(g.phase==='won')return getLevel(g).next;
  if(g.phase==='paused')return '已暂停。恢复后再继续，松开的按键不会残留。';
  if(g.lastEvent?.type==='place-blocked'&&g.tick-g.lastEvent.tick<180)return '这里被挡住了，木箱还在手上。换个位置再轻放。';
  if(g.stageIndex===1){if(p.x<470)return '终点在上层。先看矮货台和货架；箱子可投敌，也可轻放垫脚。';if(p.x>2120&&p.y>360)return '转运台在上方；阶梯在左侧，可以从下层回头再找落脚点。';if(p.y<300)return '沿上层货架前往亮灯的门口。看清落脚点，每跳一次松开再按。';if(p.x<1500)return p.y<360?'沿货台前进，发射高度要与巡逻机相近。每跳一次松开再按。':'下层能投箱开路；货架上另有一条路。空中保持方向，每跳重新按。';return '矮货台接上转运台。爬上亮灯的上层门口，不必清空所有巡逻。';}
  if(g.stageIndex===2){if(p.x<700)return '最后一段回灯港。举投清路或跳上货架，越过第一道水道。';if(p.x<1600)return '矮货台能登上上层；也可沿下层前进。看落点出手，每跳松开再按。';return '越过最后水道，在亮灯的回湾站收尾。空中保持方向，箱子不用带到终点。';}
  if(p.x<355)return p.holding?'看虚线和箱形落点，再按 J 投出；↓＋J 可轻放。':'先靠近浅色木箱，按 J 举起；移动 ← →，空格跳跃。';
  if(p.x<625)return g.learned.hit?'打中了。前方断口需要跳过去，别一路直走。':'巡逻机碰到会受伤：用箱子击退，也能找时机跳过。';
  if(p.x<840)return '看清木沿：走到断口前，再按空格跳到另一边。';
  if(p.x<1350)return '下层可投箱清路；想走货架，可把箱子轻放垫脚再跳上去。';
  if(p.x<1660)return '第二道水道更宽，留出助跑位置再跳。';
  return '越过矮货台和最后的巡逻机，前面亮灯的门就是终点。';}
export function snapshot(g){return structuredClone(g);}
