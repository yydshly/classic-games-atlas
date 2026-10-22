import {command} from './engine.mjs';

// Preview the real command on a disposable copy, never replaying or stepping
// the live game. Selection order, costs and travel time remain engine-owned.
export function deploymentPreview(game,front,count=1){
 const probe=JSON.parse(JSON.stringify(game));
 const result=command(probe,{type:'deploy',front,count});
 if(!result.ok)return {ok:false,reason:result.error,moves:[],costs:[]};
 const original=new Map(game.guards.map(g=>[g.id,g]));
 const moves=probe.guards.filter(g=>{
  const old=original.get(g.id);
  return old&&old.remaining===0&&g.remaining>0&&g.front==='travel'&&g.target===front;
 }).map(g=>({id:g.id,from:g.from,to:g.target,seconds:g.travelDuration}));
 const stationed=(state,f)=>state.guards.filter(g=>g.hp>0&&g.remaining===0&&g.front===f).length;
 const sources=[...new Set(moves.map(g=>g.from))];
 return {ok:true,moves,costs:sources.map(from=>({from,before:stationed(game,from),after:stationed(probe,from)})),target:front,stationed:stationed(game,front)};
}
