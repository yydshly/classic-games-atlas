// Executable QA routes use only the same held buttons available to a player.
// They never replace positions, enemies, health, ticks or phase.
import {createGame,command,step,forecastThrow} from './engine.mjs';
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
function collect(r,index){const b=r.game.boxes[index];r.until(g=>Math.abs(g.player.x-b.x)<51,{right:true});r.tap('action');if(!r.game.player.holding)throw Error('box not lifted');}
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
