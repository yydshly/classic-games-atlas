// Independent push-space search. Routes are valid solutions, not a UI promise
// of globally optimal walking or pushing scores.
export const DIRECTIONS=[{key:'U',dx:0,dy:-1},{key:'R',dx:1,dy:0},{key:'D',dx:0,dy:1},{key:'L',dx:-1,dy:0}];
export function geometry(level){
 const w=level.grid[0].length,h=level.grid.length,floor=new Set();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(level.grid[y][x]!== '#')floor.add(y*w+x);
 const adjacent=(i,d)=>{const x=i%w+d.dx,y=Math.floor(i/w)+d.dy;return x<0||y<0||x>=w||y>=h?-1:y*w+x;};
 const goals=level.goals.map(p=>p.y*w+p.x),goalSet=new Set(goals),distances=[];
 for(const goal of goals){const distancesFrom=new Map([[goal,0]]),q=[goal];for(let j=0;j<q.length;j++)for(const d of DIRECTIONS){const next=adjacent(q[j],d),stand=adjacent(next,d);if(floor.has(next)&&floor.has(stand)&&!distancesFrom.has(next)){distancesFrom.set(next,distancesFrom.get(q[j])+1);q.push(next);}}distances.push(distancesFrom);}
 const dead=new Set([...floor].filter(p=>!distances.some(d=>d.has(p))));
 return {w,h,floor,adjacent,goals,goalSet,distances,dead};
}
export function reachable(geo,player,boxes){
 const occupied=new Set(boxes),paths=new Map([[player,'']]),q=[player];
 for(let i=0;i<q.length;i++)for(const d of DIRECTIONS){const n=geo.adjacent(q[i],d);if(geo.floor.has(n)&&!occupied.has(n)&&!paths.has(n)){paths.set(n,paths.get(q[i])+d.key);q.push(n);}}
 return paths;
}
export function lowerBound(geo,boxes){
 let costs=new Map([[0,0]]);
 for(const box of boxes){const next=new Map();for(const [mask,cost] of costs)for(let i=0;i<geo.goals.length;i++){if(mask&(1<<i))continue;const distance=geo.distances[i].get(box);if(distance===undefined)continue;const nm=mask|(1<<i),nc=cost+distance;if(nc<(next.get(nm)??Infinity))next.set(nm,nc);}costs=next;}
 return costs.get((1<<boxes.length)-1)??Infinity;
}
class Heap{constructor(){this.a=[];}push(x){const a=this.a;a.push(x);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].priority<=x.priority)break;a[i]=a[p];i=p;}a[i]=x;}pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].priority<a[j].priority)j++;if(a[j].priority>=last.priority)break;a[i]=a[j];i=j;}a[i]=last;}return first;}}
export function solve(level,maxExpanded=150000){
 const geo=geometry(level),boxes=level.boxes.map(p=>p.y*geo.w+p.x).sort((a,b)=>a-b),player=level.player.y*geo.w+level.player.x,paths=reachable(geo,player,boxes);
 const canon=(b,p)=>b.join(',')+'|'+Math.min(...p.keys()),initialKey=canon(boxes,paths),h=lowerBound(geo,boxes),open=new Heap(),records=[{boxes,player,g:0,parent:-1,action:'',key:initialKey}],best=new Map([[initialKey,0]]);let expanded=0;
 open.push({id:0,priority:h*10000+h});
 while(open.a.length&&expanded<maxExpanded){
  const {id}=open.pop(),node=records[id];if(best.get(node.key)!==node.g)continue;expanded++;
  if(node.boxes.every(p=>geo.goalSet.has(p))){const chunks=[];let n=id;while(n>=0){chunks.push(records[n].action);n=records[n].parent;}return {solved:true,actions:chunks.reverse().join(''),pushes:node.g,expanded,method:'push-space A*; no UI optimality claim'};}
  const paths=reachable(geo,node.player,node.boxes),occupied=new Set(node.boxes);
  for(let i=0;i<node.boxes.length;i++)for(const d of DIRECTIONS){
   const b=node.boxes[i],stand=geo.adjacent(b,{dx:-d.dx,dy:-d.dy}),dest=geo.adjacent(b,d);if(!paths.has(stand)||!geo.floor.has(dest)||occupied.has(dest)||geo.dead.has(dest))continue;
   const next=[...node.boxes];next[i]=dest;next.sort((a,b)=>a-b);const g=node.g+1,nextReach=reachable(geo,b,next),key=canon(next,nextReach);if(g>=(best.get(key)??Infinity))continue;
   const heuristic=lowerBound(geo,next);if(!Number.isFinite(heuristic))continue;best.set(key,g);const rec={boxes:next,player:b,g,parent:id,action:paths.get(stand)+d.key,key};records.push(rec);open.push({id:records.length-1,priority:(g+heuristic)*10000+heuristic*10+rec.action.length*.001});
  }
 }
 return {solved:false,expanded,reason:expanded>=maxExpanded?'bounded search limit':'no reachable solution'};
}
