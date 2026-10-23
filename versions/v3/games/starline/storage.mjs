import {freshJourney,readJourney} from './journey.mjs';
export const KEY='classic-atlas.starline.journey.v3';
export function journeyStorage(storage){
 let blocked=false,failed=false,reason='';
 let state=freshJourney();
 try {const text=storage.getItem(KEY);if(text!==null){const parsed=readJourney(JSON.parse(text));if(!parsed)throw Error('invalid');state=parsed;}}
 catch(error){blocked=true;reason=error instanceof SyntaxError||error?.message==='invalid'?'bad':'read';}
 return {
  state,
  write(value){if(blocked)return false;try{storage.setItem(KEY,JSON.stringify(value));failed=false;return true;}catch{failed=true;return false;}},
  status(){return {blocked,failed,reason};},
  message(){return blocked?(reason==='bad'?'原有本篇存档无法读取，已保留原字节并禁止覆盖。本次可临时游玩，刷新会丢失本次进度。':'无法读取本地存储，未覆盖任何旧记录。本次临时游玩，刷新会丢失本次进度。'):failed?'本次进度写入失败，旧存档仍保留。可以继续游玩，但刷新可能丢失最新进度；后续操作会再次尝试保存。':'仅保存本篇进度。刷新后暂停续玩；飞行中刷新完整回到这一发之前。v1 / v2 的旧档不受影响。';}
 };
}
