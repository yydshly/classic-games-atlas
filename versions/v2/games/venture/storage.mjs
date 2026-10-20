import {scenarios} from './engine.mjs?sale-rounding-r1';

// Keep the original key and complete v2 snapshot. Invalid records are never repaired in place.
export const KEY='atlas-venture-rivals-v2.1';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const actor=x=>x===0||x===1;
const winner=x=>actor(x)||x==='draw';
const position=x=>integer(x,0,11);
function validEvent(e,withRound,rounds){
 if(!object(e)||!integer(e.id,1)||(withRound&&!integer(e.round,1,rounds)))return false;
 if(e.type==='move')return actor(e.actor)&&position(e.from)&&position(e.to)&&integer(e.steps,1,6)&&typeof e.voucher==='boolean';
 if(e.type==='transaction')return actor(e.actor)&&typeof e.kind==='string'&&integer(e.amount)&&(e.index==null||position(e.index));
 if(e.type==='finish')return winner(e.winner)&&['bankruptcy','round-limit'].includes(e.reason);
 return false;
}
/** Structural checks protect records the current UI/engine cannot safely read; no normalization. */
export function validSave(s){
 if(!object(s)||s.version!==2)return false;
 const sc=scenarios.find(x=>x.id===s.scenario);
 if(!sc||!integer(s.round,1,sc.rounds)||!actor(s.turn)||!['ready','landed','finished'].includes(s.phase)||!integer(s.rng,1,0xffffffff))return false;
 if(!Array.isArray(s.players)||s.players.length!==2||!s.players.every((p,i)=>object(p)&&p.id===i&&integer(p.cash)&&position(p.position)&&integer(p.vouchers,0,2)&&typeof p.bankrupt==='boolean'))return false;
 if(!Array.isArray(s.shops)||s.shops.length!==12||!s.shops.every((p,i)=>object(p)&&(p.owner===null?p.level===0:actor(p.owner)&&integer(p.level,1,2)&&sc.board[i].type==='shop')))return false;
 if(!Array.isArray(s.events)||!s.events.every(e=>validEvent(e,false,sc.rounds))||!Array.isArray(s.log)||!s.log.every(e=>validEvent(e,true,sc.rounds)))return false;
 return (s.phase==='finished'?winner(s.winner):s.winner===null)&&(s.lastRoll===null||integer(s.lastRoll,1,6))&&integer(s.eventId)&&(s.error===null||typeof s.error==='string');
}
export function readSave(storage){
 try{
  const raw=storage.getItem(KEY);
  if(raw===null)return {state:null,protection:null};
  let state;
  try{state=JSON.parse(raw);}catch{return {state:null,protection:'invalid'};}
  return validSave(state)?{state,protection:null}:{state:null,protection:'invalid'};
 }catch{return {state:null,protection:'unavailable'};}
}
export function writeSave(storage,state,protection){
 if(protection)return false;
 try{storage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}
}
export function saveMessage(protection,saved){
 if(protection==='invalid')return '原存档无法识别，已停止覆盖。本次仅临时游玩，刷新或关闭会丢失本次进度。';
 if(protection)return '无法读取存档，已停止写入。本次仅临时游玩，刷新或关闭会丢失本次进度。';
 return saved?'进度已自动保存':'未能保存本次进度；仍可继续，刷新或关闭可能丢失当前进度。';
}
