import{createGame,start,update,snapshot}from'../../versions/v4/games/fortress/engine.mjs';
import{decide}from'./policy.mjs';
export function run({strategy='flank',interval=.1,seed=120567,limit=150,decider=decide}={}){
 const g=createGame(2,{seed});start(g);let next=0,input={},decision=0;const seen=new WeakSet(),events=[],route=[],inputs=[],terrain=[];let nextTrace=0;const cells=new Set(),gateVisits=new Set();let distance=0,prior={x:g.player.x,y:g.player.y};
 while(g.state==='playing'&&g.time<limit){
  if(g.time+1e-9>=next){input=decider(snapshot(g),{strategy});next+=Array.isArray(interval)?interval[decision++%interval.length]:interval;if(inputs.length<1000)inputs.push({time:+g.time.toFixed(2),x:+g.player.x.toFixed(1),y:+g.player.y.toFixed(1),...input});}
  const priorTiles=g.tiles.map(row=>row.join(''));
  update(g,input,1/60);
  for(const event of g.events)if(!seen.has(event)){seen.add(event);if(!['fire'].includes(event.type))events.push({time:+g.time.toFixed(2),...event});}
  cells.add(Math.floor(g.player.x/24)+','+Math.floor(g.player.y/24));
  distance+=Math.hypot(g.player.x-prior.x,g.player.y-prior.y);prior={x:g.player.x,y:g.player.y};
  const px=Math.floor(g.player.x/24),py=Math.floor(g.player.y/24);if(py===18&&px>=8&&px<=16)gateVisits.add(`${px},${py}`);
  for(let y=0;y<25;y++)for(let x=0;x<25;x++)if(priorTiles[y][x]==='B'&&g.tiles[y][x]!== 'B')terrain.push({time:+g.time.toFixed(2),x,y});
  if(g.time>=nextTrace){route.push({time:+g.time.toFixed(1),x:+(g.player.x/24).toFixed(2),y:+(g.player.y/24).toFixed(2),base:g.base.hp,lives:g.lives,kills:g.kills});nextTrace+=1;}
 }
 const original=g.level.map;const removed=[];for(let y=0;y<25;y++)for(let x=0;x<25;x++)if(original[y][x]==='B'&&g.tiles[y][x]!== 'B')removed.push([x,y]);
 const centralRemaining=Array.from({length:9},(_,i)=>g.tiles[18][8+i]).filter(x=>x==='B').length;
 const baseRemaining=[[11,22],[12,22],[13,22],[11,23],[13,23]].filter(([x,y])=>g.tiles[y][x]==='B').length;
 return{strategy,interval,seed,state:g.state,time:+g.time.toFixed(2),kills:g.kills,base:g.base.hp,lives:g.lives,shots:g.shots,score:g.score,removed,centralRemaining,baseRemaining,centralGateVisits:[...gateVisits],distanceTiles:+(distance/24).toFixed(2),visitedCells:cells.size,terrain,events,route,inputs};
}
if(process.argv[1]?.replaceAll('\\','/').split('/').at(-1)==='probe.mjs'){
 for(const strategy of ['flank','breach','idle']){const r=run({strategy,decider:strategy==='idle'?()=>({dir:null,fire:false}):decide});console.log(JSON.stringify({...r,inputs:undefined,route:undefined,events:r.events.filter(x=>['power','drop','base-hit','player-hit','win','lose'].includes(x.type))}));}
}
