import{createGame,input,advanceTicks,snapshot,phase}from'../games/duel/engine.mjs';
export function choose(s){const p=s.player,e=s.enemy,commands=[],push=c=>commands.push(c),dist=e.x-p.x,threat=e.action&&e.action.kind!=='dash'&&e.action.age<e.action.wind+e.action.active;
 if(s.state!=='playing')return commands;
 if(p.action||s.ticks<p.stunUntil){if(p.move)push({kind:'move',value:0});return commands;}
 if(threat&&dist<=e.action.range+22){if(p.move)push({kind:'move',value:0});if(p.face!==1)push({kind:'move',value:1}),push({kind:'move',value:0});if(!p.guard)push({kind:'guard',value:true});return commands;}
 if(p.guard)push({kind:'guard',value:false});
 if(p.face!==1)push({kind:'move',value:1}),push({kind:'move',value:0});
 const recovery=e.action&&e.action.kind!=='dash'&&e.action.age>=e.action.wind+e.action.active;
 if(recovery&&dist<=146&&s.ticks>=p.cooldown&&p.energy>=20){if(p.move)push({kind:'move',value:0});push({kind:'heavy'});return commands;}
 const move=dist>124?1:0;if(p.move!==move)push({kind:'move',value:move});return commands;
}
export function play(index){const g=createGame(index);input(g,{kind:'start'});while(g.state==='playing'){for(const c of choose(snapshot(g)))input(g,c);advanceTicks(g,4);}return snapshot(g);}
if(process.argv.includes('--stdio')){const{createInterface}=await import('node:readline');const lines=createInterface({input:process.stdin});for await(const line of lines){try{console.log(JSON.stringify(choose(JSON.parse(line))));}catch(e){console.log(JSON.stringify({error:e.message}));}}}else if(process.argv[1]?.endsWith('duel_pilot.mjs')){const results=Array.from({length:8},(_,i)=>play(i));console.log(JSON.stringify({passed:results.every(s=>s.state==='won'),method:'Read-only current state distance/telegraph/recovery policy; ordinary held directions, directional guard and heavy counter. Normal authored HP, clock, stamina and AI. No HP or result writes.',results},null,2));if(results.some(s=>s.state!=='won'))process.exitCode=1;}
