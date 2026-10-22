import {createGame,start,command,canPlace,update,snapshot,score} from '../../versions/v3/games/brook/engine.mjs';
export const firstPlan=[[0,'dew',0,0],[0,'bolt',1,2],[0,'wall',1,6],[4,'bolt',0,2],[6.1,'wall',1,5],[8,'bolt',2,2],[10,'dew',2,0],[14,'bolt',1,1],[18,'bolt',0,3],[22,'bolt',2,3],[30,'wall',1,5]];
export const secondPlan=[[0,'dew',0,0],[0,'bolt',2,2],[0,'wall',0,6],[0,'root',1,6],[4,'bolt',0,2],[6.1,'wall',0,5],[10,'bolt',0,3],[14,'dew',2,0],[18,'bolt',2,3],[29,'root',1,6],[35,'bolt',0,1],[54,'root',1,6]];
function build(style){
 const shared=[[0,'dew',0,0],[0,'bolt',0,1],[3.6,'bolt',1,1],[7.2,'bolt',2,1],[9,'dew',2,0]];
 if(style==='roots')return [...shared.slice(0,2),[0,'root',0,6],shared[2],[7.1,'root',2,6],shared[3],shared[4],
 [13,'bolt',0,2],[16,'wall',0,4],[18,'wall',2,5],[20,'bolt',2,2],[24,'root',1,6],[27,'dew',1,0],[30,'wall',1,4],[34,'bolt',1,2],[40,'wall',2,3]];
 return [...shared.slice(0,2),[0,'wall',0,6],shared[2],[6.1,'wall',0,4],shared[3],shared[4],
 [13,'bolt',0,2],[16,'mist',2,2],[20,'wall',2,5],[24,'dew',1,0],[28,'bolt',1,2],[32,'mist',0,3],[37,'wall',2,3],[43,'mist',1,3],[47,'wall',1,5],[54,'wall',1,4]];
}
export const finalePlans={roots:build('roots'),slow:build('slow')};
if(process.argv.includes('--plans'))console.log(JSON.stringify({firstPlan,secondPlan,finalePlans}));
export function action(g,plan,index){
 const a=plan[index];return a&&g.time>=a[0]&&canPlace(g,a[1],a[2],a[3]).valid?{kind:'place',type:a[1],row:a[2],col:a[3]}:null;
}
export function simulate(stage,plan,{noCollect=false}={}){
 const g=createGame(stage);start(g);let index=0;
 while(g.state==='playing'){
  if(!noCollect&&g.tokens.length)command(g,{kind:'collect',ids:g.tokens.map(t=>t.id)});
  const c=action(g,plan,index);if(c&&command(g,c))index++;
  update(g,1/60);g.events=[];
 }
 return {state:g.state,time:g.time,score:score(g),placed:index,steps:plan.length,stats:g.stats,plants:g.plants,remaining:g.enemies,log:g.log,snapshot:snapshot(g)};
}
if(process.argv.includes('--evaluate')){
 const rows=[['first',0,firstPlan],['second',1,secondPlan],...Object.entries(finalePlans).map(([n,p])=>[n,2,p])].map(([name,stage,plan])=>({name,...simulate(stage,plan)}));
 console.log(JSON.stringify(rows,null,2));
}
