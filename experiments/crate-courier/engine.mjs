// Deterministic movement/throw rules shared by all authored chapters.
import {LEVELS,LEVEL,getLevel} from './levels.mjs?v=crate-courier-seven-fourth-cue-1';
export {LEVELS,LEVEL,getLevel};
export const STEP=1/120;
const G=1260,BOX_G=1080,SPEED=216,JUMP=-490,BOX_SIZE=30;
const rect=a=>({x:a.x-a.w/2,y:a.y-a.h,w:a.w,h:a.h});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const boxRect=b=>({x:b.x-15,y:b.y-30,w:30,h:30});
export const heldBox=g=>g.boxes.find(b=>b.id===g.player.holding)||null;
export const pickupBox=g=>g.boxes.filter(b=>b.mode==='rest'&&Math.abs(b.y-g.player.y)<19&&Math.abs(b.x-g.player.x)<55).sort((a,b)=>Math.abs(a.x-g.player.x)-Math.abs(b.x-g.player.x))[0]||null;
const event=(g,type,extra={})=>{g.lastEvent={type,tick:g.tick,...extra};g.events.push(g.lastEvent);if(g.events.length>36)g.events.shift();};
function makeStage(stageIndex,levelVersion=2){const level=getLevel({stageIndex,levelVersion});return {stageIndex,...([5,6].includes(stageIndex)?{levelVersion}:{}),phase:'ready',tick:0,player:{x:110,y:440,vx:0,vy:0,w:28,h:46,face:1,grounded:true,support:'start-dock',hp:3,invulnerable:0,holding:null,coyote:.08,buffer:0,pose:0},
  boxes:level.supplies.map((s,i)=>({id:'box-'+i,source:s.id,x:s.x,y:s.y,vx:0,vy:0,mode:'rest',armed:false,age:0,angle:0})),
  enemies:level.enemies.map(e=>({...e,w:38,h:32,alive:true,hitAt:-1})),sources:level.supplies.map(s=>({...s,cooldown:0})),
  previous:{},events:[],lastEvent:null,learned:{lift:false,throw:false,jump:false,hit:false},result:null,run:{shots:0,hits:0,damage:0,jumps:0,places:0}};}
