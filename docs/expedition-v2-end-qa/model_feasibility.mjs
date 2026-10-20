// One conservative model feasibility check. Not browser play or UI input.
import fs from 'node:fs';
import {LEVELS,COSTS,createGame,command,step,checkpoint} from '../../versions/v2/games/expedition/engine.mjs';
const rows=[];
for(let index=0;index<3;index++){
 const g=createGame(index),target=index===2?4:3,initial=index===1?'south':'north',priority=index===1?['north','south']:['south','north'];
 const send=c=>command(g,c).ok;
 send({type:'start'});send({type:'build',building:'barracks'});
 for(const[id,resource]of [[2,'wood'],[3,'food'],[4,'wood']])send({type:'assign',workerId:id,resource});
 for(let i=0;i<2;i++)send({type:'deploy',front:initial,count:1});
 while(g.status==='running'){
  if(g.tick%8===0){
   for(const w of g.workers)if(w.alive&&!['build','toBuild'].includes(w.phase)&&w.task==='idle')send({type:'assign',workerId:w.id,resource:w.id%2?'food':'wood'});
   const under=b=>g.construction.some(c=>c.building===b),afford=k=>g.stock.food>=COSTS[k].food&&g.stock.wood>=COSTS[k].wood;
   if(g.buildings.barracks&&!g.buildings.watchtower&&!under('watchtower')&&afford('watchtower'))send({type:'build',building:'watchtower'});
   if(index===1&&g.buildings.watchtower&&!g.buildings.sawmill&&!under('sawmill')&&afford('sawmill'))send({type:'build',building:'sawmill'});
   const reserveWood=index===1&&!g.buildings.sawmill&&!under('sawmill')?18:0;
   const living=g.guards.filter(a=>a.hp>0),queued=g.queue.filter(q=>q.unit==='guard').length;
   if(g.buildings.barracks&&living.length+queued<target*2&&g.queue.length<3&&afford('guard')&&g.stock.wood-COSTS.guard.wood>=reserveWood)send({type:'recruit',unit:'guard'});
   if(!living.some(a=>a.remaining>0)&&living.some(a=>a.front==='reserve')){
    const front=priority.find(f=>living.filter(a=>a.front===f).length<target);
    if(front)send({type:'deploy',front,count:1});
   }
  }
  step(g);
 }
 rows.push({level:index+1,status:g.status,baseHP:g.base.hp,delivered:g.delivered,buildings:g.buildings,guards:g.guards.filter(a=>a.hp>0).map(a=>({front:a.front,hp:a.hp})),checkpoint:checkpoint(g)});
}
const report={kind:'single-policy model feasibility only; not browser/human play',rows};
fs.writeFileSync(new URL('model-feasibility.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({level:r.level,status:r.status,baseHP:r.baseHP,delivered:r.delivered,guards:r.guards.length}))));
