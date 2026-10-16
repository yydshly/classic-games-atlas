import{createGame,start,cutRopes,update,stars,P}from'../games/chime/engine.mjs';
export function run(index,actions,jitter=0,trace=false){const g=createGame(index),path=[];start(g);let at=0;while(g.state==='playing'&&g.time<10){while(at<actions.length&&g.time+1e-8>=Math.max(0,actions[at].time+jitter)){cutRopes(g,actions[at++].ids);}update(g,P.step);if(trace&&g.ticks%12===0)path.push({t:g.time,x:g.body.x,y:g.body.y});g.events.length=0;}return{level:g.level,state:g.state,stars:stars(g),time:g.time,cuts:g.stats.cuts,reason:g.reason,x:g.body.x,y:g.body.y,path};}
export const ORDERS=[[[1]],[[1,2]],[[1]],[[1]],[[2],[1]],[[1],[2]],[[1]],[[1,2]],[[1]],[[1,3],[2]],[[1]],[[1,2]],[[2,3],[1]],[[1],[2]],[[1],[2]],[[1,3,4],[2]]];
const TIMES=[[.2],[.2],[.55],[.65],[.2,.8],[.2,.8],[.2],[.2],[.4],[.2,.8],[.35],[.2],[.2,.8],[.2,.95],[.2,.8],[.2,.8]];
export const PLANS=TIMES.map((ts,i)=>ts.map((time,k)=>({time,ids:ORDERS[i][k]})));
// Initially stationary layouts allow time to inspect and release numbered locks one by one.
// Single swinging layouts keep their authored first-swing timing instead of pretending a delay is harmless.
export const DELIBERATE_PLANS=PLANS.map((plan,i)=>{if([2,3,8,10].includes(i))return plan;let extra=0;const actions=[];for(const a of plan){a.ids.forEach((id,k)=>actions.push({time:a.time+1+extra+k*.2,ids:[id]}));extra+=(a.ids.length-1)*.2;}return actions;});
