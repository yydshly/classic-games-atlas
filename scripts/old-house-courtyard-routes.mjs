// Bounded normal-input route replays; no position, inventory, flag or completion mutation.
import assert from 'node:assert/strict';
import {createGame,tick,interact,inspect,combine,useItem,transfer,snapshot} from '../experiments/old-house-echoes/courtyard/engine.mjs';
export function modelDriver(){const s=createGame();s.mode='playing';return {state:()=>s,
 async go(x,y){let n=0;while(Math.hypot(s.player.x-x,s.player.y-y)>.12){assert(++n<1800,`blocked waypoint ${s.room} ${x},${y} from ${s.player.x},${s.player.y}`);const dx=x-s.player.x,dy=y-s.player.y;tick(s,{left:dx<-.08,right:dx>.08,up:dy<-.08,down:dy>.08});assert.notEqual(s.mode,'lost');}},
 async door(room){interact(s);for(let n=0;n<28;n++)tick(s,{});assert.equal(s.room,room);},async interact(){interact(s);},async inspect(item){inspect(s,item);},async use(item){useItem(s,item);},async combine(a,b){combine(s,a,b);},async take(item){assert(transfer(s,item,'take'));},async store(item){assert(transfer(s,item,'store'));},async close(){s.mode='playing';},async shoot(){for(let n=0;n<140;n++)tick(s,{aim:true,up:true,fire:true});},async checkpoint(){interact(s);this.recorded=snapshot(s);},async mark(){},recorded:null};}
export async function route(d,style){
 const go=async(...pairs)=>{for(const [x,y] of pairs)await d.go(x,y);};const door=async(room)=>d.door(room);
 await go([7,7],[5,7]);await d.interact();
 if(style==='clear'){for(const id of ['pistol','rounds','herb','cloth'])await d.take(id);await d.combine('herb','cloth');}
 else {for(const id of ['herb','cloth'])await d.take(id);await d.combine('herb','cloth');}
 await d.close();await d.mark('loadout');await go([7.5,7],[7.5,3.5]);await d.checkpoint();await d.mark('checkpoint');await go([10,2.3]);
 if(style==='clear'){
  await go([10,2.3]);await door('corridor');await d.shoot();assert.equal(d.state().enemy.hp,0);await d.combine('pistol','rounds');await d.mark('corridor-cleared');await go([10,2.3]);await door('archive');
 }else{
  await go([17.5,3.5],[17.5,7]);await door('garden');await go([3.7,10.8],[17.8,10.8],[17.8,3]);await door('pump');await go([2.7,3],[10,2.3]);await door('archive');
 }
 await go([10,6]);await d.interact();assert(d.state().inventory.includes('rubbing'));await d.inspect('badge');await d.combine('badge','rubbing');await d.mark('archive-marked');
 await go([10,1.8]);await d.use('marked');await door('vault');await go([10,5]);await d.interact();assert(d.state().inventory.includes('ledger'));await d.combine('ledger','sleeve');assert(d.state().inventory.includes('wrapped'));await d.mark('wrapped');
 await go([10,11.5]);await door('archive');
 if(style==='clear'){await go([10,11.5]);await door('corridor');await go([10,11.5]);await door('yard');}
 else{await go([2.5,7]);await door('pump');await go([14.5,3],[17.5,3],[17.5,7]);await door('yard');assert(d.state().flags.loop);await d.mark('loop-open');}
 await go([10,10.8]);await d.use('wrapped');assert.equal(d.state().mode,'won');await d.mark('won');return d.state();
}

export async function packedRecoveryRoute(d){
 const go=async(...pairs)=>{for(const [x,y] of pairs)await d.go(x,y);};const door=async(room)=>d.door(room);
 await go([7,7],[5,7]);await d.interact();for(const id of ['pistol','rounds','herb','cloth'])await d.take(id);await d.close();assert.equal(d.state().inventory.length,6);await d.mark('full-loadout');
 await go([7.5,7],[7.5,3.5]);await d.checkpoint();await go([10,2.3],[17.5,3.5],[17.5,7]);await door('garden');await go([3.7,10.8],[17.8,10.8],[17.8,3]);await door('pump');await go([2.7,3],[10,2.3]);await door('archive');
 await go([10,6]);await d.interact();assert(!d.state().taken.includes('rubbing'));assert.equal(d.state().stats.full,1);await d.mark('rubbing-refused');
 await d.combine('herb','cloth');await d.interact();await d.inspect('badge');await d.combine('badge','rubbing');await go([10,1.8]);await d.use('marked');await door('vault');await go([10,5]);await d.interact();assert(!d.state().taken.includes('ledger'));assert.equal(d.state().stats.full,2);await d.mark('ledger-refused');
 await go([10,11.5]);await door('archive');await go([2.5,7]);await door('pump');await go([14.5,3],[17.5,3],[17.5,7]);await door('yard');assert(d.state().flags.loop);await go([5,7]);await d.interact();await d.store('rounds');await d.close();await d.mark('space-made');
 await go([2.3,7]);await door('pump');await go([17.5,3],[14.5,3],[10,2.3]);await door('archive');await go([10,1.8]);await door('vault');await go([10,5]);await d.interact();assert(d.state().taken.includes('ledger'));await d.combine('ledger','sleeve');await d.mark('recovered');await go([10,11.5]);await door('archive');await go([2.5,7]);await door('pump');await go([14.5,3],[17.5,3],[17.5,7]);await door('yard');await go([10,10.8]);await d.use('wrapped');assert.equal(d.state().mode,'won');await d.mark('won');return d.state();
}
