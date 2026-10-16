import{LEVELS}from'../games/petal/levels.mjs';import{solveBoard,legalPairs}from'../games/petal/engine.mjs';
export function choosePair(g){const l=LEVELS[g.level-1],solution=solveBoard(l,g.board,20000),m=solution.moves?.[0]??legalPairs(l,g.board)[0];return m?{a:m.a,b:m.b,certificate:solution.status}:null;}
if(process.argv.includes('--stdio')){const rl=await import('node:readline');for await(const line of rl.createInterface({input:process.stdin})){try{console.log(JSON.stringify(choosePair(JSON.parse(line))));}catch(e){console.log(JSON.stringify({error:e.message}));}}}
