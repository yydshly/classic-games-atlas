// Executable QA routes use only the same held buttons available to a player.
// They never replace positions, enemies, health, ticks or phase.
import {createGame,command,step,forecastThrow} from './engine.mjs';
import {LEVELS} from './levels.mjs';
let decisionStride=1;
export function withDecisionStride(stride,run){if(!Number.isInteger(stride)||stride<1||stride>8)throw Error('bad decision stride');const before=decisionStride;try{decisionStride=stride;return run();}finally{decisionStride=before;}}
export function runner(){
  const game=createGame(),runs=[],observations=[];command(game,'start');
  function advance(input={},count=1){for(let i=0;i<count;i++){
    const k=JSON.stringify(input),last=runs.at(-1);if(last&&last.keys===k)last.frames++;else runs.push({keys:k,frames:1});step(game,input);
    if(game.phase!=='playing')break;
  }}
  function until(predicate,input={},limit=2400){for(let i=0;i<limit&&!predicate(game);i+=decisionStride){if(game.phase!=='playing')throw Error('route ended early: '+JSON.stringify(game.result));advance(input,decisionStride);}if(!predicate(game))throw Error('route did not reach condition at '+game.player.x+','+game.player.y);}
  function tap(key){advance({[key]:true});advance({});}
  function record(label){observations.push({label,snapshot:structuredClone(game)});}
  function issue(name){if(!command(game,name))throw Error('rejected route command '+name);runs.push({command:name});}
  return {game,runs,observations,advance,until,tap,record,issue};
}
function cross(r,start,end){r.until(g=>g.player.x>=start,{right:true});r.advance({right:true,jump:true});r.until(g=>g.player.x>=end&&g.player.grounded,{right:true});}
function collect(r,index){const b=r.game.boxes[index];r.until(g=>Math.abs(g.player.x-b.x)<51,{right:true});r.tap('action');if(!r.game.player.holding)throw Error('box not lifted '+index+' at '+r.game.player.x+','+r.game.player.y+' / '+r.game.boxes[index].mode);}
function shoot(r,index){r.until(g=>{const f=forecastThrow(g);if(!f||f.outcome!=='impact')return false;const c=structuredClone(g);c.previous.action=false;for(let i=0;i<100&&c.enemies[index].alive;i++)step(c,{action:i===0});return !c.enemies[index].alive;},{right:true});r.record('aim-'+index);r.tap('action');r.until(g=>!g.enemies[index].alive,{});r.record('hit-'+index);}
export function combatRoute(){const r=runner();collect(r,0);shoot(r,0);cross(r,631,800);collect(r,1);shoot(r,1);cross(r,1420,1592);collect(r,2);cross(r,1688,1830);shoot(r,2);r.until(g=>g.phase==='won',{right:true});r.record('arrived');return r;}
export function shelfRoute(){const r=runner();collect(r,0);shoot(r,0);cross(r,631,800);collect(r,1);r.until(g=>g.player.x>=937,{right:true});r.advance({action:true,down:true});r.until(g=>g.boxes[1].mode==='rest',{});r.advance({right:true,jump:true},20);r.until(g=>g.player.support==='box-1',{});r.record('crate-step');r.advance({right:true,jump:true});r.until(g=>g.player.support==='high-shelf',{right:true});r.record('shelf-reached');cross(r,1420,1592);collect(r,2);cross(r,1688,1830);shoot(r,2);r.until(g=>g.phase==='won',{right:true});r.record('arrived');return r;}
export function jumpRoute(){const r=runner();
  // No box is picked up: line choice and enemy timing are a legitimate option.
  for(let n=0;n<6000&&r.game.phase==='playing';n++){
    const g=r.game,p=g.player;let jump=false;
    if(p.grounded){
      jump=g.boxes.some(b=>b.mode==='rest'&&b.x>p.x&&b.x-p.x<54&&Math.abs(b.y-p.y)<20)
        ||g.enemies.some(e=>e.alive&&e.x>p.x&&e.x-p.x<95&&Math.abs(e.y-p.y)<40)
        ||(p.x>626&&p.x<670)||(p.x>1416&&p.x<1460)||(p.x>1680&&p.x<1740);
    }
    r.advance({right:true,jump});
  }
  r.record('arrived');return r;
}
// The campaign routes start in chapter one and use only next/start and normal buttons.
function walk(r,x){r.until(g=>g.player.x>=x,{right:true});}
function hopTo(r,x){r.advance({right:true,jump:true});r.until(g=>g.player.x>=x,{right:true});r.until(g=>g.player.grounded,{});}
function next(r){r.issue('next');r.issue('start');}
function patientShot(r,index){let done=false;for(let i=0;i<2400&&!done;i++){
  const g=r.game;if(g.phase!=='playing')throw Error('shot interrupted '+JSON.stringify(g.result));
  const perch=g.boxes.find(b=>b.id===g.player.support);if(perch&&g.player.y<g.enemies[index].y-15){r.advance({left:g.player.x<=perch.x,right:g.player.x>perch.x},decisionStride);continue;}
  if(g.player.face<0){r.advance({right:true});continue;}
  const copy=structuredClone(g);copy.previous.action=false;step(copy,{action:true});for(let n=0;n<100&&copy.enemies[index].alive&&copy.phase==='playing';n++)step(copy,{});
  if(!copy.enemies[index].alive){r.tap('action');r.until(g=>!g.enemies[index].alive,{});done=true;}
  else r.advance({right:g.enemies[index].x-g.player.x>180},decisionStride);
 }if(!done)throw Error('no clear shot '+index+' at '+JSON.stringify(r.game.player));}
