import{MODES,rawLayout}from'./seed.mjs';import{neighbors,deduce}from'./deduction.mjs';
export function buildGame(level,mines){
 const cells=level.terrain.flatMap(row=>[...row].map(c=>c==='o'?{state:'covered'}:null)),g={state:'ready',level:level.id,w:level.w,h:level.h,start:level.start,totalMines:level.mines,cells,mineSet:new Set(mines),numbers:[],started:false,revealed:0,flags:0,time:0,exploded:null,hint:null,log:[],events:[],stats:{reveals:0,flagActions:0,chords:0,hints:0,settlements:0}};
 if(mines.length!==level.mines||g.mineSet.size!==mines.length||mines.some(i=>!Number.isInteger(i)||!cells[i]))throw Error('Invalid authored mine positions');
 if(!cells[g.start]||g.mineSet.has(g.start)||neighbors(g,g.start).some(i=>g.mineSet.has(i)))throw Error('Marked first observation point must have a safe zero neighborhood');
 g.numbers=cells.map((c,i)=>c?neighbors(g,i).filter(j=>g.mineSet.has(j)).length:null);return g;
}
export function createRound(mode,seed,first,attempt=0){
 const cfg=MODES[mode];if(!cfg||!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isInteger(first)||first<0||first>=cfg.size**2||!Number.isInteger(attempt)||attempt<0||attempt>=128)throw Error('Invalid round identity');
 const level={id:mode,w:cfg.size,h:cfg.size,start:first,mines:cfg.mines,terrain:Array(cfg.size).fill('o'.repeat(cfg.size))};
 const g=buildGame(level,rawLayout(mode,seed,first,attempt));Object.assign(g,{mode,seed,attempt});return g;
}
export function retry(g){return createRound(g.mode,g.seed,g.start,g.attempt);}
export function start(g){if(g.state!=='ready')return false;g.state='playing';return true;}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';else return false;return true;}
function finish(g,state,exploded=null){if(g.state!=='playing')return;g.state=state;g.exploded=exploded;g.hint=null;g.stats.settlements++;g.events.push({type:state});}
function flood(g,starts){const todo=starts.slice(),visited=new Set();while(todo.length){const i=todo.pop();if(visited.has(i))continue;visited.add(i);const c=g.cells[i];if(!c||c.state!=='covered'||g.mineSet.has(i))continue;c.state='open';g.revealed++;if(g.numbers[i]===0)todo.push(...neighbors(g,i));}}
function settle(g){if(g.revealed===g.cells.filter(Boolean).length-g.totalMines)finish(g,'won');}
function record(g,type,index){g.log.push({type,index});g.hint=null;g.events.push({type:'action',action:type,index});}
export function reveal(g,index){
 if(g.log.length>=MAX_LOG||g.state!=='playing'||!Number.isInteger(index)||!g.cells[index]||g.cells[index].state!=='covered')return false;
 if(!g.started&&index!==g.start){g.events.push({type:'start-required'});return false;}
 g.started=true;g.stats.reveals++;record(g,'reveal',index);if(g.mineSet.has(index))finish(g,'lost',index);else{flood(g,[index]);settle(g);}return true;
}
export function flag(g,index){
 if(g.log.length>=MAX_LOG||g.state!=='playing'||!g.started||!Number.isInteger(index)||!g.cells[index]||g.cells[index].state==='open')return false;const c=g.cells[index];
 if(c.state==='covered'&&g.flags>=g.totalMines){g.events.push({type:'flag-limit'});return false;}c.state=c.state==='flagged'?'covered':'flagged';g.flags+=c.state==='flagged'?1:-1;g.stats.flagActions++;record(g,'flag',index);return true;
}
export function chord(g,index){
 if(g.log.length>=MAX_LOG||g.state!=='playing'||!g.started||!Number.isInteger(index)||g.cells[index]?.state!=='open'||g.numbers[index]===0)return false;
 const ns=neighbors(g,index),marked=ns.filter(i=>g.cells[i].state==='flagged').length,targets=ns.filter(i=>g.cells[i].state==='covered');
 if(marked!==g.numbers[index]||!targets.length){g.events.push({type:'chord-blocked'});return false;}
 g.stats.chords++;record(g,'chord',index);const hit=targets.find(i=>g.mineSet.has(i));if(hit!==undefined)finish(g,'lost',hit);else{flood(g,targets);settle(g);}return true;
}
export function requestHint(g){if(g.log.length>=MAX_LOG||g.state!=='playing')return null;const h=deduce(view(g));g.stats.hints++;g.log.push({type:'hint',index:null});g.hint=h;g.events.push({type:'hint'});return JSON.parse(JSON.stringify(h));}
export function update(g,dt){if(g.state==='playing'&&Number.isFinite(dt)&&dt>0)g.time+=Math.min(.1,dt);}
export function view(g){const over=['won','lost'].includes(g.state);return{state:g.state,level:g.level,w:g.w,h:g.h,start:g.start,totalMines:g.totalMines,started:g.started,revealed:g.revealed,flags:g.flags,remaining:g.totalMines-g.flags,time:g.time,exploded:g.exploded,cells:g.cells.map((c,i)=>c?{state:c.state,number:c.state==='open'?g.numbers[i]:null,...(over?{mine:g.mineSet.has(i),wrongFlag:c.state==='flagged'&&!g.mineSet.has(i)}:{})}:null),hint:g.hint?JSON.parse(JSON.stringify(g.hint)):null,stats:{...g.stats}};}
export const MAX_LOG=5000;
export function checkpoint(g){return{version:2,mode:g.mode,seed:g.seed,first:g.start,attempt:g.attempt,state:g.state,time:g.time,log:g.log.map(a=>({...a}))};}
export function restore(value){try{
 if(!value||value.version!==2||!['ready','playing','paused','won','lost'].includes(value.state)||!Number.isFinite(value.time)||value.time<0||value.time>31536000||!Array.isArray(value.log)||value.log.length>MAX_LOG)return null;
 const g=createRound(value.mode,value.seed,value.first,value.attempt);
 if(value.state==='ready'&&value.log.length)return null;
 if(value.log.length){start(g);for(const a of value.log){
  if(!a||!['reveal','flag','chord','hint'].includes(a.type)||g.state!=='playing')return null;
  let valid;if(a.type==='hint'){if(a.index!==null)return null;valid=!!requestHint(g);}else{if(!Number.isInteger(a.index))return null;valid=({reveal,flag,chord})[a.type](g,a.index);}if(!valid)return null;
 }}
 if(['won','lost'].includes(value.state)?g.state!==value.state:['won','lost'].includes(g.state))return null;
 if(!value.log.length&&value.state!=='ready')return null;
 g.state=['playing','paused'].includes(value.state)?'paused':value.state;g.time=value.time;g.hint=null;g.events=[];return g;
 }catch{return null;}}
