// Read-only ordinary UI order suggestions. Pausing, selecting and applying belong to the UI.
import {inspect,LEVELS} from '../../preview/moss/engine.mjs';
export function chooseAction(g,options={}){
 if(!['playing','paused'].includes(g.state))return null;const one=g.actors.find(a=>a.id===1),two=g.actors.find(a=>a.id===2),legal=(id,tool)=>inspect(g,id,tool).ok,order=(actorId,tool)=>({actorId,tool}),building=g.actors.some(a=>a.job?.tool==='bridge');
 if(g.level===2&&options.route==='bridge'){
  if(g.resources.block&&one?.state==='walking'&&one.dir===1&&one.x>=12&&!g.log.some(l=>l.actorId===1&&l.tool==='block'))return order(1,'block');
  if(g.resources.bridge&&two?.dir===-1&&legal(2,'bridge'))return order(2,'bridge');
  if(!g.resources.bridge&&!building&&one?.state==='blocking')return order(1,'release');return null;
 }
 if(g.level===2){if(g.resources.dig&&legal(1,'dig'))return order(1,'dig');return null;}
 if(g.level===3){
  if(g.resources.dig&&legal(1,'dig'))return order(1,'dig');
  if(options.strategy==='regroup'){
   const held=g.log.some(l=>l.actorId===1&&l.tool==='block');
   if(!held&&g.resources.bridge&&one?.state==='walking'&&one.dir===1&&one.x>=10&&legal(1,'block'))return order(1,'block');
   if(held&&one?.state==='blocking'&&g.time>=LEVELS[2].interval*(g.total-1)+8)return order(1,'release');
   if(held&&g.resources.bridge&&legal(1,'bridge'))return order(1,'bridge');return null;
  }
 }
 const threshold=g.level===1?6:9;
 if(g.resources.bridge&&g.resources.block&&one?.state==='walking'&&one.x>=threshold&&two?.state==='walking'&&two.dir===1&&two.x<one.x-.25&&legal(2,'block'))return order(2,'block');
 if(g.resources.bridge&&legal(1,'bridge'))return order(1,'bridge');
 if(!g.resources.bridge&&!building){const blocker=g.actors.find(a=>a.state==='blocking');if(blocker)return order(blocker.id,'release');}return null;
}
