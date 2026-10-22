import {LEVELS} from './levels.mjs';
export const PHASES=['ready','active','intermission','lost','complete'];
const copy=x=>JSON.parse(JSON.stringify(x)),int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export const fresh=()=>({version:3,stage:0,phase:'ready',completed:[],failures:[0,0,0],lastLoss:null,resume:null,tutorialSeen:false,sound:true,speed:1});
export const inBattle=s=>['ready','active'].includes(s.phase);
function validResult(r,i,kind){
 return r&&r.stage===i&&r.kind===kind&&Number.isFinite(r.time)&&r.time>=0&&r.time<=150&&int(r.score,10000)&&typeof r.reason==='string'&&r.reason.length<500&&
  r.stats&&['kills','losses','placed','spent','collected','jumps','triggers','slowHits','settlements'].every(k=>int(r.stats[k]))&&r.stats.settlements===1&&
  r.stats.kills<=LEVELS[i].spawns.length&&(kind!=='won'||r.stats.kills===LEVELS[i].spawns.length);
}
export function valid(s){
 if(!s||s.version!==3||!int(s.stage,2)||!PHASES.includes(s.phase)||!Array.isArray(s.completed)||!s.completed.every((r,i)=>validResult(r,i,'won'))||
  !Array.isArray(s.failures)||s.failures.length!==3||!s.failures.every(n=>int(n))||typeof s.tutorialSeen!=='boolean'||typeof s.sound!=='boolean'||![1,2].includes(s.speed))return false;
 const count=s.phase==='complete'?3:s.phase==='intermission'?s.stage+1:s.stage;
 if(s.completed.length!==count||s.phase==='complete'&&s.stage!==2||s.phase==='intermission'&&s.stage===2)return false;
 if(s.phase==='lost'){if(!validResult(s.lastLoss,s.stage,'lost')||!s.failures[s.stage])return false;}
 else if(s.lastLoss!==null)return false;
 if(!inBattle(s)&&s.resume!==null)return false;
 if(s.resume&&(s.resume.level!==s.stage+1||s.resume.state!==(s.phase==='ready'?'ready':'playing')))return false;
 return s.phase!=='active'||!!s.resume;
}
export function settle(s,g,points){
 if(s.phase!=='active'||!['won','lost'].includes(g.state))return s;
 const r={stage:g.level-1,kind:g.state,time:g.time,score:points,reason:g.reason||'',stats:copy(g.stats)};
 if(r.stage!==s.stage||!validResult(r,s.stage,g.state))throw Error('Invalid stage outcome');
 if(g.state==='lost'){const failures=[...s.failures];failures[s.stage]++;return {...s,phase:'lost',resume:null,failures,lastLoss:r};}
 return {...s,phase:s.stage===2?'complete':'intermission',completed:[...s.completed,r],lastLoss:null,resume:null};
}
export const advance=s=>s.phase==='intermission'?{...s,stage:s.stage+1,phase:'ready',lastLoss:null,resume:null}:s;
export const retry=s=>['ready','active','lost'].includes(s.phase)?{...s,phase:'ready',lastLoss:null,resume:null}:s;
export const summary=s=>({completed:s.completed.length,score:s.completed.reduce((a,r)=>a+r.score,0),time:s.completed.reduce((a,r)=>a+r.time,0),failures:s.failures.reduce((a,n)=>a+n,0)});