export function createGame(){return {...makeStage(0),journey:{completed:[],retries:LEVELS.map(()=>0)}};}
export function command(g,name){
  if(name==='start'&&g.phase==='ready'){g.phase='playing';event(g,'start');return true;}
  if(name==='pause'&&g.phase==='playing'){g.phase='paused';g.previous={};return true;}
  if(name==='resume'&&g.phase==='paused'){g.phase='playing';g.previous={};return true;}
  if(name==='retry'){const journey=g.journey,index=g.stageIndex,levelVersion=[5,6].includes(index)?(g.levelVersion??1):2;journey.retries[index]=(journey.retries[index]||0)+1;Object.assign(g,makeStage(index,levelVersion));g.journey=journey;g.phase='playing';return true;}
  if(name==='next'&&g.phase==='won'&&g.stageIndex<LEVELS.length-1){const journey=g.journey;Object.assign(g,makeStage(g.stageIndex+1));g.journey=journey;return true;}
  if(name==='restart'&&g.phase==='won'&&g.stageIndex===LEVELS.length-1){Object.assign(g,createGame());delete g.levelVersion;return true;}
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
  if(g.events.some(e=>e.type==='hurt'&&g.tick-e.tick<90))return '巡逻机撞到你，体力减一；角色闪烁时暂时不会再次受伤。';
  if(g.events.some(e=>e.type==='enemy-hit'&&g.tick-e.tick<90))return '投中巡逻机！这台已清除，继续看落脚点。';
  if(g.lastEvent?.type==='place-blocked'&&g.tick-g.lastEvent.tick<180)return '这里被挡住了，木箱还在手上。换个位置再轻放。';
  if(g.stageIndex===6&&g.levelVersion===2&&p.support==='box-0')return '箱子挡住巡逻并垫高了脚；从箱顶朝右跳上第一段货架。';
  if(g.stageIndex===3&&p.support==='box-3'&&g.boxes[3].x>=2050){
    const edge=getLevel(g).solids.find(s=>s.id==='arrival-shelf').x;
    return g.boxes[3].x<edge-15?'从外沿箱顶先向上跳，再按右越过架边，走到上层门口。':'箱子在高架下，跳不穿架底；走下箱子，在右岸按 J 捡回后放到左外沿金带。';
  }
  if(g.stageIndex>=3&&p.support?.startsWith('box-'))return '你正站在箱顶；先走下箱子，再从旁边按 J 举起。';
  if(g.stageIndex===1){if(p.x<470)return '终点在上层。先看矮货台和货架；箱子可投敌，也可轻放垫脚。';if(p.x>2120&&p.y>360)return '转运台在上方；阶梯在左侧，可以从下层回头再找落脚点。';if(p.y<300)return '沿上层货架前往亮灯的门口。看清落脚点，每跳一次松开再按。';if(p.x<1500)return p.y<360?'沿货台前进，发射高度要与巡逻机相近。每跳一次松开再按。':'下层能投箱开路；货架上另有一条路。空中保持方向，每跳重新按。';return '矮货台接上转运台。爬上亮灯的上层门口，不必清空所有巡逻。';}
  if(g.stageIndex===2){if(p.x<700)return '这一段回灯港。举投清路或跳上货架，越过第一道水道。';if(p.x<1600)return '矮货台能登上上层；也可沿下层前进。看落点出手，每跳松开再按。';return '越过最后水道，在亮灯的回湾站收尾。空中保持方向，箱子不用带到终点。';}
  if(g.stageIndex===3){
    if(p.x<1750)return '错层货栈：带箱清路或踩架绕行；落地箱去落点捡，损坏或落水才回补给点。';
    if(p.x<2050)return '末道左岸的木箱要带到右岸，放在高架左外沿金带上。';
    const edge=getLevel(g).solids.find(s=>s.id==='arrival-shelf').x,box=g.boxes[3];
    if(p.y<=getLevel(g).goalY)return '沿高架向亮灯的上层交接台走。';
    if(p.holding)return '站在高架左外沿金带左边，面右轻放；再从箱顶朝右跳上高架。';
    if(box.mode==='rest'&&box.x>=edge-15)return '箱子落在高架下；在右岸靠近按 J 捡回，退到左外沿金带再轻放。';
    if(box.mode==='rest'&&box.x>=edge-75&&box.x<edge-15)return '箱子在外沿金带；站上箱顶先向上跳，再按右越过架边。';
    if(box.x<2050)return '箱子仍在左岸，可跳回去取；右岸左外沿金带才是垫脚落点。';
    return '上层交接台才算到站；在右岸拾回箱子，放到高架左外沿金带。';
  }
  if(g.stageIndex===4)return p.x<650?'巡逻在前：投箱清下路更稳，窄货架可绕；硬闯碰撞会扣体力。':'斜桥：看虚线落点；落地箱就地捡，损坏或落水才回补给点。';
  if(g.stageIndex===5){if(g.levelVersion!==2)return p.x<2080?'晨光终递：投箱清路或走上层，再越过水道。每次跳跃都需松开再按。':'总仓在上层；留箱轻放垫脚。落地箱子去落点捡，损坏或落水才回左侧补给点。';
    if(p.x<560)return p.holding?'带箱越过前方水沟，右岸先看巡逻的走向。':'左岸木箱可以带过水沟；空手也可看准时机绕过巡逻。';
    if(p.x<770)return '带箱起跳，落到右岸再观察巡逻；跳键落地后要松开才能再次起跳。';
    if(p.x<1140)return p.holding?'先看投掷虚线与巡逻位置，再按 J 出手；也可留箱看准空档跳过。':'右岸巡逻可跳过；落地木箱就地捡，坏箱从左岸补给点恢复。';
    return '越过矮货台，右侧地面就是晨光总仓。';}
  if(g.stageIndex===6){
    if(g.levelVersion!==2){if(p.y<=332)return '上层避开下层巡逻。窄货架之间要重新按跳键，终点在最右高架。';if(p.x<600)return '北廊：在巡逻靠近前按 ↓＋J 轻放挡路，借箱上架；也可按 J 投中清下路。';if(p.x<1550)return '下层更直，但要看准投箱与水道起跳点。落地箱可捡，损坏才回补给点。';return '分拣站在上层。带末箱到空档轻放垫脚，再跳到亮灯处。';}
    if(p.y<=332)return '上层宽货架避开下层巡逻；两处断口要松开跳键再起跳，右侧落回地面到站。';
    if(p.x<600)return p.holding?'北廊岔路：在地板金色放箱区按 ↓＋J 挡机登架；或继续前行按 J 投箱清下路。':'首箱可在金色区轻放挡机登架，也可投中巡逻，选一条路。';
    if(p.x<1370)return '下层更直：看准第二箱投掷轨迹和水道起跳点；上层宽货架绕开巡逻。';
    return '交接台就在右侧地面；下层清路与上层绕行都会在这里汇合，不需末箱垫脚。';
  }
  if(p.x<355)return p.holding?'看虚线和箱形落点，再按 J 投出；↓＋J 可轻放。':'先靠近浅色木箱，按 J 举起；移动 ← →，空格跳跃。';
  if(p.x<625)return g.learned.hit?'打中了。前方断口需要跳过去，别一路直走。':'巡逻机碰到会受伤：用箱子击退，也能找时机跳过。';
  if(p.x<840)return '看清木沿：走到断口前，再按空格跳到另一边。';
  if(p.x<1350)return '下层可投箱清路；想走货架，可把箱子轻放垫脚再跳上去。';
  if(p.x<1660)return '第二道水道更宽，留出助跑位置再跳。';
  return '越过矮货台和最后的巡逻机，前面亮灯的门就是终点。';}
export function snapshot(g){return structuredClone(g);}