export function campaignLower(){const r=combatRoute();next(r);
  collect(r,0);walk(r,280);hopTo(r,470);patientShot(r,0);cross(r,752,912);collect(r,2);patientShot(r,2);cross(r,1414,1570);collect(r,4);
  walk(r,1920);hopTo(r,2025);hopTo(r,2080);hopTo(r,2125);r.record('two-upper-arrival');patientShot(r,3);collect(r,6);r.until(g=>g.phase==='won',{right:true});r.record('chapter-two-lower');next(r);
  r.tap('action');walk(r,120);hopTo(r,245);patientShot(r,0);cross(r,590,750);collect(r,2);patientShot(r,1);r.record('three-low-cargo');cross(r,860,1040);cross(r,1180,1345);collect(r,4);walk(r,1490);hopTo(r,1595);patientShot(r,2);cross(r,1810,1980);collect(r,5);patientShot(r,3);r.until(g=>g.phase==='won',{right:true});r.record('chapter-three-lower');return r;
}
export function campaignUpper(){const r=shelfRoute();next(r);
  collect(r,0);walk(r,280);hopTo(r,490);r.advance({left:true});r.advance({action:true,down:true});r.until(g=>g.boxes[0].mode==='rest',{});r.advance({left:true,jump:true});r.until(g=>g.player.x<=448,{left:true});r.until(g=>g.player.support==='box-0',{});r.record('chapter-two-box-step');hopTo(r,495);collect(r,1);walk(r,560);hopTo(r,680);
  cross(r,738,900);patientShot(r,1);collect(r,3);cross(r,1398,1555);hopTo(r,1690);cross(r,1738,1900);cross(r,1970,2125);patientShot(r,3);collect(r,6);r.until(g=>g.phase==='won',{right:true});r.record('chapter-two-upper');next(r);
  r.tap('action');walk(r,120);hopTo(r,205);hopTo(r,300);hopTo(r,420);cross(r,520,750);patientShot(r,1);collect(r,2);walk(r,860);hopTo(r,965);hopTo(r,1045);hopTo(r,1120);r.record('three-high-launch');cross(r,1130,1345);hopTo(r,1490);hopTo(r,1595);patientShot(r,2);cross(r,1810,1980);collect(r,5);patientShot(r,3);r.until(g=>g.phase==='won',{right:true});r.record('chapter-three-upper');return r;
}
// Normal held-button route helpers for the additional chapters. Each decision is
// made from visible geometry, crate positions and patrols; no model state is set.
function smartWalk(r,target,limit=4000){for(let i=0;i<limit&&r.game.player.x<target&&r.game.phase==='playing';i++){
  const g=r.game,p=g.player,level=LEVELS[g.stageIndex];
  const obstacle=level.solids.some(s=>s.material==='cargo'&&s.y>=400&&s.x>p.x&&s.x-p.x<65)
    ||g.boxes.some(b=>b.mode==='rest'&&b.x>p.x&&b.x-p.x<55&&b.y>=p.y-1);
  const edge=level.solids.filter(s=>s.material==='wood'&&s.x<=p.x&&s.x+s.w>p.x).some(s=>s.x+s.w-p.x<42);
  const patrol=g.enemies.some(e=>e.alive&&e.x>p.x&&e.x-p.x<90&&Math.abs(e.y-p.y)<40);
  r.advance({right:true,jump:p.grounded&&(obstacle||edge||patrol)});
 }if(r.game.player.x<target)throw Error('route stopped at '+r.game.stageIndex+':'+r.game.player.x+','+r.game.player.y);}
