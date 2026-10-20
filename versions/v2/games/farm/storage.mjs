import {restore} from './engine.mjs';
export const KEY='classic-atlas.farm.continuity.v2';
export function readSave(storage){try{const raw=storage.getItem(KEY);if(raw===null)return {checkpoint:null,game:null,protection:null};let cp;try{cp=JSON.parse(raw);}catch{return {checkpoint:null,game:null,protection:'invalid'};}const game=restore(cp);return game?{checkpoint:cp,game,protection:null}:{checkpoint:null,game:null,protection:'invalid'};}catch{return {checkpoint:null,game:null,protection:'unavailable'};}}
export function writeSave(storage,cp,protection){if(protection)return false;try{storage.setItem(KEY,JSON.stringify(cp));return true;}catch{return false;}}
export function storageMessage(protection){return protection==='invalid'?'原存档无法识别，已停止覆盖。本次仅临时游玩，刷新或关闭会丢失本次进度。':protection?'无法读取存档，已停止写入。本次仅临时游玩，刷新或关闭会丢失本次进度。':'本次进度未能保存。仍可继续；刷新或关闭可能丢失当前进度，后续操作会再尝试保存。';}
