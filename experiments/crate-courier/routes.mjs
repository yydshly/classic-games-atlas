// Executable QA routes use only the same held buttons available to a player.
// They never replace positions, enemies, health, ticks or phase.
import {createGame,command,step,forecastThrow} from './engine.mjs';
export function runner(){
  const game=createGame(),runs=[],observations=[];command(game,'start');
  function advance(input={},count=1){for(let i=0;i<count;i++){
    const k=JSON.stringify(input),last=runs.at(-1);if(last&&last.keys===k)last.frames++;else runs.push({keys:k,frames:1});step(game,input);
    if(game.phase!=='playing')break;
  }}
  function until(predicate,input={},limit=2400){for(let i=0;i<limit&&!predicate(game);i++){if(game.phase!=='playing')throw Error('route ended early: '+JSON.stringify(game.result));advance(input);}if(!predicate(game))throw Error('route did not reach condition at '+game.player.x+','+game.player.y);}
  function tap(key){advance({[key]:true});advance({});}
  function record(label){observations.push({label,snapshot:structuredClone(game)});}
  return {game,runs,observations,advance,until,tap,record};
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
