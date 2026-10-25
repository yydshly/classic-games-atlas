// Read-only descriptions of recorded facts, never a suggested solution.
import {MAX_FALL} from './engine.mjs?v=moss-feedback-r1';
const causes=new Set(['落入水隙','落差超过安全高度','离开了归途']);
export function latestIncident(g){
 const records=[];
 for(const a of g.actors){
  if(a.state!=='lost')continue;
  let loss=a.lossEvent;
  if(!loss){const event=[...g.events].reverse().find(e=>e.text.startsWith(`苔灯 ${a.id}失足：`));if(event)loss={time:event.time,cause:event.text.split('失足：')[1]};}
  if(!loss||!causes.has(loss.cause))continue;
  const f=a.fallOrigin,point=f?{x:f.x+.5,y:f.y}:{x:a.x,y:a.y};
  records.push({actorId:a.id,time:loss.time,cause:loss.cause,point,fromFall:!!f,unfinishedBridge:f?.bridgeActorId!=null,drop:Math.round((a.y-a.fallStart)*10)/10});
 }
 return records.sort((a,b)=>b.time-a.time||b.actorId-a.actorId)[0]??null;
}
export function incidentCopy(g,incident=latestIncident(g)){
 if(!incident)return null;
 const zone=incident.point.x<g.grid.width*.4?'左侧':incident.point.x>g.grid.width*.6?'右侧':'中段';
 const cause=incident.cause==='落差超过安全高度'?`下降${incident.drop}格，超过安全落差${MAX_FALL}格`:incident.cause;
 return {message:`${incident.actorId}号在${zone}失散：${cause}（${incident.time.toFixed(2)}秒）。`,context:incident.unfinishedBridge?'开始下落时，叉号处的桥尚未完工。':incident.fromFall?'叉号标记了开始下落的位置。':'叉号标记了这位同伴的最后位置。'};
}
