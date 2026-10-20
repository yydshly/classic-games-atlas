// Pure decision helper on copied public snapshot; live page receives ordinary keys only.
import{createPilot,playLevel}from'../../versions/v2/games/meadow/tests/meadow_pilot.mjs';
if(process.argv.includes('--stdio')){const pilot=createPilot(),{createInterface}=await import('node:readline');for await(const line of createInterface({input:process.stdin})){try{console.log(JSON.stringify(pilot(JSON.parse(line))));}catch(e){console.log(JSON.stringify({error:String(e)}));}}}
else{const r=playLevel(0,{decisionTicks:6});console.log(JSON.stringify({kind:'OFFLINE 100ms reference only, not public UI',state:r.state.state,score:r.score,stats:r.stats,ticks:r.ticks},null,2));}
