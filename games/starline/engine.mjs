import {LEVELS} from './levels.mjs';
export const RADIUS=24,DIAMETER=48,ROW_HEIGHT=Math.sqrt(3)*RADIUS,TOP=56,LEFT=60,RIGHT=540,MAX_ROWS=12,DANGER=532,SHOOTER={x:300,y:610},MAX_ANGLE=1.25,SPEED=720;
export const columns=r=>r%2?10:11;
export const valid=(r,c)=>Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<MAX_ROWS&&c>=0&&c<columns(r);
export const centre=(r,c)=>({x:LEFT+c*DIAMETER+(r%2?RADIUS:0),y:TOP+r*ROW_HEIGHT});
export const clampAngle=a=>Math.max(-MAX_ANGLE,Math.min(MAX_ANGLE,Number.isFinite(a)?a:0));
export function neighbors(r,c){return [[r,c-1],[r,c+1],...[r-1,r+1].flatMap(row=>[[row,c+(r%2?0:-1)],[row,c+(r%2?1:0)]])].filter(([row,col])=>valid(row,col));}
export function cells(g){const out=[];for(let r=0;r<MAX_ROWS;r++)for(let c=0;c<columns(r);c++)if(g.grid[r][c]!==null)out.push({r,c,color:g.grid[r][c],...centre(r,c)});return out;}
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
 const g={state:'ready',level:level.id,grid:Array.from({length:MAX_ROWS},(_,r)=>Array(columns(r)).fill(null)),time:0,angle:0,ammo:level.ammo,initial:0,current:null,next:null,bag:[],seed:level.seed,flight:null,swapped:false,events:[],effects:[],stats:{shots:0,popped:0,dropped:0,bounces:0,score:0},reason:'',lastShot:null};
 for(let r=0;r<level.rows.length;r++){if(level.rows[r].length!==columns(r))throw Error(`Invalid authored row ${level.id}:${r}`);for(let c=0;c<level.rows[r].length;c++){const symbol=level.rows[r][c];if(symbol!=='.'){const color='ABCDE'.indexOf(symbol);if(color<0)throw Error('Unknown authored colour');g.grid[r][c]=color;}}}
 g.initial=cells(g).length;g.current=takeColor(g);g.next=takeColor(g);return g;
}
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function swap(g){if(g.state!=='playing'||g.flight||g.swapped)return false;[g.current,g.next]=[g.next,g.current];g.swapped=true;g.events.push({type:'swap'});return true;}
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
 const row=Math.floor((p.y-TOP)/ROW_HEIGHT);
 let closest=null,best=Infinity;
 for(let r=Math.max(0,row-2);r<=Math.min(MAX_ROWS-1,row+2);r++){
  const col=Math.round((p.x-LEFT-(r%2?RADIUS:0))/DIAMETER);
  for(let c=Math.max(0,col-1);c<=Math.min(columns(r)-1,col+1);c++){
   if(g.grid[r][c]===null)continue;const b=centre(r,c),distance=(b.x-p.x)**2+(b.y-p.y)**2;
   if(distance<=(DIAMETER-.35)**2&&distance<best){closest={r,c};best=distance;}
  }
 }
 return closest;
}
export function attachment(g,p,hit){
 const candidates=hit?neighbors(hit.r,hit.c):Array.from({length:columns(0)},(_,c)=>[0,c]);
 return candidates.filter(([r,c])=>g.grid[r][c]===null).map(([r,c])=>({r,c,d:(centre(r,c).x-p.x)**2+(centre(r,c).y-p.y)**2})).sort((a,b)=>a.d-b.d||b.r-a.r||a.c-b.c)[0]||null;
}
// Preview and the real projectile share this sub-stepped collision path.
function advance(g,p,distance){
 const steps=Math.max(1,Math.ceil(distance/4)),step=distance/steps;
 for(let i=0;i<steps;i++){
  p.x+=p.dx*step;p.y+=p.dy*step;
  if(p.x<LEFT){p.x=LEFT+(LEFT-p.x);p.dx=Math.abs(p.dx);p.bounces++;}
  if(p.x>RIGHT){p.x=RIGHT-(p.x-RIGHT);p.dx=-Math.abs(p.dx);p.bounces++;}
  const hit=collide(g,p);if(hit||p.y<=TOP){p.y=Math.max(TOP,p.y);return {land:true,cell:attachment(g,p,hit),hit};}
 }
 return {land:false};
}
export function traceShot(g,angle=g.angle){
 const a=clampAngle(angle),p={...SHOOTER,dx:Math.sin(a),dy:-Math.cos(a),bounces:0},points=[{x:p.x,y:p.y}];let result;
 for(let i=0;i<700;i++){result=advance(g,p,4);if(i%3===0)points.push({x:p.x,y:p.y});if(result.land)break;}
 return {cell:result?.cell??null,points,bounces:p.bounces,end:{x:p.x,y:p.y}};
}
export function fire(g,angle=g.angle){
 if(g.state!=='playing'||g.flight||g.ammo<=0||g.current===null)return false;
 const a=clampAngle(angle);g.angle=a;g.flight={...SHOOTER,dx:Math.sin(a),dy:-Math.cos(a),color:g.current,bounces:0,time:0};g.ammo--;g.stats.shots++;g.events.push({type:'fire'});return true;
}
function lose(g,reason){g.state='lost';g.reason=reason;g.events.push({type:'lose'});}
export function settle(g,cell,color,bounces=0){
 if(!cell){lose(g,'没有合法附着位置，星群已越过航线。');return;}
 const {r,c}=cell;if(!valid(r,c)||g.grid[r][c]!==null){lose(g,'附着位置已被占据，请重新规划航线。');return;}
 g.grid[r][c]=color;let popped=0,dropped=0;const connected=group(g,r,c);
 if(connected.length>=3){
  for(const [row,col] of connected){g.effects.push({...centre(row,col),color:g.grid[row][col],kind:'pop',ttl:.4});g.grid[row][col]=null;popped++;}
  const supported=anchored(g);
  for(const b of cells(g))if(!supported.has(`${b.r},${b.c}`)){g.effects.push({x:b.x,y:b.y,color:b.color,kind:'drop',ttl:.8});g.grid[b.r][b.c]=null;dropped++;}
 }
 g.stats.popped+=popped;g.stats.dropped+=dropped;g.stats.bounces+=bounces;g.stats.score+=popped*10+dropped*15;
 g.lastShot={r,c,color,popped,dropped,bounces};g.events.push({type:popped?'pop':'attach',popped,dropped});
 if(dropped)g.events.push({type:'drop',count:dropped});
 if(!cells(g).length){g.state='won';g.current=null;g.next=null;g.stats.score+=500+g.ammo*40;g.events.push({type:'win'});return;}
 if(cells(g).some(b=>b.y+RADIUS>=DANGER)){lose(g,'星群触及底线。试着优先解除深处的支撑点。');return;}
 if(g.ammo<=0){lose(g,'发射次数已用完。重试时留意下一颗与悬挂结构。');return;}
 g.current=g.next;g.next=takeColor(g);refreshColors(g);g.swapped=false;
}
export function update(g,dt){
 if(!['playing','won','lost'].includes(g.state))return;dt=Math.max(0,Math.min(.05,dt));
 g.effects=g.effects.map(e=>({...e,ttl:e.ttl-dt})).filter(e=>e.ttl>0);
 if(g.state!=='playing')return;g.time+=dt;
 if(!g.flight)return;
 const p=g.flight;p.time+=dt;const result=advance(g,p,SPEED*dt);
 if(result.land){g.flight=null;settle(g,result.cell,p.color,p.bounces);}
 else if(p.time>8){g.flight=null;lose(g,'航线超出边界，请重新瞄准。');}
}
export function simulateShot(source,angle,exchange=false){
 const g=JSON.parse(JSON.stringify(source));g.events=[];g.effects=[];g.flight=null;if(g.state==='ready')start(g);if(exchange)swap(g);
 const trace=traceShot(g,angle);if(!fire(g,angle))return null;g.flight=null;settle(g,trace.cell,g.current,trace.bounces);return g;
}
export function snapshot(g){return JSON.parse(JSON.stringify({...g,events:undefined}));}
