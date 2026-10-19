import{createRound,start,reveal,flag,chord,view}from'./engine.mjs';
import{deduce}from'./deduction.mjs';
export function ruleSolvable(g){
 start(g);reveal(g,g.start);
 for(let step=0;step<g.cells.length*3&&g.state==='playing';step++){
  const h=deduce(view(g));let changed=false;
  if(h.type==='chord')changed=chord(g,h.index);
  else if(h.type==='reveal'||h.type==='flag')for(const i of h.indices)changed=({reveal,flag})[h.type](g,i)||changed;
  if(!changed)break;
 }
 return g.state==='won';
}
export async function generateRound(mode,seed,first,{signal,maxAttempts=128,batch=4,onProgress=()=>{},yieldTask=()=>new Promise(r=>setTimeout(r,0))}={}){
 if(!Number.isInteger(maxAttempts)||maxAttempts<0||maxAttempts>128||!Number.isInteger(batch)||batch<1||batch>8)throw Error('Invalid generation bounds');
 for(let attempt=0;attempt<maxAttempts;attempt++){
  if(signal?.aborted)return{status:'cancelled',attempts:attempt};
  if(ruleSolvable(createRound(mode,seed,first,attempt))){if(signal?.aborted)return{status:'cancelled',attempts:attempt+1};return{status:'ok',attempts:attempt+1,game:createRound(mode,seed,first,attempt)};}
  if((attempt+1)%batch===0){onProgress(attempt+1);await yieldTask();}
 }
 return{status:signal?.aborted?'cancelled':'exhausted',attempts:maxAttempts};
}
