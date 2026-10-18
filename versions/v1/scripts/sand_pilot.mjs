// Never imports level data, hidden mine locations or an answer route.
import{deduce}from'../games/sand/deduction.mjs';
export function chooseAction(publicBoard){const h=deduce(publicBoard);if(!['flag','reveal','chord'].includes(h.type))return{type:h.type,reason:h.reason,rule:h.rule};return{type:h.type,index:h.type==='chord'?h.index:h.indices[0],rule:h.rule,reason:h.reason,sources:h.sources,conclusions:h.indices};}
if(process.argv.includes('--stdio')){const rl=await import('node:readline');for await(const line of rl.createInterface({input:process.stdin})){try{console.log(JSON.stringify(chooseAction(JSON.parse(line))));}catch(e){console.log(JSON.stringify({error:e.message}));}}}
