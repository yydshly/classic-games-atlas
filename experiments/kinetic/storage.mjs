export const KEY='classic-atlas.ferry.prototype.v2';
export function validRecord(v){return v?.schema===2&&['near','arrival'].includes(v.dockStage)&&typeof v.crateStableOnPlate==='boolean'&&typeof v.completed==='boolean'&&(!v.completed||v.dockStage==='arrival')&&['falls','jumps'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=1e6);}
export function checkpointStore(storage){
 let record=null,blocked=false,failed=false;
 try{const raw=storage.getItem(KEY);if(raw!==null){const parsed=JSON.parse(raw);if(!validRecord(parsed))throw Error('invalid');record=parsed;}}catch{blocked=true;}
 return {record,write(v){if(blocked||!validRecord(v))return false;try{storage.setItem(KEY,JSON.stringify(v));record=structuredClone(v);failed=false;return true;}catch{failed=true;return false;}},status(){return{blocked,failed};},message(){return blocked?'原码头记录无法读取，已保留原字节。本次可临时玩，刷新不会保留新安排。':failed?'这次安排未能保存，旧记录保留；可继续玩，刷新可能回到之前的岸边。':'只保存岸边的稳定安排；刷新先暂停，不恢复船上瞬时位置。旧实验与原45款存档保留。';}};
}
