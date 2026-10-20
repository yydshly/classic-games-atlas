import {restore} from './engine.mjs';
export const KEY='classic-atlas.island.v2';
export const emptyProgress=()=>({version:2,tutorialSeen:false,sound:false,best:null,resume:null});
export function readProgress(storage){
 try{const raw=storage.getItem(KEY);if(raw===null)return {progress:emptyProgress(),protection:null};
  let p;try{p=JSON.parse(raw);}catch{return {progress:emptyProgress(),protection:'invalid'};}
  const best=p?.best,valid=p&&p.version===2&&typeof p.tutorialSeen==='boolean'&&typeof p.sound==='boolean'&&(best==null||['score','cash','turn'].every(k=>Number.isFinite(best[k])))&&(p.resume==null||restore(p.resume)!==null);
  return valid?{progress:p,protection:null}:{progress:emptyProgress(),protection:'invalid'};
 }catch{return {progress:emptyProgress(),protection:'unavailable'};}
}
export function writeProgress(storage,progress,protection){if(protection)return false;try{storage.setItem(KEY,JSON.stringify(progress));return true;}catch{return false;}}
export function storageMessage(protection){return protection==='invalid'?'原存档无法识别，已停止覆盖。本次仅临时游玩，刷新或关闭会丢失本次进度。':protection?'无法读取存档，已停止写入。本次仅临时游玩，刷新或关闭会丢失本次进度。':'本次进度未能保存。仍可继续；刷新或关闭可能丢失当前进度，后续操作会再尝试保存。';}
