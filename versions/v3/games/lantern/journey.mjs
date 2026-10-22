import {LEVELS} from './levels.mjs';
import {checkpoint,restore} from './engine.mjs';
export const KEY='classic-atlas.lantern.journey.v3';
export const fresh=()=>({schema:1,last:1,phase:'playing',results:[],best:{},tutorialSeen:false,sound:false,resume:null});
const best=r=>r&&Number.isFinite(r.time)&&r.time>0&&Number.isInteger(r.lives)&&r.lives>0&&r.lives<=3&&Number.isSafeInteger(r.captures)&&r.captures>=0;
export function valid(p){
 if(!p||p.schema!==1||!Number.isInteger(p.last)||!LEVELS[p.last-1]||!['playing','between','complete'].includes(p.phase)||!Array.isArray(p.results)||p.results.length!==(p.phase==='playing'?p.last-1:p.last)||p.phase==='complete'&&p.last!==LEVELS.length||p.phase==='between'&&p.last===LEVELS.length||typeof p.sound!=='boolean'||typeof p.tutorialSeen!=='boolean'||!p.best||typeof p.best!=='object'||Array.isArray(p.best))return false;
 if(!p.results.every((r,i)=>r.level===i+1&&best(r)&&Number.isSafeInteger(r.total)&&r.total>0&&r.collected===r.total)||Object.entries(p.best).some(([id,r])=>!LEVELS[+id-1]||!best(r)))return false;
 if(p.resume===null)return p.last===1&&p.phase==='playing'&&!p.results.length;
 const g=restore(p.resume);return !!g&&g.level===p.last&&(p.phase==='playing'?g.state!=='won':g.state==='won');
}
export function finish(p,g){
 if(p.phase!=='playing'||g.state!=='won'||g.level!==p.last)return false;
 const r={level:g.level,time:g.time,lives:g.lives,captures:g.stats.captures,collected:g.stats.collected,total:g.dots.length};p.results.push(r);const old=p.best[g.level];if(!old||r.time<old.time)p.best[g.level]={time:r.time,lives:r.lives,captures:r.captures};p.phase=g.level===LEVELS.length?'complete':'between';p.resume=checkpoint(g);return true;
}
export class JourneyStore{
 constructor(storage){this.storage=storage;this.data=fresh();this.reason='';this.blocked=false;let raw;try{if(!storage)throw Error();raw=storage.getItem(KEY);}catch{this.blocked=true;this.reason='read';return;}if(raw===null)return;try{const p=JSON.parse(raw);if(!valid(p))throw Error();this.data=p;}catch{this.blocked=true;this.reason='corrupt';}}
 save(p){if(this.blocked)return false;if(!valid(p))throw Error('Invalid lantern journey');try{this.storage.setItem(KEY,JSON.stringify(p));this.reason='';return true;}catch{this.reason='write';return false;}}
}
