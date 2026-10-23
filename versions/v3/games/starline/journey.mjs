import {createGame,snapshot,restoreSnapshot} from './engine.mjs';
export const CHAPTER='three-anchors-v1';
export function freshJourney(){return {schema:1,chapter:CHAPTER,stage:0,phase:'ready',results:[],failures:[0,0,0],board:snapshot(createGame(0)),tutorialSeen:false,sound:true};}
export function readJourney(raw){
 try{
  if(raw?.schema!==1||raw.chapter!==CHAPTER||!Number.isInteger(raw.stage)||raw.stage<0||raw.stage>2||!['ready','active','between','lost','complete'].includes(raw.phase))return null;
  if(typeof raw.tutorialSeen!=='boolean'||typeof raw.sound!=='boolean'||!Array.isArray(raw.failures)||raw.failures.length!==3||raw.failures.some(n=>!Number.isInteger(n)||n<0||n>1e6))return null;
  const count=raw.phase==='complete'?3:raw.stage+(raw.phase==='between'?1:0);
  if(!Array.isArray(raw.results)||raw.results.length!==count||raw.results.some((r,i)=>r.stage!==i||['shots','score','popped','dropped','bounces'].some(k=>!Number.isInteger(r[k])||r[k]<0||r[k]>1e7)||!Number.isFinite(r.time)||r.time<0||r.time>1e8))return null;
  const board=restoreSnapshot(raw.board);if(!board||board.level!==raw.stage+1)return null;
  if((raw.phase==='ready'&&board.state!=='ready')||(raw.phase==='active'&&!['playing','paused'].includes(board.state))||(raw.phase==='lost'&&board.state!=='lost')||(['between','complete'].includes(raw.phase)&&board.state!=='won'))return null;
  if((raw.phase==='between'&&raw.stage===2)||(raw.phase==='complete'&&raw.stage!==2))return null;
  return {...structuredClone(raw),board:snapshot(board)};
 }catch{return null;}
}
export function settleJourney(j,game){
 if(j.phase!=='active'||!['won','lost'].includes(game.state)||game.level!==j.stage+1)return false;
 j.board=snapshot(game);
 if(game.state==='lost'){j.failures[j.stage]++;j.phase='lost';}
 else {j.results.push({stage:j.stage,...game.stats,time:game.time});j.phase=j.stage===2?'complete':'between';}
 return true;
}
export function retryJourney(j){
 // A sealed round can only advance; retrying it would duplicate its result.
 if(['between','complete'].includes(j.phase))return false;
 j.phase='ready';j.board=snapshot(createGame(j.stage));return true;
}
export function advanceJourney(j){
 if(j.phase!=='between'||j.stage>=2)return false;
 j.stage++;j.phase='ready';j.board=snapshot(createGame(j.stage));return true;
}
