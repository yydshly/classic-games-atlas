// Offline planner: cloned state + the production trace/settlement rules.
// It never writes to the browser controller or changes a live game.
import {traceShot,simulateShot,cells,group} from '../games/starline/engine.mjs';
export function candidates(g,step=.0125){
 const targets=new Map();
 for(let a=-1.25;a<=1.25001;a+=step){const angle=Number(a.toFixed(6)),trace=traceShot(g,angle);if(!trace.cell)continue;const key=`${trace.cell.r},${trace.cell.c}`,cost=trace.bounces*.1+Math.abs(angle)*.01,old=targets.get(key);if(!old||cost<old.cost)targets.set(key,{angle,trace,cost});}
 const out=[];
 for(const target of targets.values())for(const exchange of g.swapped||g.current===g.next?[false]:[false,true]){
  const state=simulateShot(g,target.angle,exchange);if(!state||state.state==='lost')continue;
  const last=state.lastShot,joined=last&&!last.popped?group(state,last.r,last.c).length:0;
  const reward=(state.state==='won'?100000:0)+(last?.popped||0)*10+(last?.dropped||0)*15+joined*.9-(target.trace.cell.r*.04)-target.cost-(exchange?.025:0);
  out.push({angle:target.angle,exchange,cell:{r:target.trace.cell.r,c:target.trace.cell.c},bounces:target.trace.bounces,state,reward});
 }
 return out.sort((a,b)=>b.reward-a.reward);
}
export function choose(g){
 const shots=candidates(g);if(!shots.length)return null;
 if(shots[0].state.state==='won'||shots[0].state.lastShot.popped)return shots[0];
 // Only expand when the current shot cannot pop: favour a useful two-shot setup.
 let best=shots[0],score=-Infinity;
 for(const shot of shots.slice(0,14)){const future=candidates(shot.state,.025)[0];const value=shot.reward+(future?.reward||-100)*.8;if(value>score){score=value;best=shot;}}
 return best;
}
export function solve(initial){let g=JSON.parse(JSON.stringify(initial));const actions=[];for(let i=0;i<initial.ammo&&g.state!=='won';i++){const next=choose(g);if(!next)break;actions.push({angle:next.angle,exchange:next.exchange,cell:next.cell,bounces:next.bounces,popped:next.state.lastShot.popped,dropped:next.state.lastShot.dropped,color:next.state.lastShot.color,remaining:cells(next.state).length});g=next.state;}return {state:g,actions};}
