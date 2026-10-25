// Original, deterministic single-player action slice. No storage and no network.
export const STEP=1/120;
export const LEVEL=Object.freeze({width:2440,height:560,goal:2290,
  solids:[
    {id:'start-dock',x:0,y:440,w:660,h:120,material:'wood'},
    {id:'middle-dock',x:770,y:440,w:680,h:120,material:'wood'},
    {id:'last-dock',x:1580,y:440,w:860,h:120,material:'wood'},
    {id:'high-shelf',x:1010,y:332,w:290,h:20,material:'shelf'},
    {id:'low-freight',x:1720,y:406,w:86,h:34,material:'cargo'}
  ],
  supplies:[{id:'first',x:225,y:440},{id:'middle',x:860,y:440},{id:'last',x:1625,y:440}],
  enemies:[{id:'crawler-1',x:490,y:440,min:430,max:570,dir:-1},
    {id:'crawler-2',x:1130,y:440,min:1040,max:1250,dir:1},
    {id:'crawler-3',x:2040,y:440,min:1940,max:2140,dir:-1}]
});
const G=1260,BOX_G=1080,SPEED=216,JUMP=-490,BOX_SIZE=30;
const rect=a=>({x:a.x-a.w/2,y:a.y-a.h,w:a.w,h:a.h});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const boxRect=b=>({x:b.x-15,y:b.y-30,w:30,h:30});
export const heldBox=g=>g.boxes.find(b=>b.id===g.player.holding)||null;
export const pickupBox=g=>g.boxes.filter(b=>b.mode==='rest'&&Math.abs(b.y-g.player.y)<19&&Math.abs(b.x-g.player.x)<55).sort((a,b)=>Math.abs(a.x-g.player.x)-Math.abs(b.x-g.player.x))[0]||null;
const event=(g,type,extra={})=>{g.lastEvent={type,tick:g.tick,...extra};g.events.push(g.lastEvent);if(g.events.length>36)g.events.shift();};
export function createGame(){return {phase:'ready',tick:0,player:{x:110,y:440,vx:0,vy:0,w:28,h:46,face:1,grounded:true,support:'start-dock',hp:3,invulnerable:0,holding:null,coyote:.08,buffer:0,pose:0},
  boxes:LEVEL.supplies.map((s,i)=>({id:'box-'+i,source:s.id,x:s.x,y:s.y,vx:0,vy:0,mode:'rest',armed:false,age:0,angle:0})),
  enemies:LEVEL.enemies.map(e=>({...e,w:38,h:32,alive:true,hitAt:-1})),sources:LEVEL.supplies.map(s=>({...s,cooldown:0})),
  previous:{},events:[],lastEvent:null,learned:{lift:false,throw:false,jump:false,hit:false},result:null};}
export function command(g,name){
  if(name==='start'&&g.phase==='ready'){g.phase='playing';event(g,'start');return true;}
  if(name==='pause'&&g.phase==='playing'){g.phase='paused';g.previous={};return true;}
  if(name==='resume'&&g.phase==='paused'){g.phase='playing';g.previous={};return true;}
  if(name==='retry'){Object.assign(g,createGame());g.phase='playing';return true;}
  return false;
}
function fail(g,cause){g.phase='failed';g.result={cause,x:g.player.x,y:g.player.y};event(g,'failed',{cause});}
function moveActor(g,p,dt){
  const solids=LEVEL.solids.concat(g.boxes.filter(b=>b.mode==='rest').map(b=>({...boxRect(b),id:b.id})));
  p.x+=p.vx*dt;
  for(const s of solids)if(overlap(rect(p),s)){if(p.vx>0)p.x=s.x-p.w/2;else if(p.vx<0)p.x=s.x+s.w+p.w/2;p.vx=0;}
  p.x=Math.max(p.w/2,Math.min(LEVEL.width-p.w/2,p.x));
  const oldFeet=p.y;p.y+=p.vy*dt;p.grounded=false;p.support=null;
  for(const s of solids){const r=rect(p);if(!overlap(r,s))continue;
    if(p.vy>=0&&oldFeet<=s.y+.01){p.y=s.y;p.vy=0;p.grounded=true;p.support=s.id;}
    else if(p.vy<0&&oldFeet-p.h>=s.y+s.h-.01){p.y=s.y+s.h+p.h;p.vy=0;}
  }
}
function drop(g,b){const p=g.player,target={x:p.x+p.face*38,y:p.y-2};
  if(LEVEL.solids.concat(g.boxes.filter(other=>other!==b&&other.mode==='rest').map(boxRect)).some(s=>overlap(boxRect(target),s))){event(g,'place-blocked');return;}
  b.mode='flying';b.armed=false;b.x=target.x;b.y=target.y;b.vx=p.face*36;b.vy=-36;b.age=0;p.holding=null;p.pose=.15;event(g,'placed');}
