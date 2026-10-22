import {createGame,checkpoint,restore,GEAR} from './engine.mjs';
export const KEY='classic-atlas.glimmer.v1';
export const validGear=g=>g&&GEAR[g.weapon]?.slot==='weapon'&&(g.charm===null||GEAR[g.charm]?.slot==='charm');
export function fresh(){const g=createGame(0);return {format:'glimmer-three-vaults',version:1,last:1,unlocked:1,entries:{1:{...g.entryGear}},completed:{},current:checkpoint(g)};}
export function validate(p){try{
 if(p?.format!=='glimmer-three-vaults'||p.version!==1||!Number.isInteger(p.last)||p.last<1||p.last>3||!Number.isInteger(p.unlocked)||p.unlocked<1||p.unlocked>3||p.last>p.unlocked||!p.entries||!p.completed||Array.isArray(p.entries)||Array.isArray(p.completed))return null;
 for(const [n,g]of Object.entries(p.entries))if(!['1','2','3'].includes(n)||!validGear(g))return null;
 for(let n=1;n<=p.unlocked;n++)if(!p.entries[n]||(n<p.unlocked&&!p.completed[n]))return null;
 for(const [n,d]of Object.entries(p.completed))if(!['1','2','3'].includes(n)||d.level!==Number(n)||typeof d.title!=='string'||!Number.isFinite(d.time)||d.time<0||d.time>Number.MAX_SAFE_INTEGER/30||!validGear(d.gear)||!Number.isInteger(d.kills)||d.kills<0||!Number.isFinite(d.hp)||d.hp<=0||!Number.isFinite(d.damageTaken)||d.damageTaken<0)return null;
 const game=restore(p.current);if(!game||game.level!==p.last||JSON.stringify(game.entryGear)!==JSON.stringify(p.entries[p.last]))return null;
 return {progress:JSON.parse(JSON.stringify(p)),game};
 }catch{return null;}}
export function readSave(storage){try{const raw=storage.getItem(KEY);if(raw===null){const progress=fresh();return {progress,game:restore(progress.current),protection:null};}const value=validate(JSON.parse(raw));return value?{...value,protection:null}:{progress:fresh(),game:createGame(0),protection:'invalid'};}catch(e){return {progress:fresh(),game:createGame(0),protection:e instanceof SyntaxError?'invalid':'unavailable'};}}
export function writeSave(storage,p,protection){if(protection)return false;try{storage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}}
export function warning(protection){return protection==='invalid'?'原存档无法识别，已保留原字节并停止覆盖。本次仍可临时游玩，刷新或关闭会丢失本次进度。':protection?'无法读取存档，已停止覆盖。本次仅临时游玩，刷新或关闭会丢失本次进度。':'本次未能保存。仍可继续；刷新或关闭可能丢失当前进度，后续操作会再次尝试保存。';}
