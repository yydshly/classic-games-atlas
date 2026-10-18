import { fileURLToPath } from 'node:url';
import { createGame, start, command, canCommand, snapshot } from '../games/civic/engine.mjs';
const build=(tileId,building)=>({type:'build',tileId,building});
const assign=tileId=>({type:'assign',tileId,worker:true});
const road=tileId=>({type:'road',tileId});
const explore=tileId=>({type:'explore',tileId});
const research=research=>({type:'research',research});
const settle=tileId=>({type:'settle',tileId});
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
// These are public, legal input plans, not solutions embedded in game state.
// Empty rows intentionally wait for the already announced production/weather.
export const PLANS=freeze([
  [[build(15,'farm'),assign(15)],[],[]],
  [[build(15,'farm'),assign(15),explore(17)],[explore(11),explore(25),explore(33)],[],[],[]],
  [[build(16,'farm'),assign(16),build(21,'lumber')],[assign(21),build(25,'quarry'),assign(25)],[],[],[],[]],
  [[assign(15),build(23,'market'),road(24)],[road(25),road(26)],[],[],[]],
  [[assign(15),assign(23),build(14,'lumber')],[assign(14),road(23),road(25)],[research('navigation'),road(24),road(26)],[settle(26),build(19,'farm'),assign(19)],[build(25,'market')],[]],
  [[assign(16),build(24,'farm'),assign(24)],[],[],[],[],[]],
  [[assign(22),assign(16),build(14,'lumber')],[assign(14),road(16),road(17)],[road(18),road(19),road(26)],[settle(26),research('harvest'),build(25,'farm')],[assign(25),build(12,'quarry'),assign(12)],[research('stonecraft')],[research('navigation')]],
  [[assign(15),assign(23),build(14,'lumber')],[assign(14),explore(17),road(23)],[research('navigation'),road(24),explore(25)],[road(25),road(26),settle(26)],[build(19,'farm'),assign(19),build(29,'quarry')],[assign(29),research('harvest'),build(25,'market')],[research('stonecraft')],[explore(12)],[],[build(12,'beacon')]],
]);
export function runPilot(levelIndex,options={}){
  const state=createGame(levelIndex),trace=[];start(state);let steps=0;
  const apply=cmd=>{
    const valid=canCommand(state,cmd);if(!valid.ok)throw new Error(`chapter ${levelIndex+1}, turn ${state.turn}: ${JSON.stringify(cmd)}: ${valid.reason}`);
    const outcome=command(state,cmd);if(!outcome.ok)throw new Error(outcome.reason);steps++;
    const frame={command:{...cmd},snapshot:snapshot(state)};trace.push(frame);options.onCommand?.(frame,state);
  };
  outer:for(const turn of PLANS[levelIndex]){
    for(const cmd of turn){if(options.maxCommands!==undefined&&steps>=options.maxCommands)break outer;apply(cmd);}
    if(options.maxCommands!==undefined&&steps>=options.maxCommands)break;
    apply({type:'endTurn'});
    if(state.state==='won'||state.state==='lost'||(options.maxTurns!==undefined&&state.turnsSettled>=options.maxTurns))break;
  }
  if(options.maxCommands===undefined&&options.maxTurns===undefined&&state.state!=='won')throw new Error(`chapter ${levelIndex+1} ended ${state.state}: ${state.reason}`);
  return {state,steps,trace};
}
export const solveLevel=(levelIndex,options={})=>runPilot(levelIndex,options).state;
if(process.argv[1]===fileURLToPath(import.meta.url)){
  for(let index=0;index<PLANS.length;index++){const {state,steps}=runPilot(index);console.log(`chapter ${index+1}: WON turn ${state.turn}, ${steps} legal commands, food ${state.resources.food}, delivered ${state.tradeDelivered}`);}
}