function act(g,input){const p=g.player,b=heldBox(g);
  if(b){if(input.down){drop(g,b);return;}b.mode='flying';b.armed=true;b.x=p.x+p.face*23;b.y=p.y-48;b.vx=p.face*435;b.vy=-38;b.age=0;p.holding=null;p.pose=.22;g.learned.throw=true;event(g,'throw',{box:b.id});}
  else {const near=pickupBox(g);if(near){near.mode='held';p.holding=near.id;p.pose=.18;g.learned.lift=true;event(g,'lift',{box:near.id});}else event(g,'empty-hands');}
}
function advanceBox(g,b,dt){
  if(b.mode==='held'){b.x=g.player.x;b.y=g.player.y-49;b.angle=0;return;}
  if(b.mode!=='flying')return;
  b.age+=dt;const oldY=b.y,oldX=b.x;b.vy+=BOX_G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.vx*dt*.012;
  // The same small-step collision is used by the live model and trajectory preview.
  for(const e of g.enemies)if(b.armed&&e.alive&&overlap(boxRect(b),rect(e))){e.alive=false;e.hitAt=g.tick;b.mode='spent';g.learned.hit=true;event(g,'enemy-hit',{enemy:e.id,box:b.id,x:e.x,y:e.y});return;}
  for(const e of g.enemies)if(!b.armed&&e.alive&&overlap(boxRect(b),rect(e))){b.mode='spent';event(g,'box-broken',{box:b.id,x:b.x,y:b.y});return;}
  for(const s of LEVEL.solids)if(overlap(boxRect(b),s)){
    if(b.vy>=0&&oldY<=s.y+.01){b.y=s.y;b.vy=0;b.vx=0;b.angle=0;b.mode='rest';b.armed=false;event(g,'box-landed',{box:b.id,x:b.x,y:b.y});}
    else if(oldX+15<=s.x||oldX-15>=s.x+s.w){b.mode='spent';event(g,'box-broken',{box:b.id,x:b.x,y:b.y});}
    else if(b.vy<0){b.y=s.y+s.h+30;b.vy=20;}
    break;
  }
  if(b.y>580){b.mode='spent';event(g,'box-water',{box:b.id});}
}
function hurt(g,e){const p=g.player;if(p.invulnerable>0)return;p.hp--;p.invulnerable=1.25;p.vx=(p.x<e.x?-1:1)*150;p.vy=-210;
  const b=heldBox(g);if(b){Object.assign(b,{mode:'flying',armed:false,x:p.x,y:p.y-49,vx:p.vx*.5,vy:-80,age:0});p.holding=null;event(g,'released-on-hurt');}event(g,'hurt',{enemy:e.id,hp:p.hp});if(p.hp===0)fail(g,'巡逻机连续撞到了你');}
