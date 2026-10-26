import {ROOMS,ITEMS,NOTES,walkable} from './world.mjs?v=echoes-slice-1';
import {snapshot} from './engine.mjs?v=echoes-slice-1';
export const SAVE_KEY='classic-games-atlas:old-house-echoes:rescue:v1';
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
function validState(s){
 if(!s||s.schema!==1||!Object.hasOwn(ROOMS,s.room)||!['paused','lost','won'].includes(s.mode))return false;
 if(!s.player||!finite(s.player.x,1,19)||!finite(s.player.y,1,13)||!walkable(s.room,s.player.x,s.player.y,.24)||!finite(s.player.hp,0,100)||!finite(s.player.angle,-Math.PI,Math.PI)||!finite(s.player.invulnerable,0,2))return false;
 for(const [key,max] of [['inventory',6],['box',12]]){const a=s[key];if(!Array.isArray(a)||a.length>max||!a.every(i=>Object.hasOwn(ITEMS,i)))return false;}
 if(!Number.isInteger(s.loaded)||!finite(s.loaded,0,4)||!Number.isInteger(s.reserve)||!finite(s.reserve,0,5))return false;
 if(!s.flags||Object.keys(s.flags).some(k=>!['keyChecked','archive','power','loop','checkpoint'].includes(k)||typeof s.flags[k]!=='boolean'))return false;
 if(!Array.isArray(s.notes)||!s.notes.every(n=>Object.hasOwn(NOTES,n))||!Array.isArray(s.taken)||!s.taken.every(t=>['key','fuse','wire'].includes(t)))return false;
 if(!Array.isArray(s.visited)||!s.visited.every(r=>Object.hasOwn(ROOMS,r))||typeof s.rescued!=='boolean'||typeof s.message!=='string'||s.message.length>2000)return false;
 for(const id of ['pistol','rounds','flare','key','fuse','wire','repaired'])if([...s.inventory,...s.box].filter(i=>i===id).length>1)return false;
 if(!s.enemy||!finite(s.enemy.x,1,19)||!finite(s.enemy.y,1,13)||!walkable('corridor',s.enemy.x,s.enemy.y,.28)||!Number.isInteger(s.enemy.hp)||!finite(s.enemy.hp,0,4))return false;
 for(const k of ['cooldown','stun','windup'])if(!finite(s.enemy[k],0,2))return false;
 if(s.enemy.target!==null&&(!s.enemy.target||!finite(s.enemy.target.x,1,19)||!finite(s.enemy.target.y,1,13)))return false;
 if(!finite(s.elapsed,0,1e8)||!finite(s.cooldown,0,2)||!finite(s.transition,0,1)||!s.stats)return false;
 return ['shots','hits','damage','distance','doors','stores','full'].every(k=>finite(s.stats[k],0,1e8));
}
export function load(storage){try{const raw=storage.getItem(SAVE_KEY);if(raw===null)return {ok:true,save:null,checkpoint:null};if(raw.length>40000)throw Error('size');const o=JSON.parse(raw);if(o.schema!==1||!validState(o.save)||(o.checkpoint!==null&&!validState(o.checkpoint)))throw Error('shape');return {ok:true,save:o.save,checkpoint:o.checkpoint};}catch{return {ok:false,save:null,checkpoint:null,reason:'旧档不可读，当前旅程临时运行，不覆盖原字节。'};}}
export function persist(storage,s,checkpoint){try{const data={schema:1,save:snapshot(s),checkpoint:checkpoint?snapshot(checkpoint):null};if(!validState(data.save)||(data.checkpoint!==null&&!validState(data.checkpoint)))return false;storage.setItem(SAVE_KEY,JSON.stringify(data));return true;}catch{return false;}}
