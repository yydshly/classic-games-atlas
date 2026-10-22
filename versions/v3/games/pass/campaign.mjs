import {createGame,checkpoint,restore,MAPS} from './engine.mjs';
export const KEY='classic-atlas.pass.campaign.v3';
export function fresh(){return {schema:1,mapIndex:0,phase:'briefing',results:[],resume:null};}
export function valid(s){
 if(!s||s.schema!==1||!Number.isInteger(s.mapIndex)||s.mapIndex<0||s.mapIndex>=MAPS.length||!['briefing','battle','between','complete'].includes(s.phase)||!Array.isArray(s.results))return false;
 const count=s.phase==='briefing'?0:s.mapIndex+(['between','complete'].includes(s.phase)?1:0);
 if(s.results.length!==count||s.phase==='briefing'&&s.mapIndex!==0||s.phase==='complete'&&s.mapIndex!==MAPS.length-1||s.phase==='between'&&s.mapIndex===MAPS.length-1)return false;
 if(!s.results.every((r,i)=>r.mapIndex===i&&Number.isInteger(r.hp)&&r.hp>0&&r.hp<=12&&Number.isFinite(r.time)&&r.time>=0&&Number.isInteger(r.kills)&&r.kills>=0&&Number.isInteger(r.leaks)&&r.leaks>=0))return false;
 if(s.phase==='briefing')return s.resume===null;
 const g=restore(s.resume);
 return !!g&&g.mapIndex===s.mapIndex&&(s.phase==='battle'?['playing','paused','lost'].includes(g.state):g.state==='won');
}
export function enter(s){
 if(s.phase==='complete'||s.phase==='battle')return null;
 const i=s.phase==='between'?s.mapIndex+1:s.mapIndex;
 const g=createGame(i);s.mapIndex=i;s.phase='battle';s.resume=checkpoint(g);return g;
}
export function retry(s){
 if(s.phase!=='battle')return null;
 const g=createGame(s.mapIndex);s.resume=checkpoint(g);return g;
}
export function settle(s,g){
 if(s.phase!=='battle'||g.state!=='won'||g.mapIndex!==s.mapIndex)return false;
 s.results.push({mapIndex:g.mapIndex,hp:g.hp,time:g.time,kills:g.kills,leaks:g.leaks});
 s.phase=s.mapIndex===MAPS.length-1?'complete':'between';s.resume=checkpoint(g);return true;
}
export class CampaignStore{
 constructor(storage){
  this.storage=storage;this.data=fresh();this.blocked=false;this.reason='';
  let raw;try{if(!storage)throw Error();raw=storage.getItem(KEY);}catch{this.blocked=true;this.reason='read';return;}
  if(raw===null)return;
  try{const s=JSON.parse(raw);if(!valid(s))throw Error();this.data=s;}catch{this.blocked=true;this.reason='corrupt';}
 }
 save(s){
  if(this.blocked)return false;
  if(!valid(s))throw Error('Invalid campaign state');
  try{this.storage.setItem(KEY,JSON.stringify(s));this.reason='';return true;}
  catch{this.reason='write';return false;}
 }
}