export function step(g,input={}){
  if(g.phase!=='playing')return;
  const p=g.player,dt=STEP;g.tick++;p.pose=Math.max(0,p.pose-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  const keys={left:!!input.left,right:!!input.right,jump:!!input.jump,action:!!input.action,down:!!input.down};
  const jump=keys.jump&&!g.previous.jump,action=keys.action&&!g.previous.action;g.previous=keys;
  if(jump)p.buffer=.11;else p.buffer=Math.max(0,p.buffer-dt);
  p.coyote=p.grounded?.08:Math.max(0,p.coyote-dt);
  if(p.invulnerable<1.03){p.vx=(Number(keys.right)-Number(keys.left))*SPEED;if(p.vx)p.face=Math.sign(p.vx);}
  if(p.buffer>0&&p.coyote>0){p.vy=JUMP;p.grounded=false;p.support=null;p.buffer=0;p.coyote=0;g.learned.jump=true;event(g,'jump');}
  if(action)act(g,keys);
  p.vy+=G*dt;moveActor(g,p,dt);
  for(const e of g.enemies)if(e.alive){e.x+=e.dir*47*dt;if(e.x<e.min){e.x=e.min;e.dir=1;}if(e.x>e.max){e.x=e.max;e.dir=-1;}
    for(const b of g.boxes)if(b.mode==='rest'&&overlap(rect(e),boxRect(b))){e.x=e.dir>0?b.x-15-e.w/2:b.x+15+e.w/2;e.dir*=-1;}
  }
  for(const b of g.boxes)advanceBox(g,b,dt);
  for(const e of g.enemies)if(e.alive&&overlap(rect(p),rect(e)))hurt(g,e);
  for(const source of g.sources){const b=g.boxes.find(b=>b.source===source.id);if(b.mode==='spent'){source.cooldown+=dt;if(source.cooldown>=1.8){Object.assign(b,{x:source.x,y:source.y,vx:0,vy:0,angle:0,mode:'rest',armed:false,age:0});source.cooldown=0;event(g,'supply',{box:b.id});}}else source.cooldown=0;}
  if(p.y>575&&g.phase==='playing')fail(g,'落进了货栈之间的水道');
  if(p.x>=LEVEL.goal&&p.grounded&&g.phase==='playing'){g.phase='won';g.result={cause:'抵达收货站',ticks:g.tick};event(g,'arrived');}
}
export function forecastThrow(g){if(!heldBox(g)||!['playing','paused'].includes(g.phase))return null;
  // Preview only: advance a private copy so a paused live scene stays untouched.
  const copy=structuredClone(g),id=copy.player.holding;copy.phase='playing';copy.previous.action=false;const points=[];let outcome='air';
  for(let i=0;i<100;i++){step(copy,{action:i===0});const b=copy.boxes.find(b=>b.id===id);if(i%5===0)points.push({x:b.x,y:b.y-15});
    if(b.mode!=='flying'){outcome=b.mode==='rest'?'ground':'impact';points.push({x:b.x,y:b.y-15});break;}}
  return {points,outcome};
}
export function hint(g){const p=g.player;if(g.phase==='failed')return g.result.cause+'。按 R 或“重试首关”，从码头重新出发。';
  if(g.phase==='won')return '到站了。可以换一种走法再试；本轮只有这一关，后续尚未制作。';
  if(g.phase==='paused')return '已暂停。恢复后再继续，松开的按键不会残留。';
  if(g.lastEvent?.type==='place-blocked'&&g.tick-g.lastEvent.tick<180)return '这里被挡住了，木箱还在手上。换个位置再轻放。';
  if(p.x<355)return p.holding?'看虚线和箱形落点，再按 J 投出；↓＋J 可轻放。':'先靠近浅色木箱，按 J 举起；移动 ← →，空格跳跃。';
  if(p.x<625)return g.learned.hit?'打中了。前方断口需要跳过去，别一路直走。':'巡逻机碰到会受伤：用箱子击退，也能找时机跳过。';
  if(p.x<840)return '看清木沿：走到断口前，再按空格跳到另一边。';
  if(p.x<1350)return '下层可投箱清路；想走货架，可把箱子轻放垫脚再跳上去。';
  if(p.x<1660)return '第二道水道更宽，留出助跑位置再跳。';
  return '越过矮货台和最后的巡逻机，前面亮灯的门就是终点。';}
export function snapshot(g){return structuredClone(g);}
