import {LEVELS,COLS,ROWS} from './levels.mjs';
export const DIRS=[[0,-1],[1,0],[0,1],[-1,0]], FUSE=2.4, FIRE_TIME=.45;
const key=(x,y)=>`${x},${y}`,same=(a,b)=>a.x===b.x&&a.y===b.y;
export function createGame(index=0){
 const level=LEVELS[Math.max(0,Math.min(LEVELS.length-1,index))];
 return {state:'ready',level:level.id,time:0,grid:level.grid.map(r=>r.split('')),player:{...level.start,fromX:level.start.x,fromY:level.start.y,age:1,cooldown:0,dir:2,hp:3,invulnerable:0,capacity:1,range:2,step:.22},enemies:level.enemies.map(e=>({...e,fromX:e.x,fromY:e.y,age:1,cooldown:.8+e.id*.13,burst:0})),bombs:[],flames:[],items:[],exit:{...level.exit},events:[],stats:{planted:0,crates:0,kills:0,chains:0,hits:0,score:0},seed:1729+level.id,nextId:1,reason:''};
}
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function isFloor(g,x,y){return x>=0&&y>=0&&x<COLS&&y<ROWS&&g.grid[y][x]==='.';}
export function blastCells(g,b,solidCrates=null){
 const cells=[{x:b.x,y:b.y}];
 for(const [dx,dy] of DIRS)for(let i=1;i<=b.range;i++){
  const x=b.x+dx*i,y=b.y+dy*i,t=g.grid[y]?.[x];
  if(!t||t==='#')break;cells.push({x,y});if(t==='+'||solidCrates?.has(key(x,y)))break;
 }
 return cells;
}
export function plant(g){
 if(g.state!=='playing'||g.bombs.length>=g.player.capacity||g.bombs.some(b=>same(b,g.player)))return false;
 const b={id:g.nextId++,x:g.player.x,y:g.player.y,range:g.player.range,fuse:FUSE,passOwner:true};
 g.bombs.push(b);g.stats.planted++;g.events.push({type:'plant',...b});return true;
}
function random(g){g.seed=(g.seed*1664525+1013904223)>>>0;return g.seed/4294967296;}
function canMove(g,x,y,player=false){
 if(!isFloor(g,x,y))return false;
 return !g.bombs.some(b=>b.x===x&&b.y===y&&!(player&&b.passOwner&&same(b,g.player)));
}
function move(a,x,y,d,step){a.fromX=a.x;a.fromY=a.y;a.x=x;a.y=y;a.dir=d;a.age=0;a.cooldown=step;a.animationStep=step;}
function hurt(g,reason){
 if(g.player.invulnerable>0||g.state!=='playing')return;
 g.player.hp--;g.stats.hits++;g.player.invulnerable=1.6;g.events.push({type:'hurt'});
 if(g.player.hp<=0){g.state='lost';g.reason=reason;g.events.push({type:'lose'});}
}
function impacts(g){
 if(g.flames.some(f=>same(f,g.player)))hurt(g,'被爆风击中。放下炸弹后，转过一个拐角再等待。');
 const killed=g.enemies.filter(e=>g.flames.some(f=>same(f,e)));
 for(const e of killed){g.stats.kills++;g.stats.score+=e.type==='charger'?200:e.type==='tracker'?150:100;g.events.push({type:'enemy',x:e.x,y:e.y});}
 if(killed.length)g.enemies=g.enemies.filter(e=>!killed.includes(e));
 if(g.enemies.some(e=>same(e,g.player)))hurt(g,'与巡逻机相撞。保持距离，利用拐角与炸弹拦截。');
}
export function detonate(g,ids){
 const queue=[...ids],crates=new Set();
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(g.grid[y][x]==='+')crates.add(key(x,y));
 while(queue.length){
  const id=queue.shift(),b=g.bombs.find(b=>b.id===id);if(!b)continue;
  g.bombs=g.bombs.filter(other=>other!==b);
  const cells=blastCells(g,b,crates);g.events.push({type:'explode',x:b.x,y:b.y});
  for(const c of cells){
   const old=g.flames.find(f=>same(f,c));if(old)old.ttl=FIRE_TIME;else g.flames.push({...c,ttl:FIRE_TIME});
   if(g.grid[c.y][c.x]==='+'){
    g.grid[c.y][c.x]='.';g.stats.crates++;g.stats.score+=10;
    const type=LEVELS[g.level-1].powers[key(c.x,c.y)];if(type)g.items.push({...c,type});
   }
   for(const other of g.bombs.filter(other=>same(other,c)))if(!queue.includes(other.id)){queue.push(other.id);g.stats.chains++;g.stats.score+=25;g.events.push({type:'chain',x:c.x,y:c.y});}
  }
 }
 impacts(g);
}
function chooseEnemy(g,e){
 const options=DIRS.map(([dx,dy],dir)=>({x:e.x+dx,y:e.y+dy,dir})).filter(c=>canMove(g,c.x,c.y)&&!g.flames.some(f=>same(f,c)));
 if(!options.length)return null;
 if(e.type==='tracker'&&Math.abs(e.x-g.player.x)+Math.abs(e.y-g.player.y)<=8){
  // Breadth-first route, respecting crates and bombs; no secret teleporting.
  const queue=options.map(c=>({...c,first:c})),seen=new Set([key(e.x,e.y)]);
  for(let i=0;i<queue.length;i++){
   const c=queue[i],k=key(c.x,c.y);if(seen.has(k))continue;seen.add(k);
   if(same(c,g.player))return c.first;
   for(const [dx,dy] of DIRS){const x=c.x+dx,y=c.y+dy;if(canMove(g,x,y)&&!seen.has(key(x,y))&&!g.flames.some(f=>f.x===x&&f.y===y))queue.push({x,y,first:c.first});}
  }
 }
 if(e.type==='charger'){
  const forward=options.find(c=>c.dir===e.dir);if(e.burst>0&&forward)return forward;
  if(e.x===g.player.x||e.y===g.player.y){const toward=options.find(c=>Math.abs(c.x-g.player.x)+Math.abs(c.y-g.player.y)<Math.abs(e.x-g.player.x)+Math.abs(e.y-g.player.y));if(toward)return toward;}
 }
 const straight=options.find(c=>c.dir===e.dir);
 if(straight&&random(g)<.68)return straight;
 const notBack=options.filter(c=>c.dir!==(e.dir+2)%4),pool=notBack.length?notBack:options;
 return pool[Math.floor(random(g)*pool.length)];
}
export function update(g,dt,input={}){
 if(g.state!=='playing')return;
 dt=Math.max(0,Math.min(.05,dt));g.time+=dt;
 const p=g.player;p.cooldown=Math.max(0,p.cooldown-dt);p.age+=dt;p.invulnerable=Math.max(0,p.invulnerable-dt);
 g.flames=g.flames.map(f=>({...f,ttl:f.ttl-dt})).filter(f=>f.ttl>0);
 if(input.bomb)plant(g);
 if(Number.isInteger(input.direction)&&p.cooldown<=0){
  const d=input.direction,[dx,dy]=DIRS[d],x=p.x+dx,y=p.y+dy;p.dir=d;
  if(canMove(g,x,y,true))move(p,x,y,d,p.step);
 }
 for(const b of g.bombs){if(!same(b,p))b.passOwner=false;b.fuse-=dt;}
 const due=g.bombs.filter(b=>b.fuse<=0||g.flames.some(f=>same(f,b))).map(b=>b.id);
 if(due.length)detonate(g,due);
 if(g.state!=='playing')return;
 for(const e of g.enemies){
  e.age+=dt;e.cooldown-=dt;if(e.cooldown>0)continue;
  const target=chooseEnemy(g,e);
  if(!target){e.cooldown=.2;continue;}
  let step=e.type==='tracker'?.6:.64;
  if(e.type==='charger'){if(e.burst<=0)e.burst=3;e.burst--;step=e.burst===0?1.05:.28;}
  move(e,target.x,target.y,target.dir,step);
 }
 impacts(g);if(g.state!=='playing')return;
 for(const item of g.items.filter(i=>same(i,p)&&!g.flames.some(f=>same(f,i)))){
  if(item.type==='capacity')p.capacity=Math.min(4,p.capacity+1);
  if(item.type==='range')p.range=Math.min(6,p.range+1);
  if(item.type==='speed')p.step=Math.max(.14,p.step-.035);
  g.items=g.items.filter(i=>i!==item);g.stats.score+=50;g.events.push({type:'power',power:item.type});
 }
 if(!g.enemies.length&&same(p,g.exit)&&!g.flames.some(f=>same(f,p))){g.state='won';g.stats.score+=500+Math.max(0,Math.floor((LEVELS[g.level-1].par-g.time)*3));g.events.push({type:'win'});}
}
export function snapshot(g){return JSON.parse(JSON.stringify({...g,events:undefined}));}
