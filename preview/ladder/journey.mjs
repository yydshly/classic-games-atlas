import {createGame,checkpoint,restore,LEVELS} from './engine.mjs';
export const KEY='classic-atlas.ladder.v1';
export const fresh=()=>({schema:1,last:1,phase:'playing',results:[],current:checkpoint(createGame(0))});
export function finish(p,g){
 if(g.state!=='won'||p.phase!=='playing'||p.last!==g.level)return false;
 p.results.push({level:g.level,id:LEVELS[g.level-1].id,time:g.time,collected:g.cores.filter(c=>c.collected).length,total:g.cores.length,digs:g.stats.digs,traps:g.stats.traps,steps:g.stats.steps});
 p.phase=g.level===LEVELS.length?'complete':'between';p.current=checkpoint(g);return true;
}
export function valid(p){try{
 if(!p||p.schema!==1||!Number.isInteger(p.last)||!LEVELS[p.last-1]||!['playing','between','complete'].includes(p.phase)||!Array.isArray(p.results)||p.results.length!==(p.phase==='playing'?p.last-1:p.last)||p.phase==='complete'&&p.last!==LEVELS.length||p.phase==='between'&&p.last===LEVELS.length)return false;
 for(let i=0;i<p.results.length;i++){
  const r=p.results[i],g=createGame(i);
  if(r.level!==i+1||r.id!==LEVELS[i].id||!Number.isFinite(r.time)||r.time<0||r.time>g.limit||r.total!==g.cores.length||r.collected!==r.total||!['digs','traps','steps'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<100000))return false;
 }
 const g=restore(p.current);return !!g&&g.level===p.last&&(p.phase==='playing'?g.state!=='won':g.state==='won');
}catch{return false;}}
export class JourneyStore{
 constructor(storage){this.storage=storage;this.data=fresh();this.reason='';this.blocked=false;let raw;try{if(!storage)throw Error();raw=storage.getItem(KEY);}catch{this.blocked=true;this.reason='read';return;}if(raw===null)return;try{const p=JSON.parse(raw);if(!valid(p))throw Error();this.data=p;}catch{this.blocked=true;this.reason='corrupt';}}
 save(p){if(this.blocked)return false;if(!valid(p))throw Error('Invalid ladder journey');try{this.storage.setItem(KEY,JSON.stringify(p));this.reason='';return true;}catch{this.reason='write';return false;}}
}