function placeLastStep(r,index,target,placeHold=1){const g=r.game;
  while(!g.player.grounded)r.advance({});
  r.tap('action');if(g.player.holding!=='box-'+index)throw Error('final box unavailable');
  smartWalk(r,target);r.advance({action:true,down:true},placeHold);r.advance({});
  r.until(s=>s.boxes[index].mode==='rest',{});const box=g.boxes[index];
  r.advance({right:true,jump:true});r.until(s=>s.player.x>=box.x,{right:true});r.until(s=>s.player.support===box.id,{});
  r.record('box-step-'+g.stageIndex);r.advance({right:true,jump:true});
}
export function chapterFourRoute(r=campaignLower()){next(r);smartWalk(r,1870);placeLastStep(r,3,2160);r.until(g=>g.phase==='won',{right:true});r.record('chapter-four');return r;}
export function chapterFiveLower(r=chapterFourRoute()){next(r);
  for(const [index,approach] of [[0,350],[1,990],[2,1625],[3,2145]]){
    if(index)smartWalk(r,index===1?795:index===2?1545:2070);
    r.until(g=>g.player.grounded,{});
    collect(r,index);smartWalk(r,approach);patientShot(r,index);
  }
  r.until(g=>g.phase==='won',{right:true});r.record('chapter-five-lower');return r;
}
export function chapterFiveBypass(r=chapterFourRoute()){next(r);
  for(const [index,approach] of [[0,350],[1,990]]){
    if(index)smartWalk(r,795);r.until(g=>g.player.grounded,{});collect(r,index);smartWalk(r,approach);patientShot(r,index);
  }
  smartWalk(r,2350);r.until(g=>g.phase==='won',{right:true});r.record('chapter-five-bypass');return r;
}
export function chapterFiveUpper(r=chapterFourRoute()){next(r);
  hopTo(r,265);hopTo(r,375);walk(r,600);
  r.advance({right:true,jump:true});r.until(g=>g.player.x>=795,{right:true});r.until(g=>g.player.grounded,{});
  r.record('upper-avoids-first-patrol');
  for(const [index,approach,entry] of [[1,990,795],[2,1625,1545],[3,2145,2070]]){
    if(index>1)smartWalk(r,entry);
    r.until(g=>g.player.grounded,{});collect(r,index);smartWalk(r,approach);patientShot(r,index);
  }
  r.until(g=>g.phase==='won',{right:true});r.record('chapter-five-upper');return r;
}
export function chapterSixLower(r=chapterFiveLower()){next(r);
  collect(r,0);smartWalk(r,590);cross(r,590,785);
  patientShot(r,0);smartWalk(r,1390);
  r.until(g=>g.phase==='won',{right:true});r.record('chapter-six-lower');return r;
}
export function chapterSevenBarrier(r=chapterSixLower()){next(r);
  collect(r,0);walk(r,375);r.advance({action:true,down:true},8);r.advance({});
  r.until(g=>g.boxes[0].mode==='rest',{});
  r.until(g=>g.enemies[0].dir===1,{});r.record('box-turns-patrol');
  r.advance({right:true,jump:true});walk(r,415);r.until(g=>g.player.support==='box-0',{});
  hopTo(r,525);
  for(const [edge,landing] of [[550,700],[1215,1390]]){walk(r,edge);hopTo(r,landing);}
  r.until(g=>g.phase==='won',{right:true});r.record('chapter-seven-barrier');return r;
}
export function chapterSevenClear(r=chapterSixLower()){next(r);
  collect(r,0);walk(r,350);patientShot(r,0);cross(r,600,760);
  r.until(g=>g.player.grounded,{});collect(r,1);walk(r,845);patientShot(r,1);
  cross(r,1240,1400);
  r.until(g=>g.phase==='won',{right:true});r.record('chapter-seven-clear');return r;
}
export function chapterSevenLowHealth(r=chapterSixLower()){next(r);
  r.advance({right:true,jump:true});r.until(g=>g.player.hp===2,{right:true});
  r.until(g=>g.player.hp===1,{});r.record('two-visible-patrol-hits');
  r.until(g=>g.player.x<=215,{left:true});r.tap('action');
  r.until(g=>g.player.x>=300,{right:true});patientShot(r,0);cross(r,600,760);
  r.until(g=>g.player.grounded,{});collect(r,1);walk(r,845);patientShot(r,1);
  cross(r,1240,1400);
  r.until(g=>g.phase==='won',{right:true});r.record('chapter-seven-one-health');return r;
}
