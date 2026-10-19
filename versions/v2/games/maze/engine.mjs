import {LEVELS,COLS,ROWS} from './levels.mjs';
export const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],FUSE=2.4,FIRE_TIME=.45,LIMIT=90;
export const key=(x,y)=>`${x},${y}`;
const same=(a,b)=>a.x===b.x&&a.y===b.y;
export function createGame(index=0,seed=1729){
 const level=LEVELS[index===1?1:0];
 const actor=(id,pos,step)=>({id,...pos,fromX:pos.x,fromY:pos.y,dir:2,age:1,cooldown:0,step,alive:true,capacity:2,range:3});
 return {state:'ready',level:level.id,grid:level.grid.map(r=>r.split('')),player:actor('player',level.start,.18),rival:actor('rival',level.rival,.26),bombs:[],flames:[],events:[],time:0,seed:seed>>>0,nextId:1,aiClock:.6,reason:'',stats:{playerBombs:0,rivalBombs:0,crates:0,chains:0,aiEscapes:0},eliminated:[]};
}
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function isFloor(g,x,y){return g.grid[y]?.[x]==='.';}
export function blastCells(g,b,crates=null){
 const cells=[{x:b.x,y:b.y}];
 for(const [dx,dy] of DIRS)for(let n=1;n<=b.range;n++){
  const x=b.x+dx*n,y=b.y+dy*n,t=g.grid[y]?.[x];if(!t||t==='#')break;
  cells.push({x,y});if(t==='+'||crates?.has(key(x,y)))break;
 }return cells;
}
export function canMove(g,a,x,y){return isFloor(g,x,y)&&!g.bombs.some(b=>b.x===x&&b.y===y&&!(b.owner===a.id&&b.passOwner&&same(a,b)));}
export function plant(g,owner='player'){
 const a=g[owner];if(g.state!=='playing'||!a?.alive||g.bombs.filter(b=>b.owner===owner).length>=a.capacity||g.bombs.some(b=>same(b,a)))return false;
 const b={id:g.nextId++,owner,x:a.x,y:a.y,range:a.range,fuse:FUSE,passOwner:true};g.bombs.push(b);g.stats[owner+'Bombs']++;g.events.push({type:'plant',...b});return true;
}
function move(a,d){const [dx,dy]=DIRS[d];a.fromX=a.x;a.fromY=a.y;a.x+=dx;a.y+=dy;a.dir=d;a.age=0;a.cooldown=a.step;}
function expirePasses(g){for(const b of g.bombs)if(!same(b,g[b.owner]))b.passOwner=false;}
function impacts(g){
 for(const a of [g.player,g.rival])if(a.alive&&g.flames.some(f=>same(f,a))){a.alive=false;g.eliminated.push({id:a.id,x:a.x,y:a.y,time:g.time});g.events.push({type:'eliminate',owner:a.id,x:a.x,y:a.y});}
}
function settle(g){
 if(!g.player.alive||!g.rival.alive){g.state=!g.player.alive&&!g.rival.alive?'draw':g.player.alive?'won':'lost';g.reason=g.state==='draw'?'同归于尽':g.state==='won'?'对手机已被爆风击破':'你被爆风击破';g.events.push({type:'result',state:g.state});}
 else if(g.time>=LIMIT){g.state='draw';g.reason='时间到，双方仍存活';g.events.push({type:'result',state:'draw'});}
}
export function detonate(g,ids){
 const queue=[...ids],crates=new Set();for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(g.grid[y][x]==='+')crates.add(key(x,y));
 while(queue.length){
  const b=g.bombs.find(b=>b.id===queue.shift());if(!b)continue;g.bombs=g.bombs.filter(o=>o!==b);
  const cells=blastCells(g,b,crates);g.events.push({type:'explode',owner:b.owner,x:b.x,y:b.y,cells});
  for(const c of cells){const old=g.flames.find(f=>same(f,c));if(old)old.ttl=FIRE_TIME;else g.flames.push({...c,ttl:FIRE_TIME,owner:b.owner});
   if(g.grid[c.y][c.x]==='+'){g.grid[c.y][c.x]='.';g.stats.crates++;g.events.push({type:'crate',...c});}
   for(const other of g.bombs.filter(o=>same(o,c)))if(!queue.includes(other.id)){queue.push(other.id);g.stats.chains++;g.events.push({type:'chain',...c});}
  }
 }
 impacts(g); // One batch includes every chained bomb before either side is judged.
}
function random(g){g.seed=(g.seed*1664525+1013904223)>>>0;return g.seed/4294967296;}
// Forecast uses visible bombs, their fuses and the current grid only. Never future input.
export function dangerMap(g){
 const times=new Map(g.bombs.map(b=>[b.id,b.fuse]));
 for(let k=0;k<g.bombs.length;k++)for(const b of g.bombs)for(const o of g.bombs)if(times.get(o.id)>times.get(b.id)&&blastCells(g,b).some(c=>same(c,o)))times.set(o.id,times.get(b.id));
 const map=new Map();for(const b of g.bombs)for(const c of blastCells(g,b)){const k=key(c.x,c.y);map.set(k,Math.min(map.get(k)??Infinity,times.get(b.id)));}
 for(const f of g.flames)map.set(key(f.x,f.y),0);return map;
}
export function escapeRoute(g,a,danger=dangerMap(g)){
 const q=[{x:a.x,y:a.y,path:[]}],seen=new Set([key(a.x,a.y)]);
 for(let i=0;i<q.length;i++){
  const c=q[i];if(c.path.length&&!danger.has(key(c.x,c.y)))return c.path;
  for(let d=0;d<4;d++){const [dx,dy]=DIRS[d],x=c.x+dx,y=c.y+dy,k=key(x,y),arrival=(c.path.length+1)*a.step;
   if(seen.has(k)||!isFloor(g,x,y)||g.bombs.some(b=>b.x===x&&b.y===y)||g.flames.some(f=>f.x===x&&f.y===y)||(danger.get(k)??Infinity)<=arrival+.12)continue;
   seen.add(k);q.push({x,y,path:[...c.path,d]});
  }
 }return null;
}
function safeToPlant(g,a){
 if(g.bombs.filter(b=>b.owner===a.id).length>=a.capacity||g.bombs.some(b=>same(a,b)))return false;
 const probe={...g,bombs:[...g.bombs,{id:-1,owner:a.id,x:a.x,y:a.y,range:a.range,fuse:FUSE,passOwner:true}]};return !!escapeRoute(probe,a);
}
function ai(g){
 const a=g.rival,danger=dangerMap(g),threat=danger.has(key(a.x,a.y));
 if(threat){const route=escapeRoute(g,a,danger);if(route?.length){move(a,route[0]);g.stats.aiEscapes++;}return;}
 // Attack a visible line, or open copper crates to reach the opponent.
 const ray=blastCells(g,a),useful=ray.some(c=>same(c,g.player)||g.grid[c.y][c.x]==='+');
 if(useful&&safeToPlant(g,a)){plant(g,'rival');const route=escapeRoute(g,a);if(route?.length)move(a,route[0]);return;}
 const q=[{x:a.x,y:a.y,path:[]}],seen=new Set([key(a.x,a.y)]),choices=[];
 for(let i=0;i<q.length;i++){
  const c=q[i];if(c.path.length){const line=blastCells(g,{...c,range:a.range});const attack=line.some(t=>same(t,g.player)),crate=line.some(t=>g.grid[t.y][t.x]==='+');
   choices.push({...c,score:(attack?0:crate?5:12)+c.path.length*.5+(Math.abs(c.x-g.player.x)+Math.abs(c.y-g.player.y))*.35+random(g)*.3});}
  for(let d=0;d<4;d++){const [dx,dy]=DIRS[d],x=c.x+dx,y=c.y+dy,k=key(x,y);if(seen.has(k)||!canMove(g,a,x,y)||danger.has(k))continue;seen.add(k);q.push({x,y,path:[...c.path,d]});}
 }
 choices.sort((a,b)=>a.score-b.score);if(choices.length)move(a,choices[0].path[0]);
}
export function update(g,dt,input={}){
 if(g.state!=='playing')return;dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0,LIMIT-g.time));if(!dt){if(g.time>=LIMIT)settle(g);return;}
 g.time=Math.min(LIMIT,g.time+dt);for(const a of [g.player,g.rival]){a.cooldown=Math.max(0,a.cooldown-dt);a.age+=dt;}
 g.flames=g.flames.map(f=>({...f,ttl:f.ttl-dt})).filter(f=>f.ttl>0);impacts(g);
 if(g.player.alive){if(input.bomb)plant(g);if(Number.isInteger(input.direction)&&input.direction>=0&&input.direction<4&&g.player.cooldown<=0){const d=input.direction,[dx,dy]=DIRS[d];g.player.dir=d;if(canMove(g,g.player,g.player.x+dx,g.player.y+dy))move(g.player,d);}}
 expirePasses(g);
 // Contact with lingering fire counts before the AI can escape that cell.
 impacts(g);
 g.aiClock-=dt;if(g.rival.alive&&g.aiClock<=0&&g.rival.cooldown<=0){ai(g);g.aiClock=.26;}
 expirePasses(g);
 for(const b of g.bombs)b.fuse-=dt;
 const due=g.bombs.filter(b=>b.fuse<=1e-9||g.flames.some(f=>same(f,b))).map(b=>b.id);if(due.length)detonate(g,due);
 impacts(g);settle(g);
}
export function snapshot(g){return JSON.parse(JSON.stringify({...g,events:undefined}));}
