import {readFileSync} from 'node:fs';
import {choose,candidates} from './starline_solver.mjs';
import {simulateShot,traceShot,cells} from '../games/starline/engine.mjs';
const {state,bank=false,fail=false}=JSON.parse(readFileSync(0,'utf8'));let next;
if(fail){
 const choices=[];
 for(let angle=-1.25;angle<=1.25001;angle+=.025){const s=simulateShot(state,angle);if(!s||s.state==='won')continue;const t=traceShot(state,angle);choices.push({angle,exchange:false,cell:t.cell,bounces:t.bounces,state:s,value:(s.state==='lost'?10000:0)+(s.lastShot?.popped?0:100)+(s.lastShot?.r||0)+cells(s).length*.05});}
 next=choices.sort((a,b)=>b.value-a.value)[0];
}else if(bank)next=candidates(state).find(s=>s.bounces>0);
next??=choose(state);
if(!next){console.log('null');process.exit(0);}
console.log(JSON.stringify({angle:next.angle,exchange:next.exchange,cell:next.cell,bounces:next.bounces,popped:next.state.lastShot?.popped,dropped:next.state.lastShot?.dropped,remaining:cells(next.state).length,result:next.state.state}));
