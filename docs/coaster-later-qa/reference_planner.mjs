import {createGame,command,inspectDesign,LEVELS} from '../../versions/v2/games/coaster/engine.mjs';
import fs from 'node:fs';
// Offline legal design search only; these states are never imported into a browser.
let answers=[];
for(let i=0;i<8;i++){
 let best=null;
 const base=[{0:'lift',11:'brake'},{0:'lift',1:'trim',11:'brake'},{0:'lift',2:'bank',5:'bank',9:'bank',11:'brake'},{0:'lift',3:'lift',11:'brake'},{0:'lift',8:'drive',11:'brake'},{0:'lift',1:'trim',8:'drive',11:'brake'},{0:'lift',1:'trim',3:'lift',5:'bank',9:'bank',11:'brake'},{0:'lift',1:'trim',3:'lift',4:'trim',5:'bank',9:'bank',11:'brake'}];
 for(const mods of base)for(const a of [-8,-4,0,4,8])for(const b of [-8,-4,0,4,8])for(const c of [-8,-4,0,4,8]){
  const g=createGame(i),cmds=[{type:'height',node:1,offset:a},{type:'height',node:4,offset:b},{type:'height',node:7,offset:c},...Object.entries(mods).map(([segment,module])=>({type:'module',segment:+segment,module}))];let legal=true;for(const cmd of cmds)if(!command(g,cmd).ok){legal=false;break;}if(!legal)continue;
  const r=inspectDesign(g);if(!r.safe||!r.approved)continue;const runs=Math.max(Math.ceil(g.level.targetRevenue/r.rideRevenue),Math.ceil(g.level.targetReputation/r.rideReputation));if(runs>g.level.maxRuns)continue;
  const metric=r.duration*(1+runs);if(!best||metric<best.metric)best={level:i+1,name:LEVELS[i].name,cmds:cmds.filter(c=>c.type!=='height'||c.offset),modules:g.modules,offsets:g.heightOffsets,cost:g.cost,cash:g.cash,runs,metric,report:r};
 }
 answers.push(best);console.log(JSON.stringify(best?{level:i+1,modules:best.modules,offsets:best.offsets,cost:best.cost,runs:best.runs,thrill:best.report.thrill,comfort:best.report.comfort,seconds:best.metric}:{level:i+1,missing:true}));
}
fs.writeFileSync(new URL('reference-plans.json',import.meta.url),JSON.stringify({method:'OFFLINE legal authored engine reference, not browser play',answers},null,2));
