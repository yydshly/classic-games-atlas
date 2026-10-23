import {trackFor,gates} from './tracks.mjs?v=post-v4-r1';

// Presentation only: point at the next legally required gate, never the nearest.
export function gateTarget(game) {
  const car=game.car||game.cars?.[0],track=trackFor(game);
  if(!['ready','countdown','playing','paused'].includes(game.state)||!track||!car||
    car.finishedAt!=null||!Number.isInteger(car.nextGate)||car.nextGate<0||car.nextGate>=track.gateCount)return {visible:false};
  const point=gates(track)[car.nextGate],length=track.halfWidth+130;
  const labelX=point.x-point.ty*length,labelY=point.y+point.tx*length;
  return {visible:true,gate:point.id,text:point.id===0?'本圈终点线':`下一闸门 ${point.id}`,
    x:point.x,y:point.y,labelX,labelY,length,angle:Math.atan2(labelY-point.y,labelX-point.x)};
}
