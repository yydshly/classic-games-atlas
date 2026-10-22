import {LEVELS} from './levels.mjs';
import {checkpoint,restore} from './engine.mjs';
export const KEY='classic-atlas.cloud.campaign.v3';
export const fresh=()=>({schema:1,last:1,phase:'playing',results:[],best:{},tutorialSeen:false,sound:false,resume:null});
const result=r=>r&&Number.isFinite(r.time)&&r.time>0&&r.time<=120&&Number.isInteger(r.hp)&&r.hp>0&&r.hp<=3&&Number.isSafeInteger(r.score)&&r.score>=0&&Number.isSafeInteger(r.kills)&&r.kills>=0&&Number.isInteger(r.shields)&&r.shields>=0&&r.shields<=2;
export function valid(p){
 if(!p||p.schema!==1||!Number.isInteger(p.last)||!LEVELS[p.last-1]||!['playing','between','complete'].includes(p.phase)||!Array.isArray(p.results)||p.results.length!==(p.phase==='playing'?p.last-1:p.last)||p.phase==='complete'&&p.last!==LEVELS.length||p.phase==='between'&&p.last===LEVELS.length||typeof p.sound!=='boolean'||typeof p.tutorialSeen!=='boolean'||!p.best||typeof p.best!=='object'||Array.isArray(p.best))return false;
 if(!p.results.every((r,i)=>r.level===i+1&&result(r))||Object.entries(p.best).some(([id,r])=>!LEVELS[+id-1]||!result(r)))return false;
 if(p.resume===null)return p.last===1&&p.phase==='playing'&&!p.results.length;
 const g=restore(p.resume);return !!g&&g.level===p.last&&(p.phase==='playing'?g.state!=='won':g.state==='won');
}
export function finish(p,g){
 if(p.phase!=='playing'||g.state!=='won'||g.level!==p.last)return false;
 const r={level:g.level,time:g.time,hp:g.player.hp,score:g.stats.score,kills:g.stats.kills,shields:g.stats.shields};p.results.push(r);const old=p.best[g.level];if(!old||r.score>old.score||r.score===old.score&&r.time<old.time)p.best[g.level]={...r};p.phase=g.level===LEVELS.length?'complete':'between';p.resume=checkpoint(g);return true;
}
export class JourneyStore{
 constructor(storage){this.storage=storage;this.data=fresh();this.reason='';this.blocked=false;let raw;try{if(!storage)throw Error();raw=storage.getItem(KEY);}catch{this.blocked=true;this.reason='read';return;}if(raw===null)return;try{const p=JSON.parse(raw);if(!valid(p))throw Error();this.data=p;}catch{this.blocked=true;this.reason='corrupt';}}
 save(p){if(this.blocked)return false;if(!valid(p))throw Error('Invalid cloud campaign');try{this.storage.setItem(KEY,JSON.stringify(p));this.reason='';return true;}catch{this.reason='write';return false;}}
}
