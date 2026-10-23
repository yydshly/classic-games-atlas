export const STAGE_COUNT=3;
export const PHASES=['briefing','battle','intermission','defeat','complete'];
const copy=value=>JSON.parse(JSON.stringify(value));
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const fresh=(mode=1)=>({schema:2,mode:mode===2?2:1,started:false,stage:0,phase:'briefing',wins:[],failures:Array(STAGE_COUNT).fill(0),lastLoss:null});
function validResult(r,stage,mode,kind){
 return r&&r.stage===stage&&r.mode===mode&&r.kind===kind&&Number.isFinite(r.time)&&r.time>=0&&integer(r.score)&&integer(r.kills,0,6)&&integer(r.base,0,3)&&
  typeof r.reason==='string'&&r.reason.length<=500&&Array.isArray(r.players)&&r.players.length===mode&&
  r.players.every((p,i)=>p.number===i+1&&integer(p.lives,0,3)&&integer(p.inputTicks))&&
  (kind!=='won'||r.kills===6&&r.base>0&&r.players.some(p=>p.lives>0));
}
export function validCampaign(s){
 if(!s||s.schema!==2||![1,2].includes(s.mode)||typeof s.started!=='boolean'||!integer(s.stage,0,STAGE_COUNT-1)||!PHASES.includes(s.phase)||
  !Array.isArray(s.wins)||s.wins.length>STAGE_COUNT||!s.wins.every((r,i)=>validResult(r,i,s.mode,'won'))||
  !Array.isArray(s.failures)||s.failures.length!==STAGE_COUNT||!s.failures.every(n=>integer(n)))return false;
 const expected=s.phase==='complete'?STAGE_COUNT:s.phase==='intermission'?s.stage+1:s.stage;
 if(s.wins.length!==expected||s.phase==='intermission'&&s.stage>=STAGE_COUNT-1||s.phase==='complete'&&s.stage!==STAGE_COUNT-1)return false;
 if(!s.started&&(s.stage!==0||s.phase!=='briefing'||s.wins.length||s.failures.some(Boolean)))return false;
 if(s.phase==='defeat')return s.started&&validResult(s.lastLoss,s.stage,s.mode,'lost')&&s.failures[s.stage]>0;
 return s.lastLoss===null&&(s.phase==='briefing'||s.started);
}
export function restored(s){
 if(!validCampaign(s))return null;
 const data=copy(s),restartedBattle=data.phase==='battle';
 if(restartedBattle)data.phase='briefing';
 return {data,restartedBattle};
}
export function selectMode(s,mode){return !s.started&&s.phase==='briefing'&&[1,2].includes(mode)?{...s,mode}:s;}
export function begin(s){return s.phase==='briefing'?{...s,started:true,phase:'battle',lastLoss:null}:s;}
export function prepareCurrent(s){return ['battle','defeat'].includes(s.phase)?{...s,phase:'briefing',lastLoss:null}:s;}
export function advance(s){return s.phase==='intermission'&&s.stage<STAGE_COUNT-1?{...s,stage:s.stage+1,phase:'briefing',lastLoss:null}:s;}
export function settle(s,game,inputTicks=[]){
 if(s.phase!=='battle'||!['won','lost'].includes(game.state))return s;
 const result={stage:game.index,mode:game.mode,kind:game.state,time:game.time,score:game.score,kills:game.kills,base:game.base.hp,
  reason:game.state==='lost'?(game.resultReason||'防线失守'):'',
  players:game.players.map((p,i)=>({number:i+1,lives:p.lives,inputTicks:inputTicks[i]||0}))};
 if(game.index!==s.stage||!validResult(result,s.stage,s.mode,game.state))throw new Error('Unexpected battle result');
 if(game.state==='lost'){const failures=[...s.failures];failures[s.stage]++;return {...s,phase:'defeat',failures,lastLoss:result};}
 return {...s,wins:[...s.wins,result],phase:s.stage<STAGE_COUNT-1?'intermission':'complete',lastLoss:null};
}
export function summary(s){
 return {mode:s.mode,completed:s.wins.length,score:s.wins.reduce((n,r)=>n+r.score,0),time:s.wins.reduce((n,r)=>n+r.time,0),
  failures:s.failures.reduce((a,b)=>a+b,0),participants:Array.from({length:s.mode},(_,i)=>({number:i+1,inputSeconds:s.wins.reduce((n,r)=>n+r.players[i].inputTicks,0)/60}))};
}
