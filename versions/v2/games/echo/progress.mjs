// UI continuity records are separate from the engine's active-session replay.
import {LEVELS,LIMIT,STEP} from './levels.mjs?v=echo2r1';
import {createGame,checkpoint,restore} from './engine.mjs?v=echo2r1';
export const SAVE='echo-v2-progress-r2',LEGACY_SAVE='echo-v2-session-r1';
const copy=x=>JSON.parse(JSON.stringify(x));
const keys=(x,list)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===list.slice().sort().join(',');
const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const level=n=>integer(n,1,LEVELS.length);
export function resultOf(g){return {state:g.state,ticks:g.ticks,hp:g.player.hp,ammo:g.player.ammo,weapon:g.player.weapon,keyCount:g.keys.length,spent:g.shots.filter(s=>s.owner==='player').reduce((sum,s)=>sum+s.cost,0),kills:g.stats.kills,reason:g.reason};}
function validResult(r,n){
 if(!keys(r,['state','ticks','hp','ammo','weapon','keyCount','spent','kills','reason']))return false;
 const l=LEVELS[n-1],required=l.pickups.filter(p=>p.kind==='key').length,maxAmmo=8+l.pickups.filter(p=>p.kind==='ammo').reduce((sum,p)=>sum+p.amount,0);
 return ['won','lost'].includes(r.state)&&integer(r.ticks,0,LIMIT/STEP)&&integer(r.hp,0,100)&&integer(r.ammo,0,16)&&['pulse','burst'].includes(r.weapon)&&integer(r.keyCount,0,required)&&integer(r.spent,0,maxAmmo)&&integer(r.kills,0,l.enemies.length)&&typeof r.reason==='string'&&r.reason.length>0&&r.reason.length<=240&&(r.state==='won'?r.hp>0&&r.keyCount===required&&r.ticks<LIMIT/STEP:r.hp===0||r.ticks===LIMIT/STEP);
}
export function recordFor(g,result=null){
 if(result)return {version:1,kind:'result',level:g.level,result:copy(result)};
 if(g.state==='ready')return {version:1,kind:'ready',level:g.level};
 if(['won','lost'].includes(g.state))return {version:1,kind:'result',level:g.level,result:resultOf(g)};
 const session=checkpoint(g);if(!session)throw Error('Unsupported continuity state');
 return {version:1,kind:'active',level:g.level,session};
}
export function decodeRecord(r){
 if(!r||r.version!==1||!level(r.level))return null;
 if(r.kind==='ready'&&keys(r,['version','kind','level']))return {game:createGame(r.level-1),result:null};
 if(r.kind==='result'&&keys(r,['version','kind','level','result'])&&validResult(r.result,r.level))return {game:createGame(r.level-1),result:copy(r.result)};
 if(r.kind==='active'&&keys(r,['version','kind','level','session'])&&keys(r.session,['version','level','ticks','commands'])&&r.session.level===r.level){const game=restore(r.session);if(game)return {game,result:null};}
 return null;
}
export function readProgress(storage){
 try{
  const raw=storage.getItem(SAVE);
  if(raw!==null){const decoded=decodeRecord(JSON.parse(raw));if(!decoded)throw Error('Invalid progress');return {...decoded,blocked:false,origin:'progress'};}
  const legacy=storage.getItem(LEGACY_SAVE);
  if(legacy!==null){const game=restore(JSON.parse(legacy));if(!game)throw Error('Invalid legacy session');return {game,result:null,blocked:false,origin:'legacy'};}
  return {game:createGame(0),result:null,blocked:false,origin:'fresh'};
 }catch{return {game:createGame(0),result:null,blocked:true,origin:'protected'};}
}
export function writeProgress(storage,g,result,blocked){
 if(blocked)return false;
 try{const record=recordFor(g,result);storage.setItem(SAVE,JSON.stringify(record));return true;}catch{return false;}
}
