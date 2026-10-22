import {createGame,checkpoint,restore} from './engine.mjs';
export const KEY='classic-atlas.windowlife.v1';
export function fresh(){return {format:'windowlife-three-days',version:1,last:1,unlocked:1,completed:{},layouts:{},current:checkpoint(createGame(0))};}
export function validate(p){
 try{
  if(p?.format!=='windowlife-three-days'||p.version!==1||!Number.isInteger(p.last)||p.last<1||p.last>3||!Number.isInteger(p.unlocked)||p.unlocked<1||p.unlocked>3||p.last>p.unlocked||!p.completed||Array.isArray(p.completed)||!p.layouts||Array.isArray(p.layouts))return null;
  for(const [id,v]of Object.entries(p.completed))if(!['1','2','3'].includes(id)||v.level!==Number(id)||typeof v.title!=='string'||!Number.isFinite(v.time)||v.time<0||v.time>110||!Array.isArray(v.people)||v.people.length<1||v.people.length>2||v.people.some(a=>typeof a.name!=='string'||!a.needs||Object.keys(a.needs).length!==4||['hunger','energy','hygiene','mood'].some(k=>!Number.isFinite(a.needs[k])||a.needs[k]<0||a.needs[k]>100)))return null;
  for(let n=1;n<p.unlocked;n++)if(!p.completed[n])return null;
  if(Object.keys(p.layouts).some(k=>!['1','2','3'].includes(k)))return null;
  for(const [id,layout]of Object.entries(p.layouts)){const probe=createGame(Number(id)-1,layout);for(const [key,pos]of Object.entries(layout)){const o=probe.objects.find(o=>o.id===key);if(!['desk','bench'].includes(key)||!o||pos?.x!==o.x||pos?.y!==o.y)return null;}}
  const game=restore(p.current);if(!game||game.level!==p.last)return null;
  return {progress:JSON.parse(JSON.stringify(p)),game};
 }catch{return null;}
}
export function readSave(storage){
 try{const raw=storage.getItem(KEY);if(raw===null){const progress=fresh();return {progress,game:restore(progress.current),protection:null};}const parsed=validate(JSON.parse(raw));return parsed?{...parsed,protection:null}:{progress:fresh(),game:createGame(0),protection:'invalid'};}
 catch(error){const invalid=error instanceof SyntaxError;return {progress:fresh(),game:createGame(0),protection:invalid?'invalid':'unavailable'};}
}
export function writeSave(storage,progress,protection){if(protection)return false;try{storage.setItem(KEY,JSON.stringify(progress));return true;}catch{return false;}}
export function warning(protection){return protection==='invalid'?'原存档无法识别，已保留原字节并停止覆盖。本次可临时游玩，刷新或关闭会丢失本次进度。':protection?'无法读取存档，已停止覆盖。本次可临时游玩，刷新或关闭会丢失本次进度。':'这次未能保存。仍可继续游玩；刷新或关闭可能丢失当前进度，后续操作会再次尝试保存。';}
