// Test-only button-equivalent strategies. The shipped game never imports this
// file. No state, certificate, money or win flag is written by these pilots.
import { createGame, command, step, snapshot, FIXED_DT } from '../games/coaster/engine.mjs';
export const COASTER_PLANS = Object.freeze([
 ['lift','rail','rail','rail','rail','rail','rail','rail','rail','rail','rail','brake'],
 ['lift','trim','rail','rail','rail','rail','rail','rail','rail','rail','rail','brake'],
 ['lift','rail','bank','rail','rail','bank','rail','rail','rail','rail','rail','brake'],
 ['lift','rail','rail','lift','rail','rail','rail','rail','rail','rail','rail','brake'],
 ['lift','rail','rail','drive','rail','rail','rail','rail','rail','rail','rail','brake'],
 ['lift','rail','bank','rail','rail','bank','rail','rail','rail','rail','rail','brake'],
 ['lift','rail','bank','rail','rail','bank','drive','rail','rail','bank','trim','brake'],
 ['lift','rail','bank','lift','trim','rail','rail','rail','drive','bank','rail','brake']
].map(Object.freeze));
export function prepareCoaster(s){const results=[];for(let segment=0;segment<s.modules.length;segment++){const module=COASTER_PLANS[s.levelIndex][segment];if(s.modules[segment]!==module)results.push(command(s,{type:'module',segment,module}));}return results;}
export function pilotCoaster(s){if(s.state!=='design')return[];if(!s.report)return[command(s,{type:'test'})];if(s.report.safe)return[command(s,{type:'open'})];return[];}
export function runPilot(levelIndex=0,{onStep}={}){
 const state=createGame(levelIndex),results=prepareCoaster(state),trace={design:snapshot(state)};
 results.push(...pilotCoaster(state));
 for(let n=0;n<40000&&!['won','lost'].includes(state.state);n++){
  step(state,FIXED_DT);onStep?.(state,n);
  if(state.state==='design'&&state.report){trace.report=snapshot(state);results.push(...pilotCoaster(state));if(state.state==='design')break;}
  if(state.state==='operating'&&!trace.operating)trace.operating=snapshot(state);
 }
 trace.final=snapshot(state);return{state,trace,results};
}
if(process.argv[1]?.endsWith('/coaster_pilot.mjs')){
 const rows=[];for(let i=0;i<8;i++){const {state:s,results}=runPilot(i);if(s.state!=='won'||results.some(r=>!r.ok))throw new Error(`Pilot ${i+1} failed: ${s.state} ${s.message}`);rows.push({level:i+1,name:s.level.name,cost:s.cost,thrill:+s.report.thrill.toFixed(2),comfort:+s.report.comfort.toFixed(2),runs:s.runs,revenue:s.revenue,reputation:s.reputation,ticks:s.tick});}console.log(JSON.stringify(rows,null,2));
}
export default pilotCoaster;
