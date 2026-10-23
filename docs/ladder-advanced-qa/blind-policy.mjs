// Private model-reference strategy for a normal-input runner. Not runtime code.
// E is the identical candidate physical model; it never starts, updates or mutates g.
// The caller must issue ordinary movement/dig inputs and never apply returned state.
import * as E from './engine.mjs';
const key=p=>`${p.x},${p.y}`,same=(a,b)=>a.x===b.x&&a.y===b.y;
function reach(g,from){
 const q=[{x:from.x,y:from.y,path:[]}], seen=new Set([key(from)]);
 for(let n=0;n<q.length;n++)for(const p of E.neighbors(g,q[n]))if(!seen.has(key(p))){seen.add(key(p));q.push({...p,path:[...q[n].path,p]});}
 return q;
}
// Reachability-first native shortest path to a core, with up to three legal
// openings when the target is inaccessible. Does not search dig shortcuts to
// already-reachable targets; it is a bounded counterexample, not an optimal solver.
// Planning topology treats openings as lasting; native simulation alone checks
// their timers. No enemy fields, coordinates, states, or home positions are read.
function plan(g,target,maxDigs=3){
 let best=null,visited=0;
 const initialHoles=new Set(g.holes.map(key));
 const stack=[{g:{...g,player:{...g.player,digCooldown:0}},path:[],depth:0,cost:0}];
 const signatures=new Map();
 while(stack.length&&visited++<2500){
  const node=stack.pop();
  if(best&&node.cost>=best.cost)continue;
  const nodes=reach(node.g,node.g.player),arrival=nodes.find(p=>same(p,target));
  if(arrival){const result={cost:node.cost+arrival.path.length,path:[...node.path,...arrival.path.map(p=>({kind:'move',...p}))]};if(!best||result.cost<best.cost)best=result;continue;}
  if(node.depth>=maxDigs)continue;
  const branches=[];
  for(const p of nodes){
   if(best&&node.cost+p.path.length+2>=best.cost)continue;
   const test={...node.g,player:{...node.g.player,x:p.x,y:p.y,digCooldown:0},state:'playing'};
   for(const sign of [-1,1]){
    const dig=E.inspectDig(test,sign);if(!dig.ok)continue;
    const holes=[...node.g.holes,{...dig.target,remaining:E.HOLE_TIME,duration:E.HOLE_TIME}];
    const sig=holes.map(key).sort().join(';')+'@'+key(p),cost=node.cost+p.path.length+2;
    if((signatures.get(sig)??Infinity)<=cost)continue;signatures.set(sig,cost);
    branches.push({g:{...test,holes},depth:node.depth+1,cost,path:[...node.path,...p.path.map(p=>({kind:'move',...p})),{kind:'dig',dir:sign,from:{x:p.x,y:p.y},target:dig.target}]});
   }
  }
  // Nearer useful openings first; no guard-awareness is introduced here.
  branches.sort((a,b)=>b.cost-a.cost);
  stack.push(...branches);
 }
 return best?{...best,visited,addedHoles:best.path.filter(p=>p.kind==='dig'&&!initialHoles.has(key(p.target))).length}:null;
}


export function createBlindPolicy(){
 let chosenId=null,level=null,lastTime=-1;
 return function chooseAction(g){
  if(!['playing','paused'].includes(g.state))return {dir:null,input:{},reason:'No action outside active session.'};
  if(level!==g.level||g.time<lastTime){chosenId=null;level=g.level;}
  lastTime=g.time;
  let target=g.cores.find(c=>c.id===chosenId&&!c.collected),p=null;
  if(!target){
   const candidates=g.cores.filter(c=>!c.collected).map(c=>({target:c,p:plan(g,c)})).filter(c=>c.p).sort((a,b)=>a.p.cost-b.p.cost);
   target=candidates[0]?.target||(g.exit.open?g.exit:null);p=candidates[0]?.p||null;chosenId=target?.id||null;
  }
  if(!target)return {dir:null,input:{},reason:'Bounded blind policy found no target; no impossibility inference.'};
  p=p||plan(g,target);
  const a=p?.path?.[0];
  if(!a)return {dir:null,input:{},target:{x:target.x,y:target.y},reason:'At target or no bounded <=3-opening route.'};
  if(a.kind==='dig')return {dir:null,input:{},dig:a.dir,target:a.target,reason:'Blind necessary opening; no guard positions read.'};
  const dir=a.dir==='wait'?null:a.dir;
  return {dir,input:dir?{[dir]:true}:{},target:{id:target.id,x:target.x,y:target.y},reason:'Blind native path, no guard positions read.'};
 };
}
export const chooseAction=createBlindPolicy();
