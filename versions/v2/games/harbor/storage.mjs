import {restore} from './engine.mjs';
export const KEY='classic-atlas.harbor.growth.v2';
export const emptyProgress=()=>({version:2,unlocked:1,last:1,best:{},seen:false,resume:null});
const result=protection=>({progress:emptyProgress(),game:null,protection});
export function readProgress(storage){
 let raw;try{raw=storage.getItem(KEY);}catch{return result('unavailable');}if(raw===null)return result(null);
 try{const p=JSON.parse(raw),range=x=>Number.isInteger(x)&&x>=1&&x<=3;
  if(!p||p.version!==2||!range(p.unlocked)||!range(p.last)||typeof p.seen!=='boolean'||!p.best||typeof p.best!=='object'||Array.isArray(p.best)||!Object.entries(p.best).every(([k,b])=>['1','2','3'].includes(k)&&b&&['score','turn','cash','waits'].every(x=>Number.isFinite(b[x]))))return result('invalid');
  const game=p.resume==null?null:restore(p.resume);if(p.resume!=null&&!game)return result('invalid');return {progress:p,game,protection:null};
 }catch{return result('invalid');}
}
export function writeProgress(storage,p,protection){if(protection)return false;try{storage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}}
export function storageMessage(protection,saved){return protection==='invalid'?'原存档无法识别，已停止覆盖。本次仅临时游玩，刷新或关闭会丢失本次进度。':protection?'无法读取存档，已停止写入。本次仅临时游玩，刷新或关闭会丢失本次进度。':saved?'已确认操作自动保存。刷新先暂停；未确认输入不保存。':'本次进度未能保存。仍可继续；刷新或关闭可能丢失当前进度，后续操作会再尝试保存。';}
