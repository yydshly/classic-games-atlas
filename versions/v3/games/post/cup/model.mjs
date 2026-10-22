import {createGame,start,checkpoint,restore,standings} from '../engine.mjs?v=post-v3-r1';
import {TRACKS} from '../tracks.mjs?v=post-v3-r1';
export const STATIONS=Object.freeze(TRACKS.map(t=>({routeId:t.routeId,name:t.name,limit:t.limit,gates:t.gateCount*t.laps})));
export const CARS=Object.freeze([{id:'player',name:'你'},{id:'rival-1',name:'青鸟'},{id:'rival-2',name:'赤狐'}]);
export const KEY='classic-atlas.post.cup.v1',RULES='two-stop-sealed-3-2-1-stage0-v1';
const clone=v=>JSON.parse(JSON.stringify(v));
export const points=row=>row.finishTime===null?0:4-row.rank;
export function createSession(){return {cup:{version:1,rulesId:RULES,index:0,phase:'ready',results:[]},battle:createGame(0,STATIONS[0].routeId)};}
export function begin(s){if(s.cup.phase!=='ready'||s.battle.state!=='ready')return false;start(s.battle);s.cup.phase='racing';return true;}
function validResult(r,index){
 const t=STATIONS[index];if(!r||r.routeId!==t.routeId||!Number.isFinite(r.time)||r.time<.1||r.time>t.limit+.01||!['完成两圈','超时'].includes(r.reason)||!Array.isArray(r.rows)||r.rows.length!==3)return false;
 const ids=new Set();let unfinished=false,lastTime=0;
 for(let i=0;i<3;i++){const c=r.rows[i];if(!c||!CARS.some(x=>x.id===c.id)||ids.has(c.id)||c.rank!==i+1||!Number.isInteger(c.gates)||c.gates<0||c.gates>t.gates)return false;ids.add(c.id);
  if(c.finishTime===null){unfinished=true;if(c.gates===t.gates)return false;}else{if(unfinished||!Number.isFinite(c.finishTime)||c.finishTime<.1||c.finishTime>r.time+1e-6||c.finishTime<lastTime||c.gates!==t.gates)return false;lastTime=c.finishTime;}
 }
 const player=r.rows.find(c=>c.id==='player');return player.finishTime===null?r.reason==='超时'&&Math.abs(r.time-t.limit)<.01:r.reason==='完成两圈'&&Math.abs(player.finishTime-r.time)<1e-6;
}
export function recordFinish(s){
 const {cup,battle:g}=s;if(cup.phase!=='racing'||cup.results.length!==cup.index||g.state!=='finished'||g.stats.settlements!==1||g.stage!==0||g.routeId!==STATIONS[cup.index].routeId)return false;
 const result={routeId:g.routeId,time:g.time,reason:g.reason,rows:standings(g).map(r=>{const c=g.cars.find(c=>c.id===r.id);return {id:r.id,rank:r.rank,finishTime:c.finishedAt,gates:c.stats.gates};})};if(!validResult(result,cup.index))return false;
 cup.results.push(result);cup.phase=cup.index===0?'between':'complete';return true;
}
export function advance(s){if(s.cup.phase!=='between'||s.cup.index!==0||s.cup.results.length!==1)return false;s.cup.index=1;s.cup.phase='ready';s.battle=createGame(0,STATIONS[1].routeId);return true;}
export function totals(cup){
 const rows=CARS.map(c=>({...c,points:cup.results.reduce((n,r)=>n+points(r.rows.find(x=>x.id===c.id)),0)})).sort((a,b)=>b.points-a.points);
 return rows.map(r=>({...r,rank:1+rows.filter(x=>x.points>r.points).length,tied:rows.filter(x=>x.points===r.points).length>1}));
}
export function saveValue(s){return {...clone(s.cup),resume:['ready','racing'].includes(s.cup.phase)?checkpoint(s.battle):null};}
export function restoreSession(v){
 if(!v||v.version!==1||v.rulesId!==RULES||![0,1].includes(v.index)||!['ready','racing','between','complete'].includes(v.phase)||!Array.isArray(v.results)||v.results.length>2||!v.results.every(validResult))return null;
 const terminal=v.phase==='between'||v.phase==='complete';if(v.phase==='between'&&(v.index!==0||v.results.length!==1)||v.phase==='complete'&&(v.index!==1||v.results.length!==2)||!terminal&&v.results.length!==v.index)return null;
 let battle;if(terminal){if(v.resume!==null)return null;battle=createGame(0,STATIONS[v.index].routeId);}else{battle=restore(v.resume);if(!battle||battle.stage!==0||battle.routeId!==STATIONS[v.index].routeId||v.phase==='ready'&&battle.state!=='ready'||v.phase==='racing'&&battle.state!=='paused')return null;}
 return {cup:{version:1,rulesId:RULES,index:v.index,phase:v.phase,results:clone(v.results)},battle};
}
export function readSession(store){const result={session:createSession(),available:true,blocked:false,restored:false};let raw;try{raw=store.getItem(KEY);}catch{return {...result,available:false,blocked:true};}if(raw!==null){try{const s=restoreSession(JSON.parse(raw));if(!s)throw Error('format');result.session=s;result.restored=true;}catch{result.blocked=true;}}return result;}
export function writeSession(store,s,blocked=false){if(blocked)return 'blocked';try{store.setItem(KEY,JSON.stringify(saveValue(s)));return 'saved';}catch{return 'failed';}}
