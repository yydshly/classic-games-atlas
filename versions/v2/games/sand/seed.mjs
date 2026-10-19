export const MODES=Object.freeze({small:Object.freeze({size:7,mines:8,name:'浅层勘探'}),large:Object.freeze({size:9,mines:14,name:'深层勘探'})});
export function rawLayout(mode,seed,first,attempt){
 const {size,mines}=MODES[mode];let state=(seed^Math.imul(attempt+1,0x9e3779b9))>>>0;
 const rand=()=>{state+=0x6d2b79f5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 const candidates=[];for(let i=0;i<size*size;i++)if(Math.abs(i%size-first%size)>1||Math.abs(Math.floor(i/size)-Math.floor(first/size))>1)candidates.push(i);
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 return candidates.slice(0,mines).sort((a,b)=>a-b);
}
