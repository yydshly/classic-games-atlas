import {LEVELS} from './levels.mjs';
export const RADIUS=24,DIAMETER=48,ROW_HEIGHT=Math.sqrt(3)*RADIUS,TOP=56,LEFT=60,RIGHT=540,MAX_ROWS=12,DANGER=532,SHOOTER={x:300,y:610},MAX_ANGLE=1.25,SPEED=720;
export const columns=r=>r%2?10:11;
export const valid=(r,c)=>Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<MAX_ROWS&&c>=0&&c<columns(r);
export const centre=(r,c,offset=0)=>({x:LEFT+c*DIAMETER+(r%2?RADIUS:0),y:TOP+r*ROW_HEIGHT+offset});
export const clampAngle=a=>Math.max(-MAX_ANGLE,Math.min(MAX_ANGLE,Number.isFinite(a)?a:0));
export function neighbors(r,c){return [[r,c-1],[r,c+1],...[r-1,r+1].flatMap(row=>[[row,c+(r%2?0:-1)],[row,c+(r%2?1:0)]])].filter(([row,col])=>valid(row,col));}
export function cells(g){const out=[];for(let r=0;r<MAX_ROWS;r++)for(let c=0;c<columns(r);c++)if(g.grid[r][c]!==null)out.push({r,c,color:g.grid[r][c],...centre(r,c,g.offset)});return out;}
function emit(g,event){g.events.push(event);if(g.events.length>64)g.events.splice(0,g.events.length-64);}
export const remainingColors=g=>[...new Set(cells(g).map(b=>b.color))].sort((a,b)=>a-b);
function rng(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
function takeColor(g){
 const alive=remainingColors(g);if(!alive.length)return null;g.bag=g.bag.filter(c=>alive.includes(c));
 if(!g.bag.length){g.bag=[...alive];for(let i=g.bag.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[g.bag[i],g.bag[j]]=[g.bag[j],g.bag[i]];}}
 return g.bag.pop();
}
export function refreshColors(g){const alive=remainingColors(g);if(!alive.includes(g.current))g.current=takeColor(g);if(!alive.includes(g.next))g.next=takeColor(g);}
export function createGame(index=0){
 const level=LEVELS[Math.max(0,Math.min(LEVELS.length-1,index))];
 const g={state:'ready',level:level.id,grid:Array.from({length:MAX_ROWS},(_,r)=>Array(columns(r)).fill(null)),time:0,angle:0,offset:0,shotsUntilDrop:level.dropEvery,descents:0,settledShots:0,initial:0,current:null,next:null,bag:[],seed:level.seed,flight:null,swapped:false,events:[],effects:[],stats:{shots:0,popped:0,dropped:0,bounces:0,score:0},reason:'',lastShot:null};
 for(let r=0;r<level.rows.length;r++){if(level.rows[r].length!==columns(r))throw Error(`Invalid authored row ${level.id}:${r}`);for(let c=0;c<level.rows[r].length;c++){const symbol=level.rows[r][c];if(symbol!=='.'){const color='ABCDE'.indexOf(symbol);if(color<0)throw Error('Unknown authored colour');g.grid[r][c]=color;}}}
 g.initial=cells(g).length;g.current=takeColor(g);g.next=takeColor(g);return g;
}
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function swap(g){if(g.state!=='playing'||g.flight||g.swapped)return false;[g.current,g.next]=[g.next,g.current];g.swapped=true;emit(g,{type:'swap'});return true;}
export function group(g,r,c,color=g.grid[r]?.[c]){
 if(!valid(r,c)||color===null||g.grid[r][c]!==color)return [];
 const q=[[r,c]],seen=new Set([`${r},${c}`]);
 for(let i=0;i<q.length;i++)for(const [nr,nc] of neighbors(...q[i])){const k=`${nr},${nc}`;if(!seen.has(k)&&g.grid[nr][nc]===color){seen.add(k);q.push([nr,nc]);}}
 return q;
}
export function anchored(g){
 const q=[],seen=new Set();for(let c=0;c<columns(0);c++)if(g.grid[0][c]!==null){q.push([0,c]);seen.add(`0,${c}`);}
 for(let i=0;i<q.length;i++)for(const [r,c] of neighbors(...q[i])){const k=`${r},${c}`;if(g.grid[r][c]!==null&&!seen.has(k)){seen.add(k);q.push([r,c]);}}
 return seen;
}
function collide(g,p){
 const row=Math.floor((p.y-TOP-g.offset)/ROW_HEIGHT);
 let closest=null,best=Infinity;
 for(let r=Math.max(0,row-2);r<=Math.min(MAX_ROWS-1,row+2);r++){
  const col=Math.round((p.x-LEFT-(r%2?RADIUS:0))/DIAMETER);
  for(let c=Math.max(0,col-1);c<=Math.min(columns(r)-1,col+1);c++){
   if(g.grid[r][c]===null)continue;const b=centre(r,c,g.offset),distance=(b.x-p.x)**2+(b.y-p.y)**2;
   if(distance<=(DIAMETER-.35)**2&&distance<best){closest={r,c};best=distance;}
  }
 }
 return closest;
}
export function attachment(g,p,hit){
 const candidates=hit?neighbors(hit.r,hit.c):Array.from({length:columns(0)},(_,c)=>[0,c]);
 return candidates.filter(([r,c])=>g.grid[r][c]===null).map(([r,c])=>({r,c,d:(centre(r,c,g.offset).x-p.x)**2+(centre(r,c,g.offset).y-p.y)**2})).sort((a,b)=>a.d-b.d||b.r-a.r||a.c-b.c)[0]||null;
}
// Preview and the real projectile share this sub-stepped collision path.
function advance(g,p,distance){
 const steps=Math.max(1,Math.ceil(distance/4)),step=distance/steps;
 for(let i=0;i<steps;i++){
  p.x+=p.dx*step;p.y+=p.dy*step;
  if(p.x<LEFT){p.x=LEFT+(LEFT-p.x);p.dx=Math.abs(p.dx);p.bounces++;}
  if(p.x>RIGHT){p.x=RIGHT-(p.x-RIGHT);p.dx=-Math.abs(p.dx);p.bounces++;}
  const hit=collide(g,p);if(hit||p.y<=TOP+g.offset){p.y=Math.max(TOP+g.offset,p.y);return {land:true,cell:attachment(g,p,hit),hit};}
 }
 return {land:false};
}
export function traceShot(g,angle=g.angle){
 const a=clampAngle(angle),p={...SHOOTER,dx:Math.sin(a),dy:-Math.cos(a),bounces:0},points=[{x:p.x,y:p.y}];let result;
 for(let i=0;i<700;i++){result=advance(g,p,4);if(i%3===0)points.push({x:p.x,y:p.y});if(result.land)break;}
 return {cell:result?.cell??null,points,bounces:p.bounces,end:{x:p.x,y:p.y}};
}
export function fire(g,angle=g.angle){
 if(g.state!=='playing'||g.flight||g.current===null)return false;
 const a=clampAngle(angle);g.angle=a;g.flight={...SHOOTER,dx:Math.sin(a),dy:-Math.cos(a),color:g.current,bounces:0,time:0};g.stats.shots++;emit(g,{type:'fire'});return true;
}
function lose(g,reason){g.state='lost';g.reason=reason;emit(g,{type:'lose'});}
export function settle(g,cell,color,bounces=0){
 if(g.state!=='playing')return;
 if(!cell){lose(g,'没有合法附着位置，星群已越过航线。');return;}
 const {r,c}=cell;if(!valid(r,c)||g.grid[r][c]!==null){lose(g,'附着位置已被占据，请重新规划航线。');return;}
 g.grid[r][c]=color;let popped=0,dropped=0;const connected=group(g,r,c);
 if(connected.length>=3){
  for(const [row,col] of connected){g.effects.push({...centre(row,col,g.offset),color:g.grid[row][col],kind:'pop',ttl:.4});g.grid[row][col]=null;popped++;}
  const supported=anchored(g);
  for(const b of cells(g))if(!supported.has(`${b.r},${b.c}`)){g.effects.push({x:b.x,y:b.y,color:b.color,kind:'drop',ttl:.8});g.grid[b.r][b.c]=null;dropped++;}
 }
 g.stats.popped+=popped;g.stats.dropped+=dropped;g.stats.bounces+=bounces;g.stats.score+=popped*10+dropped*15;
 g.lastShot={r,c,color,popped,dropped,bounces};emit(g,{type:popped?'pop':'attach',popped,dropped});
 if(dropped)emit(g,{type:'drop',count:dropped});
 if(!cells(g).length){g.state='won';g.current=null;g.next=null;g.stats.score+=500+Math.max(0,30-g.stats.shots)*20;emit(g,{type:'win'});return;}
 g.settledShots++;g.shotsUntilDrop--;
 if(g.shotsUntilDrop===0){const level=LEVELS[g.level-1];g.offset+=level.dropStep;g.descents++;g.shotsUntilDrop=level.dropEvery;emit(g,{type:'descent',offset:g.offset});}
 if(cells(g).some(b=>b.y+RADIUS>=DANGER)){lose(g,'星群触及底线。试着优先解除深处的支撑点。');return;}
 g.current=g.next;g.next=takeColor(g);refreshColors(g);g.swapped=false;
}
export function update(g,dt){
 if(!['playing','won','lost'].includes(g.state))return;dt=Math.max(0,Math.min(.05,dt));
 g.effects=g.effects.map(e=>({...e,ttl:e.ttl-dt})).filter(e=>e.ttl>0);
 if(g.state!=='playing')return;g.time+=dt;
 if(!g.flight)return;
 const p=g.flight;p.time+=dt;p.distance=(p.distance||0)+SPEED*dt;
 // Fixed 4px physics slices match trace exactly, independent of frame cadence.
 while(p.distance>=4&&g.flight){
  p.distance-=4;const result=advance(g,p,4);
  if(result.land){g.flight=null;settle(g,result.cell,p.color,p.bounces);}
 }
 if(g.flight&&p.time>8){g.flight=null;lose(g,'航线超出边界，请重新瞄准。');}
}
export function simulateShot(source,angle,exchange=false){
 const g=JSON.parse(JSON.stringify(source));g.events=[];g.effects=[];g.flight=null;if(g.state==='ready')start(g);if(exchange)swap(g);
 const trace=traceShot(g,angle);if(!fire(g,angle))return null;g.flight=null;settle(g,trace.cell,g.current,trace.bounces);return g;
}
export function snapshot(g){return JSON.parse(JSON.stringify({...g,events:undefined}));}


// Durable saves only represent a completely settled board. A page refresh in flight
// deliberately returns to the saved pre-shot board; no half-shot or duplicate pressure.
export function restoreSnapshot(raw){
 try{
  if(!raw||!Number.isInteger(raw.level)||raw.level<1||raw.level>LEVELS.length||!['ready','playing','paused','won','lost'].includes(raw.state)||raw.flight)return null;
  const l=LEVELS[raw.level-1];
  if(![raw.current,raw.next].every(v=>v===null||(Number.isInteger(v)&&v>=0&&v<5)))return null;
  if(!Number.isInteger(raw.initial)||raw.initial<1||raw.initial>126||typeof raw.reason!=='string'||raw.reason.length>300)return null;
  if(!Number.isInteger(raw.descents)||raw.descents<0||raw.descents>20||!Number.isFinite(raw.offset)||Math.abs(raw.offset-raw.descents*l.dropStep)>1e-8)return null;
  if(!Number.isInteger(raw.shotsUntilDrop)||raw.shotsUntilDrop<1||raw.shotsUntilDrop>l.dropEvery)return null;
  if(!Array.isArray(raw.grid)||raw.grid.length!==MAX_ROWS||raw.grid.some((row,r)=>!Array.isArray(row)||row.length!==columns(r)||row.some(v=>v!==null&&(!Number.isInteger(v)||v<0||v>4))))return null;
  if(!Number.isInteger(raw.seed)||raw.seed<0||raw.seed>4294967295||!Array.isArray(raw.bag)||raw.bag.length>5||raw.bag.some(v=>!Number.isInteger(v)||v<0||v>4))return null;
  if(!Number.isFinite(raw.time)||raw.time<0||raw.time>1e8||!Number.isFinite(raw.angle)||Math.abs(raw.angle)>MAX_ANGLE||typeof raw.swapped!=='boolean')return null;
  if(!raw.stats||['shots','popped','dropped','bounces','score'].some(k=>!Number.isInteger(raw.stats[k])||raw.stats[k]<0||raw.stats[k]>1e7))return null;
  if(!Number.isInteger(raw.settledShots)||raw.settledShots<0||raw.settledShots>raw.stats.shots||raw.stats.shots-raw.settledShots>(['won','lost'].includes(raw.state)?1:0))return null;
  if(raw.settledShots!==raw.descents*l.dropEvery+(l.dropEvery-raw.shotsUntilDrop))return null;
  const g=JSON.parse(JSON.stringify(raw));g.events=[];g.effects=[];g.flight=null;
  const alive=remainingColors(g);
  if(g.state==='won'){if(alive.length||g.current!==null||g.next!==null)return null;}
  else if(g.state!=='lost'&&(!alive.length||![g.current,g.next].every(v=>alive.includes(v))))return null;
  if(['playing','paused','ready'].includes(g.state)&&cells(g).some(b=>b.y+RADIUS>=DANGER))return null;
  if(g.state==='playing')g.state='paused';
  return g;
 }catch{return null;}
}
